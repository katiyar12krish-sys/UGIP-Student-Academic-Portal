// ===================================================================================================
// Student record routes: list, read, add, edit, status change, soft delete, Aadhaar view, class CSV.
// ===================================================================================================
import { Router } from 'express';
import { db } from '../db/connection';
import { saveStudent, toDto, validate, friendlyError } from '../db/studentsRepo';
import { decrypt } from '../db/crypto';
import { requireAuth, requireRole } from '../auth/middleware';
import { audit } from '../auth/service';
import { realOnly, seesSample } from '../auth/sample';

export const studentsRouter = Router();

// Access rules (Step 1):
//   admin, faculty -> list / read / create / edit / change status / export
//   admin          -> delete
//   student        -> may read ONLY their own record
//   parent         -> may read ONLY their linked children (read-only)
const staff = requireRole('admin', 'faculty');
// Clamp.
const clamp = (v: unknown, max = 100) => String(v ?? '').slice(0, max);

// GET /api/students  (who: checked inside)
studentsRouter.get('/students', staff, (req, res) => {
  const { branch, year, q } = req.query as Record<string, string>;
  let sql = 'SELECT * FROM students WHERE deleted_at IS NULL' + realOnly(req.user);
  const p: any[] = [];
  if (branch) { sql += ' AND branch=?'; p.push(clamp(branch, 20)); }
  if (year) { sql += ' AND year=?'; p.push(Number(year)); }
  if (q) { sql += ' AND (name LIKE ? OR roll_no LIKE ?)'; p.push(`%${clamp(q, 50)}%`, `%${clamp(q, 50)}%`); }
  res.json(db.prepare(sql + ' ORDER BY roll_no').all(...p).map(toDto));
});

// GET /api/students/:id  (who: any signed-in user)
studentsRouter.get('/students/:id', requireAuth, (req, res) => {
  const u = req.user!;
  const allowed = u.role === 'admin' || u.role === 'faculty'
    || (u.role === 'student' && u.studentId === req.params.id)
    || (u.role === 'parent' && u.childIds.includes(req.params.id));
  if (!allowed) return res.status(403).json({ error: 'Not allowed' });
  const r = db.prepare('SELECT * FROM students WHERE id=? AND deleted_at IS NULL').get(req.params.id) as any;
  // sample students are visible only to admin / CSE HOD (and to the sample student's own login)
  if (r && r.is_demo && !seesSample(u) && !(u.role === 'student' && u.studentId === r.id) && !(u.role === 'parent' && u.childIds.includes(r.id))) return res.status(404).json({ error: 'not found' });
  r ? res.json(toDto(r)) : res.status(404).json({ error: 'not found' });
});

// Parent portal: the logged-in parent's linked children (read-only)
studentsRouter.get('/parent/children', requireRole('parent'), (req, res) => {
  const ids = req.user!.childIds;
  if (!ids.length) return res.json([]);
  const rows = db.prepare(`SELECT * FROM students WHERE deleted_at IS NULL AND id IN (${ids.map(() => '?').join(',')}) ORDER BY roll_no`).all(...ids);
  res.json(rows.map(toDto));
});

// POST /api/students  (who: checked inside)
studentsRouter.post('/students', staff, (req, res) => {
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });
  try { res.status(201).json(toDto(db.prepare('SELECT * FROM students WHERE id=?').get(saveStudent(req.body, req.user!.username)))); }
  catch (e: any) { res.status(409).json({ error: friendlyError(e) }); }
});

// PUT /api/students/:id  (who: checked inside)
studentsRouter.put('/students/:id', staff, (req, res) => {
  if (!db.prepare('SELECT 1 FROM students WHERE id=?').get(req.params.id)) return res.status(404).json({ error: 'not found' });
  const err = validate(req.body);
  if (err) return res.status(400).json({ error: err });
  try { saveStudent({ ...req.body, id: req.params.id }, req.user!.username); }
  catch (e: any) { return res.status(409).json({ error: friendlyError(e) }); }
  res.json(toDto(db.prepare('SELECT * FROM students WHERE id=?').get(req.params.id)));
});

// Full Aadhaar number: admin only, never cached, every look is written to the audit log.
// (The normal student list carries only the last 4 digits.)
studentsRouter.get('/students/:id/aadhar', requireRole('admin'), (req, res) => {
  const r = db.prepare('SELECT aadhar_enc FROM students WHERE id=? AND deleted_at IS NULL').get(req.params.id) as any;
  if (!r) return res.status(404).json({ error: 'not found' });
  if (!r.aadhar_enc) return res.json({ aadharNumber: null });
  audit(req.user!.username, 'reveal_aadhaar', 'student', req.params.id);
  res.set('Cache-Control', 'no-store').json({ aadharNumber: decrypt(r.aadhar_enc) });
});

// DELETE /api/students/:id  (who: only admin)
studentsRouter.delete('/students/:id', requireRole('admin'), (req, res) => {  // soft delete
  db.exec('BEGIN');
  try {
    db.prepare('UPDATE students SET deleted_at=CURRENT_TIMESTAMP WHERE id=?').run(req.params.id);
    db.prepare('UPDATE users SET is_active=0 WHERE student_id=?').run(req.params.id);
    db.prepare('DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE student_id=?)').run(req.params.id);
    audit(req.user!.username, 'delete', 'student', req.params.id);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  res.json({ ok: true });
});

// POST /api/students/:id/status  (who: checked inside)
studentsRouter.post('/students/:id/status', staff, (req, res) => {
  const { status, remarks } = req.body || {};
  if (!status) return res.status(400).json({ error: 'status required' });
  if (!db.prepare('SELECT 1 FROM students WHERE id=? AND deleted_at IS NULL').get(req.params.id)) return res.status(404).json({ error: 'not found' });
  db.prepare('UPDATE students SET record_status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(clamp(status, 60), req.params.id);
  db.prepare('INSERT INTO status_history (student_id,status,remarks,changed_by) VALUES (?,?,?,?)').run(req.params.id, clamp(status, 60), remarks ? clamp(remarks, 300) : null, req.user!.username);
  res.json(db.prepare('SELECT status,remarks,changed_at FROM status_history WHERE student_id=? ORDER BY id DESC').all(req.params.id));
});

// Class-wise sheet: /api/export/class.csv?branch=CSE&year=3  (opens in Excel)
studentsRouter.get('/export/class.csv', staff, (req, res) => {
  const { branch, year } = req.query as Record<string, string>;
  const rows = db.prepare('SELECT * FROM students WHERE deleted_at IS NULL' + realOnly(req.user) + ' AND branch=? AND year=? ORDER BY roll_no').all(branch || 'CSE', Number(year) || 3) as any[];
  // prefix cells starting with = + - @ so Excel never runs them as formulas
  const esc = (v: any) => { let t = String(v ?? ''); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return `"${t.replace(/"/g, '""')}"`; };
  const head = ['Roll No', 'Name', 'Phone', '10th %', '12th %', 'Sem1', 'Sem2', 'Sem3', 'Sem4', 'Address', 'Mother', 'Father', 'Status'];
  const lines = rows.map((r) => {
    const sm = Object.fromEntries((db.prepare('SELECT semester,percentage,cgpa FROM semester_results WHERE student_id=?').all(r.id) as any[]).map((x) => [x.semester, x.percentage ?? x.cgpa ?? 'N/A']));
    return [r.roll_no, r.name, r.phone, r.tenth, r.twelfth, sm[1] ?? 'N/A', sm[2] ?? 'N/A', sm[3] ?? 'N/A', sm[4] ?? 'N/A', r.address, r.mother, r.father, r.record_status].map(esc).join(',');
  });
  audit(req.user!.username, 'export', 'class_csv', `${branch || 'CSE'}-${year || 3}`);
  res.type('text/csv').attachment(`class-${branch || 'CSE'}-year${year || 3}.csv`).send('\ufeff' + [head.map(esc).join(','), ...lines].join('\n'));
});
