'use client';

import { useEffect, useState } from 'react';
import { adminApi as api } from '@/lib/api';
import { Button, Card, CardContent } from '@sohaara/ui';
import { FileBarChart, Download, FileSpreadsheet, FileText, Users, BookOpen, GraduationCap, Award, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useRoles } from '@/lib/auth';

export default function AdminReportsPage() {
  const { toast } = useToast();
  const roles = useRoles();
  const isContentManager = roles.includes('content_manager');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    api.get<any>('/analytics/dashboard')
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleExport = async (type: string, format: string) => {
    setExporting(`${type}-${format}`);
    try {
      const data = await api.get<any>(`/reports/${type}`, { format });
      toast('success', `${type.replace(/_/g, ' ')} exported as ${format.toUpperCase()}`);

      let blob: Blob;
      let ext: string;
      if (format === 'csv') {
        blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type: 'text/csv;charset=utf-8;' });
        ext = 'csv';
      } else {
        blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        ext = 'json';
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${type}-report.${ext}`; a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast('error', err.message || `Failed to export ${type}`);
    } finally {
      setExporting(null);
    }
  };

  const reportTypes = [
    ...(isContentManager
      ? [{ id: 'learners', label: 'Learners Report', description: 'All registered learners with status', icon: Users, color: 'from-accent-indigo to-accent-indigo-light' }]
      : [{ id: 'users', label: 'Users Report', description: 'All registered users with roles and status', icon: Users, color: 'from-accent-indigo to-accent-indigo-light' }]
    ),
    { id: 'courses', label: 'Courses Report', description: 'All courses with enrollment and completion data', icon: BookOpen, color: 'from-amber-500 to-orange-400' },
    { id: 'enrollments', label: 'Enrollments Report', description: 'All enrollments with progress and status', icon: GraduationCap, color: 'from-rose-500 to-pink-400' },
    { id: 'certificates', label: 'Certificates Report', description: 'All issued certificates with status', icon: Award, color: 'from-accent-indigo to-purple-400' },
  ];

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="animate-spin text-accent-indigo" size={32} /></div>;

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileBarChart size={24} className="text-accent-indigo-light" />
          Reports
        </h1>
        <p className="text-secondary-text text-sm mt-1">Generate and export platform reports</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 animate-stagger">
        {reportTypes.map((r) => {
          const Icon = r.icon;
          const isExporting = exporting?.startsWith(r.id);
          return (
            <div key={r.id} className="card-3d">
              <div className="card-3d-content">
                <Card className="glass-dark-card border-border/50 p-6">
                  <div className="flex items-start gap-4">
                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${r.color} flex items-center justify-center text-white shadow-lg shrink-0`}>
                      <Icon size={22} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg">{r.label}</h3>
                      <p className="text-secondary-text text-sm mt-1">{r.description}</p>
                      <div className="flex gap-2 mt-4">
                        <Button onClick={() => handleExport(r.id, 'json')} loading={isExporting && exporting?.endsWith('json')} variant="ghost" size="sm" className="rounded-xl text-xs cursor-pointer">
                          <FileText size={14} /> JSON
                        </Button>
                        <Button onClick={() => handleExport(r.id, 'csv')} loading={isExporting && exporting?.endsWith('csv')} variant="ghost" size="sm" className="rounded-xl text-xs cursor-pointer">
                          <FileSpreadsheet size={14} /> CSV
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          );
        })}
      </div>

      <Card className="glass-dark-card border-border/50 p-6 animate-fade-in-up">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <FileBarChart size={18} />
          System Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Users', value: stats.totalUsers ?? 0 },
            { label: 'Courses', value: stats.totalCourses ?? 0 },
            { label: 'Enrollments', value: stats.totalEnrollments ?? 0 },
            { label: 'Certificates', value: stats.totalCertificates ?? 0 },
          ].map((s) => (
            <div key={s.label} className="text-center p-4 rounded-xl bg-white/5 border border-border/30">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-secondary-text mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
