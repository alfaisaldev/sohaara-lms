'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button, Card, CardContent, CardTitle } from '@sohaara/ui';
import { api } from '@/lib/api';
import { Plus, Trash2, Upload, Clock, CheckCircle, XCircle, FileText, Eye, EyeOff, Pencil, Save, Send, Star } from 'lucide-react';
import { useCan } from '@/lib/auth';

const toArray = (v: any): any[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (v.data && Array.isArray(v.data)) return v.data;
  return [];
};

export default function AssignmentTab({ courseId, onDirtyChange }: { courseId: string; onDirtyChange?: (dirty: boolean) => void }) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [mySubmissions, setMySubmissions] = useState<Record<string, any>>({});
  const canManage = useCan('admin', 'content_manager', 'manager', 'instructor');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxScore, setMaxScore] = useState(100);
  const [passingScore, setPassingScore] = useState(60);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [submissionType, setSubmissionType] = useState('any');
  const [saving, setSaving] = useState(false);

  // Submission form
  const [submitContent, setSubmitContent] = useState('');
  const [submitLink, setSubmitLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Grading
  const [gradeScore, setGradeScore] = useState<Record<string, number>>({});
  const [gradeFeedback, setGradeFeedback] = useState<Record<string, string>>({});

  const fetchAssignments = useCallback(() => {
    setLoading(true);
    api.get<any>(`/courses/${courseId}/assignments`)
      .then(res => setAssignments(toArray(res)))
      .catch(() => setAssignments([]))
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setInstructions('');
    setDueDate('');
    setMaxScore(100);
    setPassingScore(60);
    setMaxAttempts(1);
    setSubmissionType('any');
    setEditingAssignmentId(null);
    setCreating(false);
    setSubmitContent('');
    setSubmitLink('');
    onDirtyChange?.(false);
  };

  const startEdit = (a: any) => {
    setTitle(a.title);
    setDescription(a.description || '');
    setInstructions(a.instructions || '');
    setDueDate(a.dueDate ? a.dueDate.split('T')[0] : '');
    setMaxScore(a.maxScore || 100);
    setPassingScore(a.passingScore || 60);
    setMaxAttempts(a.maxAttempts || 1);
    setSubmissionType(a.submissionType || 'any');
    setEditingAssignmentId(a.id);
    setCreating(true);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title, description, instructions,
        dueDate: dueDate || null, maxScore, passingScore,
        maxAttempts, submissionType,
      };
      if (editingAssignmentId) {
        await api.put(`/assignments/${editingAssignmentId}`, payload);
      } else {
        await api.post(`/courses/${courseId}/assignments`, payload);
      }
      resetForm();
      onDirtyChange?.(false);
      fetchAssignments();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/assignments/${id}`);
    fetchAssignments();
  };

  const handleToggleStatus = async (a: any) => {
    const newStatus = a.status === 'published' ? 'draft' : 'published';
    await api.put(`/assignments/${a.id}`, { status: newStatus });
    fetchAssignments();
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    try {
      if (canManage) {
        const res = await api.get<any>(`/assignments/${id}/submissions`);
        setSubmissions(prev => ({ ...prev, [id]: toArray(res) }));
      } else {
        const res = await api.get<any>(`/assignments/${id}/my-submission`);
        setMySubmissions(prev => ({ ...prev, [id]: res }));
      }
    } catch { }
  };

  const handleSubmit = async (assignmentId: string) => {
    if (!submitContent.trim() && !submitLink.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/assignments/${assignmentId}/submit`, {
        content: submitContent,
        links: submitLink.trim() ? [submitLink.trim()] : [],
        enrollmentId: '',
      });
      setSubmitContent('');
      setSubmitLink('');
      fetchAssignments();
      toggleExpand(assignmentId);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGrade = async (submissionId: string, assignmentId: string) => {
    await api.post(`/submissions/${submissionId}/grade`, {
      score: gradeScore[submissionId] || 0,
      feedback: gradeFeedback[submissionId] || '',
    });
    toggleExpand(assignmentId);
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-primary-text">Assignments</h3>
          <p className="text-sm text-secondary-text">Submit your work and track grades</p>
        </div>
        {canManage && !creating && (
          <Button onClick={() => { resetForm(); setCreating(true); }} variant="primary" size="sm" className="rounded-xl shadow-lg shadow-accent-indigo/20">
            <Plus size={16} /> New Assignment
          </Button>
        )}
      </div>

      {creating && (
        <Card variant="glass" className="border-accent-indigo/30 animate-scale-in">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-primary-text">{editingAssignmentId ? 'Edit Assignment' : 'Create Assignment'}</h4>
              <button onClick={resetForm} className="text-sm text-secondary-text hover:text-primary-text cursor-pointer">Cancel</button>
            </div>

            <input value={title} onChange={(e) => { setTitle(e.target.value); onDirtyChange?.(true); }} placeholder="Assignment title" className="w-full text-base font-bold text-primary-text bg-transparent border-b border-white/30 pb-2 outline-none focus:border-accent-indigo/50 transition-all placeholder:text-secondary-text" />
            <textarea value={description} onChange={(e) => { setDescription(e.target.value); onDirtyChange?.(true); }} placeholder="Description (optional)" className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all resize-none min-h-[60px]" />
            <textarea value={instructions} onChange={(e) => { setInstructions(e.target.value); onDirtyChange?.(true); }} placeholder="Instructions for students" className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all resize-none min-h-[80px]" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-secondary-text block mb-1">Max Score</label>
                <input type="number" value={maxScore} onChange={(e) => { setMaxScore(parseInt(e.target.value)); onDirtyChange?.(true); }} className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text outline-none focus:border-accent-indigo/50 transition-all" />
              </div>
              <div>
                <label className="text-xs text-secondary-text block mb-1">Passing Score</label>
                <input type="number" value={passingScore} onChange={(e) => { setPassingScore(parseInt(e.target.value)); onDirtyChange?.(true); }} className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text outline-none focus:border-accent-indigo/50 transition-all" />
              </div>
              <div>
                <label className="text-xs text-secondary-text block mb-1">Max Attempts</label>
                <input type="number" value={maxAttempts} onChange={(e) => { setMaxAttempts(parseInt(e.target.value)); onDirtyChange?.(true); }} className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text outline-none focus:border-accent-indigo/50 transition-all" />
              </div>
              <div>
                <label className="text-xs text-secondary-text block mb-1">Due Date</label>
                <input type="date" value={dueDate} onChange={(e) => { setDueDate(e.target.value); onDirtyChange?.(true); }} className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text outline-none focus:border-accent-indigo/50 transition-all" />
              </div>
            </div>

            <div>
              <label className="text-xs text-secondary-text block mb-1">Submission Type</label>
              <select value={submissionType} onChange={(e) => { setSubmissionType(e.target.value); onDirtyChange?.(true); }} className="rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text outline-none focus:border-accent-indigo/50 transition-all cursor-pointer">
                <option value="any">Any (text, links, files)</option>
                <option value="text">Text only</option>
                <option value="link">Links only</option>
                <option value="file">Files only</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-white/20">
              <Button onClick={resetForm} variant="ghost" size="sm" className="rounded-xl cursor-pointer">Cancel</Button>
              <Button onClick={handleSave} loading={saving} variant="primary" size="sm" className="rounded-xl shadow-lg shadow-accent-indigo/20 cursor-pointer">
                <Save size={14} /> {editingAssignmentId ? 'Update' : 'Create'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-6 w-6 border-2 border-accent-indigo border-t-transparent rounded-full" />
        </div>
      ) : assignments.length === 0 && !creating ? (
        <Card variant="glass" className="animate-scale-in">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-accent-indigo/20 to-accent-indigo-light/20 flex items-center justify-center mb-4">
              <Upload size={28} className="text-accent-indigo" />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-primary-text mb-1">No assignments yet</h3>
            <p className="text-secondary-text text-sm max-w-xs">Create assignments for learners to demonstrate their knowledge.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => {
            const isExpanded = expandedId === a.id;
            const subList = submissions[a.id] || [];
            const mySub = mySubmissions[a.id];
            return (
              <div key={a.id}>
                <Card
                  variant="glass"
                  className={`border-white/30 hover:border-accent-indigo/30 transition-all duration-300 cursor-pointer ${isExpanded ? 'border-accent-indigo/40' : ''}`}
                  onClick={() => toggleExpand(a.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent-indigo to-accent-indigo-light flex items-center justify-center text-white shadow-sm shrink-0">
                            <FileText size={14} />
                          </div>
                          <CardTitle className="text-sm text-primary-text">{a.title}</CardTitle>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border shrink-0 ${a.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{a.status}</span>
                        </div>
                        <div className="flex items-center gap-3 ml-9">
                          <span className="text-xs text-secondary-text">{a.maxScore} pts</span>
                          {a.dueDate && <span className="flex items-center gap-1 text-xs text-secondary-text"><Clock size={12} /> Due {new Date(a.dueDate).toLocaleDateString()}</span>}
                          <span className="text-xs text-secondary-text">{a.maxAttempts} attempt{a.maxAttempts !== 1 ? 's' : ''}</span>
                          {!canManage && mySub && (
                            <span className={`flex items-center gap-1 text-xs ${mySub.score != null ? 'text-accent-green' : 'text-accent-orange'}`}>
                              {mySub.score != null ? <CheckCircle size={12} /> : <Clock size={12} />}
                              {mySub.score != null ? `Graded: ${mySub.score}/${a.maxScore}` : 'Submitted'}
                            </span>
                          )}
                        </div>
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1 shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => handleToggleStatus(a)} className="text-secondary-text hover:text-primary-text transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-white/30" title={a.status === 'published' ? 'Set as draft' : 'Publish'}>
                            {a.status === 'published' ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button onClick={() => startEdit(a)} className="text-secondary-text hover:text-accent-indigo transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-white/30" title="Edit">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(a.id)} className="text-secondary-text hover:text-danger transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-white/30" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    {a.description && <p className="text-sm text-secondary-text ml-9 mt-1">{a.description}</p>}
                  </CardContent>
                </Card>

                {isExpanded && (
                  <div className="ml-6 mt-2 space-y-3 animate-fade-in-up">
                    {canManage ? (
                      subList.length === 0 ? (
                        <Card variant="default" className="border border-white/20">
                          <CardContent className="p-4 text-center text-sm text-secondary-text">No submissions yet</CardContent>
                        </Card>
                      ) : (
                        subList.map((sub: any) => (
                          <Card key={sub.id} variant="default" className="border border-white/20">
                            <CardContent className="p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-accent-indigo to-accent-indigo-light flex items-center justify-center text-[9px] font-medium text-white">
                                    {sub.user?.firstName?.[0]}{sub.user?.lastName?.[0]}
                                  </div>
                                  <span className="text-sm font-medium text-primary-text">{sub.user?.firstName} {sub.user?.lastName}</span>
                                  <span className="text-xs text-secondary-text">Attempt #{sub.attemptNumber}</span>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sub.status === 'graded' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{sub.status}</span>
                              </div>
                              {sub.content && <p className="text-sm text-secondary-text bg-white/40 rounded-xl p-3">{sub.content}</p>}
                              {sub.links?.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {sub.links.map((link: string, i: number) => (
                                    <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-indigo hover:underline">{link}</a>
                                  ))}
                                </div>
                              )}
                              {sub.status === 'graded' ? (
                                <div className="flex items-center gap-3 text-sm">
                                  <span className="font-bold text-primary-text">Score: {sub.score}/{a.maxScore}</span>
                                  {sub.feedback && <span className="text-secondary-text">| Feedback: {sub.feedback}</span>}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <input type="number" placeholder="Score" value={gradeScore[sub.id] || ''} onChange={(e) => setGradeScore(prev => ({ ...prev, [sub.id]: parseInt(e.target.value) || 0 }))} className="w-20 rounded-xl border border-white/30 bg-white/60 px-3 py-1.5 text-sm text-primary-text outline-none focus:border-accent-indigo/50 transition-all" max={a.maxScore} />
                                  <input value={gradeFeedback[sub.id] || ''} onChange={(e) => setGradeFeedback(prev => ({ ...prev, [sub.id]: e.target.value }))} placeholder="Feedback (optional)" className="flex-1 rounded-xl border border-white/30 bg-white/60 px-3 py-1.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 transition-all" />
                                  <button onClick={() => handleGrade(sub.id, a.id)} className="px-3 py-1.5 rounded-xl bg-accent-green text-white text-xs font-medium hover:bg-accent-green/90 transition-all cursor-pointer">
                                    <Star size={12} /> Grade
                                  </button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      )
                    ) : (
                      <Card variant="default" className="border border-white/20">
                        <CardContent className="p-4 space-y-3">
                          {a.instructions && <div className="text-sm text-primary-text bg-white/40 rounded-xl p-3 whitespace-pre-wrap">{a.instructions}</div>}

                          {mySub?.score != null ? (
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle size={16} className="text-accent-green" />
                              <span className="font-bold text-primary-text">Score: {mySub.score}/{a.maxScore}</span>
                              {mySub.feedback && <span className="text-secondary-text">— {mySub.feedback}</span>}
                            </div>
                          ) : mySub ? (
                            <div className="flex items-center gap-2 text-sm text-accent-orange">
                              <Clock size={16} /> Submitted (awaiting grade)
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <textarea value={submitContent} onChange={(e) => setSubmitContent(e.target.value)} placeholder="Your answer..." className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 transition-all resize-none min-h-[100px]" />
                              <input value={submitLink} onChange={(e) => setSubmitLink(e.target.value)} placeholder="Link (optional)" className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 transition-all" />
                              <div className="flex justify-end">
                                <button onClick={() => handleSubmit(a.id)} disabled={submitting} className="px-4 py-2 rounded-xl bg-gradient-to-r from-accent-indigo to-accent-indigo-light text-white text-sm font-medium hover:scale-[1.02] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
                                  <Send size={14} /> {submitting ? 'Submitting...' : 'Submit'}
                                </button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
