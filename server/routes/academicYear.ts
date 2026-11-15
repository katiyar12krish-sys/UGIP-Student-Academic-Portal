// =====================================================================================================
// Academic year, class promotion, UBTER board results and sample-data cleanup (Step 18)
// -----------------------------------------------------------------------------------------------------
//   GET    /academic/calendar              current academic year, class sizes, automatic-promotion status, history
//   GET    /academic/promotion/preview     ?branch=CSE&fromYear=1  -> who will move up and who will not (with reason)
//   POST   /academic/promotion             { branch?, fromYear?, excludeIds?[] }  promote now (admin)
//   POST   /academic/semester-switch       odd -> even semester now (admin; normally automatic in January)
//   POST   /academic/promotion/undo        undo the most recent promotion / semester switch (admin)
//   GET    /academic/class-history/:studentId   which class the student was in, year by year
//
//   GET    /board-results                  ?branch=&semester=&session=&studentId=  (students/parents: only their own)
//   POST   /board-results                  add one student's semester result (admin, faculty)
//   PUT    /board-results/:id              edit it
//   DELETE /board-results/:id              delete it (admin, faculty)
//
//   GET    /admin/demo-data                how many sample (random) rows exist
//   DELETE /admin/demo-data                delete ALL sample rows in one go (admin) - real data is never touched
// =====================================================================================================
import { Router } from 'express';
import { db } from '../db/connection';
import { requireAuth, requireRole } from '../auth/middleware';
import { realOnly } from '../auth/sample';
import { audit } from '../auth/service';
import { ownStudentIds, clean, newId } from '../academic/access';
import { calendarStatus, planPromotion, promote, switchToEvenSemester, undoLastRun, targetYearForPromotion } from '../academic/promotion';
import { demoDataCounts, removeDemoData } from '../db/demoData';

export const academicYearRouter = Router();
const admin = requireRole('admin');
const staff = requireRole('admin', 'faculty');

// ---------------- academic calendar + promotion ----------------
academicYearRouter.get('/academic/calendar', requireAuth, (_req, res) => res.json(calendarStatus()));

// GET /api/academic/promotion/preview  (who: checked inside)
academicYearRouter.get('/academic/promotion/preview', staff, (req, res) => {
  const branch = ['CSE', 'Civil'].includes(String(req.query.branch)) ? String(req.query.branch) : null;
  const fromYear = [1, 2, 3].includes(Number(req.query.fromYear)) ? Number(req.query.fromYear) : null;
  res.json(planPromotion({ branch, fromYear }, targetYearForPromotion()));
});

// POST /api/academic/promotion  (who: checked inside)
academicYearRouter.post('/academic/promotion', admin, (req, res) => {
  const b = req.body || {};
  const branch = ['CSE', 'Civil'].includes(b.branch) ? b.branch : null;
  const fromYear = [1, 2, 3].includes(Number(b.fromYear)) ? Number(b.fromYear) : null;
  const excludeIds = Array.isArray(b.excludeIds) ? b.excludeIds.map(String).slice(0, 2000) : [];
  const r = promote({ branch, fromYear, excludeIds }, req.user!.username, 'manual');
  res.json({ ok: true, ...r, message: r.moved ? `${r.moved} student(s) moved up for ${r.target}.` : 'Nobody needed to move (everyone is already in the right class).' });
});

// POST /api/academic/semester-switch  (who: checked inside)
academicYearRouter.post('/academic/semester-switch', admin, (req, res) => {
  const r = switchToEvenSemester(req.user!.username, 'manual');
  res.json({ ok: true, ...r, message: `${r.moved} student(s) moved to the even semester.` });
});

// POST /api/academic/promotion/undo  (who: checked inside)
academicYearRouter.post('/academic/promotion/undo', admin, (req, res) => {
  const r = undoLastRun(req.user!.username);
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  res.json({ ...r, message: `Undone. ${r.restored} student(s) are back in their earlier class.` });
});

// GET /api/academic/class-history/:studentId  (who: any signed-in user)
academicYearRouter.get('/academic/class-history/:studentId', requireAuth, (req, res) => {
  const u = req.user!;
  if (u.role !== 'admin' && u.role !== 'faculty' && !ownStudentIds(u).includes(req.params.studentId)) return res.status(403).json({ error: 'Not allowed' });
  res.json(db.prepare('SELECT academic_year AS academicYear, branch, year, semester, record_status AS status FROM student_class_history WHERE student_id=? ORDER BY academic_year').all(req.params.studentId));
});

// ---------------- UBTER board results ----------------
/** One result row + its subject lines -> the shape the screens use. */
function resultDto(r: any) {
  const subjects = (db.prepare('SELECT * FROM board_result_subjects WHERE result_id=? ORDER BY subject_code').all(r.id) as any[]).map((s) => ({
    code: s.subject_code, name: s.subject_name, theory: s.theory, practical: s.practical,
    theoryNote: s.theory_note, practicalNote: s.practical_note, grade: s.grade, gradePoint: s.grade_point }));
  return {
    id: r.id, studentId: r.student_id, rollNo: r.roll_no, studentName: r.name, fatherName: r.father, dob: r.dob, branch: r.branch,
    semester: r.semester, examSession: r.exam_session, theoryTotal: r.theory_total, practicalTotal: r.practical_total,
    gp: r.gp, ie: r.ie, semTotal: r.sem_total, maxTotal: r.max_total,
    percentage: r.sem_total != null && r.max_total ? Math.round((r.sem_total / r.max_total) * 1000) / 10 : null,
    sgpa: r.sgpa, result: r.result, promoted: r.promoted === null ? null : !!r.promoted, backPapers: r.back_papers, remarks: r.remarks,
    isDemo: !!r.is_demo, subjects, updatedAt: r.updated_at || r.created_at,
  };
}
const RESULT_SQL = `SELECT b.*, s.roll_no, s.name, s.father, s.dob, s.branch FROM board_results b JOIN students s ON s.id = b.student_id WHERE s.deleted_at IS NULL`;

// GET /api/board-results  (who: any signed-in user)
academicYearRouter.get('/board-results', requireAuth, (req, res) => {
  const u = req.user!;
  const where: string[] = [], args: any[] = [];
  if (req.query.branch) { where.push('s.branch=?'); args.push(String(req.query.branch)); }
  if (req.query.semester) { where.push('b.semester=?'); args.push(Number(req.query.semester)); }
  if (req.query.session) { where.push('b.exam_session=?'); args.push(String(req.query.session)); }
  if (req.query.studentId) { where.push('b.student_id=?'); args.push(String(req.query.studentId)); }
  if (u.role === 'student' || u.role === 'parent') {        // only their own (child's) results
    const own = ownStudentIds(u);
    if (!own.length) return res.json([]);
    where.push(`b.student_id IN (${own.map(() => '?').join(',')})`); args.push(...own);
  }
  const rows = db.prepare(RESULT_SQL + realOnly(req.user, 's') + (where.length ? ' AND ' + where.join(' AND ') : '') + ' ORDER BY b.exam_session DESC, s.branch, b.semester, s.roll_no').all(...args) as any[];
  res.json(rows.map(resultDto));
});

/** Check + clean a result sent by the browser. */
function readResult(b: any): { error: string } | Record<string, any> {
  const semester = Number(b?.semester);
  if (!Number.isInteger(semester) || semester < 1 || semester > 6) return { error: 'Semester must be 1 to 6.' };
  const session = clean(b?.examSession, 40);
  if (!session) return { error: 'Please write the exam session, e.g. 2025-26 (Winter).' };
  // Num.
  const num = (v: any) => (v === '' || v === null || v === undefined ? null : Number.isFinite(Number(v)) ? Number(v) : NaN);
  const vals: Record<string, any> = { semester, session };
  for (const k of ['theoryTotal', 'practicalTotal', 'gp', 'ie', 'semTotal', 'maxTotal', 'sgpa']) {
    const v = num(b?.[k]);
    if (Number.isNaN(v) || (v !== null && v < 0)) return { error: `${k} must be a number (or left empty).` };
    vals[k] = v;
  }
  if (vals.sgpa !== null && vals.sgpa > 10) return { error: 'SGPA cannot be more than 10.' };
  vals.result = clean(b?.result, 30);
  vals.promoted = b?.promoted === true ? 1 : b?.promoted === false ? 0 : null;
  vals.backPapers = clean(b?.backPapers, 1000);
  vals.remarks = clean(b?.remarks, 500);
  vals.subjects = (Array.isArray(b?.subjects) ? b.subjects : []).slice(0, 20).map((s: any) => ({
    code: clean(s?.code, 20), name: clean(s?.name, 120), theory: num(s?.theory), practical: num(s?.practical),
    theoryNote: clean(s?.theoryNote, 20), practicalNote: clean(s?.practicalNote, 20), grade: clean(s?.grade, 5), gradePoint: num(s?.gradePoint),
  })).filter((s: any) => s.code);
  return vals;
}

/** Save the subject lines of a result (replaces the old lines). */
function saveSubjects(resultId: string, subjects: any[]) {
  db.prepare('DELETE FROM board_result_subjects WHERE result_id=?').run(resultId);
  const ins = db.prepare(`INSERT OR REPLACE INTO board_result_subjects (result_id,subject_code,subject_name,theory,practical,theory_note,practical_note,grade,grade_point) VALUES (?,?,?,?,?,?,?,?,?)`);
  for (const s of subjects) ins.run(resultId, s.code, s.name, Number.isNaN(s.theory) ? null : s.theory, Number.isNaN(s.practical) ? null : s.practical, s.theoryNote, s.practicalNote, s.grade, Number.isNaN(s.gradePoint) ? null : s.gradePoint);
}

// POST /api/board-results  (who: checked inside)
academicYearRouter.post('/board-results', staff, (req, res) => {
  const st = db.prepare('SELECT id FROM students WHERE id=? AND deleted_at IS NULL').get(String(req.body?.studentId || '')) as any;
  if (!st) return res.status(400).json({ error: 'Please choose a student.' });
  const v = readResult(req.body);
  if ('error' in v) return res.status(400).json({ error: v.error });
  const id = newId('res');
  db.exec('BEGIN');
  try {
    db.prepare(`INSERT INTO board_results (id,student_id,semester,exam_session,theory_total,practical_total,gp,ie,sem_total,max_total,sgpa,result,promoted,back_papers,remarks,created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, st.id, v.semester, v.session, v.theoryTotal, v.practicalTotal, v.gp, v.ie, v.semTotal, v.maxTotal, v.sgpa, v.result, v.promoted, v.backPapers, v.remarks, req.user!.username);
    saveSubjects(id, v.subjects);
    syncSemesterResult(st.id, v.semester, v.semTotal, v.maxTotal, v.sgpa);
    audit(req.user!.username, 'board_result_created', 'board_result', id, `${st.id} sem ${v.semester}`);
    db.exec('COMMIT');
  } catch (e: any) {
    db.exec('ROLLBACK');
    if (/UNIQUE/i.test(e.message)) return res.status(409).json({ error: 'This student already has a result for that semester and session. Edit it instead.' });
    throw e;
  }
  res.status(201).json(resultDto(db.prepare(RESULT_SQL + ' AND b.id=?').get(id)));
});

// PUT /api/board-results/:id  (who: checked inside)
academicYearRouter.put('/board-results/:id', staff, (req, res) => {
  const cur = db.prepare(RESULT_SQL + ' AND b.id=?').get(req.params.id) as any;
  if (!cur) return res.status(404).json({ error: 'Result not found.' });
  const v = readResult({ semester: cur.semester, examSession: cur.exam_session, ...req.body });
  if ('error' in v) return res.status(400).json({ error: v.error });
  db.exec('BEGIN');
  try {
    db.prepare(`UPDATE board_results SET semester=?, exam_session=?, theory_total=?, practical_total=?, gp=?, ie=?, sem_total=?, max_total=?, sgpa=?, result=?, promoted=?, back_papers=?, remarks=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .run(v.semester, v.session, v.theoryTotal, v.practicalTotal, v.gp, v.ie, v.semTotal, v.maxTotal, v.sgpa, v.result, v.promoted, v.backPapers, v.remarks, cur.id);
    if (Array.isArray(req.body?.subjects)) saveSubjects(cur.id, v.subjects);
    syncSemesterResult(cur.student_id, v.semester, v.semTotal, v.maxTotal, v.sgpa);
    audit(req.user!.username, 'board_result_updated', 'board_result', cur.id);
    db.exec('COMMIT');
  } catch (e: any) {
    db.exec('ROLLBACK');
    if (/UNIQUE/i.test(e.message)) return res.status(409).json({ error: 'Another result already exists for that semester and session.' });
    throw e;
  }
  res.json(resultDto(db.prepare(RESULT_SQL + ' AND b.id=?').get(cur.id)));
});

// DELETE /api/board-results/:id  (who: checked inside)
academicYearRouter.delete('/board-results/:id', staff, (req, res) => {
  const r = db.prepare('DELETE FROM board_results WHERE id=?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Result not found.' });
  audit(req.user!.username, 'board_result_deleted', 'board_result', req.params.id);
  res.json({ ok: true });
});

/**
 * Keep the simple "semester-wise percentage / SGPA" table (shown on the student profile and used by placement
 * eligibility) in step with the detailed board result: percentage = semester total / maximum total.
 */
export function syncSemesterResult(studentId: string, semester: number, semTotal: number | null, maxTotal: number | null, sgpa: number | null) {
  const pct = semTotal != null && maxTotal ? Math.round((semTotal / maxTotal) * 1000) / 10 : null;
  if (pct === null && sgpa === null) return;
  db.prepare(`INSERT INTO semester_results (student_id,semester,percentage,cgpa) VALUES (?,?,?,?)
    ON CONFLICT(student_id,semester) DO UPDATE SET percentage=COALESCE(excluded.percentage, percentage), cgpa=COALESCE(excluded.cgpa, cgpa)`).run(studentId, semester, pct, sgpa);
}

// ---------------- sample (random) data ----------------
academicYearRouter.get('/admin/demo-data', admin, (_req, res) => res.json(demoDataCounts()));
// DELETE /api/admin/demo-data  (who: checked inside)
academicYearRouter.delete('/admin/demo-data', admin, (req, res) => {
  const r = removeDemoData();
  audit(req.user!.username, 'demo_data_removed', 'demo', null, JSON.stringify(r));
  res.json({ ok: true, removed: r, message: 'All sample (random) data was deleted. Real data was not touched.' });
});
