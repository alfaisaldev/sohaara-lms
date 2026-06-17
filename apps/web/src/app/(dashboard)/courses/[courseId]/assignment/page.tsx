'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@sohaara/ui';
import { api } from '@/lib/api';
import { Loader2, Plus, Upload } from 'lucide-react';
import { useCan } from '@/lib/auth';
import Link from 'next/link';

const toArray = (v: any): any[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (v.data && Array.isArray(v.data)) return v.data;
  return [];
};

export default function AssignmentListPage() {
  const params = useParams();
  const router = useRouter();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const canManage = useCan('admin', 'manager', 'instructor');

  useEffect(() => {
    api.get<any>(`/courses/${params.courseId}/assignments`)
      .then(res => setAssignments(toArray(res)))
      .catch(() => setAssignments([]))
      .finally(() => setLoading(false));
  }, [params.courseId]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent-indigo" size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary-text">Assignments</h2>
          <p className="text-secondary-text text-sm mt-1">Submit your work and track grades</p>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" className="rounded-xl shadow-lg shadow-accent-indigo/20">
            <Plus size={16} /> New Assignment
          </Button>
        )}
      </div>
      {assignments.length === 0 ? (
        <Card variant="glass" className="animate-scale-in">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center mb-4">
              <Upload size={36} className="text-accent-indigo" />
            </div>
            <p className="text-secondary-text font-medium">No assignments yet</p>
            <p className="text-sm text-secondary-text mt-1">Assignments help assess practical knowledge</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 animate-stagger">
          {assignments.map((a) => (
            <Link key={a.id} href={`/courses/${params.courseId}/assignment/${a.id}`} className="block">
              <Card variant="glass" className="cursor-pointer border-white/30 hover:border-accent-indigo/30 transition-all duration-300 hover-lift">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm text-primary-text">{a.title}</CardTitle>
                    <p className="text-xs text-secondary-text mt-0.5">{a.maxScore} pts &middot; {a.dueDate ? `Due ${new Date(a.dueDate).toLocaleDateString()}` : 'No due date'} &middot; {a.maxAttempts} attempt{a.maxAttempts !== 1 ? 's' : ''}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border flex-shrink-0 ml-3 ${a.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>{a.status}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
