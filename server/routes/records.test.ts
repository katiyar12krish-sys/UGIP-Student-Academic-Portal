// =====================================================================================================
// Tests for Step 20: lists that moved from the browser into the database (server/routes/records.ts).
// Checks that every collection has its table and that the permission rules hold.
// Run: npm run test:records    (uses a throw-away database in the temp folder)
// =====================================================================================================
import os from 'os';
import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
process.env.PORTAL_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ugip-records-'));

const { db } = await import('../db/connection');
const { COLLECTIONS } = await import('./records');

// pretend sessions (only the fields the rules look at)
const admin: any = { id: 'a1', username: 'admin', role: 'admin', subjectIds: [], childIds: [] };
const fac: any = { id: 'f1', username: 'fac', role: 'faculty', subjectIds: [], childIds: [] };
const fac2: any = { id: 'f2', username: 'fac2', role: 'faculty', subjectIds: [], childIds: [] };
const stu: any = { id: 's1', username: '111', role: 'student', studentId: 's1', subjectIds: [], childIds: [] };
const stu2: any = { id: 's2', username: '222', role: 'student', studentId: 's2', subjectIds: [], childIds: [] };
const parent: any = { id: 'p1', username: 'p111', role: 'parent', subjectIds: [], childIds: ['s1'] };

test('every collection has its own database table', () => {
  for (const [name, c] of Object.entries(COLLECTIONS)) {
    assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(c.table), `${name} -> ${c.table}`);
  }
});

test('timetable, papers and practice quizzes: everybody reads, only staff write', () => {
  for (const k of ['timetable', 'practice_quizzes']) {
    const c = COLLECTIONS[k];
    assert.equal(c.canRead(stu, {}), true);
    assert.equal(c.canWrite(fac, { data: {} }), true);
    assert.equal(c.canWrite(stu, { data: {} }), false);
  }
  const p = COLLECTIONS.question_papers;
  assert.equal(p.canWrite(stu, { data: { id: 'x', downloadCount: 1 } }), false);                                   // students cannot add papers
  assert.equal(p.canWrite(stu, { data: { id: 'x', title: 'A', downloadCount: 5 }, existing: { id: 'x', title: 'A', downloadCount: 4 } }), true);   // but may count a download
});

test('staff gate register: a teacher sees and writes only their own punches', () => {
  const c = COLLECTIONS.staff_attendance;
  assert.equal(c.canRead(fac, { faculty_id: 'f1' }), true);
  assert.equal(c.canRead(fac2, { faculty_id: 'f1' }), false);
  assert.equal(c.canRead(admin, { faculty_id: 'f1' }), true);
  assert.equal(c.canWrite(fac, { data: { facultyId: 'f1' } }), true);
  assert.equal(c.canWrite(fac, { data: { facultyId: 'f2' } }), false);
});

test('quiz attempts / progress / mock interviews: student own, parent own child, staff all', () => {
  for (const k of ['quiz_attempts', 'progress_points', 'mock_interviews']) {
    const c = COLLECTIONS[k];
    assert.equal(c.canRead(stu, { student_id: 's1' }), true);
    assert.equal(c.canRead(stu2, { student_id: 's1' }), false);
    assert.equal(c.canRead(parent, { student_id: 's1' }), true);
    assert.equal(c.canRead(fac, { student_id: 's1' }), true);
    assert.equal(c.canWrite(stu, { data: { studentId: 's1' } }), true);
    assert.equal(c.canWrite(stu, { data: { studentId: 's2' } }), false);
  }
});

test('shared experiences: anybody posts, only the writer or staff edits (others may only like)', () => {
  const c = COLLECTIONS.shared_experiences;
  const story = { id: 'e1', authorId: 's1', title: 'TCS interview', likes: 3 };
  assert.equal(c.canWrite(stu2, { data: { id: 'e2', authorId: 's2' } }), true);
  assert.equal(c.canWrite(stu2, { data: { ...story, title: 'changed' }, existing: story }), false);
  assert.equal(c.canWrite(stu2, { data: { ...story, likes: 4 }, existing: story }), true);
  assert.equal(c.canWrite(stu, { data: { ...story, title: 'changed' }, existing: story }), true);
});

test('activity log: only admin reads it, nobody can change history', () => {
  const c = COLLECTIONS.activity_logs;
  assert.equal(c.canRead(admin, {}), true);
  assert.equal(c.canRead(fac, {}), false);
  assert.equal(c.canWrite(fac, { data: {} }), true);
  assert.equal(c.canWrite(admin, { data: {}, existing: {} }), false);
});
