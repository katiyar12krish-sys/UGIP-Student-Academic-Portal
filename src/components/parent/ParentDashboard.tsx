// ===================================================================================================
// Parent dashboard (read-only): child's profile, attendance, marks, messages and Step 18 UBTER results.
// ===================================================================================================
import React, { useEffect, useState } from 'react';
import { Users, GraduationCap, Phone, MapPin, AlertCircle, Info, LogOut } from 'lucide-react';
import { useCollege } from '../../context/CollegeContext';
import { MyLoginCard } from '../common/MyLoginCard';
import { MyProfileCard } from '../common/MyProfileCard';             // self-service: own details + own password
import { ParentUpdates } from './ParentUpdates';
import { ExamCalendar } from '../common/ExamCalendar';   // exam dates of the semester
import { BoardResultsManager } from '../common/BoardResultsManager';   // Step 18: the child's UBTER results (read-only)

// Data shape: result row.
interface ResultRow { semester?: number; year?: number; percentage: number | null; cgpa: number | null }
// Data shape: child.
interface Child {
  id: string; name: string; rollNo: string; branch: string; year: number; semester: number; batch?: string;
  phone?: string; fullAddress?: string; motherName?: string; fatherName?: string; recordStatus?: string;
  tenthPercentage?: number | null; twelfthPercentage?: number | null;
  semesters: ResultRow[]; years: ResultRow[];
}

// Read-only view for a parent. Data comes from the server and the server only returns this parent's linked children.
export const ParentDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { authUser, tests, attendanceSessions } = useCollege();
  // Children (kept in screen state)
  const [children, setChildren] = useState<Child[] | null>(null);
  // Error message to show (error); empty = no error
  const [error, setError] = useState('');

  // Runs automatically whenever these change: authUser?.id.
  useEffect(() => {
    let alive = true;
    fetch('/api/parent/children', { credentials: 'same-origin' })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || 'Could not load your child\'s details');
        return r.json();
      })
      .then((d) => alive && setChildren(d))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [authUser?.id]);

  // Attendance and marks come from the server, which only sends this parent's own children's rows.
  const attendanceOf = (c: Child) => {
    const classSessions = attendanceSessions.filter((x) => x.branch === c.branch && x.semester === c.semester);
    const bySubject = new Map<string, { code: string; name: string; total: number; attended: number }>();
    for (const sess of classSessions) {
      const row = bySubject.get(sess.subjectId) || { code: sess.subjectCode, name: sess.subjectName, total: 0, attended: 0 };
      row.total += 1;
      if (sess.records.some((r) => r.studentId === c.id && (r.status === 'Present' || r.status === 'Late'))) row.attended += 1;
      bySubject.set(sess.subjectId, row);
    }
    const subjects = [...bySubject.values()];
    const total = subjects.reduce((a, x) => a + x.total, 0);
    const attended = subjects.reduce((a, x) => a + x.attended, 0);
    return { subjects, total, attended, percent: total ? Math.round((attended / total) * 100) : null };
  };
  // Marks of.
  const marksOf = (c: Child) =>
    tests
      .map((t) => ({ t, r: t.results.find((x) => x.studentId === c.id) }))
      .filter((x) => x.r);

  // Fmt.
  const fmt = (v: number | null | undefined, suffix = '') => (v === null || v === undefined ? '—' : `${v}${suffix}`);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-md">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Parent Portal</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Welcome, {authUser?.name}. This view is read-only.</p>
          </div>
        </div>
        <button onClick={onLogout} className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer">
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>

      <MyLoginCard />
      <MyProfileCard showPassword={false} />

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{error}</span>
        </div>
      )}
      {!children && !error && <p className="text-sm text-slate-500">Loading…</p>}
      {children && children.length === 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          No student is linked to this login (or the student record was removed). Please contact the college office.
        </div>
      )}

      {children && children.length > 0 && <ParentUpdates kids={children.map((c) => ({ id: c.id, name: c.name }))} />}
      <ExamCalendar />
      {children && children.length > 0 && <BoardResultsManager readOnly />}

      {children?.map((c) => (
        <section key={c.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-6 h-6 text-emerald-600" />
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">{c.name}</h3>
                <p className="text-[11px] text-slate-500 font-mono">Roll no. {c.rollNo}</p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {c.recordStatus || 'Active'}
            </span>
          </div>

          <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <Info2 label="Branch" value={c.branch} />
            <Info2 label="Year / Semester" value={`Year ${c.year} · Sem ${c.semester}`} />
            <Info2 label="Batch" value={c.batch || '—'} />
            <Info2 label="10th / 12th %" value={`${fmt(c.tenthPercentage)} / ${fmt(c.twelfthPercentage)}`} />
            <Info2 label="Father" value={c.fatherName || '—'} />
            <Info2 label="Mother" value={c.motherName || '—'} />
            <Info2 label="Phone" value={c.phone || '—'} icon={<Phone className="w-3 h-3" />} />
            <Info2 label="Address" value={c.fullAddress || '—'} icon={<MapPin className="w-3 h-3" />} />
          </div>

          <div className="px-5 pb-5 space-y-5">
            {(() => {
              const att = attendanceOf(c);
              return (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Attendance</h4>
                  {att.total === 0 ? (
                    <p className="text-xs text-slate-500">No classes have been recorded yet.</p>
                  ) : (
                    <>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white mb-2">
                        {att.percent}% <span className="text-xs font-medium text-slate-500">({att.attended} of {att.total} classes)</span>
                        <span className={`ml-2 text-[11px] font-bold ${att.percent! >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {att.percent! >= 75 ? 'Eligible' : 'Below 75%'}
                        </span>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {att.subjects.map((sb) => (
                          <div key={sb.code} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                            <span className="font-semibold text-slate-700 dark:text-slate-200">{sb.code} · {sb.name}</span>
                            <span className="font-mono text-slate-600 dark:text-slate-300">{sb.attended}/{sb.total}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Exam marks</h4>
              {marksOf(c).length === 0 ? (
                <p className="text-xs text-slate-500">No marks have been entered yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-200 dark:border-slate-700">
                        <th className="py-2 pr-4">Exam</th><th className="py-2 pr-4">Subject</th><th className="py-2 pr-4">Marks</th><th className="py-2">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-800 dark:text-slate-200">
                      {marksOf(c).map(({ t, r }) => (
                        <tr key={t.id} className="border-b border-slate-100 dark:border-slate-800">
                          <td className="py-2 pr-4">{t.title}</td>
                          <td className="py-2 pr-4">{t.subjectCode}</td>
                          <td className="py-2 pr-4">{r!.marksObtained} / {t.maxMarks} ({r!.percentage}%)</td>
                          <td className="py-2 font-bold">{r!.grade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Results on record</h4>
            {c.semesters.length + c.years.length === 0 ? (
              <p className="text-xs text-slate-500">No results have been entered yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2 pr-4">Exam</th><th className="py-2 pr-4">Percentage</th><th className="py-2">CGPA</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-800 dark:text-slate-200">
                    {c.semesters.map((r) => (
                      <tr key={`s${r.semester}`} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2 pr-4">Semester {r.semester}</td><td className="py-2 pr-4">{fmt(r.percentage, '%')}</td><td className="py-2">{fmt(r.cgpa)}</td>
                      </tr>
                    ))}
                    {c.years.map((r) => (
                      <tr key={`y${r.year}`} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2 pr-4">Year {r.year} (overall)</td><td className="py-2 pr-4">{fmt(r.percentage, '%')}</td><td className="py-2">{fmt(r.cgpa)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      ))}

      <p className="text-[11px] text-slate-400 flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>This view is read-only. To change any detail, please contact the college office.</span>
      </p>
    </div>
  );
};

// Info2.
const Info2: React.FC<{ label: string; value: string; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div>
    <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5 flex items-center gap-1">{icon}{label}</span>
    <span className="font-semibold text-slate-800 dark:text-slate-100 break-words">{value}</span>
  </div>
);
