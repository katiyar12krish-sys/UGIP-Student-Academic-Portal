// ===================================================================================================
// "My profile" card for EVERY role: correct your own contact details and change your own password.
// The server (server/self/service.ts) decides which fields each role may change; marks / results / roll no /
// branch are official records and are shown read-only. Nobody can change anybody else's details here.
// ===================================================================================================
import React, { useEffect, useState } from 'react';
import { UserCog, Lock, Save, ShieldCheck } from 'lucide-react';
import { call } from '../../services/academicApi';
import { authApi } from '../../services/authApi';

// Data shape: what GET /api/me/profile returns.
interface MyProfile {
  role: 'admin' | 'faculty' | 'student' | 'parent'; username: string; editable: string[];
  values: Record<string, string>;
  official: { rollNo?: string; name?: string; branch?: string; year?: number; semester?: number; category?: string; department?: string };
}

const LABELS: Record<string, string> = {
  name: 'पूरा नाम / Full name', email: 'ई-मेल / E-mail', phone: 'मोबाइल / Mobile', designation: 'पद / Designation',
  address: 'पता / Address', father: 'पिता का नाम / Father', mother: 'माता का नाम / Mother', dob: 'जन्म तिथि / Date of birth', gender: 'लिंग / Gender',
};

/** Correct my own details + change my own password (all roles). */
export const MyProfileCard: React.FC<{ showPassword?: boolean }> = ({ showPassword = true }) => {
  // The profile loaded from the server (null while loading)
  const [p, setP] = useState<MyProfile | null>(null);
  // The values being edited
  const [form, setForm] = useState<Record<string, string>>({});
  // Message after saving
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  // true while waiting for the server
  const [busy, setBusy] = useState(false);
  // Password box
  const [pwOpen, setPwOpen] = useState(false);
  const [cur, setCur] = useState(''); const [n1, setN1] = useState(''); const [n2, setN2] = useState('');

  // Runs once when this part of the screen opens.
  useEffect(() => { call<MyProfile>('GET', '/api/me/profile').then((r) => { if (r.ok) { setP(r.data); setForm(r.data.values); } }); }, []);
  if (!p) return null;

  // Save details.
  const save = async () => {
    setBusy(true); setMsg(null);
    const body: Record<string, string> = {};
    for (const k of p.editable) if ((form[k] ?? '') !== (p.values[k] ?? '')) body[k] = form[k] ?? '';
    if (!Object.keys(body).length) { setBusy(false); setMsg({ ok: false, t: 'कुछ बदला नहीं / Nothing changed' }); return; }
    const r = await call<MyProfile>('PUT', '/api/me/profile', body);
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, t: r.error }); return; }
    setP(r.data); setForm(r.data.values); setMsg({ ok: true, t: 'सेव हो गया / Saved' });
  };
  // Change password.
  const savePw = async () => {
    if (n1 !== n2) { setMsg({ ok: false, t: 'दोनों नए पासवर्ड एक जैसे नहीं हैं / The two new passwords are not the same' }); return; }
    setBusy(true);
    const r = await authApi.changePassword(cur, n1);
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, t: r.error }); return; }
    setMsg({ ok: true, t: 'पासवर्ड बदल गया। दूसरे डिवाइस से लॉग-आउट हो गया। / Password changed; other devices were signed out.' });
    setCur(''); setN1(''); setN2(''); setPwOpen(false);
  };

  const inp = 'w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100';
  const o = p.official;
  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><UserCog className="w-4 h-4 text-blue-700" /> मेरी प्रोफ़ाइल / My profile</h3>
          <p className="text-[11px] text-slate-500 mt-1">Login ID: <b className="font-mono">{p.username}</b> · अपनी जानकारी खुद सही करें / Correct your own details</p>
        </div>
        {showPassword && <button onClick={() => { setPwOpen(!pwOpen); setMsg(null); }} className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"><Lock className="w-3.5 h-3.5" /> पासवर्ड बदलें / Change password</button>}
      </div>

      {(o.rollNo || o.department) && (
        <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-600 dark:text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
          {o.rollNo && <span>Roll No: <b>{o.rollNo}</b></span>}
          {o.name && p.role === 'student' && <span>Name: <b>{o.name}</b></span>}
          {o.branch && <span>Branch: <b>{o.branch}</b></span>}
          {o.semester && <span>Semester: <b>{o.semester}</b></span>}
          {o.category && <span>Category: <b>{o.category}</b></span>}
          {o.department && <span>Department: <b>{o.department}</b></span>}
          <span className="w-full text-slate-500 flex items-start gap-1"><ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600" /> ये रिकॉर्ड, मार्क्स और रिज़ल्ट केवल शिक्षक / एडमिन बदल सकते हैं। / These records, marks and results are changed only by teachers / admin.</span>
        </div>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {p.editable.map((k) => (
          <label key={k} className={`block ${k === 'address' ? 'sm:col-span-2' : ''}`}>
            <span className="block text-[10px] font-bold text-slate-500 mb-0.5">{LABELS[k] || k}</span>
            {k === 'gender' ? (
              <select value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className={inp}>
                <option value="">—</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
              </select>
            ) : (
              <input type={k === 'dob' ? 'date' : k === 'email' ? 'email' : k === 'phone' ? 'tel' : 'text'} value={form[k] || ''} maxLength={k === 'address' ? 300 : 120}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })} className={inp} />
            )}
          </label>
        ))}
      </div>
      <button disabled={busy} onClick={save} className="mt-3 px-4 py-2 text-xs font-bold rounded-xl bg-blue-700 hover:bg-blue-800 text-white disabled:opacity-50 cursor-pointer flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> {busy ? 'Saving…' : 'सेव करें / Save details'}</button>

      {msg && <p className={`mt-3 text-xs font-bold ${msg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{msg.t}</p>}
      {pwOpen && (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input type="password" autoComplete="current-password" placeholder="Current password" value={cur} onChange={(e) => setCur(e.target.value)} className={inp} />
          <input type="password" autoComplete="new-password" placeholder="New password (8+, letters and digits)" value={n1} onChange={(e) => setN1(e.target.value)} className={inp} />
          <input type="password" autoComplete="new-password" placeholder="Repeat new password" value={n2} onChange={(e) => setN2(e.target.value)} className={inp} />
          <button disabled={busy || !cur || !n1} onClick={savePw} className="sm:col-span-3 justify-self-start px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 cursor-pointer">{busy ? 'Saving…' : 'Save new password'}</button>
        </div>
      )}
    </section>
  );
};
