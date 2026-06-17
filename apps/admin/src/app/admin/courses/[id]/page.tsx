'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi as api } from '@/lib/api';
import { Button, Card, CardContent } from '@sohaara/ui';
import {
  ArrowLeft, BookOpen, Layers, Settings, Loader2, Plus, Trash2,
  GripVertical, ChevronDown, ChevronRight, FileText, Video, Headphones,
  Link2, Puzzle, FileType, Eye, EyeOff, Save, Edit3, X, ExternalLink, Upload,
  BarChart3, MessageCircle
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AdminFileUpload } from '@/components/upload';
import AdminQuizTab from '@/components/course-tabs/quiz-tab';
import AdminAssignmentTab from '@/components/course-tabs/assignment-tab';
import AdminResourcesTab from '@/components/course-tabs/resources-tab';
import AdminDiscussionTab from '@/components/course-tabs/discussion-tab';
import { useBeforeUnload } from '@/hooks/use-unsaved-changes';

type Tab = 'settings' | 'curriculum' | 'quiz' | 'assignment' | 'resources' | 'discussion';

const toArray = (v: any): any[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (v.data && Array.isArray(v.data)) return v.data;
  return [];
};

function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFKD')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function AdminCourseBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>('settings');
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; parentId?: string } | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const pendingTab = useRef<Tab | null>(null);
  const pendingNav = useRef<string | null>(null);
  useBeforeUnload(isDirty);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('beginner');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [hidden, setHidden] = useState(false);
  const [hasCertificate, setHasCertificate] = useState(false);
  const [certificateTemplateId, setCertificateTemplateId] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);

  const [modules, setModules] = useState<any[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [editingLesson, setEditingLesson] = useState<{ moduleIdx: number; sectionIdx: number; lessonIdx: number } | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  const fetchCourse = useCallback(() => {
    if (!params.id) return;
    setLoading(true);
    Promise.all([
      api.get<any>(`/courses/${params.id}`),
      api.get<any>('/courses/categories').catch(() => ({ data: [] })),
      api.get<any>('/certificate-templates').catch(() => []),
    ]).then(([courseData, cats, tpls]: any) => {
      setCourse(courseData);
      setTitle(courseData.title || '');
      setDescription(courseData.description || '');
      setLevel(courseData.level || 'beginner');
      setModuleData(courseData);
      setCategories(Array.isArray(cats) ? cats : cats?.data || []);
      setTemplates(toArray(tpls));
      setCategory(courseData.categoryId || '');
      setHidden(courseData.hidden ?? false);
      setHasCertificate(courseData.hasCertificate ?? false);
      setCertificateTemplateId(courseData.certificateTemplateId || '');
    }).catch(() => {
      toast('error', 'Failed to load course');
      router.push('/admin/courses');
    }).finally(() => setLoading(false));
  }, [params.id]);

  const setModuleData = (courseData: any) => {
    const mods = (courseData.modules || []).map((m: any) => ({
      ...m,
      sections: (m.sections || []).map((s: any) => ({
        ...s,
        lessons: (s.lessons || []).map((l: any) => ({ ...l })),
      })),
    }));
    setModules(mods);
  };

  useEffect(() => { fetchCourse(); }, [fetchCourse]);

  const handleSaveSettings = async () => {
    if (!course) return;
    setSaving(true);
    try {
      const updated = await api.put<any>(`/courses/${course.id}`, {
        title, description, level,
        categoryId: category || null,
        hidden,
        hasCertificate,
        certificateTemplateId: hasCertificate && certificateTemplateId ? certificateTemplateId : null,
      });
      setCourse((prev: any) => ({ ...prev, ...updated }));
      setTitle(updated.title || title);
      setIsDirty(false);
      toast('success', 'Settings saved');
    } catch (err: any) {
      toast('error', err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!course) return;
    const newStatus = course.status === 'published' ? 'draft' : 'published';
    try {
      await api.put(`/courses/${course.id}`, { status: newStatus });
      setCourse((prev: any) => ({ ...prev, status: newStatus }));
      toast('success', `Course ${newStatus === 'published' ? 'published' : 'unpublished'}`);
    } catch (err: any) {
      toast('error', err.message || 'Failed to update status');
    }
  };

  const addModule = () => {
    const newModule = {
      id: `new-${Date.now()}`,
      title: 'New Module',
      sortOrder: modules.length,
      sections: [],
    };
    setModules([...modules, newModule]);
    setIsDirty(true);
  };

  const addSection = (moduleIdx: number) => {
    const updated = [...modules];
    const sections = updated[moduleIdx].sections || [];
    updated[moduleIdx] = {
      ...updated[moduleIdx],
      sections: [
        ...sections,
        { id: `new-${Date.now()}`, title: 'New Section', sortOrder: sections.length, lessons: [] },
      ],
    };
    setModules(updated);
    setIsDirty(true);
  };

  const addLesson = (moduleIdx: number, sectionIdx: number) => {
    const updated = [...modules];
    const lessons = updated[moduleIdx].sections[sectionIdx].lessons || [];
    const t = 'New Lesson';
    updated[moduleIdx].sections[sectionIdx] = {
      ...updated[moduleIdx].sections[sectionIdx],
      lessons: [
        ...lessons,
        { id: `new-${Date.now()}`, title: t, slug: slugify(t) + '-' + Date.now(), type: 'video', sortOrder: lessons.length },
      ],
    };
    setModules(updated);
    setIsDirty(true);
  };

  const handleBulkUpload = async (files: FileList, modIdx: number, secIdx: number) => {
    setBulkUploading(true);
    const token = localStorage.getItem('adminToken');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const newLessons: any[] = [];
    let successCount = 0;

    const uploadMedia = async (file: File): Promise<string | null> => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', file.name);
      try {
        const res = await fetch(`${apiUrl}/api/v1/media/upload`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });
        if (!res.ok) return null;
        const media = await res.json();
        return media.url;
      } catch { return null; }
    };

    const uploadScorm = async (file: File): Promise<string | null> => {
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await fetch(`${apiUrl}/api/v1/scorm/upload/${course!.id}`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });
        if (!res.ok) return null;
        const pkg = await res.json();
        return pkg.id;
      } catch { return null; }
    };

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const title = file.name.replace(/\.[^.]+$/, '');
      const slug = slugify(title) + '-' + Date.now();
      const base: any = { id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title, slug, isFree: false };

      if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext || '')) {
        const url = await uploadMedia(file);
        if (url) { base.type = 'video'; base.videoUrl = url; successCount++; }
        else continue;
      } else if (['mp3', 'wav', 'aac', 'ogg', 'wma'].includes(ext || '')) {
        const url = await uploadMedia(file);
        if (url) { base.type = 'audio'; base.content = url; successCount++; }
        else continue;
      } else if (ext === 'pdf') {
        const url = await uploadMedia(file);
        if (url) { base.type = 'pdf'; base.content = url; successCount++; }
        else continue;
      } else if (ext === 'zip') {
        const pkgId = await uploadScorm(file);
        if (pkgId) { base.type = 'scorm'; base.scormPackageId = pkgId; successCount++; }
        else continue;
      } else {
        const url = await uploadMedia(file);
        if (url) { base.type = 'text'; base.content = url; successCount++; }
        else continue;
      }

      newLessons.push(base);
    }

    if (newLessons.length > 0) {
      const updated = [...modules];
      const lessons = updated[modIdx].sections[secIdx].lessons || [];
      updated[modIdx].sections[secIdx] = {
        ...updated[modIdx].sections[secIdx],
        lessons: [...lessons, ...newLessons.map((l, i) => ({ ...l, sortOrder: lessons.length + i }))],
      };
      setModules(updated);
      setIsDirty(true);
    }

    setBulkUploading(false);
    toast('success', `Created ${successCount} lesson${successCount === 1 ? '' : 's'} from ${files.length} file${files.length === 1 ? '' : 's'}`);
  };

  const removeItem = (type: string, id: string) => {
    if (type === 'module') {
      setModules(modules.filter((m) => m.id !== id));
    } else if (type === 'section') {
      setModules(modules.map((m) => ({
        ...m,
        sections: (m.sections || []).filter((s: any) => s.id !== id),
      })));
    } else if (type === 'lesson') {
      setModules(modules.map((m) => ({
        ...m,
        sections: (m.sections || []).map((s: any) => ({
          ...s,
          lessons: (s.lessons || []).filter((l: any) => l.id !== id),
        })),
      })));
    }
  };

  const updateLesson = (modIdx: number, secIdx: number, lesIdx: number, patch: any) => {
    const updated = [...modules];
    const before = updated[modIdx].sections[secIdx].lessons[lesIdx];
    updated[modIdx].sections[secIdx].lessons[lesIdx] = {
      ...before,
      ...patch,
    };
    const after = updated[modIdx].sections[secIdx].lessons[lesIdx];
    console.log('updateLesson', { modIdx, secIdx, lesIdx, beforeScormPkgId: before.scormPackageId, afterScormPkgId: after.scormPackageId, patch });
    setModules(updated);
  };

  const saveCurriculum = async () => {
    setSaving(true);
    try {
      const payload = {
        modules: modules.map((mod, mi) => ({
          id: mod.id?.startsWith('new-') ? undefined : mod.id,
          title: mod.title,
          sortOrder: mi,
          sections: (mod.sections || []).map((sec: any, si: number) => ({
            id: sec.id?.startsWith('new-') ? undefined : sec.id,
            title: sec.title,
            sortOrder: si,
            lessons: (sec.lessons || []).map((les: any, li: number) => ({
              id: les.id?.startsWith('new-') ? undefined : les.id,
              title: les.title,
              slug: les.slug || slugify(les.title) + '-' + li,
              type: les.type || 'video',
              content: les.content,
              videoUrl: les.videoUrl,
              videoDuration: les.videoDuration,
              isFree: les.isFree ?? false,
              isRequired: les.isRequired ?? true,
              scormPackageId: les.scormPackageId,
              sortOrder: li,
            })),
          })),
        })),
      };
      await api.put(`/courses/${course.id}/curriculum`, payload);
      setIsDirty(false);
      toast('success', 'Curriculum saved');
      fetchCourse();
    } catch (err: any) {
      toast('error', err.message || 'Failed to save curriculum');
    } finally {
      setSaving(false);
    }
  };

  const lessonTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video size={14} />;
      case 'audio': return <Headphones size={14} />;
      case 'pdf': return <FileType size={14} />;
      case 'text': return <FileText size={14} />;
      case 'scorm': return <Puzzle size={14} />;
      default: return <Link2 size={14} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-accent-indigo" size={32} />
          <p className="text-secondary-text text-sm">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course) return null;

  const totalLessons = modules.reduce(
    (sum: number, m: any) => sum + (m.sections?.reduce((s: number, sec: any) => s + (sec.lessons?.length || 0), 0) || 0), 0
  );
  const totalSections = modules.reduce((sum: number, m: any) => sum + (m.sections?.length || 0), 0);

  const lesson = editingLesson
    ? modules[editingLesson.moduleIdx]?.sections[editingLesson.sectionIdx]?.lessons[editingLesson.lessonIdx]
    : null;

  const tabs = [
    { id: 'settings' as Tab, label: 'Settings', icon: Settings },
    { id: 'curriculum' as Tab, label: 'Curriculum', icon: Layers },
    { id: 'quiz' as Tab, label: 'Quiz', icon: BarChart3 },
    { id: 'assignment' as Tab, label: 'Assignment', icon: Upload },
    { id: 'resources' as Tab, label: 'Resources', icon: FileText },
    { id: 'discussion' as Tab, label: 'Discussion', icon: MessageCircle },
  ];

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => {
          if (isDirty) { pendingNav.current = '/admin/courses'; setShowUnsavedConfirm(true); }
          else router.push('/admin/courses');
        }} className="text-secondary-text hover:text-white cursor-pointer">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{course.title}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              course.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
              course.status === 'draft' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
              'bg-gray-500/10 text-gray-400 border-gray-500/20'
            }`}>
              {course.status}
            </span>
          </div>
          <p className="text-secondary-text text-sm mt-1">{course.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleToggleStatus} variant="ghost" size="sm" className="rounded-xl cursor-pointer">
            {course.status === 'published' ? <EyeOff size={14} /> : <Eye size={14} />}
            {course.status === 'published' ? 'Unpublish' : 'Publish'}
          </Button>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-border/50">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id}
              onClick={() => {
                if (isDirty) { pendingTab.current = t.id; setShowUnsavedConfirm(true); }
                else setTab(t.id);
              }}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all cursor-pointer ${
                tab === t.id
                  ? 'border-accent-indigo text-accent-indigo-light'
                  : 'border-transparent text-secondary-text hover:text-white'
              }`}
            >
              <Icon size={16} />
              {t.label}
              {t.id === 'curriculum' && totalLessons > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-accent-indigo/10 text-accent-indigo-light">
                  {totalLessons}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'settings' && (
        <div className="max-w-2xl space-y-6">
          <Card variant="glass">
            <CardContent className="p-6 space-y-5">
              <h3 className="text-lg font-semibold text-white">Basic Information</h3>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Course Title *</label>
                <input value={title} onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
                  className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Description</label>
                <textarea value={description} onChange={(e) => { setDescription(e.target.value); setIsDirty(true); }} rows={4}
                  className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Level</label>
                  <select value={level} onChange={(e) => { setLevel(e.target.value); setIsDirty(true); }}
                    className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all">
                    <option className="text-gray-900 bg-white" value="beginner">Beginner</option>
                    <option className="text-gray-900 bg-white" value="intermediate">Intermediate</option>
                    <option className="text-gray-900 bg-white" value="advanced">Advanced</option>
                    <option className="text-gray-900 bg-white" value="all">All Levels</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Category</label>
                  <select value={category} onChange={(e) => { setCategory(e.target.value); setIsDirty(true); }}
                    className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all">
                    <option className="text-gray-900 bg-white" value="">Select category...</option>
                    {categories.map((c: any) => <option className="text-gray-900 bg-white" key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <input type="checkbox" id="edit-hidden" checked={hidden} onChange={(e) => { setHidden(e.target.checked); setIsDirty(true); }}
                  className="rounded border-border/60 bg-white/5 accent-accent-indigo cursor-pointer" />
                <label htmlFor="edit-hidden" className="text-sm text-gray-300 cursor-pointer">Hidden (only accessible via Learning Path)</label>
              </div>

              <div className="border-t border-border/50 pt-5 space-y-3">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="edit-has-cert" checked={hasCertificate} onChange={(e) => { setHasCertificate(e.target.checked); setIsDirty(true); }}
                    className="rounded border-border/60 bg-white/5 accent-accent-indigo cursor-pointer" />
                  <label htmlFor="edit-has-cert" className="text-sm text-gray-300 cursor-pointer">Issue certificate on course completion</label>
                </div>
                {hasCertificate && (
                  <div>
                    <label className="block text-sm text-gray-300 mb-1.5">Certificate Template</label>
                    <select value={certificateTemplateId} onChange={(e) => { setCertificateTemplateId(e.target.value); setIsDirty(true); }}
                      className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all">
                      <option className="text-gray-900 bg-white" value="">— No template (default) —</option>
                      {templates.map((t: any) => <option className="text-gray-900 bg-white" key={t.id} value={t.id}>{t.name}{t.isDefault ? ' (default)' : ''}</option>)}
                    </select>
                    {templates.length === 0 && (
                      <p className="text-xs text-secondary-text mt-1.5">No templates yet. <a href="/admin/certificates" className="text-accent-indigo-light hover:underline">Create one in Certificates</a>.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSaveSettings} variant="primary" size="sm" className="rounded-xl cursor-pointer" loading={saving}>
                  <Save size={14} /> Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Course Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white/5 border border-border/30">
                  <p className="text-2xl font-bold text-white">{modules.length}</p>
                  <p className="text-xs text-secondary-text mt-1">Modules</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-border/30">
                  <p className="text-2xl font-bold text-white">{totalSections}</p>
                  <p className="text-xs text-secondary-text mt-1">Sections</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-border/30">
                  <p className="text-2xl font-bold text-white">{totalLessons}</p>
                  <p className="text-xs text-secondary-text mt-1">Lessons</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'curriculum' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-secondary-text">{modules.length} modules, {totalSections} sections, {totalLessons} lessons</p>
            <div className="flex gap-2">
              <Button onClick={addModule} variant="ghost" size="sm" className="rounded-xl cursor-pointer">
                <Plus size={14} /> Add Module
              </Button>
              <Button onClick={saveCurriculum} variant="primary" size="sm" className="rounded-xl cursor-pointer" loading={saving}>
                <Save size={14} /> Save Curriculum
              </Button>
            </div>
          </div>

          {modules.length === 0 ? (
            <Card variant="glass">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <BookOpen size={40} className="text-secondary-text/20 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No modules yet</h3>
                <p className="text-secondary-text text-sm mb-6 max-w-sm">Start building your course by adding modules. Each module can contain sections and lessons.</p>
                <Button onClick={addModule} variant="primary" size="sm" className="rounded-xl cursor-pointer">
                  <Plus size={16} /> Add First Module
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {modules.map((mod, modIdx) => (
                <Card key={mod.id} variant="glass" className="overflow-hidden">
                  <div className="p-4 border-b border-border/30 flex items-center gap-3">
                    <GripVertical size={16} className="text-secondary-text/30 shrink-0 cursor-grab" />
                    <button onClick={() => setCollapsed({ ...collapsed, [mod.id]: !collapsed[mod.id] })} className="text-secondary-text hover:text-white cursor-pointer">
                      {collapsed[mod.id] ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <input value={mod.title} onChange={(e) => {
                      const updated = [...modules];
                      updated[modIdx] = { ...updated[modIdx], title: e.target.value };
                      setModules(updated);
                      setIsDirty(true);
                    }}
                      className="flex-1 bg-transparent text-sm text-white font-medium outline-none border-b border-transparent focus:border-accent-indigo/50 transition-all" />
                    <span className="text-xs text-secondary-text">{(mod.sections || []).length} sections</span>
                    <button onClick={() => addSection(modIdx)} className="text-secondary-text hover:text-accent-indigo-light transition-colors cursor-pointer" title="Add section">
                      <Plus size={14} />
                    </button>
                    <button onClick={() => setDeleteConfirm({ type: 'module', id: mod.id })}
                      className="text-secondary-text hover:text-red-400 transition-colors cursor-pointer" title="Delete module">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {!collapsed[mod.id] && (
                    <div className="p-4 space-y-3">
                      {(mod.sections || []).length === 0 ? (
                        <p className="text-xs text-secondary-text text-center py-4">No sections. Click + to add one.</p>
                      ) : (
                        mod.sections.map((sec: any, secIdx: number) => (
                          <div key={sec.id} className="rounded-xl bg-white/[0.03] border border-border/20 overflow-hidden">
                            <div className="flex items-center gap-3 p-3 border-b border-border/20">
                              <GripVertical size={14} className="text-secondary-text/20 shrink-0 cursor-grab" />
                              <input value={sec.title} onChange={(e) => {
                                const updated = [...modules];
                                updated[modIdx].sections[secIdx] = { ...updated[modIdx].sections[secIdx], title: e.target.value };
                                setModules(updated);
                                setIsDirty(true);
                              }}
                                className="flex-1 bg-transparent text-xs text-gray-300 font-medium outline-none border-b border-transparent focus:border-accent-indigo/50 transition-all" />
                              <span className="text-xs text-secondary-text">{(sec.lessons || []).length} lessons</span>
                              <button onClick={() => addLesson(modIdx, secIdx)} className="text-secondary-text hover:text-accent-indigo-light transition-colors cursor-pointer" title="Add lesson">
                                <Plus size={12} />
                              </button>
                              <button disabled={bulkUploading}
                                onClick={() => { bulkInputRef.current!.dataset.modIdx = String(modIdx); bulkInputRef.current!.dataset.secIdx = String(secIdx); bulkInputRef.current!.click(); }}
                                className="text-secondary-text hover:text-accent-indigo-light transition-colors disabled:opacity-40 cursor-pointer" title="Bulk upload lessons (video/audio/pdf/scorm/text)">
                                <Upload size={12} />
                              </button>
                              <button onClick={() => setDeleteConfirm({ type: 'section', id: sec.id })}
                                className="text-secondary-text hover:text-red-400 transition-colors cursor-pointer" title="Delete section">
                                <Trash2 size={12} />
                              </button>
                            </div>

                            {(sec.lessons || []).length === 0 ? (
                              <p className="text-xs text-secondary-text text-center py-3">No lessons. Click + to add one.</p>
                            ) : (
                              <div className="divide-y divide-border/10">
                                {sec.lessons.map((les: any, lesIdx: number) => (
                                  <div key={les.id}
                                    className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors group cursor-pointer"
                                  >
                                    <GripVertical size={12} className="text-secondary-text/20 shrink-0 cursor-grab" />
                                    <button onClick={() => setEditingLesson({ moduleIdx: modIdx, sectionIdx: secIdx, lessonIdx: lesIdx })}
                                      className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer">
                                      {lessonTypeIcon(les.type || 'video')}
                                      <span className="text-xs text-gray-400 truncate">{les.title}</span>
                                    </button>
                                    <span className="text-[10px] text-secondary-text capitalize">{les.type}</span>
                                    <button onClick={() => setEditingLesson({ moduleIdx: modIdx, sectionIdx: secIdx, lessonIdx: lesIdx })}
                                      className="opacity-0 group-hover:opacity-100 text-secondary-text hover:text-accent-indigo-light transition-all cursor-pointer" title="Edit lesson">
                                      <Edit3 size={12} />
                                    </button>
                                    <button onClick={() => setDeleteConfirm({ type: 'lesson', id: les.id })}
                                      className="text-secondary-text hover:text-red-400 transition-colors cursor-pointer" title="Delete lesson">
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'quiz' && <AdminQuizTab courseId={course.id} onDirtyChange={setIsDirty} />}
      {tab === 'assignment' && <AdminAssignmentTab courseId={course.id} onDirtyChange={setIsDirty} />}
      {tab === 'resources' && <AdminResourcesTab courseId={course.id} onDirtyChange={setIsDirty} />}
      {tab === 'discussion' && <AdminDiscussionTab courseId={course.id} />}

      {lesson && editingLesson && (
        <LessonEditor
          courseId={course.id}
          lesson={lesson}
          onClose={() => setEditingLesson(null)}
          onSave={(patch) => {
            updateLesson(editingLesson.moduleIdx, editingLesson.sectionIdx, editingLesson.lessonIdx, patch);
            setEditingLesson(null);
          }}
        />
      )}

      <input ref={bulkInputRef} type="file" multiple
        accept=".zip,.mp4,.webm,.mov,.avi,.mkv,.mp3,.wav,.aac,.ogg,.wma,.pdf,.html,.htm,.txt"
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          const modIdx = parseInt(bulkInputRef.current?.dataset.modIdx || '');
          const secIdx = parseInt(bulkInputRef.current?.dataset.secIdx || '');
          if (files?.length && !isNaN(modIdx) && !isNaN(secIdx)) {
            handleBulkUpload(files, modIdx, secIdx);
            e.target.value = '';
          }
        }} />

      <ConfirmDialog
        open={!!deleteConfirm}
        title={`Delete ${deleteConfirm?.type || 'item'}`}
        message={`Are you sure you want to delete this ${deleteConfirm?.type || 'item'}? This action cannot be undone.`}
        variant="danger"
        onConfirm={() => {
          if (deleteConfirm) {
            removeItem(deleteConfirm.type, deleteConfirm.id);
            setIsDirty(true);
            setDeleteConfirm(null);
          }
        }}
        onCancel={() => setDeleteConfirm(null)}
      />

      <ConfirmDialog
        open={showUnsavedConfirm}
        title="Unsaved Changes"
        message="You have unsaved changes. Do you want to discard them and leave this page?"
        variant="warning"
        confirmLabel="Discard Changes"
        onConfirm={() => {
          setShowUnsavedConfirm(false);
          setIsDirty(false);
          if (pendingTab.current != null) { setTab(pendingTab.current); pendingTab.current = null; }
          if (pendingNav.current) { router.push(pendingNav.current); pendingNav.current = null; }
        }}
        onCancel={() => {
          setShowUnsavedConfirm(false);
          pendingTab.current = null;
          pendingNav.current = null;
        }}
      />
    </div>
  );
}

function LessonEditor({ courseId, lesson, onClose, onSave }: { courseId: string; lesson: any; onClose: () => void; onSave: (patch: any) => void }) {
  const [title, setTitle] = useState(lesson.title || '');
  const [slug, setSlug] = useState(lesson.slug || '');
  const [type, setType] = useState(lesson.type || 'video');
  const [content, setContent] = useState(lesson.content || '');
  const [videoUrl, setVideoUrl] = useState(lesson.videoUrl || '');
  const [videoDuration, setVideoDuration] = useState(lesson.videoDuration || '');
  const [fileUrl, setFileUrl] = useState(lesson.content || lesson.videoUrl || '');
  const [scormPackageId, setScormPackageId] = useState(lesson.scormPackageId || '');
  const [isFree, setIsFree] = useState(lesson.isFree ?? false);
  const [uploadingScorm, setUploadingScorm] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  const handleScormUpload = async (file: File) => {
    setUploadingScorm(true);
    try {
      const token = localStorage.getItem('adminToken');
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/scorm/upload/${courseId}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Upload failed');
      const pkg = await res.json();
      setScormPackageId(pkg.id);
      setFileInputKey((k) => k + 1);
    } catch (err: any) {
      alert(err.message || 'SCORM upload failed');
    } finally {
      setUploadingScorm(false);
    }
  };

  const handleSave = () => {
    if (uploadingScorm) return;
    const patch: any = { title, slug, type, isFree };
    const uploadedFile = fileUrl || undefined;
    if (type === 'text') {
      patch.content = uploadedFile || content || null;
      patch.videoUrl = null;
    } else if (type === 'video') {
      patch.videoUrl = uploadedFile || videoUrl || null;
      patch.videoDuration = videoDuration ? Number(videoDuration) : null;
      patch.content = null;
    } else if (type === 'embed' || type === 'external') {
      patch.content = uploadedFile || videoUrl || null;
    } else if (type === 'audio' || type === 'pdf') {
      patch.content = uploadedFile || null;
    } else if (type === 'scorm') {
      patch.scormPackageId = scormPackageId || null;
      console.log('handleSave scorm:', { scormPackageId, patchScorm: patch.scormPackageId });
    } else {
      patch.content = uploadedFile || videoUrl || null;
    }
    if (type !== 'scorm') patch.scormPackageId = null;
    console.log('handleSave final patch:', patch);
    onSave(patch);
  };

  const onFileUpload = (url: string) => {
    setFileUrl(url);
    if (type === 'video') setVideoUrl(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={uploadingScorm ? undefined : onClose}>
      <div className="bg-[#0c0a2a] border border-border/50 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h2 className="text-lg font-semibold text-white">Edit Lesson</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
            <X size={20} className="text-secondary-text" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Lesson Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Slug</label>
              <input value={slug} onChange={(e) => setSlug(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all">
                <option className="text-gray-900 bg-white" value="video">Video</option>
                <option className="text-gray-900 bg-white" value="text">Text</option>
                <option className="text-gray-900 bg-white" value="pdf">PDF</option>
                <option className="text-gray-900 bg-white" value="audio">Audio</option>
                <option className="text-gray-900 bg-white" value="scorm">SCORM</option>
                <option className="text-gray-900 bg-white" value="embed">Embed</option>
                <option className="text-gray-900 bg-white" value="external">External</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="isFree" checked={isFree} onChange={(e) => setIsFree(e.target.checked)}
              className="rounded border-border/60 bg-white/5 accent-accent-indigo" />
            <label htmlFor="isFree" className="text-sm text-gray-300">Free preview (no enrollment required)</label>
          </div>

          <div className="border-t border-border/50 pt-4 space-y-4">
            {type === 'text' && (
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Content (HTML supported)</label>
                <textarea value={content} onChange={(e) => setContent(e.target.value)}
                  rows={10}
                  placeholder="<h1>Lesson content here...</h1><p>Write HTML content directly</p>"
                  className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white font-mono outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all resize-none" />
              </div>
            )}

            {type === 'video' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Video URL</label>
                  <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://example.com/video.mp4 or YouTube/Vimeo URL"
                    className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1.5">Duration (seconds)</label>
                  <input value={videoDuration} onChange={(e) => setVideoDuration(e.target.value)}
                    type="number" min="0" placeholder="e.g. 600"
                    className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all" />
                </div>
              </div>
            )}

            {(type === 'embed' || type === 'external') && (
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">
                  {type === 'embed' ? 'Embed URL (iframe)' : 'External URL'}
                </label>
                <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder={type === 'embed' ? 'https://example.com/embed/...' : 'https://example.com/...'}
                  className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all" />
              </div>
            )}

            {type === 'scorm' && (
              <div className="space-y-3">
                {(scormPackageId && lesson.scormPackage) ? (
                  <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <p className="text-xs text-emerald-400 font-medium">{lesson.scormPackage.title}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">SCORM {lesson.scormPackage.version} &middot; {lesson.scormPackage.entryUrl?.split('/').pop()}</p>
                  </div>
                ) : scormPackageId ? (
                  <p className="text-xs text-green-400">Package linked ✓</p>
                ) : null}
                <div className="p-4 rounded-xl bg-white/5 border border-dashed border-border/60 space-y-3">
                  <p className="text-xs text-gray-400">{scormPackageId ? 'Replace package' : 'Upload SCORM Package (ZIP)'}</p>
                  <input key={fileInputKey} type="file" accept=".zip" disabled={uploadingScorm}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleScormUpload(f); }}
                    className="text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-accent-indigo/10 file:text-accent-indigo-light file:cursor-pointer file:disabled:opacity-40 file:disabled:cursor-not-allowed" />
                  {uploadingScorm && <p className="text-xs text-accent-indigo">Uploading SCORM package...</p>}
                </div>
              </div>
            )}

            {type !== 'scorm' && (
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Upload File</label>
                <AdminFileUpload onUpload={onFileUpload} label="Drop file here or click to browse" />
                {fileUrl && (
                  <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-white/5">
                    <ExternalLink size={14} className="text-accent-indigo" />
                    <span className="text-xs text-gray-400 truncate flex-1">{fileUrl}</span>
                    <button onClick={() => setFileUrl('')} className="text-gray-500 hover:text-red-400 cursor-pointer">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-border/50">
          <button onClick={onClose} disabled={uploadingScorm}
            className="px-4 py-2 rounded-xl text-sm text-secondary-text hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
            Cancel
          </button>
          <button onClick={handleSave} disabled={uploadingScorm}
            className="px-4 py-2 rounded-xl bg-accent-indigo text-white text-sm font-medium hover:bg-accent-indigo/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
            <div className="flex items-center gap-2">
              <Save size={14} /> Save Lesson
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
