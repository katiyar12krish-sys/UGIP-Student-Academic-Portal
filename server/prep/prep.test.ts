// Run: npm run test:prep   (throw-away temp database and upload folder)
// Placement preparation: server-graded practice / mock tests, resume ATS score, placement tracker access rules.
import os from 'os';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.PORTAL_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ugip-prep-'));
process.env.MFA_REQUIRED_ROLES = '';
const { db } = await import('../db/connection');
const { seedIfEmpty } = await import('../db/seed');
const { seedSubjectsIfEmpty } = await import('../academic/seed');
const svc = await import('../auth/service');
const ses = await import('../auth/session');
const F = await import('../files/store');
const P = await import('./service');
const B = await import('./bank');

seedIfEmpty(); seedSubjectsIfEmpty(); svc.seedStaffIfEmpty(); svc.syncStudentUsers();
const user = (id: string) => ses.toSessionUser(db.prepare('SELECT * FROM users WHERE id=?').get(id));
const NOW = Date.UTC(2026, 10, 13, 5, 0, 0);
const ADMIN = user('usr-admin-1'), HOD = user('fac-hod-cse'), CIVIL = user('fac-civil');
const ids = (branch: string) => (db.prepare('SELECT id FROM students WHERE deleted_at IS NULL AND branch=? ORDER BY roll_no').all(branch) as any[]).map((r) => r.id);
const [S1, S2] = ids('CSE'), [CV1] = ids('Civil');
const P1 = user((svc.createParent(S1, { name: 'Parent', relation: 'Mother' }, 't') as any).id);

test('the bank: every question has 4 different options and a valid answer; branch sections are separate', () => {
  assert.ok(B.BANK.length > 1000);
  for (const q of B.BANK) { assert.equal(new Set(q.options).size, 4, q.id); assert.ok(q.correctIndex >= 0 && q.correctIndex < 4, q.id); }
  assert.ok(B.questionsFor('CSE', 'Mixed').every((q) => q.branch !== 'Civil'));
  assert.ok(B.questionsFor('Civil', 'Mixed').every((q) => q.branch !== 'CSE'));
  assert.deepEqual(B.categoriesFor('Civil'), ['Aptitude', 'Reasoning', 'English', 'HR & Company', 'Civil Technical']);
});

test('start: students only, own sections only, no answers sent', () => {
  assert.equal((P.startTest(HOD, { category: 'Aptitude' }, NOW) as any).status, 403);
  assert.equal((P.startTest(P1, { category: 'Aptitude' }, NOW) as any).status, 403);
  assert.equal((P.startTest(user(S1), { category: 'Civil Technical' }, NOW) as any).status, 400);   // CSE student, Civil section
  const r = P.startTest(user(S1), { category: 'CSE Technical', count: 500 }, NOW) as any; assert.ok(r.ok);
  assert.equal(r.attempt.questions.length, P.MAX_Q);
  assert.equal(JSON.stringify(r.attempt).includes('correctIndex'), false);
  assert.equal(JSON.stringify(r.attempt).includes('explanation'), false);
  const m = P.startTest(user(S1), { mode: 'mock' }, NOW) as any;
  assert.equal(m.attempt.questions.length, P.MOCK_Q); assert.equal(m.attempt.timeLimitSec, P.MOCK_Q * 60);
});

test('submit: graded on the server, once, by the owner only; review shows the right answers', () => {
  const r = P.startTest(user(S1), { category: 'Aptitude', count: 5 }, NOW) as any;
  const qs = r.attempt.questions as { id: string }[];
  const key = qs.map((q) => B.mcqById(q.id)!.correctIndex);
  const answers = [key[0], key[1], (key[2] + 1) % 4, null, 'x'];   // 2 right, 1 wrong, 2 skipped (bad value = skipped)
  assert.equal((P.submitTest(user(S2), r.attempt.id, answers, NOW) as any).status, 404);   // another student
  const s = P.submitTest(user(S1), r.attempt.id, answers, NOW + 60_000) as any; assert.ok(s.ok);
  assert.equal(s.result.correct, 2); assert.equal(s.result.wrong, 1); assert.equal(s.result.skipped, 2); assert.equal(s.result.scorePct, 40);
  assert.equal(s.result.review[0].correctIndex, key[0]); assert.equal(s.result.durationSec, 60);
  assert.equal((P.submitTest(user(S1), r.attempt.id, answers, NOW) as any).status, 409);   // once only
  const h = P.myHistory(user(S1))!;
  assert.equal(h.attempts, 1); assert.equal(h.avgPct, 40); assert.equal(h.weakest, 'Aptitude');
});

test('mock test submitted long after the time is up counts every answer as skipped', () => {
  const m = P.startTest(user(S2), { mode: 'mock' }, NOW) as any;
  const key = m.attempt.questions.map((q: any) => B.mcqById(q.id)!.correctIndex);
  const late = NOW + (P.MOCK_Q * 60 + P.GRACE_SEC + 5) * 1000;
  const s = P.submitTest(user(S2), m.attempt.id, key, late) as any; assert.ok(s.ok);
  assert.equal(s.result.correct, 0); assert.equal(s.result.skipped, P.MOCK_Q);
  const m2 = P.startTest(user(S2), { mode: 'mock' }, NOW) as any;
  const k2 = m2.attempt.questions.map((q: any) => B.mcqById(q.id)!.correctIndex);
  assert.equal((P.submitTest(user(S2), m2.attempt.id, k2, NOW + 10 * 60_000) as any).result.scorePct, 100);
});

// A tiny DOCX (zip with word/document.xml, deflated) so the resume can be read without extra packages.
function docx(text: string): Buffer {
  const xml = Buffer.from(`<w:document><w:body>${text.split('\n').map((l) => `<w:p><w:r><w:t>${l}</w:t></w:r></w:p>`).join('')}</w:body></w:document>`);
  const data = zlib.deflateRawSync(xml);
  const name = Buffer.from('word/document.xml');
  const h = Buffer.alloc(30);
  h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(8, 8); h.writeUInt32LE(data.length, 18); h.writeUInt32LE(xml.length, 22); h.writeUInt16LE(name.length, 26);
  const ct = Buffer.from('[Content_Types].xml');
  const h2 = Buffer.alloc(30); h2.writeUInt32LE(0x04034b50, 0); h2.writeUInt16LE(ct.length, 26);
  return Buffer.concat([h2, ct, h, name, data]);
}

test('resume score: worked out from the uploaded file, cached, visible to the student / parent / staff only', () => {
  const words = 'Career Objective: to work as a software developer. Education: Diploma in CSE, UGIP Tanakpur, 10th and 12th. '
    + 'Technical Skills: Python, Java, HTML, CSS, JavaScript, React, SQL, MySQL, Linux, Git, networking, communication, teamwork. '
    + 'Projects: Developed a college portal; designed a library system; implemented a chat app; tested and deployed it. '
    + 'Internship / Training: 6 weeks at NIELIT. Certifications: NPTEL Python course. Achievements: won the coding contest. '
    + 'Contact: student@example.com, 9876543210, linkedin.com/in/student';
  const buf = docx(Array(4).fill(words).join('\n'));
  const up = F.savePending(S1, buf, 'resume.docx', NOW) as any;
  assert.ok(up.ok, 'the test zip is accepted as a Word file');
  db.prepare('UPDATE stored_files SET attached_to=? WHERE id=?').run(`resume:${S1}`, up.file.fileId);
  db.prepare('INSERT INTO student_resumes (student_id,file_id,uploaded_at) VALUES (?,?,?)').run(S1, up.file.fileId, NOW);
  const r = P.resumeScoreFor(user(S1), S1) as any; assert.ok(r.ok);
  assert.equal(r.uploaded, true); assert.equal(r.analysis.textExtracted, true);
  assert.ok(r.analysis.score >= 60, `score ${r.analysis.score}`); assert.ok(r.analysis.skillsFound.includes('python'));
  assert.equal((db.prepare('SELECT COUNT(*) c FROM resume_scores').get() as any).c, 1);
  assert.ok((P.resumeScoreFor(P1, S1) as any).ok);            // parent of the student
  assert.ok((P.resumeScoreFor(HOD, S1) as any).ok);           // CSE teacher
  assert.ok((P.resumeScoreFor(ADMIN, S1) as any).ok);
  assert.equal((P.resumeScoreFor(user(S2), S1) as any).status, 404);   // a classmate
  assert.equal((P.resumeScoreFor(CIVIL, S1) as any).status, 404);      // Civil teacher, CSE student
  assert.equal((P.resumeScoreFor(user(S2), S2) as any).uploaded, false);
});

test('tracker: staff only; a teacher sees only their branch / classes; numbers match the attempts', () => {
  assert.equal(P.tracker(user(S1)), null);
  const all = P.tracker(ADMIN)!;
  assert.ok(all.some((r) => r.studentId === CV1) && all.some((r) => r.studentId === S1));
  const cse = P.tracker(HOD)!;
  assert.ok(cse.every((r) => r.branch === 'CSE'));
  const civ = P.tracker(CIVIL)!;
  assert.ok(civ.every((r) => r.branch === 'Civil'));
  const me = all.find((r) => r.studentId === S1)!;
  assert.equal(me.tests.attempts, 1); assert.equal(me.tests.avgPct, 40);
  assert.equal((P.studentDetail(user(S1), S1) as any).status, 404);    // students use their own history route
  assert.ok((P.studentDetail(P1, S1) as any).ok);
  assert.equal((P.studentDetail(P1, S2) as any).status, 404);
  assert.deepEqual(P.tracker(ADMIN, { branch: 'Civil' })!.map((r) => r.branch).filter((b) => b !== 'Civil'), []);
});
