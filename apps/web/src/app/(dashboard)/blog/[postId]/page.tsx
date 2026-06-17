'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@sohaara/ui';
import { api } from '@/lib/api';
import { Loader2, ArrowLeft, Calendar, User, Tag } from 'lucide-react';

export default function BlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any>(`/blog/posts/${params.postId}`)
      .then(setPost)
      .catch(() => router.push('/blog'))
      .finally(() => setLoading(false));
  }, [params.postId]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent-indigo" size={32} /></div>;
  if (!post) return null;

  return (
    <article className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-secondary-text hover:text-primary-text transition-colors cursor-pointer">
        <ArrowLeft size={16} /> Back
      </button>

      {post.coverImage && (
        <div className="rounded-xl overflow-hidden">
          <img src={post.coverImage} alt={post.title} className="w-full h-64 object-cover" />
        </div>
      )}

      <Card variant="glass">
        <CardContent className="p-6 space-y-4">
          <div>
            <div className="flex items-center gap-3 text-sm text-secondary-text">
              <span className="flex items-center gap-1"><User size={14} /> {post.author?.firstName} {post.author?.lastName}</span>
              <span className="flex items-center gap-1"><Calendar size={14} /> {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : new Date(post.createdAt).toLocaleDateString()}</span>
              {post.category && <span className="px-2 py-0.5 rounded-lg bg-accent-indigo/10 text-accent-indigo text-xs font-medium border border-accent-indigo/20">{post.category.name}</span>}
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-primary-text mt-2">{post.title}</h2>
            {post.excerpt && <p className="text-secondary-text text-sm mt-1">{post.excerpt}</p>}
          </div>

          <div className="text-sm text-primary-text leading-relaxed whitespace-pre-wrap">
            {post.content}
          </div>

          {post.tags?.length > 0 && (
            <div className="flex gap-1.5 flex-wrap pt-4 border-t border-white/30">
              <Tag size={14} className="text-secondary-text mt-0.5" />
              {post.tags.map((tag: string) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-lg bg-white/50 text-secondary-text border border-white/30">{tag}</span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </article>
  );
}
