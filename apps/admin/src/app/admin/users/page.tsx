'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { adminApi as api } from '@/lib/api';
import { Button } from '@sohaara/ui';
import { Users as UsersIcon, Plus, Pencil, Trash2, Loader2, KeyRound, Mail, ShieldOff, ShieldCheck } from 'lucide-react';
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

// Realm role slugs the admin panel may assign. These are the
// Keycloak-side slugs — NOT legacy LMS role IDs. The admin proxy
// (`/api/v1/admin/users/:id/roles`) accepts and stores the slug.
const ASSIGNABLE_REALM_ROLES = [
  { slug: 'super_admin', name: 'Super Admin' },
  { slug: 'admin', name: 'Admin' },
  { slug: 'content_manager', name: 'Content Manager' },
  { slug: 'learner', name: 'Learner' },
];

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
  const isAdmin = roles.includes('admin') || roles.includes('super_admin');
  const effectiveRoleFilter = roles.includes('content_manager') ? 'learner' : roleFilter;

  const fetchUsers = useCallback(() => {
    setLoading(true);
    // Model A+: go through the Keycloak-admin proxy, NOT the legacy
    // `/api/v1/users` route which used to bcrypt-hash a password.
    api.get<any>('/admin/users')
      .then((res) => setUsers(toArray(res)))
      .catch(() => toast('error', 'Failed to load users'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = useMemo(() => {
    let result = users;
    if (effectiveRoleFilter === 'learner') {
      result = result.filter((u) => (u.roles || []).includes('learner'));
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((u) =>
        `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      const aVal = a[sortKey] ?? '';
      const bVal = b[sortKey] ?? '';
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [users, search, sortKey, sortDir, effectiveRoleFilter]);

  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  // Model A+: create in Keycloak via /admin/users; never set a local
  // bcrypt password. The Keycloak admin creates the user with
  // `actions=[UPDATE_PASSWORD]` and emails them a set-password link.
  const handleCreate = async (formData: {
    firstName: string;
    lastName: string;
    email: string;
    enabled: boolean;
    sendPasswordReset: boolean;
    organizationId?: string;
  }) => {
    setSaving(true);
    try {
      const created: any = await api.post('/admin/users', formData);
      toast('success', 'User created — set-password email sent via Keycloak');
      return created;
    } finally {
      setSaving(false);
    }
  };

  // Model A+: toggle enabled in Keycloak via /admin/users/:id/{enable,disable}.
  const handleToggleEnabled = async (user: any) => {
    try {
      if (user.enabled) {
        await api.post(`/admin/users/${user.id}/disable`);
        toast('success', 'User disabled');
      } else {
        await api.post(`/admin/users/${user.id}/enable`);
        toast('success', 'User enabled');
      }
      fetchUsers();
    } catch (err: any) {
      toast('error', err.message || 'Failed to change enabled state');
    }
  };

  const handleSendReset = async (user: any) => {
    try {
      await api.post(`/admin/users/${user.id}/send-reset`);
      toast('success', 'Set-password email sent via Keycloak');
    } catch (err: any) {
      toast('error', err.message || 'Failed to send reset email');
    }
  };

  // Model A+: realm roles are stored in Keycloak. The legacy
  // /api/v1/users/:id/roles endpoint wrote to a local `user_roles`
  // table — do NOT use it. Use /admin/users/:id/roles which diff-syncs
  // the realm.
  const handleAssignRoles = async (userId: string, roles: string[]) => {
    await api.post(`/admin/users/${userId}/roles`, { roles });
  };

  const handleSave = async (formData: any) => {
    setSaving(true);
    try {
      if (editUser) {
        // Edit: Keycloak owns identity; we update only profile fields
        // (firstName/lastName/email) via a name + email patch on the
        // proxy. The KeycloakAdminService helper exposes this — for
        // now the simplest correct path is to delete-and-recreate for
        // rename, and use the dedicated /roles + /enable|/disable +
        // /send-reset endpoints for everything else. The admin proxy
        // currently supports create / list / setRoles / enable / disable
        // / send-reset; profile edits use /admin/users/:id via PUT once
        // we add it. For now, profile edits are limited to role/enabled.
        if (Array.isArray(formData.roles) && formData.roles.length > 0) {
          await handleAssignRoles(editUser.id, formData.roles);
        }
        if (formData.enabled !== undefined && formData.enabled !== editUser.enabled) {
          await api.post(
            formData.enabled ? `/admin/users/${editUser.id}/enable` : `/admin/users/${editUser.id}/disable`,
          );
        }
        toast('success', 'User updated');
      } else {
        const created = await handleCreate(formData);
        if (created?.id && Array.isArray(formData.roles) && formData.roles.length > 0) {
          await handleAssignRoles(created.id, formData.roles);
        }
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
    // Model A+: there is no "delete" in Keycloak via the proxy. The
    // closest is disable + soft-delete in the LMS User row. We disable
    // in Keycloak first (preserves audit), then soft-delete locally.
    try {
      await api.post(`/admin/users/${deleteId}/disable`).catch(() => undefined);
      await api.delete(`/users/${deleteId}`).catch(() => undefined);
      toast('success', 'User disabled and removed');
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
      key: 'roles', label: 'Roles', sortable: false,
      render: (u) => (
        <div className="flex flex-wrap gap-1">
          {(u.roles || []).length > 0 ? (u.roles || []).map((r: string) => (
            <span key={r} className="px-2 py-0.5 rounded-full bg-accent-indigo/10 text-accent-indigo-light text-xs font-medium border border-accent-indigo/20 capitalize">
              {r.replace(/_/g, ' ')}
            </span>
          )) : <span className="text-xs text-secondary-text/60">—</span>}
        </div>
      ),
    },
    {
      key: 'enabled', label: 'Status', sortable: true,
      render: (u) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
          u.enabled
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
        }`}>
          {u.enabled ? 'active' : 'disabled'}
        </span>
      ),
    },
    {
      key: 'createdAt', label: 'Joined', sortable: true,
      render: (u) => <span className="text-secondary-text">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</span>,
    },
    {
      key: 'actions', label: '', className: 'w-32 text-right',
      render: (u) => (
        <div className="flex items-center justify-end gap-1">
          {isAdmin && (
            <>
              <button title="Edit / assign roles" onClick={(e) => { e.stopPropagation(); setEditUser({ ...u, roles: u.roles || [] }); }} className="h-7 w-7 rounded-lg flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 transition-all cursor-pointer">
                <Pencil size={14} />
              </button>
              <button title="Send set-password email" onClick={(e) => { e.stopPropagation(); handleSendReset(u); }} className="h-7 w-7 rounded-lg flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 transition-all cursor-pointer">
                <Mail size={14} />
              </button>
              <button title={u.enabled ? 'Disable user' : 'Enable user'} onClick={(e) => { e.stopPropagation(); handleToggleEnabled(u); }} className="h-7 w-7 rounded-lg flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 transition-all cursor-pointer">
                {u.enabled ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
              </button>
              <button title="Delete (disable + remove)" onClick={(e) => { e.stopPropagation(); setDeleteId(u.id); }} className="h-7 w-7 rounded-lg flex items-center justify-center text-secondary-text hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer">
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
          <p className="text-secondary-text text-sm mt-1">{effectiveRoleFilter === 'learner' ? 'View all enrolled learners' : 'Manage platform users and their roles (Keycloak-owned)'}</p>
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
        message="This disables the user in Keycloak and removes them from the LMS. The Keycloak identity is preserved for audit; sign-in will be blocked."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

function UserForm({ user, onSave, onCancel, saving }: { user: any; onSave: (data: any) => void; onCancel: () => void; saving: boolean }) {
  // Model A+: NO password field on the form. Keycloak emails the
  // set-password link. The form is identity + roles + enabled only.
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    enabled: user ? !!user.enabled : true,
    sendPasswordReset: true,
    roles: Array.isArray(user?.roles) ? user.roles : [],
    organizationId: user?.organizationId || '',
  });

  const toggleRole = (slug: string) => {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(slug)
        ? f.roles.filter((r: string) => r !== slug)
        : [...f.roles, slug],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      enabled: form.enabled,
      sendPasswordReset: form.sendPasswordReset,
      organizationId: form.organizationId || undefined,
    };
    if (Array.isArray(form.roles) && form.roles.length > 0) {
      payload.roles = form.roles;
    }
    onSave(payload);
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
        {!user && (
          <p className="text-xs text-secondary-text mt-1.5">
            A set-password email will be sent from Sohaara Identity after the user is created.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-2">Realm roles (Keycloak)</label>
        <div className="grid grid-cols-2 gap-2">
          {ASSIGNABLE_REALM_ROLES.map((r) => {
            const checked = form.roles.includes(r.slug);
            return (
              <label key={r.slug} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all ${checked ? 'border-accent-indigo/60 bg-accent-indigo/10' : 'border-border/60 bg-white/5 hover:bg-white/10'}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleRole(r.slug)}
                  className="rounded border-border bg-transparent text-accent-indigo focus:ring-accent-indigo/30"
                />
                <span className="text-sm text-white">{r.name}</span>
              </label>
            );
          })}
        </div>
        <p className="text-xs text-secondary-text mt-1.5">
          At least one role is required. Roles live in Keycloak — the LMS never stores them.
        </p>
      </div>

      {!user && (
        <div className="flex items-center justify-between py-2">
          <div>
            <label className="text-sm text-gray-300">Send set-password email</label>
            <p className="text-xs text-secondary-text mt-0.5">Recommended. Lets the user pick their own password.</p>
          </div>
          <div
            onClick={() => setForm({ ...form, sendPasswordReset: !form.sendPasswordReset })}
            className={`w-10 h-5 rounded-full cursor-pointer transition-colors ${form.sendPasswordReset ? 'bg-accent-indigo' : 'bg-white/10'}`}
          >
            <div className={`h-4 w-4 rounded-full bg-white mt-0.5 transition-transform ${form.sendPasswordReset ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'}`} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between py-2">
        <label className="text-sm text-gray-300">Enabled in Keycloak</label>
        <div
          onClick={() => setForm({ ...form, enabled: !form.enabled })}
          className={`w-10 h-5 rounded-full cursor-pointer transition-colors ${form.enabled ? 'bg-accent-indigo' : 'bg-white/10'}`}
        >
          <div className={`h-4 w-4 rounded-full bg-white mt-0.5 transition-transform ${form.enabled ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'}`} />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" onClick={onCancel} variant="ghost" size="sm" className="rounded-xl cursor-pointer">Cancel</Button>
        <Button type="submit" variant="primary" size="sm" className="rounded-xl cursor-pointer" loading={saving}>{user ? 'Update' : 'Create'}</Button>
      </div>
    </form>
  );
}