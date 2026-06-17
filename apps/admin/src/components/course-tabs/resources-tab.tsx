'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi as api } from '@/lib/api';
import { Plus, Trash2, FileText, Video, Link2, File, Image, Loader2 } from 'lucide-react';
import { useToast } from '@/components/Toast';

const toArray = (v: any): any[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (v.data && Array.isArray(v.data)) return v.data;
  return [];
};

const TYPE_ICONS: Record<string, any> = {
  pdf: FileText, video: Video, image: Image, link: Link2, document: FileText, archive: File, other: File,
};

export default function AdminResourcesTab({ courseId, onDirtyChange }: { courseId: string; onDirtyChange?: (dirty: boolean) => void }) {
  const { toast } = useToast();
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('link');
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchResources = useCallback(() => {
    setLoading(true);
    api.get<any>(`/courses/${courseId}/resources`)
      .then(res => setResources(toArray(res)))
      .catch(() => setResources([]))
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  const handleAdd = async () => {
    if (!title.trim() || !url.trim()) return;
    setAdding(true);
    try {
      await api.post(`/courses/${courseId}/resources`, { title, type, url });
      toast('success', 'Resource added');
      setShowAdd(false);
      setTitle(''); setType('link'); setUrl('');
      onDirtyChange?.(false);
      fetchResources();
    } catch (err: any) {
      toast('error', err.message || 'Failed');
    } finally {
      setAdding(false);
    }
  };

  const deleteResource = async (id: string) => {
    try {
      await api.delete(`/resources/${id}`);
      fetchResources();
      toast('success', 'Resource deleted');
    } catch (err: any) {
      toast('error', err.message || 'Failed');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-accent-indigo" size={24} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-secondary-text">{resources.length} resource{resources.length !== 1 ? 's' : ''}</p>
        <button onClick={() => { setShowAdd(!showAdd); if (showAdd) onDirtyChange?.(false); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-indigo text-white text-sm font-medium hover:bg-accent-indigo/90 transition-all cursor-pointer">
          <Plus size={16} /> {showAdd ? 'Cancel' : 'Add Resource'}
        </button>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-border/60 bg-white/5 p-6 space-y-4">
          <h3 className="text-base font-semibold text-white">New Resource</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-300 mb-1">Title *</label>
              <input value={title} onChange={(e) => { setTitle(e.target.value); onDirtyChange?.(true); }} className="w-full rounded-lg border border-border/60 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-indigo/50" />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">Type</label>
              <select value={type} onChange={(e) => { setType(e.target.value); onDirtyChange?.(true); }} className="w-full rounded-lg border border-border/60 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-indigo/50">
                <option className="text-gray-900 bg-white" value="link">Link</option>
                <option className="text-gray-900 bg-white" value="pdf">PDF</option>
                <option className="text-gray-900 bg-white" value="video">Video</option>
                <option className="text-gray-900 bg-white" value="image">Image</option>
                <option className="text-gray-900 bg-white" value="document">Document</option>
                <option className="text-gray-900 bg-white" value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">URL *</label>
              <input value={url} onChange={(e) => { setUrl(e.target.value); onDirtyChange?.(true); }} placeholder="https://..." className="w-full rounded-lg border border-border/60 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-indigo/50" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleAdd} disabled={adding || !title.trim() || !url.trim()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-indigo text-white text-sm font-medium hover:bg-accent-indigo/90 disabled:opacity-40 transition-all cursor-pointer">
              <Plus size={14} /> {adding ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {resources.length === 0 && !showAdd ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-border/30 bg-white/[0.02]">
          <FileText size={40} className="text-secondary-text/20 mb-4" />
          <p className="text-secondary-text text-sm">No resources yet</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {resources.map((r: any) => {
            const Icon = TYPE_ICONS[r.type] || File;
            return (
              <div key={r.id} className="rounded-xl border border-border/30 bg-white/[0.02] p-4 flex items-center gap-3 group">
                <Icon size={18} className="text-accent-indigo shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{r.title}</p>
                  <p className="text-xs text-secondary-text truncate mt-0.5">{r.url}</p>
                </div>
                <button onClick={() => deleteResource(r.id)} className="text-secondary-text hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
