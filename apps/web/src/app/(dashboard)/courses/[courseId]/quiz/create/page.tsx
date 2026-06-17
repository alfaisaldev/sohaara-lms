'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@sohaara/ui';
import { api } from '@/lib/api';
import { ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-react';

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'multiple_select', label: 'Multiple Select' },
  { value: 'fill_blank', label: 'Fill in the Blank' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'essay', label: 'Essay' },
];

export default function QuizCreatePage() {
  const params = useParams();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [timeLimit, setTimeLimit] = useState<number | ''>('');
  const [passingScore, setPassingScore] = useState(60);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const addQuestion = (type: string) => {
    const q: any = {
      id: `q-${Date.now()}`,
      type,
      title: '',
      description: '',
      points: 1,
      options: [],
      correctAnswer: null,
    };
    if (type === 'multiple_choice' || type === 'multiple_select') {
      q.options = [
        { id: `opt-${Date.now()}-1`, text: '' },
        { id: `opt-${Date.now()}-2`, text: '' },
      ];
    }
    setQuestions([...questions, q]);
  };

  const removeQuestion = (id: string) => setQuestions(questions.filter((q) => q.id !== id));

  const updateQuestion = (id: string, field: string, value: any) =>
    setQuestions(questions.map((q) => (q.id === id ? { ...q, [field]: value } : q)));

  const addOption = (qId: string) =>
    setQuestions(questions.map((q) => q.id === qId ? { ...q, options: [...q.options, { id: `opt-${Date.now()}`, text: '' }] } : q));

  const updateOption = (qId: string, optId: string, text: string) =>
    setQuestions(questions.map((q) => q.id === qId ? { ...q, options: q.options.map((o: any) => o.id === optId ? { ...o, text } : o) } : q));

  const removeOption = (qId: string, optId: string) =>
    setQuestions(questions.map((q) => q.id === qId ? { ...q, options: q.options.filter((o: any) => o.id !== optId) } : q));

  const setCorrectAnswer = (qId: string, value: string) =>
    setQuestions(questions.map((q) => q.id === qId ? { ...q, correctAnswer: value } : q));

  const handleSave = async () => {
    if (!title.trim()) return alert('Title is required');
    setSaving(true);
    try {
      const quiz: any = await api.post(`/courses/${params.courseId}/quizzes`, {
        title, description, instructions,
        timeLimit: timeLimit || null,
        passingScore, maxAttempts, shuffleQuestions,
      });
      for (const q of questions) {
        await api.post(`/quizzes/${quiz.id}/questions`, q);
      }
      router.push(`/courses/${params.courseId}/quiz/${quiz.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-secondary-text hover:text-primary-text transition-colors cursor-pointer">
          <ArrowLeft size={16} /> Back
        </button>
      </div>
      <h2 className="text-xl font-bold tracking-tight text-primary-text">Create Quiz</h2>

      <Card variant="glass">
        <CardContent className="p-5 space-y-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quiz title" className="w-full text-lg font-bold text-primary-text bg-transparent border-b border-white/30 pb-2 outline-none focus:border-accent-indigo/50 transition-all placeholder:text-secondary-text" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all resize-none min-h-[60px]" />
          <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Instructions (optional)" className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all resize-none min-h-[60px]" />
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-secondary-text">Time Limit (min)</label>
              <input type="number" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value ? parseInt(e.target.value) : '')} className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all mt-1" />
            </div>
            <div>
              <label className="text-xs text-secondary-text">Passing Score (%)</label>
              <input type="number" value={passingScore} onChange={(e) => setPassingScore(parseInt(e.target.value))} className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all mt-1" />
            </div>
            <div>
              <label className="text-xs text-secondary-text">Max Attempts</label>
              <input type="number" value={maxAttempts} onChange={(e) => setMaxAttempts(parseInt(e.target.value))} className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all mt-1" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-primary-text cursor-pointer">
            <input type="checkbox" checked={shuffleQuestions} onChange={(e) => setShuffleQuestions(e.target.checked)} className="h-4 w-4 accent-accent-indigo rounded" />
            Shuffle questions
          </label>
        </CardContent>
      </Card>

      <div className="text-sm font-bold text-secondary-text">
        Questions ({questions.length})
      </div>

      {questions.map((q, qi) => (
        <Card key={q.id} variant="glass">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-secondary-text font-mono">Q{qi + 1} &middot; {QUESTION_TYPES.find(t => t.value === q.type)?.label}</span>
              <button onClick={() => removeQuestion(q.id)} className="text-secondary-text hover:text-danger transition-colors cursor-pointer"><Trash2 size={14} /></button>
            </div>
            <input value={q.title} onChange={(e) => updateQuestion(q.id, 'title', e.target.value)} placeholder="Question title" className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all" />
            <textarea value={q.description} onChange={(e) => updateQuestion(q.id, 'description', e.target.value)} placeholder="Description (optional)" className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all resize-none min-h-[50px]" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-secondary-text">Points:</span>
              <input type="number" value={q.points} onChange={(e) => updateQuestion(q.id, 'points', parseInt(e.target.value) || 0)} className="w-16 rounded-xl border border-white/30 bg-white/60 px-3 py-1.5 text-sm text-primary-text outline-none focus:border-accent-indigo/50 transition-all" />
            </div>

            {(q.type === 'multiple_choice' || q.type === 'multiple_select') && (
              <div className="space-y-2">
                {q.options.map((opt: any) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <input type={q.type === 'multiple_choice' ? 'radio' : 'checkbox'} name={`correct-${q.id}`} checked={q.type === 'multiple_choice' ? q.correctAnswer === opt.id : (q.correctAnswer || []).includes(opt.id)} onChange={() => q.type === 'multiple_choice' ? setCorrectAnswer(q.id, opt.id) : setCorrectAnswer(q.id, (q.correctAnswer || []).includes(opt.id) ? q.correctAnswer.filter((id: string) => id !== opt.id) : [...(q.correctAnswer || []), opt.id])} className="h-4 w-4 accent-accent-indigo cursor-pointer" />
                    <input value={opt.text} onChange={(e) => updateOption(q.id, opt.id, e.target.value)} placeholder={`Option ${opt.id.slice(-1)}`} className="flex-1 rounded-xl border border-white/30 bg-white/60 px-3 py-1.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 transition-all" />
                    <button onClick={() => removeOption(q.id, opt.id)} className="text-secondary-text hover:text-danger transition-colors cursor-pointer"><Trash2 size={12} /></button>
                  </div>
                ))}
                <button onClick={() => addOption(q.id)} className="text-xs text-accent-indigo hover:text-accent-indigo-light font-medium transition-colors cursor-pointer">+ Add option</button>
              </div>
            )}

            {q.type === 'true_false' && (
              <div className="flex gap-3">
                {['true', 'false'].map((val) => (
                  <button key={val} onClick={() => setCorrectAnswer(q.id, val)} className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                    q.correctAnswer === val
                      ? 'border-accent-indigo bg-accent-indigo/5 text-accent-indigo shadow-sm'
                      : 'border-white/30 bg-white/60 text-primary-text hover:border-accent-indigo/30'
                  }`}>
                    {val === 'true' ? 'True' : 'False'}
                  </button>
                ))}
              </div>
            )}

            {q.type === 'fill_blank' && (
              <div>
                <span className="text-xs text-secondary-text">Correct answer:</span>
                <input value={q.correctAnswer || ''} onChange={(e) => setCorrectAnswer(q.id, e.target.value)} placeholder="Expected answer" className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all mt-1" />
              </div>
            )}

            {q.type === 'short_answer' && (
              <div>
                <span className="text-xs text-secondary-text">Model answer (reference for grading):</span>
                <textarea value={q.correctAnswer || ''} onChange={(e) => setCorrectAnswer(q.id, e.target.value)} placeholder="Model answer" className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all resize-none mt-1 min-h-[60px]" />
              </div>
            )}

            {q.type === 'essay' && (
              <div>
                <span className="text-xs text-secondary-text">Rubric / Guidelines:</span>
                <textarea value={q.correctAnswer || ''} onChange={(e) => setCorrectAnswer(q.id, e.target.value)} placeholder="Grading rubric" className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all resize-none mt-1 min-h-[80px]" />
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-wrap gap-2">
        {QUESTION_TYPES.map((t) => (
          <button key={t.value} onClick={() => addQuestion(t.value)} className="px-3 py-1.5 rounded-xl border border-white/30 bg-white/60 text-sm text-primary-text hover:border-accent-indigo/40 hover:bg-white/80 transition-all cursor-pointer">
            + {t.label}
          </button>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button onClick={() => router.back()} variant="ghost" className="rounded-xl cursor-pointer">Cancel</Button>
        <Button onClick={handleSave} loading={saving} variant="primary" className="rounded-xl shadow-lg shadow-accent-indigo/20 cursor-pointer">Save Quiz</Button>
      </div>
    </div>
  );
}
