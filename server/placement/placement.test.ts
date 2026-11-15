// Run: npm run test:placement   (throw-away temp database; nothing is sent anywhere)
import os from 'os';
import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.PORTAL_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ugip-placement-'));
process.env.MFA_REQUIRED_ROLES = '';
const { db } = await import('../db/connection');
const { seedIfEmpty } = await import('../db/seed');
const { seedSubjectsIfEmpty } = await import('../academic/seed');
const svc = await import('../auth/service');
const ses = await import('../auth/session');
const consent = await import('../auth/consent');
const P = await import('./service');
const rules = await import('../notify/rules');

seedIfEmpty(); seedSubjectsIfEmpty(); svc.seedStaffIfEmpty(); svc.syncStudentUsers();
// User.
const user = (id: string) => ses.toSessionUser(db.prepare('SELECT * FROM users WHERE id=?').get(id));
const ctx = { ip: 't', ua: 't' };
const NOW = Date.UTC(2026, 9, 22, 5, 0, 0);                  // 22 Oct 2026, 10:30 IST
const DEADLINE = '2026-10-30';
const AFTER = Date.parse('2026-10-30T23:59:59.999+05:30') + 1;
const BEFORE = Date.parse('2026-10-30T23:59:59.999+05:30');
const ADMIN = user('usr-admin-1'), CSE1 = user('fac-cse-1'), CIVIL = user('fac-civil');
// Ids.
const ids = (branch: string) => (db.prepare('SELECT id FROM students WHERE deleted_at IS NULL AND branch=? ORDER BY roll_no').all(branch) as any[]).map((r) => r.id);
const [C1, C2] = ids('CSE'), [V1] = ids('Civil');
for (const id of [C1, C2, V1]) db.prepare('UPDATE users SET adult_verified=1 WHERE id=?').run(id);
for (const id of [C1, V1]) consent.saveOwn(user(id), { service: true, notifications: true }, ctx);   // C2 has not allowed notifications
// Stu.
const stu = (id: string) => user(id);
// Set marks.
const setMarks = (id: string, pcts: number[]) => { db.prepare('DELETE FROM semester_results WHERE student_id=?').run(id); pcts.forEach((p, i) => db.prepare('INSERT INTO semester_results (student_id,semester,percentage) VALUES (?,?,?)').run(id, i + 1, p)); };
setMarks(C1, [70, 80]); setMarks(V1, [90]); db.prepare('DELETE FROM semester_results WHERE student_id=?').run(C2);
// Drive.
const drive = (u: any, over: any = {}, now = NOW) => P.createDrive(u, { title: 'Junior Developer', company: 'Acme Tech', branch: 'CSE', type: 'Campus Placement', deadline: DEADLINE, vacancies: 5, minPercentage: 60, selectionProcess: ['Test', 'Interview'], keySkills: ['C', 'SQL'], ...over }, now) as any;
// Made.
const made = (u: any = ADMIN, over: any = {}) => { const r = drive(u, over); assert.ok(r.ok, JSON.stringify(r)); return P.findDrive(r.id); };
// N.
const n = (id: string, kind: string) => db.prepare('SELECT * FROM notifications WHERE user_id=? AND kind=? ORDER BY rowid').all(id, kind) as any[];

test('posting: only staff, input checks, deadline not in the past', () => {
  assert.equal(drive(stu(C1)).ok, false);
  assert.equal(drive(stu(C1)).status, 403);
  assert.equal(drive(ADMIN, { title: '' }).ok, false);
  assert.equal(drive(ADMIN, { branch: 'Mechanical' }).ok, false);
  assert.equal(drive(ADMIN, { type: 'Party' }).ok, false);
  assert.equal(drive(ADMIN, { deadline: '2026-10-21' }).ok, false);          // yesterday
  assert.equal(drive(ADMIN, { deadline: '2026-02-30' }).ok, false);          // not a date
  assert.equal(drive(ADMIN, { vacancies: 0 }).ok, false);
  assert.equal(drive(ADMIN, { minPercentage: 101 }).ok, false);
  assert.equal(drive(ADMIN, { deadline: '2026-10-22' }).ok, true);           // today is allowed
  const d = made(CSE1, { applyUrl: 'javascript:alert(1)' });
  assert.equal(d.apply_url, '');                                              // only http(s) links are kept
  assert.equal(d.posted_by_name, CSE1.name);                                  // poster comes from the login
});

test('a student sees only drives for their branch; parents and logged-out see none', () => {
  const cse = made(ADMIN, { title: 'CSE only', branch: 'CSE' }), civ = made(ADMIN, { title: 'Civil only', branch: 'Civil' }), both = made(ADMIN, { title: 'For both', branch: 'Both' });
  // T.
  const t = (u: any) => P.listDrives(u, NOW).map((d: any) => d.title);
  assert.ok(t(stu(C1)).includes('CSE only') && t(stu(C1)).includes('For both') && !t(stu(C1)).includes('Civil only'));
  assert.ok(t(stu(V1)).includes('Civil only') && !t(stu(V1)).includes('CSE only'));
  assert.ok(['CSE only', 'Civil only', 'For both'].every((x) => t(ADMIN).includes(x)));
  const parent = (svc.createParent(C1, { name: 'Parent', relation: 'Father' }, 't') as any);
  assert.deepEqual(P.listDrives(user(parent.id), NOW), []);
  assert.deepEqual(P.listJobs(user(parent.id)), []);
  assert.equal(P.apply(stu(V1), cse.id, NOW).ok, false);                      // other branch
  assert.equal((P.apply(stu(V1), cse.id, NOW) as any).status, 404);
  assert.equal((P.apply(stu(C1), both.id, NOW) as any).ok, true);
});

test('apply: deadline end of day IST, active flag, minimum percentage, once only', () => {
  const d = made(ADMIN, { title: 'Needs 60', minPercentage: 60 });
  assert.equal(P.apply(ADMIN, d.id, NOW).ok, false);                           // staff do not apply
  assert.equal((P.apply(stu(C2), d.id, NOW) as any).error.includes('not on record'), true);   // no marks on file
  setMarks(C2, [50]);
  assert.equal((P.apply(stu(C2), d.id, NOW) as any).error.includes('Minimum 60%'), true);
  const hard = made(ADMIN, { title: 'Needs 75', minPercentage: 75 });
  assert.equal(P.studentPercentage(C1), 75);                                   // average of 70 and 80
  assert.equal((P.apply(stu(C1), hard.id, NOW) as any).created, true);         // exactly 75 is enough
  const r1 = P.apply(stu(C1), d.id, NOW) as any, r2 = P.apply(stu(C1), d.id, NOW) as any;
  assert.equal(r1.created, true); assert.equal(r2.created, false);
  assert.equal((db.prepare('SELECT COUNT(*) n FROM placement_applications WHERE drive_id=?').get(d.id) as any).n, 1);
  const late = made(ADMIN, { title: 'Deadline test' });
  assert.equal((P.apply(stu(C1), late.id, BEFORE) as any).ok, true);          // one millisecond before
  const late2 = made(ADMIN, { title: 'Deadline test 2' });
  assert.equal((P.apply(stu(C1), late2.id, AFTER) as any).status, 403);        // one millisecond after
  const closed = made(ADMIN, { title: 'Closed' });
  assert.equal(P.setDriveActive(ADMIN, closed.id, false).ok, true);
  assert.equal((P.apply(stu(C1), closed.id, NOW) as any).error, 'This drive is closed');
  setMarks(C2, []);
});

test('what the screen is told: own application, reason it is blocked, only the count of others', () => {
  const d = made(ADMIN, { title: 'Dto test' });
  P.apply(stu(C1), d.id, NOW);
  const mine = P.driveDto(P.findDrive(d.id), stu(C1), NOW);
  assert.equal(mine.applied, true); assert.equal(mine.myStatus, 'Applied'); assert.equal(mine.applicantCount, 1);
  const other = P.driveDto(P.findDrive(d.id), stu(C2), NOW);
  assert.equal(other.applied, false); assert.ok(other.cannotApplyReason);       // C2 has no marks on record
  assert.equal(JSON.stringify(other).includes(C1), false);                      // nothing about who else applied
  assert.equal(JSON.stringify(other).includes('myStatus'), false);
});

test('withdraw: only before the deadline and only while still "Applied"', () => {
  const d = made(ADMIN, { title: 'Withdraw test' });
  assert.equal(P.withdraw(stu(C1), d.id, NOW).ok, false);                       // never applied
  P.apply(stu(C1), d.id, NOW);
  assert.equal(P.withdraw(stu(C1), d.id, AFTER).ok, false);                     // after the deadline
  assert.equal(P.withdraw(stu(C1), d.id, NOW).ok, true);
  assert.equal(P.apply(stu(C1), d.id, NOW).ok, true);                           // can apply again
  const a = (P.applicants(ADMIN, d.id) as any).rows[0];
  P.setApplicationStatus(ADMIN, d.id, a.id, 'Shortlisted', NOW);
  const w = P.withdraw(stu(C1), d.id, NOW) as any;
  assert.equal(w.ok, false); assert.equal(w.status, 409);                       // already shortlisted
});

test('applicants: admin and the poster only; status changes validated; student cannot touch them', () => {
  const d = made(CSE1, { title: 'Poster test' });
  P.apply(stu(C1), d.id, NOW);
  const rows = (P.applicants(CSE1, d.id) as any).rows;
  assert.equal(rows.length, 1); assert.equal(rows[0].name.length > 0, true); assert.equal(rows[0].percentage, 75);
  assert.equal((P.applicants(ADMIN, d.id) as any).ok, true);
  assert.equal((P.applicants(CIVIL, d.id) as any).status, 403);                 // another faculty member
  assert.equal((P.applicants(stu(C1), d.id) as any).ok, false);                 // a student
  assert.equal((P.setApplicationStatus(CIVIL, d.id, rows[0].id, 'Selected') as any).ok, false);
  assert.equal((P.setApplicationStatus(CSE1, d.id, rows[0].id, 'Hired') as any).ok, false);
  assert.equal((P.setApplicationStatus(CSE1, d.id, 'nope', 'Selected') as any).status, 404);
  const other = made(CSE1, { title: 'Other drive' });
  assert.equal((P.setApplicationStatus(CSE1, other.id, rows[0].id, 'Selected') as any).status, 404);   // application of a different drive
  assert.equal((P.setApplicationStatus(CSE1, d.id, rows[0].id, 'Selected') as any).ok, true);
  assert.equal(P.driveDto(P.findDrive(d.id), stu(C1), NOW).myStatus, 'Selected');
});

test('closing, deleting: poster or admin; deleting removes the applications', () => {
  const d = made(CSE1, { title: 'Delete test' });
  P.apply(stu(C1), d.id, NOW);
  assert.equal((P.deleteDrive(CIVIL, d.id) as any).status, 403);
  assert.equal((P.setDriveActive(CIVIL, d.id, false) as any).status, 403);
  assert.equal((P.deleteDrive(stu(C1), d.id) as any).ok, false);
  assert.equal(P.deleteDrive(CSE1, d.id).ok, true);
  assert.equal((db.prepare('SELECT COUNT(*) n FROM placement_applications WHERE drive_id=?').get(d.id) as any).n, 0);
  const d2 = made(CSE1, { title: 'Admin deletes' });
  assert.equal(P.deleteDrive(ADMIN, d2.id).ok, true);
});

test('job listings: staff post, branch filter for students, poster or admin delete', () => {
  const body = { title: 'JE Civil', organization: 'UKPSC', branch: 'Civil', jobType: 'Government', officialLink: 'https://example.org', applicationDeadline: '2026-12-01' };
  assert.equal((P.createJob(stu(C1), body) as any).ok, false);
  assert.equal((P.createJob(ADMIN, { ...body, jobType: 'Gov' }) as any).ok, false);
  assert.equal((P.createJob(ADMIN, { ...body, applicationDeadline: 'soon' }) as any).ok, false);
  const r = P.createJob(CIVIL, body) as any; assert.ok(r.ok);
  assert.ok(P.listJobs(stu(V1)).some((j: any) => j.title === 'JE Civil'));
  assert.ok(!P.listJobs(stu(C1)).some((j: any) => j.title === 'JE Civil'));     // CSE student does not see a Civil listing
  assert.equal((P.deleteJob(CSE1, r.id) as any).status, 403);
  assert.equal(P.deleteJob(CIVIL, r.id).ok, true);
});

test('messages: right students, no repeats, consent respected, no private data', () => {
  const d = made(ADMIN, { title: 'Notify me', company: 'Zeta Infra', branch: 'Civil' });
  const before = [n(C1, 'placement_new').length, n(C2, 'placement_new').length, n(V1, 'placement_new').length];
  assert.ok(rules.placementDriveCreated(d.id, NOW) >= 1);
  assert.equal(n(V1, 'placement_new').length, before[2] + 1);
  assert.equal(n(C1, 'placement_new').length, before[0]);                       // other branch
  assert.equal(n(C2, 'placement_new').length, before[1]);                       // other branch (and never allowed notifications)
  assert.equal(rules.placementDriveCreated(d.id, NOW), 0);                      // same event never twice
  assert.ok(n(V1, 'placement_new').at(-1).title.includes('Zeta Infra'));
  const open = made(ADMIN, { title: 'Status drive', branch: 'Both' });
  P.apply(stu(C1), open.id, NOW);
  const a = (P.applicants(ADMIN, open.id) as any).rows[0];
  assert.equal(rules.placementStatusChanged(open.id, C1, NOW), 0);              // still "Applied": nothing to say
  P.setApplicationStatus(ADMIN, open.id, a.id, 'Selected', NOW);
  assert.equal(rules.placementStatusChanged(open.id, C1, NOW), 1);
  const msg = n(C1, 'placement_status').at(-1);
  assert.equal(/Selected|Rejected|Shortlisted/.test(msg.title + msg.body), false);   // the result itself stays in the portal
});
