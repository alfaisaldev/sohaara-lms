'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@sohaara/ui';
import { api } from '@/lib/api';
import { BookOpen, CheckCircle, Award, Flame, TrendingUp, ArrowRight, Sparkles, Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<any>(null);
  const [certCount, setCertCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  const fetchData = () => {
    Promise.all([
      api.get<any>('/analytics/users'),
      api.get<any>('/certificates').catch(() => []),
    ]).then(([userData, certs]) => {
      setAnalytics(userData);
      setCertCount(Array.isArray(certs) ? certs.length : certs?.length || 0);
    }).catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    window.addEventListener('enrollment-updated', fetchData);
    return () => window.removeEventListener('enrollment-updated', fetchData);
  }, []);

  const stats = analytics ? [
    { label: 'Active Courses', value: String(analytics.inProgress || 0), icon: BookOpen, color: 'from-accent-indigo to-accent-indigo-light', progress: analytics.totalEnrollments > 0 ? Math.round((analytics.inProgress / analytics.totalEnrollments) * 100) : 0 },
    { label: 'Completed', value: String(analytics.completedCourses || 0), icon: CheckCircle, color: 'from-accent-green to-emerald-400', progress: analytics.totalEnrollments > 0 ? Math.round((analytics.completedCourses / analytics.totalEnrollments) * 100) : 0, onClick: () => setShowCompleted(true) },
    { label: 'Certificates', value: String(certCount), icon: Award, color: 'from-amber-500 to-orange-400', progress: analytics.totalEnrollments > 0 ? Math.round((certCount / analytics.totalEnrollments) * 100) : 0, onClick: () => router.push('/certificates') },
    { label: 'Day Streak', value: String(analytics.dayStreak || 0), icon: Flame, color: 'from-rose-500 to-pink-400', progress: Math.min((analytics.dayStreak || 0) * 10, 100) },
  ] : [];

  const inProgressCourses = analytics?.courses?.filter((c: any) => c.status === 'active') || [];
  const completedCourses = analytics?.courses?.filter((c: any) => c.status === 'completed') || [];

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <h2 className="text-3xl font-bold text-primary-text tracking-tight">Welcome back!</h2>
        <p className="text-secondary-text mt-2">Here&apos;s your learning overview for today.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-accent-indigo" size={32} />
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-stagger">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="card-3d">
                  <div className="card-3d-content">
                    <Card variant="glass" className="hover:shadow-xl transition-all duration-300 cursor-pointer border-white/30" onClick={stat.onClick}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm text-secondary-text font-medium">{stat.label}</p>
                            <p className="text-3xl font-bold text-primary-text mt-2">{stat.value}</p>
                          </div>
                          <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-lg`}>
                            <Icon size={24} />
                          </div>
                        </div>
                        <div className="mt-4 h-1.5 w-full rounded-full bg-indigo-100/50 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${stat.color} transition-all duration-1000`}
                            style={{ width: `${stat.progress}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card variant="glass" className="animate-fade-in-up border-white/30" style={{ animationDelay: '0.2s' }}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp size={20} className="text-accent-indigo" />
                  In Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inProgressCourses.length > 0 ? (
                  <div className="space-y-3">
                    {inProgressCourses.map((course: any) => (
                      <div
                        key={course.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/40 hover:bg-white/60 transition-colors cursor-pointer border border-white/30"
                        onClick={() => router.push(`/courses/${course.id}/player`)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-primary-text truncate">{course.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="h-1.5 flex-1 rounded-full bg-indigo-100/50 overflow-hidden max-w-[120px]">
                              <div className="h-full rounded-full bg-gradient-to-r from-accent-indigo to-accent-indigo-light" style={{ width: `${course.progress || 0}%` }} />
                            </div>
                            <span className="text-xs text-secondary-text">{Math.round(course.progress || 0)}%</span>
                          </div>
                        </div>
                        <ArrowRight size={16} className="text-accent-indigo shrink-0 ml-3" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-accent-indigo/20 to-accent-indigo-light/20 flex items-center justify-center mb-4 animate-float">
                      <BookOpen size={32} className="text-accent-indigo" />
                    </div>
                    <p className="text-secondary-text text-sm">Enroll in a course to start learning</p>
                    <a href="/courses" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent-indigo hover:text-accent-indigo-light transition-colors group">
                      Browse courses
                      <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card variant="glass" className="animate-fade-in-up border-white/30" style={{ animationDelay: '0.3s' }}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles size={20} className="text-accent-green" />
                  Recommended
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-accent-green/20 to-emerald-400/20 flex items-center justify-center mb-4 animate-float-delayed">
                    <TrendingUp size={32} className="text-accent-green" />
                  </div>
                  <p className="text-secondary-text text-sm">Complete more courses to get recommendations</p>
                  <a href="/learning-paths" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent-green hover:text-emerald-500 transition-colors group">
                    Explore learning paths
                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {showCompleted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowCompleted(false)}>
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/40 w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/30">
              <h3 className="text-lg font-bold text-primary-text flex items-center gap-2">
                <CheckCircle size={20} className="text-emerald-600" />
                Completed Courses
              </h3>
              <button onClick={() => setShowCompleted(false)} className="text-secondary-text hover:text-primary-text transition-colors p-1 rounded-lg hover:bg-white/40 cursor-pointer">&times;</button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] p-4 space-y-2">
              {completedCourses.length > 0 ? completedCourses.map((course: any) => (
                <div key={course.id} onClick={() => { setShowCompleted(false); router.push(`/courses/${course.id}`); }} className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 hover:bg-emerald-100/80 transition-colors cursor-pointer border border-emerald-200/60">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary-text truncate">{course.title}</p>
                    <p className="text-xs text-emerald-700 mt-0.5">Completed {course.completedAt ? new Date(course.completedAt).toLocaleDateString() : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">100%</span>
                    <ArrowRight size={14} className="text-emerald-600" />
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle size={40} className="text-emerald-300 mb-3" />
                  <p className="text-secondary-text text-sm">No completed courses yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
