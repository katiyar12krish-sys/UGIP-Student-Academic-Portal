// ===================================================================================================
// TOTP code maths (RFC 6238) used by Google / Microsoft Authenticator.
// Base32 secrets, 6-digit codes every 30 seconds, and the otpauth:// link shown as a QR code.
// ===================================================================================================
import crypto from 'crypto';

// RFC 6238 TOTP (SHA-1, 6 digits, 30 s) - what Google Authenticator, Microsoft Authenticator, Authy etc. expect. No extra dependency.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const PERIOD = 30;

// Base32 encode.
export function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = '';
  for (const b of buf) {
    value = (value << 8) | b; bits += 8;
    while (bits >= 5) { out += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

// Base32 decode.
export function base32Decode(s: string): Buffer {
  const clean = s.replace(/=+$/, '').replace(/\s/g, '').toUpperCase();
  let bits = 0, value = 0; const out: number[] = [];
  for (const ch of clean) {
    const i = ALPHABET.indexOf(ch);
    if (i < 0) throw new Error('bad base32');
    value = (value << 5) | i; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

// Generate secret.
export const generateSecret = () => base32Encode(crypto.randomBytes(20)); // 160 bits

// Hotp.
export function hotp(secretB32: string, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', base32Decode(secretB32)).update(msg).digest();
  const o = h[h.length - 1] & 0xf;
  const code = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(code % 1_000_000).padStart(6, '0');
}

export const stepAt = (ms = Date.now()) => Math.floor(ms / 1000 / PERIOD);

/** Returns the matching time-step (accepts one step either side for clock drift), or null. */
export function verifyTotp(secretB32: string, input: string, nowMs = Date.now()): number | null {
  const code = String(input || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(code)) return null;
  const cur = stepAt(nowMs);
  let hit: number | null = null;
  for (const step of [cur - 1, cur, cur + 1]) {            // no early exit: same work whether or not a step matches
    const want = Buffer.from(hotp(secretB32, step));
    if (crypto.timingSafeEqual(want, Buffer.from(code)) && hit === null) hit = step;
  }
  return hit;
}

// Otpauth url.
export function otpauthUrl(secretB32: string, account: string, issuer = 'UGIP'): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${PERIOD}`;
}
