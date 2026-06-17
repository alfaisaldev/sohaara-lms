'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CertificateBody } from '@sohaara/ui';
import { api } from '@/lib/api';
import { mapCertToData } from '@/lib/certificate-render';
import { Loader2, Award, ExternalLink, BookOpen, Clock, CheckCircle2, Download } from 'lucide-react';
import Link from 'next/link';

const toArray = (v: any): any[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (v.data && Array.isArray(v.data)) return v.data;
  return [];
};

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    api.get<any>('/certificates')
      .then(res => setCertificates(toArray(res)))
      .catch(() => setCertificates([]))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (cert: any, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDownloadingId(cert.id);
    try {
      const data = mapCertToData(cert);
      const container = document.getElementById('cert-pdf-stage');
      if (!container) return;
      container.innerHTML = '';
      const wrapper = document.createElement('div');
      wrapper.style.position = 'absolute';
      wrapper.style.left = '-99999px';
      wrapper.style.top = '0';
      wrapper.style.width = (data.orientation === 'landscape' ? data.width : data.height) + 'px';
      container.appendChild(wrapper);

      const root = document.createElement('div');
      wrapper.appendChild(root);

      const { createRoot } = await import('react-dom/client');
      const { default: React } = await import('react');
      const reactElement = React.createElement(CertificateBody, { data, ref: undefined });
      const rootInstance = createRoot(root);
      rootInstance.render(reactElement);
      await new Promise((r) => setTimeout(r, 200));

      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(wrapper.firstElementChild as HTMLElement, { scale: 2, useCORS: true, backgroundColor: null, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const isLandscape = data.orientation === 'landscape';
      const pdf = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait', unit: 'px', format: [data.width, data.height] });
      pdf.addImage(imgData, 'PNG', 0, 0, data.width, data.height);
      const recipient = cert.user ? `${cert.user.firstName} ${cert.user.lastName}` : 'Certificate';
      pdf.save(`${recipient.replace(/\s+/g, '-')}-${cert.certificateNumber}.pdf`);
      rootInstance.unmount();
      wrapper.remove();
    } catch (err) {
      console.error(err);
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent-indigo" size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h2 className="text-2xl font-bold tracking-tight text-primary-text">My Certificates</h2>
        <p className="text-secondary-text text-sm mt-1">Download your earned certificates as PDF</p>
      </div>

      <div id="cert-pdf-stage" />

      {certificates.length === 0 ? (
        <Card variant="glass" className="animate-scale-in">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center mb-4">
              <Award size={36} className="text-accent-indigo" />
            </div>
            <p className="text-secondary-text mb-1">No certificates yet</p>
            <p className="text-sm text-secondary-text">Complete a course to earn your first certificate</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-stagger">
          {certificates.map((cert) => {
            const isPending = cert.status === 'pending';
            const isReleased = cert.status === 'released';
            return (
              <Card key={cert.id} variant="glass" className="relative overflow-hidden group border-white/30 hover:border-accent-indigo/30 transition-all duration-300 hover-lift">
                <div className="absolute inset-0 bg-gradient-to-br from-accent-indigo/5 to-accent-teal/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent-indigo to-accent-teal" />
                <CardContent className="p-5 space-y-3 relative">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isPending ? 'bg-amber-50' : 'bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10'}`}>
                      <Award size={20} className={isPending ? 'text-amber-600' : 'text-accent-indigo'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-primary-text truncate">{cert.title}</p>
                      <p className="text-xs text-secondary-text">
                        {isPending ? 'Submitted' : 'Issued'} {new Date(cert.issuedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {cert.course && (
                    <div className="flex items-center gap-2 text-xs text-secondary-text">
                      <BookOpen size={12} />
                      {cert.course.title}
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2">
                    {isPending ? (
                      <span className="text-xs px-2 py-0.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 font-medium flex items-center gap-1">
                        <Clock size={10} /> Awaiting approval
                      </span>
                    ) : isReleased ? (
                      <span className="text-xs px-2 py-0.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium flex items-center gap-1">
                        <CheckCircle2 size={10} /> Active
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-xl bg-red-50 text-red-700 border border-red-200 font-medium">Revoked</span>
                    )}
                    {isReleased ? (
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => handleDownload(cert, e)} disabled={downloadingId === cert.id}
                          className="text-xs text-accent-indigo hover:text-accent-indigo-light font-medium flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer">
                          {downloadingId === cert.id ? <Loader2 size={10} className="animate-spin" /> : <Download size={10} />}
                          {downloadingId === cert.id ? 'Downloading…' : 'Download PDF'}
                        </button>
                        <Link href={cert.verificationUrl} target="_blank" className="text-xs text-secondary-text hover:text-primary-text font-medium flex items-center gap-1 transition-colors">
                          Verify <ExternalLink size={10} />
                        </Link>
                      </div>
                    ) : isPending ? (
                      <span className="text-xs text-secondary-text">Pending review</span>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
