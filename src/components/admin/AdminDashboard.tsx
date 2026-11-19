// ===================================================================================================
// Admin dashboard: left menu + the chosen screen (students, faculty, subjects, exams, attendance,
// Step 18: Academic Year & Promotion, UBTER Board Results, Attendance Register, practicals, placement...).
// ===================================================================================================
import React, { useState, useRef } from 'react';
import { useCollege } from '../../context/CollegeContext';
import {
  UserProfile,
  BranchCode,
  PreviousYearPaper,
} from '../../types';
import { BRANCHES } from '../../data/mockData';
import {
  Users,
  GraduationCap,
  BookOpen,
  FileText,
  BarChart3,
  Sparkles,
  Plus,
  Trash2,
  Search,
  ShieldCheck,
  Shield,
  TrendingUp,
  Brain,
  Clock,
  FlaskConical,
  Briefcase,
  FolderDown,
  Trophy,
  UserCheck,
  Laptop,
  Building2,
  Camera,
  KeyRound,
  Eye,
  EyeOff,
  LogOut,
  Megaphone,
  CheckCircle2,
  Database,
  Award,
  CalendarDays,
  FileSpreadsheet,
  Send,
  Lock,
  Activity,
  HelpCircle,
  UserCog,
  Target,
  Menu,
  X,
} from 'lucide-react';
import { PlacementTracker } from '../placement/PlacementPrep';   // placement preparation of every student (resume ATS + practice tests)
import { MyProfileCard } from '../common/MyProfileCard';             // self-service: own details + own password
import { QuestionPapersHub } from '../common/QuestionPapersHub';         // question papers + answer keys (open / download / upload)
import { PaperPreviewModal } from '../common/PaperPreviewModal';
import { SyllabusViewer } from '../common/SyllabusViewer';   // official UBTER syllabus
import { SubjectTeacherAssigner } from './SubjectTeacherAssigner';   // which teacher teaches which subject (semester-wise)
import { FacultyPermissionsPanel } from './FacultyPermissionsPanel';   // what each teacher may do
import { TimetableModule } from '../common/TimetableModule';
import { ExamCalendar } from '../common/ExamCalendar';   // exam dates of the semester (admin edits)
import { PracticalLabManager } from '../common/PracticalLabManager';
import { AcademicYearManager } from './AcademicYearManager';            // Step 18: academic year, one-click class promotion, sample data
import { BoardResultsManager } from '../common/BoardResultsManager';
import { AttendanceRegister } from '../common/AttendanceRegister';
import { PasswordCenter } from '../common/PasswordCenter';             // Step 19: own / faculty / student passwords     // Step 18: edit / delete lectures, correct attendance   // Step 18: UBTER board results (add / edit / delete)
import { StudyMaterialsLibrary } from '../common/StudyMaterialsLibrary';
import { InternshipPlacementPortal } from '../common/InternshipPlacementPortal';
import { AchievementsGallery } from '../common/AchievementsGallery';
import { MySQLSchemaViewerModal } from '../common/MySQLSchemaViewerModal';
import { FacultyPunchModal } from '../common/FacultyPunchModal';
import { FacultyQRScannerModal } from '../common/FacultyQRScannerModal';
import { StudentCategoryRoster } from '../common/StudentCategoryRoster';
import DataCenter from '../common/DataCenter';
import { UserAvatar } from '../common/UserAvatar';
import { PhotoUploadModal } from '../common/PhotoUploadModal';
import { StudentQRScannerModal } from '../common/StudentQRScannerModal';
import { AddStudentModal } from '../common/AddStudentModal';
import { CollegeNewsSection } from '../common/CollegeNewsSection';
import { ConsolidatedMarksSheet } from '../common/ConsolidatedMarksSheet';
import { LegacyDataCard } from './LegacyDataCard';
import { ClassSubjectDispatcher } from '../common/ClassSubjectDispatcher';
import { ActivityAuditLogViewer } from '../common/ActivityAuditLogViewer';
import { AIQuizDrillAndAnalytics } from '../common/AIQuizDrillAndAnalytics';
import { StudentPerformanceAnalyticsDashboard } from '../analytics/StudentPerformanceAnalyticsDashboard';
import { DocumentMaterialHub } from '../common/DocumentMaterialHub';
import { ClassStudentDatabaseManager } from '../common/ClassStudentDatabaseManager';
import { OnlineTestAssignmentManager } from '../common/OnlineTestAssignmentManager';
import { RealtimeDoubtResolutionHub } from '../common/RealtimeDoubtResolutionHub';
import { YearwiseAttendanceAnalysis } from '../common/YearwiseAttendanceAnalysis';
import { issueTempPasswordFor } from '../../services/credentialsUi';
import { LoginManager } from '../common/LoginManager';

// Data shape: admin dashboard props.
interface AdminDashboardProps {
  onLogout?: () => void;
  forceMobileView?: boolean;
}

// Faculty credential editor.
const FacultyCredentialEditor: React.FC<{ faculty: UserProfile }> = ({ faculty }) => (
  <div className="bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/90 dark:border-amber-800/40 rounded-xl p-3 space-y-2.5">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
        <KeyRound className="w-3.5 h-3.5 text-amber-600" />
        <span>Faculty Login</span>
      </span>
      <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">Admin Controlled</span>
    </div>
    <div className="flex items-center justify-between gap-3 text-xs">
      <div>
        <span className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">Username</span>
        <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{faculty.username || '—'}</span>
      </div>
      <button
        type="button"
        onClick={() => issueTempPasswordFor(faculty.id, faculty.name)}
        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs shrink-0"
      >
        Issue new password
      </button>
    </div>
    <span className="block text-[10px] text-slate-400">Teachers sign in by choosing their subject + this password. Only the admin sees or resets faculty passwords; they are never sent to another teacher.</span>
  </div>
);

// Screen part: admin dashboard.
export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, forceMobileView = false }) => {
  const {
    users,
    addUser,
    updateUser,
    deleteUser,
    subjects,
    addSubject,
    deleteSubject,
    papers,
    addPaper,
    deletePaper,
    getWeakStudentsAnalysis,
    attendanceSummary,
    getFacultyTodayPunch,
    notices,
    t,
    getAttendancePercent,
    refreshAcademic,
  } = useCollege();

  // Photo modal user (kept in screen state)
  const [photoModalUser, setPhotoModalUser] = useState<UserProfile | null>(null);
  // Which tab is open right now
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'syllabus'
    | 'academic-year'
    | 'board-results'
    | 'attendance-register'
    | 'logins'
    | 'my-profile'
    | 'placement-tracker'
    | 'class-database'
    | 'attendance-analysis'
    | 'online-tests'
    | 'doubt-resolution'
    | 'class-dispatch'
    | 'students'
    | 'categories'
    | 'data-center'
    | 'faculty'
    | 'security-audit'
    | 'staff-attendance'
    | 'subjects'
    | 'timetable'
    | 'practicals'
    | 'materials'
    | 'placements'
    | 'performance-analytics'
    | 'achievements'
    | 'news'
    | 'papers'
    | 'quiz-drill'
    | 'ai-diagnostics'
  >('overview');

  // Mobile navigation state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
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

  // Is the 'add student pop-up' shown on screen? (true / false)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  // Login mgr (kept in screen state)
  const [loginMgr, setLoginMgr] = useState<{ q?: string } | null>(null);
  // Is the 'add faculty pop-up' shown on screen? (true / false)
  const [showAddFacultyModal, setShowAddFacultyModal] = useState(false);
  // Is the 'add subject pop-up' shown on screen? (true / false)
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  // Is the 'add paper pop-up' shown on screen? (true / false)
  const [showAddPaperModal, setShowAddPaperModal] = useState(false);
  // Preview paper (kept in screen state)
  const [previewPaper, setPreviewPaper] = useState<PreviousYearPaper | null>(null);
  // Is the 'my sql pop-up' shown on screen? (true / false)
  const [showMySQLModal, setShowMySQLModal] = useState(false);
  // Is the 'faculty punch pop-up' shown on screen? (true / false)
  const [showFacultyPunchModal, setShowFacultyPunchModal] = useState(false);
  // Is the 'student scanner pop-up' shown on screen? (true / false)
  const [showStudentScannerModal, setShowStudentScannerModal] = useState(false);

  // Text typed in the search box
  const [studentSearch, setStudentSearch] = useState('');
  // The branch filter chosen by the user (filter / list selection)
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  // Text typed in the search box
  const [facultySearch, setFacultySearch] = useState('');

  // Text typed in the search box
  const [aiQuery, setAiQuery] = useState('');
  // Ai response (kept in screen state)
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  // Is it ai loading? (true / false)
  const [isAiLoading, setIsAiLoading] = useState(false);

  // New faculty (kept in screen state)
  const [newFaculty, setNewFaculty] = useState({
    name: '',
    email: '',
    department: 'CSE' as BranchCode,
    designation: 'Lecturer',
    phone: '',
    username: '',
    password: '',
    assignedSubjectIds: [] as string[],
  });

  // Values typed into the new subject form
  const [newSubjectForm, setNewSubjectForm] = useState({
    name: '',
    code: '',
    branch: 'CSE' as BranchCode,
    semester: 1 as 1 | 2 | 3 | 4 | 5 | 6,
    year: 1 as 1 | 2 | 3,
    credits: 4,
    facultyId: '',
    hasPractical: true,
  });

  // Values typed into the new paper form
  const [newPaperForm, setNewPaperForm] = useState({
    title: '',
    branch: 'CSE' as BranchCode,
    semester: 1 as 1 | 2 | 3 | 4 | 5 | 6,
    subjectId: '',
    year: 2024,
    examSession: 'Winter (Dec/Jan)' as const,
    questionCount: 15,
    fileSizeBytes: '2.0 MB',
    solutionAvailable: true,
    highlights: ['Question on Core Derivations', 'Numerical on Applied Calculations'],
  });

  const studentsList = users.filter((u) => u.role === 'student');
  const facultyList = users.filter((u) => u.role === 'faculty');
  const weakStudents = getWeakStudentsAnalysis();
  // Average attendance of the whole college from the classes actually recorded this academic year (no invented number).
  const attTotals = Object.values(attendanceSummary).reduce((a, r) => ({ total: a.total + (r.total || 0), attended: a.attended + (r.attended || 0) }), { total: 0, attended: 0 });
  const avgAttendance = attTotals.total ? Math.round((attTotals.attended / attTotals.total) * 1000) / 10 : null;

  const adminNavTabs = [
    { id: 'overview', label: t.overview, icon: BarChart3, category: 'Core Admin' },
    { id: 'class-database', label: `Students · 1st, 2nd, 3rd Yr (${studentsList.length})`, icon: GraduationCap, badge: `${studentsList.length}`, category: 'Students' },
    { id: 'academic-year', label: 'Academic Year & Promotion', icon: CalendarDays, badge: 'New', category: 'Core Admin' },
    { id: 'board-results', label: 'UBTER Board Results', icon: Award, badge: 'New', category: 'Academics & Exams' },
    { id: 'papers', label: 'Question Papers & Answer Keys', icon: FileText, badge: '50M', category: 'Academics & Exams' },
    { id: 'attendance-register', label: 'Attendance Register (edit)', icon: UserCheck, category: 'Attendance' },
    { id: 'attendance-analysis', label: 'Batch Attendance Analysis (1st, 2nd, 3rd Yr)', icon: TrendingUp, badge: 'Auto', category: 'Attendance' },
    { id: 'staff-attendance', label: t.staffGateRegister, icon: UserCheck, category: 'Attendance' },
    { id: 'online-tests', label: 'Online Tests & Tasks', icon: Award, badge: 'Alerts', category: 'Academics & Exams' },
    { id: 'doubt-resolution', label: 'Real-Time Doubt Q&A', icon: HelpCircle, badge: 'Live Chat', category: 'Academics & Exams' },
    { id: 'class-dispatch', label: 'Class & Subject Dispatcher', icon: Send, badge: 'Direct', category: 'Academics & Exams' },
    { id: 'data-center', label: 'Data Center (Download / Upload)', icon: FileSpreadsheet, badge: 'New', category: 'Data & Access' },
    { id: 'logins', label: 'Logins & Passwords', icon: KeyRound, badge: 'Vault', category: 'Data & Access' },
    { id: 'faculty', label: `Faculty Role Control (${facultyList.length})`, icon: Users, badge: 'Admin Only', category: 'Faculty' },
    { id: 'security-audit', label: 'Security Audit Logs', icon: Activity, badge: 'SHA-256', category: 'Security' },
    { id: 'subjects', label: `${t.curriculum} (${subjects.length})`, icon: BookOpen, category: 'Academics & Exams' },
    { id: 'syllabus', label: 'Syllabus (UBTER)', icon: BookOpen, badge: 'Unit-wise', category: 'Academics & Exams' },
    { id: 'timetable', label: t.timetable, icon: Clock, category: 'Academics & Exams' },
    { id: 'practicals', label: t.practicals, icon: FlaskConical, category: 'Academics & Exams' },
    { id: 'materials', label: t.studyMaterials, icon: FolderDown, category: 'Academics & Exams' },
    { id: 'placements', label: 'Career & Placement Hub', icon: Briefcase, badge: 'CS & Civil', category: 'Placement' },
    { id: 'placement-tracker', label: 'Placement Tracker (Resume · Tests)', icon: Target, badge: 'New', category: 'Placement' },
    { id: 'performance-analytics', label: 'Student Performance Analytics', icon: BarChart3, badge: 'Longitudinal', category: 'Students' },
    { id: 'categories', label: t.categoryRoster, icon: Shield, category: 'Students' },
    { id: 'achievements', label: t.honorsGallery, icon: Trophy, category: 'Placement' },
    { id: 'news', label: `${t.newsCirculars} (${notices.length})`, icon: Megaphone, category: 'Core Admin' },
    { id: 'ai-diagnostics', label: 'AI Diagnostic Engine', icon: Sparkles, badge: 'AI', category: 'Core Admin' },
    { id: 'my-profile', label: 'My Profile & Password', icon: UserCog, category: 'Data & Access' },
  ];

  const quickTabs = [
    { id: 'overview', label: '🏠 होम' },
    { id: 'class-database', label: `👥 छात्र (${studentsList.length})` },
    { id: 'attendance-register', label: '📊 हाजिरी रजिस्टर' },
    { id: 'papers', label: '📝 पेपर्स (50M)' },
    { id: 'board-results', label: '🏆 बोर्ड रिजल्ट्स' },
    { id: 'ai-diagnostics', label: '🤖 AI डायग्नोस्टिक्स' },
    { id: 'doubt-resolution', label: '💬 डाउट्स Q&A' },
    { id: 'data-center', label: '📁 डेटा सेंटर' },
    { id: 'logins', label: '🔑 पासवर्ड्स' },
    { id: 'class-dispatch', label: '📤 मैटेरियल डिस्पेचर' },
    { id: 'online-tests', label: '✍️ ऑनलाइन टेस्ट्स' },
    { id: 'materials', label: '📂 डॉक्यूमेंट हब' },
    { id: 'attendance-analysis', label: '📈 हाजिरी एनालिसिस' },
    { id: 'faculty', label: '👨‍🏫 फैकल्टी कंट्रोल' },
    { id: 'news', label: `📢 सूचनाएं (${notices.length})` },
    { id: 'academic-year', label: '🗓️ सेशन व प्रमोशन' },
    { id: 'timetable', label: '📅 टाइमटेबल' },
    { id: 'syllabus', label: '📖 सिलेबस UBTER' },
    { id: 'practicals', label: '🔬 प्रैक्टिकल लैब्स' },
    { id: 'placements', label: '💼 प्लेसमेंट हब' },
    { id: 'placement-tracker', label: '🎯 प्लेसमेंट ट्रैकर' },
    { id: 'performance-analytics', label: '📊 परफॉरमेंस एनालिसिस' },
    { id: 'categories', label: '📑 श्रेणी रोस्टर' },
    { id: 'achievements', label: '🏅 ऑनर्स गैलरी' },
    { id: 'security-audit', label: '🔒 सिक्यूरिटी लॉग्स' },
    { id: 'subjects', label: '📚 विषय व शिक्षक' },
    { id: 'staff-attendance', label: '🚪 स्टाफ गेट रजिस्टर' },
    { id: 'my-profile', label: '👤 प्रोफाइल व पासवर्ड' },
  ];

  const activeTabObj = adminNavTabs.find((t) => t.id === activeTab || (t.id === 'class-database' && activeTab === 'students')) || adminNavTabs[0];
  const ActiveIcon = activeTabObj.icon;

  const filteredStudents = studentsList.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.rollNo && s.rollNo.includes(studentSearch));
    const matchesBranch = selectedBranchFilter === 'all' || s.branch === selectedBranchFilter;
    return matchesSearch && matchesBranch;
  });

  const filteredFaculty = facultyList.filter(
    (f) =>
      f.name.toLowerCase().includes(facultySearch.toLowerCase()) ||
      (f.department && f.department.toLowerCase().includes(facultySearch.toLowerCase()))
  );

  // Runs when the user does this on screen: run ai diagnostic.
  const handleRunAiDiagnostic = async (queryText?: string) => {
    setIsAiLoading(true);
    const q = queryText || aiQuery || 'Identify at-risk students across CSE & Civil and suggest remedial action plan.';
    try {
      const res = await fetch('/api/ai/diagnose-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          studentData: studentsList,
          subjectData: subjects,
          analysisType: 'weakness-and-remedial',
        }),
      });
      const data = await res.json();
      setAiResponse(data.analysis || 'Analysis completed.');
    } catch (err) {
      console.error(err);
      setAiResponse('AI Diagnostic generated using student attendance and sessional logs.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Runs when the user does this on screen: create faculty.
  const handleCreateFaculty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaculty.name || !newFaculty.email) return;
    const cleanUsername =
      newFaculty.username.trim() ||
      newFaculty.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    addUser({
      name: newFaculty.name,
      email: newFaculty.email,
      role: 'faculty',
      department: newFaculty.department,
      designation: newFaculty.designation,
      phone: newFaculty.phone,
      username: cleanUsername,
      assignedSubjectIds: newFaculty.assignedSubjectIds,
      avatar: '',
    });
    setShowAddFacultyModal(false);
    setNewFaculty({
      name: '',
      email: '',
      department: 'CSE',
      designation: 'Lecturer',
      phone: '',
      username: '',
      password: '',
      assignedSubjectIds: [],
    });
  };

  // Runs when the user does this on screen: create subject.
  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectForm.name || !newSubjectForm.code) return;
    const assignedFac = facultyList.find((f) => f.id === newSubjectForm.facultyId);
    addSubject({
      name: newSubjectForm.name,
      code: newSubjectForm.code,
      branch: newSubjectForm.branch,
      semester: newSubjectForm.semester,
      year: newSubjectForm.year,
      credits: Number(newSubjectForm.credits),
      facultyId: assignedFac ? assignedFac.id : 'fac-hod-cse',
      facultyName: assignedFac ? assignedFac.name : 'Mr. Jitendra Parsad',
      hasPractical: newSubjectForm.hasPractical,
      importantTopics: [],
      syllabusUnits: [
        { unitNo: 1, unitTitle: 'Unit 1: Fundamentals', topics: ['Core concepts'], hours: 12 },
      ],
    });
    setShowAddSubjectModal(false);
  };

  // Runs when the user does this on screen: create paper.
  const handleCreatePaper = (e: React.FormEvent) => {
    e.preventDefault();
    const sub = subjects.find((s) => s.id === newPaperForm.subjectId) || subjects[0];
    addPaper({
      title: newPaperForm.title || `UBTER ${newPaperForm.year} - ${sub.name} (${sub.code})`,
      branch: newPaperForm.branch,
      semester: newPaperForm.semester,
      subjectId: sub.id,
      subjectCode: sub.code,
      subjectName: sub.name,
      year: Number(newPaperForm.year),
      examSession: newPaperForm.examSession,
      questionCount: Number(newPaperForm.questionCount),
      fileSizeBytes: newPaperForm.fileSizeBytes,
      solutionAvailable: newPaperForm.solutionAvailable,
      highlights: newPaperForm.highlights,
    });
    setShowAddPaperModal(false);
  };

  return (
    <div id="admin-dashboard-container" className="space-y-6 pb-24 sm:pb-8">
      {loginMgr && <LoginManager onClose={() => setLoginMgr(null)} initialQuery={loginMgr.q} />}
      {/* Admin Title & Quick Status */}
      <div className="ugip-hero bg-slate-900 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <div className="w-48 h-48 border-4 border-blue-400 rounded-full"></div>
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center gap-1.5 uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" /> Chief Administrator
              </span>
              <span className="text-xs text-slate-400 font-medium">{t.academicSession}</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Uttarakhand Government Institute of Polytechnic
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Master Administration, Role Management, and Encrypted Security Vault
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:flex lg:flex-wrap gap-2.5 w-full lg:w-auto">
            <button
              onClick={() => setShowStudentScannerModal(true)}
              className="w-full sm:w-auto justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-white" />
              <span>Student QR Scanner</span>
            </button>
            <button
              onClick={() => setShowAddStudentModal(true)}
              className="w-full sm:w-auto justify-center px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Student & Password</span>
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full sm:w-auto justify-center px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer ring-2 ring-rose-400/30"
                title="Exit Admin Portal & Return Home"
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
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
              <ActiveIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">Active Admin Section</div>
              <div className="text-xs font-black text-slate-900 dark:text-white truncate">{activeTabObj.label}</div>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer active:scale-95 transition-transform"
          >
            <Menu className="w-4 h-4" />
            <span>सभी मेनू ({adminNavTabs.length})</span>
          </button>
        </div>

        {/* Quick Horizontal Carousel with visual scroll affordance */}
        <div className="relative">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 px-0.5 no-scrollbar touch-pan-x scroll-smooth">
            {quickTabs.map((q) => {
              const isActive = activeTab === q.id || (q.id === 'class-database' && activeTab === 'students');
              return (
                <button
                  key={q.id}
                  onClick={() => handleSwitchTab(q.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400/40'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {q.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`${forceMobileView ? 'block' : 'sm:flex sm:gap-5 sm:items-start'} space-y-6 sm:space-y-0`}>
      {/* Desktop sidebar navigation - Hidden on mobile */}
      <aside className={`ugip-menu ${forceMobileView ? 'hidden' : 'hidden sm:flex'} flex-col overflow-y-auto overflow-x-hidden gap-1 p-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs sm:max-h-[calc(100vh-2rem)] sm:w-52 lg:w-64 sm:shrink-0 sm:sticky sm:top-4`}>
        <div className="px-3 pt-2 pb-3">
          <div className="text-[10px] font-extrabold tracking-widest text-blue-800 dark:text-blue-300 uppercase">Admin Portal</div>
          <div className="text-sm font-extrabold text-slate-900 dark:text-white">Administrator</div>
        </div>
        {adminNavTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id || (tab.id === 'class-database' && activeTab === 'students');
          return (
            <button
              key={tab.id}
              id={`admin-tab-${tab.id}`}
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

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <LegacyDataCard />
          <div className="ugip-stats grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
            <div className="bg-white dark:bg-slate-800 p-3.5 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs min-w-0 flex flex-col justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Total Students</p>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {studentsList.length}
                </h3>
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-semibold flex items-center gap-1 leading-tight">
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Saved Passwords</span>
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-3.5 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs min-w-0 flex flex-col justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Faculty Controlled</p>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {facultyList.length}
                </h3>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-2 font-semibold leading-tight truncate">Safety First: Admin Auth Only</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-3.5 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs min-w-0 flex flex-col justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">Avg. Attendance</p>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {avgAttendance === null ? '–' : `${avgAttendance}%`}
                </h3>
              </div>
              <p className="text-[11px] sm:text-xs text-blue-600 dark:text-blue-400 mt-2 font-semibold leading-tight truncate">UBTER Min Req: 75%</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-3.5 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs min-w-0 flex flex-col justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">At-Risk Students</p>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {weakStudents.filter((s) => s.riskLevel === 'High').length}
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('ai-diagnostics')}
                className="text-[11px] sm:text-xs text-amber-600 dark:text-amber-400 mt-2 font-bold hover:underline block text-left cursor-pointer truncate"
              >
                Review diagnostic plan →
              </button>
            </div>
          </div>

          {/* Department Breakdown */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Academic Branches at Uttarakhand Government Institute of Polytechnic
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {BRANCHES.map((b) => {
                const count = studentsList.filter((s) => s.branch === b.code).length;
                return (
                  <div
                    key={b.code}
                    className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300">
                        {b.code === 'CSE' ? <Laptop className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        {count} Enrolled
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">{b.name}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">HOD: {b.hodName}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 1. CLASS-WISE STUDENT MASTER DATABASE & SPREADSHEETS */}
      {activeTab === 'class-database' && (
        <div className="space-y-3">
          {/* Step 19: the old separate "Students" list is reached from here (photos, quick list) so the menu has one student entry */}
          <div className="flex justify-end"><button onClick={() => setActiveTab('students')} className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">Photos & quick list →</button></div>
          <ClassStudentDatabaseManager mode="admin" />
        </div>
      )}
      {/* Tab "logins" */}
      {activeTab === 'my-profile' && <MyProfileCard />}
      {activeTab === 'placement-tracker' && <PlacementTracker />}
      {activeTab === 'logins' && <PasswordCenter />}

      {/* AUTOMATIC YEAR-WISE ATTENDANCE ANALYSIS & TRENDS */}
      {activeTab === 'attendance-analysis' && (
        <YearwiseAttendanceAnalysis allowEdit={true} />
      )}

      {/* 2. ONLINE TESTS & ASSIGNMENTS WITH TIME REMINDER TRIGGER */}
      {activeTab === 'online-tests' && (
        <OnlineTestAssignmentManager mode="admin" />
      )}

      {/* 3. REAL-TIME DOUBT RESOLUTION & Q&A HUB */}
      {activeTab === 'doubt-resolution' && (
        <RealtimeDoubtResolutionHub mode="admin" />
      )}

      {/* CLASS & SUBJECT DISPATCHER */}
      {activeTab === 'class-dispatch' && <ClassSubjectDispatcher mode="admin" />}
      {/* Step 18 */}
      {activeTab === 'academic-year' && <div className="space-y-6"><ExamCalendar canEdit /><AcademicYearManager onChanged={refreshAcademic} /></div>}
      {/* Tab "board-results" */}
      {activeTab === 'board-results' && <BoardResultsManager />}
      {/* Tab "attendance-register" */}
      {activeTab === 'attendance-register' && <AttendanceRegister />}

      {/* STUDENTS DIRECTORY */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
              >
                <option value="all">All Branches</option>
                <option value="CSE">CSE</option>
                <option value="Civil">Civil</option>
              </select>
              <button
                onClick={() => setLoginMgr({})}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-4 h-4" /> Logins & Passwords
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase tracking-wider font-bold">
                    <th className="p-3.5">Student</th>
                    <th className="p-3.5">Roll No</th>
                    <th className="p-3.5">Branch & Semester</th>
                    <th className="p-3.5 font-bold text-amber-700 dark:text-amber-300">Login</th>
                    <th className="p-3.5">Attendance</th>
                    <th className="p-3.5">Contact</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            name={s.name}
                            avatar={s.avatar}
                            role={s.role}
                            size="sm"
                            editable={true}
                            onEditClick={() => setPhotoModalUser(s)}
                          />
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{s.name}</p>
                            <p className="text-[11px] text-slate-400">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-800 dark:text-slate-200">{s.rollNo}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          {s.branch}
                        </span>
                        <span className="ml-1.5 text-slate-600 dark:text-slate-300">Sem {s.semester}</span>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-amber-700 dark:text-amber-300">
                        <button
                          type="button"
                          onClick={() => setLoginMgr({ q: s.rollNo })}
                          className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 rounded-lg text-[11px] font-bold cursor-pointer border border-amber-200 dark:border-amber-800"
                        >
                          Login & password
                        </button>
                      </td>
                      <td className="p-3.5">
                        <span className={`font-bold ${(getAttendancePercent(s.id) ?? 0) >= 75 ? 'text-emerald-600' : getAttendancePercent(s.id) === null ? 'text-slate-400' : 'text-red-600'}`}>
                          {getAttendancePercent(s.id) === null ? '—' : `${getAttendancePercent(s.id)}%`}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500">{s.phone}</td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setPhotoModalUser(s)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg cursor-pointer"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteUser(s.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY ROSTER */}
      {activeTab === 'data-center' && <DataCenter mode="admin" />}
      {/* Tab "categories" */}
      {activeTab === 'categories' && <StudentCategoryRoster isFacultyView={false} />}

      {/* FACULTY DIRECTORY & ROLE MANAGEMENT (Admin-Only Safety First) */}
      {activeTab === 'faculty' && (
        <div className="space-y-4">
          <SubjectTeacherAssigner />
          <FacultyPermissionsPanel />
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>
                <strong>Safety First Rule Active:</strong> Only Principal & Administrator can add, modify credentials, or remove faculty members.
              </span>
            </div>
            <button
              onClick={() => setShowAddFacultyModal(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" /> Add New Faculty
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFaculty.map((fac) => (
              <div
                key={fac.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={fac.name}
                      avatar={fac.avatar}
                      role="faculty"
                      size="md"
                      editable={true}
                      onEditClick={() => setPhotoModalUser(fac)}
                    />
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{fac.name}</h4>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{fac.designation}</p>
                      <p className="text-[11px] text-slate-400">{fac.department} Department · {fac.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteUser(fac.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-xl cursor-pointer"
                    title="Remove Faculty Member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <FacultyCredentialEditor faculty={fac} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECURITY AUDIT LOGS */}
      {activeTab === 'security-audit' && <ActivityAuditLogViewer />}

      {/* STAFF GATE ATTENDANCE */}
      {activeTab === 'staff-attendance' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Faculty & Administrative Staff Attendance Ledger
              </h3>
              <p className="text-xs text-slate-500">Daily In/Out punches and gate scanner status.</p>
            </div>
            <button
              onClick={() => setShowFacultyPunchModal(true)}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Punch Staff Attendance
            </button>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase font-bold">
                  <th className="p-3.5">Staff Name</th>
                  <th className="p-3.5">Designation</th>
                  <th className="p-3.5">In Time</th>
                  <th className="p-3.5">Out Time</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {facultyList.map((staff) => {
                  const punch = getFacultyTodayPunch(staff.id);
                  return (
                    <tr key={staff.id}>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">{staff.name}</td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300">{staff.designation}</td>
                      <td className="p-3.5 font-mono text-emerald-600 font-semibold">{punch?.inTime || '—'}</td>
                      <td className="p-3.5 font-mono text-slate-500">{punch?.outTime || (punch?.inTime ? 'Active' : '—')}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${punch ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                          {punch ? punch.status : 'Not Punched'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CURRICULUM */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Academic Curriculum</h3>
            <button
              onClick={() => setShowAddSubjectModal(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Subject
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjects.map((sub) => (
              <div
                key={sub.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {sub.code}
                  </span>
                  <button
                    onClick={() => deleteSubject(sub.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">{sub.name}</h4>
                <p className="text-xs text-slate-500">Branch: {sub.branch} · Sem {sub.semester} · Faculty: {sub.facultyName}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab "timetable" */}
      {activeTab === 'timetable' && <TimetableModule allowEdit={true} />}

      {activeTab === 'syllabus' && <SyllabusViewer />}
      {/* Tab "practicals" */}
      {activeTab === 'practicals' && <PracticalLabManager isFacultyOrAdmin={true} />}
      {/* Tab "materials" */}
      {activeTab === 'materials' && <DocumentMaterialHub mode="admin" />}
      {/* Tab "placements" */}
      {activeTab === 'placements' && <InternshipPlacementPortal allowPost={true} />}
      {/* Tab "performance-analytics" */}
      {activeTab === 'performance-analytics' && <StudentPerformanceAnalyticsDashboard />}
      {/* Tab "quiz-drill" */}
      {activeTab === 'quiz-drill' && <AIQuizDrillAndAnalytics />}
      {/* Tab "achievements" */}
      {activeTab === 'achievements' && <AchievementsGallery allowNominate={true} />}
      {/* Tab "news" */}
      {activeTab === 'news' && <CollegeNewsSection allowPublish={true} />}

      {/* PAPERS */}
      {activeTab === 'papers' && <QuestionPapersHub />}

      {/* AI DIAGNOSTICS */}
      {activeTab === 'ai-diagnostics' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
            <h3 className="font-extrabold text-lg sm:text-xl flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-300" />
              AI Academic Performance & Weak-Student Diagnoser
            </h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="Ask AI: Kaunsa student kis subject mein weak hai? Remedial plan..."
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-xs sm:text-sm text-white placeholder:text-purple-200/60 focus:outline-none"
              />
              <button
                onClick={() => handleRunAiDiagnostic()}
                disabled={isAiLoading}
                className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg cursor-pointer disabled:opacity-50"
              >
                {isAiLoading ? 'Analyzing Data...' : 'Run AI Analysis'}
              </button>
            </div>
          </div>
          {aiResponse && (
            <div className="bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-900/60 rounded-2xl p-6 shadow-md space-y-4">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" /> AI Diagnostic Output
              </h4>
              <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-sans">
                {aiResponse}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddStudentModal
        isOpen={showAddStudentModal}
        onClose={() => setShowAddStudentModal(false)}
        creatorRole="admin"
      />

      {showAddFacultyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Add New Faculty Member</h3>
            <form onSubmit={handleCreateFaculty} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Faculty Name *</label>
                <input
                  type="text"
                  required
                  value={newFaculty.name}
                  onChange={(e) => setNewFaculty({ ...newFaculty, name: e.target.value })}
                  placeholder="e.g. Er. Meenakshi Bhatt"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Official Email *</label>
                <input
                  type="email"
                  required
                  value={newFaculty.email}
                  onChange={(e) => setNewFaculty({ ...newFaculty, email: e.target.value })}
                  placeholder="meenakshi@ugip.gov.in"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Department</label>
                  <select
                    value={newFaculty.department}
                    onChange={(e) => setNewFaculty({ ...newFaculty, department: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  >
                    <option value="CSE">CSE</option>
                    <option value="Civil">Civil</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Login Password</label>
                  <p className="p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-[11px] text-slate-500">
                    A temporary password is generated when you save, and shown once.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFacultyModal(false)}
                  className="px-4 py-2 text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl"
                >
                  Save Faculty
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Add Subject</h3>
            <form onSubmit={handleCreateSubject} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  value={newSubjectForm.name}
                  onChange={(e) => setNewSubjectForm({ ...newSubjectForm, name: e.target.value })}
                  placeholder="e.g. Operating Systems"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Subject Code *</label>
                <input
                  type="text"
                  required
                  value={newSubjectForm.code}
                  onChange={(e) => setNewSubjectForm({ ...newSubjectForm, code: e.target.value })}
                  placeholder="e.g. CS-401"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSubjectModal(false)}
                  className="px-4 py-2 text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddPaperModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Upload Question Paper</h3>
            <form onSubmit={handleCreatePaper} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Paper Title</label>
                <input
                  type="text"
                  required
                  value={newPaperForm.title}
                  onChange={(e) => setNewPaperForm({ ...newPaperForm, title: e.target.value })}
                  placeholder="e.g. UBTER Dec 2024 - Computer Networks"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPaperModal(false)}
                  className="px-4 py-2 text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl"
                >
                  Publish Paper
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PaperPreviewModal
        paper={previewPaper}
        isOpen={!!previewPaper}
        onClose={() => setPreviewPaper(null)}
      />
      <FacultyPunchModal
        isOpen={showFacultyPunchModal}
        onClose={() => setShowFacultyPunchModal(false)}
      />
      <StudentQRScannerModal
        isOpen={showStudentScannerModal}
        onClose={() => setShowStudentScannerModal(false)}
        scannerRole="admin"
        facultyName="Admin Officer"
      />
      <PhotoUploadModal
        isOpen={!!photoModalUser}
        onClose={() => setPhotoModalUser(null)}
        targetUser={photoModalUser || undefined}
      />
      <MySQLSchemaViewerModal
        isOpen={showMySQLModal}
        onClose={() => setShowMySQLModal(false)}
      />
      </div>
      </div>

      {/* MOBILE ALL-TABS SLIDE-OVER DRAWER MODAL */}
      {mobileMenuOpen && (
        <div className={`fixed inset-0 z-50 flex items-end ${forceMobileView ? '' : 'sm:hidden'} bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150`}>
          <div className="w-full bg-white dark:bg-slate-900 rounded-t-3xl max-h-[85vh] flex flex-col border-t border-slate-200 dark:border-slate-800 shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Drawer Drag handle & Header */}
            <div className="p-4 pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span>📱 एडमिन पोर्टल मेनू</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {adminNavTabs.length} ऑप्शन्स
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Chief Administrator • 28 Full Management Tools
                  </p>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setMenuSearchQuery('');
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Instant Search Bar inside Drawer */}
              <div className="relative mt-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={menuSearchQuery}
                  onChange={(e) => setMenuSearchQuery(e.target.value)}
                  placeholder="🔍 कोई भी विकल्प खोजें / Search 28 options..."
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {menuSearchQuery && (
                  <button
                    onClick={() => setMenuSearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable List of Tabs grouped by category or search results */}
            <div className="overflow-y-auto p-4 pb-20 space-y-4 flex-1">
              {menuSearchQuery.trim() ? (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                    Matching Options ({adminNavTabs.filter((t) => t.label.toLowerCase().includes(menuSearchQuery.toLowerCase())).length})
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {adminNavTabs
                      .filter((t) => t.label.toLowerCase().includes(menuSearchQuery.toLowerCase()))
                      .map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id || (tab.id === 'class-database' && activeTab === 'students');
                        return (
                          <button
                            key={tab.id}
                            onClick={() => {
                              handleSwitchTab(tab.id);
                              setMenuSearchQuery('');
                            }}
                            className={`w-full p-3 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                              isActive
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
                              <span className="truncate">{tab.label}</span>
                            </div>
                            {tab.badge && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0 ${
                                isActive ? 'bg-blue-500 text-white' : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                              }`}>
                                {tab.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>
              ) : (
                ['Core Admin', 'Students', 'Academics & Exams', 'Attendance', 'Data & Access', 'Faculty', 'Placement', 'Security'].map((cat) => {
                  const catTabs = adminNavTabs.filter((t) => t.category === cat);
                  if (catTabs.length === 0) return null;
                  const catLabel =
                    cat === 'Core Admin'
                      ? '⚙️ कॉलेज एडमिनिस्ट्रेशन (Core Admin)'
                      : cat === 'Students'
                      ? '👥 छात्र डेटाबेस व एनालिटिक्स (150 Students)'
                      : cat === 'Academics & Exams'
                      ? '📚 परीक्षा, सिलेबस एवं क्वेश्चन पेपर्स (50M)'
                      : cat === 'Attendance'
                      ? '📊 उपस्थिति व अटेंडेंस रजिस्टर (Attendance)'
                      : cat === 'Data & Access'
                      ? '📁 डेटा सेंटर, एक्सेल व लॉगिन पासवर्ड्स'
                      : cat === 'Faculty'
                      ? '👨‍🏫 फैकल्टी कंट्रोल व असाइनमेंट'
                      : cat === 'Placement'
                      ? '💼 प्लेसमेंट हब, रिज्यूमे एवं अचीवमेंट्स'
                      : '🔒 सिक्यूरिटी एवं ऑडिट लॉग्स';

                  return (
                    <div key={cat} className="space-y-1.5">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                        {catLabel}
                      </div>
                      <div className="grid grid-cols-1 gap-1">
                        {catTabs.map((tab) => {
                          const Icon = tab.icon;
                          const isActive = activeTab === tab.id || (tab.id === 'class-database' && activeTab === 'students');
                          return (
                            <button
                              key={tab.id}
                              onClick={() => {
                                handleSwitchTab(tab.id);
                                setMenuSearchQuery('');
                              }}
                              className={`w-full p-3 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
                                <span className="truncate">{tab.label}</span>
                              </div>
                              {tab.badge && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0 ${
                                  isActive
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
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
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MOBILE STICKY BOTTOM NAVIGATION BAR */}
      <nav aria-label="Admin Mobile Navigation" className={`fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around ${forceMobileView ? 'flex' : 'sm:hidden'} shadow-lg`}>
        <button
          onClick={() => handleSwitchTab('overview')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
            activeTab === 'overview' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>होम</span>
        </button>
        <button
          onClick={() => handleSwitchTab('class-database')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
            activeTab === 'class-database' || activeTab === 'students' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>छात्र 150</span>
        </button>
        <button
          onClick={() => handleSwitchTab('attendance-register')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
            activeTab === 'attendance-register' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>हाजिरी</span>
        </button>
        <button
          onClick={() => handleSwitchTab('papers')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
            activeTab === 'papers' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>पेपर्स</span>
        </button>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-bold text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
        >
          <div className="w-4 h-4 flex items-center justify-center">
            <Menu className="w-4 h-4" />
          </div>
          <span>मेनू ({adminNavTabs.length})</span>
        </button>
      </nav>
    </div>
  );
};
