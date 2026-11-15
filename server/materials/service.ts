// ===================================================================================================
// Study materials (Step 9): who may publish, see and download which material (by subject / class).
// ===================================================================================================
import { db } from '../db/connection';
import { canTeach, studentRow, newId } from '../academic/access';
import { istParts } from '../notify/time';
import { findFile, kindOfMime, removeFile, fileOnDisk } from '../files/store';
import type { SessionUser } from '../auth/session';

// Step 9: study materials. Every "who may see / do this" decision is in this file; the routes only call it.
import { writeDenied } from '../auth/permissions';   // admin-given feature switches + cross-subject alerts
//   upload / publish : admin (any class, or general) and faculty (only for a subject assigned to them)
//   read             : admin + faculty: all.  student: materials of their class (branch + semester) and general ones.  parent: none.
//   change / delete  : the person who uploaded it, and admin

export const MATERIAL_CATEGORIES = ['Lecture Notes', 'Lab Manual', 'Question Bank', 'Syllabus & Curriculum', 'Assignment / Tutorial', 'Official Circular', 'Reference E-Book', 'Online Video / Lecture'];
const ADMIN_ONLY_CATEGORY = 'Official Circular';
const BRANCHES = ['CSE', 'Civil'];
const SEMESTERS = [1, 2, 3, 4, 5, 6];

// Data shape: result.
export type Result<T = {}> = ({ ok: true } & T) | { ok: false; status: number; error: string };
// Fail.
const fail = (status: number, error: string) => ({ ok: false as const, status, error });
// Str.
const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Size label.
export const sizeLabel = (n: number): string => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** A web link must be http(s). "javascript:", "data:", "file:" and the like are refused. */
export function cleanUrl(v: unknown): string | null {
  const s = str(v, 500);
  if (!s) return null;
  try { const u = new URL(s); return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null; } catch { return null; }
}

// Clean tags.
const cleanTags = (v: unknown): string[] =>
  (Array.isArray(v) ? v : []).map((t) => str(t, 30)).filter(Boolean).filter((t, i, a) => a.indexOf(t) === i).slice(0, 10);

const SQL = `SELECT m.*, s.code AS scode, s.name AS sname, f.original_name AS fname, f.mime AS fmime, f.size AS fsize
  FROM materials m LEFT JOIN subjects s ON s.id=m.subject_id LEFT JOIN stored_files f ON f.id=m.file_id`;
// Find material.
export const findMaterial = (id: string): any => db.prepare(SQL + ' WHERE m.id=?').get(id);

// Converts to dto.
export const toDto = (r: any, viewer?: SessionUser) => ({
  id: r.id, title: r.title, description: r.description,
  type: r.kind === 'link' ? 'link' : kindOfMime(r.fmime),
  category: r.category,
  branch: r.branch, semester: r.semester ?? 'All',
  subjectId: r.subject_id || undefined, subjectCode: r.scode || 'General', subjectName: r.sname || 'General material',
  fileUrl: r.kind === 'link' ? r.link_url : `/api/materials/${encodeURIComponent(r.id)}/file`,
  fileName: r.fname || undefined, fileSizeBytes: r.kind === 'link' ? 'Web link' : sizeLabel(r.fsize),
  uploadedByFacultyId: r.uploaded_by_user_id, uploadedByFacultyName: r.uploaded_by_name,
  uploadedAt: istParts(r.created_at).date, downloadCount: r.download_count,
  tags: JSON.parse(r.tags) as string[],
  mine: !!viewer && r.uploaded_by_user_id === viewer.id,
});

/** May this person see this material? */
export function canSee(u: SessionUser, m: { branch: string; semester: number | null }): boolean {
  if (u.role === 'admin' || u.role === 'faculty') return true;
  if (u.role !== 'student' || !u.studentId) return false;
  const st = studentRow(u.studentId);
  return !!st && (m.branch === 'All' || m.branch === st.branch) && (m.semester === null || m.semester === st.semester);
}

// List for.
export function listFor(u: SessionUser) {
  if (u.role === 'parent') return [];
  const rows = db.prepare(SQL + ' ORDER BY m.created_at DESC, m.rowid DESC LIMIT 1000').all() as any[];
  return rows.filter((r) => canSee(u, r)).map((r) => toDto(r, u));
}

/** Publish a material: either a file the person uploaded a moment ago (fileId) or a web link. */
export function createMaterial(u: SessionUser, b: any, now = Date.now()): Result<{ id: string }> {
  if (u.role !== 'admin' && u.role !== 'faculty') return fail(403, 'Only staff can publish study materials');
  const title = str(b?.title, 200), description = str(b?.description, 2000);
  if (!title) return fail(400, 'Title is required');
  if (!MATERIAL_CATEGORIES.includes(b?.category)) return fail(400, 'Choose a category');
  if (b.category === ADMIN_ONLY_CATEGORY && u.role !== 'admin') return fail(403, 'Only the admin can publish an Official Circular');
  if (b?.kind !== 'file' && b?.kind !== 'link') return fail(400, 'Choose a file or a link');

  // Which class? A subject decides it (copied from the subject). Without a subject only the admin may choose.
  let subjectId: string | null = null, branch = 'All', semester: number | null = null;
  if (b?.subjectId) {
    const s = db.prepare('SELECT id, branch, semester FROM subjects WHERE id=?').get(String(b.subjectId)) as any;
    if (!s) return fail(404, 'Subject not found');
    { const no = writeDenied(u, s.id, 'materials', 'publish study material'); if (no) return fail(403, no); }
    subjectId = s.id; branch = s.branch; semester = s.semester;
  } else {
    if (u.role !== 'admin') return fail(400, 'Choose one of your subjects');
    branch = b?.branch === undefined || b.branch === '' ? 'All' : b.branch;
    if (branch !== 'All' && !BRANCHES.includes(branch)) return fail(400, 'Unknown branch');
    if (b?.semester !== undefined && b.semester !== null && b.semester !== '' && b.semester !== 'All') {
      if (!Number.isInteger(b.semester) || !SEMESTERS.includes(b.semester)) return fail(400, 'Semester must be a number from 1 to 6');
      semester = b.semester;
    }
  }

  let fileId: string | null = null, linkUrl: string | null = null;
  if (b.kind === 'link') {
    linkUrl = cleanUrl(b?.linkUrl);
    if (!linkUrl) return fail(400, 'Enter a web link that starts with https:// or http://');
  } else {
    const f = findFile(String(b?.fileId || ''));
    if (!f || f.uploaded_by !== u.id || f.attached_to) return fail(400, 'The uploaded file was not found. Please upload it again.');
    fileId = f.id;
  }

  const id = newId('mat');
  const by = `${u.name} (${u.role === 'admin' ? 'Admin' : 'Faculty'})`;
  db.exec('BEGIN');
  try {
    db.prepare(`INSERT INTO materials (id,title,description,kind,category,subject_id,branch,semester,file_id,link_url,tags,uploaded_by_user_id,uploaded_by_name,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, title, description, b.kind, b.category, subjectId, branch, semester, fileId, linkUrl, JSON.stringify(cleanTags(b?.tags)), u.id, by, now);
    if (fileId) {
      const r = db.prepare('UPDATE stored_files SET attached_to=? WHERE id=? AND attached_to IS NULL').run(`material:${id}`, fileId);
      if (Number(r.changes) !== 1) throw new Error('file already used');       // two requests for the same upload: the second one loses
    }
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); return fail(409, 'That uploaded file was already used'); }
  return { ok: true, id };
}

/** Title, description, category, tags (and the link of a link material). The file and the class are not changed: delete and publish again. */
export function updateMaterial(u: SessionUser, id: string, b: any): Result {
  const m = findMaterial(id);
  if (!m) return fail(404, 'Material not found');
  if (u.role !== 'admin' && m.uploaded_by_user_id !== u.id) return fail(403, 'You can change only materials you uploaded');
  const title = b?.title === undefined ? m.title : str(b.title, 200);
  if (!title) return fail(400, 'Title is required');
  const description = b?.description === undefined ? m.description : str(b.description, 2000);
  const category = b?.category === undefined ? m.category : b.category;
  if (!MATERIAL_CATEGORIES.includes(category)) return fail(400, 'Choose a category');
  if (category === ADMIN_ONLY_CATEGORY && u.role !== 'admin') return fail(403, 'Only the admin can publish an Official Circular');
  let link = m.link_url;
  if (m.kind === 'link' && b?.linkUrl !== undefined) { link = cleanUrl(b.linkUrl); if (!link) return fail(400, 'Enter a web link that starts with https:// or http://'); }
  const tags = b?.tags === undefined ? m.tags : JSON.stringify(cleanTags(b.tags));
  db.prepare('UPDATE materials SET title=?, description=?, category=?, link_url=?, tags=? WHERE id=?').run(title, description, category, link, tags, id);
  return { ok: true };
}

// Delete material.
export function deleteMaterial(u: SessionUser, id: string): Result<{ title: string }> {
  const m = findMaterial(id);
  if (!m) return fail(404, 'Material not found');
  if (u.role !== 'admin' && m.uploaded_by_user_id !== u.id) return fail(403, 'You can remove only materials you uploaded');
  db.prepare('DELETE FROM materials WHERE id=?').run(id);
  if (m.file_id) removeFile(m.file_id);
  return { ok: true, title: m.title };
}

/** The file of a material, if this person may have it. Students' downloads are counted. */
export function openFile(u: SessionUser, id: string): Result<{ path: string; mime: string; name: string; kind: string }> {
  const m = findMaterial(id);
  if (!m || m.kind !== 'file' || !canSee(u, m)) return fail(404, 'Not found');      // a student of another class is told "not found", not "forbidden"
  const f = findFile(m.file_id);
  if (!f) return fail(404, 'The file is no longer available');
  if (u.role === 'student') db.prepare('UPDATE materials SET download_count=download_count+1 WHERE id=?').run(id);
  return { ok: true, path: fileOnDisk(f.id), mime: f.mime, name: f.original_name, kind: kindOfMime(f.mime) };
}
