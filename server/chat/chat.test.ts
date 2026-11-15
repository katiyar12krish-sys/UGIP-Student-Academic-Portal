// Run: npm run test:chat   (throw-away temp database; nothing is sent anywhere)
import os from 'os';
import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.PORTAL_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ugip-chat-'));
process.env.MFA_REQUIRED_ROLES = '';
const { db } = await import('../db/connection');
const { seedIfEmpty } = await import('../db/seed');
const { seedSubjectsIfEmpty } = await import('../academic/seed');
const svc = await import('../auth/service');
const ses = await import('../auth/session');
const consent = await import('../auth/consent');
const C = await import('./service');
const F = await import('../files/store');

seedIfEmpty(); seedSubjectsIfEmpty(); svc.seedStaffIfEmpty(); svc.syncStudentUsers();
// User.
const user = (id: string) => ses.toSessionUser(db.prepare('SELECT * FROM users WHERE id=?').get(id));
const ctx = { ip: 't', ua: 't' };
const NOW = Date.UTC(2026, 9, 21, 5, 0, 0);

// Seed staff: HOD CSE teaches CSE sem 3 + 5; fac-cse-1 only CSE sem 1; fac-civil teaches Civil sem 1, 3, 5.
const ADMIN = user('usr-admin-1'), HOD = user('fac-hod-cse'), CSE1 = user('fac-cse-1'), CIVIL = user('fac-civil');
const cse5 = (db.prepare("SELECT id FROM students WHERE deleted_at IS NULL AND branch='CSE' AND semester=5 ORDER BY roll_no").all() as any[]).map((r) => r.id);
const civ5 = (db.prepare("SELECT id FROM students WHERE deleted_at IS NULL AND branch='Civil' AND semester=5 ORDER BY roll_no").all() as any[]).map((r) => r.id);
const [S1, S2] = cse5, [CV1] = civ5;
// Stu.
const stu = (id: string) => user(id);
// Mk parent.
const mkParent = (sid: string, relation = 'Father') => { const p = svc.createParent(sid, { name: 'Parent of ' + sid, relation }, 't') as any; return user(p.id); };
const P1 = mkParent(S1), P2 = mkParent(S2, 'Mother'), PCV = mkParent(CV1);
// Open.
const open = (u: any, other: any, studentId?: string) => C.openThread(u, { userId: other.id, studentId }, NOW) as any;

// small files: a webm voice note, a png, a pdf
const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(200, 1)]);
const m4a = Buffer.concat([Buffer.alloc(4), Buffer.from('ftypM4A '), Buffer.alloc(100)]);
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(50)]);
const pdf = Buffer.from('%PDF-1.4\n' + 'x'.repeat(100));

test('who may chat: parents only with the child teachers / admin / the child; students with teachers and their own branch; staff with staff', () => {
  assert.ok(open(P1, HOD).ok);                    // parent of a CSE-5 student -> HOD teaches CSE 5
  assert.ok(open(stu(S1), HOD).ok);               // the student too
  assert.ok(open(P1, ADMIN).ok);                  // admin office
  assert.equal(open(P1, CSE1).status, 403);       // teaches only CSE sem 1
  assert.equal(open(P1, CIVIL).status, 403);      // other branch
  assert.equal(open(P1, P2).status, 403);         // parent <-> parent
  assert.ok(open(P1, stu(S1)).ok);                // parent <-> their own child
  assert.equal(open(P1, stu(S2)).status, 403);    // parent <-> somebody else's child
  assert.ok(open(stu(S1), stu(S2)).ok);           // two CSE students
  assert.equal(open(stu(S1), stu(CV1)).status, 403);   // CSE <-> Civil student: not without a shared group
  assert.ok(open(stu(S1), CSE1).ok);              // a student may write to any teacher
  assert.ok(open(HOD, CSE1).ok);                  // teacher <-> teacher
  assert.ok(open(HOD, ADMIN).ok);                 // admin <-> teacher
  assert.equal(open(P1, HOD, S2).status, 403);    // a parent cannot talk "about" somebody else's child
  assert.equal(open(HOD, P2, S1).status, 403);
  assert.equal(open(P1, { id: 'nobody' }).status, 404);
  assert.equal(open(PCV, HOD).status, 403);       // Civil parent, CSE teacher
  assert.ok(open(CIVIL, PCV).ok);
});

test('the same two people + child always get the same thread, whoever starts it', () => {
  const a = open(P1, HOD), b = open(HOD, P1);
  assert.equal(a.id, b.id); assert.equal(b.created, false);
  assert.notEqual(open(stu(S1), HOD).id, a.id);   // the student's own chat with the teacher is a different one
});

test('text: sent, trimmed, limited; the sender comes from the login', () => {
  const t = C.findThread(open(P1, HOD).id);
  assert.equal((C.sendText(P1, t, '   ', NOW) as any).status, 400);
  assert.equal((C.sendText(P1, t, 42, NOW) as any).status, 400);
  const r = C.sendText(P1, t, '  Namaste sir, attendance ke baare mein baat karni hai  ', NOW) as any; assert.ok(r.ok);
  const long = C.sendText(P1, t, 'x'.repeat(5000), NOW) as any; assert.ok(long.ok);
  const msgs = C.messagesOf(HOD, t).messages;
  assert.equal(msgs[0].text, 'Namaste sir, attendance ke baare mein baat karni hai');
  assert.equal(msgs[1].text.length, C.MAX_TEXT);
  assert.equal(msgs[0].mine, false);              // HOD sees it as theirs-not
  assert.equal(C.messagesOf(P1, t).messages[0].mine, true);
});

test('strangers cannot read, write, mark read or open files of a chat', () => {
  const t = C.findThread(open(P1, HOD).id);
  assert.equal(C.isParticipant(P2, t), false); assert.equal(C.isParticipant(ADMIN, t), false);   // not even the admin
  assert.equal((C.sendText(P2, t, 'hi', NOW) as any).status, 404);
  assert.equal((C.sendFile(P2, t, webm, 'v.webm', 3000, '', NOW) as any).status, 404);
  assert.equal(C.listThreads(P2).some((x) => x.id === t.id), false);
  assert.equal(C.listThreads(ADMIN).some((x) => x.id === t.id), false);
  const v = C.sendFile(P1, t, webm, 'v.webm', 3000, '', NOW) as any; assert.ok(v.ok);
  assert.equal((C.openMessageFile(P2, C.findMessage(v.id)) as any).ok, false);
  assert.equal((C.openMessageFile(ADMIN, C.findMessage(v.id)) as any).ok, false);
  assert.equal((C.openMessageFile(HOD, C.findMessage(v.id)) as any).ok, true);
});

test('voice, photo and file messages: type decided from the bytes, size/duration clamped, audio only in chat', () => {
  const t = C.findThread(open(HOD, P1).id);
  const v = C.sendFile(HOD, t, webm, 'x.pdf', 12_345, 'ignored caption', NOW) as any; assert.ok(v.ok);
  const vm = C.messagesOf(HOD, t).messages.find((m) => m.id === v.id)!;
  assert.equal(vm.kind, 'voice'); assert.equal(vm.durationMs, 12_345); assert.equal(vm.text, ''); assert.equal(vm.mime, 'audio/webm'); assert.match(vm.fileName!, /\.webm$/);
  assert.equal(C.previewOf(C.findMessage(v.id)), '🎤 Voice message 0:12');
  const long = C.sendFile(HOD, t, m4a, 'a', 99_999_999, '', NOW) as any;                              // iPhone recording, clamped to 5 min
  assert.equal(C.messagesOf(HOD, t).messages.find((m) => m.id === long.id)!.durationMs, C.MAX_VOICE_MS);
  assert.equal((C.sendFile(HOD, t, webm, 'a', 0, '', NOW) as any).status, 400);                      // empty recording
  const img = C.sendFile(HOD, t, png, 'photo.png', 0, 'Fee receipt', NOW) as any;
  assert.equal(C.messagesOf(HOD, t).messages.find((m) => m.id === img.id)!.kind, 'image');
  assert.equal(C.previewOf(C.findMessage(img.id)), '📷 Fee receipt');
  const doc = C.sendFile(HOD, t, pdf, 'leave.pdf', 0, '', NOW) as any;
  assert.equal(C.messagesOf(HOD, t).messages.find((m) => m.id === doc.id)!.kind, 'file');
  assert.equal((C.sendFile(HOD, t, Buffer.from('<html><script>alert(1)</script></html>'), 'a.webm', 5000, '', NOW) as any).status, 415);   // a name proves nothing
  assert.equal((C.sendFile(HOD, t, 'not bytes', 'a.webm', 5000, '', NOW) as any).status, 400);
  // the study-material / submission uploads still refuse audio
  assert.equal((F.savePending(HOD.id, webm, 'v.webm', NOW) as any).status, 415);
  // attached files are not "pending" (they are never swept after an hour)
  assert.equal((db.prepare("SELECT COUNT(*) c FROM stored_files WHERE uploaded_by=? AND attached_to IS NULL").get(HOD.id) as any).c, 0);
  assert.equal(F.sweepUploads(NOW + 3 * 3600_000), 0);
});

test('ticks and unread counts: sent -> seen, reading is per person, my own message counts as read', () => {
  const t0 = C.findThread(open(P2, HOD).id);                                       // P2: parent of S2 (CSE 5)
  const a = C.sendText(P2, t0, 'Sir, ek sawaal hai', NOW) as any;
  const b = C.sendText(P2, t0, 'Kya aap free hain?', NOW) as any;
  // T.
  const t = () => C.findThread(t0.id);
  assert.equal(C.unreadTotal(HOD) >= 2, true);
  assert.equal(C.listThreads(HOD).find((x) => x.id === t0.id)!.unread, 2);
  assert.equal(C.listThreads(P2).find((x) => x.id === t0.id)!.unread, 0);          // I wrote them
  assert.equal(C.messagesOf(P2, t()).messages.every((m) => m.status === 'sent'), true);
  C.markRead(HOD, t());                                                            // teacher opens the chat
  assert.equal(C.listThreads(HOD).find((x) => x.id === t0.id)!.unread, 0);
  assert.equal(C.messagesOf(P2, t()).messages.every((m) => m.status === 'seen'), true);   // blue ticks for the parent
  assert.equal(C.messagesOf(P2, t()).otherLastRead, b.id);
  const reply = C.sendText(HOD, t(), 'Haan, bataiye', NOW) as any;
  assert.equal(C.listThreads(P2).find((x) => x.id === t0.id)!.unread, 1);
  C.markRead(P2, t(), a.id);                                                       // cannot move backwards, cannot pass the newest
  assert.equal(C.listThreads(P2).find((x) => x.id === t0.id)!.unread, 1);
  C.markRead(P2, t(), 999_999);
  assert.equal(C.listThreads(P2).find((x) => x.id === t0.id)!.unread, 0);
  assert.ok(reply.id > b.id);
});

test('refresh: only what is new, and which messages were deleted meanwhile', () => {
  const t = C.findThread(open(P1, HOD).id);
  const first = C.messagesOf(P1, t);
  const last = first.messages[first.messages.length - 1].id;
  const m = C.sendText(HOD, t, 'ek aur', NOW + 5000) as any;
  const next = C.messagesOf(P1, t, { after: last, since: first.now - 1000 });
  assert.deepEqual(next.messages.map((x) => x.id), [m.id]);
  C.deleteMessage(HOD, C.findMessage(m.id), NOW + 6000);
  const again = C.messagesOf(P1, t, { after: m.id, since: NOW + 5500 });
  assert.deepEqual(again.messages, []); assert.deepEqual(again.deletedIds, [m.id]);
  const older = C.messagesOf(P1, t, { before: last });
  assert.equal(older.messages.every((x) => x.id < last), true);
});

test('delete for everyone: only your own, text and file are really erased', () => {
  const t = C.findThread(open(P1, HOD).id);
  const v = C.sendFile(P1, t, webm, 'v.webm', 4000, '', NOW) as any;
  const row = C.findMessage(v.id);
  const onDisk = F.fileOnDisk(row.file_id);
  assert.ok(fs.existsSync(onDisk));
  assert.equal((C.deleteMessage(HOD, row, NOW) as any).status, 403);             // the other person cannot delete it
  assert.ok((C.deleteMessage(P1, row, NOW) as any).ok);
  assert.equal(fs.existsSync(onDisk), false);
  const dto = C.messagesOf(HOD, t).messages.find((m) => m.id === v.id)!;
  assert.equal(dto.deleted, true); assert.equal(dto.fileUrl, undefined); assert.equal(dto.text, '');
  assert.equal(C.previewOf(C.findMessage(v.id)), 'This message was deleted');
  assert.equal((C.openMessageFile(HOD, C.findMessage(v.id)) as any).ok, false);
  const x = C.sendText(P1, t, 'secret text', NOW) as any; C.deleteMessage(P1, C.findMessage(x.id), NOW);
  assert.equal(C.findMessage(x.id).body, '');
});

test('when the child changes class the old chat stays readable but nobody can write in it', () => {
  const sid = cse5[2];
  const p = mkParent(sid);
  const t = C.findThread(open(p, HOD).id);
  assert.ok((C.sendText(p, t, 'hello', NOW) as any).ok);
  db.prepare('UPDATE students SET semester=6 WHERE id=?').run(sid);                // HOD teaches CSE 3 and 5 only
  const pp = user(p.id);
  assert.equal((C.sendText(pp, t, 'again', NOW) as any).status, 403);
  assert.equal((C.sendText(HOD, t, 'again', NOW) as any).status, 403);
  assert.equal(C.messagesOf(pp, t).messages.length, 1);
  const dto = C.listThreads(pp).find((x) => x.id === t.id)!; assert.equal(dto.canSend, false);
  db.prepare('UPDATE students SET semester=5 WHERE id=?').run(sid);
  db.prepare('UPDATE users SET is_active=0 WHERE id=?').run(HOD.id);               // a teacher who left
  assert.equal((C.sendText(user(p.id), t, 'x', NOW) as any).status, 403);
  db.prepare('UPDATE users SET is_active=1 WHERE id=?').run(HOD.id);
});

test('contacts: family sees the teachers of the child\'s class (with subjects) and the admin; staff see the right families', () => {
  const fam = C.contactsFor(P1).contacts;
  assert.ok(fam.some((c) => c.userId === HOD.id)); assert.ok(fam.some((c) => c.userId === ADMIN.id));
  assert.equal(fam.some((c) => c.userId === CIVIL.id || c.userId === CSE1.id), false);
  assert.match(fam.find((c) => c.userId === HOD.id)!.label, /^Teacher · /);
  assert.equal(fam.every((c) => c.studentId === S1), true);
  const teacher = C.contactsFor(HOD, { branch: 'CSE', semester: 5 }).contacts;
  const p1 = teacher.find((c) => c.userId === P1.id)!;
  assert.match(p1.label, /^Father of .* · CSE Sem 5$/);                            // "whose parent is this?"
  assert.ok(teacher.some((c) => c.userId === S1));                                  // the student too
  assert.equal(teacher.some((c) => c.userId === PCV.id), false);                    // a Civil parent is not in a CSE teacher's list
  assert.equal(C.contactsFor(HOD, { branch: 'Civil' }).contacts.some((c) => c.userId === PCV.id), false);
  assert.ok(C.contactsFor(ADMIN, { branch: 'Civil', semester: 5 }).contacts.some((c) => c.userId === PCV.id));
  assert.ok(C.contactsFor(ADMIN).contacts.some((c) => c.userId === HOD.id));
  assert.ok(C.contactsFor(HOD).contacts.some((c) => c.userId === ADMIN.id));
  const name = (db.prepare('SELECT name FROM students WHERE id=?').get(S1) as any).name.split(' ')[0];
  assert.ok(C.contactsFor(HOD, { q: name }).contacts.some((c) => c.userId === P1.id));      // search by the child's name finds the parent
  assert.equal(C.contactsFor(HOD, { q: 'zzzzqqqq' }).contacts.length, 0);
});

test('CHAT_STUDENT_CHAT=0 switches off the students\' own chats, parents keep working', () => {
  process.env.CHAT_STUDENT_CHAT = '0';
  try {
    assert.equal(open(stu(S2), HOD).status, 403);
    assert.equal(C.contactsFor(stu(S2)).contacts.length, 0);
    assert.ok(open(P2, HOD).ok);
    assert.equal(C.contactsFor(HOD, { branch: 'CSE', semester: 5 }).contacts.some((c) => c.userId === S2), false);
  } finally { delete process.env.CHAT_STUDENT_CHAT; }
});

test('bell: no message text, one per chat until it is opened, only with consent', () => {
  for (const id of [HOD.id, P1.id]) db.prepare('UPDATE users SET adult_verified=1 WHERE id=?').run(id);
  consent.saveOwn(user(HOD.id), { service: true, notifications: true }, ctx);
  const t = C.findThread(open(P1, HOD).id);
  // Notes.
  const notes = () => db.prepare("SELECT * FROM notifications WHERE user_id=? AND kind='chat'").all(HOD.id) as any[];
  const before = notes().length;
  const a = C.sendText(P1, t, 'private words about my child', NOW) as any;
  assert.equal(C.notifyNewMessage(P1, C.findThread(t.id), a.id, NOW), true);
  const b = C.sendText(P1, t, 'second', NOW) as any;
  assert.equal(C.notifyNewMessage(P1, C.findThread(t.id), b.id, NOW), false);       // same chat, not opened yet
  assert.equal(notes().length, before + 1);
  assert.equal(JSON.stringify(notes()).includes('private words'), false);
  C.markRead(HOD, C.findThread(t.id));
  const c = C.sendText(P1, t, 'third', NOW) as any;
  assert.equal(C.notifyNewMessage(P1, C.findThread(t.id), c.id, NOW), true);        // opened since -> new bell message
  assert.equal(C.notifyNewMessage(HOD, C.findThread(t.id), c.id, NOW), false);      // P1 never gave consent -> nothing
});
