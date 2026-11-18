// Rebuilt file: the original src/data folder was missing from the step-16 zip.
// Staff and subjects come from server/db/seed-staff.json and seed-subjects.json.
// Sample content that cannot be recovered (syllabus topics, demo quizzes, videos, placement figures) is left empty or zero.
import type { BranchInfo, UserProfile, Subject, TestExam, AttendanceSession, PreviousYearPaper, ActivityLog, FacultyAttendancePunch, PracticalExperiment, TimetableSlot } from '../types';

export const BRANCHES: BranchInfo[] = [
  { code: 'CSE', name: 'Computer Science & Engineering', hodName: 'Mr. Jitendra Parsad', intakeSeats: 60, icon: 'Cpu' },
  { code: 'Civil', name: 'Civil Engineering', hodName: 'Mr. Virendra', intakeSeats: 60, icon: 'Building2' },
];

export const INITIAL_USERS: UserProfile[] = [
  {
    "id": "usr-admin-1",
    "name": "Mr. K.K. Srivastav",
    "email": "principal.ugip@gov.in",
    "role": "admin",
    "phone": "+91 94120 89234",
    "department": "CSE",
    "username": "admin",
    "designation": "Principal & Chief Administrator",
    "assignedSubjectIds": []
  },
  {
    "id": "fac-hod-cse",
    "name": "Mr. Jitendra Parsad",
    "email": "jitendra.cse@ugip.gov.in",
    "role": "faculty",
    "phone": "+91 98371 45012",
    "department": "CSE",
    "username": "jitendra_cse",
    "designation": "HOD - Computer Science Engineering",
    "assignedSubjectIds": [
      "sub-cse-301",
      "sub-cse-501"
    ]
  },
  {
    "id": "fac-hod-bs",
    "name": "Mr. Vijay Singh Negi",
    "email": "vijay.basicsciences@ugip.gov.in",
    "role": "faculty",
    "phone": "+91 97561 88219",
    "department": "CSE",
    "username": "vijay_bs",
    "designation": "HOD - Applied Sciences & Humanities",
    "assignedSubjectIds": [
      "sub-cse-101"
    ]
  },
  {
    "id": "fac-chem",
    "name": "Mrs. Bhawana Verma",
    "email": "bhawana.chemistry@ugip.gov.in",
    "role": "faculty",
    "phone": "+91 94111 44321",
    "department": "CSE",
    "username": "bhawana_chem",
    "designation": "Lecturer in Applied Chemistry",
    "assignedSubjectIds": [
      "sub-cse-104"
    ]
  },
  {
    "id": "fac-cse-1",
    "name": "Mrs. Bhawana Bisht",
    "email": "bhawana.cse@ugip.gov.in",
    "role": "faculty",
    "phone": "+91 98370 19283",
    "department": "CSE",
    "username": "bhawana_cse",
    "designation": "Lecturer in CSE",
    "assignedSubjectIds": [
      "sub-cse-105"
    ]
  },
  {
    "id": "fac-math",
    "name": "Mrs. Richa Khakwal",
    "email": "richa.maths@ugip.gov.in",
    "role": "faculty",
    "phone": "+91 96901 22345",
    "department": "CSE",
    "username": "richa_math",
    "designation": "Lecturer in Applied Mathematics",
    "assignedSubjectIds": [
      "sub-cse-102"
    ]
  },
  {
    "id": "fac-phys",
    "name": "Mr. Shailendra Kumar",
    "email": "shailendra.physics@ugip.gov.in",
    "role": "faculty",
    "phone": "+91 94121 99881",
    "department": "CSE",
    "username": "shailendra_phys",
    "designation": "Lecturer in Applied Physics",
    "assignedSubjectIds": [
      "sub-cse-103"
    ]
  },
  {
    "id": "fac-civil",
    "name": "Mr. Virendra Singh Taragi",
    "email": "virendra.civil@ugip.gov.in",
    "role": "faculty",
    "phone": "+91 98372 66543",
    "department": "Civil",
    "username": "virendra_civil",
    "designation": "Lecturer & HOD Incharge - Civil Engineering",
    "assignedSubjectIds": [
      "sub-ce-101",
      "sub-ce-301",
      "sub-ce-501"
    ]
  }
];

export const INITIAL_SUBJECTS: Subject[] = [
  {
    "id": "sub-cse-101",
    "code": "CS-101",
    "name": "English and Communication Skills-I",
    "branch": "CSE",
    "semester": 1,
    "year": 1,
    "credits": 3,
    "hasPractical": true,
    "facultyId": "fac-hod-bs",
    "facultyName": "Mr. Vijay Singh Negi",
    "importantTopics": [],
    "syllabusUnits": []
  },
  {
    "id": "sub-cse-102",
    "code": "AS-101",
    "name": "Applied Mathematics-I",
    "branch": "CSE",
    "semester": 1,
    "year": 1,
    "credits": 4,
    "hasPractical": false,
    "facultyId": "fac-math",
    "facultyName": "Mrs. Richa Khakwal",
    "importantTopics": [],
    "syllabusUnits": []
  },
  {
    "id": "sub-cse-103",
    "code": "AS-102",
    "name": "Applied Physics-I",
    "branch": "CSE",
    "semester": 1,
    "year": 1,
    "credits": 4,
    "hasPractical": true,
    "facultyId": "fac-phys",
    "facultyName": "Mr. Shailendra Kumar",
    "importantTopics": [],
    "syllabusUnits": []
  },
  {
    "id": "sub-cse-104",
    "code": "AS-103",
    "name": "Applied Chemistry-I",
    "branch": "CSE",
    "semester": 1,
    "year": 1,
    "credits": 4,
    "hasPractical": true,
    "facultyId": "fac-chem",
    "facultyName": "Mrs. Bhawana Verma",
    "importantTopics": [],
    "syllabusUnits": []
  },
  {
    "id": "sub-cse-105",
    "code": "CS-102",
    "name": "Basics of Information Technology",
    "branch": "CSE",
    "semester": 1,
    "year": 1,
    "credits": 3,
    "hasPractical": true,
    "facultyId": "fac-cse-1",
    "facultyName": "Mrs. Bhawana Bisht",
    "importantTopics": [],
    "syllabusUnits": []
  },
  {
    "id": "sub-cse-301",
    "code": "CS-301",
    "name": "Programming in C & Data Structures",
    "branch": "CSE",
    "semester": 3,
    "year": 2,
    "credits": 4,
    "hasPractical": true,
    "facultyId": "fac-hod-cse",
    "facultyName": "Mr. Jitendra Parsad",
    "importantTopics": [],
    "syllabusUnits": []
  },
  {
    "id": "sub-cse-501",
    "code": "CS-501",
    "name": "Web Technology & Cloud Computing",
    "branch": "CSE",
    "semester": 5,
    "year": 3,
    "credits": 4,
    "hasPractical": true,
    "facultyId": "fac-hod-cse",
    "facultyName": "Mr. Jitendra Parsad",
    "importantTopics": [],
    "syllabusUnits": []
  },
  {
    "id": "sub-ce-101",
    "code": "CE-101",
    "name": "Building Construction & Materials",
    "branch": "Civil",
    "semester": 1,
    "year": 1,
    "credits": 4,
    "hasPractical": true,
    "facultyId": "fac-civil",
    "facultyName": "Mr. Virendra Singh Taragi",
    "importantTopics": [],
    "syllabusUnits": []
  },
  {
    "id": "sub-ce-301",
    "code": "CE-301",
    "name": "Surveying-I",
    "branch": "Civil",
    "semester": 3,
    "year": 2,
    "credits": 4,
    "hasPractical": true,
    "facultyId": "fac-civil",
    "facultyName": "Mr. Virendra Singh Taragi",
    "importantTopics": [],
    "syllabusUnits": []
  },
  {
    "id": "sub-ce-501",
    "code": "CE-501",
    "name": "Reinforced Cement Concrete (RCC) Design",
    "branch": "Civil",
    "semester": 5,
    "year": 3,
    "credits": 4,
    "hasPractical": true,
    "facultyId": "fac-civil",
    "facultyName": "Mr. Virendra Singh Taragi",
    "importantTopics": [],
    "syllabusUnits": []
  }
];

export const INITIAL_TESTS: TestExam[] = [
  {
    id: 'test-1',
    subjectId: 'sub-053001',
    subjectCode: '053001',
    subjectName: 'Data Structures Using C',
    title: 'Sessional Assessment 1 (Winter 2026)',
    type: 'Sessional 1',
    maxMarks: 50,
    date: '2026-02-15',
    branch: 'CSE',
    semester: 3,
    status: 'Completed',
    results: [
      { studentId: 'stu-24090050007', marksObtained: 44, remarks: 'Excellent' },
      { studentId: 'stu-anurag', marksObtained: 44, remarks: 'Excellent' },
      { studentId: 'stu-24090050001', marksObtained: 38, remarks: 'Good' },
      { studentId: 'stu-24090050002', marksObtained: 41, remarks: 'Very Good' }
    ]
  }
];

export const INITIAL_ATTENDANCE_SESSIONS: AttendanceSession[] = [
  {
    id: 'sess-1',
    subjectId: 'sub-053001',
    subjectCode: '053001',
    subjectName: 'Data Structures Using C',
    facultyId: 'usr-fac-1',
    facultyName: 'Er. Jitendra Kumar',
    date: '2026-02-16',
    timeSlot: '10:00 AM - 11:00 AM',
    topicTaught: 'Binary Search Tree Insert & Delete Operations',
    isOpen: false,
    records: [
      { studentId: 'stu-24090050007', status: 'Present' },
      { studentId: 'stu-24090050001', status: 'Present' },
      { studentId: 'stu-24090050002', status: 'Present' }
    ]
  }
];

export const INITIAL_PAPERS: PreviousYearPaper[] = [
  {
    id: 'pyq-ds-2024-w',
    title: 'UBTER Board Paper Winter 2024',
    branch: 'CSE',
    semester: 3,
    subjectId: 'sub-053001',
    subjectCode: '053001',
    subjectName: 'Data Structures Using C',
    year: 2024,
    examSession: 'Winter (Dec/Jan)',
    questionCount: 14,
    fileSizeBytes: '420 KB',
    downloadCount: 142,
    solutionAvailable: true,
    highlights: [
      'Big-O notation and Time Complexity analysis',
      'Circular Queue and Doubly Linked List algorithms in C',
      'QuickSort partition trace and AVL tree rotations'
    ],
    pdfPreviewUrl: '/api/question-papers/qp-ds-2024-w'
  },
  {
    id: 'pyq-ds-2023-s',
    title: 'UBTER Board Paper Summer 2023',
    branch: 'CSE',
    semester: 3,
    subjectId: 'sub-053001',
    subjectCode: '053001',
    subjectName: 'Data Structures Using C',
    year: 2023,
    examSession: 'Summer (May/June)',
    questionCount: 12,
    fileSizeBytes: '390 KB',
    downloadCount: 98,
    solutionAvailable: true,
    highlights: [
      'Linear vs Non-linear data structures',
      'Recursive Binary Search implementation in C',
      'Infix to Postfix evaluation using stack'
    ],
    pdfPreviewUrl: '/api/question-papers/qp-ds-2023-s'
  },
  {
    id: 'pyq-java-2024-w',
    title: 'UBTER Board Paper Winter 2024',
    branch: 'CSE',
    semester: 3,
    subjectId: 'sub-053002',
    subjectCode: '053002',
    subjectName: 'Object Oriented Programming Java',
    year: 2024,
    examSession: 'Winter (Dec/Jan)',
    questionCount: 14,
    fileSizeBytes: '410 KB',
    downloadCount: 115,
    solutionAvailable: true,
    highlights: [
      'JVM, JRE, Bytecode architecture diagram',
      'Abstract Class vs Interface with Java syntax',
      'Multi-threaded programming and Synchronization'
    ],
    pdfPreviewUrl: '/api/question-papers/qp-java-2024-w'
  },
  {
    id: 'pyq-dbms-2024-w',
    title: 'UBTER Board Paper Winter 2024',
    branch: 'CSE',
    semester: 3,
    subjectId: 'sub-053005',
    subjectCode: '053005',
    subjectName: 'Database Management Systems',
    year: 2024,
    examSession: 'Winter (Dec/Jan)',
    questionCount: 14,
    fileSizeBytes: '440 KB',
    downloadCount: 130,
    solutionAvailable: true,
    highlights: [
      'ACID transaction properties and recovery',
      '1NF, 2NF, 3NF, BCNF Normalization reductions',
      'SQL joins, GROUP BY, and nested subqueries'
    ],
    pdfPreviewUrl: '/api/question-papers/qp-dbms-2024-w'
  },
  {
    id: 'pyq-math1-2024-w',
    title: 'UBTER Board Paper Winter 2024',
    branch: 'CSE',
    semester: 1,
    subjectId: 'sub-051001',
    subjectCode: '051001',
    subjectName: 'Applied Mathematics-I',
    year: 2024,
    examSession: 'Winter (Dec/Jan)',
    questionCount: 15,
    fileSizeBytes: '380 KB',
    downloadCount: 189,
    solutionAvailable: true,
    highlights: [
      'Cramers Rule and Matrix Inverses',
      'Binomial Theorem expansions',
      'Differential Calculus and Successive Differentiation'
    ],
    pdfPreviewUrl: '/api/question-papers/qp-math1-2024-w'
  },
  {
    id: 'pyq-phy1-2024-w',
    title: 'UBTER Board Paper Winter 2024',
    branch: 'CSE',
    semester: 1,
    subjectId: 'sub-051002',
    subjectCode: '051002',
    subjectName: 'Applied Physics-I',
    year: 2024,
    examSession: 'Winter (Dec/Jan)',
    questionCount: 14,
    fileSizeBytes: '390 KB',
    downloadCount: 165,
    solutionAvailable: true,
    highlights: [
      'Dimensional Homogeneity analysis',
      'Work-Energy Theorem proof',
      'Stokes Law and Terminal Velocity derivations'
    ],
    pdfPreviewUrl: '/api/question-papers/qp-phy1-2024-w'
  },
  {
    id: 'pyq-os-2024-s',
    title: 'UBTER Board Paper Summer 2024',
    branch: 'CSE',
    semester: 4,
    subjectId: 'sub-054001',
    subjectCode: '054001',
    subjectName: 'Operating Systems',
    year: 2024,
    examSession: 'Summer (May/June)',
    questionCount: 12,
    fileSizeBytes: '410 KB',
    downloadCount: 122,
    solutionAvailable: true,
    highlights: [
      'Process Control Block and Context Switching',
      'Round Robin CPU Scheduling with Gantt chart',
      'Bankers Deadlock Avoidance algorithm'
    ],
    pdfPreviewUrl: '/api/question-papers/qp-os-2024-s'
  }
];

export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [
  {
    id: 'act-1',
    action: 'Portal Initialized',
    details: 'UBTER Academic & Placement Portal running for academic session 2026-2027.',
    timestamp: '2026-02-15 09:00:00',
    performedByRole: 'admin',
    performedByName: 'Principal'
  }
];

export const INITIAL_FACULTY_PUNCHES: FacultyAttendancePunch[] = [];

export const INITIAL_PRACTICALS: PracticalExperiment[] = [
  {
    id: 'prac-1',
    subjectId: 'sub-053001',
    subjectCode: '053001',
    subjectName: 'Data Structures Using C',
    experimentNo: 1,
    title: 'Implementation of Stack using Arrays and Pointers in C',
    objective: 'To implement push, pop, peek, and display operations on a stack.',
    apparatus: ['PC with GCC Compiler / Turbo C', 'Linux/Windows OS'],
    procedureSteps: [
      'Define maximum size MAX of the stack.',
      'Initialize top pointer to -1.',
      'Implement push() by checking stack overflow (top == MAX - 1).',
      'Implement pop() by checking stack underflow (top == -1).',
      'Test with sample inputs and verify LIFO order.'
    ],
    vivaQuestions: [
      { question: 'What is LIFO order?', answerSummary: 'Last-In First-Out: the most recently added element is removed first.' },
      { question: 'What causes stack overflow?', answerSummary: 'Attempting to push an item onto an already full stack.' }
    ]
  },
  {
    id: 'prac-2',
    subjectId: 'sub-053001',
    subjectCode: '053001',
    subjectName: 'Data Structures Using C',
    experimentNo: 2,
    title: 'Singly Linked List Creation, Insertion, and Deletion',
    objective: 'To create a linked list dynamically and perform operations.',
    apparatus: ['GCC Compiler', 'Editor'],
    procedureSteps: [
      'Define struct Node with int data and struct Node* next.',
      'Allocate memory dynamically using malloc().',
      'Implement insertion at front, end, and given position.',
      'Implement deletion of given node and traverse the list.'
    ],
    vivaQuestions: [
      { question: 'What is dynamic memory allocation in C?', answerSummary: 'Allocating memory at runtime from heap using malloc() or calloc().' }
    ]
  },
  {
    id: 'prac-3',
    subjectId: 'sub-053002',
    subjectCode: '053002',
    subjectName: 'Object Oriented Programming Java',
    experimentNo: 1,
    title: 'Inheritance and Method Overriding Demonstration in Java',
    objective: 'To understand single and multilevel inheritance with super keyword.',
    apparatus: ['JDK 21', 'Eclipse / VS Code / IntelliJ'],
    procedureSteps: [
      'Create superclass Animal with method makeSound().',
      'Create subclass Dog extending Animal overriding makeSound().',
      'Use super keyword to call parent class constructor.',
      'Execute code and observe dynamic method dispatch.'
    ],
    vivaQuestions: [
      { question: 'What is runtime polymorphism?', answerSummary: 'Resolving method call at runtime based on the actual object type.' }
    ]
  }
];

export const INITIAL_TIMETABLE_SLOTS: TimetableSlot[] = [
  {
    id: 'tt-1',
    branch: 'CSE',
    year: 2,
    semester: 3,
    day: 'Monday',
    periodNumber: 1,
    timeSlot: '09:30 AM - 10:25 AM',
    subjectId: 'sub-053001',
    subjectCode: '053001',
    subjectName: 'Data Structures Using C',
    facultyId: 'usr-fac-1',
    facultyName: 'Er. Jitendra Kumar',
    roomNumber: 'Lab-1',
    type: 'theory'
  },
  {
    id: 'tt-2',
    branch: 'CSE',
    year: 2,
    semester: 3,
    day: 'Monday',
    periodNumber: 2,
    timeSlot: '10:25 AM - 11:20 AM',
    subjectId: 'sub-053002',
    subjectCode: '053002',
    subjectName: 'Object Oriented Programming Java',
    facultyId: 'usr-fac-1',
    facultyName: 'Er. Jitendra Kumar',
    roomNumber: 'Room-204',
    type: 'theory'
  },
  {
    id: 'tt-3',
    branch: 'CSE',
    year: 2,
    semester: 3,
    day: 'Tuesday',
    periodNumber: 1,
    timeSlot: '09:30 AM - 10:25 AM',
    subjectId: 'sub-053005',
    subjectCode: '053005',
    subjectName: 'Database Management Systems',
    facultyId: 'usr-fac-1',
    facultyName: 'Er. Jitendra Kumar',
    roomNumber: 'Room-204',
    type: 'theory'
  }
];
