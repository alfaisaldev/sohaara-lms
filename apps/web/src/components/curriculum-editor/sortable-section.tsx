'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { GripVertical, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { SortableLesson } from './sortable-lesson';
import type { Section } from './types';

interface SortableSectionProps {
  section: Section;
  moduleIndex: number;
  sectionIndex: number;
  onUpdate: (data: any) => void;
  onRemove: () => void;
  onAddLesson: (type?: string) => void;
  onLessonUpdate: (lessonIndex: number, data: any) => void;
  onLessonRemove: (lessonIndex: number) => void;
  onLessonDragEnd: (event: DragEndEvent) => void;
  courseId: string;
}

const lessonTypes = [
  { value: 'video', label: 'Video', icon: '🎬' },
  { value: 'text', label: 'Text', icon: '📝' },
  { value: 'quiz', label: 'Quiz', icon: '❓' },
  { value: 'assignment', label: 'Assignment', icon: '📋' },
  { value: 'audio', label: 'Audio', icon: '🎧' },
  { value: 'pdf', label: 'PDF', icon: '📄' },
  { value: 'presentation', label: 'Presentation', icon: '📊' },
  { value: 'embed', label: 'Embed', icon: '🔗' },
  { value: 'scorm', label: 'SCORM', icon: '📦' },
  { value: 'live_session', label: 'Live Session', icon: '🎥' },
  { value: 'external', label: 'External', icon: '🌐' },
];

export function SortableSection({
  section, moduleIndex, sectionIndex, onUpdate, onRemove, onAddLesson, onLessonUpdate, onLessonRemove, onLessonDragEnd, courseId,
}: SortableSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id || `section-${moduleIndex}-${sectionIndex}`,
  });

  const lessonSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-white/60 rounded-lg border border-white/30">
      <div className="flex items-center gap-2 px-3 py-2">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-secondary-text hover:text-primary-text">
          <GripVertical size={14} />
        </button>
        <button onClick={() => setExpanded(!expanded)} className="text-secondary-text hover:text-primary-text cursor-pointer">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <input
          value={section.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="flex-1 text-sm font-medium bg-transparent border-none outline-none focus:ring-0 text-primary-text"
          placeholder="Section title"
        />
        <span className="text-xs text-secondary-text">{section.lessons.length} lesson{section.lessons.length !== 1 ? 's' : ''}</span>
        <button onClick={onRemove} className="text-secondary-text hover:text-danger transition-colors cursor-pointer">
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <DndContext sensors={lessonSensors} collisionDetection={closestCenter} onDragEnd={onLessonDragEnd}>
            <SortableContext
              items={section.lessons.map((l) => l.id || `lesson-${moduleIndex}-${sectionIndex}-${section.lessons.indexOf(l)}`)}
              strategy={verticalListSortingStrategy}
            >
              {section.lessons.length === 0 && (
                <div className="text-center py-4 text-xs text-secondary-text">
                  No lessons yet
                </div>
              )}
              {section.lessons.map((lesson, li) => (
                <SortableLesson
                  key={lesson.id || `lesson-${moduleIndex}-${sectionIndex}-${li}`}
                  lesson={lesson}
                  moduleIndex={moduleIndex}
                  sectionIndex={sectionIndex}
                  lessonIndex={li}
                  onUpdate={(data) => onLessonUpdate(li, data)}
                  onRemove={() => onLessonRemove(li)}
                  courseId={courseId}
                />
              ))}
            </SortableContext>
          </DndContext>

          <div className="relative">
            <button
              onClick={() => setShowTypeMenu(!showTypeMenu)}
              className="flex items-center gap-2 text-xs text-secondary-text hover:text-accent-teal transition-colors w-full py-1.5 px-2 rounded border-2 border-dashed border-white/30 hover:border-accent-teal/30 cursor-pointer"
            >
              <Plus size={14} />
              Add lesson
            </button>
            {showTypeMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-white/30 shadow-lg z-10 p-1 min-w-[160px]">
                {lessonTypes.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => { onAddLesson(t.value); setShowTypeMenu(false); }}
                    className="block w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-indigo-50 transition-colors cursor-pointer"
                  >
                    <span className="mr-2">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
