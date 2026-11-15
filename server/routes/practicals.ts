// =====================================================================================================
// Practical / lab records (Step 18)  ->  /api/practicals...
// -----------------------------------------------------------------------------------------------------
// Before Step 18 the practical list lived only in one browser (lost when the browser data was cleared and
// never seen on another phone / computer). Now it is in the database and kept for years.
//
// Who may do what (checked here on the server, never trusted from the browser):
//   admin    -> everything
//   faculty  -> add / edit / delete practicals and enter marks ONLY for subjects assigned to them
//   student  -> read the practicals of their own class + their own marks
//   parent   -> same as the student, for their linked children
//
// Routes:
//   GET    /practicals                        list (filtered by role; ?academicYear=2025-26 for an older year, 'all' for every year)
//   POST   /practicals                        add a practical
//   PUT    /practicals/:id                    edit a practical
//   DELETE /practicals/:id                    delete (soft: the row is hidden, marks are kept in the database)
//   GET    /practicals/:id/records            class list with each student's marks / status
//   PUT    /practicals/:id/records            save marks for many students at once
//   DELETE /practicals/:id/records/:studentId delete one student's marks
// =====================================================================================================
import { Router } from 'express';
import { db } from '../db/connection';
import { requireAuth, requireRole } from '../auth/middleware';
import { keepRow, realOnly } from '../auth/sample';
import { audit } from '../auth/service';
import { canTeach, ownStudentIds, studentRow, clean, newId } from '../academic/access';
import { academicYearOf } from '../academic/calendar';

import { writeDenied } from '../auth/permissions';   // admin-given feature switches + cross-subject alerts
export const practicalsRouter = Router();
const RECORD_STATUSES = ['Completed', 'Pending', 'Absent', 'Needs Revision'];

/** Turn the JSON "details" text into an object, never failing on a broken value. */
function details(raw: string): any {
  try { return JSON.parse(raw || '{}') || {}; } catch { return {}; }
}

/** Database row -> the shape the React screens use (same field names as the old browser version). */
function toDto(r: any) {
  const d = details(r.details);
  return {
    id: r.id, subjectId: r.subject_id, subjectCode: r.code, subjectName: r.sname, branch: r.branch, semester: r.semester,
    academicYear: r.academic_year, experimentNo: r.experiment_no, title: r.title, maxMarks: r.max_marks,
    objective: d.objective || '', apparatus: Array.isArray(d.apparatus) ? d.apparatus : [],
    procedureSteps: Array.isArray(d.procedureSteps) ? d.procedureSteps : [],
    vivaQuestions: Array.isArray(d.vivaQuestions) ? d.vivaQuestions : [],
    inputType: d.inputType || 'typed', imageUrl: d.imageUrl || undefined, writtenNoteUrl: d.writtenNoteUrl || undefined,
    uploadedBy: r.created_by_name || r.created_by || undefined, date: String(r.created_at || '').slice(0, 10),
    isDemo: !!r.is_demo,
  };
}
const BASE_SQL = `SELECT p.*, s.code, s.name AS sname FROM practical_experiments p JOIN subjects s ON s.id = p.subject_id WHERE p.deleted_at IS NULL`;

/** Read + check the editable fields sent by the browser. Returns an error text or the clean values. */
function readBody(b: any): { error: string } | { title: string; no: number; max: number; det: string } {
  const title = clean(b?.title, 300);
  if (!title) return { error: 'Please write the practical title.' };
  const no = Math.round(Number(b?.experimentNo));
  if (!Number.isFinite(no) || no < 1 || no > 200) return { error: 'Practical number must be between 1 and 200.' };
  const max = Number(b?.maxMarks ?? 10);
  if (!Number.isFinite(max) || max <= 0 || max > 500) return { error: 'Maximum marks must be between 1 and 500.' };
  // List.
  const list = (v: any, n: number, len: number) => (Array.isArray(v) ? v.map((x) => String(x ?? '').trim().slice(0, len)).filter(Boolean).slice(0, n) : []);
  const viva = Array.isArray(b?.vivaQuestions) ? b.vivaQuestions.slice(0, 50).map((q: any) => ({
    question: String(q?.question ?? '').slice(0, 500), answerSummary: String(q?.answerSummary ?? '').slice(0, 1500) })).filter((q: any) => q.question.trim()) : [];
  // A photo is stored as a data: URL (small images only), anything else must be a plain web link.
  const img = typeof b?.imageUrl === 'string' && (/^data:image\/(png|jpe?g|webp|gif);base64,/.test(b.imageUrl) || /^https?:\/\//.test(b.imageUrl)) ? b.imageUrl.slice(0, 1_500_000) : undefined;
  const det = JSON.stringify({
    objective: String(b?.objective ?? '').slice(0, 3000), apparatus: list(b?.apparatus, 60, 300), procedureSteps: list(b?.procedureSteps, 100, 1000),
    vivaQuestions: viva, inputType: ['typed', 'image', 'written_note'].includes(b?.inputType) ? b.inputType : 'typed',
    imageUrl: img, writtenNoteUrl: clean(b?.writtenNoteUrl, 300) || undefined,
  });
  return { title, no, max, det };
}

// ---------- list ----------
practicalsRouter.get('/practicals', requireAuth, (req, res) => {
  const u = req.user!;
  const year = String(req.query.academicYear || '');
  const rows = (db.prepare(BASE_SQL + ' ORDER BY p.branch, p.semester, s.code, p.experiment_no').all() as any[]).filter(keepRow(u));
  // Staff: every practical (of the chosen year). Students / parents: only the class(es) of their own child(ren).
  const filtered = u.role === 'admin' || u.role === 'faculty'
    ? rows.filter((r) => !year || year === 'all' || r.academic_year === year)   // no year chosen = every year
    : (() => {
      const classes = ownStudentIds(u).map(studentRow).filter(Boolean);
      return rows.filter((r) => classes.some((s: any) => s.branch === r.branch && s.semester === r.semester)
        || ownStudentIds(u).some((sid) => db.prepare('SELECT 1 FROM practical_records WHERE experiment_id=? AND student_id=?').get(r.id, sid)));
    })();
  res.json(filtered.map(toDto));
});

// ---------- add ----------
practicalsRouter.post('/practicals', requireRole('admin', 'faculty'), (req, res) => {
  const sub = db.prepare('SELECT * FROM subjects WHERE id=?').get(String(req.body?.subjectId || '')) as any;
  if (!sub) return res.status(400).json({ error: 'Please choose a subject.' });
  { const no = writeDenied(req.user!, sub.id, 'practicals', 'add a practical'); if (no) return res.status(403).json({ error: no }); }
  const v = readBody(req.body);
  if ('error' in v) return res.status(400).json({ error: v.error });
  const id = newId('prc');
  db.prepare(`INSERT INTO practical_experiments (id,subject_id,branch,semester,academic_year,experiment_no,title,details,max_marks,created_by,created_by_name)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(id, sub.id, sub.branch, sub.semester, academicYearOf(), v.no, v.title, v.det, v.max, req.user!.username, req.user!.name);
  audit(req.user!.username, 'practical_created', 'practical', id, `${sub.code} #${v.no}`);
  res.status(201).json(toDto(db.prepare(BASE_SQL + ' AND p.id=?').get(id)));
});

// ---------- edit ----------
practicalsRouter.put('/practicals/:id', requireRole('admin', 'faculty'), (req, res) => {
  const cur = db.prepare(BASE_SQL + ' AND p.id=?').get(req.params.id) as any;
  if (!cur) return res.status(404).json({ error: 'This practical was not found (it may have been deleted).' });
  { const no = writeDenied(req.user!, cur.subject_id, 'practicals', 'edit a practical'); if (no) return res.status(403).json({ error: no }); }
  // The subject may be changed too (e.g. it was added under the wrong subject), but only to one the user teaches.
  let sub = { id: cur.subject_id, branch: cur.branch, semester: cur.semester };
  if (req.body?.subjectId && req.body.subjectId !== cur.subject_id) {
    const s = db.prepare('SELECT * FROM subjects WHERE id=?').get(String(req.body.subjectId)) as any;
    if (!s) return res.status(400).json({ error: 'Please choose a valid subject.' });
    { const no = writeDenied(req.user!, s.id, 'practicals', 'move a practical'); if (no) return res.status(403).json({ error: no }); }
    sub = { id: s.id, branch: s.branch, semester: s.semester };
  }
  const v = readBody(req.body);
  if ('error' in v) return res.status(400).json({ error: v.error });
  db.prepare(`UPDATE practical_experiments SET subject_id=?, branch=?, semester=?, experiment_no=?, title=?, details=?, max_marks=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(sub.id, sub.branch, sub.semester, v.no, v.title, v.det, v.max, cur.id);
  audit(req.user!.username, 'practical_updated', 'practical', cur.id);
  res.json(toDto(db.prepare(BASE_SQL + ' AND p.id=?').get(cur.id)));
});

// ---------- delete (soft) ----------
practicalsRouter.delete('/practicals/:id', requireRole('admin', 'faculty'), (req, res) => {
  const cur = db.prepare(BASE_SQL + ' AND p.id=?').get(req.params.id) as any;
  if (!cur) return res.status(404).json({ error: 'This practical was not found (it may already be deleted).' });
  { const no = writeDenied(req.user!, cur.subject_id, 'practicals', 'delete a practical'); if (no) return res.status(403).json({ error: no }); }
  db.prepare('UPDATE practical_experiments SET deleted_at=CURRENT_TIMESTAMP WHERE id=?').run(cur.id);   // marks stay in the database
  audit(req.user!.username, 'practical_deleted', 'practical', cur.id, `${cur.code} #${cur.experiment_no}`);
  res.json({ ok: true });
});

// ---------- marks of one practical ----------
practicalsRouter.get('/practicals/:id/records', requireAuth, (req, res) => {
  const u = req.user!;
  const p = db.prepare(BASE_SQL + ' AND p.id=?').get(req.params.id) as any;
  if (!p) return res.status(404).json({ error: 'Practical not found.' });
  const saved = new Map((db.prepare('SELECT * FROM practical_records WHERE experiment_id=?').all(p.id) as any[]).map((r) => [r.student_id, r]));
  // Class list = current students of that class + anybody who already has a mark (e.g. promoted since).
  const students = db.prepare(`SELECT id, roll_no, name FROM students WHERE deleted_at IS NULL${realOnly(u)} AND
      ((branch=? AND semester=?) OR id IN (SELECT student_id FROM practical_records WHERE experiment_id=?)) ORDER BY roll_no`)
    .all(p.branch, p.semester, p.id) as any[];
  const own = new Set(ownStudentIds(u));
  const visible = u.role === 'admin' || u.role === 'faculty' ? students : students.filter((s) => own.has(s.id));
  res.json(visible.map((s) => {
    const r: any = saved.get(s.id);
    return { studentId: s.id, rollNo: s.roll_no, name: s.name, status: r?.status ?? null, marks: r?.marks ?? null,
      remarks: r?.remarks ?? '', updatedBy: r?.updated_by ?? null, updatedAt: r?.updated_at ?? null, maxMarks: p.max_marks };
  }));
});

// PUT /api/practicals/:id/records  (who: only admin, faculty)
practicalsRouter.put('/practicals/:id/records', requireRole('admin', 'faculty'), (req, res) => {
  const p = db.prepare(BASE_SQL + ' AND p.id=?').get(req.params.id) as any;
  if (!p) return res.status(404).json({ error: 'Practical not found.' });
  { const no = writeDenied(req.user!, p.subject_id, 'practicals', 'enter practical marks'); if (no) return res.status(403).json({ error: no }); }
  const list: any[] = Array.isArray(req.body?.records) ? req.body.records : [];
  if (!list.length || list.length > 300) return res.status(400).json({ error: 'Send marks for 1 to 300 students.' });
  const problems: string[] = [];
  for (const r of list) {
    const m = r?.marks;
    if (m !== null && m !== undefined && m !== '' && (typeof m !== 'number' || !Number.isFinite(m) || m < 0 || m > p.max_marks)) problems.push(`${r?.rollNo || r?.studentId}: marks must be from 0 to ${p.max_marks}`);
    if (r?.status && !RECORD_STATUSES.includes(r.status)) problems.push(`${r?.rollNo || r?.studentId}: unknown status`);
    if (!db.prepare('SELECT 1 FROM students WHERE id=? AND deleted_at IS NULL').get(String(r?.studentId || ''))) problems.push(`${r?.studentId}: student not found`);
  }
  if (problems.length) return res.status(400).json({ error: problems.slice(0, 5).join('; ') });
  db.exec('BEGIN');
  try {
    const up = db.prepare(`INSERT INTO practical_records (experiment_id,student_id,status,marks,remarks,updated_by) VALUES (?,?,?,?,?,?)
      ON CONFLICT(experiment_id,student_id) DO UPDATE SET status=excluded.status, marks=excluded.marks, remarks=excluded.remarks, updated_by=excluded.updated_by, updated_at=CURRENT_TIMESTAMP`);
    for (const r of list) {
      const m = r.marks === '' || r.marks === undefined ? null : r.marks;
      up.run(p.id, String(r.studentId), r.status || (m === null ? 'Pending' : 'Completed'), m, clean(r.remarks, 300), req.user!.username);
    }
    audit(req.user!.username, 'practical_marks_saved', 'practical', p.id, `${list.length} students`);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  res.json({ ok: true, saved: list.length });
});

// DELETE /api/practicals/:id/records/:studentId  (who: only admin, faculty)
practicalsRouter.delete('/practicals/:id/records/:studentId', requireRole('admin', 'faculty'), (req, res) => {
  const p = db.prepare(BASE_SQL + ' AND p.id=?').get(req.params.id) as any;
  if (!p) return res.status(404).json({ error: 'Practical not found.' });
  { const no = writeDenied(req.user!, p.subject_id, 'practicals', 'change practical marks'); if (no) return res.status(403).json({ error: no }); }
  db.prepare('DELETE FROM practical_records WHERE experiment_id=? AND student_id=?').run(p.id, req.params.studentId);
  audit(req.user!.username, 'practical_mark_deleted', 'practical', p.id, req.params.studentId);
  res.json({ ok: true });
});
