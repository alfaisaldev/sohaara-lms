'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@sohaara/ui';
import { api } from '@/lib/api';
import { Loader2, FileText, Link2, BookOpen, Plus, Trash2, File, Video, Archive, Image } from 'lucide-react';

const toArray = (v: any): any[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (v.data && Array.isArray(v.data)) return v.data;
  return [];
};

const TYPE_ICONS: Record<string, any> = {
  pdf: FileText,
  video: Video,
  image: Image,
  link: Link2,
  document: FileText,
  archive: Archive,
  other: File,
};

export default function CourseResourcesPage() {
  const router = useRouter();
  const params = useParams<{ courseId: string }>();
  const [resources, setResources] = useState<any[]>([]);
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('link');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [adding, setAdding] = useState(false);

  const courseId = params.courseId;

  useEffect(() => {
    if (!courseId) return;
    Promise.all([
      api.get<any>(`/courses/${courseId}`),
      api.get<any>(`/courses/${courseId}/resources`),
    ]).then(([c, r]) => {
      setCourse(c);
      setResources(toArray(r));
    }).catch(() => { setCourse(null); setResources([]); })
      .finally(() => setLoading(false));
  }, [courseId]);

  const handleAdd = async () => {
    if (!title.trim() || !url.trim()) return;
    setAdding(true);
    try {
      const res = await api.post(`/courses/${courseId}/resources`, { title, type, url, description });
      setResources([...resources, res]);
      setShowAdd(false);
      setTitle('');
      setUrl('');
      setDescription('');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/resources/${id}`);
    setResources(resources.filter((r) => r.id !== id));
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent-indigo" size={32} /></div>;

  const IconComponent = TYPE_ICONS[type] || File;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-primary-text">Resources</h2>
          {course && <p className="text-sm text-secondary-text mt-0.5">{course.title}</p>}
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} variant="primary" size="sm" className="rounded-xl shadow-lg shadow-accent-indigo/20">
          <Plus size={16} /> Add Resource
        </Button>
      </div>

      {showAdd && (
        <Card variant="glass" className="animate-scale-in">
          <CardContent className="p-5 space-y-4">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Resource name" className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all resize-none min-h-[50px]" />
            <div className="grid grid-cols-2 gap-4">
              <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all cursor-pointer">
                <option value="link">Link</option>
                <option value="pdf">PDF</option>
                <option value="video">Video</option>
                <option value="document">Document</option>
                <option value="image">Image</option>
                <option value="archive">Archive</option>
                <option value="other">Other</option>
              </select>
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL" className="rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all" />
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setShowAdd(false)} variant="ghost" size="sm" className="rounded-xl cursor-pointer">Cancel</Button>
              <Button onClick={handleAdd} loading={adding} variant="primary" size="sm" className="rounded-xl shadow-lg shadow-accent-indigo/20 cursor-pointer">Add</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {resources.length === 0 ? (
        <Card variant="glass" className="animate-scale-in">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center mb-4">
              <BookOpen size={36} className="text-accent-indigo" />
            </div>
            <p className="text-secondary-text font-medium">No resources yet</p>
            <p className="text-sm text-secondary-text">Add links, PDFs, videos, and more</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 animate-stagger">
          {resources.map((r) => {
            const ResIcon = TYPE_ICONS[r.type] || File;
            return (
              <Card key={r.id} variant="glass">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center flex-shrink-0">
                    <ResIcon size={16} className="text-accent-indigo" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sm text-primary-text hover:text-accent-indigo transition-colors cursor-pointer">{r.title}</a>
                        {r.description && <p className="text-xs text-secondary-text mt-0.5">{r.description}</p>}
                      </div>
                      <button onClick={() => handleDelete(r.id)} className="text-secondary-text hover:text-danger ml-2 transition-colors cursor-pointer">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-white/40 text-secondary-text border border-white/30">{r.type}</span>
                      {r.fileSize && <span className="text-xs text-secondary-text">{(r.fileSize / 1024).toFixed(0)} KB</span>}
                    </div>
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
