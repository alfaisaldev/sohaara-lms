import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, Save, Loader2, Eye, FileArchive } from 'lucide-react';
import { useState } from 'react';
import { SortableModule } from './sortable-module';
import { useCourseBuilderStore } from '@/lib/course-builder-store';
import { api } from '@/lib/api';
import { Button } from '@sohaara/ui';
import { ScormUploadModal } from './scorm-upload-modal';

export function CurriculumEditor() {
  const {
    courseId, modules, dirty, saving, setSaving,
    addModule, removeModule, reorderModules,
    addSection, updateSection, removeSection,
    reorderSections, addLesson, updateLesson, removeLesson, reorderLessons,
  } = useCourseBuilderStore();

  const [scormOpen, setScormOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleModuleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const oldIndex = modules.findIndex((m) => m.id === activeId || `module-${modules.indexOf(m)}` === activeId);
    const newIndex = modules.findIndex((m) => m.id === overId || `module-${modules.indexOf(m)}` === overId);

    if (oldIndex === -1 || newIndex === -1) return;

    const updated = [...modules];
    const [moved] = updated.splice(oldIndex, 1);
    if (!moved) return;
    updated.splice(newIndex, 0, moved);
    reorderModules(updated);
  };

  const handleSectionDragEnd = (moduleIndex: number) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const mod = modules[moduleIndex];
    if (!mod) return;
    const sections = [...mod.sections];

    const activeId = String(active.id);
    const overId = String(over.id);

    const oldIndex = sections.findIndex((s) => s.id === activeId || `section-${sections.indexOf(s)}` === activeId);
    const newIndex = sections.findIndex((s) => s.id === overId || `section-${sections.indexOf(s)}` === overId);

    if (oldIndex === -1 || newIndex === -1) return;

    const updated = [...sections];
    const [moved] = updated.splice(oldIndex, 1);
    if (!moved) return;
    updated.splice(newIndex, 0, moved);
    reorderSections(moduleIndex, updated);
  };

  const handleLessonDragEnd = (moduleIndex: number, sectionIndex: number) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const mod = modules[moduleIndex];
    if (!mod) return;
    const section = mod.sections[sectionIndex];
    if (!section) return;
    const lessons = [...section.lessons];

    const activeId = String(active.id);
    const overId = String(over.id);

    const oldIndex = lessons.findIndex((l) => l.id === activeId || `lesson-${lessons.indexOf(l)}` === activeId);
    const newIndex = lessons.findIndex((l) => l.id === overId || `lesson-${lessons.indexOf(l)}` === overId);

    if (oldIndex === -1 || newIndex === -1) return;

    const updated = [...lessons];
    const [moved] = updated.splice(oldIndex, 1);
    if (!moved) return;
    updated.splice(newIndex, 0, moved);
    reorderLessons(moduleIndex, sectionIndex, updated);
  };

  const handleSave = async () => {
    if (!courseId || !dirty) return;
    setSaving(true);
    try {
      await api.put(`/courses/${courseId}/curriculum`, {
        modules: modules.map((m, mi) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          sortOrder: mi,
          sections: m.sections.map((s, si) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            sortOrder: si,
            lessons: s.lessons.map((l, li) => ({
              id: l.id,
              title: l.title,
              slug: l.slug,
              type: l.type,
              description: l.description,
              content: l.content,
              isFree: l.isFree,
              isRequired: l.isRequired,
              videoUrl: l.videoUrl,
              videoDuration: l.videoDuration,
              scormPackageId: l.scormPackageId,
              sortOrder: li,
            })),
          })),
        })),
      });
      useCourseBuilderStore.setState({ dirty: false });
    } catch (err) {
      console.error('Failed to save curriculum', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold text-primary-text">Curriculum</h3>
          <p className="text-sm text-secondary-text">Drag to reorder. Add modules, sections, and lessons.</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-xs text-accent-orange font-medium">Unsaved changes</span>}
          <Button onClick={() => setScormOpen(true)} variant="ghost" size="sm" className="rounded-xl">
            <FileArchive size={16} />
            SCORM
          </Button>
          <Button onClick={handleSave} disabled={!dirty || saving} loading={saving} variant="primary" size="sm">
            <Save size={16} />
            Save
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleModuleDragEnd}>
        <SortableContext
          items={modules.map((m) => m.id || `module-${modules.indexOf(m)}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {modules.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 glass rounded-2xl">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center mb-4">
                  <Eye size={24} className="text-accent-indigo" />
                </div>
                <p className="text-secondary-text text-sm">No modules yet. Click below to add your first module.</p>
              </div>
            )}
            {modules.map((module, mi) => (
              <SortableModule
                key={module.id || `module-${mi}`}
                module={module}
                moduleIndex={mi}
                onUpdate={(data) => useCourseBuilderStore.getState().updateModule(mi, data)}
                onRemove={() => removeModule(mi)}
                onAddSection={() => addSection(mi)}
                onSectionUpdate={(si, data) => updateSection(mi, si, data)}
                onSectionRemove={(si) => removeSection(mi, si)}
                onSectionDragEnd={handleSectionDragEnd(mi)}
                onAddLesson={(si, type) => addLesson(mi, si, type)}
                onLessonUpdate={(si, li, data) => updateLesson(mi, si, li, data)}
                onLessonRemove={(si, li) => removeLesson(mi, si, li)}
                onLessonDragEnd={(si) => (event) => handleLessonDragEnd(mi, si)(event)}
                sections={module.sections}
                courseId={courseId || ''}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        onClick={addModule}
        className="flex items-center justify-center gap-2 w-full py-4 rounded-xl border-2 border-dashed border-border hover:border-accent-teal/30 text-secondary-text hover:text-accent-teal transition-all cursor-pointer"
      >
        <Plus size={20} />
        <span className="font-medium">Add Module</span>
      </button>

      {scormOpen && courseId && (
        <ScormUploadModal
          courseId={courseId}
          onClose={() => setScormOpen(false)}
          onImport={(pkg) => {
            addModule();
            const modules = useCourseBuilderStore.getState().modules;
            const lastIdx = modules.length - 1;
            if (lastIdx >= 0) {
              useCourseBuilderStore.getState().updateModule(lastIdx, { title: pkg.title });
              addSection(lastIdx);
              const secIdx = useCourseBuilderStore.getState().modules[lastIdx]!.sections.length - 1;
              if (secIdx >= 0) {
                addLesson(lastIdx, secIdx, 'scorm');
                const li = useCourseBuilderStore.getState().modules[lastIdx]!.sections[secIdx]!.lessons.length - 1;
                useCourseBuilderStore.getState().updateLesson(lastIdx, secIdx, li, {
                  title: pkg.title,
                  scormPackageId: pkg.id,
                });
              }
            }
            setScormOpen(false);
          }}
        />
      )}
    </div>
  );
}
