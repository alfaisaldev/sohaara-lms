'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@sohaara/ui';
import { api } from '@/lib/api';
import { Loader2, MessageCircle, Pin, Trash2, Send } from 'lucide-react';

export default function CommunityPostPage() {
  const params = useParams();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get<any>(`/community/posts/${params.postId}`)
      .then(setPost)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [params.postId]);

  const handleReply = async () => {
    if (!replyContent.trim()) return;
    setSending(true);
    try {
      const reply = await api.post('/community/replies', {
        postId: params.postId,
        content: replyContent,
      });
      setPost((p: any) => ({ ...p, replies: [...p.replies, reply] }));
      setReplyContent('');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-accent-indigo" size={32} /></div>;
  if (!post) return <div className="text-center py-20 text-secondary-text">Post not found</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <Card variant="glass">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-primary-text">{post.title}</h2>
                {post.pinned && <Pin size={14} className="text-accent-indigo" />}
              </div>
              <p className="text-sm text-secondary-text">
                {post.author?.firstName} {post.author?.lastName} &middot; {new Date(post.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <p className="text-sm text-primary-text whitespace-pre-wrap leading-relaxed">{post.content}</p>
          {post.tags?.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {post.tags.map((tag: string) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-lg bg-white/50 text-secondary-text border border-white/30">{tag}</span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="font-bold flex items-center gap-2 text-primary-text">
          <MessageCircle size={16} /> Replies ({post.replies?.length || 0})
        </h3>

        {post.replies?.map((reply: any) => (
          <Card key={reply.id} variant="glass">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-primary-text">{reply.author?.firstName} {reply.author?.lastName}</span>
                <span className="text-xs text-secondary-text">{new Date(reply.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-sm text-primary-text">{reply.content}</p>
            </CardContent>
          </Card>
        ))}

        <div className="flex items-start gap-3 pt-2">
          <textarea value={replyContent} onChange={(e) => setReplyContent(e.target.value)} placeholder="Write a reply..." className="flex-1 rounded-xl border border-white/30 bg-white/60 px-4 py-3 text-sm text-primary-text placeholder:text-secondary-text min-h-[60px] outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all resize-none" />
          <Button onClick={handleReply} loading={sending} variant="primary" size="sm" className="mt-1 rounded-xl cursor-pointer">
            <Send size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
