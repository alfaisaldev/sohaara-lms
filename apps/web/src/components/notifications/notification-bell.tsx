'use client';

import { useEffect, useState, useRef } from 'react';
import { Bell, Loader2, CheckCheck } from 'lucide-react';
import { api } from '@/lib/api';

export function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      api.get<any[]>('/notifications'),
      api.get<any>('/notifications/unread-count'),
    ]).then(([notifs, count]) => {
      setNotifications(notifs);
      setUnreadCount(count.count);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handle = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const handleMarkRead = async (id: string) => {
    await api.post(`/notifications/${id}/read`);
    setNotifications(notifications.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(Math.max(0, unreadCount - 1));
  };

  const handleMarkAllRead = async () => {
    await api.post('/notifications/read-all');
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="relative h-8 w-8 flex items-center justify-center rounded-lg hover:bg-primary-bg transition-colors">
        <Bell size={18} className="text-secondary-text" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl border border-border shadow-lg overflow-hidden z-50 max-h-96">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-accent-teal hover:underline flex items-center gap-1">
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin" size={20} /></div>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-secondary-text text-center py-8">No notifications</p>
          ) : (
            <div className="overflow-y-auto max-h-72">
              {notifications.map((n) => (
                <button key={n.id} onClick={() => !n.read && handleMarkRead(n.id)} className={`w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-primary-bg transition-colors ${!n.read ? 'bg-accent-teal/5' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.read ? 'font-semibold' : ''}`}>{n.title}</p>
                      <p className="text-xs text-secondary-text mt-0.5 line-clamp-2">{n.message}</p>
                    </div>
                    <span className="text-[10px] text-secondary-text flex-shrink-0">{new Date(n.createdAt).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
