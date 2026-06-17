'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label, Card, CardHeader, CardTitle, CardContent, CardFooter } from '@sohaara/ui';
import { api } from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import { useCan } from '@/lib/auth';

export default function CreateCoursePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', level: 'all' });
  const canManage = useCan('admin', 'manager', 'instructor');

  useEffect(() => {
    if (!canManage) router.replace('/courses');
  }, [canManage, router]);

  if (!canManage) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const slug = form.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '');
      const course = await api.post<any>('/courses', {
        ...form,
        slug: `${slug}-${Date.now()}`,
        organizationId: undefined,
      });
      router.push(`/courses/${course.id}/edit`);
    } catch (err) {
      console.error('Failed to create course', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8 animate-fade-in-up">
        <button onClick={() => router.back()} className="text-secondary-text hover:text-primary-text cursor-pointer">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary-text">Create Course</h2>
          <p className="text-secondary-text text-sm mt-1">Set up a new course</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="animate-fade-in-up">
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-primary-text">Course Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" required className="text-primary-text">Course Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Introduction to React"
                required
                className="bg-white/60 border-indigo-200 focus:border-accent-indigo focus:ring-accent-indigo/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-primary-text">Description</Label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="flex min-h-[120px] w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all resize-none"
                placeholder="Describe what students will learn..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="level" className="text-primary-text">Level</Label>
              <select
                id="level"
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                className="flex h-10 w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all cursor-pointer"
              >
                <option value="all">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => router.back()} className="rounded-xl">
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading} className="rounded-xl shadow-lg shadow-accent-indigo/20">
              Create Course
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
