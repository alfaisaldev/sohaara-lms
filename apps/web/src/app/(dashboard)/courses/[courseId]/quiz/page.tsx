'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@sohaara/ui';
import { api } from '@/lib/api';
import { Loader2, Plus, Clock, FileQuestion, Trophy, ArrowRight } from 'lucide-react';
import { useCan } from '@/lib/auth';
import Link from 'next/link';

const toArray = (v: any): any[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (v.data && Array.isArray(v.data)) return v.data;
  return [];
};

export default function QuizListPage() {
  const params = useParams();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const canManage = useCan('admin', 'manager', 'instructor');

  useEffect(() => {
    api.get<any>(`/courses/${params.courseId}/quizzes`)
      .then(res => setQuizzes(toArray(res)))
      .catch(() => setQuizzes([]))
      .finally(() => setLoading(false));
  }, [params.courseId]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent-indigo" size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary-text">Quizzes</h2>
          <p className="text-secondary-text text-sm mt-1">Test your knowledge with course quizzes</p>
        </div>
        {canManage && (
          <Button onClick={() => router.push(`/courses/${params.courseId}/quiz/create`)} variant="primary" className="rounded-xl shadow-lg shadow-accent-indigo/20">
            <Plus size={16} /> New Quiz
          </Button>
        )}
      </div>

      {quizzes.length === 0 ? (
        <Card variant="glass" className="animate-scale-in">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-accent-indigo/20 to-accent-indigo-light/20 flex items-center justify-center mb-4 animate-float">
              <FileQuestion size={28} className="text-accent-indigo" />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-primary-text mb-1">No quizzes yet</h3>
            <p className="text-secondary-text text-sm max-w-xs">Quizzes help reinforce learning. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 animate-stagger">
          {quizzes.map((q) => (
            <Link key={q.id} href={`/courses/${params.courseId}/quiz/${q.id}`} className="card-3d block">
              <div className="card-3d-content">
                <Card variant="glass" className="group cursor-pointer border-white/30 hover:border-accent-indigo/30 transition-all duration-300 hover-lift">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent-indigo to-accent-indigo-light flex items-center justify-center text-white shadow-sm flex-shrink-0">
                            <Trophy size={16} />
                          </div>
                          <CardTitle className="text-base text-primary-text group-hover:text-accent-indigo transition-colors truncate">
                            {q.title}
                          </CardTitle>
                        </div>
                        {q.description && (
                          <p className="text-sm text-secondary-text line-clamp-1 ml-10">{q.description}</p>
                        )}
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium border flex-shrink-0 ml-3 ${
                        q.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-600 border-amber-200'
                      }`}>
                        {q.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-4 ml-10">
                      <span className="flex items-center gap-1.5 text-xs text-secondary-text">
                        <FileQuestion size={14} />
                        {q.questions?.length || 0} questions
                      </span>
                      {q.timeLimit && (
                        <span className="flex items-center gap-1.5 text-xs text-secondary-text">
                          <Clock size={14} />
                          {q.timeLimit} min
                        </span>
                      )}
                      <span className="text-xs text-secondary-text">
                        Pass: {q.passingScore}%
                      </span>
                      <ArrowRight size={14} className="text-accent-indigo ml-auto opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
