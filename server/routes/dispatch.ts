// ===================================================================================================
// Class dispatch routes (Step 10). Edit is in server/routes/edits.ts (Step 18).
// ===================================================================================================
import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import { audit } from '../auth/service';
import { hit } from '../auth/rateLimit';
import { dispatchCreated, submissionReceived, submissionGraded } from '../notify/rules';
import { createDispatch, deleteDispatch, findDispatch, toDto, listFor, submitWork, gradeSubmission, canSee, openDispatchFile, openSubmissionFile } from '../dispatch/service';

export const dispatchRouter = Router();
// Quiet.
const quiet = (what: string, fn: () => unknown) => { try { fn(); } catch (e) { console.warn(`[notify] ${what} failed:`, (e as Error).message); } };   // a notification problem never fails the save

// The file upload itself (step one) is POST /api/files in routes/materials.ts; students may use it to hand in work.
dispatchRouter.get('/dispatches', requireRole('admin', 'faculty', 'student'), (req, res) => res.json(listFor(req.user!)));

// POST /api/dispatches  (who: only admin, faculty)
dispatchRouter.post('/dispatches', requireRole('admin', 'faculty'), (req, res) => {
  if (!hit(`dispatch:${req.user!.id}`, 40, 3600_000).allowed) return res.status(429).json({ error: 'Too many items sent in an hour. Please wait.' });
  const r = createDispatch(req.user!, req.body || {});
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'dispatch_sent', 'dispatch', r.id);
  quiet('dispatch', () => dispatchCreated(r.id));
  res.status(201).json(toDto(findDispatch(r.id), req.user!));
});

// DELETE /api/dispatches/:id  (who: only admin, faculty)
dispatchRouter.delete('/dispatches/:id', requireRole('admin', 'faculty'), (req, res) => {
  const r = deleteDispatch(req.user!, String(req.params.id));
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'dispatch_deleted', 'dispatch', String(req.params.id), r.title);
  res.json({ ok: true });
});

// A student hands in (or replaces, before the due date) their work: text and / or one uploaded file.
dispatchRouter.post('/dispatches/:id/submissions', requireRole('student'), (req, res) => {
  if (!hit(`submit:${req.user!.id}`, 20, 3600_000).allowed) return res.status(429).json({ error: 'Too many submissions in an hour. Please wait.' });
  const d = findDispatch(String(req.params.id));
  if (!d || !canSee(req.user!, d)) return res.status(404).json({ error: 'Not found' });
  const r = submitWork(req.user!, d, req.body || {});
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'dispatch_submitted', 'dispatch', d.id);
  quiet('submission', () => submissionReceived(r.id));
  res.status(r.created ? 201 : 200).json(toDto(findDispatch(d.id), req.user!));
});

// POST /api/dispatches/:id/submissions/:sid/grade  (who: only admin, faculty)
dispatchRouter.post('/dispatches/:id/submissions/:sid/grade', requireRole('admin', 'faculty'), (req, res) => {
  if (!hit(`grade:${req.user!.id}`, 300, 3600_000).allowed) return res.status(429).json({ error: 'Too many requests. Please wait.' });
  const d = findDispatch(String(req.params.id));
  if (!d) return res.status(404).json({ error: 'Not found' });
  const r = gradeSubmission(req.user!, d, String(req.params.sid), req.body || {});
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'submission_graded', 'dispatch', d.id, String(req.params.sid));
  quiet('graded', () => submissionGraded(String(req.params.sid)));
  res.json(toDto(findDispatch(d.id), req.user!));
});

// Files. Only through these two routes, after the access check; there is no public link and no file id in the lists.
const send = (r: ReturnType<typeof openDispatchFile>, download: boolean, res: any) => {
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  const inline = (r.kind === 'pdf' || r.kind === 'image') && !download;
  const ascii = r.name.replace(/[^\x20-\x7e]/g, '_');
  res.setHeader('Content-Type', r.mime);
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(r.name)}`);
  res.setHeader('Cache-Control', 'private, no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(r.path);
};
// GET /api/dispatches/:id/file  (who: any signed-in user)
dispatchRouter.get('/dispatches/:id/file', requireAuth, (req, res) => send(openDispatchFile(req.user!, String(req.params.id)), req.query.download === '1', res));
// GET /api/dispatches/:id/submissions/:sid/file  (who: any signed-in user)
dispatchRouter.get('/dispatches/:id/submissions/:sid/file', requireAuth, (req, res) => send(openSubmissionFile(req.user!, String(req.params.id), String(req.params.sid)), req.query.download === '1', res));
