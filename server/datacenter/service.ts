// Data Center: filtered lists + counts, download tables for every kind of data, and bulk student upload (add / update).
// Pure database logic (no Express), so it is unit-tested with a throw-away database (npm run test:datacenter).
import { db } from '../db/connection';
import { saveStudent, validate, friendlyError, type StudentInput } from '../db/studentsRepo';
import { audit } from '../auth/service';
import { canReadSubjectMarks } from '../academic/access';
import type { SessionUser } from '../auth/session';
import { parseNumber, aadhaarDigits } from '../../src/utils/studentRules';

// Data shape: cell.
type Cell = string | number | null;
// Data shape: table.
export interface Table { title: string; subtitle: string; columns: string[]; rows: Cell[][]; filename: string }

// ---------------------------------------------------------------- students: filters and counts
export interface StudentFilter { branch?: string; year?: string; semester?: string; gender?: string; category?: string; status?: string; q?: string; realOnly?: boolean }   // realOnly: leave out SAMPLE students (server/auth/sample.ts)

/** gender / category 'Unknown' selects students whose value is still blank. */
export function filterStudents(f: StudentFilter): any[] {
  let sql = 'SELECT * FROM students WHERE deleted_at IS NULL' + (f.realOnly ? ' AND is_demo=0' : '');
  const p: any[] = [];
  // Eq.
  const eq = (col: string, v?: string) => {
    if (!v || v === 'all') return;
    if (v === 'Unknown') sql += ` AND (${col} IS NULL OR TRIM(${col})='')`; else { sql += ` AND ${col}=?`; p.push(v.slice(0, 60)); }
  };
  eq('branch', f.branch); eq('gender', f.gender); eq('category', f.category); eq('record_status', f.status);
  if (f.year && f.year !== 'all') { sql += ' AND year=?'; p.push(Number(f.year)); }
  if (f.semester && f.semester !== 'all') { sql += ' AND semester=?'; p.push(Number(f.semester)); }
  if (f.q) { sql += ' AND (name LIKE ? OR roll_no LIKE ?)'; p.push(`%${f.q.slice(0, 50)}%`, `%${f.q.slice(0, 50)}%`); }
  return db.prepare(sql + ' ORDER BY branch, year, roll_no').all(...p) as any[];
}

const GENDER_KEYS = ['Male', 'Female', 'Other', 'Unknown'] as const;
const CATEGORY_KEYS = ['General', 'OBC', 'SC', 'ST', 'EWS', 'Unknown'] as const;
// G key.
const gKey = (v: any) => (GENDER_KEYS as readonly string[]).includes(v) ? v : 'Unknown';
// C key.
const cKey = (v: any) => (CATEGORY_KEYS as readonly string[]).includes(v) ? v : 'Unknown';

// Summarize.
export function summarize(rows: any[]) {
  const byGender: Record<string, number> = Object.fromEntries(GENDER_KEYS.map((k) => [k, 0]));
  const byCategory: Record<string, number> = Object.fromEntries(CATEGORY_KEYS.map((k) => [k, 0]));
  const matrix: Record<string, Record<string, number>> = Object.fromEntries(CATEGORY_KEYS.map((c) => [c, Object.fromEntries(GENDER_KEYS.map((g) => [g, 0]))]));
  const classes = new Map<string, any>();
  for (const r of rows) {
    const g = gKey(r.gender), c = cKey(r.category);
    byGender[g]++; byCategory[c]++; matrix[c][g]++;
    const key = `${r.branch}|${r.year}`;
    if (!classes.has(key)) classes.set(key, { branch: r.branch, year: r.year, total: 0, Male: 0, Female: 0, Other: 0, Unknown: 0 });
    const k = classes.get(key); k.total++; k[g]++;
  }
  return { total: rows.length, byGender, byCategory, matrix, byClass: [...classes.values()] };
}

// ---------------------------------------------------------------- download tables
const stamp = () => new Date().toISOString().slice(0, 10);
// Label.
const label = (f: StudentFilter) => [f.branch, f.year && f.year !== 'all' ? `Year ${f.year}` : '', f.semester && f.semester !== 'all' ? `Sem ${f.semester}` : '', f.gender, f.category, f.status].filter((x) => x && x !== 'all').join(' / ') || 'All students';

export const STUDENT_COLUMNS = ['Roll No', 'Name', 'Branch', 'Year', 'Semester', 'Gender', 'Category', 'Batch', 'Entry Type', 'Phone', '10th %', '12th %', 'Address', 'Mother', 'Father', 'Status',
  'Sem 1 %', 'Sem 2 %', 'Sem 3 %', 'Sem 4 %', 'Sem 5 %', 'Sem 6 %', 'Year 1 %', 'Year 2 %', 'Year 3 %'];

// Students table.
export function studentsTable(f: StudentFilter): Table {
  const rows = filterStudents(f);
  const sem = db.prepare('SELECT student_id, semester, percentage, cgpa FROM semester_results').all() as any[];
  const yr = db.prepare('SELECT student_id, year, percentage, cgpa FROM year_results').all() as any[];
  const S = new Map<string, any>(), Y = new Map<string, any>();
  for (const r of sem) S.set(`${r.student_id}|${r.semester}`, r.percentage ?? r.cgpa);
  for (const r of yr) Y.set(`${r.student_id}|${r.year}`, r.percentage ?? r.cgpa);
  return {
    title: 'Student list', subtitle: label(f), filename: `Students_${stamp()}`, columns: STUDENT_COLUMNS,
    rows: rows.map((r) => [r.roll_no, r.name, r.branch, r.year, r.semester, r.gender ?? '', r.category ?? '', r.batch ?? '', r.entry_type ?? '', r.phone ?? '', r.tenth, r.twelfth,
      r.address ?? '', r.mother ?? '', r.father ?? '', r.record_status ?? '',
      ...[1, 2, 3, 4, 5, 6].map((k) => S.get(`${r.id}|${k}`) ?? ''), ...[1, 2, 3].map((k) => Y.get(`${r.id}|${k}`) ?? '')]),
  };
}

// Faculty table.
export function facultyTable(): Table {
  const users = db.prepare("SELECT * FROM users WHERE role='faculty' ORDER BY name").all() as any[];
  const subs = db.prepare(`SELECT a.user_id, s.code, s.name FROM faculty_subject_assignments a JOIN subjects s ON s.id=a.subject_id ORDER BY s.code`).all() as any[];
  return {
    title: 'Faculty / teachers', subtitle: 'All faculty', filename: `Faculty_${stamp()}`,
    columns: ['Name', 'Username', 'Department', 'Designation', 'Email', 'Phone', 'Subjects taught', 'Login active'],
    rows: users.map((u) => [u.name, u.username, u.department ?? '', u.designation ?? '', u.email ?? '', u.phone ?? '',
      subs.filter((s) => s.user_id === u.id).map((s) => `${s.code} ${s.name}`).join('; '), u.is_active ? 'Yes' : 'No']),
  };
}

// Subjects table.
export function subjectsTable(f: StudentFilter): Table {
  let sql = 'SELECT * FROM subjects WHERE 1=1'; const p: any[] = [];
  if (f.branch && f.branch !== 'all') { sql += ' AND branch=?'; p.push(f.branch); }
  if (f.semester && f.semester !== 'all') { sql += ' AND semester=?'; p.push(Number(f.semester)); }
  const subs = db.prepare(sql + ' ORDER BY branch, semester, code').all(...p) as any[];
  const fac = db.prepare(`SELECT a.subject_id, u.name FROM faculty_subject_assignments a JOIN users u ON u.id=a.user_id`).all() as any[];
  return {
    title: 'Subjects', subtitle: label(f), filename: `Subjects_${stamp()}`,
    columns: ['Code', 'Subject', 'Branch', 'Year', 'Semester', 'Credits', 'Practical', 'Faculty'],
    rows: subs.map((s) => [s.code, s.name, s.branch, s.year, s.semester, s.credits, s.has_practical ? 'Yes' : 'No', fac.filter((x) => x.subject_id === s.id).map((x) => x.name).join(', ')]),
  };
}

/** Marks: admin sees everything; faculty only subjects they teach or were granted (same rule as the marks screen). */
export function marksTable(u: SessionUser, f: StudentFilter): Table {
  let sql = `SELECT t.title, t.max_marks, t.subject_id, t.type, t.date, sub.code, sub.name AS subject, st.roll_no, st.name, st.branch, st.semester, k.marks_obtained
    FROM test_marks k JOIN tests t ON t.id=k.test_id AND t.deleted_at IS NULL JOIN subjects sub ON sub.id=t.subject_id
    JOIN students st ON st.id=k.student_id AND st.deleted_at IS NULL WHERE 1=1${f.realOnly ? ' AND st.is_demo=0 AND t.is_demo=0' : ''}`;
  const p: any[] = [];
  if (f.branch && f.branch !== 'all') { sql += ' AND st.branch=?'; p.push(f.branch); }
  if (f.year && f.year !== 'all') { sql += ' AND st.year=?'; p.push(Number(f.year)); }
  if (f.semester && f.semester !== 'all') { sql += ' AND st.semester=?'; p.push(Number(f.semester)); }
  const all = db.prepare(sql + ' ORDER BY st.branch, st.semester, sub.code, t.title, st.roll_no').all(...p) as any[];
  const rows = all.filter((r) => canReadSubjectMarks(u, r.subject_id));
  // Grade.
  const grade = (x: number) => (x >= 90 ? 'A+' : x >= 80 ? 'A' : x >= 70 ? 'B' : x >= 60 ? 'C' : x >= 40 ? 'D' : 'F');
  return {
    title: 'Marks', subtitle: label({ ...f, gender: undefined, category: undefined, status: undefined }), filename: `Marks_${stamp()}`,
    columns: ['Roll No', 'Name', 'Branch', 'Semester', 'Subject code', 'Subject', 'Exam', 'Type', 'Date', 'Max', 'Obtained', '%', 'Grade'],
    rows: rows.map((r) => { const pc = Math.round((r.marks_obtained / r.max_marks) * 1000) / 10; return [r.roll_no, r.name, r.branch, r.semester, r.code, r.subject, r.title, r.type, r.date ?? '', r.max_marks, r.marks_obtained, pc, grade(pc)]; }),
  };
}

/** Overall attendance per student (same counting as /api/attendance/summary: Present and Late count as attended). */
export function attendanceTable(f: StudentFilter): Table {
  const students = filterStudents({ ...f, gender: undefined, category: undefined, q: undefined });
  const agg = db.prepare(`SELECT st.id AS id, COUNT(a.id) AS total, SUM(CASE WHEN r.status IN ('Present','Late') THEN 1 ELSE 0 END) AS attended
    FROM students st LEFT JOIN attendance_sessions a ON a.branch=st.branch AND a.semester=st.semester
    LEFT JOIN attendance_records r ON r.session_id=a.id AND r.student_id=st.id WHERE st.deleted_at IS NULL GROUP BY st.id`).all() as any[];
  const A = new Map(agg.map((r) => [r.id, r]));
  return {
    title: 'Attendance (overall)', subtitle: label({ ...f, gender: undefined, category: undefined, status: undefined }), filename: `Attendance_${stamp()}`,
    columns: ['Roll No', 'Name', 'Branch', 'Year', 'Semester', 'Classes held', 'Attended', 'Attendance %'],
    rows: students.map((s) => { const a = A.get(s.id) || { total: 0, attended: 0 }; const at = a.attended || 0; return [s.roll_no, s.name, s.branch, s.year, s.semester, a.total, at, a.total ? Math.round((at / a.total) * 1000) / 10 : '']; }),
  };
}

export const DATASETS = ['students', 'faculty', 'subjects', 'marks', 'attendance'] as const;
// Dataset table.
export function datasetTable(name: string, u: SessionUser, f: StudentFilter): Table | null {
  if (name === 'students') return studentsTable(f);
  if (name === 'subjects') return subjectsTable(f);
  if (name === 'marks') return marksTable(u, f);
  if (name === 'attendance') return attendanceTable(f);
  if (name === 'faculty') return u.role === 'admin' ? facultyTable() : null;
  return null;
}

// ---------------------------------------------------------------- upload: add new students, update existing ones
const key = (h: unknown) => String(h ?? '').toLowerCase().replace(/%|\(|\)/g, '').replace(/percentage|percent|pct/g, '').replace(/[^a-z0-9\u0900-\u097f]+/g, '');
const ALIASES: Record<string, string> = {
  rollno: 'rollNo', roll: 'rollNo', rollnumber: 'rollNo', ubterrollno: 'rollNo', ubterrollnumber: 'rollNo', enrollmentno: 'rollNo',
  name: 'name', studentname: 'name', branch: 'branch', department: 'branch', year: 'year', semester: 'semester', sem: 'semester',
  gender: 'gender', sex: 'gender', category: 'category', batch: 'batch', entrytype: 'entryType', entry: 'entryType',
  phone: 'phone', mobile: 'phone', mobileno: 'phone', phoneno: 'phone', '10th': 'tenth', tenth: 'tenth', '10thmarks': 'tenth', '12th': 'twelfth', twelfth: 'twelfth', '12thmarks': 'twelfth',
  address: 'address', fulladdress: 'address', mother: 'mother', mothername: 'mother', father: 'father', fathername: 'father',
  status: 'status', recordstatus: 'status', aadhaar: 'aadhaar', aadhar: 'aadhaar', aadhaarnumber: 'aadhaar', aadharnumber: 'aadhaar',
  ...Object.fromEntries([1, 2, 3, 4, 5, 6].flatMap((k) => [[`sem${k}`, `sem${k}`], [`semester${k}`, `sem${k}`]])),
  ...Object.fromEntries([1, 2, 3].flatMap((k) => [[`year${k}`, `year${k}`]])),
};
const WORD_YEAR: Record<string, number> = { first: 1, '1st': 1, i: 1, second: 2, '2nd': 2, ii: 2, third: 3, '3rd': 3, iii: 3 };

// Norm gender.
export const normGender = (v: string) => {
  const t = v.trim().toLowerCase();
  if (/^(f|female|girl|woman|lady|ladki|लड़की|महिला|स्त्री)$/.test(t)) return 'Female';
  if (/^(m|male|boy|man|ladka|लड़का|पुरुष)$/.test(t)) return 'Male';
  if (/^(o|other|others|transgender|third gender|अन्य)$/.test(t)) return 'Other';
  return v.trim();   // left as typed, so validation reports it
};
// Norm category.
export const normCategory = (v: string) => {
  const t = v.trim().toLowerCase().replace(/[^a-z]/g, '');
  const m: Record<string, string> = { general: 'General', gen: 'General', ur: 'General', unreserved: 'General', obc: 'OBC', sc: 'SC', st: 'ST', ews: 'EWS' };
  return m[t] ?? v.trim();
};
// Norm branch.
const normBranch = (v: string) => { const t = v.trim().toLowerCase(); return /^(cse|cs|computer.*|computer science.*)$/.test(t) ? 'CSE' : /^civil/.test(t) ? 'Civil' : v.trim(); };
// Norm year.
const normYear = (v: string) => { const t = v.trim().toLowerCase().replace(/\s*year$/, ''); return WORD_YEAR[t] ?? (parseInt(t, 10) || NaN); };
// Text.
const text = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());

// Data shape: import row result.
export interface ImportRowResult { row: number; rollNo: string; name: string; action: 'create' | 'update' | 'unchanged' | 'error'; message: string }

/** `rows`: one object per sheet row, keyed by the sheet's header text. `apply=false` only checks and reports (nothing is written). */
export function importStudents(rows: Record<string, unknown>[], actor: string, apply: boolean) {
  const out: ImportRowResult[] = [];
  const seen = new Set<string>();
  rows.forEach((raw, i) => {
    const rowNo = i + 2;   // sheet row (header is row 1)
    const c: Record<string, string> = {};
    for (const [h, v] of Object.entries(raw)) { const k = ALIASES[key(h)]; if (k && text(v) !== '') c[k] = text(v); }
    const rollNo = c.rollNo || '', name0 = c.name || '';
    // Fail.
    const fail = (message: string) => out.push({ row: rowNo, rollNo, name: name0, action: 'error', message });
    if (!rollNo) return fail('Roll No is missing');
    if (seen.has(rollNo.toLowerCase())) return fail('Same Roll No appears twice in this file');
    seen.add(rollNo.toLowerCase());
    const old = db.prepare('SELECT * FROM students WHERE roll_no=?').get(rollNo) as any;
    const wasDeleted = !!old?.deleted_at;
    const oldSem = old ? Object.fromEntries((db.prepare('SELECT semester,percentage,cgpa FROM semester_results WHERE student_id=?').all(old.id) as any[]).map((r) => [r.semester, r])) : {};
    const oldYr = old ? Object.fromEntries((db.prepare('SELECT year,percentage,cgpa FROM year_results WHERE student_id=?').all(old.id) as any[]).map((r) => [r.year, r])) : {};
    // Blank cell = keep what is saved (a blank never erases data). New students need name, branch, year.
    const year = c.year ? normYear(c.year) : old?.year;
    const s: StudentInput = {
      id: old?.id, rollNo, name: c.name || old?.name || '', branch: (c.branch ? normBranch(c.branch) : old?.branch) as any, year: Number(year),
      semester: c.semester ? Number(c.semester) : old?.semester ?? (Number.isFinite(Number(year)) ? Number(year) * 2 - 1 : NaN),
      phone: c.phone ?? old?.phone ?? undefined, aadharName: old?.aadhar_name ?? undefined, aadharNumber: c.aadhaar,
      batch: c.batch ?? old?.batch ?? undefined, entryType: c.entryType ?? old?.entry_type ?? 'Regular',
      category: c.category ? normCategory(c.category) : old?.category ?? undefined, gender: c.gender ? normGender(c.gender) : old?.gender ?? undefined,
      tenthPercentage: c.tenth !== undefined ? (parseNumber(c.tenth) as any) : old?.tenth, twelfthPercentage: c.twelfth !== undefined ? (parseNumber(c.twelfth) as any) : old?.twelfth,
      fullAddress: c.address ?? old?.address ?? undefined, motherName: c.mother ?? old?.mother ?? undefined, fatherName: c.father ?? old?.father ?? undefined,
      recordStatus: c.status ?? old?.record_status ?? 'Active / Enrolled',
    };
    if (!old && !c.name) return fail('Name is missing (needed for a new student)');
    if (!old && (!c.branch || !c.year)) return fail('Branch and Year are needed for a new student');
    // results: only the cells that were filled replace the saved ones
    const semesters = [1, 2, 3, 4, 5, 6].filter((k) => c[`sem${k}`] !== undefined).map((k) => ({ semester: k, percentage: parseNumber(c[`sem${k}`]) as any, cgpa: null as any }));
    const years = [1, 2, 3].filter((k) => c[`year${k}`] !== undefined).map((k) => ({ year: k, percentage: parseNumber(c[`year${k}`]) as any, cgpa: null as any }));
    if (semesters.some((r) => Number.isNaN(r.percentage)) || years.some((r) => Number.isNaN(r.percentage))) return fail('A semester / year result is not a number');
    if (Number.isNaN(s.tenthPercentage as any) || Number.isNaN(s.twelfthPercentage as any)) return fail('10th / 12th % must be a number');
    const err = validate({ ...s, semesters, years });
    if (err) return fail(err);
    if (c.aadhaar && !aadhaarDigits(c.aadhaar)) return fail('Aadhaar number must be exactly 12 digits');

    // what would change?
    const changes: string[] = [];
    if (old) {
      const cmp: [string, any, any][] = [['name', s.name, old.name], ['branch', s.branch, old.branch], ['year', s.year, old.year], ['semester', s.semester, old.semester], ['phone', s.phone ? String(s.phone).replace(/\D/g, '').slice(-10) : null, old.phone],
        ['gender', s.gender ?? null, old.gender], ['category', s.category ?? null, old.category], ['batch', s.batch ?? null, old.batch], ['entry type', s.entryType, old.entry_type], ['10th %', s.tenthPercentage ?? null, old.tenth],
        ['12th %', s.twelfthPercentage ?? null, old.twelfth], ['address', s.fullAddress ?? null, old.address], ['mother', s.motherName ?? null, old.mother], ['father', s.fatherName ?? null, old.father], ['status', s.recordStatus, old.record_status]];
      for (const [l, a, b] of cmp) if ((a ?? null) !== (b ?? null) && !(a === undefined && b === null)) changes.push(l);
      for (const r of semesters) if ((oldSem[r.semester]?.percentage ?? null) !== r.percentage) changes.push(`sem ${r.semester} %`);
      for (const r of years) if ((oldYr[r.year]?.percentage ?? null) !== r.percentage) changes.push(`year ${r.year} %`);
      if (c.aadhaar) changes.push('aadhaar');
      if (wasDeleted) changes.push('restored (was deleted)');
    }
    if (old && changes.length === 0) { out.push({ row: rowNo, rollNo, name: s.name, action: 'unchanged', message: 'Same as saved' }); return; }
    if (apply) {
      try {
        const merged = old ? { ...s, semesters: semesters.length ? mergeResults(oldSem, semesters, 'semester') : undefined, years: years.length ? mergeResults(oldYr, years, 'year') : undefined } : { ...s, semesters, years };
        saveStudent(merged as StudentInput, actor);
      } catch (e: any) { return fail(friendlyError(e)); }
    }
    out.push({ row: rowNo, rollNo, name: s.name, action: old ? 'update' : 'create', message: old ? `Changes: ${changes.join(', ')}` : 'New student' });
  });
  // Count.
  const count = (a: string) => out.filter((r) => r.action === a).length;
  const summary = { total: out.length, created: count('create'), updated: count('update'), unchanged: count('unchanged'), errors: count('error'), applied: apply };
  if (apply) audit(actor, 'bulk_import_students', 'student', 'bulk', `${summary.created} new, ${summary.updated} updated, ${summary.errors} rejected`);
  return { summary, results: out };
}

// Merge results.
function mergeResults(old: Record<number, any>, given: any[], field: 'semester' | 'year') {
  const m = new Map<number, any>(Object.values(old).map((r: any) => [r[field], { [field]: r[field], percentage: r.percentage, cgpa: r.cgpa }]));
  for (const g of given) m.set(g[field], g);
  return [...m.values()];
}
