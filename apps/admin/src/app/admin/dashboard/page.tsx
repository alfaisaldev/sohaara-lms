'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@sohaara/ui';
import { adminApi as api } from '@/lib/api';
import { Loader2, ArrowUp, ArrowDown, Users, Building2, BookOpen, GraduationCap, Award, Activity, UserPlus, FileText, CheckCircle } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalOrganizations: number;
  totalCourses: number;
  totalEnrollments: number;
  totalCertificates: number;
  activeToday: number;
  usersChange: number;
  coursesChange: number;
  enrollmentsChange: number;
}

interface ActivityItem {
  id: string;
  type: 'user_registered' | 'course_created' | 'enrollment' | 'certificate_issued';
  message: string;
  time: string;
  user: { firstName: string; lastName: string } | null;
}

interface PopularCourse {
  id: string;
  title: string;
  enrollments: number;
  level: string;
  status: string;
}

const statConfigs = [
  { key: 'totalUsers', label: 'Total Users', icon: Users, color: 'from-accent-indigo to-accent-indigo-light' },
  { key: 'totalOrganizations', label: 'Sponsored', icon: Building2, color: 'from-accent-green to-emerald-400' },
  { key: 'totalCourses', label: 'Courses', icon: BookOpen, color: 'from-amber-500 to-orange-400' },
  { key: 'totalEnrollments', label: 'Enrollments', icon: GraduationCap, color: 'from-rose-500 to-pink-400' },
  { key: 'totalCertificates', label: 'Certificates', icon: Award, color: 'from-accent-indigo to-purple-400' },
  { key: 'activeToday', label: 'Active Today', icon: Activity, color: 'from-cyan-500 to-teal-400' },
];

const activityIcons: Record<string, React.ElementType> = {
  user_registered: UserPlus,
  course_created: BookOpen,
  enrollment: GraduationCap,
  certificate_issued: Award,
};

const activityColors: Record<string, string> = {
  user_registered: 'bg-blue-500/10 text-blue-400',
  course_created: 'bg-amber-500/10 text-amber-400',
  enrollment: 'bg-rose-500/10 text-rose-400',
  certificate_issued: 'bg-emerald-500/10 text-emerald-400',
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0, totalOrganizations: 0, totalCourses: 0,
    totalEnrollments: 0, totalCertificates: 0, activeToday: 0,
    usersChange: 0, coursesChange: 0, enrollmentsChange: 0,
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [popularCourses, setPopularCourses] = useState<PopularCourse[]>([]);

  useEffect(() => {
    const toArray = (v: any): any[] => {
      if (!v) return [];
      if (Array.isArray(v)) return v;
      if (v.data && Array.isArray(v.data)) return v.data;
      return [];
    };

    Promise.all([
      api.get<any>('/analytics/dashboard').catch(() => null),
      api.get<any>('/users', { limit: 10, sort: 'createdAt', order: 'desc' }).catch(() => []),
      api.get<any>('/courses', { limit: 5, sort: 'enrollments', order: 'desc' }).catch(() => []),
    ]).then(([dashData, recentUsers, topCourses]) => {
      const usersArr = toArray(recentUsers);
      const coursesArr = toArray(topCourses);

      if (dashData) {
        setStats({
          totalUsers: dashData.totalUsers ?? usersArr.length,
          totalOrganizations: dashData.totalOrganizations ?? 0,
          totalCourses: dashData.totalCourses ?? coursesArr.length,
          totalEnrollments: dashData.totalEnrollments ?? 0,
          totalCertificates: dashData.totalCertificates ?? 0,
          activeToday: dashData.activeToday ?? 0,
          usersChange: dashData.usersChange ?? 0,
          coursesChange: dashData.coursesChange ?? 0,
          enrollmentsChange: dashData.enrollmentsChange ?? 0,
        });
      } else {
        setStats(prev => ({
          ...prev,
          totalUsers: usersArr.length,
          totalCourses: coursesArr.length,
        }));
      }

      setActivities(usersArr.slice(0, 8).map((u: any) => ({
        id: u.id,
        type: 'user_registered' as const,
        message: `${u.firstName || ''} ${u.lastName || ''} registered`,
        time: timeAgo(u.createdAt),
        user: u,
      })));

      setPopularCourses(coursesArr.slice(0, 5).map((c: any) => ({
        id: c.id,
        title: c.title,
        enrollments: c._count?.enrollments || 0,
        level: c.level || 'beginner',
        status: c.status,
      })));
    }).finally(() => setLoading(false));
  }, []);

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-accent-indigo" size={32} />
          <p className="text-secondary-text text-sm animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="text-secondary-text mt-1">Platform overview and key metrics</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 animate-stagger">
        {statConfigs.map((cfg) => {
          const Icon = cfg.icon;
          const value = (stats as any)[cfg.key];
          const changeKey = cfg.key === 'totalUsers' ? 'usersChange' : cfg.key === 'totalCourses' ? 'coursesChange' : cfg.key === 'totalEnrollments' ? 'enrollmentsChange' : null;
          const changeVal = changeKey ? (stats as any)[changeKey] : null;
          const isPositive = changeVal !== null && changeVal >= 0;
          return (
            <div key={cfg.key} className="card-3d">
              <div className="card-3d-content">
                <Card className="glass-dark-card cursor-pointer border-border/50 hover:border-accent-indigo/40 transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-secondary-text">{cfg.label}</p>
                        <p className="text-2xl font-bold text-white mt-1">
                          {typeof value === 'number' ? value.toLocaleString() : value || 0}
                        </p>
                        {changeVal !== null && (
                          <p className={`text-xs mt-1 flex items-center gap-0.5 ${isPositive ? 'text-accent-green' : 'text-red-400'}`}>
                            {isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                            {Math.abs(changeVal)} this month
                          </p>
                        )}
                      </div>
                      <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${cfg.color} flex items-center justify-center text-white shadow-lg`}>
                        <Icon size={22} />
                      </div>
                    </div>
                    <div className="mt-4 h-1 w-full rounded-full bg-white/5 overflow-hidden">
                      <div className={`h-full w-2/3 rounded-full bg-gradient-to-r ${cfg.color}`} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
        <Card className="glass-dark-card border-border/50">
          <div className="p-5 border-b border-border/50 flex items-center justify-between">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Activity size={18} />
              Recent Activity
            </h3>
            <button onClick={() => router.push('/admin/users')} className="text-xs text-accent-indigo-light hover:text-white transition-colors cursor-pointer">
              View all
            </button>
          </div>
          <div className="p-2">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-14 w-14 rounded-full bg-white/5 flex items-center justify-center mb-3">
                  <Activity size={24} className="text-secondary-text/30" />
                </div>
                <p className="text-secondary-text text-sm">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {activities.map((act) => {
                  const ActIcon = activityIcons[act.type] || Activity;
                  const actColor = activityColors[act.type] || 'bg-white/5 text-secondary-text';
                  return (
                    <div key={act.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${actColor}`}>
                        <ActIcon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{act.message}</p>
                      </div>
                      <span className="text-xs text-secondary-text shrink-0">{act.time}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        <Card className="glass-dark-card border-border/50">
          <div className="p-5 border-b border-border/50 flex items-center justify-between">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <BookOpen size={18} />
              Popular Courses
            </h3>
            <button onClick={() => router.push('/admin/courses')} className="text-xs text-accent-indigo-light hover:text-white transition-colors cursor-pointer">
              View all
            </button>
          </div>
          <div className="p-2">
            {popularCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-14 w-14 rounded-full bg-white/5 flex items-center justify-center mb-3">
                  <BookOpen size={24} className="text-secondary-text/30" />
                </div>
                <p className="text-secondary-text text-sm">No courses with enrollments yet</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {popularCourses.map((c) => (
                  <div key={c.id} onClick={() => router.push(`/admin/courses`)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent-indigo/20 to-accent-indigo/5 flex items-center justify-center">
                      <BookOpen size={14} className="text-accent-indigo-light" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{c.title}</p>
                      <p className="text-xs text-secondary-text capitalize">{c.level}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white font-medium">{c.enrollments}</p>
                      <p className="text-xs text-secondary-text">enrolled</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
