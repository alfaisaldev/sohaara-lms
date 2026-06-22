/**
 * /register/[token] — org invite acceptance page.
 *
 * The admin (or an org owner) sends an invite link with a one-time
 * signed token; this page:
 *   1. Calls GET /api/v1/organizations/invite/{token} to fetch the
 *      org name (server-validated; the api checks the token signature
 *      and expiry).
 *   2. Renders an "Accept invite" page with the org name + a button.
 *   3. Button → /auth/start?invite=<token> (no local registration —
 *      Keycloak owns signup, and the api's keycloakExchange endpoint
 *      will apply the org to the new user when the OIDC flow
 *      completes).
 *
 * Hard rule: the LMS never creates a user via local registration;
 * Keycloak does. This page is just a polite intermediate that
 * confirms the invite is valid before sending the user to Keycloak.
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@sohaara/ui';
import { GraduationCap, AlertCircle, Building2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function OrgInvitePage() {
  const params = useParams();
  const router = useRouter();
  const [org, setOrg] = useState<{ name: string; slug: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = String(params.token || '');

  useEffect(() => {
    if (!token) {
      setError('Invalid invite link');
      setLoading(false);
      return;
    }
    api.get<{ name: string; slug: string }>(`/organizations/invite/${token}`)
      .then((res) => setOrg({ name: res.name, slug: res.slug }))
      .catch(() => setError('This invite link is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="animate-spin h-8 w-8 border-2 border-accent-indigo border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-red-50">
            <AlertCircle size={28} className="text-red-500" />
          </div>
          <p className="text-red-500 text-sm font-medium">{error || 'Invalid invite link'}</p>
          <Button variant="outline" className="rounded-xl" onClick={() => router.replace('/auth/start')}>
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
      <div className="w-full max-w-sm animate-scale-in">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-accent-indigo/10 mb-3">
            <GraduationCap size={28} className="text-accent-indigo" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">Join {org.name}</h1>
          <p className="text-secondary-text text-sm mt-1">
            Continue to Sohaara Identity to create your account.
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 p-6 space-y-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-indigo/5 text-sm text-accent-indigo border border-accent-indigo/10">
            <Building2 size={14} />
            You&apos;ll join <span className="font-semibold">{org.name}</span>
          </div>

          <p className="text-sm text-secondary-text">
            We&apos;ll hand you off to Sohaara Identity to create your account
            and pick a password. Once you finish there, you&apos;ll be brought
            straight into {org.name}&apos;s workspace.
          </p>

          <Button
            type="button"
            variant="primary"
            className="w-full h-11 text-sm font-medium rounded-xl"
            onClick={() => router.replace(`/auth/start?invite=${encodeURIComponent(token)}`)}
          >
            Continue to Sohaara
          </Button>

          <p className="text-xs text-gray-400 text-center">
            Already have an account?{' '}
            <a href={`/auth/start?invite=${encodeURIComponent(token)}`} className="text-accent-indigo hover:underline font-medium">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}