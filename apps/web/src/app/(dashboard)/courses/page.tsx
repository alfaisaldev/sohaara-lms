'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent } from '@sohaara/ui';
import { api } from '@/lib/api';
import { Plus, BookOpen, Clock, Users, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { useCan } from '@/lib/auth';

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const canManage = useCan('admin', 'manager', 'instructor');

  useEffect(() => {
    api.get<any>('/courses', { limit: 50 })
      .then((res: any) => setCourses(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary-text">Courses</h2>
          <p className="text-secondary-text text-sm mt-1">Browse and enroll in courses to advance your skills</p>
        </div>
        {canManage && (
          <Button onClick={() => router.push('/courses/create')} variant="primary" className="rounded-xl shadow-lg shadow-accent-indigo/20">
            <Plus size={18} />
            New Course
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-accent-indigo" size={32} />
            <p className="text-secondary-text text-sm">Loading courses...</p>
          </div>
        </div>
      ) : courses.length === 0 ? (
        <Card variant="glass" className="animate-scale-in">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-accent-indigo/20 to-accent-indigo-light/20 flex items-center justify-center mb-6 animate-float">
              <Sparkles size={32} className="text-accent-indigo" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-primary-text mb-2">No courses yet</h3>
            <p className="text-secondary-text text-sm mb-6 max-w-sm">Create your first course to get started with the LMS platform.</p>
            {canManage && (
              <Button onClick={() => router.push('/courses/create')} variant="primary" className="rounded-xl shadow-lg">
                <Plus size={16} />
                Create Course
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-stagger">
          {courses.map((course: any) => (
            <div key={course.id} className="card-3d">
              <div
                className="card-3d-content cursor-pointer"
                onClick={() => router.push(`/courses/${course.id}`)}
              >
                <Card variant="glass" className="overflow-hidden group border-white/30 hover:border-accent-indigo/30 transition-all duration-300 hover-lift">
                  <div className="aspect-video bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center relative overflow-hidden">
                    {course.thumbnail ? (
                      <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <BookOpen size={40} className="text-accent-indigo/30" />
                        <span className="text-xs text-secondary-text">No thumbnail</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-white/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-accent-indigo/10 text-accent-indigo font-medium capitalize border border-accent-indigo/20">
                        {course.level}
                      </span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                        course.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        course.status === 'draft' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                        'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                        {course.status}
                      </span>
                    </div>
                    <h3 className="font-bold tracking-tight text-primary-text group-hover:text-accent-indigo transition-colors line-clamp-1 text-lg">
                      {course.title}
                    </h3>
                    <p className="text-secondary-text text-sm mt-1.5 line-clamp-2 leading-relaxed">
                      {course.description || course.excerpt || 'No description'}
                    </p>
                    <div className="flex items-center gap-4 mt-4 text-xs text-secondary-text">
                      <span className="flex items-center gap-1.5">
                        <BookOpen size={14} />
                        {course._count?.modules || 0} modules
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users size={14} />
                        {course._count?.enrollments || 0} enrolled
                      </span>
                    </div>
                    {course.createdBy && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-indigo-100">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-accent-indigo to-accent-indigo-light flex items-center justify-center text-xs font-medium text-white">
                            {course.createdBy.firstName?.[0]}{course.createdBy.lastName?.[0]}
                          </div>
                          <span className="text-xs text-secondary-text">
                            {course.createdBy.firstName} {course.createdBy.lastName}
                          </span>
                        </div>
                        <ArrowRight size={14} className="text-accent-indigo opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
