// ===================================================================================================
// Doubt routes (Step 8): ask, reply, mark resolved. Delete is in server/routes/edits.ts (Step 18).
// ===================================================================================================
import { Router } from 'express';
import { requireRole } from '../auth/middleware';
import { audit } from '../auth/service';
import { hit } from '../auth/rateLimit';
import { doubtAsked, doubtReplied, doubtResolved } from '../notify/rules';
import { askDoubt, findDoubt, toDoubtDto, listDoubtsFor, replyDoubt, resolveDoubt, canSeeDoubt } from '../comms/service';

export const doubtsRouter = Router();
// Quiet.
const quiet = (what: string, fn: () => unknown) => { try { fn(); } catch (e) { console.warn(`[notify] ${what} failed:`, (e as Error).message); } };

// Student: their own doubts. Teacher: doubts of the subjects they teach (same rule as marks). Admin: all.
doubtsRouter.get('/doubts', requireRole('admin', 'faculty', 'student', 'parent'), (req, res) => res.json(listDoubtsFor(req.user!)));

// POST /api/doubts  (who: only student)
doubtsRouter.post('/doubts', requireRole('student'), (req, res) => {
  if (!hit(`doubt:${req.user!.id}`, 10, 3600_000).allowed) return res.status(429).json({ error: 'You have asked many doubts in the last hour. Please wait a little.' });
  const r = askDoubt(req.user!, req.body || {});
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'doubt_asked', 'doubt', r.id);
  quiet('doubt', () => doubtAsked(r.id));
  res.status(201).json(toDoubtDto(findDoubt(r.id)));
});

// Anyone who may open the doubt can write in it. The sender's name and role come from the login.
doubtsRouter.post('/doubts/:id/replies', requireRole('admin', 'faculty', 'student'), (req, res) => {
  if (!hit(`doubtreply:${req.user!.id}`, 40, 10 * 60_000).allowed) return res.status(429).json({ error: 'Too many messages. Please wait a few minutes.' });
  const d = findDoubt(String(req.params.id));
  if (!d || !canSeeDoubt(req.user!, d)) return res.status(404).json({ error: 'Doubt not found' });
  const r = replyDoubt(req.user!, d, req.body?.text);
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  quiet('doubt reply', () => doubtReplied(d.id, r.replyId));
  res.status(201).json(toDoubtDto(findDoubt(d.id)));
});

// POST /api/doubts/:id/resolve  (who: only admin, faculty, student)
doubtsRouter.post('/doubts/:id/resolve', requireRole('admin', 'faculty', 'student'), (req, res) => {
  const d = findDoubt(String(req.params.id));
  if (!d || !canSeeDoubt(req.user!, d)) return res.status(404).json({ error: 'Doubt not found' });
  const r = resolveDoubt(req.user!, d);
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  if (r.changed) { audit(req.user!.username, 'doubt_resolved', 'doubt', d.id); quiet('doubt resolved', () => doubtResolved(d.id, req.user!.id)); }
  res.json(toDoubtDto(findDoubt(d.id)));
});
