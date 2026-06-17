'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@sohaara/ui';
import { api } from '@/lib/api';
import { Loader2, Upload, FileText, ExternalLink, CheckCircle, Clock } from 'lucide-react';

const toArray = (v: any): any[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (v.data && Array.isArray(v.data)) return v.data;
  return [];
};

export default function AssignmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [assignment, setAssignment] = useState<any>(null);
  const [mySubmission, setMySubmission] = useState<any>(null);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [links, setLinks] = useState<string[]>(['']);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [gradeData, setGradeData] = useState<Record<string, { score: string; feedback: string }>>({});

  const fetchData = useCallback(async () => {
    try {
      const ass = await api.get<any>(`/assignments/${params.assignmentId}`);
      setAssignment(ass);

      const mySub = await api.get<any>(`/assignments/${params.assignmentId}/my-submission`);
      if (mySub && mySub.id) {
        setMySubmission(mySub);
        setGradeData({ [mySub.id]: { score: mySub.score?.toString() || '', feedback: mySub.feedback || '' } });
      }

      if (ass._isInstructor) {
        const subs = await api.get<any>(`/assignments/${params.assignmentId}/submissions`);
        setAllSubmissions(toArray(subs));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [params.assignmentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const enr = await api.get<any>(`/enrollments/${params.courseId}`);
      const sub = await api.post(`/assignments/${params.assignmentId}/submit`, {
        enrollmentId: enr.id,
        content,
        links: links.filter(Boolean),
        files,
      });
      setMySubmission(sub);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGrade = async (submissionId: string) => {
    const data = gradeData[submissionId];
    if (!data || !data.score) return;
    try {
      await api.post(`/submissions/${submissionId}/grade`, {
        score: parseFloat(data.score),
        feedback: data.feedback,
      });
      await fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent-indigo" size={32} /></div>;
  if (!assignment) return <div className="text-center py-20 text-secondary-text">Assignment not found</div>;

  const isAfterDue = assignment.dueDate && new Date() > new Date(assignment.dueDate);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="text-xl text-primary-text">{assignment.title}</CardTitle>
          {assignment.description && <p className="text-sm text-secondary-text mt-1">{assignment.description}</p>}
        </CardHeader>
        <CardContent className="space-y-5">
          {assignment.instructions && (
            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 text-sm text-secondary-text border border-white/30">{assignment.instructions}</div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {[
              { label: 'Max Score', value: assignment.maxScore },
              { label: 'Passing', value: assignment.passingScore },
              { label: 'Attempts', value: assignment.maxAttempts },
              { label: 'Due', value: assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : '-' },
            ].map((s) => (
              <div key={s.label} className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                <span className="text-xs text-secondary-text">{s.label}</span>
                <p className="font-bold text-primary-text text-lg">{s.value}</p>
              </div>
            ))}
          </div>

          {mySubmission?.status === 'graded' && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <CheckCircle size={20} className="text-emerald-500" />
              <div>
                <p className="font-bold text-emerald-700">Graded: {mySubmission.score} / {assignment.maxScore}</p>
                {mySubmission.feedback && <p className="text-sm text-emerald-600 mt-0.5">{mySubmission.feedback}</p>}
              </div>
            </div>
          )}

          {!mySubmission ? (
            <div className="space-y-4">
              {isAfterDue && !assignment.allowLateSubmission && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                  <Clock size={16} /> Due date has passed. Late submission not allowed.
                </div>
              )}
              <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your submission..." className="w-full bg-white/50 backdrop-blur-sm rounded-xl p-4 text-sm text-primary-text placeholder:text-secondary-text min-h-[120px] outline-none border border-white/30 focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all resize-none" />
              <div className="space-y-3">
                <span className="text-xs text-secondary-text font-medium uppercase tracking-wider">Links</span>
                {links.map((link, i) => (
                  <input key={i} value={link} onChange={(e) => { const next = [...links]; next[i] = e.target.value; setLinks(next); }} placeholder="https://" className="w-full bg-white/50 backdrop-blur-sm rounded-xl px-4 py-2.5 text-sm text-primary-text placeholder:text-secondary-text outline-none border border-white/30 focus:border-accent-indigo/50 transition-all" />
                ))}
                <button onClick={() => setLinks([...links, ''])} className="text-xs text-accent-indigo hover:text-accent-indigo-light font-medium transition-colors cursor-pointer">+ Add link</button>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 cursor-pointer hover:bg-white/60 transition-colors">
                <Upload size={16} className="text-secondary-text" />
                <span className="text-sm text-secondary-text">Click to upload files (coming soon)</span>
              </div>
              <Button onClick={handleSubmit} loading={submitting} disabled={isAfterDue && !assignment.allowLateSubmission} variant="primary" className="w-full rounded-xl shadow-lg shadow-accent-indigo/20 cursor-pointer">
                Submit Assignment
              </Button>
            </div>
          ) : mySubmission.status === 'graded' ? (
            <Button variant="outline" className="w-full rounded-xl" disabled>Already Graded</Button>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30">
              <Clock size={20} className="text-accent-indigo" />
              <div>
                <p className="font-bold text-primary-text">Submitted</p>
                <p className="text-sm text-secondary-text">{new Date(mySubmission.submittedAt).toLocaleString()} &middot; Attempt #{mySubmission.attemptNumber}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {allSubmissions.length > 0 && (
        <div className="animate-stagger">
          <h3 className="text-lg font-bold tracking-tight text-primary-text mb-3">Submissions ({allSubmissions.length})</h3>
          <div className="space-y-3">
            {allSubmissions.map((sub) => (
              <Card key={sub.id} variant="glass">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent-indigo/20 to-accent-indigo-light/20 flex items-center justify-center text-xs font-semibold text-accent-indigo">
                        {sub.user?.firstName?.[0]}{sub.user?.lastName?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-primary-text">{sub.user?.firstName} {sub.user?.lastName}</p>
                        <p className="text-xs text-secondary-text">Attempt #{sub.attemptNumber} &middot; {new Date(sub.submittedAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-xl font-medium border ${sub.status === 'graded' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                      {sub.status}
                    </span>
                  </div>

                  {sub.content && <p className="text-sm bg-white/50 backdrop-blur-sm rounded-xl p-3 text-secondary-text border border-white/20">{sub.content}</p>}

                  {sub.status !== 'graded' && (
                    <div className="space-y-3 pt-3 border-t border-white/30">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-secondary-text">Score:</span>
                        <input type="number" value={gradeData[sub.id]?.score || ''} onChange={(e) => setGradeData({ ...gradeData, [sub.id]: { ...gradeData[sub.id], score: e.target.value } })} placeholder="Score" className="w-24 bg-white/50 rounded-xl px-3 py-1.5 text-sm text-primary-text outline-none border border-white/30 focus:border-accent-indigo/50 transition-all" />
                        <span className="text-xs text-secondary-text">/ {assignment.maxScore}</span>
                      </div>
                      <textarea value={gradeData[sub.id]?.feedback || ''} onChange={(e) => setGradeData({ ...gradeData, [sub.id]: { ...gradeData[sub.id], feedback: e.target.value } })} placeholder="Feedback" className="w-full bg-white/50 rounded-xl p-3 text-sm text-primary-text placeholder:text-secondary-text min-h-[60px] outline-none border border-white/30 focus:border-accent-indigo/50 transition-all resize-none" />
                      <Button onClick={() => handleGrade(sub.id)} size="sm" variant="primary" className="rounded-xl cursor-pointer">Submit Grade</Button>
                    </div>
                  )}

                  {sub.status === 'graded' && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm">
                      <CheckCircle size={14} className="text-emerald-500" />
                      <span className="font-medium text-emerald-700">{sub.score} pts</span>
                      {sub.feedback && <span className="text-emerald-600">&mdash; {sub.feedback}</span>}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
