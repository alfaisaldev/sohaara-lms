'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi as api } from '@/lib/api';
import { Plus, Trash2, FileQuestion, Clock, Trophy, Save, Eye, EyeOff, Pencil, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { useToast } from '@/components/Toast';

const toArray = (v: any): any[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (v.data && Array.isArray(v.data)) return v.data;
  return [];
};

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True/False' },
  { value: 'multiple_select', label: 'Multiple Select' },
  { value: 'fill_blank', label: 'Fill Blank' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'essay', label: 'Essay' },
  { value: 'matching', label: 'Matching' },
];

export default function AdminQuizTab({ courseId, onDirtyChange }: { courseId: string; onDirtyChange?: (dirty: boolean) => void }) {
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [timeLimit, setTimeLimit] = useState<number | ''>('');
  const [passingScore, setPassingScore] = useState(60);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchQuizzes = useCallback(() => {
    setLoading(true);
    api.get<any>(`/courses/${courseId}/quizzes`)
      .then(res => setQuizzes(toArray(res)))
      .catch(() => setQuizzes([]))
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => { fetchQuizzes(); }, [fetchQuizzes]);

  const markDirty = useCallback(() => { onDirtyChange?.(true); }, [onDirtyChange]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setInstructions('');
    setTimeLimit('');
    setPassingScore(60);
    setMaxAttempts(1);
    setShuffleQuestions(false);
    setQuestions([]);
    setEditingQuizId(null);
    setCreating(false);
    onDirtyChange?.(false);
  };

  const startEdit = (quiz: any) => {
    setTitle(quiz.title);
    setDescription(quiz.description || '');
    setInstructions(quiz.instructions || '');
    setTimeLimit(quiz.timeLimit || '');
    setPassingScore(quiz.passingScore || 60);
    setMaxAttempts(quiz.maxAttempts || 1);
    setShuffleQuestions(quiz.shuffleQuestions || false);
    setQuestions((quiz.questions || []).map((q: any) => ({
      id: q.id,
      type: q.type,
      title: q.title || '',
      description: q.description || '',
      points: q.points || 1,
      explanation: q.explanation || '',
      options: (q.options || []).map((o: any) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
      correctAnswer: q.correctAnswer || null,
      correctAnswers: q.correctAnswers || [],
      matchingPairs: (q.matchingPairs || []).map((p: any) => ({ id: p.id, left: p.left, right: p.right })),
    })));
    setEditingQuizId(quiz.id);
    setCreating(true);
  };

  const addQuestion = (type: string) => {
    markDirty();
    const now = Date.now();
    const q: any = {
      id: `q-${now}`,
      type, title: '', description: '', points: 1, explanation: '',
      options: [], correctAnswer: null, correctAnswers: [], matchingPairs: [],
    };
    if (type === 'multiple_choice' || type === 'multiple_select') {
      q.options = [
        { id: `opt-${now}-1`, text: '', isCorrect: false },
        { id: `opt-${now}-2`, text: '', isCorrect: false },
      ];
    }
    if (type === 'matching') {
      q.matchingPairs = [
        { id: `mp-${now}-1`, left: '', right: '' },
        { id: `mp-${now}-2`, left: '', right: '' },
      ];
    }
    setQuestions([...questions, q]);
  };

  const removeQuestion = (id: string) => { markDirty(); setQuestions(questions.filter(q => q.id !== id)); };
  const updateQuestion = (id: string, field: string, value: any) => {
    markDirty();
    setQuestions(questions.map(q => (q.id === id ? { ...q, [field]: value } : q)));
  };

  const addOption = (qId: string) => {
    markDirty();
    setQuestions(questions.map(q => q.id === qId
      ? { ...q, options: [...q.options, { id: `opt-${Date.now()}`, text: '', isCorrect: false }] }
      : q));
  };

  const updateOption = (qId: string, optId: string, field: string, value: any) => {
    markDirty();
    setQuestions(questions.map(q => q.id === qId
      ? { ...q, options: q.options.map((o: any) => o.id === optId ? { ...o, [field]: value } : o) }
      : q));
  };

  const removeOption = (qId: string, optId: string) => {
    markDirty();
    setQuestions(questions.map(q => q.id === qId
      ? { ...q, options: q.options.filter((o: any) => o.id !== optId) }
      : q));
  };

  const setCorrectAnswer = (qId: string, value: any) => {
    markDirty();
    setQuestions(questions.map(q => q.id === qId ? { ...q, correctAnswer: value } : q));
  };

  const toggleCorrectAnswer = (qId: string, optId: string) => {
    markDirty();
    setQuestions(questions.map(q => {
      if (q.id !== qId) return q;
      if (q.type === 'multiple_choice') {
        return { ...q, options: q.options.map((o: any) => ({ ...o, isCorrect: o.id === optId })), correctAnswer: optId };
      }
      const newOpts = q.options.map((o: any) => o.id === optId ? { ...o, isCorrect: !o.isCorrect } : o);
      return { ...q, options: newOpts, correctAnswers: newOpts.filter((o: any) => o.isCorrect).map((o: any) => o.id) };
    }));
  };

  const addMatchingPair = (qId: string) => {
    markDirty();
    setQuestions(questions.map(q => q.id === qId
      ? { ...q, matchingPairs: [...q.matchingPairs, { id: `mp-${Date.now()}`, left: '', right: '' }] }
      : q));
  };

  const updateMatchingPair = (qId: string, pairId: string, field: string, value: string) => {
    markDirty();
    setQuestions(questions.map(q => q.id === qId
      ? { ...q, matchingPairs: q.matchingPairs.map((p: any) => p.id === pairId ? { ...p, [field]: value } : p) }
      : q));
  };

  const removeMatchingPair = (qId: string, pairId: string) => {
    markDirty();
    setQuestions(questions.map(q => q.id === qId
      ? { ...q, matchingPairs: q.matchingPairs.filter((p: any) => p.id !== pairId) }
      : q));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...questions];
    const swap = direction === 'up' ? index - 1 : index + 1;
    if (swap < 0 || swap >= newQuestions.length) return;
    [newQuestions[index], newQuestions[swap]] = [newQuestions[swap], newQuestions[index]];
    setQuestions(newQuestions);
    markDirty();
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (editingQuizId) {
        await api.put(`/quizzes/${editingQuizId}`, {
          title, description, instructions, timeLimit: timeLimit || null,
          passingScore, maxAttempts, shuffleQuestions,
        });
        for (const q of questions) {
          if (q.id.startsWith('q-')) {
            const created: any = await api.post(`/quizzes/${editingQuizId}/questions`, {
              type: q.type, title: q.title, description: q.description, points: q.points,
              explanation: q.explanation, correctAnswer: q.correctAnswer, correctAnswers: q.correctAnswers,
              options: q.options.length > 0 ? q.options.map((o: any) => ({ text: o.text, isCorrect: o.isCorrect })) : undefined,
              matchingPairs: q.matchingPairs.length > 0 ? q.matchingPairs.map((p: any) => ({ left: p.left, right: p.right })) : undefined,
            });
            q.id = created.id;
          } else {
            await api.put(`/questions/${q.id}`, {
              type: q.type, title: q.title, description: q.description, points: q.points,
              explanation: q.explanation, correctAnswer: q.correctAnswer, correctAnswers: q.correctAnswers,
              options: q.options.length > 0 ? q.options.map((o: any) => ({ text: o.text, isCorrect: o.isCorrect })) : undefined,
              matchingPairs: q.matchingPairs.length > 0 ? q.matchingPairs.map((p: any) => ({ left: p.left, right: p.right })) : undefined,
            });
          }
        }
        toast('success', 'Quiz updated');
      } else {
        const quiz: any = await api.post(`/courses/${courseId}/quizzes`, {
          title, description, instructions, timeLimit: timeLimit || null,
          passingScore, maxAttempts, shuffleQuestions,
        });
        for (const q of questions) {
          await api.post(`/quizzes/${quiz.id}/questions`, {
            type: q.type, title: q.title, description: q.description, points: q.points,
            explanation: q.explanation, correctAnswer: q.correctAnswer, correctAnswers: q.correctAnswers,
            options: q.options.length > 0 ? q.options.map((o: any) => ({ text: o.text, isCorrect: o.isCorrect })) : undefined,
            matchingPairs: q.matchingPairs.length > 0 ? q.matchingPairs.map((p: any) => ({ left: p.left, right: p.right })) : undefined,
          });
        }
        toast('success', 'Quiz created');
      }
      resetForm();
      onDirtyChange?.(false);
      fetchQuizzes();
    } catch (err: any) {
      toast('error', err.message || 'Failed to save quiz');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try { await api.delete(`/quizzes/${id}`); fetchQuizzes(); toast('success', 'Quiz deleted'); }
    catch (err: any) { toast('error', err.message || 'Failed'); }
  };

  const handleToggleStatus = async (quiz: any) => {
    const newStatus = quiz.status === 'published' ? 'draft' : 'published';
    try { await api.put(`/quizzes/${quiz.id}`, { status: newStatus }); fetchQuizzes(); }
    catch (err: any) { toast('error', err.message || 'Failed'); }
  };

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-accent-indigo" size={24} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-secondary-text">{quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''}</p>
        {!creating && (
          <button onClick={() => { resetForm(); setCreating(true); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-indigo text-white text-sm font-medium hover:bg-accent-indigo/90 transition-all cursor-pointer">
            <Plus size={16} /> New Quiz
          </button>
        )}
      </div>

      {creating && (
        <div className="rounded-xl border border-border/60 bg-white/5 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">{editingQuizId ? 'Edit Quiz' : 'Create Quiz'}</h3>
            <button onClick={resetForm} className="text-xs text-secondary-text hover:text-white cursor-pointer">Cancel</button>
          </div>

          <input value={title} onChange={(e) => { setTitle(e.target.value); markDirty(); }} placeholder="Quiz title" className="w-full text-base font-medium text-white bg-transparent border-b border-border/60 pb-2 outline-none focus:border-accent-indigo/50 transition-all placeholder:text-secondary-text" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-gray-300 block mb-1">Time Limit (min)</label>
              <input type="number" value={timeLimit} onChange={(e) => { setTimeLimit(e.target.value ? parseInt(String(e.target.value)) : ''); markDirty(); }} className="w-full rounded-lg border border-border/60 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-indigo/50" />
            </div>
            <div>
              <label className="text-xs text-gray-300 block mb-1">Passing Score (%)</label>
              <input type="number" value={passingScore} onChange={(e) => { setPassingScore(parseInt(String(e.target.value))); markDirty(); }} className="w-full rounded-lg border border-border/60 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-indigo/50" />
            </div>
            <div>
              <label className="text-xs text-gray-300 block mb-1">Max Attempts</label>
              <input type="number" value={maxAttempts} onChange={(e) => { setMaxAttempts(parseInt(String(e.target.value))); markDirty(); }} className="w-full rounded-lg border border-border/60 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-indigo/50" />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={shuffleQuestions} onChange={(e) => { setShuffleQuestions(e.target.checked); markDirty(); }} className="accent-accent-indigo" />
                Shuffle questions
              </label>
            </div>
          </div>

          <div className="border-t border-border/40 pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white">Questions ({questions.length})</span>
              {questions.length > 0 && <span className="text-xs text-secondary-text">{totalPoints} total pts</span>}
            </div>

            {questions.map((q, qi) => (
              <div key={q.id} className="mb-3 rounded-lg border border-border/40 bg-white/[0.02] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-secondary-text bg-white/10 px-2 py-0.5 rounded">Q{qi + 1}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-accent-indigo/10 text-accent-indigo-light font-medium">{QUESTION_TYPES.find(t => t.value === q.type)?.label}</span>
                    <span className="text-xs text-secondary-text">{q.points || 0} pts</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveQuestion(qi, 'up')} disabled={qi === 0} className="text-secondary-text hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed p-1"><ChevronUp size={14} /></button>
                    <button onClick={() => moveQuestion(qi, 'down')} disabled={qi === questions.length - 1} className="text-secondary-text hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed p-1"><ChevronDown size={14} /></button>
                    <button onClick={() => removeQuestion(q.id)} className="text-secondary-text hover:text-red-400 transition-colors cursor-pointer p-1"><Trash2 size={14} /></button>
                  </div>
                </div>

                <input value={q.title} onChange={(e) => updateQuestion(q.id, 'title', e.target.value)} placeholder="Question text" className="w-full rounded-lg border border-border/60 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-secondary-text outline-none focus:border-accent-indigo/50" />

                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">Points:</span>
                  <input type="number" value={q.points} onChange={(e) => updateQuestion(q.id, 'points', parseInt(String(e.target.value)) || 0)} className="w-20 rounded-lg border border-border/60 bg-white/5 px-3 py-1.5 text-sm text-white outline-none focus:border-accent-indigo/50" />
                  <span className="text-xs text-gray-400">Explanation:</span>
                  <input value={q.explanation || ''} onChange={(e) => updateQuestion(q.id, 'explanation', e.target.value)} placeholder="Show after answering" className="flex-1 rounded-lg border border-border/60 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-secondary-text outline-none focus:border-accent-indigo/50" />
                </div>

                {(q.type === 'multiple_choice' || q.type === 'multiple_select') && (
                  <div className="space-y-2">
                    {q.options.map((opt: any) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <button onClick={() => toggleCorrectAnswer(q.id, opt.id)}
                          className={`h-5 w-5 flex items-center justify-center rounded-full border-2 cursor-pointer transition-all shrink-0 ${opt.isCorrect ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border/60 hover:border-accent-indigo/50'}`}>
                          {opt.isCorrect && <span className="text-[10px]">&#10003;</span>}
                        </button>
                        <input value={opt.text} onChange={(e) => updateOption(q.id, opt.id, 'text', e.target.value)} placeholder={`Option ${q.options.indexOf(opt) + 1}`}
                          className="flex-1 rounded-lg border border-border/60 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-secondary-text outline-none focus:border-accent-indigo/50" />
                        <button onClick={() => removeOption(q.id, opt.id)} className="text-secondary-text hover:text-red-400 cursor-pointer shrink-0"><Trash2 size={12} /></button>
                      </div>
                    ))}
                    <button onClick={() => addOption(q.id)} className="text-xs text-accent-indigo-light hover:underline cursor-pointer">+ Add option</button>
                  </div>
                )}

                {q.type === 'true_false' && (
                  <div className="flex gap-3">
                    {['true', 'false'].map((val) => (
                      <button key={val} onClick={() => setCorrectAnswer(q.id, val)}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all cursor-pointer ${q.correctAnswer === val ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-border/60 bg-white/5 text-gray-300 hover:border-accent-indigo/50'}`}>
                        {val === 'true' ? 'True' : 'False'}
                      </button>
                    ))}
                  </div>
                )}

                {q.type === 'fill_blank' && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Correct answer:</label>
                    <input value={q.correctAnswer || ''} onChange={(e) => setCorrectAnswer(q.id, e.target.value)} placeholder="Expected answer" className="w-full rounded-lg border border-border/60 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-secondary-text outline-none focus:border-accent-indigo/50" />
                  </div>
                )}

                {(q.type === 'short_answer' || q.type === 'essay') && (
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">{q.type === 'essay' ? 'Grading rubric / guidelines:' : 'Model answer:'}</label>
                    <textarea value={q.correctAnswer || ''} onChange={(e) => setCorrectAnswer(q.id, e.target.value)}
                      placeholder={q.type === 'essay' ? 'Key points, criteria for grading' : 'Model answer for reference'}
                      className="w-full rounded-lg border border-border/60 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 resize-none min-h-[60px]" />
                  </div>
                )}

                {q.type === 'matching' && (
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 block">Matching pairs (left → right):</label>
                    {q.matchingPairs.map((pair: any, pi: number) => (
                      <div key={pair.id} className="flex items-center gap-2">
                        <span className="text-xs text-secondary-text w-5">{pi + 1}.</span>
                        <input value={pair.left} onChange={(e) => updateMatchingPair(q.id, pair.id, 'left', e.target.value)} placeholder="Left item"
                          className="flex-1 rounded-lg border border-border/60 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-secondary-text outline-none focus:border-accent-indigo/50" />
                        <span className="text-secondary-text">→</span>
                        <input value={pair.right} onChange={(e) => updateMatchingPair(q.id, pair.id, 'right', e.target.value)} placeholder="Right item"
                          className="flex-1 rounded-lg border border-border/60 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-secondary-text outline-none focus:border-accent-indigo/50" />
                        <button onClick={() => removeMatchingPair(q.id, pair.id)} className="text-secondary-text hover:text-red-400 cursor-pointer"><Trash2 size={12} /></button>
                      </div>
                    ))}
                    <button onClick={() => addMatchingPair(q.id)} className="text-xs text-accent-indigo-light hover:underline cursor-pointer">+ Add pair</button>
                  </div>
                )}
              </div>
            ))}

            <div className="flex flex-wrap gap-2 mt-3">
              {QUESTION_TYPES.map((t) => (
                <button key={t.value} onClick={() => addQuestion(t.value)} className="px-3 py-1.5 rounded-lg border border-border/60 bg-white/5 text-xs text-gray-300 hover:border-accent-indigo/50 hover:text-white transition-all cursor-pointer">
                  + {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
            <button onClick={resetForm} className="px-4 py-2 rounded-xl text-sm text-secondary-text hover:bg-white/10 transition-colors cursor-pointer">Cancel</button>
            <button onClick={handleSave} disabled={saving || !title.trim()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-indigo text-white text-sm font-medium hover:bg-accent-indigo/90 disabled:opacity-40 transition-all cursor-pointer">
              <Save size={14} /> {saving ? 'Saving...' : editingQuizId ? 'Update Quiz' : 'Save Quiz'}
            </button>
          </div>
        </div>
      )}

      {!creating && (quizzes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-border/30 bg-white/[0.02]">
          <FileQuestion size={40} className="text-secondary-text/20 mb-4" />
          <p className="text-secondary-text text-sm">No quizzes yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quizzes.map((q) => (
            <div key={q.id} className="rounded-xl border border-border/30 bg-white/[0.02] p-4 hover:border-accent-indigo/30 transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy size={16} className="text-accent-indigo shrink-0" />
                    <p className="text-sm font-medium text-white truncate">{q.title}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${q.status === 'published' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'}`}>{q.status}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-secondary-text">
                    <span className="flex items-center gap-1"><FileQuestion size={12} /> {q.questions?.length || 0} questions</span>
                    {q.timeLimit && <span className="flex items-center gap-1"><Clock size={12} /> {q.timeLimit} min</span>}
                    <span>Pass: {q.passingScore}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-3">
                  <button onClick={() => handleToggleStatus(q)} className="p-1.5 rounded-lg text-secondary-text hover:text-white hover:bg-white/10 transition-all cursor-pointer" title={q.status === 'published' ? 'Unpublish' : 'Publish'}>
                    {q.status === 'published' ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button onClick={() => startEdit(q)} className="p-1.5 rounded-lg text-secondary-text hover:text-accent-indigo-light hover:bg-white/10 transition-all cursor-pointer" title="Edit">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(q.id)} className="p-1.5 rounded-lg text-secondary-text hover:text-red-400 hover:bg-white/10 transition-all cursor-pointer" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
