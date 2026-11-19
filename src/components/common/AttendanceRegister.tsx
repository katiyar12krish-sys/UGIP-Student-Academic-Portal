// =====================================================================================================
// Attendance Register (Step 18) - Admin and Faculty
// -----------------------------------------------------------------------------------------------------
// A plain list of every attendance session (lecture) of this academic year, newest first, with:
//   * filters: branch, semester, subject, search
//   * Edit   -> change date, time, topic of the lecture
//   * Delete -> remove the lecture with its present / absent list (asks first)
//   * Open   -> the whole class list for that lecture; tap Present / Late / Absent to correct any student
// A faculty member sees only the subjects assigned to them; the server checks every change again.
// Server: GET /api/attendance/sessions, PUT/DELETE /api/attendance/sessions/:id, POST .../records
// =====================================================================================================
import React, { useMemo, useState } from 'react';
import { ClipboardList, Pencil, Trash2, X, Search, Users, Save } from 'lucide-react';
import { useCollege } from '../../context/CollegeContext';
import { useSeesSample } from '../../hooks/useSeesSample';
import type { AttendanceSession } from '../../types';
import { academicApi } from '../../services/academicApi';
import { editsApi } from '../../services/step18Api';
import { notify, confirmDialog } from './ui/feedback';

// Screen part: attendance register.
export const AttendanceRegister: React.FC<{ forceMobileView?: boolean }> = ({ forceMobileView = false }) => {
  const { attendanceSessions, users, refreshAcademic } = useCollege();
  const showSample = useSeesSample();   // SAMPLE badges only for admin / CSE HOD
  // Branch (kept in screen state)
  const [branch, setBranch] = useState('');
  // Semester (kept in screen state)
  const [semester, setSemester] = useState('');
  // Text typed in the search box
  const [query, setQuery] = useState('');
  // Edit (kept in screen state)
  const [edit, setEdit] = useState<{ id: string; date: string; timeSlot: string; topicTaught: string } | null>(null);
  // Is the 'id' shown on screen? (true / false)
  const [openId, setOpenId] = useState<string | null>(null);
  // true while waiting for the server (buttons are disabled meanwhile)
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => attendanceSessions
    .filter((s) => (!branch || s.branch === branch) && (!semester || s.semester === Number(semester))
      && (!query || `${s.subjectCode} ${s.subjectName} ${s.topicTaught} ${s.date}`.toLowerCase().includes(query.toLowerCase())))
    .sort((a, b) => (b.date || '').localeCompare(a.date || '')), [attendanceSessions, branch, semester, query]);
  const open = attendanceSessions.find((s) => s.id === openId) || null;

  // Save edit.
  const saveEdit = async () => {
    if (!edit) return;
    setBusy(true);
    const r = await editsApi.updateAttendanceSession(edit.id, edit);
    setBusy(false);
    if (!r.ok) return notify.error('Could not save', r.error);
    notify.success('Lecture details updated');
    setEdit(null); refreshAcademic();
  };

  // Remove.
  const remove = async (s: AttendanceSession) => {
    if (!(await confirmDialog({ title: `Delete the lecture of ${s.date}?`, message: `${s.subjectCode} ${s.subjectName} · ${s.records.length} attendance entries will be deleted too. This changes the students' attendance percentage.`, danger: true }))) return;
    const r = await editsApi.deleteAttendanceSession(s.id);
    if (!r.ok) return notify.error('Could not delete', r.error);
    notify.success('Lecture deleted');
    refreshAcademic();
  };

  const field = 'px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm';
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center"><ClipboardList className="w-6 h-6" /></div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Attendance Register</h3>
          <p className="text-sm text-slate-500">Every lecture of this academic year. Correct a student's attendance, edit lecture details, or delete a lecture.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search subject, topic or date" className={field + ' w-full pl-9'} /></div>
        <select value={branch} onChange={(e) => setBranch(e.target.value)} className={field}><option value="">All branches</option><option>CSE</option><option>Civil</option></select>
        <select value={semester} onChange={(e) => setSemester(e.target.value)} className={field}><option value="">All semesters</option>{[1, 2, 3, 4, 5, 6].map((s) => <option key={s} value={s}>Semester {s}</option>)}</select>
        <span className="text-sm text-slate-500">{list.length} lecture(s)</span>
      </div>

      {list.length === 0 ? <div className="p-10 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-sm text-slate-500">No lectures found for this selection.</div> : (
        <div className="space-y-3">
          {/* MOBILE CARDS FOR PHONES (< sm or forced mobile) */}
          <div className={`${forceMobileView ? 'block' : 'block sm:hidden'} space-y-2.5`}>
            {list.slice(0, 400).map((s) => {
              const present = s.records.filter((r) => r.status !== 'Absent').length;
              return (
                <div key={s.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">{s.subjectCode}</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[180px]">{s.subjectName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {s.date} · {s.timeSlot} · {s.branch} Sem {s.semester}
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      {present}/{s.records.length}
                    </span>
                  </div>
                  {s.topicTaught && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                      <span className="font-semibold text-slate-400 text-[10px] block">टॉपिक (Topic):</span>
                      {s.topicTaught}
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => setOpenId(s.id)}
                      className="flex-1 py-1.5 px-3 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>छात्र हाजिरी देखें / सही करें</span>
                    </button>
                    <button
                      onClick={() => setEdit({ id: s.id, date: s.date, timeSlot: s.timeSlot, topicTaught: s.topicTaught })}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => remove(s)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-slate-800 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP TABLE VIEW (hidden on mobile or forced mobile) */}
          <div className={`${forceMobileView ? 'hidden' : 'hidden sm:block'} rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-x-auto`}>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 text-left">
                <tr><th className="px-4 py-2.5">Date</th><th className="px-4 py-2.5">Subject</th><th className="px-4 py-2.5">Class</th><th className="px-4 py-2.5">Topic</th><th className="px-4 py-2.5 text-right">Present</th><th className="px-4 py-2.5 text-right">Actions</th></tr>
              </thead>
              <tbody>
                {list.slice(0, 400).map((s) => {
                  const present = s.records.filter((r) => r.status !== 'Absent').length;
                  return (
                    <tr key={s.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-4 py-2.5 whitespace-nowrap">{s.date}<div className="text-[11px] text-slate-400">{s.timeSlot}</div></td>
                      <td className="px-4 py-2.5"><span className="font-mono text-xs">{s.subjectCode}</span> {s.subjectName}{s.isDemo && showSample && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">SAMPLE</span>}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{s.branch} · Sem {s.semester}</td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{s.topicTaught || '—'}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{present}/{s.records.length}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <button onClick={() => setOpenId(s.id)} aria-label="Open class list" title="Correct attendance" className="p-1.5 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-slate-800 cursor-pointer"><Users className="w-4 h-4" /></button>
                        <button onClick={() => setEdit({ id: s.id, date: s.date, timeSlot: s.timeSlot, topicTaught: s.topicTaught })} aria-label="Edit lecture" title="Edit" className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => remove(s)} aria-label="Delete lecture" title="Delete" className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-slate-800 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {list.length > 400 && <p className="px-4 py-2 text-xs text-slate-500">Showing the newest 400. Use the filters to find older lectures.</p>}
          </div>
        </div>
      )}

      {/* edit lecture details */}
      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60" onMouseDown={(e) => { if (e.target === e.currentTarget) setEdit(null); }}>
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-3 text-sm">
            <h3 className="font-bold text-slate-900 dark:text-white">Edit lecture</h3>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Date</span><input type="date" className={field + ' w-full'} value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Time</span><input className={field + ' w-full'} value={edit.timeSlot} onChange={(e) => setEdit({ ...edit, timeSlot: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Topic taught</span><input className={field + ' w-full'} value={edit.topicTaught} onChange={(e) => setEdit({ ...edit, topicTaught: e.target.value })} /></label>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEdit(null)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 font-semibold cursor-pointer">Cancel</button>
              <button onClick={saveEdit} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer disabled:opacity-60"><Save className="w-4 h-4" /> Save</button>
            </div>
          </div>
        </div>
      )}

      {/* class list of one lecture */}
      {open && <ClassList session={open} students={users.filter((u) => u.role === 'student' && u.branch === open.branch && u.semester === open.semester)} onClose={() => setOpenId(null)} onChanged={refreshAcademic} />}
    </div>
  );
};

/** Present / Late / Absent buttons for every student of the class of one lecture. */
const ClassList: React.FC<{ session: AttendanceSession; students: any[]; onClose: () => void; onChanged: () => void }> = ({ session, students, onClose, onChanged }) => {
  // List of status shown on this screen
  const [status, setStatus] = useState<Record<string, string>>(() => Object.fromEntries(session.records.map((r) => [r.studentId, r.status])));
  // class list = current students of the class + anybody already marked (e.g. promoted since)
  const rows = useMemo(() => {
    const m = new Map<string, { id: string; name: string; rollNo: string }>();
    students.forEach((s) => m.set(s.id, { id: s.id, name: s.name, rollNo: s.rollNo || '' }));
    session.records.forEach((r) => { if (!m.has(r.studentId)) m.set(r.studentId, { id: r.studentId, name: r.studentName, rollNo: r.rollNo }); });
    return [...m.values()].sort((a, b) => a.rollNo.localeCompare(b.rollNo));
  }, [students, session.records]);

  // Set.
  const set = async (studentId: string, st: 'Present' | 'Late' | 'Absent') => {
    const before = status[studentId];
    setStatus((x) => ({ ...x, [studentId]: st }));                // show at once
    const r = await academicApi.setRecord(session.id, studentId, st);
    if (!r.ok) { setStatus((x) => ({ ...x, [studentId]: before })); return notify.error('Could not change attendance', r.error); }
    onChanged();
  };

  // Tone.
  const tone = (st: string, active: boolean) => !active ? 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
    : st === 'Present' ? 'bg-emerald-600 border-emerald-600 text-white' : st === 'Late' ? 'bg-amber-500 border-amber-500 text-white' : 'bg-rose-600 border-rose-600 text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">{session.subjectCode} {session.subjectName}</h3>
            <p className="text-xs text-slate-500">{session.date} · {session.timeSlot} · {session.branch} Sem {session.semester} · changes are saved at once</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-auto px-6 py-3">
          {rows.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
              <div className="min-w-0"><span className="font-mono text-xs text-slate-500 mr-2">{s.rollNo}</span><span className="text-sm">{s.name}</span></div>
              <div className="flex gap-1.5 shrink-0">
                {(['Present', 'Late', 'Absent'] as const).map((st) => (
                  <button key={st} onClick={() => set(s.id, st)} className={`px-2.5 py-1 rounded-md border text-xs font-semibold cursor-pointer ${tone(st, status[s.id] === st)}`}>{st}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
