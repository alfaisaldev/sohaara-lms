/**
 * /auth/callback — the SINGLE universal OIDC callback handler for the
 * LMS web app.
 *
 * `oidc-client-ts` owns the PKCE state, code→token exchange, and
 * persistent storage. We call `signinCallback()` once and then route on
 * `user.state.mode` for post-auth destination only:
 *
 *   mode='login' | 'register' → exchange Keycloak access_token for
 *                               LMS tokens (POST /auth/keycloak/exchange),
 *                               save them, navigate to returnTo/dashboard.
 *   mode='reset'              → no LMS tokens; back to /auth/start?reset=done.
 *
 * Hard rule: the LMS never sees, stores, or hashes a password. The
 * Keycloak access_token is the only credential that crosses the LMS
 * boundary, and it is exchanged for the LMS's own HS256 JWT before any
 * downstream LMS code reads it.
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
        const inviteToken = (user.state as any)?.inviteToken as string | undefined;

        if (mode === 'reset') {
          // Reset mode: Keycloak handled the reset UI. No LMS tokens to mint.
          router.replace('/auth/start?reset=done');
          return;
        }

        if (!user.access_token) {
          throw new Error('Keycloak did not return an access_token');
        }

        const res = await fetch(`${API_URL}/api/v1/auth/keycloak/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: user.access_token,
            inviteToken: inviteToken || undefined,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || `Exchange failed (HTTP ${res.status})`);
        }

        const data = await res.json();
        saveAuth(data);

        router.replace(returnTo || '/dashboard');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    })();

    return () => { cancelled = true; };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
      <div className="w-full max-w-md text-center space-y-4">
        {error ? (
          <>
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-red-50 mb-2">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-primary-text">Authentication failed</h1>
            <p className="text-secondary-text text-sm">{error}</p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="primary" className="rounded-xl" onClick={() => router.replace('/auth/start')}>
                Back to sign in
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-accent-indigo/10 mb-2">
              <div className="h-6 w-6 rounded-full border-2 border-accent-indigo border-t-transparent animate-spin" />
            </div>
            <h1 className="text-2xl font-bold gradient-text">Signing you in…</h1>
            <p className="text-secondary-text text-sm">Just a moment while we finish setting up your session.</p>
          </>
        )}
      </div>
    </div>
  );
}