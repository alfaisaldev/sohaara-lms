'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@sohaara/ui';
import { api } from '@/lib/api';
import { GraduationCap, AlertCircle, Building2 } from 'lucide-react';

export default function OrgRegisterPage() {
  const params = useParams();
  const router = useRouter();
  const [org, setOrg] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<any>(`/organizations/invite/${params.token}`)
      .then((res) => setOrg(res))
      .catch(() => setOrg(null))
      .finally(() => setLoading(false));
  }, [params.token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/auth/register', {
        email: email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${org?.slug || 'temp'}.com`,
        password,
        firstName,
        lastName,
        organizationId: org?.id,
        acceptTerms: true,
      });
      router.push(`/auth/login?registered=true&org=${params.token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="animate-spin h-8 w-8 border-2 border-accent-indigo border-t-transparent rounded-full" />
    </div>
  );

  if (!org) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <p className="text-red-500 text-sm">Invalid or expired registration link</p>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
      <div className="w-full max-w-sm animate-scale-in">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-accent-indigo/10 mb-3">
            <GraduationCap size={28} className="text-accent-indigo" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">Join {org.name}</h1>
          <p className="text-secondary-text text-sm mt-1">Create your account to start learning</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2.5 font-medium">
              <AlertCircle size={18} className="shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-indigo/5 text-sm text-accent-indigo border border-accent-indigo/10">
            <Building2 size={14} />
            {org.name}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
              <input required value={firstName} onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
              <input required value={lastName} onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-gray-400">(optional)</span></label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all" />
          </div>

          <Button type="submit" variant="primary" className="w-full h-11 text-sm font-medium rounded-xl" loading={submitting}>
            Create account
          </Button>

          <p className="text-xs text-gray-400 text-center">
            Already have an account?{' '}
            <a href="/auth/login" className="text-accent-indigo hover:underline font-medium">Sign in</a>
          </p>
        </form>
      </div>
    </div>
  );
}
