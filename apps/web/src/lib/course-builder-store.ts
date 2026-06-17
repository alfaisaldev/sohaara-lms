import { create } from 'zustand';

interface Lesson {
  id?: string;
  title: string;
  slug: string;
  type: string;
  description?: string;
  content?: string;
  isFree?: boolean;
  isRequired?: boolean;
  videoUrl?: string;
  videoDuration?: number;
  fileUrl?: string;
  embedUrl?: string;
  externalUrl?: string;
  scormPackageId?: string;
  sortOrder: number;
}

interface Section {
  id?: string;
  title: string;
  description?: string;
  lessons: Lesson[];
  sortOrder: number;
}

interface Module {
  id?: string;
  title: string;
  description?: string;
  sections: Section[];
  sortOrder: number;
}

interface CourseBuilderState {
  courseId: string | null;
  title: string;
  description: string;
  modules: Module[];
  dirty: boolean;
  saving: boolean;
  setCourseId: (id: string) => void;
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  setModules: (modules: Module[]) => void;
  addModule: () => void;
  updateModule: (index: number, data: Partial<Module>) => void;
  removeModule: (index: number) => void;
  reorderModules: (modules: Module[]) => void;
  addSection: (moduleIndex: number) => void;
  updateSection: (moduleIndex: number, sectionIndex: number, data: Partial<Section>) => void;
  removeSection: (moduleIndex: number, sectionIndex: number) => void;
  reorderSections: (moduleIndex: number, sections: Section[]) => void;
  addLesson: (moduleIndex: number, sectionIndex: number, type?: string) => void;
  updateLesson: (moduleIndex: number, sectionIndex: number, lessonIndex: number, data: Partial<Lesson>) => void;
  removeLesson: (moduleIndex: number, sectionIndex: number, lessonIndex: number) => void;
  reorderLessons: (moduleIndex: number, sectionIndex: number, lessons: Lesson[]) => void;
  loadCourse: (course: any) => void;
  setSaving: (saving: boolean) => void;
  reset: () => void;
}

export const useCourseBuilderStore = create<CourseBuilderState>((set, get) => ({
  courseId: null,
  title: '',
  description: '',
  modules: [],
  dirty: false,
  saving: false,

  setCourseId: (id) => set({ courseId: id }),

  setTitle: (title) => set({ title, dirty: true }),

  setDescription: (description) => set({ description, dirty: true }),

  setModules: (modules) => set({ modules, dirty: true }),

  addModule: () => {
    const { modules } = get();
    set({
      modules: [...modules, { title: 'New Module', description: '', sections: [], sortOrder: modules.length }],
      dirty: true,
    });
  },

  updateModule: (index, data) => {
    const { modules } = get();
    const updated = [...modules];
    updated[index] = { ...updated[index], ...data } as Module;
    set({ modules: updated, dirty: true });
  },

  removeModule: (index) => {
    const { modules } = get();
    set({
      modules: modules.filter((_, i) => i !== index).map((m, i) => ({ ...m, sortOrder: i })),
      dirty: true,
    });
  },

  reorderModules: (modules) => set({ modules: modules.map((m, i) => ({ ...m, sortOrder: i })), dirty: true }),

  addSection: (moduleIndex) => {
    const { modules } = get();
    const updated = [...modules];
    const mod = { ...updated[moduleIndex]! as Module };
    mod.sections = [...(mod.sections || []), { title: 'New Section', description: '', lessons: [], sortOrder: (mod.sections || []).length }];
    updated[moduleIndex] = mod;
    set({ modules: updated, dirty: true });
  },

  updateSection: (moduleIndex, sectionIndex, data) => {
    const { modules } = get();
    const updated = [...modules];
    const mod = { ...updated[moduleIndex]! as Module };
    const sections = [...(mod.sections || [])];
    sections[sectionIndex] = { ...sections[sectionIndex], ...data } as Section;
    mod.sections = sections;
    updated[moduleIndex] = mod;
    set({ modules: updated, dirty: true });
  },

  removeSection: (moduleIndex, sectionIndex) => {
    const { modules } = get();
    const updated = [...modules];
    const mod = { ...updated[moduleIndex]! as Module };
    mod.sections = (mod.sections || []).filter((_, i) => i !== sectionIndex).map((s, i) => ({ ...s, sortOrder: i }));
    updated[moduleIndex] = mod;
    set({ modules: updated, dirty: true });
  },

  reorderSections: (moduleIndex, sections) => {
    const { modules } = get();
    const updated = [...modules];
    updated[moduleIndex] = { ...updated[moduleIndex]!, sections: sections.map((s, i) => ({ ...s, sortOrder: i })) } as Module;
    set({ modules: updated, dirty: true });
  },

  addLesson: (moduleIndex, sectionIndex, type = 'text') => {
    const { modules } = get();
    const updated = [...modules];
    const mod = { ...updated[moduleIndex]! as Module };
    const sections = [...(mod.sections || [])];
    const section = { ...sections[sectionIndex]! as Section };
    section.lessons = [
      ...(section.lessons || []),
      { title: 'New Lesson', slug: `new-lesson-${Date.now()}`, type, sortOrder: (section.lessons || []).length },
    ];
    sections[sectionIndex] = section;
    mod.sections = sections;
    updated[moduleIndex] = mod;
    set({ modules: updated, dirty: true });
  },

  updateLesson: (moduleIndex, sectionIndex, lessonIndex, data) => {
    const { modules } = get();
    const updated = [...modules];
    const mod = { ...updated[moduleIndex]! as Module };
    const sections = [...(mod.sections || [])];
    const section = { ...sections[sectionIndex]! as Section };
    const lessons = [...(section.lessons || [])];
    lessons[lessonIndex] = { ...lessons[lessonIndex], ...data } as Lesson;
    section.lessons = lessons;
    sections[sectionIndex] = section;
    mod.sections = sections;
    updated[moduleIndex] = mod;
    set({ modules: updated, dirty: true });
  },

  removeLesson: (moduleIndex, sectionIndex, lessonIndex) => {
    const { modules } = get();
    const updated = [...modules];
    const mod = { ...updated[moduleIndex]! as Module };
    const sections = [...(mod.sections || [])];
    const section = { ...sections[sectionIndex]! as Section };
    section.lessons = (section.lessons || []).filter((_, i) => i !== lessonIndex).map((l, i) => ({ ...l, sortOrder: i }));
    sections[sectionIndex] = section;
    mod.sections = sections;
    updated[moduleIndex] = mod;
    set({ modules: updated, dirty: true });
  },

  reorderLessons: (moduleIndex, sectionIndex, lessons) => {
    const { modules } = get();
    const updated = [...modules];
    const mod = { ...updated[moduleIndex]! as Module };
    const sections = [...(mod.sections || [])];
    sections[sectionIndex] = { ...sections[sectionIndex]!, lessons: lessons.map((l, i) => ({ ...l, sortOrder: i })) } as Section;
    mod.sections = sections;
    updated[moduleIndex] = mod;
    set({ modules: updated, dirty: true });
  },

  loadCourse: (course) => {
    set({
      courseId: course.id,
      title: course.title,
      description: course.description || '',
      modules: (course.modules || []).map((m: any) => ({
        id: m.id,
        title: m.title,
        description: m.description || '',
        sortOrder: m.sortOrder,
        sections: (m.sections || []).map((s: any) => ({
          id: s.id,
          title: s.title,
          description: s.description || '',
          sortOrder: s.sortOrder,
            lessons: (s.lessons || []).map((l: any) => ({
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
              fileUrl: l.fileUrl,
              embedUrl: l.embedUrl,
              externalUrl: l.externalUrl,
              scormPackageId: l.scormPackageId,
              sortOrder: l.sortOrder,
            })),
        })),
      })),
      dirty: false,
    });
  },

  setSaving: (saving) => set({ saving }),

  reset: () => set({ courseId: null, title: '', description: '', modules: [], dirty: false, saving: false }),
}));
