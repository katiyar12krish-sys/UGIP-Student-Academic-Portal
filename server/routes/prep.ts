// ===================================================================================================
// Placement preparation routes (rules in server/prep/service.ts).
//   GET  /api/prep/info                       my sections + sizes                          (student)
//   POST /api/prep/tests        {category, count, mode}   start a practice / mock test      (student)
//   POST /api/prep/tests/:id/submit  {answers}            grade it, return the review       (student, own test)
//   GET  /api/prep/history                    my attempts and section-wise averages         (student)
//   GET  /api/prep/resume-score[?studentId=]  score + ATS of the uploaded resume  (student own / parent child / staff)
//   GET  /api/prep/tracker[?branch=&semester=]  every visible student's preparation         (admin, faculty)
//   GET  /api/prep/students/:id               one student's full preparation              (admin, faculty, parent)
// ===================================================================================================
import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import { audit } from '../auth/service';
import { hit } from '../auth/rateLimit';
import { prepInfo, startTest, submitTest, myHistory, resumeScoreFor, tracker, studentDetail } from '../prep/service';

export const prepRouter = Router();
// Num.
const num = (v: unknown): number | undefined => { const n = Number(v); return v !== undefined && v !== '' && Number.isInteger(n) ? n : undefined; };

// GET /api/prep/info  (who: only student)
prepRouter.get('/prep/info', requireRole('student'), (req, res) => res.json(prepInfo(req.user!)));

// POST /api/prep/tests  (who: only student)
prepRouter.post('/prep/tests', requireRole('student'), (req, res) => {
  if (!hit(`prepstart:${req.user!.id}`, 60, 3600_000).allowed) return res.status(429).json({ error: 'Too many tests in an hour. Please take a short break.' });
  const r = startTest(req.user!, req.body || {});
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  res.status(201).json(r.attempt);
});

// POST /api/prep/tests/:id/submit  (who: only the student who started it)
prepRouter.post('/prep/tests/:id/submit', requireRole('student'), (req, res) => {
  const r = submitTest(req.user!, String(req.params.id), req.body?.answers);
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'prep_test_submitted', 'prep_attempt', r.result.id, `${r.result.category} ${r.result.scorePct}%`);
  res.json(r.result);
});

// GET /api/prep/history  (who: only student)
prepRouter.get('/prep/history', requireRole('student'), (req, res) => res.json(myHistory(req.user!)));

// GET /api/prep/resume-score  (who: the student, their parent, staff)
prepRouter.get('/prep/resume-score', requireAuth, (req, res) => {
  const sid = req.user!.role === 'student' ? req.user!.studentId || '' : String(req.query.studentId || '');
  const r = resumeScoreFor(req.user!, sid);
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  const { ok: _ok, ...data } = r;
  res.json(data);
});

// GET /api/prep/tracker  (who: only admin, faculty)
prepRouter.get('/prep/tracker', requireRole('admin', 'faculty'), (req, res) =>
  res.json(tracker(req.user!, { branch: String(req.query.branch || ''), semester: num(req.query.semester) })));

// GET /api/prep/students/:id  (who: admin, faculty, parent of the student)
prepRouter.get('/prep/students/:id', requireRole('admin', 'faculty', 'parent'), (req, res) => {
  const r = studentDetail(req.user!, String(req.params.id));
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  const { ok: _ok, ...data } = r;
  res.json(data);
});
