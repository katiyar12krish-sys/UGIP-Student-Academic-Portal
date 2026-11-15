// ===================================================================================================
// Subject (curriculum) routes and the admin's "which teacher teaches which subject" setting.
// ===================================================================================================
import { Router } from 'express';
import { db } from '../db/connection';
import { requireAuth, requireRole } from '../auth/middleware';
import { audit } from '../auth/service';
import { clean, newId } from '../academic/access';

export const subjectsRouter = Router();
const BRANCHES = ['CSE', 'Civil'];

// Dto.
function dto(r: any, assign: Map<string, string[]>) {
  const ids = assign.get(r.id) || [];
  const fac = ids.length ? (db.prepare('SELECT name FROM users WHERE id=?').get(ids[0]) as any) : null;
  return { id: r.id, code: r.code, name: r.name, branch: r.branch, semester: r.semester, year: r.year, credits: r.credits,
    hasPractical: !!r.has_practical, facultyIds: ids, facultyId: ids[0] ?? '', facultyName: fac?.name ?? '' };
}
// Assignments.
function assignments(): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const a of db.prepare('SELECT subject_id, user_id FROM faculty_subject_assignments ORDER BY rowid').all() as any[]) {
    m.set(a.subject_id, [...(m.get(a.subject_id) || []), a.user_id]);
  }
  return m;
}
// Validate.
function validate(b: any): string | null {
  if (!clean(b.code, 30) || !clean(b.name, 200)) return 'Subject code and name are required';
  if (!BRANCHES.includes(b.branch)) return 'Branch must be CSE or Civil';
  if (!Number.isInteger(b.semester) || b.semester < 1 || b.semester > 6) return 'Semester must be 1-6';
  if (!Number.isInteger(b.year) || b.year < 1 || b.year > 3) return 'Year must be 1-3';
  return null;
}
// Set single faculty.
function setSingleFaculty(subjectId: string, facultyId: unknown): string | null {
  if (facultyId === undefined || facultyId === null || facultyId === '') return null;
  const f = db.prepare("SELECT id FROM users WHERE id=? AND role='faculty' AND is_active=1").get(String(facultyId));
  if (!f) return 'That faculty does not exist';
  db.prepare('DELETE FROM faculty_subject_assignments WHERE subject_id=?').run(subjectId);
  db.prepare('INSERT INTO faculty_subject_assignments VALUES (?,?)').run(String(facultyId), subjectId);
  return null;
}

// Curriculum list: not secret, any logged-in user.
subjectsRouter.get('/subjects', requireAuth, (_req, res) => {
  const a = assignments();
  res.json((db.prepare('SELECT * FROM subjects ORDER BY branch, semester, code').all() as any[]).map((r) => dto(r, a)));
});

// POST /api/subjects  (who: only admin)
subjectsRouter.post('/subjects', requireRole('admin'), (req, res) => {
  const b = req.body || {};
  const err = validate(b);
  if (err) return res.status(400).json({ error: err });
  const id = /^[A-Za-z0-9_-]{3,64}$/.test(String(b.id || '')) ? String(b.id) : newId('sub');
  db.exec('BEGIN');
  try {
    db.prepare('INSERT INTO subjects (id,code,name,branch,semester,year,credits,has_practical) VALUES (?,?,?,?,?,?,?,?)')
      .run(id, clean(b.code, 30), clean(b.name, 200), b.branch, b.semester, b.year, Math.max(0, Math.min(30, Number(b.credits) || 0)), b.hasPractical ? 1 : 0);
    const fe = setSingleFaculty(id, b.facultyId);
    if (fe) throw new Error(fe);
    audit(req.user!.username, 'subject_created', 'subject', id);
    db.exec('COMMIT');
  } catch (e: any) {
    db.exec('ROLLBACK');
    return res.status(/UNIQUE|PRIMARY/i.test(e.message) ? 409 : 400).json({ error: /UNIQUE|PRIMARY/i.test(e.message) ? 'Subject id already exists' : e.message });
  }
  res.status(201).json(dto(db.prepare('SELECT * FROM subjects WHERE id=?').get(id), assignments()));
});

// PUT /api/subjects/:id  (who: only admin)
subjectsRouter.put('/subjects/:id', requireRole('admin'), (req, res) => {
  const cur = db.prepare('SELECT * FROM subjects WHERE id=?').get(req.params.id) as any;
  if (!cur) return res.status(404).json({ error: 'Subject not found' });
  const b = { code: cur.code, name: cur.name, branch: cur.branch, semester: cur.semester, year: cur.year, credits: cur.credits, hasPractical: !!cur.has_practical, ...req.body };
  const err = validate(b);
  if (err) return res.status(400).json({ error: err });
  db.exec('BEGIN');
  try {
    db.prepare('UPDATE subjects SET code=?,name=?,branch=?,semester=?,year=?,credits=?,has_practical=? WHERE id=?')
      .run(clean(b.code, 30), clean(b.name, 200), b.branch, b.semester, b.year, Math.max(0, Math.min(30, Number(b.credits) || 0)), b.hasPractical ? 1 : 0, req.params.id);
    const fe = setSingleFaculty(req.params.id, req.body?.facultyId);
    if (fe) throw new Error(fe);
    audit(req.user!.username, 'subject_updated', 'subject', req.params.id);
    db.exec('COMMIT');
  } catch (e: any) { db.exec('ROLLBACK'); return res.status(400).json({ error: e.message }); }
  res.json(dto(db.prepare('SELECT * FROM subjects WHERE id=?').get(req.params.id), assignments()));
});

// DELETE /api/subjects/:id  (who: only admin)
subjectsRouter.delete('/subjects/:id', requireRole('admin'), (req, res) => {
  const used = db.prepare('SELECT (SELECT COUNT(*) FROM tests WHERE subject_id=?) + (SELECT COUNT(*) FROM attendance_sessions WHERE subject_id=?) + (SELECT COUNT(*) FROM online_tests WHERE subject_id=?) + (SELECT COUNT(*) FROM doubts WHERE subject_id=?) + (SELECT COUNT(*) FROM materials WHERE subject_id=?) + (SELECT COUNT(*) FROM dispatches WHERE subject_id=?) AS n').get(req.params.id, req.params.id, req.params.id, req.params.id, req.params.id, req.params.id) as any;
  if (used.n > 0) return res.status(409).json({ error: 'This subject already has exams, attendance, online tests, doubts, study materials or class dispatches. It cannot be deleted.' });
  db.prepare('DELETE FROM faculty_subject_assignments WHERE subject_id=?').run(req.params.id);
  const r = db.prepare('DELETE FROM subjects WHERE id=?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Subject not found' });
  audit(req.user!.username, 'subject_deleted', 'subject', req.params.id);
  res.json({ ok: true });
});

// Admin: decide which subjects a faculty member teaches (this is what the marks/attendance rule checks).
subjectsRouter.put('/admin/faculty/:id/subjects', requireRole('admin'), (req, res) => {
  const f = db.prepare("SELECT id FROM users WHERE id=? AND role='faculty'").get(req.params.id);
  if (!f) return res.status(404).json({ error: 'Faculty not found' });
  const ids: string[] = Array.isArray(req.body?.subjectIds) ? req.body.subjectIds.map(String).slice(0, 100) : [];
  const known = new Set((db.prepare('SELECT id FROM subjects').all() as any[]).map((r) => r.id));
  const bad = ids.filter((i) => !known.has(i));
  if (bad.length) return res.status(400).json({ error: `Unknown subject(s): ${bad.join(', ')}` });
  db.exec('BEGIN');
  db.prepare('DELETE FROM faculty_subject_assignments WHERE user_id=?').run(req.params.id);
  for (const i of ids) db.prepare('INSERT OR IGNORE INTO faculty_subject_assignments VALUES (?,?)').run(req.params.id, i);
  audit(req.user!.username, 'faculty_subjects_set', 'user', req.params.id, ids.join(','));
  db.exec('COMMIT');
  res.json({ ok: true, subjectIds: ids });
});
