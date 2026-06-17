'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@sohaara/ui';
import { api } from '@/lib/api';
import {
  Loader2, Route, BookOpen, Clock, ChevronRight, CheckCircle, Lock,
  AlertCircle, Target, Trophy, Award, Play, Unlock,
} from 'lucide-react';

export default function LearningPathDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [path, setPath] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, prog, enrollments] = await Promise.all([
        api.get<any>(`/learning-paths/${params.pathId}`),
        api.get<any>(`/learning-paths/${params.pathId}/progress`).catch(() => ({ progress: 0, completedCourses: [] })),
        api.get<any[]>(`/enrollments`).catch(() => []),
      ]);
      setPath(p);
      setProgress(prog);
      setEnrolledCourseIds(enrollments.map((e: any) => e.courseId));
    } catch {
      router.push('/learning-paths');
    } finally {
      setLoading(false);
    }
  }, [params.pathId, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleEnrollAll = async () => {
    setEnrolling(true);
    try {
      await api.post(`/learning-paths/${params.pathId}/enroll`);
      fetchData();
    } catch (err: any) {
      console.error(err);
    } finally {
      setEnrolling(false);
    }
  };

  const courses = path?.coursesRelation || [];
  const totalCourses = courses.length;
  const completedCourses: string[] = progress?.completedCourses || [];
  const completedCount = completedCourses.length;
  const enrolledCount = courses.filter((cr: any) => enrolledCourseIds.includes(cr.courseId)).length;
  const percent = progress?.progress || 0;
  const isComplete = percent >= 100;

  const getCourseStatus = (courseId: string, index: number) => {
    const isCompleted = completedCourses.includes(courseId);
    const courseMeta = courses.find((c: any) => c.courseId === courseId);
    const prereqs = courseMeta?.prerequisites || [];
    const prereqsMet = prereqs.length === 0 || prereqs.every((p: string) => completedCourses.includes(p));
    const isLocked = !isCompleted && !prereqsMet;
    return { isCompleted, isLocked, prereqs, prereqsMet, isMandatory: courseMeta?.isMandatory ?? true };
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-secondary-text" size={32} /></div>;
  if (!path) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card variant="glass" className="animate-fade-in-up">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center">
              <Route size={24} className="text-accent-indigo" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-primary-text">{path.title}</h2>
                {path.isMandatory && <Target size={16} className="text-amber-400 shrink-0" aria-label="Mandatory" />}
              </div>
              {path.description && <p className="text-secondary-text text-sm mt-1">{path.description}</p>}
              {path.targetAudience && (
                <p className="text-xs text-secondary-text/70 mt-1 flex items-center gap-1">
                  <AlertCircle size={10} /> For: {path.targetAudience}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-secondary-text flex-wrap">
            <span className="flex items-center gap-1"><BookOpen size={14} /> {totalCourses} courses</span>
            {path.estimatedHours && <span className="flex items-center gap-1"><Clock size={14} /> {path.estimatedHours} hours</span>}
            {path.deadline && (
              <span className="flex items-center gap-1 text-amber-400">
                <Clock size={14} /> Deadline: {new Date(path.deadline).toLocaleDateString()}
              </span>
            )}
          </div>

          {totalCourses > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-secondary-text">
                <span className="flex items-center gap-1"><Trophy size={12} /> Milestone</span>
                <span>{completedCount}/{totalCourses} courses completed</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent-indigo to-emerald-400 transition-all duration-700"
                  style={{ width: `${percent}%` }}
                />
              </div>
              {isComplete && (
                <div className="flex items-center gap-2 text-emerald-400 text-sm pt-1">
                  <Award size={16} />
                  Path completed! All courses finished.
                </div>
              )}
            </div>
          )}

          {!isComplete && totalCourses > enrolledCount && (
            <button
              onClick={handleEnrollAll}
              disabled={enrolling}
              className="w-full group cursor-pointer overflow-hidden rounded-xl bg-gradient-to-r from-accent-indigo via-accent-indigo-light to-emerald-400 px-6 py-3.5 transition-all duration-300 hover:shadow-xl hover:shadow-accent-indigo/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:pointer-events-none"
            >
              <div className="flex items-center justify-center gap-3">
                {enrolling ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 4v16a1 1 0 0 0 1.524.852L20.58 13.23a1 1 0 0 0 0-1.704L7.524 3.148A1 1 0 0 0 6 4Z" />
                  </svg>
                )}
                <span className="text-sm font-semibold text-white tracking-wide">
                  {enrolling ? 'Enrolling...' : enrolledCount > 0 ? 'Enroll in Remaining Courses' : 'Enroll in All Courses'}
                </span>
                {!enrolling && totalCourses > 0 && (
                  <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-white/20 px-1.5 text-[11px] font-bold text-white">
                    {totalCourses - enrolledCount}
                  </span>
                )}
              </div>
            </button>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3 animate-stagger">
        <h3 className="text-lg font-bold tracking-tight text-primary-text animate-fade-in-up">Course Sequence</h3>

        {totalCourses === 0 ? (
          <Card variant="glass">
            <CardContent className="flex flex-col items-center py-10 text-center">
              <BookOpen size={24} className="text-secondary-text/40 mb-2" />
              <p className="text-secondary-text text-sm">No courses in this path yet</p>
            </CardContent>
          </Card>
        ) : (
          courses.map((cr: any, i: number) => {
            const course = cr.course || {};
            const { isCompleted, isLocked, prereqs, prereqsMet, isMandatory } = getCourseStatus(cr.courseId, i);

            const prereqTitles = prereqs
              .map((pId: string) => {
                const p = courses.find((c: any) => c.courseId === pId);
                return p?.course?.title || pId;
              })
              .filter(Boolean);

            return (
              <div key={cr.courseId} className="relative">
                {i < totalCourses - 1 && (
                  <div className={`absolute left-5 top-12 bottom-0 w-0.5 ${isCompleted ? 'bg-emerald-500/30' : 'bg-white/10'}`} />
                )}
                <Card
                  variant="glass"
                  className={`transition-all duration-300 ${isLocked ? 'opacity-50' : 'hover:border-accent-indigo/30 cursor-pointer hover-lift'} ${isCompleted ? 'border-emerald-500/20' : 'border-white/30'}`}
                  onClick={() => !isLocked && router.push(`/courses/${cr.courseId}`)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${isCompleted ? 'bg-emerald-500/20 text-emerald-400' : isLocked ? 'bg-white/5 text-secondary-text/40' : 'bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 text-accent-indigo'}`}
                    >
                      {isCompleted ? <CheckCircle size={18} /> : isLocked ? <Lock size={16} /> : i + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium text-sm ${isCompleted ? 'text-emerald-400' : 'text-primary-text'}`}>
                          {course.title || cr.courseId}
                        </p>
                        {isMandatory && !isCompleted && <span className="text-[10px] text-amber-400/60 border border-amber-400/20 px-1.5 rounded">Required</span>}
                      </div>
                      <p className="text-xs text-secondary-text mt-0.5">
                        {course.level || ''}
                        {course.estimatedHours ? ` · ${course.estimatedHours}h` : ''}
                        {isCompleted && ' · Completed'}
                      </p>
                      {isLocked && prereqTitles.length > 0 && (
                        <p className="text-xs text-amber-400/60 mt-1 flex items-center gap-1">
                          <Lock size={10} /> Complete first: {prereqTitles.join(', ')}
                        </p>
                      )}
                    </div>

                    {isCompleted ? (
                      <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />
                    ) : isLocked ? (
                      <Lock size={16} className="text-secondary-text/40 flex-shrink-0" />
                    ) : (
                      <ChevronRight size={16} className="text-secondary-text flex-shrink-0" />
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })
        )}
      </div>

      {isComplete && (
        <Card variant="glass" className="border-emerald-500/20 animate-scale-in">
          <CardContent className="p-6 text-center space-y-3">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <Award size={32} className="text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-primary-text">Path Completed!</h3>
            <p className="text-sm text-secondary-text">
              You have successfully completed all {totalCourses} courses in this learning path.
            </p>
            {path.certificates?.length > 0 && (
              <div className="flex items-center justify-center gap-2 text-sm text-accent-indigo">
                <Award size={16} />
                View your earned certificates
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
