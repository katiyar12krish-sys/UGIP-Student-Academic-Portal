// ===================================================================================================
// Logins list for staff (Step 12).
// Builds the class-wise "Logins & Passwords" table: who has a login, whether they still use the temporary
// password, and the parent logins linked to each student. Step 19: the current password is shown too
// (admin + faculty may see student / parent passwords; rules in auth/passwordVault.ts).
// ===================================================================================================
import { db } from '../db/connection';
import { decrypt } from '../db/crypto';
import { audit, createParent, issueTempPassword } from './service';
import { readPassword } from './passwordVault';   // Step 19

/**
 * Step 12: "Logins" - who has which login, and the one-time temporary password until the person sets their own.
 *
 * Privacy rules (enforced here and in routes/logins.ts):
 *  - Only admin / faculty can list logins. A student or parent can only read their OWN login ID (GET /me/login-info).
 *  - A password is readable ONLY while it is still the temporary one handed out by staff (status "temporary").
 *    The moment the student / parent sets their own password the readable copy is erased (see service.ts) and
 *    nobody - not even admin - can see it any more; it can only be reset.
 *  - Every time a list that contains temporary passwords is opened, one line goes to the audit log.
 */
export type PwStatus = 'not_issued' | 'temporary' | 'changed';

// Status of.
const statusOf = (u: any): PwStatus => (!u.password_hash ? 'not_issued' : u.must_change_password ? 'temporary' : 'changed');
// Step 19: the readable password (temporary OR the one the person chose). Falls back to the old temporary copy.
const tempOf = (u: any): string | null => {
  const now = readPassword(u);
  if (now) return now;
  if (statusOf(u) !== 'temporary' || !u.temp_pw_enc) return null;
  try { return decrypt(u.temp_pw_enc); } catch { return null; }
};

// Data shape: login row.
export interface LoginRow {
  studentId: string; name: string; rollNo: string; branch: string; year: number; semester: number;
  fatherName: string | null; motherName: string | null;
  student: { userId: string; username: string; status: PwStatus; tempPassword: string | null; lastLoginAt: string | null; active: boolean };
  parents: { userId: string; username: string; name: string; relation: string | null; status: PwStatus; tempPassword: string | null; lastLoginAt: string | null }[];
}

// List logins.
export function listLogins(f: { branch?: string; year?: number; q?: string; realOnly?: boolean }, actor: string): LoginRow[] {
  let sql = `SELECT s.id, s.name, s.roll_no, s.branch, s.year, s.semester, s.father, s.mother FROM students s WHERE s.deleted_at IS NULL${f.realOnly ? ' AND s.is_demo=0' : ''}`;
  const p: any[] = [];
  if (f.branch) { sql += ' AND s.branch=?'; p.push(String(f.branch).slice(0, 20)); }
  if (f.year) { sql += ' AND s.year=?'; p.push(Number(f.year)); }
  if (f.q) { sql += ' AND (s.name LIKE ? OR s.roll_no LIKE ?)'; p.push(`%${String(f.q).slice(0, 50)}%`, `%${String(f.q).slice(0, 50)}%`); }
  const studs = db.prepare(sql + ' ORDER BY s.roll_no').all(...p) as any[];
  let shown = 0;
  const out = studs.map((s): LoginRow => {
    const su = (db.prepare("SELECT * FROM users WHERE student_id=? AND role='student'").get(s.id) as any) || {};
    const parents = (db.prepare(`SELECT u.*, l.relation FROM parent_student_links l JOIN users u ON u.id=l.parent_user_id
      WHERE l.student_id=? AND u.is_active=1 ORDER BY u.username`).all(s.id) as any[]);
    const stu = { userId: su.id ?? s.id, username: su.username ?? s.roll_no, status: statusOf(su), tempPassword: tempOf(su), lastLoginAt: su.last_login_at ?? null, active: su.is_active !== 0 };
    if (stu.tempPassword) shown++;
    return {
      studentId: s.id, name: s.name, rollNo: s.roll_no, branch: s.branch, year: s.year, semester: s.semester, fatherName: s.father, motherName: s.mother,
      student: stu,
      parents: parents.map((u) => { const t = tempOf(u); if (t) shown++; return { userId: u.id, username: u.username, name: u.name, relation: u.relation, status: statusOf(u), tempPassword: t, lastLoginAt: u.last_login_at ?? null }; }),
    };
  });
  if (shown) audit(actor, 'view_temp_passwords', 'logins', `${f.branch || 'all'}-${f.year || 'all'}`, `${shown} temporary passwords shown`);
  return out;
}

/** Parent login made from what the student's record already says (father / mother name). One tap, no typing. */
export function createParentFromRecord(studentId: string, relationIn: string | undefined, actor: string) {
  const s = db.prepare('SELECT father, mother FROM students WHERE id=? AND deleted_at IS NULL').get(studentId) as any;
  if (!s) return { error: 'Student not found', status: 404 as const };
  const rel = ['Father', 'Mother', 'Guardian'].includes(String(relationIn)) ? String(relationIn) : (s.father ? 'Father' : s.mother ? 'Mother' : 'Guardian');
  const name = (rel === 'Father' ? s.father : rel === 'Mother' ? s.mother : s.father || s.mother) || 'Parent / Guardian';
  const taken = db.prepare('SELECT 1 FROM parent_student_links WHERE student_id=? AND relation=?').get(studentId, rel);
  if (taken) return { error: `A ${rel.toLowerCase()} login already exists for this student`, status: 409 as const };
  return createParent(studentId, { name, relation: rel }, actor);
}

/** Whole class in one go. Never touches anybody who has already chosen their own password. */
export function bulkIssue(f: { branch?: string; year?: number; realOnly?: boolean }, opts: { students: boolean; parents: boolean }, actor: string) {
  const rows = listLoginsQuiet(f);
  let studentsIssued = 0, parentsCreated = 0, alreadyDone = 0;
  for (const r of rows) {
    if (opts.students) {
      if (r.student.status === 'not_issued' && r.student.active) { issueTempPassword(r.student.userId, actor); studentsIssued++; }
      else alreadyDone++;
    }
    if (opts.parents && r.parents.length === 0) {
      const x = createParentFromRecord(r.studentId, undefined, actor);
      if (!('error' in x)) parentsCreated++;
    }
  }
  audit(actor, 'bulk_logins', 'logins', `${f.branch || 'all'}-${f.year || 'all'}`, `students=${studentsIssued} parents=${parentsCreated}`);
  return { studentsIssued, parentsCreated, alreadyHadLogin: alreadyDone };
}

// List logins quiet.
function listLoginsQuiet(f: { branch?: string; year?: number; realOnly?: boolean }) {
  // same rows, but without the "passwords shown" audit line (nothing is shown to the person who triggers a bulk issue)
  let sql = 'SELECT s.id FROM students s WHERE s.deleted_at IS NULL' + (f.realOnly ? ' AND s.is_demo=0' : '');
  const p: any[] = [];
  if (f.branch) { sql += ' AND s.branch=?'; p.push(String(f.branch).slice(0, 20)); }
  if (f.year) { sql += ' AND s.year=?'; p.push(Number(f.year)); }
  const ids = (db.prepare(sql + ' ORDER BY s.roll_no').all(...p) as any[]).map((r) => r.id);
  return ids.map((id) => {
    const su = (db.prepare("SELECT * FROM users WHERE student_id=? AND role='student'").get(id) as any) || {};
    const parents = db.prepare('SELECT 1 FROM parent_student_links l JOIN users u ON u.id=l.parent_user_id WHERE l.student_id=? AND u.is_active=1').all(id);
    return { studentId: id, student: { userId: su.id ?? id, status: statusOf(su), active: su.is_active !== 0 }, parents };
  });
}

/** What a student / parent may know about their OWN login. Never a password. */
export function ownLoginInfo(u: { id: string; role: string; username: string; name: string; studentId: string | null; childIds: string[] }) {
  if (u.role === 'student' && u.studentId) {
    const s = db.prepare('SELECT name, roll_no, branch, year, semester FROM students WHERE id=?').get(u.studentId) as any;
    const parents = db.prepare(`SELECT u.username, l.relation, u.must_change_password AS pending, u.password_hash IS NOT NULL AS hasPw FROM parent_student_links l JOIN users u ON u.id=l.parent_user_id
      WHERE l.student_id=? AND u.is_active=1 ORDER BY u.username`).all(u.studentId) as any[];
    return { role: 'student', username: u.username, name: s?.name ?? u.name, rollNo: s?.roll_no, branch: s?.branch, year: s?.year, semester: s?.semester,
      parents: parents.map((p) => ({ username: p.username, relation: p.relation, state: !p.hasPw ? 'not_issued' : p.pending ? 'not_used_yet' : 'active' })) };
  }
  if (u.role === 'parent') {
    const kids = u.childIds.map((id) => db.prepare('SELECT name, roll_no, branch, year FROM students WHERE id=? AND deleted_at IS NULL').get(id) as any).filter(Boolean);
    return { role: 'parent', username: u.username, name: u.name, children: kids.map((k) => ({ name: k.name, rollNo: k.roll_no, branch: k.branch, year: k.year })) };
  }
  return { role: u.role, username: u.username, name: u.name };
}
