// Run: npm run test:materials   (throw-away temp database and upload folder; nothing is sent anywhere)
import os from 'os';
import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.PORTAL_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ugip-materials-'));
process.env.MFA_REQUIRED_ROLES = '';
process.env.MAX_UPLOAD_MB = '1';
const { db } = await import('../db/connection');
const { seedIfEmpty } = await import('../db/seed');
const { seedSubjectsIfEmpty } = await import('../academic/seed');
const svc = await import('../auth/service');
const ses = await import('../auth/session');
const consent = await import('../auth/consent');
const F = await import('../files/store');
const M = await import('./service');
const rules = await import('../notify/rules');

seedIfEmpty(); seedSubjectsIfEmpty(); svc.seedStaffIfEmpty(); svc.syncStudentUsers();
// User.
const user = (id: string) => ses.toSessionUser(db.prepare('SELECT * FROM users WHERE id=?').get(id));
const ctx = { ip: 't', ua: 't' };
const NOW = Date.UTC(2026, 9, 22, 5, 0, 0);
const ADMIN = user('usr-admin-1'), HOD = user('fac-hod-cse'), CSE1 = user('fac-cse-1'), CIVIL = user('fac-civil');
// Ids of.
const idsOf = (branch: string, sem: number) => (db.prepare('SELECT id FROM students WHERE deleted_at IS NULL AND branch=? AND semester=? ORDER BY roll_no').all(branch, sem) as any[]).map((r) => r.id);
// the sample data has only semester-5 students: move the last CSE student to semester 3 so "another semester" can be tested
db.prepare('UPDATE students SET semester=3 WHERE id=?').run(idsOf('CSE', 5).pop());
const cse5 = idsOf('CSE', 5), cse3 = idsOf('CSE', 3), civ5 = idsOf('Civil', 5);
const [S1, S2] = cse5, [S3] = cse3, [CV1] = civ5;
// Stu.
const stu = (id: string) => user(id);
// Parent of s1.
const parentOfS1 = (() => { const p = svc.createParent(S1, { name: 'Parent', relation: 'Father' }, 't') as any; return user(p.id); })();
for (const id of [...cse5, ...cse3, ...civ5]) db.prepare('UPDATE users SET adult_verified=1 WHERE id=?').run(id);
for (const id of [S1, S3, CV1]) consent.saveOwn(user(id), { service: true, notifications: true }, ctx);        // S2 has not allowed notifications

// Subject of.
const subjectOf = (u: any, sem: number) => (db.prepare(`SELECT id FROM subjects WHERE semester=? AND id IN (${u.subjectIds.map(() => '?').join(',')})`).get(sem, ...u.subjectIds) as any).id as string;
const HOD_CSE5 = subjectOf(HOD, 5);

// --- sample files (first bytes decide the type) ---
const pdf = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(200, 0x20), Buffer.from('%%EOF')]);
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);
// Office.
const office = (part: string) => Buffer.concat([Buffer.from([0x50, 0x4b, 3, 4]), Buffer.alloc(26), Buffer.from('[Content_Types].xml'), Buffer.alloc(100), Buffer.from(part)]);
// Upload.
const upload = (u: any, buf: Buffer = pdf, name = 'Unit 1 Notes.pdf', now = NOW) => { const r = F.savePending(u.id, buf, name, now); assert.ok(r.ok, JSON.stringify(r)); return (r as any).file.fileId as string; };
// Publish.
const publish = (u: any, over: any = {}, buf?: Buffer) => M.createMaterial(u, { title: 'Unit 1', category: 'Lecture Notes', kind: 'file', subjectId: HOD_CSE5, fileId: upload(u, buf), ...over }, NOW) as any;
// Titles.
const titles = (l: any[]) => l.map((m) => m.title);

test('files: the type comes from the bytes, not from the name the browser gave', () => {
  assert.equal(F.sniff(pdf)?.kind, 'pdf'); assert.equal(F.sniff(png)?.mime, 'image/png'); assert.equal(F.sniff(jpg)?.mime, 'image/jpeg');
  assert.equal(F.sniff(office('word/document.xml'))?.ext, 'docx'); assert.equal(F.sniff(office('ppt/presentation.xml'))?.ext, 'pptx'); assert.equal(F.sniff(office('xl/workbook.xml'))?.ext, 'xlsx');
  // No.
  const no = (b: Buffer | string) => assert.equal(F.sniff(Buffer.from(b)), null);
  no('<html><script>alert(1)</script></html>'); no('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'); no('MZ\x90\x00\x03\x00\x00\x00 a program'); no('#!/bin/sh\nrm -rf /\n'); no('just text, long enough to pass the length check');
  no(Buffer.concat([Buffer.from([0x50, 0x4b, 3, 4]), Buffer.alloc(200)]));           // a zip that is not an office file
  const evil = F.savePending(CSE1.id, Buffer.from('<html><body>hello world</body></html>'), 'notes.pdf', NOW) as any;   // named .pdf, is html
  assert.equal(evil.ok, false); assert.equal(evil.status, 415);
});

test('files: size limit, empty body, and the number of waiting files', () => {
  assert.equal((F.savePending(CSE1.id, Buffer.alloc(0), 'a.pdf') as any).status, 400);
  assert.equal((F.savePending(CSE1.id, { not: 'a buffer' }, 'a.pdf') as any).status, 400);
  const big = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(1024 * 1024 + 10)]);
  assert.equal((F.savePending(CSE1.id, big, 'big.pdf') as any).status, 413);
  for (let i = 0; i < F.MAX_PENDING_PER_USER; i++) upload(CIVIL, pdf, `f${i}.pdf`);
  assert.equal((F.savePending(CIVIL.id, pdf, 'one-more.pdf') as any).status, 429);
  F.sweepUploads(NOW + 2 * 3600_000);                                                  // clean up so later tests start fresh
});

test('files: names are cleaned, the name on disk is random', () => {
  // Clean.
  const clean = (raw: string) => F.cleanName(raw, 'pdf');
  for (const bad of ['../../etc/passwd', 'a/b\\c.pdf', 'x\r\nSet-Cookie: a=b.pdf', '"; filename="evil.exe', '...hidden', '', '   ']) {
    const n = clean(bad); assert.match(n, /\.pdf$/); assert.doesNotMatch(n, /[\/\\"\r\n]/); assert.ok(!n.startsWith('.'));
  }
  assert.equal(clean('Unit 1 Notes.PDF'), 'Unit 1 Notes.pdf'); assert.equal(clean('notes.exe'), 'notes.pdf');
  assert.ok(clean('x'.repeat(500)).length <= 104);
  const id = upload(CSE1, pdf, '../../evil name.pdf');
  assert.match(id, /^f-[a-f0-9]{24}$/);
  assert.ok(fs.existsSync(path.join(F.UPLOAD_DIR, id)));
  assert.equal(F.findFile(id).original_name, 'evil name.pdf');
  assert.throws(() => F.fileOnDisk('../portal.db')); assert.throws(() => F.fileOnDisk('f-xyz'));
  assert.equal(F.findFile('../portal.db'), undefined);
});

test('publish: a teacher only for a subject assigned to them; class is copied from the subject', () => {
  const r = publish(HOD, { branch: 'Civil', semester: 1 });                          // typed class is ignored
  assert.ok(r.ok, JSON.stringify(r));
  const row = M.findMaterial(r.id); assert.equal(row.branch, 'CSE'); assert.equal(row.semester, 5); assert.equal(row.uploaded_by_name, `${HOD.name} (Faculty)`);
  assert.equal(publish(CSE1, { subjectId: HOD_CSE5 }).status, 403);                  // CSE1 does not teach this subject
  assert.equal(publish(CSE1, { subjectId: undefined }).status, 400);                 // a teacher must pick a subject
  assert.equal(publish(HOD, { subjectId: 'no-such' }).status, 404);
  assert.equal(publish(stu(S1)).status, 403); assert.equal(publish(parentOfS1).status, 403);
  assert.equal(publish(HOD, { category: 'Official Circular' }).status, 403);         // admin only
  assert.equal(publish(HOD, { category: 'Gossip' }).status, 400); assert.equal(publish(HOD, { title: '  ' }).status, 400); assert.equal(publish(HOD, { kind: 'zip' }).status, 400);
  const a = publish(ADMIN, { subjectId: undefined, branch: 'All', semester: 'All', category: 'Official Circular' });   // admin: general material for everybody
  assert.ok(a.ok, JSON.stringify(a)); assert.equal(M.findMaterial(a.id).semester, null);
  assert.equal(publish(ADMIN, { subjectId: undefined, branch: 'Mechanical' }).status, 400);
  assert.equal(publish(ADMIN, { subjectId: undefined, semester: 9 }).status, 400);
  assert.ok(publish(ADMIN, { subjectId: HOD_CSE5 }).ok);                             // admin may publish for any subject
});

test('publish: the uploaded file must be yours, unused, and used only once', () => {
  const mine = upload(HOD), theirs = upload(CSE1);
  assert.equal(M.createMaterial(HOD, { title: 'x', category: 'Lecture Notes', kind: 'file', subjectId: HOD_CSE5, fileId: theirs }, NOW).ok, false);   // someone else's upload
  assert.equal((M.createMaterial(HOD, { title: 'x', category: 'Lecture Notes', kind: 'file', subjectId: HOD_CSE5, fileId: 'f-000000000000000000000000' }, NOW) as any).status, 400);
  assert.equal((M.createMaterial(HOD, { title: 'x', category: 'Lecture Notes', kind: 'file', subjectId: HOD_CSE5 }, NOW) as any).status, 400);
  const ok = M.createMaterial(HOD, { title: 'x', category: 'Lecture Notes', kind: 'file', subjectId: HOD_CSE5, fileId: mine }, NOW) as any; assert.ok(ok.ok);
  assert.equal(F.findFile(mine).attached_to, `material:${ok.id}`);
  const again = M.createMaterial(HOD, { title: 'y', category: 'Lecture Notes', kind: 'file', subjectId: HOD_CSE5, fileId: mine }, NOW) as any;
  assert.equal(again.ok, false);                                                      // the same upload cannot back two materials
  assert.equal((db.prepare('SELECT COUNT(*) n FROM materials WHERE title=?').get('y') as any).n, 0);   // and the failed try left nothing behind
});

test('links: only http(s)', () => {
  // Link.
  const link = (u: any, url: any) => M.createMaterial(u, { title: 'NPTEL', category: 'Online Video / Lecture', kind: 'link', subjectId: HOD_CSE5, linkUrl: url }, NOW) as any;
  for (const bad of ['javascript:alert(1)', 'data:text/html,<script>', 'file:///etc/passwd', 'ftp://x.org/a', 'nptel.ac.in', '', undefined, 'http://']) assert.equal(link(HOD, bad).ok, false, String(bad));
  const ok = link(HOD, 'https://nptel.ac.in/courses'); assert.ok(ok.ok);
  assert.equal(M.toDto(M.findMaterial(ok.id)).type, 'link'); assert.equal(M.toDto(M.findMaterial(ok.id)).fileUrl, 'https://nptel.ac.in/courses');
  assert.equal((M.openFile(HOD, ok.id) as any).status, 404);                          // a link has no file
});

test('who sees which material, and who gets the file', () => {
  const cse5mat = publish(HOD, { title: 'CSE5-only' }), all = publish(ADMIN, { title: 'For-all', subjectId: undefined, branch: 'All', semester: 'All' }), civ = publish(CIVIL, { title: 'Civil-only', subjectId: subjectOf(CIVIL, 5) });
  assert.ok(cse5mat.ok && all.ok && civ.ok, JSON.stringify([cse5mat, all, civ]));
  // T.
  const t = (u: any) => titles(M.listFor(u));
  assert.ok(t(stu(S1)).includes('CSE5-only') && t(stu(S1)).includes('For-all') && !t(stu(S1)).includes('Civil-only'));
  assert.ok(!t(stu(S3)).includes('CSE5-only') && t(stu(S3)).includes('For-all'));    // CSE sem 3 student: other semester
  assert.ok(t(stu(CV1)).includes('Civil-only') && !t(stu(CV1)).includes('CSE5-only'));
  assert.deepEqual(M.listFor(parentOfS1), []);
  for (const u of [ADMIN, HOD, CSE1, CIVIL]) assert.ok(['CSE5-only', 'For-all', 'Civil-only'].every((x) => t(u).includes(x)));
  assert.equal(M.listFor(stu(S1)).every((m: any) => m.fileUrl.startsWith('/api/materials/') || m.type === 'link'), true);
  // files: same rule, and a student outside the class is told "not found"
  const f = M.openFile(stu(S1), cse5mat.id) as any; assert.ok(f.ok); assert.equal(f.mime, 'application/pdf'); assert.ok(fs.existsSync(f.path)); assert.equal(f.name, 'Unit 1 Notes.pdf');
  assert.equal((M.openFile(stu(S3), cse5mat.id) as any).status, 404); assert.equal((M.openFile(stu(CV1), cse5mat.id) as any).status, 404);
  assert.equal((M.openFile(parentOfS1, cse5mat.id) as any).status, 404);                // parents have no access to the library
  assert.ok((M.openFile(CSE1, cse5mat.id) as any).ok);                                // any teacher may read the library
  assert.equal((M.openFile(stu(S1), 'mat-nope') as any).status, 404);
});

test('downloads are counted for students only', () => {
  const r = publish(HOD, { title: 'Counted' });
  M.openFile(stu(S1), r.id); M.openFile(stu(S2), r.id); M.openFile(HOD, r.id); M.openFile(ADMIN, r.id);
  assert.equal(M.findMaterial(r.id).download_count, 2);
  M.openFile(stu(S3), r.id);                                                           // refused: not counted
  assert.equal(M.findMaterial(r.id).download_count, 2);
});

test('change and delete: the uploader and admin only; delete removes the file', () => {
  const r = publish(HOD, { title: 'Mine' });
  const file = M.findMaterial(r.id).file_id, disk = path.join(F.UPLOAD_DIR, file);
  assert.equal((M.updateMaterial(CSE1, r.id, { title: 'Hijack' }) as any).status, 403);
  assert.equal((M.updateMaterial(stu(S1), r.id, { title: 'Hijack' }) as any).status, 403);
  assert.equal((M.updateMaterial(HOD, r.id, { title: ' ' }) as any).status, 400);
  assert.equal((M.updateMaterial(HOD, r.id, { category: 'Official Circular' }) as any).status, 403);
  assert.ok(M.updateMaterial(HOD, r.id, { title: 'Renamed', tags: ['a', 'a', ' b ', ''], subjectId: 'other', branch: 'Civil' }).ok);
  const row = M.findMaterial(r.id); assert.equal(row.title, 'Renamed'); assert.deepEqual(JSON.parse(row.tags), ['a', 'b']); assert.equal(row.branch, 'CSE'); assert.equal(row.subject_id, HOD_CSE5);   // class and subject never change
  assert.ok(M.updateMaterial(ADMIN, r.id, { description: 'by admin' }).ok);
  assert.equal((M.deleteMaterial(CSE1, r.id) as any).status, 403);
  assert.ok(fs.existsSync(disk));
  assert.ok(M.deleteMaterial(HOD, r.id).ok);
  assert.ok(!fs.existsSync(disk)); assert.equal(F.findFile(file), undefined); assert.equal(M.findMaterial(r.id), undefined);
  assert.equal((M.deleteMaterial(HOD, r.id) as any).status, 404);
  const other = publish(HOD, { title: 'Admin removes' }); assert.ok(M.deleteMaterial(ADMIN, other.id).ok);
});

test('unused uploads are swept after an hour; used ones and fresh ones stay', () => {
  const used = publish(HOD, { title: 'Keep me' }), fresh = upload(HOD, pdf, 'fresh.pdf', NOW + 3000_000), old = upload(HOD, pdf, 'old.pdf', NOW);
  fs.writeFileSync(path.join(F.UPLOAD_DIR, 'f-aaaaaaaaaaaaaaaaaaaaaaaa'), 'orphan with no row');                 // a crash between "write" and "insert"
  fs.utimesSync(path.join(F.UPLOAD_DIR, 'f-aaaaaaaaaaaaaaaaaaaaaaaa'), new Date(0), new Date(0));
  const n = F.sweepUploads(NOW + 3700_000);
  assert.ok(n >= 2);
  assert.equal(F.findFile(old), undefined); assert.ok(F.findFile(fresh)); assert.ok(F.findFile(M.findMaterial(used.id).file_id));
  assert.ok(!fs.existsSync(path.join(F.UPLOAD_DIR, 'f-aaaaaaaaaaaaaaaaaaaaaaaa')));
  assert.ok(fs.existsSync(path.join(F.UPLOAD_DIR, M.findMaterial(used.id).file_id)));
});

test('notification: students of the class, once, only those who allowed it, no file text', () => {
  const r = publish(HOD, { title: 'Notify me' }), all = publish(ADMIN, { title: 'Everybody', subjectId: undefined, branch: 'All', semester: 'All' });
  // Notes.
  const notes = (uid: string) => db.prepare("SELECT * FROM notifications WHERE user_id=? AND kind='material'").all(uid) as any[];
  const before = [S1, S2, S3, CV1].map((id) => notes(id).length);
  assert.equal(rules.materialPublished(r.id, NOW), cse5.filter((id) => id !== S2 && consent.hasConsent(id, 'notifications')).length);
  assert.equal(notes(S1).length, before[0] + 1); assert.equal(notes(S2).length, before[1]);            // S2 never allowed notifications
  assert.equal(notes(S3).length, before[2]); assert.equal(notes(CV1).length, before[3]);                // other classes: nothing
  assert.equal(rules.materialPublished(r.id, NOW), 0);                                                   // the same event never notifies twice
  const n = notes(S1).find((x) => x.title === 'New material: Notify me'); assert.ok(n); assert.doesNotMatch(n.body, /pdf|\.pdf/i);
  rules.materialPublished(all.id, NOW);
  assert.ok(notes(S3).some((x) => x.title === 'New material: Everybody') && notes(CV1).some((x) => x.title === 'New material: Everybody'));
});

test('a subject that has materials cannot be deleted by mistake (foreign key)', () => {
  assert.throws(() => db.prepare('DELETE FROM subjects WHERE id=?').run(HOD_CSE5));
});
