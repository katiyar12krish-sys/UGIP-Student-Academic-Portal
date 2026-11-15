// ===================================================================================================
// "Syllabus" screen: the official UBTER unit-wise syllabus.
//  - Student: opens on their own semester and branch (they can still look at the other semesters).
//  - Faculty / admin: choose any semester and branch.
// Data: src/data/syllabusYear1.ts (I & II Sem, common to all branches), syllabusCseSem3.ts (CSE III), syllabusCseSem5.ts (CSE V).
// Read-only (it is the board's syllabus); a search box finds a topic, "Print" gives a paper copy.
// ===================================================================================================
import React, { useMemo, useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, Printer, Search } from 'lucide-react';
import { SYLLABUS_YEAR1 } from '../../data/syllabusYear1';
import { SYLLABUS_CSE_SEM3 } from '../../data/syllabusCseSem3';
import { SYLLABUS_CSE_SEM5 } from '../../data/syllabusCseSem5';
import type { SyllabusCourse } from '../../data/syllabusTypes';

const ALL: SyllabusCourse[] = [...SYLLABUS_YEAR1, ...SYLLABUS_CSE_SEM3, ...SYLLABUS_CSE_SEM5];
const SEMESTERS = [1, 2, 3, 5];   // semesters that have syllabus data so far (4 and 6 not received yet)

interface Props {
  defaultBranch?: string;      // 'CSE' | 'Civil'
  defaultSemester?: number;
  lockBranch?: boolean;        // student: only their own branch's syllabus (no branch switch)
}

/** Courses of one semester for one branch (1st-year courses have no `branches` = common to all). */
function coursesFor(semester: number, branch: string) {
  return ALL.filter((c) => c.semester === semester && (!c.branches || c.branches.includes(branch)));
}

// Screen part: syllabus viewer.
export const SyllabusViewer: React.FC<Props> = ({ defaultBranch = 'CSE', defaultSemester = 1, lockBranch = false }) => {
  const [branch, setBranch] = useState(defaultBranch === 'Civil' ? 'Civil' : 'CSE');
  const [semester, setSemester] = useState(SEMESTERS.includes(defaultSemester) ? defaultSemester : 1);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const courses = useMemo(() => coursesFor(semester, branch), [semester, branch]);
  const q = query.trim().toLowerCase();

  // with a search: keep only units whose title or topics contain the words, and open those subjects
  const shown = useMemo(() => {
    if (!q) return courses.map((c) => ({ c, units: c.units }));
    return courses
      .map((c) => ({ c, units: c.units.filter((u) => u.unitTitle.toLowerCase().includes(q) || u.topics.some((t) => t.toLowerCase().includes(q)) || c.name.toLowerCase().includes(q)) }))
      .filter((x) => x.units.length > 0);
  }, [courses, q]);

  const isOpen = (key: string) => !!q || !!open[key];
  const totalUnits = courses.reduce((n, c) => n + c.units.length, 0);

  return (
    <div className="space-y-5 print:space-y-3">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 print:border-0 print:p-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" /> Syllabus (UBTER)
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              {semester <= 2
                ? 'I & II Semester syllabus is common to CSE and Civil (UBTER booklet w.e.f. 2025-26).'
                : branch === 'CSE' ? (semester === 3 ? 'CSE III Semester (UBTER 2026-27 scheme).' : `CSE ${semester === 5 ? 'V' : semester} Semester (UBTER).`) : `Civil Semester ${semester} syllabus has not been added yet.`}
              {' '}{courses.length} subjects · {totalUnits} units.
            </p>
          </div>
          <button onClick={() => window.print()} className="print:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>

        <div className="print:hidden mt-4 flex flex-wrap gap-2 items-center">
          <div className="flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden">
            {SEMESTERS.map((s) => (
              <button key={s} onClick={() => setSemester(s)}
                className={`px-3 py-1.5 text-xs font-bold cursor-pointer ${semester === s ? 'bg-blue-900 text-white' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                Sem {s}
              </button>
            ))}
          </div>
          {lockBranch ? (
            <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200">
              {branch === 'Civil' ? 'Civil Engineering' : 'Computer Science & Engg.'}
            </span>
          ) : (
            <select value={branch} onChange={(e) => setBranch(e.target.value)} aria-label="Branch"
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200">
              <option value="CSE">Computer Science & Engg.</option>
              <option value="Civil">Civil Engineering</option>
            </select>
          )}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a topic, e.g. Laplace, pointers, hardness"
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100" />
          </div>
          <button onClick={() => setOpen(Object.fromEntries(courses.map((c) => [c.key, true])))} className="px-3 py-1.5 rounded-lg text-xs font-bold text-blue-800 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950 cursor-pointer">Open all</button>
          <button onClick={() => setOpen({})} className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">Close all</button>
        </div>
      </div>

      {shown.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 text-sm text-slate-600 dark:text-slate-300">
          {q ? `Nothing found for "${query}" in Semester ${semester}.` : 'No syllabus has been added for this semester and branch yet.'}
        </div>
      )}

      {shown.map(({ c, units }) => (
        <div key={c.key} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden break-inside-avoid">
          <button onClick={() => setOpen((o) => ({ ...o, [c.key]: !o[c.key] }))} aria-expanded={isOpen(c.key)}
            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer">
            {isOpen(c.key) ? <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-sm text-slate-900 dark:text-white">{c.name}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Code {c.boardCode} · {c.credits} credits · {c.units.length} units</div>
            </div>
          </button>
          {isOpen(c.key) && (
            <div className="px-5 pb-5 space-y-3">
              {c.outcome && <p className="text-xs text-slate-600 dark:text-slate-300 italic">{c.outcome}</p>}
              {units.map((u) => (
                <div key={u.unitNo} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-sm font-bold text-blue-900 dark:text-blue-200">Unit {u.unitNo}: {u.unitTitle}</h3>
                    {u.hours > 0 && <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">{u.hours} lectures</span>}
                  </div>
                  <ul className="mt-2 list-disc pl-5 space-y-1 text-xs text-slate-700 dark:text-slate-200">
                    {u.topics.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Source: UBTER / IRDT detailed syllabus booklets. Practical lists, marks scheme and books are in the printed booklet.
      </p>
    </div>
  );
};
