/**
 * /admin/auth/logout — initiates the OIDC end-session redirect for
 * the admin app. Same shape as web's /auth/logout but routes to
 * /admin/auth/logged-out on completion.
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
        if (!user) {
          window.location.href = '/admin/auth/logged-out';
          return;
        }
        const state: OidcState = { mode: 'login', returnTo: '/admin/auth/start' };
        await um.signoutRedirect({
          state,
          post_logout_redirect_uri: `${window.location.origin}/admin/auth/logged-out`,
        });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Logout failed');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-bg px-4">
      <div className="w-full max-w-md text-center space-y-4">
        {error ? (
          <>
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-red-900/30 mb-2">
              <AlertCircle size={28} className="text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Couldn&apos;t sign you out</h1>
            <p className="text-secondary-text text-sm">{error}</p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="primary" className="rounded-xl" onClick={() => router.replace('/admin/auth/logged-out')}>
                Continue anyway
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-white/5 border border-border/40 mb-2">
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