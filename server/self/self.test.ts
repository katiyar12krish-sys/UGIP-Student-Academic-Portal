// Run: npm run test:self   (throw-away temp database; nothing is sent anywhere)
// Self-service: own profile, own doubt / reply, own class-dispatch submission. Nobody can change someone else's data.
import os from 'os';
import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.PORTAL_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ugip-self-'));
process.env.MFA_REQUIRED_ROLES = '';
const { db } = await import('../db/connection');
const { seedIfEmpty } = await import('../db/seed');
const { seedSubjectsIfEmpty } = await import('../academic/seed');
const svc = await import('../auth/service');
const ses = await import('../auth/session');
const S = await import('./service');
const C = await import('../comms/service');
const D = await import('../dispatch/service');
const F = await import('../files/store');

seedIfEmpty(); seedSubjectsIfEmpty(); svc.seedStaffIfEmpty(); svc.syncStudentUsers();
const user = (id: string) => ses.toSessionUser(db.prepare('SELECT * FROM users WHERE id=?').get(id));
const NOW = Date.UTC(2026, 9, 22, 5, 0, 0);                 // 22 Oct 2026, 10:30 IST
const DUE = '2026-10-25';
const AFTER_DUE = Date.parse('2026-10-25T23:59:59.999+05:30') + 1;
const ADMIN = user('usr-admin-1'), HOD = user('fac-hod-cse'), CSE1 = user('fac-cse-1');
const cse5 = (db.prepare("SELECT id FROM students WHERE deleted_at IS NULL AND branch='CSE' AND semester=5 ORDER BY roll_no").all() as any[]).map((r) => r.id);
const S1 = user(cse5[0]), S2 = user(cse5[1]);
const P1 = user((svc.createParent(cse5[0], { name: 'Parent One', relation: 'Father' }, 't') as any).id);
const subj = (db.prepare("SELECT a.subject_id id FROM faculty_subject_assignments a JOIN subjects s ON s.id=a.subject_id WHERE a.user_id='fac-hod-cse' AND s.branch='CSE' AND s.semester=5 LIMIT 1").get() as any).id;
const studentRow = (id: string) => db.prepare('SELECT * FROM students WHERE id=?').get(id) as any;
const userRow = (id: string) => db.prepare('SELECT * FROM users WHERE id=?').get(id) as any;

test('profile: each role corrects only its own allowed fields', () => {
  const before = studentRow(S1.studentId!), other = studentRow(cse5[1]);
  const r = S.updateMyProfile(S1, { phone: '+91 98765-43210', address: 'Ward 5, Tanakpur', father: 'Ram Singh', dob: '2007-04-02', gender: 'Female', email: 'ME@Example.com',
    // these must be ignored: official records and other people's ids
    name: 'Hacked Name', roll_no: '999', branch: 'Civil', semester: 1, tenth: 99, marks: 100, studentId: cse5[1], userId: 'usr-admin-1', role: 'admin' }) as any;
  assert.ok(r.ok);
  assert.deepEqual(r.changed.sort(), ['address', 'dob', 'email', 'father', 'gender', 'phone']);
  const after = studentRow(S1.studentId!);
  assert.equal(after.phone, '9876543210'); assert.equal(after.address, 'Ward 5, Tanakpur'); assert.equal(after.dob, '2007-04-02'); assert.equal(after.gender, 'Female');
  assert.equal(after.name, before.name); assert.equal(after.roll_no, before.roll_no); assert.equal(after.branch, 'CSE'); assert.equal(after.semester, 5); assert.equal(after.tenth, before.tenth);
  assert.equal(userRow(S1.id).email, 'me@example.com'); assert.equal(userRow(S1.id).role, 'student');
  assert.deepEqual(studentRow(cse5[1]), other);                                             // the other student is untouched
  assert.equal(userRow('usr-admin-1').role, 'admin');
});

test('profile: bad values are refused', () => {
  assert.equal((S.updateMyProfile(S1, { phone: '12345' }) as any).status, 400);
  assert.equal((S.updateMyProfile(S1, { email: 'not-an-email' }) as any).status, 400);
  assert.equal((S.updateMyProfile(S1, { dob: '2007-02-30' }) as any).status, 400);
  assert.equal((S.updateMyProfile(S1, { dob: '2999-01-01' }, '2026-11-13') as any).status, 400);
  assert.equal((S.updateMyProfile(S1, { gender: 'X' }) as any).status, 400);
  assert.equal((S.updateMyProfile(S1, { name: 'Only name' }) as any).status, 400);   // a student cannot rename themself (official record)
  assert.equal((S.updateMyProfile(HOD, { name: 'A' }) as any).status, 400);
  assert.equal((S.updateMyProfile(HOD, {}) as any).status, 400);
});

test('profile: staff and parents', () => {
  assert.ok((S.updateMyProfile(HOD, { name: 'Dr. HOD CSE', designation: 'Head of Department', phone: '9411111111', department: 'Civil' }) as any).ok);
  assert.equal(userRow(HOD.id).name, 'Dr. HOD CSE'); assert.equal(userRow(HOD.id).designation, 'Head of Department');
  assert.notEqual(userRow(HOD.id).department, 'Civil');                                    // department is not self-editable
  assert.ok((S.updateMyProfile(P1, { name: 'Parent Changed', phone: '7000000001' }) as any).ok);
  assert.equal(userRow(P1.id).name, 'Parent Changed');
  assert.ok((S.updateMyProfile(ADMIN, { email: 'office@ugip.ac.in' }) as any).ok);
  const p = S.myProfile(S1)!;
  assert.equal(p.values.phone, '9876543210'); assert.equal((p.official as any).branch, 'CSE');
  assert.deepEqual(S.myProfile(P1)!.editable, ['name', 'email', 'phone']);
});

test('doubts: the asker edits until a teacher answers; replies are deleted only by their writer (or admin)', () => {
  const a = C.askDoubt(S1, { subjectId: subj, questionTitle: 'Normalisation', questionDetails: 'What is 3NF?' }, NOW) as any; assert.ok(a.ok);
  const d = () => C.findDoubt(a.id);
  assert.equal((S.editMyDoubt(S2, d(), { questionTitle: 'x' }) as any).status, 404);       // another student: not even found
  assert.equal((S.editMyDoubt(HOD, d(), { questionTitle: 'x' }) as any).status, 403);
  assert.ok((S.editMyDoubt(S1, d(), { questionTitle: 'Normalisation (DBMS)', questionDetails: 'What is 3NF and BCNF?' }) as any).ok);
  assert.equal(d().title, 'Normalisation (DBMS)');
  const mine = C.replyDoubt(S1, d(), 'Please explain with example', NOW) as any;
  const teacher = C.replyDoubt(HOD, d(), '3NF removes transitive dependency.', NOW) as any;
  assert.equal((S.editMyDoubt(S1, d(), { questionTitle: 'Changed later' }) as any).status, 409);
  assert.equal((S.deleteDoubtReply(S1, d(), teacher.replyId) as any).status, 403);         // not mine
  assert.equal((S.deleteDoubtReply(HOD, d(), mine.replyId) as any).status, 403);
  assert.equal((S.deleteDoubtReply(S2, d(), mine.replyId) as any).status, 404);
  assert.equal((S.deleteDoubtReply(CSE1, d(), mine.replyId) as any).status, 404);          // teacher of another subject
  assert.ok((S.deleteDoubtReply(S1, d(), mine.replyId) as any).ok);
  assert.equal((S.deleteDoubtReply(S1, d(), mine.replyId) as any).status, 404);
  assert.ok((S.deleteDoubtReply(ADMIN, d(), teacher.replyId) as any).ok);                  // admin moderates
  assert.equal((db.prepare('SELECT COUNT(*) c FROM doubt_replies WHERE doubt_id=?').get(a.id) as any).c, 0);
});

test('dispatch: re-submit / edit text keeping the file, withdraw until the deadline, never after grading', () => {
  const made = D.createDispatch(HOD, { subjectId: subj, type: D.TASK_TYPE, title: 'Assignment 1', dueDate: DUE, maxMarks: 10 }, NOW) as any; assert.ok(made.ok);
  const disp = () => D.findDispatch(made.id);
  const pdf = Buffer.from('%PDF-1.4\n' + 'x'.repeat(100));
  const up = F.savePending(S1.id, pdf, 'answer.pdf', NOW) as any; assert.ok(up.ok);
  assert.ok((D.submitWork(S1, disp(), { content: 'first', fileId: up.file.fileId }, NOW) as any).ok);
  const r2 = D.submitWork(S1, disp(), { content: 'corrected text', keepFile: true }, NOW) as any; assert.ok(r2.ok); assert.equal(r2.created, false);
  const row = db.prepare('SELECT * FROM dispatch_submissions WHERE dispatch_id=? AND student_id=?').get(made.id, S1.studentId) as any;
  assert.equal(row.content, 'corrected text'); assert.equal(row.file_id, up.file.fileId); assert.equal(row.attempts, 2);
  assert.ok(F.findFile(up.file.fileId));                                                   // file kept
  assert.equal((S.withdrawSubmission(S2, disp(), NOW) as any).status, 404);                // nothing of theirs
  assert.equal((S.withdrawSubmission(HOD, disp(), NOW) as any).status, 403);
  assert.equal((S.withdrawSubmission(S1, disp(), AFTER_DUE) as any).status, 403);          // after the deadline
  assert.ok((S.withdrawSubmission(S1, disp(), NOW) as any).ok);
  assert.equal(F.findFile(up.file.fileId), undefined);                                     // file removed with it
  // graded work is locked
  assert.ok((D.submitWork(S2, disp(), { content: 'mine' }, NOW) as any).ok);
  const sid = (db.prepare('SELECT id FROM dispatch_submissions WHERE dispatch_id=? AND student_id=?').get(made.id, S2.studentId) as any).id;
  assert.ok((D.gradeSubmission(HOD, disp(), sid, { marks: 8 }, NOW) as any).ok);
  assert.equal((S.withdrawSubmission(S2, disp(), NOW) as any).status, 409);
  assert.equal((D.submitWork(S2, disp(), { content: 'change' }, NOW) as any).status, 409);
});
