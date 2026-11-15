// ===================================================================================================
// Self-service routes: my own profile, my own doubts / replies, my own class-dispatch submission.
//   GET    /api/me/profile                         my details (who: any signed-in user)
//   PUT    /api/me/profile                         correct my own details (only the fields allowed for my role)
//   PUT    /api/doubts/:id/mine                    student: correct the question while no teacher has answered
//   DELETE /api/doubts/:id/replies/:rid            my own reply (admin: any reply)
//   DELETE /api/dispatches/:id/submissions/mine    student: withdraw my submission before the due date
// The rules are in server/self/service.ts. Password change: POST /api/auth/change-password.
// ===================================================================================================
import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import { audit } from '../auth/service';
import { hit } from '../auth/rateLimit';
import { findDoubt, toDoubtDto } from '../comms/service';
import { findDispatch, toDto as dispatchDto } from '../dispatch/service';
import { myProfile, updateMyProfile, editMyDoubt, deleteDoubtReply, withdrawSubmission } from '../self/service';

export const selfRouter = Router();

// GET /api/me/profile  (who: any signed-in user, own data only)
selfRouter.get('/me/profile', requireAuth, (req, res) => {
  const p = myProfile(req.user!);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

// PUT /api/me/profile  (who: any signed-in user, own data only)
selfRouter.put('/me/profile', requireAuth, (req, res) => {
  if (!hit(`profile:${req.user!.id}`, 20, 3600_000).allowed) return res.status(429).json({ error: 'Too many changes in an hour. Please wait.' });
  const r = updateMyProfile(req.user!, req.body || {});
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'own_profile_updated', 'user', req.user!.id, r.changed.join(', '));
  res.json(myProfile(req.user!));
});

// PUT /api/doubts/:id/mine  (who: only the student who asked)
selfRouter.put('/doubts/:id/mine', requireRole('student'), (req, res) => {
  const d = findDoubt(String(req.params.id));
  const r = editMyDoubt(req.user!, d, req.body || {});
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'doubt_edited', 'doubt', d.id);
  res.json(toDoubtDto(findDoubt(d.id)));
});

// DELETE /api/doubts/:id/replies/:rid  (who: the writer of the reply, or admin)
selfRouter.delete('/doubts/:id/replies/:rid', requireRole('admin', 'faculty', 'student'), (req, res) => {
  const d = findDoubt(String(req.params.id));
  const r = deleteDoubtReply(req.user!, d, req.params.rid);
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'doubt_reply_deleted', 'doubt', d.id, `#${req.params.rid}`);
  res.json(toDoubtDto(findDoubt(d.id)));
});

// DELETE /api/dispatches/:id/submissions/mine  (who: only the student who submitted)
selfRouter.delete('/dispatches/:id/submissions/mine', requireRole('student'), (req, res) => {
  const d = findDispatch(String(req.params.id));
  const r = withdrawSubmission(req.user!, d);
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'dispatch_submission_withdrawn', 'dispatch', d.id);
  res.json(dispatchDto(findDispatch(d.id), req.user!));
});
