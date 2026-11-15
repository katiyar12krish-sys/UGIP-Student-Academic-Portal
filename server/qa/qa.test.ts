// Run: npm run test:qa   (throw-away temp database)
import os from 'os';
import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.MFA_REQUIRED_ROLES = '';
process.env.PORTAL_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ugip-qa-'));
const { db } = await import('../db/connection');
const { seedIfEmpty } = await import('../db/seed');
const { seedSubjectsIfEmpty } = await import('../academic/seed');
const svc = await import('../auth/service');
const ses = await import('../auth/session');
const Q = await import('./service');
const { savePending } = await import('../files/store');

seedIfEmpty(); seedSubjectsIfEmpty(); svc.seedStaffIfEmpty(); svc.syncStudentUsers();
const user = (where: string) => ses.toSessionUser(db.prepare(`SELECT * FROM users WHERE ${where}`).get());
const admin = user("role='admin'");
const fac = db.prepare("SELECT * FROM users WHERE username='bhawana_cse'").get() as any;
db.prepare('DELETE FROM faculty_subject_assignments WHERE user_id=?').run(fac.id);
const stuRow = db.prepare("SELECT * FROM students WHERE deleted_at IS NULL AND branch='CSE' LIMIT 1").get() as any;
const sub = db.prepare('SELECT * FROM subjects WHERE branch=? AND semester=? LIMIT 1').get(stuRow.branch, stuRow.semester) as any;
const otherSub = db.prepare('SELECT * FROM subjects WHERE id<>? LIMIT 1').get(sub.id) as any;
db.prepare('INSERT INTO faculty_subject_assignments VALUES (?,?)').run(fac.id, sub.id);
const teacher = ses.toSessionUser(fac);
const otherRow = db.prepare('SELECT * FROM students WHERE NOT (branch=? AND semester=?) AND deleted_at IS NULL LIMIT 1').get(sub.branch, sub.semester) as any;
const asStudent = (s: any) => ({ id: 'x-' + s.id, username: s.roll_no, role: 'student', name: s.name, studentId: s.id, subjectIds: [], childIds: [] } as any);

test('admin posts a question with a PDF for a class; only that class sees it', () => {
  const pdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
  const up = savePending(admin.id, pdf, 'notes.pdf') as any;
  assert.equal(up.ok, true);
  const r = Q.createPost(admin, { branch: sub.branch, semester: sub.semester, title: 'Explain pointers', answer: 'A pointer stores an address.', fileId: up.file.fileId }) as any;
  assert.equal(r.ok, true);
  assert.equal(Q.listFor(asStudent(stuRow)).some((p: any) => p.id === r.id && p.file), true);
  assert.equal(Q.listFor(asStudent(otherRow)).some((p: any) => p.id === r.id), false);
  assert.equal(Q.openFile(asStudent(stuRow), r.id).ok, true);
  assert.equal(Q.openFile(asStudent(otherRow), r.id).ok, false);
});

test('a teacher posts only for their own subject, and students cannot post', () => {
  assert.equal(Q.createPost(teacher, { subjectId: sub.id, title: 'Q1' }).ok, true);
  assert.equal(Q.createPost(teacher, { subjectId: otherSub.id, title: 'Q2' }).ok, false);
  assert.equal(Q.createPost(teacher, { branch: 'CSE', semester: 3, title: 'Q3' }).ok, false);
  assert.equal(Q.createPost(asStudent(stuRow), { subjectId: sub.id, title: 'Q4' }).ok, false);
});

test('only the admin or the posting teacher can delete', () => {
  const r = Q.createPost(admin, { branch: 'CSE', semester: 1, title: 'Admin post' }) as any;
  assert.equal(Q.deletePost(teacher, r.id).ok, false);
  assert.equal(Q.deletePost(admin, r.id).ok, true);
});
