// npm run backup            -> backups/backup-<date>-<time>/   (keeps the newest 14; change with BACKUP_KEEP)
// npm run backup -- /mnt/usb/portal-backups   -> another folder (better: another disk / computer)
import path from 'path';
import { makeBackup } from '../ops/backup';

const root = path.resolve(process.argv[2] || process.env.BACKUP_DIR || 'backups');
const r = makeBackup(root, Number(process.env.BACKUP_KEEP) || 14);
console.log(`Backup done: ${r.dir}\n  ${r.files} files, ${(r.bytes / 1048576).toFixed(1)} MB${r.pruned ? `, ${r.pruned} old backup(s) removed` : ''}`);
console.log('This folder contains the key that decrypts Aadhaar numbers: keep it private and copy it off this computer.');
