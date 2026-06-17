'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@sohaara/ui';
import { saveAuth } from '@/lib/auth';
import { AlertCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Login failed');
      }

      const data = await res.json();
      saveAuth(data);
      router.push('/admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
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
          <h1 className="text-2xl font-bold gradient-text">Sohaara LMS</h1>
          <p className="text-secondary-text mt-2 text-sm">Admin Panel</p>
        </div>

        <Card className="glass-dark-card border-border/50 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">Admin sign in</CardTitle>
            <CardDescription className="text-secondary-text">Authorized personnel only</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              {error && (
                <div className="bg-red-900/30 border border-red-800/50 text-red-300 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300" required>Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@sohaara.com"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/5 border-border/60 text-white placeholder:text-gray-500 focus:border-accent-indigo focus:ring-accent-indigo/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300" required>Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white/5 border-border/60 text-white placeholder:text-gray-500 focus:border-accent-indigo focus:ring-accent-indigo/20"
                />
              </div>
            </CardContent>

            <CardFooter>
              <Button type="submit" variant="primary" className="w-full h-11 text-base font-medium rounded-xl cursor-pointer" loading={loading}>
                Sign in
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
