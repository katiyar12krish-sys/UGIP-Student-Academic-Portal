// Type a whole day of a class at once: 5 periods (at least 4 subjects a day), each with time, subject, room
// and lab tick. The teacher comes from the subject (Faculty Role Control). Saving replaces that day's periods.
import React, { useState } from 'react';
import { X, CalendarPlus } from 'lucide-react';
import { useCollege } from '../../context/CollegeContext';
import { BranchCode, DayOfWeek } from '../../types';
import { notify, confirmDialog } from './ui/feedback';

const TIMES = ['10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM', '12:00 PM - 01:00 PM', '01:30 PM - 02:30 PM', '02:30 PM - 03:30 PM', '03:30 PM - 04:30 PM'];
interface Row { time: string; subjectId: string; room: string; isLab: boolean }

export const DayTimetableForm: React.FC<{ branch: string; semester: number; day: DayOfWeek; onClose: () => void }> = ({ branch, semester, day, onClose }) => {
  const { subjects, users, timetableSlots, addTimetableSlot, deleteTimetableSlot } = useCollege();
  const classSubjects = subjects.filter((s) => s.branch === branch && s.semester === semester);
  const existing = timetableSlots.filter((s) => s.branch === branch && s.semester === semester && s.day === day).sort((a, b) => a.periodNumber - b.periodNumber);
  const [rows, setRows] = useState<Row[]>(() => TIMES.slice(0, 5).map((t, i) => {
    const e = existing.find((x) => x.periodNumber === i + 1);
    return { time: e?.timeSlot || t, subjectId: e?.subjectId || '', room: e?.roomNo || '', isLab: !!e?.isLab };
  }));
  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  const save = async () => {
    const filled = rows.filter((r) => r.subjectId);
    if (filled.length < 4 && !(await confirmDialog({ title: `Only ${filled.length} period(s) filled`, message: 'A normal day has at least 4 subjects. Save anyway?', confirmText: 'Save' }))) return;
    if (existing.length && !(await confirmDialog({ title: `Replace ${day}'s ${existing.length} period(s)?`, message: `${branch} Semester ${semester}`, confirmText: 'Replace' }))) return;
    existing.forEach((s) => deleteTimetableSlot(s.id));
    rows.forEach((r, i) => {
      if (!r.subjectId) return;
      const sub = classSubjects.find((s) => s.id === r.subjectId)!;
      const fac = users.find((u) => u.id === sub.facultyId);
      addTimetableSlot({
        branch: branch as BranchCode, year: (semester <= 2 ? 1 : semester <= 4 ? 2 : 3) as any, semester: semester as any, day,
        periodNumber: i + 1, timeSlot: r.time.trim() || TIMES[i], subjectId: sub.id, subjectCode: sub.code, subjectName: sub.name,
        facultyId: fac?.id || sub.facultyId || '', facultyName: fac?.name || sub.facultyName || 'Not assigned', roomNo: r.room.trim() || '—', isLab: r.isLab,
      });
    });
    notify.success(`${day} saved: ${filled.length} period(s)`);
    onClose();
  };

  const inp = 'w-full p-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg text-xs';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2"><CalendarPlus className="w-5 h-5 text-blue-600" /> {day} · {branch} Semester {semester}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-slate-500">पूरे दिन के 4–5 पीरियड एक साथ लिखें। शिक्षक का नाम विषय से अपने-आप आएगा। / Fill the whole day; the teacher comes from the subject.</p>
        {!classSubjects.length && <p className="text-xs text-amber-700">This class has no subjects yet.</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[560px]">
            <thead><tr className="text-left text-slate-500"><th className="py-1 pr-2">#</th><th className="py-1 pr-2">Time</th><th className="py-1 pr-2">Subject</th><th className="py-1 pr-2">Room</th><th className="py-1">Lab</th></tr></thead>
            <tbody>
              {rows.map((r, i) => {
                const sub = classSubjects.find((s) => s.id === r.subjectId);
                return (
                  <tr key={i} className="align-top">
                    <td className="py-1 pr-2 font-bold pt-3">{i + 1}</td>
                    <td className="py-1 pr-2 w-44"><input className={inp} value={r.time} onChange={(e) => set(i, { time: e.target.value })} aria-label={`Period ${i + 1} time`} /></td>
                    <td className="py-1 pr-2">
                      <select className={inp} value={r.subjectId} onChange={(e) => set(i, { subjectId: e.target.value })} aria-label={`Period ${i + 1} subject`}>
                        <option value="">— Free / no class —</option>
                        {classSubjects.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                      </select>
                      {sub && <span className="block mt-0.5 text-[10px] text-slate-500">Teacher: {sub.facultyName || 'not assigned yet'}</span>}
                    </td>
                    <td className="py-1 pr-2 w-28"><input className={inp} value={r.room} placeholder="Room 201" onChange={(e) => set(i, { room: e.target.value })} aria-label={`Period ${i + 1} room`} /></td>
                    <td className="py-1 pt-2.5"><input type="checkbox" checked={r.isLab} onChange={(e) => set(i, { isLab: e.target.checked })} aria-label={`Period ${i + 1} is lab`} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between gap-2">
          <button onClick={() => rows.length < TIMES.length && setRows((rs) => [...rs, { time: TIMES[rs.length], subjectId: '', room: '', isLab: false }])} disabled={rows.length >= TIMES.length} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-50 cursor-pointer">+ 6th period</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer">Cancel</button>
            <button onClick={save} className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer">Save day</button>
          </div>
        </div>
      </div>
    </div>
  );
};
