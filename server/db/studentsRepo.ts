// ===================================================================================================
// Saving and reading student records.
// Validation (same rules as the browser form), Aadhaar encryption + duplicate check, semester / year results,
// a login row for every student, and turning database rows into the shape the screens use.
// ===================================================================================================
import { db } from './connection';
import { encrypt, decrypt, sha256 } from './crypto';
import { ensureStudentUser } from '../auth/service';
import {
  validateStudent, cleanPhone, aadhaarDigits, formatAadhaar, maskAadhaar, parseNumber, missingFields,
} from '../../src/utils/studentRules';

// Data shape: student input.
export interface StudentInput {
  id?: string; name: string; rollNo: string; branch: 'CSE' | 'Civil'; year: number; semester: number;
  phone?: string; aadharName?: string; aadharNumber?: string; batch?: string; entryType?: string;
  category?: string; gender?: string; tenthPercentage?: number | null; twelfthPercentage?: number | null;
  fullAddress?: string; motherName?: string; fatherName?: string; recordStatus?: string;
  semesters?: { semester: number; percentage?: number | null; cgpa?: number | null }[];
  years?: { year: number; percentage?: number | null; cgpa?: number | null }[];
}

// N.
const n = (v: unknown) => (v === undefined || v === null || (typeof v === 'string' && v.trim() === '') ? null : (v as any));
/** number for a REAL column: '50%' / '6.94 CGPA' / 62.3 -> number, blank or garbage -> null */
const num = (v: unknown) => { const x = parseNumber(v); return x === null || Number.isNaN(x) ? null : x; };

/** Same rules as the browser forms (src/utils/studentRules.ts). Returns the first problem, or null. */
export function validate(s: Partial<StudentInput>): string | null {
  return validateStudent(s as any);
}

// Save student.
export function saveStudent(s: StudentInput, actor = 'system'): string {
  const id = s.id || 'stu-' + s.rollNo;
  const prev = db.prepare('SELECT deleted_at FROM students WHERE id=?').get(id) as any;
  const exists = !!prev;
  const wasDeleted = !!prev?.deleted_at;
  const digits = s.aadharNumber ? aadhaarDigits(s.aadharNumber) : null;
  if (s.aadharNumber && !digits) throw new Error('Aadhaar number must be exactly 12 digits');
  const enc = digits ? encrypt(formatAadhaar(digits)) : null;
  const hash = digits ? sha256(digits) : null;
  if (hash) {   // one Aadhaar number = one student; a repeat is almost always a typing mistake
    const dup = db.prepare('SELECT roll_no FROM students WHERE aadhar_hash=? AND id<>? AND deleted_at IS NULL').get(hash, id) as any;
    if (dup) throw new Error(`This Aadhaar number is already saved for roll no ${dup.roll_no}`);
  }
  // Trim.
  const trim = (v: unknown) => (typeof v === 'string' ? v.trim() : v);
  const vals = [String(s.rollNo).trim(), String(s.name).trim(), n(trim(s.aadharName)) ?? String(s.name).trim(), s.phone ? cleanPhone(s.phone) : null,
    s.branch, Number(s.year), Number(s.semester), n(trim(s.batch)),
    s.entryType || 'Regular', n(trim(s.category)), n(trim(s.gender)), num(s.tenthPercentage), num(s.twelfthPercentage),
    n(trim(s.fullAddress)), n(trim(s.motherName)), n(trim(s.fatherName)), s.recordStatus || 'Active / Enrolled'];
  // Step 18: may be called inside a bigger transaction (bulk import, sample data) -> then use a SAVEPOINT instead of BEGIN.
  const nested = (db as any).isTransaction === true;
  db.exec(nested ? 'SAVEPOINT save_student' : 'BEGIN');
  try {
    if (exists) {
      db.prepare(`UPDATE students SET roll_no=?,name=?,aadhar_name=?,phone=?,branch=?,year=?,semester=?,batch=?,entry_type=?,category=?,gender=?,tenth=?,twelfth=?,address=?,mother=?,father=?,record_status=?,updated_at=CURRENT_TIMESTAMP,deleted_at=NULL WHERE id=?`).run(...vals, id);
      if (enc) db.prepare('UPDATE students SET aadhar_enc=?, aadhar_hash=? WHERE id=?').run(enc, hash, id);
    } else {
      db.prepare(`INSERT INTO students (roll_no,name,aadhar_name,phone,branch,year,semester,batch,entry_type,category,gender,tenth,twelfth,address,mother,father,record_status,id,aadhar_enc,aadhar_hash) VALUES (${'?,'.repeat(19)}?)`).run(...vals, id, enc, hash);
      db.prepare('INSERT INTO status_history (student_id,status,remarks,changed_by) VALUES (?,?,?,?)').run(id, vals[16], 'Record added', actor);
    }
    if (s.semesters) {
      db.prepare('DELETE FROM semester_results WHERE student_id=?').run(id);
      for (const r of s.semesters) { const p = num(r.percentage), c = num(r.cgpa); if (p !== null || c !== null) db.prepare('INSERT OR REPLACE INTO semester_results VALUES (?,?,?,?)').run(id, r.semester, p, c); }
    }
    if (s.years) {
      db.prepare('DELETE FROM year_results WHERE student_id=?').run(id);
      for (const r of s.years) { const p = num(r.percentage), c = num(r.cgpa); if (p !== null || c !== null) db.prepare('INSERT OR REPLACE INTO year_results VALUES (?,?,?,?)').run(id, r.year, p, c); }
    }
    db.prepare('INSERT INTO audit_logs (actor,action,entity,entity_id) VALUES (?,?,?,?)').run(actor, exists ? 'update' : 'create', 'student', id);
    ensureStudentUser(id);
    if (wasDeleted) db.prepare('UPDATE users SET is_active=1 WHERE student_id=?').run(id);
    db.exec(nested ? 'RELEASE save_student' : 'COMMIT');
  } catch (e) { db.exec(nested ? 'ROLLBACK TO save_student; RELEASE save_student' : 'ROLLBACK'); throw e; }
  return id;
}

/** Turns raw database errors into something a teacher can act on. */
export function friendlyError(e: any): string {
  const m = String(e?.message || e);
  if (/students\.roll_no/.test(m)) return 'A student with this roll number already exists';
  if (/UNIQUE|constraint/i.test(m)) return 'This record clashes with an existing one';
  return m.slice(0, 200);
}

/** Last 4 digits only. The full number never leaves the server except through the admin-only reveal route. */
function maskedAadhaar(enc: string | null): string | null {
  if (!enc) return null;
  try { return maskAadhaar(aadhaarDigits(decrypt(enc)) ?? ''); } catch { return 'XXXX XXXX ????'; }
}

// Converts to dto.
export function toDto(r: any) {
  const sems = db.prepare('SELECT semester,percentage,cgpa FROM semester_results WHERE student_id=? ORDER BY semester').all(r.id) as any[];
  const years = db.prepare('SELECT year,percentage,cgpa FROM year_results WHERE student_id=? ORDER BY year').all(r.id) as any[];
  const pv = (db.prepare('SELECT photo_version AS v FROM users WHERE id=?').get(r.id) as any)?.v;
  return {
    photoUrl: pv ? `/api/photos/${encodeURIComponent(r.id)}?v=${pv}` : null,
    id: r.id, name: r.name, aadharName: r.aadhar_name, rollNo: r.roll_no, phone: r.phone, branch: r.branch, year: r.year, semester: r.semester,
    batch: r.batch, entryType: r.entry_type, category: r.category, gender: r.gender,
    tenthPercentage: r.tenth, twelfthPercentage: r.twelfth, fullAddress: r.address, motherName: r.mother,
    fatherName: r.father, recordStatus: r.record_status, aadharStored: !!r.aadhar_enc, aadharMasked: maskedAadhaar(r.aadhar_enc),
    semesters: sems, years,
    missing: missingFields({ semester: r.semester, batch: r.batch, entryType: r.entry_type, aadharStored: !!r.aadhar_enc, phone: r.phone,
      category: r.category, gender: r.gender, tenth: r.tenth, twelfth: r.twelfth, address: r.address, mother: r.mother, father: r.father,
      semesters: sems, years }),
  };
}
