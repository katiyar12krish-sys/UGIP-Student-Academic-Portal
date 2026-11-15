// Run: npm run test:step4   (throw-away temp database; the push service is replaced by a fake, nothing is sent)
import os from 'os';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.PORTAL_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ugip-step4-'));
process.env.MFA_REQUIRED_ROLES = '';
process.env.VAPID_PUBLIC_KEY = 'x'; process.env.VAPID_PRIVATE_KEY = 'y';
const { db } = await import('../db/connection');
const { seedIfEmpty } = await import('../db/seed');
const svc = await import('../auth/service');
const { seedSubjectsIfEmpty } = await import('../academic/seed');
const ses = await import('../auth/session');
const consent = await import('../auth/consent');
const subs = await import('./subs');
const sender = await import('./sender');
const notif = await import('./service');
const rules = await import('./rules');
const tm = await import('./time');

seedIfEmpty(); seedSubjectsIfEmpty(); svc.seedStaffIfEmpty(); svc.syncStudentUsers();
const NOW = Date.UTC(2026, 9, 21, 5, 0, 0);          // 21 Oct 2026, 10:30 IST (Wednesday)
const NIGHT = Date.UTC(2026, 9, 21, 16, 30, 0);       // 22:00 IST
const DAY = 86400_000;
const ctx = { ip: 't', ua: 't' };
// User of.
const userOf = (id: string) => ses.toSessionUser(db.prepare('SELECT * FROM users WHERE id=?').get(id));
// Pub key.
const pubKey = () => crypto.createECDH('prime256v1').generateKeys().toString('base64url');
// Good sub.
const goodSub = (host = 'fcm.googleapis.com', n = 1) => ({ endpoint: `https://${host}/fcm/send/abc${n}`, keys: { p256dh: pubKey(), auth: crypto.randomBytes(16).toString('base64url') } });
// Unread.
const unread = (uid: string, kind?: string) => (db.prepare(`SELECT COUNT(*) c FROM notifications WHERE user_id=? ${kind ? 'AND kind=?' : ''}`).get(...(kind ? [uid, kind] : [uid])) as any).c as number;

// a class with students, a subject of that class, parents
const cls = db.prepare("SELECT branch, semester FROM students WHERE deleted_at IS NULL GROUP BY branch, semester ORDER BY COUNT(*) DESC LIMIT 1").get() as any;
const students = db.prepare('SELECT id, name FROM students WHERE deleted_at IS NULL AND branch=? AND semester=? ORDER BY roll_no').all(cls.branch, cls.semester) as any[];
const subject = db.prepare('SELECT id, name, code FROM subjects WHERE branch=? AND semester=? LIMIT 1').get(cls.branch, cls.semester) as any;
const [A, B, C] = students;
// Parent of.
const parentOf = (sid: string) => { const p = svc.createParent(sid, { name: 'Parent of ' + sid, relation: 'Father' }, 't') as any; return userOf(p.id); };
const parA = parentOf(A.id);

/** The notification consent: a parent for a minor student, the person themself otherwise. */
const allowFor = (sid: string, on = true) => consent.saveForChild(parentOf_(sid), sid, { notifications: on }, ctx);
const parents = new Map<string, any>([[A.id, parA]]);
// Parent of.
function parentOf_(sid: string) { if (!parents.has(sid)) parents.set(sid, parentOf(sid)); return parents.get(sid); }
// Parent consent.
const parentConsent = (p: any) => consent.saveOwn(p, { service: true, notifications: true }, ctx);

test('push endpoint allow-list (SSRF guard) and key validation', () => {
  for (const ok of ['https://fcm.googleapis.com/fcm/send/x', 'https://updates.push.services.mozilla.com/wpush/v2/x', 'https://web.push.apple.com/x', 'https://wns2-par02p.notify.windows.com/w/?token=x'])
    assert.equal(subs.isAllowedPushEndpoint(ok), true, ok);
  for (const bad of ['http://fcm.googleapis.com/x', 'https://evil.example/x', 'https://fcm.googleapis.com.evil.example/x', 'https://127.0.0.1/x', 'https://localhost/x',
    'https://user:pw@fcm.googleapis.com/x', 'https://fcm.googleapis.com:8443/x', 'https://169.254.169.254/latest', 'ftp://fcm.googleapis.com/x', '', null, 42, 'https://notfcm.googleapis.com.attacker.io/'])
    assert.equal(subs.isAllowedPushEndpoint(bad as any), false, String(bad));
  assert.equal(subs.validSubscription(goodSub()), true);
  assert.equal(subs.validSubscription({ ...goodSub(), keys: { p256dh: 'short', auth: 'short' } }), false);
  assert.equal(subs.validSubscription({ endpoint: 'https://evil.example/x', keys: goodSub().keys }), false);
  assert.equal(subs.validSubscription(null), false);
});

test('devices: max 5, one endpoint belongs to one person, can be removed', () => {
  const u = A.id, other = B.id;
  for (let i = 1; i <= 5; i++) assert.ok(subs.addSubscription(u, goodSub('fcm.googleapis.com', i), 'UA').ok);
  assert.equal(subs.addSubscription(u, goodSub('fcm.googleapis.com', 6), 'UA').ok, false);
  assert.ok(subs.addSubscription(u, { ...goodSub('fcm.googleapis.com', 1) }, 'UA').ok);            // same endpoint again = refresh, not a 6th device
  assert.equal(subs.listDevices(u).length, 5);
  const ep = (subs.subsOf(u)[0]).endpoint;
  assert.ok(subs.addSubscription(other, { endpoint: ep, keys: goodSub().keys }, 'UA').ok);          // shared computer: it moves to the new person
  assert.equal(subs.subsOf(u).length, 4); assert.equal(subs.subsOf(other).length, 1);
  assert.equal(subs.removeById(u, (subs.subsOf(other)[0]).id), false);                               // cannot remove someone else's device
  subs.dropAllNotificationData(u); subs.dropAllNotificationData(other);
  assert.equal(subs.listDevices(u).length, 0);
});

test('nothing is created without the person\'s (or parent\'s) consent; the same event never repeats', () => {
  const n = { kind: 'test', title: 't', body: 'b', dedupeKey: 'k1' };
  assert.equal(notif.notifyUser(A.id, n, NOW), false);                                              // minor student, no consent yet
  assert.equal(allowFor(A.id).ok, true);                                                            // the parent agrees
  assert.equal(notif.notifyUser(A.id, n, NOW), true);
  assert.equal(notif.notifyUser(A.id, n, NOW), false);                                              // duplicate
  assert.equal(notif.notifyUser(B.id, { ...n, dedupeKey: 'k2' }, NOW), false);                       // B has not agreed
  assert.deepEqual(parA && notif.parentsOf(A.id), [parA.id]);
});

test('exam reminders: tomorrow and today, class + parents, no repeats, no old / odd dates', () => {
  allowFor(B.id); allowFor(C.id);
  assert.ok(parentConsent(parA).ok);
  // Ins.
  const ins = (id: string, date: string | null, status = 'Upcoming') => db.prepare("INSERT INTO tests (id,title,type,subject_id,max_marks,date,time_slot,room,status,branch,semester) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
    .run(id, 'Unit Test 1', 'Unit Test', subject.id, 20, date, '10:00 AM', '12', status, cls.branch, cls.semester);
  ins('ex-tomorrow', '2026-10-22'); ins('ex-later', '2026-10-25'); ins('ex-past', '2026-10-20'); ins('ex-done', '2026-10-22', 'Completed'); ins('ex-odd', 'next Monday'); ins('ex-null', null);
  const created = rules.examReminders(NOW);
  assert.equal(created, 3 + 1);                                                                      // A, B, C (3 students with consent) + A's parent
  assert.equal(unread(A.id, 'exam_reminder'), 1); assert.equal(unread(parA.id, 'exam_reminder'), 1);
  const row = db.prepare("SELECT * FROM notifications WHERE user_id=? AND kind='exam_reminder'").get(A.id) as any;
  assert.match(row.title, /^Exam tomorrow: /); assert.match(row.body, /Unit Test 1 · 10:00 AM · Room 12/);
  assert.equal(rules.examReminders(NOW + 3600_000), 0);                                              // run again an hour later: nothing new
  assert.equal(rules.examReminders(NOW + DAY), 4);                                                   // the next day: "today"
  assert.match((db.prepare("SELECT title FROM notifications WHERE user_id=? AND dedupe_key LIKE 'exam:ex-tomorrow:0'").get(A.id) as any).title, /^Exam today/);
  assert.equal(rules.examReminders(NOW + 2 * DAY), 0);                                               // passed
});

test('marks added: student and parent are told, never the marks, only first-time entries', () => {
  db.prepare("INSERT INTO tests (id,title,type,subject_id,max_marks,branch,semester) VALUES ('mk1','Mid Sem','Mid Term',?,50,?,?)").run(subject.id, cls.branch, cls.semester);
  db.prepare("INSERT INTO test_marks (test_id,student_id,marks_obtained) VALUES ('mk1',?,43)").run(A.id);
  assert.equal(rules.marksPublished('mk1', [A.id], NOW), 2);
  const r = db.prepare("SELECT title, body FROM notifications WHERE user_id=? AND kind='marks_published'").get(A.id) as any;
  assert.equal(r.title, 'New marks added'); assert.ok(!/\d{2}/.test(r.title + r.body.replace(/Mid Sem/, '')) && !r.body.includes('43'));
  assert.equal(rules.marksPublished('mk1', [A.id], NOW), 0);
  assert.equal(rules.marksPublished('nope', [A.id], NOW), 0);
  assert.equal(rules.marksPublished('mk1', ['stu-ghost'], NOW), 0);
});

// Session.
const session = (id: string, closedAt: number | null, status = 'Closed', expires = closedAt ?? NOW) => db.prepare(
  `INSERT INTO attendance_sessions (id,subject_id,faculty_id,branch,semester,date,time_slot,topic,qr_token,pin,status,expires_at,created_at,closed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
  .run(id, subject.id, 'fac', cls.branch, cls.semester, '2026-10-21', '9-10', 't', 'qr-' + id, '1234', status, expires, NOW - 7200_000, closedAt);
// Rec.
const rec = (sid: string, stu: string, status: string) => db.prepare("INSERT INTO attendance_records (session_id,student_id,status,marked_via,marked_by,marked_at) VALUES (?,?,?,'Manual','t',?)").run(sid, stu, status, NOW);

test('absence: only the parents of students who were not present, only for recent closed sessions', () => {
  session('s-new', NOW - 3600_000); rec('s-new', A.id, 'Present'); rec('s-new', B.id, 'Absent');       // C has no record at all
  session('s-old', NOW - 10 * 3600_000);                                                               // closed 10 h ago: ignored
  session('s-open', null, 'Active', NOW - 60_000);                                                     // time ran out, never closed: the rule closes it
  const parB = parentOf_(B.id), parC = parentOf_(C.id);
  assert.ok(parentConsent(parB).ok); assert.ok(parentConsent(parC).ok);
  rules.absenceAlerts(NOW);
  assert.equal(unread(parA.id, 'absent'), 1);                                                          // from s-open (A has no record there)
  assert.equal(unread(parB.id, 'absent'), 2); assert.equal(unread(parC.id, 'absent'), 2);              // s-new + s-open
  const m = db.prepare("SELECT body FROM notifications WHERE user_id=? AND dedupe_key=?").get(parB.id, `abs:s-new:${B.id}`) as any;
  assert.match(m.body, new RegExp(`${subject.code}`)); assert.ok(!m.body.includes(B.name.split(' ').slice(1).join(' ')) || B.name.split(' ').length === 1);   // first name only
  assert.equal((db.prepare("SELECT status FROM attendance_sessions WHERE id='s-open'").get() as any).status, 'Closed');
  assert.equal(rules.absenceAlerts(NOW + 600_000), 0);
  assert.equal((db.prepare("SELECT COUNT(*) c FROM notifications WHERE dedupe_key LIKE 'abs:s-old:%'").get() as any).c, 0);
});

test('low attendance: below 75% after 5 lectures, once a week', () => {
  for (let i = 1; i <= 4; i++) session('lo' + i, NOW - 5 * DAY);                                        // 7 closed sessions in total with s-new, s-old, s-open
  for (const sid of ['lo1', 'lo2']) rec(sid, C.id, 'Present');                                          // C: 2 of 7
  for (const sid of ['lo1', 'lo2', 'lo3', 'lo4', 's-old', 's-open']) rec(sid, B.id, 'Present');         // B: 6 of 7 (absent in s-new)
  const parC = parentOf_(C.id);
  assert.equal(rules.lowAttendance(NOW) >= 2, true);
  assert.equal(unread(C.id, 'low_attendance'), 1);
  assert.match((db.prepare("SELECT body FROM notifications WHERE user_id=? AND kind='low_attendance'").get(C.id) as any).body, /29% \(minimum 75%\)/);
  assert.equal(unread(parC.id, 'low_attendance'), 1);
  assert.equal(unread(B.id, 'low_attendance'), 0);                                                      // 86%
  assert.equal(rules.lowAttendance(NOW + DAY), 0);                                                      // same week (Wed -> Thu): not again
  assert.ok(rules.lowAttendance(NOW + 6 * DAY) >= 2);                                                   // next Monday: a new week
  process.env.ATTENDANCE_MIN_PERCENT = '90';
  assert.ok(rules.lowAttendance(NOW + 14 * DAY) >= 1); delete process.env.ATTENDANCE_MIN_PERCENT;     // the limit can be changed in .env
});

test('IST helpers: date, week, quiet hours', () => {
  assert.deepEqual(tm.istParts(Date.UTC(2026, 9, 21, 20, 0, 0)).date, '2026-10-22');                  // 01:30 IST next day
  assert.equal(tm.istParts(NOW).weekStart, '2026-10-19');
  assert.equal(tm.daysUntil('2026-10-22', NOW), 1);
  assert.equal(tm.quietHours(Date.UTC(2026, 9, 21, 1, 29)), true);       // 06:59
  assert.equal(tm.quietHours(Date.UTC(2026, 9, 21, 1, 30)), false);      // 07:00
  assert.equal(tm.quietHours(Date.UTC(2026, 9, 21, 15, 29)), false);     // 20:59
  assert.equal(tm.quietHours(Date.UTC(2026, 9, 21, 15, 30)), true);      // 21:00
});

// ------------------------------------------------------------------ delivery
type Call = { endpoint: string; title: string; body: string };
// Fake.
function fake(result: (c: Call, i: number) => any) {
  const calls: Call[] = [];
  sender.setPushSender(async (sub, msg) => { calls.push({ endpoint: sub.endpoint, title: msg.title, body: msg.body }); return result(calls[calls.length - 1], calls.length - 1); });
  return calls;
}
// Reset.
const reset = () => { db.prepare('DELETE FROM notifications').run(); db.prepare('DELETE FROM push_subscriptions').run(); };
// Mk.
const mk = (uid: string, key: string, at = NOW) => notif.notifyUser(uid, { kind: 'test', title: 'T ' + key, body: 'body', url: '/', dedupeKey: key }, at);
// State.
const state = (uid: string, key: string) => (db.prepare('SELECT push_state s, push_attempts a FROM notifications WHERE user_id=? AND dedupe_key=?').get(uid, key) as any);

test('delivery: sent in the daytime, held at night, never to a person without a device', async () => {
  reset(); const calls = fake(() => ({ ok: true }));
  subs.addSubscription(A.id, goodSub('fcm.googleapis.com', 11), 'UA'); subs.addSubscription(A.id, goodSub('updates.push.services.mozilla.com', 12), 'UA');
  mk(A.id, 'd1', NIGHT); mk(parA.id, 'd2', NIGHT);                                                      // parA has no device
  let r = await notif.deliverPending(NIGHT);
  assert.deepEqual(r, { sent: 0, skipped: 0, waiting: 2 }); assert.equal(calls.length, 0);               // 22:00 IST: held
  r = await notif.deliverPending(NIGHT + 13 * 3600_000 - 31 * 60_000);                                  // 10:29 IST next morning... still within 24 h
  assert.equal(r.sent, 1); assert.equal(r.skipped, 1);
  assert.equal(calls.length, 2);                                                                         // both of A's devices
  assert.equal(state(A.id, 'd1').s, 'sent'); assert.equal(state(parA.id, 'd2').s, 'skipped');
  assert.deepEqual((await notif.deliverPending(NOW + DAY)).sent, 0);                                    // nothing left to do
});

test('delivery: dead devices are removed, temporary failures retried then given up, old messages dropped', async () => {
  reset();
  const dead = goodSub('fcm.googleapis.com', 21), live = goodSub('fcm.googleapis.com', 22);
  subs.addSubscription(A.id, dead, 'UA'); subs.addSubscription(A.id, live, 'UA');
  fake((c) => (c.endpoint === dead.endpoint ? { ok: false, gone: true, error: '410' } : { ok: true }));
  mk(A.id, 'g1');
  assert.equal((await notif.deliverPending(NOW)).sent, 1);
  assert.deepEqual(subs.subsOf(A.id).map((x) => x.endpoint), [live.endpoint]);                           // the 410 device is forgotten

  reset(); subs.addSubscription(A.id, goodSub('fcm.googleapis.com', 31), 'UA');
  fake(() => ({ ok: false, gone: false, error: '503' }));
  mk(A.id, 't1');
  assert.equal((await notif.deliverPending(NOW)).waiting, 1); assert.equal(state(A.id, 't1').a, 1);
  assert.equal((await notif.deliverPending(NOW)).waiting, 1);
  assert.equal((await notif.deliverPending(NOW)).skipped, 1); assert.equal(state(A.id, 't1').s, 'skipped');   // 3rd failure: give up
  assert.equal(subs.subsOf(A.id).length, 1);                                                                    // (3 failures are not enough to drop the device)

  reset(); subs.addSubscription(A.id, goodSub('fcm.googleapis.com', 41), 'UA');
  const calls = fake(() => ({ ok: true }));
  mk(A.id, 'old', NOW - 25 * 3600_000);
  assert.equal((await notif.deliverPending(NOW)).skipped, 1); assert.equal(calls.length, 0);               // a day-old reminder is no longer useful
});

test('delivery: consent withdrawn means nothing more is sent and devices are forgotten', async () => {
  reset(); const calls = fake(() => ({ ok: true }));
  subs.addSubscription(A.id, goodSub('fcm.googleapis.com', 51), 'UA');
  mk(A.id, 'w1');
  assert.equal(consent.saveForChild(parA, A.id, { notifications: false }, ctx).ok, true);                  // parent withdraws
  assert.equal(subs.subsOf(A.id).length, 0); assert.equal(state(A.id, 'w1').s, 'skipped');
  assert.equal((await notif.deliverPending(NOW)).sent, 0); assert.equal(calls.length, 0);
  assert.equal(mk(A.id, 'w2'), false);                                                                      // and nothing new is created
  allowFor(A.id);                                                                                            // switched on again later
  assert.equal(mk(A.id, 'w3'), true);
});

test('delivery: without VAPID keys the in-app list still works and the queue does not pile up', async () => {
  reset(); const k = process.env.VAPID_PRIVATE_KEY; process.env.VAPID_PRIVATE_KEY = '';
  mk(A.id, 'n1');
  assert.equal((await notif.deliverPending(NOW)).skipped, 1);
  assert.equal(unread(A.id), 1);
  process.env.VAPID_PRIVATE_KEY = k;
});

test('purge removes notifications older than 90 days', () => {
  reset(); mk(A.id, 'p1', NOW - 91 * DAY); mk(A.id, 'p2', NOW - DAY);
  notif.purgeOldNotifications(NOW);
  assert.equal(unread(A.id), 1);
});
