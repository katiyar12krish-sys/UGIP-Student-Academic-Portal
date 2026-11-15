// ===================================================================================================
// Logins & Passwords screen (Step 12): class-wise logins, issue / print temporary passwords.
// ===================================================================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, KeyRound, Eye, EyeOff, Copy, Printer, Users, RefreshCw, Check, ShieldCheck, Search } from 'lucide-react';
import { authApi, type LoginRow, type PwStatus } from '../../services/authApi';
import { uiAlert } from './ui/feedback';   // Step 18: styled message instead of the browser's alert box

/**
 * Staff screen (admin + faculty): every student's login ID, password state and parent login in one place.
 * A password can be seen ONLY while it is still the temporary one. Once the student / parent sets their own, it is gone for everybody.
 */
const STATUS: Record<PwStatus, { label: string; cls: string }> = {
  not_issued: { label: 'No password yet', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  temporary: { label: 'Temporary (not changed yet)', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200' },
  changed: { label: 'Own password set', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200' },
};
// Esc.
const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

// Print slips.
function printSlips(rows: LoginRow[]) {
  // Step 19: slips only for TEMPORARY passwords (people who already chose their own keep theirs private on paper)
  const slips = rows.filter((r) => (r.student.status === 'temporary' && r.student.tempPassword) || r.parents.some((p) => p.status === 'temporary' && p.tempPassword));
  if (!slips.length) { uiAlert('Nothing to print: no temporary passwords are waiting. (Students who already set their own password are not shown.)'); return; }
  const w = window.open('', '_blank');
  if (!w) { uiAlert('Please allow pop-ups to print.'); return; }
  const body = slips.map((r) => `
    <div class="slip"><h3>${esc(r.name)} <small>${esc(r.branch)} · Year ${esc(r.year)} · Roll ${esc(r.rollNo)}</small></h3>
      ${r.student.status === 'temporary' && r.student.tempPassword ? `<p><b>Student login</b><br>ID: <code>${esc(r.student.username)}</code> &nbsp; Password: <code>${esc(r.student.tempPassword)}</code></p>` : ''}
      ${r.parents.filter((p) => p.status === 'temporary' && p.tempPassword).map((p) => `<p><b>Parent login (${esc(p.relation || 'Parent')})</b><br>ID: <code>${esc(p.username)}</code> &nbsp; Password: <code>${esc(p.tempPassword)}</code></p>`).join('')}
      <p class="n">पहली बार लॉगिन पर नया पासवर्ड बनाना होगा। इस पर्ची को किसी को न दिखाएँ। / You must set a new password at first login. Keep this slip private.</p></div>`).join('');
  w.document.write(`<!doctype html><title>Login slips</title><style>body{font-family:sans-serif}.slip{border:1px dashed #555;padding:10px 14px;margin:8px;width:46%;display:inline-block;vertical-align:top;page-break-inside:avoid;box-sizing:border-box}
    h3{margin:0 0 6px;font-size:14px}small{font-weight:normal;color:#555;display:block}code{font-size:15px;background:#eee;padding:1px 5px}.n{font-size:10px;color:#444}p{margin:6px 0;font-size:13px}</style>
    <h2 style="margin:8px">UGIP - login slips (CONFIDENTIAL: hand each slip only to that student / parent)</h2>${body}<script>window.onload=()=>window.print()<\/script>`);
  w.document.close();
}

// Pw.
const Pw: React.FC<{ status: PwStatus; temp: string | null }> = ({ status, temp }) => {
  // Is the 'panel' shown on screen? (true / false)
  const [show, setShow] = useState(false);
  // Copied (kept in screen state)
  const [copied, setCopied] = useState(false);
  // Step 19: the current password is shown (hidden behind the eye button) whether it is temporary or chosen by the person.
  if (status === 'not_issued') return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS[status].cls}`}>{STATUS[status].label}</span>;
  if (!temp) return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS[status].cls}`} title="This password was set before passwords could be viewed. Press “New password” to make one that can be seen.">{STATUS[status].label} · not viewable, press “New password”</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${STATUS[status].cls}`}>{STATUS[status].label}</span>
      <code className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-[12px] font-bold">{show ? temp : '••••-••••-••••'}</code>
      <button type="button" onClick={() => setShow(!show)} className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer" aria-label={show ? 'Hide' : 'Show'}>{show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
      <button type="button" onClick={() => { navigator.clipboard?.writeText(temp); setCopied(true); setTimeout(() => setCopied(false), 1200); }} className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer" aria-label="Copy">{copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}</button>
    </span>
  );
};

// Screen part: login manager.
export const LoginManager: React.FC<{ onClose: () => void; initialBranch?: string; initialYear?: number; initialQuery?: string }> = ({ onClose, initialBranch, initialYear, initialQuery }) => {
  // Branch (kept in screen state)
  const [branch, setBranch] = useState(initialBranch || '');
  // Year (kept in screen state)
  const [year, setYear] = useState(initialYear ? String(initialYear) : '');
  // Q (kept in screen state)
  const [q, setQ] = useState(initialQuery || '');
  // List of rows shown on this screen
  const [rows, setRows] = useState<LoginRow[] | null>(null);
  // Msg (kept in screen state)
  const [msg, setMsg] = useState('');
  // true while waiting for the server (buttons are disabled meanwhile)
  const [busy, setBusy] = useState(false);

  // Loads the data from the server.
  const load = useCallback(async () => {
    const r = await authApi.listLogins({ branch: branch || undefined, year: year ? Number(year) : undefined, q: q.trim() || undefined });
    if (r.ok) { setRows(r.data); setMsg(''); } else setMsg(r.error);
  }, [branch, year, q]);
  // Runs automatically whenever these change: rows.
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const counts = useMemo(() => {
    const c = { none: 0, temp: 0, own: 0, noParent: 0 };
    (rows || []).forEach((r) => { c[r.student.status === 'not_issued' ? 'none' : r.student.status === 'temporary' ? 'temp' : 'own']++; if (!r.parents.length) c.noParent++; });
    return c;
  }, [rows]);

  // Act.
  const act = async (fn: () => Promise<string | void>) => { setBusy(true); try { const m = await fn(); if (m) setMsg(m); await load(); } finally { setBusy(false); } };
  // New pw.
  const newPw = (r: LoginRow, userId: string, label: string) => {
    if (!window.confirm(`Make a NEW temporary password for ${label}?\nThe old password stops working and they are logged out.`)) return;
    act(async () => { const x = await authApi.issueCredentials(userId); return x.ok ? `New password made for ${label}.` : x.error; });
  };
  // Bulk.
  const bulk = () => {
    if (!window.confirm('Make logins for everyone in this list who has none yet (students and parents)?\nPeople who already set their own password are NOT touched.')) return;
    act(async () => {
      const x = await authApi.bulkLogins({ branch: branch || undefined, year: year ? Number(year) : undefined }, { students: true, parents: true });
      return x.ok ? `Done: ${x.data.studentsIssued} student passwords and ${x.data.parentsCreated} parent logins made.` : x.error;
    });
  };

  const sel = 'px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs';
  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/60 flex items-start justify-center p-3 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl my-4 border border-slate-200 dark:border-slate-700">
        <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-black flex items-center gap-2 text-slate-900 dark:text-white"><KeyRound className="w-4 h-4 text-amber-600" /> Student & Parent Logins</h2>
            <p className="text-[11px] text-slate-500 mt-1 flex items-start gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-px" />
              Student and parent passwords can be seen by faculty and admin only (press the eye). Every view is written to the security log. Students cannot see other students' passwords.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-800">
          <select value={branch} onChange={(e) => setBranch(e.target.value)} className={sel}><option value="">All branches</option><option value="CSE">Computer Science (CS)</option><option value="Civil">Civil</option></select>
          <select value={year} onChange={(e) => setYear(e.target.value)} className={sel}><option value="">All years</option><option value="1">1st year</option><option value="2">2nd year</option><option value="3">3rd year</option></select>
          <div className="relative"><Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or roll no." className={`${sel} pl-8 w-48`} /></div>
          <button onClick={() => load()} className={`${sel} flex items-center gap-1 cursor-pointer`}><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
          <div className="ml-auto flex flex-wrap gap-2">
            <button disabled={busy || !rows?.length} onClick={bulk} className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Make all missing logins</button>
            <button disabled={!rows?.length} onClick={() => printSlips(rows || [])} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1"><Printer className="w-3.5 h-3.5" /> Print login slips</button>
          </div>
        </div>

        <div className="px-4 py-2 text-[11px] text-slate-600 dark:text-slate-300 flex flex-wrap gap-x-4 gap-y-1 border-b border-slate-100 dark:border-slate-800">
          <span>No password yet: <b>{counts.none}</b></span><span>Temporary: <b>{counts.temp}</b></span><span>Own password set: <b>{counts.own}</b></span><span>Without parent login: <b>{counts.noParent}</b></span>
          {msg && <span className="font-bold text-blue-700 dark:text-blue-300">{msg}</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead><tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-wider font-bold">
              <th className="p-3">Student</th><th className="p-3">Student login ID</th><th className="p-3">Student password</th><th className="p-3">Parent login</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows === null && <tr><td colSpan={4} className="p-6 text-center text-slate-500">Loading…</td></tr>}
              {rows?.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-500">No students match.</td></tr>}
              {rows?.map((r) => (
                <tr key={r.studentId} className="align-top">
                  <td className="p-3"><p className="font-bold text-slate-900 dark:text-white">{r.name}</p><p className="text-[11px] text-slate-500">{r.branch} · Year {r.year} · Sem {r.semester}</p></td>
                  <td className="p-3 font-mono font-bold">{r.student.username}</td>
                  <td className="p-3"><div className="space-y-1.5"><Pw status={r.student.status} temp={r.student.tempPassword} />
                    <button disabled={busy} onClick={() => newPw(r, r.student.userId, r.name)} className="block text-[11px] font-bold text-blue-600 hover:underline cursor-pointer">{r.student.status === 'not_issued' ? 'Make password' : 'New password'}</button></div></td>
                  <td className="p-3">
                    <div className="space-y-2">
                      {r.parents.map((p) => (
                        <div key={p.userId} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-mono font-bold">{p.username}</span><span className="text-[11px] text-slate-500">({p.relation || 'Parent'}{p.name ? ` · ${p.name}` : ''})</span>
                          <Pw status={p.status} temp={p.tempPassword} />
                          <button disabled={busy} onClick={() => newPw(r, p.userId, `${p.relation || 'Parent'} of ${r.name}`)} className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer">New password</button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        {!r.parents.some((p) => p.relation === 'Father') && <button disabled={busy} onClick={() => act(async () => { const x = await authApi.createParentLogin(r.studentId, 'Father'); return x.ok ? `Father login made for ${r.name}.` : x.error; })} className="px-2 py-1 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-800 text-[10px] font-bold cursor-pointer">+ Father login</button>}
                        {!r.parents.some((p) => p.relation === 'Mother') && <button disabled={busy} onClick={() => act(async () => { const x = await authApi.createParentLogin(r.studentId, 'Mother'); return x.ok ? `Mother login made for ${r.name}.` : x.error; })} className="px-2 py-1 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-800 text-[10px] font-bold cursor-pointer">+ Mother login</button>}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
