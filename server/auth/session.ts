// ===================================================================================================
// Sessions (who is signed in).
// Creates a random session token for the cookie (only its hash is stored), loads the signed-in user with
// their role, subjects and children, expires idle / old sessions, and lists what still blocks the user
// (password change, authenticator setup, privacy consent).
// ===================================================================================================
import crypto from 'crypto';
import { db } from '../db/connection';
import { sha256 } from '../db/crypto';
import { NOTICE_VERSION, mfaRequiredFor } from './policy';

export const COOKIE = 'ugip_sid';
const IDLE_MS = 8 * 3600_000;        // logged out after 8h of no activity
const ABSOLUTE_MS = 7 * 86400_000;   // and always after 7 days

// Data shape: session user.
export interface SessionUser {
  id: string; username: string; role: 'admin' | 'faculty' | 'student' | 'parent'; name: string;
  email: string | null; phone: string | null; department: string | null; designation: string | null;
  studentId: string | null; mustChangePassword: boolean; subjectIds: string[];
  subjectScope?: string | null;   // faculty signed in for this one subject (subject-wise login)
  childIds: string[];   // parents: ids of the linked (non-deleted) students
  // Step 3 - each of these blocks every normal request (see requireAuth) until it is dealt with
  mfaEnabled: boolean; mfaSetupRequired: boolean; consentRequired: boolean;
  minor: boolean;       // student not yet confirmed 18+: a parent gives the optional consents
  photoUrl: string | null;
}

// Create session.
export function createSession(userId: string, ip?: string, ua?: string, subjectScope?: string | null): { token: string; expiresAt: number } {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  const expiresAt = now + ABSOLUTE_MS;
  db.prepare('INSERT INTO sessions (id_hash,user_id,created_at,last_seen_at,expires_at,ip,user_agent,subject_scope) VALUES (?,?,?,?,?,?,?,?)')
    .run(sha256(token), userId, now, now, expiresAt, ip ?? null, (ua ?? '').slice(0, 200), subjectScope ?? null);
  return { token, expiresAt };
}

// Loads session from the server.
export function loadSession(token: string | undefined): { user: SessionUser; hash: string } | null {
  if (!token || token.length > 100) return null;
  const hash = sha256(token);
  const s = db.prepare('SELECT * FROM sessions WHERE id_hash=?').get(hash) as any;
  if (!s) return null;
  const now = Date.now();
  if (now > s.expires_at || now - s.last_seen_at > IDLE_MS) { destroySession(hash); return null; }
  const u = db.prepare('SELECT * FROM users WHERE id=? AND is_active=1').get(s.user_id) as any;
  if (!u) { destroySession(hash); return null; }
  if (now - s.last_seen_at > 60_000) db.prepare('UPDATE sessions SET last_seen_at=? WHERE id_hash=?').run(now, hash);
  return { user: toSessionUser(u, s.subject_scope), hash };
}

// Converts to session user.
export function toSessionUser(u: any, subjectScope?: string | null): SessionUser {
  let subjectIds = (db.prepare('SELECT subject_id FROM faculty_subject_assignments WHERE user_id=?').all(u.id) as any[]).map((r) => r.subject_id);
  // subject-wise faculty login: only the subject the teacher signed in for (and only while it is still assigned)
  if (u.role === 'faculty' && subjectScope) subjectIds = subjectIds.filter((id) => id === subjectScope);
  const childIds = u.role === 'parent'
    ? (db.prepare('SELECT l.student_id FROM parent_student_links l JOIN students s ON s.id=l.student_id WHERE l.parent_user_id=? AND s.deleted_at IS NULL').all(u.id) as any[]).map((r) => r.student_id)
    : [];
  const mfaEnabled = !!(db.prepare('SELECT enabled FROM user_mfa WHERE user_id=?').get(u.id) as any)?.enabled;
  const ack = db.prepare("SELECT granted, notice_version FROM consent_records WHERE subject_user_id=? AND purpose='service' ORDER BY id DESC LIMIT 1").get(u.id) as any;
  return {
    id: u.id, username: u.username, role: u.role, name: u.name, email: u.email, phone: u.phone,
    department: u.department, designation: u.designation, studentId: u.student_id,
    mustChangePassword: !!u.must_change_password, subjectIds, childIds, subjectScope: u.role === 'faculty' ? subjectScope ?? null : null,
    mfaEnabled, mfaSetupRequired: mfaRequiredFor(u.role) && !mfaEnabled,
    consentRequired: !(ack && ack.granted && ack.notice_version === NOTICE_VERSION),
    minor: u.role === 'student' && !u.adult_verified,
    photoUrl: u.photo_version ? `/api/photos/${encodeURIComponent(u.id)}?v=${u.photo_version}` : null,
  };
}

// Destroy session.
export const destroySession = (hash: string) => { db.prepare('DELETE FROM sessions WHERE id_hash=?').run(hash); };
// Destroy all sessions.
export const destroyAllSessions = (userId: string, exceptHash?: string) => {
  db.prepare('DELETE FROM sessions WHERE user_id=? AND id_hash<>?').run(userId, exceptHash ?? '');
};
// Purge expired sessions.
export const purgeExpiredSessions = () => { db.prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now()); };

// Parse cookies.
export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  (header || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

// Cookie header.
export function cookieHeader(token: string, expiresAt: number): string {
  const secure = process.env.NODE_ENV === 'production' && process.env.INSECURE_COOKIES !== '1' ? '; Secure' : '';
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${new Date(expiresAt).toUTCString()}${secure}`;
}
// Clear cookie header.
export const clearCookieHeader = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
