'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, BookOpen, Users, MessageCircle, FileText } from 'lucide-react';
import { api } from '@/lib/api';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!query || query.length < 2) { setResults(null); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get<any>(`/search?q=${encodeURIComponent(query)}`);
        setResults(res);
      } catch {} finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handle = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const totalResults = results ? (results.courses?.length || 0) + (results.users?.length || 0) + (results.posts?.length || 0) + (results.resources?.length || 0) : 0;

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center bg-primary-bg rounded-lg px-3 py-2 gap-2 w-64">
        <Search size={16} className="text-secondary-text" />
        <input value={query} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Search courses, people..." className="bg-transparent text-sm outline-none flex-1" />
        {loading && <Loader2 size={14} className="animate-spin text-secondary-text" />}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-border shadow-lg overflow-hidden z-50 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin" size={20} /></div>
          ) : totalResults === 0 ? (
            <p className="text-sm text-secondary-text p-4 text-center">No results for "{query}"</p>
          ) : (
            <div className="py-2">
              {results.courses?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-secondary-text px-4 py-1 uppercase">Courses</p>
                  {results.courses.map((c: any) => (
                    <button key={c.id} onClick={() => { router.push(`/courses/${c.id}`); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-primary-bg transition-colors">
                      <BookOpen size={14} className="text-secondary-text" />
                      <span className="truncate">{c.title}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.users?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-secondary-text px-4 py-1 uppercase mt-1">People</p>
                  {results.users.map((u: any) => (
                    <button key={u.id} className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-primary-bg transition-colors">
                      <div className="h-6 w-6 rounded-full bg-accent-teal/20 flex items-center justify-center text-xs">{u.firstName?.[0]}{u.lastName?.[0]}</div>
                      <span>{u.firstName} {u.lastName}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.posts?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-secondary-text px-4 py-1 uppercase mt-1">Discussions</p>
                  {results.posts.map((p: any) => (
                    <button key={p.id} onClick={() => { router.push(`/community/${p.id}`); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-primary-bg transition-colors">
                      <MessageCircle size={14} className="text-secondary-text" />
                      <span className="truncate">{p.title}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.resources?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-secondary-text px-4 py-1 uppercase mt-1">Resources</p>
                  {results.resources.map((r: any) => (
                    <button key={r.id} onClick={() => { router.push(`/courses/${r.courseId}/resources`); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-primary-bg transition-colors">
                      <FileText size={14} className="text-secondary-text" />
                      <span className="truncate">{r.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
