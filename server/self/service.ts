// ===================================================================================================
// Self-service: every person (admin, faculty, student, parent) corrects THEIR OWN details.
// -----------------------------------------------------------------------------------------------------
//   profile        : own contact details only. The id comes from the login, never from the request,
//                    so nobody can change anybody else's record this way.
//                    NOT editable here: roll no, branch, semester, category, 10th / 12th %, marks, results,
//                    record status, department (they are official records changed by staff only).
//   doubts         : the student who asked may correct the title / details while no teacher has answered;
//                    anybody may delete their OWN reply (admin may remove any reply = moderation).
//   class dispatch : a student may withdraw their own submission until the due date, unless it is graded
//                    (re-submitting / editing is submitWork in server/dispatch/service.ts).
// Password change for every role: POST /api/auth/change-password (server/routes/auth.ts).
// ===================================================================================================
import { db } from '../db/connection';
import type { SessionUser } from '../auth/session';
import { canSeeDoubt } from '../comms/service';
import { canSee as canSeeDispatch, closesAt, TASK_TYPE } from '../dispatch/service';
import { removeFile } from '../files/store';

// Data shape: result.
export type Result<T = {}> = ({ ok: true } & T) | { ok: false; status: number; error: string };
// Fail.
const fail = (status: number, error: string) => ({ ok: false as const, status, error });
// Text field: trimmed, cut to max, '' when not a string.
const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

export const GENDERS = ['Male', 'Female', 'Other'] as const;
const PHONE = /^[6-9]\d{9}$/;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Which fields each role may correct on their own profile. */
export const EDITABLE: Record<SessionUser['role'], string[]> = {
  admin: ['name', 'email', 'phone', 'designation'],
  faculty: ['name', 'email', 'phone', 'designation'],
  parent: ['name', 'email', 'phone'],
  student: ['email', 'phone', 'address', 'father', 'mother', 'dob', 'gender'],
};

/** My own profile: what I may change, plus the official (read-only) details for students. */
export function myProfile(u: SessionUser) {
  const row = db.prepare('SELECT id, username, role, name, email, phone, department, designation, student_id FROM users WHERE id=?').get(u.id) as any;
  if (!row) return null;
  const st = row.student_id
    ? (db.prepare('SELECT roll_no, name, branch, year, semester, category, address, father, mother, dob, gender, phone FROM students WHERE id=? AND deleted_at IS NULL').get(row.student_id) as any)
    : null;
  return {
    role: row.role as SessionUser['role'], username: row.username,
    editable: EDITABLE[row.role as SessionUser['role']],
    values: {
      name: st?.name ?? row.name, email: row.email ?? '', phone: (st?.phone || row.phone) ?? '', designation: row.designation ?? '',
      address: st?.address ?? '', father: st?.father ?? '', mother: st?.mother ?? '', dob: st?.dob ?? '', gender: st?.gender ?? '',
    },
    official: st ? { rollNo: st.roll_no, name: st.name, branch: st.branch, year: st.year, semester: st.semester, category: st.category ?? '' } : row.department ? { department: row.department } : {},
  };
}

/**
 * Save my own profile. Only the keys in EDITABLE[role] are read; anything else in the body (roll no, marks,
 * userId, studentId, role ...) is ignored. Returns the names of the fields that changed (for the audit log).
 */
export function updateMyProfile(u: SessionUser, b: any, today = new Date().toISOString().slice(0, 10)): Result<{ changed: string[] }> {
  const allowed = EDITABLE[u.role];
  if (!allowed) return fail(403, 'Not allowed');
  const body = b && typeof b === 'object' ? b : {};
  const has = (k: string) => allowed.includes(k) && body[k] !== undefined;
  const v: Record<string, string | null> = {};

  if (has('name')) { const n = str(body.name, 100); if (n.length < 2) return fail(400, 'Please write your full name'); v.name = n; }
  if (has('email')) { const e = str(body.email, 254).toLowerCase(); if (e && !EMAIL.test(e)) return fail(400, 'Please enter a valid e-mail address'); v.email = e || null; }
  if (has('phone')) { const p = str(body.phone, 20).replace(/[\s-]/g, '').replace(/^\+?91(?=\d{10}$)/, ''); if (p && !PHONE.test(p)) return fail(400, 'Mobile number must be 10 digits starting with 6-9'); v.phone = p || null; }
  if (has('designation')) v.designation = str(body.designation, 100) || null;
  if (has('address')) v.address = str(body.address, 300) || null;
  if (has('father')) v.father = str(body.father, 100) || null;
  if (has('mother')) v.mother = str(body.mother, 100) || null;
  if (has('gender')) { const g = str(body.gender, 10); if (g && !(GENDERS as readonly string[]).includes(g)) return fail(400, 'Choose Male, Female or Other'); v.gender = g || null; }
  if (has('dob')) {
    const d = str(body.dob, 10);
    if (d && (!DATE.test(d) || Number.isNaN(Date.parse(d + 'T00:00:00Z')) || new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) !== d)) return fail(400, 'Enter the date of birth as YYYY-MM-DD');
    if (d && (d > today || d < '1940-01-01')) return fail(400, 'Please check the date of birth');
    v.dob = d || null;
  }
  const keys = Object.keys(v);
  if (!keys.length) return fail(400, 'Nothing to save');

  const userCols = ['name', 'email', 'phone', 'designation'].filter((k) => k in v);
  const studentCols = u.role === 'student' ? ['phone', 'address', 'father', 'mother', 'dob', 'gender'].filter((k) => k in v) : [];
  if (u.role === 'student' && !u.studentId) return fail(403, 'Your login is not linked to a student record');
  db.exec('BEGIN');
  try {
    if (userCols.length) db.prepare(`UPDATE users SET ${userCols.map((c) => `${c}=?`).join(', ')}, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(...userCols.map((c) => v[c]), u.id);
    if (studentCols.length) db.prepare(`UPDATE students SET ${studentCols.map((c) => `${c}=?`).join(', ')}, updated_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL`).run(...studentCols.map((c) => v[c]), u.studentId);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  return { ok: true, changed: keys };
}

// ---------------- doubts ----------------
/** The student who asked may correct the title / details until a teacher has written an answer. */
export function editMyDoubt(u: SessionUser, d: any, b: any, now = Date.now()): Result {
  if (!d || !canSeeDoubt(u, d)) return fail(404, 'Doubt not found');
  if (u.role !== 'student' || d.student_id !== u.studentId) return fail(403, 'Only the student who asked can edit this doubt');
  const staffReplied = !!db.prepare("SELECT 1 FROM doubt_replies WHERE doubt_id=? AND sender_role<>'student' LIMIT 1").get(d.id);
  if (staffReplied || d.status === 'Resolved') return fail(409, 'A teacher has already answered. Write a new reply instead of editing the question.');
  const title = b?.questionTitle === undefined ? d.title : str(b.questionTitle, 200);
  const details = b?.questionDetails === undefined ? d.details : (typeof b.questionDetails === 'string' ? b.questionDetails.trim().slice(0, 2000) : '');
  if (!title || !details) return fail(400, 'Write a title and the details of your doubt');
  db.prepare('UPDATE doubts SET title=?, details=?, updated_at=? WHERE id=?').run(title, details, now, d.id);
  return { ok: true };
}

/** Delete one reply under a doubt: your own reply, or (admin) any reply. */
export function deleteDoubtReply(u: SessionUser, d: any, replyId: unknown): Result {
  if (!d || !canSeeDoubt(u, d)) return fail(404, 'Doubt not found');
  const id = Number(replyId);
  const r = Number.isInteger(id) ? (db.prepare('SELECT * FROM doubt_replies WHERE id=? AND doubt_id=?').get(id, d.id) as any) : undefined;
  if (!r) return fail(404, 'Reply not found');
  if (r.sender_user_id !== u.id && u.role !== 'admin') return fail(403, 'You can delete only your own replies');
  db.prepare('DELETE FROM doubt_replies WHERE id=?').run(id);
  return { ok: true };
}

// ---------------- class dispatch ----------------
/** A student takes back their own submission (before the due date, while not graded). The file is deleted too. */
export function withdrawSubmission(u: SessionUser, d: any, now = Date.now()): Result {
  if (u.role !== 'student' || !u.studentId) return fail(403, 'Only students withdraw their own work');
  if (!d || !canSeeDispatch(u, d)) return fail(404, 'Not found');
  if (d.type !== TASK_TYPE) return fail(400, 'This item does not take submissions');
  const x = db.prepare('SELECT * FROM dispatch_submissions WHERE dispatch_id=? AND student_id=?').get(d.id, u.studentId) as any;
  if (!x) return fail(404, 'You have not submitted this work');
  if (x.marks !== null) return fail(409, 'This work is already graded and can no longer be changed');
  if (now > closesAt(d.due_date)) return fail(403, 'The due date has passed. Submissions are closed.');
  db.prepare('DELETE FROM dispatch_submissions WHERE id=?').run(x.id);
  if (x.file_id) removeFile(x.file_id);
  return { ok: true };
}
