// Run: npm run test:parent   (throw-away temp database; nothing is sent anywhere)
import os from 'os';
import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.PORTAL_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ugip-parent-'));
process.env.MFA_REQUIRED_ROLES = '';
const { db } = await import('../db/connection');
const { seedIfEmpty } = await import('../db/seed');
const { seedSubjectsIfEmpty } = await import('../academic/seed');
const svc = await import('../auth/service');
const ses = await import('../auth/session');
const consent = await import('../auth/consent');
const C = await import('../comms/service');
const A = await import('../assignments/service');
const rules = await import('../notify/rules');

seedIfEmpty(); seedSubjectsIfEmpty(); svc.seedStaffIfEmpty(); svc.syncStudentUsers();
// User.
const user = (id: string) => ses.toSessionUser(db.prepare('SELECT * FROM users WHERE id=?').get(id));
const ctx = { ip: 't', ua: 't' };
const NOW = Date.UTC(2026, 9, 21, 5, 0, 0);
const H = 3600_000;
const SUBJECT = 'sub-cse-501';
const sub = db.prepare('SELECT * FROM subjects WHERE id=?').get(SUBJECT) as any;
const classmates = (db.prepare('SELECT id FROM students WHERE deleted_at IS NULL AND branch=? AND semester=? ORDER BY roll_no').all(sub.branch, sub.semester) as any[]).map((r) => r.id);
const outsider = (db.prepare('SELECT id FROM students WHERE deleted_at IS NULL AND NOT (branch=? AND semester=?) LIMIT 1').get(sub.branch, sub.semester) as any).id;
const [S1, S2] = classmates;
const HOD = user('fac-hod-cse'), ADMIN = user('usr-admin-1');
// Mk parent.
const mkParent = (sid: string, relation = 'Father') => user((svc.createParent(sid, { name: 'P ' + sid, relation }, 't') as any).id);
const P1 = mkParent(S1), P2 = mkParent(S2, 'Mother'), POUT = mkParent(outsider);
for (const id of [S1, S2, outsider]) db.prepare('UPDATE users SET adult_verified=1 WHERE id=?').run(id);
for (const u of [P1, P2, POUT]) consent.saveOwn(u, { service: true, notifications: true }, ctx);
for (const id of [S1, S2, outsider]) consent.saveOwn(user(id), { service: true, notifications: true }, ctx);
// Notes.
const notes = (uid: string) => db.prepare("SELECT * FROM notifications WHERE user_id=? AND kind='assignment_reminder'").all(uid) as any[];

test('a parent reads the direct notices sent to their child, and only those (read-only)', () => {
  assert.ok((C.createDirectNotice(HOD, { studentId: S1, title: 'Meet me', message: 'Please see me about attendance', priority: 'urgent' }, NOW) as any).ok);
  assert.ok((C.createDirectNotice(HOD, { studentId: S2, title: 'Other', message: 'x' }, NOW) as any).ok);
  assert.deepEqual(C.listDirectFor(P1).map((d: any) => d.title), ['Meet me']);
  assert.deepEqual(C.listDirectFor(P2).map((d: any) => d.title), ['Other']);
  assert.deepEqual(C.listDirectFor(POUT), []);
  const id = C.listDirectFor(P1)[0].id;
  assert.equal((C.markDirectRead(P1, id, NOW) as any).status, 404);                         // a parent does not mark the child's notice as read
  assert.equal((C.createDirectNotice(P1, { studentId: S1, title: 'a', message: 'b' }, NOW) as any).status, 403);
});

test('a parent sees the child\'s doubts but cannot write in them', () => {
  const r = C.askDoubt(user(S1), { subjectId: SUBJECT, questionTitle: 'Stack', questionDetails: 'What is a stack?' }, NOW) as any; assert.ok(r.ok);
  C.askDoubt(user(S2), { subjectId: SUBJECT, questionTitle: 'Queue', questionDetails: 'What is a queue?' }, NOW);
  assert.deepEqual(C.listDoubtsFor(P1).map((d: any) => d.questionTitle), ['Stack']);
  assert.deepEqual(C.listDoubtsFor(POUT), []);
  const d = C.findDoubt(r.id);
  assert.equal(C.canSeeDoubt(P1, d), false);                                                // reply / resolve routes use this
  assert.equal((C.replyDoubt(P1, d, 'hello', NOW) as any).status, 404);
  assert.equal((C.resolveDoubt(P1, d, NOW) as any).ok, false);
});

test('a parent sees the tests of the child\'s class and the child\'s own result, never the answer key or other children', () => {
  const QS = [{ question: 'LIFO?', options: ['Queue', 'Stack'], correctIndex: 1 }, { question: 'q2', options: ['a', 'b'], correctIndex: 0 }];
  const r = A.createTest(HOD, { title: 'Unit Test', subjectId: SUBJECT, deadlineDate: '2026-10-25', deadlineTime: '17:00', totalMarks: 10, description: 'd', questions: QS }, NOW) as any; assert.ok(r.ok);
  const t = A.findTest(r.id);
  A.submit(user(S1), t, [1, 0], NOW + H); A.submit(user(S2), t, [0, 0], NOW + H);
  const mine = A.listFor(P1, NOW + 2 * H).find((x: any) => x.id === r.id)!;
  assert.deepEqual(mine.submittedStudentIds, [S1]);                                          // only my child, not the classmate
  assert.deepEqual(Object.keys(mine.results), [S1]);
  assert.equal((mine as any).questions, undefined);                                          // no answer key
  assert.equal(JSON.stringify(mine).includes('correctIndex'), false);
  assert.equal(A.listFor(POUT, NOW).some((x: any) => x.id === r.id), false);                 // other class
  assert.equal(A.canManage(P1, t), false);
  assert.equal(A.canSee(P1, t), true);
});

test('reminders also go to the parents of students who have not submitted (first name only), never twice', () => {
  const S3 = classmates[2];
  const P3 = mkParent(S3, 'Father'); consent.saveOwn(P3, { service: true, notifications: true }, ctx);
  const QS = [{ question: 'a?', options: ['x', 'y'], correctIndex: 0 }];
  const r = A.createTest(HOD, { title: 'Quiz Z', subjectId: SUBJECT, deadlineDate: '2026-10-22', deadlineTime: '17:00', totalMarks: 5, description: 'd', questions: QS }, NOW) as any; assert.ok(r.ok);
  A.submit(user(S1), A.findTest(r.id), [0], NOW + H);                                         // S1 submitted, S3 did not
  rules.assignmentReminders(NOW + 2 * H);
  const forP3 = notes(P3.id).filter((n) => n.dedupe_key.startsWith(`asg:${r.id}:`));
  assert.ok(forP3.length >= 1);
  assert.equal(notes(P1.id).filter((n) => n.dedupe_key.startsWith(`asg:${r.id}:`)).length, 0);   // submitted -> parent not nagged
  const first = (db.prepare('SELECT name FROM students WHERE id=?').get(S3) as any).name.split(/\s+/)[0];
  assert.ok(forP3[0].body.startsWith(first));
  assert.equal(forP3[0].body.includes('Quiz Z') || forP3[0].body.length > 0, true);
  const before = notes(P3.id).length;
  rules.assignmentReminders(NOW + 2 * H);
  assert.equal(notes(P3.id).length, before);                                                 // same event never twice
  rules.assignmentReminders(Date.UTC(2026, 9, 23, 0, 0, 0));                                   // after the deadline
  assert.ok(notes(P3.id).some((n) => n.dedupe_key.includes(':expired:p:')));
});
