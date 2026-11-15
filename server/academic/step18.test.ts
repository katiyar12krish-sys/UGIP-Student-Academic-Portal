// =====================================================================================================
// Tests for Step 18: real-data import, random sample data, academic calendar, class promotion + undo,
// year-aware class check (marks of last year can still be corrected), sample-data removal.
// Run: npm run test:step18     (uses a throw-away database in the temp folder)
// =====================================================================================================
import os from 'os';
import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
process.env.PORTAL_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ugip-step18-'));
delete process.env.DEMO_DATA;

const { db } = await import('../db/connection');
const { seedIfEmpty } = await import('../db/seed');
const { seedSubjectsIfEmpty } = await import('./seed');
const auth = await import('../auth/service');
const demo = await import('../db/demoData');
const promo = await import('./promotion');
const cal = await import('./calendar');
const access = await import('./access');

seedIfEmpty(); seedSubjectsIfEmpty(); auth.seedStaffIfEmpty();
// At.
const at = (s: string) => Date.parse(s + 'T09:00:00+05:30');   // a moment in Indian time

test('academic calendar maths', () => {
  assert.equal(cal.academicYearOf(at('2026-11-09')), '2026-27');
  assert.equal(cal.academicYearOf(at('2027-03-15')), '2026-27');
  assert.equal(cal.academicYearOf(at('2027-07-02')), '2027-28');
  assert.equal(cal.semesterFor(2, at('2026-11-09')), 3);
  assert.equal(cal.semesterFor(2, at('2027-02-01')), 4);
  assert.equal(cal.academicYearOfDate('2026-04-15'), '2025-26');
});

test('real data from the scanned papers is imported once', () => {
  demo.importRealData();
  const diya = db.prepare("SELECT * FROM students WHERE roll_no='24090050011'").get() as any;
  assert.equal(diya.dob, '2006-08-10');
  const r = db.prepare('SELECT * FROM board_results WHERE student_id=? AND semester=3').get(diya.id) as any;
  assert.equal(r.sgpa, 8.93);
  assert.equal(r.sem_total, 848);
  assert.equal((db.prepare("SELECT COUNT(*) n FROM test_marks WHERE test_id LIKE 'tst-real-rdbms-%'").get() as any).n, 360);
  // Abdul Ahad is CSE on the UBTER cross list (the old seed said Civil)
  assert.equal((db.prepare("SELECT branch FROM students WHERE roll_no='24090020001'").get() as any).branch, 'CSE');
  assert.deepEqual(demo.importRealData(), []);                         // second call does nothing
});

test('last year marks can still be corrected after promotion (class history)', () => {
  const diya = (db.prepare("SELECT id FROM students WHERE roll_no='24090050011'").get() as any).id;
  // Diya is in semester 5 now, but was in 2nd year (sem 3/4) during 2025-26
  assert.equal(access.studentInClass(diya, 'CSE', 4, '2025-26'), true);
  assert.equal(access.studentInClass(diya, 'CSE', 4, '2026-27'), false);
});

test('sample data is made once and marked as sample', () => {
  promo.autoAcademicTick(at('2026-11-09'));                             // first start: only remembers the year
  const lines = demo.seedDemoData();
  assert.ok(lines.length === 2);
  const c = demo.demoDataCounts();
  assert.equal(c.students, 90);
  assert.ok(c.exams > 100 && c.attendanceSessions > 100 && c.practicals > 20 && c.boardResults === 90);
  assert.deepEqual(demo.seedDemoData(), []);                            // not made twice
});

test('January: odd -> even semester, July: whole class moves up, never twice, undo works', () => {
  // Y1.
  const y1 = () => (db.prepare("SELECT COUNT(*) n FROM students WHERE branch='CSE' AND year=1 AND deleted_at IS NULL").get() as any).n;
  assert.equal(y1(), 25);
  promo.autoAcademicTick(at('2027-01-02'));
  assert.equal((db.prepare("SELECT semester FROM students WHERE roll_no='26090050001'").get() as any).semester, 2);
  promo.autoAcademicTick(at('2027-07-01'));
  const s = db.prepare("SELECT year, semester FROM students WHERE roll_no='26090050001'").get() as any;
  assert.deepEqual([s.year, s.semester], [2, 3]);                       // 1st year -> 2nd year, semester 3
  assert.equal(y1(), 0);                                                // first year is free for the new admissions
  assert.equal((db.prepare("SELECT record_status FROM students WHERE roll_no='24090050011'").get() as any).record_status, 'Passed Out');
  assert.deepEqual(promo.autoAcademicTick(at('2027-07-10')), []);       // not promoted a second time
  const undo = promo.undoLastRun('tester');
  assert.equal(undo.ok, true);
  assert.equal((db.prepare("SELECT year FROM students WHERE roll_no='26090050001'").get() as any).year, 1);
});

test('detained students are not promoted with the class', () => {
  db.prepare("UPDATE students SET record_status='Detained' WHERE roll_no='26090050002'").run();
  const plan = promo.planPromotion({ branch: 'CSE', fromYear: 1 }, '2027-28');
  assert.ok(plan.skip.some((x: any) => x.rollNo === '26090050002' && /Detained/.test(x.reason)));
  assert.ok(!plan.move.some((x: any) => x.rollNo === '26090050002'));
});

test('one click removes every sample row and keeps real data', () => {
  demo.removeDemoData();
  assert.equal(demo.demoDataCounts().students, 0);
  assert.equal((db.prepare('SELECT COUNT(*) n FROM board_results').get() as any).n, 37);   // the real results stay
  assert.equal((db.prepare("SELECT COUNT(*) n FROM test_marks WHERE test_id LIKE 'tst-real-rdbms-%'").get() as any).n, 360);
});
