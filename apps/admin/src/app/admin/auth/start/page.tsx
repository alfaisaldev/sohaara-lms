/**
 * /admin/auth/start — the ONLY auth entry point for the admin app.
 *
 * Single page, three CTAs, same OIDC Authorization Code + PKCE pipe
 * as the web app. Only the Keycloak client_id differs
 * (sohaara-admin) and the post-auth destination is /admin/dashboard.
 */

'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@sohaara/ui';
import { Shield, LogIn, UserPlus, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
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
      await getUserManager().signinRedirect({ state, extraQueryParams });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start authentication');
      setLoading(null);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-primary-bg">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-gradient-to-br from-accent-indigo/8 to-accent-indigo-light/5 animate-float" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-br from-accent-green/5 to-emerald-400/5 animate-float-delayed" />
      </div>

      <div className="relative w-full max-w-sm px-4 animate-scale-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-white/5 border border-border/40 mb-4">
            <Shield size={26} className="text-accent-indigo-light" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">Sohaara Admin</h1>
          <p className="text-secondary-text mt-2 text-sm">Authorized personnel only</p>
        </div>

        <Card className="glass-dark-card border-border/50 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">Admin sign in</CardTitle>
            <CardDescription className="text-secondary-text">
              Sign in, create an admin account, or reset your password.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {resetDone && (
              <div className="bg-emerald-900/30 border border-emerald-800/50 text-emerald-300 px-4 py-3 rounded-xl text-sm flex items-center gap-2.5 font-medium">
                <CheckCircle2 size={18} className="shrink-0" />
                Password reset complete.
              </div>
            )}

            {error && (
              <div className="bg-red-900/30 border border-red-800/50 text-red-300 px-4 py-3 rounded-xl text-sm flex items-center gap-2.5 font-medium">
                <AlertCircle size={18} className="shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="button"
              variant="primary"
              className="w-full h-11 text-base font-medium rounded-xl justify-start"
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
              className="w-full h-11 text-base font-medium rounded-xl justify-start bg-white/5 border-border/60 text-white hover:bg-white/10 hover:border-accent-indigo/40"
              loading={loading === 'register'}
              disabled={!!loading}
              onClick={() => beginAuth('register')}
            >
              <UserPlus size={18} />
              Create admin account
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full h-11 text-base font-medium rounded-xl justify-start text-secondary-text hover:text-white hover:bg-white/5"
              loading={loading === 'reset'}
              disabled={!!loading}
              onClick={() => beginAuth('reset')}
            >
              <KeyRound size={18} />
              Reset password
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-secondary-text mt-6">
          Authentication is handled by Sohaara Identity.
        </p>
      </div>
    </div>
  );
}

export default function StartPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-primary-bg">
        <div className="h-8 w-8 rounded-full border-2 border-accent-indigo border-t-transparent animate-spin" />
      </div>
    }>
      <StartPageInner />
    </Suspense>
  );
}