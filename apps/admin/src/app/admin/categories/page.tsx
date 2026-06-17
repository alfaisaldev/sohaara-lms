'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { adminApi as api } from '@/lib/api';
import { Button } from '@sohaara/ui';
import { FolderTree, Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { DataTable, Column } from '@/components/DataTable';
import { SearchBar } from '@/components/SearchBar';
import { Pagination } from '@/components/Pagination';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';

const PAGE_SIZE = 20;

export default function AdminCategoriesPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toArray = (v: any): any[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (v.data && Array.isArray(v.data)) return v.data;
    return [];
  };

  const fetch = useCallback(() => {
    setLoading(true);
    api.get<any>('/courses/categories')
      .then((res) => setItems(toArray(res)))
      .catch(() => toast('error', 'Failed to load categories'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = useMemo(() => {
    let r = items;
    if (search) { const q = search.toLowerCase(); r = r.filter((i) => i.name?.toLowerCase().includes(q)); }
    return r;
  }, [items, search]);

  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const handleSave = async (formData: any) => {
    setSaving(true);
    try {
      if (editItem) { await api.put(`/courses/categories/${editItem.id}`, formData); toast('success', 'Category updated'); }
      else { await api.post('/courses/categories', formData); toast('success', 'Category created'); }
      setEditItem(null); setCreating(false); fetch();
    } catch (err: any) { toast('error', err.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await api.delete(`/courses/categories/${deleteId}`); toast('success', 'Category deleted'); setDeleteId(null); fetch(); }
    catch (err: any) { toast('error', err.message || 'Failed to delete'); }
  };

  const columns: Column<any>[] = [
    { key: 'name', label: 'Name', sortable: true, render: (i) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center"><FolderTree size={14} className="text-emerald-400" /></div>
        <span className="text-white font-medium">{i.name}</span>
      </div>
    )},
    { key: 'description', label: 'Description', render: (i) => <span className="text-secondary-text text-sm line-clamp-1">{i.description || '—'}</span> },
    { key: '_count.courses', label: 'Courses', sortable: true, render: (i) => (
      <span className="flex items-center gap-1.5 text-secondary-text"><BookOpen size={14} />{i._count?.courses || 0}</span>
    )},
    { key: 'actions', label: '', className: 'w-20 text-right', render: (i) => (
      <div className="flex justify-end gap-1">
        <button onClick={(e) => { e.stopPropagation(); setEditItem(i); }} className="h-7 w-7 rounded-lg flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 transition-all cursor-pointer"><Pencil size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteId(i.id); }} className="h-7 w-7 rounded-lg flex items-center justify-center text-secondary-text hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-white">Categories</h1>
          <p className="text-secondary-text text-sm mt-1">Organize courses into categories</p>
        </div>
        <div className="flex items-center gap-3">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search categories..." />
          <Button onClick={() => setCreating(true)} variant="primary" size="sm" className="rounded-xl cursor-pointer"><Plus size={16} /> Add Category</Button>
        </div>
      </div>
      <DataTable columns={columns} data={paged} loading={loading} emptyIcon={<FolderTree size={32} className="text-secondary-text/30" />} emptyMessage={search ? 'No categories match search' : 'No categories yet'} />
      <Pagination current={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
      <Modal open={!!editItem || creating} onClose={() => { setEditItem(null); setCreating(false); }} title={editItem ? 'Edit Category' : 'Create Category'} size="md">
        <CatForm item={editItem} onSave={handleSave} onCancel={() => { setEditItem(null); setCreating(false); }} saving={saving} />
      </Modal>
      <ConfirmDialog open={!!deleteId} title="Delete Category" message="Are you sure? Courses in this category will become uncategorized." onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}

function CatForm({ item, onSave, onCancel, saving }: { item: any; onSave: (data: any) => void; onCancel: () => void; saving: boolean }) {
  const [form, setForm] = useState({ name: item?.name || '', description: item?.description || '' });
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(form); };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><label className="block text-sm text-gray-300 mb-1.5">Category Name *</label>
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 transition-all" /></div>
      <div><label className="block text-sm text-gray-300 mb-1.5">Description</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
          className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 transition-all resize-none" /></div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" onClick={onCancel} variant="ghost" size="sm" className="rounded-xl cursor-pointer">Cancel</Button>
        <Button type="submit" variant="primary" size="sm" className="rounded-xl cursor-pointer" loading={saving}>{item ? 'Update' : 'Create'}</Button>
      </div>
    </form>
  );
}
