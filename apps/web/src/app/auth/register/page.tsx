'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Label, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@sohaara/ui';
import { api } from '@/lib/api';
import { GraduationCap, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!acceptTerms) {
      setError('You must accept the Terms of Service and Privacy Policy');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/register', {
        email,
        password,
        firstName,
        lastName,
        organizationName: organization || undefined,
        acceptTerms,
      });
      router.push('/auth/login?registered=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
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
          <h1 className="text-3xl font-bold gradient-text tracking-tight">Get started</h1>
          <p className="text-secondary-text mt-2 text-sm">Create your account to start learning</p>
        </div>

        <Card variant="glass" className="shadow-xl border-white/30">
          <CardHeader>
            <CardTitle className="text-xl">Create account</CardTitle>
            <CardDescription className="text-secondary-text">Fill in your details to get started</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2.5 font-medium">
                  <AlertCircle size={18} className="shrink-0" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" required>First name</Label>
                  <Input id="firstName" placeholder="John" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" required>Last name</Label>
                  <Input id="lastName" placeholder="Doe" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" required>Email</Label>
                <Input id="email" type="email" placeholder="name@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" required>Password</Label>
                <Input id="password" type="password" placeholder="Create a strong password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization">Organization</Label>
                <Input id="organization" placeholder="Your company name (optional)" value={organization} onChange={(e) => setOrganization(e.target.value)} />
              </div>

              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="terms"
                  required
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-secondary-text/30 text-accent-indigo focus:ring-accent-indigo/30"
                />
                <Label htmlFor="terms" className="text-sm text-secondary-text">
                  I agree to the{' '}
                  <Link href="/terms" className="text-accent-indigo hover:text-accent-indigo-light font-medium transition-colors">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-accent-indigo hover:text-accent-indigo-light font-medium transition-colors">Privacy Policy</Link>
                </Label>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" variant="primary" className="w-full h-12 text-base font-medium rounded-xl" loading={loading}>
                Create account
              </Button>
              <p className="text-sm text-secondary-text text-center">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-accent-indigo hover:text-accent-indigo-light font-semibold transition-colors">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
