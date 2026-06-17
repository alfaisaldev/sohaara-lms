'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi as api } from '@/lib/api';
import { Button } from '@sohaara/ui';
import { BookOpen, Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { DataTable, Column } from '@/components/DataTable';
import { SearchBar } from '@/components/SearchBar';
import { Pagination } from '@/components/Pagination';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';

const PAGE_SIZE = 15;

const toArray = (v: any): any[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (v.data && Array.isArray(v.data)) return v.data;
  return [];
};

export default function AdminCoursesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchCourses = useCallback(() => {
    setLoading(true);
    api.get<any>('/courses', { limit: 100, includeHidden: true })
      .then((res) => setCourses(toArray(res)))
      .catch(() => toast('error', 'Failed to load courses'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const filtered = useMemo(() => {
    let result = courses;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) =>
        c.title?.toLowerCase().includes(q) ||
        c.level?.toLowerCase().includes(q) ||
        c.status?.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : Number(aVal) - Number(bVal);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [courses, search, sortKey, sortDir]);

  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleToggleStatus = async (c: any) => {
    const newStatus = c.status === 'published' ? 'draft' : 'published';
    try {
      await api.put(`/courses/${c.id}`, { status: newStatus });
      toast('success', `Course ${newStatus === 'published' ? 'published' : 'unpublished'}`);
      fetchCourses();
    } catch (err: any) {
      toast('error', err.message || 'Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/courses/${deleteId}`);
      toast('success', 'Course deleted successfully');
      setDeleteId(null);
      fetchCourses();
    } catch (err: any) {
      toast('error', err.message || 'Failed to delete course');
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'title', label: 'Title', sortable: true,
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent-indigo/20 to-accent-indigo/5 flex items-center justify-center shrink-0">
            <BookOpen size={14} className="text-accent-indigo-light" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{c.title}</span>
            {c.hidden && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Hidden
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'level', label: 'Level', sortable: true,
      render: (c) => <span className="text-secondary-text capitalize">{c.level || 'beginner'}</span>,
    },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (c) => {
        const isPublished = c.status === 'published';
        return (
          <button onClick={(e) => { e.stopPropagation(); handleToggleStatus(c); }}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer transition-all hover:scale-105 ${
              isPublished ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
              c.status === 'draft' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
              'bg-gray-500/10 text-gray-400 border-gray-500/20'
            }`}
          >
            <div className="flex items-center gap-1.5">
              {isPublished ? <Eye size={11} /> : <EyeOff size={11} />}
              {c.status}
            </div>
          </button>
        );
      },
    },
    {
      key: '_count.enrollments', label: 'Enrollments', sortable: true,
      render: (c) => <span className="text-secondary-text">{c._count?.enrollments || c.enrollments || 0}</span>,
    },
    {
      key: 'createdAt', label: 'Created', sortable: true,
      render: (c) => <span className="text-secondary-text">{new Date(c.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: 'actions', label: '', className: 'w-24 text-right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); router.push(`/admin/courses/${c.id}`); }}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 transition-all cursor-pointer">
            <Pencil size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-secondary-text hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer">
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
          <h1 className="text-2xl font-bold text-white">Courses</h1>
          <p className="text-secondary-text text-sm mt-1">Manage all courses on the platform</p>
        </div>
        <div className="flex items-center gap-3">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search courses..." />
          <Button onClick={() => router.push('/admin/courses/create')} variant="primary" size="sm" className="rounded-xl cursor-pointer">
            <Plus size={16} /> Add Course
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={paged}
        loading={loading}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        emptyIcon={<BookOpen size={32} className="text-secondary-text/30" />}
        emptyMessage={search ? 'No courses match your search' : 'No courses found'}
      />

      <Pagination current={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Course"
        message="Are you sure you want to delete this course? This will also remove all modules, lessons, and enrollments."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
