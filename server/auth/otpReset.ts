// ===================================================================================================
// Forgot-password by SMS one-time code.
// Find the account by roll number or mobile number, send a code (when an SMS provider is configured),
// check it with attempt limits, and set the new password.
// ===================================================================================================
import crypto from 'crypto';
import { db } from '../db/connection';
import { sha256 } from '../db/crypto';
import { hashPassword, validatePasswordStrength } from './password';
import { destroyAllSessions } from './session';
import { hit } from './rateLimit';
import { audit } from './service';
import { smsProvider, normalizeIndianMobile, maskPhone } from './sms';
import { rememberPassword } from './passwordVault';   // Step 19

const OTP_MS = 5 * 60_000, MAX_TRIES = 5;
const SAME = { ok: true as const, message: 'If this account has a registered mobile number, a code has been sent to it.' };

/**
 * Finds the account from what the person typed: a roll number / username, OR the registered 10-digit mobile number.
 * A mobile number that belongs to more than one account of the chosen role (e.g. two siblings) matches nobody: the person must use the roll number.
 * Admin accounts are never found here (admin resets are done by hand).
 */
export function findResetUser(identifier: unknown, role?: string): any | null {
  const id = String(identifier || '').trim().slice(0, 64);
  if (!id) return null;
  const mobile = normalizeIndianMobile(id);
  if (mobile) {
    const rows = (db.prepare("SELECT * FROM users WHERE is_active=1 AND role<>'admin' AND phone IS NOT NULL").all() as any[])
      .filter((u) => normalizeIndianMobile(u.phone) === mobile && (!role || u.role === role));
    return rows.length === 1 ? rows[0] : null;
  }
  const u = db.prepare('SELECT * FROM users WHERE username=? AND is_active=1').get(id) as any;
  return u && u.role !== 'admin' && (!role || u.role === role) ? u : null;
}

/** Step 1: always answers the same way, so nobody can use it to find out which usernames exist. */
export async function requestPasswordResetOtp(username: string, role: string | undefined, ip: string) {
  const provider = smsProvider();
  if (!provider) return { ok: false as const, status: 503, error: 'SMS is not switched on yet. Please ask the administrator or your class faculty for a new temporary password.' };
  const uname = String(username || '').trim().slice(0, 64);
  if (!uname) return { ok: false as const, status: 400, error: 'Enter your roll number or registered mobile number' };
  if (!hit(`otp:ip:${ip}`, 10, 15 * 60_000).allowed || !hit(`otp:user:${uname.toLowerCase()}`, 3, 15 * 60_000).allowed)
    return { ok: false as const, status: 429, error: 'Too many requests. Please try again later.' };
  const u = findResetUser(uname, role);
  const phone = normalizeIndianMobile(u?.phone);
  if (!u || !phone) return SAME;     // unknown / ambiguous / admin: same answer, nothing sent
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const id = crypto.randomBytes(8).toString('hex'), now = Date.now();
  db.prepare("DELETE FROM sms_otps WHERE user_id=? AND purpose='reset'").run(u.id);
  db.prepare("INSERT INTO sms_otps (id,user_id,purpose,code_hash,created_at,expires_at) VALUES (?,?,?,?,?,?)").run(id, u.id, 'reset', sha256(`${id}:${code}`), now, now + OTP_MS);
  try { await provider.sendOtp(phone, code); }
  catch (e) { audit('system', 'sms_failed', 'user', u.id, String((e as Error).message).slice(0, 120)); return SAME; }
  audit(u.username, 'otp_sent', 'user', u.id, `to=${maskPhone(phone)}`);
  return SAME;
}

/** Step 2: code + new password. Staff with an authenticator app must still pass it at their next login. */
export function resetPasswordWithOtp(username: string, code: string, newPassword: string, ip: string, role?: string) {
  const bad = { ok: false as const, status: 400, error: 'Code is wrong or expired. Request a new one.' };
  const uname = String(username || '').trim().slice(0, 64);
  if (!hit(`otpv:ip:${ip}`, 20, 15 * 60_000).allowed) return { ok: false as const, status: 429, error: 'Too many attempts. Please try again later.' };
  const u = findResetUser(uname, role);
  if (!u) return bad;
  const o = db.prepare("SELECT * FROM sms_otps WHERE user_id=? AND purpose='reset' AND used_at IS NULL").get(u.id) as any;
  if (!o || Date.now() > o.expires_at || o.attempts >= MAX_TRIES) return bad;
  db.prepare('UPDATE sms_otps SET attempts=attempts+1 WHERE id=?').run(o.id);
  const want = Buffer.from(o.code_hash), got = Buffer.from(sha256(`${o.id}:${String(code || '').trim()}`));
  if (!crypto.timingSafeEqual(want, got)) return bad;
  const weak = validatePasswordStrength(newPassword);
  if (weak) return { ok: false as const, status: 400, error: weak };
  db.prepare('UPDATE sms_otps SET used_at=? WHERE id=?').run(Date.now(), o.id);
  db.prepare('UPDATE users SET password_hash=?, must_change_password=0, temp_pw_enc=NULL, failed_attempts=0, locked_until=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(hashPassword(newPassword), u.id);
  rememberPassword(u.id, newPassword);   // Step 19
  destroyAllSessions(u.id);
  audit(u.username, 'password_reset_otp', 'user', u.id);
  return { ok: true as const };
}
