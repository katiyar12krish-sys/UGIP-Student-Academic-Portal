// ===================================================================================================
// In-app notifications (the bell) and phone push messages for one person, respecting their consent.
// ===================================================================================================
import { db } from '../db/connection';
import { hasConsent } from '../auth/consent';
import { subsOf, removeById } from './subs';
import { sendPush, pushEnabled } from './sender';
import { quietHours } from './time';

// Data shape: notice.
export interface Notice { kind: string; title: string; body: string; url?: string; dedupeKey: string }

/** Creates the in-app notification for one person, unless they have not agreed ("notifications" consent) or already got this one. */
export function notifyUser(userId: string, n: Notice, now = Date.now()): boolean {
  if (!hasConsent(userId, 'notifications')) return false;
  const r = db.prepare('INSERT OR IGNORE INTO notifications (user_id,kind,title,body,url,dedupe_key,created_at) VALUES (?,?,?,?,?,?,?)')
    .run(userId, n.kind, n.title.slice(0, 120), n.body.slice(0, 300), n.url ?? null, n.dedupeKey, now);
  return Number(r.changes) === 1;
}

/** Active parent logins linked to a student. */
export const parentsOf = (studentId: string): string[] =>
  (db.prepare(`SELECT u.id FROM parent_student_links l JOIN users u ON u.id=l.parent_user_id WHERE l.student_id=? AND u.is_active=1`).all(studentId) as any[]).map((r) => r.id);

const STALE_MS = 24 * 3600_000;
const MAX_ATTEMPTS = 3;

/** Push queue worker. Held back in quiet hours; never sends after consent was withdrawn; drops dead devices. */
export async function deliverPending(now = Date.now(), limit = 100): Promise<{ sent: number; skipped: number; waiting: number }> {
  const out = { sent: 0, skipped: 0, waiting: 0 };
  out.skipped += Number(db.prepare("UPDATE notifications SET push_state='skipped' WHERE push_state='pending' AND created_at<?").run(now - STALE_MS).changes);   // too old to be useful
  if (!pushEnabled()) { out.skipped += Number(db.prepare("UPDATE notifications SET push_state='skipped' WHERE push_state='pending'").run().changes); return out; }
  if (quietHours(now)) { out.waiting = (db.prepare("SELECT COUNT(*) c FROM notifications WHERE push_state='pending'").get() as any).c; return out; }
  const rows = db.prepare("SELECT * FROM notifications WHERE push_state='pending' ORDER BY id LIMIT ?").all(limit) as any[];
  for (const n of rows) {
    const subs = hasConsent(n.user_id, 'notifications') ? subsOf(n.user_id) : [];
    if (!subs.length) { db.prepare("UPDATE notifications SET push_state='skipped' WHERE id=?").run(n.id); out.skipped++; continue; }
    let ok = false, transient = false;
    for (const s of subs) {
      const r = await sendPush({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }, { title: n.title, body: n.body, url: n.url || '/', tag: `n${n.id}` });
      if (r.ok) { ok = true; db.prepare('UPDATE push_subscriptions SET last_ok_at=?, fail_count=0 WHERE id=?').run(now, s.id); }
      else if (r.gone) removeById(n.user_id, s.id);
      else {
        transient = true;
        const f = s.fail_count + 1;
        if (f >= 5) removeById(n.user_id, s.id); else db.prepare('UPDATE push_subscriptions SET fail_count=? WHERE id=?').run(f, s.id);
      }
    }
    if (ok) { db.prepare("UPDATE notifications SET push_state='sent', push_attempts=push_attempts+1 WHERE id=?").run(n.id); out.sent++; }
    else if (transient && n.push_attempts + 1 < MAX_ATTEMPTS) { db.prepare('UPDATE notifications SET push_attempts=push_attempts+1 WHERE id=?').run(n.id); out.waiting++; }
    else { db.prepare("UPDATE notifications SET push_state='skipped', push_attempts=push_attempts+1 WHERE id=?").run(n.id); out.skipped++; }
  }
  return out;
}

// Purge old notifications.
export function purgeOldNotifications(now = Date.now()) {
  db.prepare('DELETE FROM notifications WHERE created_at<?').run(now - 90 * 86400_000);
}
