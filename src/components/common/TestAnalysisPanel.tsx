// ===================================================================================================
// Online test analysis (shown on the Online Tests screen).
//  - Student: "My analysis": tests given / pending, average %, and a subject-wise table (best, lowest, average),
//    plus which subject needs the most practice.
//  - Faculty / admin: student-wise table for the chosen class: tests given out of tests set, average %, and
//    each subject's average, with Excel / PDF / CSV download.
// Uses only the results the server already sent (a student gets only their own results).
// ===================================================================================================
import React, { useMemo } from 'react';
import { BarChart3, TrendingDown, TrendingUp } from 'lucide-react';
import ExportMenu from './ExportMenu';
import type { OnlineTestAssignment } from '../../types';

interface Props {
  mode: 'student' | 'faculty' | 'admin';
  tests: OnlineTestAssignment[];                 // tests already filtered to the chosen class / subject
  students: { id: string; name: string; rollNo?: string; branch?: string; year?: number }[];
  me?: { id: string };
}

const avg = (a: number[]) => (a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10 : null);
const pctColour = (p: number | null) => p === null ? 'text-slate-400' : p >= 75 ? 'text-emerald-700 dark:text-emerald-400' : p >= 40 ? 'text-amber-700 dark:text-amber-400' : 'text-rose-700 dark:text-rose-400';
const pctText = (p: number | null) => (p === null ? '–' : `${p}%`);

/** Subject-wise summary of one student's results in these tests. */
function bySubject(tests: OnlineTestAssignment[], studentId: string) {
  const m = new Map<string, { subject: string; set: number; given: number; pcts: number[] }>();
  for (const t of tests) {
    const k = t.subjectName || t.subjectCode;
    const row = m.get(k) || { subject: k, set: 0, given: 0, pcts: [] };
    row.set++;
    const r = t.results?.[studentId];
    if (r) { row.given++; row.pcts.push(r.percentage); }
    else if (t.submittedStudentIds?.includes(studentId)) row.given++;
    m.set(k, row);
  }
  return [...m.values()].sort((a, b) => a.subject.localeCompare(b.subject));
}

// Screen part: test analysis panel.
export const TestAnalysisPanel: React.FC<Props> = ({ mode, tests, students, me }) => {
  const subjects = useMemo(() => [...new Set(tests.map((t) => t.subjectName || t.subjectCode))].sort(), [tests]);

  // ---------- student ----------
  if (mode === 'student') {
    if (!me) return null;
    const rows = bySubject(tests, me.id);
    const all = rows.flatMap((r) => r.pcts);
    const given = rows.reduce((n, r) => n + r.given, 0);
    const scored = rows.filter((r) => r.pcts.length);
    const weakest = scored.length ? scored.reduce((a, b) => (avg(a.pcts)! <= avg(b.pcts)! ? a : b)) : null;
    const strongest = scored.length ? scored.reduce((a, b) => (avg(a.pcts)! >= avg(b.pcts)! ? a : b)) : null;
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
        <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-600" /> My test analysis</h3>
        {tests.length === 0 ? (
          <p className="text-xs text-slate-600 dark:text-slate-300">No online tests have been set for your class yet. When your teacher creates one it appears below, and your marks show here after you submit.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3"><div className="text-xl font-black text-slate-900 dark:text-white">{given}/{tests.length}</div><div className="text-[11px] text-slate-500">tests given</div></div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3"><div className={`text-xl font-black ${pctColour(avg(all))}`}>{pctText(avg(all))}</div><div className="text-[11px] text-slate-500">average score</div></div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3"><div className="text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-1"><TrendingUp className="w-4 h-4" />{strongest?.subject || '–'}</div><div className="text-[11px] text-slate-500">strongest subject</div></div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3"><div className="text-sm font-bold text-rose-700 dark:text-rose-400 flex items-center justify-center gap-1"><TrendingDown className="w-4 h-4" />{weakest && weakest !== strongest ? weakest.subject : '–'}</div><div className="text-[11px] text-slate-500">needs practice</div></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-700"><th className="py-2 pr-3">Subject</th><th className="py-2 pr-3">Given</th><th className="py-2 pr-3">Average</th><th className="py-2 pr-3">Best</th><th className="py-2">Lowest</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.subject} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 pr-3 font-semibold text-slate-800 dark:text-slate-100">{r.subject}</td>
                      <td className="py-2 pr-3">{r.given} of {r.set}</td>
                      <td className={`py-2 pr-3 font-bold ${pctColour(avg(r.pcts))}`}>{pctText(avg(r.pcts))}</td>
                      <td className="py-2 pr-3">{r.pcts.length ? `${Math.max(...r.pcts)}%` : '–'}</td>
                      <td className="py-2">{r.pcts.length ? `${Math.min(...r.pcts)}%` : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Green 75% and above · amber 40–74% · red below 40%. After each test, open "Review answers" to see the correct answer and explanation.</p>
          </>
        )}
      </div>
    );
  }

  // ---------- faculty / admin ----------
  const classStudents = students.filter((s) => tests.some((t) => t.branch === s.branch && t.year === s.year));
  const table = classStudents.map((s) => {
    const mine = tests.filter((t) => t.branch === s.branch && t.year === s.year);
    const rows = bySubject(mine, s.id);
    const all = rows.flatMap((r) => r.pcts);
    return { s, set: mine.length, given: rows.reduce((n, r) => n + r.given, 0), overall: avg(all), subj: Object.fromEntries(rows.map((r) => [r.subject, avg(r.pcts)])) as Record<string, number | null> };
  }).sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1));

  const exportTable = {
    title: 'Online test analysis (student-wise)', filename: 'Online_Test_Analysis', sheetName: 'Analysis',
    columns: ['Roll No', 'Name', 'Tests given', 'Average %', ...subjects],
    rows: table.map((r) => [r.s.rollNo || '', r.s.name, `${r.given}/${r.set}`, r.overall ?? '', ...subjects.map((x) => r.subj[x] ?? '')]),
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><BarChart3 className="w-5 h-5 text-blue-600" /> Student-wise analysis</h3>
        {table.length > 0 && <ExportMenu build={() => exportTable} />}
      </div>
      {table.length === 0 ? (
        <p className="text-xs text-slate-600 dark:text-slate-300">No tests for the chosen class yet. Create a test; after students submit, each student's score per subject appears here.</p>
      ) : (
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white dark:bg-slate-800"><tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <th className="py-2 pr-3">Roll No</th><th className="py-2 pr-3">Name</th><th className="py-2 pr-3">Given</th><th className="py-2 pr-3">Average</th>
              {subjects.map((x) => <th key={x} className="py-2 pr-3 whitespace-nowrap">{x}</th>)}
            </tr></thead>
            <tbody>
              {table.map((r) => (
                <tr key={r.s.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-1.5 pr-3 font-mono">{r.s.rollNo}</td>
                  <td className="py-1.5 pr-3 font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">{r.s.name}</td>
                  <td className="py-1.5 pr-3">{r.given}/{r.set}</td>
                  <td className={`py-1.5 pr-3 font-bold ${pctColour(r.overall)}`}>{pctText(r.overall)}</td>
                  {subjects.map((x) => <td key={x} className={`py-1.5 pr-3 ${pctColour(r.subj[x] ?? null)}`}>{pctText(r.subj[x] ?? null)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
