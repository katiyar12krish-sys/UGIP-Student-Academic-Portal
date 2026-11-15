// ===================================================================================================
// Account menu -> Privacy & Security: authenticator app and privacy-consent choices.
// ===================================================================================================
import React, { useEffect, useState } from 'react';
import { KeyRound, ShieldCheck, X } from 'lucide-react';
import { useCollege } from '../../context/CollegeContext';
import { authApi } from '../../services/authApi';
import { ConsentPanel, ErrorBox, MfaSetupPanel, inputCls } from './SignInSteps';
import { NotificationsPanel } from './NotificationsPanel';

// Data shape: props.
interface Props { isOpen: boolean; onClose: () => void }

/** Account menu -> "Privacy & Security": authenticator app (two-step verification) and DPDP consent choices. */
export const PrivacySecurityModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { refreshAuthUser, logout } = useCollege();
  // Tab (kept in screen state)
  const [tab, setTab] = useState<'security' | 'privacy' | 'notifications'>('security');
  // Mfa (kept in screen state)
  const [mfa, setMfa] = useState<{ enabled: boolean; required: boolean; recoveryCodesLeft: number } | null>(null);
  // Mode (kept in screen state)
  const [mode, setMode] = useState<'view' | 'setup' | 'off' | 'codes'>('view');
  // Password (kept in screen state)
  const [password, setPassword] = useState('');
  // Code (kept in screen state)
  const [code, setCode] = useState('');
  // List of new codes shown on this screen
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  // Err (kept in screen state)
  const [err, setErr] = useState('');
  // true while waiting for the server (buttons are disabled meanwhile)
  const [busy, setBusy] = useState(false);

  // Loads the data from the server.
  const load = async () => {
    const r = await authApi.mfaStatus();
    if (r.ok) setMfa(r.data); else setErr(r.error);
  };
  // Runs automatically whenever these change: isOpen.
  useEffect(() => {
    if (!isOpen) return;
    setTab('security'); setMode('view'); setErr(''); setPassword(''); setCode(''); setNewCodes(null);
    load();
  }, [isOpen]);
  if (!isOpen) return null;

  // Run.
  const run = async (kind: 'off' | 'codes') => {
    if (busy) return;
    setBusy(true); setErr('');
    if (kind === 'off') {
      const r = await authApi.mfaDisable(password, code.trim());
      setBusy(false);
      if (!r.ok) return setErr(r.error);
      setMode('view'); setPassword(''); setCode('');
      await refreshAuthUser(); await load();
    } else {
      const r = await authApi.mfaNewRecoveryCodes(password, code.trim());
      setBusy(false);
      if (!r.ok) return setErr(r.error);
      setNewCodes(r.data.recoveryCodes); setPassword(''); setCode('');
      await load();
    }
  };
  // Tab cls.
  const tabCls = (t: string) => `flex-1 py-2.5 text-xs font-bold cursor-pointer ${tab === t ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-slate-500'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2.5"><ShieldCheck className="w-5 h-5 text-emerald-400" /><h3 className="text-base font-bold">Privacy &amp; Security</h3></div>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button className={tabCls('security')} onClick={() => setTab('security')}>Two-step</button>
          <button className={tabCls('privacy')} onClick={() => setTab('privacy')}>Privacy &amp; consent</button>
          <button className={tabCls('notifications')} onClick={() => setTab('notifications')}>Notifications</button>
        </div>

        {tab === 'notifications' ? (
          <NotificationsPanel onGoPrivacy={() => setTab('privacy')} />
        ) : tab === 'privacy' ? (
          <ConsentPanel mode="settings" onDone={() => { refreshAuthUser(); }} onWithdrawn={async () => { await logout(); onClose(); }} />
        ) : mode === 'setup' ? (
          <MfaSetupPanel onComplete={async () => { setMode('view'); await refreshAuthUser(); await load(); }} />
        ) : (
          <div className="p-6 space-y-4">
            <ErrorBox msg={err} />
            {!mfa ? <p className="text-xs text-slate-500">Loading…</p> : newCodes ? (
              <>
                <p className="text-xs text-slate-600 dark:text-slate-300">New recovery codes (the old ones no longer work). Save them now; they are shown once.</p>
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-sm text-center text-slate-900 dark:text-white">{newCodes.map((c) => <span key={c}>{c}</span>)}</div>
                <button onClick={() => { setNewCodes(null); setMode('view'); }} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl cursor-pointer">Done</button>
              </>
            ) : mode === 'view' ? (
              <>
                <div className="flex items-center gap-2 text-xs">
                  <KeyRound className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-700 dark:text-slate-200">Authenticator app: <b className={mfa.enabled ? 'text-emerald-600' : 'text-amber-600'}>{mfa.enabled ? 'On' : 'Off'}</b>{mfa.enabled && ` · ${mfa.recoveryCodesLeft} recovery codes left`}</span>
                </div>
                {!mfa.enabled ? (
                  <button onClick={() => { setErr(''); setMode('setup'); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer">Turn on two-step verification</button>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => { setErr(''); setMode('codes'); }} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl cursor-pointer">New recovery codes</button>
                    {!mfa.required && <button onClick={() => { setErr(''); setMode('off'); }} className="px-4 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-semibold rounded-xl cursor-pointer">Turn off</button>}
                  </div>
                )}
                {mfa.required && <p className="text-[11px] text-slate-500">Your role must keep this on. If you change phone and lose your recovery codes, ask the administrator to reset it.</p>}
              </>
            ) : (
              <>
                <p className="text-xs text-slate-600 dark:text-slate-300">{mode === 'off' ? 'To turn it off, confirm with your password and a current 6-digit code.' : 'To make new recovery codes, confirm with your password and a current 6-digit code.'}</p>
                <input type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
                <input inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" maxLength={16} value={code} onChange={(e) => setCode(e.target.value)} className={`${inputCls} font-mono`} />
                <div className="flex justify-between">
                  <button onClick={() => { setMode('view'); setErr(''); }} className="text-xs font-bold text-slate-500 cursor-pointer">← Back</button>
                  <button onClick={() => run(mode)} disabled={busy || !password || !code.trim()} className="px-4 py-2 bg-blue-600 disabled:opacity-60 text-white text-xs font-bold rounded-xl cursor-pointer">{busy ? 'Checking…' : 'Confirm'}</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
