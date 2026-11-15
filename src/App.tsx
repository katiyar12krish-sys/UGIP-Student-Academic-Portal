// ===================================================================================================
// Top-level screen switcher. Shows the landing page or the dashboard of the signed-in role
// (admin / faculty / student / parent), the sign-in steps, the chat button, toasts and the Step 18
// <FeedbackHost/> that draws messages and "are you sure?" dialogs for the whole app.
// ===================================================================================================
import React, { useState, useEffect } from 'react';
import { CollegeProvider, useCollege } from './context/CollegeContext';
import { signInIncomplete } from './services/authApi';
import { Navbar } from './components/layout/Navbar';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { FacultyDashboard } from './components/faculty/FacultyDashboard';
import { ParentDashboard } from './components/parent/ParentDashboard';
import { StudentDashboard } from './components/student/StudentDashboard';
import { LoginPage } from './components/auth/LoginPage';   // Step 19: the first screen (replaces the old landing cards)
import { PortalAuthModal } from './components/auth/PortalAuthModal';
import { QRScannerModal } from './components/common/QRScannerModal';
import { ToastContainer } from './components/common/ToastContainer';
import { FeedbackHost } from './components/common/ui/feedback';   // Step 18: nicer messages + confirm dialogs for the whole app
import { ChatLauncher } from './components/chat/ChatLauncher';
import { Role } from './types';
import { ShieldCheck, UserCheck, GraduationCap, School, MapPin, LayoutGrid, Calendar, X } from 'lucide-react';

// Main portal view.
const MainPortalView: React.FC = () => {
  const {
    currentUser,
    switchRole,
    t,
    isAdminSessionActive,
    setIsAdminSessionActive,
    returnToAdminPortal,
    authUser,
    authReady,
    logout,
  } = useCollege();
  // View mode (kept in screen state)
  const [viewMode, setViewMode] = useState<'landing' | 'portal'>('landing');
  // Is it qr scanner open? (true / false)
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  // Is it admin authenticated? (true / false)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  // Is it faculty authenticated? (true / false)
  const [isFacultyAuthenticated, setIsFacultyAuthenticated] = useState(false);

  // Pending role (kept in screen state)
  const [pendingRole, setPendingRole] = useState<Role | null>(null);
  // Is it auth modal open? (true / false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  // Is the 'admin return prompt' shown on screen? (true / false)
  const [showAdminReturnPrompt, setShowAdminReturnPrompt] = useState(true);

  // Periodic reminder popup when admin has switched to faculty or student
  useEffect(() => {
    if (isAdminSessionActive && currentUser.role !== 'admin') {
      setShowAdminReturnPrompt(true);
      const interval = setInterval(() => {
        setShowAdminReturnPrompt(true);
      }, 45000);
      return () => clearInterval(interval);
    } else {
      setShowAdminReturnPrompt(false);
    }
  }, [isAdminSessionActive, currentUser.role]);

  const isAuthed = !!authUser && !signInIncomplete(authUser);
  // A student's/faculty's own profile must be loaded before we draw their dashboard
  const profileReady = isAuthed && (authUser!.role === 'admin' || currentUser.id === authUser!.id);

  // Returning visitor with a valid server session: go straight into the portal
  const restored = React.useRef(false);
  // Runs automatically whenever these change: authReady, isAuthed.
  useEffect(() => {
    if (authReady && isAuthed && !restored.current) {
      restored.current = true;
      setViewMode('portal');
    }
  }, [authReady, isAuthed]);

  // Session ended (logout, expiry, password change elsewhere): back to the landing page
  useEffect(() => {
    if (authReady && !isAuthed) setViewMode('landing');
  }, [authReady, isAuthed]);

  // Runs when the user does this on screen: logout.
  const handleLogout = async () => {
    await logout();
    restored.current = false;
    setIsAdminAuthenticated(false);
    setIsFacultyAuthenticated(false);
    setIsAdminSessionActive(false);
    setViewMode('landing');
  };

  // Runs when the user does this on screen: select role from landing.
  const handleSelectRoleFromLanding = (role: Role) => {
    if (role === 'admin') {
      setIsAdminAuthenticated(true);
      setIsAdminSessionActive(true);
    } else {
      setIsAdminSessionActive(false);
      if (role === 'faculty') {
        setIsFacultyAuthenticated(true);
      }
    }
    setViewMode('portal');
  };

  // Runs when the user does this on screen: role switch request.
  const handleRoleSwitchRequest = (targetRole: Role) => {
    // ONLY allowed if admin session is active
    if (!isAdminSessionActive) return;

    if (targetRole === currentUser.role && viewMode === 'portal') return;

    if (targetRole === 'admin') {
      returnToAdminPortal();
      setViewMode('portal');
      return;
    }

    switchRole(targetRole);
    setViewMode('portal');
  };

  // Runs when the user does this on screen: auth success.
  const handleAuthSuccess = () => {
    if (pendingRole === 'admin') {
      setIsAdminAuthenticated(true);
      setIsAdminSessionActive(true);
    } else if (pendingRole === 'faculty') {
      setIsFacultyAuthenticated(true);
    }
    setViewMode('portal');
    setIsAuthModalOpen(false);
  };

  if (!authReady) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Loading…</div>;
  }

  if (viewMode === 'landing' || !isAuthed) {
    return (
      <>
        {/* Step 19: one login page (Admin / Faculty / Student tabs) is the first screen */}
        <LoginPage onSignedIn={handleSelectRoleFromLanding} />
        <ToastContainer />
        <FeedbackHost />
      </>
    );
  }

  return (
    <div className="min-h-screen ugip-app-bg text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        onOpenQRScanner={() => setIsQRScannerOpen(true)}
        onBackToLanding={() => setViewMode('landing')}
        onLogout={handleLogout}
      />

      {/* Persistent Admin Impersonation Banner & Reminder */}
      {isAdminSessionActive && currentUser.role !== 'admin' && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white px-4 py-2.5 text-xs shadow-md flex flex-wrap items-center justify-between gap-2 sticky top-0 z-50 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></span>
            <span>
              👑 Administrator Session Active — You are viewing as <strong>{currentUser.name}</strong> ({currentUser.role.toUpperCase()})
            </span>
          </div>
          <button
            onClick={() => {
              returnToAdminPortal();
              setViewMode('portal');
            }}
            className="px-3.5 py-1.5 bg-white text-slate-900 hover:bg-slate-100 font-extrabold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer text-xs"
          >
            <span>↩ Back to Admin Login / Admin Panel</span>
          </button>
        </div>
      )}

      {/* Floating Popup Reminder: "or jab admin switch user krega to bar bar pop pop ayega back to admin login krke" */}
      {isAdminSessionActive && currentUser.role !== 'admin' && showAdminReturnPrompt && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-slate-900 border-2 border-amber-500 rounded-2xl p-4 shadow-2xl text-white animate-in slide-in-from-bottom-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-xs text-amber-300">Admin Mode Active</h4>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                You are currently browsing the portal in switched role mode ({currentUser.name}). Click below to return to Admin controls.
              </p>
            </div>
            <button
              onClick={() => setShowAdminReturnPrompt(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => {
                returnToAdminPortal();
                setViewMode('portal');
              }}
              className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>↩ Back to Admin Login</span>
            </button>
          </div>
        </div>
      )}

      {/* Institutional Status & Role Switcher Subheader */}
      <section aria-label="Portal Navigation" className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-16 sm:top-20 z-30 shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={() => setViewMode('landing')}
              className="font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{t.portalHome}</span>
            </button>
            <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-700"></div>
            <span className="text-slate-500 dark:text-slate-400 hidden sm:inline flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              {t.academicSession}
            </span>
            <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:inline"></div>
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-emerald-100 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {t.portalOperational}
            </div>
          </div>

          {/* Switch User only accessible if Admin Session is Active */}
          {isAdminSessionActive ? (
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1 hidden md:inline">
                Admin Switch:
              </span>
              <button
                id="switch-to-admin-btn"
                onClick={() => handleRoleSwitchRequest('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentUser.role === 'admin'
                    ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" /> {t.adminRole}
              </button>
              <button
                id="switch-to-faculty-btn"
                onClick={() => handleRoleSwitchRequest('faculty')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentUser.role === 'faculty'
                    ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" /> {t.facultyRole}
              </button>
              <button
                id="switch-to-student-btn"
                onClick={() => handleRoleSwitchRequest('student')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentUser.role === 'student'
                    ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" /> {t.studentRole}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Logged in as:
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
                {currentUser.role === 'faculty' && <UserCheck className="w-3.5 h-3.5 text-amber-500" />}
                {currentUser.role === 'student' && <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />}
                <span>{currentUser.name}</span>
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 lg:p-6 space-y-6">
        {!profileReady && <div className="py-20 text-center text-sm text-slate-500">Loading your profile…</div>}
        {profileReady && currentUser.role === 'admin' && <AdminDashboard onLogout={handleLogout} />}
        {profileReady && currentUser.role === 'faculty' && <FacultyDashboard onLogout={handleLogout} />}
        {profileReady && currentUser.role === 'parent' && <ParentDashboard onLogout={handleLogout} />}
        {profileReady && currentUser.role === 'student' && (
          <StudentDashboard onOpenQRScanner={() => setIsQRScannerOpen(true)} onLogout={handleLogout} />
        )}
      </main>

      {/* Global QR Scanner Modal */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
      />

      {/* Portal Auth Modal */}
      {pendingRole && (
        <PortalAuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          targetRole={pendingRole}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* Real-Time Toast Notifications */}
      <ToastContainer />
      <FeedbackHost />

      {/* Step 13: chat button (parents, students, teachers, admin) */}
      <ChatLauncher />

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 px-4 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2 mt-auto">
        <div className="flex items-center justify-center gap-2">
          <School className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {t.collegeName}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
          <MapPin className="w-3 h-3" /> Approved by AICTE New Delhi · Affiliated with Uttarakhand Board of Technical Education Roorkee (UBTER)
        </p>
        <p className="text-[10px] text-slate-400">
          Academic Management System · {t.academicSession}
        </p>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <CollegeProvider>
      <MainPortalView />
    </CollegeProvider>
  );
}
