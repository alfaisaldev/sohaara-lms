'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Label, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@sohaara/ui';
import { api } from '@/lib/api';
import { saveAuth } from '@/lib/auth';
import { GraduationCap, CheckCircle, AlertCircle } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const justRegistered = searchParams.get('registered') === 'true';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', {
        email,
        password,
        rememberMe,
      });
      saveAuth(data as any);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 animate-float" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-br from-accent-green/10 to-emerald-400/10 animate-float-delayed" />
        <div className="absolute top-1/3 -left-20 w-60 h-60 rounded-full bg-gradient-to-br from-purple-300/10 to-pink-300/10 animate-float" style={{ animationDelay: '3s' }} />
      </div>

      <div className="relative w-full max-w-md px-4 animate-scale-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-accent-indigo/10 mb-4">
            <GraduationCap size={32} className="text-accent-indigo" />
          </div>
          <h1 className="text-3xl font-bold gradient-text tracking-tight">Welcome back</h1>
          <p className="text-secondary-text mt-2 text-sm">Sign in to continue your learning journey</p>
        </div>

        <Card variant="glass" className="shadow-xl border-white/30">
          <CardHeader>
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription className="text-secondary-text">Enter your credentials to access your account</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              {justRegistered && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2.5 font-medium">
                  <CheckCircle size={18} className="shrink-0" />
                  Account created successfully! Sign in with your credentials.
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2.5 font-medium">
                  <AlertCircle size={18} className="shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" required>Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" required>Password</Label>
                  <Link href="/auth/forgot-password" className="text-xs text-accent-indigo hover:text-accent-indigo-light transition-colors font-medium">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-secondary-text/30 text-accent-indigo focus:ring-accent-indigo/30"
                />
                <Label htmlFor="remember" className="text-sm text-secondary-text cursor-pointer select-none">Remember me</Label>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" variant="primary" className="w-full h-12 text-base font-medium rounded-xl" loading={loading}>
                Sign in
              </Button>
              <p className="text-sm text-secondary-text text-center">
                Don&apos;t have an account?{' '}
                <Link href="/auth/register" className="text-accent-indigo hover:text-accent-indigo-light font-semibold transition-colors">
                  Create one
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-accent-indigo border-t-transparent animate-spin" />
          <p className="text-sm text-secondary-text">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
