'use client';

import { useEffect, useRef, useState, useCallback, CSSProperties } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { adminApi as api } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CertificateBody, CertificateData, CertificateField } from '@sohaara/ui';
import {
  ArrowLeft, Save, Download, Loader2, Image as ImageIcon,
  Type, Trash2, Plus, Layers, ZoomIn, ZoomOut,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Settings2, X,
  Upload, Sparkles, Variable, ImagePlus, MousePointer2, Move,
  Maximize2, FileText, ChevronDown, Check, ImageOff, ChevronsUpDown, Scan,
  PanelLeftClose, PanelRightClose, PanelLeftOpen, PanelRightOpen,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignVerticalSpaceBetween, AlignHorizontalSpaceBetween,
  Crosshair,
} from 'lucide-react';

const BUILTIN_VARIABLES = [
  { key: 'recipientName', label: 'Recipient' },
  { key: 'courseName', label: 'Course' },
  { key: 'issueDate', label: 'Date' },
  { key: 'certificateNumber', label: 'Cert #' },
  { key: 'description', label: 'Description' },
  { key: 'signatureName', label: 'Signature' },
  { key: 'signatureTitle', label: 'Title' },
  { key: 'verifyUrl', label: 'Verify URL' },
];

const DEFAULT_W = 1200;
const DEFAULT_H = 800;

const SIZE_PRESETS = [
  { value: '1200x800', label: '1200 × 800' },
  { value: '1600x1100', label: '1600 × 1100' },
  { value: '1920x1080', label: '1920 × 1080' },
  { value: '800x1200', label: '800 × 1200 (P)' },
  { value: '1100x1600', label: '1100 × 1600 (P)' },
];

const newFieldId = () => Math.random().toString(36).slice(2, 10);
const clampPct = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, Math.round(n * 10) / 10));

const buildDefaults = (): CertificateData => ({
  backgroundImageUrl: null,
  width: DEFAULT_W,
  height: DEFAULT_H,
  orientation: 'landscape',
  fields: [],
});

// ─── Reusable UI primitives ────────────────────────────────────────

function SectionHeader({ icon: Icon, title, action, count }: { icon: any; title: string; action?: React.ReactNode; count?: number }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <div className="flex items-center gap-2">
        <span className="h-5 w-5 rounded-md bg-accent-indigo/15 flex items-center justify-center">
          <Icon size={11} className="text-accent-indigo-light" />
        </span>
        <h3 className="text-[10px] font-bold text-white uppercase tracking-[0.12em]">{title}</h3>
        {count !== undefined && (
          <span className="text-[10px] font-mono text-secondary-text/80 px-1.5 py-0.5 rounded bg-white/5">{count}</span>
        )}
      </div>
      {action}
    </div>
  );
}

function Field({ label, children, hint }: { label?: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-[10px] text-secondary-text/90 font-medium uppercase tracking-wider block">{label}</label>}
      {children}
      {hint && <p className="text-[10px] text-secondary-text/60 leading-relaxed">{hint}</p>}
    </div>
  );
}

function Input({ className = '', ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={`w-full h-8 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-xs text-white placeholder:text-secondary-text/50 outline-none transition-all hover:border-white/20 focus:border-accent-indigo/60 focus:bg-white/[0.06] ${className}`}
    />
  );
}

function Textarea({ className = '', ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      className={`w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-xs text-white placeholder:text-secondary-text/50 outline-none transition-all hover:border-white/20 focus:border-accent-indigo/60 focus:bg-white/[0.06] resize-none ${className}`}
    />
  );
}

function Select({ className = '', children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...rest}
        className={`w-full h-8 rounded-lg border border-white/10 bg-white/[0.04] pl-2.5 pr-7 text-xs text-white outline-none transition-all hover:border-white/20 focus:border-accent-indigo/60 focus:bg-white/[0.06] appearance-none cursor-pointer ${className}`}
      >
        {children}
      </select>
      <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary-text pointer-events-none" />
    </div>
  );
}

function IconButton({ icon: Icon, onClick, active, title, danger, className = '' }: { icon: any; onClick: () => void; active?: boolean; title?: string; danger?: boolean; className?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`h-7 w-7 rounded-md flex items-center justify-center transition-all cursor-pointer ${
        active
          ? 'bg-accent-indigo/20 text-accent-indigo-light border border-accent-indigo/40'
          : danger
            ? 'text-red-400/80 hover:text-red-300 hover:bg-red-500/10 border border-transparent'
            : 'text-secondary-text hover:text-white hover:bg-white/8 border border-transparent'
      } ${className}`}
    >
      <Icon size={12} />
    </button>
  );
}

function Segmented<T extends string>({ options, value, onChange, icons }: { options: T[]; value: T; onChange: (v: T) => void; icons?: Partial<Record<T, any>> }) {
  return (
    <div className="flex gap-0.5 p-0.5 rounded-lg border border-white/10 bg-white/[0.03]">
      {options.map((o) => {
        const Icon = icons?.[o];
        return (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`flex-1 h-7 rounded-md text-[10px] font-semibold capitalize flex items-center justify-center gap-1.5 transition-all ${
              value === o
                ? 'bg-gradient-to-b from-accent-indigo/25 to-accent-indigo/10 text-white shadow-[0_1px_0_rgba(255,255,255,0.05)]'
                : 'text-secondary-text hover:text-white hover:bg-white/5'
            }`}
          >
            {Icon && <Icon size={11} />}
            <span>{o}</span>
          </button>
        );
      })}
    </div>
  );
}

function NumField({ label, value, onChange, step = 1, min, max, suffix }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] text-secondary-text/90 font-medium uppercase tracking-wider">{label}</label>
        {suffix && <span className="text-[9px] text-secondary-text/60 font-mono">{suffix}</span>}
      </div>
      <input
        type="number"
        value={Math.round(value * 10) / 10}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-7 rounded-md border border-white/10 bg-white/[0.04] px-2 text-[11px] text-white font-mono outline-none transition-all hover:border-white/20 focus:border-accent-indigo/60 focus:bg-white/[0.06]"
      />
    </div>
  );
}

function ColorSwatch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 h-8 rounded-lg border border-white/10 bg-white/[0.04] px-2 hover:border-white/20 transition-all">
      <div className="relative h-5 w-5 rounded-md border border-white/20 overflow-hidden shrink-0">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-[150%] h-[150%] -translate-x-[15%] -translate-y-[15%] cursor-pointer border-0 p-0"
        />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent text-[11px] text-white font-mono uppercase outline-none min-w-0"
        maxLength={9}
      />
    </div>
  );
}

type DragMode = 'move' | 'resize-br' | 'resize-tl' | null;

const CanvasFieldOverlay = ({
  field,
  selected,
  zoom,
  canvasWidth,
  canvasHeight,
  onSelect,
  onUpdate,
}: {
  field: CertificateField;
  selected: boolean;
  zoom: number;
  canvasWidth: number;
  canvasHeight: number;
  onSelect: () => void;
  onUpdate: (patch: Partial<CertificateField>) => void;
}) => {
  const dragRef = useRef<{ mode: DragMode; startX: number; startY: number; start: CertificateField }>({
    mode: null,
    startX: 0,
    startY: 0,
    start: field,
  });

  const begin = (mode: DragMode, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, start: { ...field } };
    const onMove = (ev: MouseEvent) => {
      const { mode, startX, startY, start } = dragRef.current;
      if (!mode) return;
      const pxDx = (ev.clientX - startX) / zoom;
      const pxDy = (ev.clientY - startY) / zoom;
      const dx = canvasWidth > 0 ? (pxDx / canvasWidth) * 100 : 0;
      const dy = canvasHeight > 0 ? (pxDy / canvasHeight) * 100 : 0;
      if (mode === 'move') {
        onUpdate({ x: clampPct(start.x + dx), y: clampPct(start.y + dy) });
      } else if (mode === 'resize-br') {
        onUpdate({
          width: clampPct(start.width + dx, 2),
          height: clampPct(start.height + dy, 2),
        });
      } else if (mode === 'resize-tl') {
        const nx = clampPct(start.x + dx);
        const ny = clampPct(start.y + dy);
        const nw = clampPct(start.width - dx, 2);
        const nh = clampPct(start.height - dy, 2);
        onUpdate({ x: nx, y: ny, width: nw, height: nh });
      }
    };
    const onUp = () => {
      dragRef.current.mode = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const isLogo = field.type === 'logo';

  return (
    <div
      onMouseDown={(e) => begin('move', e)}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      className={`absolute group transition-shadow ${
        selected
          ? 'ring-2 ring-accent-indigo shadow-[0_0_0_4px_rgba(99,102,241,0.15)]'
          : 'ring-1 ring-white/40 hover:ring-accent-indigo/70'
      } ${isLogo ? '' : 'cursor-move'}`}
      style={{
        left: `${field.x}%`,
        top: `${field.y}%`,
        width: `${field.width}%`,
        height: `${field.height}%`,
        zIndex: field.zIndex ?? 1,
        transform: field.rotation ? `rotate(${field.rotation}deg)` : undefined,
        transformOrigin: 'center',
      }}
    >
      {selected && (
        <>
          <div
            onMouseDown={(e) => begin('resize-tl', e)}
            className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-accent-indigo rounded-sm cursor-nwse-resize z-10 shadow-md hover:scale-110 transition-transform"
          />
          <div
            onMouseDown={(e) => begin('resize-br', e)}
            className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-accent-indigo rounded-sm cursor-nwse-resize z-10 shadow-md hover:scale-110 transition-transform"
          />
        </>
      )}
    </div>
  );
};

export default function CertificateBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const previewRef = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<CertificateData>(buildDefaults());
  const [name, setName] = useState('My Certificate Template');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logos, setLogos] = useState<any[]>([]);
  const [logoModal, setLogoModal] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoName, setLogoName] = useState('');
  const [insertVar, setInsertVar] = useState(false);
  const [confirmDeleteBg, setConfirmDeleteBg] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [dirty, setDirty] = useState(false);
  const [toolbarExpanded, setToolbarExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'template' | 'add' | 'body' | 'align' | 'style' | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  useEffect(() => {
    const id = (params.id as string) || null;
    setTemplateId(id);
    if (!id) { setLoading(false); return; }
    setLoading(true);
    api.get<any>(`/certificate-templates/${id}`)
      .then((tpl: any) => {
        setName(tpl.name || '');
        setDescription(tpl.description || '');
        let parsedFields: CertificateField[] = [];
        try {
          const parsed = tpl.content ? JSON.parse(tpl.content) : { fields: [] };
          parsedFields = Array.isArray(parsed.fields) ? parsed.fields : [];
        } catch { parsedFields = []; }
        setData({
          backgroundImageUrl: tpl.backgroundImageUrl || null,
          width: tpl.width || DEFAULT_W,
          height: tpl.height || DEFAULT_H,
          orientation: tpl.orientation || 'landscape',
          fields: parsedFields,
        });
      })
      .catch(() => toast('error', 'Failed to load template'))
      .finally(() => setLoading(false));
  }, [params.id, toast]);

  const fetchLogos = useCallback(() => {
    api.get<any>('/certificate-logos')
      .then((res) => setLogos(Array.isArray(res) ? res : res?.data || []))
      .catch(() => setLogos([]));
  }, []);

  useEffect(() => { fetchLogos(); }, [fetchLogos]);

  useEffect(() => {
    if (!loading) setDirty(true);
  }, [data, name, description, loading]);

  const update = (patch: Partial<CertificateData>) => setData((d) => ({ ...d, ...patch }));
  const updateField = useCallback((id: string, patch: Partial<CertificateField>) => {
    setData((d) => ({ ...d, fields: d.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) }));
  }, []);

  const selected = data.fields.find((f) => f.id === selectedId) || null;

  const addTextField = (preset?: string) => {
    const id = newFieldId();
    const newField: CertificateField = {
      id,
      type: 'text',
      x: 30, y: 45, width: 40, height: 8,
      value: preset || 'New Text',
      fontSize: 4,
      fontFamily: 'Georgia, "Times New Roman", serif',
      color: '#1f2937',
      fontWeight: '600',
      textAlign: 'center',
      zIndex: data.fields.length + 1,
    };
    setData((d) => ({ ...d, fields: [...d.fields, newField] }));
    setSelectedId(id);
  };

  const addLogoField = (logo: any) => {
    const id = newFieldId();
    const newField: CertificateField = {
      id, type: 'logo',
      x: 42, y: 12, width: 16, height: 14,
      logoId: logo.id, imageUrl: logo.url,
      zIndex: data.fields.length + 1,
    };
    setData((d) => ({ ...d, fields: [...d.fields, newField] }));
    setSelectedId(id);
    setLogoModal(false);
  };

  const deleteField = (id: string) => {
    setData((d) => ({ ...d, fields: d.fields.filter((f) => f.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  };

  const moveField = (id: string, dir: 'up' | 'down') => {
    setData((d) => {
      const fields = [...d.fields];
      const idx = fields.findIndex((f) => f.id === id);
      if (idx < 0) return d;
      const f = fields[idx];
      if (!f) return d;
      fields.splice(idx, 1);
      const newIdx = dir === 'up' ? Math.min(fields.length, idx + 1) : Math.max(0, idx - 1);
      fields.splice(newIdx, 0, f);
      return { ...d, fields: fields.map((f2, i) => ({ ...f2, zIndex: fields.length - i })) };
    });
  };

  const handleSave = async () => {
    if (!name.trim()) { toast('error', 'Template name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        content: JSON.stringify({ fields: data.fields }),
        orientation: data.orientation,
        width: data.orientation === 'landscape' ? data.width : data.height,
        height: data.orientation === 'landscape' ? data.height : data.width,
      };
      if (templateId) {
        await api.put(`/certificate-templates/${templateId}`, payload);
        toast('success', 'Template saved');
      } else {
        const res: any = await api.post('/certificate-templates', payload);
        toast('success', 'Template created');
        if (res?.id) {
          setTemplateId(res.id);
          setDirty(false);
          router.replace(`/admin/certificates/builder/${res.id}`);
          return;
        }
      }
      setDirty(false);
    } catch (err: any) {
      toast('error', err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const bgInputRef = useRef<HTMLInputElement>(null);
  const handleImagePick = () => bgInputRef.current?.click();
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!templateId) {
      toast('warning', 'Save the template first to upload a background image');
      return;
    }
    setUploadingImage(true);
    try {
      const updated: any = await api.upload(`/certificate-templates/${templateId}/image`, file);
      setData((d) => ({ ...d, backgroundImageUrl: updated.backgroundImageUrl }));
      toast('success', 'Background image uploaded');
    } catch (err: any) {
      toast('error', err.message || 'Upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!templateId) {
      update({ backgroundImageUrl: null });
      setConfirmDeleteBg(false);
      return;
    }
    try {
      await api.delete(`/certificate-templates/${templateId}/image`);
      setData((d) => ({ ...d, backgroundImageUrl: null }));
      toast('success', 'Background image removed');
    } catch (err: any) {
      toast('error', err.message || 'Failed to remove image');
    } finally {
      setConfirmDeleteBg(false);
    }
  };

  const logoInputRef = useRef<HTMLInputElement>(null);
  const handleLogoPick = () => logoInputRef.current?.click();
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingLogo(true);
    try {
      const created: any = await api.upload('/certificate-logos', file, { name: logoName || file.name });
      setLogos((l) => [created, ...l]);
      setLogoName('');
      addLogoField(created);
      toast('success', 'Logo uploaded');
    } catch (err: any) {
      toast('error', err.message || 'Logo upload failed');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDeleteLogo = async (id: string) => {
    try {
      await api.delete(`/certificate-logos/${id}`);
      setLogos((l) => l.filter((x) => x.id !== id));
      toast('success', 'Logo deleted');
    } catch (err: any) {
      toast('error', err.message || 'Failed to delete logo');
    } finally {
      setConfirmDeleteBg(false);
    }
  };

  const handleDownload = async () => {
    if (!previewRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(previewRef.current, {
        scale: 2, useCORS: true, backgroundColor: null, logging: false,
        windowWidth: data.orientation === 'landscape' ? data.width : data.height,
        windowHeight: data.orientation === 'landscape' ? data.height : data.width,
      });
      const imgData = canvas.toDataURL('image/png');
      const isLandscape = data.orientation === 'landscape';
      const pdf = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait', unit: 'px', format: [data.width, data.height] });
      pdf.addImage(imgData, 'PNG', 0, 0, data.width, data.height);
      pdf.save(`${name || 'certificate'}-preview.pdf`);
      toast('success', 'PDF downloaded');
    } catch (err: any) {
      toast('error', 'Failed to generate PDF: ' + (err.message || 'unknown error'));
    } finally {
      setDownloading(false);
    }
  };

  const insertVariable = (varKey: string) => {
    if (!selected) { addTextField(`{{${varKey}}}`); return; }
    const newValue = `${selected.value || ''}{{${varKey}}}`.trim();
    updateField(selected.id, { value: newValue });
  };

  // ─── Alignment helpers ────────────────────────────────────────
  const alignSelected = (axis: 'h-left' | 'h-center' | 'h-right' | 'v-top' | 'v-middle' | 'v-bottom') => {
    if (!selected) return;
    const patch: Partial<CertificateField> = {};
    if (axis === 'h-left') patch.x = 0;
    else if (axis === 'h-center') patch.x = clampPct((100 - selected.width) / 2);
    else if (axis === 'h-right') patch.x = clampPct(100 - selected.width);
    else if (axis === 'v-top') patch.y = 0;
    else if (axis === 'v-middle') patch.y = clampPct((100 - selected.height) / 2);
    else if (axis === 'v-bottom') patch.y = clampPct(100 - selected.height);
    updateField(selected.id, patch);
  };

  const centerOnCanvas = () => {
    if (!selected) return;
    updateField(selected.id, {
      x: clampPct((100 - selected.width) / 2),
      y: clampPct((100 - selected.height) / 2),
    });
  };

  const distributeSelected = (axis: 'h' | 'v') => {
    const fields = data.fields;
    if (fields.length < 3) {
      toast('warning', 'Need at least 3 elements to distribute');
      return;
    }
    const sorted = [...fields].sort((a, b) => (axis === 'h' ? a.x - b.x : a.y - b.y));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (!first || !last) return;
    const start = axis === 'h' ? first.x : first.y;
    const end = axis === 'h' ? last.x : last.y;
    const step = (end - start) / (sorted.length - 1);
    const updates: Record<string, Partial<CertificateField>> = {};
    sorted.forEach((f, i) => {
      const pos = start + step * i;
      if (axis === 'h') updates[f.id] = { x: clampPct(pos) };
      else updates[f.id] = { y: clampPct(pos) };
    });
    setData((d) => ({ ...d, fields: d.fields.map((f) => updates[f.id] ? { ...f, ...updates[f.id] } : f) }));
  };

  const handleFit = useCallback(() => {
    if (!canvasWrapRef.current) return;
    const rect = canvasWrapRef.current.getBoundingClientRect();
    const padding = 32;
    const availW = Math.max(rect.width - padding, 100);
    const availH = Math.max(rect.height - padding - 40, 100);
    const zoomW = availW / data.width;
    const zoomH = availH / data.height;
    setZoom(Math.max(0.1, Math.min(zoomW, zoomH, 2)));
  }, [data.width, data.height]);

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(handleFit, 150);
    return () => clearTimeout(t);
  }, [loading, data.width, data.height, handleFit]);

  // Delete/Backspace key to remove selected element
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedId) return;
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (target.isContentEditable || target.closest('[contenteditable="true"]')) return;
      }
      e.preventDefault();
      deleteField(selectedId);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, deleteField]);

  // Reset align category when selection is cleared
  useEffect(() => {
    if (!selected && activeCategory === 'align') setActiveCategory(null);
  }, [selected, activeCategory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-accent-indigo" size={32} />
      </div>
    );
  }

  const hasBg = !!data.backgroundImageUrl;
  const sizeKey = `${data.width}x${data.height}`;

  return (
    <div className="flex flex-col h-[calc(100vh-72px)] -m-2 animate-fade-in-up">
      {/* Hidden file inputs */}
      <input ref={bgInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleImageChange} />
      <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={handleLogoChange} />

      {/* ═══════════════ SINGLE CATEGORIZED TOOLBAR (Figma-style) ═══════════════ */}
      <div className="shrink-0 border-b border-white/10 bg-white/[0.02]">
        {/* Main bar - 36px, always visible */}
        <div className="flex items-center gap-0.5 h-9 px-2">
          {/* Back */}
          <button
            onClick={() => router.push('/admin/certificates')}
            className="h-7 w-7 rounded-md flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 transition-colors cursor-pointer shrink-0"
            title="Back"
          >
            <ArrowLeft size={13} />
          </button>
          <div className="h-4 w-px bg-white/10 mx-1" />

          {/* Title */}
          <div className="flex items-center gap-1 min-w-0 max-w-[200px]">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Untitled"
              className="bg-transparent text-[12px] font-semibold text-white outline-none placeholder:text-secondary-text/50 min-w-0 w-full"
            />
            {dirty && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />}
          </div>

          <div className="h-4 w-px bg-white/10 mx-1" />

          {/* Category buttons - nested groups */}
          {([
            { id: 'template' as const, icon: FileText, label: 'Template' },
            { id: 'add' as const, icon: Plus, label: 'Add' },
            { id: 'body' as const, icon: ImageIcon, label: 'Body' },
            ...(selected ? [{ id: 'align' as const, icon: Crosshair, label: 'Align' }] : []),
          ]).map((cat) => {
            const Icon = cat.icon;
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(active ? null : cat.id)}
                className={`h-7 px-2 rounded-md flex items-center gap-1.5 text-[11px] font-medium transition-all cursor-pointer ${
                  active
                    ? 'bg-accent-indigo/20 text-accent-indigo-light border border-accent-indigo/40'
                    : 'text-secondary-text hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon size={11} />
                {cat.label}
                <ChevronDown size={9} className={`transition-transform ${active ? 'rotate-180' : ''}`} />
              </button>
            );
          })}

          <div className="flex-1" />

          {/* Zoom group - always visible */}
          <div className="flex items-center gap-0.5 rounded border border-white/10 bg-white/[0.03] p-0.5 shrink-0">
            <button
              onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))}
              className="h-5 w-5 rounded flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut size={10} />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="h-5 px-1 rounded text-[9px] font-mono text-secondary-text hover:text-white hover:bg-white/5 transition-colors cursor-pointer min-w-[2.25rem]"
              title="Actual size (100%)"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
              className="h-5 w-5 rounded flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn size={10} />
            </button>
            <div className="w-px h-2.5 bg-white/10" />
            <button
              onClick={handleFit}
              className="h-5 px-1 rounded flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Fit to screen"
            >
              <Maximize2 size={10} />
            </button>
          </div>

          <div className="h-4 w-px bg-white/10 mx-1" />

          <button
            onClick={handleSave}
            disabled={saving}
            className="h-7 px-3 rounded-md bg-gradient-to-b from-accent-indigo to-accent-indigo-light text-white text-[11px] font-semibold hover:brightness-110 active:brightness-95 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-[0_2px_6px_rgba(99,102,241,0.3)] shrink-0"
          >
            {saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
            {templateId ? 'Save' : 'Save'}
          </button>
        </div>

        {/* Expandable category panel */}
        {activeCategory && (
          <div className="border-t border-white/10 bg-white/[0.01] p-2 animate-fade-in">
            {activeCategory === 'template' && (
              <div className="flex items-center gap-2 max-w-3xl">
                <span className="text-[10px] font-semibold text-white/70 uppercase tracking-wider shrink-0">Description</span>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Template description…"
                  className="flex-1 h-7 rounded border border-white/10 bg-white/[0.04] px-2 text-[11px] text-white placeholder:text-secondary-text/50 outline-none focus:border-accent-indigo/60 transition-all"
                />
              </div>
            )}
            {activeCategory === 'add' && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => addTextField('Text')}
                  className="h-7 px-2.5 rounded border border-white/10 bg-white/[0.04] hover:border-accent-indigo/40 hover:bg-accent-indigo/5 text-[10px] text-white flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Type size={10} className="text-accent-indigo-light" /> Text
                </button>
                <button
                  onClick={() => setLogoModal(true)}
                  className="h-7 px-2.5 rounded border border-white/10 bg-white/[0.04] hover:border-accent-indigo/40 hover:bg-accent-indigo/5 text-[10px] text-white flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <ImagePlus size={10} className="text-accent-indigo-light" /> Logo
                </button>
                <div className="h-4 w-px bg-white/10 mx-1" />
                {BUILTIN_VARIABLES.map((v) => (
                  <button
                    key={v.key}
                    onClick={() => addTextField(`{{${v.key}}}`)}
                    className="h-6 px-1.5 rounded text-[9px] border border-white/10 bg-white/[0.03] hover:border-accent-indigo/40 hover:bg-accent-indigo/10 text-accent-indigo-light font-mono cursor-pointer transition-all"
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            )}
            {activeCategory === 'body' && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-0.5 p-0.5 rounded border border-white/10 bg-white/[0.03]">
                  {(['landscape', 'portrait'] as const).map((o) => (
                    <button
                      key={o}
                      onClick={() => update({ orientation: o })}
                      className={`h-6 px-2 rounded text-[10px] font-medium capitalize cursor-pointer transition-all ${
                        data.orientation === o
                          ? 'bg-accent-indigo/25 text-white'
                          : 'text-secondary-text hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
                <select
                  value={sizeKey}
                  onChange={(e) => {
                    const [w, h] = e.target.value.split('x').map(Number);
                    update({ width: w, height: h });
                  }}
                  className="h-7 px-2 rounded text-[10px] bg-white/[0.04] text-white border border-white/10 cursor-pointer outline-none"
                >
                  {SIZE_PRESETS.map((s) => (
                    <option key={s.value} value={s.value} className="bg-slate-900">{s.label}</option>
                  ))}
                </select>
                <div className="h-4 w-px bg-white/10 mx-1" />
                {hasBg ? (
                  <>
                    <span className="text-[10px] text-accent-indigo-light flex items-center gap-1.5 px-2">
                      <ImageIcon size={10} /> Background set
                    </span>
                    <button
                      onClick={handleImagePick}
                      className="h-7 px-2.5 rounded text-[10px] border border-white/10 bg-white/[0.04] text-white hover:border-white/20 cursor-pointer transition-all"
                    >
                      Replace
                    </button>
                    <button
                      onClick={() => setConfirmDeleteBg(true)}
                      className="h-7 w-7 rounded text-red-400/80 hover:text-red-300 hover:bg-red-500/10 cursor-pointer transition-all flex items-center justify-center"
                      title="Remove background"
                    >
                      <X size={10} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleImagePick}
                    className="h-7 px-3 rounded text-[10px] border border-dashed border-white/10 bg-white/[0.02] text-secondary-text hover:text-white hover:border-accent-indigo/40 cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <Upload size={10} /> Upload background
                  </button>
                )}
              </div>
            )}
            {activeCategory === 'align' && selected && (
              <div className="flex items-center gap-3 flex-wrap">
                {/* Horizontal alignment group */}
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-semibold text-secondary-text/70 uppercase tracking-wider mr-1">H</span>
                  <div className="flex items-center gap-0.5 p-0.5 rounded border border-white/10 bg-white/[0.03]">
                    <button
                      onClick={() => alignSelected('h-left')}
                      className="h-6 w-6 rounded flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 cursor-pointer transition-all"
                      title="Align left"
                    >
                      <AlignStartHorizontal size={11} />
                    </button>
                    <button
                      onClick={() => alignSelected('h-center')}
                      className="h-6 w-6 rounded flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 cursor-pointer transition-all"
                      title="Center horizontal"
                    >
                      <AlignCenterHorizontal size={11} />
                    </button>
                    <button
                      onClick={() => alignSelected('h-right')}
                      className="h-6 w-6 rounded flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 cursor-pointer transition-all"
                      title="Align right"
                    >
                      <AlignEndHorizontal size={11} />
                    </button>
                  </div>
                </div>

                <div className="h-4 w-px bg-white/10" />

                {/* Vertical alignment group */}
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-semibold text-secondary-text/70 uppercase tracking-wider mr-1">V</span>
                  <div className="flex items-center gap-0.5 p-0.5 rounded border border-white/10 bg-white/[0.03]">
                    <button
                      onClick={() => alignSelected('v-top')}
                      className="h-6 w-6 rounded flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 cursor-pointer transition-all"
                      title="Align top"
                    >
                      <AlignStartVertical size={11} />
                    </button>
                    <button
                      onClick={() => alignSelected('v-middle')}
                      className="h-6 w-6 rounded flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 cursor-pointer transition-all"
                      title="Center vertical"
                    >
                      <AlignCenterVertical size={11} />
                    </button>
                    <button
                      onClick={() => alignSelected('v-bottom')}
                      className="h-6 w-6 rounded flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 cursor-pointer transition-all"
                      title="Align bottom"
                    >
                      <AlignEndVertical size={11} />
                    </button>
                  </div>
                </div>

                <div className="h-4 w-px bg-white/10" />

                {/* Center on canvas */}
                <button
                  onClick={centerOnCanvas}
                  className="h-7 px-2.5 rounded border border-white/10 bg-white/[0.04] hover:border-accent-indigo/40 hover:bg-accent-indigo/5 text-[10px] text-white flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Center on canvas (H+V)"
                >
                  <Crosshair size={10} className="text-accent-indigo-light" /> Center
                </button>

                <div className="h-4 w-px bg-white/10" />

                {/* Distribute group */}
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-semibold text-secondary-text/70 uppercase tracking-wider mr-1">Distribute</span>
                  <button
                    onClick={() => distributeSelected('h')}
                    disabled={data.fields.length < 3}
                    className="h-6 w-6 rounded flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 bg-white/[0.03]"
                    title="Distribute horizontally (needs 3+ elements)"
                  >
                    <AlignHorizontalSpaceBetween size={11} />
                  </button>
                  <button
                    onClick={() => distributeSelected('v')}
                    disabled={data.fields.length < 3}
                    className="h-6 w-6 rounded flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 bg-white/[0.03]"
                    title="Distribute vertically (needs 3+ elements)"
                  >
                    <AlignVerticalSpaceBetween size={11} />
                  </button>
                </div>

                <div className="flex-1" />

                <span className="text-[9px] text-secondary-text/60 font-mono">
                  {Math.round(selected.x)}%, {Math.round(selected.y)}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════ 3-PANEL GRID (collapsible rails, canvas takes max space) ═══════════════ */}
      <div className={`grid flex-1 min-h-0 ${
        leftCollapsed && rightCollapsed ? 'grid-cols-[40px_1fr_40px]' :
        leftCollapsed ? 'grid-cols-[40px_1fr_220px]' :
        rightCollapsed ? 'grid-cols-[180px_1fr_40px]' :
        'grid-cols-[180px_1fr_220px]'
      }`}>

        {/* ───────────── LEFT: LAYERS (180px / 40px collapsed) ───────────── */}
        {leftCollapsed ? (
          <div className="border-r border-white/10 bg-white/[0.015] flex flex-col items-center py-2 gap-2">
            <button
              onClick={() => setLeftCollapsed(false)}
              className="h-7 w-7 rounded-md flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
              title="Expand layers"
            >
              <PanelLeftOpen size={12} className="text-accent-indigo-light" />
            </button>
            <div className="h-px w-4 bg-white/10" />
            <Layers size={11} className="text-accent-indigo-light" />
            <span className="text-[9px] font-mono text-secondary-text/80">{data.fields.length}</span>
          </div>
        ) : (
          <div className="border-r border-white/10 bg-white/[0.015] overflow-y-auto p-2">
            <div className="flex items-center gap-1.5 mb-2">
              <Layers size={10} className="text-accent-indigo-light" />
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Layers</span>
              <span className="text-[9px] font-mono text-secondary-text/80 px-1 py-0.5 rounded bg-white/5">{data.fields.length}</span>
              <button
                onClick={() => setLeftCollapsed(true)}
                className="ml-auto h-5 w-5 rounded flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
                title="Collapse"
              >
                <PanelLeftClose size={10} />
              </button>
            </div>
            {data.fields.length === 0 ? (
              <p className="text-[9px] text-secondary-text/60 text-center py-2">No elements</p>
            ) : (
              <div className="space-y-0.5">
                {[...data.fields].reverse().map((f, i, arr) => (
                  <div
                    key={f.id}
                    onClick={() => setSelectedId(f.id)}
                    className={`group flex items-center gap-1 px-1 py-0.5 rounded cursor-pointer transition-all ${
                      selectedId === f.id
                        ? 'bg-accent-indigo/15 border border-accent-indigo/30'
                        : 'border border-transparent hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="h-4 w-4 rounded bg-white/5 flex items-center justify-center shrink-0">
                      {f.type === 'logo'
                        ? <ImageIcon size={8} className="text-accent-indigo-light" />
                        : <Type size={8} className="text-accent-indigo-light" />}
                    </div>
                    <p className="text-[10px] text-white flex-1 truncate">
                      {f.type === 'logo' ? 'Logo' : (f.value || 'Text').slice(0, 14)}
                    </p>
                    <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => { e.stopPropagation(); moveField(f.id, 'up'); }}
                        className="h-4 w-4 text-[8px] text-secondary-text hover:text-white"
                      >↑</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveField(f.id, 'down'); }}
                        className="h-4 w-4 text-[8px] text-secondary-text hover:text-white"
                      >↓</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteField(f.id); }}
                        className="h-4 w-4 text-red-400/80 hover:text-red-300 flex items-center justify-center"
                      >
                        <X size={8} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ───────────── CENTER: CANVAS (large) ───────────── */}
        <div
          ref={canvasWrapRef}
          className="bg-gradient-to-br from-slate-900/40 via-slate-900/30 to-slate-800/40 relative min-h-0 min-w-0"
          onClick={() => setSelectedId(null)}
        >
          {/* Grid backdrop */}
          <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }} />

          {/* Canvas - scrollable, full available space, NO floating toolbar */}
          <div className="absolute inset-0 p-2 overflow-auto flex items-center justify-center">
            <div
              style={{ width: `${data.width * zoom}px`, height: `${data.height * zoom}px`, position: 'relative', flexShrink: 0 }}
              className="shadow-[0_20px_60px_-12px_rgba(0,0,0,0.6)] ring-1 ring-white/10"
            >
              <CertificateBody
                ref={previewRef}
                data={data}
                previewing
                style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
              />
              {data.fields.map((f) => (
                <CanvasFieldOverlay
                  key={f.id}
                  field={f}
                  selected={selectedId === f.id}
                  zoom={zoom}
                  canvasWidth={data.width}
                  canvasHeight={data.height}
                  onSelect={() => setSelectedId(f.id)}
                  onUpdate={(patch) => updateField(f.id, patch)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ───────────── RIGHT: INSPECTOR (220px / 40px collapsed) ───────────── */}
        {rightCollapsed ? (
          <div className="border-l border-white/10 bg-white/[0.015] flex flex-col items-center py-2 gap-2">
            <button
              onClick={() => setRightCollapsed(false)}
              className="h-7 w-7 rounded-md flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
              title="Expand inspector"
            >
              <PanelRightOpen size={12} className="text-accent-indigo-light" />
            </button>
            <div className="h-px w-4 bg-white/10" />
            <Settings2 size={11} className="text-accent-indigo-light" />
            {selected && <span className="h-1.5 w-1.5 rounded-full bg-accent-indigo-light" title="Element selected" />}
          </div>
        ) : (
          <div className="border-l border-white/10 bg-white/[0.015] overflow-y-auto flex flex-col">
          {selected ? (
            <div className="flex-1 overflow-y-auto">
              {/* Inspector header - tight, single row */}
              <div className="flex items-center justify-between gap-1.5 px-2 py-1.5 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <div className="h-5 w-5 rounded bg-accent-indigo/15 flex items-center justify-center shrink-0">
                    {selected.type === 'logo'
                      ? <ImageIcon size={10} className="text-accent-indigo-light" />
                      : <Type size={10} className="text-accent-indigo-light" />}
                  </div>
                  <p className="text-[10px] font-semibold text-white truncate">
                    {selected.type === 'logo' ? 'Logo' : (selected.value || 'Text').slice(0, 18)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setRightCollapsed(true)}
                    className="h-5 w-5 rounded flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    title="Collapse"
                  >
                    <PanelRightClose size={10} />
                  </button>
                  <button
                    onClick={() => deleteField(selected.id)}
                    className="h-5 w-5 rounded flex items-center justify-center text-red-400/80 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>

              <div className="p-2 space-y-2.5">
                {/* Content (text only) */}
                {selected.type === 'text' && (
                  <section>
                    <div className="flex items-center gap-1 mb-1">
                      <Type size={9} className="text-accent-indigo-light" />
                      <span className="text-[9px] font-bold text-white uppercase tracking-[0.12em]">Text</span>
                    </div>
                    <textarea
                      value={selected.value || ''}
                      onChange={(e) => updateField(selected.id, { value: e.target.value })}
                      rows={2}
                      placeholder="Type text, or {{variable}}"
                      className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[11px] text-white placeholder:text-secondary-text/50 outline-none hover:border-white/20 focus:border-accent-indigo/60 focus:bg-white/[0.06] transition-all resize-none"
                    />
                    <div className="flex flex-wrap gap-0.5 mt-1">
                      {BUILTIN_VARIABLES.slice(0, 4).map((v) => (
                        <button
                          key={v.key}
                          onClick={() => insertVariable(v.key)}
                          className="h-5 px-1.5 rounded text-[9px] font-mono border border-white/10 bg-white/[0.03] hover:border-accent-indigo/40 hover:bg-accent-indigo/10 text-accent-indigo-light transition-all cursor-pointer"
                          title={v.label}
                        >
                          {v.key.slice(0, 8)}
                        </button>
                      ))}
                      <button
                        onClick={() => setInsertVar((v) => !v)}
                        className="h-5 px-1.5 rounded text-[9px] font-semibold border border-accent-indigo/30 bg-accent-indigo/10 text-accent-indigo-light hover:bg-accent-indigo/20 transition-all cursor-pointer"
                      >
                        {insertVar ? '−' : `+${BUILTIN_VARIABLES.length - 4}`}
                      </button>
                    </div>
                    {insertVar && (
                      <div className="grid grid-cols-2 gap-0.5 mt-1">
                        {BUILTIN_VARIABLES.slice(4).map((v) => (
                          <button
                            key={v.key}
                            onClick={() => { insertVariable(v.key); setInsertVar(false); }}
                            className="h-5 px-1.5 rounded text-[9px] font-mono border border-white/10 bg-white/[0.03] hover:border-accent-indigo/40 hover:bg-accent-indigo/10 text-accent-indigo-light transition-all cursor-pointer text-left"
                          >
                            {v.key}
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* Logo info */}
                {selected.type === 'logo' && (
                  <section>
                    <div className="flex items-center gap-1 mb-1">
                      <ImageIcon size={9} className="text-accent-indigo-light" />
                      <span className="text-[9px] font-bold text-white uppercase tracking-[0.12em]">Logo</span>
                    </div>
                    <div className="aspect-video rounded-md border border-white/10 bg-white/[0.03] flex items-center justify-center overflow-hidden p-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selected.imageUrl || ''} alt="logo" className="max-w-full max-h-full object-contain" />
                    </div>
                  </section>
                )}

                {/* Typography (text only) */}
                {selected.type === 'text' && (
                  <section>
                    <div className="flex items-center gap-1 mb-1">
                      <Sparkles size={9} className="text-accent-indigo-light" />
                      <span className="text-[9px] font-bold text-white uppercase tracking-[0.12em]">Style</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <label className="text-[8px] text-secondary-text/70 uppercase tracking-wider block">Size</label>
                        <input
                          type="number"
                          value={Math.round((selected.fontSize ?? 4) * 10) / 10}
                          step={0.5}
                          onChange={(e) => updateField(selected.id, { fontSize: Number(e.target.value) })}
                          className="w-full h-6 rounded-md border border-white/10 bg-white/[0.04] px-1.5 text-[10px] text-white font-mono outline-none focus:border-accent-indigo/60 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[8px] text-secondary-text/70 uppercase tracking-wider block mb-0.5">Color</label>
                        <div className="h-6 rounded-md border border-white/10 bg-white/[0.04] px-1 flex items-center gap-1">
                          <div className="relative h-4 w-4 rounded border border-white/20 overflow-hidden shrink-0">
                            <input
                              type="color"
                              value={selected.color ?? '#1f2937'}
                              onChange={(e) => updateField(selected.id, { color: e.target.value })}
                              className="absolute inset-0 w-[150%] h-[150%] -translate-x-[15%] -translate-y-[15%] cursor-pointer"
                            />
                          </div>
                          <input
                            type="text"
                            value={selected.color ?? '#1f2937'}
                            onChange={(e) => updateField(selected.id, { color: e.target.value })}
                            className="flex-1 bg-transparent text-[9px] text-white font-mono uppercase outline-none min-w-0"
                            maxLength={7}
                          />
                        </div>
                      </div>
                    </div>
                    <select
                      value={selected.fontFamily || 'Georgia, "Times New Roman", serif'}
                      onChange={(e) => updateField(selected.id, { fontFamily: e.target.value })}
                      className="w-full h-6 mt-1 rounded-md border border-white/10 bg-white/[0.04] px-1.5 text-[10px] text-white outline-none cursor-pointer appearance-none"
                    >
                      <option value='Georgia, "Times New Roman", serif' className="bg-slate-900">Georgia</option>
                      <option value='"Playfair Display", Georgia, serif' className="bg-slate-900">Playfair</option>
                      <option value='"Times New Roman", serif' className="bg-slate-900">Times</option>
                      <option value='Inter, sans-serif' className="bg-slate-900">Inter</option>
                      <option value='Helvetica, Arial, sans-serif' className="bg-slate-900">Helvetica</option>
                      <option value='"Courier New", monospace' className="bg-slate-900">Courier</option>
                    </select>
                    <div className="grid grid-cols-3 gap-0.5 mt-1">
                      {(['left', 'center', 'right'] as const).map((align) => {
                        const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight;
                        return (
                          <button
                            key={align}
                            onClick={() => updateField(selected.id, { textAlign: align })}
                            className={`h-6 rounded flex items-center justify-center transition-all cursor-pointer ${
                              (selected.textAlign || 'center') === align
                                ? 'bg-accent-indigo/20 text-white border border-accent-indigo/40'
                                : 'bg-white/[0.03] text-secondary-text border border-white/10 hover:bg-white/[0.06]'
                            }`}
                            title={align}
                          >
                            <Icon size={10} />
                          </button>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-3 gap-0.5 mt-1">
                      <button
                        onClick={() => updateField(selected.id, { fontWeight: selected.fontWeight === 'bold' ? 'normal' : 'bold' })}
                        className={`h-6 rounded flex items-center justify-center transition-all cursor-pointer ${
                          selected.fontWeight === 'bold'
                            ? 'bg-accent-indigo/20 text-white border border-accent-indigo/40'
                            : 'bg-white/[0.03] text-secondary-text border border-white/10 hover:bg-white/[0.06]'
                        }`}
                        title="Bold"
                      >
                        <Bold size={10} />
                      </button>
                      <button
                        onClick={() => updateField(selected.id, { fontStyle: selected.fontStyle === 'italic' ? 'normal' : 'italic' })}
                        className={`h-6 rounded flex items-center justify-center transition-all cursor-pointer ${
                          selected.fontStyle === 'italic'
                            ? 'bg-accent-indigo/20 text-white border border-accent-indigo/40'
                            : 'bg-white/[0.03] text-secondary-text border border-white/10 hover:bg-white/[0.06]'
                        }`}
                        title="Italic"
                      >
                        <Italic size={10} />
                      </button>
                      <button
                        onClick={() => updateField(selected.id, { fontWeight: selected.fontWeight === '300' ? '600' : '300' })}
                        className={`h-6 rounded flex items-center justify-center transition-all cursor-pointer ${
                          selected.fontWeight === '300'
                            ? 'bg-accent-indigo/20 text-white border border-accent-indigo/40'
                            : 'bg-white/[0.03] text-secondary-text border border-white/10 hover:bg-white/[0.06]'
                        }`}
                        title="Light weight"
                      >
                        <span className="text-[10px] font-light">L</span>
                      </button>
                    </div>
                  </section>
                )}

                {/* Position & Size - single row of 4 steppers */}
                <section>
                  <div className="flex items-center gap-1 mb-1">
                    <Maximize2 size={9} className="text-accent-indigo-light" />
                    <span className="text-[9px] font-bold text-white uppercase tracking-[0.12em]">Position</span>
                  </div>
                  <div className="grid grid-cols-4 gap-0.5">
                    {([
                      ['X', selected.x, (v: number) => updateField(selected.id, { x: v })],
                      ['Y', selected.y, (v: number) => updateField(selected.id, { y: v })],
                      ['W', selected.width, (v: number) => updateField(selected.id, { width: v })],
                      ['H', selected.height, (v: number) => updateField(selected.id, { height: v })],
                    ] as const).map(([label, val, setter]) => (
                      <div key={label} className="relative">
                        <span className="absolute top-0.5 left-1 text-[8px] font-bold text-secondary-text/70 pointer-events-none z-10">{label}</span>
                        <input
                          type="number"
                          value={Math.round(val * 10) / 10}
                          step={0.5}
                          onChange={(e) => setter(Number(e.target.value))}
                          className="w-full h-7 pt-2.5 pb-0.5 px-1 rounded-md border border-white/10 bg-white/[0.04] text-[10px] text-white font-mono text-center outline-none focus:border-accent-indigo/60 transition-all"
                        />
                        <span className="absolute bottom-0 right-1 text-[7px] text-secondary-text/50 pointer-events-none">%</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Transform - single row */}
                <section>
                  <div className="flex items-center gap-1 mb-1">
                    <Settings2 size={9} className="text-accent-indigo-light" />
                    <span className="text-[9px] font-bold text-white uppercase tracking-[0.12em]">Transform</span>
                  </div>
                  <div className="grid grid-cols-2 gap-0.5">
                    <div className="relative">
                      <span className="absolute top-0.5 left-1.5 text-[8px] font-bold text-secondary-text/70 pointer-events-none z-10">ROT</span>
                      <input
                        type="number"
                        value={Math.round((selected.rotation ?? 0) * 10) / 10}
                        step={1}
                        onChange={(e) => updateField(selected.id, { rotation: Number(e.target.value) })}
                        className="w-full h-7 pt-2.5 pb-0.5 px-1.5 rounded-md border border-white/10 bg-white/[0.04] text-[10px] text-white font-mono text-center outline-none focus:border-accent-indigo/60 transition-all"
                      />
                      <span className="absolute bottom-0 right-1.5 text-[7px] text-secondary-text/50 pointer-events-none">°</span>
                    </div>
                    <div className="relative">
                      <span className="absolute top-0.5 left-1.5 text-[8px] font-bold text-secondary-text/70 pointer-events-none z-10">Z</span>
                      <input
                        type="number"
                        value={selected.zIndex ?? 1}
                        step={1}
                        onChange={(e) => updateField(selected.id, { zIndex: Number(e.target.value) })}
                        className="w-full h-7 pt-2.5 pb-0.5 px-1.5 rounded-md border border-white/10 bg-white/[0.04] text-[10px] text-white font-mono text-center outline-none focus:border-accent-indigo/60 transition-all"
                      />
                    </div>
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center max-w-[180px]">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-accent-indigo/20 to-accent-indigo/5 border border-accent-indigo/30 flex items-center justify-center mx-auto mb-2">
                  <MousePointer2 size={14} className="text-accent-indigo-light" />
                </div>
                <p className="text-[11px] font-semibold text-white mb-0.5">No selection</p>
                <p className="text-[9px] text-secondary-text leading-relaxed">Click an element to edit</p>
              </div>
            </div>
          )}

          {/* Layers - pinned bottom */}
          <div className="border-t border-white/10 bg-white/[0.01]">
            <div className="flex items-center justify-between px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                <Layers size={10} className="text-accent-indigo-light" />
                <span className="text-[9px] font-bold text-white uppercase tracking-[0.12em]">Layers</span>
                <span className="text-[9px] font-mono text-secondary-text/80 px-1 py-0.5 rounded bg-white/5">{data.fields.length}</span>
              </div>
            </div>
            {data.fields.length === 0 ? (
              <p className="text-[9px] text-secondary-text/70 text-center py-2 px-2">
                No elements yet
              </p>
            ) : (
              <div className="px-1 pb-1 max-h-28 overflow-y-auto space-y-0.5">
                {[...data.fields].reverse().map((f, i, arr) => (
                  <div
                    key={f.id}
                    onClick={() => setSelectedId(f.id)}
                    className={`group flex items-center gap-1 px-1 py-0.5 rounded cursor-pointer transition-all ${
                      selectedId === f.id
                        ? 'bg-accent-indigo/15 border border-accent-indigo/30'
                        : 'border border-transparent hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="h-4 w-4 rounded bg-white/5 flex items-center justify-center shrink-0">
                      {f.type === 'logo'
                        ? <ImageIcon size={8} className="text-accent-indigo-light" />
                        : <Type size={8} className="text-accent-indigo-light" />}
                    </div>
                    <p className="text-[10px] text-white flex-1 truncate font-medium">
                      {f.type === 'logo' ? 'Logo' : (f.value || 'Text').slice(0, 14)}
                    </p>
                    <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); moveField(f.id, 'up'); }}
                        disabled={i === 0}
                        className="h-4 w-4 rounded text-secondary-text hover:text-white text-[8px] cursor-pointer disabled:opacity-30"
                      >↑</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveField(f.id, 'down'); }}
                        disabled={i === arr.length - 1}
                        className="h-4 w-4 rounded text-secondary-text hover:text-white text-[8px] cursor-pointer disabled:opacity-30"
                      >↓</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteField(f.id); }}
                        className="h-4 w-4 rounded text-red-400/80 hover:bg-red-500/15 flex items-center justify-center cursor-pointer"
                      >
                        <X size={8} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        )}
      </div>

      {/* ═══════════════ LOGO LIBRARY MODAL ═══════════════ */}
      <Modal open={logoModal} onClose={() => setLogoModal(false)} title="Logo Library" size="lg">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input value={logoName} onChange={(e) => setLogoName(e.target.value)} placeholder="Logo name (optional)" className="h-7" />
            <button
              onClick={handleLogoPick}
              disabled={uploadingLogo}
              className="h-7 px-3 rounded-md bg-accent-indigo/20 border border-accent-indigo/40 text-accent-indigo-light text-[11px] font-semibold hover:bg-accent-indigo/30 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {uploadingLogo ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
              Upload
            </button>
          </div>
          {logos.length === 0 ? (
            <p className="text-[11px] text-secondary-text text-center py-6 border border-dashed border-white/10 rounded-lg">No logos yet</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {logos.map((l) => (
                <div key={l.id} className="group p-1.5 rounded-md border border-white/10 bg-white/[0.02] hover:border-accent-indigo/40 transition-all">
                  <div className="aspect-video bg-white/5 rounded flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={l.url} alt={l.name} className="max-w-full max-h-full object-contain" />
                  </div>
                  <p className="text-[10px] text-white mt-1 truncate">{l.name}</p>
                  <div className="flex gap-0.5 mt-0.5">
                    <button onClick={() => addLogoField(l)} className="flex-1 h-5 rounded text-[9px] font-semibold bg-accent-indigo/20 text-accent-indigo-light hover:bg-accent-indigo/30 cursor-pointer">Add</button>
                    <button onClick={() => handleDeleteLogo(l.id)} className="h-5 w-5 rounded text-red-400/80 hover:bg-red-500/15 flex items-center justify-center cursor-pointer"><Trash2 size={9} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDeleteBg}
        title="Remove background image"
        message="This will detach the background image from the template."
        confirmLabel="Remove"
        variant="danger"
        onConfirm={handleRemoveImage}
        onCancel={() => setConfirmDeleteBg(false)}
      />
    </div>
  );
}
