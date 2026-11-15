// ===================================================================================================
// TypeScript shapes of all data used by the screens (student, subject, exam, attendance, notice, placement...).
// ===================================================================================================
export type Role = 'admin' | 'faculty' | 'student' | 'parent';

// Data shape: branch code.
export type BranchCode = 'CSE' | 'Civil';

// Data shape: student category.
export type StudentCategory = 'General' | 'OBC' | 'SC' | 'ST' | 'EWS' | 'TFW';

// Data shape: app theme.
export type AppTheme = 'light' | 'dark' | 'system';

// Data shape: branch info.
export interface BranchInfo {
  code: BranchCode;
  name: string;
  hodName: string;
  intakeSeats: number;
  icon: string;
}

// Data shape: user profile.
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  phone?: string;
  department?: BranchCode;
  username?: string;
  password?: string;
  // Faculty specific
  designation?: string;
  assignedSubjectIds?: string[];
  // Student specific authentic dossier
  rollNo?: string;
  ubterRollNumber?: string;
  aadharName?: string;
  aadharNumber?: string;
  /** last 4 digits only, supplied by the server (the full number stays on the server) */
  aadharMasked?: string;
  branch?: BranchCode;
  year?: 1 | 2 | 3;
  semester?: 1 | 2 | 3 | 4 | 5 | 6;
  batch?: string;
  enrollmentNo?: string;
  category?: StudentCategory | string;
  gender?: 'Male' | 'Female' | 'Other';
  domicile?: string;
  admissionQuota?: string;
  attendanceOverall?: number;
  studentPassword?: string;
  // Academic percentages & records
  tenthPercentage?: number | string;
  twelfthPercentage?: number | string;
  firstYearCgpa?: string;
  secondYearCgpa?: string;
  thirdYearCgpa?: string;
  semestersPercentage?: {
    sem1?: string;
    sem2?: string;
    sem3?: string;
    sem4?: string;
    sem5?: string;
    sem6?: string;
  };
  sem1?: string;
  sem2?: string;
  sem3?: string;
  sem4?: string;
  fullAddress?: string;
  motherName?: string;
  fatherName?: string;
  recordStatus?: 'Active / Enrolled' | 'Fee Cleared' | 'Documents Verified' | 'Placement Ready' | 'Pending Review' | 'Passed Out' | 'Detained' | 'Year Back' | 'Left / Dropped';   // Step 18: last four = not promoted with the class
  statusTrackHistory?: { status: string; changedAt: string; changedBy: string; remarks?: string }[];
  // Resume details
  resumeUrl?: string;
  resumeFileName?: string;
  resumeUploadedAt?: string;
  resumeUploadedFrom?: string;
}

// Data shape: direct student notice.
export interface DirectStudentNotice {
  id: string;
  targetStudentId: string;
  targetStudentName: string;
  targetStudentRoll: string;
  title: string;
  message: string;
  priority: 'normal' | 'urgent' | 'critical';
  sentByRole: 'admin' | 'faculty';
  sentByName: string;
  sentAt: string;
  isRead?: boolean;
}

// Data shape: student doubt ticket.
export interface StudentDoubtTicket {
  id: string;
  studentId: string;
  studentName: string;
  studentRoll: string;
  branch: BranchCode;
  year: 1 | 2 | 3;
  semester: 1 | 2 | 3 | 4 | 5 | 6;
  subjectId: string;
  subjectName: string;
  questionTitle: string;
  questionDetails: string;
  expertFacultyId?: string;
  expertFacultyName?: string;
  status: 'Pending' | 'In Discussion' | 'Resolved';
  askedAt: string;
  replies: {
    id: string;
    senderRole: 'student' | 'faculty' | 'admin';
    senderId?: string;   // who wrote it (users.id): shows the delete button on your own replies
    senderName: string;
    text: string;
    timestamp: string;
  }[];
}

// Data shape: academic calendar event.
export interface AcademicCalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  type: 'exam' | 'deadline' | 'holiday' | 'event' | 'sessional';
  targetBranch?: BranchCode | 'all';
  targetYear?: 1 | 2 | 3 | 'all';
  createdByRole?: Role;
  createdByName?: string;
}

// Data shape: test question.
export interface TestQuestion { question: string; options: string[]; correctIndex: number; explanation?: string }
// Data shape: test result.
export interface TestResult { score: number; total: number; percentage: number; correct: number; wrong: number; grade: string; submittedAt: string; attempts?: number }

// Data shape: online test assignment.
export interface OnlineTestAssignment {
  id: string;
  title: string;
  subjectCode: string;
  subjectName: string;
  branch: BranchCode;
  year: 1 | 2 | 3;
  semester: 1 | 2 | 3 | 4 | 5 | 6;
  deadlineDate: string;
  deadlineTime: string;
  totalMarks: number;
  description: string;
  assignedByFacultyName: string;
  submittedStudentIds: string[];
  remindersSentCount: number; // 0, 1, 2, 3
  reminderLog?: { no: number; sentAt: string; recipientCount: number }[];
  facultyAlerted?: boolean;
  questions?: TestQuestion[]; // optional MCQs -> auto graded. From the server only teachers / admin get this (it holds the answers)
  results?: Record<string, TestResult>; // studentId -> auto-graded result (a student only gets their own)
  subjectId?: string;
  submittedCount?: number; // how many of the class submitted (students are not sent the other names)
  questionCount?: number;
  status: 'active' | 'expired' | 'completed';
}

// Data shape: topic item.
export interface TopicItem {
  id: string;
  title: string;
  chapter: string;
  weightageMarks: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  isHighFrequencyInUBTER: boolean;
  resourceNote?: string;
}

// Data shape: syllabus unit.
export interface SyllabusUnit {
  unitNo: number;
  unitTitle: string;
  topics: string[];
  hours: number;
}

// Data shape: subject.
export interface Subject {
  id: string;
  code: string;
  name: string;
  branch: BranchCode;
  semester: 1 | 2 | 3 | 4 | 5 | 6;
  year: 1 | 2 | 3;
  credits: number;
  facultyId: string;
  facultyName: string;
  hasPractical: boolean;
  importantTopics: TopicItem[];
  syllabusUnits: SyllabusUnit[];
  recommendedBooks?: string[];
}

// Subject & Class Dispatched Material (replacing generic notes assignment with subject + class targeted transmission)
export interface DispatchedMaterial {
  id: string;
  branch: BranchCode;
  year: 1 | 2 | 3;
  semester: 1 | 2 | 3 | 4 | 5 | 6;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  title: string;
  type: 'Lecture Notes' | 'Assignment & Task' | 'Test / Exam Paper' | 'Lab Module' | 'Circular Notice' | 'Formula Sheet';
  description: string;
  fileSizeBytes: string;
  attachmentName?: string;
  attachmentUrl?: string;
  fileContent?: string;
  sentByFacultyId: string;
  sentByFacultyName: string;
  sentAt: string;
  dueDate?: string;
  maxMarks?: number;
  submissions: DispatchedSubmission[];
}

// Data shape: dispatched submission.
export interface DispatchedSubmission {
  id: string;
  materialId: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  submittedAt: string;
  content: string;
  attachmentName?: string;
  attachmentUrl?: string;
  marksAwarded?: number;
  maxMarks?: number;
  feedback?: string;
  status: 'Submitted' | 'Graded' | 'Pending';
}

// Data shape: student test mark.
export interface StudentTestMark {
  studentId: string;
  studentName: string;
  rollNo: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  remarks?: string;
}

// Data shape: test exam.
export interface TestExam {
  id: string;
  title: string;
  /** Exam type. 'Class Test', 'MCQ Test' and 'Assignment' were added in Step 18 (UBTER sessional pattern). */
  type: 'Sessional 1' | 'Sessional 2' | 'Unit Test' | 'Class Test' | 'MCQ Test' | 'Assignment' | 'Practical / Viva' | 'Pre-Board Mock' | 'Board Exam';
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  maxMarks: number;
  date: string;
  timeSlot?: string;
  roomNumber?: string;
  duration?: string;
  reportingTime?: string;
  instructions?: string;
  status?: 'Upcoming' | 'Ongoing' | 'Completed';
  branch: BranchCode;
  semester: 1 | 2 | 3 | 4 | 5 | 6;
  results: StudentTestMark[];
  /** Academic year of the exam, e.g. '2026-27' (Step 18: lets old years stay visible after promotion). */
  academicYear?: string;
  /** true = random sample data (can be removed in one click by the admin). */
  isDemo?: boolean;
}

// Data shape: attendance record.
export interface AttendanceRecord {
  studentId: string;
  studentName: string;
  rollNo: string;
  status: 'Present' | 'Absent' | 'Late';
  markedVia: 'QR' | 'PIN' | 'Manual';
  timestamp: string;
}

// Data shape: attendance session.
export interface AttendanceSession {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  facultyId: string;
  facultyName: string;
  branch: BranchCode;
  semester: 1 | 2 | 3 | 4 | 5 | 6;
  date: string;
  timeSlot: string;
  topicTaught: string;
  qrToken: string;
  pinCode: string;
  status: 'Active' | 'Closed';
  expiresAt: string;
  records: AttendanceRecord[];
  /** Step 18: academic year of the class, e.g. '2026-27'. */
  academicYear?: string;
  /** Step 18: true = random sample data. */
  isDemo?: boolean;
}

// Data shape: previous year paper.
export interface PreviousYearPaper {
  id: string;
  title: string;
  branch: BranchCode;
  semester: 1 | 2 | 3 | 4 | 5 | 6;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  year: number;
  examSession: 'Winter (Dec/Jan)' | 'Summer (May/June)' | 'Special Back';
  questionCount: number;
  fileSizeBytes: string;
  downloadCount: number;
  solutionAvailable: boolean;
  highlights: string[];
  pdfPreviewUrl?: string;
}

// Data shape: notice announcement.
export interface NoticeAnnouncement {
  id: string;
  title: string;
  category: 'Academic' | 'Exam' | 'Scholarship' | 'Placement' | 'Sports' | 'Administrative';
  date: string;
  publishedBy: string;
  priority: 'Normal' | 'High' | 'Urgent';
  content: string;
  pdfAttachment?: string;
  /** who may see it: branch + semesters chosen by the admin / faculty who published it. Missing or empty = everyone. */
  targetBranch?: BranchCode | 'All';
  targetSemesters?: number[];
}

// Data shape: student weakness analysis.
export interface StudentWeaknessAnalysis {
  studentId: string;
  studentName: string;
  rollNo: string;
  branch: BranchCode;
  semester: number;
  riskLevel: 'High' | 'Medium' | 'Low';
  overallAttendance: number | null;   // null = no attendance recorded yet
  averageMarks: number | null;   // null = no marks entered yet
  weakSubjects: {
    subjectId: string;
    subjectCode: string;
    subjectName: string;
    sessionalMarks: number;
    maxMarks: number;
    attendancePercent: number | null;
    identifiedIssues: string[];
    remedialRecommendation: string;
  }[];
}

// Data shape: practical experiment.
export interface PracticalExperiment {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  experimentNo: number;
  title: string;
  objective: string;
  apparatus: string[];
  procedureSteps: string[];
  vivaQuestions: { question: string; answerSummary: string }[];
  maxMarks: number;
  inputType?: 'typed' | 'image' | 'written_note';
  imageUrl?: string;
  writtenNoteUrl?: string;
  branch?: BranchCode;
  semester?: number;
  uploadedBy?: string;
  date?: string;
}

// Data shape: practical submission.
export interface PracticalSubmission {
  id: string;
  experimentId: string;
  experimentNo: number;
  subjectId: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  completionDate: string;
  status: 'Completed' | 'Pending' | 'Signed' | 'Needs Revision';
  marksAwarded?: number;
  facultyRemarks?: string;
}

// Data shape: day of week.
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

// Data shape: timetable slot.
export interface TimetableSlot {
  id: string;
  branch: BranchCode;
  year: 1 | 2 | 3;
  semester: 1 | 2 | 3 | 4 | 5 | 6;
  day: DayOfWeek;
  periodNumber: number;
  timeSlot: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  facultyId: string;
  facultyName: string;
  roomNo: string;
  isLab: boolean;
}

// Data shape: activity log.
export interface ActivityLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: Role;
  action: string;
  details: string;
  ipAddress?: string;
  securityHash?: string;
}

// Data shape: faculty attendance punch.
export interface FacultyAttendancePunch {
  id: string;
  facultyId: string;
  facultyName: string;
  designation: string;
  department: string;
  date: string;
  inTime: string;
  outTime?: string;
  status: 'Present' | 'Late' | 'On Duty' | 'Half Day';
  method: 'QR Scan' | 'Staff Badge' | 'Biometric' | 'Manual' | 'Manual Punch';
  location: string;
}

// REAL-TIME NOTIFICATIONS MODEL
export type NotificationCategory = 'attendance' | 'exam' | 'circular' | 'academic' | 'system';
// Data shape: notification priority.
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// Data shape: app notification.
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  timestamp: string;
  targetRole?: Role | 'all';
  targetBranch?: BranchCode | 'all';
  isRead: boolean;
  actionUrl?: string;
  meta?: Record<string, any>;
}

// Consolidated Tabulation Row for Excel Export
export interface ConsolidatedStudentMarksRow {
  rollNo: string;
  enrollmentNo: string;
  studentName: string;
  branch: string;
  year: number;
  semester: number;
  category: string;
  subjectScores: {
    subjectCode: string;
    subjectName: string;
    sessional1: number;
    sessional2: number;
    totalObtained: number;
    maxMarks: number;
    percentage: number;
    grade: string;
  }[];
  grandTotalObtained: number;
  grandMaxMarks: number;
  overallPercentage: number;
  finalGrade: string;
  overallAttendance: number | null;   // null = no attendance recorded yet
  resultStatus: 'PASS' | 'PROMOTED' | 'REMEDIAL';
}

// ==========================================
// AI INTERACTIVE Q&A DRILL & DAY-BY-DAY PERFORMANCE
// ==========================================
export interface QnAQuestionItem {
  id: string;
  question: string;
  options: string[]; // 4 options [A, B, C, D]
  correctAnswer: string; // The correct option e.g. "B) Data Link Layer"
  explanation: string; // Step-by-step why correct & board exam concept
  userAnswer?: string; // What the student chose
  isCorrect?: boolean; // Whether answered correctly
  answeredAt?: string; // Time answered
  timeSpentSeconds?: number;
}

// Data shape: qn a session record.
export interface QnASessionRecord {
  id: string;
  userId: string;
  userName: string;
  userRollNo?: string;
  subject: string;
  topic: string;
  date: string; // "YYYY-MM-DD" e.g. "2026-09-27"
  timestamp: string; // ISO string
  totalQuestions: number; // e.g. 30
  correctCount: number; // e.g. 24
  wrongCount: number; // e.g. 6
  accuracyPercentage: number; // e.g. 80%
  questions: QnAQuestionItem[];
  difficulty?: 'Easy' | 'Medium' | 'Hard' | 'Mixed';
  durationSeconds?: number;
  notes?: string;
}

// Data shape: qn a daily performance.
export interface QnADailyPerformance {
  date: string; // "YYYY-MM-DD"
  formattedDate: string; // "27 Sep 2026"
  totalAttempted: number; // e.g. 30
  totalCorrect: number; // e.g. 24
  totalWrong: number; // e.g. 6
  accuracy: number; // e.g. 80%
  subjectWise: {
    subject: string;
    totalAttempted: number;
    correct: number;
    wrong: number;
    accuracy: number;
  }[];
  sessions: QnASessionRecord[];
}

// ==========================================
// 2026 PLACEMENT PORTAL, JOBS & CAREER HUB
// ==========================================
export interface PlacementDrive {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  branch: BranchCode | 'Both';
  ctc: string; // e.g. "₹ 4.20 LPA"
  stipend?: string;
  location: string;
  type: 'Campus Placement' | 'Industrial Training' | 'Government PSU' | 'Off-Campus Drive';
  deadline: string;
  vacancies: number;
  fullDescription: string;
  eligibilityCriteria: {
    minPercentage: number;
    allowedBacklogs: number;
    passingYear: number;
    branches: string[];
    otherCriteria?: string;
  };
  selectionProcess: string[];
  keySkills: string[];
  applyUrl?: string;
  contactPerson?: string;
  brochurePdfUrl?: string;
  offerLetterSampleUrl?: string;
  photos?: string[];
  isActive?: boolean;
}

// Data shape: government private job.
export interface GovernmentPrivateJob {
  id: string;
  title: string;
  organization: string;
  branch: BranchCode | 'Both';
  jobType: 'Government' | 'PSU' | 'Private EPC / IT';
  examOrPostName: string;
  expectedMonth: string;
  payScale: string; // e.g. "Pay Level-6 (₹ 35,400 - ₹ 1,12,400)"
  vacancies: number;
  qualification: string;
  ageLimit: string;
  officialLink: string;
  syllabusSummary: string;
  applicationDeadline: string;
  isActive: boolean;
  notes?: string;
}

// Data shape: shared experience.
export interface SharedExperience {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: Role | 'Alumni';
  authorAvatar?: string;
  branch: BranchCode;
  company: string;
  roleTitle: string;
  packageOffered?: string;
  title: string;
  textStory: string;
  mediaType: 'image' | 'video' | 'text';
  mediaUrl?: string;
  videoEmbedUrl?: string;
  likes: number;
  createdAt: string;
  tips: string[];
}

// Data shape: placement question item.
export interface PlacementQuestionItem {
  id: string;
  category: 'CSE' | 'Civil' | 'Aptitude' | 'Reasoning' | 'HR';
  topic: string;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  companyTags: string[];
}

// Data shape: mock interview session.
export interface MockInterviewSession {
  id: string;
  studentId: string;
  studentName: string;
  rollNo?: string;
  branch: BranchCode;
  targetRole: string;
  score: number; // out of 100
  totalQuestions: number;
  feedback: string;
  strengths: string[];
  areasToImprove: string[];
  date: string;
  timestamp: string;
}

// Data shape: subject online quiz.
export interface SubjectOnlineQuiz {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  branch: BranchCode;
  semester: number;
  title: string;
  durationMinutes: number;
  totalMarks: number;
  createdByFacultyName: string;
  questions: QnAQuestionItem[];
  createdAt: string;
}

// Data shape: student quiz attempt.
export interface StudentQuizAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  branch: BranchCode;
  score: number;
  totalMarks: number;
  percentage: number;
  date: string;
  passed: boolean;
}

// Data shape: student progress graph point.
export interface StudentProgressGraphPoint {
  dayLabel: string; // e.g. "Day 1 (25 Sep)", "Day 2 (26 Sep)", "Day 3 (Today)"
  date: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  branch: BranchCode;
  scorePercentage: number;
  totalAttempted: number;
  /** Step 20: database id (made automatically: one point per student per day label) */
  id?: string;
}

// Data shape: document material item.
export interface DocumentMaterialItem {
  id: string;
  title: string;
  description: string;
  type: 'pdf' | 'image' | 'doc' | 'link';   // doc = Word / PowerPoint / Excel
  category:
    | 'Lecture Notes'
    | 'Lab Manual'
    | 'Question Bank'
    | 'Syllabus & Curriculum'
    | 'Assignment / Tutorial'
    | 'Official Circular'
    | 'Reference E-Book'
    | 'Online Video / Lecture';
  branch: BranchCode | 'All';
  semester: number | 'All';
  subjectId?: string;
  subjectCode: string;
  subjectName: string;
  fileUrl?: string;
  fileName?: string;
  fileSizeBytes?: string;
  pageCount?: number;
  uploadedByFacultyId: string;
  uploadedByFacultyName: string;
  uploadedAt: string;
  downloadCount: number;
  tags: string[];
  mine?: boolean;   // set by the server: this person uploaded it (may edit / delete)
}


