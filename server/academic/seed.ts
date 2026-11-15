// =====================================================================================================
// Subject list (curriculum) seeding
// -----------------------------------------------------------------------------------------------------
// The official UBTER subjects live in server/db/seed-subjects.json (first year common subjects 991xxx / 992xxx,
// CSE 3rd semester 0530xx, Civil 3rd semester 023xxx, ...). This file puts them into the database:
//   * seedSubjectsIfEmpty()   brand-new database: load every subject
//   * seedMissingSubjects()   existing database: add subjects that are new in the JSON file, and upgrade the
//                             few old placeholder subjects (e.g. "CS-301") to their official code / name -
//                             but ONLY if nobody has edited them in the app (the code is still the old one).
// Subjects added, edited or deleted by the admin in the app are never overwritten.
// =====================================================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../db/connection';

/** Read the curriculum file (same folder layout in development and production). */
function readSeed(): any[] {
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '../db/seed-subjects.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Placeholder codes used before Step 18 -> they may be replaced by the official one (id stays the same). */
const OLD_PLACEHOLDER_CODES: Record<string, string> = {
  'sub-cse-101': 'CS-101', 'sub-cse-102': 'AS-101', 'sub-cse-103': 'AS-102', 'sub-cse-104': 'AS-103',
  'sub-cse-105': 'CS-102', 'sub-cse-301': 'CS-301', 'sub-ce-301': 'CE-301',
};

const INSERT_SQL = 'INSERT OR IGNORE INTO subjects (id,code,name,branch,semester,year,credits,has_practical) VALUES (?,?,?,?,?,?,?,?)';

/** First run / upgrade: load the curriculum subjects (core fields only; syllabus text stays in the app). */
export function seedSubjectsIfEmpty() {
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM subjects').get() as { c: number };
  if (c > 0) return seedMissingSubjects();
  const subs = readSeed();
  const ins = db.prepare(INSERT_SQL);
  for (const s of subs) ins.run(s.id, s.code, s.name, s.branch, s.semester, s.year, s.credits, s.hasPractical ? 1 : 0);
  console.log(`[academic] Loaded ${subs.length} subjects.`);
}

/** Existing database: add new subjects from the file, upgrade untouched placeholders. Returns how many changed. */
export function seedMissingSubjects(): number {
  let changed = 0;
  const ins = db.prepare(INSERT_SQL);
  for (const s of readSeed()) {
    const cur = db.prepare('SELECT code FROM subjects WHERE id=?').get(s.id) as any;
    if (!cur) {                                   // new subject -> add it
      ins.run(s.id, s.code, s.name, s.branch, s.semester, s.year, s.credits, s.hasPractical ? 1 : 0);
      changed++;
    } else if (OLD_PLACEHOLDER_CODES[s.id] && cur.code === OLD_PLACEHOLDER_CODES[s.id] && cur.code !== s.code) {
      // still the old placeholder (nobody edited it) -> give it the official code and name
      db.prepare('UPDATE subjects SET code=?, name=?, semester=?, year=?, credits=?, has_practical=? WHERE id=?')
        .run(s.code, s.name, s.semester, s.year, s.credits, s.hasPractical ? 1 : 0, s.id);
      changed++;
    }
  }
  changed += upgradeCurriculum2026();
  if (changed) console.log(`[academic] Added / updated ${changed} subject(s) from the official UBTER list.`);
  return changed;
}

/**
 * CSE subjects of the UBTER 2026-27 scheme (Sem 3 booklet "2026-27_Computer Science Engineering III Sem"
 * and the Sem 5 syllabus in src/data/syllabusCseSem5.ts). The old subject rows keep their id, so faculty
 * assignments, exams, attendance and practicals stay attached. A row is changed only while it still has its
 * OLD code (nobody edited it in the app). Old subjects that are not in the new scheme (IoT, Data Communication,
 * Digital Techniques, Web Technology & Cloud Computing) had only sample data or nothing, so their row is reused
 * for a new-scheme subject; their sample exam titles get the new code and their sample practicals are removed.
 */
const CURRICULUM_2026: { id: string; fromCode: string; replacesOtherSubject?: boolean }[] = [
  { id: 'sub-cse-301', fromCode: '053006' },                                  // Programming in C -> Concepts of C Programming
  { id: 'sub-cse-053005', fromCode: '053005' },                               // Operating System (new code)
  { id: 'sub-cse-053004', fromCode: '053004' },                               // Office Application (new code)
  { id: 'sub-cse-053003', fromCode: '053003', replacesOtherSubject: true },   // Digital Techniques -> Computer Organization
  { id: 'sub-cse-053001', fromCode: '053001', replacesOtherSubject: true },   // Internet of Things -> Internet & Web Design
  { id: 'sub-cse-053002', fromCode: '053002', replacesOtherSubject: true },   // Data Communication -> Open Source Software
  { id: 'sub-cse-hw', fromCode: 'CSE-CHM' },                                  // Hardware lab -> Computer Hardware and Servicing (real practicals kept)
  { id: 'sub-cse-501', fromCode: 'CS-501', replacesOtherSubject: true },      // Web Technology & Cloud -> Java Programming
];
const RECORD_TABLES = ['tests', 'attendance_sessions', 'online_tests', 'practical_experiments'];

function upgradeCurriculum2026(): number {
  const seed = new Map(readSeed().map((s) => [s.id, s]));
  let changed = 0;
  for (const m of CURRICULUM_2026) {
    const cur = db.prepare('SELECT code FROM subjects WHERE id=?').get(m.id) as any;
    const to = seed.get(m.id);
    if (!cur || !to || cur.code !== m.fromCode || cur.code === to.code) continue;
    if (m.replacesOtherSubject) {
      // only when everything on the old subject is sample data (real records belong to the old subject)
      const real = RECORD_TABLES.some((t) => (db.prepare(`SELECT COUNT(*) n FROM ${t} WHERE subject_id=? AND is_demo=0`).get(m.id) as any).n > 0)
        || (db.prepare('SELECT (SELECT COUNT(*) FROM doubts WHERE subject_id=?) + (SELECT COUNT(*) FROM materials WHERE subject_id=?) + (SELECT COUNT(*) FROM dispatches WHERE subject_id=?) AS n').get(m.id, m.id, m.id) as any).n > 0;
      if (real) { console.warn(`[academic] ${m.fromCode} has real records, so it was NOT replaced by ${to.code} ${to.name}. Add that subject by hand.`); continue; }
    }
    db.exec('BEGIN');
    try {
      db.prepare('UPDATE subjects SET code=?, name=?, semester=?, year=?, credits=?, has_practical=? WHERE id=?')
        .run(to.code, to.name, to.semester, to.year, to.credits, to.hasPractical ? 1 : 0, m.id);
      db.prepare('UPDATE tests SET title=REPLACE(title, ?, ?) WHERE subject_id=? AND is_demo=1').run(m.fromCode, to.code, m.id);
      if (m.replacesOtherSubject) {
        db.prepare('DELETE FROM practical_experiments WHERE subject_id=? AND is_demo=1').run(m.id);   // their marks go with them
        db.prepare("UPDATE online_tests SET title=? || ': ' || SUBSTR(title, INSTR(title, ':') + 2) WHERE subject_id=? AND is_demo=1 AND INSTR(title, ':') > 0").run(to.name, m.id);
      }
      db.exec('COMMIT');
      console.log(`[academic] ${m.fromCode} -> ${to.code} ${to.name} (2026-27 scheme)`);
      changed++;
    } catch (e) { db.exec('ROLLBACK'); throw e; }
  }
  return changed;
}
