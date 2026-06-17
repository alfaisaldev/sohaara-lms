'use client';

import { useRouter } from 'next/navigation';
import { Check, FileText, HelpCircle, FileSpreadsheet, Headphones, File, Video, Link, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface SidebarLesson {
  id: string;
  title: string;
  type: string;
  sortOrder: number;
  completed?: boolean;
}

interface SidebarSection {
  id: string;
  title: string;
  lessons: SidebarLesson[];
}

interface SidebarModule {
  id: string;
  title: string;
  sections: SidebarSection[];
}

interface PlayerSidebarProps {
  modules: SidebarModule[];
  courseId: string;
  currentLessonId: string;
  enrollmentId?: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  video: <Video size={14} />,
  text: <FileText size={14} />,
  quiz: <HelpCircle size={14} />,
  assignment: <FileSpreadsheet size={14} />,
  audio: <Headphones size={14} />,
  pdf: <File size={14} />,
  embed: <Link size={14} />,
};

export function PlayerSidebar({ modules, courseId, currentLessonId, enrollmentId }: PlayerSidebarProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    modules.forEach(m => m.sections.forEach(s => { initial[s.id] = true; }));
    return initial;
  });

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredModules = modules.map(mod => ({
    ...mod,
    sections: mod.sections.map(sec => ({
      ...sec,
      lessons: sec.lessons.filter(l =>
        l.title.toLowerCase().includes(search.toLowerCase())
      ),
    })).filter(sec => sec.lessons.length > 0),
  })).filter(mod => mod.sections.length > 0);

  const totalLessons = modules.reduce((a, m) => a + m.sections.reduce((b, s) => b + s.lessons.length, 0), 0);
  const completedLessons = modules.reduce((a, m) => a + m.sections.reduce((b, s) => b + s.lessons.filter(l => l.completed).length, 0), 0);

  return (
    <aside className="w-80 border-r border-white/10 bg-white/60 backdrop-blur-xl overflow-y-auto flex-shrink-0 flex flex-col">
      <div className="p-4 border-b border-white/20 glass">
        <h3 className="font-semibold text-sm text-primary-text">Course Content</h3>
        <div className="mt-2 h-1.5 w-full rounded-full bg-white/40 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-indigo to-emerald-400 transition-all duration-500"
            style={{ width: totalLessons > 0 ? `${(completedLessons / totalLessons) * 100}%` : '0%' }}
          />
        </div>
        <p className="text-xs text-secondary-text mt-1.5 font-medium">{completedLessons}/{totalLessons} completed</p>
      </div>

      <div className="px-3 pt-3 pb-1">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lessons..."
            className="w-full rounded-xl border border-white/30 bg-white/60 backdrop-blur-sm pl-9 pr-3 py-2 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 p-2 space-y-1 overflow-y-auto">
        {filteredModules.length === 0 && search && (
          <p className="text-xs text-secondary-text text-center py-8">No lessons found</p>
        )}
        {filteredModules.map((mod) => (
          <div key={mod.id}>
            <div className="px-2 py-2">
              <p className="text-xs font-bold text-primary-text uppercase tracking-wider">{mod.title}</p>
            </div>
            {mod.sections.map((sec) => (
              <div key={sec.id}>
                <button
                  onClick={() => toggleSection(sec.id)}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-secondary-text hover:text-primary-text transition-colors rounded-lg"
                >
                  {expandedSections[sec.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <span className="truncate font-medium">{sec.title}</span>
                  <span className="ml-auto text-[10px] text-secondary-text">{sec.lessons.filter(l => l.completed).length}/{sec.lessons.length}</span>
                </button>
                {expandedSections[sec.id] && (
                  <div className="ml-1 space-y-0.5">
                    {sec.lessons.map((lesson) => {
                      const isActive = lesson.id === currentLessonId;
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => router.push(`/courses/${courseId}/player/${lesson.id}`)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-200 text-left ${
                            isActive
                              ? 'glass text-accent-indigo font-semibold shadow-sm border border-accent-indigo/20'
                              : lesson.completed
                                ? 'text-secondary-text hover:text-primary-text hover:bg-white/40'
                                : 'text-secondary-text hover:text-primary-text hover:bg-white/40'
                          }`}
                        >
                          <span className="flex-shrink-0">
                            {lesson.completed ? (
                              <span className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center">
                                <Check size={12} className="text-emerald-600" />
                              </span>
                            ) : (
                              <span className="h-5 w-5 rounded-full bg-white/40 border border-white/30 flex items-center justify-center text-secondary-text">
                                {typeIcons[lesson.type] || <FileText size={12} />}
                              </span>
                            )}
                          </span>
                          <span className="truncate">{lesson.title}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}
