// Exams + marks routes (/api/tests ...). The full list of routes and who may use them is in the box below the imports.
import { Router } from 'express';
import { db } from '../db/connection';
import { requireAuth, requireRole } from '../auth/middleware';
import { keepRow } from '../auth/sample';
import { audit } from '../auth/service';
import { marksPublished } from '../notify/rules';
import { canTeach, canReadSubjectMarks, studentRow, studentInClass, studentWasInClass, ownStudentIds, gradeFor, clean, newId } from '../academic/access';
import { academicYearOf, academicYearOfDate } from '../academic/calendar';

// =====================================================================================================
import { writeDenied } from '../auth/permissions';   // admin-given feature switches + cross-subject alerts
// Exams + marks  ->  /api/tests ...
//   GET    /tests                       list (role-filtered; ?academicYear=2025-26 to see one year only)
//   POST   /tests                       create an exam (teacher of the subject / admin)
//   PUT    /tests/:id                   Step 18: EDIT an exam's details (title, type, max marks, date, room...)
//   DELETE /tests/:id                   delete an exam (soft delete, marks are kept)
//   PUT    /tests/:id/marks             save marks of many students at once (add or change)
//   DELETE /tests/:id/marks/:studentId  delete one student's marks
// =====================================================================================================
export const marksRouter = Router();
// 'Class Test', 'MCQ Test' and 'Assignment' were added in Step 18 (UBTER sessional pattern: CT-1..CT-5, MCQ-1..MCQ-5).
const TYPES = ['Sessional 1', 'Sessional 2', 'Unit Test', 'Class Test', 'MCQ Test', 'Assignment', 'Practical / Viva', 'Pre-Board Mock', 'Board Exam'];
const STATUSES_EDIT = ['Upcoming', 'Ongoing', 'Completed'];

/** Does this student already have a mark in this exam? (then it may always be corrected, even after promotion) */
const alreadyMarked = (testId: string, sid: string) => !!db.prepare('SELECT 1 FROM test_marks WHERE test_id=? AND student_id=?').get(testId, sid);
const STATUSES = ['Upcoming', 'Ongoing', 'Completed'];

// Marks by test.
function marksByTest(): Map<string, any[]> {
  const m = new Map<string, any[]>();
  const rows = db.prepare(`SELECT k.*, s.name AS sname, s.roll_no FROM test_marks k JOIN students s ON s.id=k.student_id WHERE s.deleted_at IS NULL ORDER BY s.roll_no`).all() as any[];
  for (const r of rows) m.set(r.test_id, [...(m.get(r.test_id) || []), r]);
  return m;
}

// Converts to dto.
function toDto(t: any, rows: any[], max = t.max_marks) {
  return {
    id: t.id, title: t.title, type: t.type, subjectId: t.subject_id, subjectName: t.sname, subjectCode: t.code,
    maxMarks: t.max_marks, date: t.date || '', timeSlot: t.time_slot || undefined, roomNumber: t.room || undefined,
    duration: t.duration || undefined, reportingTime: t.reporting_time || undefined, instructions: t.instructions || undefined,
    status: t.status, branch: t.branch, semester: t.semester,
    academicYear: t.academic_year || undefined, isDemo: !!t.is_demo,     // Step 18
    results: rows.map((r) => {
      const pct = Math.round((r.marks_obtained / max) * 1000) / 10;
      return { studentId: r.student_id, studentName: r.sname, rollNo: r.roll_no, marksObtained: r.marks_obtained, totalMarks: max,
        percentage: pct, grade: gradeFor(pct), remarks: r.remarks || undefined };
    }),
  };
}
const TEST_SQL = `SELECT t.*, s.code, s.name AS sname FROM tests t JOIN subjects s ON s.id=t.subject_id WHERE t.deleted_at IS NULL`;

// What each role may see:
//   admin   -> everything          faculty -> schedule of all exams, marks only for subjects they teach / were granted
//   student -> their class' exams, only their own marks row          parent -> same, for their children
marksRouter.get('/tests', requireAuth, (req, res) => {
  const u = req.user!;
  const all = marksByTest();
  const year = String(req.query.academicYear || '');            // '' or 'all' = every year
  const tests = (db.prepare(TEST_SQL + ' ORDER BY t.date DESC, t.created_at DESC').all() as any[])
    .filter((t) => !year || year === 'all' || t.academic_year === year).filter(keepRow(req.user));
  const own = new Set(ownStudentIds(u));
  const ownClasses = [...own].map(studentRow).filter(Boolean);
  const thisYear = academicYearOf();
  const out = [];
  for (const t of tests) {
    const rows = all.get(t.id) || [];
    if (u.role === 'admin') out.push(toDto(t, rows));
    else if (u.role === 'faculty') out.push(toDto(t, canReadSubjectMarks(u, t.subject_id) ? rows : []));
    else {
      // Student / parent (Step 18): an exam belongs to the child when
      //   (a) it is for their CURRENT class in THIS academic year (a new 1st year does not see last year's tests), or
      //   (b) they already have marks in it (any year: their history is kept), or
      //   (c) the class history says they were in that class in the exam's academic year.
      const mine = [...own].filter((sid) => {
        const s: any = ownClasses.find((c: any) => c.id === sid);
        const current = !!s && s.branch === t.branch && s.semester === t.semester && (!t.academic_year || t.academic_year === thisYear);
        return current || rows.some((r) => r.student_id === sid) || studentWasInClass(sid, t.branch, t.semester, t.academic_year);
      });
      if (mine.length) out.push(toDto(t, rows.filter((r) => mine.includes(r.student_id))));
    }
  }
  res.json(out);
});

// POST /api/tests  (who: only admin, faculty)
marksRouter.post('/tests', requireRole('admin', 'faculty'), (req, res) => {
  const b = req.body || {};
  const sub = db.prepare('SELECT * FROM subjects WHERE id=?').get(String(b.subjectId || '')) as any;
  if (!sub) return res.status(400).json({ error: 'Unknown subject' });
  { const no = writeDenied(req.user!, sub.id, 'marks', 'create an exam'); if (no) return res.status(403).json({ error: no }); }
  const title = clean(b.title, 200);
  const max = Number(b.maxMarks);
  if (!title) return res.status(400).json({ error: 'Title is required' });
  if (!TYPES.includes(b.type)) return res.status(400).json({ error: 'Invalid exam type' });
  if (!Number.isFinite(max) || max <= 0 || max > 1000) return res.status(400).json({ error: 'Max marks must be between 1 and 1000' });
  const id = newId('tst');
  db.prepare(`INSERT INTO tests (id,title,type,subject_id,max_marks,date,time_slot,room,duration,reporting_time,instructions,status,branch,semester,created_by,academic_year)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, title, b.type, sub.id, max, clean(b.date, 20), clean(b.timeSlot, 60), clean(b.roomNumber, 80), clean(b.duration, 40),
    clean(b.reportingTime, 40), clean(b.instructions, 1000), STATUSES.includes(b.status) ? b.status : 'Upcoming', sub.branch, sub.semester, req.user!.username,
    academicYearOfDate(b.date));   // Step 18: the exam date decides its academic year
  audit(req.user!.username, 'test_created', 'test', id, `${sub.code} max=${max}`);
  res.status(201).json(toDto(db.prepare(TEST_SQL + ' AND t.id=?').get(id), []));
});

// Step 18: edit an exam's details. Fields not sent keep their old value. Max marks cannot go below a mark already given.
marksRouter.put('/tests/:id', requireRole('admin', 'faculty'), (req, res) => {
  const t = db.prepare(TEST_SQL + ' AND t.id=?').get(req.params.id) as any;
  if (!t) return res.status(404).json({ error: 'Exam not found' });
  { const no = writeDenied(req.user!, t.subject_id, 'marks', 'change exams / marks'); if (no) return res.status(403).json({ error: no }); }
  const b = { title: t.title, type: t.type, maxMarks: t.max_marks, date: t.date, timeSlot: t.time_slot, roomNumber: t.room, duration: t.duration,
    reportingTime: t.reporting_time, instructions: t.instructions, status: t.status, ...(req.body || {}) };
  const title = clean(b.title, 200);
  const max = Number(b.maxMarks);
  if (!title) return res.status(400).json({ error: 'Title is required' });
  if (!TYPES.includes(b.type)) return res.status(400).json({ error: 'Invalid exam type' });
  if (!Number.isFinite(max) || max <= 0 || max > 1000) return res.status(400).json({ error: 'Max marks must be between 1 and 1000' });
  const top = (db.prepare('SELECT MAX(marks_obtained) m FROM test_marks WHERE test_id=?').get(t.id) as any)?.m;
  if (top !== null && top !== undefined && top > max) return res.status(400).json({ error: 'A student already has ' + top + ' marks. Max marks cannot be less than that.' });
  db.prepare('UPDATE tests SET title=?, type=?, max_marks=?, date=?, time_slot=?, room=?, duration=?, reporting_time=?, instructions=?, status=?, academic_year=? WHERE id=?')
    .run(title, b.type, max, clean(b.date, 20), clean(b.timeSlot, 60), clean(b.roomNumber, 80), clean(b.duration, 40), clean(b.reportingTime, 40),
      clean(b.instructions, 1000), STATUSES_EDIT.includes(b.status) ? b.status : t.status, b.date ? academicYearOfDate(b.date) : t.academic_year, t.id);
  audit(req.user!.username, 'test_updated', 'test', t.id);
  res.json(toDto(db.prepare(TEST_SQL + ' AND t.id=?').get(t.id), marksByTest().get(t.id) || []));
});

// DELETE /api/tests/:id  (who: only admin, faculty)
marksRouter.delete('/tests/:id', requireRole('admin', 'faculty'), (req, res) => {
  const t = db.prepare(TEST_SQL + ' AND t.id=?').get(req.params.id) as any;
  if (!t) return res.status(404).json({ error: 'Exam not found' });
  { const no = writeDenied(req.user!, t.subject_id, 'marks', 'change exams / marks'); if (no) return res.status(403).json({ error: no }); }
  db.prepare('UPDATE tests SET deleted_at=CURRENT_TIMESTAMP WHERE id=?').run(t.id);   // soft delete; marks are kept
  audit(req.user!.username, 'test_deleted', 'test', t.id);
  res.json({ ok: true });
});

// Bulk save marks: [{ studentId, marksObtained, remarks? }]. Percentage and grade are computed here, never trusted from the client.
marksRouter.put('/tests/:id/marks', requireRole('admin', 'faculty'), (req, res) => {
  const t = db.prepare(TEST_SQL + ' AND t.id=?').get(req.params.id) as any;
  if (!t) return res.status(404).json({ error: 'Exam not found' });
  { const no = writeDenied(req.user!, t.subject_id, 'marks', 'change exams / marks'); if (no) return res.status(403).json({ error: no }); }
  const list: any[] = Array.isArray(req.body?.marks) ? req.body.marks : [];
  if (!list.length || list.length > 300) return res.status(400).json({ error: 'Send between 1 and 300 marks' });
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const m of list) {
    const sid = String(m?.studentId || '');
    const v = m?.marksObtained;
    if (seen.has(sid)) problems.push(`${sid}: listed twice`);
    seen.add(sid);
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > t.max_marks) problems.push(`${sid}: marks must be a number from 0 to ${t.max_marks}`);
    else if (!studentInClass(sid, t.branch, t.semester, t.academic_year) && !alreadyMarked(t.id, sid)) problems.push(`${sid}: not a student of ${t.branch} semester ${t.semester}`);
  }
  if (problems.length) return res.status(400).json({ error: problems.slice(0, 5).join('; ') });
  const alreadyHad = new Set((db.prepare('SELECT student_id FROM test_marks WHERE test_id=?').all(t.id) as any[]).map((r) => r.student_id));
  db.exec('BEGIN');
  try {
    const up = db.prepare(`INSERT INTO test_marks (test_id,student_id,marks_obtained,remarks,updated_by) VALUES (?,?,?,?,?)
      ON CONFLICT(test_id,student_id) DO UPDATE SET marks_obtained=excluded.marks_obtained, remarks=excluded.remarks, updated_by=excluded.updated_by, updated_at=CURRENT_TIMESTAMP`);
    for (const m of list) up.run(t.id, m.studentId, m.marksObtained, clean(m.remarks, 300), req.user!.username);
    audit(req.user!.username, 'marks_saved', 'test', t.id, `${list.length} students`);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  try { marksPublished(t.id, list.map((m: any) => String(m.studentId)).filter((id: string) => !alreadyHad.has(id))); }   // first time only; a notification problem never fails the save
  catch (e) { console.warn('[notify] marks notification failed:', (e as Error).message); }
  res.json(toDto(t, marksByTest().get(t.id) || []));
});

// DELETE /api/tests/:id/marks/:studentId  (who: only admin, faculty)
marksRouter.delete('/tests/:id/marks/:studentId', requireRole('admin', 'faculty'), (req, res) => {
  const t = db.prepare(TEST_SQL + ' AND t.id=?').get(req.params.id) as any;
  if (!t) return res.status(404).json({ error: 'Exam not found' });
  { const no = writeDenied(req.user!, t.subject_id, 'marks', 'change exams / marks'); if (no) return res.status(403).json({ error: no }); }
  db.prepare('DELETE FROM test_marks WHERE test_id=? AND student_id=?').run(t.id, req.params.studentId);
  audit(req.user!.username, 'mark_deleted', 'test', t.id, req.params.studentId);
  res.json({ ok: true });
});

// ---- "Let a colleague read my marks sheet" (replaces the old shared passcodes) ----
marksRouter.get('/marks-access/grants', requireRole('admin', 'faculty'), (req, res) => {
  const u = req.user!;
  const rows = u.role === 'admin'
    ? db.prepare('SELECT owner_user_id AS ownerId, grantee_user_id AS granteeId, granted_by AS grantedBy, granted_at AS grantedAt FROM marks_access_grants').all()
    : db.prepare('SELECT owner_user_id AS ownerId, grantee_user_id AS granteeId, granted_by AS grantedBy, granted_at AS grantedAt FROM marks_access_grants WHERE owner_user_id=? OR grantee_user_id=?').all(u.id, u.id);
  res.json(rows);
});

// POST /api/marks-access/grants  (who: only admin, faculty)
marksRouter.post('/marks-access/grants', requireRole('admin', 'faculty'), (req, res) => {
  const { ownerId, granteeId } = req.body || {};
  const u = req.user!;
  if (u.role !== 'admin' && u.id !== ownerId) return res.status(403).json({ error: 'Only the sheet owner or an admin can grant access' });
  // Ok.
  const ok = (id: string) => !!db.prepare("SELECT 1 FROM users WHERE id=? AND role='faculty' AND is_active=1").get(String(id));
  if (!ok(ownerId) || !ok(granteeId) || ownerId === granteeId) return res.status(400).json({ error: 'Both must be different, active faculty members' });
  db.prepare('INSERT OR IGNORE INTO marks_access_grants (owner_user_id,grantee_user_id,granted_by) VALUES (?,?,?)').run(ownerId, granteeId, u.username);
  audit(u.username, 'marks_access_granted', 'user', ownerId, `to=${granteeId}`);
  res.status(201).json({ ok: true });
});

// DELETE /api/marks-access/grants/:ownerId/:granteeId  (who: only admin, faculty)
marksRouter.delete('/marks-access/grants/:ownerId/:granteeId', requireRole('admin', 'faculty'), (req, res) => {
  const u = req.user!;
  if (u.role !== 'admin' && u.id !== req.params.ownerId && u.id !== req.params.granteeId) return res.status(403).json({ error: 'Not allowed' });
  db.prepare('DELETE FROM marks_access_grants WHERE owner_user_id=? AND grantee_user_id=?').run(req.params.ownerId, req.params.granteeId);
  audit(u.username, 'marks_access_revoked', 'user', req.params.ownerId, `from=${req.params.granteeId}`);
  res.json({ ok: true });
});
