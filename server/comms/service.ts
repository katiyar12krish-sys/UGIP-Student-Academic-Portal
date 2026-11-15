// ===================================================================================================
// Notices, one-to-one notices and doubts (Step 8).
// Who may publish to which class, who may read which notice, private messages to one student, and the
// doubt (question) threads between a student and the teachers of a subject.
// ===================================================================================================
import { db } from '../db/connection';
import { canTeach, studentRow, ownStudentIds, newId } from '../academic/access';
import { istParts } from '../notify/time';
import type { SessionUser } from '../auth/session';

// Step 8: notices (circulars), direct notices to one student, doubts (questions to the teachers of a subject).
// Every "who may see / do this" decision is in this file. The routes only call it.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "22 Oct, 14:05" in Indian time. */
export function whenLabel(ms: number): string {
  const d = new Date(ms + 330 * 60_000);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}
// Str.
const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const BRANCHES = ['CSE', 'Civil'];
const SEMESTERS = [1, 2, 3, 4, 5, 6];

// Data shape: result.
export type Result<T = {}> = ({ ok: true } & T) | { ok: false; status: number; error: string };
// Fail.
const fail = (status: number, error: string) => ({ ok: false as const, status, error });

// ---------- who teaches what ----------
/** The active teachers assigned to a subject. */
export const teachersOfSubject = (subjectId: string): { id: string; name: string }[] =>
  db.prepare("SELECT u.id, u.name FROM faculty_subject_assignments a JOIN users u ON u.id=a.user_id WHERE a.subject_id=? AND u.is_active=1 AND u.role='faculty' ORDER BY u.name").all(subjectId) as any[];

/** The classes (branch + semester) a faculty member teaches, from the subjects assigned to them. Admin: every class. */
export function classesTaught(u: SessionUser): Set<string> {
  const out = new Set<string>();
  if (u.role === 'admin') { for (const b of BRANCHES) for (const s of SEMESTERS) out.add(`${b}|${s}`); return out; }
  if (u.role !== 'faculty' || !u.subjectIds.length) return out;
  const rows = db.prepare(`SELECT DISTINCT branch, semester FROM subjects WHERE id IN (${u.subjectIds.map(() => '?').join(',')})`).all(...u.subjectIds) as any[];
  for (const r of rows) out.add(`${r.branch}|${r.semester}`);
  return out;
}
// Teaches class.
export const teachesClass = (u: SessionUser, branch: string, semester: number) => classesTaught(u).has(`${branch}|${semester}`);

// =====================================================================================
// NOTICES
// =====================================================================================
export const NOTICE_CATEGORIES = ['Academic', 'Exam', 'Scholarship', 'Placement', 'Sports', 'Administrative'];
export const NOTICE_PRIORITIES = ['Normal', 'High', 'Urgent'];

// Notice dto.
const noticeDto = (r: any, viewer?: SessionUser) => ({
  id: r.id, title: r.title, category: r.category, priority: r.priority, content: r.content,
  date: istParts(r.created_at).date, publishedBy: r.published_by,
  pdfAttachment: r.pdf_attachment || undefined,
  targetBranch: r.target_branch, targetSemesters: JSON.parse(r.target_semesters) as number[],
  mine: !!viewer && r.created_by_user_id === viewer.id,
});

/** Is a notice meant for a student of this class? */
export const noticeReaches = (n: { target_branch: string; target_semesters: string }, branch: string, semester: number): boolean => {
  const sems: number[] = JSON.parse(n.target_semesters);
  return (n.target_branch === 'All' || n.target_branch === branch) && (!sems.length || sems.includes(semester));
};

/** The classes a notice goes to, as "branch|semester" keys. */
export function noticeClasses(branch: string, semesters: number[]): string[] {
  const bs = branch === 'All' ? BRANCHES : [branch], ss = semesters.length ? semesters : SEMESTERS;
  return bs.flatMap((b) => ss.map((s) => `${b}|${s}`));
}

/**
 * Publish a notice.
 *  admin   -> anyone, and may write the "published by" line (e.g. "Controller of Examinations")
 *  faculty -> only classes they teach (so "all branches / all semesters" is for admin); "published by" is always their own name
 */
export function createNotice(u: SessionUser, b: any, now = Date.now()): Result<{ id: string }> {
  if (u.role !== 'admin' && u.role !== 'faculty') return fail(403, 'Only staff can publish notices');
  const title = str(b?.title, 200), content = str(b?.content, 5000);
  if (!title) return fail(400, 'Title is required');
  if (!content) return fail(400, 'Notice text is required');
  if (!NOTICE_CATEGORIES.includes(b?.category)) return fail(400, 'Choose a category');
  const priority = b?.priority === undefined ? 'Normal' : b.priority;
  if (!NOTICE_PRIORITIES.includes(priority)) return fail(400, 'Choose a priority');
  const targetBranch = b?.targetBranch === undefined || b.targetBranch === '' ? 'All' : b.targetBranch;
  if (targetBranch !== 'All' && !BRANCHES.includes(targetBranch)) return fail(400, 'Unknown branch');
  const rawSems = b?.targetSemesters === undefined ? [] : b.targetSemesters;
  if (!Array.isArray(rawSems) || rawSems.some((s: unknown) => !Number.isInteger(s) || !SEMESTERS.includes(s as number))) return fail(400, 'Semesters must be numbers from 1 to 6');
  const semesters = [...new Set(rawSems as number[])].sort((a, b2) => a - b2);
  if (b.category === 'Placement' && !semesters.length) return fail(400, 'A placement notice must say which semester(s) it is for');
  if (u.role === 'faculty') {
    const mine = classesTaught(u);
    const outside = noticeClasses(targetBranch, semesters).filter((k) => !mine.has(k));
    if (outside.length) return fail(403, 'You can publish only to classes you teach. Ask the admin for a notice to other classes');
  }
  const publishedBy = u.role === 'admin' ? (str(b?.publishedBy, 120) || `${u.name} (Principal / Administration)`) : `${u.name} (Faculty)`;
  const id = newId('not');
  db.prepare(`INSERT INTO notices (id,title,category,priority,content,pdf_attachment,published_by,target_branch,target_semesters,created_by_user_id,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(id, title, b.category, priority, content, str(b?.pdfAttachment, 200) || null, publishedBy, targetBranch, JSON.stringify(semesters), u.id, now);
  return { ok: true, id };
}

// Find notice.
export const findNotice = (id: string): any => db.prepare('SELECT * FROM notices WHERE id=? AND deleted_at IS NULL').get(id);
export const toNoticeDto = noticeDto;

/** Admin may remove any notice, a teacher only their own. */
export function deleteNotice(u: SessionUser, id: string, now = Date.now()): Result {
  const n = findNotice(id);
  if (!n) return fail(404, 'Notice not found');
  if (u.role !== 'admin' && !(u.role === 'faculty' && n.created_by_user_id === u.id)) return fail(403, 'You can remove only notices you published');
  db.prepare('UPDATE notices SET deleted_at=? WHERE id=?').run(now, id);
  return { ok: true };
}

/** Notices this person may read. Staff: all. Student: their class. Parent: the classes of their children. */
export function listNoticesFor(u: SessionUser) {
  const rows = db.prepare('SELECT * FROM notices WHERE deleted_at IS NULL ORDER BY created_at DESC, rowid DESC LIMIT 500').all() as any[];
  if (u.role === 'admin' || u.role === 'faculty') return rows.map((r) => noticeDto(r, u));
  const classes = ownStudentIds(u).map(studentRow).filter(Boolean) as any[];
  return rows.filter((r) => classes.some((c) => noticeReaches(r, c.branch, c.semester))).map((r) => noticeDto(r, u));
}

/** What a visitor who is not logged in may see: notices for everybody (no class targeting, not placement). */
export function publicNotices() {
  return (db.prepare("SELECT * FROM notices WHERE deleted_at IS NULL AND target_branch='All' AND target_semesters='[]' AND category<>'Placement' ORDER BY created_at DESC, rowid DESC LIMIT 20").all() as any[])
    .map((r) => { const d = noticeDto(r); return { ...d, mine: undefined }; });
}

// =====================================================================================
// DIRECT NOTICES (teacher -> one student)
// =====================================================================================
export const DIRECT_PRIORITIES = ['normal', 'urgent', 'critical'];

// Direct dto.
const directDto = (r: any) => ({
  id: r.id, targetStudentId: r.student_id, targetStudentName: r.sname, targetStudentRoll: r.roll_no,
  title: r.title, message: r.message, priority: r.priority,
  sentByRole: r.sent_by_role, sentByName: r.sent_by_name, sentAt: whenLabel(r.created_at), isRead: !!r.read_at,
});
const DIRECT_SQL = 'SELECT d.*, s.name AS sname, s.roll_no FROM direct_notices d JOIN students s ON s.id=d.student_id';
// Find direct.
export const findDirect = (id: string): any => db.prepare(DIRECT_SQL + ' WHERE d.id=?').get(id);
export const toDirectDto = directDto;

/** A teacher may write to students of the classes they teach; admin to any student. */
export function createDirectNotice(u: SessionUser, b: any, now = Date.now()): Result<{ id: string }> {
  if (u.role !== 'admin' && u.role !== 'faculty') return fail(403, 'Only staff can send notices');
  const st = studentRow(String(b?.studentId || ''));
  if (!st) return fail(404, 'Student not found');
  if (!teachesClass(u, st.branch, st.semester)) return fail(403, 'You can write only to students of classes you teach');
  const title = str(b?.title, 200), message = str(b?.message, 2000);
  if (!title || !message) return fail(400, 'Title and message are required');
  const priority = b?.priority === undefined ? 'normal' : b.priority;
  if (!DIRECT_PRIORITIES.includes(priority)) return fail(400, 'Choose a priority');
  const id = newId('dn');
  db.prepare('INSERT INTO direct_notices (id,student_id,title,message,priority,sent_by_user_id,sent_by_role,sent_by_name,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(id, st.id, title, message, priority, u.id, u.role, u.name, now);
  return { ok: true, id };
}

/** Student: their own. Admin: all. Teacher: the ones they sent. */
export function listDirectFor(u: SessionUser) {
  if (u.role === 'student' && u.studentId) return (db.prepare(DIRECT_SQL + ' WHERE d.student_id=? ORDER BY d.created_at DESC, d.rowid DESC LIMIT 200').all(u.studentId) as any[]).map(directDto);
  if (u.role === 'parent' && u.childIds.length) return (db.prepare(DIRECT_SQL + ` WHERE d.student_id IN (${u.childIds.map(() => '?').join(',')}) ORDER BY d.created_at DESC, d.rowid DESC LIMIT 200`).all(...u.childIds) as any[]).map(directDto);   // Step 14: read-only
  if (u.role === 'admin') return (db.prepare(DIRECT_SQL + ' ORDER BY d.created_at DESC, d.rowid DESC LIMIT 500').all() as any[]).map(directDto);
  if (u.role === 'faculty') return (db.prepare(DIRECT_SQL + ' WHERE d.sent_by_user_id=? ORDER BY d.created_at DESC, d.rowid DESC LIMIT 500').all(u.id) as any[]).map(directDto);
  return [];
}

// Mark direct read.
export function markDirectRead(u: SessionUser, id: string, now = Date.now()): Result {
  const d = findDirect(id);
  if (!d || u.role !== 'student' || d.student_id !== u.studentId) return fail(404, 'Notice not found');
  db.prepare('UPDATE direct_notices SET read_at=COALESCE(read_at,?) WHERE id=?').run(now, id);
  return { ok: true };
}

// =====================================================================================
// DOUBTS
// =====================================================================================
export const findDoubt = (id: string): any =>
  db.prepare(`SELECT d.*, s.name AS student_name, s.roll_no, sub.name AS subject_name, sub.code AS subject_code, sub.year AS subject_year
    FROM doubts d JOIN students s ON s.id=d.student_id JOIN subjects sub ON sub.id=d.subject_id WHERE d.id=?`).get(id);

/** Who may open this doubt: the student who asked, a teacher of the subject (same rule as marks), admin. */
export function canSeeDoubt(u: SessionUser, d: { student_id: string; subject_id: string }): boolean {
  if (u.role === 'admin') return true;
  if (u.role === 'faculty') return canTeach(u, d.subject_id);
  return u.role === 'student' && !!u.studentId && u.studentId === d.student_id;
}

// Doubt dto.
function doubtDto(d: any, replies: any[]) {
  const experts = teachersOfSubject(d.subject_id);
  return {
    id: d.id, studentId: d.student_id, studentName: d.student_name, studentRoll: d.roll_no,
    branch: d.branch, year: d.subject_year, semester: d.semester,
    subjectId: d.subject_id, subjectName: d.subject_name,
    questionTitle: d.title, questionDetails: d.details,
    expertFacultyId: experts[0]?.id, expertFacultyName: experts.length ? experts.map((e) => e.name).join(', ') : undefined,
    status: d.status, askedAt: whenLabel(d.created_at),
    replies: replies.map((r) => ({ id: String(r.id), senderId: r.sender_user_id, senderRole: r.sender_role, senderName: r.sender_name, text: r.text, timestamp: whenLabel(r.created_at) })),
  };
}
// Converts to doubt dto.
export const toDoubtDto = (d: any) => doubtDto(d, db.prepare('SELECT * FROM doubt_replies WHERE doubt_id=? ORDER BY id').all(d.id) as any[]);

/** A student asks the teachers of one of their own class's subjects. */
export function askDoubt(u: SessionUser, b: any, now = Date.now()): Result<{ id: string }> {
  if (u.role !== 'student' || !u.studentId) return fail(403, 'Only students ask doubts');
  const st = studentRow(u.studentId);
  const sub = db.prepare('SELECT * FROM subjects WHERE id=?').get(String(b?.subjectId || '')) as any;
  if (!st || !sub || sub.branch !== st.branch || sub.semester !== st.semester) return fail(400, 'Choose a subject of your own class');
  const title = str(b?.questionTitle, 200), details = str(b?.questionDetails, 2000);
  if (!title || !details) return fail(400, 'Write a title and the details of your doubt');
  const id = newId('dbt');
  db.prepare('INSERT INTO doubts (id,student_id,subject_id,branch,semester,title,details,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(id, st.id, sub.id, sub.branch, sub.semester, title, details, now, now);
  return { ok: true, id };
}

/**
 * Add a message to the conversation. Sender name and role come from the login.
 * A teacher's first answer moves "Pending" to "In Discussion"; a student writing again under a "Resolved" doubt reopens it.
 */
export function replyDoubt(u: SessionUser, d: any, text: unknown, now = Date.now()): Result<{ replyId: number }> {
  if (!canSeeDoubt(u, d)) return fail(404, 'Doubt not found');
  const t = str(text, 2000);
  if (!t) return fail(400, 'Write your message');
  const r = db.prepare('INSERT INTO doubt_replies (doubt_id,sender_user_id,sender_role,sender_name,text,created_at) VALUES (?,?,?,?,?,?)')
    .run(d.id, u.id, u.role, u.name, t, now);
  const staff = u.role !== 'student';
  const status = staff ? (d.status === 'Pending' ? 'In Discussion' : d.status) : (d.status === 'Resolved' ? 'In Discussion' : d.status);
  db.prepare('UPDATE doubts SET status=?, updated_at=?, resolved_at=? WHERE id=?').run(status, now, status === 'Resolved' ? d.resolved_at : null, d.id);
  return { ok: true, replyId: Number(r.lastInsertRowid) };
}

/** The student who asked, a teacher of the subject, or admin can close it. */
export function resolveDoubt(u: SessionUser, d: any, now = Date.now()): Result<{ changed: boolean }> {
  if (!canSeeDoubt(u, d)) return fail(404, 'Doubt not found');
  if (d.status === 'Resolved') return { ok: true, changed: false };
  db.prepare("UPDATE doubts SET status='Resolved', updated_at=?, resolved_at=? WHERE id=?").run(now, now, d.id);
  return { ok: true, changed: true };
}

/** Student: their own doubts. Teacher: doubts of the subjects they teach. Admin: all. Newest activity first. */
export function listDoubtsFor(u: SessionUser) {
  let rows: any[] = [];
  const base = `SELECT d.id FROM doubts d`;
  if (u.role === 'admin') rows = db.prepare(`${base} ORDER BY d.updated_at DESC, d.rowid DESC LIMIT 300`).all() as any[];
  else if (u.role === 'faculty' && u.subjectIds.length) rows = db.prepare(`${base} WHERE d.subject_id IN (${u.subjectIds.map(() => '?').join(',')}) ORDER BY d.updated_at DESC, d.rowid DESC LIMIT 300`).all(...u.subjectIds) as any[];
  else if (u.role === 'student' && u.studentId) rows = db.prepare(`${base} WHERE d.student_id=? ORDER BY d.updated_at DESC, d.rowid DESC LIMIT 300`).all(u.studentId) as any[];
  else if (u.role === 'parent' && u.childIds.length) rows = db.prepare(`${base} WHERE d.student_id IN (${u.childIds.map(() => '?').join(',')}) ORDER BY d.updated_at DESC, d.rowid DESC LIMIT 300`).all(...u.childIds) as any[];   // Step 14: read-only (canSeeDoubt stays false for parents, so they cannot write)
  return rows.map((r) => toDoubtDto(findDoubt(r.id)));
}
