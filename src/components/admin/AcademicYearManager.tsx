// =====================================================================================================
// Admin -> "Academic Year & Promotion" screen (Step 18)
// -----------------------------------------------------------------------------------------------------
// What the admin sees and can do here:
//   1. The current academic year (e.g. 2026-27), odd/even semester half, and whether automatic promotion is on.
//   2. Class strength: how many active students are in each branch / year / semester right now.
//   3. Promote classes in ONE action: choose branch + year -> "Show who will move" -> untick anybody who
//      should stay back -> "Promote". 1st -> 2nd year, 2nd -> 3rd year, 3rd year -> Passed Out (kept as alumni).
//      Normally this happens BY ITSELF on 1 July (after the May-June board result); the button is for doing
//      it earlier / for one class only.
//   4. "Move to even semester" (normally automatic in January) and "Undo last promotion".
//   5. History of every promotion (who, when, how many).
//   6. Sample (random) data: how much there is, and one button to delete all of it once real data is entered.
// All the real work and every permission check happens on the server (server/academic/promotion.ts).
// =====================================================================================================
import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, ArrowUpCircle, Undo2, Users, RefreshCw, History, Database, Trash2, CheckCircle2, AlertTriangle, Info, ChevronRight } from 'lucide-react';
import { academicYearApi, type CalendarStatus, type DemoCounts, type PromotionPlanRow } from '../../services/step18Api';
import { notify, confirmDialog } from '../common/ui/feedback';

/** "07-01" -> "1 July" (for the sentence about automatic promotion) */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// Nice month day.
const niceMonthDay = (md: string) => { const [m, d] = md.split('-').map(Number); return `${d} ${MONTHS[(m || 7) - 1]}`; };
// Year name.
const yearName = (y: number) => (y === 1 ? '1st Year' : y === 2 ? '2nd Year' : '3rd Year');

// Screen part: academic year manager.
export const AcademicYearManager: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
  // Cal (kept in screen state)
  const [cal, setCal] = useState<CalendarStatus | null>(null);
  // Demo (kept in screen state)
  const [demo, setDemo] = useState<DemoCounts | null>(null);
  // true while waiting for the server (buttons are disabled meanwhile)
  const [loading, setLoading] = useState(true);
  // true while waiting for the server (buttons are disabled meanwhile)
  const [busy, setBusy] = useState(false);
  // promotion form
  const [branch, setBranch] = useState<'' | 'CSE' | 'Civil'>('');
  // From year (kept in screen state)
  const [fromYear, setFromYear] = useState<0 | 1 | 2 | 3>(0);
  // Plan (kept in screen state)
  const [plan, setPlan] = useState<{ target: string; move: PromotionPlanRow[]; skip: PromotionPlanRow[] } | null>(null);
  // Leave out (kept in screen state)
  const [leaveOut, setLeaveOut] = useState<Set<string>>(new Set());

  /** Load / reload everything shown on this screen. */
  const load = async () => {
    setLoading(true);
    const [c, d] = await Promise.all([academicYearApi.calendar(), academicYearApi.demoCounts()]);
    if (c.ok) setCal(c.data); else notify.error('Could not load the academic calendar', c.error);
    if (d.ok) setDemo(d.data);
    setLoading(false);
  };
  // Runs automatically whenever these change: cal.
  useEffect(() => { load(); }, []);

  /** Step 1 of promotion: ask the server who would move and who would not. */
  const preview = async () => {
    setBusy(true);
    const r = await academicYearApi.preview(branch || undefined, fromYear || undefined);
    setBusy(false);
    if (!r.ok) return notify.error('Could not prepare the list', r.error);
    setPlan(r.data);
    setLeaveOut(new Set());
  };

  /** Step 2: really promote (after a clear confirmation). */
  const runPromotion = async () => {
    if (!plan) return;
    const count = plan.move.length - leaveOut.size;
    const ok = await confirmDialog({
      title: `Promote ${count} student${count === 1 ? '' : 's'} to the next year?`,
      message: `They move into the ${plan.target} session: 1st year → 2nd year, 2nd year → 3rd year, 3rd year → Passed Out.\n\nAll old marks, attendance and results stay saved. You can undo this right after if needed.`,
      confirmText: 'Yes, promote',
    });
    if (!ok) return;
    setBusy(true);
    const r = await academicYearApi.promote({ branch: branch || undefined, fromYear: fromYear || undefined, excludeIds: [...leaveOut] });
    setBusy(false);
    if (!r.ok) return notify.error('Promotion failed', r.error);
    notify.success('Classes promoted', r.data.message);
    setPlan(null);
    await load();
    onChanged?.();
  };

  // Semester switch.
  const semesterSwitch = async () => {
    if (!(await confirmDialog({ title: 'Move students to the even semester?', message: 'Every active student in semester 1, 3 or 5 moves to semester 2, 4 or 6 of the same year. This normally happens by itself in January.', confirmText: 'Yes, move' }))) return;
    setBusy(true);
    const r = await academicYearApi.semesterSwitch();
    setBusy(false);
    if (!r.ok) return notify.error('Could not change the semester', r.error);
    notify.success('Semester changed', r.data.message);
    await load(); onChanged?.();
  };

  // Undo.
  const undo = async () => {
    if (!(await confirmDialog({ title: 'Undo the last promotion?', message: 'Students go back to the class they were in before the most recent promotion / semester change.', confirmText: 'Undo', danger: true }))) return;
    setBusy(true);
    const r = await academicYearApi.undo();
    setBusy(false);
    if (!r.ok) return notify.error('Could not undo', r.error);
    notify.success('Promotion undone', r.data.message);
    await load(); onChanged?.();
  };

  // Remove demo.
  const removeDemo = async () => {
    if (!(await confirmDialog({
      title: 'Delete ALL sample (random) data?',
      message: `This removes ${demo?.students ?? 0} sample students and all their sample marks, attendance, practicals, assignments and results.\n\nReal data (anything you or the teachers entered, and the data from the college's papers) is NOT touched. This cannot be undone.`,
      confirmText: 'Delete sample data', danger: true,
    }))) return;
    setBusy(true);
    const r = await academicYearApi.removeDemo();
    setBusy(false);
    if (!r.ok) return notify.error('Could not delete the sample data', r.error);
    notify.success('Sample data deleted', r.data.message);
    await load(); onChanged?.();
  };

  // class strength grouped by branch for the small table
  const byBranch = useMemo(() => {
    const m: Record<string, CalendarStatus['classes']> = {};
    (cal?.classes || []).forEach((c) => { (m[c.branch] ||= []).push(c); });
    return m;
  }, [cal]);

  if (loading && !cal) return <div className="p-10 text-center text-sm text-slate-500">Loading academic year…</div>;
  if (!cal) return <div className="p-6 rounded-2xl border border-rose-200 bg-rose-50 text-rose-800 text-sm">The academic calendar could not be loaded. Please refresh the page.</div>;

  const evenHalf = cal.semesterHalf === 'even';
  const lastRun = cal.history.find((h) => !h.undoneAt);

  return (
    <div className="space-y-6">
      {/* ---------- 1. current year ---------- */}
      <section className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center"><CalendarClock className="w-6 h-6" /></div>
            <div>
              <p className="text-xs uppercase tracking-widest text-blue-100 font-semibold">Current academic session</p>
              <h2 className="text-2xl font-bold">{cal.academicYear}</h2>
              <p className="text-sm text-blue-50">{evenHalf ? 'Even semesters (2, 4, 6) · January – June' : 'Odd semesters (1, 3, 5) · July – December'}</p>
            </div>
          </div>
          <button onClick={load} disabled={busy} className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-sm font-semibold cursor-pointer disabled:opacity-60">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
        <div className="px-6 py-4 flex gap-3 items-start text-sm text-slate-700 dark:text-slate-300 bg-blue-50/60 dark:bg-blue-950/20 border-t border-blue-100 dark:border-blue-900">
          {cal.autoEnabled ? <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
          <p>
            {cal.autoEnabled
              ? <>Automatic promotion is <b>on</b>. Every year on <b>{niceMonthDay(cal.promotionDate)}</b> (after the May–June board result) all classes move up by themselves, and in <b>January</b> students move to the even semester. Last done for: <b>{cal.promotionDoneFor || '—'}</b>.</>
              : <>Automatic promotion is <b>off</b> (PROMOTION_AUTO=0). Use the button below each year after the result.</>}
          </p>
        </div>
      </section>

      {/* ---------- 2. class strength ---------- */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-6">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white"><Users className="w-5 h-5 text-blue-700" /> Class strength today</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {(['CSE', 'Civil'] as const).map((b) => (
            <div key={b} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-800 dark:text-slate-100">{b === 'CSE' ? 'Computer Science & Engineering' : 'Civil Engineering'}</div>
              <table className="w-full text-sm">
                <tbody>
                  {[1, 2, 3].map((y) => {
                    const c = (byBranch[b] || []).filter((x) => x.year === y);
                    const n = c.reduce((a, x) => a + x.students, 0);
                    return (
                      <tr key={y} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{yearName(y)}</td>
                        <td className="px-4 py-2.5 text-slate-500">{c.length ? 'Semester ' + c.map((x) => x.semester).join(', ') : '—'}</td>
                        <td className="px-4 py-2.5 text-right font-bold tabular-nums text-slate-900 dark:text-white">{n}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
        {cal.notMoving.length > 0 && (
          <p className="mt-3 text-xs text-slate-500">Not counted (do not move with the class): {cal.notMoving.map((x) => `${x.status} ${x.students}`).join(' · ')}</p>
        )}
      </section>

      {/* ---------- 3. promote ---------- */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-6">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white"><ArrowUpCircle className="w-5 h-5 text-blue-700" /> Promote a whole class</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">No need to change students one by one. Choose the class, check the list, and promote everyone together. Students marked <i>Detained</i>, <i>Year Back</i> or <i>Left</i> are never moved.</p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Branch</span>
            <select value={branch} onChange={(e) => { setBranch(e.target.value as any); setPlan(null); }} className="min-w-40 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
              <option value="">Both branches</option><option value="CSE">CSE</option><option value="Civil">Civil</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Students now in</span>
            <select value={fromYear} onChange={(e) => { setFromYear(Number(e.target.value) as any); setPlan(null); }} className="min-w-40 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
              <option value={0}>All years</option><option value={1}>1st Year</option><option value={2}>2nd Year</option><option value={3}>3rd Year (→ Passed Out)</option>
            </select>
          </label>
          <button onClick={preview} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90 cursor-pointer disabled:opacity-60">
            Show who will move <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {plan && (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-sm">
              <span><b>{plan.move.length - leaveOut.size}</b> will move into <b>{plan.target}</b> · <b>{plan.skip.length + leaveOut.size}</b> will stay</span>
              <button onClick={runPromotion} disabled={busy || plan.move.length - leaveOut.size === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer disabled:opacity-50">
                <ArrowUpCircle className="w-4 h-4" /> Promote {plan.move.length - leaveOut.size} students
              </button>
            </div>
            {plan.move.length > 0 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="max-h-80 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300">
                      <tr><th className="px-3 py-2 text-left w-10">Move</th><th className="px-3 py-2 text-left">Roll no</th><th className="px-3 py-2 text-left">Name</th><th className="px-3 py-2 text-left">Now</th><th className="px-3 py-2 text-left">After</th></tr>
                    </thead>
                    <tbody>
                      {plan.move.map((s) => {
                        const out = leaveOut.has(s.id);
                        return (
                          <tr key={s.id} className={`border-t border-slate-100 dark:border-slate-800 ${out ? 'opacity-50' : ''}`}>
                            <td className="px-3 py-2"><input type="checkbox" checked={!out} aria-label={`Promote ${s.name}`}
                              onChange={() => setLeaveOut((set) => { const n = new Set(set); out ? n.delete(s.id) : n.add(s.id); return n; })} className="w-4 h-4 accent-blue-700 cursor-pointer" /></td>
                            <td className="px-3 py-2 font-mono text-xs">{s.rollNo}</td>
                            <td className="px-3 py-2">{s.name}</td>
                            <td className="px-3 py-2 text-slate-500">{s.branch} · {yearName(s.year)} · Sem {s.semester}</td>
                            <td className="px-3 py-2 font-semibold text-blue-800 dark:text-blue-300">{s.toStatus === 'Passed Out' ? 'Passed Out' : `${yearName(s.toYear!)} · Sem ${s.toSemester}`}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {plan.skip.length > 0 && (
              <details className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-sm">
                <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-300">{plan.skip.length} student(s) will not move — see why</summary>
                <ul className="mt-2 space-y-1 max-h-56 overflow-auto">
                  {plan.skip.map((s) => <li key={s.id} className="flex justify-between gap-3 text-slate-600 dark:text-slate-400"><span><span className="font-mono text-xs">{s.rollNo}</span> {s.name}</span><span className="text-xs">{s.reason}</span></li>)}
                </ul>
              </details>
            )}
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-3">
          {evenHalf && cal.semesterSwitchDoneFor !== cal.academicYear && (
            <button onClick={semesterSwitch} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
              <RefreshCw className="w-4 h-4" /> Move to even semester now
            </button>
          )}
          <button onClick={undo} disabled={busy || !lastRun} title={lastRun ? '' : 'Nothing to undo'} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-rose-300 text-rose-700 dark:text-rose-300 dark:border-rose-800 text-sm font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            <Undo2 className="w-4 h-4" /> Undo last promotion
          </button>
        </div>
      </section>

      {/* ---------- 4. history ---------- */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-6">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white"><History className="w-5 h-5 text-blue-700" /> Promotion history</h3>
        {cal.history.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No promotion has been done yet. The first automatic one happens on {niceMonthDay(cal.promotionDate)}.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 text-left"><tr><th className="py-2 pr-4">When</th><th className="py-2 pr-4">What</th><th className="py-2 pr-4">Students</th><th className="py-2 pr-4">By</th><th className="py-2">Status</th></tr></thead>
              <tbody>
                {cal.history.map((h) => (
                  <tr key={h.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-2 pr-4 whitespace-nowrap">{h.runAt?.slice(0, 16).replace('T', ' ')}</td>
                    <td className="py-2 pr-4">{h.mode === 'semester' ? 'Moved to even semester' : `Promoted into ${h.academicYear}`}{h.branch ? ` · ${h.branch}` : ''}{h.fromYear ? ` · from ${yearName(h.fromYear)}` : ''}</td>
                    <td className="py-2 pr-4 tabular-nums">{h.moved}</td>
                    <td className="py-2 pr-4">{h.runBy}{h.mode === 'auto' ? ' (automatic)' : ''}</td>
                    <td className="py-2">{h.undoneAt ? <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600">Undone</span> : <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">Done</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---------- 5. sample data ---------- */}
      <section className="rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/10 shadow-sm p-6">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white"><Database className="w-5 h-5 text-amber-600" /> Sample (random) data</h3>
        <div className="mt-2 flex gap-2 text-sm text-slate-700 dark:text-slate-300">
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
          <p>Because real marks of the current 1st and 2nd year are not available yet, the portal was filled with <b>random sample data</b> so every screen can be tried out. Sample items show a <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] font-bold">SAMPLE</span> badge and can be edited or deleted like any other record. When real data is ready, delete all of it here with one click.</p>
        </div>
        {demo && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {([['Students', demo.students], ['Exams', demo.exams], ['Attendance sessions', demo.attendanceSessions], ['Practicals', demo.practicals], ['Assignments', demo.assignments], ['Board results', demo.boardResults]] as [string, number][]).map(([k, v]) => (
              <div key={k} className="rounded-xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-900 p-3">
                <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{v}</div>
                <div className="text-xs text-slate-500">{k}</div>
              </div>
            ))}
          </div>
        )}
        <button onClick={removeDemo} disabled={busy || !demo || demo.students + demo.exams + demo.practicals === 0}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
          <Trash2 className="w-4 h-4" /> Delete all sample data
        </button>
        {demo?.createdAt?.startsWith('deleted') && <p className="mt-2 text-xs text-slate-500">Sample data was deleted on {demo.createdAt.slice(8, 18)}. It will not be created again.</p>}
      </section>
    </div>
  );
};
