'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@sohaara/ui';
import { ArrowRight, Sparkles, BookOpen, BarChart3, Users, Shield, GraduationCap, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useIsAuthenticated } from '@/lib/auth';

const features = [
  { icon: BookOpen, title: 'Interactive Courses', description: 'Build engaging courses with videos, quizzes, assignments, and SCORM content.' },
  { icon: BarChart3, title: 'Advanced Analytics', description: 'Track learner progress with detailed reports and actionable insights.' },
  { icon: Users, title: 'Collaborative Learning', description: 'Foster community with discussions, skill tracking, and learning paths.' },
  { icon: Shield, title: 'Enterprise Security', description: 'Role-based access, audit logs, and enterprise-grade security controls.' },
];

const stats = [
  { value: '10K+', label: 'Active Learners' },
  { value: '500+', label: 'Courses' },
  { value: '98%', label: 'Satisfaction' },
  { value: '50+', label: 'Organizations' },
];

export default function LandingPage() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="h-8 w-8 rounded-full border-2 border-accent-indigo border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <header className="fixed top-4 inset-x-4 z-50">
        <div className="mx-auto max-w-7xl bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 px-6 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold gradient-text tracking-tight">Sohaara LMS</h1>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-sm font-medium text-secondary-text hover:text-primary-text transition-colors">
              Sign In
            </Link>
            <Button
              variant="primary"
              size="sm"
              className="rounded-xl"
              onClick={() => router.push('/auth/register')}
            >
              Get Started
              <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="pt-32 pb-20 px-4">
          <div className="mx-auto max-w-5xl text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-indigo/10 border border-accent-indigo/20 text-sm font-medium text-accent-indigo mb-8 animate-fade-in">
              <Sparkles size={14} />
              The Future of Learning Management
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-primary-text tracking-tight leading-tight animate-fade-in-up">
              Learning Engineered
              <span className="block gradient-text mt-2">for Modern Teams</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-secondary-text max-w-2xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              Empower your organization with a cutting-edge LMS platform built for engagement, 
              analytics, and seamless learning experiences.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <Button variant="primary" size="lg" className="rounded-2xl shadow-xl shadow-accent-indigo/20" onClick={() => router.push('/auth/register')}>
                Start Free Trial
                <ArrowRight size={18} />
              </Button>
              <Button variant="outline" size="lg" className="rounded-2xl" onClick={() => router.push('/auth/login')}>
                Sign In
              </Button>
            </div>
            <div className="mt-16 flex items-center justify-center gap-8 text-sm text-secondary-text animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <span className="flex items-center gap-2"><CheckCircle size={16} className="text-accent-green" /> No credit card</span>
              <span className="flex items-center gap-2"><CheckCircle size={16} className="text-accent-green" /> Free 14-day trial</span>
              <span className="flex items-center gap-2"><CheckCircle size={16} className="text-accent-green" /> Cancel anytime</span>
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/60 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/30">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-3xl md:text-4xl font-bold gradient-text">{stat.value}</p>
                  <p className="text-sm text-secondary-text mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="py-20 px-4">
          <div className="mx-auto max-w-7xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-text">
                Everything you need to
                <span className="block gradient-text">deliver exceptional learning</span>
              </h2>
              <p className="text-secondary-text mt-4 max-w-xl mx-auto">
                Powerful tools for course creation, delivery, tracking, and community engagement.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/30 shadow-lg hover:shadow-xl hover:border-accent-indigo/30 transition-all duration-300 hover:-translate-y-1 group">
                    <div className="h-12 w-12 rounded-xl bg-accent-indigo/10 flex items-center justify-center mb-4 group-hover:bg-accent-indigo/20 transition-colors">
                      <Icon size={24} className="text-accent-indigo" />
                    </div>
                    <h3 className="font-semibold text-primary-text text-lg">{feature.title}</h3>
                    <p className="text-sm text-secondary-text mt-2 leading-relaxed">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-20 px-4">
          <div className="mx-auto max-w-4xl">
            <div className="bg-gradient-to-br from-accent-indigo/5 to-accent-indigo-light/5 rounded-3xl p-12 text-center shadow-xl border border-accent-indigo/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent-indigo/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent-indigo-light/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
              <div className="relative">
                <GraduationCap size={40} className="text-accent-indigo mx-auto mb-6" />
                <h2 className="text-3xl md:text-4xl font-bold text-primary-text mb-4">
                  Ready to transform learning?
                </h2>
                <p className="text-secondary-text mt-3 max-w-md mx-auto">
                  Join thousands of organizations already using Sohaara LMS to power their learning programs.
                </p>
                <div className="mt-8 flex items-center justify-center gap-4">
                  <Button variant="primary" size="lg" className="rounded-2xl shadow-xl shadow-accent-indigo/20" onClick={() => router.push('/auth/register')}>
                    Get Started Free
                    <ArrowRight size={18} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/30 bg-white/40 backdrop-blur-sm py-8 px-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <p className="text-sm text-secondary-text">&copy; {new Date().getFullYear()} Sohaara LMS. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm text-secondary-text">
            <a href="#" className="hover:text-primary-text transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary-text transition-colors">Terms</a>
            <a href="#" className="hover:text-primary-text transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
