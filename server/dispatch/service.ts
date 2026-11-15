// ===================================================================================================
// Class & subject dispatch (Step 10): teacher sends notes / tasks to a class, students hand in work.
// All "who may see / do this" decisions, due dates, grading of submissions and private files.
// ===================================================================================================
import { db } from '../db/connection';
import { canTeach, studentRow, newId } from '../academic/access';
import { istParts } from '../notify/time';
import { findFile, kindOfMime, removeFile, fileOnDisk } from '../files/store';
import { sizeLabel } from '../materials/service';
import type { SessionUser } from '../auth/session';

// Step 10: class & subject dispatch. Every "who may see / do this" decision is in this file; the routes only call it.
import { writeDenied } from '../auth/permissions';   // admin-given feature switches + cross-subject alerts
//   send            : admin (any subject) and faculty (only a subject assigned to them). Class = the subject's branch + semester.
//   see a dispatch  : the students of that class, the teachers of that subject, admin. Parents: none. Other teachers: not even listed.
//   submit          : a student of that class, only to an "Assignment & Task", until 23:59 IST on the due date, not after it is graded.
//   see submissions : the student who wrote it (their own only) and the teachers of the subject / admin.
//   grade           : the teachers of the subject / admin.
//   delete          : the teacher who sent it, and admin (files and submissions go with it).

export const DISPATCH_TYPES = ['Lecture Notes', 'Assignment & Task', 'Test / Exam Paper', 'Lab Module', 'Circular Notice', 'Formula Sheet'] as const;
export const TASK_TYPE = 'Assignment & Task';

// Data shape: result.
export type Result<T = {}> = ({ ok: true } & T) | { ok: false; status: number; error: string };
// Fail.
const fail = (status: number, error: string) => ({ ok: false as const, status, error });
// Str.
const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
// Valid date.
const validDate = (d: unknown): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) === d;

/** A task is open until the very end of its due date, Indian time. */
export const closesAt = (dueDate: string): number => Date.parse(`${dueDate}T23:59:59.999+05:30`);

const D_SQL = `SELECT d.*, s.code AS scode, s.name AS sname, s.branch AS branch, s.semester AS semester, s.year AS syear,
    f.original_name AS fname, f.mime AS fmime, f.size AS fsize
  FROM dispatches d JOIN subjects s ON s.id=d.subject_id LEFT JOIN stored_files f ON f.id=d.file_id`;
const S_SQL = `SELECT x.*, st.name AS stname, st.roll_no AS roll, f.original_name AS fname, f.mime AS fmime, f.size AS fsize
  FROM dispatch_submissions x JOIN students st ON st.id=x.student_id LEFT JOIN stored_files f ON f.id=x.file_id`;
// Find dispatch.
export const findDispatch = (id: string): any => db.prepare(D_SQL + ' WHERE d.id=?').get(id);
// Find submission.
export const findSubmission = (id: string): any => db.prepare(S_SQL + ' WHERE x.id=?').get(id);

// ---------- who may do what ----------
/** Teacher of the subject, or admin. Same rule as marks, attendance and online tests. */
export const canManage = (u: SessionUser, d: { subject_id: string }) => canTeach(u, d.subject_id);

// true / false: can see?
export function canSee(u: SessionUser, d: any): boolean {
  if (u.role === 'admin' || u.role === 'faculty') return canManage(u, d);
  if (u.role !== 'student' || !u.studentId) return false;
  const st = studentRow(u.studentId);
  return !!st && st.branch === d.branch && st.semester === d.semester;
}

// ---------- shape sent to the browser (same field names the screen always used) ----------
const subDto = (x: any, d: any) => ({
  id: x.id, materialId: x.dispatch_id, studentId: x.student_id, studentName: x.stname, rollNo: x.roll,
  submittedAt: new Date(x.submitted_at).toISOString(), content: x.content,
  attachmentName: x.fname || undefined, attachmentUrl: x.file_id ? `/api/dispatches/${encodeURIComponent(x.dispatch_id)}/submissions/${encodeURIComponent(x.id)}/file` : undefined,
  marksAwarded: x.marks ?? undefined, maxMarks: d.max_marks ?? undefined, feedback: x.feedback ?? undefined,
  status: x.marks === null ? 'Submitted' : 'Graded',
  attempts: x.attempts,
});

// Converts to dto.
export function toDto(d: any, u: SessionUser, now: number = Date.now()) {
  const staff = u.role === 'admin' || u.role === 'faculty';
  const all = db.prepare(S_SQL + ' WHERE x.dispatch_id=? ORDER BY st.roll_no').all(d.id) as any[];
  const shown = staff ? all : all.filter((x) => u.studentId && x.student_id === u.studentId);   // a student sees only their own submission
  return {
    id: d.id, branch: d.branch, year: d.syear, semester: d.semester,
    subjectId: d.subject_id, subjectCode: d.scode, subjectName: d.sname,
    title: d.title, type: d.type, description: d.description,
    fileSizeBytes: d.file_id ? sizeLabel(d.fsize) : '',
    attachmentName: d.fname || undefined, attachmentUrl: d.file_id ? `/api/dispatches/${encodeURIComponent(d.id)}/file` : undefined,
    fileKind: d.file_id ? kindOfMime(d.fmime) : undefined,
    sentByFacultyId: d.sent_by_user_id, sentByFacultyName: d.sent_by_name,
    sentAt: new Date(d.created_at).toISOString(),
    dueDate: d.due_date ?? undefined, maxMarks: d.max_marks ?? undefined,
    closed: d.type === TASK_TYPE && !!d.due_date && now > closesAt(d.due_date),
    submissions: shown.map((x) => subDto(x, d)),
    submittedCount: all.length,
    mine: d.sent_by_user_id === u.id,
  };
}

// List for.
export function listFor(u: SessionUser) {
  if (u.role !== 'admin' && u.role !== 'faculty' && !(u.role === 'student' && u.studentId)) return [];
  return (db.prepare(D_SQL + ' ORDER BY d.created_at DESC, d.rowid DESC LIMIT 1000').all() as any[]).filter((d) => canSee(u, d)).map((d) => toDto(d, u));
}

// ---------- send ----------
export function createDispatch(u: SessionUser, b: any, now = Date.now()): Result<{ id: string }> {
  if (u.role !== 'admin' && u.role !== 'faculty') return fail(403, 'Only staff can dispatch material to a class');
  const sub = db.prepare('SELECT id, branch, semester FROM subjects WHERE id=?').get(String(b?.subjectId || '')) as any;
  if (!sub) return fail(400, 'Choose a subject');
  { const no = writeDenied(u, sub.id, 'dispatch', 'send a class dispatch'); if (no) return fail(403, no); }
  const title = str(b?.title, 200);
  if (!title) return fail(400, 'Title is required');
  if (!DISPATCH_TYPES.includes(b?.type)) return fail(400, 'Choose a type');
  let dueDate: string | null = null, maxMarks: number | null = null;
  if (b.type === TASK_TYPE) {
    if (!validDate(b.dueDate)) return fail(400, 'Enter the due date');
    if (b.dueDate < istParts(now).date) return fail(400, 'The due date cannot be in the past');
    const m = Number(b.maxMarks);
    if (!Number.isFinite(m) || m <= 0 || m > 1000) return fail(400, 'Max marks must be between 1 and 1000');
    dueDate = b.dueDate; maxMarks = Math.round(m * 100) / 100;
  }
  let fileId: string | null = null;
  if (b?.fileId) {
    const f = findFile(String(b.fileId));
    if (!f || f.uploaded_by !== u.id || f.attached_to) return fail(400, 'The uploaded file was not found. Please upload it again.');
    fileId = f.id;
  }
  const id = newId('disp');
  db.exec('BEGIN');
  try {
    db.prepare(`INSERT INTO dispatches (id,subject_id,type,title,description,file_id,due_date,max_marks,sent_by_user_id,sent_by_name,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, sub.id, b.type, title, str(b?.description, 2000), fileId, dueDate, maxMarks, u.id, u.name, now);
    if (fileId && Number(db.prepare('UPDATE stored_files SET attached_to=? WHERE id=? AND attached_to IS NULL').run(`dispatch:${id}`, fileId).changes) !== 1) throw new Error('file already used');
    db.exec('COMMIT');
  } catch { db.exec('ROLLBACK'); return fail(409, 'That uploaded file was already used'); }
  return { ok: true, id };
}

// ---------- student submits (or re-submits before the deadline) ----------
export function submitWork(u: SessionUser, d: any, b: any, now = Date.now()): Result<{ id: string; created: boolean }> {
  if (u.role !== 'student' || !u.studentId) return fail(403, 'Only students submit work');
  if (!canSee(u, d)) return fail(404, 'Not found');                       // another class: "not found", not "forbidden"
  if (d.type !== TASK_TYPE) return fail(400, 'This item does not take submissions');
  if (now > closesAt(d.due_date)) return fail(403, 'The due date has passed. Submissions are closed.');
  const content = str(b?.content, 5000);
  let fileId: string | null = null;
  if (b?.fileId) {
    const f = findFile(String(b.fileId));
    if (!f || f.uploaded_by !== u.id || f.attached_to) return fail(400, 'The uploaded file was not found. Please upload it again.');
    fileId = f.id;
  }
  const old = db.prepare('SELECT * FROM dispatch_submissions WHERE dispatch_id=? AND student_id=?').get(d.id, u.studentId) as any;
  if (old && old.marks !== null) return fail(409, 'This work is already graded and can no longer be changed');
  // editing only the text of an earlier submission: keepFile=true keeps the file already handed in
  const keptFile: string | null = !fileId && b?.keepFile === true && old?.file_id ? old.file_id : null;
  if (!content && !fileId && !keptFile) return fail(400, 'Write your answer or attach a file');
  const id = old?.id ?? newId('subm');
  db.exec('BEGIN');
  try {
    if (old) db.prepare('UPDATE dispatch_submissions SET content=?, file_id=?, submitted_at=?, attempts=attempts+1 WHERE id=?').run(content, fileId ?? keptFile, now, id);
    else db.prepare('INSERT INTO dispatch_submissions (id,dispatch_id,student_id,content,file_id,submitted_at) VALUES (?,?,?,?,?,?)').run(id, d.id, u.studentId, content, fileId, now);
    if (fileId && Number(db.prepare('UPDATE stored_files SET attached_to=? WHERE id=? AND attached_to IS NULL').run(`submission:${id}`, fileId).changes) !== 1) throw new Error('file already used');
    db.exec('COMMIT');
  } catch { db.exec('ROLLBACK'); return fail(409, 'That uploaded file was already used'); }
  if (old?.file_id && old.file_id !== fileId && old.file_id !== keptFile) removeFile(old.file_id);    // the replaced file is deleted from disk too
  return { ok: true, id, created: !old };
}

// ---------- teacher grades ----------
export function gradeSubmission(u: SessionUser, d: any, submissionId: string, b: any, now = Date.now()): Result {
  if (!canManage(u, d)) return fail(404, 'Not found');                    // a teacher of another subject is not told it exists
  const x = db.prepare('SELECT * FROM dispatch_submissions WHERE id=? AND dispatch_id=?').get(submissionId, d.id) as any;
  if (!x) return fail(404, 'Submission not found');
  const marks = typeof b?.marks === 'number' ? b.marks : Number.NaN;
  if (!Number.isFinite(marks) || marks < 0 || marks > d.max_marks) return fail(400, `Marks must be a number from 0 to ${d.max_marks}`);
  db.prepare('UPDATE dispatch_submissions SET marks=?, feedback=?, graded_by=?, graded_at=? WHERE id=?').run(Math.round(marks * 100) / 100, str(b?.feedback, 1000) || null, u.id, now, submissionId);
  return { ok: true };
}

// ---------- delete ----------
export function deleteDispatch(u: SessionUser, id: string): Result<{ title: string }> {
  const d = findDispatch(id);
  if (!d || !canSee(u, d)) return fail(404, 'Not found');
  if (u.role !== 'admin' && d.sent_by_user_id !== u.id) return fail(403, 'You can remove only material you sent');
  const files = [d.file_id, ...(db.prepare('SELECT file_id FROM dispatch_submissions WHERE dispatch_id=?').all(id) as any[]).map((r) => r.file_id)].filter(Boolean) as string[];
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM dispatch_submissions WHERE dispatch_id=?').run(id);
    db.prepare('DELETE FROM dispatches WHERE id=?').run(id);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  files.forEach(removeFile);
  return { ok: true, title: d.title };
}

// ---------- files ----------
type FileResult = Result<{ path: string; mime: string; name: string; kind: string }>;
// File out.
const fileOut = (fileId: string): FileResult => {
  const f = findFile(fileId);
  return f ? { ok: true, path: fileOnDisk(f.id), mime: f.mime, name: f.original_name, kind: kindOfMime(f.mime) } : fail(404, 'The file is no longer available');
};

/** The teacher's file: whoever may see the dispatch. */
export function openDispatchFile(u: SessionUser, id: string): FileResult {
  const d = findDispatch(id);
  if (!d || !d.file_id || !canSee(u, d)) return fail(404, 'Not found');
  return fileOut(d.file_id);
}

/** A student's file: only that student and the teachers of the subject (admin). Nobody else, not even classmates. */
export function openSubmissionFile(u: SessionUser, dispatchId: string, submissionId: string): FileResult {
  const d = findDispatch(dispatchId), x = d ? findSubmission(submissionId) : undefined;
  if (!d || !x || x.dispatch_id !== d.id || !x.file_id) return fail(404, 'Not found');
  const own = u.role === 'student' && !!u.studentId && x.student_id === u.studentId;
  if (!own && !canManage(u, d)) return fail(404, 'Not found');
  return fileOut(x.file_id);
}
