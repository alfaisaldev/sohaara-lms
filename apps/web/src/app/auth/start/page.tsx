/**
 * /auth/start — the ONLY auth entry point in the LMS web app.
 *
 * Single page with three CTAs. Each one goes through the same OIDC
 * Authorization Code + PKCE pipe — the only thing that varies is the
 * `state.mode` field, which the universal /auth/callback uses to route
 * post-auth.
 *
 * `oidc-client-ts` builds the authorization URL from the configured
 * `authority` (so we never hardcode Keycloak's
 * `/protocol/openid-connect/auth` path). The `extraQueryParams.acr_values`
 * hint tells Keycloak's themed login/register/reset page which form to
 * render inline.
 *
 *   Sign in             → mode='login',    acr_values='login'
 *   Create your account → mode='register', acr_values='register'
 *   Reset your password → mode='reset',    acr_values='reset'
 */

'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@sohaara/ui';
import { GraduationCap, LogIn, UserPlus, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getUserManager, AuthMode, OidcState } from '@/lib/oidc';

function StartPageInner() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<AuthMode | null>(null);
  const [error, setError] = useState('');

  const returnTo = searchParams.get('returnTo') || undefined;
  const inviteToken = searchParams.get('invite') || undefined;
  const resetDone = searchParams.get('reset') === 'done';

  const beginAuth = async (mode: AuthMode) => {
    setError('');
    setLoading(mode);
    try {
      const state: OidcState = { mode, returnTo, inviteToken };
      const extraQueryParams: Record<string, string> = { acr_values: mode };
      await getUserManager().signinRedirect({
        state,
        extraQueryParams,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start authentication');
      setLoading(null);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 animate-float" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-br from-accent-green/10 to-emerald-400/10 animate-float-delayed" />
        <div className="absolute top-1/2 -right-20 w-60 h-60 rounded-full bg-gradient-to-br from-purple-300/10 to-pink-300/10 animate-float" style={{ animationDelay: '3s' }} />
      </div>

      <div className="relative w-full max-w-md px-4 animate-scale-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-accent-indigo/10 mb-4">
            <GraduationCap size={32} className="text-accent-indigo" />
          </div>
          <h1 className="text-3xl font-bold gradient-text tracking-tight">Sohaara LMS</h1>
          <p className="text-secondary-text mt-2 text-sm">Choose how you want to continue</p>
        </div>

        <Card variant="glass" className="shadow-xl border-white/30">
          <CardHeader>
            <CardTitle className="text-xl">Welcome</CardTitle>
            <CardDescription className="text-secondary-text">
              Sign in, create an account, or reset your password — all in one place.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {resetDone && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2.5 font-medium">
                <CheckCircle2 size={18} className="shrink-0" />
                Password reset complete — you can sign in with your new password.
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2.5 font-medium">
                <AlertCircle size={18} className="shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="button"
              variant="primary"
              className="w-full h-12 text-base font-medium rounded-xl justify-start"
              loading={loading === 'login'}
              disabled={!!loading}
              onClick={() => beginAuth('login')}
            >
              <LogIn size={18} />
              Sign in
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full h-12 text-base font-medium rounded-xl justify-start"
              loading={loading === 'register'}
              disabled={!!loading}
              onClick={() => beginAuth('register')}
            >
              <UserPlus size={18} />
              Create your account
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full h-12 text-base font-medium rounded-xl justify-start"
              loading={loading === 'reset'}
              disabled={!!loading}
              onClick={() => beginAuth('reset')}
            >
              <KeyRound size={18} />
              Reset your password
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-secondary-text mt-6">
          Authentication is handled by Sohaara Identity.{' '}
          <Link href="/" className="text-accent-indigo hover:underline font-medium">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function StartPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-accent-indigo border-t-transparent animate-spin" />
          <p className="text-sm text-secondary-text">Loading...</p>
        </div>
      </div>
    }>
      <StartPageInner />
    </Suspense>
  );
}