'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardTitle, Button } from '@sohaara/ui';
import { api } from '@/lib/api';
import { Loader2, BookOpen, Calendar, User, Plus } from 'lucide-react';
import Link from 'next/link';

const toArray = (v: any): any[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (v.data && Array.isArray(v.data)) return v.data;
  return [];
};

export default function BlogPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      api.get<any>('/blog/posts'),
      api.get<any>('/blog/categories'),
    ]).then(([p, c]) => {
      setPosts(toArray(p));
      setCategories(toArray(c));
    }).catch(() => { setPosts([]); setCategories([]); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="animate-spin text-accent-indigo" size={32} />
        <p className="text-secondary-text text-sm">Loading posts...</p>
      </div>
    </div>
  );

  const filtered = filter ? posts.filter((p) => p.category?.id === filter) : posts;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary-text">Blog</h2>
          <p className="text-secondary-text text-sm mt-1">Articles, tutorials, and updates</p>
        </div>
        <Button variant="primary" size="sm" className="rounded-xl shadow-lg shadow-accent-indigo/20 cursor-pointer">
          <Plus size={16} /> New Post
        </Button>
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap animate-fade-in-up">
          <button onClick={() => setFilter('')} className={`text-xs px-3 py-1.5 rounded-xl border transition-all duration-200 cursor-pointer ${!filter ? 'bg-accent-indigo/10 text-accent-indigo border-accent-indigo/30 font-medium' : 'border-white/30 text-secondary-text hover:border-accent-indigo/30 bg-white/50 backdrop-blur-sm'}`}>All</button>
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setFilter(cat.id)} className={`text-xs px-3 py-1.5 rounded-xl border transition-all duration-200 cursor-pointer ${filter === cat.id ? 'bg-accent-indigo/10 text-accent-indigo border-accent-indigo/30 font-medium' : 'border-white/30 text-secondary-text hover:border-accent-indigo/30 bg-white/50 backdrop-blur-sm'}`}>{cat.name}</button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <Card variant="glass" className="animate-scale-in">
          <CardContent className="flex flex-col items-center py-20 text-center">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center mb-6">
              <BookOpen size={36} className="text-accent-indigo" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-primary-text mb-2">No blog posts yet</h3>
            <p className="text-secondary-text text-sm">Check back later for new articles and updates.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 animate-stagger">
          {filtered.map((post) => (
            <Link key={post.id} href={`/blog/${post.id}`}>
              <Card variant="glass" className="overflow-hidden group cursor-pointer border-white/30 hover:border-accent-indigo/30 transition-all duration-300 h-full hover-lift">
                {post.coverImage ? (
                  <div className="relative h-44 overflow-hidden">
                    <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-white/60 via-transparent to-transparent" />
                  </div>
                ) : (
                  <div className="h-44 bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center">
                    <BookOpen size={40} className="text-accent-indigo/30" />
                  </div>
                )}
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-3 text-xs text-secondary-text">
                    {post.author && <span className="flex items-center gap-1.5"><User size={12} /> {post.author.firstName}</span>}
                    {post.publishedAt && <span className="flex items-center gap-1.5"><Calendar size={12} /> {new Date(post.publishedAt).toLocaleDateString()}</span>}
                    {post.category && <span className="px-2 py-0.5 rounded-full bg-accent-indigo/10 text-accent-indigo text-[10px] font-medium border border-accent-indigo/20">{post.category.name}</span>}
                  </div>
                  <CardTitle className="text-base text-primary-text group-hover:text-accent-indigo transition-colors">{post.title}</CardTitle>
                  {post.excerpt && <p className="text-sm text-secondary-text line-clamp-2 leading-relaxed">{post.excerpt}</p>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
