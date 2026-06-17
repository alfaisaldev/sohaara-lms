'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, CardContent, Input, Label } from '@sohaara/ui';
import { api } from '@/lib/api';
import { useCourseBuilderStore } from '@/lib/course-builder-store';
import { CurriculumEditor } from '@/components/curriculum-editor/curriculum-editor';
import { ArrowLeft, BookOpen, Clock, BarChart3, Users, Loader2, Play, Plus, FileText, MessageCircle, Settings, Layers, Eye, Edit, CheckCircle, FileQuestion, Upload, Lock } from 'lucide-react';
import { useCan } from '@/lib/auth';
import QuizTab from '@/components/course-tabs/quiz-tab';
import AssignmentTab from '@/components/course-tabs/assignment-tab';
import ResourcesTab from '@/components/course-tabs/resources-tab';
import DiscussionTab from '@/components/course-tabs/discussion-tab';

type Tab = 'overview' | 'curriculum' | 'quiz' | 'assignment' | 'resources' | 'discussion' | 'settings';

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [savingSettings, setSavingSettings] = useState(false);
  const canManage = useCan('admin', 'content_manager', 'manager', 'instructor');

  const {
    title, description, setTitle, setDescription, loadCourse, setCourseId, reset,
    modules,
  } = useCourseBuilderStore();

  const fetchCourse = useCallback(() => {
    if (!params.courseId) return;
    Promise.all([
      api.get<any>(`/courses/${params.courseId}`),
      api.get<any>('/enrollments').catch(() => ({ data: [] })),
    ]).then(([courseData, enrollments]: any) => {
      setCourse(courseData);
      setCourseId(courseData.id);
      loadCourse(courseData);
      const enrolled = (enrollments.data || enrollments)?.some((e: any) => e.course?.id === params.courseId || e.courseId === params.courseId);
      setIsEnrolled(enrolled);
    }).catch(() => router.push('/courses'))
      .finally(() => setLoading(false));
  }, [params.courseId]);

  useEffect(() => {
    fetchCourse();
    return () => { reset(); };
  }, [fetchCourse]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await api.post(`/courses/${params.courseId}/enroll`);
      setIsEnrolled(true);
      fetchCourse();
    } catch {
      setIsEnrolled(false);
    } finally {
      setEnrolling(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!course) return;
    setSavingSettings(true);
    try {
      await api.put(`/courses/${course.id}`, { title, description });
      setCourse((prev: any) => ({ ...prev, title, description }));
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-secondary-text" size={32} />
      </div>
    );
  }

  if (!course) return null;

  const totalLessons = course.modules?.reduce(
    (sum: number, m: any) => sum + (m.sections?.reduce((s: number, sec: any) => s + (sec.lessons?.length || 0), 0) || 0), 0
  ) || 0;

  const showAssessments = isEnrolled || canManage;
  const tabs = [
    { id: 'overview' as Tab, label: 'Overview', icon: Eye },
    ...(canManage ? [{ id: 'curriculum' as Tab, label: 'Curriculum', icon: Layers }] : []),
    ...(showAssessments ? [{ id: 'quiz' as Tab, label: 'Quiz', icon: BarChart3 }] : []),
    ...(showAssessments ? [{ id: 'assignment' as Tab, label: 'Assignment', icon: Upload }] : []),
    ...(showAssessments ? [{ id: 'resources' as Tab, label: 'Resources', icon: FileText }] : []),
    ...(showAssessments ? [{ id: 'discussion' as Tab, label: 'Discussion', icon: MessageCircle }] : []),
    ...(canManage ? [{ id: 'settings' as Tab, label: 'Settings', icon: Settings }] : []),
  ];

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in-up">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/courses')} className="text-secondary-text hover:text-primary-text cursor-pointer">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent-green/20 text-accent-teal font-medium capitalize">
              {course.level}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              course.status === 'published' ? 'bg-success/20 text-success' :
              course.status === 'draft' ? 'bg-accent-orange/20 text-accent-orange' :
              'bg-secondary-text/20 text-secondary-text'
            }`}>
              {course.status}
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-primary-text">{course.title}</h2>
          {course.description && (
            <p className="text-secondary-text text-sm mt-1">{course.description}</p>
          )}
        </div>
        {!canManage && course.hidden && !isEnrolled && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
            <Lock size={16} /> Available via Learning Path only
          </div>
        )}
        {!canManage && !course.hidden && (
          isEnrolled ? (
            <Button
              onClick={() => router.push(`/courses/${course.id}/player`)}
              variant="primary"
              size="lg"
              className="bg-gradient-to-r from-accent-indigo to-accent-indigo-light shadow-xl shadow-accent-indigo/30 shrink-0 min-w-[140px] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <Play size={20} />
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleEnroll}
              loading={enrolling}
              variant="primary"
              size="lg"
              className="bg-gradient-to-r from-accent-indigo to-accent-indigo-light shadow-xl shadow-accent-indigo/30 shrink-0 min-w-[140px] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <Plus size={20} />
              Enroll
            </Button>
          )
        )}
      </div>

      <div className="flex gap-1 border-b border-white/30 pb-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all cursor-pointer ${
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

      {tab === 'overview' && (
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

          <div className="space-y-4">
            <h3 className="text-lg font-bold tracking-tight text-primary-text">Curriculum</h3>
            {course.modules?.length === 0 ? (
              <Card variant="glass">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center mb-4">
                    <BookOpen size={24} className="text-accent-indigo" />
                  </div>
                  <p className="text-secondary-text text-sm mb-4">No modules yet</p>
                  {canManage && (
                    <Button onClick={() => setTab('curriculum')} variant="primary" size="sm" className="rounded-xl shadow-lg shadow-accent-indigo/20">
                      Build Curriculum
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {course.modules?.map((mod: any, mi: number) => (
                  <Card key={mod.id} variant="glass">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-sm text-primary-text">
                          <span className="text-secondary-text mr-2">{mi + 1}.</span>
                          {mod.title}
                        </h4>
                        <span className="text-xs text-secondary-text">{mod.sections?.length || 0} sections</span>
                      </div>
                      {mod.sections?.map((sec: any, si: number) => (
                        <div key={sec.id} className="ml-6 border-l-2 border-accent-indigo/30 pl-4 py-1">
                          <p className="text-sm font-medium text-primary-text">{sec.title}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {sec.lessons?.map((les: any) => (
                              <span key={les.id} className="text-xs px-2 py-0.5 rounded bg-primary-bg text-secondary-text border border-border/50">
                                {les.title}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {isEnrolled && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold tracking-tight text-primary-text">Assessments</h3>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <Card variant="glass" className="cursor-pointer hover-lift hover:border-accent-indigo/40 transition-all" onClick={() => router.push(`/courses/${course.id}/quiz`)}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center">
                      <BarChart3 size={22} className="text-accent-indigo" />
                    </div>
                    <div>
                      <p className="font-bold text-primary-text">Quizzes</p>
                      <p className="text-sm text-secondary-text">Test your knowledge</p>
                    </div>
                  </CardContent>
                </Card>
                <Card variant="glass" className="cursor-pointer hover-lift hover:border-accent-indigo/40 transition-all" onClick={() => router.push(`/courses/${course.id}/assignment`)}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center">
                      <Edit size={22} className="text-accent-indigo" />
                    </div>
                    <div>
                      <p className="font-bold text-primary-text">Assignments</p>
                      <p className="text-sm text-secondary-text">Submit your work</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <h3 className="text-lg font-bold tracking-tight text-primary-text pt-4">Materials & Discussion</h3>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                <Card variant="glass" className="cursor-pointer hover-lift hover:border-accent-indigo/40 transition-all" onClick={() => router.push(`/courses/${course.id}/resources`)}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center">
                      <FileText size={22} className="text-accent-indigo" />
                    </div>
                    <div>
                      <p className="font-bold text-primary-text">Resources</p>
                      <p className="text-sm text-secondary-text">Downloadable materials</p>
                    </div>
                  </CardContent>
                </Card>
                <Card variant="glass" className="cursor-pointer hover-lift hover:border-accent-indigo/40 transition-all" onClick={() => router.push(`/community?courseId=${course.id}`)}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center">
                      <MessageCircle size={22} className="text-accent-indigo" />
                    </div>
                    <div>
                      <p className="font-bold text-primary-text">Discussion</p>
                      <p className="text-sm text-secondary-text">Ask questions & share</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'curriculum' && canManage && (
        <CurriculumEditor />
      )}

      {tab === 'settings' && canManage && (
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
                  className="flex min-h-[100px] w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all"
                  placeholder="Course description"
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleSaveSettings} loading={savingSettings} variant="primary" size="sm" className="rounded-xl shadow-lg shadow-accent-indigo/20">
                  Save Settings
                </Button>
                <Button
                  onClick={async () => {
                    const newStatus = course.status === 'published' ? 'draft' : 'published';
                    await api.put(`/courses/${course.id}`, { status: newStatus });
                    setCourse((prev: any) => ({ ...prev, status: newStatus }));
                    fetchCourse();
                  }}
                  variant={course.status === 'published' ? 'outline' : 'primary'}
                  size="sm"
                  className="rounded-xl"
                >
                  {course.status === 'published' ? 'Unpublish' : 'Publish'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'quiz' && showAssessments && <QuizTab courseId={course.id} />}
      {tab === 'assignment' && showAssessments && <AssignmentTab courseId={course.id} />}
      {tab === 'resources' && showAssessments && <ResourcesTab courseId={course.id} />}
      {tab === 'discussion' && showAssessments && <DiscussionTab courseId={course.id} />}
    </div>
  );
}
