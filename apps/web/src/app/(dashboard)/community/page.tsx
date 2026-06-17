'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardTitle, Button } from '@sohaara/ui';
import { api } from '@/lib/api';
import { Loader2, MessageCircle, Plus, Pin, Search } from 'lucide-react';
import Link from 'next/link';

const toArray = (v: any): any[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (v.data && Array.isArray(v.data)) return v.data;
  return [];
};

export default function CommunityPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    api.get<any>('/community/posts')
      .then(res => setPosts(toArray(res)))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) return;
    setCreating(true);
    try {
      const post: any = await api.post('/community/posts', { title, content });
      router.push(`/community/${post.id}`);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="animate-spin text-accent-indigo" size={32} />
        <p className="text-secondary-text text-sm">Loading discussions...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary-text">Community</h2>
          <p className="text-secondary-text text-sm mt-1">Discuss courses, share ideas, ask questions</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} variant="primary" size="sm" className="rounded-xl shadow-lg shadow-accent-indigo/20 cursor-pointer">
          <Plus size={16} /> New Post
        </Button>
      </div>

      {showCreate && (
        <Card variant="glass" className="animate-fade-in-up border-white/30">
          <CardContent className="p-6 space-y-5">
            <h3 className="text-lg font-bold tracking-tight text-primary-text">Start a Discussion</h3>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title" className="w-full text-base font-medium bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl px-4 py-3 outline-none focus:border-accent-indigo/50 focus:ring-1 focus:ring-accent-indigo/20 transition-all duration-200 text-primary-text placeholder:text-secondary-text" />
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="What's on your mind?" className="w-full bg-white/50 backdrop-blur-sm border border-white/30 rounded-xl p-4 text-sm min-h-[140px] outline-none focus:border-accent-indigo/50 focus:ring-1 focus:ring-accent-indigo/20 transition-all duration-200 text-primary-text placeholder:text-secondary-text resize-none" />
            <div className="flex justify-end gap-3">
              <Button onClick={() => setShowCreate(false)} variant="ghost" size="sm" className="rounded-xl cursor-pointer">Cancel</Button>
              <Button onClick={handleCreate} loading={creating} variant="primary" size="sm" className="rounded-xl shadow-lg shadow-accent-indigo/20 cursor-pointer">Post</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {posts.length === 0 ? (
        <Card variant="glass" className="animate-scale-in">
          <CardContent className="flex flex-col items-center py-20 text-center">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center mb-6">
              <MessageCircle size={36} className="text-accent-indigo" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-primary-text mb-2">No discussions yet</h3>
            <p className="text-secondary-text text-sm mb-6">Be the first to start a conversation.</p>
            <Button onClick={() => setShowCreate(true)} variant="primary" size="sm" className="rounded-xl shadow-lg shadow-accent-indigo/20 cursor-pointer">Start a Discussion</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 animate-stagger">
          {posts.map((post) => (
            <Link key={post.id} href={`/community/${post.id}`}>
              <Card variant="glass" className="cursor-pointer border-white/30 hover:border-accent-indigo/30 transition-all duration-300 hover-lift">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MessageCircle size={18} className="text-accent-indigo" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base text-primary-text">{post.title}</CardTitle>
                      {post.pinned && <Pin size={14} className="text-accent-indigo" />}
                    </div>
                    <p className="text-sm text-secondary-text mt-1.5 line-clamp-2 leading-relaxed">{post.content}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-secondary-text">
                      <span className="flex items-center gap-1.5">
                        <span className="h-5 w-5 rounded-full bg-gradient-to-br from-accent-indigo to-accent-indigo-light flex items-center justify-center text-[9px] font-medium text-white">
                          {post.author?.firstName?.[0]}{post.author?.lastName?.[0]}
                        </span>
                        {post.author?.firstName} {post.author?.lastName}
                      </span>
                      <span className="flex items-center gap-1">{post._count?.replies || 0} replies</span>
                      <span className="flex items-center gap-1">{new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
