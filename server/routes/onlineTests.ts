// ===================================================================================================
// Online test / assignment routes (Step 7): list, create, answer, remind. Edit / delete: server/routes/edits.ts.
// ===================================================================================================
import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import { audit } from '../auth/service';
import { notifyUser } from '../notify/service';
import { assignmentCreated } from '../notify/rules';
import { hit } from '../auth/rateLimit';
import { createTest, findTest, listFor, toDto, canManage, canSee, questionsForStudent, submit, pendingStudents, GRACE_MS, timeLeftLabel } from '../assignments/service';

export const onlineTestsRouter = Router();

// What each role gets:
//   admin -> every test, with the answer key and all results      faculty -> only tests of subjects they teach (same rule as marks), with the key
//   student -> tests of their own class, NO answer key, only their own result      parent -> nothing
onlineTestsRouter.get('/online-tests', requireAuth, (req, res) => res.json(listFor(req.user!)));

// POST /api/online-tests  (who: only admin, faculty)
onlineTestsRouter.post('/online-tests', requireRole('admin', 'faculty'), (req, res) => {
  const r = createTest(req.user!, req.body || {});
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'online_test_created', 'online_test', r.id);
  try { assignmentCreated(r.id); } catch (e) { console.warn('[notify] new-test notification failed:', (e as Error).message); }   // never fails the create
  res.status(201).json(toDto(findTest(r.id), req.user!));
});

// The questions a student answers. No answer key. Closed after the deadline.
onlineTestsRouter.get('/online-tests/:id/questions', requireRole('student'), (req, res) => {
  const t = findTest(String(req.params.id));
  if (!t || !canSee(req.user!, t)) return res.status(404).json({ error: 'Test not found' });
  if (Date.now() > t.deadline_at + GRACE_MS) return res.status(403).json({ error: 'The deadline has passed. This test is closed.' });
  res.json({ questions: questionsForStudent(t.id) });
});

// POST /api/online-tests/:id/submit  (who: only student)
onlineTestsRouter.post('/online-tests/:id/submit', requireRole('student'), (req, res) => {
  if (!hit(`otsubmit:${req.user!.id}`, 20, 10 * 60_000).allowed) return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes.' });
  const t = findTest(String(req.params.id));
  if (!t || !canSee(req.user!, t)) return res.status(404).json({ error: 'Test not found' });
  const r = submit(req.user!, t, req.body?.answers);
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'online_test_submitted', 'online_test', t.id);
  res.json({ result: r.result, review: r.review, test: toDto(findTest(t.id), req.user!) });
});

// Teacher / admin: remind the students who have not submitted yet (at most once per hour per test).
onlineTestsRouter.post('/online-tests/:id/remind', requireRole('admin', 'faculty'), (req, res) => {
  const t = findTest(String(req.params.id));
  if (!t || !canManage(req.user!, t)) return res.status(404).json({ error: 'Test not found' });
  const now = Date.now();
  const pending = pendingStudents(t);
  let sent = 0;
  for (const st of pending)
    if (notifyUser(st.id, { kind: 'assignment_reminder', title: `Please submit: ${t.title}`,
      body: `${t.sname} is not submitted yet. Deadline ${t.deadline_date} ${t.deadline_time} (${timeLeftLabel(t.deadline_at - now)}).`, url: '/', dedupeKey: `asg:${t.id}:manual:${Math.floor(now / 3600_000)}` }, now)) sent++;
  audit(req.user!.username, 'online_test_reminder', 'online_test', t.id, `pending=${pending.length} notified=${sent}`);
  res.json({ pending: pending.length, sentCount: sent, targetStudents: pending.map((s) => s.name) });
});
