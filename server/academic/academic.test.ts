// Run: npm run test:academic   (throw-away temp database; never touches data/portal.db)
import os from 'os';
import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.PORTAL_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ugip-acad-'));
const { db } = await import('../db/connection');
const { seedIfEmpty } = await import('../db/seed');
const { seedSubjectsIfEmpty } = await import('./seed');
const svc = await import('../auth/service');
const acc = await import('./access');
const { toSessionUser } = await import('../auth/session');

seedIfEmpty();
seedSubjectsIfEmpty();
svc.seedStaffIfEmpty();
svc.syncStudentUsers();
// User.
const user = (id: string) => toSessionUser(db.prepare('SELECT * FROM users WHERE id=?').get(id));

test('subjects and faculty assignments are seeded', () => {
  // Step 18: the official UBTER list (server/db/seed-subjects.json) has more than the 10 old placeholder subjects
  const expected = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'server/db/seed-subjects.json'), 'utf8')).length;
  assert.equal((db.prepare('SELECT COUNT(*) c FROM subjects').get() as any).c, expected);
  assert.deepEqual(user('fac-hod-cse').subjectIds.sort(), ['sub-cse-301', 'sub-cse-501']);
});

test('faculty-subject rule: canTeach', () => {
  assert.equal(acc.canTeach(user('fac-hod-cse'), 'sub-cse-501'), true);
  assert.equal(acc.canTeach(user('fac-cse-1'), 'sub-cse-501'), false);   // teaches 105 only
  assert.equal(acc.canTeach(user('usr-admin-1'), 'sub-cse-501'), true);  // admin: any subject
  assert.equal(acc.canTeach(user('stu-diya'), 'sub-cse-501'), false);    // students never
  assert.equal(acc.canTeach(user('fac-hod-cse'), 'no-such-subject'), false);
});

test('read access: teacher, or a colleague the owner granted; grants never allow writing', () => {
  const other = user('fac-cse-1');
  assert.equal(acc.canReadSubjectMarks(other, 'sub-cse-501'), false);
  db.prepare('INSERT INTO marks_access_grants (owner_user_id, grantee_user_id) VALUES (?,?)').run('fac-hod-cse', 'fac-cse-1');
  assert.equal(acc.canReadSubjectMarks(other, 'sub-cse-501'), true);
  assert.equal(acc.canReadSubjectMarks(other, 'sub-ce-501'), false);     // grant covers only the owner's subjects
  assert.equal(acc.canTeach(other, 'sub-cse-501'), false);
  db.prepare('DELETE FROM marks_access_grants').run();
  assert.equal(acc.canReadSubjectMarks(other, 'sub-cse-501'), false);
});

test('students, parents and class membership', () => {
  assert.deepEqual(acc.ownStudentIds(user('stu-diya')), ['stu-diya']);
  assert.equal(acc.studentInClass('stu-diya', 'CSE', 5), true);
  assert.equal(acc.studentInClass('stu-diya', 'CSE', 3), false);
  assert.equal(acc.studentInClass('stu-raju', 'CSE', 5), false);         // civil student
  assert.equal(acc.studentInClass('ghost', 'CSE', 5), false);
  const p = svc.createParent('stu-diya', { name: 'P' }, 't') as any;
  assert.deepEqual(acc.ownStudentIds(user(p.id)), ['stu-diya']);
});

test('grade scale', () => {
  const g = acc.gradeFor;
  assert.deepEqual([100, 90, 89.9, 80, 70, 60, 40, 39.9, 0].map(g), ['A+', 'A+', 'A', 'A', 'B', 'C', 'D', 'F', 'F']);
});

test('database rejects impossible marks and statuses', () => {
  db.prepare("INSERT INTO tests (id,title,type,subject_id,max_marks,branch,semester) VALUES ('t1','x','Unit Test','sub-cse-501',20,'CSE',5)").run();
  assert.throws(() => db.prepare("INSERT INTO test_marks (test_id,student_id,marks_obtained) VALUES ('t1','stu-diya',-1)").run());
  assert.throws(() => db.prepare("INSERT INTO tests (id,title,type,subject_id,max_marks,branch,semester) VALUES ('t2','x','Unit Test','sub-cse-501',0,'CSE',5)").run());
  db.prepare("INSERT INTO attendance_sessions (id,subject_id,faculty_id,branch,semester,date,qr_token,pin,expires_at,created_at) VALUES ('a1','sub-cse-501','fac-hod-cse','CSE',5,'2026-10-01','tok','123456',1,1)").run();
  assert.throws(() => db.prepare("INSERT INTO attendance_records (session_id,student_id,status,marked_via,marked_at) VALUES ('a1','stu-diya','Maybe','PIN',1)").run());
  db.prepare("INSERT INTO attendance_records (session_id,student_id,status,marked_via,marked_at) VALUES ('a1','stu-diya','Present','PIN',1)").run();
  assert.throws(() => db.prepare("INSERT INTO attendance_records (session_id,student_id,status,marked_via,marked_at) VALUES ('a1','stu-diya','Present','PIN',2)").run());   // one row per student per session
});
