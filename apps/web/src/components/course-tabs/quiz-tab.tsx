'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardTitle } from '@sohaara/ui';
import { api } from '@/lib/api';
import { Plus, Trash2, GripVertical, FileQuestion, Clock, Trophy, Save, Eye, EyeOff, Pencil, Play } from 'lucide-react';
import { useCan } from '@/lib/auth';

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'multiple_select', label: 'Multiple Select' },
  { value: 'fill_blank', label: 'Fill in the Blank' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'essay', label: 'Essay' },
  { value: 'matching', label: 'Matching' },
];

const toArray = (v: any): any[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (v.data && Array.isArray(v.data)) return v.data;
  return [];
};

export default function QuizTab({ courseId, onDirtyChange }: { courseId: string; onDirtyChange?: (dirty: boolean) => void }) {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const canManage = useCan('admin', 'content_manager', 'manager', 'instructor');

  // New quiz form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [timeLimit, setTimeLimit] = useState<number | ''>('');
  const [passingScore, setPassingScore] = useState(60);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

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
      type,
      title: '',
      description: '',
      points: 1,
      explanation: '',
      options: [],
      correctAnswer: null,
      correctAnswers: [],
      matchingPairs: [],
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

  const removeQuestion = (id: string) => { markDirty(); setQuestions(questions.filter((q) => q.id !== id)); };

  const updateQuestion = (id: string, field: string, value: any) => {
    markDirty();
    setQuestions(questions.map((q) => (q.id === id ? { ...q, [field]: value } : q)));
  };

  const addOption = (qId: string) => {
    markDirty();
    setQuestions(questions.map((q) => q.id === qId
      ? { ...q, options: [...q.options, { id: `opt-${Date.now()}`, text: '', isCorrect: false }] }
      : q));
  };

  const updateOption = (qId: string, optId: string, field: string, value: any) => {
    markDirty();
    setQuestions(questions.map((q) => q.id === qId
      ? { ...q, options: q.options.map((o: any) => o.id === optId ? { ...o, [field]: value } : o) }
      : q));
  };

  const removeOption = (qId: string, optId: string) => {
    markDirty();
    setQuestions(questions.map((q) => q.id === qId
      ? { ...q, options: q.options.filter((o: any) => o.id !== optId) }
      : q));
  };

  const setCorrectAnswer = (qId: string, value: any) => {
    markDirty();
    setQuestions(questions.map((q) => q.id === qId ? { ...q, correctAnswer: value } : q));
  };

  const toggleCorrectAnswer = (qId: string, optId: string) => {
    markDirty();
    setQuestions(questions.map((q) => {
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
    setQuestions(questions.map((q) => q.id === qId
      ? { ...q, matchingPairs: [...q.matchingPairs, { id: `mp-${Date.now()}`, left: '', right: '' }] }
      : q));
  };

  const updateMatchingPair = (qId: string, pairId: string, field: string, value: string) => {
    markDirty();
    setQuestions(questions.map((q) => q.id === qId
      ? { ...q, matchingPairs: q.matchingPairs.map((p: any) => p.id === pairId ? { ...p, [field]: value } : p) }
      : q));
  };

  const removeMatchingPair = (qId: string, pairId: string) => {
    markDirty();
    setQuestions(questions.map((q) => q.id === qId
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
          title, description, instructions,
          timeLimit: timeLimit || null,
          passingScore, maxAttempts, shuffleQuestions,
        });
        for (const q of questions) {
          if (q.id.startsWith('q-')) {
            const created: any = await api.post(`/quizzes/${editingQuizId}/questions`, {
              type: q.type, title: q.title, description: q.description, points: q.points,
              explanation: q.explanation,
              correctAnswer: q.correctAnswer,
              correctAnswers: q.correctAnswers,
              options: q.options.length > 0 ? q.options.map((o: any) => ({ text: o.text, isCorrect: o.isCorrect })) : undefined,
              matchingPairs: q.matchingPairs.length > 0 ? q.matchingPairs.map((p: any) => ({ left: p.left, right: p.right })) : undefined,
            });
            q.id = created.id;
          } else {
            await api.put(`/questions/${q.id}`, {
              type: q.type, title: q.title, description: q.description, points: q.points,
              explanation: q.explanation,
              correctAnswer: q.correctAnswer,
              correctAnswers: q.correctAnswers,
              options: q.options.length > 0 ? q.options.map((o: any) => ({ text: o.text, isCorrect: o.isCorrect })) : undefined,
              matchingPairs: q.matchingPairs.length > 0 ? q.matchingPairs.map((p: any) => ({ left: p.left, right: p.right })) : undefined,
            });
          }
        }
      } else {
        const quiz: any = await api.post(`/courses/${courseId}/quizzes`, {
          title, description, instructions,
          timeLimit: timeLimit || null,
          passingScore, maxAttempts, shuffleQuestions,
        });
        for (const q of questions) {
          await api.post(`/quizzes/${quiz.id}/questions`, {
            type: q.type, title: q.title, description: q.description, points: q.points,
            explanation: q.explanation,
            correctAnswer: q.correctAnswer,
            correctAnswers: q.correctAnswers,
            options: q.options.length > 0 ? q.options.map((o: any) => ({ text: o.text, isCorrect: o.isCorrect })) : undefined,
            matchingPairs: q.matchingPairs.length > 0 ? q.matchingPairs.map((p: any) => ({ left: p.left, right: p.right })) : undefined,
          });
        }
      }
      resetForm();
      onDirtyChange?.(false);
      fetchQuizzes();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/quizzes/${id}`);
    fetchQuizzes();
  };

  const handleToggleStatus = async (quiz: any) => {
    const newStatus = quiz.status === 'published' ? 'draft' : 'published';
    await api.put(`/quizzes/${quiz.id}`, { status: newStatus });
    fetchQuizzes();
  };

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-primary-text">Quizzes</h3>
          <p className="text-sm text-secondary-text">Test your knowledge with course quizzes</p>
        </div>
        {canManage && !creating && (
          <Button onClick={() => { resetForm(); setCreating(true); }} variant="primary" size="sm" className="rounded-xl shadow-lg shadow-accent-indigo/20">
            <Plus size={16} /> New Quiz
          </Button>
        )}
      </div>

      {creating && (
        <Card variant="glass" className="border-accent-indigo/30 animate-scale-in">
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-primary-text">{editingQuizId ? 'Edit Quiz' : 'Create Quiz'}</h4>
              <button onClick={resetForm} className="text-sm text-secondary-text hover:text-primary-text cursor-pointer">Cancel</button>
            </div>

            <input value={title} onChange={(e) => { setTitle(e.target.value); markDirty(); }} placeholder="Quiz title" className="w-full text-lg font-bold text-primary-text bg-transparent border-b border-white/30 pb-2 outline-none focus:border-accent-indigo/50 transition-all placeholder:text-secondary-text" />
            <textarea value={description} onChange={(e) => { setDescription(e.target.value); markDirty(); }} placeholder="Description (optional)" className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all resize-none min-h-[60px]" />
            <textarea value={instructions} onChange={(e) => { setInstructions(e.target.value); markDirty(); }} placeholder="Instructions for students (optional)" className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all resize-none min-h-[60px]" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-secondary-text block mb-1">Time Limit (min)</label>
                <input type="number" value={timeLimit} onChange={(e) => { setTimeLimit(e.target.value ? parseInt(e.target.value) : ''); markDirty(); }} className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text outline-none focus:border-accent-indigo/50 transition-all" />
              </div>
              <div>
                <label className="text-xs text-secondary-text block mb-1">Passing Score (%)</label>
                <input type="number" value={passingScore} onChange={(e) => { setPassingScore(parseInt(e.target.value)); markDirty(); }} className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text outline-none focus:border-accent-indigo/50 transition-all" />
              </div>
              <div>
                <label className="text-xs text-secondary-text block mb-1">Max Attempts</label>
                <input type="number" value={maxAttempts} onChange={(e) => { setMaxAttempts(parseInt(e.target.value)); markDirty(); }} className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text outline-none focus:border-accent-indigo/50 transition-all" />
              </div>
              <div className="flex items-end pb-2.5">
                <label className="flex items-center gap-2 text-sm text-primary-text cursor-pointer">
                  <input type="checkbox" checked={shuffleQuestions} onChange={(e) => { setShuffleQuestions(e.target.checked); markDirty(); }} className="h-4 w-4 accent-accent-indigo rounded" />
                  Shuffle questions
                </label>
              </div>
            </div>

            <div className="border-t border-white/20 pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-primary-text">Questions ({questions.length})</span>
                {questions.length > 0 && <span className="text-xs text-secondary-text">{totalPoints} total pts</span>}
              </div>

              {questions.map((q, qi) => (
                <Card key={q.id} variant="default" className="mb-3 border border-white/20">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-secondary-text bg-white/40 px-2 py-0.5 rounded">Q{qi + 1}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-accent-indigo/10 text-accent-indigo font-medium">{QUESTION_TYPES.find(t => t.value === q.type)?.label}</span>
                        <span className="text-xs text-secondary-text">{q.points || 0} pts</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveQuestion(qi, 'up')} disabled={qi === 0} className="text-secondary-text hover:text-primary-text disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed p-1"><GripVertical size={14} /></button>
                        <button onClick={() => removeQuestion(q.id)} className="text-secondary-text hover:text-danger transition-colors cursor-pointer p-1"><Trash2 size={14} /></button>
                      </div>
                    </div>

                    <input value={q.title} onChange={(e) => updateQuestion(q.id, 'title', e.target.value)} placeholder="Question title" className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 transition-all" />
                    <textarea value={q.description} onChange={(e) => updateQuestion(q.id, 'description', e.target.value)} placeholder="Description (optional)" className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 transition-all resize-none min-h-[50px]" />

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-secondary-text">Points:</span>
                      <input type="number" value={q.points} onChange={(e) => updateQuestion(q.id, 'points', parseInt(e.target.value) || 0)} className="w-20 rounded-xl border border-white/30 bg-white/60 px-3 py-1.5 text-sm text-primary-text outline-none focus:border-accent-indigo/50 transition-all" />
                      <span className="text-xs text-secondary-text">Explanation:</span>
                      <input value={q.explanation || ''} onChange={(e) => updateQuestion(q.id, 'explanation', e.target.value)} placeholder="Show after answer (optional)" className="flex-1 rounded-xl border border-white/30 bg-white/60 px-3 py-1.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 transition-all" />
                    </div>

                    {(q.type === 'multiple_choice' || q.type === 'multiple_select') && (
                      <div className="space-y-2">
                        {q.options.map((opt: any) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <button
                              onClick={() => toggleCorrectAnswer(q.id, opt.id)}
                              className={`h-5 w-5 flex items-center justify-center rounded-full border-2 cursor-pointer transition-all shrink-0 ${opt.isCorrect ? 'bg-accent-green border-accent-green text-white' : 'border-white/40 hover:border-accent-indigo/50'}`}
                            >
                              {opt.isCorrect && <span className="text-[10px]">&#10003;</span>}
                            </button>
                            <input value={opt.text} onChange={(e) => updateOption(q.id, opt.id, 'text', e.target.value)} placeholder={`Option ${q.options.indexOf(opt) + 1}`} className="flex-1 rounded-xl border border-white/30 bg-white/60 px-3 py-1.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 transition-all" />
                            <button onClick={() => removeOption(q.id, opt.id)} className="text-secondary-text hover:text-danger transition-colors cursor-pointer shrink-0"><Trash2 size={12} /></button>
                          </div>
                        ))}
                        <button onClick={() => addOption(q.id)} className="text-xs text-accent-indigo hover:text-accent-indigo-light font-medium transition-colors cursor-pointer">+ Add option</button>
                      </div>
                    )}

                    {q.type === 'true_false' && (
                      <div className="flex gap-3">
                        {['true', 'false'].map((val) => (
                          <button key={val} onClick={() => setCorrectAnswer(q.id, val)} className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${q.correctAnswer === val ? 'border-accent-indigo bg-accent-indigo/5 text-accent-indigo shadow-sm' : 'border-white/30 bg-white/60 text-primary-text hover:border-accent-indigo/30'}`}>
                            {val === 'true' ? 'True' : 'False'}
                          </button>
                        ))}
                      </div>
                    )}

                    {q.type === 'fill_blank' && (
                      <div>
                        <span className="text-xs text-secondary-text block mb-1">Correct answer:</span>
                        <input value={q.correctAnswer || ''} onChange={(e) => setCorrectAnswer(q.id, e.target.value)} placeholder="Expected answer" className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 transition-all" />
                      </div>
                    )}

                    {(q.type === 'short_answer' || q.type === 'essay') && (
                      <div>
                        <span className="text-xs text-secondary-text block mb-1">{q.type === 'essay' ? 'Rubric / Grading guidelines:' : 'Model answer:'}</span>
                        <textarea value={q.correctAnswer || ''} onChange={(e) => setCorrectAnswer(q.id, e.target.value)} placeholder={q.type === 'essay' ? 'Grading rubric (key points, criteria)' : 'Model answer for reference'} className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 transition-all resize-none min-h-[60px]" />
                      </div>
                    )}

                    {q.type === 'matching' && (
                      <div className="space-y-2">
                        <span className="text-xs text-secondary-text block">Matching pairs (left → right):</span>
                        {q.matchingPairs.map((pair: any, pi: number) => (
                          <div key={pair.id} className="flex items-center gap-2">
                            <span className="text-xs text-secondary-text w-6">{pi + 1}.</span>
                            <input value={pair.left} onChange={(e) => updateMatchingPair(q.id, pair.id, 'left', e.target.value)} placeholder="Left item" className="flex-1 rounded-xl border border-white/30 bg-white/60 px-3 py-1.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 transition-all" />
                            <span className="text-secondary-text">→</span>
                            <input value={pair.right} onChange={(e) => updateMatchingPair(q.id, pair.id, 'right', e.target.value)} placeholder="Right item" className="flex-1 rounded-xl border border-white/30 bg-white/60 px-3 py-1.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 transition-all" />
                            <button onClick={() => removeMatchingPair(q.id, pair.id)} className="text-secondary-text hover:text-danger transition-colors cursor-pointer"><Trash2 size={12} /></button>
                          </div>
                        ))}
                        <button onClick={() => addMatchingPair(q.id)} className="text-xs text-accent-indigo hover:text-accent-indigo-light font-medium transition-colors cursor-pointer">+ Add pair</button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              <div className="flex flex-wrap gap-2">
                {QUESTION_TYPES.map((t) => (
                  <button key={t.value} onClick={() => addQuestion(t.value)} className="px-3 py-1.5 rounded-xl border border-white/30 bg-white/60 text-xs text-primary-text hover:border-accent-indigo/40 hover:bg-white/80 transition-all cursor-pointer">
                    + {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-white/20">
              <Button onClick={resetForm} variant="ghost" size="sm" className="rounded-xl cursor-pointer">Cancel</Button>
              <Button onClick={handleSave} loading={saving} variant="primary" size="sm" className="rounded-xl shadow-lg shadow-accent-indigo/20 cursor-pointer">
                <Save size={14} /> {editingQuizId ? 'Update Quiz' : 'Save Quiz'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-6 w-6 border-2 border-accent-indigo border-t-transparent rounded-full" />
        </div>
      ) : quizzes.length === 0 && !creating ? (
        <Card variant="glass" className="animate-scale-in">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-accent-indigo/20 to-accent-indigo-light/20 flex items-center justify-center mb-4">
              <FileQuestion size={28} className="text-accent-indigo" />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-primary-text mb-1">No quizzes yet</h3>
            <p className="text-secondary-text text-sm max-w-xs">Create assessments to test learner knowledge and track progress.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {quizzes.map((q) => (
            <Card key={q.id} variant="glass" className="border-white/30 hover:border-accent-indigo/30 transition-all duration-300 cursor-pointer" onClick={() => router.push(`/courses/${courseId}/quiz/${q.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-accent-indigo to-accent-indigo-light flex items-center justify-center text-white shadow-sm shrink-0">
                        <Trophy size={14} />
                      </div>
                      <CardTitle className="text-sm text-primary-text">{q.title}</CardTitle>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border shrink-0 ${q.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{q.status}</span>
                    </div>
                    {q.description && <p className="text-sm text-secondary-text line-clamp-1 ml-9">{q.description}</p>}
                    <div className="flex items-center gap-3 mt-2 ml-9">
                      <span className="flex items-center gap-1 text-xs text-secondary-text"><FileQuestion size={12} /> {q.questions?.length || 0} questions</span>
                      {q.timeLimit && <span className="flex items-center gap-1 text-xs text-secondary-text"><Clock size={12} /> {q.timeLimit} min</span>}
                      <span className="text-xs text-secondary-text">Pass: {q.passingScore}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    <button onClick={(e) => { e.stopPropagation(); router.push(`/courses/${courseId}/quiz/${q.id}`); }} className="text-accent-indigo hover:text-accent-indigo-light transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-accent-indigo/10" title="Take quiz">
                      <Play size={14} />
                    </button>
                    {canManage && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); handleToggleStatus(q); }} className="text-secondary-text hover:text-primary-text transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-white/30" title={q.status === 'published' ? 'Set as draft' : 'Publish'}>
                          {q.status === 'published' ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); startEdit(q); }} className="text-secondary-text hover:text-accent-indigo transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-white/30" title="Edit quiz">
                          <Pencil size={14} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(q.id); }} className="text-secondary-text hover:text-danger transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-white/30" title="Delete quiz">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
