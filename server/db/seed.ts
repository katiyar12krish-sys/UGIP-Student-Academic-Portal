// ===================================================================================================
// First students of a new installation, from server/db/seed-data.json.
// seedIfEmpty runs on a brand-new database; seedMissingStudents adds students that were added to the
// file later. Never changes records that already exist.
// ===================================================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './connection';
import { saveStudent, type StudentInput } from './studentsRepo';

// Loads the initial students only when the table is empty (first run).
export function seedIfEmpty() {
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM students').get() as { c: number };
  if (c > 0) return;
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'seed-data.json');
  const rows: StudentInput[] = JSON.parse(fs.readFileSync(file, 'utf8'));
  rows.forEach((r) => saveStudent(r, 'seed'));
  console.log(`Seeded ${rows.length} students into data/portal.db`);
}

/**
 * Adds students that exist in seed-data.json but not in the database yet (matched by id or roll number).
 * Needed because seedIfEmpty only runs on a brand-new database: when a new student is added to the seed file,
 * existing installations still receive them. Never changes or revives records already in the database
 * (including soft-deleted ones).
 */
export function seedMissingStudents(): number {
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'seed-data.json');
  const rows: StudentInput[] = JSON.parse(fs.readFileSync(file, 'utf8'));
  let added = 0;
  for (const r of rows) {
    const id = r.id || 'stu-' + r.rollNo;
    if (db.prepare('SELECT 1 FROM students WHERE id=? OR roll_no=?').get(id, r.rollNo)) continue;
    saveStudent(r, 'seed');
    added++;
  }
  if (added) console.log(`Added ${added} new student(s) from seed-data.json`);
  return added;
}
