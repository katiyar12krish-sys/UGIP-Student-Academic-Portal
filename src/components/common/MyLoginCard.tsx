// ===================================================================================================
// Student / parent "my login" card with a simple change-password box.
// ===================================================================================================
import React, { useEffect, useState } from 'react';
import { KeyRound, ShieldCheck, Lock } from 'lucide-react';
import { authApi, type MyLoginInfo } from '../../services/authApi';
import { useCollege } from '../../context/CollegeContext';

/** Student / parent: "my login" in plain words + a simple change-password box. Shows only the person's OWN login ID, never a password. */
export const MyLoginCard: React.FC = () => {
  const { language } = useCollege();
  const isHi = language === 'hi';

  // Info (kept in screen state)
  const [info, setInfo] = useState<MyLoginInfo | null>(null);
  // Is the 'panel' shown on screen? (true / false)
  const [open, setOpen] = useState(false);
  // Cur (kept in screen state)
  const [cur, setCur] = useState(''); const [n1, setN1] = useState(''); const [n2, setN2] = useState('');
  // Msg (kept in screen state)
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  // true while waiting for the server (buttons are disabled meanwhile)
  const [busy, setBusy] = useState(false);
  // Runs once when this part of the screen opens.
  useEffect(() => { authApi.myLoginInfo().then((r) => r.ok && setInfo(r.data)); }, []);
  if (!info) return null;

  // Save.
  const save = async () => {
    if (n1 !== n2) return setMsg({ ok: false, t: isHi ? 'दोनों नए पासवर्ड मेल नहीं खाते।' : 'The two new passwords are not the same.' });
    setBusy(true);
    const r = await authApi.changePassword(cur, n1);
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, t: r.error });
    setMsg({ ok: true, t: isHi ? 'पासवर्ड बदल गया है। आपके अन्य सभी डिवाइस लॉग आउट हो गए हैं।' : 'Password changed. Your other devices were signed out.' });
    setCur(''); setN1(''); setN2(''); setOpen(false);
  };
  const inp = 'w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800';
  const stateText = { 
    not_issued: isHi ? 'अभी जारी नहीं हुआ' : 'not given yet', 
    not_used_yet: isHi ? 'अभी तक उपयोग नहीं हुआ' : 'not used yet', 
    active: isHi ? 'सक्रिय' : 'in use' 
  } as const;

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-600" /> {isHi ? 'मेरा लॉगिन विवरण' : 'My login'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">
            {isHi ? 'लॉगिन आईडी:' : 'Login ID:'} <b className="font-mono">{info.username}</b>
          </p>
          {info.role === 'student' && (info.parents?.length ? (
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              {isHi ? 'अभिभावक लॉगिन आईडी' : 'Parent login ID'}{info.parents.length > 1 ? 's' : ''}: {info.parents.map((p, i) => (
              <span key={p.username}>{i > 0 && ', '}<b className="font-mono">{p.username}</b> <span className="text-slate-400">({p.relation || (isHi ? 'अभिभावक' : 'Parent')}, {stateText[p.state as keyof typeof stateText] || p.state})</span></span>
            ))}</p>
          ) : <p className="text-xs text-slate-500 mt-1">{isHi ? 'अभिभावक लॉगिन अभी तक नहीं बना है। अपने क्लास फैकल्टी से संपर्क करें।' : 'No parent login yet. Ask your class faculty.'}</p>)}
          {info.role === 'parent' && info.children?.length ? <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{isHi ? 'आपका बच्चा:' : 'Your child:'} {info.children.map((c) => `${c.name} (${c.rollNo})`).join(', ')}</p> : null}
          <p className="text-[11px] text-slate-500 mt-2 flex items-start gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-px" />
            {isHi 
              ? 'अपना पासवर्ड हमेशा गोपनीय रखें। यदि आप पासवर्ड भूल जाते हैं तो केवल कॉलेज स्टाफ ही इसे देख/रीसेट कर सकता है; कोई अन्य छात्र इसे नहीं देख सकता।'
              : 'Keep your password secret. Only the college staff (your teachers and the admin) can look it up if you forget it; other students can never see it.'}
          </p>
        </div>
        <button onClick={() => { setOpen(!open); setMsg(null); }} className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer">
          <Lock className="w-3.5 h-3.5" /> {isHi ? 'पासवर्ड बदलें' : 'Change password'}
        </button>
      </div>
      {msg && <p className={`mt-3 text-xs font-bold ${msg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{msg.t}</p>}
      {open && (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input type="password" autoComplete="current-password" placeholder={isHi ? 'वर्तमान पासवर्ड' : 'Current password'} value={cur} onChange={(e) => setCur(e.target.value)} className={inp} />
          <input type="password" autoComplete="new-password" placeholder={isHi ? 'नया पासवर्ड (8+ अक्षर व अंक)' : 'New password (8+, letters and digits)'} value={n1} onChange={(e) => setN1(e.target.value)} className={inp} />
          <input type="password" autoComplete="new-password" placeholder={isHi ? 'नया पासवर्ड पुनः दर्ज करें' : 'Repeat new password'} value={n2} onChange={(e) => setN2(e.target.value)} className={inp} />
          <button disabled={busy || !cur || !n1} onClick={save} className="sm:col-span-3 justify-self-start px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 cursor-pointer">
            {busy ? (isHi ? 'सहेजा जा रहा है…' : 'Saving…') : (isHi ? 'नया पासवर्ड सहेजें' : 'Save new password')}
          </button>
        </div>
      )}
    </section>
  );
};
