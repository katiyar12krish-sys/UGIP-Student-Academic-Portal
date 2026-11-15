// ===================================================================================================
// Two-step login with an authenticator app (TOTP).
// Start / confirm / disable enrolment, check a 6-digit code at sign-in, one-time recovery codes.
// Roles listed in MFA_REQUIRED_ROLES (.env) must set it up.
// ===================================================================================================
import crypto from 'crypto';
import { db } from '../db/connection';
import { encrypt, decrypt, sha256 } from '../db/crypto';
import { generateSecret, verifyTotp, otpauthUrl } from './totp';
import { createSession, destroyAllSessions } from './session';
import { hit, reset } from './rateLimit';
import { audit } from './service';
import { verifyPassword } from './password';
import { mfaRequiredFor } from './policy';

const CHALLENGE_MS = 5 * 60_000;
const MAX_CHALLENGE_TRIES = 5;

export { mfaRequiredFor };

// Row.
const row = (userId: string) => db.prepare('SELECT * FROM user_mfa WHERE user_id=?').get(userId) as any;
// true / false: is mfa enabled?
export const isMfaEnabled = (userId: string) => !!row(userId)?.enabled;

// ---------- recovery codes ----------
const RC_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
// Rc hash.
const rcHash = (userId: string, code: string) => sha256(`${userId}:${code.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
// New recovery codes.
function newRecoveryCodes(userId: string): string[] {
  // Pick.
  const pick = () => Array.from({ length: 5 }, () => RC_ALPHABET[crypto.randomInt(RC_ALPHABET.length)]).join('');
  const codes = Array.from({ length: 8 }, () => `${pick()}-${pick()}`);   // 50 bits each
  db.prepare('DELETE FROM mfa_recovery_codes WHERE user_id=?').run(userId);
  for (const c of codes) db.prepare('INSERT INTO mfa_recovery_codes (user_id,code_hash) VALUES (?,?)').run(userId, rcHash(userId, c));
  return codes;
}
// Recovery codes left.
export const recoveryCodesLeft = (userId: string) =>
  (db.prepare('SELECT COUNT(*) c FROM mfa_recovery_codes WHERE user_id=? AND used_at IS NULL').get(userId) as any).c as number;

// Use recovery code.
function useRecoveryCode(userId: string, code: string): boolean {
  const r = db.prepare('UPDATE mfa_recovery_codes SET used_at=? WHERE user_id=? AND code_hash=? AND used_at IS NULL').run(Date.now(), userId, rcHash(userId, code));
  return Number(r.changes) === 1;
}

/** Checks a 6-digit app code (each code works once) or, failing that, a recovery code. */
function checkSecondFactor(userId: string, input: string): 'totp' | 'recovery' | null {
  const m = row(userId);
  if (!m?.enabled) return null;
  const step = verifyTotp(decrypt(m.secret_enc), input);
  if (step !== null && step > m.last_step) {
    const r = db.prepare('UPDATE user_mfa SET last_step=? WHERE user_id=? AND last_step<?').run(step, userId, step);
    if (Number(r.changes) === 1) return 'totp';
  }
  if (/[a-z]/i.test(input) && useRecoveryCode(userId, input)) return 'recovery';
  return null;
}

// ---------- enrolment ----------
export async function startEnrollment(user: { id: string; username: string }) {
  const m = row(user.id);
  if (m?.enabled) return { error: 'Two-step verification is already on. Turn it off first to set it up again.', status: 409 as const };
  const secret = generateSecret();
  db.prepare('INSERT INTO user_mfa (user_id,secret_enc,enabled,last_step,created_at) VALUES (?,?,0,0,?) ON CONFLICT(user_id) DO UPDATE SET secret_enc=excluded.secret_enc, enabled=0, last_step=0, created_at=excluded.created_at')
    .run(user.id, encrypt(secret), Date.now());
  const url = otpauthUrl(secret, user.username);
  const QRCode = (await import('qrcode')).default;     // loaded on demand
  return { secret, otpauthUrl: url, qrDataUrl: await QRCode.toDataURL(url, { margin: 1, width: 220 }) };
}

// Confirm enrollment.
export function confirmEnrollment(user: { id: string; username: string }, code: string) {
  const l = hit(`mfa-enroll:${user.id}`, 10, 15 * 60_000);
  if (!l.allowed) return { error: 'Too many attempts. Try again later.', status: 429 as const };
  const m = row(user.id);
  if (!m || m.enabled) return { error: 'Start the setup first.', status: 400 as const };
  const step = verifyTotp(decrypt(m.secret_enc), code);
  if (step === null) return { error: 'That code is not correct. Check the time on your phone and try the next code.', status: 400 as const };
  let codes: string[] = [];
  db.exec('BEGIN');
  try {
    db.prepare('UPDATE user_mfa SET enabled=1, last_step=?, enabled_at=? WHERE user_id=?').run(step, Date.now(), user.id);
    codes = newRecoveryCodes(user.id);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  audit(user.username, 'mfa_enabled', 'user', user.id);
  return { recoveryCodes: codes };
}

/** Needs the password AND a current code, so a stolen open session cannot switch it off. Not allowed for roles that must have it. */
export function disableMfa(user: { id: string; username: string; role: string }, password: string, code: string) {
  if (mfaRequiredFor(user.role)) return { error: 'Your role must keep two-step verification on. Ask the administrator if you changed phone.', status: 403 as const };
  const l = hit(`mfa-off:${user.id}`, 10, 15 * 60_000);
  if (!l.allowed) return { error: 'Too many attempts. Try again later.', status: 429 as const };
  const u = db.prepare('SELECT password_hash FROM users WHERE id=?').get(user.id) as any;
  if (!verifyPassword(String(password || ''), u?.password_hash)) return { error: 'Password is incorrect', status: 400 as const };
  if (!checkSecondFactor(user.id, String(code || ''))) return { error: 'Code is incorrect', status: 400 as const };
  db.prepare('DELETE FROM user_mfa WHERE user_id=?').run(user.id);
  db.prepare('DELETE FROM mfa_recovery_codes WHERE user_id=?').run(user.id);
  audit(user.username, 'mfa_disabled', 'user', user.id);
  return { ok: true as const };
}

// Regenerate recovery codes.
export function regenerateRecoveryCodes(user: { id: string; username: string }, password: string, code: string) {
  const l = hit(`mfa-rc:${user.id}`, 10, 15 * 60_000);
  if (!l.allowed) return { error: 'Too many attempts. Try again later.', status: 429 as const };
  const u = db.prepare('SELECT password_hash FROM users WHERE id=?').get(user.id) as any;
  if (!verifyPassword(String(password || ''), u?.password_hash)) return { error: 'Password is incorrect', status: 400 as const };
  const how = checkSecondFactor(user.id, String(code || ''));
  if (how !== 'totp') return { error: 'Enter the 6-digit code from your authenticator app', status: 400 as const };
  audit(user.username, 'mfa_recovery_regenerated', 'user', user.id);
  return { recoveryCodes: newRecoveryCodes(user.id) };
}

/** Admin: lost phone and lost recovery codes. Removes MFA, ends all sessions; required roles re-enrol at next login. */
export function adminResetMfa(targetId: string, actor: string): boolean {
  const u = db.prepare('SELECT id FROM users WHERE id=?').get(targetId);
  if (!u) return false;
  db.prepare('DELETE FROM user_mfa WHERE user_id=?').run(targetId);
  db.prepare('DELETE FROM mfa_recovery_codes WHERE user_id=?').run(targetId);
  db.prepare('DELETE FROM mfa_challenges WHERE user_id=?').run(targetId);
  destroyAllSessions(targetId);
  audit(actor, 'mfa_reset', 'user', targetId);
  return true;
}

// ---------- login second step ----------
export function createChallenge(userId: string, ip?: string, ua?: string, subjectScope?: string | null): string {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = Date.now();
  db.prepare('DELETE FROM mfa_challenges WHERE expires_at<? OR user_id=?').run(now, userId);
  db.prepare('INSERT INTO mfa_challenges (id_hash,user_id,created_at,expires_at,ip,user_agent,subject_scope) VALUES (?,?,?,?,?,?,?)')
    .run(sha256(token), userId, now, now + CHALLENGE_MS, ip ?? null, (ua ?? '').slice(0, 200), subjectScope ?? null);
  return token;
}

// Data shape: mfa login result.
export type MfaLoginResult =
  | { ok: true; userId: string; token: string; expiresAt: number }
  | { ok: false; status: number; error: string };

// Complete mfa login.
export function completeMfaLogin(challenge: string, code: string, opts: { ip?: string; ua?: string } = {}): MfaLoginResult {
  const bad = { ok: false as const, status: 401, error: 'Code is incorrect or the sign-in expired. Start again.' };
  if (!challenge || challenge.length > 100) return bad;
  const hash = sha256(challenge);
  const c = db.prepare('SELECT * FROM mfa_challenges WHERE id_hash=?').get(hash) as any;
  if (!c || Date.now() > c.expires_at) { if (c) db.prepare('DELETE FROM mfa_challenges WHERE id_hash=?').run(hash); return bad; }
  const l = hit(`mfa:user:${c.user_id}`, 10, 15 * 60_000);
  if (!l.allowed) return { ok: false, status: 429, error: 'Too many attempts. Please try again later.' };
  const u = db.prepare('SELECT * FROM users WHERE id=? AND is_active=1').get(c.user_id) as any;
  const how = u ? checkSecondFactor(c.user_id, String(code || '').slice(0, 32)) : null;
  if (!how) {
    const attempts = c.attempts + 1;
    if (attempts >= MAX_CHALLENGE_TRIES) db.prepare('DELETE FROM mfa_challenges WHERE id_hash=?').run(hash);   // must enter the password again
    else db.prepare('UPDATE mfa_challenges SET attempts=? WHERE id_hash=?').run(attempts, hash);
    audit(u?.username ?? 'unknown', 'mfa_failed', 'user', c.user_id, `ip=${opts.ip}`);
    return bad;
  }
  db.prepare('DELETE FROM mfa_challenges WHERE id_hash=?').run(hash);
  reset(`mfa:user:${c.user_id}`);
  db.prepare('UPDATE users SET failed_attempts=0, locked_until=NULL, last_login_at=CURRENT_TIMESTAMP WHERE id=?').run(c.user_id);
  const s = createSession(c.user_id, opts.ip, opts.ua, c.subject_scope);
  audit(u.username, how === 'recovery' ? 'login_mfa_recovery' : 'login', 'user', u.id, `ip=${opts.ip}`);
  return { ok: true, userId: c.user_id, token: s.token, expiresAt: s.expiresAt };
}
