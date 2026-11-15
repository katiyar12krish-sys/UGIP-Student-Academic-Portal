// ===================================================================================================
// Login and account service.
// Username + password login with lockout and rate limits, creating the first staff accounts from
// seed-staff.json, keeping a login row for every student, issuing temporary passwords, and the audit log helper.
// ===================================================================================================
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, DATA_DIR } from '../db/connection';
import { hashPassword, verifyPassword, generateTempPassword, validatePasswordStrength } from './password';
import { createSession, toSessionUser, destroyAllSessions, type SessionUser } from './session';
import { hit, reset } from './rateLimit';
import { isMfaEnabled, createChallenge } from './mfa';
import { encrypt } from '../db/crypto';
import { rememberPassword } from './passwordVault';   // Step 19: readable (encrypted) password copy

const MAX_FAILS = 5;
const LOCK_MS = 15 * 60_000;
const GENERIC = 'Invalid username or password';

// Data shape: login result.
export type LoginResult =
  | { ok: true; user: SessionUser; token: string; expiresAt: number; mfaRequired?: undefined; challenge?: undefined }   // success: session cookie is issued
  | { ok: false; status: number; error: string; retryAfterSec?: number; mfaRequired?: undefined; challenge?: undefined }
  // password was right but the person has an authenticator app: no session yet, the 6-digit code is the second step
  | { ok: false; status: 200; error: ''; mfaRequired: true; challenge: string; retryAfterSec?: undefined };

// Audit.
export function audit(actor: string, action: string, entity: string, entityId: string | null, detail?: string) {
  db.prepare('INSERT INTO audit_logs (actor,action,entity,entity_id,detail) VALUES (?,?,?,?,?)').run(actor, action, entity, entityId, detail ?? null);
}

/**
 * Subject-wise faculty login: the teacher picks one of the subjects the admin assigned to them and types their
 * password; no username. The teacher of that subject whose password matches is signed in, and the session then
 * works ONLY for that subject (sessions.subject_scope). Returns the username to continue with, or an error.
 */
function facultyForSubject(subjectId: string, pw: string): { username: string } | { error: LoginResult } {
  const sid = String(subjectId || '').slice(0, 64);
  const teachers = db.prepare(`SELECT u.* FROM users u JOIN faculty_subject_assignments a ON a.user_id=u.id
    WHERE a.subject_id=? AND u.role='faculty' AND u.is_active=1`).all(sid) as any[];
  if (!teachers.length) return { error: { ok: false, status: 401, error: 'No teacher is assigned to this subject yet. Please ask the admin.' } };
  const match = teachers.find((t) => verifyPassword(pw, t.password_hash));
  // wrong password: count the failed try on the teacher of this subject (one teacher per subject is the normal case)
  return { username: (match || teachers[0]).username };
}

// Login.
export function login(username: string, password: string, opts: { ip?: string; ua?: string; role?: string; subjectId?: string } = {}): LoginResult {
  const pw = String(password || '').slice(0, 256);
  if (opts.role === 'faculty') {
    // teachers sign in by subject only (Faculty Login box)
    if (!opts.subjectId || !pw) return { ok: false, status: 400, error: 'Choose your subject and enter your password' };
    const f = facultyForSubject(opts.subjectId, pw);
    if ('error' in f) return f.error;
    username = f.username;
  }
  const uname = String(username || '').trim().slice(0, 64);
  if (!uname || !pw) return { ok: false, status: 400, error: 'Username and password are required' };
  const scope = opts.role === 'faculty' ? String(opts.subjectId) : null;

  const ipLimit = hit(`login:ip:${opts.ip}`, 30, 10 * 60_000);
  const userLimit = hit(`login:user:${uname.toLowerCase()}`, 10, 15 * 60_000);
  if (!ipLimit.allowed || !userLimit.allowed) {
    return { ok: false, status: 429, error: 'Too many attempts. Please try again later.', retryAfterSec: Math.max(ipLimit.retryAfterSec, userLimit.retryAfterSec) };
  }

  const u = db.prepare('SELECT * FROM users WHERE username=?').get(uname) as any;
  const now = Date.now();
  if (u?.locked_until && u.locked_until > now) {
    verifyPassword(pw, null); // keep timing similar
    return { ok: false, status: 429, error: 'Account temporarily locked. Try again later.', retryAfterSec: Math.ceil((u.locked_until - now) / 1000) };
  }

  const good = verifyPassword(pw, u?.password_hash);
  const roleOk = !opts.role || u?.role === opts.role;
  if (!u || !u.is_active || !good || !roleOk) {
    if (u && u.is_active) {
      const fails = (u.failed_attempts || 0) + 1;
      if (fails >= MAX_FAILS) {
        db.prepare('UPDATE users SET failed_attempts=0, locked_until=? WHERE id=?').run(now + LOCK_MS, u.id);
        audit('system', 'account_locked', 'user', u.id, `ip=${opts.ip}`);
      } else db.prepare('UPDATE users SET failed_attempts=? WHERE id=?').run(fails, u.id);
    }
    audit(uname, 'login_failed', 'user', u?.id ?? null, `ip=${opts.ip}`);
    return { ok: false, status: 401, error: GENERIC };
  }

  reset(`login:user:${uname.toLowerCase()}`);
  if (isMfaEnabled(u.id)) {
    audit(u.username, 'login_password_ok_mfa_pending', 'user', u.id, `ip=${opts.ip}`);
    return { ok: false, status: 200, error: '', mfaRequired: true, challenge: createChallenge(u.id, opts.ip, opts.ua, scope) };
  }
  db.prepare('UPDATE users SET failed_attempts=0, locked_until=NULL, last_login_at=CURRENT_TIMESTAMP WHERE id=?').run(u.id);
  const s = createSession(u.id, opts.ip, opts.ua, scope);
  audit(u.username, 'login', 'user', u.id, `ip=${opts.ip}${scope ? ` subject=${scope}` : ''}`);
  return { ok: true, user: toSessionUser({ ...u }, scope), token: s.token, expiresAt: s.expiresAt };
}

// Change own password.
export function changeOwnPassword(userId: string, current: string, next: string, keepSessionHash?: string): string | null {
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(userId) as any;
  if (!u || !verifyPassword(String(current || ''), u.password_hash)) return 'Current password is incorrect';
  const weak = validatePasswordStrength(next);
  if (weak) return weak;
  if (next === current) return 'New password must be different';
  db.prepare('UPDATE users SET password_hash=?, must_change_password=0, temp_pw_enc=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(hashPassword(next), userId);
  rememberPassword(userId, next);   // Step 19: encrypted readable copy (visible only as allowed in passwordVault.ts)
  destroyAllSessions(userId, keepSessionHash); // log out other devices
  audit(u.username, 'password_changed', 'user', userId);
  return null;
}

/** Admin action: sets a fresh temporary password (shown once) and forces change at next login. */
export function issueTempPassword(userId: string, actor: string): { username: string; tempPassword: string } | null {
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(userId) as any;
  if (!u) return null;
  const tempPassword = generateTempPassword();
  // Student / parent temporary passwords are also kept ENCRYPTED until the person sets their own, so the class faculty / admin can hand the login out
  // (print slip) without issuing it twice. Staff passwords are never kept. The copy is erased at the first password change.
  const keep = u.role === 'student' || u.role === 'parent' ? encrypt(tempPassword) : null;
  db.prepare('UPDATE users SET password_hash=?, must_change_password=1, failed_attempts=0, locked_until=NULL, temp_pw_enc=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(hashPassword(tempPassword), keep, userId);
  rememberPassword(userId, tempPassword);   // Step 19
  destroyAllSessions(userId);
  audit(actor, 'credentials_issued', 'user', userId);
  return { username: u.username, tempPassword };
}

/** Every student gets a login row (username = roll number). No password until the admin issues one. */
export function ensureStudentUser(studentId: string) {
  const s = db.prepare('SELECT id, roll_no, name, phone FROM students WHERE id=?').get(studentId) as any;
  if (!s) return;
  const ex = db.prepare('SELECT 1 FROM users WHERE student_id=?').get(studentId);
  if (ex) {
    db.prepare('UPDATE users SET username=?, name=?, phone=? WHERE student_id=?').run(s.roll_no, s.name, s.phone, studentId);
    return;
  }
  db.prepare('INSERT INTO users (id,username,role,name,phone,student_id) VALUES (?,?,?,?,?,?)').run(s.id, s.roll_no, 'student', s.name, s.phone, s.id);
}

// Sync student users.
export function syncStudentUsers() {
  const rows = db.prepare('SELECT id FROM students WHERE deleted_at IS NULL').all() as any[];
  rows.forEach((r) => ensureStudentUser(r.id));
  // soft-deleted students can no longer log in
  db.exec("UPDATE users SET is_active=0 WHERE role='student' AND student_id IN (SELECT id FROM students WHERE deleted_at IS NOT NULL)");
}

/** First run: create admin + faculty from seed-staff.json. Writes temp passwords to data/initial-credentials.txt (once). */
export function seedStaffIfEmpty() {
  const { c } = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role IN ('admin','faculty')").get() as { c: number };
  if (c > 0) return;
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '../db/seed-staff.json');
  const staff: any[] = JSON.parse(fs.readFileSync(file, 'utf8'));
  const lines: string[] = ['UGIP portal - initial credentials (delete this file after handing them out)', ''];
  for (const s of staff) {
    // DEV_STAFF_PASSWORD: one known password for all faculty, for local testing only (ignored when NODE_ENV=production)
    const devPw = process.env.NODE_ENV !== 'production' ? process.env.DEV_STAFF_PASSWORD : undefined;
    const fromEnv = s.role === 'admin' ? process.env.ADMIN_PASSWORD : devPw;
    if (fromEnv) {
      const weak = validatePasswordStrength(fromEnv);
      if (weak) throw new Error(`ADMIN_PASSWORD rejected: ${weak}`);
    }
    const pw = fromEnv || generateTempPassword();
    db.prepare('INSERT INTO users (id,username,role,name,email,phone,department,designation,password_hash,must_change_password) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(s.id, s.username, s.role, s.name, s.email ?? null, s.phone ?? null, s.department ?? null, s.designation ?? null, hashPassword(pw), fromEnv ? 0 : 1);
    rememberPassword(s.id, pw);   // Step 19
    for (const sub of s.subjectIds || []) db.prepare('INSERT OR IGNORE INTO faculty_subject_assignments VALUES (?,?)').run(s.id, sub);
    lines.push(`${s.role.padEnd(8)} ${s.username.padEnd(18)} ${fromEnv ? '(password from ADMIN_PASSWORD)' : pw}`);
  }
  const out = path.join(DATA_DIR, 'initial-credentials.txt');
  fs.writeFileSync(out, lines.join('\n') + '\n', { mode: 0o600 });
  console.log(`\n[auth] Created ${staff.length} staff accounts. Temporary passwords: ${out}\n       (they must change them at first login; delete the file afterwards)\n`);
}

/** Create a parent login linked to a student. Username: p<rollNo> (then p<rollNo>_2 for a second parent). Returns the one-time password. */
export function createParent(studentId: string, info: { name: string; phone?: string; relation?: string }, actor: string):
  { id: string; username: string; tempPassword: string } | { error: string; status: number } {
  const st = db.prepare('SELECT id, roll_no, name FROM students WHERE id=? AND deleted_at IS NULL').get(studentId) as any;
  if (!st) return { error: 'Student not found', status: 404 };
  const name = String(info.name || '').trim().slice(0, 100);
  if (!name) return { error: 'Parent name is required', status: 400 };
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM parent_student_links WHERE student_id=?').get(studentId) as { c: number };
  if (c >= 4) return { error: 'A student can have at most 4 parent logins', status: 400 };
  let username = `p${st.roll_no}`;
  for (let n = 2; db.prepare('SELECT 1 FROM users WHERE username=?').get(username); n++) username = `p${st.roll_no}_${n}`;
  const id = `par-${crypto.randomBytes(6).toString('hex')}`;
  db.exec('BEGIN');
  try {
    db.prepare('INSERT INTO users (id,username,role,name,phone) VALUES (?,?,?,?,?)').run(id, username, 'parent', name, info.phone ? String(info.phone).slice(0, 30) : null);
    db.prepare('INSERT INTO parent_student_links (parent_user_id,student_id,relation) VALUES (?,?,?)').run(id, studentId, info.relation ? String(info.relation).slice(0, 30) : null);
    audit(actor, 'parent_created', 'user', id, `student=${studentId}`);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  const t = issueTempPassword(id, actor)!;
  return { id, username, tempPassword: t.tempPassword };
}

// Reset admin password from env.
export function resetAdminPasswordFromEnv() {
  if (process.env.ADMIN_PASSWORD_RESET !== '1') return;
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return console.warn('[auth] ADMIN_PASSWORD_RESET=1 but ADMIN_PASSWORD is empty; nothing changed');
  const weak = validatePasswordStrength(pw);
  if (weak) return console.warn(`[auth] ADMIN_PASSWORD rejected: ${weak}`);
  const r = db.prepare("UPDATE users SET password_hash=?, must_change_password=1, failed_attempts=0, locked_until=NULL, is_active=1 WHERE role='admin'").run(hashPassword(pw));
  for (const a of db.prepare("SELECT id FROM users WHERE role='admin'").all() as any[]) rememberPassword(a.id, pw);   // Step 19
  console.log(`[auth] Admin password reset from ADMIN_PASSWORD (${r.changes} account). Remove ADMIN_PASSWORD_RESET now.`);
}
