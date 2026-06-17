'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardTitle, Button } from '@sohaara/ui';
import { api } from '@/lib/api';
import { Loader2, MessageCircle, Plus, Pin, Trash2, ChevronDown, ChevronUp, Send } from 'lucide-react';

const toArray = (v: any): any[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (v.data && Array.isArray(v.data)) return v.data;
  return [];
};

export default function DiscussionTab({ courseId }: { courseId: string }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, any[]>>({});
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const [submittingReply, setSubmittingReply] = useState<string | null>(null);

  const fetchPosts = useCallback(() => {
    setLoading(true);
    api.get<any>(`/community/posts?courseId=${courseId}`)
      .then(res => setPosts(toArray(res)))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) return;
    setCreating(true);
    try {
      await api.post('/community/posts', { title, content, courseId });
      setShowCreate(false);
      setTitle('');
      setContent('');
      fetchPosts();
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/community/posts/${id}`);
    fetchPosts();
  };

  const handlePin = async (id: string) => {
    await api.post(`/community/posts/${id}/pin`);
    fetchPosts();
  };

  const toggleExpand = async (postId: string) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
      return;
    }
    setExpandedPostId(postId);
    try {
      const post: any = await api.get<any>(`/community/posts/${postId}`);
      setReplies(prev => ({ ...prev, [postId]: post.replies || [] }));
    } catch { }
  };

  const handleReply = async (postId: string) => {
    const text = replyContent[postId]?.trim();
    if (!text) return;
    setSubmittingReply(postId);
    try {
      await api.post('/community/replies', { postId, content: text });
      setReplyContent(prev => ({ ...prev, [postId]: '' }));
      toggleExpand(postId);
    } finally {
      setSubmittingReply(null);
    }
  };

  const handleDeleteReply = async (replyId: string, postId: string) => {
    await api.delete(`/community/replies/${replyId}`);
    toggleExpand(postId);
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-primary-text">Discussion</h3>
          <p className="text-sm text-secondary-text">Ask questions and share ideas about this course</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} variant="primary" size="sm" className="rounded-xl shadow-lg shadow-accent-indigo/20">
          <Plus size={16} /> New Post
        </Button>
      </div>

      {showCreate && (
        <Card variant="glass" className="border-accent-indigo/30 animate-scale-in">
          <CardContent className="p-5 space-y-4">
            <h4 className="font-bold text-primary-text">Start a Discussion</h4>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title" className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all" />
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="What's on your mind?" className="w-full rounded-xl border border-white/30 bg-white/60 px-4 py-2.5 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 focus:ring-2 focus:ring-accent-indigo/10 transition-all resize-none min-h-[100px]" />
            <div className="flex justify-end gap-3">
              <Button onClick={() => setShowCreate(false)} variant="ghost" size="sm" className="rounded-xl cursor-pointer">Cancel</Button>
              <Button onClick={handleCreate} loading={creating} variant="primary" size="sm" className="rounded-xl shadow-lg shadow-accent-indigo/20 cursor-pointer">Post</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-6 w-6 border-2 border-accent-indigo border-t-transparent rounded-full" />
        </div>
      ) : posts.length === 0 && !showCreate ? (
        <Card variant="glass" className="animate-scale-in">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-accent-indigo/20 to-accent-indigo-light/20 flex items-center justify-center mb-4">
              <MessageCircle size={28} className="text-accent-indigo" />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-primary-text mb-1">No discussions yet</h3>
            <p className="text-secondary-text text-sm max-w-xs">Start a conversation about this course.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const isExpanded = expandedPostId === post.id;
            const postReplies = replies[post.id] || [];
            return (
              <div key={post.id}>
                <Card
                  variant="glass"
                  className={`border-white/30 hover:border-accent-indigo/30 transition-all duration-300 cursor-pointer ${post.pinned ? 'border-accent-indigo/20 bg-gradient-to-r from-accent-indigo/5 to-transparent' : ''} ${isExpanded ? 'border-accent-indigo/40' : ''}`}
                  onClick={() => toggleExpand(post.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-accent-indigo/10 to-accent-indigo-light/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MessageCircle size={16} className="text-accent-indigo" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm text-primary-text">{post.title}</CardTitle>
                          {post.pinned && <Pin size={13} className="text-accent-indigo shrink-0" />}
                        </div>
                        <p className="text-sm text-secondary-text mt-1 line-clamp-2">{post.content}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-secondary-text">
                          <span className="flex items-center gap-1">
                            <span className="h-5 w-5 rounded-full bg-gradient-to-br from-accent-indigo to-accent-indigo-light flex items-center justify-center text-[9px] font-medium text-white">
                              {post.author?.firstName?.[0]}{post.author?.lastName?.[0]}
                            </span>
                            {post.author?.firstName} {post.author?.lastName}
                          </span>
                          <span>{post._count?.replies || 0} replies</span>
                          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handlePin(post.id)} className={`p-1.5 rounded-lg hover:bg-white/30 transition-colors cursor-pointer ${post.pinned ? 'text-accent-indigo' : 'text-secondary-text hover:text-primary-text'}`} title={post.pinned ? 'Unpin' : 'Pin'}>
                          <Pin size={13} />
                        </button>
                        <button onClick={() => handleDelete(post.id)} className="text-secondary-text hover:text-danger p-1.5 rounded-lg hover:bg-white/30 transition-colors cursor-pointer" title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {isExpanded && (
                  <div className="ml-9 mt-2 space-y-3 animate-fade-in-up">
                    {postReplies.map((reply: any) => (
                      <Card key={reply.id} variant="default" className="border border-white/20">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="h-5 w-5 rounded-full bg-gradient-to-br from-accent-green to-emerald-300 flex items-center justify-center text-[9px] font-medium text-white">
                                {reply.author?.firstName?.[0]}{reply.author?.lastName?.[0]}
                              </span>
                              <span className="text-xs font-medium text-primary-text">{reply.author?.firstName} {reply.author?.lastName}</span>
                              <span className="text-xs text-secondary-text">{new Date(reply.createdAt).toLocaleDateString()}</span>
                            </div>
                            <button onClick={() => handleDeleteReply(reply.id, post.id)} className="text-secondary-text hover:text-danger transition-colors cursor-pointer"><Trash2 size={11} /></button>
                          </div>
                          <p className="text-sm text-secondary-text ml-7">{reply.content}</p>
                          {reply.children?.map((child: any) => (
                            <div key={child.id} className="ml-6 mt-2 pl-3 border-l-2 border-accent-indigo/20">
                              <div className="flex items-center gap-2">
                                <span className="h-4 w-4 rounded-full bg-gradient-to-br from-accent-orange to-amber-300 flex items-center justify-center text-[7px] font-medium text-white">
                                  {child.author?.firstName?.[0]}{child.author?.lastName?.[0]}
                                </span>
                                <span className="text-xs font-medium text-primary-text">{child.author?.firstName} {child.author?.lastName}</span>
                              </div>
                              <p className="text-sm text-secondary-text mt-1">{child.content}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                    <div className="flex items-center gap-2">
                      <input
                        value={replyContent[post.id] || ''}
                        onChange={(e) => setReplyContent(prev => ({ ...prev, [post.id]: e.target.value }))}
                        placeholder="Write a reply..."
                        className="flex-1 rounded-xl border border-white/30 bg-white/60 px-4 py-2 text-sm text-primary-text placeholder:text-secondary-text outline-none focus:border-accent-indigo/50 transition-all"
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleReply(post.id)}
                      />
                      <button
                        onClick={() => handleReply(post.id)}
                        disabled={submittingReply === post.id}
                        className="h-9 w-9 rounded-xl bg-gradient-to-r from-accent-indigo to-accent-indigo-light flex items-center justify-center text-white hover:scale-[1.05] transition-all cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
