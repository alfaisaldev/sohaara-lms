'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { adminApi as api } from '@/lib/api';
import { Button } from '@sohaara/ui';
import { Building2, Plus, Pencil, Trash2, Users, Globe, ShieldCheck, BookOpen, Route, Check, Link as LinkIcon } from 'lucide-react';
import { DataTable, Column } from '@/components/DataTable';
import { SearchBar } from '@/components/SearchBar';
import { Pagination } from '@/components/Pagination';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { useRoles } from '@/lib/auth';

const toArray = (v: any): any[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (v.data && Array.isArray(v.data)) return v.data;
  return [];
};

const PAGE_SIZE = 15;

export default function AdminOrganizationsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [editItem, setEditItem] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const roles = useRoles();
  const isAdmin = roles.includes('admin') || roles.includes('platform_super_admin');

  const fetch = useCallback(() => {
    setLoading(true);
    api.get<any>('/organizations')
      .then((res) => setItems(toArray(res)))
      .catch(() => toast('error', 'Failed to load sponsored'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = useMemo(() => {
    let result = items;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((i) =>
        i.name?.toLowerCase().includes(q) ||
        i.email?.toLowerCase().includes(q) ||
        i.slug?.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [items, search, sortKey, sortDir]);

  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleSave = async (orgId: string | null, formData: any, courseIds: string[], learningPathIds: string[]) => {
    setSaving(true);
    try {
      let id = orgId;
      if (orgId) {
        await api.put(`/organizations/${orgId}`, formData);
        toast('success', 'Sponsored updated');
      } else {
        const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'org';
        const created: any = await api.post('/organizations', { ...formData, slug });
        id = created?.id;
        toast('success', 'Sponsored created');
      }
      if (id && courseIds.length > 0) {
        await api.put(`/organizations/${id}/assign-courses`, { courseIds });
      }
      if (id && learningPathIds.length > 0) {
        await api.put(`/organizations/${id}/assign-learning-paths`, { learningPathIds });
      }
      setEditItem(null); setCreating(false); fetch();
    } catch (err: any) { toast('error', err.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await api.delete(`/organizations/${deleteId}`); toast('success', 'Sponsored deleted'); setDeleteId(null); fetch(); }
    catch (err: any) { toast('error', err.message || 'Failed to delete'); }
  };

  const columns: Column<any>[] = [
    { key: 'name', label: 'Name', sortable: true, render: (i) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent-indigo/20 to-accent-indigo/5 flex items-center justify-center"><Building2 size={14} className="text-accent-indigo-light" /></div>
        <span className="text-white font-medium">{i.name}</span>
      </div>
    )},
    { key: 'email', label: 'Email', sortable: true, render: (i) => <span className="text-secondary-text">{i.email || '—'}</span> },
    { key: 'status', label: 'Status', sortable: true, render: (i) => {
      const status = i.status || 'active';
      return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
          status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
          status === 'suspended' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
          'bg-gray-500/10 text-gray-400 border-gray-500/20'
        }`}>{status}</span>
      );
    }},
    { key: '_count.users', label: 'Members', sortable: true, render: (i) => (
      <span className="flex items-center gap-1.5 text-secondary-text"><Users size={14} />{i._count?.users || i.users?.length || 0}</span>
    )},
    { key: '_count.courses', label: 'Courses', sortable: true, render: (i) => (
      <span className="flex items-center gap-1.5 text-secondary-text"><BookOpen size={14} />{i._count?.courses || 0}</span>
    )},
    { key: '_count.learningPaths', label: 'Paths', sortable: true, render: (i) => (
      <span className="flex items-center gap-1.5 text-secondary-text"><Route size={14} />{i._count?.learningPaths || 0}</span>
    )},
    { key: 'slug', label: 'Invite Link', render: (i) => {
      return (
        <button onClick={async (e) => { e.stopPropagation(); try { const res: any = await api.get(`/organizations/${i.id}/invite-token`); const webOrigin = window.location.origin.replace(':3001', ':3000'); navigator.clipboard.writeText(`${webOrigin}/register/${res.token}`); toast('success', 'Invite link copied'); } catch { toast('error', 'Failed to generate invite link'); } }}
          className="flex items-center gap-1.5 text-xs text-accent-indigo-light hover:text-accent-indigo transition-all font-medium"
        >
          <LinkIcon size={12} /> Copy Link
        </button>
      );
    }},
    { key: 'createdAt', label: 'Created', sortable: true, render: (i) => <span className="text-secondary-text">{new Date(i.createdAt).toLocaleDateString()}</span> },
    { key: 'actions', label: '', className: 'w-20 text-right', render: (i) => (
      <div className="flex justify-end gap-1">
        {isAdmin && (
          <>
            <button onClick={(e) => { e.stopPropagation(); setEditItem(i); }} className="h-7 w-7 rounded-lg flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 transition-all cursor-pointer"><Pencil size={14} /></button>
            <button onClick={(e) => { e.stopPropagation(); setDeleteId(i.id); }} className="h-7 w-7 rounded-lg flex items-center justify-center text-secondary-text hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"><Trash2 size={14} /></button>
          </>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-white">Sponsored</h1>
          <p className="text-secondary-text text-sm mt-1">Manage sponsored organizations and their content</p>
        </div>
        <div className="flex items-center gap-3">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search sponsored..." />
          {isAdmin && (
            <Button onClick={() => setCreating(true)} variant="primary" size="sm" className="rounded-xl cursor-pointer"><Plus size={16} /> Add Sponsored</Button>
          )}
        </div>
      </div>
      <DataTable columns={columns} data={paged} loading={loading}
        sortKey={sortKey} sortDir={sortDir} onSort={handleSort}
        emptyIcon={<Building2 size={32} className="text-secondary-text/30" />}
        emptyMessage={search ? 'No sponsored match search' : 'No sponsored yet'} />
      <Pagination current={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
      <Modal open={!!editItem || creating} onClose={() => { setEditItem(null); setCreating(false); }} title={editItem ? 'Edit Sponsored' : 'Add Sponsored'} size="xl">
        <OrgForm item={editItem} onSave={handleSave} onCancel={() => { setEditItem(null); setCreating(false); }} saving={saving} />
      </Modal>
      <ConfirmDialog open={!!deleteId} title="Delete Sponsored" message="Are you sure? This will also remove all associated departments, teams, and content." onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}

function CheckboxList({ items, selected, onChange, label, icon }: { items: any[]; selected: string[]; onChange: (ids: string[]) => void; label: string; icon: React.ReactNode }) {
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };
  return (
    <div>
      <label className="block text-sm text-gray-300 mb-2 flex items-center gap-2">{icon} {label}</label>
      <div className="max-h-40 overflow-y-auto rounded-xl border border-border/60 bg-white/[0.03] p-1 space-y-0.5">
        {items.length === 0 && <p className="text-xs text-secondary-text/50 px-3 py-2">No items available</p>}
        {items.map((item: any) => {
          const isSelected = selected.includes(item.id);
          return (
            <div key={item.id} onClick={() => toggle(item.id)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-white/5 transition-all"
            >
              <div className={`h-4 w-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-accent-indigo border-accent-indigo' : 'border-border/60'}`}>
                {isSelected && <Check size={10} className="text-white" />}
              </div>
              <span className="text-sm text-white">{item.title}</span>
              <span className="text-xs text-secondary-text/50 ml-auto capitalize">{item.status || ''}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrgForm({ item, onSave, onCancel, saving }: { item: any; onSave: (id: string | null, data: any, courseIds: string[], learningPathIds: string[]) => void; onCancel: () => void; saving: boolean }) {
  const [form, setForm] = useState({
    name: item?.name || '',
    email: item?.email || '',
    description: item?.description || '',
    website: item?.website || '',
    status: item?.status || 'active',
  });
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [allPaths, setAllPaths] = useState<any[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>(item?.courses?.map((c: any) => c.id) || []);
  const [selectedPaths, setSelectedPaths] = useState<string[]>(item?.learningPaths?.map((lp: any) => lp.id) || []);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    setLoadingOptions(true);
    Promise.all([
      api.get<any>('/courses').then((res) => setAllCourses(toArray(res))).catch(() => {}),
      api.get<any>('/learning-paths').then((res) => setAllPaths(toArray(res))).catch(() => {}),
    ]).finally(() => setLoadingOptions(false));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = { name: form.name, email: form.email, description: form.description, website: form.website };
    if (item) data.status = form.status;
    onSave(item?.id || null, data, selectedCourses, selectedPaths);
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1.5">Name *</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all" />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1.5">Slug</label>
          <input value={form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'org'} disabled
            className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-secondary-text outline-none transition-all" />
          <p className="text-xs text-secondary-text/50 mt-1">Auto-generated from name</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1.5">Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all" />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1.5">Website</label>
          <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
            className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all" />
        </div>
      </div>
      <div>
        <label className="block text-sm text-gray-300 mb-1.5">Description</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3}
          className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all resize-none" />
      </div>
      {item && (
        <div className="flex items-center justify-between py-2">
          <label className="text-sm text-gray-300 flex items-center gap-2"><ShieldCheck size={14} /> Status</label>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="rounded-xl border border-border/60 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-indigo/50 transition-all cursor-pointer">
            <option className="text-gray-900 bg-white" value="active">Active</option>
            <option className="text-gray-900 bg-white" value="inactive">Inactive</option>
            <option className="text-gray-900 bg-white" value="suspended">Suspended</option>
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/20">
        <CheckboxList items={allCourses} selected={selectedCourses} onChange={setSelectedCourses}
          label="Attached Courses" icon={<BookOpen size={14} className="text-accent-indigo-light" />} />
        <CheckboxList items={allPaths} selected={selectedPaths} onChange={setSelectedPaths}
          label="Attached Learning Paths" icon={<Route size={14} className="text-accent-indigo-light" />} />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" onClick={onCancel} variant="ghost" size="sm" className="rounded-xl cursor-pointer">Cancel</Button>
        <Button type="submit" variant="primary" size="sm" className="rounded-xl cursor-pointer" loading={saving}>{item ? 'Update' : 'Create'}</Button>
      </div>
    </form>
  );
}
