// Run: npm run test:permissions   (throw-away temp database; never touches data/portal.db)
// Admin-given faculty permissions and the cross-subject alert (server/auth/permissions.ts).
import os from 'os';
import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.PORTAL_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ugip-perm-'));
const { db } = await import('../db/connection');
const { seedIfEmpty } = await import('../db/seed');
const { seedSubjectsIfEmpty } = await import('../academic/seed');
const svc = await import('./service');
const perm = await import('./permissions');
const { toSessionUser } = await import('./session');

seedIfEmpty();
seedSubjectsIfEmpty();
svc.seedStaffIfEmpty();
svc.syncStudentUsers();
const user = (id: string) => toSessionUser(db.prepare('SELECT * FROM users WHERE id=?').get(id));
const bell = (userId: string) => db.prepare("SELECT title, body FROM notifications WHERE user_id=? AND kind='security'").all(userId) as any[];

test('every feature is allowed until the admin switches it off', () => {
  const p = perm.permissionsOf('fac-cse-1');
  assert.ok(perm.FEATURES.every((f) => p[f.key] === true));
  assert.equal(perm.hasFeature(user('fac-cse-1'), 'practicals'), true);
});

test('own subject: allowed; switched-off feature: refused even for own subject', () => {
  assert.equal(perm.writeDenied(user('fac-hod-cse'), 'sub-cse-501', 'marks', 'change marks'), null);
  assert.deepEqual(perm.setPermissions('fac-hod-cse', { marks: false }, 'admin'), { ok: true });
  assert.match(perm.writeDenied(user('fac-hod-cse'), 'sub-cse-501', 'marks', 'change marks') || '', /not given you permission/);
  assert.equal(perm.writeDenied(user('fac-hod-cse'), 'sub-cse-501', 'attendance', 'change attendance'), null);   // other features untouched
  perm.setPermissions('fac-hod-cse', { marks: true }, 'admin');
  assert.equal(perm.writeDenied(user('fac-hod-cse'), 'sub-cse-501', 'marks', 'change marks'), null);
});

test("another teacher's subject: refused, and the subject teacher + admin are told", () => {
  const msg = perm.writeDenied(user('fac-cse-1'), 'sub-cse-501', 'marks', 'change exams / marks');
  assert.match(msg || '', /not assigned to you/);
  const owner = bell('fac-hod-cse');
  assert.equal(owner.length, 1);
  assert.match(owner[0].body, /tried to change exams \/ marks/);
  const admins = (db.prepare("SELECT id FROM users WHERE role='admin'").all() as any[]).map((r) => r.id);
  assert.ok(admins.length > 0 && admins.every((id) => bell(id).length === 1));
  const log = db.prepare("SELECT * FROM audit_logs WHERE action='cross_subject_attempt'").all() as any[];
  assert.equal(log.length, 1);
  // the same attempt again within the minute does not flood the bell
  perm.writeDenied(user('fac-cse-1'), 'sub-cse-501', 'marks', 'change exams / marks');
  assert.equal(bell('fac-hod-cse').length, 1);
});

test('admin is never limited; unknown teachers cannot be given permissions', () => {
  assert.equal(perm.writeDenied(user('usr-admin-1'), 'sub-cse-501', 'marks', 'x'), null);
  assert.equal(perm.setPermissions('stu-diya', { marks: false }, 'admin').ok, false);
});
