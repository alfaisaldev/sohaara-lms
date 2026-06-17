'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { adminApi as api } from '@/lib/api';
import { Button } from '@sohaara/ui';
import { Users as UsersIcon, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { DataTable, Column } from '@/components/DataTable';
import { SearchBar } from '@/components/SearchBar';
import { Pagination } from '@/components/Pagination';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { useRoles } from '@/lib/auth';
import { useSearchParams, useRouter } from 'next/navigation';

const toArray = (v: any): any[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (v.data && Array.isArray(v.data)) return v.data;
  return [];
};

const PAGE_SIZE = 15;

export default function AdminUsersPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleFilter = searchParams.get('role');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [editUser, setEditUser] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const roles = useRoles();
  const isAdmin = roles.includes('admin') || roles.includes('platform_super_admin');
  const effectiveRoleFilter = roles.includes('content_manager') ? 'learner' : roleFilter;

  const fetchUsers = useCallback(() => {
    setLoading(true);
    api.get<any>('/users')
      .then((res) => setUsers(toArray(res)))
      .catch(() => toast('error', 'Failed to load users'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = useMemo(() => {
    let result = users;
    if (effectiveRoleFilter === 'learner') {
      result = result.filter((u) => u.role?.slug === 'learner');
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((u) =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.name?.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [users, search, sortKey, sortDir]);

  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleSave = async (formData: any) => {
    setSaving(true);
    try {
      if (editUser) {
        await api.put(`/users/${editUser.id}`, { firstName: formData.firstName, lastName: formData.lastName, email: formData.email, isActive: formData.isActive });
        const oldRoleId = editUser.role?.id;
        if (formData.roleId && formData.roleId !== oldRoleId) {
          if (oldRoleId) await api.delete(`/users/${editUser.id}/roles/${oldRoleId}`).catch(() => {});
          await api.post(`/users/${editUser.id}/roles`, { roleId: formData.roleId });
        }
        toast('success', 'User updated successfully');
      } else {
        const created: any = await api.post('/users', formData);
        if (formData.roleId && created?.id) {
          await api.post(`/users/${created.id}/roles`, { roleId: formData.roleId });
        }
        toast('success', 'User created successfully');
      }
      setEditUser(null);
      setCreating(false);
      fetchUsers();
    } catch (err: any) {
      toast('error', err.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/users/${deleteId}`);
      toast('success', 'User deleted successfully');
      setDeleteId(null);
      fetchUsers();
    } catch (err: any) {
      toast('error', err.message || 'Failed to delete user');
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'firstName', label: 'Name', sortable: true,
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent-indigo to-accent-indigo-light flex items-center justify-center text-xs font-medium text-white shrink-0">
            {(u.firstName || '')[0] || ''}{(u.lastName || '')[0] || ''}
          </div>
          <span className="text-white font-medium">{u.firstName} {u.lastName}</span>
        </div>
      ),
    },
    {
      key: 'email', label: 'Email', sortable: true,
      render: (u) => <span className="text-secondary-text">{u.email}</span>,
    },
    {
      key: 'role', label: 'Role', sortable: true,
      render: (u) => (
        <span className="px-2.5 py-1 rounded-full bg-accent-indigo/10 text-accent-indigo-light text-xs font-medium border border-accent-indigo/20 capitalize">
          {u.role?.name || 'Learner'}
        </span>
      ),
    },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (u) => {
        const status = u.status || (u.isActive ? 'active' : 'inactive');
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
            status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
            'bg-gray-500/10 text-gray-400 border-gray-500/20'
          }`}>
            {status}
          </span>
        );
      },
    },
    {
      key: 'createdAt', label: 'Joined', sortable: true,
      render: (u) => <span className="text-secondary-text">{new Date(u.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: 'actions', label: '', className: 'w-20 text-right',
      render: (u) => (
        <div className="flex items-center justify-end gap-1">
          {isAdmin && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setEditUser(u); }} className="h-7 w-7 rounded-lg flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 transition-all cursor-pointer">
                <Pencil size={14} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setDeleteId(u.id); }} className="h-7 w-7 rounded-lg flex items-center justify-center text-secondary-text hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer">
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-white">{effectiveRoleFilter === 'learner' ? 'Learners' : 'Users'}</h1>
          <p className="text-secondary-text text-sm mt-1">{effectiveRoleFilter === 'learner' ? 'View all enrolled learners' : 'Manage platform users and their roles'}</p>
        </div>
        <div className="flex items-center gap-3">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search users..." />
          {isAdmin && (
            <Button onClick={() => setCreating(true)} variant="primary" size="sm" className="rounded-xl cursor-pointer">
              <Plus size={16} /> Add User
            </Button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={paged}
        loading={loading}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        onRowClick={effectiveRoleFilter === 'learner' ? (item) => router.push(`/admin/users/${item.id}/progress`) : undefined}
        emptyIcon={<UsersIcon size={32} className="text-secondary-text/30" />}
        emptyMessage={search ? 'No users match your search' : effectiveRoleFilter === 'learner' ? 'No learners found' : 'No users found'}
      />

      <Pagination current={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />

      <Modal open={!!editUser || creating} onClose={() => { setEditUser(null); setCreating(false); }} title={editUser ? 'Edit User' : 'Create User'} size="lg">
        <UserForm user={editUser} onSave={handleSave} onCancel={() => { setEditUser(null); setCreating(false); }} saving={saving} />
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

function UserForm({ user, onSave, onCancel, saving }: { user: any; onSave: (data: any) => void; onCancel: () => void; saving: boolean }) {
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    password: '',
    roleId: user?.roleId || user?.role?.id || '',
    isActive: user ? (user.isActive !== undefined ? user.isActive : user.status === 'active') : true,
  });
  const [roles, setRoles] = useState<any[]>([]);

  useEffect(() => {
    api.get<any>('/roles').then((res) => { console.log('Roles fetched:', res); setRoles(toArray(res)); }).catch((err) => { console.error('Failed to fetch roles:', err); });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = { firstName: form.firstName, lastName: form.lastName, email: form.email, isActive: form.isActive };
    if (form.password) data.password = form.password;
    if (form.roleId) data.roleId = form.roleId;
    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1.5">First Name</label>
          <input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all" />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1.5">Last Name</label>
          <input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all" />
        </div>
      </div>
      <div>
        <label className="block text-sm text-gray-300 mb-1.5">Email</label>
        <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all" />
      </div>
      <div>
        <label className="block text-sm text-gray-300 mb-1.5">{user ? 'New Password (leave blank to keep)' : 'Password'}</label>
        <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all" />
      </div>
      <div>
        <label className="block text-sm text-gray-300 mb-1.5">Role</label>
        <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}
          className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all">
          <option className="text-gray-900 bg-white" value="">Select role...</option>
          {roles.map((r: any) => <option className="text-gray-900 bg-white" key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>
      <div className="flex items-center justify-between py-2">
        <label className="text-sm text-gray-300">Active</label>
        <div
          onClick={() => setForm({ ...form, isActive: !form.isActive })}
          className={`w-10 h-5 rounded-full cursor-pointer transition-colors ${form.isActive ? 'bg-accent-indigo' : 'bg-white/10'}`}
        >
          <div className={`h-4 w-4 rounded-full bg-white mt-0.5 transition-transform ${form.isActive ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'}`} />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" onClick={onCancel} variant="ghost" size="sm" className="rounded-xl cursor-pointer">Cancel</Button>
        <Button type="submit" variant="primary" size="sm" className="rounded-xl cursor-pointer" loading={saving}>{user ? 'Update' : 'Create'}</Button>
      </div>
    </form>
  );
}
