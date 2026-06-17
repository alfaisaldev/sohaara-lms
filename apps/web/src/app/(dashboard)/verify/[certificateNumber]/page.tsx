'use client';

import { use, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CertificateBody } from '@sohaara/ui';
import { api } from '@/lib/api';
import { mapCertToData } from '@/lib/certificate-render';
import { Loader2, CheckCircle, XCircle, Download } from 'lucide-react';

export default function VerifyCertificatePage({ params }: { params: Promise<{ certificateNumber: string }> }) {
  const { certificateNumber } = use(params);
  const [cert, setCert] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<any>(`/certificates/verify/${certificateNumber}`)
      .then(setCert)
      .catch((e) => setError(e?.message || 'Certificate not found'))
      .finally(() => setLoading(false));
  }, [certificateNumber]);

  const handleDownload = async () => {
    if (!cert) return;
    setDownloading(true);
    try {
      const data = mapCertToData(cert);
      const stage = stageRef.current;
      if (!stage) return;
      stage.innerHTML = '';
      const wrapper = document.createElement('div');
      wrapper.style.position = 'absolute';
      wrapper.style.left = '-99999px';
      wrapper.style.top = '0';
      wrapper.style.width = (data.orientation === 'landscape' ? data.width : data.height) + 'px';
      stage.appendChild(wrapper);
      const { createRoot } = await import('react-dom/client');
      const { default: React } = await import('react');
      const reactElement = React.createElement(CertificateBody, { data });
      const rootInstance = createRoot(wrapper);
      rootInstance.render(reactElement);
      await new Promise((r) => setTimeout(r, 200));
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(wrapper.firstElementChild as HTMLElement, { scale: 2, useCORS: true, backgroundColor: null, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const isLandscape = data.orientation === 'landscape';
      const pdf = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait', unit: 'px', format: [data.width, data.height] });
      pdf.addImage(imgData, 'PNG', 0, 0, data.width, data.height);
      pdf.save(`${cert.certificateNumber}.pdf`);
      rootInstance.unmount();
      wrapper.remove();
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent-indigo" size={32} /></div>;

  const isValid = cert && cert.status === 'released';

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div ref={stageRef} />
      <Card variant="glass" className="max-w-md w-full animate-scale-in">
        <CardContent className="p-8 text-center space-y-6">
          <div className={`h-20 w-20 rounded-full mx-auto flex items-center justify-center ${isValid ? 'bg-emerald-100' : 'bg-red-100'}`}>
            {isValid ? <CheckCircle size={40} className="text-emerald-500" /> : <XCircle size={40} className="text-red-500" />}
          </div>

          <div>
            <h2 className="text-xl font-bold tracking-tight text-primary-text">
              {isValid ? 'Valid Certificate' : error || 'Invalid Certificate'}
            </h2>
            <p className="text-secondary-text text-sm mt-1">
              {isValid ? 'This certificate has been verified and is active.' : ''}
            </p>
          </div>

          {isValid && (
            <>
              <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 space-y-2 text-left border border-white/30">
                <div className="flex justify-between text-sm">
                  <span className="text-secondary-text">Certificate</span>
                  <span className="font-medium text-primary-text">{cert.certificateNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary-text">Recipient</span>
                  <span className="font-medium text-primary-text">{cert.user?.firstName} {cert.user?.lastName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary-text">Course</span>
                  <span className="font-medium text-primary-text">{cert.course?.title}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary-text">Issued</span>
                  <span className="font-medium text-primary-text">{new Date(cert.issuedAt).toLocaleDateString()}</span>
                </div>
              </div>
              <button onClick={handleDownload} disabled={downloading}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-accent-indigo to-accent-indigo-light text-white text-sm font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {downloading ? 'Generating PDF…' : 'Download Certificate PDF'}
              </button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
