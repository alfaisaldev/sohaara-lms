'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminApi as api } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { SearchBar } from '@/components/SearchBar';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AdminFileUpload } from '@/components/upload/admin-file-upload';
import { Image, Video, Music, FileText, Trash2, Upload, Loader2, Search, Plus } from 'lucide-react';

const PAGE_SIZE = 30;

const TABS = [
  { key: '', label: 'All', icon: Image },
  { key: 'image', label: 'Images', icon: Image },
  { key: 'video', label: 'Videos', icon: Video },
  { key: 'audio', label: 'Audio', icon: Music },
  { key: 'application', label: 'Documents', icon: FileText },
];

const TYPE_ICONS: Record<string, any> = {
  image: Image,
  video: Video,
  audio: Music,
  application: FileText,
};

function getTypeIcon(mimeType: string) {
  for (const [prefix, icon] of Object.entries(TYPE_ICONS)) {
    if (mimeType.startsWith(prefix)) return icon;
  }
  return FileText;
}

const formatSize = (bytes: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

export default function AdminMediaPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('');
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const toArray = (v: any): any[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (v.data && Array.isArray(v.data)) return v.data;
    return [];
  };

  const fetch = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number | boolean | undefined> = {
      page,
      limit: PAGE_SIZE,
    };
    if (tab) params.mimeType = tab;
    if (search) params.search = search;
    api.get<any>('/media', params)
      .then((res) => setItems(toArray(res)))
      .catch(() => toast('error', 'Failed to load media'))
      .finally(() => setLoading(false));
  }, [page, tab, search, toast]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/media/${deleteId}`);
      toast('success', 'Media deleted');
      setDeleteId(null);
      fetch();
    } catch (err: any) {
      toast('error', err.message || 'Failed to delete');
    }
  };

  const isImage = (mime: string) => mime?.startsWith('image/');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Image size={24} className="text-accent-indigo-light" />
            Media Library
          </h1>
          <p className="text-secondary-text text-sm mt-1">Manage uploaded files and assets</p>
        </div>
        <div className="flex items-center gap-3">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search media..." />
          <button
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-indigo hover:bg-accent-indigo/80 text-white text-sm font-medium transition-all"
          >
            <Upload size={16} />
            Upload
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10 w-fit animate-fade-in-up">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setPage(1); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[40vh]">
          <Loader2 className="animate-spin text-accent-indigo" size={28} />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[40vh] text-center">
          <div className="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <Search size={28} className="text-secondary-text/40" />
          </div>
          <p className="text-white font-medium">No media found</p>
          <p className="text-secondary-text text-sm mt-1">{search ? 'Try a different search term' : 'Upload your first file to get started'}</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 animate-stagger">
          {items.map((item) => {
            const Icon = getTypeIcon(item.mimeType);
            return (
              <div
                key={item.id}
                className="group relative rounded-xl border border-white/10 bg-white/5 hover:bg-white/[0.07] transition-all overflow-hidden"
              >
                <div className="aspect-video bg-gradient-to-br from-white/[0.03] to-white/[0.08] flex items-center justify-center overflow-hidden">
                  {isImage(item.mimeType) ? (
                    <img
                      src={item.url}
                      alt={item.name || ''}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <Icon size={40} className="text-secondary-text/30" />
                  )}
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-sm text-white font-medium truncate" title={item.name || item.fileName}>
                    {item.name || item.fileName}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-400">
                        {item.mimeType?.split('/')[1]?.split('+')[0] || item.mimeType}
                      </span>
                      <span className="text-xs text-secondary-text">{formatSize(item.size)}</span>
                    </div>
                    <button
                      onClick={() => setDeleteId(item.id)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-secondary-text hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Media" size="lg">
        <AdminFileUpload
          multiple
          onUpload={() => {
            toast('success', 'File uploaded');
            fetch();
          }}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Media"
        message="This action cannot be undone. The file will be permanently deleted."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
