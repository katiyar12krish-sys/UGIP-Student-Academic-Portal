// ===================================================================================================
// Add / edit form of one student record (personal details, results, status), with validation.
// ===================================================================================================
import React, { useMemo, useState } from 'react';
import { X, Check, AlertCircle, Info, Eye, EyeOff, Lock } from 'lucide-react';
import type { UserProfile, BranchCode } from '../../types';
import {
  CATEGORIES, GENDERS, MISSING_LABEL, aadhaarDigits, formatAadhaar, missingFields, parseNumber, validateStudent,
} from '../../utils/studentRules';

/**
 * One form for both "Add student" and "Edit student".
 * - Every detail is optional except name, roll number, class: fill what you have, add the rest later.
 * - Blank details are marked "Missing" so it is clear what is still to be filled.
 * - A blank box really clears the value (the old editor silently kept the old value).
 * - Checked with the same rules as the server (src/utils/studentRules.ts) before saving.
 */

// Data shape: form state.
type FormState = Record<string, string>;
// Step 18: 'Passed Out', 'Detained', 'Year Back' and 'Left / Dropped' students are NOT moved up when the class is promoted
const STATUSES = ['Active / Enrolled', 'Fee Cleared', 'Documents Verified', 'Placement Ready', 'Pending Review', 'Passed Out', 'Detained', 'Year Back', 'Left / Dropped'] as const;

// Strip.
const strip = (v: unknown) => String(v ?? '').replace(/%/g, '').replace(/cgpa/gi, '').trim().replace(/^n\/?a$/i, '');

/** '6.94' -> '6.94 CGPA', '62.3' -> '62.3%'  (same split the server sync uses: up to 10 = CGPA, above = percentage) */
function pack(v: string, forceCgpa = false): string | undefined {
  const n = parseNumber(v);
  if (n === null || Number.isNaN(n)) return undefined;
  return forceCgpa || n <= 10 ? `${n} CGPA` : `${n}%`;
}

// Initial.
function initial(s: UserProfile | null): FormState {
  const sp = (s?.semestersPercentage ?? {}) as Record<string, string | undefined>;
  return {
    name: s?.name ?? '', aadharName: s?.aadharName && s.aadharName !== s.name ? s.aadharName : '',
    phone: s?.phone ?? '', rollNo: s?.ubterRollNumber || s?.rollNo || '', aadharNumber: s?.aadharNumber ?? '',
    branch: s?.branch ?? 'CSE', year: String(s?.year ?? 1), semester: String(s?.semester ?? 1), batch: s?.batch ?? '',
    category: s?.category ?? '', gender: s?.gender ?? '', recordStatus: s?.recordStatus ?? 'Active / Enrolled',
    tenth: strip(s?.tenthPercentage), twelfth: strip(s?.twelfthPercentage),
    y1: strip(s?.firstYearCgpa), y2: strip(s?.secondYearCgpa), y3: strip(s?.thirdYearCgpa),
    s1: strip(sp.sem1 ?? s?.sem1), s2: strip(sp.sem2 ?? s?.sem2), s3: strip(sp.sem3 ?? s?.sem3), s4: strip(sp.sem4 ?? s?.sem4),
    s5: strip(sp.sem5), s6: strip(sp.sem6),
    fullAddress: s?.fullAddress ?? '', motherName: s?.motherName ?? '', fatherName: s?.fatherName ?? '',
  };
}

/** The shape the server validates (so browser and server agree). */
function toCheck(f: FormState) {
  // Part.
  const part = (v: string) => { const n = parseNumber(v); return n === null ? { percentage: null, cgpa: null } : Number.isNaN(n) ? { percentage: NaN, cgpa: null } : n <= 10 ? { percentage: null, cgpa: n } : { percentage: n, cgpa: null }; };
  return {
    name: f.name, rollNo: f.rollNo.trim(), branch: f.branch, year: Number(f.year), semester: Number(f.semester),
    phone: f.phone.trim(), aadharNumber: f.aadharNumber.trim(), category: f.category, gender: f.gender,
    tenthPercentage: f.tenth, twelfthPercentage: f.twelfth,
    semesters: [1, 2, 3, 4, 5, 6].map((k) => ({ semester: k, ...part(f[`s${k}`]) })),
    years: [1, 2, 3].map((k) => ({ year: k, ...part(f[`y${k}`]) })),
  };
}

const inputCls = 'w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white';

// Data shape: field props.
interface FieldProps { label: string; missing?: boolean; hint?: React.ReactNode; className?: string; children: React.ReactNode }
// Field.
const Field: React.FC<FieldProps> = ({ label, missing, hint, className, children }) => (
  <div className={className}>
    <label className="flex items-center justify-between gap-2 font-bold text-slate-700 dark:text-slate-300 mb-1">
      <span>{label}</span>
      {missing && <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[9px] font-black uppercase">Missing</span>}
    </label>
    {children}
    {hint && <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{hint}</div>}
  </div>
);

// Data shape: student record form props.
export interface StudentRecordFormProps {
  /** null = add a new student */
  student: UserProfile | null;
  /** only an admin may look at the full Aadhaar number */
  canRevealAadhaar: boolean;
  /** roll numbers of all OTHER students, to catch duplicates before saving */
  takenRollNos: string[];
  onClose: () => void;
  onSave: (data: Partial<UserProfile>, isNew: boolean) => void;
}

// Screen part: student record form.
export const StudentRecordForm: React.FC<StudentRecordFormProps> = ({ student, canRevealAadhaar, takenRollNos, onClose, onSave }) => {
  const isNew = !student;
  // F (kept in screen state)
  const [f, setF] = useState<FormState>(() => initial(student));
  // Error message to show (error); empty = no error
  const [error, setError] = useState<string | null>(null);
  // Revealed (kept in screen state)
  const [revealed, setRevealed] = useState<string | null>(null);
  // Reveal msg (kept in screen state)
  const [revealMsg, setRevealMsg] = useState<string | null>(null);
  // Set.
  const set = (k: string, v: string) => { setF((p) => ({ ...p, [k]: v })); setError(null); };

  const aadharStored = !!(student?.aadharMasked || student?.aadharNumber);

  // Which details are still blank right now (updates as you type)
  const missing = useMemo(() => {
    const c = toCheck(f);
    // Filled.
    const filled = (r: { percentage: unknown; cgpa: unknown }) => r.percentage !== null || r.cgpa !== null;
    return new Set<string>(missingFields({
      semester: c.semester, batch: f.batch, aadharStored: aadharStored || !!f.aadharNumber.trim(),
      phone: f.phone, category: f.category, gender: f.gender, tenth: f.tenth, twelfth: f.twelfth,
      address: f.fullAddress, mother: f.motherName, father: f.fatherName,
      semesters: c.semesters.filter(filled), years: c.years.filter(filled),
    }));
  }, [f, aadharStored]);
  // M.
  const m = (k: string) => missing.has(k);
  // Miss.
  const miss = (k: string) => (m(k) ? 'border-amber-400 dark:border-amber-600' : 'border-slate-200 dark:border-slate-700');

  // Reveal.
  const reveal = async () => {
    if (revealed) { setRevealed(null); return; }
    setRevealMsg(null);
    try {
      const r = await fetch(`/api/students/${encodeURIComponent(student!.id)}/aadhar`, { credentials: 'same-origin' });
      const b = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(b.error || 'Could not load');
      if (!b.aadharNumber) setRevealMsg('Nothing saved on the server for this student yet.');
      else setRevealed(b.aadharNumber);
    } catch (e: any) { setRevealMsg(e.message === 'not found' ? 'This student is not saved on the server yet.' : 'Could not fetch the number. Check the connection and try again.'); }
  };

  // Submit.
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = toCheck(f);
    let problem = validateStudent(c as any);
    if (!problem && Math.ceil(c.semester / 2) !== c.year) problem = `Semester ${c.semester} belongs to year ${Math.ceil(c.semester / 2)}, not year ${c.year}. Please correct one of them`;
    if (!problem && takenRollNos.includes(c.rollNo)) problem = `Another student already has roll number ${c.rollNo}`;
    if (problem) { setError(problem); document.getElementById('student-form-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }

    const digits = aadhaarDigits(f.aadharNumber);
    // T.
    const t = (v: string) => v.trim() || undefined;
    const data: Partial<UserProfile> = {
      name: f.name.trim(), aadharName: t(f.aadharName) ?? f.name.trim(),
      phone: t(f.phone), rollNo: f.rollNo.trim(), ubterRollNumber: f.rollNo.trim(),
      branch: f.branch as BranchCode, year: Number(f.year) as 1 | 2 | 3, semester: Number(f.semester) as 1 | 2 | 3 | 4 | 5 | 6,
      batch: t(f.batch), category: t(f.category), gender: (t(f.gender) as UserProfile['gender']),
      tenthPercentage: pack(f.tenth) ? `${parseNumber(f.tenth)}%` : undefined,
      twelfthPercentage: pack(f.twelfth) ? `${parseNumber(f.twelfth)}%` : undefined,
      firstYearCgpa: pack(f.y1), secondYearCgpa: pack(f.y2), thirdYearCgpa: pack(f.y3),
      semestersPercentage: { sem1: pack(f.s1), sem2: pack(f.s2), sem3: pack(f.s3), sem4: pack(f.s4), sem5: pack(f.s5), sem6: pack(f.s6) },
      fullAddress: t(f.fullAddress), motherName: t(f.motherName), fatherName: t(f.fatherName),
      // a blank Aadhaar box keeps what the server already holds (it is never wiped from here)
      aadharNumber: digits ? formatAadhaar(digits) : student?.aadharNumber,
      recordStatus: f.recordStatus as UserProfile['recordStatus'],
    };
    onSave(data, isNew);
  };

  const missingList = [...missing].map((k) => MISSING_LABEL[k] ?? k);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-8 w-full max-w-3xl max-h-[92vh] overflow-y-auto space-y-5">
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 uppercase tracking-wider">
              {isNew ? 'Add new student' : 'Edit student record'}
            </span>
            <h3 className="font-black text-lg sm:text-xl text-slate-900 dark:text-white mt-1">
              {isNew ? 'New student' : student!.name}
            </h3>
            {!isNew && <p className="text-xs text-slate-500">UBTER: {student!.ubterRollNumber || student!.rollNo} · {student!.branch} · Year {student!.year}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={submit} className="space-y-5 text-xs" noValidate>
          <div id="student-form-top" />
          {error && (
            <div role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}
          {missingList.length > 0 ? (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span><b>{missingList.length} detail{missingList.length > 1 ? 's' : ''} still blank:</b> {missingList.join(', ')}. Fill what you have now; you can add the rest later by opening this record again.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-semibold">
              <Check className="w-4 h-4" /> All details are filled.
            </div>
          )}

          <section className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-blue-600">1. Identity &amp; contact</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Full name *"><input className={`${inputCls} border-slate-200 dark:border-slate-700 font-semibold`} value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
              <Field label="Name as on Aadhaar" hint="Leave blank if same as the name"><input className={`${inputCls} border-slate-200 dark:border-slate-700`} value={f.aadharName} onChange={(e) => set('aadharName', e.target.value)} /></Field>
              <Field label="Mobile number" missing={m('phone')}><input className={`${inputCls} ${miss('phone')} font-mono`} inputMode="numeric" maxLength={14} placeholder="10 digits" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
              <Field label="UBTER roll number *"><input className={`${inputCls} border-slate-200 dark:border-slate-700 font-mono font-bold`} inputMode="numeric" value={f.rollNo} onChange={(e) => set('rollNo', e.target.value)} /></Field>
              <Field label="Category" missing={m('category')}>
                <select className={`${inputCls} ${miss('category')}`} value={f.category} onChange={(e) => set('category', e.target.value)}>
                  <option value="">Not given</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Gender" missing={m('gender')}>
                <select className={`${inputCls} ${miss('gender')}`} value={f.gender} onChange={(e) => set('gender', e.target.value)}>
                  <option value="">Not given</option>{GENDERS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Aadhaar number (12 digits)" missing={m('aadharNumber')} className="sm:col-span-3"
                hint={aadharStored && !f.aadharNumber ? <>Saved: <span className="font-mono">{revealed ?? student?.aadharMasked ?? 'on this device'}</span>. Leave empty to keep it, or type a new number to replace it.</> : 'Stored encrypted on the server. Only the last 4 digits are shown to others.'}>
                <div className="flex gap-2">
                  <input className={`${inputCls} ${miss('aadharNumber')} font-mono`} inputMode="numeric" maxLength={14} placeholder="XXXX XXXX XXXX" autoComplete="off"
                    value={f.aadharNumber} onChange={(e) => set('aadharNumber', formatAadhaar(e.target.value.replace(/\D/g, '').slice(0, 12)))} />
                  {canRevealAadhaar && !isNew && student?.aadharMasked && (
                    <button type="button" onClick={reveal} className="shrink-0 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
                      {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}{revealed ? 'Hide' : 'Show full'}
                    </button>
                  )}
                </div>
                {revealMsg && <div className="mt-1 text-[10px] text-red-600">{revealMsg}</div>}
                {revealed && <div className="mt-1 text-[10px] text-slate-500 flex items-center gap-1"><Lock className="w-3 h-3" />Viewing the full number is recorded in the audit log.</div>}
              </Field>
            </div>
          </section>

          <section className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <h4 className="font-bold uppercase tracking-wider text-blue-600">2. Class</h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <Field label="Branch"><select className={`${inputCls} border-slate-200 dark:border-slate-700 font-bold`} value={f.branch} onChange={(e) => set('branch', e.target.value)}><option value="CSE">CSE</option><option value="Civil">Civil</option></select></Field>
              <Field label="Year"><select className={`${inputCls} border-slate-200 dark:border-slate-700 font-bold`} value={f.year} onChange={(e) => { const y = Number(e.target.value); setF((p) => ({ ...p, year: String(y), semester: String(y * 2 - 1) })); setError(null); }}>{[1, 2, 3].map((y) => <option key={y} value={y}>Year {y}</option>)}</select></Field>
              <Field label="Semester"><select className={`${inputCls} border-slate-200 dark:border-slate-700 font-bold`} value={f.semester} onChange={(e) => set('semester', e.target.value)}>{[1, 2, 3, 4, 5, 6].map((s) => <option key={s} value={s}>Semester {s}</option>)}</select></Field>
              <Field label="Batch"><input className={`${inputCls} border-slate-200 dark:border-slate-700`} placeholder="2024-2027" value={f.batch} onChange={(e) => set('batch', e.target.value)} /></Field>
              <Field label="Record status"><select className={`${inputCls} border-slate-200 dark:border-slate-700 font-bold`} value={f.recordStatus} onChange={(e) => set('recordStatus', e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
            </div>
          </section>

          <section className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <h4 className="font-bold uppercase tracking-wider text-blue-600">3. Marks</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="10th %" missing={m('tenthPercentage')}><input className={`${inputCls} ${miss('tenthPercentage')} font-mono text-center`} inputMode="decimal" placeholder="e.g. 84.5" value={f.tenth} onChange={(e) => set('tenth', e.target.value)} /></Field>
              <Field label="12th %" missing={m('twelfthPercentage')}><input className={`${inputCls} ${miss('twelfthPercentage')} font-mono text-center`} inputMode="decimal" placeholder="e.g. 78.2" value={f.twelfth} onChange={(e) => set('twelfth', e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((y) => (
                <Field key={y} label={`Year ${y} % / CGPA`} missing={m(`year${y}`)}><input className={`${inputCls} ${miss(`year${y}`)} font-mono text-center`} inputMode="decimal" placeholder={y === 1 ? 'e.g. 6.94' : ''} value={f[`y${y}`]} onChange={(e) => set(`y${y}`, e.target.value)} /></Field>
              ))}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[1, 2, 3, 4, 5, 6].map((k) => (
                <Field key={k} label={`Sem ${k} %`} missing={m(`sem${k}`)}><input className={`${inputCls} ${miss(`sem${k}`)} font-mono text-center`} inputMode="decimal" value={f[`s${k}`]} onChange={(e) => set(`s${k}`, e.target.value)} /></Field>
              ))}
            </div>
            <p className="text-[10px] text-slate-500">Type just the number. Up to 10 is saved as CGPA, above 10 as a percentage. Leave a box empty if the result is not available; a semester that has not happened yet is never counted as missing.</p>
          </section>

          <section className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <h4 className="font-bold uppercase tracking-wider text-blue-600">4. Parents &amp; address</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Father's name" missing={m('fatherName')}><input className={`${inputCls} ${miss('fatherName')}`} value={f.fatherName} onChange={(e) => set('fatherName', e.target.value)} /></Field>
              <Field label="Mother's name" missing={m('motherName')}><input className={`${inputCls} ${miss('motherName')}`} value={f.motherName} onChange={(e) => set('motherName', e.target.value)} /></Field>
              <Field label="Full address" missing={m('fullAddress')} className="sm:col-span-2"><textarea rows={2} className={`${inputCls} ${miss('fullAddress')}`} value={f.fullAddress} onChange={(e) => set('fullAddress', e.target.value)} /></Field>
            </div>
          </section>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
            <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md flex items-center gap-1.5"><Check className="w-4 h-4" />{isNew ? 'Add student' : 'Save changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
