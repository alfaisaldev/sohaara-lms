/**
 * /admin/auth/logged-out — post-logout landing for the admin app.
 * Clears the LMS session and renders a single CTA back to /admin/auth/start.
 */

'use client';

// Defensive: keep this page dynamic in case future code on it
// touches `localStorage` (the admin's clearAuth helper does).
export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@sohaara/ui';
import { Shield, CheckCircle2 } from 'lucide-react';
import { clearAuth } from '@/lib/auth';

export default function LoggedOutPage() {
  const router = useRouter();

  useEffect(() => {
    clearAuth();
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-primary-bg">
      <div className="relative w-full max-w-sm px-4 text-center animate-scale-in">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-white/5 border border-border/40 mb-4">
          <Shield size={26} className="text-accent-indigo-light" />
        </div>
        <h1 className="text-2xl font-bold gradient-text">You&apos;re signed out</h1>
        <p className="text-secondary-text mt-2 text-sm">
          Your admin session has been ended.
        </p>

        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-900/30 border border-emerald-800/50 text-emerald-300 text-sm font-medium">
          <CheckCircle2 size={16} />
          Signed out successfully
        </div>

        <div className="mt-8">
          <Button variant="primary" className="rounded-xl" onClick={() => router.replace('/admin/auth/start')}>
            Back to sign in
          </Button>
        </div>
      </div>
    </div>
  );
}