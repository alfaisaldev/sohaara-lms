'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi as api } from '@/lib/api';
import { Button, Card, CardContent, Input, Label } from '@sohaara/ui';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/components/Toast';

const toArray = (v: any): any[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (v.data && Array.isArray(v.data)) return v.data;
  return [];
};

export default function CreateCoursePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [level, setLevel] = useState('beginner');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft');
  const [hidden, setHidden] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<any>('/courses/categories').then((res) => setCategories(toArray(res))).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast('error', 'Course title is required'); return; }
    setSaving(true);
    try {
      const course = await api.post<any>('/courses', {
        title: title.trim(),
        description,
        excerpt,
        level,
        categoryId: category || undefined,
        status,
        hidden,
      });
      toast('success', 'Course created successfully');
      router.push(`/admin/courses/${course.id}`);
    } catch (err: any) {
      toast('error', err.message || 'Failed to create course');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl animate-fade-in-up">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/admin/courses')} className="text-secondary-text hover:text-white cursor-pointer">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Create Course</h1>
          <p className="text-secondary-text text-sm mt-1">Set up a new course on the platform</p>
        </div>
      </div>

      <Card variant="glass" className="overflow-hidden">
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Course Title *</label>
              <input required value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Introduction to Machine Learning"
                className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-secondary-text/50 outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all" />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief overview of the course..."
                rows={3}
                className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-secondary-text/50 outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all resize-none" />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Excerpt</label>
              <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Short summary for course cards..."
                rows={2}
                className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-secondary-text/50 outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Level</label>
                <select value={level} onChange={(e) => setLevel(e.target.value)}
                  className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all">
                  <option className="text-gray-900 bg-white" value="beginner">Beginner</option>
                  <option className="text-gray-900 bg-white" value="intermediate">Intermediate</option>
                  <option className="text-gray-900 bg-white" value="advanced">Advanced</option>
                  <option className="text-gray-900 bg-white" value="all">All Levels</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all">
                  <option className="text-gray-900 bg-white" value="">Select category...</option>
                  {categories.map((c: any) => <option className="text-gray-900 bg-white" key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as any)}
                className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all">
                <option className="text-gray-900 bg-white" value="draft">Draft</option>
                <option className="text-gray-900 bg-white" value="published">Published</option>
                <option className="text-gray-900 bg-white" value="archived">Archived</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="hidden" checked={hidden} onChange={(e) => setHidden(e.target.checked)}
                className="rounded border-border/60 bg-white/5 accent-accent-indigo cursor-pointer" />
              <label htmlFor="hidden" className="text-sm text-gray-300 cursor-pointer">Hidden (only accessible via Learning Path)</label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
              <Button type="button" onClick={() => router.push('/admin/courses')} variant="ghost" size="sm" className="rounded-xl cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="rounded-xl cursor-pointer" loading={saving}>
                {saving ? 'Creating...' : 'Create Course'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
