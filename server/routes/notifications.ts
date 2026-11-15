// ===================================================================================================
// The person's own notification list (the bell) and push-device registration.
// ===================================================================================================
import { Router } from 'express';
import { db } from '../db/connection';
import { requireAuth } from '../auth/middleware';
import { hasConsent } from '../auth/consent';
import { audit } from '../auth/service';
import { hit } from '../auth/rateLimit';
import { vapid, pushEnabled } from '../notify/sender';
import { notifyUser } from '../notify/service';
import { addSubscription, removeByEndpoint, removeById, listDevices, validSubscription, isAllowedPushEndpoint } from '../notify/subs';

export const notificationsRouter = Router();

// Dto.
const dto = (r: any) => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, url: r.url, createdAt: r.created_at, read: !!r.read_at });

// ---- the person's own list ----
notificationsRouter.get('/notifications', requireAuth, (req, res) => {
  const uid = req.user!.id;
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  const before = Number(req.query.before) || Number.MAX_SAFE_INTEGER;
  const items = db.prepare('SELECT * FROM notifications WHERE user_id=? AND id<? ORDER BY id DESC LIMIT ?').all(uid, before, limit) as any[];
  const unread = (db.prepare('SELECT COUNT(*) c FROM notifications WHERE user_id=? AND read_at IS NULL').get(uid) as any).c;
  res.json({ items: items.map(dto), unread });
});

// POST /api/notifications/read  (who: any signed-in user)
notificationsRouter.post('/notifications/read', requireAuth, (req, res) => {
  const uid = req.user!.id, now = Date.now();
  if (req.body?.all === true) db.prepare('UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL').run(now, uid);
  else {
    const ids: number[] = (Array.isArray(req.body?.ids) ? req.body.ids : []).slice(0, 200).map(Number).filter(Number.isInteger);
    const up = db.prepare('UPDATE notifications SET read_at=? WHERE user_id=? AND id=? AND read_at IS NULL');
    for (const id of ids) up.run(now, uid, id);
  }
  res.json({ ok: true });
});

// DELETE /api/notifications  (who: any signed-in user)
notificationsRouter.delete('/notifications', requireAuth, (req, res) => {
  db.prepare('DELETE FROM notifications WHERE user_id=?').run(req.user!.id);
  res.json({ ok: true });
});

// ---- Web Push devices ----
notificationsRouter.get('/push/config', requireAuth, (req, res) => {
  const u = req.user!;
  res.json({ enabled: pushEnabled(), publicKey: pushEnabled() ? vapid().publicKey : null, consent: hasConsent(u.id, 'notifications'),
    // under-18 students: only a parent login can switch notifications on
    needsParent: u.role === 'student' && !!db.prepare('SELECT 1 FROM users WHERE id=? AND adult_verified=0').get(u.id) });
});

// GET /api/push/devices  (who: any signed-in user)
notificationsRouter.get('/push/devices', requireAuth, (req, res) => res.json(listDevices(req.user!.id)));

// POST /api/push/subscribe  (who: any signed-in user)
notificationsRouter.post('/push/subscribe', requireAuth, (req, res) => {
  const u = req.user!;
  if (!pushEnabled()) return res.status(503).json({ error: 'Push notifications are not set up on this server yet.' });
  if (!hasConsent(u.id, 'notifications')) return res.status(403).json({ error: 'notifications_consent_required' });
  if (!hit(`pushsub:${u.id}`, 20, 3600_000).allowed) return res.status(429).json({ error: 'Too many requests. Try later.' });
  const sub = req.body?.subscription;
  if (!validSubscription(sub)) return res.status(400).json({ error: isAllowedPushEndpoint(sub?.endpoint) ? 'Invalid subscription keys' : 'This browser\'s push service is not supported' });
  const r = addSubscription(u.id, sub, String(req.headers['user-agent'] || ''));
  if (!r.ok) return res.status(400).json({ error: r.error });
  audit(u.username, 'push_device_added', 'user', u.id);
  res.status(201).json({ ok: true });
});

// POST /api/push/unsubscribe  (who: any signed-in user)
notificationsRouter.post('/push/unsubscribe', requireAuth, (req, res) => {
  removeByEndpoint(req.user!.id, String(req.body?.endpoint || ''));
  res.json({ ok: true });
});
// DELETE /api/push/devices/:id  (who: any signed-in user)
notificationsRouter.delete('/push/devices/:id', requireAuth, (req, res) => {
  removeById(req.user!.id, Number(req.params.id));
  res.json({ ok: true });
});

// "Send me a test": the quickest way to check that a phone is set up properly
notificationsRouter.post('/push/test', requireAuth, (req, res) => {
  const u = req.user!;
  if (!hit(`pushtest:${u.id}`, 3, 10 * 60_000).allowed) return res.status(429).json({ error: 'Wait a few minutes before another test.' });
  if (!hasConsent(u.id, 'notifications')) return res.status(403).json({ error: 'notifications_consent_required' });
  notifyUser(u.id, { kind: 'test', title: 'Test notification', body: 'Notifications are working on your devices.', url: '/', dedupeKey: `test:${Date.now()}` });
  res.json({ ok: true, pushEnabled: pushEnabled() });
});
