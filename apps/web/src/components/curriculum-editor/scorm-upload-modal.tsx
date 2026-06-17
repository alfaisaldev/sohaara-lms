'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@sohaara/ui';
import { X, Upload, FileArchive, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface ScormUploadModalProps {
  courseId: string;
  onClose: () => void;
  onImport: (pkg: any) => void;
}

export function ScormUploadModal({ courseId, onClose, onImport }: ScormUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [packages, setPackages] = useState<any[]>([]);
  const [loadingPkgs, setLoadingPkgs] = useState(true);

  useState(() => {
    api.get<any>(`/scorm/course/${courseId}`)
      .then((res: any) => setPackages(Array.isArray(res) ? res : res.data || []))
      .catch(() => {})
      .finally(() => setLoadingPkgs(false));
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      const pkg = await api.upload<any>(`/scorm/upload/${courseId}`, formData);
      setPackages((prev) => [pkg, ...prev]);
      setFile(null);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-white/30 w-full max-w-lg mx-4 max-h-[80vh] flex flex-col animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/20">
          <div className="flex items-center gap-2">
            <FileArchive size={20} className="text-accent-indigo" />
            <h3 className="text-lg font-semibold text-primary-text">SCORM Packages</h3>
          </div>
          <button onClick={onClose} className="text-secondary-text hover:text-primary-text transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="glass rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-primary-text">Upload SCORM Package</p>
            <label className="flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-xl border-2 border-dashed border-white/30 hover:border-accent-indigo/30 cursor-pointer transition-all bg-white/40">
              <Upload size={24} className="text-secondary-text" />
              <span className="text-sm text-secondary-text">{file ? file.name : 'Click to select a SCORM zip file'}</span>
              {file && (
                <span className="text-xs text-secondary-text">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
              )}
              <input
                type="file"
                accept=".zip"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            {error && (
              <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              loading={uploading}
              variant="primary"
              size="sm"
              className="w-full rounded-xl"
            >
              {uploading ? 'Uploading...' : 'Upload Package'}
            </Button>
          </div>

          <div>
            <p className="text-sm font-medium text-primary-text mb-3">Available Packages</p>
            {loadingPkgs ? (
              <div className="flex justify-center py-4">
                <Loader2 className="animate-spin text-secondary-text" size={20} />
              </div>
            ) : packages.length === 0 ? (
              <p className="text-xs text-secondary-text text-center py-4">No SCORM packages uploaded yet</p>
            ) : (
              <div className="space-y-2">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="flex items-center gap-3 px-3 py-2.5 bg-white/60 rounded-lg border border-white/30 hover:border-accent-indigo/30 transition-all group">
                    <FileArchive size={16} className="text-accent-indigo shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary-text truncate">{pkg.title}</p>
                      <p className="text-xs text-secondary-text">SCORM {pkg.version} &middot; {pkg.fileSize ? `${(pkg.fileSize / 1024 / 1024).toFixed(1)} MB` : 'N/A'}</p>
                    </div>
                    <Button
                      onClick={() => onImport(pkg)}
                      variant="primary"
                      size="sm"
                      className="rounded-xl text-xs opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <CheckCircle size={12} />
                      Use
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
