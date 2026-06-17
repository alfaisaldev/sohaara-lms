'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { adminApi as api } from '@/lib/api';
import { Button } from '@sohaara/ui';
import { Map, Plus, Pencil, Trash2, Users, CheckCircle, XCircle, GripVertical, BookOpen, Search, Clock, Target, Calendar, Tag, Shield, User, ArrowRight, Lock, Unlock, UserPlus, Check, X, MessageSquare, ChevronRight, Loader2 } from 'lucide-react';
import { DataTable, Column } from '@/components/DataTable';
import { SearchBar } from '@/components/SearchBar';
import { Pagination } from '@/components/Pagination';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';

const PAGE_SIZE = 15;

const toArray = (v: any): any[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (v.data && Array.isArray(v.data)) return v.data;
  return [];
};

export default function AdminLearningPathsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [showRequests, setShowRequests] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<any>('/learning-paths'),
      api.get<any>('/courses', { limit: 200, includeHidden: 'true' }),
    ])
      .then(([pathsRes, coursesRes]) => {
        setItems(toArray(pathsRes));
        setCourses(toArray(coursesRes));
      })
      .catch(() => toast('error', 'Failed to load data'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = useMemo(() => {
    let r = items;
    if (search) { const q = search.toLowerCase(); r = r.filter((i) => i.title?.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q)); }
    return r;
  }, [items, search]);

  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const handleSave = async (formData: any) => {
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/learning-paths/${editItem.id}`, formData);
        toast('success', 'Learning path updated');
      } else {
        await api.post('/learning-paths', formData);
        toast('success', 'Learning path created');
      }
      setEditItem(null);
      setCreating(false);
      fetch();
    } catch (err: any) {
      toast('error', err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/learning-paths/${deleteId}`);
      toast('success', 'Learning path deleted');
      setDeleteId(null);
      fetch();
    } catch (err: any) {
      toast('error', err.message || 'Failed to delete');
    }
  };

  const fetchJoinRequests = useCallback(async () => {
    try {
      const res = await api.get<any>('/learning-paths/join-requests/pending');
      setJoinRequests(toArray(res));
    } catch { /* not all users have access */ }
  }, []);

  const handleReviewRequest = async (requestId: string, action: 'approved' | 'denied') => {
    setReviewing(requestId);
    try {
      await api.put(`/learning-paths/join-requests/${requestId}`, { action });
      toast('success', `Request ${action}`);
      fetchJoinRequests();
      fetch();
    } catch (err: any) {
      toast('error', err.message || 'Failed to review request');
    } finally {
      setReviewing(null);
    }
  };

  useEffect(() => { fetchJoinRequests(); }, [fetchJoinRequests]);

  const toggleStatus = async (item: any) => {
    const newStatus = item.status === 'published' ? 'draft' : 'published';
    try {
      await api.put(`/learning-paths/${item.id}`, { status: newStatus });
      toast('success', `Path ${newStatus}`);
      fetch();
    } catch (err: any) {
      toast('error', err.message);
    }
  };

  const columns: Column<any>[] = [
    { key: 'title', label: 'Title', sortable: true, render: (i) => <span className="text-white font-medium">{i.title}</span> },
    {
      key: 'description', label: 'Description',
      render: (i) => <span className="text-secondary-text text-sm line-clamp-1">{i.description || '—'}</span>,
    },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (i) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleStatus(i); }}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer ${i.status === 'published' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}
        >
          {i.status === 'published' ? <CheckCircle size={11} className="inline mr-1" /> : <XCircle size={11} className="inline mr-1" />}
          {i.status}
        </button>
      ),
    },
    {
      key: 'courses', label: 'Courses', sortable: true,
      render: (i) => <span className="text-secondary-text">{i.courses?.length || i.coursesRelation?.length || 0}</span>,
    },
    { key: 'isMandatory', label: 'Req', render: (i) => i.isMandatory ? <Tag size={14} className="text-accent-indigo" /> : <span className="text-secondary-text">—</span> },
    {
      key: 'actions', label: '', className: 'w-20 text-right',
      render: (i) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setEditItem(i); }}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteId(i.id); }}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-secondary-text hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-white">Learning Paths</h1>
          <p className="text-secondary-text text-sm mt-1">Curated learning journeys for users</p>
        </div>
        <div className="flex items-center gap-3">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search paths..." />
          <Button onClick={() => setCreating(true)} variant="primary" size="sm" className="rounded-xl cursor-pointer">
            <Plus size={16} /> Add Path
          </Button>
        </div>
      </div>

      {/* Pending Join Requests */}
      {joinRequests.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 animate-fade-in-up">
          <button
            onClick={() => setShowRequests(!showRequests)}
            className="w-full flex items-center justify-between px-4 py-3 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <UserPlus size={16} className="text-amber-400" />
              <span className="text-sm font-medium text-white">Pending Join Requests</span>
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-amber-500/20 px-1.5 text-[11px] font-bold text-amber-400">
                {joinRequests.length}
              </span>
            </div>
            <ChevronRight size={14} className={`text-secondary-text transition-transform ${showRequests ? 'rotate-90' : ''}`} />
          </button>
          {showRequests && (
            <div className="px-4 pb-3 space-y-2">
              {joinRequests.map((req: any) => (
                <div key={req.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-border/40 bg-white/5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-accent-indigo/10 flex items-center justify-center flex-shrink-0">
                      <User size={14} className="text-accent-indigo" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">
                        {req.user?.firstName} {req.user?.lastName}
                      </p>
                      <p className="text-xs text-secondary-text truncate">{req.user?.email}</p>
                      <p className="text-xs text-accent-indigo truncate">→ {req.learningPath?.title}</p>
                      {req.message && (
                        <p className="text-xs text-secondary-text/60 mt-0.5 flex items-center gap-1">
                          <MessageSquare size={10} /> {req.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleReviewRequest(req.id, 'approved')}
                      disabled={reviewing === req.id}
                      className="h-8 w-8 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer disabled:opacity-50"
                      title="Approve"
                    >
                      {reviewing === req.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    </button>
                    <button
                      onClick={() => handleReviewRequest(req.id, 'denied')}
                      disabled={reviewing === req.id}
                      className="h-8 w-8 rounded-lg flex items-center justify-center bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer disabled:opacity-50"
                      title="Deny"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <DataTable
        columns={columns}
        data={paged}
        loading={loading}
        emptyIcon={<Map size={32} className="text-secondary-text/30" />}
        emptyMessage={search ? 'No paths match search' : 'No learning paths yet'}
      />

      <Pagination current={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />

      <Modal
        open={!!editItem || creating}
        onClose={() => { setEditItem(null); setCreating(false); }}
        title={editItem ? 'Edit Learning Path' : 'Create Learning Path'}
        size="xl"
      >
        <PathForm
          item={editItem}
          courses={courses}
          onSave={handleSave}
          onCancel={() => { setEditItem(null); setCreating(false); }}
          saving={saving}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Learning Path"
        message="Are you sure? This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

function PathForm({
  item,
  courses,
  onSave,
  onCancel,
  saving,
}: {
  item: any;
  courses: any[];
  onSave: (data: any) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: item?.title || '',
    description: item?.description || '',
    thumbnail: item?.thumbnail || '',
    targetAudience: item?.targetAudience || '',
    status: item?.status || 'draft',
    isMandatory: item?.isMandatory ?? false,
    deadline: item?.deadline ? item.deadline.split('T')[0] : '',
    estimatedHours: item?.estimatedHours || '',
  });

  const [selectedCourses, setSelectedCourses] = useState<any[]>(
    item?.coursesRelation
      ? [...item.coursesRelation].sort((a: any, b: any) => a.sortOrder - b.sortOrder)
      : item?.courses?.length
        ? item.courses.map((cid: string, i: number) => ({ courseId: cid, sortOrder: i, isMandatory: true, prerequisites: [] }))
        : [],
  );

  const [courseSearch, setCourseSearch] = useState('');
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [tab, setTab] = useState<'details' | 'courses' | 'assignments'>('details');

  const [assignments, setAssignments] = useState<any[]>(item?.assignments || []);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  useEffect(() => {
    if (tab === 'assignments') {
      Promise.all([
        api.get<any>('/users'),
        api.get<any>('/roles'),
      ]).then(([usersRes, rolesRes]) => {
        setUsers(toArray(usersRes));
        setRoles(toArray(rolesRes));
      }).catch(() => {});
    }
  }, [tab]);

  const filteredCourses = useMemo(() => {
    const selectedIds = new Set(selectedCourses.map((c: any) => c.courseId));
    let result = courses.filter((c) => !selectedIds.has(c.id));
    if (courseSearch) {
      const q = courseSearch.toLowerCase();
      result = result.filter((c) => c.title?.toLowerCase().includes(q));
    }
    return result;
  }, [courses, selectedCourses, courseSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      title: form.title,
      description: form.description || undefined,
      thumbnail: form.thumbnail || undefined,
      targetAudience: form.targetAudience || undefined,
      status: form.status,
      isMandatory: form.isMandatory,
      deadline: form.deadline || undefined,
      estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
      courses: selectedCourses.map((c: any) => ({
        courseId: c.courseId,
        sortOrder: c.sortOrder,
        isMandatory: c.isMandatory ?? true,
        prerequisites: c.prerequisites || [],
      })),
    };
    onSave(payload);
  };

  const addCourse = (course: any) => {
    setSelectedCourses((prev) => [
      ...prev,
      { courseId: course.id, sortOrder: prev.length, isMandatory: true, prerequisites: [], course },
    ]);
  };

  const removeCourse = (courseId: string) => {
    setSelectedCourses((prev) =>
      prev.filter((c) => c.courseId !== courseId).map((c, i) => ({ ...c, sortOrder: i })),
    );
  };

  const moveCourse = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= selectedCourses.length) return;
    const updated = [...selectedCourses];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setSelectedCourses(updated.map((c, i) => ({ ...c, sortOrder: i })));
  };

  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const updated = [...selectedCourses];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(index, 0, moved);
    setSelectedCourses(updated.map((c, i) => ({ ...c, sortOrder: i })));
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const togglePrerequisite = (courseId: string, prereqId: string) => {
    setSelectedCourses((prev) =>
      prev.map((c) => {
        if (c.courseId !== courseId) return c;
        const prereqs = c.prerequisites || [];
        return {
          ...c,
          prerequisites: prereqs.includes(prereqId)
            ? prereqs.filter((p: string) => p !== prereqId)
            : [...prereqs, prereqId],
        };
      }),
    );
  };

  const [showAssignUsers, setShowAssignUsers] = useState(false);
  const [showAssignRoles, setShowAssignRoles] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [userSearch, setUserSearch] = useState('');
  const [roleSearch, setRoleSearch] = useState('');

  const handleAddAssignments = async (type: 'user' | 'role') => {
    if (!item?.id) return;
    const ids = type === 'user' ? selectedUsers : selectedRoles;
    if (ids.size === 0) return;
    try {
      const results = await Promise.all(
        [...ids].map((id) =>
          api.post(`/learning-paths/${item.id}/assignments`, { assigneeType: type, assigneeId: id }),
        ),
      );
      setAssignments((prev) => [...prev, ...results]);
      if (type === 'user') { setSelectedUsers(new Set()); setUserSearch(''); setShowAssignUsers(false); }
      else { setSelectedRoles(new Set()); setRoleSearch(''); setShowAssignRoles(false); }
      toast('success', `Assigned ${ids.size} ${type}(s)`);
    } catch (err: any) {
      toast('error', err.message || 'Failed to add assignments');
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!item?.id) return;
    try {
      await api.delete(`/learning-paths/${item.id}/assignments/${assignmentId}`);
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    } catch (err: any) {
      console.error(err);
    }
  };

  const toggleUser = (id: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleRole = (id: string) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredUsers = useMemo(() => {
    if (!userSearch) return users;
    const q = userSearch.toLowerCase();
    return users.filter((u: any) => u.firstName?.toLowerCase().includes(q) || u.lastName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  }, [users, userSearch]);

  const filteredRoles = useMemo(() => {
    if (!roleSearch) return roles;
    const q = roleSearch.toLowerCase();
    return roles.filter((r: any) => r.name?.toLowerCase().includes(q));
  }, [roles, roleSearch]);

  const inputClass = 'w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 transition-all';

  const tabs = [
    { id: 'details', label: 'Details', icon: Map },
    { id: 'courses', label: 'Courses', icon: BookOpen },
    { id: 'assignments', label: 'Assignments', icon: Users },
  ] as const;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-border/50 mb-4">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              type="button"
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${tab === t.id ? 'bg-accent-indigo/20 text-white' : 'text-secondary-text hover:text-white'}`}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'details' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Title *</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Thumbnail URL</label>
              <input value={form.thumbnail} onChange={(e) => setForm({ ...form, thumbnail: e.target.value })} placeholder="https://..." className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={`${inputClass} resize-none`} />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Target Audience</label>
            <input value={form.targetAudience} onChange={(e) => setForm({ ...form, targetAudience: e.target.value })} placeholder="e.g. New hires, Managers, Developers" className={inputClass} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
                <option className="text-gray-900 bg-white" value="draft">Draft</option>
                <option className="text-gray-900 bg-white" value="published">Published</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Estimated Hours</label>
              <input type="number" min="0" step="0.5" value={form.estimatedHours} onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Deadline</label>
              <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.isMandatory}
                onChange={(e) => setForm({ ...form, isMandatory: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:bg-accent-indigo/60 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
            </label>
            <span className="text-sm text-gray-300">Mandatory path (users cannot skip)</span>
          </div>
        </div>
      )}

      {tab === 'courses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">{selectedCourses.length} course{selectedCourses.length !== 1 ? 's' : ''} selected</span>
            <Button type="button" onClick={() => setShowCoursePicker(!showCoursePicker)} variant="ghost" size="sm" className="rounded-xl cursor-pointer">
              <Plus size={14} /> {showCoursePicker ? 'Close' : 'Add Course'}
            </Button>
          </div>

          {showCoursePicker && (
            <div className="rounded-xl border border-border/60 bg-white/5 p-3 space-y-2 max-h-60 overflow-y-auto">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text" />
                <input
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  placeholder="Search courses..."
                  className="w-full rounded-lg border border-border/40 bg-white/5 pl-8 pr-3 py-2 text-sm text-white placeholder:text-secondary-text outline-none focus:border-accent-indigo/50"
                />
              </div>
              {filteredCourses.length === 0 ? (
                <p className="text-sm text-secondary-text text-center py-4">No courses available</p>
              ) : (
                filteredCourses.map((course) => (
                  <button
                    type="button"
                    key={course.id}
                    onClick={() => addCourse(course)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-left cursor-pointer transition-colors"
                  >
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen size={14} className="text-accent-indigo" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{course.title}</p>
                      <p className="text-xs text-secondary-text">{course.level} {course.estimatedHours ? `· ${course.estimatedHours}h` : ''}</p>
                    </div>
                    <Plus size={14} className="text-secondary-text flex-shrink-0" />
                  </button>
                ))
              )}
            </div>
          )}

          {selectedCourses.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                <BookOpen size={20} className="text-secondary-text/40" />
              </div>
              <p className="text-sm text-secondary-text">No courses added yet</p>
              <p className="text-xs text-secondary-text/60 mt-1">Click "Add Course" to build your path</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {selectedCourses.map((sc: any, i: number) => {
                const course = courses.find((c: any) => c.id === sc.courseId) || sc.course || { title: sc.courseId, level: '' };
                const isLocked = sc.prerequisites?.length > 0;
                return (
                  <div
                    key={sc.courseId}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${dragIndex === i ? 'border-accent-indigo/50 bg-accent-indigo/5' : 'border-border/40 bg-white/5'}`}
                  >
                    <div className="cursor-grab active:cursor-grabbing text-secondary-text hover:text-white" onMouseDown={(e) => e.stopPropagation()}>
                      <GripVertical size={16} />
                    </div>
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center text-xs font-bold text-accent-indigo flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-white truncate">{course.title || sc.courseId}</p>
                        {isLocked && <Lock size={11} className="text-amber-400 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-secondary-text">{course.level || ''} {course.estimatedHours ? `· ${course.estimatedHours}h` : ''}</p>
                    </div>

                    <div className="relative group">
                      <button type="button" className="h-7 w-7 rounded-lg flex items-center justify-center text-secondary-text hover:text-amber-400 hover:bg-amber-500/10 cursor-pointer">
                        <Lock size={12} />
                      </button>
                      {selectedCourses.length > 1 && (
                        <div className="absolute right-0 top-full mt-1 z-50 hidden group-hover:block min-w-40 rounded-xl border border-border/60 bg-primary-bg p-2 shadow-xl">
                          <p className="text-xs text-secondary-text mb-2 px-1">Prerequisites (complete before this course):</p>
                          {selectedCourses.slice(0, i).map((prev: any) => {
                            const prevCourse = courses.find((c: any) => c.id === prev.courseId) || { title: prev.courseId };
                            const checked = sc.prerequisites?.includes(prev.courseId);
                            return (
                              <label key={prev.courseId} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => togglePrerequisite(sc.courseId, prev.courseId)}
                                  className="rounded border-border/60 bg-white/5 text-accent-indigo"
                                />
                                <span className="text-xs text-white">{prevCourse.title}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <label className="flex items-center gap-1.5 text-xs text-secondary-text cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={sc.isMandatory ?? true}
                        onChange={() => setSelectedCourses((prev) => prev.map((c) => c.courseId === sc.courseId ? { ...c, isMandatory: !c.isMandatory } : c))}
                        className="rounded border-border/60 bg-white/5 text-accent-indigo"
                      />
                      Req
                    </label>

                    <div className="flex gap-0.5">
                      <button type="button" onClick={() => moveCourse(i, -1)} disabled={i === 0} className="h-7 w-7 rounded-lg flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed">
                        <ArrowRight size={12} className="rotate-180" />
                      </button>
                      <button type="button" onClick={() => moveCourse(i, 1)} disabled={i === selectedCourses.length - 1} className="h-7 w-7 rounded-lg flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed">
                        <ArrowRight size={12} />
                      </button>
                    </div>

                    <button type="button" onClick={() => removeCourse(sc.courseId)} className="h-7 w-7 rounded-lg flex items-center justify-center text-secondary-text hover:text-red-400 hover:bg-red-500/10 cursor-pointer flex-shrink-0">
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {selectedCourses.length > 0 && (
            <div className="rounded-xl border border-border/40 bg-white/[0.02] p-3">
              <div className="flex items-center gap-2 text-xs text-secondary-text mb-2">
                <Map size={12} />
                Path Flow: {selectedCourses.map((sc: any, i: number) => {
                  const course = courses.find((c: any) => c.id === sc.courseId) || { title: sc.courseId };
                  return (
                    <span key={sc.courseId} className="flex items-center gap-1">
                      <span className="text-white">{course.title?.split(' ').slice(0, 2).join(' ') || '?'}</span>
                      {i < selectedCourses.length - 1 && <ArrowRight size={10} className="text-accent-indigo" />}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'assignments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">{assignments.length} assignment{assignments.length !== 1 ? 's' : ''}</span>
          </div>

          {!item?.id && (
            <div className="flex flex-col items-center py-6 text-center">
              <Shield size={20} className="text-secondary-text/40 mb-2" />
              <p className="text-sm text-secondary-text">Save the learning path first to manage assignments</p>
            </div>
          )}

          {item?.id && (
            <div className="space-y-3">
              {/* Assign Users */}
              <div className="rounded-xl border border-border/60 bg-white/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-300 flex items-center gap-1.5"><User size={12} /> Users</span>
                  <button type="button" onClick={() => setShowAssignUsers(!showAssignUsers)} className="text-xs text-accent-indigo hover:text-white transition-colors cursor-pointer">
                    {showAssignUsers ? 'Close' : `Assign Users ${selectedUsers.size > 0 ? `(${selectedUsers.size})` : ''}`}
                  </button>
                </div>
                {showAssignUsers && (
                  <>
                    <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search users..." className={inputClass} />
                    <div className="max-h-40 overflow-y-auto space-y-0.5">
                      {filteredUsers.length === 0 ? (
                        <p className="text-xs text-secondary-text py-2 text-center">No users found</p>
                      ) : (
                        filteredUsers.slice(0, 30).map((u: any) => {
                          const alreadyAssigned = assignments.some((a: any) => a.assigneeType === 'user' && a.assigneeId === u.id);
                          return (
                            <label key={u.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${alreadyAssigned ? 'opacity-40 pointer-events-none' : 'hover:bg-white/5'}`}>
                              <input type="checkbox" checked={selectedUsers.has(u.id)} onChange={() => toggleUser(u.id)} disabled={alreadyAssigned} className="rounded border-border/60 bg-white/5 text-accent-indigo" />
                              <span className="text-xs text-white">{u.firstName} {u.lastName}</span>
                              <span className="text-xs text-secondary-text">{u.email}</span>
                              {alreadyAssigned && <span className="text-[10px] text-emerald-400 ml-auto">Assigned</span>}
                            </label>
                          );
                        })
                      )}
                    </div>
                    <Button type="button" onClick={() => handleAddAssignments('user')} disabled={selectedUsers.size === 0} variant="primary" size="sm" className="rounded-xl cursor-pointer w-full">
                      <User size={12} /> Add Selected Users ({selectedUsers.size})
                    </Button>
                  </>
                )}
              </div>

              {/* Assign Roles */}
              <div className="rounded-xl border border-border/60 bg-white/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-300 flex items-center gap-1.5"><Shield size={12} /> Roles</span>
                  <button type="button" onClick={() => setShowAssignRoles(!showAssignRoles)} className="text-xs text-accent-indigo hover:text-white transition-colors cursor-pointer">
                    {showAssignRoles ? 'Close' : `Assign Roles ${selectedRoles.size > 0 ? `(${selectedRoles.size})` : ''}`}
                  </button>
                </div>
                {showAssignRoles && (
                  <>
                    <input value={roleSearch} onChange={(e) => setRoleSearch(e.target.value)} placeholder="Search roles..." className={inputClass} />
                    <div className="max-h-40 overflow-y-auto space-y-0.5">
                      {filteredRoles.length === 0 ? (
                        <p className="text-xs text-secondary-text py-2 text-center">No roles found</p>
                      ) : (
                        filteredRoles.slice(0, 30).map((r: any) => {
                          const alreadyAssigned = assignments.some((a: any) => a.assigneeType === 'role' && a.assigneeId === r.id);
                          return (
                            <label key={r.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${alreadyAssigned ? 'opacity-40 pointer-events-none' : 'hover:bg-white/5'}`}>
                              <input type="checkbox" checked={selectedRoles.has(r.id)} onChange={() => toggleRole(r.id)} disabled={alreadyAssigned} className="rounded border-border/60 bg-white/5 text-accent-indigo" />
                              <span className="text-xs text-white">{r.name}</span>
                              {alreadyAssigned && <span className="text-[10px] text-emerald-400 ml-auto">Assigned</span>}
                            </label>
                          );
                        })
                      )}
                    </div>
                    <Button type="button" onClick={() => handleAddAssignments('role')} disabled={selectedRoles.size === 0} variant="primary" size="sm" className="rounded-xl cursor-pointer w-full">
                      <Shield size={12} /> Add Selected Roles ({selectedRoles.size})
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Assignments list */}
          {assignments.length === 0 && item?.id ? (
            <div className="flex flex-col items-center py-6 text-center">
              <Users size={20} className="text-secondary-text/40 mb-2" />
              <p className="text-sm text-secondary-text">No assignments yet</p>
              <p className="text-xs text-secondary-text/60 mt-1">Assign users or roles to this path</p>
            </div>
          ) : (
            <div className="space-y-2">
              {assignments.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-border/40 bg-white/5">
                  <div className="flex items-center gap-2">
                    {a.assigneeType === 'user' ? <User size={14} className="text-accent-indigo" /> : <Shield size={14} className="text-emerald-400" />}
                    <span className="text-sm text-white">
                      {a.assigneeType === 'user'
                        ? (users.find((u: any) => u.id === a.assigneeId) ? `${users.find((u: any) => u.id === a.assigneeId).firstName} ${users.find((u: any) => u.id === a.assigneeId).lastName}` : a.assigneeId)
                        : (roles.find((r: any) => r.id === a.assigneeId)?.name || a.assigneeId)}
                    </span>
                    <span className="text-xs text-secondary-text bg-white/5 px-2 py-0.5 rounded-full">{a.assigneeType}</span>
                  </div>
                  <button type="button" onClick={() => handleRemoveAssignment(a.id)} className="h-7 w-7 rounded-lg flex items-center justify-center text-secondary-text hover:text-red-400 hover:bg-red-500/10 cursor-pointer">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-border/40">
        <Button type="button" onClick={onCancel} variant="ghost" size="sm" className="rounded-xl cursor-pointer">Cancel</Button>
        <Button type="submit" variant="primary" size="sm" className="rounded-xl cursor-pointer" loading={saving}>
          {item ? 'Update Path' : 'Create Path'}
        </Button>
      </div>
    </form>
  );
}
