'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi as api } from '@/lib/api';
import { Button } from '@sohaara/ui';
import {
  Award, Plus, Trash2, Eye, Send,
  FileText, CheckCircle2, Clock, XCircle, LayoutTemplate, Sparkles
} from 'lucide-react';
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

type Tab = 'pending' | 'released' | 'revoked' | 'templates';

export default function AdminCertificatesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('pending');
  const [certs, setCerts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [releaseId, setReleaseId] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [deleteCertId, setDeleteCertId] = useState<string | null>(null);
  const [viewCert, setViewCert] = useState<any | null>(null);
  const [deleteTplId, setDeleteTplId] = useState<string | null>(null);

  const fetchCerts = useCallback(() => {
    setLoading(true);
    api.get<any>('/certificates/all', { status: tab === 'templates' ? undefined : tab })
      .then((res) => setCerts(toArray(res)))
      .catch(() => toast('error', 'Failed to load certificates'))
      .finally(() => setLoading(false));
  }, [tab, toast]);

  const fetchTemplates = useCallback(() => {
    api.get<any>('/certificate-templates')
      .then((res) => setTemplates(toArray(res)))
      .catch(() => toast('error', 'Failed to load templates'));
  }, [toast]);

  useEffect(() => {
    if (tab === 'templates') { setLoading(true); fetchTemplates(); setLoading(false); }
    else { fetchCerts(); }
  }, [tab, fetchCerts, fetchTemplates]);

  const filtered = useMemo(() => {
    let r = certs;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((c) =>
        c.title?.toLowerCase().includes(q) ||
        c.user?.email?.toLowerCase().includes(q) ||
        `${c.user?.firstName || ''} ${c.user?.lastName || ''}`.toLowerCase().includes(q) ||
        c.course?.title?.toLowerCase().includes(q) ||
        c.certificateNumber?.toLowerCase().includes(q)
      );
    }
    return r;
  }, [certs, search]);

  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const handleRelease = async () => {
    if (!releaseId) return;
    try {
      await api.post(`/certificates/${releaseId}/release`);
      toast('success', 'Certificate released to user');
      setReleaseId(null);
      fetchCerts();
    } catch (err: any) {
      toast('error', err.message || 'Failed to release');
    }
  };

  const handleRevoke = async () => {
    if (!revokeId) return;
    try {
      await api.post(`/certificates/${revokeId}/revoke`);
      toast('success', 'Certificate revoked');
      setRevokeId(null);
      fetchCerts();
    } catch (err: any) {
      toast('error', err.message || 'Failed to revoke');
    }
  };

  const handleDeleteCert = async () => {
    if (!deleteCertId) return;
    try {
      await api.delete(`/certificates/${deleteCertId}`);
      toast('success', 'Certificate deleted');
      setDeleteCertId(null);
      fetchCerts();
    } catch (err: any) {
      toast('error', err.message || 'Failed to delete');
    }
  };

  const handleDeleteTemplate = async () => {
    if (!deleteTplId) return;
    try {
      await api.delete(`/certificate-templates/${deleteTplId}`);
      toast('success', 'Template deleted');
      setDeleteTplId(null);
      fetchTemplates();
    } catch (err: any) {
      toast('error', err.message || 'Failed to delete template');
    }
  };

  const handleOpenBuilder = (tpl: any) => {
    router.push(`/admin/certificates/builder/${tpl.id}`);
  };

  const certColumns: Column<any>[] = [
    {
      key: 'user', label: 'Recipient', sortable: true,
      render: (c) => (
        <div>
          <p className="text-white font-medium">
            {c.user ? `${c.user.firstName} ${c.user.lastName}` : '—'}
          </p>
          <p className="text-xs text-secondary-text">{c.user?.email || '—'}</p>
        </div>
      ),
    },
    {
      key: 'course.title', label: 'Course', sortable: true,
      render: (c) => <span className="text-secondary-text">{c.course?.title || '—'}</span>,
    },
    {
      key: 'issuedAt', label: 'Issued', sortable: true,
      render: (c) => <span className="text-secondary-text text-xs">{c.issuedAt ? new Date(c.issuedAt).toLocaleDateString() : '—'}</span>,
    },
    ...(tab === 'released' ? [{
      key: 'releasedAt', label: 'Released', sortable: true,
      render: (c: any) => <span className="text-secondary-text text-xs">{c.releasedAt ? new Date(c.releasedAt).toLocaleDateString() : '—'}</span>,
    } as Column<any>] : []),
    {
      key: 'certificateNumber', label: 'Cert #',
      render: (c) => <span className="text-xs text-secondary-text font-mono">{c.certificateNumber}</span>,
    },
    {
      key: 'actions', label: '', className: 'w-32 text-right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); setViewCert(c); }}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 transition-all cursor-pointer" title="View">
            <Eye size={14} />
          </button>
          {tab === 'pending' && (
            <button onClick={(e) => { e.stopPropagation(); setReleaseId(c.id); }}
              className="h-7 px-2 rounded-lg flex items-center gap-1 text-secondary-text hover:text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer text-xs" title="Release">
              <Send size={12} /> Release
            </button>
          )}
          {tab === 'released' && (
            <button onClick={(e) => { e.stopPropagation(); setRevokeId(c.id); }}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-secondary-text hover:text-amber-400 hover:bg-amber-500/10 transition-all cursor-pointer" title="Revoke">
              <Trash2 size={14} />
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); setDeleteCertId(c.id); }}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-secondary-text hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer" title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const tplColumns: Column<any>[] = [
    {
      key: 'name', label: 'Name', sortable: true,
      render: (t) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-accent-indigo/20 to-accent-indigo/5 flex items-center justify-center shrink-0">
            <FileText size={16} className="text-accent-indigo-light" />
          </div>
          <div>
            <p className="text-white font-medium">{t.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {t.isDefault && (
                <span className="text-[10px] text-accent-indigo-light font-semibold">DEFAULT</span>
              )}
              <span className="text-[10px] text-secondary-text">{t.orientation || 'landscape'} · {t.width || 1200}×{t.height || 800}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'description', label: 'Description',
      render: (t) => <span className="text-secondary-text text-sm">{t.description || '—'}</span>,
    },
    {
      key: 'createdAt', label: 'Created', sortable: true,
      render: (t) => <span className="text-secondary-text text-xs">{new Date(t.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: 'actions', label: '', className: 'w-44 text-right',
      render: (t) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); handleOpenBuilder(t); }}
            className="h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-medium text-white bg-accent-indigo/15 hover:bg-accent-indigo/25 border border-accent-indigo/30 transition-all cursor-pointer">
            <Sparkles size={12} />
            Open Builder
          </button>
          <button onClick={(e) => { e.stopPropagation(); setDeleteTplId(t.id); }}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-secondary-text hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer" title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const tabs: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: 'pending', label: 'Pending', icon: Clock, count: tab === 'pending' ? filtered.length : undefined },
    { id: 'released', label: 'Released', icon: CheckCircle2 },
    { id: 'revoked', label: 'Revoked', icon: XCircle },
    { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-white">Certificates</h1>
          <p className="text-secondary-text text-sm mt-1">Manage certificates, releases, and templates</p>
        </div>
        <div className="flex items-center gap-3">
          {tab !== 'templates' && (
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search certificates..." />
          )}
          {tab === 'templates' && (
            <Button onClick={() => router.push('/admin/certificates/builder/new')} variant="primary" size="sm" className="rounded-xl cursor-pointer">
              <Plus size={16} /> New Template
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b border-border/50">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => { setTab(t.id); setPage(1); setSearch(''); }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all cursor-pointer ${
                tab === t.id ? 'border-accent-indigo text-accent-indigo-light' : 'border-transparent text-secondary-text hover:text-white'
              }`}>
              <Icon size={14} />
              {t.label}
              {t.count != null && t.count > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'templates' ? (
        <>
          <DataTable columns={tplColumns} data={templates} loading={loading}
            emptyIcon={<FileText size={32} className="text-secondary-text/30" />}
            emptyMessage="No templates yet. Click 'New Template' to create one." />
          <ConfirmDialog open={!!deleteTplId} title="Delete Template" message="Are you sure? Templates in use cannot be deleted."
            onConfirm={handleDeleteTemplate} onCancel={() => setDeleteTplId(null)} variant="danger" />
        </>
      ) : (
        <>
          <DataTable columns={certColumns} data={paged} loading={loading}
            emptyIcon={<Award size={32} className="text-secondary-text/30" />}
            emptyMessage={
              tab === 'pending' ? 'No pending certificates. Students finishing certificate-enabled courses will appear here.' :
              tab === 'released' ? 'No released certificates yet.' :
              'No revoked certificates.'
            } />
          <Pagination current={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />

          <ConfirmDialog open={!!releaseId} title="Release Certificate" message="The student will be able to view and download this certificate."
            confirmLabel="Release" variant="default" onConfirm={handleRelease} onCancel={() => setReleaseId(null)} />
          <ConfirmDialog open={!!revokeId} title="Revoke Certificate" message="The student will no longer be able to access this certificate."
            confirmLabel="Revoke" variant="warning" onConfirm={handleRevoke} onCancel={() => setRevokeId(null)} />
          <ConfirmDialog open={!!deleteCertId} title="Delete Certificate" message="This permanently deletes the certificate record. Are you sure?"
            confirmLabel="Delete" variant="danger" onConfirm={handleDeleteCert} onCancel={() => setDeleteCertId(null)} />

          <Modal open={!!viewCert} onClose={() => setViewCert(null)} title="Certificate Details" size="lg">
            {viewCert && <CertView cert={viewCert} />}
          </Modal>
        </>
      )}
    </div>
  );
}

function CertView({ cert }: { cert: any }) {
  const statusColor =
    cert.status === 'released' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
    cert.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
    'bg-red-500/10 text-red-400 border-red-500/20';
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-accent-indigo to-accent-indigo-light flex items-center justify-center">
          <Award size={28} className="text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">{cert.title}</h3>
          <p className="text-sm text-secondary-text">{cert.user?.firstName} {cert.user?.lastName} · {cert.course?.title}</p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColor} uppercase`}>{cert.status}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="p-3 rounded-xl bg-white/5 border border-border/30">
          <p className="text-xs text-secondary-text">Certificate Number</p>
          <p className="text-white font-mono mt-1">{cert.certificateNumber}</p>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-border/30">
          <p className="text-xs text-secondary-text">Verification URL</p>
          <a href={cert.verificationUrl} target="_blank" rel="noreferrer" className="text-accent-indigo-light hover:underline mt-1 break-all block">{cert.verificationUrl}</a>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-border/30">
          <p className="text-xs text-secondary-text">Issued</p>
          <p className="text-white mt-1">{new Date(cert.issuedAt).toLocaleString()}</p>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-border/30">
          <p className="text-xs text-secondary-text">{cert.status === 'released' ? 'Released' : cert.status === 'revoked' ? 'Revoked' : 'Pending'}</p>
          <p className="text-white mt-1">
            {cert.status === 'released' ? (cert.releasedAt ? new Date(cert.releasedAt).toLocaleString() : '—') :
             cert.status === 'revoked' ? (cert.revokedAt ? new Date(cert.revokedAt).toLocaleString() : '—') : 'Awaiting release'}
          </p>
        </div>
      </div>
    </div>
  );
}
