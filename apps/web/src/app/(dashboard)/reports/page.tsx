'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@sohaara/ui';
import { api } from '@/lib/api';
import { Loader2, Download, BarChart3, FileText } from 'lucide-react';

export default function ReportsPage() {
  const [systemStats, setSystemStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any>('/analytics/system')
      .then(setSystemStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent-indigo" size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary-text">Reports</h2>
          <p className="text-secondary-text text-sm mt-1">System-wide reports and exports</p>
        </div>
        <Button variant="primary" size="sm" className="rounded-xl shadow-lg shadow-accent-indigo/20 cursor-pointer">
          <Download size={16} /> Export CSV
        </Button>
      </div>

      {systemStats && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 animate-stagger">
          <Card variant="glass">
            <CardContent className="p-5 text-center">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center mx-auto mb-2">
                <BarChart3 size={20} className="text-accent-indigo" />
              </div>
              <p className="text-2xl font-bold text-primary-text">{systemStats.totalUsers}</p>
              <p className="text-xs text-secondary-text">Total Users</p>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="p-5 text-center">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center mx-auto mb-2">
                <FileText size={20} className="text-accent-indigo" />
              </div>
              <p className="text-2xl font-bold text-primary-text">{systemStats.totalCourses}</p>
              <p className="text-xs text-secondary-text">Total Courses</p>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="p-5 text-center">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center mx-auto mb-2">
                <BarChart3 size={20} className="text-accent-indigo" />
              </div>
              <p className="text-2xl font-bold text-primary-text">{systemStats.activeEnrollments}</p>
              <p className="text-xs text-secondary-text">Active Enrollments</p>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="p-5 text-center">
              <p className="text-2xl font-bold text-accent-teal">{systemStats.newUsers30d}</p>
              <p className="text-xs text-secondary-text">New Users (30d)</p>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="p-5 text-center">
              <p className="text-2xl font-bold text-accent-indigo">{systemStats.newEnrollments30d}</p>
              <p className="text-xs text-secondary-text">New Enrollments (30d)</p>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="p-5 text-center">
              <p className="text-2xl font-bold text-accent-teal">{systemStats.recentActivity30d}</p>
              <p className="text-xs text-secondary-text">Actions (30d)</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card variant="glass" className="animate-fade-in-up">
        <CardHeader>
          <CardTitle className="text-base text-primary-text">Exportable Reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { label: 'User Activity Report', desc: 'Login frequency, course access, engagement metrics' },
            { label: 'Course Performance Report', desc: 'Enrollment stats, completion rates, average scores' },
            { label: 'Assessment Report', desc: 'Quiz scores, assignment grades, pass rates' },
            { label: 'Certificate Report', desc: 'Certificates issued, revoked, pending' },
          ].map((r) => (
            <div key={r.label} className="flex items-center justify-between p-3 rounded-xl bg-white/40 backdrop-blur-sm border border-white/30">
              <div>
                <p className="text-sm font-medium text-primary-text">{r.label}</p>
                <p className="text-xs text-secondary-text">{r.desc}</p>
              </div>
              <Button size="sm" variant="ghost" className="cursor-pointer"><Download size={14} /></Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
