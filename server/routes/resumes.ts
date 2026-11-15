// =====================================================================================================
// Student resumes (Step 19)  ->  /api/resumes ...
// -----------------------------------------------------------------------------------------------------
// A student uploads ONE resume (PDF or Word) that is kept on the server, so it can be downloaded later from
// any phone / computer and seen by the placement cell (admin + faculty) when they shortlist students.
//   GET    /resumes/me                 my resume (name, size, date) or null          (student)
//   POST   /resumes/me      {fileId}   save / replace my resume (file uploaded first via POST /api/files)
//   DELETE /resumes/me                 remove my resume
//   GET    /resumes                    every student's resume (placement cell)        (admin, faculty)
//   GET    /resumes/:studentId/file    download: the student themself, their parent, admin, faculty
// =====================================================================================================
import { Router } from 'express';
import { db } from '../db/connection';
import { requireAuth, requireRole } from '../auth/middleware';
import { audit } from '../auth/service';
import { findFile, fileOnDisk, removeFile } from '../files/store';
import { ownStudentIds } from '../academic/access';

export const resumesRouter = Router();

// one row per student; the file itself is a normal stored file (attached_to = 'resume:<studentId>')
db.exec(`-- One resume per student (the newest upload replaces the older one; the old file is deleted from disk).
CREATE TABLE IF NOT EXISTS student_resumes (
  student_id TEXT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,   -- the student (students.id)
  file_id TEXT NOT NULL,                                                   -- the stored file (stored_files.id, PDF or Word)
  uploaded_at INTEGER NOT NULL                                             -- when it was uploaded (epoch ms)
)`);

const ROW_SQL = `SELECT r.student_id, r.uploaded_at, f.id AS file_id, f.original_name, f.size, f.mime, s.name, s.roll_no, s.branch, s.year, s.semester
  FROM student_resumes r JOIN stored_files f ON f.id=r.file_id JOIN students s ON s.id=r.student_id WHERE s.deleted_at IS NULL`;
// Dto.
const dto = (r: any) => r && ({ studentId: r.student_id, name: r.name, rollNo: r.roll_no, branch: r.branch, year: r.year, semester: r.semester,
  fileName: r.original_name, size: r.size, mime: r.mime, uploadedAt: new Date(r.uploaded_at).toISOString() });
const ALLOWED = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

// GET /api/resumes/me  (who: only student)
resumesRouter.get('/resumes/me', requireRole('student'), (req, res) => {
  res.json(dto(db.prepare(ROW_SQL + ' AND r.student_id=?').get(req.user!.studentId)) || null);
});

// POST /api/resumes/me  (who: only student)
resumesRouter.post('/resumes/me', requireRole('student'), (req, res) => {
  const sid = req.user!.studentId!;
  const f = findFile(String(req.body?.fileId || ''));
  if (!f || f.uploaded_by !== req.user!.id || f.attached_to) return res.status(400).json({ error: 'The uploaded file was not found. Please choose the file again.' });
  if (!ALLOWED.includes(f.mime)) return res.status(400).json({ error: 'Please upload your resume as a PDF or Word file.' });
  const old = db.prepare('SELECT file_id FROM student_resumes WHERE student_id=?').get(sid) as any;
  db.exec('BEGIN');
  try {
    db.prepare('UPDATE stored_files SET attached_to=? WHERE id=?').run(`resume:${sid}`, f.id);
    db.prepare(`INSERT INTO student_resumes (student_id,file_id,uploaded_at) VALUES (?,?,?)
      ON CONFLICT(student_id) DO UPDATE SET file_id=excluded.file_id, uploaded_at=excluded.uploaded_at`).run(sid, f.id, Date.now());
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  if (old?.file_id && old.file_id !== f.id) removeFile(old.file_id);        // the replaced file is deleted from disk
  audit(req.user!.username, 'resume_uploaded', 'resume', sid);
  res.status(201).json(dto(db.prepare(ROW_SQL + ' AND r.student_id=?').get(sid)));
});

// DELETE /api/resumes/me  (who: only student)
resumesRouter.delete('/resumes/me', requireRole('student'), (req, res) => {
  const sid = req.user!.studentId!;
  const old = db.prepare('SELECT file_id FROM student_resumes WHERE student_id=?').get(sid) as any;
  if (!old) return res.status(404).json({ error: 'You have not uploaded a resume.' });
  db.prepare('DELETE FROM student_resumes WHERE student_id=?').run(sid);
  removeFile(old.file_id);
  audit(req.user!.username, 'resume_deleted', 'resume', sid);
  res.json({ ok: true });
});

// GET /api/resumes  (who: only admin, faculty)
resumesRouter.get('/resumes', requireRole('admin', 'faculty'), (_req, res) => {
  res.json((db.prepare(ROW_SQL + ' ORDER BY s.branch, s.year, s.roll_no').all() as any[]).map(dto));
});

// GET /api/resumes/:studentId/file  (who: any signed-in user)
resumesRouter.get('/resumes/:studentId/file', requireAuth, (req, res) => {
  const u = req.user!;
  const sid = String(req.params.studentId);
  if (!(u.role === 'admin' || u.role === 'faculty' || ownStudentIds(u).includes(sid))) return res.status(404).json({ error: 'Not found' });
  const r = db.prepare(ROW_SQL + ' AND r.student_id=?').get(sid) as any;
  if (!r) return res.status(404).json({ error: 'No resume uploaded yet.' });
  const ascii = String(r.original_name).replace(/[^\x20-\x7e]/g, '_');
  res.setHeader('Content-Type', r.mime);
  res.setHeader('Content-Disposition', `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(r.original_name)}`);
  res.setHeader('Cache-Control', 'private, no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(fileOnDisk(r.file_id));
});
