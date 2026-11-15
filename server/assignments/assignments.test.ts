// Run: npm run test:assignments   (throw-away temp database; nothing is sent anywhere)
import os from 'os';
import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.PORTAL_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ugip-asg-'));
process.env.MFA_REQUIRED_ROLES = '';
const { db } = await import('../db/connection');
const { seedIfEmpty } = await import('../db/seed');
const { seedSubjectsIfEmpty } = await import('../academic/seed');
const svc = await import('../auth/service');
const ses = await import('../auth/session');
const consent = await import('../auth/consent');
const A = await import('./service');
const rules = await import('../notify/rules');

seedIfEmpty(); seedSubjectsIfEmpty(); svc.seedStaffIfEmpty(); svc.syncStudentUsers();
// User.
const user = (id: string) => ses.toSessionUser(db.prepare('SELECT * FROM users WHERE id=?').get(id));
const ctx = { ip: 't', ua: 't' };
const NOW = Date.UTC(2026, 9, 21, 5, 0, 0);                 // 21 Oct 2026, 10:30 IST
const H = 3600_000;
const SUBJECT = 'sub-cse-501';                               // CSE semester 5, taught by fac-hod-cse (not by fac-cse-1)
const sub = db.prepare('SELECT * FROM subjects WHERE id=?').get(SUBJECT) as any;
const classmates = (db.prepare('SELECT id FROM students WHERE deleted_at IS NULL AND branch=? AND semester=? ORDER BY roll_no').all(sub.branch, sub.semester) as any[]).map((r) => r.id);
const outsider = (db.prepare("SELECT id FROM students WHERE deleted_at IS NULL AND NOT (branch=? AND semester=?) LIMIT 1").get(sub.branch, sub.semester) as any).id;
const [S1, S2, S3] = classmates;
const HOD = user('fac-hod-cse'), OTHER = user('fac-cse-1'), ADMIN = user('usr-admin-1');

// everybody who should get notifications has agreed (students are marked 18+ so they can agree themselves)
for (const id of [...classmates, outsider]) db.prepare('UPDATE users SET adult_verified=1 WHERE id=?').run(id);
for (const id of [...classmates, outsider, 'fac-hod-cse', 'fac-cse-1']) consent.saveOwn(user(id), { service: true, notifications: true }, ctx);
// Notes.
const notes = (uid: string, kind?: string, testId?: string) => (db.prepare(`SELECT * FROM notifications WHERE user_id=? ${kind ? 'AND kind=?' : ''}`).all(...(kind ? [uid, kind] : [uid])) as any[])
  .filter((n) => !testId || n.dedupe_key.startsWith(`asg:${testId}:`));

const QS = [
  { question: 'LIFO structure?', options: ['Queue', 'Stack', 'Tree'], correctIndex: 1, explanation: 'Stack pops the last pushed item.' },
  { question: 'Worst case of quicksort?', options: ['n log n', 'n^2'], correctIndex: 1 },
  { question: 'Not linear?', options: ['Array', 'List', 'Tree', 'Stack'], correctIndex: 2 },
  { question: 'Fourth', options: ['a', 'b'], correctIndex: 0 },
];
// Form.
const form = (extra: any = {}) => ({ title: 'Unit Test 2', subjectId: SUBJECT, deadlineDate: '2026-10-25', deadlineTime: '17:00', totalMarks: 20, description: 'd', questions: QS, ...extra });
// Make.
const make = (u = HOD, extra: any = {}) => { const r = A.createTest(u, form(extra), NOW); assert.equal(r.ok, true, JSON.stringify(r)); return (r as any).id as string; };
const DEADLINE = A.deadlineAt('2026-10-25', '17:00');

test('deadline is read as Indian time', () => {
  assert.equal(DEADLINE, Date.UTC(2026, 9, 25, 11, 30));
});

test('subject-wise rule: only the subject teacher (or admin) can create', () => {
  const bad = A.createTest(OTHER, form(), NOW) as any;
  assert.equal(bad.ok, false); assert.equal(bad.status, 403);
  assert.equal((A.createTest(user(S1), form(), NOW) as any).status, 403);                    // a student
  assert.equal((A.createTest(HOD, form({ subjectId: 'sub-ce-501' }), NOW) as any).status, 403);   // someone else's subject
  assert.equal((A.createTest(HOD, form({ subjectId: 'nope' }), NOW) as any).status, 400);
  assert.equal((A.createTest(ADMIN, form(), NOW) as any).ok, true);
  const id = make();
  const t = db.prepare('SELECT * FROM online_tests WHERE id=?').get(id) as any;
  assert.deepEqual([t.branch, t.year, t.semester, t.created_by], [sub.branch, sub.year, sub.semester, 'fac-hod-cse']);   // class comes from the subject
});

test('input checks: deadline, marks, questions', () => {
  // E.
  const e = (extra: any) => (A.createTest(HOD, form(extra), NOW) as any);
  assert.equal(e({ deadlineDate: '2026-10-20' }).ok, false);                  // in the past
  assert.equal(e({ deadlineDate: '2026-02-31' }).ok, false);                  // not a real date
  assert.equal(e({ deadlineTime: '25:00' }).ok, false);
  assert.equal(e({ totalMarks: 0 }).ok, false);
  assert.equal(e({ totalMarks: 'x' }).ok, false);
  assert.equal(e({ title: '  ' }).ok, false);
  assert.equal(e({ questions: [{ question: 'q', options: ['only one'], correctIndex: 0 }] }).ok, false);
  assert.equal(e({ questions: [{ question: 'q', options: ['a', 'b'], correctIndex: 2 }] }).ok, false);
  assert.equal(e({ questions: [{ question: 'q', options: ['a', 'b'], correctIndex: -1 }] }).ok, false);
  assert.equal(e({ questions: [{ question: 'q', options: ['a', '', 'c'], correctIndex: 0 }] }).ok, false);
  assert.equal(e({ questions: 'nope' }).ok, false);
  assert.equal(e({ questions: undefined }).ok, true);                         // plain assignment, no questions
});

test('who sees what: answer key only for the teacher; students see their class only', () => {
  const id = make();
  // Ids.
  const ids = (u: any) => A.listFor(u, NOW).map((t) => t.id);
  assert.ok(ids(HOD).includes(id));
  assert.ok(ids(ADMIN).includes(id));
  assert.equal(ids(OTHER).includes(id), false);                               // another teacher: not his subject
  assert.ok(ids(user(S1)).includes(id));
  assert.equal(ids(user(outsider)).includes(id), false);                      // other class
  const parent = svc.createParent(S1, { name: 'P' }, 't') as any;
  const seenByParent = A.listFor(user(parent.id), NOW);                       // Step 14: a parent sees the child's class tests, read-only, no answer key
  assert.ok(seenByParent.every((x: any) => x.questions === undefined && !JSON.stringify(x).includes('correctIndex')));
  const staffDto = A.listFor(HOD, NOW).find((t) => t.id === id) as any;
  assert.equal(staffDto.questions[1].correctIndex, 1);
  const stuJson = JSON.stringify(A.listFor(user(S1), NOW).find((t) => t.id === id));
  assert.ok(!stuJson.includes('correctIndex') && !stuJson.includes('explanation') && !stuJson.includes('Stack pops'), 'the answer key must not reach a student');
  assert.equal((A.listFor(user(S1), NOW).find((t) => t.id === id) as any).questionCount, 4);
  assert.ok(!JSON.stringify(A.questionsForStudent(id)).includes('correctIndex'));
});

test('student submit: graded on the server, review shows the key, a student cannot see others', () => {
  const id = make();
  const t = A.findTest(id);
  const r = A.submit(user(S1), t, [1, 1, 0, 0], NOW + H) as any;               // 3 of 4 correct
  assert.equal(r.ok, true);
  assert.deepEqual([r.result.correct, r.result.wrong, r.result.percentage, r.result.score, r.result.grade], [3, 1, 75, 15, 'B']);
  assert.equal(r.review[2].correctIndex, 2); assert.equal(r.review[2].yourIndex, 0);
  A.submit(user(S2), t, [1, 1, 2, 0], NOW + H);
  const mine = A.toDto(A.findTest(id), user(S1), NOW + H) as any;
  assert.deepEqual(mine.submittedStudentIds, [S1]);                            // only himself
  assert.equal(mine.submittedCount, 2);
  assert.deepEqual(Object.keys(mine.results), [S1]);
  const staff = A.toDto(A.findTest(id), HOD, NOW + H) as any;
  assert.deepEqual(staff.submittedStudentIds.sort(), [S1, S2].sort());
  assert.equal(staff.results[S2].score, 20);
});

test('submit rules: class, deadline, junk answers, best attempt kept', () => {
  const id = make();
  const t = A.findTest(id);
  assert.equal((A.submit(user(outsider), t, [1, 1, 2, 0], NOW) as any).status, 404);       // not their class
  assert.equal((A.submit(HOD, t, [1, 1, 2, 0], NOW) as any).status, 403);                  // teachers do not submit
  assert.equal((A.submit(user(S1), t, 'abc', NOW) as any).status, 400);
  assert.equal((A.submit(user(S1), t, [1, 1, 2, 0, 1], NOW) as any).status, 400);          // more answers than questions
  const junk = A.submit(user(S1), t, [99, -1, 'x', null], NOW) as any;                     // out of range = unanswered, never a crash
  assert.equal(junk.ok, true); assert.equal(junk.result.correct, 0);
  const better = A.submit(user(S1), t, [1, 1, 2, 0], NOW + 1000) as any;
  assert.equal(better.result.score, 20);
  const worse = A.submit(user(S1), t, [0, 0, 0, 1], NOW + 2000) as any;
  assert.equal(worse.result.score, 20);                                                    // the better score is kept
  assert.equal(worse.result.attempts, 3);
  assert.equal((A.submit(user(S2), t, [1, 1, 2, 0], DEADLINE + 60_000) as any).ok, true);  // inside the 2-minute grace
  assert.equal((A.submit(user(S3), t, [1, 1, 2, 0], DEADLINE + 5 * 60_000) as any).status, 403);   // closed
});

test('a plain assignment (no questions) is just marked as submitted', () => {
  const id = make(HOD, { questions: [] });
  const r = A.submit(user(S1), A.findTest(id), undefined, NOW) as any;
  assert.equal(r.ok, true); assert.equal(r.result.score, null); assert.deepEqual(r.review, []);
  assert.equal(A.submit(user(S1), A.findTest(id), undefined, NOW + 5) && (db.prepare('SELECT COUNT(*) c FROM online_test_submissions WHERE test_id=?').get(id) as any).c, 1);
  const dto = A.toDto(A.findTest(id), HOD, NOW) as any;
  assert.deepEqual(dto.submittedStudentIds, [S1]); assert.deepEqual(dto.results, {});
});

test('reminders 72h / 24h / 3h go only to students who have not submitted; no repeats', () => {
  const id = make();
  A.submit(user(S1), A.findTest(id), [1, 1, 2, 0], NOW);
  rules.assignmentReminders(DEADLINE - 80 * H);
  assert.equal(notes(S2, 'assignment_reminder', id).length, 0);                // too early
  assert.equal(rules.assignmentReminders(DEADLINE - 70 * H) > 0, true);
  assert.equal(notes(S2, 'assignment_reminder', id).length, 1);
  assert.match(notes(S2, 'assignment_reminder', id)[0].title, /Reminder 1 of 3/);
  assert.equal(notes(S1, 'assignment_reminder', id).length, 0);                // submitted: left alone
  assert.equal(notes(outsider, 'assignment_reminder', id).length, 0);          // other class: left alone
  assert.equal(rules.assignmentReminders(DEADLINE - 69 * H), 0);               // running again changes nothing
  rules.assignmentReminders(DEADLINE - 23 * H);
  rules.assignmentReminders(DEADLINE - 2 * H);
  assert.deepEqual(notes(S2, 'assignment_reminder', id).map((n) => n.title.slice(0, 15)).sort(), ['Reminder 1 of 3', 'Reminder 2 of 3', 'Reminder 3 of 3']);
  assert.equal((A.toDto(A.findTest(id), HOD, DEADLINE - 2 * H) as any).remindersSentCount, 3);
  assert.equal((A.toDto(A.findTest(id), HOD, DEADLINE - 2 * H) as any).reminderLog.length, 3);
});

test('server was off: only the latest due reminder is sent, not three at once', () => {
  const id = make();
  rules.assignmentReminders(DEADLINE - 2 * H);
  assert.deepEqual(notes(S3, 'assignment_reminder').filter((n) => n.dedupe_key.startsWith(`asg:${id}:`)).map((n) => n.dedupe_key), [`asg:${id}:3`]);
});

test('after the deadline: teacher gets one summary, missing students one notice, test closes', () => {
  const id = make();
  A.submit(user(S1), A.findTest(id), [1, 1, 2, 0], NOW);
  rules.assignmentReminders(DEADLINE + H);
  rules.assignmentReminders(DEADLINE + 2 * H);                                 // second run adds nothing
  const f = notes('fac-hod-cse', 'assignment_deadline').filter((n) => n.dedupe_key === `asg:${id}:faculty`);
  assert.equal(f.length, 1);
  assert.match(f[0].body, /did not submit/);
  assert.ok(!f[0].body.includes(String((db.prepare('SELECT name FROM students WHERE id=?').get(S2) as any).name)), 'names stay out of the notification text');
  assert.equal(notes(OTHER.id, 'assignment_deadline').filter((n) => n.dedupe_key === `asg:${id}:faculty`).length, 0);   // not his subject
  assert.equal(notes(S2, 'assignment_reminder').filter((n) => n.dedupe_key === `asg:${id}:expired`).length, 1);
  assert.equal(notes(S1, 'assignment_reminder').filter((n) => n.dedupe_key === `asg:${id}:expired`).length, 0);
  const row = db.prepare('SELECT status, faculty_alerted FROM online_tests WHERE id=?').get(id) as any;
  assert.deepEqual([row.status, row.faculty_alerted], ['expired', 1]);
});

test('everyone submitted: closes as completed', () => {
  const id = make();
  for (const s of classmates) A.submit(user(s), A.findTest(id), [1, 1, 2, 0], NOW);
  rules.assignmentReminders(DEADLINE + H);
  assert.equal((db.prepare('SELECT status FROM online_tests WHERE id=?').get(id) as any).status, 'completed');
});

test('a person who has not agreed to notifications gets none', () => {
  const id = make();
  consent.saveOwn(user(S3), { service: true, notifications: false }, ctx);
  rules.assignmentReminders(DEADLINE - 2 * H);
  assert.equal(notes(S3, 'assignment_reminder').filter((n) => n.dedupe_key.startsWith(`asg:${id}:`)).length, 0);
  assert.equal(notes(S2, 'assignment_reminder').filter((n) => n.dedupe_key === `asg:${id}:3`).length, 1);
  consent.saveOwn(user(S3), { service: true, notifications: true }, ctx);
});

test('a new test is announced to its class only', () => {
  const id = make();
  rules.assignmentCreated(id, NOW); rules.assignmentCreated(id, NOW);
  assert.equal(notes(S2, 'assignment_new').filter((n) => n.dedupe_key === `asg:${id}:new`).length, 1);
  assert.equal(notes(outsider, 'assignment_new').length, 0);
});

test('old browser data can be moved once; sample data is the caller\'s job to skip', () => {
  const old = [{ id: 'old-test-1', title: 'Old', subjectCode: sub.code, branch: sub.branch, deadlineDate: '2026-09-01', deadlineTime: '17:00', totalMarks: 10, description: 'x',
    assignedByFacultyName: 'Nobody Known', questions: QS.slice(0, 1), submittedStudentIds: [S1, outsider],
    results: { [S1]: { score: 10, total: 10, percentage: 100, correct: 1, wrong: 0, grade: 'A+' } }, status: 'completed' },
    { id: 'old-test-2', title: 'Bad', subjectCode: 'NOPE', branch: 'CSE', deadlineDate: '2026-09-01', totalMarks: 10 }];
  const a = A.importLegacy(old, ADMIN); const b = A.importLegacy(old, ADMIN);
  assert.equal(a.added, 1); assert.equal(a.submissionsAdded, 1); assert.ok(a.skipped.length >= 2);
  assert.equal(b.added, 0);
  assert.equal((db.prepare('SELECT status FROM online_tests WHERE id=?').get('old-test-1') as any).status, 'completed');
});

test('database rejects impossible rows', () => {
  assert.throws(() => db.prepare("INSERT INTO online_tests (id,title,subject_id,branch,year,semester,deadline_date,deadline_time,deadline_at,total_marks,created_by,created_by_name,created_at) VALUES ('z','t',?,?,?,?,'2026-10-25','17:00',1,0,'fac-hod-cse','n',1)").run(SUBJECT, 'CSE', 3, 5));   // 0 marks
  assert.throws(() => db.prepare("INSERT INTO online_tests (id,title,subject_id,branch,year,semester,deadline_date,deadline_time,deadline_at,total_marks,status,created_by,created_by_name,created_at) VALUES ('z','t',?,?,?,?,'2026-10-25','17:00',1,5,'weird','fac-hod-cse','n',1)").run(SUBJECT, 'CSE', 3, 5));
});
