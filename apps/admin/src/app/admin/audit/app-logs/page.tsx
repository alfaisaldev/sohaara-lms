'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi as api } from '@/lib/api';
import { useRoles } from '@/lib/auth';
import {
  Terminal, Search, Filter, Clock, AlertTriangle, Activity,
  Server, Globe, Monitor, Fingerprint, ChevronDown, ChevronUp,
  Trash2, RefreshCw
} from 'lucide-react';
import { DataTable, Column } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';

const PAGE_SIZE = 30;
const LEVEL_COLORS: Record<string, string> = {
  fatal: 'bg-red-500/20 text-red-300 border-red-500/30',
  error: 'bg-red-500/15 text-red-400 border-red-500/20',
  warn: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  info: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  debug: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
  verbose: 'bg-gray-500/10 text-gray-500 border-gray-500/15',
};
const METHOD_COLORS: Record<string, string> = {
  GET: 'text-emerald-400',
  POST: 'text-blue-400',
  PUT: 'text-amber-400',
  PATCH: 'text-amber-400',
  DELETE: 'text-red-400',
};

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/20 last:border-0">
      <span className="text-xs font-medium text-secondary-text w-28 shrink-0 pt-0.5">{label}</span>
      <div className="text-sm text-white flex-1 break-all">{children}</div>
    </div>
  );
}

function JsonView({ data, label }: { data: any; label?: string }) {
  const isEmpty = !data || (typeof data === 'object' && Object.keys(data).length === 0);
  if (isEmpty) return <span className="text-secondary-text/50">—</span>;
  return (
    <div>
      {label && <span className="text-xs text-secondary-text mb-1 block">{label}</span>}
      <pre className="text-xs text-secondary-text bg-white/5 rounded-lg p-3 overflow-x-auto max-h-60 leading-relaxed">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default function AdminAppLogsPage() {
  const { toast } = useToast();
  const roles = useRoles();
  const isSuperAdmin = roles.includes('super_admin');

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<any | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [levelFilter, setLevelFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [statusCodeFilter, setStatusCodeFilter] = useState('');
  const [errorCodeFilter, setErrorCodeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [levelOptions, setLevelOptions] = useState<string[]>([]);

  const [stats, setStats] = useState<{ total: number; errors24h: number; avgDuration: number; slowest: any } | null>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [clearDays, setClearDays] = useState(90);
  const [clearing, setClearing] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  const fetch = useCallback(() => {
    setLoading(true);
    const params: Record<string, string | number | boolean | undefined> = {
      limit: PAGE_SIZE, page,
    };
    if (search) params.search = search;
    if (levelFilter) params.level = levelFilter;
    if (methodFilter) params.method = methodFilter;
    if (statusCodeFilter) params.statusCode = parseInt(statusCodeFilter, 10);
    if (errorCodeFilter) params.errorCode = errorCodeFilter;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    api.get<any>('/app-logs', params)
      .then((res) => {
        setItems(res?.data || []);
        setTotal(res?.meta?.total || 0);
      })
      .catch(() => toast('error', 'Failed to load app logs'))
      .finally(() => setLoading(false));
  }, [toast, page, search, levelFilter, methodFilter, statusCodeFilter, errorCodeFilter, startDate, endDate]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    api.get<any>('/app-logs/levels')
      .then((res) => setLevelOptions(Array.isArray(res) ? res : []))
      .catch(() => {});
    api.get<any>('/app-logs/stats')
      .then((res) => setStats(res))
      .catch(() => {});
  }, []);

  const handleClear = async () => {
    setClearing(true);
    try {
      const res = await api.delete<any>(`/app-logs/cleanup?days=${clearDays}`);
      toast('success', `Deleted ${res.deleted} log entries older than ${clearDays} days`);
      setClearDialogOpen(false);
      fetch();
      const freshStats = await api.get<any>('/app-logs/stats');
      setStats(freshStats);
    } catch (err: any) {
      toast('error', err?.message || 'Failed to clear logs');
    } finally {
      setClearing(false);
    }
  };

  const handleClearAll = async () => {
    setClearingAll(true);
    try {
      const res = await api.delete<any>('/app-logs');
      toast('success', `Deleted all ${res.deleted} log entries`);
      setClearAllDialogOpen(false);
      fetch();
      const freshStats = await api.get<any>('/app-logs/stats');
      setStats(freshStats);
    } catch (err: any) {
      toast('error', err?.message || 'Failed to clear all logs');
    } finally {
      setClearingAll(false);
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'level', label: 'Level',
      render: (i) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${LEVEL_COLORS[i.level] || 'bg-gray-500/10 text-gray-400'}`}>
          {i.level?.toUpperCase()}
        </span>
      ),
    },
    {
      key: 'method', label: 'Method',
      render: (i) => i.method ? (
        <span className={`text-xs font-bold ${METHOD_COLORS[i.method] || 'text-secondary-text'}`}>{i.method}</span>
      ) : <span className="text-secondary-text/50">—</span>,
    },
    {
      key: 'path', label: 'Path',
      render: (i) => (
        <span className="text-xs font-mono text-secondary-text truncate max-w-[200px] block" title={i.path}>
          {i.path || '—'}
        </span>
      ),
    },
    {
      key: 'statusCode', label: 'Status',
      render: (i) => i.statusCode ? (
        <span className={`text-xs font-bold ${
          i.statusCode >= 500 ? 'text-red-400' :
          i.statusCode >= 400 ? 'text-amber-400' :
          i.statusCode >= 300 ? 'text-blue-400' :
          'text-emerald-400'
        }`}>{i.statusCode}</span>
      ) : <span className="text-secondary-text/50">—</span>,
    },
    {
      key: 'duration', label: 'Duration',
      render: (i) => i.duration != null ? (
        <span className="text-xs text-secondary-text">{i.duration}ms</span>
      ) : <span className="text-secondary-text/50">—</span>,
    },
    {
      key: 'timestamp', label: 'Time', sortable: true,
      render: (i) => (
        <span className="text-xs text-secondary-text whitespace-nowrap">
          {i.timestamp ? new Date(i.timestamp).toLocaleString() : '—'}
        </span>
      ),
    },
    {
      key: 'user', label: 'User',
      render: (i) => {
        if (!i.user) return <span className="text-secondary-text/50">—</span>;
        const name = `${i.user.firstName || ''} ${i.user.lastName || ''}`.trim();
        return (
          <span className="text-xs text-secondary-text truncate max-w-[120px] block" title={name || i.user.email}>
            {name || i.user.email}
          </span>
        );
      },
    },
    {
      key: 'errorCode', label: 'Error',
      render: (i) => i.errorCode ? (
        <span className="text-xs text-red-400 font-mono">{i.errorCode}</span>
      ) : <span className="text-secondary-text/50">—</span>,
    },
  ];

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Terminal size={40} className="mx-auto text-secondary-text/30" />
          <p className="text-secondary-text">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Terminal size={24} className="text-accent-indigo-light" />
          App Logs
        </h1>
        <p className="text-secondary-text text-sm mt-1">Server-side request and error telemetry</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in-up">
        <div className="glass-dark-card rounded-xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent-indigo/20 flex items-center justify-center">
            <Activity size={18} className="text-accent-indigo-light" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{stats?.total ?? '...'}</p>
            <p className="text-xs text-secondary-text">Total Logs</p>
          </div>
        </div>
        <div className="glass-dark-card rounded-xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-red-500/20 flex items-center justify-center">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-400">{stats?.errors24h ?? '...'}</p>
            <p className="text-xs text-secondary-text">Errors (24h)</p>
          </div>
        </div>
        <div className="glass-dark-card rounded-xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Clock size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{stats?.avgDuration ?? '...'}ms</p>
            <p className="text-xs text-secondary-text">Avg Duration</p>
          </div>
        </div>
        <div className="glass-dark-card rounded-xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Server size={18} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white truncate" title={stats?.slowest?.path}>
              {stats?.slowest ? `${stats.slowest.method || ''} ${(stats.slowest.path || '').slice(0, 20)}...` : '...'}
            </p>
            <p className="text-xs text-secondary-text">
              {stats?.slowest ? `${stats.slowest.duration}ms at ${new Date(stats.slowest.timestamp).toLocaleString()}` : 'Slowest Request'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 animate-fade-in-up">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search messages, paths, errors..."
            className="w-full rounded-xl border border-border/60 bg-white/5 pl-9 pr-4 py-2 text-sm text-white placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 transition-all" />
        </div>
        <select value={levelFilter} onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-border/60 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-indigo/50 transition-all cursor-pointer">
          <option className="text-gray-900 bg-white" value="">All Levels</option>
          {levelOptions.map((l) => (
            <option className="text-gray-900 bg-white" key={l} value={l}>{l.toUpperCase()}</option>
          ))}
        </select>
        <select value={methodFilter} onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}
          className="rounded-xl border border-border/60 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-indigo/50 transition-all cursor-pointer">
          <option className="text-gray-900 bg-white" value="">All Methods</option>
          {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
            <option className="text-gray-900 bg-white" key={m} value={m}>{m}</option>
          ))}
        </select>
        <input value={statusCodeFilter} onChange={(e) => { setStatusCodeFilter(e.target.value); setPage(1); }}
          placeholder="Status code"
          className="w-24 rounded-xl border border-border/60 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 transition-all" />
        <button onClick={() => { fetch(); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-secondary-text hover:text-white bg-white/5 border border-border/60 hover:border-accent-indigo/40 transition-all cursor-pointer">
          <RefreshCw size={14} /> Refresh
        </button>
        <span className="text-sm text-secondary-text ml-auto">{total} entries</span>
      </div>

      <DataTable columns={columns} data={items} loading={loading}
        emptyIcon={<Terminal size={32} className="text-secondary-text/30" />}
        emptyMessage={search || levelFilter || methodFilter ? 'No matching log entries' : 'No log entries yet'}
        onRowClick={(item) => setSelected(item)} />

      <Pagination current={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />

      <div className="flex justify-end gap-3">
        <button onClick={() => setClearAllDialogOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all cursor-pointer">
          <Trash2 size={14} /> Clear All
        </button>
        <button onClick={() => setClearDialogOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-amber-400 border border-amber-500/20 hover:bg-amber-500/10 transition-all cursor-pointer">
          <Trash2 size={14} /> Clear Old Logs
        </button>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="App Log Detail" size="xl">
        {selected && (
          <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin">
            <DetailRow label="Level">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${LEVEL_COLORS[selected.level] || 'bg-gray-500/10 text-gray-400'}`}>
                {selected.level?.toUpperCase()}
              </span>
            </DetailRow>
            <DetailRow label="Message">
              <div className="flex items-start gap-2">
                <Terminal size={14} className="text-secondary-text shrink-0 mt-0.5" />
                <span className="text-sm text-white font-mono">{selected.message}</span>
              </div>
            </DetailRow>
            <DetailRow label="HTTP">
              <div className="flex items-center gap-3">
                {selected.method && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border border-border/40 ${METHOD_COLORS[selected.method] || ''}`}>
                    {selected.method}
                  </span>
                )}
                <span className="text-xs font-mono text-white">{selected.path || '—'}</span>
                {selected.queryString && (
                  <span className="text-xs text-secondary-text font-mono">?{selected.queryString}</span>
                )}
                {selected.statusCode && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    selected.statusCode >= 500 ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                    selected.statusCode >= 400 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                    selected.statusCode >= 300 ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                    'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>{selected.statusCode}</span>
                )}
                {selected.duration != null && (
                  <span className="text-xs text-secondary-text">{selected.duration}ms</span>
                )}
              </div>
            </DetailRow>
            {selected.user && (
              <DetailRow label="User">
                <div className="flex items-center gap-2">
                  <span className="text-white">{`${selected.user.firstName || ''} ${selected.user.lastName || ''}`.trim() || selected.user.email}</span>
                  <span className="text-xs text-secondary-text">({selected.user.email})</span>
                </div>
              </DetailRow>
            )}
            <DetailRow label="Client">
              <div className="space-y-1.5">
                {selected.ipAddress && (
                  <div className="flex items-center gap-2">
                    <Globe size={12} className="text-secondary-text shrink-0" />
                    <span className="text-xs font-mono text-secondary-text">{selected.ipAddress}</span>
                  </div>
                )}
                {selected.userAgent && (
                  <div className="flex items-start gap-2">
                    <Monitor size={12} className="text-secondary-text shrink-0 mt-0.5" />
                    <span className="text-xs text-secondary-text">{selected.userAgent}</span>
                  </div>
                )}
              </div>
            </DetailRow>
            <DetailRow label="ID">
              <div className="flex items-center gap-2">
                <Fingerprint size={14} className="text-secondary-text shrink-0" />
                <span className="font-mono text-xs text-secondary-text">{selected.id}</span>
              </div>
            </DetailRow>
            {selected.errorCode && (
              <DetailRow label="Error Code">
                <span className="text-xs font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded">{selected.errorCode}</span>
              </DetailRow>
            )}
            {selected.errorName && (
              <DetailRow label="Error Type">
                <span className="text-xs text-red-400">{selected.errorName}</span>
              </DetailRow>
            )}
            {selected.stack && (
              <DetailRow label="Stack Trace">
                <div className="space-y-1">
                  <button onClick={() => setExpanded(expanded === 'stack' ? null : 'stack')}
                    className="flex items-center gap-1 text-xs text-accent-indigo-light hover:underline cursor-pointer">
                    {expanded === 'stack' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {expanded === 'stack' ? 'Hide' : 'Show'} Stack Trace
                  </button>
                  {expanded === 'stack' && (
                    <pre className="text-xs text-red-300 bg-red-500/5 rounded-lg p-3 overflow-x-auto max-h-60 leading-relaxed font-mono whitespace-pre-wrap">
                      {selected.stack}
                    </pre>
                  )}
                </div>
              </DetailRow>
            )}
            <DetailRow label="Request Headers">
              <JsonView data={selected.requestHeaders} />
            </DetailRow>
            <DetailRow label="Request Body">
              <JsonView data={selected.requestBody} />
            </DetailRow>
            <DetailRow label="Response Headers">
              <JsonView data={selected.responseHeaders} />
            </DetailRow>
            <DetailRow label="Response Body">
              <JsonView data={selected.responseBody} />
            </DetailRow>
            <DetailRow label="Metadata">
              <JsonView data={selected.metadata} />
            </DetailRow>
            <DetailRow label="Server">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Server size={12} className="text-secondary-text" />
                  <span className="text-xs text-secondary-text">{selected.hostname || '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity size={12} className="text-secondary-text" />
                  <span className="text-xs text-secondary-text">Node {selected.nodeVersion || '—'} / {selected.environment || '—'}</span>
                </div>
              </div>
            </DetailRow>
            <DetailRow label="Timestamp">
              <span className="text-sm text-white">{selected.timestamp ? new Date(selected.timestamp).toLocaleString() : '—'}</span>
            </DetailRow>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={clearAllDialogOpen}
        title="Clear All Logs"
        message="This will permanently delete ALL log entries. This action cannot be undone. Are you sure?"
        confirmLabel="Delete All"
        variant="danger"
        loading={clearingAll}
        onConfirm={handleClearAll}
        onCancel={() => setClearAllDialogOpen(false)}
      />
      <ConfirmDialog
        open={clearDialogOpen}
        title="Clear Old Logs"
        message={<div className="space-y-3">
          <p className="text-secondary-text">Delete log entries older than a specified number of days. This action cannot be undone.</p>
          <div className="flex items-center gap-3">
            <label className="text-sm text-white">Delete entries older than</label>
            <input type="number" value={clearDays} onChange={(e) => setClearDays(parseInt(e.target.value, 10) || 90)}
              className="w-20 rounded-lg border border-border/60 bg-white/5 px-3 py-1.5 text-sm text-white text-center outline-none focus:border-accent-indigo/50"
              min={1} max={365} />
            <span className="text-sm text-secondary-text">days</span>
          </div>
        </div>}
        confirmLabel="Clear Logs"
        variant="danger"
        loading={clearing}
        onConfirm={handleClear}
        onCancel={() => setClearDialogOpen(false)}
      />
    </div>
  );
}
