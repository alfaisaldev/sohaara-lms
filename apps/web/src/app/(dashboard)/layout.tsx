'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SearchBar } from '@/components/search/search-bar';
import { NotificationBell } from '@/components/notifications/notification-bell';
import Link from 'next/link';
import { useUser, useIsAuthenticated, logout } from '@/lib/auth';
import { Menu, X, LayoutDashboard, BookOpen, Map, Brain, MessageCircle, LogOut, User, Award } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Courses', href: '/courses', icon: BookOpen },
  { label: 'Paths', href: '/learning-paths', icon: Map },
  { label: 'Certificates', href: '/certificates', icon: Award },
  { label: 'Skills', href: '/skills', icon: Brain },
  { label: 'Community', href: '/community', icon: MessageCircle },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const user = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, mounted, router]);

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-accent-indigo border-t-transparent animate-spin" />
          <p className="text-sm text-secondary-text">Loading...</p>
        </div>
      </div>
    );
  }

  const initials = user
    ? `${(user.firstName || '')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase()
    : '?';

  return (
    <div className="min-h-screen bg-primary-bg">
      <header className="fixed top-4 inset-x-4 z-50">
        <div className="mx-auto max-w-7xl glass rounded-2xl shadow-lg px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-bold gradient-text tracking-tight whitespace-nowrap">
              Sohaara
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-secondary-text hover:text-primary-text hover:bg-white/40 transition-all duration-200"
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3">
              <SearchBar />
              <NotificationBell />
            </div>
            <div ref={userMenuRef} className="relative">
              <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 group cursor-pointer">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent-indigo to-accent-indigo-light flex items-center justify-center text-sm font-bold text-white shadow-md group-hover:shadow-lg group-hover:opacity-90 transition-all">
                  {initials}
                </div>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 glass rounded-2xl shadow-xl p-1.5 animate-scale-in z-50">
                  <Link href="/profile" onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-secondary-text hover:text-primary-text hover:bg-white/40 transition-all cursor-pointer">
                    <User size={16} />
                    Profile
                  </Link>
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-secondary-text hover:text-red-500 hover:bg-red-500/5 transition-all cursor-pointer">
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden h-8 w-8 rounded-lg flex items-center justify-center text-secondary-text hover:text-primary-text hover:bg-white/40 transition-all cursor-pointer"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden mt-2 glass rounded-2xl shadow-lg p-4 animate-slide-up">
            <nav className="flex flex-col gap-1 mb-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-secondary-text hover:text-primary-text hover:bg-white/40 transition-all"
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-white/20 pt-4">
              <SearchBar />
            </div>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 md:px-6 pt-24 pb-8">
        {children}
      </main>
    </div>
  );
}
