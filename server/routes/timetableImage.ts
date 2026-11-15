// ===================================================================================================
// Timetable picture / PDF per class. Admin and teachers upload (it replaces the old one); students and
// parents see only their own class. The file is served only through /api/timetable-image/:branch/:sem/file.
// ===================================================================================================
import { Router } from 'express';
import { db } from '../db/connection';
import { requireAuth, requireRole } from '../auth/middleware';
import { audit } from '../auth/service';
import { ownStudentIds, studentRow } from '../academic/access';
import { findFile, kindOfMime, removeFile, fileOnDisk } from '../files/store';
import type { SessionUser } from '../auth/session';

export const timetableImageRouter = Router();

const classOk = (branch: string, sem: number) => ['CSE', 'Civil'].includes(branch) && Number.isInteger(sem) && sem >= 1 && sem <= 6;
function mayRead(u: SessionUser, branch: string, sem: number): boolean {
  if (u.role === 'admin' || u.role === 'faculty') return true;
  return ownStudentIds(u).some((id) => { const s = studentRow(id) as any; return s && s.branch === branch && s.semester === sem; });
}
const row = (branch: string, sem: number): any => db.prepare(`SELECT t.*, f.original_name, f.mime FROM timetable_images t
  JOIN stored_files f ON f.id=t.file_id WHERE t.branch=? AND t.semester=?`).get(branch, sem);
const dto = (r: any) => ({ branch: r.branch, semester: r.semester, note: r.note, name: r.original_name, kind: kindOfMime(r.mime),
  uploadedBy: r.uploaded_name, updatedAt: r.updated_at, url: `/api/timetable-image/${encodeURIComponent(r.branch)}/${r.semester}/file` });

// GET /api/timetable-image/:branch/:sem   -> the picture info, or null
timetableImageRouter.get('/timetable-image/:branch/:sem', requireAuth, (req, res) => {
  const branch = String(req.params.branch), sem = Number(req.params.sem);
  if (!classOk(branch, sem) || !mayRead(req.user!, branch, sem)) return res.status(404).json({ error: 'Not found' });
  const r = row(branch, sem);
  res.json(r ? dto(r) : null);
});

// PUT /api/timetable-image/:branch/:sem  { fileId, note }   (who: admin, faculty)
timetableImageRouter.put('/timetable-image/:branch/:sem', requireRole('admin', 'faculty'), (req, res) => {
  const u = req.user!, branch = String(req.params.branch), sem = Number(req.params.sem);
  if (!classOk(branch, sem)) return res.status(400).json({ error: 'Choose the class (branch and semester)' });
  const fileId = String(req.body?.fileId || '');
  const f = findFile(fileId) as any;
  if (!f || f.uploaded_by !== u.id || f.attached_to) return res.status(400).json({ error: 'The uploaded file was not found. Please upload it again.' });
  const kind = kindOfMime(f.mime);
  if (kind !== 'image' && kind !== 'pdf') return res.status(400).json({ error: 'Upload a picture (JPG / PNG) or a PDF of the timetable' });
  const old = row(branch, sem);
  const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 200) : '';
  db.exec('BEGIN');
  try {
    db.prepare(`INSERT INTO timetable_images (branch,semester,file_id,note,uploaded_by,uploaded_name,updated_at) VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(branch, semester) DO UPDATE SET file_id=excluded.file_id, note=excluded.note, uploaded_by=excluded.uploaded_by,
      uploaded_name=excluded.uploaded_name, updated_at=excluded.updated_at`).run(branch, sem, fileId, note, u.id, u.name, Date.now());
    db.prepare('UPDATE stored_files SET attached_to=? WHERE id=?').run(`timetable:${branch}:${sem}`, fileId);
    if (old) db.prepare('DELETE FROM stored_files WHERE id=?').run(old.file_id);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  if (old) removeFile(old.file_id);
  audit(u.username, 'timetable_image_set', 'timetable', `${branch}:${sem}`);
  res.json(dto(row(branch, sem)));
});

// DELETE /api/timetable-image/:branch/:sem   (who: admin, faculty)
timetableImageRouter.delete('/timetable-image/:branch/:sem', requireRole('admin', 'faculty'), (req, res) => {
  const branch = String(req.params.branch), sem = Number(req.params.sem);
  const old = classOk(branch, sem) ? row(branch, sem) : null;
  if (!old) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM timetable_images WHERE branch=? AND semester=?').run(branch, sem);
  db.prepare('DELETE FROM stored_files WHERE id=?').run(old.file_id);
  removeFile(old.file_id);
  audit(req.user!.username, 'timetable_image_deleted', 'timetable', `${branch}:${sem}`);
  res.json({ ok: true });
});

// GET /api/timetable-image/:branch/:sem/file
timetableImageRouter.get('/timetable-image/:branch/:sem/file', requireAuth, (req, res) => {
  const branch = String(req.params.branch), sem = Number(req.params.sem);
  if (!classOk(branch, sem) || !mayRead(req.user!, branch, sem)) return res.status(404).json({ error: 'Not found' });
  const r = row(branch, sem);
  if (!r) return res.status(404).json({ error: 'Not found' });
  const ascii = String(r.original_name).replace(/[^\x20-\x7e]/g, '_');
  res.setHeader('Content-Type', r.mime);
  res.setHeader('Content-Disposition', `${req.query.download === '1' ? 'attachment' : 'inline'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(r.original_name)}`);
  res.setHeader('Cache-Control', 'private, no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(fileOnDisk(r.file_id));
});
