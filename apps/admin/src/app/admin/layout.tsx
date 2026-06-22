'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCan, useUser, useRoles, useIsAuthenticated, logout } from '@/lib/auth';
import { ToastProvider } from '@/components/Toast';
import {
  LayoutDashboard, Users, Building2, BookOpen, FolderTree, Map,
  Award, Brain, BarChart3, FileBarChart, Settings, ShieldAlert,
  Bell, LogOut, Menu, Image, ChevronLeft, Terminal
} from 'lucide-react';
import { useState, useEffect } from 'react';

const sidebarItems = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, roles: ['admin', 'content_manager'] },
  { label: 'Users', href: '/admin/users', icon: Users, roles: ['admin'] },
  { label: 'Sponsored', href: '/admin/organizations', icon: Building2, roles: ['admin'] },
  { label: 'Courses', href: '/admin/courses', icon: BookOpen, roles: ['admin', 'content_manager'] },
  { label: 'Categories', href: '/admin/categories', icon: FolderTree, roles: ['admin', 'content_manager'] },
  { label: 'Learning Paths', href: '/admin/learning-paths', icon: Map, roles: ['admin', 'content_manager'] },
  { label: 'Certificates', href: '/admin/certificates', icon: Award, roles: ['admin', 'content_manager'] },
  { label: 'Skills', href: '/admin/skills', icon: Brain, roles: ['admin', 'content_manager'] },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3, roles: ['admin', 'content_manager'] },
  { label: 'Reports', href: '/admin/reports', icon: FileBarChart, roles: ['admin', 'content_manager'] },
  { label: 'Settings', href: '/admin/settings', icon: Settings, roles: ['admin'] },
  { label: 'Media', href: '/admin/media', icon: Image, roles: ['admin'] },
  { label: 'Log', href: '/admin/audit', icon: ShieldAlert, roles: ['admin'] },
  { label: 'App Logs', href: '/admin/audit/app-logs', icon: Terminal, roles: ['super_admin'] },
];

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const user = useUser();
  const roles = useRoles();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const visibleItems = sidebarItems.filter((item) => item.roles.some((r) => roles.includes(r)) || roles.includes('super_admin'));

  useEffect(() => { setMounted(true); }, []);

  const initials = user
    ? `${(user.firstName || '')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase()
    : 'SA';
  const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Super Admin';
  const displayEmail = user?.email || 'admin@sohaara.com';
  const userRole = roles[0] || 'admin';

  // The single auth entry point and its siblings (callback, logout,
  // logged-out) render without the sidebar — they're public-facing
  // OIDC round-trip pages, not authenticated admin sections.
  const isAuthPage = pathname?.startsWith('/admin/auth') ?? false;

  useEffect(() => {
    if (mounted && !isAuthenticated && !isAuthPage) {
      router.replace('/admin/auth/start');
    }
  }, [isAuthenticated, mounted, router, isAuthPage]);

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (!mounted || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-accent-indigo border-t-transparent animate-spin" />
          <p className="text-sm text-secondary-text">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="flex h-screen bg-primary-bg overflow-hidden">
        <aside
          className={`${sidebarOpen ? 'w-64' : 'w-16'} flex flex-col sidebar-gradient border-r border-border/60 transition-all duration-300 flex-shrink-0 relative z-40`}
        >
          <div className="p-5 border-b border-border/50 relative z-10 flex items-center gap-3">
            {sidebarOpen && (
              <Link href="/admin/dashboard" className="text-lg font-bold gradient-text tracking-tight">
                Sohaara
              </Link>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`${sidebarOpen ? 'ml-auto' : 'mx-auto'} h-8 w-8 rounded-lg flex items-center justify-center text-secondary-text hover:text-white hover:bg-white/5 transition-all cursor-pointer`}
            >
              {sidebarOpen ? <ChevronLeft size={16} /> : <Menu size={18} />}
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 relative z-10 scrollbar-thin">
            {visibleItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-accent-indigo/20 to-accent-indigo/5 text-accent-indigo-light font-medium shadow-sm'
                      : 'text-secondary-text hover:text-white hover:bg-white/5'
                  }`}
                  title={item.label}
                >
                  <Icon size={18} className="shrink-0" />
                  {sidebarOpen && <span className="truncate">{item.label}</span>}
                  {isActive && sidebarOpen && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-indigo-light animate-pulse shrink-0" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-border/50 relative z-10">
            <div className="glass-dark rounded-xl p-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-accent-indigo to-accent-indigo-light flex items-center justify-center text-sm font-bold text-white shadow-md shrink-0">
                  {initials}
                </div>
                {sidebarOpen && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{displayName}</p>
                    <p className="text-xs text-secondary-text truncate">{displayEmail}</p>
                  </div>
                )}
              </div>
              {sidebarOpen && (
                <div className="mt-2 pt-2 border-t border-border/30 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-secondary-text font-semibold">{userRole.replace(/_/g, ' ')}</span>
                  <button onClick={() => { logout(); }} className="text-secondary-text hover:text-red-400 transition-colors cursor-pointer" title="Logout">
                    <LogOut size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 border-b border-border/50 flex items-center justify-between px-6 bg-primary-bg/80 backdrop-blur-xl sticky top-0 z-30 flex-shrink-0">
            <h2 className="text-white font-semibold text-lg tracking-tight">
              {sidebarItems.find((i) => pathname === i.href || pathname.startsWith(i.href + '/'))?.label || 'Dashboard'}
            </h2>
            <div className="flex items-center gap-3">
              <button className="h-9 w-9 rounded-xl bg-white/5 border border-border/60 flex items-center justify-center cursor-pointer hover:bg-white/10 hover:border-accent-indigo/40 transition-all relative group">
                <Bell size={16} className="text-secondary-text group-hover:text-white transition-colors" />
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-danger ring-2 ring-primary-bg" />
              </button>
              <button onClick={() => router.push('/admin/settings')} className="h-9 w-9 rounded-xl bg-white/5 border border-border/60 flex items-center justify-center cursor-pointer hover:bg-white/10 hover:border-accent-indigo/40 transition-all group">
                <Settings size={16} className="text-secondary-text group-hover:text-white transition-colors" />
              </button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
