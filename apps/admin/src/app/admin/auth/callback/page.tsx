/**
 * /admin/auth/callback — single OIDC callback for the admin app.
 *
 * Same flow as web: oidc-client-ts handles the code→token exchange,
 * then we route on `state.mode` for post-auth destination. mode='reset'
 * skips LMS-token minting and bounces to /admin/auth/start?reset=done.
 * mode='login'|'register' calls /api/v1/auth/keycloak/exchange and
 * saves the LMS session.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@sohaara/ui';
import { AlertCircle } from 'lucide-react';
import { getUserManager, AuthMode } from '@/lib/oidc';
import { saveAuth } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function readStateMode(value: unknown): AuthMode {
  if (value === 'login' || value === 'register' || value === 'reset') return value;
  return 'login';
}

export default function CallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(searchParams.get('error_description') || errorParam);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const user = await getUserManager().signinCallback();
        if (cancelled || !user) return;

        const mode = readStateMode((user.state as any)?.mode);
        const returnTo = (user.state as any)?.returnTo as string | undefined;

        if (mode === 'reset') {
          router.replace('/admin/auth/start?reset=done');
          return;
        }

        if (!user.access_token) {
          throw new Error('Keycloak did not return an access_token');
        }

        const res = await fetch(`${API_URL}/api/v1/auth/keycloak/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: user.access_token }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || `Exchange failed (HTTP ${res.status})`);
        }

        const data = await res.json();
        saveAuth(data);

        router.replace(returnTo || '/admin/dashboard');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    })();

    return () => { cancelled = true; };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-bg px-4">
      <div className="w-full max-w-md text-center space-y-4">
        {error ? (
          <>
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-red-900/30 mb-2">
              <AlertCircle size={28} className="text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Authentication failed</h1>
            <p className="text-secondary-text text-sm">{error}</p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="primary" className="rounded-xl" onClick={() => router.replace('/admin/auth/start')}>
                Back to sign in
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-white/5 border border-border/40 mb-2">
              <div className="h-6 w-6 rounded-full border-2 border-accent-indigo border-t-transparent animate-spin" />
            </div>
            <h1 className="text-2xl font-bold gradient-text">Signing you in…</h1>
            <p className="text-secondary-text text-sm">Just a moment.</p>
          </>
        )}
      </div>
    </div>
  );
}