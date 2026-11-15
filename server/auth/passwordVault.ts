// =====================================================================================================
// Password vault (Step 19): who may SEE which password
// -----------------------------------------------------------------------------------------------------
// The college asked that passwords can be looked up by the right people:
//   * ADMIN password   -> visible ONLY inside the admin panel (to the admin). Nowhere else.
//   * FACULTY password -> visible in the admin panel, and in that faculty member's own panel.
//   * STUDENT password -> visible in the faculty panel and in the admin panel (not shown to other students).
//   * PARENT password  -> same as the student it belongs to (faculty + admin).
//
// How it is kept safe:
//   * Login still checks the scrypt HASH (password_hash). The readable copy is a separate column
//     (users.pw_view_enc), ENCRYPTED with AES-256-GCM (key: DATA_KEY or data/.secret, see db/crypto.ts).
//     Someone who copies only portal.db cannot read any password without that key.
//   * Every time a password is shown, one line is written to the audit log (who looked at whose password).
//   * Passwords set BEFORE this feature existed were stored only as a hash, so they cannot be shown:
//     the screen says "not available" and offers "Reset" (a new temporary password, which is then visible).
// =====================================================================================================
import { db } from '../db/connection';
import { encrypt, decrypt } from '../db/crypto';
import type { SessionUser } from './session';
import { audit } from './service';

/** Keep an encrypted, readable copy of a password. Called everywhere a password is set or changed. */
export function rememberPassword(userId: string, plain: string) {
  db.prepare('UPDATE users SET pw_view_enc=? WHERE id=?').run(encrypt(plain), userId);
}

/** The readable password of a user row, or null when it is not available (set before Step 19, or never set). */
export function readPassword(u: { password_hash?: string | null; pw_view_enc?: string | null }): string | null {
  if (!u?.password_hash || !u.pw_view_enc) return null;
  try { return decrypt(u.pw_view_enc); } catch { return null; }
}

/** The visibility rules above, in one function. */
export function canViewPassword(viewer: SessionUser, target: { id: string; role: string }): boolean {
  if (target.role === 'admin') return viewer.role === 'admin';                                   // admin panel only
  if (target.role === 'faculty') return viewer.role === 'admin';                                 // admin panel only (never shown to any teacher)
  if (target.role === 'student' || target.role === 'parent') return viewer.role === 'admin' || viewer.role === 'faculty';
  return false;
}

/** Password of one user for this viewer (null if not allowed or not available). Writes an audit line when shown. */
export function passwordFor(viewer: SessionUser, userId: string): { username: string; password: string | null; allowed: boolean } | null {
  const u = db.prepare('SELECT id, username, role, password_hash, pw_view_enc FROM users WHERE id=?').get(userId) as any;
  if (!u) return null;
  if (!canViewPassword(viewer, u)) return { username: u.username, password: null, allowed: false };
  const pw = readPassword(u);
  if (pw) audit(viewer.username, 'password_viewed', 'user', u.id, u.username);
  return { username: u.username, password: pw, allowed: true };
}

/** Admin panel: every staff login (admin + faculty) with its password. Admin only. */
export function staffLogins(viewer: SessionUser) {
  if (viewer.role !== 'admin') return [];
  const rows = db.prepare("SELECT id, username, role, name, department, designation, password_hash, pw_view_enc, must_change_password, last_login_at, is_active FROM users WHERE role IN ('admin','faculty') ORDER BY role, name").all() as any[];
  audit(viewer.username, 'password_viewed', 'logins', 'staff', `${rows.length} staff logins listed`);
  return rows.map((u) => ({
    userId: u.id, username: u.username, role: u.role, name: u.name, department: u.department, designation: u.designation,
    password: readPassword(u), status: !u.password_hash ? 'not_issued' : u.must_change_password ? 'temporary' : 'changed',
    lastLoginAt: u.last_login_at, active: !!u.is_active,
  }));
}
