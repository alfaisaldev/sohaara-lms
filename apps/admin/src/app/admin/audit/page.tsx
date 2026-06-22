'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi as api } from '@/lib/api';
import { ShieldAlert, Search, Monitor, Globe, Mail, Fingerprint, RotateCcw } from 'lucide-react';
import { DataTable, Column } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { useRoles } from '@/lib/auth';

const PAGE_SIZE = 20;

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/20 last:border-0">
      <span className="text-xs font-medium text-secondary-text w-28 shrink-0 pt-0.5">{label}</span>
      <div className="text-sm text-white flex-1 break-all">{children}</div>
    </div>
  );
}

function JsonView({ data }: { data: any }) {
  if (!data || Object.keys(data).length === 0) return <span className="text-secondary-text/50">—</span>;
  return (
    <pre className="text-xs text-secondary-text bg-white/5 rounded-lg p-3 overflow-x-auto max-h-60 leading-relaxed">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function AdminAuditLogPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [actionOptions, setActionOptions] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<any | null>(null);
  const [revertTarget, setRevertTarget] = useState<any | null>(null);
  const [reverting, setReverting] = useState(false);

  const roles = useRoles();
  const isSuperAdmin = roles.includes('super_admin');

  const handleRevert = async () => {
    if (!revertTarget) return;
    setReverting(true);
    try {
      await api.post(`/audit-logs/${revertTarget.id}/revert`);
      toast('success', 'Change reverted successfully');
      setRevertTarget(null);
      setSelected(null);
      fetch();
    } catch (err: any) {
      toast('error', err?.response?.data?.message || err.message || 'Failed to revert');
    } finally {
      setReverting(false);
    }
  };

  const fetch = useCallback(() => {
    setLoading(true);
    const params: any = { limit: PAGE_SIZE, page };
    if (search) params.search = search;
    if (actionFilter) params.action = actionFilter;
    api.get<any>('/audit-logs', params)
      .then((res) => {
        setItems(res?.data || []);
        setTotal(res?.meta?.total || 0);
      })
      .catch(() => toast('error', 'Failed to load logs'))
      .finally(() => setLoading(false));
  }, [toast, page, search, actionFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    api.get<any>('/audit-logs/actions')
      .then((res) => setActionOptions(Array.isArray(res) ? res : []))
      .catch(() => {});
  }, []);

  const columns: Column<any>[] = [
    {
      key: 'action', label: 'Action', sortable: true,
      render: (i) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
          i.action === 'delete' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
          i.action === 'create' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
          i.action === 'update' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
          'bg-accent-indigo/10 text-accent-indigo-light border-accent-indigo/20'
        }`}>{i.action}</span>
      ),
    },
    {
      key: 'entityType', label: 'Entity', sortable: true,
      render: (i) => <span className="text-secondary-text capitalize">{i.entityType?.replace(/_/g, ' ')}</span>,
    },
    {
      key: 'entityId', label: 'Entity ID',
      render: (i) => <span className="text-secondary-text text-xs font-mono">{i.entityId?.slice(0, 8) || '—'}...</span>,
    },
    {
      key: 'performedBy', label: 'Performed By',
      render: (i) => {
        const name = i.performedBy ? `${i.performedBy.firstName || ''} ${i.performedBy.lastName || ''}`.trim() : '';
        const email = i.performedBy?.email;
        return (
          <div className="flex flex-col">
            <span className="text-white">{name || i.performedById?.slice(0, 8) || 'System'}</span>
            {email && <span className="text-xs text-secondary-text">{email}</span>}
          </div>
        );
      },
    },
    {
      key: 'createdAt', label: 'Timestamp', sortable: true,
      render: (i) => <span className="text-secondary-text text-sm">{new Date(i.createdAt).toLocaleString()}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldAlert size={24} className="text-accent-indigo-light" />
          Log
        </h1>
        <p className="text-secondary-text text-sm mt-1">Track all actions performed on the platform</p>
      </div>

      <div className="flex items-center gap-3 animate-fade-in-up">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search logs..."
            className="w-full rounded-xl border border-border/60 bg-white/5 pl-9 pr-4 py-2 text-sm text-white placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 transition-all" />
        </div>
        {actionOptions.length > 0 && (
          <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-border/60 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-indigo/50 transition-all cursor-pointer">
            <option className="text-gray-900 bg-white" value="">All Actions</option>
            {actionOptions.map((a) => <option className="text-gray-900 bg-white" key={a} value={a}>{a}</option>)}
          </select>
        )}
        <span className="text-sm text-secondary-text">{total} entries</span>
      </div>

      <DataTable columns={columns} data={items} loading={loading}
        emptyIcon={<ShieldAlert size={32} className="text-secondary-text/30" />}
        emptyMessage={search || actionFilter ? 'No matching entries' : 'No log entries yet'}
        onRowClick={(item) => setSelected(item)} />

      <Pagination current={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Audit Log Detail" size="lg">
        {selected && (
          <div className="space-y-1">
            <DetailRow label="Action">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                selected.action === 'delete' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                selected.action === 'create' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                selected.action === 'update' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                'bg-accent-indigo/10 text-accent-indigo-light border-accent-indigo/20'
              }`}>{selected.action}</span>
            </DetailRow>
            <DetailRow label="Entity">
              <span className="capitalize">{selected.entityType?.replace(/_/g, ' ')}</span>
            </DetailRow>
            <DetailRow label="Entity ID">
              <div className="flex items-center gap-2">
                <Fingerprint size={14} className="text-secondary-text shrink-0" />
                <span className="font-mono text-xs">{selected.entityId || '—'}</span>
              </div>
            </DetailRow>
            <DetailRow label="Performed By">
              <div className="flex items-center gap-2">
                <span className="text-white">{selected.performedBy ? `${selected.performedBy.firstName || ''} ${selected.performedBy.lastName || ''}`.trim() : 'System'}</span>
                {selected.performedBy?.email && (
                  <span className="flex items-center gap-1 text-xs text-secondary-text">
                    <Mail size={11} /> {selected.performedBy.email}
                  </span>
                )}
              </div>
            </DetailRow>
            <DetailRow label="Timestamp">
              <span>{new Date(selected.createdAt).toLocaleString()}</span>
            </DetailRow>
            {selected.ipAddress && (
              <DetailRow label="IP Address">
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-secondary-text shrink-0" />
                  <span className="font-mono text-xs">{selected.ipAddress}</span>
                </div>
              </DetailRow>
            )}
            {selected.userAgent && (
              <DetailRow label="User Agent">
                <div className="flex items-start gap-2">
                  <Monitor size={14} className="text-secondary-text shrink-0 mt-0.5" />
                  <span className="text-xs text-secondary-text">{selected.userAgent}</span>
                </div>
              </DetailRow>
            )}
            <DetailRow label="Request Body">
              <JsonView data={selected.changes?.body} />
            </DetailRow>
            {selected.metadata && Object.keys(selected.metadata).length > 0 && (
              <DetailRow label="Metadata">
                <JsonView data={selected.metadata} />
              </DetailRow>
            )}
          </div>
        )}
        {isSuperAdmin && (
          <div className="flex justify-end pt-4 border-t border-border/20 mt-4">
            <button
              onClick={() => setRevertTarget(selected)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all"
            >
              <RotateCcw size={14} /> Revert This Change
            </button>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!revertTarget}
        title="Revert Change"
        message={revertTarget?.action === 'create'
          ? `This will delete the ${revertTarget?.entityType?.replace(/_/g, ' ') || 'entity'} that was created. This action cannot be undone.`
          : `This will attempt to reverse the changes made to this ${revertTarget?.entityType?.replace(/_/g, ' ') || 'entity'}. This action cannot be undone.`}
        confirmLabel="Revert"
        variant="danger"
        loading={reverting}
        onConfirm={handleRevert}
        onCancel={() => setRevertTarget(null)}
      />
    </div>
  );
}
