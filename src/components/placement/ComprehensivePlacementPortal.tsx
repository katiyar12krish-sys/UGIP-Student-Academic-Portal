// ===================================================================================================
// Placement portal: drives, applications, government jobs, question bank, resume builder,
// mock interviews, college placement records. Step 18: edit drives and job listings.
// ===================================================================================================
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Pencil } from 'lucide-react';                            // Step 18
import { editsApi } from '../../services/step18Api';              // Step 18: edit drives / jobs
import { notify } from '../common/ui/feedback';                    // Step 18: styled messages
import { ResumeCenter, CareerGuide, JobLinksHub } from './CareerCenter';
import { PlacementPracticeCenter, PlacementTracker } from './PlacementPrep';   // the ONE placement question bank + tracker
import { MockInterviewPortal } from '../student/MockInterviewPortal';           // the ONE mock interview screen   // Step 19: saved resumes + samples, career guide, job links
import { placementApi, DriveView, JobView, Applicant, ApplicationStatus } from '../../services/placementApi';
import { useCollege } from '../../context/CollegeContext';
import {
  PlacementDrive,
  GovernmentPrivateJob,
  SharedExperience,
  BranchCode,
  MockInterviewSession,
  PlacementQuestionItem,
} from '../../types';
import {
  INTERVIEW_VIDEOS_TELL_ME_ABOUT_YOURSELF,
  INTERVIEW_VIDEOS_RESUME_AND_BASIC,
  COLLEGE_PLACEMENT_RECORDS_DATA,
  PLACEMENT_QUESTION_MEGA_BANK,
} from '../../data/placementData';
import {
  Briefcase,
  Building2,
  MapPin,
  GraduationCap,
  Calendar,
  Users,
  Check,
  Plus,
  ArrowUpRight,
  Search,
  Filter,
  FileText,
  FileSpreadsheet,
  Download,
  Upload,
  ExternalLink,
  Shield,
  KeyRound,
  Lock,
  Unlock,
  AlertCircle,
  HelpCircle,
  Video,
  Play,
  Share2,
  Heart,
  MessageSquare,
  Sparkles,
  Trophy,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Printer,
  Eye,
  Camera,
  Layers,
  ChevronDown,
  Trash2,
  Edit3,
  X,
  Laptop,
  Compass,
  BookmarkCheck,
  Award,
} from 'lucide-react';
import { uiAlert } from '../common/ui/feedback';   // Step 18: styled message instead of the browser's alert box

// Data shape: comprehensive placement portal props.
interface ComprehensivePlacementPortalProps {
  initialTab?:
    | 'drives'
    | 'govt-jobs'
    | 'sarkari-naukri'
    | 'career-guide'
    | 'qna-bank'
    | 'resume-builder'
    | 'college-records'
    | 'share-experience'
    | 'mock-interview';
  forceMobileView?: boolean;
}

// Screen part: comprehensive placement portal.
export const ComprehensivePlacementPortal: React.FC<ComprehensivePlacementPortalProps> = ({
  initialTab = 'drives',
  forceMobileView = false,
}) => {
  const {
    currentUser,
    verifyAdminOrFacultyPassword,
    sharedExperiences,
    addSharedExperience,
    likeSharedExperience,
    mockInterviews,
    saveMockInterview,
    logActivity,
    t,
  } = useCollege();
  const isStaffView = currentUser.role === 'admin' || currentUser.role === 'faculty';

  // Which tab is open right now
  const [activeTab, setActiveTab] = useState<
    | 'drives'
    | 'govt-jobs'
    | 'sarkari-naukri'
    | 'career-guide'
    | 'qna-bank'
    | 'resume-builder'
    | 'college-records'
    | 'share-experience'
    | 'mock-interview'
  >(initialTab);

  // Read More Modal State
  // Step 11: drives, applications and job listings come from the server (it enforces branch, deadline, minimum percentage and who may post).
  const [placementDrives, setPlacementDrives] = useState<DriveView[]>([]);
  // List of govt private jobs shown on this screen
  const [govtPrivateJobs, setGovtPrivateJobs] = useState<JobView[]>([]);
  // Error message to show (placement error); empty = no error
  const [placementError, setPlacementError] = useState<string | null>(null);
  // Placement busy (kept in screen state)
  const [placementBusy, setPlacementBusy] = useState<string | null>(null);   // id of the drive being applied to / changed
  // Applicants for (kept in screen state)
  const [applicantsFor, setApplicantsFor] = useState<DriveView | null>(null);
  // List of applicant rows shown on this screen
  const [applicantRows, setApplicantRows] = useState<Applicant[]>([]);
  // Error message to show (applicants error); empty = no error
  const [applicantsError, setApplicantsError] = useState<string | null>(null);
  // The drive for detail chosen by the user (filter / list selection)
  const [selectedDriveForDetail, setSelectedDriveForDetail] = useState<DriveView | null>(null);
  // The job for detail chosen by the user (filter / list selection)
  const [selectedJobForDetail, setSelectedJobForDetail] = useState<JobView | null>(null);

  // Branch filter for drives & jobs
  const [branchFilter, setBranchFilter] = useState<'All' | 'CSE' | 'Civil'>('All');
  // Text typed in the search box
  const [searchQuery, setSearchQuery] = useState('');

  // Security password modal state for protected CRUD
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  // Password action type (kept in screen state)
  const [passwordActionType, setPasswordActionType] = useState<
    'add-drive' | 'delete-drive' | 'add-job' | 'delete-job' | 'edit-job' | null
  >(null);
  // Target item id (kept in screen state)
  const [targetItemId, setTargetItemId] = useState<string | null>(null);
  // Auth password input (kept in screen state)
  const [authPasswordInput, setAuthPasswordInput] = useState('');
  // Error message to show (auth password error); empty = no error
  const [authPasswordError, setAuthPasswordError] = useState<string | null>(null);

  // New Placement Drive Form Modal State
  const [showAddDriveModal, setShowAddDriveModal] = useState(false);
  // Values typed into the new drive form
  const [newDriveForm, setNewDriveForm] = useState({
    title: '',
    company: '',
    branch: 'CSE' as BranchCode | 'Both',
    ctc: '₹ 3.60 LPA',
    stipend: '₹ 20,000 / mo',
    location: 'Dehradun / Noida',
    type: 'Campus Placement' as const,
    deadline: '2026-11-30',
    vacancies: 10,
    fullDescription: '',
    minPercentage: 60,
    allowedBacklogs: 0,
    keySkills: 'C, Linux, Networking',
    selectionProcess: 'Aptitude Test -> Technical Interview -> HR Round',
  });

  // New Govt Job Form Modal State
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  // Values typed into the new job form
  const [newJobForm, setNewJobForm] = useState({
    title: '',
    organization: '',
    branch: 'Both' as BranchCode | 'Both',
    jobType: 'Government' as const,
    examOrPostName: '',
    expectedMonth: 'August 2026',
    payScale: 'Level-6 (₹ 35,400 - ₹ 1,12,400)',
    vacancies: 50,
    qualification: '3-Year Diploma in CSE / Civil Engineering',
    ageLimit: '18 to 33 Years',
    officialLink: 'https://www.ncs.gov.in/',
    syllabusSummary: 'Diploma Technical Syllabus + General Studies & Reasoning',
    applicationDeadline: '2026-09-30',
    notes: 'Official notification expected soon.',
  });

  // ---- Step 18: edit an existing drive / job: the same form is opened, filled in, and saved with PUT ----
  const [editingDriveId, setEditingDriveId] = useState<string | null>(null);
  // The job id being edited right now (null = nothing open)
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  // Start edit drive.
  const startEditDrive = (d: PlacementDrive) => {
    setNewDriveForm({ title: d.title, company: d.company, branch: d.branch, ctc: d.ctc || '', stipend: d.stipend || '', location: d.location || '',
      type: d.type as any, deadline: d.deadline, vacancies: d.vacancies, fullDescription: d.fullDescription || '',
      minPercentage: d.eligibilityCriteria?.minPercentage ?? 0, allowedBacklogs: d.eligibilityCriteria?.allowedBacklogs ?? 0,
      keySkills: (d.keySkills || []).join(', '), selectionProcess: (d.selectionProcess || []).join(' -> ') });
    setEditingDriveId(d.id); setShowAddDriveModal(true);
  };
  // Start edit job.
  const startEditJob = (j: GovernmentPrivateJob) => {
    setNewJobForm({ title: j.title, organization: j.organization, branch: j.branch, jobType: j.jobType as any, examOrPostName: j.examOrPostName || '',
      expectedMonth: j.expectedMonth || '', payScale: j.payScale || '', vacancies: j.vacancies, qualification: j.qualification || '', ageLimit: j.ageLimit || '',
      officialLink: j.officialLink || '', syllabusSummary: j.syllabusSummary || '', applicationDeadline: j.applicationDeadline || '', notes: j.notes || '' });
    setEditingJobId(j.id); setShowAddJobModal(true);
  };

  // Question Mega Bank States
  const [qnaCategory, setQnaCategory] = useState<'All' | 'CSE' | 'Civil' | 'Aptitude' | 'Reasoning' | 'HR'>('All');
  // Text typed in the search box
  const [qnaSearch, setQnaSearch] = useState('');
  // List of revealed answers shown on this screen
  const [revealedAnswers, setRevealedAnswers] = useState<{ [qId: string]: boolean }>({});

  // Share Experience Form State
  const [showShareModal, setShowShareModal] = useState(false);
  // Values typed into the new exp form
  const [newExpForm, setNewExpForm] = useState({
    company: '',
    roleTitle: '',
    packageOffered: '',
    title: '',
    textStory: '',
    branch: (currentUser.branch || 'CSE') as BranchCode,
    mediaType: 'text' as 'text' | 'image' | 'video',
    mediaUrl: '',
    videoEmbedUrl: '',
    tips: '',
  });

  // Resume Builder State
  const [resumeData, setResumeData] = useState({
    fullName: currentUser.name,
    email: currentUser.email,
    phone: currentUser.phone || '',
    branch: (currentUser.branch || 'CSE') === 'CSE' ? 'Computer Science & Engineering' : 'Civil Engineering',
    rollNo: currentUser.rollNo || '',
    college: 'Uttarakhand Government Institute of Polytechnic (UGIP)',
    batch: '2024 - 2027 (3-Year Diploma)',
    aggregatePercentage: '',   // the student fills in their real percentage
    careerObjective:
      'Motivated diploma engineering student seeking an entry-level technical role to apply core engineering principles, practical lab competencies, and problem-solving skills to contribute to organizational excellence.',
    technicalSkills:
      (currentUser.branch || 'CSE') === 'CSE'
        ? 'C Language, Linux OS, Bash Scripting, HTML5/CSS3, JavaScript, MySQL, Computer Networks (TCP/IP), Git'
        : 'Surveying (Total Station & Auto Level), AutoCAD Civil 2D, Concrete Technology (IS 456), Soil Testing, BBS, Site Supervision',
    keyProjects:
      (currentUser.branch || 'CSE') === 'CSE'
        ? '1. Campus Management & Attendance Portal: Developed full-stack prototype with offline-first caching and QR code token verification.\n2. Linux Automated Log Monitor: Created bash cron scripts to monitor server disk memory and email alert logs.'
        : '1. Topographic Total Station Contour Survey: Conducted 5-hectare digital leveling and created 2D AutoCAD contour map.\n2. High-Strength Concrete Mix Design (M25): Tested compressive strength of fly-ash blended concrete cubes over 28-day curing.',
    industrialTraining:
      'Completed 6-Week Summer Industrial Training at Uttarakhand Jal Vidyut Nigam Limited (UJVNL) / State Infrastructure with distinction.',
    certifications:
      'AICTE Approved Diploma Module Certificate, UBTER Technical Distinction, State Science & Tech Workshop 2026',
  });
  // Uploaded resume file (kept in screen state)
  const [uploadedResumeFile, setUploadedResumeFile] = useState<{ name: string; url: string; size: string } | null>(null);

  // Mock Interview State
  const [mockRound, setMockRound] = useState<'intro' | 'questioning' | 'feedback'>('intro');
  // Mock selected role (kept in screen state)
  const [mockSelectedRole, setMockSelectedRole] = useState<'DTE Software' | 'Junior Engineer Civil' | 'PSU Technical Assistant'>('DTE Software');
  // Mock current question index (kept in screen state)
  const [mockCurrentQuestionIndex, setMockCurrentQuestionIndex] = useState(0);
  // List of mock user answers shown on this screen
  const [mockUserAnswers, setMockUserAnswers] = useState<string[]>([]);
  // Mock current input (kept in screen state)
  const [mockCurrentInput, setMockCurrentInput] = useState('');
  // Mock last report (kept in screen state)
  const [mockLastReport, setMockLastReport] = useState<MockInterviewSession | null>(null);

  const mockQuestionsList = useMemo(() => {
    if (mockSelectedRole === 'Junior Engineer Civil') {
      return [
        { q: 'Tell me about yourself and your practical civil engineering training at UGIP.', type: 'HR' },
        { q: 'Explain the working principle of a Total Station and how you perform temporary adjustment on site.', type: 'Technical' },
        { q: 'What is the minimum grade of concrete for RCC structures as per IS 456:2000, and why?', type: 'Technical' },
        { q: 'If your site contractor insists on adding extra water to ready-mix concrete to make it easier to pour, how will you handle this?', type: 'Situational' },
      ];
    }
    return [
      { q: 'Introduce yourself in 90 seconds highlighting your diploma coursework, key projects, and career goal.', type: 'HR' },
      { q: 'What is the difference between malloc() and calloc() in C dynamic memory allocation?', type: 'Technical' },
      { q: 'Explain the 3-Way Handshake in TCP and why UDP does not require a handshake.', type: 'Technical' },
      { q: 'Describe a situation during your diploma lab projects where something failed, and how you troubleshot the issue.', type: 'Situational' },
    ];
  }, [mockSelectedRole]);

  // Filtered placement drives
  const filteredDrives = useMemo(() => {
    return placementDrives.filter((item) => {
      const matchBranch =
        branchFilter === 'All' || item.branch === 'Both' || item.branch === branchFilter;
      const matchSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase());
      return matchBranch && matchSearch;
    });
  }, [placementDrives, branchFilter, searchQuery]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return govtPrivateJobs.filter((job) => {
      const matchBranch =
        branchFilter === 'All' || job.branch === 'Both' || job.branch === branchFilter;
      const matchSearch =
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.examOrPostName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchBranch && matchSearch;
    });
  }, [govtPrivateJobs, branchFilter, searchQuery]);

  // Filtered question bank
  const filteredQuestions = useMemo(() => {
    return PLACEMENT_QUESTION_MEGA_BANK.filter((q) => {
      const matchCat = qnaCategory === 'All' || q.category === qnaCategory;
      const matchSearch =
        q.question.toLowerCase().includes(qnaSearch.toLowerCase()) ||
        q.topic.toLowerCase().includes(qnaSearch.toLowerCase()) ||
        q.explanation.toLowerCase().includes(qnaSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [qnaCategory, qnaSearch]);

  // Loads placement from the server.
  const loadPlacement = useCallback(async () => {
    const [d, j] = await Promise.all([placementApi.drives(), placementApi.jobs()]);
    if (d.ok) setPlacementDrives(d.data);
    if (j.ok) setGovtPrivateJobs(j.data);
    setPlacementError(!d.ok ? d.error : !j.ok ? j.error : null);
  }, []);
  // Runs automatically whenever these change: loadPlacement.
  useEffect(() => {
    loadPlacement();
    const t = setInterval(loadPlacement, 30000);        // other people's new drives and status changes show up without a reload
    return () => clearInterval(t);
  }, [loadPlacement]);
  // Replace drive.
  const replaceDrive = (v: DriveView) => {
    setPlacementDrives((prev) => prev.map((x) => (x.id === v.id ? v : x)));
    setSelectedDriveForDetail((cur) => (cur && cur.id === v.id ? v : cur));
  };

  // Runs when the user does this on screen: apply drive.
  const handleApplyDrive = async (id: string, title: string) => {
    setPlacementBusy(id);
    const r = await placementApi.apply(id);
    setPlacementBusy(null);
    if (!r.ok) { uiAlert(`${r.error}`); loadPlacement(); return; }
    replaceDrive(r.data);
    logActivity('APPLY_PLACEMENT_DRIVE', `Student applied to placement drive: ${title}`);
    uiAlert(`Application submitted.\nYour application for "${title}" has been sent to the Training & Placement Cell.`);
  };

  // Runs when the user does this on screen: withdraw drive.
  const handleWithdrawDrive = async (id: string) => {
    if (!window.confirm('Withdraw your application for this drive?')) return;
    setPlacementBusy(id);
    const r = await placementApi.withdraw(id);
    setPlacementBusy(null);
    if (!r.ok) { uiAlert(`${r.error}`); return; }
    replaceDrive(r.data);
  };

  // Runs when the user does this on screen: toggle drive active.
  const handleToggleDriveActive = async (drive: DriveView) => {
    setPlacementBusy(drive.id);
    const r = await placementApi.setActive(drive.id, !drive.isActive);
    setPlacementBusy(null);
    if (!r.ok) { uiAlert(`${r.error}`); return; }
    replaceDrive(r.data);
  };

  // Open applicants.
  const openApplicants = async (drive: DriveView) => {
    setApplicantsFor(drive); setApplicantRows([]); setApplicantsError(null);
    const r = await placementApi.applicants(drive.id);
    if (r.ok) setApplicantRows(r.data); else setApplicantsError(r.error);
  };

  // Change applicant status.
  const changeApplicantStatus = async (applicationId: string, status: ApplicationStatus) => {
    if (!applicantsFor) return;
    const r = await placementApi.setStatus(applicantsFor.id, applicationId, status);
    if (r.ok) setApplicantRows(r.data); else setApplicantsError(r.error);
  };

  // Download applicants csv.
  const downloadApplicantsCsv = () => {
    if (!applicantsFor) return;
    // Q.
    const q = (v: unknown) => { const t = String(v ?? ''); return `"${(/^[=+\-@\t\r]/.test(t) ? "'" + t : t).replace(/"/g, '""')}"`; };   // no spreadsheet formulas
    const rows = [['Roll No', 'Name', 'Branch', 'Year', 'Semester', 'Average %', 'Status', 'Applied on'], ...applicantRows.map((a) => [a.rollNo, a.name, a.branch, a.year, a.semester, a.percentage ?? '', a.status, a.appliedAt.slice(0, 10)])];
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.map(q).join(',')).join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `applicants-${applicantsFor.company.replace(/[^\w]+/g, '_')}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const handleInitiateProtectedAction = (
    type: 'add-drive' | 'delete-drive' | 'add-job' | 'delete-job' | 'edit-job',
    targetId?: string
  ) => {
    setPasswordActionType(type);
    setTargetItemId(targetId || null);
    setAuthPasswordInput('');
    setAuthPasswordError(null);
    setShowPasswordModal(true);
  };

  // Runs when the user does this on screen: verify password and execute.
  const handleVerifyPasswordAndExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(await verifyAdminOrFacultyPassword(authPasswordInput))) {
      setAuthPasswordError('Invalid authorization password. Only authorized Admin and Faculty may alter placement records.');
      return;
    }

    // Password is valid, execute action
    setShowPasswordModal(false);
    if (passwordActionType === 'add-drive') {
      setShowAddDriveModal(true);
    } else if (passwordActionType === 'delete-drive' && targetItemId) {
      const r = await placementApi.removeDrive(targetItemId);
      if (r.ok) setPlacementDrives((prev) => prev.filter((x) => x.id !== targetItemId)); else uiAlert(`${r.error}`);
    } else if (passwordActionType === 'add-job') {
      setShowAddJobModal(true);
    } else if (passwordActionType === 'delete-job' && targetItemId) {
      const r = await placementApi.removeJob(targetItemId);
      if (r.ok) setGovtPrivateJobs((prev) => prev.filter((x) => x.id !== targetItemId)); else uiAlert(`${r.error}`);
    }
  };

  // Runs when the user does this on screen: create drive submit.
  const handleCreateDriveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: newDriveForm.title,
      company: newDriveForm.company,
      branch: newDriveForm.branch,
      ctc: newDriveForm.ctc,
      stipend: newDriveForm.stipend,
      location: newDriveForm.location,
      type: newDriveForm.type,
      deadline: newDriveForm.deadline,
      vacancies: Number(newDriveForm.vacancies) || 1,
      fullDescription: newDriveForm.fullDescription,
      minPercentage: Number(newDriveForm.minPercentage) || 0,
      selectionProcess: newDriveForm.selectionProcess.split('->').map((x) => x.trim()).filter(Boolean),
      keySkills: newDriveForm.keySkills.split(',').map((x) => x.trim()).filter(Boolean),
    } as any;
    // Step 18: same form for "new" and "edit"
    const r = editingDriveId ? await editsApi.updateDrive(editingDriveId, payload) : await placementApi.postDrive(payload);
    if (!r.ok) { notify.error('Could not save the drive', r.error); return; }          // the form stays open so nothing typed is lost
    setPlacementDrives((prev) => [r.data, ...prev.filter((x) => x.id !== r.data.id)]);
    notify.success(editingDriveId ? 'Drive updated' : 'Drive posted', newDriveForm.title);
    setEditingDriveId(null);
    setShowAddDriveModal(false);
  };

  // Runs when the user does this on screen: create job submit.
  const handleCreateJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: newJobForm.title,
      organization: newJobForm.organization,
      branch: newJobForm.branch,
      jobType: newJobForm.jobType,
      examOrPostName: newJobForm.examOrPostName,
      expectedMonth: newJobForm.expectedMonth,
      payScale: newJobForm.payScale,
      vacancies: Number(newJobForm.vacancies) || 0,
      qualification: newJobForm.qualification,
      ageLimit: newJobForm.ageLimit,
      officialLink: newJobForm.officialLink,
      syllabusSummary: newJobForm.syllabusSummary,
      applicationDeadline: newJobForm.applicationDeadline,
      notes: newJobForm.notes,
    };
    // Step 18: same form for "new" and "edit"
    const r = editingJobId ? await editsApi.updateJob(editingJobId, payload) : await placementApi.postJob(payload);
    if (!r.ok) { notify.error('Could not save the listing', r.error); return; }
    setGovtPrivateJobs((prev) => [r.data, ...prev.filter((x) => x.id !== r.data.id)]);
    notify.success(editingJobId ? 'Listing updated' : 'Listing posted', newJobForm.title);
    setEditingJobId(null);
    setShowAddJobModal(false);
  };

  // Runs when the user does this on screen: create experience submit.
  const handleCreateExperienceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpForm.title.trim() || !newExpForm.textStory.trim()) return;

    addSharedExperience({
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      branch: newExpForm.branch,
      company: newExpForm.company || 'Campus Interview',
      roleTitle: newExpForm.roleTitle || 'Trainee Engineer',
      packageOffered: newExpForm.packageOffered,
      title: newExpForm.title,
      textStory: newExpForm.textStory,
      mediaType: newExpForm.mediaType,
      mediaUrl: newExpForm.mediaUrl,
      videoEmbedUrl: newExpForm.videoEmbedUrl,
      tips: newExpForm.tips ? newExpForm.tips.split('\n').filter(Boolean) : ['Focus on fundamentals', 'Prepare your project'],
    });

    setNewExpForm({
      company: '',
      roleTitle: '',
      packageOffered: '',
      title: '',
      textStory: '',
      branch: (currentUser.branch || 'CSE') as BranchCode,
      mediaType: 'text',
      mediaUrl: '',
      videoEmbedUrl: '',
      tips: '',
    });
    setShowShareModal(false);
  };

  // Toggle reveal answer.
  const toggleRevealAnswer = (qId: string) => {
    setRevealedAnswers((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  // Runs when the user does this on screen: mock next question.
  const handleMockNextQuestion = () => {
    const updatedAnswers = [...mockUserAnswers, mockCurrentInput];
    setMockUserAnswers(updatedAnswers);
    setMockCurrentInput('');

    if (mockCurrentQuestionIndex + 1 < mockQuestionsList.length) {
      setMockCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // Finished all questions -> generate report
      const calculatedScore = Math.floor(75 + Math.random() * 20); // 75 - 95
      const report: MockInterviewSession = {
        id: `mock-${Date.now()}`,
        studentId: currentUser.id,
        studentName: currentUser.name,
        rollNo: currentUser.rollNo || '',
        branch: currentUser.branch || 'CSE',
        targetRole: mockSelectedRole,
        score: calculatedScore,
        totalQuestions: mockQuestionsList.length,
        feedback:
          calculatedScore > 80
            ? 'Excellent confidence, articulate domain knowledge, and clear STAR method structure. Ready for Tier-1 corporate and state recruitment interviews!'
            : 'Good technical clarity, but recommend sharpening time-management on introductory pitch and strengthening IS-Code / algorithm specifics.',
        strengths: [
          'Clear presentation of capstone diploma project',
          'Good foundational grasp of core branch terminology',
          'Courteous professional etiquette and posture',
        ],
        areasToImprove: [
          'Structure self-introduction strictly within 90 seconds',
          'Highlight quantitative metrics from summer industrial training',
          'Watch the recommended YouTube masterclass videos below',
        ],
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
      };

      saveMockInterview(report);
      setMockLastReport(report);
      setMockRound('feedback');
    }
  };

  // Runs when the user does this on screen: mock reset.
  const handleMockReset = () => {
    setMockRound('intro');
    setMockCurrentQuestionIndex(0);
    setMockUserAnswers([]);
    setMockCurrentInput('');
  };

  // Runs when the user does this on screen: print resume.
  const handlePrintResume = () => {
    window.print();
  };

  // Runs when the user does this on screen: resume file upload.
  const handleResumeFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedResumeFile({
      name: file.name,
      url,
      size: `${(file.size / 1024).toFixed(1)} KB`,
    });
    logActivity('UPLOAD_RESUME', `Uploaded professional resume: ${file.name}`);
    uiAlert(`Resume "${file.name}" uploaded successfully! You can download or preview it anytime.`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-blue-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                TPO & Career Hub 2026
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                100% Placement Support
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Training & Placement Cell, UGIP
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Complete career ecosystem for 3-Year Diploma in Computer Science & Civil Engineering. Access campus drives, year-round Government & Private jobs, 500+ interview Q&As, professional resume builder, alumni stories, and mock interviews.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full pt-2 border-t border-white/10">
            {(currentUser.role === 'admin' || currentUser.role === 'faculty') && (
              <button
                onClick={() => handleInitiateProtectedAction('add-drive')}
                className="w-full sm:w-auto justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Post Placement Drive</span>
              </button>
            )}
            {/* Step 19: one button to the trusted CSE & Civil job links inside the portal (replaces the outside "Sarkari Result" links) */}
            <button
              onClick={() => setActiveTab('sarkari-naukri')}
              className="w-full sm:w-auto justify-center px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer ring-2 ring-emerald-400/40"
            >
              <Briefcase className="w-4 h-4" />
              <span>Job Links – CSE & Civil</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs font-bold">
          {[
            { id: 'drives', label: 'Campus Placements (CS & Civil)', icon: Briefcase, count: placementDrives.length },
            { id: 'govt-jobs', label: 'Year-Round Govt & Pvt Jobs', icon: Building2, count: govtPrivateJobs.length },
            { id: 'sarkari-naukri', label: 'CSE & Civil Job Links', icon: ExternalLink },
            { id: 'career-guide', label: 'Career Guide (Internship · Salary · Behaviour)', icon: Trophy },
            { id: 'qna-bank', label: isStaffView ? 'Student Tracker (Resume · Tests)' : 'Practice Tests & Resume Score', icon: HelpCircle },
            { id: 'resume-builder', label: 'Resume (Upload · 5 Samples · Builder)', icon: FileText },
            { id: 'college-records', label: 'College Placement Records', icon: Trophy },
            { id: 'share-experience', label: 'Share Your Experience', icon: MessageSquare, count: sharedExperiences.length },
            { id: 'mock-interview', label: 'Mock Interview & Videos', icon: Video },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-md font-black'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-blue-100 text-blue-800' : 'bg-white/20 text-white'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-400 text-slate-950">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CAMPUS PLACEMENTS (CSE & CIVIL) */}
      {/* ========================================================================= */}
      {activeTab === 'drives' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Controls: Branch Filter & Search */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 w-full">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter Branch:
              </span>
              <div className="flex flex-wrap items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 text-xs font-bold">
                {(['All', 'CSE', 'Civil'] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => setBranchFilter(b)}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      branchFilter === b
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {b === 'All' ? 'All Branches' : b === 'CSE' ? 'CS Engineering' : 'Civil Engineering'}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search company, job role, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {placementError && <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">{placementError}</div>}
          {!placementError && filteredDrives.length === 0 && <p className="text-xs text-slate-500 py-6 text-center">No placement drives to show yet.</p>}

          {/* Drives Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDrives.map((drive) => {
              const isApplied = !!drive.applied;
              return (
                <div
                  key={drive.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-400 transition-all p-5 shadow-xs hover:shadow-md flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800 flex items-center justify-center font-black text-blue-600 dark:text-blue-400 text-sm">
                          {drive.branch === 'CSE' ? (
                            <Laptop className="w-5 h-5" />
                          ) : drive.branch === 'Civil' ? (
                            <Compass className="w-5 h-5" />
                          ) : (
                            <Building2 className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {drive.branch === 'Both' ? 'CSE & Civil' : `${drive.branch} Special`}
                          </span>
                          <span className="block text-[11px] font-semibold text-slate-400">
                            {drive.type}
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-black font-mono bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        {drive.ctc}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {drive.title}
                      </h4>
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 mt-1">
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{drive.company}</span>
                      </p>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                      {drive.fullDescription}
                    </p>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{drive.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Deadline: {drive.deadline}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    {/* READ MORE BUTTON (Requested by user) */}
                    <button
                      onClick={() => setSelectedDriveForDetail(drive)}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-500" />
                      <span>Read More (पूरा विवरण)</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {(currentUser.role === 'admin' || currentUser.role === 'faculty') && (drive.mine || currentUser.role === 'admin') && (
                        <button onClick={() => startEditDrive(drive)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer" title="Edit drive" aria-label="Edit drive">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {(currentUser.role === 'admin' || currentUser.role === 'faculty') && (
                        <button
                          onClick={() => handleInitiateProtectedAction('delete-drive', drive.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Delete Drive (Password Protected)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {(currentUser.role === 'admin' || currentUser.role === 'faculty') && (drive.mine || currentUser.role === 'admin') && (
                        <>
                          <button
                            onClick={() => openApplicants(drive)}
                            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            title="See who applied"
                          >
                            <Users className="w-3.5 h-3.5 text-blue-500" /> {drive.applicantCount}
                          </button>
                          <button
                            onClick={() => handleToggleDriveActive(drive)}
                            disabled={placementBusy === drive.id}
                            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-[11px] font-bold cursor-pointer disabled:opacity-50"
                          >
                            {drive.isActive ? 'Close' : 'Reopen'}
                          </button>
                        </>
                      )}

                      {currentUser.role === 'student' && (
                        isApplied ? (
                          <>
                            <span className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> {drive.myStatus || 'Applied'}
                            </span>
                            {drive.myStatus === 'Applied' && !drive.closed && (
                              <button onClick={() => handleWithdrawDrive(drive.id)} disabled={placementBusy === drive.id} className="text-[11px] font-bold text-slate-400 hover:text-rose-500 cursor-pointer disabled:opacity-50">Withdraw</button>
                            )}
                          </>
                        ) : drive.cannotApplyReason ? (
                          <span title={drive.cannotApplyReason} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl text-[11px] font-bold max-w-[190px] truncate">
                            {drive.cannotApplyReason}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleApplyDrive(drive.id, drive.title)}
                            disabled={placementBusy === drive.id}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <span>Apply</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: YEAR-ROUND GOVT & PRIVATE JOBS (DIPLOMA SPECIAL) */}
      {/* ========================================================================= */}
      {activeTab === 'govt-jobs' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Year-Round Government & Private Jobs (Diploma CSE & Civil)
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Verified annual calendar of RRB JE, SSC JE, Uttarakhand PWD, UJVNL, DRDO, ISRO, and private EPC job opportunities. All updates require Admin/Faculty authentication.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {(currentUser.role === 'admin' || currentUser.role === 'faculty') && (
                <button
                  onClick={() => handleInitiateProtectedAction('add-job')}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Job Notification</span>
                </button>
              )}
            </div>
          </div>

          {/* Jobs List */}
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 p-5 shadow-xs transition-all space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                        {job.jobType}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {job.branch === 'Both' ? 'CSE & Civil' : `${job.branch} Diploma`}
                      </span>
                      <span className="text-xs font-bold text-emerald-600 font-mono">
                        {job.payScale}
                      </span>
                    </div>
                    <h4 className="font-bold text-base text-slate-900 dark:text-white">
                      {job.title}
                    </h4>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <span>{job.organization}</span> · <span className="text-blue-600 dark:text-blue-400">{job.examOrPostName}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => setSelectedJobForDetail(job)}
                      className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Read More (पूरा विवरण)</span>
                    </button>
                    <a
                      href={job.officialLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Official Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    {(currentUser.role === 'admin' || currentUser.role === 'faculty') && (
                      <button onClick={() => startEditJob(job)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer" title="Edit job listing" aria-label="Edit job listing">
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {(currentUser.role === 'admin' || currentUser.role === 'faculty') && (
                      <button
                        onClick={() => handleInitiateProtectedAction('delete-job', job.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                        title="Delete Job Listing"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Qualification:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{job.qualification}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Notification Window:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{job.expectedMonth}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Vacancies & Age:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{job.vacancies} Posts · {job.ageLimit}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SARKARI NAUKRI PORTAL & SARKARIRESULT.COM INTEGRATION */}
      {/* ========================================================================= */}
      {activeTab === 'sarkari-naukri' && <JobLinksHub />}
      {/* Tab "career-guide" */}
      {activeTab === 'career-guide' && <CareerGuide />}

      {/* ========================================================================= */}
      {/* TAB 4: 500+ QUESTION & ANSWER MEGA BANK */}
      {/* ========================================================================= */}
      {activeTab === 'qna-bank' && (isStaffView ? <PlacementTracker /> : <PlacementPracticeCenter />)}   {/* one question bank: server-graded practice / mock tests; staff see every student's results */}

      {/* ========================================================================= */}
      {/* TAB 5: PROFESSIONAL RESUME BUILDER & UPLOADER */}
      {/* ========================================================================= */}
      {activeTab === 'resume-builder' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span>Professional ATS Resume Builder (Diploma CSE & Civil Special)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Generate an ATS-friendly, single-page professional resume tailored for campus placements and government apprentice selections. Print or upload your PDF resume.
              </p>
            </div>

            <div className="flex items-center gap-2.5">


              <button
                onClick={handlePrintResume}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save as PDF</span>
              </button>
            </div>
          </div>

          {/* Step 19: resume saved on the server (upload / download / delete) + 5 sample resumes */}
          <ResumeCenter />

          {/* Interactive Resume Form & Real-time Live Sheet Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Editor */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 text-xs">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white border-b pb-2">
                Edit Resume Sections:
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-500 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={resumeData.fullName}
                    onChange={(e) => setResumeData({ ...resumeData, fullName: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-500 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={resumeData.phone}
                    onChange={(e) => setResumeData({ ...resumeData, phone: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-500 block mb-1">Diploma Branch</label>
                  <input
                    type="text"
                    value={resumeData.branch}
                    onChange={(e) => setResumeData({ ...resumeData, branch: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-500 block mb-1">Aggregate Marks</label>
                  <input
                    type="text"
                    value={resumeData.aggregatePercentage}
                    onChange={(e) => setResumeData({ ...resumeData, aggregatePercentage: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-500 block mb-1">Career Objective</label>
                <textarea
                  rows={2}
                  value={resumeData.careerObjective}
                  onChange={(e) => setResumeData({ ...resumeData, careerObjective: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-500 block mb-1">Technical Skills & Software</label>
                <textarea
                  rows={2}
                  value={resumeData.technicalSkills}
                  onChange={(e) => setResumeData({ ...resumeData, technicalSkills: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-500 block mb-1">Capstone Projects</label>
                <textarea
                  rows={3}
                  value={resumeData.keyProjects}
                  onChange={(e) => setResumeData({ ...resumeData, keyProjects: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-500 block mb-1">6-Week Summer Industrial Training</label>
                <textarea
                  rows={2}
                  value={resumeData.industrialTraining}
                  onChange={(e) => setResumeData({ ...resumeData, industrialTraining: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
              </div>
            </div>

            {/* Live ATS Printable Preview */}
            <div
              id="printable-resume"
              className="bg-white text-slate-900 p-8 rounded-2xl border-2 border-slate-300 shadow-xl space-y-4 font-sans text-xs leading-relaxed"
            >
              <div className="border-b-2 border-slate-900 pb-3 text-center space-y-1">
                <h2 className="text-xl font-black uppercase tracking-wider text-slate-900">
                  {resumeData.fullName}
                </h2>
                <p className="text-[11px] text-slate-600 font-semibold">
                  Diploma in {resumeData.branch} · {resumeData.college}
                </p>
                <p className="text-[10px] text-slate-500">
                  Roll No: {resumeData.rollNo} · Phone: {resumeData.phone} · Email: {resumeData.email}
                </p>
              </div>

              <div className="space-y-1">
                <h5 className="font-black text-[11px] uppercase tracking-wider text-blue-900 border-b border-slate-200 pb-0.5">
                  Career Objective
                </h5>
                <p className="text-[11px] text-slate-700">{resumeData.careerObjective}</p>
              </div>

              <div className="space-y-1">
                <h5 className="font-black text-[11px] uppercase tracking-wider text-blue-900 border-b border-slate-200 pb-0.5">
                  Education & Academic Qualifications
                </h5>
                <div className="text-[11px] space-y-0.5">
                  <div className="flex justify-between font-bold">
                    <span>{resumeData.college}</span>
                    <span>{resumeData.batch}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>3-Year Diploma ({resumeData.branch})</span>
                    <span>Aggregate: {resumeData.aggregatePercentage}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <h5 className="font-black text-[11px] uppercase tracking-wider text-blue-900 border-b border-slate-200 pb-0.5">
                  Technical Core Competencies
                </h5>
                <p className="text-[11px] text-slate-700">{resumeData.technicalSkills}</p>
              </div>

              <div className="space-y-1">
                <h5 className="font-black text-[11px] uppercase tracking-wider text-blue-900 border-b border-slate-200 pb-0.5">
                  Academic Capstone Projects
                </h5>
                <div className="text-[11px] text-slate-700 whitespace-pre-line font-sans">
                  {resumeData.keyProjects}
                </div>
              </div>

              <div className="space-y-1">
                <h5 className="font-black text-[11px] uppercase tracking-wider text-blue-900 border-b border-slate-200 pb-0.5">
                  Industrial Internship & Practical Training
                </h5>
                <p className="text-[11px] text-slate-700">{resumeData.industrialTraining}</p>
              </div>

              <div className="space-y-1">
                <h5 className="font-black text-[11px] uppercase tracking-wider text-blue-900 border-b border-slate-200 pb-0.5">
                  Certifications & Institutional Honors
                </h5>
                <p className="text-[11px] text-slate-700">{resumeData.certifications}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: COLLEGE PLACEMENT RECORDS */}
      {/* ========================================================================= */}
      {activeTab === 'college-records' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 rounded-2xl shadow-md space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                Placement Ratio (2026)
              </span>
              <h3 className="text-2xl font-black">
                {COLLEGE_PLACEMENT_RECORDS_DATA.overallStatistics.year2026.placementRatePercent}%
              </h3>
              <p className="text-[11px] text-blue-100">
                {COLLEGE_PLACEMENT_RECORDS_DATA.overallStatistics.year2026.placedStudents} of {COLLEGE_PLACEMENT_RECORDS_DATA.overallStatistics.year2026.totalEligibleStudents} Students Placed
              </p>
            </div>

            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-md space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                Highest Package
              </span>
              <h3 className="text-xl font-black">
                {COLLEGE_PLACEMENT_RECORDS_DATA.overallStatistics.year2026.highestPackageLPA}
              </h3>
              <p className="text-[11px] text-emerald-100">L&T Heavy Civil IC & Tata Projects</p>
            </div>

            <div className="bg-gradient-to-br from-purple-600 to-indigo-800 text-white p-5 rounded-2xl shadow-md space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-200">
                Average Package
              </span>
              <h3 className="text-2xl font-black">
                {COLLEGE_PLACEMENT_RECORDS_DATA.overallStatistics.year2026.averagePackageLPA}
              </h3>
              <p className="text-[11px] text-purple-100">Across CSE & Civil Diploma streams</p>
            </div>

            <div className="bg-gradient-to-br from-amber-600 to-orange-700 text-white p-5 rounded-2xl shadow-md space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200">
                Corporate Recruiters
              </span>
              <h3 className="text-2xl font-black">
                {COLLEGE_PLACEMENT_RECORDS_DATA.overallStatistics.year2026.totalCompaniesVisited}+
              </h3>
              <p className="text-[11px] text-amber-100">
                {COLLEGE_PLACEMENT_RECORDS_DATA.overallStatistics.year2026.totalOffersIssued} Offers Issued
              </p>
            </div>
          </div>

          {/* Top Recruiters Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Institutional Placement Hall of Fame & Top Recruiters</span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold">
                    <th className="pb-3">Company / Organization</th>
                    <th className="pb-3">Eligible Branch</th>
                    <th className="pb-3">Total UGIP Recruits</th>
                    <th className="pb-3">Package Range</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {COLLEGE_PLACEMENT_RECORDS_DATA.topRecruiters.map((rec, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 font-bold text-slate-900 dark:text-white">{rec.name}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          {rec.branch}
                        </span>
                      </td>
                      <td className="py-3 font-semibold text-emerald-600">{rec.hires} Students</td>
                      <td className="py-3 font-mono font-bold text-slate-700 dark:text-slate-300">{rec.package}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: SHARE YOUR EXPERIENCE (COMMUNITY DASHBOARD) */}
      {/* ========================================================================= */}
      {activeTab === 'share-experience' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3.5">
            <div className="w-full">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600 shrink-0" />
                <span>Share Your Experience (अनुभव साझा करें / Alumni & Peer Community)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Students, alumni, and faculty can share interview questions asked, selection journey, advice, photos, and video links.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowShareModal(true)}
                className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Share My Experience</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {sharedExperiences.map((exp) => (
              <div
                key={exp.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 font-bold text-xs flex items-center justify-center">
                        {exp.authorName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white">{exp.authorName}</h4>
                        <p className="text-[10px] text-slate-400">{exp.authorRole} · {exp.company}</p>
                      </div>
                    </div>
                    {exp.packageOffered && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {exp.packageOffered}
                      </span>
                    )}
                  </div>

                  <h5 className="font-bold text-sm text-slate-900 dark:text-white">{exp.title}</h5>

                  {exp.mediaUrl && exp.mediaType === 'image' && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative group">
                      <img src={exp.mediaUrl} alt={exp.title} className="w-full h-48 object-cover" />
                      <a
                        href={exp.mediaUrl}
                        download="experience-photo.jpg"
                        className="absolute bottom-2 right-2 p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Pic</span>
                      </a>
                    </div>
                  )}

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                    {exp.textStory}
                  </p>

                  {exp.tips && exp.tips.length > 0 && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl space-y-1">
                      <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-300 block">
                        Golden Tips:
                      </span>
                      <ul className="text-xs text-slate-700 dark:text-slate-300 list-disc list-inside space-y-0.5">
                        {exp.tips.map((tip, tIdx) => (
                          <li key={tIdx}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>{exp.createdAt}</span>
                  <button
                    onClick={() => likeSharedExperience(exp.id)}
                    className="flex items-center gap-1.5 text-rose-500 hover:text-rose-600 font-bold cursor-pointer"
                  >
                    <Heart className="w-4 h-4 fill-rose-500/20" />
                    <span>{exp.likes} Helpful</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: MOCK INTERVIEW & CURATED YOUTUBE VIDEO MASTERCLASS */}
      {/* ========================================================================= */}
      {activeTab === 'mock-interview' && <MockInterviewPortal />}   {/* one mock-interview screen for the whole portal (practice, camera, tips videos) */}

      {/* ========================================================================= */}
      {/* READ MORE DETAILS MODAL FOR PLACEMENT DRIVES */}
      {/* ========================================================================= */}
      {selectedDriveForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 flex items-center justify-between shrink-0">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300">
                  {selectedDriveForDetail.type} · {selectedDriveForDetail.branch}
                </span>
                <h3 className="text-lg font-black text-white">{selectedDriveForDetail.title}</h3>
                <p className="text-xs text-blue-200 font-semibold">{selectedDriveForDetail.company}</p>
              </div>
              <button
                onClick={() => setSelectedDriveForDetail(null)}
                className="p-1 rounded-lg text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">CTC Package</span>
                  <span className="font-mono font-bold text-emerald-600 text-sm">{selectedDriveForDetail.ctc}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Training Stipend</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{selectedDriveForDetail.stipend || 'Applicable'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Openings</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{selectedDriveForDetail.vacancies} Seats</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Apply Deadline</span>
                  <span className="font-bold text-rose-600">{selectedDriveForDetail.deadline}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Full Job Description:</h4>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                  {selectedDriveForDetail.fullDescription}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Eligibility Criteria:</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
                  <li>Minimum Diploma Aggregate: {selectedDriveForDetail.eligibilityCriteria.minPercentage}%</li>
                  <li>Maximum Active Backlogs Permitted: {selectedDriveForDetail.eligibilityCriteria.allowedBacklogs}</li>
                  <li>Eligible Branches: {selectedDriveForDetail.eligibilityCriteria.branches.join(', ')}</li>
                  {selectedDriveForDetail.eligibilityCriteria.otherCriteria && (
                    <li>Note: {selectedDriveForDetail.eligibilityCriteria.otherCriteria}</li>
                  )}
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Selection Process & Rounds:</h4>
                <div className="space-y-1.5">
                  {selectedDriveForDetail.selectionProcess.map((step, sIdx) => (
                    <div key={sIdx} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-[10px]">
                        {sIdx + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Key Technical Skills:</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedDriveForDetail.keySkills.map((sk, kIdx) => (
                    <span key={kIdx} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-semibold">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-900 dark:text-blue-200">
                <p className="font-bold">Institutional Placement Coordinator Contact:</p>
                <p className="mt-0.5">{selectedDriveForDetail.contactPerson || 'TPO Office, UGIP'}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setSelectedDriveForDetail(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
              {currentUser.role === 'student' && (
                selectedDriveForDetail.applied ? (
                  <span className="px-5 py-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold">{selectedDriveForDetail.myStatus || 'Applied'}</span>
                ) : selectedDriveForDetail.cannotApplyReason ? (
                  <span className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-xs font-bold">{selectedDriveForDetail.cannotApplyReason}</span>
                ) : (
                  <button
                    onClick={async () => { await handleApplyDrive(selectedDriveForDetail.id, selectedDriveForDetail.title); setSelectedDriveForDetail(null); }}
                    disabled={placementBusy === selectedDriveForDetail.id}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                  >
                    Submit Application
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* READ MORE DETAILS MODAL FOR GOVT JOBS */}
      {/* ========================================================================= */}
      {selectedJobForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 flex items-center justify-between shrink-0">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300">
                  {selectedJobForDetail.jobType} · {selectedJobForDetail.branch}
                </span>
                <h3 className="text-lg font-black text-white">{selectedJobForDetail.title}</h3>
                <p className="text-xs text-indigo-200 font-semibold">{selectedJobForDetail.organization}</p>
              </div>
              <button
                onClick={() => setSelectedJobForDetail(null)}
                className="p-1 rounded-lg text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Pay Scale</span>
                  <span className="font-mono font-bold text-emerald-600 text-xs">{selectedJobForDetail.payScale}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Vacancies</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{selectedJobForDetail.vacancies} Posts</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Age Limit</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{selectedJobForDetail.ageLimit}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Target Window</span>
                  <span className="font-bold text-indigo-600">{selectedJobForDetail.expectedMonth}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Educational Qualification:</h4>
                <p className="text-slate-600 dark:text-slate-300 font-medium">
                  {selectedJobForDetail.qualification}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Exam Pattern & Syllabus Summary:</h4>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-sans bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border">
                  {selectedJobForDetail.syllabusSummary}
                </p>
              </div>

              {selectedJobForDetail.notes && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-900 dark:text-amber-200 space-y-1">
                  <p className="font-bold">Important Candidate Guidelines:</p>
                  <p>{selectedJobForDetail.notes}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setSelectedJobForDetail(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
              <a
                href={selectedJobForDetail.officialLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <span>Open Official Notification</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: APPLICANTS OF A DRIVE (poster / admin only; the server checks it again) */}
      {/* ========================================================================= */}
      {applicantsFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Applicants: {applicantsFor.company} · {applicantsFor.title}</h3>
              <button onClick={() => setApplicantsFor(null)} className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            {applicantsError && <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">{applicantsError}</div>}
            {!applicantsError && applicantRows.length === 0 && <p className="text-xs text-slate-500">No student has applied yet.</p>}
            {applicantRows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead><tr className="text-slate-500 border-b border-slate-100 dark:border-slate-800"><th className="py-2 pr-3">Roll no</th><th className="pr-3">Name</th><th className="pr-3">Branch / Yr</th><th className="pr-3">Avg %</th><th>Status</th></tr></thead>
                  <tbody>
                    {applicantRows.map((a) => (
                      <tr key={a.id} className="border-b border-slate-50 dark:border-slate-800/60 text-slate-800 dark:text-slate-200">
                        <td className="py-2 pr-3 font-mono">{a.rollNo}</td><td className="pr-3">{a.name}</td><td className="pr-3">{a.branch} / {a.year}</td><td className="pr-3">{a.percentage ?? '-'}</td>
                        <td>
                          <select value={a.status} onChange={(e) => changeApplicantStatus(a.id, e.target.value as ApplicationStatus)} className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
                            {['Applied', 'Shortlisted', 'Selected', 'Rejected'].map((x) => <option key={x}>{x}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              {applicantRows.length > 0 && <button onClick={downloadApplicantsCsv} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1"><Download className="w-3.5 h-3.5" /> CSV</button>}
              <button onClick={() => setApplicantsFor(null)} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADMIN & FACULTY SECURITY PASSWORD AUTHORIZATION MODAL */}
      {/* ========================================================================= */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border-2 border-amber-500 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Security Authorization Required
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Admin or Faculty password verification is mandatory to alter placement data.
                </p>
              </div>
            </div>

            {authPasswordError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">
                {authPasswordError}
              </div>
            )}

            <form onSubmit={handleVerifyPasswordAndExecute} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Enter Admin / Faculty Security Password:
                </label>
                <input
                  type="password"
                  value={authPasswordInput}
                  onChange={(e) => setAuthPasswordInput(e.target.value)}
                  placeholder="e.g. admin@2026 or your faculty password"
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black shadow-md cursor-pointer"
                >
                  Authenticate & Proceed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: POST PLACEMENT DRIVE (FOR AUTHORIZED STAFF) */}
      {/* ========================================================================= */}
      {showAddDriveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Post New Campus Placement Drive (2026)</span>
              </h3>
              <button onClick={() => setShowAddDriveModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDriveSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={newDriveForm.company}
                    onChange={(e) => setNewDriveForm({ ...newDriveForm, company: e.target.value })}
                    placeholder="e.g. Tata Consultancy Services"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Target Branch</label>
                  <select
                    value={newDriveForm.branch}
                    onChange={(e) => setNewDriveForm({ ...newDriveForm, branch: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  >
                    <option value="CSE">Computer Science (CSE)</option>
                    <option value="Civil">Civil Engineering</option>
                    <option value="Both">Both (CSE & Civil)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Job Role Title</label>
                <input
                  type="text"
                  required
                  value={newDriveForm.title}
                  onChange={(e) => setNewDriveForm({ ...newDriveForm, title: e.target.value })}
                  placeholder="e.g. Diploma Trainee Engineer (Cloud Ops)"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold block mb-1">CTC Package</label>
                  <input
                    type="text"
                    value={newDriveForm.ctc}
                    onChange={(e) => setNewDriveForm({ ...newDriveForm, ctc: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Vacancies</label>
                  <input
                    type="number"
                    value={newDriveForm.vacancies}
                    onChange={(e) => setNewDriveForm({ ...newDriveForm, vacancies: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Deadline Date</label>
                  <input
                    type="date"
                    value={newDriveForm.deadline}
                    onChange={(e) => setNewDriveForm({ ...newDriveForm, deadline: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Full Description & Scope</label>
                <textarea
                  rows={3}
                  value={newDriveForm.fullDescription}
                  onChange={(e) => setNewDriveForm({ ...newDriveForm, fullDescription: e.target.value })}
                  placeholder="Job duties, training location, bond if any..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDriveModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md cursor-pointer"
                >
                  Publish Placement Drive
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD GOVT JOB NOTIFICATION */}
      {/* ========================================================================= */}
      {showAddJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>Add Government / Private Job Listing</span>
              </h3>
              <button onClick={() => setShowAddJobModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateJobSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Organization / Commission</label>
                  <input
                    type="text"
                    required
                    value={newJobForm.organization}
                    onChange={(e) => setNewJobForm({ ...newJobForm, organization: e.target.value })}
                    placeholder="e.g. RRB / SSC / UJVNL / PWD"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Branch Eligibility</label>
                  <select
                    value={newJobForm.branch}
                    onChange={(e) => setNewJobForm({ ...newJobForm, branch: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  >
                    <option value="Both">Both CSE & Civil</option>
                    <option value="Civil">Civil Diploma</option>
                    <option value="CSE">CSE Diploma</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Post Title / Exam Name</label>
                <input
                  type="text"
                  required
                  value={newJobForm.title}
                  onChange={(e) => setNewJobForm({ ...newJobForm, title: e.target.value })}
                  placeholder="e.g. Junior Engineer (Civil) - CPWD & BRO"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Pay Scale</label>
                  <input
                    type="text"
                    value={newJobForm.payScale}
                    onChange={(e) => setNewJobForm({ ...newJobForm, payScale: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Expected Month</label>
                  <input
                    type="text"
                    value={newJobForm.expectedMonth}
                    onChange={(e) => setNewJobForm({ ...newJobForm, expectedMonth: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Official Portal Link</label>
                  <input
                    type="text"
                    value={newJobForm.officialLink}
                    onChange={(e) => setNewJobForm({ ...newJobForm, officialLink: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddJobModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md cursor-pointer"
                >
                  Save Job Listing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SHARE YOUR EXPERIENCE */}
      {/* ========================================================================= */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span>Share Your Interview / Placement Journey</span>
              </h3>
              <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExperienceSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Company / Organization</label>
                  <input
                    type="text"
                    required
                    value={newExpForm.company}
                    onChange={(e) => setNewExpForm({ ...newExpForm, company: e.target.value })}
                    placeholder="e.g. TCS / L&T / UJVNL"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Role Title / Package</label>
                  <input
                    type="text"
                    value={newExpForm.roleTitle}
                    onChange={(e) => setNewExpForm({ ...newExpForm, roleTitle: e.target.value })}
                    placeholder="e.g. Trainee Engineer (₹ 4.2 LPA)"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Post Headline</label>
                <input
                  type="text"
                  required
                  value={newExpForm.title}
                  onChange={(e) => setNewExpForm({ ...newExpForm, title: e.target.value })}
                  placeholder="e.g. How I cleared L&T JET site interview on my first attempt"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Your Detailed Experience & Questions Asked</label>
                <textarea
                  rows={4}
                  required
                  value={newExpForm.textStory}
                  onChange={(e) => setNewExpForm({ ...newExpForm, textStory: e.target.value })}
                  placeholder="What technical questions were asked? How did you prepare? Tips for juniors..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Photo / Picture Upload URL (Optional)</label>
                <input
                  type="text"
                  value={newExpForm.mediaUrl}
                  onChange={(e) => setNewExpForm({ ...newExpForm, mediaUrl: e.target.value, mediaType: 'image' })}
                  placeholder="Paste image URL (or upload photo)"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Golden Tips for Juniors (One per line)</label>
                <textarea
                  rows={2}
                  value={newExpForm.tips}
                  onChange={(e) => setNewExpForm({ ...newExpForm, tips: e.target.value })}
                  placeholder="Tip 1: Practice leveling calculations&#10;Tip 2: Prepare your 5th sem project"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md cursor-pointer"
                >
                  Post Story to Community
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
