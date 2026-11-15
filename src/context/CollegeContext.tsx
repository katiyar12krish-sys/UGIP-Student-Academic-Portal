// ===================================================================================================
// Shared state for the whole browser app (React context).
// Loads from the server: the signed-in user, subjects, exams + marks, attendance, online tests, notices,
// doubts, dispatches, notifications; offers the actions every screen uses (create exam, save marks,
// open attendance...). A few small things (language, theme, timetable) are still kept in the browser.
// ===================================================================================================
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { authApi, signInIncomplete, type AuthUser } from '../services/authApi';
import { useServerNotifications } from '../services/serverNotifications';
import { academicApi } from '../services/academicApi';
import {
  UserProfile,
  Role,
  BranchCode,
  Subject,
  TestExam,
  AttendanceSession,
  PreviousYearPaper,
  NoticeAnnouncement,
  StudentWeaknessAnalysis,
  StudentTestMark,
  DispatchedMaterial,
  DispatchedSubmission,
  ActivityLog,
  FacultyAttendancePunch,
  AppNotification,
  NotificationCategory,
  NotificationPriority,
  AppTheme,
  ConsolidatedStudentMarksRow,
  PracticalExperiment,
  TimetableSlot,
  PlacementDrive,
  GovernmentPrivateJob,
  SharedExperience,
  SubjectOnlineQuiz,
  StudentQuizAttempt,
  StudentProgressGraphPoint,
  MockInterviewSession,
  QnAQuestionItem,
  QnASessionRecord,
  QnADailyPerformance,
  DirectStudentNotice,
  StudentDoubtTicket,
  OnlineTestAssignment,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_SUBJECTS,
  INITIAL_TESTS,
  INITIAL_ATTENDANCE_SESSIONS,
  INITIAL_PAPERS,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_FACULTY_PUNCHES,
  INITIAL_PRACTICALS,
  INITIAL_TIMETABLE_SLOTS,
} from '../data/mockData';
import {
  INITIAL_PLACEMENT_DRIVES,
  INITIAL_GOVT_PRIVATE_JOBS,
  INITIAL_SHARED_EXPERIENCES,
  INITIAL_STUDENT_PROGRESS_POINTS,
} from '../data/placementData';
import { assignmentsApi, type NewOnlineTest, type SubmitResponse, type RemindResponse } from '../services/assignmentsApi';
import type { ApiResult } from '../services/academicApi';
import { useStudentSync } from '../services/studentSync';
import { dispatchApi, type DispatchView, type DispatchInput, type SubmissionInput } from '../services/dispatchApi';
import { noticesApi, directNoticesApi, doubtsApi, type NoticeInput, type DoubtInput, type ActionResult } from '../services/commsApi';
import { SupportedLanguage, TRANSLATIONS, TranslationDictionary } from '../utils/translations';
import { uiAlert } from '../components/common/ui/feedback';   // Step 18: styled message instead of the browser's alert box
import { useServerList } from '../services/recordsSync';   // Step 20: lists saved in the database

// Simple deterministic hash generator for security audit logs
const generateAuditHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `sha256:${hex}${Date.now().toString(16)}`;
};

// Data shape: college context type.
interface CollegeContextType {
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  switchRole: (role: Role, specificUserId?: string) => void;
  users: UserProfile[];
  addUser: (user: Omit<UserProfile, 'id'>) => void;
  updateUser: (id: string, updates: Partial<UserProfile>) => void;
  deleteUser: (id: string) => void;

  // Multi-Language i18n
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: TranslationDictionary;

  // Dark Mode Theme
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;

  // Real-Time Notifications
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearAllNotifications: () => void;
  activeToast: AppNotification | null;
  dismissToast: () => void;
  broadcastLiveAlert: (title: string, message: string, category?: NotificationCategory, priority?: NotificationPriority) => void;
  soundEnabled: boolean;
  toggleSound: () => void;

  // Subjects & Curriculum
  subjects: Subject[];
  addSubject: (subject: Omit<Subject, 'id'>) => Promise<boolean>;
  updateSubject: (id: string, updates: Partial<Subject>) => Promise<boolean>;
  deleteSubject: (id: string) => Promise<boolean>;

  // Class & Subject Dispatched Materials (Replacing generic notes assignment)
  dispatchedMaterials: DispatchView[];
  dispatchMaterialToClass: (data: DispatchInput) => Promise<ActionResult>;
  submitToDispatchedMaterial: (materialId: string, submission: SubmissionInput) => Promise<ActionResult>;
  gradeDispatchedSubmission: (materialId: string, submissionId: string, marks: number, feedback: string) => Promise<ActionResult>;
  deleteDispatchedMaterial: (materialId: string) => Promise<ActionResult>;

  // Consolidated Marks & Excel Export
  getConsolidatedMarksData: (branch?: string, semester?: number | 'all', examType?: string) => ConsolidatedStudentMarksRow[];
  exportAllStudentMarksToCSV: (branch?: string, semester?: number | 'all', examType?: string) => void;

  // Tests & Marks
  tests: TestExam[];
  createTest: (test: Omit<TestExam, 'id'>) => Promise<boolean>;
  updateTestMarks: (testId: string, results: StudentTestMark[]) => Promise<boolean>;
  updateSingleStudentMark: (testId: string, studentId: string, updated: Partial<StudentTestMark>) => Promise<boolean>;
  deleteSingleStudentMark: (testId: string, studentId: string) => Promise<boolean>;
  deleteTest: (testId: string) => Promise<boolean>;

  // Attendance Sessions & QR Code
  attendanceSessions: AttendanceSession[];
  createAttendanceSession: (session: Omit<AttendanceSession, 'id' | 'records' | 'status' | 'qrToken' | 'pinCode' | 'expiresAt'>) => Promise<AttendanceSession | null>;
  closeAttendanceSession: (sessionId: string) => Promise<void>;
  markAttendance: (tokenOrPin: string, studentId: string) => Promise<{ success: boolean; message: string; session?: AttendanceSession }>;
  manualUpdateAttendance: (sessionId: string, studentId: string, status: 'Present' | 'Absent' | 'Late') => Promise<boolean>;
  markStudentByFacultyScan: (studentQRData: string, sessionId?: string) => Promise<{ success: boolean; message: string; student?: UserProfile; session?: AttendanceSession }>;
  refreshAcademic: () => Promise<void>;
  /** Step 18: reload lists from the server after an item was edited or deleted somewhere. */
  reloadNotices: () => Promise<void>;
  reloadDirectAndDoubts: () => Promise<void>;
  reloadDispatches: () => Promise<void>;
  // Overall attendance % from real attendance records (null = no classes recorded yet; never an invented number)
  getAttendancePercent: (studentId: string) => number | null;
  getAttendanceCounts: (studentId: string) => { total: number; attended: number; percent: number | null };
  attendanceSummary: Record<string, { total: number; attended: number; percent: number | null }>;

  // Faculty Attendance Punch
  facultyPunches: FacultyAttendancePunch[];
  punchFacultyAttendance: (facultyId: string, method?: 'QR Scan' | 'Staff Badge' | 'Biometric' | 'Manual', location?: string) => { success: boolean; message: string; punch?: FacultyAttendancePunch };
  getFacultyTodayPunch: (facultyId: string) => FacultyAttendancePunch | undefined;

  // Papers & Notices
  papers: PreviousYearPaper[];
  addPaper: (paper: Omit<PreviousYearPaper, 'id' | 'downloadCount'>) => void;
  deletePaper: (id: string) => void;
  incrementPaperDownload: (id: string) => void;

  notices: NoticeAnnouncement[];
  addNotice: (notice: NoticeInput) => Promise<ActionResult>;
  deleteNotice: (id: string) => Promise<ActionResult>;

  // Activity Logs (Audit Trail with SHA-256 hash)
  activityLogs: ActivityLog[];
  logActivity: (action: string, details: string) => void;

  // Practical Experiments
  practicalExperiments: PracticalExperiment[];
  addPracticalExperiment: (exp: Omit<PracticalExperiment, 'id'>) => void;
  deletePracticalExperiment: (id: string) => void;

  // Timetable Slots
  timetableSlots: TimetableSlot[];
  addTimetableSlot: (slot: Omit<TimetableSlot, 'id'>) => void;
  deleteTimetableSlot: (id: string) => void;

  // 2026 Placement & Career Hub
  placementDrives: PlacementDrive[];
  addPlacementDrive: (drive: Omit<PlacementDrive, 'id'>) => void;
  updatePlacementDrive: (id: string, updates: Partial<PlacementDrive>) => void;
  deletePlacementDrive: (id: string) => void;

  // Year-round Government & Private Jobs for Diploma CSE & Civil
  govtPrivateJobs: GovernmentPrivateJob[];
  addGovtPrivateJob: (job: Omit<GovernmentPrivateJob, 'id'>) => void;
  updateGovtPrivateJob: (id: string, updates: Partial<GovernmentPrivateJob>) => void;
  deleteGovtPrivateJob: (id: string) => void;

  // Password verification for administrative changes in Placement/Jobs
  verifyAdminOrFacultyPassword: (password: string) => Promise<boolean>;
  // Server login session
  authUser: AuthUser | null;
  authReady: boolean;
  login: (username: string, password: string, role: Role, subjectId?: string) => Promise<{ ok: true; user: AuthUser } | { ok: 'mfa'; challenge: string } | { ok: false; error: string }>;
  loginMfa: (challenge: string, code: string) => Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }>;
  refreshAuthUser: () => Promise<AuthUser | null>;   // re-read who the server says is logged in (after MFA setup / consent)
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ ok: true } | { ok: false; error: string }>;

  // Alumni & Student Community - Share Your Experience
  sharedExperiences: SharedExperience[];
  addSharedExperience: (exp: Omit<SharedExperience, 'id' | 'createdAt' | 'likes'>) => void;
  likeSharedExperience: (id: string) => void;

  // Subject Online Quizzes
  onlineQuizzes: SubjectOnlineQuiz[];
  addOnlineQuiz: (quiz: Omit<SubjectOnlineQuiz, 'id' | 'createdAt'>) => void;
  deleteOnlineQuiz: (id: string) => void;
  quizAttempts: StudentQuizAttempt[];
  submitQuizAttempt: (attempt: Omit<StudentQuizAttempt, 'id' | 'date'>) => void;

  // Multi-Student Progress Graph Points
  studentProgressPoints: StudentProgressGraphPoint[];
  addStudentProgressPoint: (point: StudentProgressGraphPoint) => void;

  // Faculty/Admin Edit Student Phone Number
  updateStudentPhone: (studentId: string, phone: string) => void;

  // Password Reset with Mobile SMS OTP Verification
  requestPasswordResetOTP: (identifier: string) => { success: boolean; message: string; maskedPhone?: string; debugOTP?: string };
  verifyOTPAndResetPassword: (identifier: string, otp: string, newPassword: string) => { success: boolean; message: string };

  // Placement Mock Interviews
  mockInterviews: MockInterviewSession[];
  saveMockInterview: (interview: Omit<MockInterviewSession, 'id' | 'timestamp'>) => void;

  // Admin Master Impersonation & Session Tracking
  isAdminSessionActive: boolean;
  setIsAdminSessionActive: (active: boolean) => void;
  returnToAdminPortal: () => void;

  // Analytics Helpers
  getStudentAttendanceStats: (studentId: string) => { overallPercent: number; totalClasses: number; attendedClasses: number; subjectWise: { subjectName: string; subjectCode: string; total: number; attended: number; percent: number }[] };
  getStudentAcademicSummary: (studentId: string) => { avgMarksPercent: number; passedTestsCount: number; weakSubjectCount: number; pendingSubmissionsCount: number };
  getStudentSummary: (studentId: string) => { overallAttendance: number; avgMarksPercent: number; passedTestsCount: number; weakSubjectCount: number; pendingSubmissionsCount: number; totalClasses: number; attendedClasses: number };
  getWeakStudentsAnalysis: () => StudentWeaknessAnalysis[];

  // Direct Targeted One-on-One Notice for a Specific Student
  directNotices: DirectStudentNotice[];
  sendDirectStudentNotice: (notice: Omit<DirectStudentNotice, 'id' | 'sentAt' | 'isRead'>) => Promise<ActionResult>;
  markDirectNoticeAsRead: (id: string) => void;

  // Real-Time Doubt Resolution & Q&A
  studentDoubtTickets: StudentDoubtTicket[];
  askStudentDoubt: (doubt: DoubtInput) => Promise<ActionResult>;
  replyToDoubt: (doubtId: string, replyText: string) => Promise<ActionResult>;
  resolveDoubt: (doubtId: string) => Promise<ActionResult>;

  // Trackable Student Record Status
  updateStudentRecordStatus: (studentId: string, status: NonNullable<UserProfile['recordStatus']>, remarks?: string) => void;   // Step 18: includes Passed Out / Detained / Year Back / Left
  deleteStudent: (studentId: string) => void;

  // Class-wise Excel / CSV Generation
  generateClassExcelCSV: (year: 1 | 2 | 3 | 'all', branch: BranchCode | 'all') => string;
  downloadClassExcelCSV: (year: 1 | 2 | 3 | 'all', branch: BranchCode | 'all') => void;

  // Online Test & Timed Assignment with targeted notification to unsubmitted students
  onlineTestAssignments: OnlineTestAssignment[];
  // These live on the server: it checks the subject-wise rule, grades answers, keeps the answer key from students and sends the deadline reminders.
  createOnlineTestAssignment: (test: NewOnlineTest) => Promise<boolean>;
  fetchOnlineTestQuestions: (testId: string) => Promise<ApiResult<{ questions: { question: string; options: string[] }[] }>>;
  submitOnlineTest: (testId: string, answers: (number | null)[]) => Promise<ApiResult<SubmitResponse>>;
  sendDeadlineAlertToUnsubmittedStudents: (testId: string) => Promise<RemindResponse | null>;

  // Reset
  resetDatabase: () => void;
}

const CollegeContext = createContext<CollegeContextType | null>(null);

const STORAGE_KEYS = {
  CURRENT_USER: 'ugip_curr_user_v8',
  USERS: 'ugip_users_v9',
  SUBJECTS: 'ugip_subjects_v8',
  TESTS: 'ugip_tests_v8',
  ATTENDANCE: 'ugip_attendance_v8',
  FACULTY_PUNCHES: 'ugip_faculty_punches_v8',
  PAPERS: 'ugip_papers_v8',
  NOTICES: 'ugip_notices_v8',
  DIRECT_NOTICES: 'ugip_direct_notices_v8',
  DOUBT_TICKETS: 'ugip_doubt_tickets_v8',
  LOGS: 'ugip_logs_v8',
  LANGUAGE: 'ugip_language_pref_v1',
  THEME: 'ugip_theme_pref_v1',
  NOTIFICATIONS: 'ugip_notifications_v1',
};

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'UBTER Examination Schedule Released',
    message: 'Uttarakhand Board of Technical Education Roorkee has released the diploma semester datesheet.',
    category: 'exam',
    priority: 'urgent',
    timestamp: '10:00 AM',
    isRead: false,
  },
  {
    id: 'notif-2',
    title: 'Class Material Dispatched: CS-501',
    message: 'Er. Jitendra Parsad dispatched Unit 3 REST API notes to CSE 3rd Year (Sem 5).',
    category: 'academic',
    priority: 'high',
    timestamp: '10:15 AM',
    isRead: false,
  },
  {
    id: 'notif-3',
    title: 'Security Audit & Encrypted Vault',
    message: 'Institutional database encrypted with AES-256 storage simulation and SHA-256 audit log tracking.',
    category: 'system',
    priority: 'normal',
    timestamp: '09:30 AM',
    isRead: true,
  },
];


// Merge server subjects.
function mergeServerSubjects(local: Subject[], server: import('../services/academicApi').ServerSubject[]): Subject[] {
  const byId = new Map(local.map((s) => [s.id, s]));
  const merged = server.map((sv) => {
    const cur = byId.get(sv.id);
    const core = { code: sv.code, name: sv.name, branch: sv.branch as any, semester: sv.semester as any, year: sv.year as any, credits: sv.credits, hasPractical: sv.hasPractical, facultyId: sv.facultyId, facultyName: sv.facultyName };
    return cur ? { ...cur, ...core } : { id: sv.id, importantTopics: [], syllabusUnits: [], ...core };
  });
  const serverIds = new Set(server.map((x) => x.id));
  return [...merged, ...local.filter((s) => !serverIds.has(s.id))];   // keep local-only subjects (admin can import them)
}

// Profile from auth.
function profileFromAuth(a: AuthUser): UserProfile {
  return {
    id: a.id, name: a.name, email: a.email || '', role: a.role, username: a.username, phone: a.phone || undefined,
    department: (a.department || undefined) as any, designation: a.designation || undefined, assignedSubjectIds: a.subjectIds,
    avatar: a.photoUrl || '',
  } as UserProfile;
}

// Screen part: college provider.
export const CollegeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Multi-Language state
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    if (saved === 'hi' || saved === 'en') return saved;   // an old saved 'ur' falls back to English
    return 'en';
  });

  const t = useMemo(() => TRANSLATIONS[language] || TRANSLATIONS.en, [language]);

  // Set language.
  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
  };

  // Dark Mode Theme state
  const [theme, setThemeState] = useState<AppTheme>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
    return 'light';
  });

  // Apply theme to dom.
  const applyThemeToDOM = useCallback((newTheme: AppTheme) => {
    const root = document.documentElement;
    const isDark =
      newTheme === 'dark' ||
      (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  // Set theme.
  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    applyThemeToDOM(newTheme);
  };

  // Toggle theme.
  const toggleTheme = () => {
    const nextTheme: AppTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  // Runs automatically whenever these change: theme, applyThemeToDOM.
  useEffect(() => {
    applyThemeToDOM(theme);
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    // Runs when the user does this on screen: change.
    const handleChange = () => {
      if (theme === 'system') applyThemeToDOM('system');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyThemeToDOM]);

  // Notifications state
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_NOTIFICATIONS;
  });

  // Which toast is open right now
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  // Sound enabled (kept in screen state)
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Toggle sound.
  const toggleSound = () => setSoundEnabled((prev) => !prev);

  // Play chime.
  const playChime = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {}
  }, [soundEnabled]);

  // Add notification.
  const addNotification = useCallback(
    (notif: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>) => {
      const newNotif: AppNotification = {
        ...notif,
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isRead: false,
      };
      setNotifications((prev) => [newNotif, ...prev.slice(0, 49)]);
      setActiveToast(newNotif);
      playChime();
    },
    [playChime]
  );

  // Dismiss toast.
  const dismissToast = () => setActiveToast(null);

  // A student save the server refused (e.g. mistyped Aadhaar, duplicate roll number): tell the person instead of failing silently.
  useEffect(() => {
    // Called when: rejected.
    const onRejected = (e: Event) => {
      const d = (e as CustomEvent).detail as { message?: string } | undefined;
      addNotification({
        title: 'Student record not saved',
        message: `${d?.message || 'The server did not accept this record'}. Open the record, correct it and save again.`,
        category: 'system', priority: 'high',
      });
    };
    window.addEventListener('ugip-sync-rejected', onRejected);
    return () => window.removeEventListener('ugip-sync-rejected', onRejected);
  }, [addNotification]);

  // Runs automatically whenever these change: activeToast.
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [activeToast]);

  // Mark notification as read.
  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  // Mark all notifications as read.
  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  // Clear all notifications.
  const clearAllNotifications = () => {
    setNotifications([]);
    setActiveToast(null);
  };

  const broadcastLiveAlert = (
    title: string,
    message: string,
    category: NotificationCategory = 'circular',
    priority: NotificationPriority = 'high'
  ) => {
    addNotification({ title, message, category, priority, targetRole: 'all' });
  };

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  // Runs automatically whenever these change: notifications.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  // Activity Logs state (Audit Trail with cryptographic hash)
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);   // Step 20: kept in the database table for "activity_logs" (see useServerList below)


  // Users State (with saved student passwords and admin-only faculty control)
  const [users, setUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!saved) return INITIAL_USERS;
    try {
      const parsed: UserProfile[] = JSON.parse(saved);
      // Guarantee Anurag Mourya and new class records are present
      return parsed.map((user) => {
        const init = INITIAL_USERS.find((u) => u.id === user.id);
        const hasUserUploadedPhoto = user.avatar && (user.avatar.startsWith('data:image/') || user.avatar.startsWith('/api/photos/'));
        return {
          ...user,
          avatar: hasUserUploadedPhoto ? user.avatar : '',
          username: user.username || init?.username,
          password: undefined,         // passwords now live only on the server (hashed)
          studentPassword: undefined,
        };
      });
    } catch {
      return INITIAL_USERS;
    }
  });

  // ---- Server login session (HttpOnly cookie). The browser only keeps the profile, never a password. ----
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  // Auth ready (kept in screen state)
  const [authReady, setAuthReady] = useState(false);
  // Step 4: exam reminders, new marks and attendance alerts from the server appear in the bell and toast
  useServerNotifications(authUser && !signInIncomplete(authUser) ? authUser.id : undefined, addNotification);
  // Runs once when this part of the screen opens.
  useEffect(() => {
    let alive = true;
    authApi.me().then((r) => {
      if (!alive) return;
      setAuthUser(r.ok ? r.data.user : null);
      setAuthReady(true);
    });
    return () => { alive = false; };
  }, []);

  // Login.
  const login: CollegeContextType['login'] = async (username, password, role, subjectId) => {
    const r = await authApi.login(username, password, role, subjectId);
    if (!r.ok) return { ok: false, error: r.error };
    if (r.data.mfaRequired && r.data.challenge) return { ok: 'mfa', challenge: r.data.challenge };   // password right, code still needed
    setAuthUser(r.data.user!);
    return { ok: true, user: r.data.user! };
  };
  // Login mfa.
  const loginMfa: CollegeContextType['loginMfa'] = async (challenge, code) => {
    const r = await authApi.loginMfa(challenge, code);
    if (!r.ok) return { ok: false, error: r.error };
    setAuthUser(r.data.user);
    return { ok: true, user: r.data.user };
  };
  // Loads auth user from the server.
  const refreshAuthUser = async () => {
    const me = await authApi.me();
    const u = me.ok ? me.data.user : null;
    if (me.ok) setAuthUser(u);
    return u;
  };
  // Logout.
  const logout = async () => {
    await authApi.logout();
    setAuthUser(null);
    setIsAdminSessionActiveState(false);
  };
  // Change password.
  const changePassword: CollegeContextType['changePassword'] = async (currentPassword, newPassword) => {
    const r = await authApi.changePassword(currentPassword, newPassword);
    if (!r.ok) return { ok: false, error: r.error };
    const me = await authApi.me();
    if (me.ok) setAuthUser(me.data.user);
    return { ok: true };
  };

  const syncAuth = authUser && !signInIncomplete(authUser) && authUser.role !== 'parent'
    ? { id: authUser.id, role: authUser.role, studentId: authUser.studentId }
    : null;

  // Students are mirrored to the server database (data/portal.db) with an offline queue
  useStudentSync(users, setUsers, syncAuth);

  // Current user (kept in screen state)
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (saved) {
      try {
        const user = JSON.parse(saved);
        const hasUserUploadedPhoto = user.avatar && (user.avatar.startsWith('data:image/') || user.avatar.startsWith('/api/photos/'));
        return { ...user, avatar: hasUserUploadedPhoto ? user.avatar : '' };
      } catch (e) {}
    }
    return INITIAL_USERS[0]; // Admin by default
  });

  // List of subjects shown on this screen
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
    return saved ? JSON.parse(saved) : INITIAL_SUBJECTS;
  });

  // Class & subject dispatch lives on the server (Step 10). It is loaded after login and never written to the browser.
  const [dispatchedMaterials, setDispatchedMaterials] = useState<DispatchView[]>([]);

  // Exams, marks and attendance live on the server. They are loaded after login and never written to the browser.
  const [tests, setTests] = useState<TestExam[]>([]);
  // List of online test assignments shown on this screen
  const [onlineTestAssignments, setOnlineTestAssignments] = useState<OnlineTestAssignment[]>([]);   // from the server (Step 7)
  // List of attendance sessions shown on this screen
  const [attendanceSessions, setAttendanceSessions] = useState<AttendanceSession[]>([]);
  // Attendance summary (kept in screen state)
  const [attendanceSummary, setAttendanceSummary] = useState<Record<string, { total: number; attended: number; percent: number | null }>>({});
  const roleRef = useRef<string | undefined>(undefined);
  roleRef.current = authUser?.role;

  // List of faculty punches shown on this screen
  const [facultyPunches, setFacultyPunches] = useState<FacultyAttendancePunch[]>([]);   // Step 20: kept in the database table for "staff_attendance" (see useServerList below)

  // List of papers shown on this screen
  const [papers, setPapers] = useState<PreviousYearPaper[]>([]);   // Step 20: kept in the database table for "question_papers" (see useServerList below)

  // List of notices shown on this screen
  const [notices, setNotices] = useState<NoticeAnnouncement[]>([]);   // from the server (Step 8): see the NOTICES block below

  // List of practical experiments shown on this screen
  const [practicalExperiments, setPracticalExperiments] = useState<PracticalExperiment[]>(() => {
    const saved = localStorage.getItem('ugip_practicals_v7');
    return saved ? JSON.parse(saved) : INITIAL_PRACTICALS;
  });

  // List of timetable slots shown on this screen
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);   // Step 20: kept in the database table for "timetable" (see useServerList below)

  // 2026 Placement Drives
  const [placementDrives, setPlacementDrives] = useState<PlacementDrive[]>(() => {
    const saved = localStorage.getItem('ugip_placements_v9');
    return saved ? JSON.parse(saved) : INITIAL_PLACEMENT_DRIVES;
  });

  // Year-round Government & Private Jobs for Diploma CSE & Civil
  const [govtPrivateJobs, setGovtPrivateJobs] = useState<GovernmentPrivateJob[]>(() => {
    const saved = localStorage.getItem('ugip_govt_jobs_v8');
    return saved ? JSON.parse(saved) : INITIAL_GOVT_PRIVATE_JOBS;
  });

  // Shared Alumni & Student Experiences
  const [sharedExperiences, setSharedExperiences] = useState<SharedExperience[]>([]);   // Step 20: kept in the database table for "shared_experiences" (see useServerList below)

  // Subject Online Quizzes
  const [onlineQuizzes, setOnlineQuizzes] = useState<SubjectOnlineQuiz[]>([]);   // Step 20: kept in the database table for "practice_quizzes" (see useServerList below)

  // List of quiz attempts shown on this screen
  const [quizAttempts, setQuizAttempts] = useState<StudentQuizAttempt[]>([]);   // Step 20: kept in the database table for "quiz_attempts" (see useServerList below)

  // Multi-Student Progress Graph Points (Day 1 vs Day 2 vs Day 3)
  const [studentProgressPoints, setStudentProgressPoints] = useState<StudentProgressGraphPoint[]>([]);   // Step 20: kept in the database table for "progress_points" (see useServerList below)

  // Placement Mock Interviews
  const [mockInterviews, setMockInterviews] = useState<MockInterviewSession[]>([]);   // Step 20: kept in the database table for "mock_interviews" (see useServerList below)

  // ---- Step 20: these lists are now kept in the DATABASE (server/routes/records.ts), not in this browser ----
  // useServerList loads each list after sign-in and saves every add / change / delete back to its table.
  const signedInForRecords = !!authUser && !signInIncomplete(authUser);
  useServerList('activity_logs', activityLogs, setActivityLogs, signedInForRecords, { keepRemoved: true });   // history is never deleted
  useServerList('staff_attendance', facultyPunches, setFacultyPunches, signedInForRecords);
  useServerList('question_papers', papers, setPapers, signedInForRecords);
  useServerList('timetable', timetableSlots, setTimetableSlots, signedInForRecords);
  useServerList('shared_experiences', sharedExperiences, setSharedExperiences, signedInForRecords);
  useServerList('practice_quizzes', onlineQuizzes, setOnlineQuizzes, signedInForRecords);
  useServerList('quiz_attempts', quizAttempts, setQuizAttempts, signedInForRecords);
  useServerList('progress_points', studentProgressPoints, setStudentProgressPoints, signedInForRecords);
  useServerList('mock_interviews', mockInterviews, setMockInterviews, signedInForRecords);

  // Active Mobile SMS OTP Map for Password Reset

  // Runs automatically whenever these change: placementDrives.
  useEffect(() => {
    localStorage.setItem('ugip_placements_v9', JSON.stringify(placementDrives));
  }, [placementDrives]);

  // Runs automatically whenever these change: govtPrivateJobs.
  useEffect(() => {
    localStorage.setItem('ugip_govt_jobs_v8', JSON.stringify(govtPrivateJobs));
  }, [govtPrivateJobs]);






  // Re-asks the server to confirm the logged-in admin/faculty password (no passwords exist in the browser any more)
  const verifyAdminOrFacultyPassword = async (password: string): Promise<boolean> => {
    const trimmed = (password || '').trim();
    if (!trimmed || !authUser || (authUser.role !== 'admin' && authUser.role !== 'faculty')) return false;
    const r = await authApi.verifyPassword(trimmed);
    return r.ok && r.data.ok;
  };

  // Add placement drive.
  const addPlacementDrive = (drive: Omit<PlacementDrive, 'id'>) => {
    const newDrive: PlacementDrive = {
      ...drive,
      id: `plc-${Date.now()}`,
    };
    setPlacementDrives((prev) => [newDrive, ...prev]);
    logActivity('CREATE_PLACEMENT_DRIVE', `Added placement drive: ${newDrive.title} at ${newDrive.company}`);
    addNotification({
      title: 'New Placement Drive Posted',
      message: `${newDrive.company} opened applications for ${newDrive.title} (${newDrive.ctc}).`,
      category: 'academic',
      priority: 'high',
    });
  };

  // Update placement drive.
  const updatePlacementDrive = (id: string, updates: Partial<PlacementDrive>) => {
    setPlacementDrives((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
    logActivity('UPDATE_PLACEMENT_DRIVE', `Updated placement drive ${id}`);
  };

  // Delete placement drive.
  const deletePlacementDrive = (id: string) => {
    const drive = placementDrives.find((d) => d.id === id);
    setPlacementDrives((prev) => prev.filter((d) => d.id !== id));
    logActivity('DELETE_PLACEMENT_DRIVE', `Deleted placement drive: ${drive?.title || id}`);
  };

  // Add govt private job.
  const addGovtPrivateJob = (job: Omit<GovernmentPrivateJob, 'id'>) => {
    const newJob: GovernmentPrivateJob = {
      ...job,
      id: `job-${Date.now()}`,
    };
    setGovtPrivateJobs((prev) => [newJob, ...prev]);
    logActivity('CREATE_GOVT_JOB', `Added job opening: ${newJob.title} (${newJob.organization})`);
    addNotification({
      title: 'New Job Opening Added',
      message: `${newJob.organization} announced recruitment for ${newJob.examOrPostName}.`,
      category: 'circular',
      priority: 'high',
    });
  };

  // Update govt private job.
  const updateGovtPrivateJob = (id: string, updates: Partial<GovernmentPrivateJob>) => {
    setGovtPrivateJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...updates } : j)));
    logActivity('UPDATE_GOVT_JOB', `Updated job listing ${id}`);
  };

  // Delete govt private job.
  const deleteGovtPrivateJob = (id: string) => {
    const job = govtPrivateJobs.find((j) => j.id === id);
    setGovtPrivateJobs((prev) => prev.filter((j) => j.id !== id));
    logActivity('DELETE_GOVT_JOB', `Deleted job opening: ${job?.title || id}`);
  };

  // Add shared experience.
  const addSharedExperience = (exp: Omit<SharedExperience, 'id' | 'createdAt' | 'likes'>) => {
    const newExp: SharedExperience = {
      ...exp,
      id: `exp-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      likes: 0,
    };
    setSharedExperiences((prev) => [newExp, ...prev]);
    logActivity('SHARE_EXPERIENCE', `${exp.authorName} shared placement experience for ${exp.company}`);
    addNotification({
      title: 'New Placement Experience Shared',
      message: `${exp.authorName} shared their interview tips and journey for ${exp.company}.`,
      category: 'academic',
      priority: 'normal',
    });
  };

  // Like shared experience.
  const likeSharedExperience = (id: string) => {
    setSharedExperiences((prev) =>
      prev.map((e) => (e.id === id ? { ...e, likes: e.likes + 1 } : e))
    );
  };

  // Add online quiz.
  const addOnlineQuiz = (quiz: Omit<SubjectOnlineQuiz, 'id' | 'createdAt'>) => {
    const newQuiz: SubjectOnlineQuiz = {
      ...quiz,
      id: `quiz-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setOnlineQuizzes((prev) => [newQuiz, ...prev]);
    logActivity('CREATE_ONLINE_QUIZ', `Faculty created online quiz: "${newQuiz.title}" for ${newQuiz.subjectCode}`);
    addNotification({
      title: 'New Subject Quiz Published',
      message: `Faculty uploaded online quiz "${newQuiz.title}" for ${newQuiz.subjectCode} (${newQuiz.branch}).`,
      category: 'exam',
      priority: 'high',
    });
  };

  // Delete online quiz.
  const deleteOnlineQuiz = (id: string) => {
    const quiz = onlineQuizzes.find((q) => q.id === id);
    setOnlineQuizzes((prev) => prev.filter((q) => q.id !== id));
    logActivity('DELETE_ONLINE_QUIZ', `Deleted quiz: ${quiz?.title || id}`);
  };

  // Submit quiz attempt.
  const submitQuizAttempt = (attempt: Omit<StudentQuizAttempt, 'id' | 'date'>) => {
    const newAttempt: StudentQuizAttempt = {
      ...attempt,
      id: `att-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
    };
    setQuizAttempts((prev) => [newAttempt, ...prev]);
    logActivity(
      'SUBMIT_QUIZ_ATTEMPT',
      `Student ${attempt.studentName} (Roll: ${attempt.rollNo}) scored ${attempt.score}/${attempt.totalMarks} (${attempt.percentage}%) on "${attempt.quizTitle}"`
    );

    // Also add/update a student progress graph point for today
    const todayLabel = `Day 3 (Today)`;
    const newPoint: StudentProgressGraphPoint = {
      dayLabel: todayLabel,
      date: new Date().toISOString().split('T')[0],
      studentId: attempt.studentId,
      studentName: attempt.studentName,
      rollNo: attempt.rollNo,
      branch: attempt.branch,
      scorePercentage: attempt.percentage,
      totalAttempted: attempt.totalMarks,
    };
    addStudentProgressPoint(newPoint);
  };

  // Add student progress point.
  const addStudentProgressPoint = (point: StudentProgressGraphPoint) => {
    setStudentProgressPoints((prev) => {
      // Remove any existing point for the same student on the same dayLabel, and push the new one
      const filtered = prev.filter(
        (p) => !(p.studentId === point.studentId && p.dayLabel === point.dayLabel)
      );
      // Step 20: every point needs an id to be saved in the database (one point per student per day label)
      return [...filtered, { ...point, id: point.id || `pp-${point.studentId}-${String(point.dayLabel).replace(/[^A-Za-z0-9]+/g, '-')}` }];
    });
  };

  // Update student phone.
  const updateStudentPhone = (studentId: string, phone: string) => {
    updateUser(studentId, { phone });
    const stu = users.find((u) => u.id === studentId);
    logActivity(
      'UPDATE_STUDENT_CONTACT',
      `Updated contact mobile number for student ${stu?.name || studentId} (Roll: ${stu?.rollNo || 'N/A'}) to ${phone}`
    );
    addNotification({
      title: 'Student Contact Updated',
      message: `Mobile phone updated for ${stu?.name || 'student'} to ${phone}.`,
      category: 'system',
      priority: 'normal',
    });
  };

  // Password reset by SMS OTP returns in Step 3 (server-side, real SMS). Until then the admin issues a temporary password.
  const RESET_UNAVAILABLE = 'Password reset by SMS is not available yet. Please ask the administrator to issue a new temporary password.';
  const requestPasswordResetOTP = (
    _identifier: string
  ): { success: boolean; message: string; maskedPhone?: string; debugOTP?: string } => ({ success: false, message: RESET_UNAVAILABLE });

  const verifyOTPAndResetPassword = (
    _identifier: string,
    _otp: string,
    _newPassword: string
  ): { success: boolean; message: string } => ({ success: false, message: RESET_UNAVAILABLE });

  // Save mock interview.
  const saveMockInterview = (interview: Omit<MockInterviewSession, 'id' | 'timestamp'>) => {
    const newSession: MockInterviewSession = {
      ...interview,
      id: `mock-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setMockInterviews((prev) => [newSession, ...prev]);
    logActivity(
      'MOCK_INTERVIEW_COMPLETED',
      `Student ${interview.studentName} completed placement mock interview for role: ${interview.targetRole} (Score: ${interview.score}/100)`
    );
    addNotification({
      title: 'Mock Interview Progress Report Generated',
      message: `${interview.studentName} scored ${interview.score}/100 in placement mock interview.`,
      category: 'academic',
      priority: 'normal',
    });
  };

  // True only for a real, server-verified admin login (was a localStorage flag anyone could set)
  const [isAdminSessionActive, setIsAdminSessionActiveState] = useState<boolean>(false);
  // Set is admin session active.
  const setIsAdminSessionActive = (_active: boolean) => { /* derived from the server session; kept for compatibility */ };
  // Runs automatically whenever these change: authUser.
  useEffect(() => {
    setIsAdminSessionActiveState(authUser?.role === 'admin' && !signInIncomplete(authUser));
  }, [authUser]);

  // Keep the UI profile (currentUser) in step with who the server says is logged in.
  const mappedFor = useRef<string | null>(null);
  // Runs automatically whenever these change: authUser, users.
  useEffect(() => {
    if (!authUser || signInIncomplete(authUser)) { mappedFor.current = null; return; }
    const me = users.find((u) => u.id === authUser.id);
    if (authUser.role === 'admin') {
      // map once per login; afterwards the admin may "view as" another role
      if (mappedFor.current !== authUser.id) {
        mappedFor.current = authUser.id;
        setCurrentUser(me || profileFromAuth(authUser));
      }
    } else if (me) {
      if (currentUser.id !== me.id) setCurrentUser(me);   // non-admins can never act as someone else
    } else if ((authUser.role === 'faculty' || authUser.role === 'parent') && currentUser.id !== authUser.id) {
      setCurrentUser(profileFromAuth(authUser));
    }
  }, [authUser, users]);



  // Sync states to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
  }, [currentUser]);

  // Runs automatically whenever these change: users.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  // Runs automatically whenever these change: subjects.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
  }, [subjects]);

  // Load exams / marks / attendance / subject assignments from the server after login, then keep them fresh.
  const refreshAcademic = useCallback(async () => {
    const isStaff = roleRef.current === 'admin' || roleRef.current === 'faculty';
    const [t, sess, sub, me, sum, ot] = await Promise.all([
      academicApi.tests(), academicApi.sessions(), academicApi.subjects(), authApi.me(),
      isStaff ? academicApi.attendanceSummary() : Promise.resolve(null),
      assignmentsApi.list(),
    ]);
    if ([t, sess, sub, me].some((r) => !r.ok && r.status === 401)) { setAuthUser(null); return; }   // session ended
    if (ot.ok) setOnlineTestAssignments(ot.data);
    if (sum && sum.ok) setAttendanceSummary(Object.fromEntries(sum.data.map((x) => [x.studentId, { total: x.total, attended: x.attended, percent: x.percent }])));
    if (t.ok) setTests(t.data);
    if (sess.ok) setAttendanceSessions(sess.data);
    if (sub.ok) setSubjects((prev) => mergeServerSubjects(prev, sub.data));
    if (me.ok) setAuthUser((prev) => (prev && prev.id === me.data.user.id && JSON.stringify(prev.subjectIds) !== JSON.stringify(me.data.user.subjectIds) ? me.data.user : prev));
  }, []);

  // Runs automatically whenever these change: authUser?.id, authUser?.mustChangePassword, authUser?.mfaSetupRequired, authUser?.consentRequired, refreshAcademic.
  useEffect(() => {
    if (!authUser || signInIncomplete(authUser)) {
      setTests([]);
      setOnlineTestAssignments([]);
      setAttendanceSessions([]);
      setAttendanceSummary({});
      return;
    }
    refreshAcademic();
    const timer = setInterval(() => { if (!document.hidden) refreshAcademic(); }, 20000);
    return () => clearInterval(timer);
  }, [authUser?.id, authUser?.mustChangePassword, authUser?.mfaSetupRequired, authUser?.consentRequired, refreshAcademic]);



  // Logging Activity with SHA-256 Hash
  const logActivity = (action: string, details: string) => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const hashData = `${timestamp}|${currentUser.id}|${currentUser.name}|${action}|${details}`;
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action,
      details,
      ipAddress: '192.168.1.' + (10 + (currentUser.name.length % 80)),
      securityHash: generateAuditHash(hashData),
    };
    setActivityLogs((prev) => [newLog, ...prev.slice(0, 99)]);
  };

  // Switch role or quick switch account
  const switchRole = (role: Role, specificUserId?: string) => {
    if (specificUserId) {
      const found = users.find((u) => u.id === specificUserId);
      if (found) {
        setCurrentUser(found);
        logActivity('Role Switched', `Switched active user to ${found.name} (${found.role})`);
        addNotification({
          title: `Active Portal: ${role.toUpperCase()}`,
          message: `Switched session to ${found.name} (${found.designation || found.branch || 'Campus'}).`,
          category: 'system',
          priority: 'low',
        });
        return;
      }
    }
    const defaultForRole = users.find((u) => u.role === role);
    if (defaultForRole) {
      setCurrentUser(defaultForRole);
      logActivity('Role Switched', `Switched role to ${role}`);
      addNotification({
        title: `Switched to ${role.toUpperCase()}`,
        message: `Welcome ${defaultForRole.name}! Dashboard configured for ${role}.`,
        category: 'system',
        priority: 'low',
      });
    }
  };

  // User management. Logins live on the server: faculty are created there (admin only) and get a one-time temporary password.
  // Students get their login row automatically when saved; the admin issues the temporary password (see README_AUTH.md).
  const addUser = async (userData: Omit<UserProfile, 'id'>) => {
    let id = `usr-${Date.now()}`;
    if (userData.role === 'faculty') {
      const username = (userData.username || userData.name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 32);
      const r = await fetch('/api/admin/users', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, username, name: userData.name, email: userData.email, phone: userData.phone,
          department: userData.department, designation: userData.designation, subjectIds: userData.assignedSubjectIds || [] }),
      }).then(async (res) => ({ ok: res.ok, body: await res.json().catch(() => ({})) })).catch(() => ({ ok: false, body: { error: 'Cannot reach the server' } }));
      if (!r.ok) {
        addNotification({ title: 'Faculty not created', message: r.body.error || 'The server rejected this account.', category: 'system', priority: 'high' });
        return;
      }
      id = r.body.id;
      userData = { ...userData, username: r.body.username };
      window.alert(`Faculty login created\n\nUsername: ${r.body.username}\nTemporary password: ${r.body.tempPassword}\n\nShown only once. Share it privately; they must change it at first login.`);
    }

    const newUser: UserProfile = { ...userData, id, password: undefined, studentPassword: undefined };
    setUsers((prev) => [newUser, ...prev]);

    logActivity(
      userData.role === 'faculty' ? 'Admin Added Faculty Member' : 'Added New Student',
      `${newUser.name} registered. Role: ${newUser.role}. Dept: ${newUser.department || newUser.branch || 'N/A'}`
    );

    addNotification({
      title: userData.role === 'faculty' ? 'New Faculty Enrolled' : 'New Student Registered',
      message: `${newUser.name} added to ${newUser.branch || newUser.department || 'College'}.`,
      category: 'academic',
      priority: 'normal',
    });
  };

  // Update user.
  const updateUser = (id: string, updates: Partial<UserProfile>) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updates } : u))
    );
    if (currentUser.id === id) {
      setCurrentUser((prev) => ({ ...prev, ...updates }));
    }
    logActivity('User Profile Updated', `Updated ID ${id}: ${Object.keys(updates).join(', ')}`);
  };

  // Delete user.
  const deleteUser = (id: string) => {
    const target = users.find((u) => u.id === id);
    if (currentUser.role !== 'admin' && target?.role === 'faculty') {
      uiAlert('Not allowed: only the administrator can change or remove faculty records.');
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== id));
    if (currentUser.id === id) {
      const fallback = users.find((u) => u.id !== id) || INITIAL_USERS[0];
      setCurrentUser(fallback);
    }
    logActivity('User Removed', `Removed ${target?.name || id} (${target?.role}) from institution database.`);
  };

  // Subject management
  const addSubject = async (subjectData: Omit<Subject, 'id'>): Promise<boolean> => {
    const id = `sub-${Date.now()}`;
    const r = await academicApi.createSubject({ ...subjectData, id } as any);
    if (!r.ok) { reportFail('Subject not added', r.error); return false; }
    setSubjects((prev) => [...prev, { ...subjectData, id, facultyId: r.data.facultyId || subjectData.facultyId, facultyName: r.data.facultyName || subjectData.facultyName }]);
    logActivity('Subject Added', `Created ${subjectData.code} - ${subjectData.name} (${subjectData.branch})`);
    return true;
  };

  // Update subject.
  const updateSubject = async (id: string, updates: Partial<Subject>): Promise<boolean> => {
    const r = await academicApi.updateSubject(id, updates);
    if (!r.ok) { reportFail('Subject not updated', r.error); return false; }
    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates, facultyId: r.data.facultyId, facultyName: r.data.facultyName } : s)));
    logActivity('Subject Updated', `Updated subject ID ${id}`);
    return true;
  };

  // Delete subject.
  const deleteSubject = async (id: string): Promise<boolean> => {
    const r = await academicApi.deleteSubject(id);
    if (!r.ok) { reportFail('Subject not deleted', r.error); return false; }
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    logActivity('Subject Deleted', `Removed subject ID ${id}`);
    return true;
  };

  // Class & Subject Dispatch (Step 10): the server checks who may send, submit, grade and download. If it says no, nothing changes.
  const refreshDispatches = useCallback(async () => {
    const r = await dispatchApi.list();
    if (r.ok) setDispatchedMaterials(r.data);
  }, []);
  // Dispatch action.
  const dispatchAction = async (r: { ok: true } | { ok: false; error: string }, what: string, onOk: () => void): Promise<ActionResult> => {
    if (!r.ok) { reportFail(what, r.error); return { ok: false, error: r.error }; }
    onOk();
    await refreshDispatches();
    return { ok: true };
  };
  // Dispatch material to class.
  const dispatchMaterialToClass = async (data: DispatchInput): Promise<ActionResult> =>
    dispatchAction(await dispatchApi.create(data), 'Not sent to the class', () =>
      logActivity('Material Dispatched to Class', `Sent ${data.type} "${data.title}" for subject ${data.subjectId}`));
  // Submit to dispatched material.
  const submitToDispatchedMaterial = async (materialId: string, submission: SubmissionInput): Promise<ActionResult> =>
    dispatchAction(await dispatchApi.submit(materialId, submission), 'Work not submitted', () =>
      logActivity('Student Submitted Task', `Submitted work for item ${materialId}`));
  // Grade dispatched submission.
  const gradeDispatchedSubmission = async (materialId: string, submissionId: string, marks: number, feedback: string): Promise<ActionResult> =>
    dispatchAction(await dispatchApi.grade(materialId, submissionId, marks, feedback), 'Not graded', () =>
      logActivity('Submission Graded', `Graded submission ${submissionId}: ${marks} marks`));
  // Delete dispatched material.
  const deleteDispatchedMaterial = async (materialId: string): Promise<ActionResult> =>
    dispatchAction(await dispatchApi.remove(materialId), 'Not deleted', () =>
      logActivity('Dispatched Material Deleted', `Deleted item ${materialId}`));

  // Consolidated Marks & Full Excel Export (Saves huge amount of time!)
  const getConsolidatedMarksData = (
    branch?: string,
    semester?: number | 'all',
    examType?: string
  ): ConsolidatedStudentMarksRow[] => {
    const studentUsers = users.filter((u) => u.role === 'student');

    return studentUsers
      .filter((s) => {
        if (branch && branch !== 'all' && s.branch !== branch) return false;
        if (semester && semester !== 'all' && s.semester !== semester) return false;
        return true;
      })
      .map((student) => {
        const studentSem = student.semester || 1;
        const studentBranch = student.branch || 'CSE';

        // Relevant subjects for student
        const relevantSubs = subjects.filter(
          (sub) => sub.branch === studentBranch && sub.semester === studentSem
        );

        let totalObtainedAllSubs = 0;
        let totalMaxAllSubs = 0;

        const subjectScores = (relevantSubs.length > 0 ? relevantSubs : subjects.slice(0, 4)).map((sub) => {
          // Find tests for this subject
          const s1Test = tests.find(
            (t) => t.subjectId === sub.id && t.type === 'Sessional 1'
          );
          const s2Test = tests.find(
            (t) => t.subjectId === sub.id && t.type === 'Sessional 2'
          );

          const s1Mark = s1Test?.results.find((r) => r.studentId === student.id)?.marksObtained ?? 42;
          const s2Mark = s2Test?.results.find((r) => r.studentId === student.id)?.marksObtained ?? 44;

          const totalObt = s1Mark + s2Mark;
          const maxTotal = 100; // 50 + 50
          const pct = Math.round((totalObt / maxTotal) * 100);

          totalObtainedAllSubs += totalObt;
          totalMaxAllSubs += maxTotal;

          let grade = 'A';
          if (pct >= 90) grade = 'A+';
          else if (pct >= 80) grade = 'A';
          else if (pct >= 70) grade = 'B';
          else if (pct >= 60) grade = 'C';
          else if (pct >= 40) grade = 'D';
          else grade = 'F';

          return {
            subjectCode: sub.code,
            subjectName: sub.name,
            sessional1: s1Mark,
            sessional2: s2Mark,
            totalObtained: totalObt,
            maxMarks: maxTotal,
            percentage: pct,
            grade,
          };
        });

        const overallPct =
          totalMaxAllSubs > 0
            ? Math.round((totalObtainedAllSubs / totalMaxAllSubs) * 100)
            : 80;

        let finalGrade = 'A';
        if (overallPct >= 90) finalGrade = 'A+';
        else if (overallPct >= 80) finalGrade = 'A';
        else if (overallPct >= 70) finalGrade = 'B';
        else if (overallPct >= 60) finalGrade = 'C';
        else if (overallPct >= 40) finalGrade = 'D';
        else finalGrade = 'F';

        const resultStatus: 'PASS' | 'PROMOTED' | 'REMEDIAL' =
          overallPct >= 50 ? 'PASS' : overallPct >= 40 ? 'PROMOTED' : 'REMEDIAL';

        return {
          rollNo: student.rollNo || '',
          enrollmentNo: student.enrollmentNo || '',
          studentName: student.name,
          branch: studentBranch,
          year: student.year || 1,
          semester: studentSem,
          category: student.category || 'General',
          subjectScores,
          grandTotalObtained: totalObtainedAllSubs,
          grandMaxMarks: totalMaxAllSubs,
          overallPercentage: overallPct,
          finalGrade,
          overallAttendance: getAttendancePercent(student.id),   // real attendance; null = no classes recorded yet
          resultStatus,
        };
      });
  };

  const exportAllStudentMarksToCSV = (
    branch: string = 'all',
    semester: number | 'all' = 'all',
    examType: string = 'All Sessional & Board'
  ) => {
    const data = getConsolidatedMarksData(branch, semester, examType);

    // Build standard CSV
    const headers = [
      'Roll Number',
      'Enrollment Number',
      'Student Full Name',
      'Branch',
      'Year',
      'Semester',
      'Category',
      'Overall Attendance %',
      'Subject Scores Breakdown (SubCode: S1+S2=Total)',
      'Grand Total Obtained',
      'Maximum Total Marks',
      'Overall Percentage (%)',
      'Final Grade',
      'Result Status',
    ];

    const rows = data.map((row) => {
      const subjectBreakdown = row.subjectScores
        .map((s) => `${s.subjectCode}(${s.sessional1}+${s.sessional2}=${s.totalObtained}/${s.maxMarks})`)
        .join('; ');

      return [
        `"${row.rollNo}"`,
        `"${row.enrollmentNo}"`,
        `"${row.studentName}"`,
        `"${row.branch}"`,
        `"${row.year}"`,
        `"Sem ${row.semester}"`,
        `"${row.category}"`,
        `"${row.overallAttendance == null ? '' : row.overallAttendance + '%'}"`,
        `"${subjectBreakdown}"`,
        `"${row.grandTotalObtained}"`,
        `"${row.grandMaxMarks}"`,
        `"${row.overallPercentage}%"`,
        `"${row.finalGrade}"`,
        `"${row.resultStatus}"`,
      ].join(',');
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        '# UTTARAKHAND GOVERNMENT INSTITUTE OF POLYTECHNIC',
        '# Consolidated Students Marks Tabulation & Performance Register',
        `# Session: 2026-2027 | Exported on: ${new Date().toLocaleString()} | Filter: ${branch} Sem ${semester}`,
        headers.join(','),
        ...rows,
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `UGIP_Consolidated_Student_Marks_${branch}_Sem${semester}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    logActivity(
      'Bulk Student Marks Exported to Excel',
      `Exported full tabulation of ${data.length} students for ${branch} Sem ${semester} in CSV/Excel format.`
    );

    addNotification({
      title: 'Excel Marks Sheet Generated',
      message: `Complete consolidated marks sheet for ${data.length} students exported to CSV/Excel.`,
      category: 'academic',
      priority: 'high',
    });
  };

  // ---- Exams & marks ----
  // The server is the source of truth and enforces who may do what (a faculty member can only write marks / attendance
  // for the subjects assigned to them). If it says no, we show its message and change nothing.
  const reportFail = (what: string, error: string) =>
    addNotification({ title: what, message: error, category: 'system', priority: 'high' });

  // Create test.
  const createTest = async (testData: Omit<TestExam, 'id'>): Promise<boolean> => {
    const r = await academicApi.createTest(testData);
    if (!r.ok) { reportFail('Exam not scheduled', r.error); return false; }
    setTests((prev) => [r.data, ...prev]);
    logActivity('Test / Exam Scheduled', `${r.data.title} (${r.data.subjectCode}) Max: ${r.data.maxMarks}`);
    return true;
  };

  // Update test marks.
  const updateTestMarks = async (testId: string, results: StudentTestMark[]): Promise<boolean> => {
    const r = await academicApi.saveMarks(testId, results.map((x) => ({ studentId: x.studentId, marksObtained: x.marksObtained, remarks: x.remarks })));
    if (!r.ok) { reportFail('Marks not saved', r.error); return false; }
    setTests((prev) => prev.map((t) => (t.id === testId ? r.data : t)));
    logActivity('Test Marks Updated', `Updated scores for exam ID ${testId} across ${results.length} students.`);
    return true;
  };

  // Update single student mark.
  const updateSingleStudentMark = async (testId: string, studentId: string, updated: Partial<StudentTestMark>): Promise<boolean> => {
    const existing = tests.find((t) => t.id === testId)?.results.find((r) => r.studentId === studentId);
    const marks = updated.marksObtained ?? existing?.marksObtained;
    if (typeof marks !== 'number' || Number.isNaN(marks)) { reportFail('Mark not saved', 'Enter the marks obtained.'); return false; }
    const r = await academicApi.saveMarks(testId, [{ studentId, marksObtained: marks, remarks: updated.remarks ?? existing?.remarks }]);
    if (!r.ok) { reportFail('Mark not saved', r.error); return false; }
    setTests((prev) => prev.map((t) => (t.id === testId ? r.data : t)));
    logActivity('Student Mark Updated', `Updated mark for student ${studentId} in test ${testId}`);
    return true;
  };

  // Delete single student mark.
  const deleteSingleStudentMark = async (testId: string, studentId: string): Promise<boolean> => {
    const r = await academicApi.deleteMark(testId, studentId);
    if (!r.ok) { reportFail('Mark not removed', r.error); return false; }
    setTests((prev) => prev.map((t) => (t.id === testId ? { ...t, results: t.results.filter((x) => x.studentId !== studentId) } : t)));
    logActivity('Student Mark Deleted', `Removed mark for student ${studentId} in test ${testId}`);
    return true;
  };

  // Delete test.
  const deleteTest = async (testId: string): Promise<boolean> => {
    const r = await academicApi.deleteTest(testId);
    if (!r.ok) { reportFail('Exam not deleted', r.error); return false; }
    setTests((prev) => prev.filter((t) => t.id !== testId));
    logActivity('Test Deleted', `Removed test ID ${testId}`);
    return true;
  };

  // ---- Attendance (the PIN and QR token are created by the server and only sent to the teacher who opened the session) ----
  const replaceSession = (sess: AttendanceSession) =>
    setAttendanceSessions((prev) => (prev.some((x) => x.id === sess.id) ? prev.map((x) => (x.id === sess.id ? sess : x)) : [sess, ...prev]));

  const createAttendanceSession = async (
    sessionData: Omit<AttendanceSession, 'id' | 'records' | 'status' | 'qrToken' | 'pinCode' | 'expiresAt'>
  ): Promise<AttendanceSession | null> => {
    const r = await academicApi.openSession({ subjectId: sessionData.subjectId, timeSlot: sessionData.timeSlot, topicTaught: sessionData.topicTaught, date: sessionData.date });
    if (!r.ok) { reportFail('Attendance not opened', r.error); return null; }
    replaceSession(r.data);
    logActivity('QR Attendance Session Started', `${r.data.subjectCode} (${r.data.subjectName}) by ${r.data.facultyName}`);
    addNotification({
      title: 'Class Attendance Opened',
      message: `${r.data.subjectCode} live lecture opened by ${r.data.facultyName}. Enter the PIN shown by your teacher, or scan the QR code.`,
      category: 'attendance',
      priority: 'high',
    });
    return r.data;
  };

  // Close attendance session.
  const closeAttendanceSession = async (sessionId: string): Promise<void> => {
    const r = await academicApi.closeSession(sessionId);
    if (!r.ok) { reportFail('Session not closed', r.error); return; }
    replaceSession(r.data);
    logActivity('Attendance Session Closed', `Closed session ID ${sessionId}`);
  };

  // The student is identified by their login on the server; the studentId argument is kept only so existing screens keep working.
  const markAttendance = async (
    tokenOrPin: string,
    _studentId: string
  ): Promise<{ success: boolean; message: string; session?: AttendanceSession }> => {
    const r = await academicApi.punch(tokenOrPin);
    if (!r.ok) return { success: false, message: r.error };
    if (r.data.session) replaceSession(r.data.session);
    logActivity('Attendance Punched', r.data.message);
    return { success: true, message: r.data.message, session: r.data.session };
  };

  // Manual update attendance.
  const manualUpdateAttendance = async (sessionId: string, studentId: string, status: 'Present' | 'Absent' | 'Late'): Promise<boolean> => {
    const r = await academicApi.setRecord(sessionId, studentId, status);
    if (!r.ok) { reportFail('Attendance not changed', r.error); return false; }
    replaceSession(r.data);
    logActivity('Manual Attendance Changed', `Updated ${studentId} to ${status} in session ${sessionId}`);
    return true;
  };

  const markStudentByFacultyScan = async (
    studentQRData: string,
    sessionId?: string
  ): Promise<{ success: boolean; message: string; student?: UserProfile; session?: AttendanceSession }> => {
    const target = sessionId
      ? attendanceSessions.find((x) => x.id === sessionId)
      : attendanceSessions.find((x) => x.status === 'Active' && (x.facultyId === currentUser.id || currentUser.role === 'admin'));
    if (!target) return { success: false, message: 'No active lecture session. Open attendance for your subject first.' };
    const r = await academicApi.scan(target.id, studentQRData);
    if (!r.ok) return { success: false, message: r.error };
    if (r.data.session) replaceSession(r.data.session);
    const student = users.find((u) => u.id === r.data.student?.id);
    logActivity('Faculty Scanned Student QR', r.data.message);
    return { success: true, message: r.data.message, student, session: r.data.session };
  };

  // Faculty Gate Attendance Punch
  const punchFacultyAttendance = (
    facultyId: string,
    method: 'QR Scan' | 'Staff Badge' | 'Biometric' | 'Manual' = 'QR Scan',
    location: string = 'UGIP Main Academic Gate'
  ): { success: boolean; message: string; punch?: FacultyAttendancePunch } => {
    const faculty = users.find((u) => u.id === facultyId);
    if (!faculty) return { success: false, message: 'Faculty/Staff record not found.' };

    const todayStr = new Date().toISOString().split('T')[0];
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const existingPunch = facultyPunches.find((p) => p.facultyId === facultyId && p.date === todayStr);

    if (existingPunch) {
      if (!existingPunch.outTime) {
        const updatedPunch: FacultyAttendancePunch = { ...existingPunch, outTime: nowTimeStr };
        setFacultyPunches((prev) => prev.map((p) => (p.id === existingPunch.id ? updatedPunch : p)));
        logActivity('Faculty Punched Out', `${faculty.name} recorded departure punch at ${nowTimeStr}.`);
        return {
          success: true,
          message: `${faculty.name} successfully punched OUT at ${nowTimeStr}.`,
          punch: updatedPunch,
        };
      } else {
        return {
          success: false,
          message: `${faculty.name} has already recorded both In and Out punches for today.`,
          punch: existingPunch,
        };
      }
    }

    const newPunch: FacultyAttendancePunch = {
      id: `fp-${Date.now()}`,
      facultyId: faculty.id,
      facultyName: faculty.name,
      designation: faculty.designation || 'Faculty Member',
      department: faculty.department || faculty.branch || 'General Dept',
      date: todayStr,
      inTime: nowTimeStr,
      status: 'Present',
      method,
      location,
    };
    setFacultyPunches((prev) => [newPunch, ...prev]);

    logActivity('Faculty Punched In', `${faculty.name} entered campus at ${nowTimeStr} via ${method}`);
    return {
      success: true,
      message: `Welcome ${faculty.name}! Morning entry recorded at ${nowTimeStr} via ${method}.`,
      punch: newPunch,
    };
  };

  // Returns the faculty today punch.
  const getFacultyTodayPunch = (facultyId: string): FacultyAttendancePunch | undefined => {
    const todayStr = new Date().toISOString().split('T')[0];
    return facultyPunches.find((p) => p.facultyId === facultyId && p.date === todayStr);
  };

  // Papers & Notices
  const addPaper = (paperData: Omit<PreviousYearPaper, 'id' | 'downloadCount'>) => {
    const newPaper: PreviousYearPaper = { ...paperData, id: `pyq-${Date.now()}`, downloadCount: 0 };
    setPapers((prev) => [newPaper, ...prev]);
    logActivity('Question Paper Added', `Added ${newPaper.title} (${newPaper.year})`);
  };

  // Delete paper.
  const deletePaper = (id: string) => {
    setPapers((prev) => prev.filter((p) => p.id !== id));
    logActivity('Paper Deleted', `Removed paper ID ${id}`);
  };

  // Increment paper download.
  const incrementPaperDownload = (id: string) => {
    setPapers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, downloadCount: p.downloadCount + 1 } : p))
    );
  };

  // Practical Experiments
  const addPracticalExperiment = (exp: Omit<PracticalExperiment, 'id'>) => {
    const newExp: PracticalExperiment = {
      ...exp,
      id: `prac-${Date.now()}`,
    };
    setPracticalExperiments((prev) => [newExp, ...prev]);
    logActivity('Practical Experiment Added', `Added practical: "${newExp.title}" (${newExp.subjectCode})`);
    addNotification({
      title: 'Lab Practical Record Added',
      message: `${newExp.title} (${newExp.subjectCode}) added to practical records.`,
      category: 'academic',
      priority: 'normal',
    });
  };

  // Delete practical experiment.
  const deletePracticalExperiment = (id: string) => {
    setPracticalExperiments((prev) => prev.filter((p) => p.id !== id));
    logActivity('Practical Experiment Deleted', `Removed practical ID ${id}`);
  };

  // Timetable Slots
  const addTimetableSlot = (slot: Omit<TimetableSlot, 'id'>) => {
    const newSlot: TimetableSlot = {
      ...slot,
      id: `tt-${Date.now()}`,
    };
    setTimetableSlots((prev) => [...prev, newSlot]);
    logActivity('Timetable Slot Scheduled', `Added period ${newSlot.periodNumber} for ${newSlot.subjectCode} on ${newSlot.day}`);
    addNotification({
      title: 'Timetable Updated',
      message: `${newSlot.subjectCode} scheduled on ${newSlot.day} (Period ${newSlot.periodNumber}).`,
      category: 'academic',
      priority: 'low',
    });
  };

  // Delete timetable slot.
  const deleteTimetableSlot = (id: string) => {
    setTimetableSlots((prev) => prev.filter((s) => s.id !== id));
    logActivity('Timetable Slot Removed', `Removed timetable slot ID ${id}`);
  };

  // Return to Admin Portal
  const returnToAdminPortal = () => {
    const adminUser = users.find((u) => u.role === 'admin') || INITIAL_USERS[0];
    setCurrentUser(adminUser);
    logActivity('Returned to Admin Portal', 'Administrator returned from switched user role.');
    addNotification({
      title: 'Admin Master Workspace Active',
      message: 'Switched back to Principal & Master Administrator portal.',
      category: 'system',
      priority: 'normal',
    });
  };

  // Student Attendance Stats Calculation
  const getStudentAttendanceStats = (studentId: string) => {
    const student = users.find((u) => u.id === studentId);
    if (!student) return { overallPercent: 0, totalClasses: 0, attendedClasses: 0, subjectWise: [] };

    const relevantSessions = attendanceSessions.filter(
      (s) => (!student.branch || s.branch === student.branch) && (!student.semester || s.semester === student.semester)
    );

    // No classes recorded yet: show zeros, not an invented percentage.
    if (relevantSessions.length === 0) {
      return { overallPercent: 0, totalClasses: 0, attendedClasses: 0, subjectWise: [] };
    }

    let totalClassesCount = 0;
    let attendedClassesCount = 0;
    const subjectMap: { [code: string]: { name: string; total: number; attended: number } } = {};

    relevantSessions.forEach((sess) => {
      totalClassesCount++;
      if (!subjectMap[sess.subjectCode]) {
        subjectMap[sess.subjectCode] = { name: sess.subjectName, total: 0, attended: 0 };
      }
      subjectMap[sess.subjectCode].total++;
      const rec = sess.records.find((r) => r.studentId === studentId);
      if (rec && (rec.status === 'Present' || rec.status === 'Late')) {
        attendedClassesCount++;
        subjectMap[sess.subjectCode].attended++;
      }
    });

    const overallPercent =
      totalClassesCount > 0
        ? Math.round((attendedClassesCount / totalClassesCount) * 100)
        : 0;

    const subjectWise = Object.entries(subjectMap).map(([code, data]) => ({
      subjectCode: code,
      subjectName: data.name,
      total: data.total,
      attended: data.attended,
      percent: data.total > 0 ? Math.round((data.attended / data.total) * 100) : 100,
    }));

    return {
      overallPercent,
      totalClasses: totalClassesCount,
      attendedClasses: attendedClassesCount,
      subjectWise,
    };
  };

  // Returns the attendance counts.
  const getAttendanceCounts = (studentId: string): { total: number; attended: number; percent: number | null } => {
    const fromServer = attendanceSummary[studentId];
    if (fromServer) return fromServer;
    const own = getStudentAttendanceStats(studentId);   // a student's own view
    return own.totalClasses > 0
      ? { total: own.totalClasses, attended: own.attendedClasses, percent: own.overallPercent }
      : { total: 0, attended: 0, percent: null };
  };
  // Returns the attendance percent.
  const getAttendancePercent = (studentId: string): number | null => getAttendanceCounts(studentId).percent;

  // Student Academic Summary
  const getStudentAcademicSummary = (studentId: string) => {
    let totalMarksPct = 0;
    let testsTaken = 0;
    let passedCount = 0;
    let weakCount = 0;

    tests.forEach((t) => {
      const res = t.results.find((r) => r.studentId === studentId);
      if (res) {
        testsTaken++;
        totalMarksPct += res.percentage;
        if (res.percentage >= 40) passedCount++;
        if (res.percentage < 45) weakCount++;
      }
    });

    // tasks still open that this student has not handed in (the server sends a student only their own class and their own submission)
    const pendingSubmissions = dispatchedMaterials.filter((m) => m.type === 'Assignment & Task' && !m.closed && !m.submissions.some((s) => s.studentId === studentId)).length;

    return {
      avgMarksPercent: testsTaken > 0 ? Math.round(totalMarksPct / testsTaken) : 78,
      passedTestsCount: passedCount,
      weakSubjectCount: weakCount,
      pendingSubmissionsCount: pendingSubmissions,
    };
  };

  // Returns the student summary.
  const getStudentSummary = (studentId: string) => {
    const att = getStudentAttendanceStats(studentId);
    const acad = getStudentAcademicSummary(studentId);
    return {
      overallAttendance: att.overallPercent,
      totalClasses: att.totalClasses,
      attendedClasses: att.attendedClasses,
      avgMarksPercent: acad.avgMarksPercent,
      passedTestsCount: acad.passedTestsCount,
      weakSubjectCount: acad.weakSubjectCount,
      pendingSubmissionsCount: acad.pendingSubmissionsCount,
    };
  };

  // Weak Students Analysis
  const getWeakStudentsAnalysis = (): StudentWeaknessAnalysis[] => {
    const students = users.filter((u) => u.role === 'student');
    const analyses: StudentWeaknessAnalysis[] = [];

    students.forEach((stu) => {
      const weakSubs: any[] = [];
      let totalPct = 0;
      let markEntries = 0;

      tests.forEach((t) => {
        const mark = t.results.find((r) => r.studentId === stu.id);
        if (mark) {
          totalPct += mark.percentage;
          markEntries++;
          if (mark.percentage < 45) {
            weakSubs.push({
              subjectId: t.subjectId,
              subjectCode: t.subjectCode,
              subjectName: t.subjectName,
              sessionalMarks: mark.marksObtained,
              maxMarks: mark.totalMarks,
              attendancePercent: getAttendancePercent(stu.id),
              identifiedIssues: [
                `Scored ${mark.percentage}% in ${t.type}`,
                mark.remarks || 'Foundational conceptual gap in core units',
              ],
              remedialRecommendation: `Assign remedial practice in ${t.subjectName}`,
            });
          }
        }
      });

      // Only REAL data decides the risk: marks entered by teachers and attendance recorded in class.
      // A student with neither is not listed (nothing is guessed).
      const avgMarks = markEntries > 0 ? Math.round(totalPct / markEntries) : null;
      const att = getAttendancePercent(stu.id);
      if (avgMarks === null && att === null) return;
      let riskLevel: 'High' | 'Medium' | 'Low' = 'Low';
      if ((att !== null && att < 70) || (avgMarks !== null && avgMarks < 40) || weakSubs.length >= 2) {
        riskLevel = 'High';
      } else if ((att !== null && att < 75) || (avgMarks !== null && avgMarks < 50) || weakSubs.length === 1) {
        riskLevel = 'Medium';
      }

      analyses.push({
        studentId: stu.id,
        studentName: stu.name,
        rollNo: stu.rollNo || 'N/A',
        branch: stu.branch || 'CSE',
        semester: stu.semester || 1,
        riskLevel,
        overallAttendance: att,
        averageMarks: avgMarks,
        weakSubjects: weakSubs,
      });
    });

    return analyses.sort((a, b) => {
      const weight = { High: 3, Medium: 2, Low: 1 };
      return weight[b.riskLevel] - weight[a.riskLevel];
    });
  };

  // ----------------------------------------------------
  // NOTICES, ONE-TO-ONE NOTICES AND DOUBTS (Step 8)
  // They live on the server, which decides what this person may see: a student gets the notices of their class, their own
  // private notices and their own doubts; a teacher gets the doubts of the subjects they teach and can publish only to
  // classes they teach. (Copies an older version kept in this browser's localStorage are no longer read.)
  // ----------------------------------------------------
  const [directNotices, setDirectNotices] = useState<DirectStudentNotice[]>([]);
  // List of student doubt tickets shown on this screen
  const [studentDoubtTickets, setStudentDoubtTickets] = useState<StudentDoubtTicket[]>([]);

  const signedInForComms = !!authUser && !signInIncomplete(authUser);
  const personalCommsAllowed = signedInForComms && authUser!.role !== 'parent';

  // Loads notices from the server.
  const refreshNotices = useCallback(async (signedIn: boolean) => {
    const r = signedIn ? await noticesApi.list() : await noticesApi.publicList();   // not logged in: only what is meant for everybody
    if (r.ok) setNotices(r.data);
  }, []);

  // Loads direct and doubts from the server.
  const refreshDirectAndDoubts = useCallback(async () => {
    const [dn, db] = await Promise.all([directNoticesApi.list(), doubtsApi.list()]);
    if (dn.ok) setDirectNotices(dn.data);
    if (db.ok) setStudentDoubtTickets(db.data);
  }, []);

  // Runs automatically whenever these change: authUser?.id, signedInForComms, refreshNotices.
  useEffect(() => {
    if (!signedInForComms) setNotices([]);   // a notice meant for one class must not stay on screen after sign-out
    refreshNotices(signedInForComms);
    const timer = setInterval(() => { if (!document.hidden) refreshNotices(signedInForComms); }, 60000);
    return () => clearInterval(timer);
  }, [authUser?.id, signedInForComms, refreshNotices]);

  // Runs automatically whenever these change: authUser?.id, personalCommsAllowed, refreshDispatches.
  useEffect(() => {
    if (!personalCommsAllowed) { setDispatchedMaterials([]); return; }      // parents get none; a signed-out browser keeps nothing
    refreshDispatches();
    const timer = setInterval(() => { if (!document.hidden) refreshDispatches(); }, 15000);
    return () => clearInterval(timer);
  }, [authUser?.id, personalCommsAllowed, refreshDispatches]);

  // Runs automatically whenever these change: authUser?.id, personalCommsAllowed, refreshDirectAndDoubts.
  useEffect(() => {
    if (!personalCommsAllowed) { setDirectNotices([]); setStudentDoubtTickets([]); return; }
    refreshDirectAndDoubts();
    const timer = setInterval(() => { if (!document.hidden) refreshDirectAndDoubts(); }, 15000);
    return () => clearInterval(timer);
  }, [authUser?.id, personalCommsAllowed, refreshDirectAndDoubts]);

  // Add notice.
  const addNotice = useCallback(
    async (notice: NoticeInput): Promise<ActionResult> => {
      const r = await noticesApi.create(notice);
      if (!r.ok) return { ok: false, error: r.error };
      logActivity('Official Notice Published', `Published: ${r.data.title}`);
      await refreshNotices(true);
      return { ok: true };
    },
    [logActivity, refreshNotices]
  );

  // Delete notice.
  const deleteNotice = useCallback(
    async (id: string): Promise<ActionResult> => {
      const r = await noticesApi.remove(id);
      if (!r.ok) return { ok: false, error: r.error };
      logActivity('Notice Deleted', `Removed notice ID ${id}`);
      await refreshNotices(true);
      return { ok: true };
    },
    [logActivity, refreshNotices]
  );

  // Send direct student notice.
  const sendDirectStudentNotice = useCallback(
    async (notice: Omit<DirectStudentNotice, 'id' | 'sentAt' | 'isRead'>): Promise<ActionResult> => {
      const r = await directNoticesApi.send({ studentId: notice.targetStudentId, title: notice.title, message: notice.message, priority: notice.priority });
      if (!r.ok) return { ok: false, error: r.error };
      logActivity('Direct Student Notice Sent', `Direct notice sent to ${notice.targetStudentName} (${notice.targetStudentRoll}): "${notice.title}".`);
      addNotification({
        title: `Direct Notice Sent`,
        message: `Dispatched to ${notice.targetStudentName} (${notice.targetStudentRoll}).`,
        category: 'circular',
        priority: notice.priority === 'critical' ? 'urgent' : 'high',
      });
      await refreshDirectAndDoubts();
      return { ok: true };
    },
    [logActivity, addNotification, refreshDirectAndDoubts]
  );

  // Mark direct notice as read.
  const markDirectNoticeAsRead = useCallback((id: string) => {
    setDirectNotices((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    directNoticesApi.markRead(id);
  }, []);

  /** Put one doubt the server just returned into the list (replace it, or add it at the top). */
  const putDoubt = (d: StudentDoubtTicket) =>
    setStudentDoubtTickets((prev) => (prev.some((x) => x.id === d.id) ? prev.map((x) => (x.id === d.id ? d : x)) : [d, ...prev]));

  // Ask student doubt.
  const askStudentDoubt = useCallback(
    async (doubt: DoubtInput): Promise<ActionResult> => {
      const r = await doubtsApi.ask(doubt);
      if (!r.ok) return { ok: false, error: r.error };
      putDoubt(r.data);
      logActivity('Student Doubt Submitted', `Asked doubt: "${r.data.questionTitle}" (${r.data.subjectName}).`);
      return { ok: true };
    },
    [logActivity]
  );

  // Reply to doubt.
  const replyToDoubt = useCallback(
    async (doubtId: string, replyText: string): Promise<ActionResult> => {
      if (!replyText.trim()) return { ok: false, error: 'Write your message' };
      const r = await doubtsApi.reply(doubtId, replyText.trim());
      if (!r.ok) return { ok: false, error: r.error };
      putDoubt(r.data);
      logActivity('Doubt Reply Added', `Replied to doubt ticket #${doubtId.slice(0, 7)}.`);
      return { ok: true };
    },
    [logActivity]
  );

  // Resolve doubt.
  const resolveDoubt = useCallback(
    async (doubtId: string): Promise<ActionResult> => {
      const r = await doubtsApi.resolve(doubtId);
      if (!r.ok) return { ok: false, error: r.error };
      putDoubt(r.data);
      logActivity('Doubt Resolved', `Marked doubt ticket #${doubtId.slice(0, 7)} as resolved.`);
      return { ok: true };
    },
    [logActivity]
  );

  // ----------------------------------------------------
  // ONLINE TESTS / ASSIGNMENTS (server). Deadline reminders are sent by the server too (server/notify/rules.ts).
  // ----------------------------------------------------
  const createOnlineTestAssignment = useCallback(
    async (test: NewOnlineTest): Promise<boolean> => {
      const r = await assignmentsApi.create(test);
      if (!r.ok) { addNotification({ title: 'Test not created', message: r.error, category: 'system', priority: 'high' }); return false; }
      setOnlineTestAssignments((prev) => [r.data, ...prev]);
      logActivity('Online Test Created', `Faculty created online test "${r.data.title}" (${r.data.subjectCode}) for ${r.data.branch} Year ${r.data.year}.`);
      return true;
    },
    [logActivity, addNotification]
  );

  // Loads online test questions from the server.
  const fetchOnlineTestQuestions = useCallback((testId: string) => assignmentsApi.questions(testId), []);

  // Submit online test.
  const submitOnlineTest = useCallback(
    async (testId: string, answers: (number | null)[]): Promise<ApiResult<SubmitResponse>> => {
      const r = await assignmentsApi.submit(testId, answers);
      if (r.ok) {
        setOnlineTestAssignments((prev) => prev.map((t) => (t.id === testId ? r.data.test : t)));
        logActivity('Online Test Submitted', `Student submitted test #${testId.slice(0, 8)}.`);
      } else addNotification({ title: 'Test not submitted', message: r.error, category: 'system', priority: 'high' });
      return r;
    },
    [logActivity, addNotification]
  );

  // Teacher / admin: remind the students of this test who have not submitted. The server sends it (and refuses other teachers' subjects).
  const sendDeadlineAlertToUnsubmittedStudents = useCallback(
    async (testId: string): Promise<RemindResponse | null> => {
      const r = await assignmentsApi.remind(testId);
      if (!r.ok) { addNotification({ title: 'Reminder not sent', message: r.error, category: 'system', priority: 'high' }); return null; }
      logActivity('Targeted Deadline Alert Dispatched', `Reminded ${r.data.sentCount} of ${r.data.pending} unsubmitted students for test #${testId.slice(0, 8)}.`);
      return r.data;
    },
    [logActivity, addNotification]
  );


  // ----------------------------------------------------
  // STUDENT STATUS TRACKING & DELETION
  // ----------------------------------------------------
  const updateStudentRecordStatus = useCallback(
    (
      studentId: string,
      newStatus: NonNullable<UserProfile['recordStatus']>,
      remarks?: string
    ) => {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== studentId) return u;
          const newHistoryItem = {
            status: newStatus,
            changedAt: new Date().toISOString().split('T')[0],
            changedBy: currentUser.name,
            remarks: remarks || `Status transitioned to ${newStatus}`,
          };
          const updatedHistory = [...(u.statusTrackHistory || []), newHistoryItem];
          return {
            ...u,
            recordStatus: newStatus,
            statusTrackHistory: updatedHistory,
          };
        })
      );
      logActivity(
        'Student Record Status Updated',
        `${currentUser.name} updated student status to "${newStatus}".`
      );
    },
    [currentUser, logActivity]
  );

  // Delete student.
  const deleteStudent = useCallback(
    (studentId: string) => {
      const target = users.find((u) => u.id === studentId);
      setUsers((prev) => prev.filter((u) => u.id !== studentId));
      logActivity(
        'Student Record Deleted',
        `Removed student ${target?.name || studentId} from institutional roster.`
      );
      addNotification({
        title: 'Student Record Removed',
        message: `Student record was deleted from the institutional database.`,
        category: 'system',
        priority: 'normal',
      });
    },
    [users, logActivity, addNotification]
  );

  // ----------------------------------------------------
  // CLASS-WISE EXCEL SPREADSHEET GENERATOR
  // ----------------------------------------------------
  const generateClassExcelCSV = useCallback(
    (targetYear: 1 | 2 | 3 | 'all', targetBranch: BranchCode | 'all'): string => {
      const studentUsers = users.filter((u) => u.role === 'student');
      const filtered = studentUsers.filter((s) => {
        const matchYear = targetYear === 'all' || s.year === targetYear;
        const matchBranch = targetBranch === 'all' || s.branch === targetBranch;
        return matchYear && matchBranch;
      });

      const headers = [
        'Sl. No',
        'Aadhar Card Name',
        'Mobile Number',
        'UBTER Roll Number',
        'Branch',
        'Year',
        'Semester',
        '10th %',
        '12th %',
        '1st Year % / CGPA',
        '2nd Year % / CGPA',
        '1st Sem %',
        '2nd Sem %',
        '3rd Sem %',
        '4th Sem %',
        'Full Address',
        'Mother Name',
        'Father Name',
        'Aadhar Number',
        'Record Status',
        'Attendance Overall %',
        'Student Login Password',
      ];

      const rows = filtered.map((st, idx) => {
        return [
          idx + 1,
          `"${st.aadharName || st.name}"`,
          `"${st.phone || ''}"`,
          `"${st.ubterRollNumber || st.rollNo || ''}"`,
          `"${st.branch || ''}"`,
          `"${st.year || ''}"`,
          `"${st.semester || ''}"`,
          `"${st.tenthPercentage || 'N/A'}"`,
          `"${st.twelfthPercentage || 'N/A'}"`,
          `"${st.firstYearCgpa || 'N/A'}"`,
          `"${st.secondYearCgpa || 'N/A'}"`,
          `"${st.semestersPercentage?.sem1 || 'N/A'}"`,
          `"${st.semestersPercentage?.sem2 || 'N/A'}"`,
          `"${st.semestersPercentage?.sem3 || 'N/A'}"`,
          `"${st.semestersPercentage?.sem4 || 'N/A'}"`,
          `"${(st.fullAddress || '').replace(/"/g, '""')}"`,
          `"${st.motherName || 'N/A'}"`,
          `"${st.fatherName || 'N/A'}"`,
          `"${st.aadharMasked || (st.aadharNumber ? 'XXXX XXXX ' + st.aadharNumber.replace(/\D/g, '').slice(-4) : 'N/A')}"`,
          `"${st.recordStatus || 'Active / Enrolled'}"`,
          `"${attendanceSummary[st.id]?.percent == null ? '' : attendanceSummary[st.id].percent + '%'}"`,
          `"(issued by admin)"`,
        ].join(',');
      });

      return [headers.join(','), ...rows].join('\n');
    },
    [users, attendanceSummary]
  );

  // Download class excel csv.
  const downloadClassExcelCSV = useCallback(
    (targetYear: 1 | 2 | 3 | 'all', targetBranch: BranchCode | 'all') => {
      const csvContent = generateClassExcelCSV(targetYear, targetBranch);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const yearLabel = targetYear === 'all' ? 'AllYears' : `Year_${targetYear}`;
      const branchLabel = targetBranch === 'all' ? 'AllBranches' : targetBranch;
      link.setAttribute('download', `UGIP_Class_Student_Database_${branchLabel}_${yearLabel}_2026.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      logActivity(
        'Class Excel Export',
        `Generated class spreadsheet for ${branchLabel} - ${yearLabel}.`
      );
      addNotification({
        title: 'Class Excel Sheet Exported',
        message: `Downloaded student records sheet for ${branchLabel} ${yearLabel}.`,
        category: 'academic',
        priority: 'normal',
      });
    },
    [generateClassExcelCSV, logActivity, addNotification]
  );

  // Reset database.
  const resetDatabase = () => {
    localStorage.clear();
    setUsers(INITIAL_USERS);
    setCurrentUser(INITIAL_USERS[0]);
    setSubjects(INITIAL_SUBJECTS);
    setDispatchedMaterials([]);
    setFacultyPunches(INITIAL_FACULTY_PUNCHES);
    setPapers(INITIAL_PAPERS);
    setNotices([]);
    setActivityLogs(INITIAL_ACTIVITY_LOGS);
    setNotifications(INITIAL_NOTIFICATIONS);
    applyThemeToDOM('light');
  };

  return (
    <CollegeContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        switchRole,
        users,
        addUser,
        updateUser,
        deleteUser,
        language,
        setLanguage,
        t,
        theme,
        setTheme,
        toggleTheme,
        notifications,
        unreadNotificationsCount,
        addNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearAllNotifications,
        activeToast,
        dismissToast,
        broadcastLiveAlert,
        soundEnabled,
        toggleSound,
        subjects,
        addSubject,
        updateSubject,
        deleteSubject,
        dispatchedMaterials,
        dispatchMaterialToClass,
        submitToDispatchedMaterial,
        gradeDispatchedSubmission,
        deleteDispatchedMaterial,
        getConsolidatedMarksData,
        exportAllStudentMarksToCSV,
        tests,
        createTest,
        updateTestMarks,
        updateSingleStudentMark,
        deleteSingleStudentMark,
        deleteTest,
        attendanceSessions,
        createAttendanceSession,
        closeAttendanceSession,
        refreshAcademic,
        reloadNotices: () => refreshNotices(true),          // Step 18
        reloadDirectAndDoubts: refreshDirectAndDoubts,       // Step 18
        reloadDispatches: refreshDispatches,                 // Step 18
        getAttendancePercent,
        getAttendanceCounts,
        attendanceSummary,
        markAttendance,
        manualUpdateAttendance,
        markStudentByFacultyScan,
        facultyPunches,
        punchFacultyAttendance,
        getFacultyTodayPunch,
        papers,
        addPaper,
        deletePaper,
        incrementPaperDownload,
        notices,
        addNotice,
        deleteNotice,
        activityLogs,
        logActivity,
        practicalExperiments,
        addPracticalExperiment,
        deletePracticalExperiment,
        timetableSlots,
        addTimetableSlot,
        deleteTimetableSlot,
        placementDrives,
        addPlacementDrive,
        updatePlacementDrive,
        deletePlacementDrive,
        govtPrivateJobs,
        addGovtPrivateJob,
        updateGovtPrivateJob,
        deleteGovtPrivateJob,
        verifyAdminOrFacultyPassword,
        authUser,
        authReady,
        login,
        loginMfa,
        refreshAuthUser,
        logout,
        changePassword,
        sharedExperiences,
        addSharedExperience,
        likeSharedExperience,
        onlineQuizzes,
        addOnlineQuiz,
        deleteOnlineQuiz,
        quizAttempts,
        submitQuizAttempt,
        studentProgressPoints,
        addStudentProgressPoint,
        updateStudentPhone,
        requestPasswordResetOTP,
        verifyOTPAndResetPassword,
        mockInterviews,
        saveMockInterview,
        isAdminSessionActive,
        setIsAdminSessionActive,
        returnToAdminPortal,
        getStudentAttendanceStats,
        getStudentAcademicSummary,
        getStudentSummary,
        getWeakStudentsAnalysis,
        // Direct Targeted One-on-One Student Notices
        directNotices,
        sendDirectStudentNotice,
        markDirectNoticeAsRead,
        // Real-Time Doubt Resolution & Q&A
        studentDoubtTickets,
        askStudentDoubt,
        replyToDoubt,
        resolveDoubt,
        // Student Record Status Tracking & Deletion
        updateStudentRecordStatus,
        deleteStudent,
        // Class-wise Excel Generation
        generateClassExcelCSV,
        downloadClassExcelCSV,
        // Online Tests & Targeted Unsubmitted Reminders
        onlineTestAssignments,
        createOnlineTestAssignment,
        fetchOnlineTestQuestions,
        submitOnlineTest,
        sendDeadlineAlertToUnsubmittedStudents,
        resetDatabase,
      }}
    >
      {children}
    </CollegeContext.Provider>
  );
};

// Use college.
export const useCollege = () => {
  const context = useContext(CollegeContext);
  if (!context) {
    throw new Error('useCollege must be used within a CollegeProvider');
  }
  return context;
};
