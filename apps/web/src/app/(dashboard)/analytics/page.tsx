'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@sohaara/ui';
import { api } from '@/lib/api';
import { Loader2, Users, BookOpen, BarChart3, TrendingUp, GraduationCap, Award } from 'lucide-react';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<any>('/analytics/dashboard'),
      api.get<any>('/analytics/users'),
    ]).then(([org, user]) => {
      setStats(org);
      setUserStats(user);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent-indigo" size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h2 className="text-2xl font-bold tracking-tight text-primary-text">Analytics</h2>
        <p className="text-secondary-text text-sm mt-1">Track performance across your organization</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 animate-stagger">
        <Card variant="glass">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center">
              <Users size={22} className="text-accent-indigo" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-text">{stats?.totalUsers || 0}</p>
              <p className="text-xs text-secondary-text">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center">
              <BookOpen size={22} className="text-accent-indigo" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-text">{stats?.totalCourses || 0}</p>
              <p className="text-xs text-secondary-text">Courses</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center">
              <GraduationCap size={22} className="text-accent-indigo" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-text">{stats?.totalEnrollments || 0}</p>
              <p className="text-xs text-secondary-text">Enrollments</p>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center">
              <TrendingUp size={22} className="text-accent-indigo" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-text">{stats?.completionRate || 0}%</p>
              <p className="text-xs text-secondary-text">Completion Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {userStats && (
        <Card variant="glass" className="animate-fade-in-up">
          <CardHeader>
            <CardTitle className="text-base text-primary-text">My Learning Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 grid-cols-2 sm:grid-cols-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-accent-indigo">{userStats.totalEnrollments}</p>
                <p className="text-xs text-secondary-text mt-1">Enrolled</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-accent-teal">{userStats.completedCourses}</p>
                <p className="text-xs text-secondary-text mt-1">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-accent-indigo">{userStats.avgQuizScore || '-'}</p>
                <p className="text-xs text-secondary-text mt-1">Avg Quiz %</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-accent-teal">{userStats.avgAssignmentScore || '-'}</p>
                <p className="text-xs text-secondary-text mt-1">Avg Assignment</p>
              </div>
            </div>

            {userStats.courses?.length > 0 && (
              <div className="mt-6 space-y-2">
                <p className="text-sm font-bold text-primary-text">Course Progress</p>
                {userStats.courses.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="text-sm text-primary-text flex-1 truncate">{c.title}</span>
                    <div className="w-32 h-2 rounded-full bg-white/40 border border-white/30">
                      <div className="h-full rounded-full bg-gradient-to-r from-accent-indigo to-accent-indigo-light transition-all" style={{ width: `${c.progress}%` }} />
                    </div>
                    <span className="text-xs text-secondary-text w-8 text-right">{Math.round(c.progress)}%</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
