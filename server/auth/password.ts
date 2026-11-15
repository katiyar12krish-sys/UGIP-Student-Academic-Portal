// ===================================================================================================
// Password hashing and password rules.
// scrypt hashes (built into Node), constant-time comparison, strength rules, and temporary passwords.
// ===================================================================================================
import crypto from 'crypto';

// scrypt (built into Node, no extra dependency). Format: scrypt$N$r$p$salt$hash
const N = 16384, R = 8, P = 1, KEYLEN = 64;

// true / false: hash password?
export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(plain, salt, KEYLEN, { N, r: R, p: P });
  return ['scrypt', N, R, P, salt.toString('base64'), h.toString('base64')].join('$');
}

// Verify password.
export function verifyPassword(plain: string, stored: string | null | undefined): boolean {
  // Always do the same amount of work, so response time doesn't reveal whether the user exists.
  const parts = (stored || '').split('$');
  const ok = parts.length === 6 && parts[0] === 'scrypt';
  const salt = Buffer.from(ok ? parts[4] : 'AAAAAAAAAAAAAAAAAAAAAA==', 'base64');
  const want = Buffer.from(ok ? parts[5] : Buffer.alloc(KEYLEN).toString('base64'), 'base64');
  const n = ok ? Number(parts[1]) : N, r = ok ? Number(parts[2]) : R, p = ok ? Number(parts[3]) : P;
  const got = crypto.scryptSync(plain, salt, want.length, { N: n, r, p });
  return crypto.timingSafeEqual(got, want) && ok;
}

// Validate password strength.
export function validatePasswordStrength(pw: string): string | null {
  if (typeof pw !== 'string' || pw.length < 8) return 'Password must be at least 8 characters';
  if (pw.length > 128) return 'Password too long';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Password must contain letters and digits';
  if (/^(password|admin|faculty|student)[@_]?\d*$/i.test(pw)) return 'Password is too easy to guess';
  return null;
}

// Readable temporary password (no 0/O/1/l confusion), e.g. "k7Hq-93Fm-Tz4p"
export function generateTempPassword(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  // Pick.
  const pick = () => alphabet[crypto.randomInt(alphabet.length)];
  // Chunk.
  const chunk = () => Array.from({ length: 4 }, pick).join('');
  return `${chunk()}-${chunk()}-${chunk()}`;
}
