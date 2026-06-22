/**
 * /auth/logged-out — post-logout landing.
 *
 * Called by Keycloak's end-session redirect after it has cleared the
 * AUTH_SESSION_ID cookie. We:
 *   1. Remove the LMS access/refresh tokens and cached user from
 *      localStorage (the Keycloak session itself is already gone).
 *   2. Drop the LMS auth cookie if any.
 *   3. Render "You've been signed out" with a single CTA back to
 *      /auth/start.
 *
 * Note: `oidc-client-ts`'s `WebStorageStateStore` keeps its own state
 * entry under `oidc.user:...` — leaving that alone is fine, since
 * /auth/start will overwrite it on the next signin.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@sohaara/ui';
import { GraduationCap, CheckCircle2 } from 'lucide-react';
import { clearAuth } from '@/lib/auth';

export default function LoggedOutPage() {
  const router = useRouter();

  useEffect(() => {
    // Clear LMS-side session state. Keycloak has already cleared its
    // own session cookie by the time we render this page.
    clearAuth();
    if (typeof document !== 'undefined') {
      document.cookie = 'admin_auth=; path=/; max-age=0';
    }
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 animate-float" />
      </div>

      <div className="relative w-full max-w-md px-4 text-center animate-scale-in">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-accent-indigo/10 mb-4">
          <GraduationCap size={32} className="text-accent-indigo" />
        </div>
        <h1 className="text-3xl font-bold gradient-text tracking-tight">You&apos;re signed out</h1>
        <p className="text-secondary-text mt-2 text-sm">
          Your Sohaara Identity session has been ended.
        </p>

        <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
          <CheckCircle2 size={16} />
          Signed out successfully
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Button variant="primary" className="rounded-xl" onClick={() => router.replace('/auth/start')}>
            Back to sign in
          </Button>
          <Button variant="ghost" className="rounded-xl" onClick={() => router.replace('/')}>
            Go to home
          </Button>
        </div>
      </div>
    </div>
  );
}