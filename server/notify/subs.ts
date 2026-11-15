// ===================================================================================================
// Push-notification subscriptions of each device, with a safety check on the push address.
// ===================================================================================================
import { db } from '../db/connection';

// SSRF guard: the server will POST to whatever endpoint a browser hands it. Only the real push services are allowed.
// Extra hosts (rare, e.g. a self-hosted gateway) can be added with PUSH_ENDPOINT_HOSTS="host1,host2".
const SUFFIXES = ['fcm.googleapis.com', 'android.googleapis.com', 'push.services.mozilla.com', 'push.apple.com', 'notify.windows.com'];
// true / false: is allowed push endpoint?
export function isAllowedPushEndpoint(endpoint: unknown): boolean {
  if (typeof endpoint !== 'string' || endpoint.length > 1000) return false;
  let u: URL; try { u = new URL(endpoint); } catch { return false; }
  if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443')) return false;
  const h = u.hostname.toLowerCase();
  const extra = (process.env.PUSH_ENDPOINT_HOSTS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return extra.includes(h) || SUFFIXES.some((s) => h === s || h.endsWith('.' + s));
}

// B64u len.
const b64uLen = (s: unknown) => typeof s === 'string' && /^[A-Za-z0-9_-]+={0,2}$/.test(s) ? Buffer.from(s, 'base64url').length : -1;
// Valid subscription.
export function validSubscription(sub: any): sub is { endpoint: string; keys: { p256dh: string; auth: string } } {
  return !!sub && isAllowedPushEndpoint(sub.endpoint) && b64uLen(sub.keys?.p256dh) === 65 && b64uLen(sub.keys?.auth) === 16;
}

export const MAX_DEVICES = 5;
// Add subscription.
export function addSubscription(userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }, ua: string): { ok: true } | { ok: false; error: string } {
  const mine = db.prepare('SELECT id, endpoint FROM push_subscriptions WHERE user_id=? ORDER BY id').all(userId) as any[];
  const same = mine.find((m) => m.endpoint === sub.endpoint);
  if (!same && mine.length >= MAX_DEVICES) return { ok: false, error: `You can use notifications on at most ${MAX_DEVICES} devices. Remove one first.` };
  // the same endpoint may previously belong to someone else on a shared computer: it moves to the current person
  db.prepare(`INSERT INTO push_subscriptions (user_id,endpoint,p256dh,auth,user_agent,created_at) VALUES (?,?,?,?,?,?)
              ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id, p256dh=excluded.p256dh, auth=excluded.auth, user_agent=excluded.user_agent, fail_count=0`)
    .run(userId, sub.endpoint, sub.keys.p256dh, sub.keys.auth, ua.slice(0, 200), Date.now());
  return { ok: true };
}
// Remove by endpoint.
export const removeByEndpoint = (userId: string, endpoint: string) => Number(db.prepare('DELETE FROM push_subscriptions WHERE user_id=? AND endpoint=?').run(userId, endpoint).changes) > 0;
// Remove by id.
export const removeById = (userId: string, id: number) => Number(db.prepare('DELETE FROM push_subscriptions WHERE user_id=? AND id=?').run(userId, id).changes) > 0;
// List devices.
export const listDevices = (userId: string) => db.prepare('SELECT id, user_agent AS userAgent, created_at AS createdAt, last_ok_at AS lastOkAt FROM push_subscriptions WHERE user_id=? ORDER BY id').all(userId);
// Subs of.
export const subsOf = (userId: string) => db.prepare('SELECT id, endpoint, p256dh, auth, fail_count FROM push_subscriptions WHERE user_id=?').all(userId) as any[];

/** Called when "notifications" consent is withdrawn: nothing more is sent and no device stays registered. */
export function dropAllNotificationData(userId: string) {
  db.prepare('DELETE FROM push_subscriptions WHERE user_id=?').run(userId);
  db.prepare("UPDATE notifications SET push_state='skipped' WHERE user_id=? AND push_state='pending'").run(userId);
}
