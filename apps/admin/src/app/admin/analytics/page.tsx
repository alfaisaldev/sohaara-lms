'use client';

import { useEffect, useState } from 'react';
import { adminApi as api } from '@/lib/api';
import { Card, CardContent } from '@sohaara/ui';
import { BarChart3, Users, BookOpen, GraduationCap, Award, TrendingUp, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import { useRoles } from '@/lib/auth';

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const roles = useRoles();
  const isContentManager = roles.includes('content_manager') || roles.includes('learner');
  const isAdmin = roles.includes('admin') || roles.includes('super_admin');

  useEffect(() => {
    api.get<any>('/analytics/dashboard')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="animate-spin text-accent-indigo" size={32} /></div>;

  const stats = [
    { label: 'Total Users', value: data?.totalUsers ?? 0, icon: Users, color: 'from-accent-indigo to-accent-indigo-light', change: data?.usersChange ?? 0 },
    { label: 'Courses', value: data?.totalCourses ?? 0, icon: BookOpen, color: 'from-amber-500 to-orange-400', change: data?.coursesChange ?? 0 },
    { label: 'Enrollments', value: data?.totalEnrollments ?? 0, icon: GraduationCap, color: 'from-rose-500 to-pink-400', change: data?.enrollmentsChange ?? 0 },
    { label: 'Certificates', value: data?.totalCertificates ?? 0, icon: Award, color: 'from-accent-indigo to-purple-400', change: 0 },
    { label: 'Active Today', value: data?.activeToday ?? 0, icon: TrendingUp, color: 'from-cyan-500 to-teal-400', change: 0 },
  ];

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 size={24} className="text-accent-indigo-light" />
          Analytics
        </h1>
        <p className="text-secondary-text text-sm mt-1">Platform-wide analytics and metrics</p>
      </div>

      <div className="grid gap-5 md:grid-cols-3 lg:grid-cols-5 animate-stagger">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card-3d">
              <div className="card-3d-content">
                <Card className="glass-dark-card border-border/50">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-secondary-text">{s.label}</p>
                      <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center text-white shadow-lg`}>
                        <Icon size={18} />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white">{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}</p>
                    {s.change ? (
                      <p className={`text-xs flex items-center gap-0.5 mt-2 ${s.change >= 0 ? 'text-accent-green' : 'text-red-400'}`}>
                        {s.change >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                        {Math.abs(s.change)}% vs last month
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 animate-fade-in-up">
        <Card className="glass-dark-card border-border/50 p-6">
          <h3 className="text-white font-semibold mb-4">System Overview</h3>
          <div className="space-y-4">
            {[
              { label: 'Platform Health', value: '97%', color: 'bg-emerald-500' },
              { label: 'Avg. Session Duration', value: '24m', color: 'bg-accent-indigo' },
              { label: 'Completion Rate', value: data?.totalEnrollments ? `${Math.min(100, Math.round((data.totalCertificates / data.totalEnrollments) * 100))}%` : '0%', color: 'bg-amber-500' },
              { label: 'Storage Used', value: '1.2 GB', color: 'bg-rose-500' },
            ].map((m) => (
              <div key={m.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-secondary-text">{m.label}</span>
                  <span className="text-white font-medium">{m.value}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                  <div className={`h-full rounded-full ${m.color} transition-all duration-700`} style={{ width: `${Math.random() * 40 + 60}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="glass-dark-card border-border/50 p-6">
          <h3 className="text-white font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              ...(isAdmin ? [{ label: 'View Users', icon: Users, href: '/admin/users' }] : []),
              ...(isContentManager ? [{ label: 'View Learners', icon: Users, href: '/admin/users?role=learner' }] : []),
              { label: 'View Courses', icon: BookOpen, href: '/admin/courses' },
              ...(isAdmin ? [{ label: 'View Reports', icon: BarChart3, href: '/admin/reports' }] : []),
              ...(isAdmin ? [{ label: 'System Settings', icon: Award, href: '/admin/settings' }] : []),
            ].map((a) => {
              const Icon = a.icon;
              return (
                <a key={a.label} href={a.href}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-border/50 transition-all cursor-pointer group">
                  <Icon size={24} className="text-secondary-text group-hover:text-accent-indigo-light transition-colors" />
                  <span className="text-xs text-secondary-text group-hover:text-white transition-colors">{a.label}</span>
                </a>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
