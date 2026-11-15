// ===================================================================================================
// Public landing page: choose the portal (admin / faculty / student / parent), public notices.
// ===================================================================================================
import React, { useState } from 'react';
import { useCollege } from '../../context/CollegeContext';
import { Role } from '../../types';
import { PortalAuthModal } from '../auth/PortalAuthModal';
import {
  Users,
  ShieldCheck,
  UserCheck,
  GraduationCap,
  School,
  Building2,
  Laptop,
  CheckCircle2,
  Lock,
  ArrowRight,
  Calendar,
  MapPin,
  Megaphone,
  Sun,
  Moon,
  Globe,
  Sparkles,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';
import { CollegeNewsSection } from '../common/CollegeNewsSection';
import { NotificationBell } from '../common/NotificationBell';

// Data shape: landing portal props.
interface LandingPortalProps {
  onSelectRole: (role: Role) => void;
}

// Screen part: landing portal.
export const LandingPortal: React.FC<LandingPortalProps> = ({ onSelectRole }) => {
  const { notices, t, language, setLanguage, theme, toggleTheme } = useCollege();
  // Auth role (kept in screen state)
  const [authRole, setAuthRole] = useState<Role | null>(null);
  // Is it auth open? (true / false)
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  // Is the 'news pop-up' shown on screen? (true / false)
  const [showNewsModal, setShowNewsModal] = useState(false);

  // Runs when the user does this on screen: open auth.
  const handleOpenAuth = (role: Role) => {
    setAuthRole(role);
    setIsAuthOpen(true);
  };

  // Runs when the user does this on screen: auth success.
  const handleAuthSuccess = () => {
    if (authRole) {
      onSelectRole(authRole);
    }
    setIsAuthOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* Top Header */}
      <header className="bg-slate-900 dark:bg-slate-950 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-400/30 flex items-center justify-center shrink-0 shadow-inner">
              <School className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-blue-400">
                  Government of Uttarakhand
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-xs text-slate-300 font-mono">UBTER Code: 090</span>
              </div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white leading-tight">
                {t.collegeName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            {/* Language Selector */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
              {(['en', 'hi'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLanguage(l)}
                  className={`px-2 py-1 rounded text-[11px] font-bold uppercase transition-all cursor-pointer ${
                    language === l ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notification Bell */}
            <NotificationBell />

            <div className="hidden md:flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-md border border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>{t.academicSession}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Presentation */}
      <section className="bg-gradient-to-b from-white via-slate-50 to-blue-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800 py-10 sm:py-14 transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
            <span>Affiliated with UBTER Roorkee</span>
            <span aria-hidden="true">·</span>
            <span>AICTE Approved</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Institutional Management & Academic Portal
          </h2>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            Unified digital gateway for Uttarakhand Government Institute of Polytechnic. Choose your dedicated login portal below to manage administrative controls, class-wise subject dispatches, or student evaluations.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-blue-600" />
              Computer Science & Engineering
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              Civil Engineering
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
              Bulk Excel Marks Export
            </span>
          </div>
        </div>
      </section>

      {/* 3 Dedicated Login Portals */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 flex-1 w-full">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t.selectAccessGateway}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select your role to access authentication credentials.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400 hidden sm:inline">
            {t.academicSession}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 1. ADMIN PORTAL */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group hover:border-blue-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center group-hover:bg-blue-600 transition-colors shadow-md">
                <ShieldCheck className="w-7 h-7 text-blue-400 group-hover:text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Institutional Control
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                    <Lock className="w-2.5 h-2.5" /> Security Verified
                  </span>
                </div>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                  {t.adminRole}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Principal & administrative master management. Full authority over faculty additions/removals, social category rosters, and bulk Excel marks export.
                </p>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Admin-only faculty role control (Add/Remove)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>All students marks export in 1-Click Excel sheet</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Real-time security audit logs & AES-256 vault</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                id="enter-admin-portal-btn"
                onClick={() => handleOpenAuth('admin')}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-blue-600 text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <span>{t.enterAdmin}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2. FACULTY PORTAL */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group hover:border-amber-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center group-hover:bg-amber-600 transition-colors shadow-md">
                <UserCheck className="w-7 h-7 text-amber-400 group-hover:text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Academic Staff
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 font-mono">
                    <Lock className="w-2.5 h-2.5" /> Staff Pass
                  </span>
                </div>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                  {t.facultyRole}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Lecturer & HOD workspace. Transmit study materials by Class & Subject, issue student and parent logins, and mark live attendance.
                </p>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Choose Class & Subject to dispatch materials</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Issue one-time logins for students and parents</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Bulk class marksheet generation & grading</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                id="enter-faculty-portal-btn"
                onClick={() => handleOpenAuth('faculty')}
                className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <span>{t.enterFaculty}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 3. STUDENT PORTAL */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group hover:border-emerald-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center group-hover:bg-emerald-600 transition-colors shadow-md">
                <GraduationCap className="w-7 h-7 text-emerald-400 group-hover:text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Student Workspace
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 font-mono">
                    Roll + Password
                  </span>
                </div>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                  {t.studentRole}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Student self-service dashboard. Receive class subject packs, punch lecture attendance, check UBTER marks, and access 24/7 AI tutor.
                </p>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Class & Subject materials sent by your teacher</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Student ID Badge & QR Code attendance scanner</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Exam schedule & provisional tabulation scorecards</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                id="enter-student-portal-btn"
                onClick={() => handleOpenAuth('student')}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <span>{t.enterStudent}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 4. PARENT PORTAL */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group hover:border-violet-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center group-hover:bg-violet-600 transition-colors shadow-md">
                <Users className="w-7 h-7 text-violet-300 group-hover:text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Parent Workspace</span>
                  <span className="text-[10px] text-violet-700 bg-violet-50 dark:bg-violet-950/60 dark:text-violet-300 px-2 py-0.5 rounded-full border border-violet-200 dark:border-violet-800 font-mono">
                    Username + Password
                  </span>
                </div>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">Parent</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Read-only view of your child's profile and results. Login is issued by the college.
                </p>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                  <span>Child's class, status and results</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                  <span>Only your own child is visible</span>
                </div>
              </div>
            </div>
            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                id="enter-parent-portal-btn"
                onClick={() => handleOpenAuth('parent')}
                className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <span>Enter Parent Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Official Circulars Preview Strip */}
      <section className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t.newsCirculars}</h3>
            </div>
            <button
              onClick={() => setShowNewsModal(true)}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All Circulars ({notices.length})</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {notices.length === 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400">No circulars have been published yet.</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {notices.slice(0, 3).map((notice) => (
              <div
                key={notice.id}
                onClick={() => setShowNewsModal(true)}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-400 transition-all space-y-1.5 cursor-pointer"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">{notice.category}</span>
                  <span className="font-mono">{notice.date}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{notice.title}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{notice.content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {showNewsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <CollegeNewsSection
            isModal={true}
            onClose={() => setShowNewsModal(false)}
            allowPublish={false}
          />
        </div>
      )}

      {authRole && (
        <PortalAuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          targetRole={authRole}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 px-4 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1.5 mt-auto">
        <div className="flex items-center justify-center gap-2">
          <School className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {t.collegeName}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Approved by AICTE New Delhi · Affiliated to Uttarakhand Board of Technical Education Roorkee (UBTER)
        </p>
      </footer>
    </div>
  );
};
