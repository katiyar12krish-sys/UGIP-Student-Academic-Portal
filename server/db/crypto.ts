// ===================================================================================================
// Encryption for sensitive values (Aadhaar number, authenticator secrets, temporary passwords).
// AES-256-GCM with a key from DATA_KEY or the auto-created data/.secret file. Losing that key means the
// encrypted values can no longer be read - back it up together with the database.
// ===================================================================================================
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { DATA_DIR } from './connection';

// Key: DATA_KEY env var (64 hex chars) or an auto-generated data/.secret (git-ignored). Back it up: losing it = Aadhaar unreadable.
function loadKey(): Buffer {
  if (process.env.DATA_KEY) return Buffer.from(process.env.DATA_KEY, 'hex');
  const f = path.join(DATA_DIR, '.secret');
  if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  return Buffer.from(fs.readFileSync(f, 'utf8').trim(), 'hex');
}
const KEY = loadKey();

// Encrypt.
export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64');
}
// Decrypt.
export function decrypt(b64: string): string {
  const raw = Buffer.from(b64, 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', KEY, raw.subarray(0, 12));
  d.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8');
}
// Sha256.
export const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
