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

export const INITIAL_TESTS: TestExam[] = [];
export const INITIAL_ATTENDANCE_SESSIONS: AttendanceSession[] = [];
export const INITIAL_PAPERS: PreviousYearPaper[] = [];
export const INITIAL_ACTIVITY_LOGS: ActivityLog[] = [];
export const INITIAL_FACULTY_PUNCHES: FacultyAttendancePunch[] = [];
export const INITIAL_PRACTICALS: PracticalExperiment[] = [];
export const INITIAL_TIMETABLE_SLOTS: TimetableSlot[] = [];
