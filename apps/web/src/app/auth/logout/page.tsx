/**
 * /auth/logout — initiates the OIDC end-session redirect.
 *
 * Calls `userManager.signoutRedirect()` which:
 *   1. Persists `state` (so /auth/logged-out can verify the redirect).
 *   2. Sends the browser to Keycloak's end-session endpoint.
 *   3. Keycloak clears its AUTH_SESSION_ID cookie, then redirects back
 *      to /auth/logged-out (the post-logout redirect URI).
 *
 * The LMS's localStorage (accessToken / refreshToken / user / roles /
 * permissions) is NOT cleared here — it's cleared by /auth/logged-out
 * after the round-trip, so a failed logout doesn't leave the LMS in a
 * half-cleared state.
 */

'use client';

// Force the page to render dynamically — `oidc-client-ts` uses
// `localStorage` and cannot be evaluated during Next.js static prerender.
// Note: must come AFTER `'use client'` (Next.js requires that directive
// to be the first statement of a client component file).
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@sohaara/ui';
import { AlertCircle } from 'lucide-react';
import { getUserManager, OidcState } from '@/lib/oidc';

export default function LogoutPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const um = (await getUserManager()) as any;
        const user = await um.getUser();
        // If there's no Keycloak session at all (already signed out, or
        // session cookie expired), skip Keycloak and head straight to
        // the post-logout landing.
        if (!user) {
          window.location.href = '/auth/logged-out';
          return;
        }
        const state: OidcState = { mode: 'login', returnTo: '/' };
        await um.signoutRedirect({
          state,
          // Tell Keycloak to bounce back here after the end-session
          // round-trip completes.
          post_logout_redirect_uri: `${window.location.origin}/auth/logged-out`,
        });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Logout failed');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
      <div className="w-full max-w-md text-center space-y-4">
        {error ? (
          <>
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-red-50 mb-2">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-primary-text">Couldn&apos;t sign you out</h1>
            <p className="text-secondary-text text-sm">{error}</p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="primary" className="rounded-xl" onClick={() => router.replace('/auth/logged-out')}>
                Continue anyway
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-accent-indigo/10 mb-2">
              <div className="h-6 w-6 rounded-full border-2 border-accent-indigo border-t-transparent animate-spin" />
            </div>
            <h1 className="text-2xl font-bold gradient-text">Signing you out…</h1>
            <p className="text-secondary-text text-sm">Clearing your Sohaara Identity session.</p>
          </>
        )}
      </div>
    </div>
  );
}