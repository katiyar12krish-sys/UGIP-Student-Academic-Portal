// Run: npm run test:ops   (throw-away temp database)
import os from 'os';
import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugip-ops-'));
process.env.PORTAL_DATA_DIR = path.join(dir, 'data');
process.env.MFA_REQUIRED_ROLES = '';
const { db, DATA_DIR } = await import('../db/connection');
const { seedIfEmpty } = await import('../db/seed');
const { startupFindings } = await import('./startupChecks');
const { makeBackup } = await import('./backup');
seedIfEmpty();

test('start-up warnings: unsafe settings are named, a clean production setup only gets hints', () => {
  // Texts.
  const texts = (env: any, d?: string) => startupFindings(env, d).filter((f) => f.level === 'warn').map((f) => f.text).join('\n');
  const bad = texts({ NODE_ENV: 'production', ADMIN_PASSWORD_RESET: '1', ADMIN_PASSWORD: 'Abcdef12', DEV_STAFF_PASSWORD: 'x', INSECURE_COOKIES: '1', SMS_PROVIDER: 'console' });
  for (const w of [/ADMIN_PASSWORD_RESET/, /ADMIN_PASSWORD is written/, /DEV_STAFF_PASSWORD/, /HTTPS/, /TRUST_PROXY/, /SMS_PROVIDER=console/]) assert.match(bad, w);
  assert.equal(texts({ NODE_ENV: 'production', TRUST_PROXY: '1' }), '');
  assert.equal(startupFindings({ NODE_ENV: 'production', TRUST_PROXY: '1' }).some((f) => /backup/i.test(f.text)), true);
  fs.writeFileSync(path.join(DATA_DIR, 'initial-credentials.txt'), 'x');
  assert.match(texts({}, DATA_DIR), /initial-credentials/);
  assert.equal(texts({ NODE_ENV: 'development' }, path.join(dir, 'nowhere')), '');         // a laptop with defaults: no noise
});

test('backup: a restorable copy of the database, the key, the files and photos; old backups are pruned', () => {
  fs.mkdirSync(path.join(DATA_DIR, 'uploads'), { recursive: true }); fs.mkdirSync(path.join(DATA_DIR, 'photos'), { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, 'uploads', 'f-aaaaaaaaaaaaaaaaaaaaaaaa'), 'voice bytes');
  fs.writeFileSync(path.join(DATA_DIR, 'photos', 'u1.jpg'), 'jpg');
  fs.writeFileSync(path.join(DATA_DIR, '.secret'), 'k'.repeat(64));
  const root = path.join(dir, 'backups');
  const users = (db.prepare('SELECT COUNT(*) c FROM students').get() as any).c;
  const r = makeBackup(root, 14, new Date(Date.UTC(2026, 9, 25, 9, 30)));
  assert.match(r.dir, /backup-20261025-0930$/);
  assert.ok(fs.existsSync(path.join(r.dir, '.secret')) && fs.existsSync(path.join(r.dir, 'uploads', 'f-aaaaaaaaaaaaaaaaaaaaaaaa')) && fs.existsSync(path.join(r.dir, 'photos', 'u1.jpg')));
  const copy = new DatabaseSync(path.join(r.dir, 'portal.db'));                          // it really opens and holds the data
  assert.equal((copy.prepare('SELECT COUNT(*) c FROM students').get() as any).c, users);
  assert.equal((copy.prepare('PRAGMA integrity_check').get() as any).integrity_check, 'ok');
  copy.close();
  for (const d of [26, 27, 28]) makeBackup(root, 2, new Date(Date.UTC(2026, 9, d, 9, 30)));
  assert.deepEqual(fs.readdirSync(root).sort(), ['backup-20261027-0930', 'backup-20261028-0930']);   // only the newest 2 stay
});
