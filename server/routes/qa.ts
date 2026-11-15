// Doubt Q&A posts (questions + optional PDF for a class). Rules: server/qa/service.ts
import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import { audit } from '../auth/service';
import { hit } from '../auth/rateLimit';
import { listFor, createPost, deletePost, openFile, findPost, toDto } from '../qa/service';

export const qaRouter = Router();

// GET /api/qa  (who: any signed-in user; students / parents get their own class only)
qaRouter.get('/qa', requireAuth, (req, res) => res.json(listFor(req.user!)));

// POST /api/qa  (who: admin any class, faculty own subject)
qaRouter.post('/qa', requireRole('admin', 'faculty'), (req, res) => {
  if (!hit(`qa:${req.user!.id}`, 40, 3600_000).allowed) return res.status(429).json({ error: 'Too many posts in an hour. Please wait.' });
  const r = createPost(req.user!, req.body || {});
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'qa_posted', 'qa', r.id);
  res.status(201).json(toDto(findPost(r.id), req.user!));
});

// DELETE /api/qa/:id  (who: admin, or the teacher who posted it)
qaRouter.delete('/qa/:id', requireRole('admin', 'faculty'), (req, res) => {
  const r = deletePost(req.user!, String(req.params.id));
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'qa_deleted', 'qa', String(req.params.id));
  res.json({ ok: true });
});

// GET /api/qa/:id/file  (who: whoever may see the post)
qaRouter.get('/qa/:id/file', requireAuth, (req, res) => {
  const r = openFile(req.user!, String(req.params.id));
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  const inline = (r.kind === 'pdf' || r.kind === 'image') && req.query.download !== '1';
  const ascii = r.name.replace(/[^\x20-\x7e]/g, '_');
  res.setHeader('Content-Type', r.mime);
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(r.name)}`);
  res.setHeader('Cache-Control', 'private, no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(r.path);
});
