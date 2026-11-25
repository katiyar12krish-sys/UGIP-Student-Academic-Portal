// ===================================================================================================
// Screen texts in English, Hindi and Urdu (the EN / HI / UR switch in the top bar).
// ===================================================================================================
export type SupportedLanguage = 'en' | 'hi' | 'ur';

// Data shape: translation dictionary.
export interface TranslationDictionary {
  // Institutional Brand & Navigation
  collegeName: string;
  collegeSubtitle: string;
  academicSession: string;
  smartPortalSystem: string;
  portalOperational: string;
  portalHome: string;
  activePortal: string;
  adminRole: string;
  facultyRole: string;
  studentRole: string;
  switchUser: string;
  selectAccessGateway: string;
  enterAdmin: string;
  enterFaculty: string;
  enterStudent: string;
  logout: string;
  themeToggle: string;
  languageSelect: string;

  // Features & Common
  notifications: string;
  markAllRead: string;
  clearAll: string;
  noNotifications: string;
  broadcastNotice: string;
  searchPlaceholder: string;
  punchQR: string;
  attendance: string;
  present: string;
  absent: string;
  late: string;
  curriculum: string;
  timetable: string;
  practicals: string;
  studyMaterials: string;
  classSubjectDispatcher: string;
  excelMarksExport: string;
  placements: string;
  honorsGallery: string;
  newsCirculars: string;
  ubterPapers: string;
  aiDiagnostics: string;
  aiStudyCoach: string;
  aiQuestionSolver: string;
  mysqlDatabase: string;
  save: string;
  cancel: string;
  close: string;
  confirm: string;
  overview: string;
  categoryRoster: string;
  staffGateRegister: string;
  resultsMarks: string;
  examSchedule: string;
  upcomingExams: string;
  download: string;
  preview: string;
  verify: string;

  // Notification types
  alertAttendance: string;
  alertExam: string;
  alertCircular: string;
  alertSystem: string;

  // Portal Nav & Tabs
  home: string;
  students: string;
  academicYear: string;
  boardResults: string;
  questionPapers: string;
  attendanceRegister: string;
  attendanceAnalysis: string;
  staffAttendance: string;
  onlineTests: string;
  doubtResolution: string;
  classDispatch: string;
  dataCenter: string;
  passwords: string;
  facultyControl: string;
  securityAudit: string;
  subjectsTeachers: string;
  syllabus: string;
  documentHub: string;
  placementHub: string;
  placementTracker: string;
  performanceAnalytics: string;
  noticesTitle: string;
  myProfile: string;
  menu: string;
  allMenus: string;
  closeMenu: string;
  searchMenuPlaceholder: string;
  exitPortal: string;

  // Header & Roles
  chiefAdmin: string;
  adminSubtitle: string;
  studentScanner: string;
  addStudentBtn: string;

  // Stats
  totalStudents: string;
  savedPasswords: string;
  facultyControlled: string;
  safetyFirst: string;
  avgAttendance: string;
  ubterMinReq: string;
  atRiskStudents: string;
  reviewDiagnosticPlan: string;

  // Login
  signIn: string;
  chooseRole: string;
  studentCardTitle: string;
  studentCardSub: string;
  facultyCardTitle: string;
  facultyCardSub: string;
  adminCardTitle: string;
  adminCardSub: string;
  parentLoginLink: string;
  usernamePlaceholder: string;
  passwordPlaceholder: string;
  enterPasswordPlaceholder: string;
  showPassword: string;
  forgotPassword: string;
  signInBtn: string;
}

export const tr = (lang: SupportedLanguage | undefined, en: string, hi: string): string => {
  return lang === 'hi' ? hi : en;
};

export const TRANSLATIONS: Record<SupportedLanguage, TranslationDictionary> = {
  en: {
    collegeName: 'Uttarakhand Government Institute of Polytechnic',
    collegeSubtitle: 'Affiliated with UBTER Roorkee & Approved by AICTE, Govt. of Uttarakhand',
    academicSession: 'Academic Session 2026-2027',
    smartPortalSystem: 'College Management Portal',
    portalOperational: 'Portal Operational',
    portalHome: 'Portal Home',
    activePortal: 'Active Portal',
    adminRole: 'Administrator',
    facultyRole: 'Faculty / Lecturer',
    studentRole: 'Student Portal',
    switchUser: 'Switch User Account',
    selectAccessGateway: 'Select Institutional Access Gateway',
    enterAdmin: 'Enter Admin Portal',
    enterFaculty: 'Enter Faculty Portal',
    enterStudent: 'Enter Student Portal',
    logout: 'Logout',
    themeToggle: 'Toggle Dark/Light Mode',
    languageSelect: 'Language',

    notifications: 'Notifications',
    markAllRead: 'Mark all as read',
    clearAll: 'Clear all',
    noNotifications: 'No new notifications right now',
    broadcastNotice: 'Broadcast Alert',
    searchPlaceholder: 'Search by student name, roll number, or subject...',
    punchQR: 'Punch QR',
    attendance: 'Attendance',
    present: 'Present',
    absent: 'Absent',
    late: 'Late',
    curriculum: 'Curriculum & Subjects',
    timetable: 'Timetable',
    practicals: 'Lab Practicals',
    studyMaterials: 'E-Learning & Materials',
    classSubjectDispatcher: 'Class & Subject Dispatcher',
    excelMarksExport: 'Export All Marks to Excel',
    placements: 'TPO & Placements',
    honorsGallery: 'Honors Gallery',
    newsCirculars: 'News & Circulars',
    ubterPapers: 'UBTER Papers',
    aiDiagnostics: 'AI Diagnostic Engine',
    aiStudyCoach: 'AI Study Coach',
    aiQuestionSolver: 'AI Question Solver',
    mysqlDatabase: 'MySQL Database',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    confirm: 'Confirm',
    overview: 'Overview & Stats',
    categoryRoster: 'Category Roster',
    staffGateRegister: 'Staff Gate Register',
    resultsMarks: 'Results & Marks',
    examSchedule: 'Exam Schedule',
    upcomingExams: 'Upcoming Exams',
    download: 'Download',
    preview: 'Preview',
    verify: 'Verify',

    alertAttendance: 'Attendance Alert',
    alertExam: 'Exam Notification',
    alertCircular: 'Official Circular',
    alertSystem: 'System Notice',

    // Portal Nav & Tabs
    home: 'Home',
    students: 'Students',
    academicYear: 'Academic Year & Promotion',
    boardResults: 'UBTER Board Results',
    questionPapers: 'Question Papers & Answer Keys',
    attendanceRegister: 'Attendance Register',
    attendanceAnalysis: 'Batch Attendance Analysis',
    staffAttendance: 'Staff Gate Register',
    onlineTests: 'Online Tests & Tasks',
    doubtResolution: 'Real-Time Doubt Q&A',
    classDispatch: 'Class & Subject Dispatcher',
    dataCenter: 'Data Center',
    passwords: 'Logins & Passwords',
    facultyControl: 'Faculty Role Control',
    securityAudit: 'Security Audit Logs',
    subjectsTeachers: 'Curriculum & Subjects',
    syllabus: 'Syllabus (UBTER)',
    documentHub: 'Document & Material Hub',
    placementHub: 'Career & Placement Hub',
    placementTracker: 'Placement Tracker',
    performanceAnalytics: 'Student Performance Analytics',
    noticesTitle: 'News & Circulars',
    myProfile: 'My Profile & Password',
    menu: 'Menu',
    allMenus: 'All Menus & Modules',
    closeMenu: 'Close Menu',
    searchMenuPlaceholder: 'Search menus and tools...',
    exitPortal: 'Exit Portal',

    // Header & Roles
    chiefAdmin: 'Chief Administrator',
    adminSubtitle: 'Master Administration, Role Management, and Encrypted Security Vault',
    studentScanner: 'Student QR Scanner',
    addStudentBtn: 'Add Student & Password',

    // Stats
    totalStudents: 'Total Students',
    savedPasswords: 'Saved Passwords',
    facultyControlled: 'Faculty Controlled',
    safetyFirst: 'Safety First: Admin Auth Only',
    avgAttendance: 'Avg. Attendance',
    ubterMinReq: 'UBTER Min Req: 75%',
    atRiskStudents: 'At-Risk Students',
    reviewDiagnosticPlan: 'Review diagnostic plan →',

    // Login
    signIn: 'Sign in',
    chooseRole: 'Choose who you are',
    studentCardTitle: 'Student',
    studentCardSub: 'Roll No. & Password',
    facultyCardTitle: 'Faculty',
    facultyCardSub: 'Subject Lecturers & HODs',
    adminCardTitle: 'Admin',
    adminCardSub: 'Principal & Office Only',
    parentLoginLink: 'Parent Portal Login →',
    usernamePlaceholder: 'Username / Roll No. / Staff ID',
    passwordPlaceholder: 'Password',
    enterPasswordPlaceholder: 'Enter your password...',
    showPassword: 'Show Password',
    forgotPassword: 'Forgot Password?',
    signInBtn: 'Sign In to Portal',
  },
  hi: {
    collegeName: 'उत्तराखंड राजकीय पॉलिटेक्निक संस्थान',
    collegeSubtitle: 'यूबीटीईआर रुड़की से संबद्ध एवं एआईसीटीई द्वारा अनुमोदित (उत्तराखंड शासन)',
    academicSession: 'शैक्षणिक सत्र 2026-2027',
    smartPortalSystem: 'कॉलेज प्रबंधन पोर्टल',
    portalOperational: 'पोर्टल सक्रिय है',
    portalHome: 'पोर्टल होम',
    activePortal: 'सक्रिय पोर्टल',
    adminRole: 'प्रशासन (Admin)',
    facultyRole: 'शिक्षक (Faculty)',
    studentRole: 'छात्र (Student)',
    switchUser: 'उपयोगकर्ता खाता बदलें',
    selectAccessGateway: 'प्रवेश द्वार चुनें',
    enterAdmin: 'प्रशासन पोर्टल में प्रवेश करें',
    enterFaculty: 'शिक्षक पोर्टल में प्रवेश करें',
    enterStudent: 'छात्र पोर्टल में प्रवेश करें',
    logout: 'लॉगआउट',
    themeToggle: 'डार्क/लाइट मोड बदलें',
    languageSelect: 'भाषा (Language)',

    notifications: 'सूचनाएं (Notifications)',
    markAllRead: 'सभी पढ़े गए चिह्नित करें',
    clearAll: 'सभी हटाएं',
    noNotifications: 'इस समय कोई नई सूचना नहीं है',
    broadcastNotice: 'तात्कालिक सूचना भेजें',
    searchPlaceholder: 'छात्र का नाम, रोल नंबर या विषय खोजें...',
    punchQR: 'क्यूआर उपस्थिति दर्ज करें',
    attendance: 'उपस्थिति (Attendance)',
    present: 'उपस्थित (Present)',
    absent: 'अनुपस्थित (Absent)',
    late: 'विलंब (Late)',
    curriculum: 'पाठ्यक्रम एवं विषय',
    timetable: 'समय सारणी (Timetable)',
    practicals: 'प्रयोगशाला प्रैक्टिकल',
    studyMaterials: 'ई-लर्निंग और नोट्स',
    classSubjectDispatcher: 'कक्षा एवं विषय अनुसार सामग्री प्रेषण',
    excelMarksExport: 'सभी छात्रों के अंक एक्सेल शीट में प्रिंट/डाउनलोड',
    placements: 'प्रशिक्षण एवं प्लेसमेंट',
    honorsGallery: 'उपलब्धियां और गैलरी',
    newsCirculars: 'समाचार और परिपत्र',
    ubterPapers: 'यूबीटीईआर प्रश्न पत्र',
    aiDiagnostics: 'एआई डायग्नोस्टिक इंजन',
    aiStudyCoach: 'एआई स्टडी कोच',
    aiQuestionSolver: 'एआई प्रश्न समाधानकर्ता',
    mysqlDatabase: 'माईएसक्यूएल डेटाबेस',
    save: 'सुरक्षित करें',
    cancel: 'रद्द करें',
    close: 'बंद करें',
    confirm: 'पुष्टि करें',
    overview: 'सिंहावलोकन और आँकड़े',
    categoryRoster: 'आरक्षण श्रेणी रोस्टर',
    staffGateRegister: 'स्टाफ उपस्थिति रजिस्टर',
    resultsMarks: 'परीक्षा परिणाम और अंक',
    examSchedule: 'परीक्षा समय सारणी (Exam Schedule)',
    upcomingExams: 'आगामी परीक्षाएं (Upcoming Exams)',
    download: 'डाउनलोड',
    preview: 'पूर्वावलोकन',
    verify: 'सत्यापित करें',

    alertAttendance: 'उपस्थिति सूचना',
    alertExam: 'परीक्षा सूचना',
    alertCircular: 'आधिकारिक परिपत्र',
    alertSystem: 'प्रणाली सूचना',

    // Portal Nav & Tabs
    home: 'होम',
    students: 'छात्र डेटाबेस',
    academicYear: 'शैक्षणिक सत्र व पदोन्नति',
    boardResults: 'यूबीटीईआर बोर्ड परिणाम',
    questionPapers: 'प्रश्न पत्र एवं उत्तर कुंजी',
    attendanceRegister: 'उपस्थिति रजिस्टर',
    attendanceAnalysis: 'बैच उपस्थिति विश्लेषण',
    staffAttendance: 'स्टाफ गेट रजिस्टर',
    onlineTests: 'ऑनलाइन टेस्ट व असाइनमेंट',
    doubtResolution: 'लाइव संशय समाधान (Doubts)',
    classDispatch: 'कक्षा व विषय सामग्री प्रेषक',
    dataCenter: 'डेटा सेंटर (डाउनलोड/अपलोड)',
    passwords: 'लॉगिन व पासवर्ड्स',
    facultyControl: 'शिक्षक नियंत्रण (Faculty Control)',
    securityAudit: 'सुरक्षा ऑडिट लॉग्स',
    subjectsTeachers: 'पाठ्यक्रम एवं विषय',
    syllabus: 'सिलेबस (यूबीटीईआर)',
    documentHub: 'दस्तावेज व सामग्री हब',
    placementHub: 'करियर व प्लेसमेंट हब',
    placementTracker: 'प्लेसमेंट ट्रैकर (रिज्यूमे/टेस्ट)',
    performanceAnalytics: 'छात्र प्रगति विश्लेषण',
    noticesTitle: 'कॉलेज सूचनाएं व परिपत्र',
    myProfile: 'मेरी प्रोफाइल व पासवर्ड',
    menu: 'मेनू',
    allMenus: 'सभी मेनू एवं अनुभाग',
    closeMenu: 'मेनू बंद करें',
    searchMenuPlaceholder: 'मेनू और टूल्स खोजें...',
    exitPortal: 'पोर्टल से बाहर निकलें',

    // Header & Roles
    chiefAdmin: 'मुख्य प्रशासक (Chief Administrator)',
    adminSubtitle: 'समग्र कॉलेज प्रशासन, शिक्षक अधिकार एवं सुरक्षित डेटा वॉल्ट',
    studentScanner: 'छात्र QR स्कैनर',
    addStudentBtn: 'नया छात्र व पासवर्ड जोड़ें',

    // Stats
    totalStudents: 'कुल नामांकित छात्र',
    savedPasswords: 'सुरक्षित पासवर्ड',
    facultyControlled: 'शिक्षक नियंत्रण',
    safetyFirst: 'सुरक्षा प्रथम: केवल प्रशासन',
    avgAttendance: 'औसत उपस्थिति',
    ubterMinReq: 'यूबीटीईआर न्यूनतम: 75%',
    atRiskStudents: 'संवेदनशील छात्र',
    reviewDiagnosticPlan: 'सुधार योजना देखें →',

    // Login
    signIn: 'लॉगिन करें',
    chooseRole: 'अपना प्रकार चुनें',
    studentCardTitle: 'छात्र (Student)',
    studentCardSub: 'रोल नंबर और पासवर्ड',
    facultyCardTitle: 'शिक्षक (Faculty)',
    facultyCardSub: 'विषय प्रवक्ता व विभागाध्यक्ष',
    adminCardTitle: 'प्रशासन (Admin)',
    adminCardSub: 'प्रधानाचार्य एवं कार्यालय',
    parentLoginLink: 'अभिभावक लॉगिन (Parent Login) →',
    usernamePlaceholder: 'यूजरनेम / रोल नंबर / स्टाफ आईडी',
    passwordPlaceholder: 'पासवर्ड',
    enterPasswordPlaceholder: 'अपना पासवर्ड दर्ज करें...',
    showPassword: 'पासवर्ड देखें',
    forgotPassword: 'पासवर्ड भूल गए?',
    signInBtn: 'पोर्टल में प्रवेश करें',
  },
  ur: {
    collegeName: 'اتراکھنڈ گورنمنٹ انسٹی ٹیوٹ آف پولی ٹیکنک (Uttarakhand Government Institute of Polytechnic)',
    collegeSubtitle: 'UBTER Roorkee se Ilhaaq shuda & AICTE se Manzoor',
    academicSession: 'Session 2026-2027',
    smartPortalSystem: 'College Management Portal',
    portalOperational: 'Portal Fa-aal Hai',
    portalHome: 'Portal Home',
    activePortal: 'Fa-aal Portal',
    adminRole: 'Intezamiya (Admin)',
    facultyRole: 'Asaatza (Faculty)',
    studentRole: 'Talib-e-Ilm (Student)',
    switchUser: 'User Account Badlein',
    selectAccessGateway: 'Apna Portal Chunein',
    enterAdmin: 'Admin Portal Mein Dakhil Hon',
    enterFaculty: 'Faculty Portal Mein Dakhil Hon',
    enterStudent: 'Student Portal Mein Dakhil Hon',
    logout: 'Logout Karein',
    themeToggle: 'Dark / Light Mode Badlein',
    languageSelect: 'Zabaan (Language)',

    notifications: 'Notifications / Ittelaat (اطلاعات)',
    markAllRead: 'Sabhi Parhe Huye Mark Karein',
    clearAll: 'Sabhi Saaf Karein',
    noNotifications: 'Filhal koi nayi notification nahi hai',
    broadcastNotice: 'Live Ittela Jari Karein',
    searchPlaceholder: 'Talib-e-ilm ka naam ya roll number search karein...',
    punchQR: 'QR Attendance Punch Karein',
    attendance: 'Haziri (Attendance)',
    present: 'Hazir (Present)',
    absent: 'Ghair Hazir (Absent)',
    late: 'Takhir (Late)',
    curriculum: 'Nisaab (Curriculum)',
    timetable: 'Time Table',
    practicals: 'Lab Practicals & Experiments',
    studyMaterials: 'Study Notes & Darsgah',
    classSubjectDispatcher: 'Class & Subject Material Dispatch',
    excelMarksExport: 'Tamam Bachon Ke Number Excel Mein Print Karein',
    placements: 'TPO & Placement Cell',
    honorsGallery: 'Kamyabiyan & Aizazaat',
    newsCirculars: 'Khabrein & Circulars',
    ubterPapers: 'UBTER Sabiqa Papers',
    aiDiagnostics: 'AI Diagnostic Engine',
    aiStudyCoach: 'AI Study Saathi',
    aiQuestionSolver: 'AI Sawaal Hal Karein',
    mysqlDatabase: 'MySQL Database Engine',
    save: 'Mehfooz Karein (Save)',
    cancel: 'Mansookh Karein (Cancel)',
    close: 'Band Karein (Close)',
    confirm: 'Tasdeeq Karein (Confirm)',
    overview: 'Jaiza & Shumariyaat',
    categoryRoster: 'Category Roster (GEN/OBC/SC/ST/EWS)',
    staffGateRegister: 'Staff Gate Attendance',
    resultsMarks: 'Imtehan Nateeja & Numberat',
    examSchedule: 'Imtehan Schedule (Exam Datesheet)',
    upcomingExams: 'Aane Wale Imtehanat (Upcoming)',
    download: 'Download',
    preview: 'Pesh-Manzar (Preview)',
    verify: 'Tasdeeq Shuda (Verified)',

    alertAttendance: 'Haziri Ki Ittela',
    alertExam: 'Imtehan Ki Ittela',
    alertCircular: 'Sarkari Circular',
    alertSystem: 'System Alert',

    // Portal Nav & Tabs
    home: 'Home',
    students: 'Talib-e-Ilm',
    academicYear: 'Academic Year',
    boardResults: 'UBTER Board Nateeja',
    questionPapers: 'Question Papers',
    attendanceRegister: 'Haziri Register',
    attendanceAnalysis: 'Haziri Analysis',
    staffAttendance: 'Staff Gate Register',
    onlineTests: 'Online Tests',
    doubtResolution: 'Doubt Q&A',
    classDispatch: 'Material Dispatch',
    dataCenter: 'Data Center',
    passwords: 'Passwords',
    facultyControl: 'Faculty Control',
    securityAudit: 'Security Audit',
    subjectsTeachers: 'Subjects',
    syllabus: 'Syllabus',
    documentHub: 'Document Hub',
    placementHub: 'Placement Hub',
    placementTracker: 'Placement Tracker',
    performanceAnalytics: 'Performance Analytics',
    noticesTitle: 'Notices',
    myProfile: 'Profile',
    menu: 'Menu',
    allMenus: 'All Menus',
    closeMenu: 'Close Menu',
    searchMenuPlaceholder: 'Search...',
    exitPortal: 'Exit Portal',

    chiefAdmin: 'Chief Administrator',
    adminSubtitle: 'Administration & Role Management',
    studentScanner: 'Student QR Scanner',
    addStudentBtn: 'Add Student',

    totalStudents: 'Total Students',
    savedPasswords: 'Saved Passwords',
    facultyControlled: 'Faculty Controlled',
    safetyFirst: 'Safety First',
    avgAttendance: 'Avg. Attendance',
    ubterMinReq: 'UBTER Min: 75%',
    atRiskStudents: 'At-Risk Students',
    reviewDiagnosticPlan: 'Review plan →',

    signIn: 'Sign in',
    chooseRole: 'Apna role chunein',
    studentCardTitle: 'Student',
    studentCardSub: 'Roll No. & Password',
    facultyCardTitle: 'Faculty',
    facultyCardSub: 'Lecturers & HODs',
    adminCardTitle: 'Admin',
    adminCardSub: 'Principal & Office',
    parentLoginLink: 'Parent login →',
    usernamePlaceholder: 'Username / Roll No.',
    passwordPlaceholder: 'Password',
    enterPasswordPlaceholder: 'Password likhein...',
    showPassword: 'Show Password',
    forgotPassword: 'Password bhool gaye?',
    signInBtn: 'Sign In',
  },
};
