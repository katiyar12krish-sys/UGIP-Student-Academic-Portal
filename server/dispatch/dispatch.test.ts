// Run: npm run test:dispatch   (throw-away temp database and upload folder; nothing is sent anywhere)
import os from 'os';
import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.PORTAL_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ugip-dispatch-'));
process.env.MFA_REQUIRED_ROLES = '';
process.env.MAX_UPLOAD_MB = '1';
const { db } = await import('../db/connection');
const { seedIfEmpty } = await import('../db/seed');
const { seedSubjectsIfEmpty } = await import('../academic/seed');
const svc = await import('../auth/service');
const ses = await import('../auth/session');
const consent = await import('../auth/consent');
const F = await import('../files/store');
const D = await import('./service');
const rules = await import('../notify/rules');

seedIfEmpty(); seedSubjectsIfEmpty(); svc.seedStaffIfEmpty(); svc.syncStudentUsers();
// User.
const user = (id: string) => ses.toSessionUser(db.prepare('SELECT * FROM users WHERE id=?').get(id));
const ctx = { ip: 't', ua: 't' };
const NOW = Date.UTC(2026, 9, 22, 5, 0, 0);                 // 22 Oct 2026, 10:30 IST
const DUE = '2026-10-25';
const AFTER_DUE = Date.parse('2026-10-25T23:59:59.999+05:30') + 1;
const ADMIN = user('usr-admin-1'), HOD = user('fac-hod-cse'), CSE1 = user('fac-cse-1'), CIVIL = user('fac-civil');
// Ids of.
const idsOf = (branch: string, sem: number) => (db.prepare('SELECT id FROM students WHERE deleted_at IS NULL AND branch=? AND semester=? ORDER BY roll_no').all(branch, sem) as any[]).map((r) => r.id);
db.prepare('UPDATE students SET semester=3 WHERE id=?').run(idsOf('CSE', 5).pop());     // one CSE student in semester 3: "another semester"
const cse5 = idsOf('CSE', 5), cse3 = idsOf('CSE', 3), civ5 = idsOf('Civil', 5);
const [S1, S2] = cse5, [S3] = cse3, [CV1] = civ5;
// Stu.
const stu = (id: string) => user(id);
// Parent of s1.
const parentOfS1 = (() => { const p = svc.createParent(S1, { name: 'Parent', relation: 'Father' }, 't') as any; return user(p.id); })();
for (const id of [...cse5, ...cse3, ...civ5]) db.prepare('UPDATE users SET adult_verified=1 WHERE id=?').run(id);
for (const id of [S1, S3, CV1]) consent.saveOwn(user(id), { service: true, notifications: true }, ctx);   // S2 has not allowed notifications
consent.saveOwn(HOD, { service: true, notifications: true }, ctx);

// Subject of.
const subjectOf = (u: any, sem: number) => (db.prepare(`SELECT id FROM subjects WHERE semester=? AND id IN (${u.subjectIds.map(() => '?').join(',')})`).get(sem, ...u.subjectIds) as any).id as string;
const CSE5_SUBJECT = subjectOf(HOD, 5);

const pdf = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(200, 0x20), Buffer.from('%%EOF')]);
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
// Upload.
const upload = (u: any, buf: Buffer = pdf, name = 'file.pdf') => { const r = F.savePending(u.id, buf, name, NOW); assert.ok(r.ok, JSON.stringify(r)); return (r as any).file.fileId as string; };
// Send.
const send = (u: any, over: any = {}, now = NOW) => D.createDispatch(u, { subjectId: CSE5_SUBJECT, type: 'Assignment & Task', title: 'Unit 2 questions', description: 'Solve all', dueDate: DUE, maxMarks: 20, ...over }, now) as any;
// Task.
const task = (over: any = {}) => { const r = send(HOD, over); assert.ok(r.ok, JSON.stringify(r)); return D.findDispatch(r.id); };
// Submit.
const submit = (u: any, d: any, body: any = { content: 'My answer' }, now = NOW) => D.submitWork(u, d, body, now) as any;
// Called when: disk.
const onDisk = (id: string) => fs.existsSync(F.fileOnDisk(id));
// Titles.
const titles = (l: any[]) => l.map((m) => m.title);

test('sending: input checks and the class comes from the subject', () => {
  assert.equal(send(HOD, { title: ' ' }).status, 400);
  assert.equal(send(HOD, { type: 'Nonsense' }).status, 400);
  assert.equal(send(HOD, { subjectId: 'nope' }).status, 400);
  assert.equal(send(HOD, { dueDate: '2026-10-21' }).status, 400);            // yesterday
  assert.equal(send(HOD, { dueDate: '2026-02-30' }).status, 400);            // not a date
  assert.equal(send(HOD, { maxMarks: 0 }).status, 400);
  assert.equal(send(HOD, { maxMarks: 5000 }).status, 400);
  assert.equal(send(HOD, { dueDate: '2026-10-22' }).ok, true);               // today is fine
  const notes = send(HOD, { type: 'Lecture Notes', dueDate: undefined, maxMarks: undefined, branch: 'Civil', semester: 1 });   // class in the request is ignored
  const d = D.findDispatch(notes.id);
  assert.equal(d.branch, 'CSE'); assert.equal(d.semester, 5); assert.equal(d.due_date, null); assert.equal(d.max_marks, null);
  assert.equal(D.createDispatch(stu(S1), { subjectId: CSE5_SUBJECT, type: 'Lecture Notes', title: 'x' }).ok, false);   // students cannot send
  assert.equal((D.createDispatch(parentOfS1, { subjectId: CSE5_SUBJECT, type: 'Lecture Notes', title: 'x' }) as any).status, 403);
});

test('sending: a teacher only for a subject assigned to them; admin for any', () => {
  assert.equal(send(CSE1).status, 403);                // CSE1 teaches another subject
  assert.equal(send(CIVIL).status, 403);
  assert.equal(send(ADMIN).ok, true);
});

test('sending: the file must be yours, unused, and can be used once', () => {
  const mine = upload(HOD);
  const a = send(HOD, { fileId: mine }); assert.ok(a.ok);
  assert.equal(F.findFile(mine).attached_to, `dispatch:${a.id}`);
  assert.equal(send(HOD, { fileId: mine }).status, 400);                      // second use of the same upload fails
  assert.equal(send(HOD, { fileId: upload(CSE1) }).status, 400);              // somebody else's upload
  assert.equal(send(HOD, { fileId: 'f-' + '0'.repeat(24) }).status, 400);
  assert.equal(send(HOD, { fileId: '../../etc/passwd' }).status, 400);
  const before = fs.readdirSync(F.UPLOAD_DIR).length;
  assert.equal(send(HOD, { title: '', fileId: upload(HOD) }).ok, false);     // a failed send leaves the upload pending (swept later), not attached
  assert.equal(fs.readdirSync(F.UPLOAD_DIR).length, before + 1);
});

test('who sees which dispatch', () => {
  const d = task({ title: 'Visible to CSE sem 5' });
  // Sees.
  const sees = (u: any) => titles(D.listFor(u)).includes('Visible to CSE sem 5');
  assert.equal(sees(stu(S1)), true); assert.equal(sees(stu(S2)), true);        // same class
  assert.equal(sees(stu(S3)), false);                                          // CSE semester 3
  assert.equal(sees(stu(CV1)), false);                                         // another branch
  assert.equal(sees(parentOfS1), false);
  assert.equal(sees(HOD), true); assert.equal(sees(ADMIN), true);
  assert.equal(sees(CSE1), false); assert.equal(sees(CIVIL), false);           // teachers of other subjects: not even listed
  assert.equal(D.canSee(stu(S3), d), false);
});

test('submitting: class students only, tasks only, text and / or file', () => {
  const d = task();
  assert.equal(submit(stu(S3), d).status, 404); assert.equal(submit(stu(CV1), d).status, 404);   // other classes: "not found"
  assert.equal(submit(HOD, d).status, 403); assert.equal(submit(parentOfS1, d).status, 403);
  assert.equal(submit(stu(S1), d, { content: '  ' }).status, 400);                               // nothing to hand in
  const notes = D.findDispatch(send(HOD, { type: 'Lecture Notes', dueDate: undefined, maxMarks: undefined }).id);
  assert.equal(submit(stu(S1), notes).status, 400);                                              // notes do not take submissions
  const r = submit(stu(S1), d, { content: 'Answer' }); assert.ok(r.ok); assert.equal(r.created, true);
  const f = submit(stu(S2), d, { fileId: upload(stu(S2)) }); assert.ok(f.ok);                    // file only is fine
  assert.equal(submit(stu(S2), D.findDispatch(d.id), { content: 'x', fileId: upload(stu(S1)) }).status, 400);   // a classmate's upload is not yours
});

test('submitting: the due date is the end of that day in Indian time; resubmitting replaces and removes the old file', () => {
  const d = task();
  const f1 = upload(stu(S1)); assert.ok(submit(stu(S1), d, { content: 'v1', fileId: f1 }).ok);
  assert.equal(F.findFile(f1).attached_to?.startsWith('submission:'), true);
  const f2 = upload(stu(S1), png, 'pic.png');
  const again = submit(stu(S1), d, { content: 'v2', fileId: f2 }); assert.ok(again.ok); assert.equal(again.created, false);
  assert.equal(onDisk(f1), false); assert.equal(F.findFile(f1), undefined); assert.equal(onDisk(f2), true);   // replaced file deleted
  assert.equal((db.prepare('SELECT COUNT(*) n FROM dispatch_submissions WHERE dispatch_id=? AND student_id=?').get(d.id, S1) as any).n, 1);
  assert.equal((db.prepare('SELECT attempts FROM dispatch_submissions WHERE dispatch_id=? AND student_id=?').get(d.id, S1) as any).attempts, 2);
  assert.ok(submit(stu(S2), d, { content: 'last minute' }, AFTER_DUE - 5).ok);                    // 23:59:59 IST on the due date: still open
  assert.equal(submit(stu(S2), d, { content: 'too late' }, AFTER_DUE).status, 403);               // one millisecond later: closed
  assert.equal(submit(stu(S3), d, { content: 'x' }, AFTER_DUE).status, 404);
  assert.equal(D.toDto(d, stu(S1), NOW).closed, false);
});

test('grading: teachers of the subject and admin; marks within 0..max; a graded piece of work is locked', () => {
  const d = task({ maxMarks: 20 });
  const sid = submit(stu(S1), d).id;
  assert.equal(D.gradeSubmission(CSE1, d, sid, { marks: 10 }).ok, false);                        // teacher of another subject
  assert.equal((D.gradeSubmission(CSE1, d, sid, { marks: 10 }) as any).status, 404);
  assert.equal((D.gradeSubmission(stu(S1), d, sid, { marks: 20 }) as any).status, 404);          // the student cannot grade themselves
  for (const bad of [-1, 21, NaN, '15', null, undefined, Infinity]) assert.equal((D.gradeSubmission(HOD, d, sid, { marks: bad }) as any).status, 400, String(bad));
  assert.equal((D.gradeSubmission(HOD, d, 'subm-nope', { marks: 5 }) as any).status, 404);
  assert.ok(D.gradeSubmission(HOD, d, sid, { marks: 17.456, feedback: 'Good' }).ok);
  const mine = D.toDto(d, stu(S1)).submissions[0];
  assert.equal(mine.status, 'Graded'); assert.equal(mine.marksAwarded, 17.46); assert.equal(mine.feedback, 'Good'); assert.equal(mine.maxMarks, 20);
  assert.ok(D.gradeSubmission(ADMIN, d, sid, { marks: 20 }).ok);                                 // admin can re-grade
  assert.equal(submit(stu(S1), d, { content: 'edit after grading' }).status, 409);               // locked
  const other = task(); const osid = submit(stu(S1), other).id;
  assert.equal((D.gradeSubmission(HOD, d, osid, { marks: 5 }) as any).status, 404);              // a submission of a different dispatch
});

test('privacy: a student sees only their own submission; staff see all; no classmates, no parents', () => {
  const d = task();
  submit(stu(S1), d, { content: 'secret S1' }); submit(stu(S2), d, { content: 'secret S2' });
  const asS1 = D.toDto(d, stu(S1));
  assert.equal(asS1.submissions.length, 1); assert.equal(asS1.submissions[0].studentId, S1); assert.equal(asS1.submittedCount, 2);
  assert.ok(!JSON.stringify(asS1).includes('secret S2'));
  assert.equal(D.toDto(d, HOD).submissions.length, 2); assert.equal(D.toDto(d, ADMIN).submissions.length, 2);
  assert.equal(D.toDto(d, stu(S1)).submissions[0].rollNo.length > 0, true);
  assert.ok(!JSON.stringify(D.toDto(d, stu(S1))).includes('f-'), 'no raw file id is sent to the browser');
});

test('files: the teacher\'s file goes to the class and its teachers; a submission file only to its student and the subject\'s teachers', () => {
  const dfile = upload(HOD); const d = D.findDispatch(send(HOD, { fileId: dfile }).id);
  assert.ok(D.openDispatchFile(stu(S1), d.id).ok); assert.ok(D.openDispatchFile(HOD, d.id).ok); assert.ok(D.openDispatchFile(ADMIN, d.id).ok);
  for (const u of [stu(S3), stu(CV1), parentOfS1, CSE1, CIVIL]) assert.equal((D.openDispatchFile(u, d.id) as any).status, 404);
  assert.equal((D.openDispatchFile(HOD, 'disp-nope') as any).status, 404);

  const sf = upload(stu(S1)); const sid = submit(stu(S1), d, { content: 'x', fileId: sf }).id;
  // Open.
  const open = (u: any, did = d.id, s = sid) => D.openSubmissionFile(u, did, s) as any;
  assert.ok(open(stu(S1)).ok); assert.ok(open(HOD).ok); assert.ok(open(ADMIN).ok);
  assert.equal(open(stu(S1)).path, F.fileOnDisk(sf));
  for (const u of [stu(S2), stu(S3), stu(CV1), parentOfS1, CSE1, CIVIL]) assert.equal(open(u).status, 404, u.id);      // classmates and other teachers: not found
  const other = task();
  assert.equal(open(HOD, other.id).status, 404);                                  // right submission id under the wrong dispatch
  const noFile = submit(stu(S2), d, { content: 'text only' });
  assert.equal(open(HOD, d.id, noFile.id).status, 404);
});

test('deleting: sender or admin; files and submissions are removed from disk too', () => {
  const dfile = upload(HOD); const d = D.findDispatch(send(HOD, { fileId: dfile }).id);
  const sf = upload(stu(S1)); const sid = submit(stu(S1), d, { content: 'x', fileId: sf }).id;
  assert.equal((D.deleteDispatch(CSE1, d.id) as any).status, 404);                // another subject's teacher
  assert.equal((D.deleteDispatch(stu(S1), d.id) as any).status, 403);             // a student who can see it cannot delete it
  assert.ok(D.deleteDispatch(HOD, d.id).ok);
  assert.equal(D.findDispatch(d.id), undefined); assert.equal(D.findSubmission(sid), undefined);
  assert.equal(onDisk(dfile), false); assert.equal(onDisk(sf), false);
  assert.equal(F.findFile(dfile), undefined); assert.equal(F.findFile(sf), undefined);
  assert.equal((D.deleteDispatch(HOD, d.id) as any).status, 404);
  const mine = D.findDispatch(send(ADMIN).id);                                    // admin sent it; the HOD (who teaches the subject, but did not send it) cannot delete it
  assert.equal((D.deleteDispatch(HOD, mine.id) as any).status, 403);
  assert.ok(D.deleteDispatch(ADMIN, mine.id).ok);
});

test('a subject that has dispatches cannot be deleted (foreign key)', () => {
  task();
  assert.throws(() => db.prepare('DELETE FROM subjects WHERE id=?').run(CSE5_SUBJECT));
});

test('notifications: new task, submission and grade go to the right people, once, no private text', () => {
  // N.
  const n = (uid: string, kind: string) => db.prepare('SELECT * FROM notifications WHERE user_id=? AND kind=?').all(uid, kind) as any[];
  const before = [n(S1, 'dispatch_new').length, n(S2, 'dispatch_new').length, n(S3, 'dispatch_new').length];
  const d = task({ title: 'Notify me' });
  assert.equal(rules.dispatchCreated(d.id, NOW), 1);                                             // only S1 allowed notifications
  assert.equal(rules.dispatchCreated(d.id, NOW), 0);                                             // the same event never notifies twice
  assert.equal(n(S1, 'dispatch_new').length, before[0] + 1);
  assert.equal(n(S2, 'dispatch_new').length, before[1]);                                         // S2 never allowed notifications
  assert.equal(n(S3, 'dispatch_new').length, before[2]);                                         // other class
  assert.ok(n(S1, 'dispatch_new').at(-1).title.startsWith('New task: Notify me'));

  const hod = n(HOD.id, 'dispatch_submission').length;
  const r = submit(stu(S1), d, { content: 'my private answer 12345' });
  rules.submissionReceived(r.id, NOW);
  const got = n(HOD.id, 'dispatch_submission'); assert.equal(got.length, hod + 1);
  assert.ok(!JSON.stringify(got.at(-1)).includes('private answer'));
  rules.submissionReceived(r.id, NOW); assert.equal(n(HOD.id, 'dispatch_submission').length, hod + 1);   // same attempt: once
  assert.equal(n(CSE1.id, 'dispatch_submission').length, 0);
  const r2 = submit(stu(S1), d, { content: 'second try' }); rules.submissionReceived(r2.id, NOW);
  assert.equal(n(HOD.id, 'dispatch_submission').length, hod + 2);                                // a new attempt is a new event

  assert.equal(rules.submissionGraded(r.id, NOW), 0);                                            // not graded yet
  D.gradeSubmission(HOD, d, r.id, { marks: 15, feedback: 'secret feedback' }, NOW);
  assert.equal(rules.submissionGraded(r.id, NOW), 1);
  const g = n(S1, 'dispatch_graded').at(-1); assert.ok(!JSON.stringify(g).includes('secret feedback') && !JSON.stringify(g).includes('15'));
  assert.equal(rules.submissionGraded(r.id, NOW), 0);
  D.gradeSubmission(HOD, d, r.id, { marks: 16 }, NOW + 1000);                                    // re-graded: told again
  assert.equal(rules.submissionGraded(r.id, NOW), 1);
});
