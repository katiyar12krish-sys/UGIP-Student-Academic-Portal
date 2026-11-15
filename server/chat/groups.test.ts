// Run: npm run test:chatgroups   (throw-away temp database; nothing is sent anywhere)
// Group chats: who is a member, only members read / write, own delete + admin moderation, custom groups by the admin,
// and a custom group lets students of two branches write to each other.
import os from 'os';
import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.PORTAL_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ugip-chatgroups-'));
process.env.MFA_REQUIRED_ROLES = '';
const { db } = await import('../db/connection');
const { seedIfEmpty } = await import('../db/seed');
const { seedSubjectsIfEmpty } = await import('../academic/seed');
const svc = await import('../auth/service');
const ses = await import('../auth/session');
const C = await import('./service');
const G = await import('./groups');

seedIfEmpty(); seedSubjectsIfEmpty(); svc.seedStaffIfEmpty(); svc.syncStudentUsers();
const user = (id: string) => ses.toSessionUser(db.prepare('SELECT * FROM users WHERE id=?').get(id));
const row = (id: string) => C.userRow(id)!;
const NOW = Date.UTC(2026, 10, 13, 5, 0, 0);
// Seed staff: HOD CSE teaches CSE sem 3 + 5; fac-cse-1 only CSE sem 1; fac-civil teaches Civil sem 1, 3, 5.
const ADMIN = user('usr-admin-1'), HOD = user('fac-hod-cse'), CSE1 = user('fac-cse-1'), CIVIL = user('fac-civil');
const ids = (branch: string, sem: number) => (db.prepare('SELECT id FROM students WHERE deleted_at IS NULL AND branch=? AND semester=? ORDER BY roll_no').all(branch, sem) as any[]).map((r) => r.id);
const [S1, S2] = ids('CSE', 5), [CV1] = ids('Civil', 5);
const CS3 = ids('CSE', 5)[3];
db.prepare('UPDATE students SET semester=3 WHERE id=?').run(CS3);   // the sample data has only 3rd-year students
const P1 = user((svc.createParent(S1, { name: 'Parent of S1', relation: 'Father' }, 't') as any).id);
const g = (id: string) => G.findGroup(id);

test('built-in groups exist and get their members from the records', () => {
  for (const id of ['grp-faculty', 'grp-branch-CSE', 'grp-branch-Civil', 'grp-class-CSE-1', 'grp-class-CSE-3', 'grp-class-Civil-3']) assert.ok(g(id), id);
  assert.ok(G.isMember(row(HOD.id), g('grp-faculty'))); assert.ok(G.isMember(row(CIVIL.id), g('grp-faculty')));
  assert.equal(G.isMember(row(S1), g('grp-faculty')), false);
  assert.ok(G.isMember(row(S1), g('grp-branch-CSE'))); assert.equal(G.isMember(row(S1), g('grp-branch-Civil')), false);
  assert.ok(G.isMember(row(CV1), g('grp-branch-Civil')));
  assert.ok(G.isMember(row(S1), g('grp-class-CSE-3')));               // sem 5 = 3rd year
  assert.equal(G.isMember(row(S1), g('grp-class-CSE-2')), false);
  assert.ok(G.isMember(row(CS3), g('grp-class-CSE-2')));             // sem 3 = 2nd year
  assert.ok(G.isMember(row(HOD.id), g('grp-class-CSE-3')));           // teaches sem 5
  assert.equal(G.isMember(row(CSE1.id), g('grp-class-CSE-3')), false); // teaches only sem 1
  assert.ok(G.isMember(row(ADMIN.id), g('grp-class-Civil-2')));       // admin = moderator of every group
  assert.equal(G.isMember(row(P1.id), g('grp-branch-CSE')), false);   // parents are never in built-in groups
  const mine = G.listGroups(user(S1)).map((x) => x.id).sort();
  assert.deepEqual(mine, ['grp-branch-CSE', 'grp-class-CSE-3']);
  assert.ok(G.memberIds(g('grp-class-CSE-3')).includes(S2));
});

test('only members read or write; others are told "not found"', () => {
  const grp = g('grp-class-CSE-3');
  const r = G.sendGroupText(user(S1), grp, ' Kal lab test hai? ', NOW) as any; assert.ok(r.ok);
  assert.equal((G.sendGroupText(user(CV1), grp, 'hi', NOW) as any).status, 404);
  assert.equal((G.sendGroupText(P1, grp, 'hi', NOW) as any).status, 404);
  assert.equal((G.sendGroupText(CSE1, grp, 'hi', NOW) as any).status, 404);
  const seen = G.groupMessagesOf(user(S2), grp).messages;
  assert.equal(seen[0].text, 'Kal lab test hai?'); assert.equal(seen[0].senderName, row(S1).name); assert.equal(seen[0].mine, false);
  assert.equal(G.toGroupDto(user(S2), grp).unread, 1);
  G.markGroupRead(user(S2), grp);
  assert.equal(G.toGroupDto(user(S2), grp).unread, 0);
  assert.equal(G.groupUnreadTotal(user(S1)), 0);                       // my own message counts as read
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(50)]);
  const f = G.sendGroupFile(HOD, grp, png, 'timetable.png', 0, 'New timetable', NOW) as any; assert.ok(f.ok);
  const m = G.findGroupMessage(grp.id, f.id);
  assert.ok((G.openGroupMessageFile(user(S2), grp, m) as any).ok);
  assert.equal((G.openGroupMessageFile(user(CV1), grp, m) as any).ok, false);
  assert.equal((G.openGroupMessageFile(user(S2), g('grp-class-CSE-1'), m) as any).ok, false);   // wrong group id
});

test('delete: your own message, or the admin (moderation); nobody else', () => {
  const grp = g('grp-branch-CSE');
  const a = G.sendGroupText(user(S1), grp, 'my message', NOW) as any;
  const b = G.sendGroupText(user(S2), grp, 'rude message', NOW) as any;
  assert.equal((G.deleteGroupMessage(user(S2), grp, G.findGroupMessage(grp.id, a.id), NOW) as any).status, 403);
  assert.equal((G.deleteGroupMessage(HOD, grp, G.findGroupMessage(grp.id, b.id), NOW) as any).status, 403);   // a teacher is not a moderator
  assert.ok((G.deleteGroupMessage(user(S1), grp, G.findGroupMessage(grp.id, a.id), NOW) as any).ok);
  assert.ok((G.deleteGroupMessage(ADMIN, grp, G.findGroupMessage(grp.id, b.id), NOW) as any).ok);
  const dto = G.groupMessagesOf(user(S1), grp).messages.find((x) => x.id === b.id)!;
  assert.equal(dto.deleted, true); assert.equal(dto.text, ''); assert.equal(dto.deletedByAdmin, true);
  assert.equal(G.findGroupMessage(grp.id, b.id).body, '');
  assert.equal(G.groupMessagesOf(ADMIN, grp).messages.find((x) => x.id === a.id)!.canDelete, false);   // already gone
  const c = G.sendGroupText(user(S2), grp, 'ok', NOW) as any;
  assert.equal(G.groupMessagesOf(ADMIN, grp).messages.find((x) => x.id === c.id)!.canDelete, true);
  assert.equal(G.groupMessagesOf(user(S1), grp).messages.find((x) => x.id === c.id)!.canDelete, false);
});

test('custom groups: only the admin makes / edits / deletes them; members from any branch and role', () => {
  assert.equal((G.createGroup(HOD, { name: 'Sports', memberIds: [S1] }, NOW) as any).status, 403);
  assert.equal((G.createGroup(ADMIN, { name: ' ', memberIds: [] }, NOW) as any).status, 400);
  // before: a CSE and a Civil student cannot write to each other
  assert.equal((C.openThread(user(S1), { userId: CV1 }, NOW) as any).status, 403);
  const r = G.createGroup(ADMIN, { name: 'Sports Team 2026', memberIds: [S1, CV1, CIVIL.id, 'nobody'] }, NOW) as any; assert.ok(r.ok);
  const sp = g(r.id);
  assert.equal(sp.kind, 'custom');
  assert.deepEqual(G.memberIds(sp).sort(), [ADMIN.id, S1, CV1, CIVIL.id].sort());
  assert.ok((G.sendGroupText(user(CV1), sp, 'Practice at 5 pm', NOW) as any).ok);
  assert.equal((G.sendGroupText(user(S2), sp, 'me too', NOW) as any).status, 404);
  // now they share a group: one-to-one is allowed
  assert.ok((C.openThread(user(S1), { userId: CV1 }, NOW) as any).ok);
  assert.ok(C.contactsFor(user(S1)).contacts.some((c) => c.userId === CV1));
  assert.equal((G.updateGroup(HOD, sp, { name: 'x y' }) as any).status, 403);
  assert.equal((G.updateGroup(ADMIN, g('grp-branch-CSE'), { memberIds: [] }) as any).status, 403);   // built-in groups come from the records
  const u = G.updateGroup(ADMIN, sp, { name: 'Sports Club', memberIds: [S1, S2] }, NOW) as any; assert.ok(u.ok);
  assert.equal(u.added, 1); assert.equal(u.removed, 2);
  assert.equal(g(r.id).name, 'Sports Club');
  assert.equal(G.isMember(row(CV1), g(r.id)), false);
  assert.equal((C.sendText(user(S1), C.findThread((C.openThread(user(S1), { userId: S2 }, NOW) as any).id), 'hi', NOW) as any).ok, true);
  assert.equal((C.openThread(user(S1), { userId: CV1 }, NOW) as any).status, 403);   // no longer in one group
  assert.ok((G.groupMembers(user(S2), g(r.id)) as any).ok);
  assert.equal((G.groupMembers(user(CV1), g(r.id)) as any).status, 404);
  assert.equal((G.archiveGroup(HOD, g(r.id)) as any).status, 403);
  assert.equal((G.archiveGroup(ADMIN, g('grp-faculty')) as any).status, 403);
  assert.ok((G.archiveGroup(ADMIN, g(r.id)) as any).ok);
  assert.equal(g(r.id), undefined);
  assert.equal(G.listGroups(user(S1)).some((x) => x.id === r.id), false);
  assert.equal(G.searchPeople(HOD, { q: 'a' }).length, 0);              // only the admin can search everybody
  assert.ok(G.searchPeople(ADMIN, { role: 'student', branch: 'Civil' }).every((p) => p.role === 'student'));
});

test('one-to-one after leaving the shared group: cross-branch students can no longer write', () => {
  const t = C.findThread((C.openThread(user(S1), { userId: S2 }, NOW) as any).id);
  assert.ok((C.sendText(user(S1), t, 'same branch is always fine', NOW) as any).ok);
  const lo = [S1, CV1].sort();
  const cross = db.prepare('SELECT * FROM chat_threads WHERE user_lo=? AND user_hi=?').get(lo[0], lo[1]) as any;
  assert.ok(cross);
  assert.equal((C.sendText(user(S1), cross, 'still there?', NOW) as any).status, 403);
});

test('CHAT_STUDENT_CHAT=0 takes students out of every group', () => {
  process.env.CHAT_STUDENT_CHAT = '0';
  try {
    assert.equal(G.isMember(row(S1), g('grp-branch-CSE')), false);
    assert.equal(G.memberIds(g('grp-branch-CSE')).includes(S1), false);
    assert.ok(G.isMember(row(HOD.id), g('grp-branch-CSE')));
  } finally { delete process.env.CHAT_STUDENT_CHAT; }
});
