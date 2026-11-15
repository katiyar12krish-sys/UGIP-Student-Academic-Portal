// Run: npm run test:logins   (throw-away temp database)
import os from 'os';
import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.MFA_REQUIRED_ROLES = '';
process.env.PORTAL_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ugip-logins-'));
const { db } = await import('../db/connection');
const { seedIfEmpty } = await import('../db/seed');
const svc = await import('./service');
const ses = await import('./session');
const mw = await import('./middleware');
const L = await import('./logins');

seedIfEmpty(); svc.seedStaffIfEmpty(); svc.syncStudentUsers();
// Fake res.
const fakeRes = () => { const r: any = { code: 200, body: null, status(c: number) { r.code = c; return r; }, json(b: any) { r.body = b; return r; } }; return r; };
// As user.
const asUser = (username: string, password: string, ip: string) => { const l = svc.login(username, password, { ip }); assert.ok(l.ok); return (l as any).user; };

test('nothing issued yet: every student shows "not_issued" and no password', () => {
  const rows = L.listLogins({ branch: 'CSE', year: 3 }, 'admin');
  assert.equal(rows.length, 12);
  assert.ok(rows.every((r) => r.student.status === 'not_issued' && r.student.tempPassword === null && r.parents.length === 0));
  assert.equal(rows[0].student.username, rows[0].rollNo);       // login ID of a student = roll number
});

test('bulk issue: temporary password is readable by staff until the student sets their own', () => {
  const r = L.bulkIssue({ branch: 'CSE', year: 3 }, { students: true, parents: true }, 'admin');
  assert.equal(r.studentsIssued, 12); assert.equal(r.parentsCreated, 12);
  const rows = L.listLogins({ branch: 'CSE', year: 3 }, 'admin');
  const diya = rows.find((x) => x.rollNo === '24090050011')!;
  assert.equal(diya.student.status, 'temporary');
  assert.match(diya.student.tempPassword!, /^[a-zA-Z2-9]{4}-[a-zA-Z2-9]{4}-[a-zA-Z2-9]{4}$/);
  assert.equal(diya.parents.length, 1);
  assert.equal(diya.parents[0].username, 'p24090050011');
  assert.equal(diya.parents[0].relation, 'Father');
  assert.equal(diya.parents[0].name, 'Deepak Singh Adhikari');   // from the record, nothing typed
  assert.ok(diya.parents[0].tempPassword);
  // the stored copy is encrypted, never the plain text
  const raw = db.prepare('SELECT temp_pw_enc, password_hash FROM users WHERE id=?').get(diya.student.userId) as any;
  assert.ok(!raw.temp_pw_enc.includes(diya.student.tempPassword!));
  // and the shown password really is the one that logs in
  assert.ok(svc.login(diya.student.username, diya.student.tempPassword!, { ip: 'a' }).ok);
  assert.ok(svc.login(diya.parents[0].username, diya.parents[0].tempPassword!, { ip: 'b', role: 'parent' }).ok);
  // the audit log recorded that staff looked at temporary passwords
  assert.ok((db.prepare("SELECT COUNT(*) c FROM audit_logs WHERE action='view_temp_passwords'").get() as any).c >= 1);
});

// Step 19 (college's rule): staff can SEE a student's password even after the student chose their own,
// but only in an encrypted column, and a second bulk run never resets anybody.
test('after the student sets their own password, admin / faculty can still see it (encrypted copy) and bulk does not reset them', () => {
  const before = L.listLogins({ q: '24090050011' }, 'admin')[0];
  const tmp = before.student.tempPassword!;
  assert.equal(svc.changeOwnPassword(before.student.userId, tmp, 'MyOwnPass2026'), null);
  const after = L.listLogins({ q: '24090050011' }, 'admin')[0];
  assert.equal(after.student.status, 'changed');
  assert.equal(after.student.tempPassword, 'MyOwnPass2026');                                   // visible to staff
  const row = db.prepare('SELECT temp_pw_enc, pw_view_enc FROM users WHERE id=?').get(before.student.userId) as any;
  assert.equal(row.temp_pw_enc, null);
  assert.ok(row.pw_view_enc && !String(row.pw_view_enc).includes('MyOwnPass2026'));          // stored encrypted, not as plain text
  const again = L.bulkIssue({ branch: 'CSE', year: 3 }, { students: true, parents: true }, 'admin');
  assert.equal(again.studentsIssued, 0); assert.equal(again.parentsCreated, 0);
  assert.ok(svc.login('24090050011', 'MyOwnPass2026', { ip: 'c' }).ok);     // still works
});

test('password visibility rules: admin only in admin panel, faculty to admin only, student to staff', async () => {
  const V = await import('./passwordVault');
  // Sess.
  const sess = (id: string) => ({ ...(db.prepare('SELECT id, username, role FROM users WHERE id=?').get(id) as any), subjectIds: [], childIds: [] });
  const admin = sess((db.prepare("SELECT id FROM users WHERE role='admin'").get() as any).id);
  const fac = sess((db.prepare("SELECT id FROM users WHERE username='jitendra_cse'").get() as any).id);
  const other = sess((db.prepare("SELECT id FROM users WHERE role='faculty' AND username<>'jitendra_cse'").get() as any).id);
  const stu = sess((db.prepare("SELECT id FROM users WHERE username='24090050011'").get() as any).id);
  assert.equal(V.canViewPassword(admin, admin), true);
  assert.equal(V.canViewPassword(fac, admin), false);
  assert.equal(V.canViewPassword(stu, admin), false);
  assert.equal(V.canViewPassword(admin, fac), true);
  assert.equal(V.canViewPassword(fac, fac), false);   // faculty passwords: admin only
  assert.equal(V.canViewPassword(other, fac), false);
  assert.equal(V.canViewPassword(stu, fac), false);
  assert.equal(V.canViewPassword(fac, stu), true);
  assert.equal(V.canViewPassword(admin, stu), true);
  assert.equal(V.canViewPassword(stu, stu), false);
  svc.issueTempPassword(fac.id, 'admin');
  assert.ok(V.passwordFor(admin, fac.id)!.password);                                           // admin sees the faculty password
  assert.equal(V.staffLogins(fac as any).length, 0);                                           // faculty cannot list staff
});

test('one-tap parent login: second parent only for the other relation; not twice for the same one', () => {
  const x = L.createParentFromRecord('stu-diya', 'Mother', 'admin') as any;
  assert.equal(x.username, 'p24090050011_2');
  assert.equal((db.prepare('SELECT name FROM users WHERE id=?').get(x.id) as any).name, 'Renu Devi');
  const dup = L.createParentFromRecord('stu-diya', 'Mother', 'admin') as any;
  assert.equal(dup.status, 409);
  assert.equal((L.createParentFromRecord('nope', undefined, 'admin') as any).status, 404);
});

test('only staff can open the logins list; a student or parent gets 403', () => {
  const s = db.prepare("SELECT id FROM users WHERE username='24090050007'").get() as any;
  const t = svc.issueTempPassword(s.id, 'admin')!;
  const stu = asUser('24090050007', t.tempPassword, 'd');
  const parent = svc.login('p24090050011', L.listLogins({ q: '24090050011' }, 'admin')[0].parents[0].tempPassword!, { ip: 'e' }) as any;
  for (const user of [stu, parent.user]) {
    const res = fakeRes(); let called = false;
    mw.requireRole('admin', 'faculty')({ user } as any, res, () => { called = true; });
    assert.equal(called, false); assert.equal(res.code, 403);
  }
});

test('"my login" tells a student only about themselves, and never contains a password', () => {
  const u = { id: 'stu-diya', role: 'student', username: '24090050011', name: 'Diya Adhikari', studentId: 'stu-diya', childIds: [] };
  const me = L.ownLoginInfo(u) as any;
  assert.equal(me.username, '24090050011');
  assert.deepEqual(me.parents.map((p: any) => p.username).sort(), ['p24090050011', 'p24090050011_2']);
  const json = JSON.stringify(me);
  assert.ok(!/anurag|24090050007/i.test(json));              // nobody else's data
  assert.ok(!/password/i.test(Object.keys(me).join()) && !/tempPassword/.test(json));
  const parentUser = { id: 'x', role: 'parent', username: 'p24090050011', name: 'Deepak', studentId: null, childIds: ['stu-diya'] };
  const pm = L.ownLoginInfo(parentUser) as any;
  assert.deepEqual(pm.children.map((c: any) => c.name), ['Diya Adhikari']);
});
