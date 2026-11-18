// ===================================================================================================
// Top bar: college name, language, theme, bell, account menu, role switch for the admin.
// ===================================================================================================
import React, { useState, useRef, useEffect } from 'react';
import { useCollege } from '../../context/CollegeContext';
import { useSeesSample } from '../../hooks/useSeesSample';
import { Role } from '../../types';
import {
  GraduationCap,
  ShieldCheck,
  UserCheck,
  QrCode,
  ChevronDown,
  RotateCcw,
  Sparkles,
  Database,
  LayoutGrid,
  Camera,
  LogOut,
  Megaphone,
  Sun,
  Moon,
  Globe,
  Check,
  FileSpreadsheet,
  Smartphone,
} from 'lucide-react';
import { MySQLSchemaViewerModal } from '../common/MySQLSchemaViewerModal';
import { AIStudyAssistantModal } from '../common/AIStudyAssistantModal';
import { AISubjectSolverModal } from '../common/AISubjectSolverModal';
import { UserAvatar } from '../common/UserAvatar';
import { PhotoUploadModal } from '../common/PhotoUploadModal';
import { PrivacySecurityModal } from '../auth/PrivacySecurityModal';
import { CollegeNewsSection } from '../common/CollegeNewsSection';
import { NotificationBell } from '../common/NotificationBell';
import { SupportedLanguage } from '../../utils/translations';

// Data shape: navbar props.
interface NavbarProps {
  onOpenQRScanner: () => void;
  onBackToLanding?: () => void;
  onLogout?: () => void;
  isMobilePreviewMode?: boolean;
  onToggleMobilePreview?: () => void;
}

// Screen part: navbar.
export const Navbar: React.FC<NavbarProps> = ({
  onOpenQRScanner,
  onBackToLanding,
  onLogout,
  isMobilePreviewMode = false,
  onToggleMobilePreview,
}) => {
  const {
    currentUser,
    switchRole,
    users,
    notices,
    resetDatabase,
    language,
    setLanguage,
    t,
    theme,
    toggleTheme,
    isAdminSessionActive,
    returnToAdminPortal,
  } = useCollege();
  const showSample = useSeesSample();   // database (MySQL) button only for admin / CSE HOD

  // Is the 'role dropdown' shown on screen? (true / false)
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  // Is the 'lang dropdown' shown on screen? (true / false)
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  // Is the 'notice pop-up' shown on screen? (true / false)
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  // Is the 'reset confirm' shown on screen? (true / false)
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  // Is the 'my sql pop-up' shown on screen? (true / false)
  const [showMySQLModal, setShowMySQLModal] = useState(false);
  // Is the 'ai pop-up' shown on screen? (true / false)
  const [showAIModal, setShowAIModal] = useState(false);
  // Is the 'ai solver pop-up' shown on screen? (true / false)
  const [showAISolverModal, setShowAISolverModal] = useState(false);
  // Is the 'photo pop-up' shown on screen? (true / false)
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  // Is the 'privacy pop-up' shown on screen? (true / false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const langRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  // Runs once when this part of the screen opens.
  useEffect(() => {
    // Runs when the user does this on screen: outside.
    const handleOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setShowLangDropdown(false);
      }
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setShowRoleDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const students = users.filter((u) => u.role === 'student');
  const faculties = users.filter((u) => u.role === 'faculty');

  // Returns the role badge.
  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-900 text-white flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-blue-400" /> {t.adminRole}
          </span>
        );
      case 'faculty':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-amber-600" /> {t.facultyRole}
          </span>
        );
      case 'student':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
            <GraduationCap className="w-3 h-3 text-emerald-600" /> {t.studentRole}
          </span>
        );
      case 'parent':
        return (
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
            Parent
          </span>
        );
    }
  };

  const languagesList: { code: SupportedLanguage; label: string; nativeName: string }[] = [
    { code: 'en', label: 'English', nativeName: 'English (EN)' },
    { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी (HI)' },
  ];   // only English and Hindi are offered (Urdu removed on request)

  return (
    <>
      <header id="main-header" className="sticky top-0 z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800 shadow-xs transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Crest & Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500 flex items-center justify-center text-white font-black text-xs sm:text-sm tracking-tight ring-2 ring-amber-400/70 shrink-0 shadow-md">
                UGIP
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="sm:hidden font-extrabold text-base text-slate-900 dark:text-white tracking-tight leading-tight">UGIP Portal</h1>
                  <h1 className="hidden sm:block font-extrabold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight leading-tight">
                    {language === 'hi'
                      ? 'उत्तराखंड राजकीय पॉलिटेक्निक संस्थान'
                      : language === 'ur'
                      ? 'UGIP'
                      : 'UTTARAKHAND GOVERNMENT INSTITUTE OF POLYTECHNIC'}
                  </h1>
                  <span className="hidden md:inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    AICTE · UBTER Code 090
                  </span>
                </div>
                <p className="hidden sm:block text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-400 uppercase tracking-widest font-semibold truncate max-w-[200px] sm:max-w-none">
                  {t.smartPortalSystem}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
              {/* Laptop Phone View Mode Toggle Button */}
              {onToggleMobilePreview && (
                <button
                  id="navbar-phone-preview-btn"
                  onClick={onToggleMobilePreview}
                  className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border shadow-2xs ${
                    isMobilePreviewMode
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 ring-2 ring-emerald-300 dark:ring-emerald-800'
                      : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                  }`}
                  title={isMobilePreviewMode ? 'Exit Phone View / Back to Laptop View' : 'Preview Phone View (390px Mobile Viewport)'}
                >
                  <Smartphone className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  <span className="hidden sm:inline font-extrabold">
                    {isMobilePreviewMode ? '📱 Exit Phone View' : '📱 Phone View'}
                  </span>
                </button>
              )}

              {/* Back to Gateway */}
              {onBackToLanding && (
                <button
                  id="navbar-gateway-btn"
                  onClick={onBackToLanding}
                  className="hidden sm:flex px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
                  title="Return to Portal Gateway"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                  <span className="hidden sm:inline">Gateway</span>
                </button>
              )}

              {/* Language Selector */}
              <div className="relative" ref={langRef}>
                <button
                  id="navbar-lang-btn"
                  onClick={() => setShowLangDropdown(!showLangDropdown)}
                  className="p-2 sm:px-2.5 sm:py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                  title="Change Language"
                >
                  <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="hidden sm:inline uppercase text-[11px] font-bold">{language}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {showLangDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1.5 z-50 animate-in fade-in duration-100">
                    <span className="block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Select Language / भाषा
                    </span>
                    {languagesList.map((langItem) => (
                      <button
                        key={langItem.code}
                        onClick={() => {
                          setLanguage(langItem.code);
                          setShowLangDropdown(false);
                        }}
                        className={`w-full px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          language === langItem.code
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>{langItem.nativeName}</span>
                        {language === langItem.code && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dark Mode Toggle */}
              <button
                id="navbar-theme-btn"
                onClick={toggleTheme}
                className="p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>

              {/* Notification Bell */}
              <NotificationBell />

              {/* MySQL Studio: only admin and the CSE HOD */}
              {showSample && (
              <button
                id="navbar-mysql-btn"
                onClick={() => setShowMySQLModal(true)}
                className="hidden lg:flex px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 text-blue-400 rounded-lg text-xs font-bold items-center gap-1.5 transition-all cursor-pointer border border-slate-800"
                title="View Encrypted MySQL Database"
              >
                <Database className="w-4 h-4 text-blue-400" />
                <span>MySQL</span>
              </button>
              )}

              {/* AI Subject Solver - Only available to students as academic helper */}
              {currentUser.role === 'student' && (
                <button
                  id="navbar-ai-solver-btn"
                  onClick={() => setShowAISolverModal(true)}
                  className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-gradient-to-r from-amber-50 to-indigo-50 hover:from-amber-100 dark:from-amber-950/30 dark:to-indigo-950/40 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  title="AI Question Solver (Academic Helper)"
                >
                  <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span className="hidden sm:inline">AI Solver</span>
                </button>
              )}

              {/* Quick QR Attendance Punch (Student) */}
              {currentUser.role === 'student' && (
                <button
                  id="navbar-qr-punch-btn"
                  onClick={onOpenQRScanner}
                  className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span className="hidden sm:inline">{t.punchQR}</span>
                  <span className="sm:hidden">QR</span>
                </button>
              )}

              {/* News Bell */}
              <button
                id="navbar-notices-btn"
                onClick={() => setShowNoticeModal(true)}
                className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                title="College Notices"
              >
                <Megaphone className="w-4 h-4 text-amber-500" />
                {notices.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900"></span>
                )}
              </button>

              {/* User Persona Switcher */}
              <div className="relative" ref={roleRef}>
                <button
                  id="role-switcher-dropdown-btn"
                  onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-all cursor-pointer"
                >
                  <UserAvatar
                    name={currentUser.name}
                    avatar={currentUser.avatar}
                    role={currentUser.role}
                    size="sm"
                  />
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-bold text-slate-900 dark:text-white leading-none truncate max-w-[110px]">
                      {currentUser.name}
                    </p>
                    <div className="mt-1">{getRoleBadge(currentUser.role)}</div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {showRoleDropdown && (
                  <div
                    id="role-switcher-dropdown-menu"
                    className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in zoom-in-95"
                  >
                    <div className="px-2 py-1.5 border-b border-slate-100 dark:border-slate-800 mb-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {isAdminSessionActive ? 'Admin Authority Switcher' : 'My User Account'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {isAdminSessionActive ? 'Switch active view or return to Admin' : currentUser.email || 'UGIP'}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setShowPhotoModal(true);
                        setShowRoleDropdown(false);
                      }}
                      className="w-full mb-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-800 dark:text-blue-300 text-xs font-semibold flex items-center justify-between transition-colors border border-blue-200 dark:border-blue-800 cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-blue-600" />
                        <span>Upload / Change Photo</span>
                      </span>
                      <span className="text-[10px] bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 px-1.5 py-0.5 rounded font-bold">
                        {currentUser.avatar ? 'Edit' : 'Upload'}
                      </span>
                    </button>

                    {/* ONLY Admin can switch users: "or switch user shirf admin kr sakta hai baki koi nahi ek bar wo admin penel se logout ho jaye fir koi bhi nahi" */}
                    {isAdminSessionActive && (
                      <>
                        {/* Quick Return to Admin if currently in another role */}
                        {currentUser.role !== 'admin' && (
                          <div className="mb-2 p-2 bg-amber-500/20 border border-amber-500/40 rounded-xl">
                            <button
                              onClick={() => {
                                returnToAdminPortal();
                                setShowRoleDropdown(false);
                              }}
                              className="w-full py-1.5 px-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                            >
                              <ShieldCheck className="w-4 h-4 text-slate-950" />
                              <span>↩ Back to Admin Login / Panel</span>
                            </button>
                          </div>
                        )}

                        {/* Admin Switch */}
                        <div className="mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
                            {t.adminRole}
                          </span>
                          <button
                            onClick={() => {
                              switchRole('admin');
                              setShowRoleDropdown(false);
                            }}
                            className={`w-full mt-1 p-2 rounded-lg text-left text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                              currentUser.role === 'admin'
                                ? 'bg-slate-900 text-white font-bold'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            <UserAvatar name="Principal / Admin" role="admin" size="sm" />
                            <div className="flex-1">
                              <p className="font-semibold">Principal / Admin</p>
                              <p className="text-[10px] text-slate-400">Chief Administrator</p>
                            </div>
                          </button>
                        </div>

                        {/* Faculty Switch */}
                        <div className="mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
                            {t.facultyRole} ({faculties.length})
                          </span>
                          <div className="space-y-1 mt-1 max-h-36 overflow-y-auto pr-1">
                            {faculties.map((fac) => (
                              <button
                                key={fac.id}
                                onClick={() => {
                                  switchRole('faculty', fac.id);
                                  setShowRoleDropdown(false);
                                }}
                                className={`w-full p-2 rounded-lg text-left text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                                  currentUser.id === fac.id
                                    ? 'bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-200 font-bold border border-amber-200 dark:border-amber-800'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                                }`}
                              >
                                <UserAvatar name={fac.name} avatar={fac.avatar} role="faculty" size="sm" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold truncate">{fac.name}</p>
                                  <p className="text-[10px] text-slate-400 truncate">{fac.designation}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Student Switch */}
                        <div className="mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
                            {t.studentRole} ({students.length})
                          </span>
                          <div className="space-y-1 mt-1 max-h-36 overflow-y-auto pr-1">
                            {students.slice(0, 8).map((stu) => (
                              <button
                                key={stu.id}
                                onClick={() => {
                                  switchRole('student', stu.id);
                                  setShowRoleDropdown(false);
                                }}
                                className={`w-full p-2 rounded-lg text-left text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                                  currentUser.id === stu.id
                                    ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 font-bold border border-emerald-200 dark:border-emerald-800'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                                }`}
                              >
                                <UserAvatar name={stu.name} avatar={stu.avatar} role="student" size="sm" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold truncate">{stu.name}</p>
                                  <p className="text-[10px] text-slate-400 truncate">Roll: {stu.rollNo} · {stu.branch}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Footer options */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2 space-y-1">
                      <button
                        onClick={() => {
                          setShowRoleDropdown(false);
                          setShowPrivacyModal(true);
                        }}
                        className="w-full py-1.5 px-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                      >
                        <span>Privacy &amp; Security</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowRoleDropdown(false);
                          if (onLogout) onLogout();
                          else if (onBackToLanding) onBackToLanding();
                        }}
                        className="w-full py-1.5 px-2 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-rose-200 dark:border-rose-900"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-600" />
                        <span>{t.logout}</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowResetConfirm(true);
                          setShowRoleDropdown(false);
                        }}
                        className="w-full py-1.5 px-2 text-[11px] font-semibold text-slate-500 hover:text-red-600 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset Default Database
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Modals */}
      <MySQLSchemaViewerModal isOpen={showMySQLModal} onClose={() => setShowMySQLModal(false)} />
      <AIStudyAssistantModal isOpen={showAIModal} onClose={() => setShowAIModal(false)} />
      <AISubjectSolverModal isOpen={showAISolverModal} onClose={() => setShowAISolverModal(false)} />

      {showNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <CollegeNewsSection
            isModal={true}
            onClose={() => setShowNoticeModal(false)}
            allowPublish={currentUser.role === 'admin' || currentUser.role === 'faculty'}
          />
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center">
            <RotateCcw className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">Reset Database?</h3>
            <p className="text-xs text-slate-500 mb-5">
              This will restore all default courses, faculty, students with saved passwords, and sessional test records.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetDatabase();
                  setShowResetConfirm(false);
                }}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md cursor-pointer"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      <PhotoUploadModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
      />
      <PrivacySecurityModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
    </>
  );
};
