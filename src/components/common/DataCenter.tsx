// ===================================================================================================
// Data Center screen: filter and count students, download lists, admin bulk upload.
// ===================================================================================================
import React, { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, Download, Upload, Users, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import ExportMenu from './ExportMenu';
import { exportExcel, exportPdf, exportCsv, type ExportTable } from '../../utils/exporter';
import { readSheetFile, type SheetRow } from '../../utils/importer';
import { dataCenterApi, type DcFilter, type DcSummary, type DcRow, type ImportResult } from '../../services/dataCenterApi';
import { academicApi, type MarkInput } from '../../services/academicApi';
import { useCollege } from '../../context/CollegeContext';
import { uiAlert, confirmDialog, notify } from './ui/feedback';   // Step 18: styled message instead of the browser's alert box

const EMPTY: DcFilter = { branch: 'all', year: 'all', semester: 'all', gender: 'all', category: 'all', status: 'all', q: '' };
const GEN = ['Male', 'Female', 'Other', 'Unknown'];
const CAT = ['General', 'OBC', 'SC', 'ST', 'EWS', 'Unknown'];
const GEN_LABEL: Record<string, string> = { Male: 'Boys (ladke)', Female: 'Girls (ladkiyan)', Other: 'Other', Unknown: 'Not filled' };

const card = 'rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm';
const sel = 'rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100';
const btn = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-white shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

/** Excel / PDF / CSV buttons for a table that is fetched from the server when pressed. */
function FetchDownload({ label, load }: { label: string; load: () => Promise<ExportTable | string> }) {
  // true while waiting for the server (buttons are disabled meanwhile)
  const [busy, setBusy] = useState<string | null>(null);
  // Run.
  const run = (kind: 'xlsx' | 'pdf' | 'csv') => async () => {
    setBusy(kind);
    const t = await load();
    setBusy(null);
    if (typeof t === 'string') { uiAlert(t); return; }
    if (t.rows.length === 0) { uiAlert('Nothing to download yet for this selection.'); return; }
    kind === 'xlsx' ? exportExcel(t) : kind === 'pdf' ? exportPdf(t) : exportCsv(t);
  };
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={label}>
      <button disabled={!!busy} onClick={run('xlsx')} className={btn + ' bg-emerald-600 hover:bg-emerald-500'}>{busy === 'xlsx' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} Excel</button>
      <button disabled={!!busy} onClick={run('pdf')} className={btn + ' bg-red-600 hover:bg-red-500'}>{busy === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} PDF</button>
      <button disabled={!!busy} onClick={run('csv')} className={btn + ' bg-slate-600 hover:bg-slate-500'}>{busy === 'csv' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} CSV</button>
    </div>
  );
}

const TEMPLATE_COLS = ['Roll No', 'Name', 'Branch', 'Year', 'Semester', 'Gender', 'Category', 'Batch', 'Entry Type', 'Phone', '10th %', '12th %', 'Address', 'Mother', 'Father', 'Status', 'Aadhaar',
  'Sem 1 %', 'Sem 2 %', 'Sem 3 %', 'Sem 4 %', 'Sem 5 %', 'Sem 6 %', 'Year 1 %', 'Year 2 %', 'Year 3 %'];

export default function DataCenter({ mode }: { mode: 'admin' | 'faculty' }) {
  const isAdmin = mode === 'admin';
  // F (kept in screen state)
  const [f, setF] = useState<DcFilter>(EMPTY);
  // Data (kept in screen state)
  const [data, setData] = useState<{ summary: DcSummary; rows: DcRow[] } | null>(null);
  // Err (kept in screen state)
  const [err, setErr] = useState('');
  // true while waiting for the server (buttons are disabled meanwhile)
  const [loading, setLoading] = useState(false);
  // Admin: students ticked in the list below (for "change status" / "delete")
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [newStatus, setNewStatus] = useState('Passed Out');
  const { deleteStudent, updateStudentRecordStatus } = useCollege();
  const togglePick = (id: string) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const refresh = () => setTimeout(() => setF((p) => ({ ...p })), 1200);   // the change is sent to the server in the background

  // Change the record status of every ticked student
  const applyStatus = async () => {
    if (!picked.size) return;
    if (!(await confirmDialog({ title: `Change status of ${picked.size} student(s)?`, message: `New status: "${newStatus}". Passed Out / Detained / Year Back / Left students are not moved up in the next promotion.` }))) return;
    picked.forEach((id) => updateStudentRecordStatus(id, newStatus as any, 'Changed from Data Center'));
    notify.success('Status changed', `${picked.size} student(s) set to "${newStatus}".`);
    setPicked(new Set()); refresh();
  };
  // Delete every ticked student
  const deletePicked = async () => {
    if (!picked.size) return;
    if (!(await confirmDialog({ title: `Delete ${picked.size} student record(s)?`, message: 'Their marks, attendance and results stay in old reports, but the students are removed from all lists. Prefer "Left / Dropped" if they only left the college.', danger: true }))) return;
    picked.forEach((id) => deleteStudent(id));
    notify.success('Deleted', `${picked.size} student record(s) removed.`);
    setPicked(new Set()); refresh();
  };
  // Set.
  const set = (k: keyof DcFilter) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  // Runs automatically whenever these change: f.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await dataCenterApi.students(f);
      if (!alive) return;
      setLoading(false);
      if (r.ok) { setData(r.data); setErr(''); } else setErr(r.error);
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [f]);

  const s = data?.summary;
  // Summary table.
  const summaryTable = (): ExportTable => ({
    title: 'Student count report', subtitle: 'Category x Gender (filters applied)', filename: 'Student_Counts', sheetName: 'Counts',
    columns: ['Category', 'Boys', 'Girls', 'Other', 'Gender not filled', 'Total'],
    rows: s ? [...CAT.map((c) => [c, s.matrix[c].Male, s.matrix[c].Female, s.matrix[c].Other, s.matrix[c].Unknown, s.byCategory[c]]),
      ['TOTAL', s.byGender.Male, s.byGender.Female, s.byGender.Other, s.byGender.Unknown, s.total],
      ...s.byClass.map((c) => [`${c.branch} - Year ${c.year}`, c.Male, c.Female, c.Other, c.Unknown, c.total])] : [],
  });

  // ---------- upload students ----------
  const [fileRows, setFileRows] = useState<SheetRow[] | null>(null);
  // File name (kept in screen state)
  const [fileName, setFileName] = useState('');
  // Check (kept in screen state)
  const [check, setCheck] = useState<ImportResult | null>(null);
  // Up msg (kept in screen state)
  const [upMsg, setUpMsg] = useState('');
  // Up busy (kept in screen state)
  const [upBusy, setUpBusy] = useState(false);
  // Pick.
  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    setCheck(null); setUpMsg(''); setFileRows(null); setUpBusy(true);
    try {
      const rows = await readSheetFile(file, ['roll']);
      if (!rows.length) throw new Error('No student rows found. The file needs a header row with "Roll No" and "Name".');
      setFileRows(rows); setFileName(file.name);
      const r = await dataCenterApi.importStudents(rows, false);
      if (r.ok) setCheck(r.data); else setUpMsg(r.error);
    } catch (x: any) { setUpMsg(x.message || 'Could not read the file'); }
    setUpBusy(false);
  };
  // Save.
  const save = async () => {
    if (!fileRows || !check) return;
    const ok = check.summary.created + check.summary.updated;
    if (!window.confirm(`Save ${check.summary.created} new and ${check.summary.updated} updated students? ${check.summary.errors} rows with errors will be skipped.`)) return;
    setUpBusy(true);
    const r = await dataCenterApi.importStudents(fileRows, true);
    setUpBusy(false);
    if (r.ok) { setCheck(r.data); setFileRows(null); setUpMsg(`Saved. ${r.data.summary.created} added, ${r.data.summary.updated} updated. Press "Refresh screens" to see it everywhere.`); void ok; } else setUpMsg(r.error);
  };
  // Template.
  const template = () => exportExcel({ title: 'Student upload template', subtitle: 'Fill from row 5. Blank cell = keep the saved value. Branch: CSE or Civil. Gender: Male / Female / Other. Category: General / OBC / SC / ST / EWS.', filename: 'Student_Upload_Template', columns: TEMPLATE_COLS, rows: [] });

  // ---------- upload marks ----------
  const { users } = useCollege();
  // List of tests shown on this screen
  const [tests, setTests] = useState<any[]>([]);
  // Test id (kept in screen state)
  const [testId, setTestId] = useState('');
  // List of m rows shown on this screen
  const [mRows, setMRows] = useState<{ studentId: string; marksObtained: number; rollNo: string }[] | null>(null);
  // List of m problems shown on this screen
  const [mProblems, setMProblems] = useState<string[]>([]);
  // M msg (kept in screen state)
  const [mMsg, setMMsg] = useState('');
  // Runs once when this part of the screen opens.
  useEffect(() => { academicApi.tests().then((r) => r.ok && setTests(r.data)); }, []);
  const test = tests.find((t) => t.id === testId);
  // Pick marks.
  const pickMarks = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file || !test) return;
    setMMsg(''); setMRows(null); setMProblems([]);
    try {
      const rows = await readSheetFile(file, ['roll']);
      const byRoll = new Map(users.filter((u) => u.role === 'student').map((u) => [String(u.ubterRollNumber || u.rollNo).toLowerCase(), u]));
      const ok: { studentId: string; marksObtained: number; rollNo: string }[] = []; const bad: string[] = [];
      for (const r of rows) {
        const roll = String(Object.entries(r).find(([k]) => /roll/i.test(k))?.[1] ?? '').trim();
        const raw = Object.entries(r).find(([k]) => /mark|obtain|score/i.test(k) && !/max|total|%/i.test(k))?.[1];
        const stu = byRoll.get(roll.toLowerCase());
        const v = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim());
        if (!stu) bad.push(`${roll || '(blank)'}: no such student`);
        else if (stu.branch !== test.branch || stu.semester !== test.semester) bad.push(`${roll}: not in ${test.branch} semester ${test.semester}`);
        else if (raw === undefined || String(raw).trim() === '' || !Number.isFinite(v) || v < 0 || v > test.maxMarks) bad.push(`${roll}: marks must be 0 to ${test.maxMarks}`);
        else ok.push({ studentId: stu.id, marksObtained: v, rollNo: roll });
      }
      setMRows(ok); setMProblems(bad);
    } catch (x: any) { setMMsg(x.message || 'Could not read the file'); }
  };
  // Save marks.
  const saveMarks = async () => {
    if (!mRows || !test) return;
    if (!window.confirm(`Save marks of ${mRows.length} students for "${test.title}"? Existing marks of these students are replaced.`)) return;
    for (let i = 0; i < mRows.length; i += 300) {
      const chunk: MarkInput[] = mRows.slice(i, i + 300).map(({ studentId, marksObtained }) => ({ studentId, marksObtained }));
      const r = await academicApi.saveMarks(test.id, chunk);
      if (!r.ok) { setMMsg(`Stopped: ${r.error}`); return; }
    }
    setMMsg(`Saved marks of ${mRows.length} students.`); setMRows(null);
  };

  const downloads: { id: string; title: string; hint: string; admin?: boolean }[] = [
    { id: 'students', title: 'Students (full details)', hint: 'Uses the filters above. Includes semester / year results.' },
    { id: 'attendance', title: 'Attendance (overall %)', hint: 'Class, year and semester filters apply.' },
    { id: 'marks', title: 'Marks (all exams)', hint: 'Teachers get only the subjects they teach.' },
    { id: 'subjects', title: 'Subjects & faculty', hint: 'Branch and semester filters apply.' },
    { id: 'faculty', title: 'Faculty / teachers', hint: 'Admin only.', admin: true },
  ];

  // Pill.
  const pill = (active: boolean) => `px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${active ? 'bg-blue-700 text-white border-blue-700' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600'}`;

  return (
    <div className="space-y-5" id="data-center">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Data Center <span className="text-xs font-semibold text-slate-500">- download, upload and count any data</span></h2>
        <p className="text-xs text-slate-500">Filter students (for example only girls, or only SC category), see the counts, and download as Excel / PDF / CSV. Admin can also upload a file to add or update many students at once.</p>
      </div>

      {/* 1. FILTERS + COUNTS */}
      <section className={card}>
        <div className="flex flex-wrap gap-2 mb-3">
          <button className={pill(f.gender === 'Female')} onClick={() => setF({ ...EMPTY, gender: 'Female' })}>Only girls</button>
          <button className={pill(f.gender === 'Male')} onClick={() => setF({ ...EMPTY, gender: 'Male' })}>Only boys</button>
          {['SC', 'ST', 'OBC', 'EWS', 'General'].map((c) => <button key={c} className={pill(f.category === c)} onClick={() => setF({ ...EMPTY, category: c })}>{c}</button>)}
          <button className={pill(false)} onClick={() => setF(EMPTY)}><RefreshCw className="w-3 h-3 inline mr-1" />Reset</button>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select className={sel} value={f.branch} onChange={set('branch')}><option value="all">All branches</option><option>CSE</option><option>Civil</option></select>
          <select className={sel} value={f.year} onChange={set('year')}><option value="all">All years</option><option value="1">1st year</option><option value="2">2nd year</option><option value="3">3rd year</option></select>
          <select className={sel} value={f.semester} onChange={set('semester')}><option value="all">All semesters</option>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>Semester {n}</option>)}</select>
          <select className={sel} value={f.gender} onChange={set('gender')}><option value="all">Boys + girls</option><option value="Male">Boys</option><option value="Female">Girls</option><option value="Other">Other</option><option value="Unknown">Gender not filled</option></select>
          <select className={sel} value={f.category} onChange={set('category')}><option value="all">All categories</option>{CAT.map((c) => <option key={c} value={c}>{c === 'Unknown' ? 'Category not filled' : c}</option>)}</select>
          <input className={sel + ' w-44'} placeholder="Search name / roll no" value={f.q} onChange={set('q')} />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
        </div>
        {err && <p className="mt-2 text-xs text-red-600 font-semibold">{err}</p>}

        {s && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4">
              <div className="rounded-xl bg-blue-50 dark:bg-blue-950/40 p-3"><div className="text-[10px] font-bold uppercase text-blue-700">Total</div><div className="text-2xl font-extrabold text-blue-900 dark:text-blue-200">{s.total}</div></div>
              {GEN.map((g) => <div key={g} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3"><div className="text-[10px] font-bold uppercase text-slate-500">{GEN_LABEL[g]}</div><div className="text-2xl font-extrabold text-slate-900 dark:text-white">{s.byGender[g]}</div></div>)}
            </div>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse"><thead><tr className="bg-blue-900 text-white">{['Category', 'Boys', 'Girls', 'Other', 'Not filled', 'Total'].map((h) => <th key={h} className="px-2 py-1.5 text-left">{h}</th>)}</tr></thead>
                  <tbody>{CAT.map((c) => <tr key={c} className="border-b border-slate-200 dark:border-slate-700"><td className="px-2 py-1 font-bold">{c === 'Unknown' ? 'Not filled' : c}</td><td className="px-2">{s.matrix[c].Male}</td><td className="px-2">{s.matrix[c].Female}</td><td className="px-2">{s.matrix[c].Other}</td><td className="px-2">{s.matrix[c].Unknown}</td><td className="px-2 font-bold">{s.byCategory[c]}</td></tr>)}</tbody></table>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse"><thead><tr className="bg-blue-900 text-white">{['Class', 'Boys', 'Girls', 'Other', 'Not filled', 'Total'].map((h) => <th key={h} className="px-2 py-1.5 text-left">{h}</th>)}</tr></thead>
                  <tbody>{s.byClass.map((c) => <tr key={`${c.branch}${c.year}`} className="border-b border-slate-200 dark:border-slate-700"><td className="px-2 py-1 font-bold">{c.branch} - Year {c.year}</td><td className="px-2">{c.Male}</td><td className="px-2">{c.Female}</td><td className="px-2">{c.Other}</td><td className="px-2">{c.Unknown}</td><td className="px-2 font-bold">{c.total}</td></tr>)}{s.byClass.length === 0 && <tr><td colSpan={6} className="px-2 py-2 text-slate-500">No students match.</td></tr>}</tbody></table>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 items-center mt-4">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Download counts:</span><ExportMenu build={summaryTable} compact />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 ml-2"><Users className="w-3.5 h-3.5 inline mr-1" />Download this list ({s.total}):</span>
              <FetchDownload label="students" load={async () => { const r = await dataCenterApi.table('students', f); return r.ok ? r.data : r.error; }} />
            </div>
            {isAdmin && (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800 p-2 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-200">Ticked: {picked.size}</span>
                <button className="underline font-semibold cursor-pointer" onClick={() => setPicked(new Set(data!.rows.slice(0, 200).map((r) => r.id)))}>Tick all shown</button>
                <button className="underline font-semibold cursor-pointer" onClick={() => setPicked(new Set())}>Clear</button>
                <span className="mx-1 h-4 w-px bg-slate-300" />
                <select className={sel} value={newStatus} onChange={(e) => setNewStatus(e.target.value)} aria-label="New status">
                  {['Active / Enrolled', 'Fee Cleared', 'Documents Verified', 'Placement Ready', 'Pending Review', 'Passed Out', 'Detained', 'Year Back', 'Left / Dropped'].map((x) => <option key={x}>{x}</option>)}
                </select>
                <button disabled={!picked.size} onClick={applyStatus} className={btn + ' bg-blue-700 hover:bg-blue-600'}>Change status</button>
                <button disabled={!picked.size} onClick={deletePicked} className={btn + ' bg-rose-600 hover:bg-rose-500'}>Delete ticked</button>
                <span className="text-slate-500">To edit one student's details open Students in the menu.</span>
              </div>
            )}
            <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="w-full text-xs"><thead className="sticky top-0 bg-slate-100 dark:bg-slate-800"><tr>{isAdmin && <th className="px-2 py-1.5 w-6"></th>}{['Roll No', 'Name', 'Class', 'Gender', 'Category', 'Status'].map((h) => <th key={h} className="px-2 py-1.5 text-left">{h}</th>)}</tr></thead>
                <tbody>{data!.rows.slice(0, 200).map((r) => <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">{isAdmin && <td className="px-2"><input type="checkbox" aria-label={`Tick ${r.name}`} checked={picked.has(r.id)} onChange={() => togglePick(r.id)} /></td>}<td className="px-2 py-1">{r.rollNo}</td><td className="px-2">{r.name}</td><td className="px-2">{r.branch} Y{r.year} S{r.semester}</td><td className="px-2">{r.gender || '-'}</td><td className="px-2">{r.category || '-'}</td><td className="px-2">{r.status || '-'}</td></tr>)}</tbody></table>
              {data!.rows.length > 200 && <p className="p-2 text-[11px] text-slate-500">Showing the first 200. Excel / PDF / CSV have all {data!.rows.length}.</p>}
            </div>
          </>
        )}
      </section>

      {/* 2. DOWNLOAD ANY DATA */}
      <section className={card}>
        <h3 className="text-sm font-extrabold mb-3 text-slate-900 dark:text-white">Download any data</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {downloads.filter((d) => !d.admin || isAdmin).map((d) => (
            <div key={d.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{d.title}</div>
              <div className="text-[11px] text-slate-500 mb-2">{d.hint}</div>
              <FetchDownload label={d.id} load={async () => { const r = await dataCenterApi.table(d.id, f); return r.ok ? r.data : r.error; }} />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-2">Aadhaar numbers and passwords are never included in downloads. Every download is written to the audit log.</p>
      </section>

      {/* 3. UPLOAD STUDENTS */}
      {isAdmin && (
        <section className={card}>
          <h3 className="text-sm font-extrabold mb-1 text-slate-900 dark:text-white">Upload students (add new + update old)</h3>
          <p className="text-[11px] text-slate-500 mb-3">Steps: (1) download the template, or download the student list above, (2) fill / change it in Excel, (3) upload it here, (4) read the check result, (5) press Save. Students are matched by <b>Roll No</b>: a new Roll No is added, an existing one is updated. A blank cell never erases saved data.</p>
          <div className="flex flex-wrap gap-2 items-center">
            <button onClick={template} className={btn + ' bg-slate-700 hover:bg-slate-600'}><Download className="w-4 h-4" /> Empty template</button>
            <label className={btn + ' bg-blue-700 hover:bg-blue-600'}><Upload className="w-4 h-4" /> Choose Excel / CSV file<input type="file" accept=".xlsx,.csv,.txt" className="hidden" onChange={pick} /></label>
            {upBusy && <Loader2 className="w-4 h-4 animate-spin" />}
            {fileName && fileRows && <span className="text-xs text-slate-600">{fileName} - {fileRows.length} rows</span>}
          </div>
          {upMsg && <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-400">{upMsg}</p>}
          {check && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800">New: {check.summary.created}</span>
                <span className="px-2 py-1 rounded bg-blue-100 text-blue-800">Updated: {check.summary.updated}</span>
                <span className="px-2 py-1 rounded bg-slate-100 text-slate-700">No change: {check.summary.unchanged}</span>
                <span className="px-2 py-1 rounded bg-red-100 text-red-800">Rejected: {check.summary.errors}</span>
                <span className="px-2 py-1 rounded bg-slate-50 text-slate-500">{check.summary.applied ? 'Saved' : 'Not saved yet (check only)'}</span>
              </div>
              <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full text-xs"><thead className="sticky top-0 bg-slate-100 dark:bg-slate-800"><tr>{['Row', 'Roll No', 'Name', 'Result', 'Details'].map((h) => <th key={h} className="px-2 py-1.5 text-left">{h}</th>)}</tr></thead>
                  <tbody>{[...check.results].sort((a, b) => (a.action === 'error' ? -1 : 0) - (b.action === 'error' ? -1 : 0)).filter((r) => r.action !== 'unchanged').slice(0, 300).map((r) => (
                    <tr key={r.row} className="border-t border-slate-100 dark:border-slate-800"><td className="px-2 py-1">{r.row}</td><td className="px-2">{r.rollNo}</td><td className="px-2">{r.name}</td>
                      <td className="px-2 font-bold">{r.action === 'error' ? <span className="text-red-600"><AlertTriangle className="w-3 h-3 inline" /> Rejected</span> : <span className="text-emerald-700"><CheckCircle2 className="w-3 h-3 inline" /> {r.action === 'create' ? 'New' : 'Update'}</span>}</td><td className="px-2">{r.message}</td></tr>))}</tbody></table>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {!check.summary.applied && <button disabled={upBusy || check.summary.created + check.summary.updated === 0} onClick={save} className={btn + ' bg-emerald-600 hover:bg-emerald-500'}><CheckCircle2 className="w-4 h-4" /> Save to database</button>}
                {check.summary.applied && <button onClick={() => window.location.reload()} className={btn + ' bg-blue-700 hover:bg-blue-600'}><RefreshCw className="w-4 h-4" /> Refresh screens</button>}
              </div>
              {check.summary.errors > 0 && !check.summary.applied && <p className="text-[11px] text-slate-500 mt-1">Rejected rows are skipped. Fix them in the file and upload again if you want them saved.</p>}
            </div>
          )}
        </section>
      )}

      {/* 4. UPLOAD MARKS */}
      <section className={card}>
        <h3 className="text-sm font-extrabold mb-1 text-slate-900 dark:text-white">Upload marks of one exam</h3>
        <p className="text-[11px] text-slate-500 mb-3">Pick the exam, then upload a file with two columns: <b>Roll No</b> and <b>Marks</b>. Teachers can upload only for their own subjects (checked by the server).</p>
        <div className="flex flex-wrap gap-2 items-center">
          <select className={sel + ' max-w-xs'} value={testId} onChange={(e) => { setTestId(e.target.value); setMRows(null); setMProblems([]); setMMsg(''); }}>
            <option value="">Choose exam...</option>{tests.map((t) => <option key={t.id} value={t.id}>{t.title} - {t.subjectCode} ({t.branch} Sem {t.semester}, max {t.maxMarks})</option>)}
          </select>
          <label className={btn + ' bg-blue-700 hover:bg-blue-600 ' + (!test ? 'opacity-40 pointer-events-none' : '')}><Upload className="w-4 h-4" /> Choose file<input type="file" accept=".xlsx,.csv,.txt" className="hidden" onChange={pickMarks} disabled={!test} /></label>
        </div>
        {mMsg && <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-400">{mMsg}</p>}
        {mRows && (
          <div className="mt-3 text-xs">
            <p className="font-bold text-emerald-700">{mRows.length} students ready{mProblems.length ? `, ${mProblems.length} rows skipped:` : '.'}</p>
            {mProblems.length > 0 && <ul className="list-disc ml-5 text-red-700 max-h-32 overflow-auto">{mProblems.slice(0, 50).map((p, i) => <li key={i}>{p}</li>)}</ul>}
            <button disabled={mRows.length === 0} onClick={saveMarks} className={btn + ' bg-emerald-600 hover:bg-emerald-500 mt-2'}><CheckCircle2 className="w-4 h-4" /> Save marks</button>
          </div>
        )}
      </section>
    </div>
  );
}
