// Run: npm run test:comms   (throw-away temp database; nothing is sent anywhere)
import os from 'os';
import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.PORTAL_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ugip-comms-'));
process.env.MFA_REQUIRED_ROLES = '';
const { db } = await import('../db/connection');
const { seedIfEmpty } = await import('../db/seed');
const { seedSubjectsIfEmpty } = await import('../academic/seed');
const svc = await import('../auth/service');
const ses = await import('../auth/session');
const consent = await import('../auth/consent');
const C = await import('./service');
const rules = await import('../notify/rules');

seedIfEmpty(); seedSubjectsIfEmpty(); svc.seedStaffIfEmpty(); svc.syncStudentUsers();
// User.
const user = (id: string) => ses.toSessionUser(db.prepare('SELECT * FROM users WHERE id=?').get(id));
const ctx = { ip: 't', ua: 't' };
const NOW = Date.UTC(2026, 9, 21, 5, 0, 0);                 // 21 Oct 2026, 10:30 IST

// Seed staff: HOD CSE teaches CSE sem 3 + 5; fac-cse-1 only CSE sem 1; fac-civil teaches Civil sem 1, 3, 5.
const ADMIN = user('usr-admin-1'), HOD = user('fac-hod-cse'), CSE1 = user('fac-cse-1'), CIVIL = user('fac-civil');
const cse5 = (db.prepare("SELECT id FROM students WHERE deleted_at IS NULL AND branch='CSE' AND semester=5 ORDER BY roll_no").all() as any[]).map((r) => r.id);
const civ5 = (db.prepare("SELECT id FROM students WHERE deleted_at IS NULL AND branch='Civil' AND semester=5 ORDER BY roll_no").all() as any[]).map((r) => r.id);
const [S1, S2] = cse5, [CV1] = civ5;
// Stu.
const stu = (id: string) => user(id);
// Parent of s1.
const parentOfS1 = (() => { const p = svc.createParent(S1, { name: 'Parent', relation: 'Father' }, 't') as any; return user(p.id); })();

// students are marked 18+ so they can allow notifications themselves; staff and S1/S2/CV1 allow
for (const id of [...cse5, ...civ5]) db.prepare('UPDATE users SET adult_verified=1 WHERE id=?').run(id);
for (const id of [S1, S2, CV1, 'fac-hod-cse', 'fac-cse-1']) consent.saveOwn(user(id), { service: true, notifications: true }, ctx);
// Notes.
const notes = (uid: string, kind?: string) => db.prepare(`SELECT * FROM notifications WHERE user_id=? ${kind ? 'AND kind=?' : ''}`).all(...(kind ? [uid, kind] : [uid])) as any[];

const base = { title: 'Mid-term schedule', category: 'Exam', priority: 'High', content: 'Details inside.', targetBranch: 'CSE', targetSemesters: [5] };
// Mk.
const mk = (u: any, over: any = {}) => { const r = C.createNotice(u, { ...base, ...over }, NOW) as any; assert.ok(r.ok, JSON.stringify(r)); return r.id as string; };
// Titles.
const titles = (list: any[]) => list.map((n) => n.title);

test('notices: input is checked', () => {
  // Bad.
  const bad = (over: any, msg: RegExp) => { const r = C.createNotice(ADMIN, { ...base, ...over }, NOW) as any; assert.equal(r.ok, false); assert.equal(r.status, 400); assert.match(r.error, msg); };
  bad({ title: '  ' }, /Title/); bad({ content: '' }, /text/); bad({ category: 'Gossip' }, /category/); bad({ priority: 'Whenever' }, /priority/);
  bad({ targetBranch: 'Mechanical' }, /branch/); bad({ targetSemesters: [7] }, /1 to 6/); bad({ targetSemesters: ['5'] }, /1 to 6/); bad({ targetSemesters: 5 }, /1 to 6/);
  bad({ category: 'Placement', targetSemesters: [] }, /semester/);                       // a placement notice must name its semesters
  assert.equal((C.createNotice(stu(S1), base, NOW) as any).status, 403);                 // a student cannot publish
  assert.equal((C.createNotice(parentOfS1, base, NOW) as any).status, 403);
  const long = C.createNotice(ADMIN, { ...base, title: 'x'.repeat(500) }, NOW) as any; assert.ok(long.ok);
  assert.equal((C.findNotice(long.id)).title.length, 200);                                // trimmed, not rejected
});

test('notices: a teacher publishes only to classes they teach; "published by" cannot be faked', () => {
  const id = mk(HOD, { publishedBy: 'Principal of the College' });                       // HOD teaches CSE sem 5
  assert.equal(C.findNotice(id).published_by, `${HOD.name} (Faculty)`);                  // the typed name is ignored for teachers
  for (const over of [{ targetBranch: 'Civil' }, { targetBranch: 'All', targetSemesters: [] }, { targetSemesters: [] }, { targetSemesters: [4, 5] }, { targetBranch: 'All' }])
    assert.equal((C.createNotice(HOD, { ...base, ...over }, NOW) as any).status, 403, JSON.stringify(over));
  assert.equal((C.createNotice(CSE1, base, NOW) as any).status, 403);                    // teaches CSE sem 1, not sem 5
  assert.ok((C.createNotice(CSE1, { ...base, targetSemesters: [1] }, NOW) as any).ok);
  const a = mk(ADMIN, { targetBranch: 'All', targetSemesters: [], publishedBy: 'Controller of Examinations' });
  assert.equal(C.findNotice(a).published_by, 'Controller of Examinations');             // admin may name an office
  assert.equal((C.createNotice(ADMIN, { ...base, publishedBy: undefined }, NOW) as any).ok, true);
});

test('notices: who reads what (class, parent, staff, and visitors who are not logged in)', () => {
  const forCse5 = mk(ADMIN, { title: 'CSE 5 only' });
  const forCiv5 = mk(ADMIN, { title: 'Civil 5 only', targetBranch: 'Civil' });
  const forSem5All = mk(ADMIN, { title: 'Sem 5 every branch', targetBranch: 'All', targetSemesters: [5] });
  const forSem1 = mk(ADMIN, { title: 'Sem 1 only', targetSemesters: [1] });
  const everyone = mk(ADMIN, { title: 'Everyone', targetBranch: 'All', targetSemesters: [], category: 'Academic' });
  const placement = mk(ADMIN, { title: 'Placement drive', category: 'Placement', targetBranch: 'All', targetSemesters: [5] });
  void forCse5; void forCiv5; void forSem5All; void forSem1; void everyone; void placement;
  const s = titles(C.listNoticesFor(stu(S1)));
  assert.ok(s.includes('CSE 5 only') && s.includes('Sem 5 every branch') && s.includes('Everyone') && s.includes('Placement drive'));
  assert.ok(!s.includes('Civil 5 only') && !s.includes('Sem 1 only'));                  // other class: not even in the list
  const c = titles(C.listNoticesFor(stu(CV1)));
  assert.ok(c.includes('Civil 5 only') && !c.includes('CSE 5 only'));
  const p = titles(C.listNoticesFor(parentOfS1));                                        // parent: the child's class
  assert.ok(p.includes('CSE 5 only') && !p.includes('Civil 5 only'));
  const all = titles(C.listNoticesFor(HOD));                                             // staff see everything
  assert.ok(all.includes('Civil 5 only') && all.includes('Sem 1 only'));
  const pub = titles(C.publicNotices());                                                 // not logged in: only what is for everybody
  assert.ok(pub.includes('Everyone')); assert.ok(!pub.includes('CSE 5 only') && !pub.includes('Placement drive') && !pub.includes('Sem 5 every branch'));
  assert.ok(!JSON.stringify(C.publicNotices()).includes('"mine"') || C.publicNotices().every((n: any) => n.mine === undefined));
  assert.equal(C.listNoticesFor(stu(S1)).find((n: any) => n.title === 'CSE 5 only')!.date, '2026-10-21');
});

test('notices: delete - a teacher only their own, admin any', () => {
  const mineId = mk(HOD, { title: 'HOD notice' }), adminId = mk(ADMIN, { title: 'Admin notice' });
  assert.equal((C.deleteNotice(CIVIL, mineId) as any).status, 403);                      // another teacher
  assert.equal((C.deleteNotice(HOD, adminId) as any).status, 403);                       // not the admin's notice
  assert.equal((C.deleteNotice(stu(S1), mineId) as any).status, 403);
  assert.ok(C.deleteNotice(HOD, mineId).ok); assert.ok(C.deleteNotice(ADMIN, adminId).ok);
  assert.equal((C.deleteNotice(ADMIN, adminId) as any).status, 404);
  assert.ok(!titles(C.listNoticesFor(stu(S1))).includes('HOD notice'));
  const own = mk(HOD, { title: 'Own notice marker' });
  assert.equal(C.listNoticesFor(HOD).find((n: any) => n.id === own)!.mine, true);          // the screen can show "delete" only on these
  assert.equal(C.listNoticesFor(CIVIL).find((n: any) => n.id === own)!.mine, false);
});

test('direct notices: a teacher writes only to students of classes they teach; a student reads only their own', () => {
  // Send.
  const send = (u: any, sid: string, over: any = {}) => C.createDirectNotice(u, { studentId: sid, title: 'Lab file', message: 'Please submit the lab file.', priority: 'urgent', ...over }, NOW) as any;
  assert.ok(send(HOD, S1).ok);
  assert.equal(send(HOD, CV1).status, 403);                                              // Civil student: HOD does not teach Civil
  assert.equal(send(CSE1, S1).status, 403);                                              // fac-cse-1 teaches CSE sem 1 only
  assert.ok(send(ADMIN, CV1).ok);
  assert.equal(send(stu(S1), S2).status, 403);
  assert.equal(send(HOD, 'nobody').status, 404);
  assert.equal(send(HOD, S1, { title: '' }).status, 400); assert.equal(send(HOD, S1, { priority: 'panic' }).status, 400);
  assert.deepEqual(C.listDirectFor(stu(S1)).map((d: any) => d.sentByName), [HOD.name]);  // S1 sees theirs
  assert.deepEqual(C.listDirectFor(stu(S2)), []);                                        // S2 sees none
  assert.equal(C.listDirectFor(HOD).length, 1); assert.equal(C.listDirectFor(CIVIL).length, 0);   // teachers see what they sent
  assert.equal(C.listDirectFor(ADMIN).length, 2); assert.deepEqual(C.listDirectFor(parentOfS1).map((d: any) => d.id), C.listDirectFor(stu(S1)).map((d: any) => d.id));   // Step 14: a parent reads the child's notices (read-only)
  const id = C.listDirectFor(stu(S1))[0].id;
  assert.equal((C.markDirectRead(stu(S2), id) as any).status, 404);                      // someone else's notice
  assert.equal(C.listDirectFor(stu(S1))[0].isRead, false);
  assert.ok(C.markDirectRead(stu(S1), id).ok); assert.equal(C.listDirectFor(stu(S1))[0].isRead, true);
  assert.equal(C.listDirectFor(stu(S1))[0].sentByRole, 'faculty');                       // role and name come from the login
});

test('doubts: a student asks only about their own class; only that subject\'s teachers (and admin) can open it', () => {
  // Ask.
  const ask = (u: any, subjectId: string, over: any = {}) => C.askDoubt(u, { subjectId, questionTitle: 'AVL rotation', questionDetails: 'How is LR handled?', ...over }, NOW) as any;
  assert.equal(ask(stu(S1), 'sub-ce-501').status, 400);                                  // another branch's subject
  assert.equal(ask(stu(S1), 'sub-cse-301').status, 400);                                 // own branch, other semester
  assert.equal(ask(stu(S1), 'nope').status, 400);
  assert.equal(ask(stu(S1), 'sub-cse-501', { questionTitle: ' ' }).status, 400);
  assert.equal(ask(HOD, 'sub-cse-501').status, 403); assert.equal(ask(ADMIN, 'sub-cse-501').status, 403);
  const r = ask(stu(S1), 'sub-cse-501'); assert.ok(r.ok);
  const d = C.findDoubt(r.id);
  assert.equal(d.status, 'Pending'); assert.equal(d.branch, 'CSE'); assert.equal(d.semester, 5);   // class copied from the subject
  assert.ok(C.canSeeDoubt(stu(S1), d)); assert.ok(C.canSeeDoubt(HOD, d)); assert.ok(C.canSeeDoubt(ADMIN, d));
  assert.equal(C.canSeeDoubt(stu(S2), d), false);                                        // a classmate cannot read it
  assert.equal(C.canSeeDoubt(CSE1, d), false);                                           // another teacher cannot
  assert.equal(C.canSeeDoubt(CIVIL, d), false); assert.equal(C.canSeeDoubt(parentOfS1, d), false);
  assert.equal(C.listDoubtsFor(stu(S2)).length, 0); assert.equal(C.listDoubtsFor(CSE1).length, 0);
  assert.equal(C.listDoubtsFor(stu(S1)).length, 1); assert.equal(C.listDoubtsFor(HOD).length, 1); assert.equal(C.listDoubtsFor(ADMIN).length, 1);
  assert.equal((C.replyDoubt(stu(S2), d, 'hi', NOW) as any).status, 404);
  assert.equal((C.replyDoubt(CSE1, d, 'hi', NOW) as any).status, 404);
  assert.equal((C.resolveDoubt(stu(S2), d, NOW) as any).status, 404);
  const dto = C.toDoubtDto(d);
  assert.equal(dto.expertFacultyName, HOD.name); assert.equal(dto.year, 3);
});

test('doubts: the conversation, its status, and who the sender is', () => {
  const r = C.askDoubt(stu(S1), { subjectId: 'sub-cse-501', questionTitle: 'Q', questionDetails: 'D' }, NOW) as any;
  let d = C.findDoubt(r.id);
  assert.ok(C.replyDoubt(stu(S1), d, 'one more detail', NOW + 1000).ok);
  d = C.findDoubt(r.id); assert.equal(d.status, 'Pending');                              // the student writing does not make it "answered"
  assert.equal((C.replyDoubt(HOD, d, '   ', NOW) as any).status, 400);
  assert.ok(C.replyDoubt(HOD, d, 'Think about the balance factor.', NOW + 2000).ok);
  d = C.findDoubt(r.id); assert.equal(d.status, 'In Discussion');
  const t = C.toDoubtDto(d);
  assert.deepEqual(t.replies.map((x: any) => [x.senderRole, x.senderName]), [['student', stu(S1).name], ['faculty', HOD.name]]);   // names come from the login
  assert.ok(C.resolveDoubt(HOD, d, NOW + 3000).ok); d = C.findDoubt(r.id); assert.equal(d.status, 'Resolved');
  assert.equal((C.resolveDoubt(HOD, d, NOW + 4000) as any).changed, false);               // closing twice changes nothing
  assert.ok(C.replyDoubt(HOD, d, 'one more hint', NOW + 5000).ok); assert.equal(C.findDoubt(r.id).status, 'Resolved');   // a teacher's note does not reopen
  assert.ok(C.replyDoubt(stu(S1), C.findDoubt(r.id), 'Still stuck', NOW + 6000).ok); assert.equal(C.findDoubt(r.id).status, 'In Discussion');   // the student's follow-up does
  assert.ok(C.resolveDoubt(stu(S1), C.findDoubt(r.id), NOW + 7000).ok);                   // the student can close their own
  assert.equal(C.findDoubt(r.id).status, 'Resolved');
  assert.equal(C.listDoubtsFor(stu(S1))[0].id, r.id);                                     // latest activity first
});

test('notifications: right people, no content on the lock screen, never twice, only with consent', () => {
  // Before.
  const before = (uid: string, k: string) => notes(uid, k).length;
  // a Normal notice creates nothing; a High one reaches the class (S1, S2 allowed; Civil student does not belong)
  const normal = mk(ADMIN, { title: 'Quiet one', priority: 'Normal' });
  assert.equal(rules.noticePublished(normal, NOW), 0);
  const high = mk(ADMIN, { title: 'Hall tickets ready', priority: 'Urgent' });
  assert.equal(rules.noticePublished(high, NOW), 2);
  assert.equal(rules.noticePublished(high, NOW + 1), 0);                                  // the same notice never repeats
  assert.equal(notes(CV1, 'notice').filter((n) => n.title.includes('Hall tickets')).length, 0);
  assert.match(notes(S1, 'notice').find((n) => n.dedupe_key === `notice:${high}`)!.title, /^Urgent notice: Hall tickets ready/);
  // direct notice: the phone only says there is a message
  const dn = (C.createDirectNotice(HOD, { studentId: S1, title: 'Attendance shortage', message: 'Your attendance is 61%.', priority: 'urgent' }, NOW) as any).id;
  assert.equal(rules.directNoticeSent(dn, NOW), 1); assert.equal(rules.directNoticeSent(dn, NOW), 0);
  const n = notes(S1, 'direct_notice').pop()!; assert.ok(!/61|shortage/i.test(n.title + n.body));
  // doubts
  const d = (C.askDoubt(stu(S1), { subjectId: 'sub-cse-501', questionTitle: 'Secret question', questionDetails: 'private details' }, NOW) as any).id;
  const hodBefore = before(HOD.id, 'doubt_new');
  assert.equal(rules.doubtAsked(d, NOW), 1);                                              // only HOD teaches sub-cse-501 (consent given)
  assert.equal(before(HOD.id, 'doubt_new') - hodBefore, 1); assert.equal(notes(CSE1.id, 'doubt_new').length, 0); assert.equal(notes(CIVIL.id, 'doubt_new').length, 0);
  assert.ok(!notes(HOD.id, 'doubt_new').some((x) => /Secret|private/.test(x.title + x.body)));
  const reply = (C.replyDoubt(HOD, C.findDoubt(d), 'See chapter 4', NOW + 1000) as any).replyId;
  assert.equal(rules.doubtReplied(d, reply, NOW + 1000), 1);                              // teacher -> student
  assert.equal(rules.doubtReplied(d, reply, NOW + 1000), 0);
  assert.ok(!/chapter 4/.test(notes(S1, 'doubt_reply').pop()!.body));
  const back = (C.replyDoubt(stu(S1), C.findDoubt(d), 'Thanks!', NOW + 2000) as any).replyId;
  assert.equal(rules.doubtReplied(d, back, NOW + 2000), 1);                               // student -> the teachers
  assert.equal(rules.doubtResolved(d, S1, NOW + 3000), 0);                                // a student closing their own: no message
  assert.equal(rules.doubtResolved(d, HOD.id, NOW + 3000), 1);                            // a teacher closing: the student is told
  assert.equal(rules.doubtResolved(d, HOD.id, NOW + 3001), 0);
  // a person who has not allowed notifications gets nothing
  const quiet = cse5.find((id) => id !== S1 && id !== S2)!;
  const hi2 = mk(ADMIN, { title: 'Another notice', priority: 'High' }); rules.noticePublished(hi2, NOW);
  assert.equal(notes(quiet).length, 0);
});

test('doubts and notices of a deleted subject class are not mixed: a student moved to another class stops seeing the old class notices', () => {
  const id = mk(ADMIN, { title: 'Only for CSE sem 5 (late)', targetSemesters: [5] });
  assert.ok(titles(C.listNoticesFor(stu(S2))).includes('Only for CSE sem 5 (late)'));
  db.prepare("UPDATE students SET semester=6 WHERE id=?").run(S2);
  assert.ok(!titles(C.listNoticesFor(stu(S2))).includes('Only for CSE sem 5 (late)'));
  db.prepare("UPDATE students SET semester=5 WHERE id=?").run(S2);
  void id;
});
