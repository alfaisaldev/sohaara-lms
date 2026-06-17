'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { VideoPlayer } from '@/components/player/video-player';
import { TextLesson } from '@/components/player/text-lesson';
import { ScormPlayer } from '@/components/player/scorm-player';
import { Button, Card, CardContent } from '@sohaara/ui';
import { CheckCircle, ChevronLeft, ChevronRight, Loader2, FileText } from 'lucide-react';

export default function LessonPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;
  const [lesson, setLesson] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [allLessons, setAllLessons] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<any>(`/enrollments/${courseId}`),
      api.get<any>(`/courses/${courseId}`),
    ]).then(([enr, course]) => {
      setEnrollment(enr);

      const flatLessons = course.modules?.flatMap((m: any) =>
        m.sections?.flatMap((s: any) => s.lessons || []) || []
      ) || [];
      setAllLessons(flatLessons);

      const found = flatLessons.find((l: any) => l.id === lessonId);

      if (found) {
        const completion = enr.lessonCompletions?.find((c: any) => c.lessonId === lessonId);
        setLesson(found);
        setCompleted(completion?.completed || false);
      } else {
        router.push(`/courses/${courseId}/player`);
      }
    }).catch(() => {
      router.push(`/courses/${courseId}`);
    }).finally(() => setLoading(false));
  }, [courseId, lessonId]);

  const handleComplete = async () => {
    if (!enrollment || completing) return;
    setCompleting(true);
    try {
      await api.post(`/lessons/${lessonId}/complete`, {
        enrollmentId: enrollment.id,
      });
      setCompleted(true);
      window.dispatchEvent(new Event('enrollment-updated'));
    } finally {
      setCompleting(false);
    }
  };

  const renderLesson = () => {
    if (!lesson) return null;

    switch (lesson.type) {
      case 'video':
        return (
          <VideoPlayer
            src={lesson.videoUrl || ''}
            poster={lesson.thumbnail}
            onProgress={(progress) => {
              if (progress >= 90 && !completed) handleComplete();
            }}
          />
        );
      case 'text':
        return <TextLesson content={lesson.content || ''} title={lesson.title} />;
      case 'scorm':
        return lesson.scormPackage ? (
          <ScormPlayer
            entryUrl={lesson.scormPackage.entryUrl.replace(/^http:\/\/localhost:\d+\/uploads\/scorm\//, '/api/scorm-content/')}
            lessonId={lesson.id}
            enrollmentId={enrollment?.id}
            onComplete={() => handleComplete()}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <FileText size={48} className="text-secondary-text mb-4" />
            <p className="text-secondary-text font-medium">SCORM package not available</p>
            <p className="text-xs text-secondary-text mt-2">Upload a SCORM package via the course curriculum editor.</p>
          </div>
        );
      case 'pdf':
        return lesson.content ? (
          <div className="flex flex-col items-center py-6">
            <iframe src={lesson.content} className="w-full h-[80vh] rounded-xl border border-border/50" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <FileText size={48} className="text-secondary-text mb-4" />
            <p className="text-secondary-text">PDF not available</p>
          </div>
        );
      case 'audio':
        return lesson.content ? (
          <div className="flex flex-col items-center py-20">
            <audio controls className="w-full max-w-lg">
              <source src={lesson.content} />
            </audio>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <FileText size={48} className="text-secondary-text mb-4" />
            <p className="text-secondary-text">Audio not available</p>
          </div>
        );
      case 'embed':
        return lesson.content ? (
          <div className="flex flex-col items-center py-6">
            <iframe src={lesson.content} className="w-full h-[80vh] rounded-xl border border-border/50" allowFullScreen />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-secondary-text">Embed content not available</p>
          </div>
        );
      case 'external':
        return lesson.content ? (
          <div className="flex flex-col items-center justify-center py-20">
            <a href={lesson.content} target="_blank" rel="noopener noreferrer"
              className="px-6 py-3 rounded-xl bg-accent-indigo/10 text-accent-indigo hover:bg-accent-indigo/20 transition-all font-medium cursor-pointer">
              Open External Link
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-secondary-text">External link not available</p>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-secondary-text">This lesson type is not yet supported</p>
            <p className="text-xs text-secondary-text mt-2">Type: {lesson.type}</p>
          </div>
        );
    }
  };

  const currentIndex = allLessons.findIndex((l: any) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  const goPrev = () => {
    if (prevLesson) router.push(`/courses/${courseId}/player/${prevLesson.id}`);
  };

  const goNext = () => {
    if (nextLesson) router.push(`/courses/${courseId}/player/${nextLesson.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-accent-indigo" size={32} />
      </div>
    );
  }

  if (!lesson) return null;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-primary-text">{lesson.title}</h2>
        {lesson.description && (
          <p className="text-secondary-text text-sm mt-1">{lesson.description}</p>
        )}
      </div>

      <div className="rounded-2xl overflow-hidden glass">
        {renderLesson()}
      </div>

      {lesson.resources && lesson.resources.length > 0 && (
        <Card variant="glass">
          <CardContent className="p-4 space-y-2">
            <h4 className="text-sm font-bold text-primary-text">Resources</h4>
            {lesson.resources.map((r: any) => (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-accent-indigo hover:text-accent-indigo-light transition-colors cursor-pointer"
              >
                <FileText size={14} />
                {r.title}
              </a>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between pt-5 border-t border-white/30">
        <Button variant="outline" size="sm" disabled={!prevLesson} onClick={goPrev} className="rounded-xl border-indigo-200 hover:border-accent-indigo/50 cursor-pointer">
          <ChevronLeft size={16} />
          Previous
        </Button>

        <div className="flex items-center gap-2">
          {completed ? (
            <span className="flex items-center gap-1.5 text-sm text-emerald-700 font-semibold px-4 py-2 rounded-xl bg-emerald-50 border-2 border-emerald-200 shadow-sm">
              <CheckCircle size={18} className="text-emerald-600" />
              Completed
            </span>
          ) : (
            <Button
              onClick={handleComplete}
              loading={completing}
              variant="primary"
              size="default"
              className="bg-gradient-to-r from-accent-indigo to-accent-indigo-light shadow-xl shadow-accent-indigo/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer min-w-[160px]"
            >
              <CheckCircle size={18} />
              Mark as Complete
            </Button>
          )}
        </div>

        <Button variant="outline" size="sm" disabled={!nextLesson} onClick={goNext} className="rounded-xl border-indigo-200 hover:border-accent-indigo/50 cursor-pointer">
          Next
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
