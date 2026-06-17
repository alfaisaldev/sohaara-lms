'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Input, Label, Card, CardContent } from '@sohaara/ui';
import { CurriculumEditor } from '@/components/curriculum-editor/curriculum-editor';
import { useCourseBuilderStore } from '@/lib/course-builder-store';
import { api } from '@/lib/api';
import { ArrowLeft, Loader2, Eye, Layers, Settings, BarChart3, Upload, FileText, MessageCircle, BookOpen, Clock, Users } from 'lucide-react';
import { useCan } from '@/lib/auth';
import { useBeforeUnload } from '@/hooks/use-unsaved-changes';
import QuizTab from '@/components/course-tabs/quiz-tab';
import AssignmentTab from '@/components/course-tabs/assignment-tab';
import ResourcesTab from '@/components/course-tabs/resources-tab';
import DiscussionTab from '@/components/course-tabs/discussion-tab';

type Tab = 'overview' | 'curriculum' | 'quiz' | 'assignment' | 'resources' | 'discussion' | 'settings';

export default function CourseEditPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const canManage = useCan('admin', 'content_manager', 'manager', 'instructor');
  const { title, description, dirty: curriculumDirty, setTitle, setDescription, loadCourse, setCourseId, reset } = useCourseBuilderStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [course, setCourse] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('curriculum');
  const [tabDirty, setTabDirty] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const pendingTab = useRef<Tab | null>(null);
  const pendingNav = useRef<string | null>(null);
  const isDirty = curriculumDirty || tabDirty;
  useBeforeUnload(isDirty);

  useEffect(() => {
    if (!canManage) router.replace('/courses');
  }, [canManage, router]);

  useEffect(() => {
    if (!courseId) return;
    setCourseId(courseId);

    api.get<any>(`/courses/${courseId}`)
      .then((course) => {
        setCourse(course);
        loadCourse(course);
        setLoading(false);
      })
      .catch(() => {
        router.push('/courses');
      });

    return () => { reset(); };
  }, [courseId]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await api.put(`/courses/${courseId}`, { title, description });
      setCourse((prev: any) => ({ ...prev, title, description }));
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-accent-indigo" size={32} />
      </div>
    );
  }

  const totalLessons = course?.modules?.reduce(
    (sum: number, m: any) => sum + (m.sections?.reduce((s: number, sec: any) => s + (sec.lessons?.length || 0), 0) || 0), 0
  ) || 0;

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview', icon: Eye },
    { id: 'curriculum' as Tab, label: 'Curriculum', icon: Layers },
    { id: 'quiz' as Tab, label: 'Quiz', icon: BarChart3 },
    { id: 'assignment' as Tab, label: 'Assignment', icon: Upload },
    { id: 'resources' as Tab, label: 'Resources', icon: FileText },
    { id: 'discussion' as Tab, label: 'Discussion', icon: MessageCircle },
    { id: 'settings' as Tab, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in-up">
      <div className="flex items-center gap-4">
        <button onClick={() => {
          if (isDirty) { pendingNav.current = '/courses'; setShowUnsavedConfirm(true); }
          else router.push('/courses');
        }} className="text-secondary-text hover:text-primary-text cursor-pointer">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {course && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                course.status === 'published' ? 'bg-success/20 text-success' :
                course.status === 'draft' ? 'bg-accent-orange/20 text-accent-orange' :
                'bg-secondary-text/20 text-secondary-text'
              }`}>
                {course.status}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-primary-text">Course Builder</h2>
          {course?.title && <p className="text-secondary-text text-sm mt-1">{course.title}</p>}
        </div>
      </div>

      <div className="flex gap-1 border-b border-white/30 pb-1 overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => {
                if (isDirty) { pendingTab.current = t.id; setShowUnsavedConfirm(true); }
                else setTab(t.id);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all cursor-pointer whitespace-nowrap ${
                tab === t.id
                  ? 'bg-white/70 text-accent-indigo shadow-sm border-b-2 border-accent-indigo'
                  : 'text-secondary-text hover:text-primary-text hover:bg-white/30'
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && course && (
        <div className="space-y-6">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Modules', value: course.modules?.length || 0, icon: BookOpen },
              { label: 'Lessons', value: totalLessons, icon: BookOpen },
              { label: 'Duration', value: course.estimatedHours ? `${course.estimatedHours}h` : '—', icon: Clock },
              { label: 'Enrolled', value: course._count?.enrollments || 0, icon: Users },
            ].map((stat) => (
              <Card key={stat.label} variant="glass">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center">
                    <stat.icon size={18} className="text-accent-indigo" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary-text">{stat.value}</p>
                    <p className="text-xs text-secondary-text">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 'curriculum' && (
        <CurriculumEditor />
      )}

      {tab === 'quiz' && <QuizTab courseId={courseId} onDirtyChange={setTabDirty} />}
      {tab === 'assignment' && <AssignmentTab courseId={courseId} onDirtyChange={setTabDirty} />}
      {tab === 'resources' && <ResourcesTab courseId={courseId} onDirtyChange={setTabDirty} />}
      {tab === 'discussion' && <DiscussionTab courseId={courseId} />}

      {tab === 'settings' && (
        <div className="space-y-6 max-w-3xl">
          <Card variant="glass">
            <CardContent className="p-6 space-y-5">
              <h3 className="text-lg font-bold tracking-tight text-primary-text">Course Settings</h3>
              <div className="space-y-2">
                <Label htmlFor="edit-title" className="text-primary-text">Course Title</Label>
                <Input
                  id="edit-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter course title"
                  className="bg-white/60 border-indigo-200 focus:border-accent-indigo focus:ring-accent-indigo/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-desc" className="text-primary-text">Description</Label>
                <textarea
                  id="edit-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="flex min-h-[100px] w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all resize-none"
                  placeholder="Course description"
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleSaveSettings} loading={saving} variant="primary" size="sm" className="rounded-xl shadow-lg shadow-accent-indigo/20">
                  Save Settings
                </Button>
                {course && (
                  <Button
                    onClick={async () => {
                      const newStatus = course.status === 'published' ? 'draft' : 'published';
                      await api.put(`/courses/${course.id}`, { status: newStatus });
                      setCourse((prev: any) => ({ ...prev, status: newStatus }));
                    }}
                    variant={course.status === 'published' ? 'outline' : 'primary'}
                    size="sm"
                    className="rounded-xl"
                  >
                    {course.status === 'published' ? 'Unpublish' : 'Publish'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Unsaved changes confirmation dialog */}
      {showUnsavedConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setShowUnsavedConfirm(false); pendingTab.current = null; pendingNav.current = null; }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in border border-white/50" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-primary-text mb-2">Unsaved Changes</h3>
            <p className="text-sm text-secondary-text mb-6">You have unsaved changes. Do you want to discard them and leave this page?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowUnsavedConfirm(false); pendingTab.current = null; pendingNav.current = null; }}
                className="px-4 py-2 rounded-xl text-sm text-secondary-text hover:bg-white/60 transition-colors cursor-pointer"
              >
                Stay
              </button>
              <button
                onClick={() => {
                  setShowUnsavedConfirm(false);
                  reset();
                  if (pendingTab.current != null) { setTab(pendingTab.current); pendingTab.current = null; }
                  if (pendingNav.current) { router.push(pendingNav.current); pendingNav.current = null; }
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-accent-orange to-orange-500 text-white text-sm font-medium hover:opacity-90 transition-all cursor-pointer"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
