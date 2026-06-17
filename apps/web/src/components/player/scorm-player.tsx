'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { Loader2, AlertCircle } from 'lucide-react';

interface ScormPlayerProps {
  entryUrl: string;
  lessonId: string;
  enrollmentId: string;
  onComplete: () => void;
}

function toProxyUrl(entryUrl: string): string {
  try {
    const u = new URL(entryUrl);
    const match = u.pathname.match(/^\/uploads\/scorm\/(.+)/);
    if (match) return `/api/scorm-content/${match[1]}`;
  } catch {}
  return entryUrl;
}

export function ScormPlayer({ entryUrl, lessonId, enrollmentId, onComplete }: ScormPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const completedRef = useRef(false);
  const proxyUrl = toProxyUrl(entryUrl);
  const bridgeRef = useRef<any>(null);
  const lessonIdRef = useRef(lessonId);
  const enrollmentIdRef = useRef(enrollmentId);
  const onCompleteRef = useRef(onComplete);
  lessonIdRef.current = lessonId;
  enrollmentIdRef.current = enrollmentId;
  onCompleteRef.current = onComplete;

  if (!bridgeRef.current) {
    const values: Record<string, string> = {};
    let suspendData = '';

    const track = async (status: string, score?: number, timeSpent?: number) => {
      try {
        await api.post('/scorm/track', {
          lessonId: lessonIdRef.current,
          enrollmentId: enrollmentIdRef.current,
          completed: completedRef.current || status === 'completed' || status === 'passed',
          score,
          timeSpent,
          suspendData,
        });
      } catch {}
    };

    const onDone = () => {
      if (!completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current();
      }
    };

    const toScore = (v: string | undefined) => { const n = parseInt(v || ''); return isNaN(n) ? undefined : n; };

    const api12 = {
      LMSInitialize: () => 'true',
      LMSFinish: () => {
        const status = values['cmi.core.lesson_status'] || '';
        track(status, toScore(values['cmi.core.score.raw']));
        onDone();
        return 'true';
      },
      LMSGetValue: (name: string) => values[name] || '',
      LMSSetValue: (name: string, value: string) => {
        values[name] = value;
        if (name === 'cmi.suspend_data') suspendData = value;
        return 'true';
      },
      LMSCommit: () => {
        const status = values['cmi.core.lesson_status'] || '';
        track(status, toScore(values['cmi.core.score.raw']));
        return 'true';
      },
      LMSGetLastError: () => '0',
      LMSGetErrorString: () => 'No error',
      LMSGetDiagnostic: () => 'No error',
    };

    const api2004 = {
      Initialize: () => 'true',
      Terminate: () => {
        const status = values['cmi.completion_status'] || 'unknown';
        track(status, toScore(values['cmi.score.raw']));
        onDone();
        return 'true';
      },
      GetValue: (name: string) => values[name] || '',
      SetValue: (name: string, value: string) => {
        values[name] = value;
        if (name === 'cmi.suspend_data') suspendData = value;
        return 'true';
      },
      Commit: () => {
        const status = values['cmi.completion_status'] || values['cmi.core.lesson_status'] || '';
        const sr = toScore(values['cmi.score.raw']); const cr = toScore(values['cmi.core.score.raw']); track(status, sr !== undefined ? sr : cr);
        return 'true';
      },
      GetLastError: () => '0',
      GetErrorString: () => 'No error',
      GetDiagnostic: () => 'No error',
    };

    bridgeRef.current = { api12, api2004 };
  }

  if (typeof window !== 'undefined' && bridgeRef.current) {
    (window as any).API = bridgeRef.current.api12;
    (window as any).API_1484_11 = bridgeRef.current.api2004;
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'scorm-complete' && !completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <p className="text-secondary-text">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height: '70vh' }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="animate-spin text-accent-indigo" size={32} />
            <p className="text-sm text-secondary-text">Loading SCORM package...</p>
          </div>
        </div>
      )}
      {mounted && (
        <iframe
          ref={iframeRef}
          src={proxyUrl}
          className="w-full h-full rounded-xl border border-white/30 bg-white"
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError('Failed to load SCORM package'); }}
          allow="fullscreen"
          title="SCORM Content"
        />
      )}
    </div>
  );
}
