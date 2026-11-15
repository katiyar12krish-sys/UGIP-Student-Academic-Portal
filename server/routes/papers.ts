// ===================================================================================================
// Question papers + answer keys. Every "who may" rule is in server/papers/service.ts.
// Files are uploaded first with POST /api/files (routes/materials.ts), then attached here by their fileId.
// ===================================================================================================
import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import { audit } from '../auth/service';
import { hit } from '../auth/rateLimit';
import { listFor, subjectChoices, openFile, createPaper, setAnswer, setPaperFile, deletePaper, restoreSamples, findPaper, toDto } from '../papers/service';

export const papersRouter = Router();

// GET /api/question-papers  (who: admin, faculty, student — students see common + own branch)
papersRouter.get('/question-papers', requireAuth, (req, res) => res.json(listFor(req.user!)));

// GET /api/question-papers/subjects  (who: admin, faculty) — choices for the upload form
papersRouter.get('/question-papers/subjects', requireRole('admin', 'faculty'), (_req, res) => res.json(subjectChoices()));

// POST /api/question-papers  (who: admin, faculty) — add a new paper (+ optional answer key)
papersRouter.post('/question-papers', requireRole('admin', 'faculty'), (req, res) => {
  if (!hit(`qpaper:${req.user!.id}`, 60, 3600_000).allowed) return res.status(429).json({ error: 'Too many papers in an hour. Please wait.' });
  const r = createPaper(req.user!, req.body || {});
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'question_paper_added', 'question_paper', r.id);
  res.status(201).json(toDto(findPaper(r.id), req.user!));
});

// PUT /api/question-papers/:id/answer  (who: admin, faculty) — upload / replace the answer key
papersRouter.put('/question-papers/:id/answer', requireRole('admin', 'faculty'), (req, res) => {
  const id = String(req.params.id);
  const r = setAnswer(req.user!, id, req.body?.fileId);
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'answer_key_updated', 'question_paper', id);
  res.json(toDto(findPaper(id), req.user!));
});

// PUT /api/question-papers/:id/paper  (who: admin, or the teacher who added it) — replace the paper file
papersRouter.put('/question-papers/:id/paper', requireRole('admin', 'faculty'), (req, res) => {
  const id = String(req.params.id);
  const r = setPaperFile(req.user!, id, req.body?.fileId);
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'question_paper_replaced', 'question_paper', id);
  res.json(toDto(findPaper(id), req.user!));
});

// DELETE /api/question-papers/:id  (who: admin, or the teacher who added it)
papersRouter.delete('/question-papers/:id', requireRole('admin', 'faculty'), (req, res) => {
  const id = String(req.params.id);
  const r = deletePaper(req.user!, id);
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'question_paper_removed', 'question_paper', id, r.title);
  res.json({ ok: true });
});

// POST /api/question-papers/restore-samples  (who: admin) — bring back removed built-in sample papers
papersRouter.post('/question-papers/restore-samples', requireRole('admin'), async (req, res, next) => {
  try {
    const r = await restoreSamples(req.user!);
    if (!r.ok) return res.status(r.status).json({ error: r.error });
    audit(req.user!.username, 'sample_papers_restored', 'question_paper', null, String(r.restored));
    res.json({ ok: true, restored: r.restored });
  } catch (e) { next(e); }
});

// GET /api/question-papers/:id/paper|answer  — opens in the browser; ?download=1 saves it
for (const which of ['paper', 'answer'] as const) {
  papersRouter.get(`/question-papers/:id/${which}`, requireAuth, (req, res) => {
    const download = req.query.download === '1';
    const r = openFile(req.user!, String(req.params.id), which, true);
    if (!r.ok) return res.status(r.status).json({ error: r.error });
    const inline = !download && (r.mime === 'application/pdf' || r.mime.startsWith('image/'));
    const ascii = r.name.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, "'");
    res.setHeader('Content-Type', r.mime);
    res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(r.name)}`);
    res.setHeader('Cache-Control', 'private, no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(r.data);
  });
}
