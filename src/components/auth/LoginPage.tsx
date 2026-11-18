// =====================================================================================================
// Login page (Step 19, new look in Step 21) - the FIRST screen of the portal
// -----------------------------------------------------------------------------------------------------
// Only two things on this page, as the college asked:
//   1. The college name in big letters (left: navy brand panel; on phones it sits on top).
//   2. Three login boxes: Admin | Faculty | Student. Clicking a box opens its sign-in form below it.
// (Parents use the small "Parent login" link under the boxes.)
// Each role signs in with its OWN username and password; the server checks that the account really has
// that role, so a student password never opens the faculty or admin panel.
// After the password the usual steps follow in the same card (first-login new password, authenticator
// code for staff, privacy consent). That logic lives in PortalAuthModal (used here in "inline" mode).
// =====================================================================================================
import React, { useState } from 'react';
import { ShieldCheck, UserCheck, GraduationCap, Users, Moon, Sun, ChevronRight } from 'lucide-react';
import { useCollege } from '../../context/CollegeContext';
import { PortalAuthModal } from './PortalAuthModal';
import type { Role } from '../../types';

/** The three login boxes, with Student placed first for convenience. */
const BOXES: { role: Role; title: string; sub: string; icon: React.ElementType; tint: string; ring: string }[] = [
  { role: 'student', title: 'Student', sub: 'Roll No. & Password', icon: GraduationCap, tint: 'from-blue-600 to-indigo-600', ring: 'ring-blue-500' },
  { role: 'faculty', title: 'Faculty', sub: 'Subject Lecturers & HODs', icon: UserCheck, tint: 'from-emerald-700 to-teal-500', ring: 'ring-emerald-600' },
  { role: 'admin', title: 'Admin', sub: 'Principal & Office Only', icon: ShieldCheck, tint: 'from-slate-900 to-slate-700', ring: 'ring-slate-700' },
];

// Screen part: login page.
export const LoginPage: React.FC<{ onSignedIn: (role: Role) => void }> = ({ onSignedIn }) => {
  const { t, language, setLanguage, theme, toggleTheme } = useCollege();
  // Role (kept in screen state)
  const [role, setRole] = useState<Role | null>(null);     // null = no box chosen yet
  const chosen = BOXES.find((b) => b.role === role);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row ugip-app-bg text-slate-900 dark:text-slate-100">
      {/* ---------- brand panel: college name ---------- */}
      <aside className="ugip-hero relative overflow-hidden text-white lg:w-[44%] lg:min-h-screen px-6 sm:px-10 py-10 lg:py-14 flex flex-col">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 ring-2 ring-amber-400/80 flex items-center justify-center font-black text-sm tracking-tight backdrop-blur">UGIP</div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">College Management Portal</div>
        </div>
        <div className="flex-1 flex flex-col justify-center py-10 lg:py-0">
          <div className="w-14 h-1.5 rounded-full bg-amber-400 mb-6" />
          <h1 className="text-3xl sm:text-5xl lg:text-[3.4rem] font-extrabold uppercase leading-[1.05] tracking-tight">
            {t.collegeName}
          </h1>
          {language !== 'hi' && (
            <p className="mt-4 text-lg sm:text-xl font-semibold text-blue-100" lang="hi">उत्तराखंड राजकीय पॉलिटेक्निक संस्थान</p>
          )}
        </div>
        <p className="hidden lg:block text-xs text-blue-200/80">© {new Date().getFullYear()} {t.collegeName}</p>
      </aside>

      {/* ---------- sign-in side ---------- */}
      <section className="flex-1 flex flex-col">
        {/* small controls only: language + light / dark */}
        <div className="flex justify-end gap-1 px-4 sm:px-8 pt-4">
          <div className="flex rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-0.5 shadow-xs">
            {(['en', 'hi'] as const).map((l) => (
              <button key={l} onClick={() => setLanguage(l as any)} aria-label={`Language ${l}`}
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase cursor-pointer transition-colors ${language === l ? 'bg-blue-900 text-white dark:bg-blue-300 dark:text-blue-950' : 'text-slate-600 dark:text-slate-300 hover:text-blue-900'}`}>{l === 'hi' ? 'हिं' : 'EN'}</button>
            ))}
          </div>
          <button onClick={toggleTheme} aria-label="Light / dark" className="ml-1 w-8 h-8 rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-900 cursor-pointer shadow-xs">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <main className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-8 py-10 flex flex-col justify-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">{language === 'hi' ? 'लॉगिन करें' : 'Sign in'}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{language === 'hi' ? 'अपना प्रकार चुनें' : 'Choose who you are'}</p>

          {/* three login boxes */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3" role="tablist" aria-label="Choose how you sign in">
            {BOXES.map((b) => {
              const on = role === b.role;
              return (
                <button key={b.role} role="tab" aria-selected={on} onClick={() => setRole(b.role)}
                  className={`group text-left rounded-2xl p-4 transition-all cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800
                    ${on ? `ring-2 ${b.ring} shadow-lg -translate-y-0.5` : 'hover:shadow-md hover:-translate-y-0.5'}`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${b.tint} shadow-md`}>
                    <b.icon className="w-5 h-5" />
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-1">
                    <div>
                      <p className="text-base font-bold text-slate-900 dark:text-white">{b.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">{b.sub}</p>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${on ? 'rotate-90 text-slate-900 dark:text-white' : 'text-slate-400 group-hover:translate-x-0.5'}`} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* the form of the chosen box */}
          {role && (
            <div className="mt-5 w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
              <div className={`h-1.5 bg-gradient-to-r ${chosen ? chosen.tint : 'from-slate-500 to-slate-400'}`} />
              <div className="px-6 pt-5">
                <p className="text-base font-bold text-slate-900 dark:text-white">{role === 'parent' ? 'Parent Login' : `${chosen?.title} Login`}</p>
              </div>
              {/* key={role}: a fresh, empty form for every role */}
              <PortalAuthModal key={role} inline isOpen targetRole={role} onClose={() => setRole(null)} onSuccess={() => onSignedIn(role)} />
            </div>
          )}

          <button onClick={() => setRole('parent')} className="mt-6 self-center text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-900 dark:hover:text-blue-200 inline-flex items-center gap-1.5 cursor-pointer">
            <Users className="w-4 h-4" /> Parent login
          </button>
        </main>

        <footer className="lg:hidden py-4 text-center text-xs text-slate-500 dark:text-slate-400">
          © {new Date().getFullYear()} {t.collegeName}
        </footer>
      </section>
    </div>
  );
};
