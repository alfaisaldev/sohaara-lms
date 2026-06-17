'use client';

import { useState } from 'react';
import { adminApi as api } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Image as ImageIcon, Type } from 'lucide-react';

export default function NewTemplatePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast('error', 'Template name is required'); return; }
    setSaving(true);
    try {
      const width = orientation === 'landscape' ? 1200 : 800;
      const height = orientation === 'landscape' ? 800 : 1200;
      const res: any = await api.post('/certificate-templates', {
        name: name.trim(),
        description: description.trim() || undefined,
        content: JSON.stringify({ fields: [] }),
        orientation,
        width,
        height,
      });
      toast('success', 'Template created — opening builder');
      router.push(`/admin/certificates/builder/${res.id}`);
    } catch (err: any) {
      toast('error', err.message || 'Failed to create template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto animate-fade-in-up">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/admin/certificates')} className="text-secondary-text hover:text-white cursor-pointer p-2 rounded-lg hover:bg-white/5">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">New Certificate Template</h1>
          <p className="text-secondary-text text-sm mt-0.5">Start from a blank canvas — upload a background image and add text & logos</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-white/[0.02] p-6">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs text-secondary-text font-medium uppercase tracking-wider mb-1.5">Template Name *</label>
            <input required autoFocus value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard Completion, Excellence Award"
              className="w-full rounded-lg border border-border/60 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50" />
          </div>
          <div>
            <label className="block text-xs text-secondary-text font-medium uppercase tracking-wider mb-1.5">Description (optional)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              placeholder="A short note about when to use this template"
              className="w-full rounded-lg border border-border/60 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 resize-none" />
          </div>
          <div>
            <label className="block text-xs text-secondary-text font-medium uppercase tracking-wider mb-1.5">Orientation</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setOrientation('landscape')}
                className={`p-3 rounded-lg border transition-all cursor-pointer text-left ${
                  orientation === 'landscape' ? 'border-accent-indigo bg-accent-indigo/10' : 'border-border/60 bg-white/5 hover:border-accent-indigo/40'
                }`}>
                <div className="h-10 w-16 bg-white/10 border border-white/20 rounded mb-1.5" />
                <p className="text-xs text-white font-medium">Landscape</p>
                <p className="text-[10px] text-secondary-text">1200 × 800</p>
              </button>
              <button type="button" onClick={() => setOrientation('portrait')}
                className={`p-3 rounded-lg border transition-all cursor-pointer text-left ${
                  orientation === 'portrait' ? 'border-accent-indigo bg-accent-indigo/10' : 'border-border/60 bg-white/5 hover:border-accent-indigo/40'
                }`}>
                <div className="h-16 w-10 bg-white/10 border border-white/20 rounded mb-1.5" />
                <p className="text-xs text-white font-medium">Portrait</p>
                <p className="text-[10px] text-secondary-text">800 × 1200</p>
              </button>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-accent-indigo/5 border border-accent-indigo/20 flex items-start gap-2">
            <Sparkles size={14} className="text-accent-indigo-light mt-0.5 shrink-0" />
            <p className="text-[11px] text-secondary-text">
              After saving, you can upload a background image (PNG/JPEG/WEBP/SVG) and click to add text fields and logos. Use <code className="text-accent-indigo-light">{`{{recipientName}}`}</code> to insert variables.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => router.push('/admin/certificates')}
              className="px-4 py-2 rounded-xl text-sm text-secondary-text hover:bg-white/5 transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-accent-indigo to-accent-indigo-light text-white text-sm font-medium hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50">
              <Sparkles size={14} />
              {saving ? 'Creating…' : 'Open Builder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
