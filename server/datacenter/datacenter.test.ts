// Run: npm run test:datacenter   (throw-away temp database; never touches data/portal.db)
import os from 'os';
import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.PORTAL_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ugip-dc-'));
const { db } = await import('../db/connection');
const { seedIfEmpty } = await import('../db/seed');
const { seedSubjectsIfEmpty } = await import('../academic/seed');
const svc = await import('../auth/service');
const dc = await import('./service');
const { toSessionUser } = await import('../auth/session');

seedIfEmpty(); seedSubjectsIfEmpty(); svc.seedStaffIfEmpty(); svc.syncStudentUsers();
const admin = toSessionUser(db.prepare("SELECT * FROM users WHERE role='admin' LIMIT 1").get());
const fac = toSessionUser(db.prepare("SELECT * FROM users WHERE id='fac-cse-1'").get());
const total = (db.prepare('SELECT COUNT(*) c FROM students WHERE deleted_at IS NULL').get() as any).c;

test('counts add up and girls list matches the girl count', () => {
  const all = dc.summarize(dc.filterStudents({}));
  assert.equal(all.total, total);
  assert.equal(Object.values(all.byGender).reduce((a, b) => a + b, 0), total);
  assert.equal(Object.values(all.byCategory).reduce((a, b) => a + b, 0), total);
  const girls = dc.filterStudents({ gender: 'Female' });
  assert.equal(girls.length, all.byGender.Female);
  assert(girls.every((g) => g.gender === 'Female'));
  const cell = Object.values(all.matrix).reduce((a, r) => a + r.Female, 0);
  assert.equal(cell, girls.length);
});

test('upload: create, update (blank keeps old value), unchanged, errors, nothing saved on dry run', () => {
  const rows = [
    { 'Roll No': '2609001001', Name: 'Priya Sharma', Branch: 'computer science', Year: '1st year', Gender: 'ladki', Category: 'gen', Phone: '+91 98765 43210', '10th %': '81.5' },
    { 'Roll No': '2609001002', Name: 'Rahul Verma', Branch: 'Civil', Year: 2, Gender: 'Male', Category: 'OBC' },
    { 'Roll No': '2609001003', Name: 'Bad Gender', Branch: 'CSE', Year: 1, Gender: 'xyz' },
    { 'Roll No': '2609001002', Name: 'Dup', Branch: 'CSE', Year: 1 },
    { Name: 'No roll', Branch: 'CSE', Year: 1 },
    { 'Roll No': '2609001004', Branch: 'CSE', Year: 1 },
  ];
  const before = (db.prepare('SELECT COUNT(*) c FROM students').get() as any).c;
  const dry = dc.importStudents(rows, 'tester', false);
  assert.equal((db.prepare('SELECT COUNT(*) c FROM students').get() as any).c, before, 'dry run writes nothing');
  assert.deepEqual([dry.summary.created, dry.summary.errors], [2, 4]);
  const done = dc.importStudents(rows, 'tester', true);
  assert.equal(done.summary.created, 2);
  const p = db.prepare("SELECT * FROM students WHERE roll_no='2609001001'").get() as any;
  assert.deepEqual([p.branch, p.year, p.semester, p.gender, p.category, p.phone, p.tenth], ['CSE', 1, 1, 'Female', 'General', '9876543210', 81.5]);
  assert(db.prepare("SELECT 1 FROM users WHERE student_id=?").get(p.id), 'login row created');
  // update: only the filled cells change, blank cells keep the saved value
  const up = dc.importStudents([{ 'Roll No': '2609001001', Category: 'OBC', 'Sem 1 %': 66 }], 'tester', true);
  assert.equal(up.summary.updated, 1);
  const p2 = db.prepare("SELECT * FROM students WHERE roll_no='2609001001'").get() as any;
  assert.deepEqual([p2.category, p2.gender, p2.phone, p2.name], ['OBC', 'Female', '9876543210', 'Priya Sharma']);
  assert.equal((db.prepare('SELECT percentage p FROM semester_results WHERE student_id=? AND semester=1').get(p.id) as any).p, 66);
  assert.equal(dc.importStudents([{ 'Roll No': '2609001001', Category: 'OBC' }], 'tester', true).results[0].action, 'unchanged');
  assert(db.prepare("SELECT 1 FROM audit_logs WHERE action='bulk_import_students'").get(), 'audited');
});

test('download tables: students round-trip through the upload, rules for faculty / admin', () => {
  const t = dc.studentsTable({ gender: 'Female' });
  assert.equal(t.rows.length, dc.filterStudents({ gender: 'Female' }).length);
  assert(t.rows.every((r) => r.length === t.columns.length));
  const asRows = t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
  assert.equal(dc.importStudents(asRows, 'tester', false).summary.errors, 0, 'a downloaded file uploads cleanly');
  assert.equal(dc.importStudents(asRows, 'tester', false).summary.updated, 0, '... and changes nothing');
  assert(dc.datasetTable('faculty', admin, {}));
  assert.equal(dc.datasetTable('faculty', fac, {}), null, 'faculty list is admin only');
  assert(dc.datasetTable('attendance', fac, {})!.rows.length > 0);
  // marks: a teacher sees only subjects they teach / were granted
  const exam = 'tst-dc-1', sub = 'sub-cse-301', stu = (db.prepare("SELECT id FROM students WHERE branch='CSE' LIMIT 1").get() as any).id;
  db.prepare("INSERT INTO tests (id,title,type,subject_id,max_marks,branch,semester) VALUES (?,?,?,?,?,?,?)").run(exam, 'Unit 1', 'Class Test', sub, 20, 'CSE', 3);
  db.prepare('INSERT INTO test_marks (test_id,student_id,marks_obtained) VALUES (?,?,?)').run(exam, stu, 15);
  assert.equal(dc.datasetTable('marks', admin, {})!.rows.length, 1);
  assert.equal(dc.datasetTable('marks', fac, {})!.rows.length, 0, 'fac-cse-1 does not teach CSE 301');
});
