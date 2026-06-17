'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi as api } from '@/lib/api';
import { Plus, Trash2, Upload, Clock, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/components/Toast';

const toArray = (v: any): any[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (v.data && Array.isArray(v.data)) return v.data;
  return [];
};

export default function AdminAssignmentTab({ courseId, onDirtyChange }: { courseId: string; onDirtyChange?: (dirty: boolean) => void }) {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxScore, setMaxScore] = useState(100);
  const [passingScore, setPassingScore] = useState(60);
  const [saving, setSaving] = useState(false);

  const fetchAssignments = useCallback(() => {
    setLoading(true);
    api.get<any>(`/courses/${courseId}/assignments`)
      .then(res => setAssignments(toArray(res)))
      .catch(() => setAssignments([]))
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api.post(`/courses/${courseId}/assignments`, {
        title, description, maxScore, passingScore,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        submissionType: 'any',
      });
      toast('success', 'Assignment created');
      setCreating(false);
      setTitle(''); setDescription(''); setDueDate(''); setMaxScore(100); setPassingScore(60);
      onDirtyChange?.(false);
      fetchAssignments();
    } catch (err: any) {
      toast('error', err.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const deleteAssignment = async (id: string) => {
    try {
      await api.delete(`/assignments/${id}`);
      fetchAssignments();
      toast('success', 'Assignment deleted');
    } catch (err: any) {
      toast('error', err.message || 'Failed');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-accent-indigo" size={24} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-secondary-text">{assignments.length} assignment{assignments.length !== 1 ? 's' : ''}</p>
        <button onClick={() => { setCreating(!creating); if (creating) onDirtyChange?.(false); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-indigo text-white text-sm font-medium hover:bg-accent-indigo/90 transition-all cursor-pointer">
          <Plus size={16} /> {creating ? 'Cancel' : 'Create Assignment'}
        </button>
      </div>

      {creating && (
        <div className="rounded-xl border border-border/60 bg-white/5 p-6 space-y-4">
          <h3 className="text-base font-semibold text-white">New Assignment</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-300 mb-1">Title *</label>
              <input value={title} onChange={(e) => { setTitle(e.target.value); onDirtyChange?.(true); }} className="w-full rounded-lg border border-border/60 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-indigo/50" />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">Due Date</label>
              <input type="datetime-local" value={dueDate} onChange={(e) => { setDueDate(e.target.value); onDirtyChange?.(true); }} className="w-full rounded-lg border border-border/60 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-indigo/50" />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">Max Score</label>
              <input type="number" value={maxScore} onChange={(e) => { setMaxScore(Number(e.target.value)); onDirtyChange?.(true); }} className="w-full rounded-lg border border-border/60 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-indigo/50" />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">Passing Score</label>
              <input type="number" value={passingScore} onChange={(e) => { setPassingScore(Number(e.target.value)); onDirtyChange?.(true); }} className="w-full rounded-lg border border-border/60 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-indigo/50" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-300 mb-1">Description</label>
            <textarea value={description} onChange={(e) => { setDescription(e.target.value); onDirtyChange?.(true); }} rows={3} className="w-full rounded-lg border border-border/60 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-indigo/50 resize-none" />
          </div>
          <div className="flex justify-end">
            <button onClick={handleCreate} disabled={saving || !title.trim()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-indigo text-white text-sm font-medium hover:bg-accent-indigo/90 disabled:opacity-40 transition-all cursor-pointer">
              <Save size={14} /> {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {assignments.length === 0 && !creating ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-border/30 bg-white/[0.02]">
          <Upload size={40} className="text-secondary-text/20 mb-4" />
          <p className="text-secondary-text text-sm">No assignments yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a: any) => (
            <div key={a.id} className="rounded-xl border border-border/30 bg-white/[0.02] p-4 flex items-center gap-4">
              <Upload size={18} className="text-accent-indigo shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{a.title}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-secondary-text">
                  <span className="flex items-center gap-1"><Clock size={12} />{a.dueDate ? new Date(a.dueDate).toLocaleDateString() : 'No due date'}</span>
                  <span>Max: {a.maxScore}</span>
                  <span>Pass: {a.passingScore}</span>
                </div>
              </div>
              <button onClick={() => deleteAssignment(a.id)} className="text-secondary-text hover:text-red-400 cursor-pointer" title="Delete">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
