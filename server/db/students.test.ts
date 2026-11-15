// Run: npm run test:students   (throw-away temp database; never touches data/portal.db)
import os from 'os';
import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';
import { test } from 'node:test';

process.env.PORTAL_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ugip-stu-'));
const { db } = await import('./connection');
const { seedIfEmpty, seedMissingStudents } = await import('./seed');
const { saveStudent, toDto, validate, friendlyError } = await import('./studentsRepo');
const { decrypt } = await import('./crypto');
const rules = await import('../../src/utils/studentRules');

seedIfEmpty();
// Row.
const row = (roll: string) => db.prepare('SELECT * FROM students WHERE roll_no=?').get(roll) as any;
const base = { name: 'Test Student', rollNo: '24090020099', branch: 'Civil', year: 3, semester: 5 } as any;

test('Aadhaar check digit: real numbers pass, a mistyped one fails', () => {
  assert.equal(rules.verhoeffValid('984652400133'), true);   // Tarun Giri
  assert.equal(rules.verhoeffValid('984652400134'), false);  // last digit changed
  assert.equal(rules.verhoeffValid('692505874587'), false);  // the number sent for Harshvardhan: mistyped
});

test('new students are in the database with the right details', () => {
  assert.equal((db.prepare('SELECT COUNT(*) c FROM students').get() as any).c, 18);
  const t = toDto(row('24090020019'));
  assert.equal(t.name, 'Tarun Giri'); assert.equal(t.category, 'General'); assert.equal(t.tenthPercentage, 50);
  assert.equal(t.years.find((y: any) => y.year === 1).cgpa, 6.94);
  assert.deepEqual(t.semesters.map((s: any) => s.percentage), [62.3, 64.2, 63.1, 64.7]);
  const s = toDto(row('24090020017'));
  assert.deepEqual(s.years.map((y: any) => [y.percentage, y.cgpa]), [[61.94, 6.52], [65.26, 6.87]]);
  assert.equal(row('25090022002').entry_type, 'Lateral');
});

test('Aadhaar: stored encrypted, API returns only the last 4 digits', () => {
  const r = row('24090020019');
  assert.notEqual(r.aadhar_enc, '9846 5240 0133');
  assert.equal(decrypt(r.aadhar_enc), '9846 5240 0133');
  const dto = toDto(r);
  assert.equal(dto.aadharMasked, 'XXXX XXXX 0133');
  assert.ok(!JSON.stringify(dto).includes('98465240'));
  assert.equal(toDto(row('25090022002')).aadharMasked, null);
});

test('missing details are listed; unfinished semesters and lateral-entry years are not counted', () => {
  assert.deepEqual(toDto(row('24090020019')).missing.sort(), ['gender', 'twelfthPercentage']);
  assert.deepEqual(toDto(row('24090020017')).missing.sort(), ['gender', 'sem1', 'sem2', 'sem3', 'sem4']);
  const h = toDto(row('25090022002')).missing;               // lateral entry: sem 1-2 / year 1 are never expected
  assert.ok(h.includes('aadharNumber') && h.includes('gender'));            // his sem 3-4 and year 2 results are now in the seed; Aadhaar is still to be added
  assert.ok(!h.includes('sem3') && !h.includes('year2'));
  assert.ok(!h.includes('sem1') && !h.includes('year1'));
});

test('validation rejects bad data with a clear message', () => {
  assert.equal(validate(base), null);
  assert.match(validate({ ...base, phone: '12345' })!, /10-digit/);
  assert.match(validate({ ...base, aadharNumber: '1234 5678 9012' })!, /mistyped|0 or 1/);
  assert.match(validate({ ...base, aadharNumber: '692505874587' })!, /mistyped/);
  assert.match(validate({ ...base, aadharNumber: '9846524001' })!, /12 digits/);
  assert.match(validate({ ...base, category: 'XYZ' })!, /Category/);
  assert.match(validate({ ...base, tenthPercentage: 120 })!, /10th/);
  assert.match(validate({ ...base, semesters: [{ semester: 1, percentage: 101 }] })!, /Semester 1/);
  assert.match(validate({ ...base, years: [{ year: 1, cgpa: 11 }] })!, /Year 1/);
  assert.match(validate({ ...base, branch: 'Mech' })!, /Branch/);
});

/** a valid-looking Aadhaar number for tests: 11 digits + the right check digit */
const makeAadhaar = (first11: string) => { for (let d = 0; d < 10; d++) if (rules.verhoeffValid(first11 + d)) return first11 + d; throw new Error('no digit'); };
const TEST_AADHAAR = makeAadhaar('23456789012');

test('saving: text numbers become numbers, phone is cleaned, Aadhaar is encrypted', () => {
  const id = saveStudent({ ...base, phone: '+91 98765 43210', tenthPercentage: '54.6%', aadharNumber: TEST_AADHAAR,
    semesters: [{ semester: 1, percentage: '62.3%' }], years: [{ year: 1, cgpa: '6.5 CGPA' }] } as any, 'test');
  const r = db.prepare('SELECT phone, typeof(tenth) t, tenth, aadhar_enc FROM students WHERE id=?').get(id) as any;
  assert.equal(r.phone, '9876543210');
  assert.equal(r.t, 'real'); assert.equal(r.tenth, 54.6);
  assert.equal(decrypt(r.aadhar_enc).replace(/\s/g, ''), TEST_AADHAAR);
  assert.deepEqual(toDto(db.prepare('SELECT * FROM students WHERE id=?').get(id)).semesters.map((x: any) => ({ ...x })), [{ semester: 1, percentage: 62.3, cgpa: null }]);
});

test('editing: a blank value clears it, a missing Aadhaar keeps the stored one', () => {
  const id = 'stu-' + base.rollNo;
  saveStudent({ ...base, id, phone: '', tenthPercentage: '', semesters: [], years: [], aadharNumber: undefined } as any, 'test');
  const r = db.prepare('SELECT * FROM students WHERE id=?').get(id) as any;
  assert.equal(r.phone, null); assert.equal(r.tenth, null);
  assert.equal(toDto(r).semesters.length, 0);
  assert.equal(decrypt(r.aadhar_enc).replace(/\s/g, ''), TEST_AADHAAR);   // not wiped
});

test('duplicates: same Aadhaar or same roll number is refused with a clear message', () => {
  assert.throws(() => saveStudent({ ...base, id: 'stu-other', rollNo: '24090020098', aadharNumber: TEST_AADHAAR } as any, 'test'), /already saved for roll no 24090020099/);
  assert.match(friendlyError(new Error('UNIQUE constraint failed: students.roll_no')), /roll number already exists/);
});

test('seedMissingStudents adds only what is absent and never revives a deleted student', () => {
  assert.equal(seedMissingStudents(), 0);
  db.prepare("UPDATE students SET deleted_at=datetime('now') WHERE roll_no='24090020019'").run();
  assert.equal(seedMissingStudents(), 0);
  assert.ok(row('24090020019').deleted_at);
  db.prepare("DELETE FROM students WHERE roll_no='24090020017'").run();
  assert.equal(seedMissingStudents(), 1);
  assert.equal(toDto(row('24090020017')).name, 'Sachin Singh');
});

