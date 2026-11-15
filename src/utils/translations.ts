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
}

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
  },
};
