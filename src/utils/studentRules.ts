/**
 * Student data rules shared by the browser forms and the server (server/db/studentsRepo.ts).
 * Pure functions, no imports, so both sides apply exactly the same checks.
 */
export const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS'] as const;
export const GENDERS = ['Male', 'Female', 'Other'] as const;

const D = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
const P = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];

/** Verhoeff checksum: the last digit of every real Aadhaar number is a check digit, so most typing mistakes are caught. */
export function verhoeffValid(digits: string): boolean {
  let c = 0;
  const rev = digits.split('').reverse();
  for (let i = 0; i < rev.length; i++) c = D[c][P[i % 8][Number(rev[i])]];
  return c === 0;
}

/** '9846 5240 0133' / '984652400133' -> '984652400133'; anything else -> null. Does not check the checksum. */
export const aadhaarDigits = (v: unknown): string | null => {
  const t = String(v ?? '').replace(/[\s-]/g, '');
  return /^\d{12}$/.test(t) ? t : null;
};
// Format aadhaar.
export const formatAadhaar = (digits: string) => digits.replace(/(\d{4})(?=\d)/g, '$1 ');
// Mask aadhaar.
export const maskAadhaar = (digits: string) => `XXXX XXXX ${digits.slice(-4)}`;

/** Returns a clean 10-digit Indian mobile number, or null. Accepts +91 / 91 / 0 prefixes and spaces. */
export function cleanPhone(v: unknown): string | null {
  let t = String(v ?? '').replace(/[\s()-]/g, '');
  t = t.replace(/^\+?91(?=\d{10}$)/, '').replace(/^0(?=\d{10}$)/, '');
  return /^[6-9]\d{9}$/.test(t) ? t : null;
}

/** '62.3', '62.3%', ' 6.94 CGPA' -> number, '' / 'N/A' / undefined -> null, garbage -> NaN */
export function parseNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  const t = String(v).trim();
  if (t === '' || /^n\/?a$/i.test(t)) return null;
  const m = t.match(/^(\d+(?:\.\d+)?)\s*(%|cgpa)?$/i);
  return m ? parseFloat(m[1]) : NaN;
}

// Data shape: student like.
export interface StudentLike {
  name?: string; rollNo?: string; branch?: string; year?: number | string; semester?: number | string;
  phone?: string | null; aadharNumber?: string | null; category?: string | null; gender?: string | null;
  tenthPercentage?: unknown; twelfthPercentage?: unknown; fullAddress?: string | null; motherName?: string | null; fatherName?: string | null;
  semesters?: { semester: number; percentage?: unknown; cgpa?: unknown }[];
  years?: { year: number; percentage?: unknown; cgpa?: unknown }[];
}

/** First problem found, in plain words (English), or null when the record is fine. */
export function validateStudent(s: StudentLike): string | null {
  if (!String(s.name ?? '').trim()) return 'Name is required';
  if (String(s.name).length > 120) return 'Name is too long';
  const roll = String(s.rollNo ?? '').trim();
  if (!roll) return 'UBTER roll number is required';
  if (!/^[A-Za-z0-9/_-]{4,24}$/.test(roll)) return 'Roll number may only have letters, digits, / _ - (4 to 24 characters)';
  if (s.branch !== 'CSE' && s.branch !== 'Civil') return "Branch must be 'CSE' or 'Civil'";
  if (![1, 2, 3].includes(Number(s.year))) return 'Year must be 1, 2 or 3';
  if (!(Number(s.semester) >= 1 && Number(s.semester) <= 6)) return 'Semester must be 1 to 6';
  if (s.phone && !cleanPhone(s.phone)) return 'Mobile number must be a 10-digit Indian number (starts with 6-9)';
  if (s.aadharNumber) {
    const d = aadhaarDigits(s.aadharNumber);
    if (!d) return 'Aadhaar number must be exactly 12 digits';
    if (/^[01]/.test(d)) return 'Aadhaar number cannot start with 0 or 1';
    if (!verhoeffValid(d)) return 'Aadhaar number looks mistyped (check digit does not match). Please re-check it';
  }
  if (s.category && !(CATEGORIES as readonly string[]).includes(s.category)) return 'Category must be General, OBC, SC, ST or EWS';
  if (s.gender && !(GENDERS as readonly string[]).includes(s.gender)) return 'Gender must be Male, Female or Other';
  for (const [label, v] of [['10th %', s.tenthPercentage], ['12th %', s.twelfthPercentage]] as const) {
    const n = parseNumber(v);
    if (n !== null && !(n >= 0 && n <= 100)) return `${label} must be a number from 0 to 100`;
  }
  for (const r of s.semesters ?? []) {
    if (!(r.semester >= 1 && r.semester <= 6)) return 'Semester result has an invalid semester number';
    const p = parseNumber(r.percentage), c = parseNumber(r.cgpa);
    if (p !== null && !(p >= 0 && p <= 100)) return `Semester ${r.semester} percentage must be 0 to 100`;
    if (c !== null && !(c >= 0 && c <= 10)) return `Semester ${r.semester} CGPA must be 0 to 10`;
  }
  for (const r of s.years ?? []) {
    if (!(r.year >= 1 && r.year <= 3)) return 'Year result has an invalid year number';
    const p = parseNumber(r.percentage), c = parseNumber(r.cgpa);
    if (p !== null && !(p >= 0 && p <= 100)) return `Year ${r.year} percentage must be 0 to 100`;
    if (c !== null && !(c >= 0 && c <= 10)) return `Year ${r.year} CGPA must be 0 to 10`;
  }
  return null;
}

// Data shape: missing key.
export type MissingKey =
  | 'phone' | 'aadharNumber' | 'category' | 'gender' | 'tenthPercentage' | 'twelfthPercentage'
  | 'fullAddress' | 'motherName' | 'fatherName' | `sem${1 | 2 | 3 | 4 | 5 | 6}` | `year${1 | 2 | 3}`;

export const MISSING_LABEL: Record<string, string> = {
  phone: 'Mobile number', aadharNumber: 'Aadhaar number', category: 'Category', gender: 'Gender',
  tenthPercentage: '10th %', twelfthPercentage: '12th %', fullAddress: 'Address', motherName: "Mother's name", fatherName: "Father's name",
  sem1: '1st sem %', sem2: '2nd sem %', sem3: '3rd sem %', sem4: '4th sem %', sem5: '5th sem %', sem6: '6th sem %',
  year1: '1st year %/CGPA', year2: '2nd year %/CGPA', year3: '3rd year %/CGPA',
};

/**
 * Which details are still blank. Results are only expected for semesters that are already over
 * (a student now in semester 5 has finished 1-4), and lateral-entry students never had year 1 / sem 1-2 here.
 */
export function missingFields(s: {
  semester: number; batch?: string | null; entryType?: string | null; aadharStored: boolean;
  phone?: unknown; category?: unknown; gender?: unknown; tenth?: unknown; twelfth?: unknown; address?: unknown; mother?: unknown; father?: unknown;
  semesters: { semester: number; percentage?: unknown; cgpa?: unknown }[];
  years: { year: number; percentage?: unknown; cgpa?: unknown }[];
}): MissingKey[] {
  // Blank.
  const blank = (v: unknown) => v === null || v === undefined || String(v).trim() === '';
  const out: MissingKey[] = [];
  if (blank(s.phone)) out.push('phone');
  if (!s.aadharStored) out.push('aadharNumber');
  if (blank(s.category)) out.push('category');
  if (blank(s.gender)) out.push('gender');
  if (blank(s.tenth)) out.push('tenthPercentage');
  if (blank(s.twelfth)) out.push('twelfthPercentage');
  if (blank(s.address)) out.push('fullAddress');
  if (blank(s.mother)) out.push('motherName');
  if (blank(s.father)) out.push('fatherName');
  const lateral = /lateral/i.test(`${s.batch ?? ''} ${s.entryType ?? ''}`);
  const done = Math.max(0, Number(s.semester) - 1);        // semesters already completed
  // Have.
  const have = (r?: { percentage?: unknown; cgpa?: unknown }) => !!r && (!blank(r.percentage) || !blank(r.cgpa));
  for (let k = lateral ? 3 : 1; k <= done; k++) if (!have(s.semesters.find((r) => r.semester === k))) out.push(`sem${k}` as MissingKey);
  for (let y = lateral ? 2 : 1; y <= Math.floor(done / 2); y++) if (!have(s.years.find((r) => r.year === y))) out.push(`year${y}` as MissingKey);
  return out;
}
