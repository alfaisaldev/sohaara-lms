'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi as api } from '@/lib/api';
import { Card } from '@sohaara/ui';
import { Loader2, ArrowLeft, BookOpen, GraduationCap, BarChart3, CheckCircle, Clock, Trophy, ChevronDown, ChevronRight, FileText, Video, FileType, ExternalLink, XCircle } from 'lucide-react';

type LessonType = 'video' | 'text' | 'pdf' | 'embed' | 'external' | 'quiz' | 'assignment';

const lessonIcons: Record<LessonType, any> = {
  video: Video, text: FileText, pdf: FileType,
  embed: ExternalLink, external: ExternalLink, quiz: Trophy, assignment: FileText,
};

function toPercentage(val: any): number {
  const n = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(n) ? 0 : Math.round(n);
}

export default function LearnerProgressPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedEnrollment, setExpandedEnrollment] = useState<string | null>(null);
  const [enrollmentDetail, setEnrollmentDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<any>(`/users/${userId}`),
      api.get<any>(`/enrollments/admin/${userId}`),
      api.get<any>(`/analytics/admin/users/${userId}`).catch(() => null),
    ]).then(([userData, enrollData, analyticsData]: any) => {
      setUser(userData);
      setEnrollments(Array.isArray(enrollData) ? enrollData : enrollData?.data || []);
      setAnalytics(analyticsData);
    }).catch(() => {
      router.push('/admin/users');
    }).finally(() => setLoading(false));
  }, [userId, router]);

  const handleExpandEnrollment = async (enrollmentId: string, courseId: string) => {
    if (expandedEnrollment === enrollmentId) {
      setExpandedEnrollment(null);
      setEnrollmentDetail(null);
      return;
    }
    setExpandedEnrollment(enrollmentId);
    setDetailLoading(true);
    try {
      const data = await api.get<any>(`/enrollments/admin/${userId}/${courseId}`);
      setEnrollmentDetail(data);
    } catch {
      setEnrollmentDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = enrollments.length;
    const completed = enrollments.filter((e) => e.status === 'completed').length;
    const inProgress = enrollments.filter((e) => e.status === 'active').length;
    const dropped = enrollments.filter((e) => e.status === 'dropped').length;
    const avgProgress = total > 0
      ? Math.round(enrollments.reduce((s, e) => s + (e.progress || 0), 0) / total)
      : 0;
    return { total, completed, inProgress, dropped, avgProgress, ...(analytics || {}) };
  }, [enrollments, analytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-accent-indigo" size={32} />
          <p className="text-secondary-text text-sm">Loading learner progress...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <button
        onClick={() => router.push('/admin/users?role=learner')}
        className="flex items-center gap-2 text-sm text-secondary-text hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft size={16} />
        Back to Learners
      </button>

      <Card className="glass-dark-card border-border/50 p-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-accent-indigo to-accent-indigo-light flex items-center justify-center text-lg font-bold text-white shrink-0">
            {(user.firstName || '')[0] || ''}{(user.lastName || '')[0] || ''}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{user.firstName} {user.lastName}</h1>
            <p className="text-secondary-text text-sm">{user.email}</p>
          </div>
          <span className="ml-auto px-3 py-1 rounded-full bg-accent-indigo/10 text-accent-indigo-light text-xs font-medium border border-accent-indigo/20 capitalize">
            Learner
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-border/50 bg-white/5 p-4 hover:bg-white/[0.04] transition-colors">
          <div className="flex items-center gap-2 text-secondary-text text-xs mb-2">
            <BookOpen size={14} />
            <span>Enrollments</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-white/5 p-4 hover:bg-white/[0.04] transition-colors">
          <div className="flex items-center gap-2 text-emerald-400 text-xs mb-2">
            <CheckCircle size={14} />
            <span>Completed</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.completed}</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-white/5 p-4 hover:bg-white/[0.04] transition-colors">
          <div className="flex items-center gap-2 text-amber-400 text-xs mb-2">
            <Clock size={14} />
            <span>In Progress</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.inProgress}</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-white/5 p-4 hover:bg-white/[0.04] transition-colors">
          <div className="flex items-center gap-2 text-accent-indigo-light text-xs mb-2">
            <BarChart3 size={14} />
            <span>Avg Progress</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.avgProgress}%</p>
        </div>
      </div>

      {analytics && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border/50 bg-white/5 p-4 hover:bg-white/[0.04] transition-colors">
            <div className="flex items-center gap-2 text-secondary-text text-xs mb-2">
              <Trophy size={14} />
              <span>Avg Quiz Score</span>
            </div>
            <p className="text-2xl font-bold text-white">{analytics.avgQuizScore || 0}%</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-white/5 p-4 hover:bg-white/[0.04] transition-colors">
            <div className="flex items-center gap-2 text-secondary-text text-xs mb-2">
              <GraduationCap size={14} />
              <span>Completion Rate</span>
            </div>
            <p className="text-2xl font-bold text-white">{analytics.completionRate || 0}%</p>
          </div>
          <div className="rounded-xl border border-border/50 bg-white/5 p-4 hover:bg-white/[0.04] transition-colors">
            <div className="flex items-center gap-2 text-secondary-text text-xs mb-2">
              <BarChart3 size={14} />
              <span>Avg Assignment</span>
            </div>
            <p className="text-2xl font-bold text-white">{analytics.avgAssignmentScore || 0}%</p>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BookOpen size={18} className="text-accent-indigo-light" />
          Course Enrollments
        </h2>
        <div className="space-y-3">
          {enrollments.length === 0 && (
            <div className="rounded-xl border border-border/50 bg-white/5 p-8 text-center">
              <BookOpen size={32} className="mx-auto text-secondary-text/30 mb-3" />
              <p className="text-secondary-text text-sm">No course enrollments</p>
            </div>
          )}
          {enrollments.map((enr) => (
            <div key={enr.id} className="rounded-xl border border-border/50 bg-white/5 overflow-hidden hover:border-accent-indigo/40 transition-all">
              <div
                onClick={() => handleExpandEnrollment(enr.id, enr.courseId)}
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/5 transition-colors"
              >
                <div className="h-12 w-16 rounded-lg bg-gradient-to-br from-accent-indigo/20 to-accent-indigo/5 flex items-center justify-center shrink-0 overflow-hidden">
                  {enr.course?.thumbnail
                    ? <img src={enr.course.thumbnail} alt="" className="h-full w-full object-cover" />
                    : <BookOpen size={20} className="text-accent-indigo-light/60" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{enr.course?.title || 'Unknown Course'}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-secondary-text capitalize">{enr.course?.level || 'all'}</span>
                    {enr.course?.estimatedHours && (
                      <span className="text-xs text-secondary-text">{enr.course.estimatedHours}h</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32">
                    <div className="flex justify-between text-xs mb-1">
                      <span className={enr.status === 'completed' ? 'text-emerald-400' : enr.status === 'dropped' ? 'text-red-400' : 'text-accent-indigo-light'}>
                        {toPercentage(enr.progress)}%
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${
                        enr.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                        enr.status === 'dropped' ? 'bg-red-500/10 text-red-400' :
                        enr.status === 'active' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-gray-500/10 text-gray-400'
                      }`}>
                        {enr.status}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          enr.status === 'completed' ? 'bg-emerald-500' :
                          enr.status === 'dropped' ? 'bg-red-500' :
                          'bg-accent-indigo'
                        }`}
                        style={{ width: `${toPercentage(enr.progress)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-secondary-text">
                    {expandedEnrollment === enr.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </div>
              </div>

              {expandedEnrollment === enr.id && (
                <div className="border-t border-border/50 px-4 py-4">
                  {detailLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="animate-spin text-accent-indigo" size={20} />
                    </div>
                  ) : enrollmentDetail ? (
                    <EnrollmentDetailView enrollment={enrollmentDetail} />
                  ) : (
                    <p className="text-secondary-text text-sm text-center">Failed to load course details</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getAnswerText(ans: any, q: any): string {
  if (!ans) return 'No answer';
  const type = q?.type;
  if (type === 'multiple_choice' || type === 'true_false') {
    const val = ans.answer;
    if (type === 'true_false') return val === 'true' ? 'True' : 'False';
    const opt = q.options?.find((o: any) => o.id === val);
    return opt ? opt.text : String(val || '—');
  }
  if (type === 'multiple_select') {
    const ids = ans.answers || [];
    return ids.map((id: string) => q.options?.find((o: any) => o.id === id)?.text || id).join(', ') || 'None selected';
  }
  if (type === 'matching') {
    try {
      const map = typeof ans.matchingAnswer === 'string' ? JSON.parse(ans.matchingAnswer) : (ans.matchingAnswer || {});
      return Object.entries(map).map(([k, v]) => {
        const pair = q.matchingPairs?.find((p: any) => p.id === k);
        return pair ? `${pair.left} → ${v}` : `${k} → ${v}`;
      }).join('; ') || '—';
    } catch { return String(ans.matchingAnswer || '—'); }
  }
  if (type === 'fill_blank') return String(ans.answer || '—');
  if (type === 'short_answer' || type === 'essay') return ans.answer ? `"${ans.answer}"` : 'No answer';
  return String(ans.answer || '—');
}

function getCorrectText(q: any): string {
  const type = q?.type;
  if (type === 'multiple_choice') {
    const opt = q.options?.find((o: any) => o.id === q.correctAnswer);
    return opt ? opt.text : '—';
  }
  if (type === 'true_false') return q.correctAnswer === 'true' ? 'True' : 'False';
  if (type === 'multiple_select') {
    return (q.correctAnswers || []).map((id: string) => q.options?.find((o: any) => o.id === id)?.text || id).join(', ') || '—';
  }
  if (type === 'fill_blank') return String(q.correctAnswer || '—');
  if (type === 'matching') {
    return (q.matchingPairs || []).map((p: any) => `${p.left} → ${p.right}`).join('; ') || '—';
  }
  if (type === 'short_answer' || type === 'essay') return 'Manual review';
  return '—';
}

function EnrollmentDetailView({ enrollment }: { enrollment: any }) {
  const modules = enrollment?.course?.modules || [];
  const quizAttempts = enrollment?.quizAttempts || [];
  const [expandedAttempt, setExpandedAttempt] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-secondary-text mb-2">
        <span>Started: {new Date(enrollment.startedAt).toLocaleDateString()}</span>
        {enrollment.completedAt && <span>Completed: {new Date(enrollment.completedAt).toLocaleDateString()}</span>}
        <span className="ml-auto text-white font-medium">{toPercentage(enrollment.progress)}% complete</span>
      </div>

      {modules.length === 0 && (
        <p className="text-secondary-text text-sm text-center py-4">No modules in this course</p>
      )}

      {modules.map((mod: any) => {
        const sections = mod.sections || [];
        const allLessons = sections.flatMap((s: any) => s.lessons || []);
        const completedLessons = allLessons.filter((l: any) => l.completions?.length > 0 && l.completions[0]?.completed);
        const modProgress = allLessons.length > 0 ? Math.round((completedLessons.length / allLessons.length) * 100) : 0;

        return (
          <div key={mod.id} className="rounded-lg border border-border/30 bg-white/[0.02] overflow-hidden">
            <div className="flex items-center gap-3 px-3 py-2.5 bg-white/[0.03]">
              <p className="text-sm font-medium text-white flex-1">{mod.title}</p>
              <span className="text-xs text-secondary-text">{completedLessons.length}/{allLessons.length}</span>
              <div className="w-20">
                <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-accent-indigo transition-all" style={{ width: `${modProgress}%` }} />
                </div>
              </div>
              <span className={`text-xs font-medium ${modProgress === 100 ? 'text-emerald-400' : 'text-accent-indigo-light'}`}>
                {modProgress}%
              </span>
            </div>

            {sections.map((sec: any) => {
              const lessons = sec.lessons || [];
              return (
                <div key={sec.id} className="border-t border-border/20">
                  <p className="text-xs text-secondary-text px-4 py-1.5">{sec.title}</p>
                  {lessons.map((lesson: any) => {
                    const completion = lesson.completions?.[0];
                    const isCompleted = completion?.completed;
                    const Icon = lessonIcons[lesson.type as LessonType] || FileText;

                    return (
                      <div
                        key={lesson.id}
                        className={`flex items-center gap-3 px-4 py-2 text-sm border-t border-border/10 ${
                          isCompleted ? 'opacity-70' : ''
                        }`}
                      >
                        <Icon size={14} className={isCompleted ? 'text-emerald-400' : 'text-secondary-text'} />
                        <span className={`flex-1 ${isCompleted ? 'text-secondary-text line-through' : 'text-white'}`}>
                          {lesson.title}
                        </span>
                        {lesson.duration && (
                          <span className="text-xs text-secondary-text">{Math.round(lesson.duration / 60)}m</span>
                        )}
                        {isCompleted ? (
                          <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-border/50 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}

      {quizAttempts.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Trophy size={16} className="text-accent-indigo-light" />
            Quiz Attempts
          </h3>
          <div className="space-y-2">
            {quizAttempts.map((attempt: any) => {
              const passed = attempt.passed;
              const isExpanded = expandedAttempt === attempt.id;
              const correctCount = attempt.answers?.filter((a: any) => a.isCorrect).length || 0;
              const totalQuestions = attempt.answers?.length || 0;
              return (
                <div key={attempt.id} className="rounded-lg border border-border/30 bg-white/[0.02] overflow-hidden">
                  <div
                    onClick={() => setExpandedAttempt(isExpanded ? null : attempt.id)}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/[0.03] transition-colors"
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      passed ? 'bg-emerald-500/10' : 'bg-red-500/10'
                    }`}>
                      {passed
                        ? <CheckCircle size={16} className="text-emerald-400" />
                        : <XCircle size={16} className="text-red-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{attempt.quiz?.title || 'Quiz'}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {passed ? 'Passed' : 'Failed'}
                        </span>
                        <span className="text-xs text-secondary-text">Attempt #{attempt.attemptNumber}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs font-medium text-white">{Math.round(attempt.percentage)}%</span>
                        <span className="text-xs text-secondary-text">{attempt.score}/{attempt.maxScore} pts</span>
                        <span className="text-xs text-secondary-text">{correctCount}/{totalQuestions} correct</span>
                        {attempt.completedAt && (
                          <span className="text-xs text-secondary-text">{new Date(attempt.completedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-secondary-text">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border/20 px-3 py-2 space-y-1.5">
                      {attempt.answers?.length === 0 && (
                        <p className="text-xs text-secondary-text text-center py-2">No answer details available</p>
                      )}
                      {attempt.answers?.map((ans: any) => {
                        const q = ans.question;
                        const isAnsCorrect = ans.isCorrect;
                        const userAnswer = getAnswerText(ans, q);
                        const correctAnswer = getCorrectText(q);
                        return (
                          <div key={ans.id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-white/[0.02] border border-border/10">
                            <div className="shrink-0 mt-0.5">
                              {isAnsCorrect
                                ? <CheckCircle size={14} className="text-emerald-400" />
                                : <XCircle size={14} className="text-red-400" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-white font-medium truncate">{q?.title || 'Question'}</p>
                              <div className="flex items-center gap-2 mt-0.5 text-xs">
                                <span className="text-secondary-text">Your answer:</span>
                                <span className={isAnsCorrect ? 'text-emerald-400' : 'text-red-400'}>{userAnswer}</span>
                              </div>
                              {!isAnsCorrect && correctAnswer !== '—' && (
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-secondary-text">Correct:</span>
                                  <span className="text-emerald-400">{correctAnswer}</span>
                                </div>
                              )}
                              <span className="text-[10px] text-secondary-text">{Math.round(ans.points)}/{Math.round(ans.maxPoints)} pts</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
