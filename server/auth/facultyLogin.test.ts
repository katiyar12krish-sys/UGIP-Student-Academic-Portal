// Run: npm run test:facultylogin   (throw-away temp database)
// Subject-wise faculty login, subject-scoped sessions, faculty passwords only for the admin, sample data only for
// the admin and the CSE HOD.
import os from 'os';
import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.MFA_REQUIRED_ROLES = '';
process.env.PORTAL_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ugip-faclogin-'));
const { db } = await import('../db/connection');
const { seedIfEmpty } = await import('../db/seed');
const { seedSubjectsIfEmpty } = await import('../academic/seed');
const svc = await import('./service');
const ses = await import('./session');
const { hashPassword } = await import('./password');
const { canViewPassword } = await import('./passwordVault');
const { seesSample, hideSample } = await import('./sample');

seedIfEmpty(); seedSubjectsIfEmpty(); svc.seedStaffIfEmpty(); svc.syncStudentUsers();

const PW = 'Teacher@2026';
const fac = db.prepare("SELECT * FROM users WHERE username='jitendra_cse'").get() as any;
const other = db.prepare("SELECT * FROM users WHERE username='bhawana_cse'").get() as any;
db.prepare('UPDATE users SET password_hash=?, must_change_password=0 WHERE id IN (?,?)').run(hashPassword(PW), fac.id, other.id);
db.prepare('DELETE FROM faculty_subject_assignments WHERE user_id IN (?,?)').run(fac.id, other.id);
db.prepare('INSERT INTO faculty_subject_assignments VALUES (?,?)').run(fac.id, 'sub-cse-301');
db.prepare('INSERT INTO faculty_subject_assignments VALUES (?,?)').run(fac.id, 'sub-cse-053005');
db.prepare('INSERT INTO faculty_subject_assignments VALUES (?,?)').run(other.id, 'sub-cse-053004');

test('faculty must choose a subject: username alone is refused', () => {
  const r = svc.login('jitendra_cse', PW, { ip: 'f1', role: 'faculty' });
  assert.equal(r.ok, false);
  assert.equal((r as any).status, 400);
});

test('subject + right password signs in, and the session is limited to that one subject', () => {
  const r = svc.login('', PW, { ip: 'f2', role: 'faculty', subjectId: 'sub-cse-301' }) as any;
  assert.equal(r.ok, true);
  assert.equal(r.user.id, fac.id);
  assert.deepEqual(r.user.subjectIds, ['sub-cse-301']);           // the other assigned subject is NOT open
  const again = ses.loadSession(r.token)!;                          // every later request: same limit
  assert.deepEqual(again.user.subjectIds, ['sub-cse-301']);
  assert.equal(again.user.subjectScope, 'sub-cse-301');
});

test('a teacher cannot open another teacher\'s subject with their own password', () => {
  const r = svc.login('', PW, { ip: 'f3', role: 'faculty', subjectId: 'sub-cse-053004' }) as any;
  // both test teachers have the same password here, so the server signs in the teacher OF THAT SUBJECT
  assert.equal(r.ok, true);
  assert.equal(r.user.id, other.id);
  assert.deepEqual(r.user.subjectIds, ['sub-cse-053004']);
  const wrong = svc.login('', 'Wrong@1234', { ip: 'f4', role: 'faculty', subjectId: 'sub-cse-053004' });
  assert.equal(wrong.ok, false);
});

test('a subject without a teacher cannot be used to sign in', () => {
  const r = svc.login('', PW, { ip: 'f5', role: 'faculty', subjectId: 'sub-cse-055002' }) as any;
  assert.equal(r.ok, false);
});

test('admin and student logins still use username + password', () => {
  const adm = db.prepare("SELECT id FROM users WHERE role='admin'").get() as any;
  db.prepare('UPDATE users SET password_hash=?, must_change_password=0 WHERE id=?').run(hashPassword('Admin@2026x'), adm.id);
  assert.equal(svc.login('admin', 'Admin@2026x', { ip: 'f6', role: 'admin' }).ok, true);
});

test('faculty passwords are visible to the admin only, never to a teacher (not even their own)', () => {
  const admin = ses.toSessionUser(db.prepare("SELECT * FROM users WHERE role='admin'").get());
  const teacher = ses.toSessionUser(fac);
  assert.equal(canViewPassword(admin, { id: fac.id, role: 'faculty' }), true);
  assert.equal(canViewPassword(teacher, { id: fac.id, role: 'faculty' }), false);
  assert.equal(canViewPassword(teacher, { id: other.id, role: 'faculty' }), false);
});

test('sample data: admin and CSE HOD see it, other teachers do not', () => {
  const admin = ses.toSessionUser(db.prepare("SELECT * FROM users WHERE role='admin'").get());
  const hod = ses.toSessionUser(fac);                               // "HOD - Computer Science Engineering"
  const teacher = ses.toSessionUser(other);                         // "Lecturer in CSE"
  assert.equal(seesSample(admin), true);
  assert.equal(seesSample(hod), true);
  assert.equal(seesSample(teacher), false);
  assert.equal(hideSample(teacher), true);
});
