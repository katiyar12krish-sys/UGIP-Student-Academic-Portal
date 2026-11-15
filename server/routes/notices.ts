// ===================================================================================================
// Notice (circular) and one-to-one notice routes (Step 8). Edit / delete added in server/routes/edits.ts.
// ===================================================================================================
import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import { audit } from '../auth/service';
import { hit } from '../auth/rateLimit';
import { noticePublished, directNoticeSent } from '../notify/rules';
import { createNotice, deleteNotice, findNotice, toNoticeDto, listNoticesFor, publicNotices, createDirectNotice, findDirect, toDirectDto, listDirectFor, markDirectRead } from '../comms/service';

export const noticesRouter = Router();
// Quiet.
const quiet = (what: string, fn: () => unknown) => { try { fn(); } catch (e) { console.warn(`[notify] ${what} failed:`, (e as Error).message); } };   // a notification problem never fails the save

// ---- circulars ----
// For visitors who are not logged in (the front page): only notices meant for everybody.
noticesRouter.get('/public/notices', (_req, res) => { res.set('Cache-Control', 'public, max-age=60'); res.json(publicNotices()); });

// Logged in: staff see all, a student sees their class, a parent sees their children's classes.
noticesRouter.get('/notices', requireAuth, (req, res) => res.json(listNoticesFor(req.user!)));

// POST /api/notices  (who: only admin, faculty)
noticesRouter.post('/notices', requireRole('admin', 'faculty'), (req, res) => {
  if (!hit(`notice:${req.user!.id}`, 30, 3600_000).allowed) return res.status(429).json({ error: 'Too many notices in an hour. Please wait.' });
  const r = createNotice(req.user!, req.body || {});
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'notice_published', 'notice', r.id);
  quiet('notice', () => noticePublished(r.id));
  res.status(201).json(toNoticeDto(findNotice(r.id), req.user!));
});

// DELETE /api/notices/:id  (who: only admin, faculty)
noticesRouter.delete('/notices/:id', requireRole('admin', 'faculty'), (req, res) => {
  const r = deleteNotice(req.user!, String(req.params.id));
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'notice_deleted', 'notice', String(req.params.id));
  res.json({ ok: true });
});

// ---- one-to-one notices ----
noticesRouter.get('/direct-notices', requireAuth, (req, res) => res.json(listDirectFor(req.user!)));

// POST /api/direct-notices  (who: only admin, faculty)
noticesRouter.post('/direct-notices', requireRole('admin', 'faculty'), (req, res) => {
  if (!hit(`dnotice:${req.user!.id}`, 60, 3600_000).allowed) return res.status(429).json({ error: 'Too many messages in an hour. Please wait.' });
  const r = createDirectNotice(req.user!, req.body || {});
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'direct_notice_sent', 'direct_notice', r.id, `student=${req.body.studentId}`);
  quiet('direct notice', () => directNoticeSent(r.id));
  res.status(201).json(toDirectDto(findDirect(r.id)));
});

// POST /api/direct-notices/:id/read  (who: only student)
noticesRouter.post('/direct-notices/:id/read', requireRole('student'), (req, res) => {
  const r = markDirectRead(req.user!, String(req.params.id));
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  res.json({ ok: true });
});
