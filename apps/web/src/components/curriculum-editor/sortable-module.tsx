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
import { GripVertical, Plus, Trash2, ChevronDown, ChevronRight, FileArchive } from 'lucide-react';
import { useState } from 'react';
import { SortableSection } from './sortable-section';
import type { Module, Section } from './types';

interface SortableModuleProps {
  module: Module;
  moduleIndex: number;
  onUpdate: (data: Partial<Module>) => void;
  onRemove: () => void;
  onAddSection: () => void;
  onSectionUpdate: (sectionIndex: number, data: any) => void;
  onSectionRemove: (sectionIndex: number) => void;
  onSectionDragEnd: (event: DragEndEvent) => void;
  onAddLesson: (sectionIndex: number, type?: string) => void;
  onLessonUpdate: (sectionIndex: number, lessonIndex: number, data: any) => void;
  onLessonRemove: (sectionIndex: number, lessonIndex: number) => void;
  onLessonDragEnd: (sectionIndex: number) => (event: DragEndEvent) => void;
  sections: Section[];
  courseId: string;
}

export function SortableModule({
  module, moduleIndex, onUpdate, onRemove, onAddSection,
  onSectionUpdate, onSectionRemove, onSectionDragEnd,
  onAddLesson, onLessonUpdate, onLessonRemove, onLessonDragEnd,
  sections, courseId,
}: SortableModuleProps) {
  const [expanded, setExpanded] = useState(true);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: module.id || `module-${moduleIndex}`,
  });

  const sectionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const totalLessons = sections.reduce((sum, s) => sum + s.lessons.length, 0);
  const isScormModule = sections.some((s) => s.lessons.some((l) => l.type === 'scorm'));

  return (
    <div ref={setNodeRef} style={style} className="glass rounded-xl border border-white/30 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/20 bg-white/40 rounded-t-xl">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-secondary-text hover:text-primary-text">
          <GripVertical size={18} />
        </button>
        <button onClick={() => setExpanded(!expanded)} className="text-secondary-text hover:text-primary-text cursor-pointer">
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        <input
          value={module.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="flex-1 font-semibold text-sm bg-transparent border-none outline-none focus:ring-0 text-primary-text"
          placeholder="Module title"
        />
        {isScormModule && <FileArchive size={14} className="text-accent-orange" />}
        <span className="text-xs text-secondary-text bg-white/50 px-2 py-1 rounded-md font-mono">
          {sections.length} section{sections.length !== 1 ? 's' : ''} &middot; {totalLessons} lesson{totalLessons !== 1 ? 's' : ''}
        </span>
        <button onClick={onRemove} className="text-secondary-text hover:text-danger transition-colors cursor-pointer">
          <Trash2 size={16} />
        </button>
      </div>

      {expanded && (
        <div className="p-4 space-y-3">
          <DndContext sensors={sectionSensors} collisionDetection={closestCenter} onDragEnd={onSectionDragEnd}>
            <SortableContext
              items={sections.map((s) => s.id || `section-${moduleIndex}-${sections.indexOf(s)}`)}
              strategy={verticalListSortingStrategy}
            >
              {sections.length === 0 && (
                <div className="text-center py-6 text-sm text-secondary-text">
                  No sections yet. Click "Add section" below.
                </div>
              )}
              {sections.map((section, si) => (
                <SortableSection
                  key={section.id || `section-${moduleIndex}-${si}`}
                  section={section}
                  moduleIndex={moduleIndex}
                  sectionIndex={si}
                  onUpdate={(data) => onSectionUpdate(si, data)}
                  onRemove={() => onSectionRemove(si)}
                  onAddLesson={(type) => onAddLesson(si, type)}
                  onLessonUpdate={(li, data) => onLessonUpdate(si, li, data)}
                  onLessonRemove={(li) => onLessonRemove(si, li)}
                  onLessonDragEnd={onLessonDragEnd(si)}
                  courseId={courseId}
                />
              ))}
            </SortableContext>
          </DndContext>

          <button
            onClick={onAddSection}
            className="flex items-center gap-2 text-sm text-secondary-text hover:text-accent-teal transition-colors w-full py-2 px-3 rounded-lg border-2 border-dashed border-white/30 hover:border-accent-teal/30 cursor-pointer"
          >
            <Plus size={16} />
            Add section
          </button>
        </div>
      )}
    </div>
  );
}
