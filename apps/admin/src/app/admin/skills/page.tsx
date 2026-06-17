'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { adminApi as api } from '@/lib/api';
import { Button } from '@sohaara/ui';
import { Brain, Plus, Pencil, Trash2, Star, Users } from 'lucide-react';
import { DataTable, Column } from '@/components/DataTable';
import { SearchBar } from '@/components/SearchBar';
import { Pagination } from '@/components/Pagination';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';

const PAGE_SIZE = 20;

export default function AdminSkillsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'skills' | 'categories'>('skills');

  const toArray = (v: any): any[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (v.data && Array.isArray(v.data)) return v.data;
    return [];
  };

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get<any>('/skills').catch(() => []),
      api.get<any>('/skills/categories').catch(() => []),
    ]).then(([sk, cat]) => { setItems(toArray(sk)); setCategories(toArray(cat)); })
    .catch(() => toast('error', 'Failed to load skills'))
    .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const currentData = tab === 'skills' ? items : categories;
  const filtered = useMemo(() => {
    let r = currentData;
    if (search) { const q = search.toLowerCase(); r = r.filter((i) => i.name?.toLowerCase().includes(q)); }
    return r;
  }, [currentData, search]);

  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const handleSave = async (formData: any) => {
    setSaving(true);
    const endpoint = tab === 'skills' ? '/skills' : '/skills/categories';
    try {
      if (editItem) { await api.put(`${endpoint}/${editItem.id}`, formData); toast('success', `${tab === 'skills' ? 'Skill' : 'Category'} updated`); }
      else { await api.post(endpoint, formData); toast('success', `${tab === 'skills' ? 'Skill' : 'Category'} created`); }
      setEditItem(null); setCreating(false); fetchAll();
    } catch (err: any) { toast('error', err.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const endpoint = tab === 'skills' ? '/skills' : '/skills/categories';
    try { await api.delete(`${endpoint}/${deleteId}`); toast('success', `${tab === 'skills' ? 'Skill' : 'Category'} deleted`); setDeleteId(null); fetchAll(); }
    catch (err: any) { toast('error', err.message || 'Failed to delete'); }
  };

  const skillColumns: Column<any>[] = [
    { key: 'name', label: 'Skill', sortable: true, render: (i) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center"><Star size={14} className="text-purple-400" /></div>
        <span className="text-white font-medium">{i.name}</span>
      </div>
    )},
    { key: 'category', label: 'Category', render: (i) => <span className="text-secondary-text">{i.category?.name || '—'}</span> },
    { key: '_count.userSkills', label: 'Users', sortable: true, render: (i) => <span className="text-secondary-text">{i._count?.userSkills || 0}</span> },
    { key: 'actions', label: '', className: 'w-20 text-right', render: (i) => (
      <div className="flex justify-end gap-1">
        <button onClick={(e) => { e.stopPropagation(); setEditItem(i); }} className="h-7 w-7 rounded-lg flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 transition-all cursor-pointer"><Pencil size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); setDeleteId(i.id); }} className="h-7 w-7 rounded-lg flex items-center justify-center text-secondary-text hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"><Trash2 size={14} /></button>
      </div>
    )},
  ];

  const catColumns: Column<any>[] = [
    { key: 'name', label: 'Category', sortable: true, render: (i) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent-indigo/20 to-accent-indigo/5 flex items-center justify-center"><Brain size={14} className="text-accent-indigo-light" /></div>
        <span className="text-white font-medium">{i.name}</span>
      </div>
    )},
    { key: '_count.skills', label: 'Skills', sortable: true, render: (i) => <span className="text-secondary-text">{i._count?.skills || 0}</span> },
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
          <h1 className="text-2xl font-bold text-white">Skills</h1>
          <p className="text-secondary-text text-sm mt-1">Manage skill categories and skills</p>
        </div>
        <div className="flex items-center gap-3">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search..." />
          <Button onClick={() => setCreating(true)} variant="primary" size="sm" className="rounded-xl cursor-pointer"><Plus size={16} /> Add {tab === 'skills' ? 'Skill' : 'Category'}</Button>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-border/50 w-fit">
        <button onClick={() => { setTab('skills'); setPage(1); setSearch(''); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${tab === 'skills' ? 'bg-accent-indigo text-white shadow-sm' : 'text-secondary-text hover:text-white'}`}>Skills</button>
        <button onClick={() => { setTab('categories'); setPage(1); setSearch(''); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${tab === 'categories' ? 'bg-accent-indigo text-white shadow-sm' : 'text-secondary-text hover:text-white'}`}>Categories</button>
      </div>

      <DataTable columns={tab === 'skills' ? skillColumns : catColumns} data={paged} loading={loading}
        emptyIcon={<Brain size={32} className="text-secondary-text/30" />}
        emptyMessage={search ? 'No matches' : `No ${tab} yet`} />
      <Pagination current={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
      <Modal open={!!editItem || creating} onClose={() => { setEditItem(null); setCreating(false); }}
        title={editItem ? `Edit ${tab === 'skills' ? 'Skill' : 'Category'}` : `Create ${tab === 'skills' ? 'Skill' : 'Category'}`} size="md">
        <SkillForm tab={tab} item={editItem} categories={categories} onSave={handleSave}
          onCancel={() => { setEditItem(null); setCreating(false); }} saving={saving} />
      </Modal>
      <ConfirmDialog open={!!deleteId} title={`Delete ${tab === 'skills' ? 'Skill' : 'Category'}`}
        message="Are you sure? This cannot be undone." onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}

function SkillForm({ tab, item, categories, onSave, onCancel, saving }: { tab: string; item: any; categories: any[]; onSave: (data: any) => void; onCancel: () => void; saving: boolean }) {
  const [form, setForm] = useState({ name: item?.name || '', description: item?.description || '', categoryId: item?.categoryId || '' });
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); const d: any = { name: form.name, description: form.description }; if (tab === 'skills') d.categoryId = form.categoryId; onSave(d); };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div><label className="block text-sm text-gray-300 mb-1.5">Name *</label>
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 transition-all" /></div>
      <div><label className="block text-sm text-gray-300 mb-1.5">Description</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
          className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 transition-all resize-none" /></div>
      {tab === 'skills' && (
        <div><label className="block text-sm text-gray-300 mb-1.5">Category</label>
          <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 transition-all">
            <option className="text-gray-900 bg-white" value="">Select category...</option>
            {categories.map((c: any) => <option className="text-gray-900 bg-white" key={c.id} value={c.id}>{c.name}</option>)}
          </select></div>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" onClick={onCancel} variant="ghost" size="sm" className="rounded-xl cursor-pointer">Cancel</Button>
        <Button type="submit" variant="primary" size="sm" className="rounded-xl cursor-pointer" loading={saving}>{item ? 'Update' : 'Create'}</Button>
      </div>
    </form>
  );
}
