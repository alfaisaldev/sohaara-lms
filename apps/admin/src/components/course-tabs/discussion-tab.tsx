'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminApi as api } from '@/lib/api';
import { MessageCircle, Plus, Pin, Trash2, ChevronDown, ChevronUp, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/components/Toast';

const toArray = (v: any): any[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (v.data && Array.isArray(v.data)) return v.data;
  return [];
};

export default function AdminDiscussionTab({ courseId }: { courseId: string }) {
  const { toast } = useToast();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [creating, setCreating] = useState(false);

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
      toast('success', 'Post created');
      setShowCreate(false);
      setTitle(''); setContent('');
      fetchPosts();
    } catch (err: any) {
      toast('error', err.message || 'Failed');
    } finally {
      setCreating(false);
    }
  };

  const togglePin = async (post: any) => {
    try {
      await api.post(`/community/posts/${post.id}/pin`);
      fetchPosts();
    } catch (err: any) {
      toast('error', err.message || 'Failed');
    }
  };

  const deletePost = async (id: string) => {
    try {
      await api.delete(`/community/posts/${id}`);
      fetchPosts();
      toast('success', 'Post deleted');
    } catch (err: any) {
      toast('error', err.message || 'Failed');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-accent-indigo" size={24} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-secondary-text">{posts.length} post{posts.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-indigo text-white text-sm font-medium hover:bg-accent-indigo/90 transition-all cursor-pointer">
          <Plus size={16} /> {showCreate ? 'Cancel' : 'New Post'}
        </button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-border/60 bg-white/5 p-6 space-y-4">
          <h3 className="text-base font-semibold text-white">New Discussion Post</h3>
          <div>
            <label className="block text-xs text-gray-300 mb-1">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border border-border/60 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-indigo/50" />
          </div>
          <div>
            <label className="block text-xs text-gray-300 mb-1">Content *</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} className="w-full rounded-lg border border-border/60 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-indigo/50 resize-none" />
          </div>
          <div className="flex justify-end">
            <button onClick={handleCreate} disabled={creating || !title.trim() || !content.trim()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-indigo text-white text-sm font-medium hover:bg-accent-indigo/90 disabled:opacity-40 transition-all cursor-pointer">
              <Send size={14} /> {creating ? 'Creating...' : 'Create Post'}
            </button>
          </div>
        </div>
      )}

      {posts.length === 0 && !showCreate ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-border/30 bg-white/[0.02]">
          <MessageCircle size={40} className="text-secondary-text/20 mb-4" />
          <p className="text-secondary-text text-sm">No discussion posts yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...posts].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)).map((post: any) => (
            <div key={post.id} className="rounded-xl border border-border/30 bg-white/[0.02] p-4">
              <div className="flex items-start gap-3">
                <MessageCircle size={18} className={`shrink-0 mt-0.5 ${post.isPinned ? 'text-accent-indigo' : 'text-secondary-text'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{post.title}</p>
                    {post.isPinned && <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-indigo/10 text-accent-indigo-light">Pinned</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{post.content}</p>
                  <p className="text-[10px] text-secondary-text mt-1">
                    {post.author?.firstName} {post.author?.lastName} &middot; {new Date(post.createdAt).toLocaleDateString()}
                    {post._count?.replies ? `  &middot; ${post._count.replies} replies` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => togglePin(post)} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${post.isPinned ? 'text-accent-indigo hover:text-accent-indigo-light' : 'text-secondary-text hover:text-accent-indigo-light'}`} title={post.isPinned ? 'Unpin' : 'Pin'}>
                    <Pin size={14} />
                  </button>
                  <button onClick={() => deletePost(post.id)} className="p-1.5 rounded-lg text-secondary-text hover:text-red-400 transition-colors cursor-pointer" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
