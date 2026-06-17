'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { PlayerSidebar } from '@/components/player/player-sidebar';
import { Loader2, ArrowLeft, BookOpen } from 'lucide-react';

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;
  const [enrollment, setEnrollment] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get<any>(`/enrollments/${courseId}`),
      api.get<any>(`/courses/${courseId}`).catch(() => null),
    ]).then(([enr, crs]) => {
      setEnrollment(enr);
      setCourse(crs);
    }).catch(() => {
      router.push(`/courses/${courseId}`);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    const handler = () => fetchData();
    window.addEventListener('enrollment-updated', handler);
    return () => window.removeEventListener('enrollment-updated', handler);
  }, [courseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50/30">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-accent-indigo" size={32} />
          <p className="text-secondary-text text-sm animate-pulse">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!enrollment) return null;

  const courseData = enrollment.course || course;
  const modules = (courseData?.modules || []).map((m: any) => ({
    id: m.id,
    title: m.title,
    sections: (m.sections || []).map((s: any) => ({
      id: s.id,
      title: s.title,
      lessons: (s.lessons || []).map((l: any) => ({
        id: l.id,
        title: l.title,
        type: l.type,
        sortOrder: l.sortOrder,
        completed: enrollment.lessonCompletions?.some((c: any) => c.lessonId === l.id && c.completed) || false,
      })),
    })),
  }));

  return (
    <div className="flex h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50/30">
      <PlayerSidebar
        modules={modules}
        courseId={courseId}
        currentLessonId={lessonId}
        enrollmentId={enrollment.id}
      />
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-14 border-b border-white/20 bg-white/70 backdrop-blur-xl flex items-center px-4 gap-3 flex-shrink-0">
          <button onClick={() => router.push(`/courses/${courseId}`)} className="text-secondary-text hover:text-primary-text transition-colors p-1.5 rounded-lg hover:bg-white/40">
            <ArrowLeft size={18} />
          </button>
          <div className="h-6 w-px bg-white/30" />
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent-indigo to-accent-indigo-light flex items-center justify-center text-white shadow-sm">
            <BookOpen size={14} />
          </div>
          <h1 className="text-sm font-semibold text-primary-text truncate">{courseData?.title}</h1>
          <div className="flex-1" />
          <div className="flex items-center gap-2.5 text-sm">
            <div className="h-2 w-28 rounded-full bg-white/40 overflow-hidden shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent-indigo to-emerald-400 transition-all duration-700 shadow-sm"
                style={{ width: `${enrollment.progress}%` }}
              />
            </div>
            <span className="text-xs font-bold text-accent-indigo font-mono bg-white/50 px-2 py-0.5 rounded-lg border border-white/30">
              {enrollment.progress}%
            </span>
          </div>
        </header>
        <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
