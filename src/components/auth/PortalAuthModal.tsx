// ===================================================================================================
// Sign-in window for each role (username / roll no + password), followed by the extra steps.
// ===================================================================================================
import React, { useEffect, useState } from 'react';
import { useCollege } from '../../context/CollegeContext';
import { authApi, type AuthUser } from '../../services/authApi';
import { ConsentPanel, ErrorBox, MfaSetupPanel, TotpStep } from './SignInSteps';
import { Role } from '../../types';
import {
  ShieldCheck,
  UserCheck,
  GraduationCap,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  ArrowRight,
  KeyRound,
  Lock,
  Smartphone,
  Users,
} from 'lucide-react';

// Data shape: portal auth modal props.
interface PortalAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRole: Role;
  onSuccess: () => void;
  /** Step 19: draw the form inside the login page (no dark overlay, no close / cancel buttons). */
  inline?: boolean;
}

const ROLE_TITLE: Record<string, string> = {
  admin: 'Administrator Access Portal',
  faculty: 'Faculty Member Sign-In',
  student: 'Student Portal Sign-In',
  parent: 'Parent Portal Sign-In',
};

// Screen part: portal auth modal.
export const PortalAuthModal: React.FC<PortalAuthModalProps> = ({ isOpen, onClose, targetRole, onSuccess, inline = false }) => {
  const { login, loginMfa, changePassword, refreshAuthUser } = useCollege();
  // Username (kept in screen state)
  const [username, setUsername] = useState(targetRole === 'admin' ? 'admin' : '');
  // Faculty: subject-wise login (the subjects that have a teacher, from the server)
  const [subjectId, setSubjectId] = useState('');
  const [facultySubjects, setFacultySubjects] = useState<{ id: string; code: string; name: string; branch: string; semester: number }[]>([]);
  useEffect(() => {
    if (targetRole !== 'faculty') return;
    fetch('/api/auth/faculty-subjects', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : [])).then((list) => setFacultySubjects(Array.isArray(list) ? list : [])).catch(() => setFacultySubjects([]));
  }, [targetRole]);
  const subjectGroups = facultySubjects.reduce<Record<string, typeof facultySubjects>>((g, s) => {
    const k = `${s.branch} · Semester ${s.semester}`; (g[k] = g[k] || []).push(s); return g;
  }, {});
  // Password (kept in screen state)
  const [password, setPassword] = useState('');
  // Is the 'password' shown on screen? (true / false)
  const [showPassword, setShowPassword] = useState(false);
  // Error message to show (error msg); empty = no error
  const [errorMsg, setErrorMsg] = useState('');
  // true while waiting for the server (buttons are disabled meanwhile)
  const [busy, setBusy] = useState(false);
  // Is it forgot mode? (true / false)
  const [isForgotMode, setIsForgotMode] = useState(false);

  // Sign-in steps after the password: authenticator code -> new password -> authenticator setup -> privacy notice
  const [step, setStep] = useState<'login' | 'totp' | 'mfaSetup' | 'consent'>('login');
  // Challenge (kept in screen state)
  const [challenge, setChallenge] = useState('');

  // "Forgot password" by SMS code (only offered when the server has an SMS provider; needs DLT registration first)
  const [smsOn, setSmsOn] = useState(false);
  // Fp stage (kept in screen state)
  const [fpStage, setFpStage] = useState<'ask' | 'code'>('ask');
  // Fp user (kept in screen state)
  const [fpUser, setFpUser] = useState('');
  // Fp code (kept in screen state)
  const [fpCode, setFpCode] = useState('');
  // Fp pass (kept in screen state)
  const [fpPass, setFpPass] = useState('');
  // Fp info (kept in screen state)
  const [fpInfo, setFpInfo] = useState('');

  // First login with a temporary password: the person must choose their own password before entering.
  const [mustChange, setMustChange] = useState(false);
  // New password (kept in screen state)
  const [newPassword, setNewPassword] = useState('');
  // Confirm password (kept in screen state)
  const [confirmPassword, setConfirmPassword] = useState('');

  // The same modal instance is reused for different roles, so start clean every time it opens
  useEffect(() => {
    if (!isOpen) return;
    setUsername(targetRole === 'admin' ? 'admin' : '');
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setMustChange(false);
    setErrorMsg('');
    setIsForgotMode(false);
    setShowPassword(false);
    setStep('login');
    setChallenge('');
    setFpStage('ask'); setFpUser(''); setFpCode(''); setFpPass(''); setFpInfo('');
    authApi.smsStatus().then((r) => setSmsOn(r.ok && r.data.enabled));
  }, [isOpen, targetRole]);

  if (!isOpen) return null;

  // Reset.
  const reset = () => {
    setStep('login');
    setChallenge('');
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setMustChange(false);
    setErrorMsg('');
  };

  // Runs when the user does this on screen: submit.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErrorMsg('');
    if (targetRole === 'faculty' ? (!subjectId || !password) : (!username.trim() || !password)) {
      setErrorMsg(targetRole === 'faculty' ? 'Choose your subject and enter your password.' : targetRole === 'student' ? 'Enter your roll number and password.' : 'Enter your username and password.');
      return;
    }
    setBusy(true);
    // teachers sign in by SUBJECT (no username): the session then opens only that subject
    const r = await login(targetRole === 'faculty' ? '' : username.trim(), password, targetRole, targetRole === 'faculty' ? subjectId : undefined);
    setBusy(false);
    if (!r.ok) {
      setErrorMsg(r.error);
      return;
    }
    if (r.ok === 'mfa') { setChallenge(r.challenge); setStep('totp'); setPassword(''); return; }
    advance(r.user);
  };

  /** Decide what the person still has to do before they may enter. */
  const advance = (u: AuthUser) => {
    if (u.mustChangePassword) { setMustChange(true); return; }
    setMustChange(false);
    if (u.mfaSetupRequired) { setStep('mfaSetup'); return; }
    if (u.consentRequired) { setStep('consent'); return; }
    reset();
    onSuccess();
  };

  // Runs when the user does this on screen: totp.
  const handleTotp = async (code: string): Promise<string | null> => {
    const r = await loginMfa(challenge, code);
    if (!r.ok) return r.error;
    advance(r.user);
    return null;
  };
  // Step done.
  const stepDone = async () => {          // after authenticator setup / consent: ask the server what is still open
    const u = await refreshAuthUser();
    if (u) advance(u); else { reset(); setStep('login'); }
  };

  // Runs when the user does this on screen: forgot.
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErrorMsg(''); setFpInfo(''); setBusy(true);
    if (fpStage === 'ask') {
      const r = await authApi.forgotRequest(fpUser.trim(), targetRole);
      setBusy(false);
      if (!r.ok) return setErrorMsg(r.error);
      setFpInfo(r.data.message); setFpStage('code');
    } else {
      const r = await authApi.forgotVerify(fpUser.trim(), fpCode.trim(), fpPass, targetRole);
      setBusy(false);
      if (!r.ok) return setErrorMsg(r.error);
      setIsForgotMode(false); setFpStage('ask'); setFpCode(''); setFpPass('');
      if (!/^\d{10}$/.test(fpUser.trim())) setUsername(fpUser.trim());   // a mobile number is not a username
      setErrorMsg('');
      setFpInfo('Password changed. Sign in with your new password.');
    }
  };

  // Runs when the user does this on screen: change password.
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErrorMsg('');
    if (newPassword !== confirmPassword) {
      setErrorMsg('The two new passwords do not match.');
      return;
    }
    setBusy(true);
    const r = await changePassword(password, newPassword);
    setBusy(false);
    if (!r.ok) {
      setErrorMsg(r.error);
      return;
    }
    setMustChange(false);
    setPassword('');
    const u = await refreshAuthUser();
    if (u) advance(u); else { reset(); setStep('login'); }
  };

  const Icon = targetRole === 'admin' ? ShieldCheck : targetRole === 'faculty' ? UserCheck : targetRole === 'parent' ? Users : GraduationCap;
  const iconColor = targetRole === 'admin' ? 'text-blue-400' : targetRole === 'faculty' ? 'text-amber-400' : targetRole === 'parent' ? 'text-violet-300' : 'text-emerald-400';
  const inputCls =
    'w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none';

  return (
    <div className={inline ? 'w-full' : 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-150'}>
      <div className={inline ? 'relative w-full bg-white dark:bg-slate-900 overflow-hidden' : 'relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden'}>
        <div className={inline && step === 'login' && !mustChange && !isForgotMode ? 'hidden' : 'bg-slate-900 text-white px-6 py-5 border-b border-slate-800'}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center">
                {isForgotMode ? <Smartphone className="w-5 h-5 text-emerald-400" /> : mustChange ? <Lock className="w-5 h-5 text-amber-400" /> : <Icon className={`w-5 h-5 ${iconColor}`} />}
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {isForgotMode ? 'Forgot Password' : mustChange ? 'Set Your New Password'
                    : step === 'totp' ? 'Two-Step Verification' : step === 'mfaSetup' ? 'Set Up Two-Step Verification'
                    : step === 'consent' ? 'Privacy & Consent' : ROLE_TITLE[targetRole]}
                </h3>
                <p className="text-[11px] text-slate-300">Uttarakhand Government Institute of Polytechnic</p>
              </div>
            </div>
            <button
              onClick={() => { reset(); onClose(); }}
              className={`${inline ? 'hidden' : ''} p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer`}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {isForgotMode ? (
          smsOn ? (
            <form onSubmit={handleForgot} className="p-6 space-y-4">
              <ErrorBox msg={errorMsg} />
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {fpStage === 'ask'
                  ? 'Enter your roll number (or your registered mobile number). We send a 6-digit code to the mobile number saved with your account.'
                  : (fpInfo || 'Enter the code from the SMS and choose a new password.')}
              </p>
              <input value={fpUser} onChange={(e) => setFpUser(e.target.value)} placeholder="Roll number or mobile number" className={`${inputCls} font-mono`} disabled={fpStage === 'code'} autoFocus />
              {fpStage === 'code' && (
                <>
                  <input value={fpCode} onChange={(e) => setFpCode(e.target.value)} inputMode="numeric" placeholder="6-digit code" maxLength={6} className={`${inputCls} font-mono tracking-widest`} />
                  <input type="password" autoComplete="new-password" value={fpPass} onChange={(e) => setFpPass(e.target.value)} placeholder="New password (8+ characters, letters and digits)" className={inputCls} />
                </>
              )}
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => { setIsForgotMode(false); setErrorMsg(''); setFpStage('ask'); }} className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer">← Back to Sign In</button>
                <button type="submit" disabled={busy || !fpUser.trim()} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer">
                  <span>{busy ? 'Please wait…' : fpStage === 'ask' ? 'Send code' : 'Change password'}</span><ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          ) : (
          <div className="p-6 space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Password reset by SMS is not available yet. Please contact the college administrator (or your class faculty). They can issue a new temporary
              password for you, which you will change at your next login.
            </p>
            <button
              type="button"
              onClick={() => { setIsForgotMode(false); setErrorMsg(''); }}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              ← Back to Sign In
            </button>
          </div>
          )
        ) : mustChange ? (
          <form onSubmit={handleChangePassword} className="p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              You signed in with a temporary password. Choose your own password now (at least 8 characters, with letters and digits).
            </p>
            <input type="password" autoComplete="new-password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls} autoFocus />
            <input type="password" autoComplete="new-password" placeholder="Repeat new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls} />
            <div className="pt-1 flex justify-end">
              <button
                type="submit"
                disabled={busy}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <span>{busy ? 'Saving…' : 'Save & Enter'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        ) : step === 'totp' ? (
          <TotpStep onSubmit={handleTotp} onBack={() => { setStep('login'); setChallenge(''); setErrorMsg(''); }} />
        ) : step === 'mfaSetup' ? (
          <MfaSetupPanel onComplete={stepDone} intro="Staff accounts must use an authenticator app. It takes one minute and protects marks and student records." />
        ) : step === 'consent' ? (
          <ConsentPanel mode="gate" onDone={stepDone} />
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {fpInfo && !errorMsg && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">{fpInfo}</div>
            )}
            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {targetRole === 'faculty' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">विषय चुनें / Choose your subject</label>
              <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={inputCls} autoFocus>
                <option value="">— Select subject —</option>
                {Object.entries(subjectGroups).map(([group, list]) => (
                  <optgroup key={group} label={group}>
                    {list.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                  </optgroup>
                ))}
              </select>
              {!facultySubjects.length && <p className="mt-1 text-[11px] text-amber-700">No subject has a teacher yet. The admin assigns subjects in Faculty Role Control.</p>}
            </div>
            ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {targetRole === 'student' ? 'Roll / UBTER Number' : targetRole === 'parent' ? 'Parent Username (given by the college)' : 'Username'}
              </label>
              <input
                type="text"
                autoComplete="username"
                inputMode={targetRole === 'student' ? 'numeric' : 'text'}
                placeholder={targetRole === 'student' ? 'e.g. 24090050007' : targetRole === 'parent' ? 'e.g. p24090050007' : 'Your username'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`${inputCls} font-mono`}
                autoFocus={targetRole !== 'admin'}
              />
            </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                  <span>Password</span>
                </label>
                <button
                  type="button"
                  onClick={() => { setIsForgotMode(true); setErrorMsg(''); }}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputCls} pl-3 pr-10 font-mono`}
                  autoFocus={targetRole === 'admin'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 rounded-lg p-2.5">
              {targetRole === 'student' && 'पहली बार: अपने क्लास टीचर से Roll No. और अस्थायी पासवर्ड लें। / First time: get your roll number and temporary password from your class teacher. You will then choose your own password.'}
              {targetRole === 'parent' && 'ID = “p” + बच्चे का Roll No. (जैसे p24090050011)। पासवर्ड कॉलेज देता है, पहली बार बदलना होगा। / ID = “p” + your child’s roll number. The college gives the first password; you will change it at first login.'}
              {targetRole === 'faculty' && 'अपना विषय चुनें और अपना पासवर्ड डालें। आप सिर्फ उसी विषय का काम खोल पाएँगे। पासवर्ड एडमिन देते हैं। / Choose your subject and type your password. Only that subject opens. Your password comes from the administrator.'}
              {targetRole === 'admin' && 'Administrator account only.'}
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => { reset(); onClose(); }}
                className={`${inline ? 'hidden' : ''} px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className={`${inline ? 'w-full justify-center py-3 text-sm bg-blue-900 hover:bg-blue-800' : 'bg-blue-600 hover:bg-blue-700'} px-5 py-2.5 disabled:opacity-60 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-md cursor-pointer`}
              >
                <span>{busy ? 'Checking…' : 'Sign In'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
