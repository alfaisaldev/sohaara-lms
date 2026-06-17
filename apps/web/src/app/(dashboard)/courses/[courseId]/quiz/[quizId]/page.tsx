'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@sohaara/ui';
import { api } from '@/lib/api';
import {
  Loader2, Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight,
  Trophy, Star, XCircle
} from 'lucide-react';

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const [quiz, setQuiz] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [matchingAnswers, setMatchingAnswers] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);

  const questions = quiz?.questions || [];
  const totalQuestions = questions.length;
  const answeredCount = useMemo(() =>
    questions.filter((q: any) => {
      if (answers[q.id] !== undefined) return true;
      if (answers[`${q.id}_multi`]?.length > 0) return true;
      if (matchingAnswers[q.id] && typeof matchingAnswers[q.id] === 'object' && Object.keys(matchingAnswers[q.id]!).length > 0) return true;
      return false;
    }).length,
  [answers, matchingAnswers, questions]);

  useEffect(() => {
    api.get<any>(`/quizzes/${params.quizId}`)
      .then(setQuiz)
      .catch(() => router.back())
      .finally(() => setLoading(false));
  }, [params.quizId]);

  const startAttempt = async () => {
    try {
      const enr = await api.get<any>(`/enrollments/${params.courseId}`);
      const att = await api.post(`/quizzes/${params.quizId}/attempts`, { enrollmentId: enr.id });
      setAttempt(att);
      setStarted(true);
      if (quiz.timeLimit) setTimeLeft(quiz.timeLimit * 60);
    } catch (err) {
      console.error('Failed to start attempt', err);
    }
  };

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, started]);

  const submitAnswer = async (questionId: string) => {
    if (!attempt) return;
    try {
      await api.post(`/attempts/${attempt.id}/answers`, {
        questionId,
        answer: answers[questionId],
        answers: answers[`${questionId}_multi`],
        matchingAnswer: matchingAnswers[questionId],
      });
    } catch {}
  };

  const handleSubmit = async () => {
    if (!attempt || submitting) return;
    setSubmitting(true);
    try {
      for (const q of questions) await submitAnswer(q.id);
      const res = await api.post(`/attempts/${attempt.id}/submit`);
      setResult(res);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isAnswered = (q: any) => {
    if (answers[q.id] !== undefined && answers[q.id] !== '' && answers[q.id] !== null) return true;
    if (q.type === 'multiple_select' && answers[`${q.id}_multi`]?.length > 0) return true;
    if (q.type === 'matching' && matchingAnswers[q.id] && typeof matchingAnswers[q.id] === 'object' && Object.keys(matchingAnswers[q.id]!).length > 0) return true;
    return false;
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent-indigo" size={32} /></div>;
  if (!quiz) return null;

  if (result) {
    const finalScore = result.score || 0;
    const maxScore = result.maxScore || 0;
    const percentage = result.percentage || 0;
    const passed = result.passed || percentage >= (quiz.passingScore || 70);
    const starCount = percentage >= 90 ? 5 : percentage >= 75 ? 4 : percentage >= 60 ? 3 : percentage >= 40 ? 2 : 1;

    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
        <Card variant="glass" className="overflow-hidden">
          <div className="relative h-2 w-full bg-white/20">
            <div
              className={`h-full transition-all duration-1000 ${passed ? 'bg-gradient-to-r from-accent-indigo via-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-red-400 to-red-500'}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <CardContent className="p-8 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`h-24 w-24 rounded-full blur-xl animate-ping opacity-30 ${passed ? 'bg-emerald-400' : 'bg-red-400'}`} />
              </div>
              <div className={`h-24 w-24 rounded-full mx-auto flex items-center justify-center relative animate-bounce ${passed ? 'bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400' : 'bg-gradient-to-br from-red-400 to-red-500'}`}>
                {passed ? <Trophy size={40} className="text-white" /> : <XCircle size={40} className="text-white" />}
              </div>
            </div>

            <h2 className={`text-4xl font-bold tracking-tight mb-2 ${passed ? 'text-emerald-600' : 'text-red-500'}`}>
              {passed ? 'Quiz Complete!' : 'Keep Trying'}
            </h2>
            <p className="text-secondary-text text-lg mb-4">
              {passed
                ? 'Great work! You passed the quiz.'
                : 'Don\'t give up — review and try again.'}
            </p>

            <div className="flex justify-center gap-1 mb-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={28}
                  className={`transition-all duration-500 ${i < starCount ? 'text-amber-400 fill-amber-400 animate-pulse' : 'text-gray-300'}`}
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>

            <div className="inline-flex items-center gap-3 mb-6 px-6 py-3 rounded-2xl bg-white/50 backdrop-blur-sm border border-white/30">
              <span className="text-4xl font-bold bg-gradient-to-r from-accent-indigo to-emerald-400 bg-clip-text text-transparent">
                {percentage}%
              </span>
              <span className="text-secondary-text text-sm">
                ({finalScore}/{maxScore} pts)
              </span>
            </div>

            <div className="flex justify-center gap-6 text-sm text-secondary-text mb-6">
              <div className="flex items-center gap-1.5">
                <Clock size={14} />
                {Math.floor((result.timeSpent || 0) / 60)}m {result.timeSpent % 60}s
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-emerald-500" />
                {answeredCount}/{totalQuestions} answered
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {questions.map((_: any, i: number) => (
                <div key={i} className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  i < starCount * (totalQuestions / 5)
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-700'
                    : 'bg-red-50 border-red-300 text-red-500'
                }`}>
                  {i + 1}
                </div>
              ))}
            </div>

            <Button
              onClick={() => router.push(`/courses/${params.courseId}`)}
              variant="primary"
              className="rounded-xl shadow-lg shadow-accent-indigo/20 h-12 px-8 cursor-pointer"
            >
              Back to Course
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="max-w-2xl mx-auto animate-scale-in">
        <Card variant="glass" className="overflow-hidden">
          <div className="h-2 w-full bg-gradient-to-r from-accent-indigo via-accent-indigo-light to-emerald-400" />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent-indigo to-accent-indigo-light flex items-center justify-center text-white shadow-lg">
                <Trophy size={20} />
              </div>
              <div>
                <CardTitle className="text-2xl text-primary-text">{quiz.title}</CardTitle>
                {quiz.description && <p className="text-secondary-text text-sm mt-0.5">{quiz.description}</p>}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {quiz.instructions && (
              <div className="glass rounded-xl p-4 text-sm text-secondary-text border border-white/30">
                {quiz.instructions}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: 'Questions', value: totalQuestions, icon: '?' },
                ...(quiz.timeLimit ? [{ label: 'Time Limit', value: `${quiz.timeLimit} min`, icon: <Clock size={14} /> }] : []),
                { label: 'Passing Score', value: `${quiz.passingScore}%`, icon: '%' },
                { label: 'Max Attempts', value: quiz.maxAttempts, icon: '#' },
              ].map((s: any) => (
                <div key={s.label} className="glass rounded-xl p-4 border border-white/30">
                  <span className="text-xs text-secondary-text">{s.label}</span>
                  <p className="font-bold text-primary-text text-lg">{s.value}</p>
                </div>
              ))}
            </div>
            <Button
              onClick={startAttempt}
              variant="primary"
              className="w-full rounded-xl shadow-lg shadow-accent-indigo/20 h-12 text-base cursor-pointer"
            >
              Start Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const q = questions[currentQ];
  if (!q) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold tracking-tight text-primary-text">{quiz.title}</h2>
          <span className="text-xs text-secondary-text bg-white/50 px-2 py-0.5 rounded-lg font-mono">
            {currentQ + 1}/{totalQuestions}
          </span>
        </div>
        {timeLeft !== null && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-mono border transition-all ${
            timeLeft < 60
              ? 'text-red-500 border-red-200 bg-red-50 animate-pulse'
              : timeLeft < 300
                ? 'text-amber-700 border-amber-200 bg-amber-50'
                : 'text-secondary-text border-white/30 bg-white/50'
          }`}>
            <Clock size={16} />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 animate-fade-in-up">
        {questions.map((_: any, i: number) => {
          const isCur = i === currentQ;
          const ans = isAnswered(questions[i]);
          return (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              className={`h-7 flex-1 rounded-md text-[10px] font-bold transition-all duration-200 border cursor-pointer ${
                isCur
                  ? 'bg-accent-indigo text-white border-accent-indigo shadow-md scale-110'
                  : ans
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                    : 'bg-white/50 text-secondary-text border-white/30 hover:border-accent-indigo/30'
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <div className="h-1.5 w-full rounded-full bg-white/30 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent-indigo to-emerald-400 transition-all duration-500"
          style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
        />
      </div>

      <Card key={q.id} variant="glass" className="animate-fade-in-up">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-secondary-text font-mono bg-white/50 px-2.5 py-1 rounded-lg border border-white/30">
                  Question {currentQ + 1}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-accent-indigo/10 text-accent-indigo font-medium border border-accent-indigo/20 capitalize">
                  {q.type.replace(/_/g, ' ')}
                </span>
              </div>
              <h3 className="text-lg font-bold text-primary-text leading-relaxed">{q.title}</h3>
              {q.description && <p className="text-sm text-secondary-text mt-2 leading-relaxed">{q.description}</p>}
            </div>
            <span className="text-xs text-secondary-text ml-3 bg-white/50 px-2 py-1 rounded-lg font-mono whitespace-nowrap">
              {q.points} pt{q.points !== 1 ? 's' : ''}
            </span>
          </div>

          {q.type === 'multiple_choice' && (
            <div className="space-y-2">
              {q.options?.map((opt: any) => (
                <label key={opt.id} className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                  answers[q.id] === opt.id
                    ? 'border-accent-indigo bg-accent-indigo/5 shadow-md shadow-accent-indigo/5'
                    : 'border-white/30 bg-white/40 hover:border-accent-indigo/30 hover:bg-white/60'
                }`}>
                  <input
                    type="radio" name={q.id} value={opt.id}
                    checked={answers[q.id] === opt.id}
                    onChange={(e) => { setAnswers({ ...answers, [q.id]: e.target.value }); submitAnswer(q.id); }}
                    className="h-4 w-4 text-accent-indigo accent-accent-indigo cursor-pointer"
                  />
                  <span className="text-sm text-primary-text">{opt.text}</span>
                </label>
              ))}
            </div>
          )}

          {q.type === 'true_false' && (
            <div className="flex gap-3">
              {['true', 'false'].map((val) => (
                <button
                  key={val}
                  onClick={() => { setAnswers({ ...answers, [q.id]: val }); submitAnswer(q.id); }}
                  className={`flex-1 py-3.5 rounded-xl border text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    answers[q.id] === val
                      ? 'border-accent-indigo bg-accent-indigo/5 text-accent-indigo shadow-md'
                      : 'border-white/30 bg-white/40 hover:border-accent-indigo/30 text-primary-text hover:bg-white/60'
                  }`}
                >
                  {val === 'true' ? 'True' : 'False'}
                </button>
              ))}
            </div>
          )}

          {q.type === 'multiple_select' && (
            <div className="space-y-2">
              {q.options?.map((opt: any) => {
                const selected = answers[`${q.id}_multi`] || [];
                const isChecked = selected.includes(opt.id);
                return (
                  <label key={opt.id} className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                    isChecked
                      ? 'border-accent-indigo bg-accent-indigo/5 shadow-md'
                      : 'border-white/30 bg-white/40 hover:border-accent-indigo/30 hover:bg-white/60'
                  }`}>
                    <input
                      type="checkbox" checked={isChecked}
                      onChange={() => {
                        const next = isChecked
                          ? selected.filter((id: string) => id !== opt.id)
                          : [...selected, opt.id];
                        setAnswers({ ...answers, [`${q.id}_multi`]: next });
                      }}
                      className="h-4 w-4 text-accent-indigo rounded accent-accent-indigo cursor-pointer"
                    />
                    <span className="text-sm text-primary-text">{opt.text}</span>
                  </label>
                );
              })}
            </div>
          )}

          {q.type === 'fill_blank' && (
            <input
              value={answers[q.id] || ''}
              onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
              onBlur={() => submitAnswer(q.id)}
              className="w-full rounded-xl border border-white/30 bg-white/50 px-4 py-3 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all"
              placeholder="Type your answer..."
            />
          )}

          {q.type === 'short_answer' && (
            <textarea
              value={answers[q.id] || ''}
              onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
              className="w-full rounded-xl border border-white/30 bg-white/50 px-4 py-3 text-sm text-primary-text placeholder:text-secondary-text min-h-[90px] outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all resize-none"
              placeholder="Type your answer..."
            />
          )}

          {q.type === 'essay' && (
            <textarea
              value={answers[q.id] || ''}
              onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
              className="w-full rounded-xl border border-white/30 bg-white/50 px-4 py-3 text-sm text-primary-text placeholder:text-secondary-text min-h-[160px] outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all resize-none"
              placeholder="Write your essay..."
            />
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between animate-fade-in-up">
        <Button
          onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
          disabled={currentQ === 0}
          variant="ghost"
          size="sm"
          className="rounded-xl gap-1.5 cursor-pointer"
        >
          <ChevronLeft size={16} />
          Previous
        </Button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary-text font-mono bg-white/50 px-2.5 py-1 rounded-lg border border-white/30">
            {answeredCount}/{totalQuestions} answered
          </span>
          {currentQ === totalQuestions - 1 ? (
            <Button
              onClick={handleSubmit}
              loading={submitting}
              variant="primary"
              size="sm"
              className="rounded-xl shadow-lg shadow-accent-indigo/20 cursor-pointer"
            >
              Submit Quiz
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentQ(Math.min(totalQuestions - 1, currentQ + 1))}
              variant="primary"
              size="sm"
              className="rounded-xl gap-1.5 shadow-lg shadow-accent-indigo/20 cursor-pointer"
            >
              Next
              <ChevronRight size={16} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
