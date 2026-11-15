// ===================================================================================================
// Small sign-in step screens: authenticator code, new password, authenticator setup, consent.
// ===================================================================================================
import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, Copy, Download, Languages, ShieldCheck } from 'lucide-react';
import { authApi, type ConsentInfo, type ConsentPurpose } from '../../services/authApi';

export const inputCls =
  'w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none';
const btnCls =
  'px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer';

// Screen part: error box.
export const ErrorBox: React.FC<{ msg: string }> = ({ msg }) =>
  msg ? (
    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
      <span>{msg}</span>
    </div>
  ) : null;

/** Second step of sign-in: 6-digit code from the authenticator app, or one recovery code. */
export const TotpStep: React.FC<{ onSubmit: (code: string) => Promise<string | null>; onBack: () => void }> = ({ onSubmit, onBack }) => {
  // Code (kept in screen state)
  const [code, setCode] = useState('');
  // Err (kept in screen state)
  const [err, setErr] = useState('');
  // true while waiting for the server (buttons are disabled meanwhile)
  const [busy, setBusy] = useState(false);
  // Go.
  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !code.trim()) return;
    setBusy(true); setErr('');
    const m = await onSubmit(code.trim());
    setBusy(false);
    if (m) setErr(m);
  };
  return (
    <form onSubmit={go} className="p-6 space-y-4">
      <ErrorBox msg={err} />
      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        Open your authenticator app and enter the 6-digit code for <b>UGIP</b>. Lost your phone? Use one of your recovery codes instead.
      </p>
      <input
        value={code} onChange={(e) => setCode(e.target.value)} autoFocus autoComplete="one-time-code" inputMode="text"
        placeholder="123456" maxLength={16} className={`${inputCls} font-mono text-center text-base tracking-[0.3em]`}
      />
      <div className="flex items-center justify-between pt-1">
        <button type="button" onClick={onBack} className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer">← Back</button>
        <button type="submit" disabled={busy} className={btnCls}>
          <span>{busy ? 'Checking…' : 'Verify'}</span><ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </form>
  );
};

/** Authenticator-app setup: scan QR -> type first code -> save recovery codes. Used at first login and from Privacy & Security. */
export const MfaSetupPanel: React.FC<{ onComplete: () => void; intro?: string }> = ({ onComplete, intro }) => {
  // Setup (kept in screen state)
  const [setup, setSetup] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  // Code (kept in screen state)
  const [code, setCode] = useState('');
  // List of codes shown on this screen
  const [codes, setCodes] = useState<string[] | null>(null);
  // Saved (kept in screen state)
  const [saved, setSaved] = useState(false);
  // Err (kept in screen state)
  const [err, setErr] = useState('');
  // true while waiting for the server (buttons are disabled meanwhile)
  const [busy, setBusy] = useState(false);

  // Runs once when this part of the screen opens.
  useEffect(() => {
    let alive = true;
    authApi.mfaSetup().then((r) => { if (!alive) return; r.ok ? setSetup(r.data) : setErr(r.error); });
    return () => { alive = false; };
  }, []);

  // Confirm.
  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr('');
    const r = await authApi.mfaConfirm(code.trim());
    setBusy(false);
    r.ok ? setCodes(r.data.recoveryCodes) : setErr(r.error);
  };
  // Text.
  const text = () => `UGIP portal - recovery codes\nEach code works once. Keep them somewhere safe.\n\n${(codes || []).join('\n')}\n`;
  // Download.
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text()], { type: 'text/plain' }));
    a.download = 'ugip-recovery-codes.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  if (codes) {
    return (
      <div className="p-6 space-y-4">
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /><span>Two-step verification is on.</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Save these <b>recovery codes</b> now. They are shown only once. If you lose your phone, each code lets you sign in one time.
        </p>
        <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-sm text-slate-900 dark:text-white text-center">
          {codes.map((c) => <span key={c}>{c}</span>)}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => navigator.clipboard?.writeText(text())} className="flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"><Copy className="w-3.5 h-3.5" />Copy</button>
          <button type="button" onClick={download} className="flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"><Download className="w-3.5 h-3.5" />Download</button>
        </div>
        <label className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-0.5" />
          <span>I have saved my recovery codes.</span>
        </label>
        <div className="flex justify-end">
          <button type="button" disabled={!saved} onClick={onComplete} className={btnCls}><span>Continue</span><ArrowRight className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={confirm} className="p-6 space-y-4">
      <ErrorBox msg={err} />
      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        {intro || 'Set up two-step verification. You need a free authenticator app on your phone (Google Authenticator, Microsoft Authenticator, Authy or similar).'}
      </p>
      <ol className="text-xs text-slate-600 dark:text-slate-300 list-decimal pl-4 space-y-1">
        <li>In the app choose <b>Add account → Scan QR code</b>.</li>
        <li>Type the 6-digit code the app shows.</li>
      </ol>
      {setup ? (
        <div className="flex flex-col items-center gap-2">
          <img src={setup.qrDataUrl} alt="QR code for the authenticator app" className="w-44 h-44 rounded-lg bg-white p-1 border border-slate-200" />
          <details className="text-[11px] text-slate-500 text-center">
            <summary className="cursor-pointer">Can't scan? Enter the key by hand</summary>
            <code className="block mt-1 font-mono break-all select-all text-slate-800 dark:text-slate-200">{setup.secret.match(/.{1,4}/g)?.join(' ')}</code>
          </details>
        </div>
      ) : !err ? <p className="text-xs text-slate-500 text-center">Preparing…</p> : null}
      <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" maxLength={8}
        className={`${inputCls} font-mono text-center text-base tracking-[0.3em]`} />
      <div className="flex justify-end">
        <button type="submit" disabled={busy || !setup || code.trim().length < 6} className={btnCls}><span>{busy ? 'Checking…' : 'Turn on'}</span><ArrowRight className="w-3.5 h-3.5" /></button>
      </div>
    </form>
  );
};

/** DPDP privacy notice + choices. mode "gate" = first login (must accept); "settings" = change / withdraw later. */
export const ConsentPanel: React.FC<{ mode: 'gate' | 'settings'; onDone: () => void; onWithdrawn?: () => void }> = ({ mode, onDone, onWithdrawn }) => {
  // Info (kept in screen state)
  const [info, setInfo] = useState<ConsentInfo | null>(null);
  // Lang (kept in screen state)
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  // Mine (kept in screen state)
  const [mine, setMine] = useState<Record<ConsentPurpose, boolean>>({ service: false, photo: false, notifications: false });
  // List of kids shown on this screen
  const [kids, setKids] = useState<Record<string, Record<ConsentPurpose, boolean>>>({});
  // Err (kept in screen state)
  const [err, setErr] = useState('');
  // Msg (kept in screen state)
  const [msg, setMsg] = useState('');
  // true while waiting for the server (buttons are disabled meanwhile)
  const [busy, setBusy] = useState(false);

  // Runs once when this part of the screen opens.
  useEffect(() => {
    let alive = true;
    authApi.consent().then((r) => {
      if (!alive) return;
      if (!r.ok) return setErr(r.error);
      setInfo(r.data);
      setMine(r.data.mine);
      setKids(Object.fromEntries(r.data.children.map((c) => [c.userId, c.consents])));
    });
    return () => { alive = false; };
  }, []);

  if (!info) return <div className="p-6"><ErrorBox msg={err} />{!err && <p className="text-xs text-slate-500">Loading…</p>}</div>;
  const notice = info.notice[lang];
  const optional = info.notice.purposes.filter((p) => !p.required);

  // Save.
  const save = async () => {
    if (busy) return;
    setBusy(true); setErr(''); setMsg('');
    const r = await authApi.saveConsent({ service: mine.service, ...(info.minor ? {} : { photo: mine.photo, notifications: mine.notifications }) });
    if (!r.ok) { setBusy(false); return setErr(r.error); }
    for (const c of info.children.filter((k) => !k.adult)) {
      const cr = await authApi.saveChildConsent(c.userId, { photo: kids[c.userId]?.photo, notifications: kids[c.userId]?.notifications });
      if (!cr.ok) { setBusy(false); return setErr(cr.error); }
    }
    setBusy(false);
    setMsg('Saved.');
    onDone();
  };
  // Withdraw.
  const withdraw = async () => {
    if (!window.confirm('Withdraw consent and sign out? You will not be able to use the portal until you accept the notice again.')) return;
    const r = await authApi.withdrawService();
    r.ok ? onWithdrawn?.() : setErr(r.error);
  };
  const Check: React.FC<{ checked: boolean; disabled?: boolean; onChange: (v: boolean) => void; label: string; note?: string }> = ({ checked, disabled, onChange, label, note }) => (
    <label className={`flex items-start gap-2 text-xs ${disabled ? 'opacity-60' : 'cursor-pointer'} text-slate-800 dark:text-slate-200`}>
      <input type="checkbox" className="mt-0.5" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}{note && <span className="block text-[11px] text-slate-500">{note}</span>}</span>
    </label>
  );

  return (
    <div className="p-6 space-y-4">
      <ErrorBox msg={err} />
      {msg && <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">{msg}</div>}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-blue-500" />{notice.title}</h4>
        <button type="button" onClick={() => setLang(lang === 'en' ? 'hi' : 'en')} className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 cursor-pointer"><Languages className="w-3.5 h-3.5" />{lang === 'en' ? 'हिन्दी' : 'English'}</button>
      </div>
      <div className="max-h-48 overflow-y-auto space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        {notice.sections.map((s) => (
          <div key={s.h}><p className="text-[11px] font-bold text-slate-900 dark:text-white">{s.h}</p><p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">{s.p}</p></div>
        ))}
      </div>
      <div className="space-y-2.5">
        <Check checked={mine.service} onChange={(v) => setMine({ ...mine, service: v })} label={info.notice.purposes[0][lang]} />
        {optional.map((p) => (
          <Check key={p.id} checked={info.minor ? false : mine[p.id]} disabled={info.minor} onChange={(v) => setMine({ ...mine, [p.id]: v })}
            label={p[lang]} note={info.minor ? 'You are under 18 (or not yet confirmed 18+): a parent / guardian gives this choice from their parent login.' : 'Optional'} />
        ))}
      </div>
      {info.children.filter((c) => !c.adult).map((c) => (
        <div key={c.userId} className="p-3 rounded-xl border border-violet-200 dark:border-violet-900 bg-violet-50/60 dark:bg-violet-950/30 space-y-2">
          <p className="text-xs font-bold text-slate-900 dark:text-white">Your child: {c.name} ({c.rollNo})</p>
          {optional.map((p) => (
            <Check key={p.id} checked={!!kids[c.userId]?.[p.id]} onChange={(v) => setKids({ ...kids, [c.userId]: { ...kids[c.userId], [p.id]: v } })} label={p[lang]} note="Optional, on behalf of your child" />
          ))}
        </div>
      ))}
      <div className="flex items-center justify-between pt-1">
        {mode === 'settings' ? <button type="button" onClick={withdraw} className="text-xs font-bold text-rose-600 hover:underline cursor-pointer">Withdraw consent &amp; sign out</button> : <span />}
        <button type="button" onClick={save} disabled={busy || !mine.service} className={btnCls}>
          <span>{busy ? 'Saving…' : mode === 'gate' ? 'Accept & Continue' : 'Save choices'}</span><ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
