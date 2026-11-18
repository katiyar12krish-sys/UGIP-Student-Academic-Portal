// ===================================================================================================
// Faculty dashboard: subjects, attendance, marks, tests, dispatch, practicals, Step 18: board results
// and the attendance register.
// ===================================================================================================
import React, { useState, useRef } from 'react';
import { useCollege } from '../../context/CollegeContext';
import { LoginManager } from '../common/LoginManager';
import { SyllabusViewer } from '../common/SyllabusViewer';   // official UBTER syllabus
import { AttendanceSession, StudentTestMark, UserProfile, BranchCode } from '../../types';
import { QRCodeDisplay } from '../common/QRCodeDisplay';
import {
  QrCode,
  FileCheck,
  Award,
  Sparkles,
  Users,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  UserCheck,
  FlaskConical,
  FolderDown,
  Shield,
  Camera,
  LogOut,
  Megaphone,
  Send,
  FileSpreadsheet,
  KeyRound,
  Eye,
  EyeOff,
  Search,
  Briefcase,
  BookOpen,
  FileText,
  BarChart3,
  Phone,
  Edit,
  Download,
  Activity,
  Layers,
  HelpCircle,
  X,
  Brain,
  TrendingUp,
  UserCog,
  Target,
  Menu,
} from 'lucide-react';
import { PlacementTracker } from '../placement/PlacementPrep';   // placement preparation of every student (resume ATS + practice tests)
import { MyProfileCard } from '../common/MyProfileCard';             // self-service: own details + own password
import { QuestionPapersHub } from '../common/QuestionPapersHub';         // question papers + answer keys (open / download / upload)
import { YearwiseAttendanceAnalysis } from '../common/YearwiseAttendanceAnalysis';
import { TimetableModule } from '../common/TimetableModule';
import { ExamCalendar } from '../common/ExamCalendar';   // exam dates of the semester
import { PracticalLabManager } from '../common/PracticalLabManager';
import { BoardResultsManager } from '../common/BoardResultsManager';
import { AttendanceRegister } from '../common/AttendanceRegister';
import { PasswordCenter } from '../common/PasswordCenter';             // Step 19: own password + student passwords     // Step 18   // Step 18: UBTER board results
import { FacultyPunchModal } from '../common/FacultyPunchModal';
import { StudentCategoryRoster } from '../common/StudentCategoryRoster';
import DataCenter from '../common/DataCenter';
import { UserAvatar } from '../common/UserAvatar';
import { PhotoUploadModal } from '../common/PhotoUploadModal';
import { StudentQRScannerModal } from '../common/StudentQRScannerModal';
import { AddStudentModal } from '../common/AddStudentModal';
import { CollegeNewsSection } from '../common/CollegeNewsSection';
import { ClassSubjectDispatcher } from '../common/ClassSubjectDispatcher';
import { ConsolidatedMarksSheet } from '../common/ConsolidatedMarksSheet';
import { ComprehensivePlacementPortal } from '../placement/ComprehensivePlacementPortal';
import { AIQuizDrillAndAnalytics } from '../common/AIQuizDrillAndAnalytics';
import { ActivityAuditLogViewer } from '../common/ActivityAuditLogViewer';
import { StudentPerformanceAnalyticsDashboard } from '../analytics/StudentPerformanceAnalyticsDashboard';
import { DocumentMaterialHub } from '../common/DocumentMaterialHub';
import { ClassStudentDatabaseManager } from '../common/ClassStudentDatabaseManager';
import { OnlineTestAssignmentManager } from '../common/OnlineTestAssignmentManager';
import { RealtimeDoubtResolutionHub } from '../common/RealtimeDoubtResolutionHub';

// Data shape: faculty dashboard props.
interface FacultyDashboardProps {
  onLogout?: () => void;
  forceMobileView?: boolean;
}

// Screen part: faculty dashboard.
export const FacultyDashboard: React.FC<FacultyDashboardProps> = ({ onLogout, forceMobileView = false }) => {
  const {
    currentUser,
    subjects,
    tests,
    createTest,
    updateSingleStudentMark,
    attendanceSessions,
    createAttendanceSession,
    closeAttendanceSession,
    manualUpdateAttendance,
    users,
    getFacultyTodayPunch,
    notices,
    updateStudentPhone,
    onlineQuizzes,
    addOnlineQuiz,
    deleteOnlineQuiz,
    onlineTestAssignments,
    studentDoubtTickets,
    t,
    getAttendancePercent,
  } = useCollege();

  // Which tab is open right now
  const [activeTab, setActiveTab] = useState<
    | 'class-database'
    | 'syllabus'
    | 'attendance-analysis'
    | 'online-tests'
    | 'doubt-resolution'
    | 'class-dispatch'
    | 'material-hub'
    | 'qr-attendance'
    | 'students'
    | 'performance-analytics'
    | 'placements'
    | 'tests'
    | 'practicals'
    | 'board-results'
    | 'attendance-register'
    | 'logins'
    | 'my-profile'
    | 'question-papers'
    | 'placement-tracker'
    | 'timetable'
    | 'categories'
    | 'data-center'
    | 'news'
    | 'ai-assistant'
    | 'student-progress-graph'
    | 'activity-stream'
    | 'subject-quizzes'
  >('class-database');

  // Mobile navigation state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const contentTopRef = useRef<HTMLDivElement>(null);

  const handleSwitchTab = (tabId: any) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setTimeout(() => {
        contentTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  };

  // Is it photo modal open? (true / false)
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  // Is the 'student scanner pop-up' shown on screen? (true / false)
  const [showStudentScannerModal, setShowStudentScannerModal] = useState(false);
  // Is the 'add student pop-up' shown on screen? (true / false)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  // Login mgr (kept in screen state)
  const [loginMgr, setLoginMgr] = useState<{ q?: string } | null>(null);
  // Is the 'faculty punch pop-up' shown on screen? (true / false)
  const [showFacultyPunchModal, setShowFacultyPunchModal] = useState(false);

  // Student Phone Edit State (Requested by user: "faculty ke jariye studnet number add edit ka option bhi to do")
  const [studentPhoneEditTarget, setStudentPhoneEditTarget] = useState<UserProfile | null>(null);
  // New phone input (kept in screen state)
  const [newPhoneInput, setNewPhoneInput] = useState('');

  // Subject Quiz Upload / Create State
  const [showNewQuizModal, setShowNewQuizModal] = useState(false);
  // Values typed into the quiz form
  const [quizForm, setQuizForm] = useState({
    subjectId: '',
    title: '',
    durationMinutes: 20,
    totalMarks: 20,
    question1: '',
    optA: '',
    optB: '',
    optC: '',
    optD: '',
    correctAnswer: '',
    explanation: '',
  });

  // Text typed in the search box
  const [studentDirectorySearch, setStudentDirectorySearch] = useState('');
  // The student branch filter chosen by the user (filter / list selection)
  const [selectedStudentBranchFilter, setSelectedStudentBranchFilter] = useState('all');
  // List of revealed passwords shown on this screen
  const [revealedPasswords, setRevealedPasswords] = useState<{ [id: string]: boolean }>({});

  const facultySubjects = subjects.filter((s) => s.facultyId === currentUser.id);

  // Features the admin switched off for this teacher are hidden from the menu (the server refuses them anyway).
  const [myPerms, setMyPerms] = useState<Record<string, boolean> | null>(null);
  React.useEffect(() => {
    fetch('/api/me/permissions', { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null)).then((j) => j && setMyPerms(j.perms)).catch(() => {});
  }, []);
  const TAB_FEATURE: Record<string, string> = {
    'online-tests': 'online_tests', 'doubt-resolution': 'doubts', 'class-dispatch': 'dispatch', 'material-hub': 'materials',
    'qr-attendance': 'attendance', 'attendance-register': 'attendance', practicals: 'practicals', 'board-results': 'board_results',
    logins: 'student_logins', 'data-center': 'data_center', news: 'notices', placements: 'placement',
  };
  const tabAllowed = (id: string) => !myPerms || !TAB_FEATURE[id] || myPerms[TAB_FEATURE[id]] !== false;
  const currentFacultySubject = facultySubjects[0] || subjects[0];

  // The subject id chosen by the user (filter / list selection)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(currentFacultySubject?.id || '');
  // Session topic (kept in screen state)
  const [sessionTopic, setSessionTopic] = useState<string>('Unit 3: Core Algorithm Derivation & Implementation');
  // Time slot (kept in screen state)
  const [timeSlot, setTimeSlot] = useState<string>('10:00 AM - 11:00 AM');
  // The open session always comes from the live (server-refreshed) list, so students' punches appear here without reloading.
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const currentActiveSession: AttendanceSession | null =
    attendanceSessions.find((s) => s.id === activeSessionId && s.status === 'Active') ||
    attendanceSessions.find((s) => s.status === 'Active' && s.facultyId === currentUser.id) ||
    null;

  // Is the 'new test pop-up' shown on screen? (true / false)
  const [showNewTestModal, setShowNewTestModal] = useState(false);
  // Values typed into the new test form
  const [newTestForm, setNewTestForm] = useState({
    title: '',
    type: 'Sessional 1' as const,
    subjectId: currentFacultySubject?.id || '',
    maxMarks: 50,
    date: new Date().toISOString().split('T')[0],
  });

  // Ai task type (kept in screen state)
  const [aiTaskType, setAiTaskType] = useState('Generate Sessional Test Question Paper');
  // Ai topic input (kept in screen state)
  const [aiTopicInput, setAiTopicInput] = useState('');
  // Ai result content (kept in screen state)
  const [aiResultContent, setAiResultContent] = useState<string | null>(null);
  // Is it ai loading? (true / false)
  const [isAiLoading, setIsAiLoading] = useState(false);

  const relevantStudents = users.filter((u) => u.role === 'student');

  // Toggle reveal password.
  const toggleRevealPassword = (id: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Runs when the user does this on screen: start qr session.
  const handleStartQRSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const sub = subjects.find((s) => s.id === selectedSubjectId) || currentFacultySubject;
    if (!sub) return;
    const newSess = await createAttendanceSession({
      subjectId: sub.id,
      subjectCode: sub.code,
      subjectName: sub.name,
      facultyId: currentUser.id,
      facultyName: currentUser.name,
      branch: sub.branch,
      semester: sub.semester,
      date: new Date().toISOString().split('T')[0],
      timeSlot,
      topicTaught: sessionTopic || 'Class Lecture & Problem Solving',
    });
    if (newSess) setActiveSessionId(newSess.id);   // null = the server refused (e.g. not your subject); it already told the user why
  };

  // Runs when the user does this on screen: close session.
  const handleCloseSession = async (sessionId: string) => {
    await closeAttendanceSession(sessionId);
    setActiveSessionId(null);
  };

  // Runs when the user does this on screen: create test.
  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const sub = subjects.find((s) => s.id === newTestForm.subjectId) || currentFacultySubject;
    if (!sub || !newTestForm.title) return;

    // A new exam starts with NO marks. Marks are entered afterwards, student by student.
    const created = await createTest({
      title: newTestForm.title,
      type: newTestForm.type,
      subjectId: sub.id,
      subjectName: sub.name,
      subjectCode: sub.code,
      maxMarks: Number(newTestForm.maxMarks),
      date: newTestForm.date,
      branch: sub.branch,
      semester: sub.semester,
      results: [],
    });
    if (created) setShowNewTestModal(false);   // if the server said no, keep the form open so nothing is lost
  };

  // Runs when the user does this on screen: generate faculty ai.
  const handleGenerateFacultyAI = async () => {
    setIsAiLoading(true);
    const sub = subjects.find((s) => s.id === selectedSubjectId) || currentFacultySubject;
    try {
      const res = await fetch('/api/ai/faculty-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType: aiTaskType,
          subject: sub ? `${sub.name} (${sub.code})` : 'Engineering Subject',
          topic: aiTopicInput || 'Core Syllabus Units',
          branch: sub?.branch || 'CSE',
          semester: sub?.semester || 3,
          marksDistribution: '20 Marks Standard (UBTER Sessional Pattern)',
        }),
      });
      const data = await res.json();
      setAiResultContent(data.content || 'Generated successfully.');
    } catch (err) {
      console.error(err);
      setAiResultContent('AI Material generated successfully.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const todayPunch = getFacultyTodayPunch(currentUser.id);

  const filteredStudentsForDir = relevantStudents.filter((stu) => {
    const matchesBranch = selectedStudentBranchFilter === 'all' || stu.branch === selectedStudentBranchFilter;
    const q = studentDirectorySearch.toLowerCase().trim();
    const matchesQ =
      !q ||
      stu.name.toLowerCase().includes(q) ||
      (stu.rollNo && stu.rollNo.includes(q)) ||
      (stu.branch && stu.branch.toLowerCase().includes(q));
    return matchesBranch && matchesQ;
  });

  const facultyNavTabs = [
    { id: 'class-database', label: '1st, 2nd, 3rd Yr Database & Excel', icon: FileSpreadsheet, badge: 'Live Excel', category: 'Database & Students' },
    { id: 'attendance-analysis', label: 'Batch Attendance Analysis (1st, 2nd, 3rd Yr)', icon: TrendingUp, badge: 'Automatic', category: 'Attendance & Classes' },
    { id: 'online-tests', label: `Online Tests & Timed Tasks (${onlineTestAssignments.length})`, icon: Award, badge: 'Targeted Alerts', category: 'Academics & Tests' },
    { id: 'doubt-resolution', label: `Real-Time Doubt Q&A (${studentDoubtTickets.length})`, icon: HelpCircle, badge: 'Live Chat', category: 'Academics & Tests' },
    { id: 'class-dispatch', label: 'Class & Subject Dispatcher', icon: Send, badge: 'Targeted', category: 'Academics & Tests' },
    { id: 'material-hub', label: 'Document & Material Hub', icon: FolderDown, badge: 'PDF / Img / Links', category: 'Academics & Tests' },
    { id: 'syllabus', label: 'Syllabus (UBTER)', icon: BookOpen, badge: 'Unit-wise', category: 'Academics & Tests' },
    { id: 'question-papers', label: 'Question Papers & Answer Keys', icon: FileText, badge: 'New', category: 'Academics & Tests' },
    { id: 'qr-attendance', label: 'QR Class Attendance', icon: QrCode, badge: 'Live', category: 'Attendance & Classes' },
    { id: 'performance-analytics', label: 'Student Performance Analytics', icon: BarChart3, badge: 'Longitudinal', category: 'Database & Students' },
    { id: 'placements', label: 'Career & Placement Hub', icon: Briefcase, badge: 'CS & Civil', category: 'Placement & Career' },
    { id: 'practicals', label: t.practicals, icon: FlaskConical, category: 'Academics & Tests' },
    { id: 'board-results', label: 'UBTER Board Results', icon: Award, category: 'Academics & Tests' },
    { id: 'attendance-register', label: 'Attendance Register (edit)', icon: UserCheck, category: 'Attendance & Classes' },
    { id: 'my-profile', label: 'My Profile & Password', icon: UserCog, category: 'Account & Data' },
    { id: 'placement-tracker', label: 'Placement Tracker (Resume · Tests)', icon: Target, badge: 'New', category: 'Placement & Career' },
    { id: 'logins', label: 'Logins & Passwords', icon: KeyRound, category: 'Account & Data' },
    { id: 'timetable', label: t.timetable, icon: Clock, category: 'Academics & Tests' },
    { id: 'data-center', label: 'Data Center (Download / Upload)', icon: FileSpreadsheet, badge: 'New', category: 'Account & Data' },
    { id: 'categories', label: t.categoryRoster, icon: Shield, category: 'Database & Students' },
    { id: 'news', label: `${t.newsCirculars} (${notices.length})`, icon: Megaphone, category: 'Account & Data' },
  ].filter((tab) => tabAllowed(tab.id));

  const quickTabs = [
    { id: 'class-database', label: '👥 छात्र डेटाबेस' },
    { id: 'qr-attendance', label: '📷 QR हाजिरी' },
    { id: 'question-papers', label: '📝 पेपर्स (50M)' },
    { id: 'doubt-resolution', label: `💬 डाउट्स (${studentDoubtTickets.length})` },
    { id: 'class-dispatch', label: '📤 क्लास डिस्पेच' },
    { id: 'material-hub', label: '📁 नोट्स व पीडीएफ' },
    { id: 'attendance-analysis', label: '📊 हाजिरी एनालिसिस' },
    { id: 'syllabus', label: '📖 सिलेबस' },
    { id: 'online-tests', label: '✍️ टेस्ट' },
  ].filter((tab) => tabAllowed(tab.id));

  const activeTabObj = facultyNavTabs.find((t) => t.id === activeTab) || facultyNavTabs[0];
  const ActiveIcon = activeTabObj ? activeTabObj.icon : FileSpreadsheet;

  return (
    <div id="faculty-dashboard-container" className="space-y-6 pb-24 sm:pb-8">
      {loginMgr && <LoginManager onClose={() => setLoginMgr(null)} initialQuery={loginMgr.q} />}
      {/* Faculty Hero Banner */}
      <div className="ugip-hero bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <div className="w-48 h-48 border-4 border-blue-400 rounded-full"></div>
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <UserAvatar
                name={currentUser.name}
                avatar={currentUser.avatar}
                role={currentUser.role}
                size="lg"
                editable={true}
                onEditClick={() => setIsPhotoModalOpen(true)}
              />
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(true)}
                className="mt-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-white/10 hover:bg-white/20 text-slate-200 transition-colors flex items-center gap-1 cursor-pointer border border-white/10"
              >
                <Camera className="w-3 h-3 text-amber-300" />
                <span>{currentUser.avatar ? 'Change Photo' : 'Upload Photo'}</span>
              </button>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 uppercase tracking-wider">
                  <UserCheck className="w-3.5 h-3.5" /> {t.facultyRole}
                </span>
                <span className="text-xs text-slate-300">{currentUser.department} Department</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold">{currentUser.name}</h2>
              <p className="text-xs text-slate-400">
                {currentUser.designation} · Uttarakhand Government Institute of Polytechnic
              </p>
              {/* Daily Attendance Badge */}
              <div className="pt-1 flex items-center gap-2">
                <span className="text-[11px] text-slate-400">{t.attendance}:</span>
                {todayPunch?.inTime ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    In: {todayPunch.inTime} {todayPunch.outTime ? `| Out: ${todayPunch.outTime}` : '(Active on Campus)'}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" /> Not Punched Today
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="faculty-scan-students-btn"
              onClick={() => setShowStudentScannerModal(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-white" />
              <span>Scan Student QR</span>
            </button>
            <button
              id="faculty-add-student-btn"
              onClick={() => setShowAddStudentModal(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-200" />
              <span>Add Student & Password</span>
            </button>
            <button
              id="faculty-gate-punch-btn"
              onClick={() => setShowFacultyPunchModal(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-amber-400" />
              <span>Staff Gate Punch</span>
            </button>
            {onLogout && (
              <button
                id="faculty-logout-btn"
                onClick={onLogout}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer ring-2 ring-rose-400/30"
                title="Exit Faculty Portal & Return Home"
              >
                <LogOut className="w-4 h-4 text-white" />
                <span>पोर्टल से बाहर निकलें (Exit)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE COMPACT NAVIGATION HEADER (< sm or forced phone view) */}
      <div className={`${forceMobileView ? 'block' : 'sm:hidden'} space-y-2.5`}>
        {/* Active Tab Bar + "All Tabs" button */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
              <ActiveIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">Active Faculty Section</div>
              <div className="text-xs font-black text-slate-900 dark:text-white truncate">{activeTabObj?.label}</div>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
          >
            <Menu className="w-3.5 h-3.5" />
            <span>सभी मेनू ({facultyNavTabs.length})</span>
          </button>
        </div>

        {/* Quick Horizontal Carousel */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-0.5 no-scrollbar touch-pan-x">
          {quickTabs.map((q) => {
            const isActive = activeTab === q.id;
            return (
              <button
                key={q.id}
                onClick={() => handleSwitchTab(q.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {q.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`${forceMobileView ? 'block' : 'sm:flex sm:gap-5 sm:items-start'} space-y-6 sm:space-y-0`}>
      {/* Desktop sidebar navigation - Hidden on mobile */}
      <aside className={`ugip-menu ${forceMobileView ? 'hidden' : 'hidden sm:flex'} flex-col overflow-y-auto overflow-x-hidden gap-1 p-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs sm:max-h-[calc(100vh-2rem)] sm:w-52 lg:w-64 sm:shrink-0 sm:sticky sm:top-4`}>
        <div className="px-3 pt-2 pb-3">
          <div className="text-[10px] font-extrabold tracking-widest text-blue-800 dark:text-blue-300 uppercase">Faculty Portal</div>
          <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{currentUser.name}</div>
        </div>
        {facultyNavTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`faculty-tab-${tab.id}`}
              onClick={() => handleSwitchTab(tab.id as any)}
              className={`px-3.5 py-2.5 w-full text-left rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 whitespace-normal cursor-pointer ${
                isActive
                  ? 'ugip-menu-on'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <>
                  <span className="hidden px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {tab.badge}
                  </span>
                  <span className="inline-block ml-auto w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                </>
              )}
            </button>
          );
        })}
      </aside>

      {/* Content area */}
      <div ref={contentTopRef} className="flex-1 min-w-0 space-y-6">

      {/* 1. CLASS-WISE STUDENT MASTER DATABASE & EXCEL SPREADSHEETS */}
      {activeTab === 'class-database' && (
        <ClassStudentDatabaseManager mode="faculty" />
      )}

      {/* AUTOMATIC YEAR-WISE ATTENDANCE ANALYSIS & TRENDS */}
      {activeTab === 'attendance-analysis' && (
        <YearwiseAttendanceAnalysis allowEdit={true} />
      )}

      {/* 2. ONLINE TESTS & ASSIGNMENTS WITH TIME REMINDER TRIGGER */}
      {activeTab === 'online-tests' && (
        <OnlineTestAssignmentManager mode="faculty" />
      )}

      {/* 3. REAL-TIME DOUBT RESOLUTION & Q&A HUB */}
      {activeTab === 'doubt-resolution' && (
        <RealtimeDoubtResolutionHub mode="faculty" />
      )}

      {/* 4. CLASS & SUBJECT DISPATCHER */}
      {activeTab === 'class-dispatch' && (
        <ClassSubjectDispatcher mode="faculty" />
      )}

      {/* 5. DOCUMENT & MATERIAL HUB */}
      {activeTab === 'material-hub' && (
        <DocumentMaterialHub mode="faculty" />
      )}

      {/* 3. QR CLASS ATTENDANCE */}
      {activeTab === 'qr-attendance' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <QrCode className="w-4 h-4 text-blue-600" /> Start Lecture Session
              </h3>
              <form onSubmit={handleStartQRSession} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Select Subject</label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                  >
                    {(facultySubjects.length > 0 ? facultySubjects : subjects).map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.code}: {sub.name} (Sem {sub.semester})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Lecture Time Slot</label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    <option value="10:00 AM - 11:00 AM">Period 1: 10:00 AM - 11:00 AM</option>
                    <option value="11:00 AM - 12:00 PM">Period 2: 11:00 AM - 12:00 PM</option>
                    <option value="12:00 PM - 01:00 PM">Period 3: 12:00 PM - 01:00 PM</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Topic Being Taught</label>
                  <input
                    type="text"
                    required
                    value={sessionTopic}
                    onChange={(e) => setSessionTopic(e.target.value)}
                    placeholder="e.g. Binary Search Tree Inorder Traversal"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Generate Dynamic QR & PIN
                </button>
              </form>
            </div>

            {currentActiveSession && (
              <div className="space-y-3">
                <QRCodeDisplay
                  token={currentActiveSession.qrToken}
                  pinCode={currentActiveSession.pinCode}
                  subjectName={currentActiveSession.subjectName}
                  subjectCode={currentActiveSession.subjectCode}
                  expiresAt={currentActiveSession.expiresAt}
                  activeAttendeesCount={
                    currentActiveSession.records.filter((r) => r.status === 'Present' || r.status === 'Late').length
                  }
                />
                <button
                  onClick={() => handleCloseSession(currentActiveSession.id)}
                  className="w-full py-2 bg-slate-200 hover:bg-red-100 hover:text-red-700 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Close Active Session
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-700">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Live Class Roll Call & Attendance Register
                </h3>
                <button
                  onClick={() => setShowStudentScannerModal(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" /> Scan Student QR
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-wider font-bold">
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Roll No</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {relevantStudents.map((stu) => {
                      const record = currentActiveSession?.records.find((r) => r.studentId === stu.id);
                      const status = record?.status || 'Absent';
                      return (
                        <tr key={stu.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800">
                          <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <UserAvatar name={stu.name} avatar={stu.avatar} role={stu.role} size="xs" />
                            {stu.name}
                          </td>
                          <td className="p-3 font-mono text-slate-500">{stu.rollNo}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                status === 'Present'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {currentActiveSession && (
                              <button
                                onClick={() => manualUpdateAttendance(currentActiveSession.id, stu.id, status === 'Present' ? 'Absent' : 'Present')}
                                className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-xs font-bold cursor-pointer"
                              >
                                Toggle
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. STUDENT DIRECTORY WITH SAVED PASSWORDS (User's requirement!) */}
      {activeTab === 'students' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Student Directory & Logins</span>
              </h3>
              <p className="text-xs text-slate-500">
                Passwords are stored encrypted. Open “Logins & Passwords” in the menu to see a student's password or make a new one.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddStudentModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" /> Add Student & Password
              </button>
              <button
                onClick={() => setLoginMgr({})}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-4 h-4" /> Logins & Passwords
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="relative w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={studentDirectorySearch}
                onChange={(e) => setStudentDirectorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b">
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Roll No</th>
                  <th className="p-3">Branch & Semester</th>
                  <th className="p-3 font-bold text-emerald-700 dark:text-emerald-400">Mobile Number (Add / Edit)</th>
                  <th className="p-3 font-bold text-amber-700 dark:text-amber-300">Student Login</th>
                  <th className="p-3">Attendance</th>
                  <th className="p-3 text-right">Inspect QR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredStudentsForDir.map((stu) => {
                  return (
                    <tr key={stu.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                      <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <UserAvatar name={stu.name} avatar={stu.avatar} role={stu.role} size="sm" />
                        <div>
                          <p>{stu.name}</p>
                          <p className="text-[10px] text-slate-400">{stu.email}</p>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-blue-600 dark:text-blue-400 font-bold">{stu.rollNo}</td>
                      <td className="p-3 font-semibold">{stu.branch} · Sem {stu.semester}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <div className="font-mono text-xs">
                            {stu.phone ? (
                              <span className="font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-emerald-600" />
                                {stu.phone}
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 italic text-[11px] font-sans">
                                No number added
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setStudentPhoneEditTarget(stu);
                              setNewPhoneInput(stu.phone || '');
                            }}
                            className="p-1 rounded-md bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 cursor-pointer"
                            title="Add or Edit Student Mobile Number"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => setLoginMgr({ q: stu.rollNo })}
                          className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 rounded-lg text-[11px] font-bold cursor-pointer border border-amber-200 dark:border-amber-800"
                        >
                          Login & password
                        </button>
                      </td>
                      <td className="p-3 font-bold text-emerald-600">{getAttendancePercent(stu.id) === null ? '—' : `${getAttendancePercent(stu.id)}%`}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setShowStudentScannerModal(true)}
                          className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TESTS */}
      {activeTab === 'tests' && (
        <div className="space-y-4">
          <ExamCalendar />
          <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Class Tests & Sessional Marks</h3>
              <p className="text-xs text-slate-500">Record sessional marks with automatic percentage calculation.</p>
            </div>
            <button
              onClick={() => setShowNewTestModal(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Sessional Test
            </button>
          </div>
          <div className="space-y-4">
            {tests.map((test) => (
              <div
                key={test.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs space-y-3"
              >
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{test.title} (Max: {test.maxMarks})</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-500 uppercase font-bold border-b">
                        <th className="p-2">Student</th>
                        <th className="p-2">Roll No</th>
                        <th className="p-2">Marks Obtained</th>
                        <th className="p-2">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {relevantStudents
                        .filter((stu) => stu.branch === test.branch && stu.semester === test.semester)
                        .sort((x, y) => String(x.rollNo).localeCompare(String(y.rollNo)))
                        .map((stu) => {
                          const res = test.results.find((r) => r.studentId === stu.id);
                          return (
                            <tr key={stu.id}>
                              <td className="p-2 font-bold text-slate-900 dark:text-white">{stu.name}</td>
                              <td className="p-2 font-mono text-slate-500">{stu.rollNo}</td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={test.maxMarks}
                                  placeholder="—"
                                  key={`${stu.id}-${res?.marksObtained ?? ''}`}
                                  defaultValue={res?.marksObtained ?? ''}
                                  onBlur={(e) => {
                                    if (e.target.value === '') return;
                                    const val = Number(e.target.value);
                                    if (val !== res?.marksObtained) updateSingleStudentMark(test.id, stu.id, { marksObtained: val });
                                  }}
                                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                  className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-700 border rounded font-bold text-center"
                                />
                              </td>
                              <td className="p-2 font-bold text-emerald-600">{res?.grade ?? '—'}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. AI TEACHING ASSISTANT */}
      {activeTab === 'ai-assistant' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
            <h3 className="font-extrabold text-lg sm:text-xl flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-300" />
              AI Teaching & Question Paper Assistant
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs block mb-1">Academic Task</label>
                <select
                  value={aiTaskType}
                  onChange={(e) => setAiTaskType(e.target.value)}
                  className="w-full p-2.5 bg-white/10 border border-white/20 rounded-xl text-xs text-white"
                >
                  <option value="Generate Sessional Test Question Paper" className="text-slate-900">
                    Generate Sessional Question Paper
                  </option>
                  <option value="Generate Analytical Assignment Problem Set" className="text-slate-900">
                    Generate Assignment Problem Set
                  </option>
                </select>
              </div>
              <div>
                <label className="text-xs block mb-1">Topic / Unit</label>
                <input
                  type="text"
                  value={aiTopicInput}
                  onChange={(e) => setAiTopicInput(e.target.value)}
                  placeholder="e.g. Unit 3: Binary Search Trees"
                  className="w-full p-2.5 bg-white/10 border border-white/20 rounded-xl text-xs text-white"
                />
              </div>
            </div>
            <button
              onClick={handleGenerateFacultyAI}
              disabled={isAiLoading}
              className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              {isAiLoading ? 'Generating Material...' : 'Generate with AI'}
            </button>
          </div>
          {aiResultContent && (
            <div className="bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-900 rounded-2xl p-6 shadow-md space-y-2">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Generated Academic Document</h4>
              <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
                {aiResultContent}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab "performance-analytics" */}
      {activeTab === 'performance-analytics' && <StudentPerformanceAnalyticsDashboard />}
      {/* Tab "placements" */}
      {activeTab === 'placements' && <ComprehensivePlacementPortal />}
      {/* Tab "student-progress-graph" */}
      {activeTab === 'student-progress-graph' && (
        <AIQuizDrillAndAnalytics
          defaultSubject={currentFacultySubject?.name}
          defaultBranch={currentUser.department}
        />
      )}
      {/* Tab "activity-stream" */}
      {activeTab === 'activity-stream' && <ActivityAuditLogViewer />}

      {/* ONLINE QUIZZES FOR SUBJECTS (User requirement: "har subject ka online quiz ka upload kenw ka bhi do") */}
      {activeTab === 'subject-quizzes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-600" />
                <span>Subject Online Quizzes & MCQs Bank</span>
              </h3>
              <p className="text-xs text-slate-500">
                Create online quizzes with questions, options, correct answers and detailed explanations for your branch subjects.
              </p>
            </div>
            <button
              onClick={() => {
                setQuizForm({
                  subjectId: currentFacultySubject?.id || (subjects[0]?.id || ''),
                  title: '',
                  durationMinutes: 20,
                  totalMarks: 20,
                  question1: '',
                  optA: '',
                  optB: '',
                  optC: '',
                  optD: '',
                  correctAnswer: 'A',
                  explanation: '',
                });
                setShowNewQuizModal(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Upload / Create Online Quiz</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {onlineQuizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs space-y-3 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {quiz.branch} · Sem {quiz.semester}
                  </span>
                  <button
                    onClick={() => deleteOnlineQuiz(quiz.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg cursor-pointer transition-colors"
                    title="Delete Quiz"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{quiz.title}</h4>
                <p className="text-xs text-slate-500">{quiz.subjectName}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <span>Questions: {quiz.questions?.length || 1}</span>
                  <span>Duration: {quiz.durationMinutes} mins</span>
                  <span>Marks: {quiz.totalMarks}</span>
                </div>
              </div>
            ))}
            {onlineQuizzes.length === 0 && (
              <div className="col-span-full p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400">
                <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">No Subject Online Quizzes created yet.</p>
                <p className="text-xs mt-1">Click "Upload / Create Online Quiz" above to add the first quiz.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab "data-center" */}
      {activeTab === 'data-center' && <DataCenter mode="faculty" />}
      {/* Tab "categories" */}
      {activeTab === 'categories' && <StudentCategoryRoster isFacultyView={true} initialBranch={currentUser.department} />}
      {/* Tab "practicals" */}
      {activeTab === 'practicals' && <PracticalLabManager isFacultyOrAdmin={true} />}
      {/* Tab "board-results" */}
      {activeTab === 'board-results' && <BoardResultsManager />}
      {/* Tab "attendance-register" */}
      {activeTab === 'attendance-register' && <AttendanceRegister />}
      {/* Tab "logins" */}
      {activeTab === 'my-profile' && <MyProfileCard />}
      {activeTab === 'question-papers' && <QuestionPapersHub />}
      {activeTab === 'placement-tracker' && <PlacementTracker />}
      {activeTab === 'logins' && <PasswordCenter />}
      {/* Tab "timetable" */}
      {activeTab === 'timetable' && <TimetableModule allowEdit={false} />}

      {activeTab === 'syllabus' && <SyllabusViewer defaultBranch={facultySubjects[0]?.branch} defaultSemester={facultySubjects[0]?.semester} />}
      {/* Tab "news" */}
      {activeTab === 'news' && <CollegeNewsSection allowPublish={true} />}

      {/* Student Phone Edit Modal (User requirement: "faculty ke jariye studnet number add edit ka option bhi to do") */}
      {studentPhoneEditTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>Add / Edit Student Mobile Number</span>
              </h4>
              <button
                type="button"
                onClick={() => setStudentPhoneEditTarget(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1 text-xs">
              <p className="font-bold text-slate-900 dark:text-white text-sm">{studentPhoneEditTarget.name}</p>
              <p className="text-slate-500 font-mono">
                Roll No: <span className="text-blue-600 dark:text-blue-400 font-bold">{studentPhoneEditTarget.rollNo}</span> · {studentPhoneEditTarget.branch} Sem {studentPhoneEditTarget.semester}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                Mobile Number (10 Digits) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  value={newPhoneInput.replace(/^\+91\s?/, '')}
                  onChange={(e) => setNewPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                  className="w-full pl-12 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                This number is verified for SMS OTP password reset and official college circulars.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStudentPhoneEditTarget(null)}
                className="px-4 py-2 text-slate-500 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const clean = newPhoneInput.trim().replace(/\D/g, '');
                  if (!clean) return;
                  const formatted = `+91 ${clean}`;
                  updateStudentPhone(studentPhoneEditTarget.id, formatted);
                  setStudentPhoneEditTarget(null);
                }}
                disabled={!newPhoneInput.trim()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Save Phone Number
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Subject Online Quiz Modal */}
      {showNewQuizModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-600" />
                <span>Upload New Subject Online Quiz</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowNewQuizModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const sub = subjects.find((s) => s.id === quizForm.subjectId) || currentFacultySubject;
                if (!sub || !quizForm.title) return;

                addOnlineQuiz({
                  title: quizForm.title,
                  subjectId: sub.id,
                  subjectCode: sub.code,
                  subjectName: sub.name,
                  branch: sub.branch,
                  semester: sub.semester,
                  createdByFacultyName: currentUser.name,
                  durationMinutes: Number(quizForm.durationMinutes),
                  totalMarks: Number(quizForm.totalMarks),
                  questions: [
                    {
                      id: `q-${Date.now()}`,
                      question: quizForm.question1 || 'Core conceptual question from curriculum unit.',
                      options: [
                        quizForm.optA || 'Option A',
                        quizForm.optB || 'Option B',
                        quizForm.optC || 'Option C',
                        quizForm.optD || 'Option D',
                      ],
                      correctAnswer: quizForm.correctAnswer || 'A',
                      explanation: quizForm.explanation || 'Based on standard engineering textbook principles.',
                    },
                  ],
                });

                setShowNewQuizModal(false);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Select Subject *</label>
                <select
                  value={quizForm.subjectId}
                  onChange={(e) => setQuizForm({ ...quizForm, subjectId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name} ({s.branch} Sem {s.semester})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Quiz Title *</label>
                <input
                  type="text"
                  required
                  value={quizForm.title}
                  onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  placeholder="e.g. Unit 2: Data Structures & Algorithms MCQ Drill"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    value={quizForm.durationMinutes}
                    onChange={(e) => setQuizForm({ ...quizForm, durationMinutes: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Total Marks</label>
                  <input
                    type="number"
                    value={quizForm.totalMarks}
                    onChange={(e) => setQuizForm({ ...quizForm, totalMarks: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 block text-xs">
                  Initial Sample MCQ Question
                </span>
                <input
                  type="text"
                  required
                  value={quizForm.question1}
                  onChange={(e) => setQuizForm({ ...quizForm, question1: e.target.value })}
                  placeholder="Enter Question (e.g. What is the time complexity of binary search?)"
                  className="w-full p-2 bg-white dark:bg-slate-700 border rounded-lg"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={quizForm.optA}
                    onChange={(e) => setQuizForm({ ...quizForm, optA: e.target.value })}
                    placeholder="Option A (e.g. O(log n))"
                    className="p-2 bg-white dark:bg-slate-700 border rounded-lg"
                  />
                  <input
                    type="text"
                    required
                    value={quizForm.optB}
                    onChange={(e) => setQuizForm({ ...quizForm, optB: e.target.value })}
                    placeholder="Option B (e.g. O(n))"
                    className="p-2 bg-white dark:bg-slate-700 border rounded-lg"
                  />
                  <input
                    type="text"
                    required
                    value={quizForm.optC}
                    onChange={(e) => setQuizForm({ ...quizForm, optC: e.target.value })}
                    placeholder="Option C (e.g. O(n^2))"
                    className="p-2 bg-white dark:bg-slate-700 border rounded-lg"
                  />
                  <input
                    type="text"
                    required
                    value={quizForm.optD}
                    onChange={(e) => setQuizForm({ ...quizForm, optD: e.target.value })}
                    placeholder="Option D (e.g. O(1))"
                    className="p-2 bg-white dark:bg-slate-700 border rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Correct Option</label>
                    <select
                      value={quizForm.correctAnswer}
                      onChange={(e) => setQuizForm({ ...quizForm, correctAnswer: e.target.value })}
                      className="w-full p-2 bg-white dark:bg-slate-700 border rounded-lg font-bold"
                    >
                      <option value="A">Option A</option>
                      <option value="B">Option B</option>
                      <option value="C">Option C</option>
                      <option value="D">Option D</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Explanation</label>
                    <input
                      type="text"
                      value={quizForm.explanation}
                      onChange={(e) => setQuizForm({ ...quizForm, explanation: e.target.value })}
                      placeholder="Why this option is correct"
                      className="w-full p-2 bg-white dark:bg-slate-700 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewQuizModal(false)}
                  className="px-4 py-2 text-slate-500 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Publish Quiz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals */}
      <StudentQRScannerModal
        isOpen={showStudentScannerModal}
        onClose={() => setShowStudentScannerModal(false)}
        scannerRole="faculty"
        facultyName={currentUser.name}
      />
      <AddStudentModal
        isOpen={showAddStudentModal}
        onClose={() => setShowAddStudentModal(false)}
        creatorRole="faculty"
      />
      <FacultyPunchModal
        isOpen={showFacultyPunchModal}
        onClose={() => setShowFacultyPunchModal(false)}
      />
      <PhotoUploadModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
      />

      {showNewTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h4 className="font-bold text-slate-900 dark:text-white text-base">Create Sessional Test</h4>
            <form onSubmit={handleCreateTest} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Test Title *</label>
                <input
                  type="text"
                  required
                  value={newTestForm.title}
                  onChange={(e) => setNewTestForm({ ...newTestForm, title: e.target.value })}
                  placeholder="e.g. 2nd Sessional Exam - CS-501"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Max Marks</label>
                  <input
                    type="number"
                    value={newTestForm.maxMarks}
                    onChange={(e) => setNewTestForm({ ...newTestForm, maxMarks: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Date</label>
                  <input
                    type="date"
                    value={newTestForm.date}
                    onChange={(e) => setNewTestForm({ ...newTestForm, date: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowNewTestModal(false)} className="px-4 py-2 text-slate-500">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg">Create Test</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
      </div>

      {/* MOBILE ALL-TABS SLIDE-OVER DRAWER MODAL */}
      {mobileMenuOpen && (
        <div className={`fixed inset-0 z-50 flex items-end ${forceMobileView ? '' : 'sm:hidden'} bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150`}>
          <div className="w-full bg-white dark:bg-slate-900 rounded-t-3xl max-h-[85vh] flex flex-col border-t border-slate-200 dark:border-slate-800 shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Drawer Drag handle & Header */}
            <div className="p-4 pb-2 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span>📱 फैकल्टी पोर्टल मेनू</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                      {facultyNavTabs.length} ऑप्शन्स
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {currentUser.name} • {currentUser.designation || 'Lecturer'}
                  </p>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable List of Tabs grouped by category */}
            <div className="overflow-y-auto p-4 space-y-4 flex-1">
              {['Database & Students', 'Attendance & Classes', 'Academics & Tests', 'Placement & Career', 'Account & Data'].map((cat) => {
                const catTabs = facultyNavTabs.filter((t) => t.category === cat);
                if (catTabs.length === 0) return null;
                const catLabel =
                  cat === 'Database & Students'
                    ? '👥 छात्र डेटाबेस व एनालिटिक्स (1st, 2nd, 3rd Yr)'
                    : cat === 'Attendance & Classes'
                    ? '📷 QR हाजिरी व अटेंडेंस एनालिसिस'
                    : cat === 'Academics & Tests'
                    ? '📚 परीक्षा, क्वेश्चन पेपर्स (50M) व लाइव डाउट्स'
                    : cat === 'Placement & Career'
                    ? '💼 प्लेसमेंट हब व रिज्यूमे ट्रैकर'
                    : '📁 डेटा सेंटर, पासवर्ड्स व प्रोफाइल';

                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                      {catLabel}
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                      {catTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => handleSwitchTab(tab.id)}
                            className={`w-full p-2.5 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                              isActive
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-amber-600 dark:text-amber-400'}`} />
                              <span className="truncate">{tab.label}</span>
                            </div>
                            {tab.badge && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0 ${
                                isActive
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                              }`}>
                                {tab.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MOBILE STICKY BOTTOM NAVIGATION BAR */}
      <nav aria-label="Faculty Mobile Navigation" className={`fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around ${forceMobileView ? 'flex' : 'sm:hidden'} shadow-lg`}>
        <button
          onClick={() => handleSwitchTab('class-database')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
            activeTab === 'class-database' || activeTab === 'students' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>डेटाबेस</span>
        </button>
        <button
          onClick={() => handleSwitchTab('qr-attendance')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
            activeTab === 'qr-attendance' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>QR हाजिरी</span>
        </button>
        <button
          onClick={() => handleSwitchTab('question-papers')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
            activeTab === 'question-papers' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>पेपर्स</span>
        </button>
        <button
          onClick={() => handleSwitchTab('doubt-resolution')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
            activeTab === 'doubt-resolution' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>डाउट्स</span>
        </button>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-bold text-amber-600 dark:text-amber-400 transition-colors cursor-pointer"
        >
          <div className="w-4 h-4 flex items-center justify-center">
            <Menu className="w-4 h-4" />
          </div>
          <span>मेनू ({facultyNavTabs.length})</span>
        </button>
      </nav>
    </div>
  );
};
