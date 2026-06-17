'use client';

import { useState, useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface AvatarUploadProps {
  currentUrl?: string;
  initials: string;
  onUpdate: (url: string) => void;
  size?: number;
}

export function AvatarUpload({ currentUrl, initials, onUpdate, size = 96 }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) return;

    // Show local preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    // Upload
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API_URL}/api/v1/media/avatar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        onUpdate(data.url);
      }
    } catch {
      // fallback to local preview
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="w-full h-full rounded-full bg-gradient-to-br from-accent-indigo to-accent-indigo-light flex items-center justify-center text-white font-bold shadow-lg overflow-hidden cursor-pointer group"
        onClick={() => inputRef.current?.click()}
      >
        {preview || currentUrl ? (
          <img src={preview || currentUrl || ''} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="select-none" style={{ fontSize: size * 0.35 }}>{initials}</span>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-white" />
          </div>
        )}
        <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <Camera size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}
