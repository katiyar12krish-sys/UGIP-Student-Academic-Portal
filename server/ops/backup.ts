// ===================================================================================================
// npm run backup: a safe copy of the database, uploaded files, photos and the encryption key.
// Keeps the newest BACKUP_KEEP copies. Run it daily so 5-6 years of records are never lost.
// ===================================================================================================
import fs from 'fs';
import path from 'path';
import { db, DATA_DIR } from '../db/connection';

// Step 14: one command makes a safe copy of everything the portal needs:
//   portal.db (a consistent snapshot, taken while the server runs), .secret (decrypts Aadhaar), uploads/ (files, voice messages), photos/.
// A database row without its file (or the reverse) is a broken record, so they are always copied together.
export interface BackupResult { dir: string; files: number; bytes: number; pruned: number }

// Copy dir.
function copyDir(from: string, to: string): { files: number; bytes: number } {
  let files = 0, bytes = 0;
  if (!fs.existsSync(from)) return { files, bytes };
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (!e.isFile()) continue;                                   // uploads and photos are flat folders
    fs.copyFileSync(path.join(from, e.name), path.join(to, e.name), fs.constants.COPYFILE_EXCL);
    files++; bytes += fs.statSync(path.join(to, e.name)).size;
  }
  return { files, bytes };
}

// Make backup.
export function makeBackup(root: string, keep = 14, now = new Date()): BackupResult {
  const stamp = now.toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');   // 20261025-0930
  const dir = path.join(root, `backup-${stamp}`);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  let files = 0, bytes = 0;
  db.exec(`VACUUM INTO '${path.join(dir, 'portal.db').replace(/'/g, "''")}'`);
  files++; bytes += fs.statSync(path.join(dir, 'portal.db')).size;
  const secret = path.join(DATA_DIR, '.secret');
  if (fs.existsSync(secret)) { fs.copyFileSync(secret, path.join(dir, '.secret')); fs.chmodSync(path.join(dir, '.secret'), 0o600); files++; }
  for (const sub of ['uploads', 'photos']) { const r = copyDir(path.join(DATA_DIR, sub), path.join(dir, sub)); files += r.files; bytes += r.bytes; }
  // keep only the newest `keep` backups
  const all = fs.readdirSync(root).filter((n) => /^backup-\d{8}-\d{4}$/.test(n)).sort();
  let pruned = 0;
  for (const old of all.slice(0, Math.max(0, all.length - Math.max(1, keep)))) { fs.rmSync(path.join(root, old), { recursive: true, force: true }); pruned++; }
  return { dir, files, bytes, pruned };
}
