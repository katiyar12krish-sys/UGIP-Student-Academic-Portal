// ===================================================================================================
// Doubt Q&A posts: the admin (any class) or a teacher (only their own subject) posts a question, an optional
// answer and an optional PDF for a class. Students see the posts of their own class; parents those of their
// children's class. Files go through /api/qa/:id/file after the same check (no public link).
// ===================================================================================================
import { db } from '../db/connection';
import { canTeach, studentRow, ownStudentIds, newId } from '../academic/access';
import { findFile, kindOfMime, removeFile, fileOnDisk } from '../files/store';
import type { SessionUser } from '../auth/session';

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; error: string };
const fail = (status: number, error: string) => ({ ok: false as const, status, error });
const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const SQL = `SELECT q.*, s.code AS scode, s.name AS sname, f.original_name AS fname, f.mime AS fmime, f.size AS fsize
  FROM qa_posts q LEFT JOIN subjects s ON s.id=q.subject_id LEFT JOIN stored_files f ON f.id=q.file_id`;
export const findPost = (id: string): any => db.prepare(SQL + ' WHERE q.id=?').get(id);

/** Classes ("CSE:3") this person may read. null = every class (admin / teachers). */
function classesOf(u: SessionUser): Set<string> | null {
  if (u.role === 'admin' || u.role === 'faculty') return null;
  const out = new Set<string>();
  for (const id of ownStudentIds(u)) { const s = studentRow(id) as any; if (s) out.add(`${s.branch}:${s.semester}`); }
  return out;
}
export function canSee(u: SessionUser, p: any): boolean {
  const c = classesOf(u);
  return c === null || c.has(`${p.branch}:${p.semester}`);
}
const canManage = (u: SessionUser, p: any) => u.role === 'admin' || (u.role === 'faculty' && p.author_id === u.id);

export function toDto(p: any, u: SessionUser) {
  return {
    id: p.id, title: p.title, body: p.body, answer: p.answer, branch: p.branch, semester: p.semester,
    subjectId: p.subject_id, subjectCode: p.scode || '', subjectName: p.sname || 'All subjects',
    authorName: p.author_name, authorRole: p.author_role, createdAt: p.created_at,
    file: p.file_id ? { name: p.fname, kind: kindOfMime(p.fmime), size: p.fsize } : null,
    canDelete: canManage(u, p),
  };
}

export function listFor(u: SessionUser) {
  const rows = db.prepare(SQL + ' ORDER BY q.created_at DESC LIMIT 300').all() as any[];
  return rows.filter((p) => canSee(u, p)).map((p) => toDto(p, u));
}

export function createPost(u: SessionUser, b: any, now = Date.now()): Result<{ id: string }> {
  if (u.role !== 'admin' && u.role !== 'faculty') return fail(403, 'Only the admin and teachers post questions');
  const title = str(b?.title, 300), body = str(b?.body, 4000), answer = str(b?.answer, 4000);
  if (!title) return fail(400, 'Write the question');
  let branch = str(b?.branch, 20), semester = Number(b?.semester), subjectId: string | null = null;
  if (b?.subjectId) {
    const s = db.prepare('SELECT * FROM subjects WHERE id=?').get(String(b.subjectId)) as any;
    if (!s) return fail(400, 'Subject not found');
    subjectId = s.id; branch = s.branch; semester = s.semester;
  }
  if (u.role === 'faculty' && (!subjectId || !canTeach(u, subjectId))) return fail(403, 'You can post only for your own subject');
  if (!['CSE', 'Civil'].includes(branch) || !Number.isInteger(semester) || semester < 1 || semester > 6) return fail(400, 'Choose the class (branch and semester)');
  const fileId = b?.fileId ? String(b.fileId) : null;
  if (fileId) {
    const f = findFile(fileId) as any;
    if (!f || f.uploaded_by !== u.id || f.attached_to) return fail(400, 'The uploaded file was not found. Please upload it again.');
  }
  const id = newId('qa');
  db.exec('BEGIN');
  try {
    db.prepare('INSERT INTO qa_posts (id,author_id,author_name,author_role,subject_id,branch,semester,title,body,answer,file_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(id, u.id, u.name, u.role, subjectId, branch, semester, title, body, answer, fileId, now);
    if (fileId) db.prepare('UPDATE stored_files SET attached_to=? WHERE id=? AND attached_to IS NULL').run(`qa:${id}`, fileId);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  return { ok: true, id };
}

export function deletePost(u: SessionUser, id: string): Result<{}> {
  const p = findPost(id);
  if (!p || !canSee(u, p)) return fail(404, 'Not found');
  if (!canManage(u, p)) return fail(403, 'Only the admin or the teacher who posted it can delete it');
  db.prepare('DELETE FROM qa_posts WHERE id=?').run(id);
  if (p.file_id) { db.prepare('DELETE FROM stored_files WHERE id=?').run(p.file_id); removeFile(p.file_id); }
  return { ok: true };
}

export function openFile(u: SessionUser, id: string): Result<{ path: string; mime: string; name: string; kind: string }> {
  const p = findPost(id);
  if (!p || !p.file_id || !canSee(u, p)) return fail(404, 'Not found');
  const f = findFile(p.file_id) as any;
  return f ? { ok: true, path: fileOnDisk(f.id), mime: f.mime, name: f.original_name, kind: kindOfMime(f.mime) } : fail(404, 'The file is no longer available');
}
