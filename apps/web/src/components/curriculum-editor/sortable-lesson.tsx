'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, FileText, Video, HelpCircle, FileSpreadsheet, Headphones, File, Link, Presentation, Monitor, Globe, Package } from 'lucide-react';
import { useState } from 'react';
import type { Lesson } from './types';

const typeIcons: Record<string, React.ReactNode> = {
  video: <Video size={14} />,
  text: <FileText size={14} />,
  quiz: <HelpCircle size={14} />,
  assignment: <FileSpreadsheet size={14} />,
  audio: <Headphones size={14} />,
  pdf: <File size={14} />,
  presentation: <Presentation size={14} />,
  embed: <Link size={14} />,
  scorm: <Package size={14} />,
  live_session: <Monitor size={14} />,
  external: <Globe size={14} />,
};

const typeLabels: Record<string, string> = {
  video: 'Video', text: 'Text', quiz: 'Quiz', assignment: 'Assignment',
  audio: 'Audio', pdf: 'PDF', presentation: 'Presentation', embed: 'Embed',
  scorm: 'SCORM', live_session: 'Live', external: 'External',
};

const typeColors: Record<string, string> = {
  video: 'bg-blue-100 text-blue-600',
  text: 'bg-gray-100 text-gray-600',
  quiz: 'bg-purple-100 text-purple-600',
  assignment: 'bg-orange-100 text-orange-600',
  audio: 'bg-pink-100 text-pink-600',
  pdf: 'bg-red-100 text-red-600',
  presentation: 'bg-yellow-100 text-yellow-600',
  embed: 'bg-cyan-100 text-cyan-600',
  scorm: 'bg-emerald-100 text-emerald-700',
  live_session: 'bg-indigo-100 text-indigo-600',
  external: 'bg-teal-100 text-teal-600',
};

interface SortableLessonProps {
  lesson: Lesson;
  moduleIndex: number;
  sectionIndex: number;
  lessonIndex: number;
  onUpdate: (data: any) => void;
  onRemove: () => void;
  courseId: string;
}

export function SortableLesson({ lesson, moduleIndex, sectionIndex, lessonIndex, onUpdate, onRemove, courseId }: SortableLessonProps) {
  const [expanded, setExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id || `lesson-${lessonIndex}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const showContentEditor = ['text', 'video', 'audio', 'embed', 'external', 'presentation'].includes(lesson.type);

  return (
    <div ref={setNodeRef} style={style} className="bg-white rounded-lg border border-white/50 hover:border-accent-indigo/30 transition-all group">
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-secondary-text hover:text-primary-text" onClick={(e) => e.stopPropagation()}>
          <GripVertical size={14} />
        </button>
        <span className="text-secondary-text">{typeIcons[lesson.type] || <FileText size={14} />}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${typeColors[lesson.type] || 'bg-gray-100 text-gray-600'}`}>
          {typeLabels[lesson.type] || lesson.type}
        </span>
        <input
          value={lesson.title}
          onChange={(e) => { e.stopPropagation(); onUpdate({ title: e.target.value }); }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-sm bg-transparent border-none outline-none focus:ring-0 text-primary-text"
          placeholder="Lesson title"
        />
        {lesson.videoDuration && (
          <span className="text-xs text-secondary-text">{Math.floor(lesson.videoDuration / 60)}m</span>
        )}
        {lesson.type === 'scorm' && lesson.scormPackageId && (
          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">Package attached</span>
        )}
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="opacity-0 group-hover:opacity-100 text-secondary-text hover:text-danger transition-all cursor-pointer">
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-white/20 space-y-2" onClick={(e) => e.stopPropagation()}>
          {lesson.type === 'video' && (
            <div className="space-y-2">
              <input
                value={lesson.videoUrl || ''}
                onChange={(e) => onUpdate({ videoUrl: e.target.value })}
                className="w-full text-xs px-2 py-1.5 rounded border border-white/30 bg-white/60 focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 outline-none text-primary-text"
                placeholder="Video URL (YouTube, Vimeo, etc.)"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={lesson.videoDuration || ''}
                  onChange={(e) => onUpdate({ videoDuration: parseInt(e.target.value) || 0 })}
                  className="w-24 text-xs px-2 py-1.5 rounded border border-white/30 bg-white/60 focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 outline-none text-primary-text"
                  placeholder="Duration (s)"
                />
                <label className="flex items-center gap-1.5 text-xs text-secondary-text cursor-pointer">
                  <input type="checkbox" checked={lesson.isFree || false} onChange={(e) => onUpdate({ isFree: e.target.checked })} className="rounded border-indigo-300 text-accent-indigo" />
                  Free preview
                </label>
              </div>
            </div>
          )}

          {lesson.type === 'text' && (
            <textarea
              value={lesson.content || ''}
              onChange={(e) => onUpdate({ content: e.target.value })}
              className="w-full text-xs px-2 py-1.5 rounded border border-white/30 bg-white/60 focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 outline-none text-primary-text min-h-[80px] resize-y"
              placeholder="Lesson content (HTML supported)"
            />
          )}

          {lesson.type === 'embed' && (
            <input
              value={lesson.embedUrl || ''}
              onChange={(e) => onUpdate({ embedUrl: e.target.value })}
              className="w-full text-xs px-2 py-1.5 rounded border border-white/30 bg-white/60 focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 outline-none text-primary-text"
              placeholder="Embed URL (CodePen, Google Slides, etc.)"
            />
          )}

          {lesson.type === 'external' && (
            <input
              value={lesson.externalUrl || ''}
              onChange={(e) => onUpdate({ externalUrl: e.target.value })}
              className="w-full text-xs px-2 py-1.5 rounded border border-white/30 bg-white/60 focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 outline-none text-primary-text"
              placeholder="External URL"
            />
          )}

          {lesson.type === 'audio' && (
            <input
              value={lesson.fileUrl || ''}
              onChange={(e) => onUpdate({ fileUrl: e.target.value })}
              className="w-full text-xs px-2 py-1.5 rounded border border-white/30 bg-white/60 focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 outline-none text-primary-text"
              placeholder="Audio file URL"
            />
          )}

          {lesson.type === 'pdf' && (
            <input
              value={lesson.fileUrl || ''}
              onChange={(e) => onUpdate({ fileUrl: e.target.value })}
              className="w-full text-xs px-2 py-1.5 rounded border border-white/30 bg-white/60 focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 outline-none text-primary-text"
              placeholder="PDF file URL"
            />
          )}

          {lesson.type === 'scorm' && (
            <div className="text-xs text-secondary-text">
              {lesson.scormPackageId ? (
                <span className="text-emerald-500">SCORM package attached</span>
              ) : (
                <span className="text-accent-orange">Upload a SCORM package using the SCORM button in the toolbar</span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-secondary-text cursor-pointer">
              <input type="checkbox" checked={lesson.isRequired ?? true} onChange={(e) => onUpdate({ isRequired: e.target.checked })} className="rounded border-indigo-300 text-accent-indigo" />
              Required
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
