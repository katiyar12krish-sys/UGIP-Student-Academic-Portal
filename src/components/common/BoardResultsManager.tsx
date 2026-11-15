// =====================================================================================================
// UBTER Board Results (Step 18)
// -----------------------------------------------------------------------------------------------------
// Staff (admin / faculty): list the board ("Cross List") results by branch / semester / session, open one to
//   see every subject, and ADD, EDIT or DELETE results. Totals, percentage and SGPA are shown as printed.
// Student / parent (readOnly): only their own (child's) results, as clean result cards.
// Data comes from /api/board-results (server/routes/academicYear.ts). The 3rd-semester 2025-26 results of the
// CSE 2024 batch were typed in from the college's scanned cross list; 1st-year results of today's 2nd year
// are random SAMPLE data (marked with a badge) until the real ones are entered.
// =====================================================================================================
import React, { useEffect, useMemo, useState } from 'react';
import { Award, Plus, Pencil, Trash2, X, Search, ChevronDown, ChevronUp, Save, FileSpreadsheet } from 'lucide-react';
import { boardResultsApi, type BoardResult, type BoardResultSubject } from '../../services/step18Api';
import { useCollege } from '../../context/CollegeContext';
import { useSeesSample } from '../../hooks/useSeesSample';
import { notify, confirmDialog } from './ui/feedback';

/** Colour of a result word: PASS green, PBP (pass with back paper) amber, anything else red. */
const resultTone = (r: string | null) => (r === 'PASS' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
  : r === 'PBP' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300');
// Fmt.
const fmt = (v: number | null | undefined) => (v === null || v === undefined ? '—' : String(v));
const EMPTY_SUBJECT: BoardResultSubject = { code: '', name: '', theory: null, practical: null, grade: '', gradePoint: null };

// Screen part: board results manager.
export const BoardResultsManager: React.FC<{ readOnly?: boolean }> = ({ readOnly = false }) => {
  const { users, currentUser } = useCollege();
  const showSample = useSeesSample();   // SAMPLE badges only for admin / CSE HOD
  // List of rows shown on this screen
  const [rows, setRows] = useState<BoardResult[]>([]);
  // true while waiting for the server (buttons are disabled meanwhile)
  const [loading, setLoading] = useState(true);
  // Branch (kept in screen state)
  const [branch, setBranch] = useState('');
  // Semester (kept in screen state)
  const [semester, setSemester] = useState('');
  // Session (kept in screen state)
  const [session, setSession] = useState('');
  // Text typed in the search box
  const [query, setQuery] = useState('');
  // Is the 'panel' shown on screen? (true / false)
  const [open, setOpen] = useState<string | null>(null);         // id of the result whose subjects are shown
  // The item being edited right now (null = nothing open)
  const [editing, setEditing] = useState<Partial<BoardResult> | null>(null);   // form (new or existing)

  // Loads the data from the server.
  const load = async () => {
    setLoading(true);
    const r = await boardResultsApi.list();
    setLoading(false);
    if (!r.ok) return notify.error('Could not load the results', r.error);
    setRows(r.data);
  };
  // Runs once when this part of the screen opens.
  useEffect(() => { load(); }, []);

  const sessions = useMemo(() => [...new Set(rows.map((r) => r.examSession))].sort().reverse(), [rows]);
  // Read-only for one student: show only that student's results. (The server already sends a real student only their
  // own rows; this also keeps the admin's "view as student" preview correct, where the server would send everyone's.)
  const own = readOnly && currentUser.role === 'student' ? rows.filter((r) => r.studentId === currentUser.id) : rows;
  const shown = own.filter((r) => (!branch || r.branch === branch) && (!semester || r.semester === Number(semester)) && (!session || r.examSession === session)
    && (!query || r.studentName.toLowerCase().includes(query.toLowerCase()) || r.rollNo.includes(query)));

  // Remove.
  const remove = async (r: BoardResult) => {
    if (!(await confirmDialog({ title: `Delete the semester ${r.semester} result of ${r.studentName}?`, message: `${r.examSession} · Roll no ${r.rollNo}. This cannot be undone.`, danger: true }))) return;
    const x = await boardResultsApi.remove(r.id);
    if (!x.ok) return notify.error('Could not delete', x.error);
    setRows((l) => l.filter((y) => y.id !== r.id));
    notify.success('Result deleted');
  };

  /** CSV download of what is shown (opens in Excel). */
  const download = () => {
    const head = ['Roll No', 'Name', 'Branch', 'Semester', 'Session', 'Theory', 'Practical', 'GP', 'IE', 'Total', 'Max', '%', 'SGPA', 'Result', 'Back papers'];
    // Esc.
    const esc = (v: unknown) => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : s; };
    const lines = [head, ...shown.map((r) => [r.rollNo, r.studentName, r.branch, r.semester, r.examSession, r.theoryTotal, r.practicalTotal, r.gp, r.ie, r.semTotal, r.maxTotal, r.percentage, r.sgpa, r.result, r.backPapers])];
    const blob = new Blob(['﻿' + lines.map((l) => l.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `UBTER_results_${branch || 'all'}_${semester || 'all'}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center"><Award className="w-6 h-6" /></div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{readOnly ? 'My UBTER Results' : 'UBTER Board Results'}</h3>
            <p className="text-sm text-slate-500">{readOnly ? 'Semester results as published by the Uttarakhand Board of Technical Education.' : 'Semester results from the board cross list — subject-wise marks, SGPA and result.'}</p>
          </div>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <button onClick={download} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"><FileSpreadsheet className="w-4 h-4" /> Excel</button>
            <button onClick={() => setEditing({ semester: 1, examSession: sessions[0] || '', maxTotal: 1000, gp: 25, ie: 25, result: 'PASS', subjects: [{ ...EMPTY_SUBJECT }] })}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-semibold cursor-pointer"><Plus className="w-4 h-4" /> Add result</button>
          </div>
        )}
      </div>

      {/* filters (staff) */}
      {!readOnly && (
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-52">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or roll no" className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
          </div>
          <select value={branch} onChange={(e) => setBranch(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"><option value="">All branches</option><option>CSE</option><option>Civil</option></select>
          <select value={semester} onChange={(e) => setSemester(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"><option value="">All semesters</option>{[1, 2, 3, 4, 5, 6].map((s) => <option key={s} value={s}>Semester {s}</option>)}</select>
          <select value={session} onChange={(e) => setSession(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"><option value="">All sessions</option>{sessions.map((s) => <option key={s}>{s}</option>)}</select>
          <span className="text-sm text-slate-500">{shown.length} result(s)</span>
        </div>
      )}

      {loading ? <div className="p-10 text-center text-sm text-slate-500">Loading results…</div>
        : shown.length === 0 ? <div className="p-10 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-sm text-slate-500">No results found{readOnly ? ' yet. They will appear here once the college enters them.' : ' for this selection.'}</div>
        : (
          <div className="space-y-3">
            {shown.map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                <div className="p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                  <button onClick={() => setOpen(open === r.id ? null : r.id)} className="flex-1 min-w-0 text-left cursor-pointer">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white">{r.studentName}</span>
                      <span className="font-mono text-xs text-slate-500">{r.rollNo}</span>
                      {r.isDemo && showSample && <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">SAMPLE</span>}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{r.branch} · Semester {r.semester} · {r.examSession}{r.fatherName ? ` · Father: ${r.fatherName}` : ''}</div>
                  </button>
                  <div className="flex items-center gap-5 text-sm">
                    <div className="text-center"><div className="text-[10px] uppercase tracking-wide text-slate-500">Total</div><div className="font-bold tabular-nums">{fmt(r.semTotal)}<span className="text-slate-400 font-normal">/{fmt(r.maxTotal)}</span></div></div>
                    <div className="text-center"><div className="text-[10px] uppercase tracking-wide text-slate-500">%</div><div className="font-bold tabular-nums">{fmt(r.percentage)}</div></div>
                    <div className="text-center"><div className="text-[10px] uppercase tracking-wide text-slate-500">SGPA</div><div className="font-bold tabular-nums">{r.sgpa ?? <span className="text-amber-600 text-xs" title="Not readable on the scanned sheet">fill in</span>}</div></div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${resultTone(r.result)}`}>{r.result || '—'}</span>
                    <button onClick={() => setOpen(open === r.id ? null : r.id)} aria-label="Show subjects" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">{open === r.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
                    {!readOnly && <>
                      <button onClick={() => setEditing(JSON.parse(JSON.stringify(r)))} aria-label="Edit result" className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950 cursor-pointer"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => remove(r)} aria-label="Delete result" className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                    </>}
                  </div>
                </div>
                {open === r.id && (
                  <div className="border-t border-slate-100 dark:border-slate-800 px-4 pb-4 overflow-x-auto">
                    <table className="w-full text-sm mt-3">
                      <thead className="text-xs text-slate-500 text-left"><tr><th className="py-1.5 pr-3">Code</th><th className="py-1.5 pr-3">Subject</th><th className="py-1.5 pr-3 text-right">Theory /100</th><th className="py-1.5 pr-3 text-right">Practical /90</th><th className="py-1.5 text-right">Grade</th></tr></thead>
                      <tbody>
                        {r.subjects.map((s) => (
                          <tr key={s.code} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="py-1.5 pr-3 font-mono text-xs">{s.code}</td>
                            <td className="py-1.5 pr-3">{s.name}</td>
                            <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(s.theory)}{s.theoryNote && <span className="ml-1 text-[10px] font-bold text-rose-600">{s.theoryNote}</span>}</td>
                            <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(s.practical)}{s.practicalNote && <span className="ml-1 text-[10px] font-bold text-rose-600">{s.practicalNote}</span>}</td>
                            <td className="py-1.5 text-right font-semibold">{s.grade}{s.gradePoint !== null && <span className="text-slate-400 font-normal"> ({s.gradePoint})</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(r.backPapers || r.remarks) && <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">{r.backPapers && <><b>Back papers / earlier subjects:</b> {r.backPapers}. </>}{r.remarks}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      {editing && <ResultForm value={editing} students={users.filter((u) => u.role === 'student')} onClose={() => setEditing(null)}
        onSaved={(r) => { setRows((l) => [r, ...l.filter((x) => x.id !== r.id)]); setEditing(null); }} />}
    </div>
  );
};

/** Add / edit form for one result, including the subject-wise lines. */
const ResultForm: React.FC<{ value: Partial<BoardResult>; students: any[]; onClose: () => void; onSaved: (r: BoardResult) => void }> = ({ value, students, onClose, onSaved }) => {
  // F (kept in screen state)
  const [f, setF] = useState<Partial<BoardResult>>(value);
  // true while waiting for the server (buttons are disabled meanwhile)
  const [saving, setSaving] = useState(false);
  const isNew = !f.id;
  // Set.
  const set = (k: keyof BoardResult, v: any) => setF((x) => ({ ...x, [k]: v }));
  // Num.
  const num = (v: string) => (v === '' ? null : Number(v));
  // Set sub.
  const setSub = (i: number, k: keyof BoardResultSubject, v: any) => setF((x) => ({ ...x, subjects: (x.subjects || []).map((s, j) => (j === i ? { ...s, [k]: v } : s)) }));

  // Save.
  const save = async () => {
    if (isNew && !f.studentId) return notify.warning('Please choose the student first.');
    setSaving(true);
    const r = isNew ? await boardResultsApi.create(f) : await boardResultsApi.update(f.id!, f);
    setSaving(false);
    if (!r.ok) return notify.error('Could not save the result', r.error);
    notify.success(isNew ? 'Result added' : 'Result updated');
    onSaved(r.data);
  };

  const input = 'w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm';
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-900 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">{isNew ? 'Add board result' : `Edit result · ${f.studentName}`}</h3>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5 text-sm">
          <div className="grid sm:grid-cols-3 gap-3">
            {isNew ? (
              <label className="sm:col-span-3"><span className="text-xs font-semibold text-slate-600">Student *</span>
                <select className={input} value={f.studentId || ''} onChange={(e) => set('studentId', e.target.value)}>
                  <option value="">Choose a student…</option>
                  {students.sort((a, b) => String(a.rollNo).localeCompare(String(b.rollNo))).map((s) => <option key={s.id} value={s.id}>{s.rollNo} · {s.name} ({s.branch} sem {s.semester})</option>)}
                </select></label>
            ) : null}
            <label><span className="text-xs font-semibold text-slate-600">Semester *</span>
              <select className={input} value={f.semester} onChange={(e) => set('semester', Number(e.target.value))}>{[1, 2, 3, 4, 5, 6].map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
            <label className="sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Exam session *</span>
              <input className={input} value={f.examSession || ''} placeholder="e.g. 2025-26 (Winter)" onChange={(e) => set('examSession', e.target.value)} /></label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([['theoryTotal', 'Theory total'], ['practicalTotal', 'Practical total'], ['gp', 'GP (max 25)'], ['ie', 'IE (max 25)'], ['semTotal', 'Semester total'], ['maxTotal', 'Maximum total'], ['sgpa', 'SGPA']] as [keyof BoardResult, string][]).map(([k, l]) => (
              <label key={k}><span className="text-xs font-semibold text-slate-600">{l}</span>
                <input type="number" step="0.01" className={input} value={(f[k] as any) ?? ''} onChange={(e) => set(k, num(e.target.value))} /></label>
            ))}
            <label><span className="text-xs font-semibold text-slate-600">Result</span>
              <select className={input} value={f.result || ''} onChange={(e) => set('result', e.target.value)}><option>PASS</option><option>PBP</option><option>BACK</option><option>FAIL</option><option>RL</option><option value="">—</option></select></label>
          </div>
          <label className="block"><span className="text-xs font-semibold text-slate-600">Back papers / earlier subjects (optional)</span>
            <input className={input} value={f.backPapers || ''} onChange={(e) => set('backPapers', e.target.value)} placeholder="e.g. 991002 Applied Mathematics-I 008|030" /></label>

          <div>
            <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-slate-600">Subjects</span>
              <button onClick={() => setF((x) => ({ ...x, subjects: [...(x.subjects || []), { ...EMPTY_SUBJECT }] }))} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:underline cursor-pointer"><Plus className="w-3.5 h-3.5" /> Add subject</button></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-slate-500 text-left"><tr><th className="pr-2 pb-1">Code</th><th className="pr-2 pb-1">Subject</th><th className="pr-2 pb-1">Theory</th><th className="pr-2 pb-1">Practical</th><th className="pr-2 pb-1">Grade</th><th className="pr-2 pb-1">GP</th><th /></tr></thead>
                <tbody>
                  {(f.subjects || []).map((s, i) => (
                    <tr key={i}>
                      <td className="pr-2 py-1"><input className={input + ' w-24 font-mono'} value={s.code} onChange={(e) => setSub(i, 'code', e.target.value)} /></td>
                      <td className="pr-2 py-1"><input className={input + ' min-w-44'} value={s.name || ''} onChange={(e) => setSub(i, 'name', e.target.value)} /></td>
                      <td className="pr-2 py-1"><input type="number" className={input + ' w-20'} value={s.theory ?? ''} onChange={(e) => setSub(i, 'theory', num(e.target.value))} /></td>
                      <td className="pr-2 py-1"><input type="number" className={input + ' w-20'} value={s.practical ?? ''} onChange={(e) => setSub(i, 'practical', num(e.target.value))} /></td>
                      <td className="pr-2 py-1"><input className={input + ' w-16'} value={s.grade || ''} onChange={(e) => setSub(i, 'grade', e.target.value)} /></td>
                      <td className="pr-2 py-1"><input type="number" className={input + ' w-16'} value={s.gradePoint ?? ''} onChange={(e) => setSub(i, 'gradePoint', num(e.target.value))} /></td>
                      <td className="py-1"><button onClick={() => setF((x) => ({ ...x, subjects: (x.subjects || []).filter((_, j) => j !== i) }))} aria-label="Remove subject" className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"><Trash2 className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 bg-white dark:bg-slate-900 px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-semibold cursor-pointer">Cancel</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-semibold cursor-pointer disabled:opacity-60"><Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save result'}</button>
        </div>
      </div>
    </div>
  );
};
