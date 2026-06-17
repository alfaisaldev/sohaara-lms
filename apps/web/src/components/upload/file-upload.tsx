'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, File, Image, Video, Music, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface FileUploadProps {
  onUpload?: (url: string, media: any) => void;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  folder?: string;
  label?: string;
}

const MIME_ICONS: Record<string, any> = {
  'image/': Image,
  'video/': Video,
  'audio/': Music,
  'application/': FileText,
};

function getIcon(mimeType: string) {
  for (const [prefix, icon] of Object.entries(MIME_ICONS)) {
    if (mimeType.startsWith(prefix)) return icon;
  }
  return File;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function FileUpload({ onUpload, accept, maxSize = 50 * 1024 * 1024, multiple = false, label }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<{ file: File; progress: number; status: 'pending' | 'uploading' | 'done' | 'error'; url?: string; error?: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    if (file.size > maxSize) {
      setPreviews(p => p.map(pr => pr.file === file ? { ...pr, status: 'error', error: `File too large (max ${formatSize(maxSize)})` } : pr));
      return;
    }

    setPreviews(p => p.map(pr => pr.file === file ? { ...pr, status: 'uploading', progress: 0 } : pr));

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name);

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/api/v1/media/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Upload failed');
      const media = await res.json();
      setPreviews(p => p.map(pr => pr.file === file ? { ...pr, status: 'done', url: media.url } : pr));
      onUpload?.(media.url, media);
    } catch (e: any) {
      setPreviews(p => p.map(pr => pr.file === file ? { ...pr, status: 'error', error: e.message } : pr));
    }
  }, [maxSize, onUpload]);

  const handleFiles = useCallback((files: FileList) => {
    const newPreviews = Array.from(files).map(file => ({
      file,
      progress: 0,
      status: 'pending' as const,
    }));
    setPreviews(p => [...p, ...newPreviews]);
    Array.from(files).forEach(uploadFile);
  }, [uploadFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removePreview = (file: File) => {
    setPreviews(p => p.filter(pr => pr.file !== file));
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 ${
          dragOver
            ? 'border-accent-indigo bg-accent-indigo/5'
            : 'border-white/30 bg-white/20 hover:border-accent-indigo/40 hover:bg-white/30'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-2">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center">
            <Upload size={24} className="text-accent-indigo" />
          </div>
          <p className="text-sm text-primary-text font-medium">{label || 'Drop files here or click to browse'}</p>
          <p className="text-xs text-secondary-text">Up to {formatSize(maxSize)} per file</p>
        </div>
      </div>

      {previews.length > 0 && (
        <div className="space-y-2">
          {previews.map((pr, i) => {
            const Icon = getIcon(pr.file.type);
            return (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/40 backdrop-blur-sm border border-white/20">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center flex-shrink-0">
                  {pr.status === 'done' && pr.file.type.startsWith('image/') ? (
                    <img src={pr.url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <Icon size={20} className="text-accent-indigo" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-primary-text truncate">{pr.file.name}</p>
                  <p className="text-xs text-secondary-text">{formatSize(pr.file.size)}</p>
                  {pr.status === 'uploading' && (
                    <div className="w-full h-1 rounded-full bg-white/30 mt-1">
                      <div className="h-full rounded-full bg-gradient-to-r from-accent-indigo to-accent-teal animate-pulse" style={{ width: '60%' }} />
                    </div>
                  )}
                  {pr.status === 'error' && <p className="text-xs text-danger mt-0.5">{pr.error}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {pr.status === 'uploading' && <Loader2 size={16} className="animate-spin text-accent-indigo" />}
                  {pr.status === 'done' && <CheckCircle size={16} className="text-success" />}
                  {pr.status === 'error' && <AlertCircle size={16} className="text-danger" />}
                  {pr.status !== 'uploading' && (
                    <button onClick={() => removePreview(pr.file)} className="p-1 rounded-lg hover:bg-white/20 transition-colors cursor-pointer">
                      <X size={14} className="text-secondary-text" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
