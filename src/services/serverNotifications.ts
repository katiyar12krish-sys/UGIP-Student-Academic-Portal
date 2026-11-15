// ===================================================================================================
// React hook that keeps the notification bell in step with the server.
// ===================================================================================================
import { useEffect, useRef } from 'react';
import { pushApi } from './pushApi';
import type { AppNotification, NotificationCategory } from '../types';

// Category of.
const categoryOf = (kind: string): NotificationCategory =>
  kind === 'exam_reminder' || kind.startsWith('assignment_') ? 'exam' : kind === 'notice' || kind === 'direct_notice' ? 'circular' : kind === 'marks_published' || kind === 'material' || kind.startsWith('doubt_') ? 'academic' : kind === 'absent' || kind === 'low_attendance' ? 'attendance' : 'system';

/**
 * Brings the server's notifications (exam reminders, marks added, attendance alerts) into the bell and toast the app already has.
 * Polls once a minute while the person is signed in. Each message is shown once on this device; messages older than a day are not replayed.
 */
export function useServerNotifications(userId: string | undefined, add: (n: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>) => void) {
  const addRef = useRef(add); addRef.current = add;
  // Runs automatically whenever these change: userId.
  useEffect(() => {
    if (!userId) return;
    const key = `ugip_srvnotif_seen_${userId}`;
    let stopped = false;
    // Poll.
    const poll = async () => {
      if (stopped || document.visibilityState === 'hidden') return;
      const r = await pushApi.list();
      if (!r.ok || stopped) return;
      let seen: number[] = [];
      try { seen = JSON.parse(localStorage.getItem(key) || '[]'); } catch { /* start fresh */ }
      const fresh = r.data.items.filter((i) => !i.read && !seen.includes(i.id) && Date.now() - i.createdAt < 24 * 3600_000).reverse().slice(-5);
      for (const i of fresh) {
        addRef.current({ title: i.title, message: i.body, category: categoryOf(i.kind), priority: i.kind === 'absent' || i.kind === 'low_attendance' ? 'high' : 'normal' });
      }
      const ids = r.data.items.filter((i) => !i.read).map((i) => i.id);
      if (ids.length) {
        try { localStorage.setItem(key, JSON.stringify([...seen, ...ids].slice(-200))); } catch { /* storage full */ }
        await pushApi.markRead(ids);
      }
    };
    poll();
    const t = setInterval(poll, 60_000);
    // Called when: visible.
    const onVisible = () => { if (document.visibilityState === 'visible') poll(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { stopped = true; clearInterval(t); document.removeEventListener('visibilitychange', onVisible); };
  }, [userId]);
}
