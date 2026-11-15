// ===================================================================================================
// Admin (Faculty Role Control): which teacher teaches which subject, semester by semester.
// Choose branch + semester, then pick the teacher for every subject. This is what the subject-wise
// faculty login uses: a teacher can sign in only for a subject assigned to them here.
// ===================================================================================================
import React, { useMemo, useState } from 'react';
import { BookOpen, Check } from 'lucide-react';
import { useCollege } from '../../context/CollegeContext';

export const SubjectTeacherAssigner: React.FC = () => {
  const { subjects, users, updateSubject } = useCollege();
  const [branch, setBranch] = useState<'CSE' | 'Civil'>('CSE');
  const [semester, setSemester] = useState<number>(1);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const teachers = useMemo(() => users.filter((u) => u.role === 'faculty').sort((a, b) => a.name.localeCompare(b.name)), [users]);
  const list = useMemo(() => subjects.filter((s) => s.branch === branch && s.semester === semester), [subjects, branch, semester]);
  const unassigned = list.filter((s) => !s.facultyId).length;

  const assign = async (subjectId: string, facultyId: string) => {
    if (!facultyId) return;
    setBusy(subjectId);
    const ok = await updateSubject(subjectId, { facultyId });
    setBusy(null);
    if (ok) { setSaved(subjectId); setTimeout(() => setSaved((s) => (s === subjectId ? null : s)), 2000); }
  };

  const sel = 'p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold';
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2"><BookOpen className="w-4 h-4 text-blue-600" /> Subject teachers (semester-wise)</h3>
          <p className="text-xs text-slate-500">विषय के आगे शिक्षक चुनें। Faculty login में शिक्षक सिर्फ अपने विषय से ही लॉग इन कर पाएगा। / A teacher can sign in only for the subjects given here.</p>
        </div>
        <div className="flex gap-2">
          <select value={branch} onChange={(e) => setBranch(e.target.value as any)} className={sel} aria-label="Branch">
            <option value="CSE">CSE</option><option value="Civil">Civil</option>
          </select>
          <select value={semester} onChange={(e) => setSemester(Number(e.target.value))} className={sel} aria-label="Semester">
            {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>Semester {n}</option>)}
          </select>
        </div>
      </div>
      {unassigned > 0 && <p className="text-xs text-amber-700 dark:text-amber-300">{unassigned} subject(s) have no teacher yet, so nobody can sign in for them.</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-700">
            <th className="py-2 pr-3">Code</th><th className="py-2 pr-3">Subject</th><th className="py-2">Teacher</th>
          </tr></thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700/60">
                <td className="py-2 pr-3 font-mono">{s.code}</td>
                <td className="py-2 pr-3 font-semibold text-slate-800 dark:text-slate-100">{s.name}</td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <select value={s.facultyId || ''} disabled={busy === s.id} onChange={(e) => assign(s.id, e.target.value)} className={`${sel} min-w-[180px]`}>
                      <option value="">— Not assigned —</option>
                      {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    {saved === s.id && <Check className="w-4 h-4 text-emerald-600" aria-label="Saved" />}
                  </div>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={3} className="py-6 text-center text-slate-500">No subjects in this semester.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
