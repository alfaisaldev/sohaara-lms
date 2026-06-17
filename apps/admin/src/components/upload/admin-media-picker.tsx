'use client';

import { useState, useEffect } from 'react';
import { X, Search, Image, Video, Music, FileText, Loader2, Check } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (media: any) => void;
  mimeType?: string;
}

async function fetchMedia(token: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_URL}/api/v1/media?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch media');
  return res.json();
}

export function AdminMediaPicker({ open, onClose, onSelect, mimeType }: MediaPickerProps) {
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const token = localStorage.getItem('adminToken');
    if (!token) return;
    const params: Record<string, string> = { limit: '30', page: String(page) };
    if (mimeType) params.mimeType = mimeType;
    if (search) params.search = search;
    fetchMedia(token, params)
      .then((res) => setMedia(res.data || []))
      .catch(() => setMedia([]))
      .finally(() => setLoading(false));
  }, [open, page, search, mimeType]);

  if (!open) return null;

  const handleSelect = () => {
    const item = media.find(m => m.id === selectedId);
    if (item) onSelect(item);
    onClose();
  };

  const getIcon = (mime: string) => {
    if (mime.startsWith('image/')) return <Image size={24} className="text-accent-indigo" />;
    if (mime.startsWith('video/')) return <Image size={24} className="text-orange-400" />;
    if (mime.startsWith('audio/')) return <Music size={24} className="text-green-400" />;
    return <FileText size={24} className="text-gray-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Media Library</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search media..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-10 py-2.5 text-sm text-white outline-none placeholder:text-gray-500 focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-accent-indigo" size={24} /></div>
          ) : media.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-12">No media found</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {media.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id === selectedId ? null : item.id)}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    selectedId === item.id ? 'border-accent-indigo ring-2 ring-accent-indigo/20' : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  {item.mimeType?.startsWith('image/') ? (
                    <img src={item.thumbnailUrl || item.url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/5">
                      {getIcon(item.mimeType)}
                    </div>
                  )}
                  {selectedId === item.id && (
                    <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-accent-indigo flex items-center justify-center">
                      <Check size={14} className="text-white" />
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="text-xs text-white truncate">{item.name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-white/10">
          <p className="text-xs text-gray-500">{media.length} items</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:bg-white/10 transition-colors cursor-pointer">Cancel</button>
            <button onClick={handleSelect} disabled={!selectedId}
              className="px-4 py-2 rounded-xl bg-accent-indigo text-white text-sm font-medium disabled:opacity-50 hover:bg-accent-indigo/90 transition-all cursor-pointer">
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
