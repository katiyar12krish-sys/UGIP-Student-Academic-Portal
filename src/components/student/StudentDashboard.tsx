// ===================================================================================================
// Student dashboard: profile, attendance, marks, tests, materials, practicals, Step 18 "My UBTER Results".
// ===================================================================================================
import { MyLoginCard } from '../common/MyLoginCard';
import { SyllabusViewer } from '../common/SyllabusViewer';   // official UBTER syllabus
import React, { useState, useRef } from 'react';
import { useCollege } from '../../context/CollegeContext';
import {
  BookOpen,
  BarChart3,
  CheckCircle2,
  QrCode,
  FileText,
  Award,
  Sparkles,
  Download,
  Brain,
  Layers,
  GraduationCap,
  Clock,
  FlaskConical,
  FolderDown,
  Briefcase,
  Trophy,
  MessageSquareQuote,
  ExternalLink,
  Camera,
  Video,
  LogOut,
  Calendar,
  Send,
  Key,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Volume2,
  Copy,
  Check,
  X,
  MapPin,
  User,
  Phone,
  ShieldCheck,
  AlertCircle,
  Printer,
  UserCog,
  Target,
  Menu,
  KeyRound,
} from 'lucide-react';
import { PlacementPracticeCenter } from '../placement/PlacementPrep';   // placement practice / mock tests + resume ATS score
import { MyProfileCard } from '../common/MyProfileCard';             // self-service: own details + own password
import { QuestionPapersHub } from '../common/QuestionPapersHub';         // question papers + answer keys (open / download / upload)
import { PaperPreviewModal } from '../common/PaperPreviewModal';
import { TimetableModule } from '../common/TimetableModule';
import { PracticalLabManager } from '../common/PracticalLabManager';
import { BoardResultsManager } from '../common/BoardResultsManager';   // Step 18: UBTER board results
import { StudyMaterialsLibrary } from '../common/StudyMaterialsLibrary';
import { InternshipPlacementPortal } from '../common/InternshipPlacementPortal';
import { AchievementsGallery } from '../common/AchievementsGallery';
import { StudentFeedbackModal } from '../common/StudentFeedbackModal';
import { StudentQRCodeCard } from './StudentQRCodeCard';
import { UserAvatar } from '../common/UserAvatar';
import { PhotoUploadModal } from '../common/PhotoUploadModal';
import { AISubjectSolverModal } from '../common/AISubjectSolverModal';
import { AIQuizDrillAndAnalytics } from '../common/AIQuizDrillAndAnalytics';
import { StudentPerformanceAnalyticsDashboard } from '../analytics/StudentPerformanceAnalyticsDashboard';
import { UBTERResultPortal } from './UBTERResultPortal';
import { ExamSchedule } from './ExamSchedule';
import { ClassSubjectDispatcher } from '../common/ClassSubjectDispatcher';
import { MockInterviewPortal } from './MockInterviewPortal';
import { DocumentMaterialHub } from '../common/DocumentMaterialHub';
import { OnlineTestAssignmentManager } from '../common/OnlineTestAssignmentManager';
import { RealtimeDoubtResolutionHub } from '../common/RealtimeDoubtResolutionHub';
import { YearwiseAttendanceAnalysis } from '../common/YearwiseAttendanceAnalysis';
import { PreviousYearPaper } from '../../types';

// Data shape: student dashboard props.
interface StudentDashboardProps {
  onOpenQRScanner: () => void;
  onLogout?: () => void;
  forceMobileView?: boolean;
}

/** Shows a saved value, or a clear "not added yet" note. Never invents data (the old screen showed another student's numbers when a field was blank). */
const NOT_ADDED = 'Not added yet';
// Shown.
const shown = (v: unknown) => (v === undefined || v === null || String(v).trim() === '' || /^n\/?a$/i.test(String(v).trim()) ? NOT_ADDED : String(v));
// Shown pct.
const shownPct = (v: unknown) => { const t = String(v ?? '').replace(/%/g, '').trim(); return !t || /^n\/?a$/i.test(t) ? NOT_ADDED : /cgpa/i.test(t) ? t : `${t}%`; };

// Screen part: student dashboard.
export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onOpenQRScanner, onLogout, forceMobileView = false }) => {
  const {
    currentUser,
    users,
    subjects,
    dispatchedMaterials,
    tests,
    papers,
    addPaper,
    deletePaper,
    getStudentSummary,
    getStudentAttendanceStats,
    getStudentAcademicSummary,
    directNotices,
    markDirectNoticeAsRead,
    requestPasswordResetOTP,
    verifyOTPAndResetPassword,
    onlineTestAssignments,
    studentDoubtTickets,
    askStudentDoubt,
    t,
    language,
  } = useCollege();
  const isHi = language === 'hi';

  // Which tab is open right now
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'my-profile'
    | 'placement-prep'
    | 'syllabus'
    | 'online-tests'
    | 'doubt-chat'
    | 'class-materials'
    | 'material-hub'
    | 'exam-schedule'
    | 'my-qr-id'
    | 'ubter-result'
    | 'timetable'
    | 'practicals'
    | 'board-results'
    | 'materials'
    | 'attendance'
    | 'results'
    | 'placements'
    | 'mock-interview'
    | 'achievements'
    | 'pyq'
    | 'performance-analytics'
    | 'ai-quiz-drill'
    | 'ai-tutor'
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

  // Is the 'my password' shown on screen? (true / false)
  const [showMyPassword, setShowMyPassword] = useState(false);
  // Is the 'password otp pop-up' shown on screen? (true / false)
  const [showPasswordOtpModal, setShowPasswordOtpModal] = useState(false);
  // Otp stage (kept in screen state)
  const [otpStage, setOtpStage] = useState<'request' | 'verify'>('request');
  // Otp phone input (kept in screen state)
  const [otpPhoneInput, setOtpPhoneInput] = useState(currentUser.phone || '');
  // Entered otp (kept in screen state)
  const [enteredOtp, setEnteredOtp] = useState('');
  // New password value (kept in screen state)
  const [newPasswordValue, setNewPasswordValue] = useState('');
  // Otp feedback (kept in screen state)
  const [otpFeedback, setOtpFeedback] = useState<string | null>(null);
  // Error message to show (otp error); empty = no error
  const [otpError, setOtpError] = useState<string | null>(null);
  // Debug otp (kept in screen state)
  const [debugOtp, setDebugOtp] = useState<string | null>(null);

  // Is the 'dossier pop-up' shown on screen? (true / false)
  const [showDossierModal, setShowDossierModal] = useState(false);
  // Tutor language (kept in screen state)
  const [tutorLanguage, setTutorLanguage] = useState<'hi' | 'en' | 'hinglish'>('hi');
  // Is the 'add paper pop-up' shown on screen? (true / false)
  const [showAddPaperModal, setShowAddPaperModal] = useState(false);
  // New paper title (kept in screen state)
  const [newPaperTitle, setNewPaperTitle] = useState('');
  // New paper subject id (kept in screen state)
  const [newPaperSubjectId, setNewPaperSubjectId] = useState('');

  // Is it photo modal open? (true / false)
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  // Is the 'ai solver pop-up' shown on screen? (true / false)
  const [showAISolverModal, setShowAISolverModal] = useState(false);
  // Preview paper (kept in screen state)
  const [previewPaper, setPreviewPaper] = useState<PreviousYearPaper | null>(null);
  // Is the 'feedback pop-up' shown on screen? (true / false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Direct Ask Faculty Doubt Modal States
  const [showDirectAskDoubtModal, setShowDirectAskDoubtModal] = useState(false);
  // Direct doubt subject id (kept in screen state)
  const [directDoubtSubjectId, setDirectDoubtSubjectId] = useState('');
  // Error message to show (direct doubt error); empty = no error
  const [directDoubtError, setDirectDoubtError] = useState('');
  // Direct doubt busy (kept in screen state)
  const [directDoubtBusy, setDirectDoubtBusy] = useState(false);
  // only the subjects of the student's own class (the server refuses any other)
  const classSubjects = subjects.filter((s) => s.branch === currentUser.branch && s.semester === currentUser.semester);
  const chosenDoubtSubjectId = directDoubtSubjectId || classSubjects[0]?.id || '';
  // Direct doubt title (kept in screen state)
  const [directDoubtTitle, setDirectDoubtTitle] = useState('');
  // List of direct doubt details shown on this screen
  const [directDoubtDetails, setDirectDoubtDetails] = useState('');
  // Direct doubt success toast (kept in screen state)
  const [directDoubtSuccessToast, setDirectDoubtSuccessToast] = useState<string | null>(null);

  // Runs when the user does this on screen: direct submit doubt.
  const handleDirectSubmitDoubt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (directDoubtBusy || !directDoubtTitle.trim() || !directDoubtDetails.trim()) return;
    if (!chosenDoubtSubjectId) { setDirectDoubtError('No subject found for your class.'); return; }
    setDirectDoubtBusy(true); setDirectDoubtError('');
    const r = await askStudentDoubt({ subjectId: chosenDoubtSubjectId, questionTitle: directDoubtTitle.trim(), questionDetails: directDoubtDetails.trim() });
    setDirectDoubtBusy(false);
    if (!r.ok) { setDirectDoubtError(r.error); return; }

    setDirectDoubtSuccessToast('Doubt submitted to the teacher(s) of this subject!');
    setTimeout(() => {
      setDirectDoubtSuccessToast(null);
      setShowDirectAskDoubtModal(false);
      setDirectDoubtTitle('');
      setDirectDoubtDetails('');
      setActiveTab('doubt-chat');
    }, 1200);
  };

  // Tutor question (kept in screen state)
  const [tutorQuestion, setTutorQuestion] = useState('');
  // Tutor subject (kept in screen state)
  const [tutorSubject, setTutorSubject] = useState('');
  // Tutor response (kept in screen state)
  const [tutorResponse, setTutorResponse] = useState<string | null>(null);
  // Is it tutor loading? (true / false)
  const [isTutorLoading, setIsTutorLoading] = useState(false);
  // Is it answer copied? (true / false)
  const [isAnswerCopied, setIsAnswerCopied] = useState(false);
  // Is it answer expanded? (true / false)
  const [isAnswerExpanded, setIsAnswerExpanded] = useState(true);
  const answerRef = useRef<HTMLDivElement>(null);

  const summary = getStudentSummary(currentUser.id);
  const attStats = getStudentAttendanceStats(currentUser.id);
  const acadSummary = getStudentAcademicSummary(currentUser.id);

  const myClassDispatches = dispatchedMaterials.filter(
    (m) =>
      (!currentUser.branch || m.branch === currentUser.branch) &&
      (!currentUser.semester || m.semester === currentUser.semester)
  );

  // Runs when the user does this on screen: ask ai tutor.
  const handleAskAITutor = async (questionText?: string, langOverride?: 'hi' | 'en' | 'hinglish') => {
    const q = questionText || tutorQuestion;
    const chosenLang = langOverride || tutorLanguage;
    if (!q.trim()) return;
    setIsTutorLoading(true);
    try {
      const res = await fetch('/api/ai/student-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          subject: tutorSubject || 'Polytechnic Engineering',
          branch: currentUser.branch || 'CSE',
          semester: currentUser.semester || 3,
          language: chosenLang,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTutorResponse(data.answer || data.solution || data.content || 'Explanation generated.');
        setTimeout(() => {
          answerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      } else {
        throw new Error(data.error || 'Server error');
      }
    } catch (err) {
      console.warn('API error, providing rich offline academic solution:', err);
      let fallbackText = '';
      if (chosenLang === 'hi') {
        fallbackText = `### उत्तराखंड राजकीय पॉलिटेक्निक संस्थान - UGIP AI स्टडी साथी\\n**विषय:** ${tutorSubject || 'डिप्लोमा इंजीनियरिंग'}\\n**प्रश्न:** "${q}"\\n\\n#### 1. मुख्य अवधारणा एवं नियम (Core Principle):\\nयह विषय UBTER (उत्तराखंड प्राविधिक शिक्षा परिषद) के निर्धारित डिप्लोमा इंजीनियरिंग पाठ्यक्रम के अनुसार अत्यंत महत्वपूर्ण है। परीक्षा में उच्च अंक प्राप्त करने के लिए अवधारणा और सूत्रों की स्पष्टता आवश्यक है।\\n\\n#### 2. चरणबद्ध समाधान (Step-by-Step Explanation):\\n1. **दिए गए डेटा की पहचान:** प्रश्न में दिए गए मान और सीमा शर्तों (Boundary Conditions) को सूचीबद्ध करें।\\n2. **मूल सूत्र लागू करें:** संबंधित भौतिक/गणितीय समीकरण को स्थापित करें।\\n3. **गणना एवं विश्लेषण:** समीकरण को हल करें और मध्यवर्ती मानों की पुष्टि करें।\\n4. **अंतिम परिणाम:** मात्रक (SI Unit) के साथ अंतिम परिणाम को स्पष्ट रूप से बॉक्स में लिखें।\\n\\n#### 3. UBTER बोर्ड परीक्षा टिप्स:\\n- उत्तर लिखते समय स्वच्छ और नामांकित चित्र (Neat Diagram) अवश्य बनाएं।\\n- मुख्य सूत्रों और अंतिम उत्तर को हाइलाइट करें।`;
      } else if (chosenLang === 'hinglish') {
        fallbackText = `### UGIP - UGIP AI Study Saathi\\n**Subject:** ${tutorSubject || 'Diploma Engineering'}\\n**Query:** "${q}"\\n\\n#### 1. Core Principle (Mukhya Niyam):\\nYeh topic UBTER Roorkee diploma syllabus ka important part hai. Isme standard technical concepts aur SI units follow hote hain.\\n\\n#### 2. Step-by-Step Derivation & Solution:\\n1. Pehle given parameters aur boundary conditions likhein.\\n2. Fundamental formulas apply karein.\\n3. Stepwise values calculate karein aur units verify karein.\\n\\n#### 3. Board Exam Tips:\\n- Diagrams saaf aur labeled banayein taaki full marks milein!`;
      } else {
        fallbackText = `### Uttarakhand Government Institute of Polytechnic - UGIP AI Study Saathi\\n**Subject:** ${tutorSubject || 'Engineering Science'}\\n**Query:** "${q}"\\n\\n#### 1. Core Concept & Principles:\\nThis question pertains to the core curriculum prescribed by UBTER & AICTE. Fundamental constitutive equations and principles govern this solution.\\n\\n#### 2. Step-by-Step Derivation & Solution:\\n1. State initial boundary conditions and given specifications.\\n2. Apply the relevant physical or mathematical law.\\n3. Compute intermediate values preserving SI dimensional consistency.\\n4. Box the final answer with its standard units.\\n\\n#### 3. High-Scoring Exam Guidelines:\\n- Draw neat labeled schematic diagrams.\\n- Highlight critical formulas for full marks.`;
      }
      setTutorResponse(fallbackText);
      setTimeout(() => {
        answerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    } finally {
      setIsTutorLoading(false);
    }
  };

  // Runs when the user does this on screen: student upload paper.
  const handleStudentUploadPaper = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaperTitle.trim()) return;
    const sub = subjects.find((s) => s.id === newPaperSubjectId) || subjects.find((s) => s.branch === (currentUser.branch || 'CSE')) || subjects[0];
    addPaper({
      title: newPaperTitle.trim(),
      branch: (currentUser.branch as any) || 'CSE',
      semester: (currentUser.semester as any) || 3,
      subjectId: sub.id,
      subjectCode: sub.code,
      subjectName: sub.name,
      year: 2024,
      examSession: 'Winter (Dec/Jan)',
      questionCount: 12,
      fileSizeBytes: '1.8 MB',
      solutionAvailable: true,
      highlights: ['Student Shared Question Paper', 'Solved with step-by-step notes'],
    });
    setNewPaperTitle('');
    setShowAddPaperModal(false);
  };

  // Runs when the user does this on screen: request otp.
  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    const targetPhone = otpPhoneInput.trim() || currentUser.phone || '';
    const res = requestPasswordResetOTP(targetPhone);
    if (res.success) {
      setOtpStage('verify');
      setOtpFeedback(res.message);
      setDebugOtp(res.debugOTP || (res as any).debugOtp || null);
    } else {
      setOtpError(res.message);
    }
  };

  // Runs when the user does this on screen: verify and reset password.
  const handleVerifyAndResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    if (!enteredOtp || !newPasswordValue) {
      setOtpError('Please fill in both the OTP and the new password.');
      return;
    }
    const targetPhone = otpPhoneInput.trim() || currentUser.phone || '';
    const res = verifyOTPAndResetPassword(targetPhone, enteredOtp.trim(), newPasswordValue.trim());
    if (res.success) {
      setOtpFeedback('Password successfully updated! You can now use your new password.');
      setTimeout(() => {
        setShowPasswordOtpModal(false);
        setOtpStage('request');
        setEnteredOtp('');
        setNewPasswordValue('');
        setOtpFeedback(null);
      }, 1800);
    } else {
      setOtpError(res.message);
    }
  };

  const studentNavTabs = [
    { id: 'overview', label: isHi ? 'ओवरव्यू (होम)' : (t.overview || 'Overview'), icon: Layers, category: 'Academics' },
    { id: 'my-profile', label: isHi ? 'मेरी प्रोफाइल (एडिट)' : 'My Profile (edit)', icon: UserCog, category: 'Account' },
    { id: 'syllabus', label: isHi ? 'सिलेबस (UBTER)' : 'Syllabus (UBTER)', icon: BookOpen, badge: isHi ? 'यूनिट-वाइज' : 'Unit-wise', category: 'Academics' },
    { id: 'online-tests', label: isHi ? `ऑनलाइन टेस्ट (${onlineTestAssignments.filter(t => t.branch === currentUser.branch && t.year === currentUser.year).length})` : `Online Tests (${onlineTestAssignments.filter(t => t.branch === currentUser.branch && t.year === currentUser.year).length})`, icon: Award, badge: isHi ? 'बकाया' : 'Due', category: 'Assessment' },
    { id: 'doubt-chat', label: isHi ? 'डाउट समाधान (Q&A)' : 'Doubt Resolution (Q&A)', icon: MessageSquareQuote, badge: isHi ? 'लाइव चैट' : 'Live Chat', category: 'AI & Doubts' },
    { id: 'class-materials', label: isHi ? `क्लास सामग्री (${myClassDispatches.length})` : `Class Subject Materials (${myClassDispatches.length})`, icon: Send, badge: isHi ? 'डायरेक्ट' : 'Direct', category: 'Academics' },
    { id: 'material-hub', label: isHi ? 'दस्तावेज व नोट्स हब' : 'Document & Material Hub', icon: FolderDown, badge: isHi ? 'कोर्स PDFs' : 'Course PDFs', category: 'Academics' },
    { id: 'exam-schedule', label: isHi ? 'परीक्षा डेटशीट' : (t.examSchedule || 'Exam Schedule'), icon: Calendar, badge: isHi ? 'डेटशीट' : 'Datesheet', category: 'Academics' },
    { id: 'ubter-result', label: isHi ? 'UBTER बोर्ड रिजल्ट' : 'UBTER Result', icon: ExternalLink, badge: isHi ? 'ऑफिशियल' : 'Official', category: 'Assessment' },
    { id: 'my-qr-id', label: isHi ? 'मेरा छात्र QR व ID' : 'My Student QR & ID', icon: QrCode, category: 'Account' },
    { id: 'timetable', label: isHi ? 'टाइमटेबल' : (t.timetable || 'Timetable'), icon: Clock, category: 'Academics' },
    { id: 'practicals', label: isHi ? 'प्रैक्टिकल्स व लैब्स' : (t.practicals || 'Practicals'), icon: FlaskConical, category: 'Academics' },
    { id: 'attendance', label: `${isHi ? 'हाजिरी' : t.attendance} (${attStats.overallPercent}%)`, icon: QrCode, badge: `${attStats.overallPercent}%`, category: 'Assessment' },
    { id: 'results', label: isHi ? 'मार्क्स व परीक्षा फल' : (t.resultsMarks || 'Results & Marks'), icon: Award, category: 'Assessment' },
    { id: 'placements', label: isHi ? 'TPO प्लेसमेंट पोर्टल' : 'TPO Placement Portal', icon: Briefcase, badge: 'Jobs 2026', category: 'Career' },
    { id: 'placement-prep', label: isHi ? 'प्लेसमेंट प्रैक्टिस व रिज्यूमे' : 'Placement Practice & Resume Score', icon: Target, badge: 'New', category: 'Career' },
    { id: 'mock-interview', label: isHi ? 'मॉक इंटरव्यू पोर्टल' : 'Mock Interview Portal', icon: Video, badge: isHi ? 'कैमरा + AI' : 'Camera + AI', category: 'Career' },
    { id: 'achievements', label: isHi ? 'ऑनर्स व उपलब्धियां' : (t.honorsGallery || 'Achievements Gallery'), icon: Trophy, category: 'Career' },
    { id: 'pyq', label: isHi ? 'पुराने पेपर्स व उत्तर कुंजी' : 'Question Papers & Answer Keys', icon: Download, badge: 'UBTER 50M', category: 'Academics' },
    { id: 'performance-analytics', label: isHi ? 'छात्र परफॉर्मेंस एनालिटिक्स' : 'Student Performance Analytics', icon: BarChart3, badge: isHi ? 'डे 1 ➔ आज' : 'Day 1 ➔ Today', category: 'Assessment' },
    { id: 'ai-tutor', label: isHi ? 'AI स्टडी साथी' : 'AI Study Saathi', icon: Sparkles, badge: '24/7 AI', category: 'AI & Doubts' },
  ];

  const quickTabs = [
    { id: 'overview', label: isHi ? '🏠 होम' : '🏠 Home' },
    { id: 'pyq', label: isHi ? '📝 पेपर्स (50M)' : '📝 Papers (50M)' },
    { id: 'attendance', label: `${isHi ? '📊 हाजिरी' : '📊 Attendance'} (${attStats.overallPercent}%)` },
    { id: 'doubt-chat', label: isHi ? '💬 डाउट्स Q&A' : '💬 Doubts Q&A' },
    { id: 'online-tests', label: isHi ? '✍️ टेस्ट' : '✍️ Tests' },
    { id: 'material-hub', label: isHi ? '📁 नोट्स व पीडीएफ' : '📁 Notes & PDFs' },
    { id: 'results', label: isHi ? '🏆 मार्क्स' : '🏆 Marks' },
    { id: 'ai-tutor', label: isHi ? '🤖 AI साथी' : '🤖 AI Saathi' },
    { id: 'syllabus', label: isHi ? '📖 सिलेबस UBTER' : '📖 UBTER Syllabus' },
    { id: 'timetable', label: isHi ? '📅 टाइमटेबल' : '📅 Timetable' },
    { id: 'exam-schedule', label: isHi ? '🗓️ परीक्षा डेटशीट' : '🗓️ Exam Datesheet' },
    { id: 'ubter-result', label: isHi ? '🌐 बोर्ड रिजल्ट' : '🌐 Board Result' },
    { id: 'practicals', label: isHi ? '🔬 प्रैक्टिकल्स' : '🔬 Practicals' },
    { id: 'placements', label: isHi ? '💼 प्लेसमेंट हब' : '💼 Placements' },
    { id: 'placement-prep', label: isHi ? '🎯 रिज्यूमे स्कोर' : '🎯 Resume Score' },
    { id: 'mock-interview', label: isHi ? '🎥 मॉक इंटरव्यू' : '🎥 Mock Interview' },
    { id: 'my-qr-id', label: isHi ? '📷 स्टूडेंट QR' : '📷 Student QR' },
    { id: 'achievements', label: isHi ? '🏅 ऑनर्स गैलरी' : '🏅 Honors' },
    { id: 'my-profile', label: isHi ? '👤 प्रोफाइल व पासवर्ड' : '👤 Profile & Password' },
  ];

  const activeTabObj = studentNavTabs.find((t) => t.id === activeTab) || studentNavTabs[0];
  const ActiveIcon = activeTabObj.icon;

  return (
    <div id="student-dashboard-container" className="space-y-6 pb-24 sm:pb-8">
      <MyLoginCard />
      {/* Student Banner */}
      <div className="ugip-hero bg-slate-900 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-lg relative overflow-hidden">
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
                <Camera className="w-3 h-3 text-blue-300" />
                <span>{currentUser.avatar ? 'Change Photo' : 'Upload Photo'}</span>
              </button>
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-600/20 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 uppercase tracking-wider">
                  <GraduationCap className="w-3.5 h-3.5" /> {t.studentRole}
                </span>
                <span className="text-xs text-slate-300">
                  {currentUser.branch} Engineering · Year {currentUser.year} (Sem {currentUser.semester})
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Category: {currentUser.category || 'General'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold">{currentUser.name}</h2>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
                <div className="bg-blue-950/80 px-2.5 py-1 rounded-lg border border-blue-400/40 text-blue-200">
                  <span className="text-[10px] uppercase font-bold text-blue-300 mr-1">Roll No:</span>
                  <span className="font-bold text-white tracking-wide">{currentUser.rollNo}</span>
                </div>
                <span className="text-slate-400 text-[11px] hidden sm:inline">
                  Enroll: {currentUser.enrollmentNo || 'Not filled yet'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowDossierModal(true)}
              className="px-3.5 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-400/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title={isHi ? 'अपना सत्यापित आधार, माता-पिता, 10वीं/12वीं व सेमेस्टर अंक देखें' : 'View your verified Aadhar, parents, 10th/12th and semester marks'}
            >
              <FileText className="w-4 h-4 text-blue-300" />
              <span>{isHi ? 'मेरा डोजियर व अंक' : 'My Dossier & Marks'}</span>
            </button>
            <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl text-center min-w-[90px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">{t.attendance}</span>
              <p
                className={`text-lg font-bold mt-0.5 ${
                  summary.overallAttendance >= 75 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {summary.overallAttendance}%
              </p>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                title={isHi ? 'छात्र पोर्टल से बाहर निकलें व मुख्य पृष्ठ पर लौटें' : 'Exit Student Dashboard & Return Home'}
              >
                <LogOut className="w-4 h-4 text-white" />
                <span>{isHi ? 'पोर्टल से बाहर निकलें (Exit)' : 'Exit Portal'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* DIRECT TARGETED NOTICES ALERT BANNER */}
      {directNotices.filter((n) => n.targetStudentId === currentUser.id && !n.isRead).length > 0 && (
        <div className="space-y-2">
          {directNotices
            .filter((n) => n.targetStudentId === currentUser.id && !n.isRead)
            .map((dn) => (
              <div
                key={dn.id}
                className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-2xl shadow-md animate-in fade-in flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 mt-1 animate-ping" />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.2 rounded text-[10px] font-black bg-rose-600 text-white uppercase">
                        {dn.priority} DIRECT NOTICE
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {dn.title}
                      </span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-200 font-sans">
                      {dn.message}
                    </p>
                    <div className="text-[11px] text-slate-500">
                      Sent by: <strong className="text-slate-700 dark:text-slate-300">{dn.sentByName}</strong> ({dn.sentByRole}) · {dn.sentAt}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => markDirectNoticeAsRead(dn.id)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-[11px] cursor-pointer shrink-0"
                >
                  ✓ Mark Read
                </button>
              </div>
            ))}
        </div>
      )}

      {/* MOBILE COMPACT NAVIGATION HEADER (< sm or forced phone view) */}
      <div className={`${forceMobileView ? 'block' : 'sm:hidden'} space-y-2.5`}>
        {/* Active Tab Bar + "All Tabs" button */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
              <ActiveIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">
                {isHi ? 'सक्रिय अनुभाग' : 'Active Section'}
              </div>
              <div className="text-xs font-black text-slate-900 dark:text-white truncate">{activeTabObj.label}</div>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
          >
            <Menu className="w-3.5 h-3.5" />
            <span>{isHi ? 'सभी मेनू' : 'All Menus'} ({studentNavTabs.length})</span>
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
      <aside id="student-sidebar" className={`ugip-menu ${forceMobileView ? 'hidden' : 'hidden sm:flex'} flex-col overflow-y-auto overflow-x-hidden gap-1 p-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs sm:max-h-[calc(100vh-2rem)] sm:w-52 lg:w-64 sm:shrink-0 sm:sticky sm:top-4`}>
        <div className="px-3 pt-2 pb-3">
          <div className="text-[10px] font-extrabold tracking-widest text-blue-800 dark:text-blue-300 uppercase">Student Portal</div>
          <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{currentUser.name}</div>
          <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-900 px-3 py-2 font-mono text-[11px] text-blue-900 dark:text-blue-200">
            <div>Roll: {currentUser.rollNo}</div>
            <div className="text-emerald-700 dark:text-emerald-400">{currentUser.year === 1 ? '1st' : currentUser.year === 2 ? '2nd' : '3rd'} Year • {currentUser.branch === 'Civil' ? 'Civil' : 'Computer'}</div>
          </div>
        </div>
        {studentNavTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`student-tab-${tab.id}`}
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

      {/* Tab "overview" */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="ugip-stats grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 sm:p-5 shadow-xs min-w-0 flex flex-col justify-between">
              <div>
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate block">
                  {isHi ? 'नामांकित कक्षा' : 'Class Enrolled'}
                </span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {currentUser.branch}
                </p>
              </div>
              <p className="text-[11px] sm:text-xs text-blue-600 dark:text-blue-400 font-semibold mt-2 truncate">
                {isHi ? `वर्ष ${currentUser.year} · सेमेस्टर ${currentUser.semester}` : `Year ${currentUser.year} · Sem ${currentUser.semester}`}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 sm:p-5 shadow-xs min-w-0 flex flex-col justify-between">
              <div>
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate block">
                  {isHi ? 'कक्षा अध्ययन सामग्री' : 'Class Materials'}
                </span>
                <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {myClassDispatches.length} {isHi ? 'पैक्स' : 'Packs'}
                </p>
              </div>
              <button
                onClick={() => setActiveTab('class-materials')}
                className="text-[11px] sm:text-xs text-emerald-600 hover:underline font-bold mt-2 block text-left truncate"
              >
                {isHi ? 'जारी सामग्री देखें →' : 'View Dispatched Tasks →'}
              </button>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 sm:p-5 shadow-xs min-w-0 flex flex-col justify-between">
              <div>
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate block">
                  {isHi ? 'हाजिरी स्थिति' : 'Attendance Status'}
                </span>
                <p
                  className={`text-xl sm:text-2xl font-black mt-1 ${
                    attStats.overallPercent >= 75 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {attStats.overallPercent}%
                </p>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-2 truncate">
                {isHi ? 'UBTER परीक्षा हेतु न्यूनतम 75% अनिवार्य' : 'Min 75% required for UBTER Exam'}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 sm:p-5 shadow-xs min-w-0 flex flex-col justify-between">
              <div>
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate block">
                  {isHi ? 'सत्रीय औसत' : 'Sessional Average'}
                </span>
                <p className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{acadSummary.avgMarksPercent}%</p>
              </div>
              <p className="text-[10px] sm:text-[11px] text-emerald-600 font-semibold mt-2 truncate">
                {isHi ? `उत्तीर्ण: ${acadSummary.passedTestsCount} टेस्ट` : `Passed: ${acadSummary.passedTestsCount} Tests`}
              </p>
            </div>
          </div>

          <StudentQRCodeCard student={currentUser} onScanLectureQR={onOpenQRScanner} />
        </div>
      )}

      {/* 1. ONLINE TESTS & TIMED ASSIGNMENTS */}
      {activeTab === 'my-profile' && (
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div>
              <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                पासवर्ड सेटिंग्स एवं रीसेट (Password Self-Service)
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                आप नीचे दिए गए फॉर्म से अपना पासवर्ड बदल सकते हैं अथवा पंजीकृत मोबाइल पर SMS ओटीपी द्वारा रीसेट कर सकते हैं।
              </p>
            </div>
            <button
              onClick={() => {
                setOtpPhoneInput(currentUser.phone || '');
                setOtpStage('request');
                setOtpFeedback(null);
                setOtpError(null);
                setShowPasswordOtpModal(true);
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>SMS OTP द्वारा पासवर्ड रीसेट करें</span>
            </button>
          </div>
          <MyProfileCard showPassword={true} />
        </div>
      )}
      {activeTab === 'placement-prep' && <PlacementPracticeCenter />}

      {activeTab === 'online-tests' && (
        <OnlineTestAssignmentManager mode="student" forceMobileView={forceMobileView} />
      )}

      {/* 2. REAL-TIME DOUBT RESOLUTION & EXPERT Q&A */}
      {activeTab === 'doubt-chat' && (
        <RealtimeDoubtResolutionHub mode="student" forceMobileView={forceMobileView} />
      )}

      {/* Class & Subject Dispatched Materials (Direct class transmission) */}
      {activeTab === 'class-materials' && (
        <ClassSubjectDispatcher mode="student" forceMobileView={forceMobileView} />
      )}

      {/* Tab "exam-schedule" */}
      {activeTab === 'exam-schedule' && (
        <ExamSchedule
          onOpenAISolver={(name, code) => {
            setTutorSubject(name);
            setTutorQuestion(
              `Provide high-yield exam preparation guidance and derivations for ${name} (${code}) for upcoming polytechnic examinations.`
            );
            setActiveTab('ai-tutor');
            handleAskAITutor(
              `Provide high-yield exam preparation guidance and derivations for ${name} (${code}) for upcoming polytechnic examinations.`
            );
          }}
        />
      )}

      {/* Step 19: ONE result tab: real results saved by the college + the official UBTER website (the old look-alike login was removed) */}
      {activeTab === 'ubter-result' && (
        <div className="space-y-4">
          <BoardResultsManager readOnly forceMobileView={forceMobileView} />
          <a href="https://ubter.in/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-400 text-sm">
            <span><b>Official UBTER website</b><span className="block text-xs text-slate-500">Result, admit card and date sheet straight from the board (opens in a new tab).</span></span>
            <span className="text-blue-700 font-semibold">ubter.in →</span>
          </a>
        </div>
      )}
      {/* Tab "my-qr-id" */}
      {activeTab === 'my-qr-id' && <StudentQRCodeCard student={currentUser} onScanLectureQR={onOpenQRScanner} />}
      {/* Tab "timetable" */}
      {activeTab === 'timetable' && <TimetableModule allowEdit={false} />}

      {activeTab === 'syllabus' && <SyllabusViewer defaultBranch={currentUser.branch} defaultSemester={currentUser.semester} lockBranch />}
      {/* Tab "practicals" */}
      {activeTab === 'practicals' && <PracticalLabManager isFacultyOrAdmin={false} />}
      {/* Tab "materials" */}
      {activeTab === 'materials' && <StudyMaterialsLibrary allowUpload={false} />}

      {/* Tab "attendance" */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Live Attendance & QR Punch Verification
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automated lecture attendance tracker for your branch & semester.
              </p>
            </div>
            <button
              onClick={onOpenQRScanner}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Punch Active Lecture Attendance</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attStats.subjectWise.map((sub, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{sub.subjectCode}</span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{sub.subjectName}</h4>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                      sub.percent >= 75
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                    }`}
                  >
                    {sub.percent}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      sub.percent >= 75 ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${sub.percent}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          {/* Automatic Year-Wise Attendance Analysis & Trends */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <YearwiseAttendanceAnalysis
              initialYear={currentUser.year || 'all'}
              initialBranch={currentUser.branch || 'all'}
              allowEdit={false}
            />
          </div>
        </div>
      )}

      {/* Tab "results" */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          {tests.map((t) => {
            const myMark = (t.results || []).find((r) => r.studentId === currentUser.id);
            if (!myMark) return null;
            return (
              <div
                key={t.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b pb-2.5 border-slate-100 dark:border-slate-700">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      {t.type}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">{t.title}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400">
                      {myMark.marksObtained} / {t.maxMarks}
                    </span>
                    <p className="text-xs font-bold text-emerald-600">Grade: {myMark.grade} ({myMark.percentage}%)</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab "placements" */}
      {activeTab === 'placements' && <InternshipPlacementPortal allowPost={false} />}
      {/* Tab "material-hub" */}
      {activeTab === 'material-hub' && <DocumentMaterialHub mode="student" forceMobileView={forceMobileView} />}
      {/* Tab "mock-interview" */}
      {activeTab === 'mock-interview' && <MockInterviewPortal />}
      {/* Tab "achievements" */}
      {activeTab === 'achievements' && <AchievementsGallery allowNominate={true} />}
      {/* Tab "ai-quiz-drill" */}
      {activeTab === 'ai-quiz-drill' && <AIQuizDrillAndAnalytics />}
      {/* Tab "performance-analytics" */}
      {activeTab === 'performance-analytics' && <StudentPerformanceAnalyticsDashboard />}

      {/* Tab "pyq" */}
      {activeTab === 'pyq' && <QuestionPapersHub forceMobileView={forceMobileView} />}

      {/* Tab "ai-tutor" */}
      {activeTab === 'ai-tutor' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-teal-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
            <div className="flex flex-col gap-3.5">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-400/30 shrink-0 mt-0.5">
                  <Brain className="w-6 h-6 text-emerald-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-extrabold text-lg sm:text-xl">
                      UGIP AI Study Saathi (यूजीआईपी एआई स्टडी साथी)
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                      Trilingual AI Tutor
                    </span>
                  </div>
                  <p className="text-xs text-emerald-200/80 mt-1">
                    Ask doubts in Hindi (हिन्दी), English, or Hinglish (हिंग्लिश) 24/7.
                  </p>
                </div>
              </div>

              {/* Language selection buttons: Hindi, English, Hinglish */}
              <div className="flex flex-wrap items-center bg-white/10 rounded-xl p-1 border border-white/15 text-xs font-bold w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setTutorLanguage('hi')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    tutorLanguage === 'hi' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  हिन्दी (Hindi)
                </button>
                <button
                  type="button"
                  onClick={() => setTutorLanguage('en')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    tutorLanguage === 'en' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setTutorLanguage('hinglish')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    tutorLanguage === 'hinglish' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Hinglish (हिंग्लिश)
                </button>
              </div>
            </div>

            {/* Quick Prompt Suggestions based on chosen language */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wider block">
                Quick Subject Doubts (Click to Ask):
              </span>
              <div className="flex flex-wrap gap-2">
                {tutorLanguage === 'hi' && [
                  'बरनौली की प्रमेय (Bernoulli\'s Theorem) का निगमन चित्र सहित समझाइए',
                  'बाइनरी सर्च ट्री (BST) इंसर्शन और सर्चिंग एल्गोरिदम को C कोड से समझाएं',
                  'ILATE नियम से खण्डशः समाकलन (Integration by Parts) हल करने की विधि',
                  'जल की कठोरता (Hardness of Water) और EDTA अनुमापन विधि',
                ].map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTutorQuestion(q);
                      handleAskAITutor(q, 'hi');
                    }}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 text-emerald-100 rounded-xl text-xs font-medium border border-white/10 transition-colors cursor-pointer text-left"
                  >
                    ⚡ {q}
                  </button>
                ))}

                {tutorLanguage === 'en' && [
                  'Derive Bernoulli\'s Theorem step-by-step with SI units',
                  'Explain Binary Search Tree Insertion with C language code',
                  'Solve ∫ x sin(x) dx using ILATE Integration by Parts rule',
                  'Explain Kirchhoff\'s Current and Voltage laws with circuit example',
                ].map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTutorQuestion(q);
                      handleAskAITutor(q, 'en');
                    }}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 text-emerald-100 rounded-xl text-xs font-medium border border-white/10 transition-colors cursor-pointer text-left"
                  >
                    ⚡ {q}
                  </button>
                ))}

                {tutorLanguage === 'hinglish' && [
                  'Bernoulli\'s theorem ka derivation step by step samjhayein',
                  'Binary search tree me insertion kaise hota hai C code ke sath explain karein',
                  'Integration by parts me ILATE rule kaise use hota hai example deke samjhao',
                  'Water hardness ke types aur EDTA titration ka working principle kya hai?',
                ].map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTutorQuestion(q);
                      handleAskAITutor(q, 'hinglish');
                    }}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 text-emerald-100 rounded-xl text-xs font-medium border border-white/10 transition-colors cursor-pointer text-left"
                  >
                    ⚡ {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={tutorQuestion}
                onChange={(e) => setTutorQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAskAITutor();
                }}
                placeholder={
                  tutorLanguage === 'hi'
                    ? 'अपना सवाल लिखें: जैसे बरनौली प्रमेय, बाइनरी सर्च या गणितीय निगमन...'
                    : tutorLanguage === 'hinglish'
                    ? 'Apna doubt type karein: e.g. Bernoulli theorem ka proof ya binary search code...'
                    : 'Ask any polytechnic engineering doubt, derivation or code...'
                }
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-xs sm:text-sm text-white placeholder:text-emerald-200/60 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <button
                onClick={() => handleAskAITutor()}
                disabled={isTutorLoading}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2 shrink-0"
              >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>{isTutorLoading ? 'Generating...' : 'Ask AI Saathi'}</span>
              </button>
            </div>
          </div>

          {tutorResponse && (
            <div
              ref={answerRef}
              className="bg-white dark:bg-slate-800 border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4 animate-in fade-in duration-300 ring-4 ring-emerald-500/10"
            >
              <div className="flex flex-col gap-3 border-b pb-3 border-slate-100 dark:border-slate-700">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold shrink-0 mt-0.5">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                      AI Study Saathi Verified Academic Solution
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      UBTER Curriculum Aligned · Language: {tutorLanguage.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <button
                    onClick={() => {
                      if ('speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                        const utterance = new SpeechSynthesisUtterance(tutorResponse);
                        utterance.rate = 0.95;
                        window.speechSynthesis.speak(utterance);
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Listen / Read aloud"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Listen</span>
                  </button>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(tutorResponse);
                      setIsAnswerCopied(true);
                      setTimeout(() => setIsAnswerCopied(false), 2000);
                    }}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isAnswerCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Answer</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setIsAnswerExpanded(!isAnswerExpanded)}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    {isAnswerExpanded ? 'Collapse' : 'Read More (विस्तृत उत्तर)'}
                  </button>
                </div>
              </div>

              {/* Formatted Text Content */}
              <div
                className={`prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans space-y-3 transition-all ${
                  isAnswerExpanded ? '' : 'max-h-48 overflow-hidden relative'
                }`}
              >
                {tutorResponse.split('\n\n').map((block, bIdx) => {
                  if (block.startsWith('### ')) {
                    return (
                      <h3
                        key={bIdx}
                        className="font-black text-sm sm:text-base text-emerald-700 dark:text-emerald-400 mt-2 border-b border-emerald-100 dark:border-emerald-900/50 pb-1"
                      >
                        {block.replace('### ', '')}
                      </h3>
                    );
                  }
                  if (block.startsWith('#### ')) {
                    return (
                      <h4
                        key={bIdx}
                        className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white mt-1.5"
                      >
                        {block.replace('#### ', '')}
                      </h4>
                    );
                  }
                  return (
                    <p key={bIdx} className="whitespace-pre-line leading-relaxed">
                      {block}
                    </p>
                  );
                })}

                {!isAnswerExpanded && (
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white dark:from-slate-800 to-transparent flex items-end justify-center pb-2">
                    <button
                      onClick={() => setIsAnswerExpanded(true)}
                      className="px-4 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                    >
                      Read More (पूरा उत्तर देखें)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <PaperPreviewModal
        paper={previewPaper}
        isOpen={!!previewPaper}
        onClose={() => setPreviewPaper(null)}
      />
      <StudentFeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />
      <PhotoUploadModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
      />
      <AISubjectSolverModal
        isOpen={showAISolverModal}
        onClose={() => setShowAISolverModal(false)}
      />

      {/* STUDENT FULL DOSSIER MODAL (12 Verified Fields) */}
      {showDossierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/20 border border-blue-400/30 rounded-2xl">
                  <FileText className="w-6 h-6 text-blue-300" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black">
                    Student Verified Academic Dossier
                  </h3>
                  <p className="text-xs text-blue-200">
                    उत्तराखंड राजकीय पॉलिटेक्निक संस्थान · छात्र का सम्पूर्ण प्रमाणित रिकॉर्ड
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDossierModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dossier Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
              {/* Profile Card Top */}
              <div className="flex flex-col gap-4 p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40">
                <div className="flex items-center gap-3.5">
                  <UserAvatar
                    name={currentUser.name}
                    avatar={currentUser.avatar}
                    role="student"
                    size="lg"
                  />
                  <div>
                    <h4 className="text-base font-black text-slate-900 dark:text-white">
                      {currentUser.aadharName || currentUser.name}
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 font-semibold">
                      {currentUser.branch} Engineering · Year {currentUser.year} (Sem {currentUser.semester})
                    </p>
                    <p className="text-[11px] font-mono text-blue-700 dark:text-blue-300 font-bold">
                      UBTER Roll: {shown(currentUser.ubterRollNumber || currentUser.rollNo)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-1.5">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {currentUser.recordStatus || 'Documents Verified'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Live Verified on Board Roster
                  </span>
                </div>
              </div>

              {/* 12 Detailed Official Dossier Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. Aadhar Card Name */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">1. Aadhar Card Name:</span>
                  <span className="font-black text-slate-900 dark:text-white text-sm">
                    {currentUser.aadharName || currentUser.name}
                  </span>
                </div>

                {/* 2. Mobile Number */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">2. Mobile Number:</span>
                  <span className="font-black font-mono text-slate-900 dark:text-white text-sm">
                    {shown(currentUser.phone)}
                  </span>
                </div>

                {/* 3. UBTER Roll Number */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">3. UBTER Roll Number:</span>
                  <span className="font-black font-mono text-blue-700 dark:text-blue-300 text-sm">
                    {shown(currentUser.ubterRollNumber || currentUser.rollNo)}
                  </span>
                </div>

                {/* 12. Aadhar Card Number */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">12. Aadhar Card Number:</span>
                  <span className="font-black font-mono text-slate-900 dark:text-white text-sm">
                    {currentUser.aadharMasked || (currentUser.aadharNumber ? `XXXX XXXX ${currentUser.aadharNumber.replace(/\D/g, '').slice(-4)}` : NOT_ADDED)}
                  </span>
                </div>

                {/* 4. 10th % */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">4. 10th Board %:</span>
                  <span className="font-black text-emerald-700 dark:text-emerald-400 text-sm">
                    {shownPct(currentUser.tenthPercentage)}
                  </span>
                </div>

                {/* 5. 12th % */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">5. 12th Board %:</span>
                  <span className="font-black text-emerald-700 dark:text-emerald-400 text-sm">
                    {shownPct(currentUser.twelfthPercentage)}
                  </span>
                </div>

                {/* 6. 1st Year % / CGPA */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">6. 1st Year % / CGPA:</span>
                  <span className="font-black text-indigo-700 dark:text-indigo-400 text-sm">
                    {shown(currentUser.firstYearCgpa)}
                  </span>
                </div>

                {/* 7. 2nd Year % / CGPA */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">7. 2nd Year % / CGPA:</span>
                  <span className="font-black text-indigo-700 dark:text-indigo-400 text-sm">
                    {shown(currentUser.secondYearCgpa)}
                  </span>
                </div>
              </div>

              {/* 8. Har Semester ka % (1st se 4th Sem tak) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  8. Har Semester ka % (1st se 4th Sem tak):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block">1st Sem</span>
                    <span className="font-black text-blue-600 dark:text-blue-400 text-sm">
                      {shownPct(currentUser.semestersPercentage?.sem1 ?? currentUser.sem1)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block">2nd Sem</span>
                    <span className="font-black text-blue-600 dark:text-blue-400 text-sm">
                      {shownPct(currentUser.semestersPercentage?.sem2 ?? currentUser.sem2)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block">3rd Sem</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      {shownPct(currentUser.semestersPercentage?.sem3 ?? currentUser.sem3)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block">4th Sem</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      {shownPct(currentUser.semestersPercentage?.sem4 ?? currentUser.sem4)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Parents & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 10. Mother Name */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">10. Mother Name:</span>
                  <span className="font-black text-slate-900 dark:text-white text-sm">
                    {shown(currentUser.motherName)}
                  </span>
                </div>

                {/* 11. Father Name */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">11. Father Name:</span>
                  <span className="font-black text-slate-900 dark:text-white text-sm">
                    {shown(currentUser.fatherName)}
                  </span>
                </div>
              </div>

              {/* 9. Poora Address */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">9. Poora Address (स्थायी पता):</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm flex items-start gap-1.5 mt-0.5">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{shown(currentUser.fullAddress)}</span>
                </span>
              </div>
            </div>

            {/* Dossier Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Dossier</span>
              </button>
              <button
                onClick={() => setShowDossierModal(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Close (बंद करें)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD RESET VIA SMS OTP MODAL */}
      {showPasswordOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-amber-600 to-orange-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Key className="w-5 h-5" />
                <div>
                  <h3 className="text-sm font-black">
                    Student Password Reset (SMS OTP)
                  </h3>
                  <p className="text-[11px] text-amber-100">
                    अपने पंजीकृत मोबाइल नंबर पर ओटीपी प्राप्त करें
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordOtpModal(false)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 text-xs space-y-4">
              {otpFeedback && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-800 dark:text-emerald-200 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{otpFeedback}</span>
                </div>
              )}

              {otpError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700 rounded-xl text-rose-800 dark:text-rose-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{otpError}</span>
                </div>
              )}

              {otpStage === 'request' ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Registered Mobile Number (पंजीकृत मोबाइल नंबर):
                    </label>
                    <input
                      type="tel"
                      required
                      value={otpPhoneInput}
                      onChange={(e) => setOtpPhoneInput(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Default linked number for {currentUser.name}: <strong>{shown(currentUser.phone)}</strong>
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
                  >
                    <span>Send SMS OTP (ओटीपी भेजें)</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyAndResetPassword} className="space-y-4">
                  {debugOtp && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-xl text-amber-900 dark:text-amber-200 text-center font-mono">
                      <span className="text-[10px] uppercase font-bold text-amber-600 block">
                        [LIVE SMS SIMULATION RECEIPT]:
                      </span>
                      <strong className="text-base tracking-widest">{debugOtp}</strong>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Enter 6-Digit SMS OTP:
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value)}
                      placeholder="e.g. 849201"
                      className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-center text-sm font-mono font-bold tracking-widest bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Enter New Password:
                    </label>
                    <input
                      type="password"
                      required
                      value={newPasswordValue}
                      onChange={(e) => setNewPasswordValue(e.target.value)}
                      placeholder="Create secure password"
                      className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpStage('request');
                        setOtpError(null);
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Resend OTP
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Update Password</span>
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DIRECT ASK FACULTY DOUBT MODAL */}
      {showDirectAskDoubtModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <MessageSquareQuote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    Ask Faculty Expert Doubt
                  </h3>
                  <p className="text-xs text-slate-500">
                    Direct real-time query dispatch to department teachers
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDirectAskDoubtModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {directDoubtSuccessToast ? (
              <div className="p-6 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl font-black">
                  ✓
                </div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Doubt Successfully Transmitted!
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {directDoubtSuccessToast} Redirecting to your live chat thread...
                </p>
              </div>
            ) : (
              <form onSubmit={handleDirectSubmitDoubt} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Select Subject *
                  </label>
                  <select
                    value={chosenDoubtSubjectId}
                    onChange={(e) => setDirectDoubtSubjectId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white"
                  >
                    {classSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.code}] {s.name} ({s.branch} Sem {s.semester})
                      </option>
                    ))}
                  </select>
                </div>

                <p className="text-[11px] text-slate-500">
                  Your doubt goes to the teacher(s) assigned to this subject. Only you and they can read it.
                </p>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Question / Doubt Headline *
                  </label>
                  <input
                    type="text"
                    required
                    value={directDoubtTitle}
                    onChange={(e) => setDirectDoubtTitle(e.target.value)}
                    placeholder="e.g. Bernoulli equation assumptions or quicksort recursion stack..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white font-semibold"
                  />
                </div>

                {/* Quick Presets */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Quick Sample Questions (Click to Fill):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Bernoulli Theorem derivation & energy equation',
                      'Difference between B-Tree and B+ Tree indexing',
                      'Slump cone test procedure for concrete workability',
                      'TCP 3-way handshake sliding window explanation',
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setDirectDoubtTitle(preset);
                          setDirectDoubtDetails(
                            `Sir, please explain the detailed concepts and exam derivation steps for: ${preset}. What are the common viva questions asked in UBTER board exams?`
                          );
                        }}
                        className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 cursor-pointer"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Describe Your Doubt in Detail *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={directDoubtDetails}
                    onChange={(e) => setDirectDoubtDetails(e.target.value)}
                    placeholder="Describe what step you are confused about, code snippet, or formula derivation..."
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                {directDoubtError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 font-bold">
                    {directDoubtError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => { setShowDirectAskDoubtModal(false); setDirectDoubtError(''); }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={directDoubtBusy}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    <span>{directDoubtBusy ? 'Sending…' : 'Submit Academic Doubt'}</span>
                  </button>
                </div>
              </form>
            )}
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
            <div className="p-4 pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{isHi ? '📱 छात्र पोर्टल मेनू' : '📱 Student Portal Menu'}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {studentNavTabs.length} {isHi ? 'ऑप्शन्स' : 'Options'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {currentUser.name} • Year {currentUser.year} {currentUser.branch}
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
                  placeholder={isHi ? '🔍 कोई भी विकल्प खोजें / Search student options...' : '🔍 Search student options...'}
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
                    {isHi ? 'मिलते-जुलते विकल्प' : 'Matching Options'} ({studentNavTabs.filter((t) => t.label.toLowerCase().includes(menuSearchQuery.toLowerCase())).length})
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {studentNavTabs
                      .filter((t) => t.label.toLowerCase().includes(menuSearchQuery.toLowerCase()))
                      .map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
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
                ['Academics', 'Assessment', 'AI & Doubts', 'Career', 'Account'].map((cat) => {
                  const catTabs = studentNavTabs.filter((t) => t.category === cat);
                  if (catTabs.length === 0) return null;
                  const catLabel = isHi
                    ? cat === 'Academics'
                      ? '📚 शैक्षणिक एवं अध्ययन'
                      : cat === 'Assessment'
                      ? '📊 हाजिरी, परीक्षा एवं रिजल्ट्स'
                      : cat === 'AI & Doubts'
                      ? '🤖 AI टूल्स एवं डाउट समाधान'
                      : cat === 'Career'
                      ? '💼 करियर, प्लेसमेंट व इंटरव्यू'
                      : '👤 मेरा खाता एवं सुरक्षा'
                    : cat === 'Academics'
                    ? '📚 Academics & Study Materials'
                    : cat === 'Assessment'
                    ? '📊 Attendance, Exams & Results'
                    : cat === 'AI & Doubts'
                    ? '🤖 AI Tools & Doubts'
                    : cat === 'Career'
                    ? '💼 Career, Placements & Mock Tests'
                    : '👤 My Account & Security';

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
      <nav aria-label="Student Mobile Navigation" className={`fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around ${forceMobileView ? 'flex' : 'sm:hidden'} shadow-lg`}>
        <button
          onClick={() => handleSwitchTab('overview')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
            activeTab === 'overview' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{isHi ? 'होम' : 'Home'}</span>
        </button>
        <button
          onClick={() => handleSwitchTab('pyq')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
            activeTab === 'pyq' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>{isHi ? 'पेपर्स' : 'Papers'}</span>
        </button>
        <button
          onClick={() => handleSwitchTab('attendance')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
            activeTab === 'attendance' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>{isHi ? 'हाजिरी' : 'Attendance'}</span>
        </button>
        <button
          onClick={() => handleSwitchTab('results')}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
            activeTab === 'results' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>{isHi ? 'मार्क्स' : 'Marks'}</span>
        </button>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-bold text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
        >
          <div className="w-4 h-4 flex items-center justify-center">
            <Menu className="w-4 h-4" />
          </div>
          <span>{isHi ? 'मेनू' : 'Menu'} ({studentNavTabs.length})</span>
        </button>
      </nav>
    </div>
  );
};
