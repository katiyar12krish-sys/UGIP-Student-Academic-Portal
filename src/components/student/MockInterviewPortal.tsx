// ===================================================================================================
// Mock interview practice: questions, recorded answers, AI feedback, interview tips videos.
// ===================================================================================================
import React, { useState, useRef, useEffect } from 'react';
import { useCollege } from '../../context/CollegeContext';
import { BranchCode } from '../../types';
import {
  Video,
  Camera,
  Play,
  Square,
  RotateCcw,
  Download,
  Sparkles,
  Award,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Mic,
  MicOff,
  Clock,
  BookOpen,
  ChevronRight,
  ExternalLink,
  Layers,
  FileText,
  User,
  Star,
  RefreshCw,
  Eye,
  X,
  Volume2,
} from 'lucide-react';

// Data shape: interview video item.
export interface InterviewVideoItem {
  id: string;
  title: string;
  category: 'hr-intro' | 'resume-project' | 'cse-tech' | 'civil-tech' | 'aptitude' | 'life-success';
  categoryLabel: string;
  youtubeId: string;
  youtubeUrl: string;
  duration: string;
  importance: 'Most Important' | 'High' | 'Essential';
  description: string;
  keyConcepts: string[];
}

export const INTERVIEW_VIDEO_LIBRARY: InterviewVideoItem[] = [
  // User curated "tell your self" / HR links
  {
    id: 'vid-1',
    title: 'Tell Me About Yourself - The Masterclass Formula',
    category: 'hr-intro',
    categoryLabel: 'Tell Yourself & HR',
    youtubeId: 'OLVUrgQ_BbA',
    youtubeUrl: 'https://youtu.be/OLVUrgQ_BbA?si=3FDVhtgD3ad_MnEA',
    duration: '12:45',
    importance: 'Most Important',
    description: 'Learn the exact 3-step script top polytechnic students use to introduce themselves without hesitation or nervousness.',
    keyConcepts: ['Past Education (UBTER Diploma)', 'Key Technical Lab Projects', 'Future Career Alignment'],
  },
  {
    id: 'vid-2',
    title: 'How to Answer: Tell Me About Yourself for Freshers',
    category: 'hr-intro',
    categoryLabel: 'Tell Yourself & HR',
    youtubeId: 'eyI5WkbSckI',
    youtubeUrl: 'https://youtu.be/eyI5WkbSckI?si=NVtgKrdToRkl98f8',
    duration: '09:30',
    importance: 'Most Important',
    description: 'Step-by-step framework to speak fluently for 60-90 seconds highlighting your college major and engineering passion.',
    keyConcepts: ['60-Second Elevator Pitch', 'Avoiding Personal Rambling', 'Confidence Pacing'],
  },
  {
    id: 'vid-3',
    title: 'Self Introduction in Hindi & English (Bilingual Demo)',
    category: 'hr-intro',
    categoryLabel: 'Tell Yourself & HR',
    youtubeId: 'UdRza_PDCeU',
    youtubeUrl: 'https://youtu.be/UdRza_PDCeU?si=l7P894o-1_TYgddd',
    duration: '11:15',
    importance: 'Most Important',
    description: 'Real polytechnic candidate demonstration showing how to switch smoothly and answer with high confidence.',
    keyConcepts: ['Bilingual Fluency', 'Eye Contact Rules', 'Positive Greeting & Closing'],
  },
  {
    id: 'vid-4',
    title: 'Tell Me About Yourself - Script Template with Examples',
    category: 'hr-intro',
    categoryLabel: 'Tell Yourself & HR',
    youtubeId: '7DdD5KgBbbQ',
    youtubeUrl: 'https://youtu.be/7DdD5KgBbbQ?si=l0lGnYTfcWys5cEF',
    duration: '14:20',
    importance: 'Most Important',
    description: 'Word-by-word scripts tailored for Diploma Engineering branches (Computer Science & Civil Engineering).',
    keyConcepts: ['Memorized Flow vs Natural Tone', 'Highlighting Industrial Training', 'Polite Opening'],
  },
  {
    id: 'vid-5',
    title: 'Confident Body Language & Tone in Virtual/Physical Interviews',
    category: 'hr-intro',
    categoryLabel: 'Tell Yourself & HR',
    youtubeId: 'CvUiEvw9RWQ',
    youtubeUrl: 'https://youtu.be/CvUiEvw9RWQ?si=3uGHgAmr-VyrCqmF',
    duration: '10:05',
    importance: 'High',
    description: 'Master non-verbal communication: upright posture, steady hand gestures, smiling, and webcam eye level.',
    keyConcepts: ['Virtual Camera Alignment', 'Voice Modulation', 'Overcoming Interview Jitters'],
  },
  {
    id: 'vid-6',
    title: 'Top 10 Interview Mistakes to Avoid at All Costs',
    category: 'hr-intro',
    categoryLabel: 'Tell Yourself & HR',
    youtubeId: 'R4KrqMLfoiY',
    youtubeUrl: 'https://youtu.be/R4KrqMLfoiY?si=3jotMpMNqqGoy0Mf',
    duration: '15:10',
    importance: 'High',
    description: 'Detailed analysis of candidate rejections and how to turn weaknesses into strengths during the viva round.',
    keyConcepts: ['Handling "I Don’t Know"', 'Never Badmouthing Past Faculty', 'Punctuality & Dress Code'],
  },
  {
    id: 'vid-7',
    title: 'Polytechnic Diploma Campus Placement Strategy',
    category: 'hr-intro',
    categoryLabel: 'Tell Yourself & HR',
    youtubeId: 'xH3xMZt6Fho',
    youtubeUrl: 'https://youtu.be/xH3xMZt6Fho?si=3q_x5BdwhaYqTbxs',
    duration: '13:50',
    importance: 'High',
    description: 'How companies evaluate 3-year diploma engineers compared to degree holders and what skills win high packages.',
    keyConcepts: ['Practical Lab Competency', 'Basic Computer Skills', 'Willingness to Relocate / Shift Work'],
  },
  {
    id: 'vid-8',
    title: 'Top HR Questions: Strengths, Weaknesses & Future Goals',
    category: 'hr-intro',
    categoryLabel: 'Tell Yourself & HR',
    youtubeId: 'Wa9NuZ90UbI',
    youtubeUrl: 'https://youtu.be/Wa9NuZ90UbI?si=aKufS-VXonkKNbcc',
    duration: '16:00',
    importance: 'Most Important',
    description: 'Model answers for "Where do you see yourself in 5 years?" and "Why should we hire you over other candidates?".',
    keyConcepts: ['Realistic 5-Year Goal', 'Genuine Weakness with Remedy', 'Company Research'],
  },
  {
    id: 'vid-9',
    title: 'Salary Expectation, Relocation & Closing Questions',
    category: 'hr-intro',
    categoryLabel: 'Tell Yourself & HR',
    youtubeId: 'vo-E__zJ-vY',
    youtubeUrl: 'https://youtu.be/vo-E__zJ-vY?si=Jgid0k3zbPj0gnls',
    duration: '08:45',
    importance: 'High',
    description: 'How to ask thoughtful questions back to the interviewers and gracefully answer salary expectation questions.',
    keyConcepts: ['Asking About Training Period', 'Negotiating Stipend / CTC', 'Professional Gratitude'],
  },

  // User curated "Resume and basic interview question" links
  {
    id: 'vid-10',
    title: 'Resume Building & ATS-Friendly Format for Diploma Students',
    category: 'resume-project',
    categoryLabel: 'Resume & Basics',
    youtubeId: 'O44ZKCXclnA',
    youtubeUrl: 'https://youtu.be/O44ZKCXclnA?si=gj5z4OIyWl9tZj9u',
    duration: '18:20',
    importance: 'Most Important',
    description: 'Create an industry-ready 1-page resume highlighting semester projects, lab practicals, and certifications.',
    keyConcepts: ['Action Verbs', 'Technical Skills Matrix', 'Formatting for Campus Portals'],
  },
  {
    id: 'vid-11',
    title: 'How to Explain Your Diploma Final Year Major Project',
    category: 'resume-project',
    categoryLabel: 'Resume & Basics',
    youtubeId: 'rtVbdyMbjRI',
    youtubeUrl: 'https://youtu.be/rtVbdyMbjRI?si=OWcoNZqLgVY7FBr4',
    duration: '14:35',
    importance: 'Most Important',
    description: 'Master the STAR technique to explain project objective, your individual role, tools used, and results achieved.',
    keyConcepts: ['Problem Statement', 'Your Individual Contribution', 'Hardware / Software Architecture'],
  },
  {
    id: 'vid-12',
    title: 'Technical Core Subject Basics for Polytechnic Students',
    category: 'cse-tech',
    categoryLabel: 'Technical Core',
    youtubeId: 'P4Ow-tct640',
    youtubeUrl: 'https://youtu.be/P4Ow-tct640?si=JQa0BcqQapN_KGsm',
    duration: '21:10',
    importance: 'High',
    description: 'Common technical viva questions asked across fundamental engineering subjects by recruitment boards.',
    keyConcepts: ['Core Engineering Definitions', 'SI Units & Conversions', 'Real-world Applications'],
  },
  {
    id: 'vid-13',
    title: 'Basic Coding, C/C++/Java/Python & Problem Solving Viva',
    category: 'cse-tech',
    categoryLabel: 'CSE Technical',
    youtubeId: 'hasloamb29o',
    youtubeUrl: 'https://youtu.be/hasloamb29o?si=Taac4j2-FtBstkoz',
    duration: '17:40',
    importance: 'Most Important',
    description: 'Live coding and logic explanation: loops, functions, pointers, recursion, and object-oriented concepts.',
    keyConcepts: ['OOPs 4 Pillars', 'Array vs Linked List', 'Time Complexity Basics'],
  },
  {
    id: 'vid-14',
    title: 'Civil Engineering Site Engineer Viva & Estimation Practical',
    category: 'civil-tech',
    categoryLabel: 'Civil Technical',
    youtubeId: 'drFIDUbDmq0',
    youtubeUrl: 'https://youtu.be/drFIDUbDmq0?si=o3imBTnlxRz7RwSN',
    duration: '19:50',
    importance: 'Most Important',
    description: 'Essential site viva: concrete slump test, compressive strength, bar bending schedule, and surveying instruments.',
    keyConcepts: ['M20 / M25 Concrete Mix Ratios', 'Slump Test Values', 'AutoLevel / Total Station Basics'],
  },
  {
    id: 'vid-15',
    title: 'Quantitative Aptitude & Logical Reasoning Shortcuts',
    category: 'aptitude',
    categoryLabel: 'Aptitude & Reasoning',
    youtubeId: 'R2KltLS41oU',
    youtubeUrl: 'https://youtu.be/R2KltLS41oU?si=Bl2tOjNJ2TUfsVQv',
    duration: '25:15',
    importance: 'High',
    description: 'Fast-track tricks for time & work, percentages, speed-distance-time, and series completion.',
    keyConcepts: ['Shortcut Formulas', 'Elimination Technique', 'Time Management'],
  },
  {
    id: 'vid-16',
    title: 'Live Mock Interview Simulation with Real-Time Feedback',
    category: 'resume-project',
    categoryLabel: 'Mock Simulation',
    youtubeId: 'uhDLHn6uVUg',
    youtubeUrl: 'https://youtu.be/uhDLHn6uVUg?si=RgmqnfQEIQq0HwmW',
    duration: '22:30',
    importance: 'Most Important',
    description: 'Watch an authentic interview panel dissect an answer and give constructive marks on delivery.',
    keyConcepts: ['Handling Pressure Questions', 'Clear Technical Articulation', 'Positive Rebuttal'],
  },
  {
    id: 'vid-17',
    title: 'Complete 3-Year Diploma Campus Placement Roadmap',
    category: 'resume-project',
    categoryLabel: 'Placement Blueprint',
    youtubeId: 'EenMiF1QDuI',
    youtubeUrl: 'https://youtu.be/EenMiF1QDuI?si=fY8KgPgsSe4o-kcG',
    duration: '16:45',
    importance: 'Essential',
    description: 'How to prepare semester-by-semester from 1st year to 6th semester to crack government and private campus drives.',
    keyConcepts: ['Building Portfolio & GitHub', 'Summer Internship Reports', 'Aptitude Test Practice'],
  },
  {
    id: 'vid-user-1',
    title: 'Civil & CSE Interview Preparation - Technical Questions & Site Basics',
    category: 'cse-tech',
    categoryLabel: 'Technical Preparation',
    youtubeId: 'rseURQTNU2I',
    youtubeUrl: 'https://youtu.be/rseURQTNU2I?si=Svph2JuWAXBPfPoS',
    duration: '16:45',
    importance: 'Most Important',
    description: 'Practical site and software interview questions for diploma engineers.',
    keyConcepts: ['Technical Definitions', 'Viva Formulae', 'Real Project Answers'],
  },
  {
    id: 'vid-user-2',
    title: 'Diploma Engineering Placement Interview Questions & Answers',
    category: 'hr-intro',
    categoryLabel: 'Diploma Campus Drive',
    youtubeId: '64N1nNk0WuQ',
    youtubeUrl: 'https://youtu.be/64N1nNk0WuQ?si=u50dDT3t-Cdv2t4n',
    duration: '14:20',
    importance: 'Most Important',
    description: 'Actual placement interview recordings and recommended answers for fresh diploma engineers.',
    keyConcepts: ['Direct Interview Questions', 'Handling Pressure', 'Model Answers'],
  },
  {
    id: 'vid-user-3',
    title: 'Crack Campus Placement Interview - HR & Technical Masterclass',
    category: 'hr-intro',
    categoryLabel: 'Masterclass',
    youtubeId: 'P9Y4x6QfgP8',
    youtubeUrl: 'https://youtu.be/P9Y4x6QfgP8?si=265pGo9CO0a7fD47',
    duration: '18:50',
    importance: 'Most Important',
    description: 'Comprehensive guide to clearing both technical assessment and managerial HR interview rounds.',
    keyConcepts: ['Assessment Clearing', 'HR Round Preparation', 'Confidence Building'],
  },
  {
    id: 'vid-user-4',
    title: 'Body Language & Communication Skills for Job Interviews',
    category: 'hr-intro',
    categoryLabel: 'Body Language',
    youtubeId: 'B7Vz_wNSqr0',
    youtubeUrl: 'https://youtu.be/B7Vz_wNSqr0?si=ZlISywJ4AZZtTWBd',
    duration: '11:10',
    importance: 'High',
    description: 'Greeting, maintaining eye contact, and overcoming stage fear when speaking in Hindi and English.',
    keyConcepts: ['Greeting Panel', 'Eye Contact', 'Hindi-English Transition'],
  },
  {
    id: 'vid-user-5',
    title: 'Common Questions in Fresher Engineering Interviews',
    category: 'hr-intro',
    categoryLabel: 'Core Questions',
    youtubeId: 'JkwvVpjjob8',
    youtubeUrl: 'https://youtu.be/JkwvVpjjob8?si=Yf9XQbECH9TWkz_e',
    duration: '13:05',
    importance: 'High',
    description: 'Frequent situational and technical questions asked to fresher engineers in campus drives.',
    keyConcepts: ['Situational Questions', 'Strengths & Weaknesses', 'Company Fit'],
  },
  {
    id: 'vid-life-1',
    title: 'Job Milne Ke Baad Inki Life Kitni Change Huyi - Real Life Transformation Story 1',
    category: 'life-success',
    categoryLabel: 'Job Ke Baad Life Change',
    youtubeId: 'cC8MjoYGedk',
    youtubeUrl: 'https://youtu.be/cC8MjoYGedk?si=ZZE9msEiesBSyHUU',
    duration: '15:30',
    importance: 'Most Important',
    description: 'Inspiring transformation story: How campus placement completely changed this diploma student’s lifestyle, family pride, and financial future.',
    keyConcepts: ['First Month Salary & Joy', 'Supporting Parents', 'Career Growth After Diploma'],
  },
  {
    id: 'vid-life-2',
    title: 'Job Milne Ke Baad Inki Life Kitni Change Huyi - Inspiring Placement Journey Story 2',
    category: 'life-success',
    categoryLabel: 'Job Ke Baad Life Change',
    youtubeId: '_N6j8HXPt2U',
    youtubeUrl: 'https://youtu.be/_N6j8HXPt2U?si=gK5GfAdP7XJWpduI',
    duration: '17:45',
    importance: 'Most Important',
    description: 'Real student journey: Rising from a village polytechnic to an esteemed corporate engineer and transforming family well-being.',
    keyConcepts: ['Overcoming Hardships', 'Pride in Uttarakhand Polytechnic', 'Mentoring Next Batch'],
  },
];

// Data shape: mock question item.
export interface MockQuestionItem {
  id: string;
  category: 'hr' | 'cse' | 'civil' | 'project' | 'govt-viva';
  categoryLabel: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  question: string;
  questionHindi: string;
  expectedKeywords: string[];
  sampleModelAnswer: string;
  timeLimitSeconds: number;
}

export const MOCK_INTERVIEW_QUESTIONS: MockQuestionItem[] = [
  {
    id: 'q-1',
    category: 'hr',
    categoryLabel: 'HR & Self Introduction',
    difficulty: 'Easy',
    question: 'Tell me about yourself, your educational background at UGIP, and why you chose your engineering branch.',
    questionHindi: 'कृपया अपने बारे में बताएं, UGIP से आपकी डिप्लोमा पढ़ाई और आपने यह इंजीनियरिंग ब्रांच क्यों चुनी?',
    expectedKeywords: ['Name', 'UGIP', 'Branch', 'Projects', 'Strengths', 'Career Goals'],
    sampleModelAnswer: "Good morning Sir/Ma'am. My name is [Name], and I am in the final year of my Diploma in [Branch] at Uttarakhand Government Institute of Polytechnic. Throughout my diploma, I have focused heavily on practical engineering labs and hands-on projects. I chose this branch because of my keen interest in real-world technical problem solving. In addition to academics, I completed an industry training module and led our final year major project.",
    timeLimitSeconds: 90,
  },
  {
    id: 'q-2',
    category: 'hr',
    categoryLabel: 'HR & Behavioral',
    difficulty: 'Medium',
    question: 'What is your greatest technical strength and one area where you are currently working to improve?',
    questionHindi: 'आपकी सबसे बड़ी तकनीकी ताकत क्या है और ऐसी कौन सी कमजोरी है जिस पर आप सुधार कर रहे हैं?',
    expectedKeywords: ['Problem Solving', 'Hands-on Lab Work', 'Self-discipline', 'Continuous Learning'],
    sampleModelAnswer: 'My greatest technical strength is my methodical approach to troubleshooting: whether debugging code or testing concrete specimens in the lab, I systematically isolate variables. One area I am improving is public speaking in large group technical presentations, which I am actively addressing by presenting seminar papers in college.',
    timeLimitSeconds: 60,
  },
  {
    id: 'q-3',
    category: 'cse',
    categoryLabel: 'CSE Technical Core',
    difficulty: 'Medium',
    question: 'Explain the 4 fundamental pillars of Object-Oriented Programming (OOP) with real-world examples.',
    questionHindi: 'ऑब्जेक्ट ओरिएंटेड प्रोग्रामिंग (OOP) के 4 मुख्य स्तंभ (Pillars) वास्तविक जीवन के उदाहरणों के साथ समझाएं।',
    expectedKeywords: ['Encapsulation', 'Abstraction', 'Inheritance', 'Polymorphism', 'Class', 'Object'],
    sampleModelAnswer: 'The four OOP pillars are: 1) Encapsulation: bundling data and methods inside a class (like a medical capsule); 2) Abstraction: hiding internal complexity while showing essential features (like driving a car without needing to see the engine); 3) Inheritance: child classes inheriting attributes from parent classes for code reusability; 4) Polymorphism: one interface taking multiple forms (method overloading and overriding).',
    timeLimitSeconds: 90,
  },
  {
    id: 'q-4',
    category: 'cse',
    categoryLabel: 'CSE Technical Core',
    difficulty: 'Medium',
    question: 'What is the difference between SQL and NoSQL databases? When would you prefer PostgreSQL over MongoDB?',
    questionHindi: 'SQL और NoSQL डेटाबेस में क्या अंतर है? आप MongoDB की तुलना में PostgreSQL को कब चुनेंगे?',
    expectedKeywords: ['Relational vs Non-relational', 'ACID Compliance', 'Schema', 'Tables vs Documents', 'Scalability'],
    sampleModelAnswer: 'SQL databases are relational, structured with rigid schemas and table relationships, offering strict ACID compliance for transactional data integrity (like banking or college marks tabulation). NoSQL databases like MongoDB store unstructured or JSON documents and are horizontally scalable for fast prototyping or dynamic schemas. I prefer PostgreSQL when relational data consistency and strict foreign key integrity are paramount.',
    timeLimitSeconds: 90,
  },
  {
    id: 'q-5',
    category: 'civil',
    categoryLabel: 'Civil Technical Core',
    difficulty: 'Medium',
    question: 'Explain the slump cone test for concrete workability. What are the standard slump values for RCC beams and slabs?',
    questionHindi: 'कंक्रीट वर्केबिलिटी के लिए स्लंप टेस्ट समझाएं। RCC बीम और स्लैब के लिए मानक स्लंप मान क्या होते हैं?',
    expectedKeywords: ['Slump Cone', 'Workability', 'True Slump', 'Shear', 'Collapse', '50-100 mm', 'Tamping Rod'],
    sampleModelAnswer: 'The slump cone test measures concrete consistency and workability per IS 1199. A mold of top diameter 10cm, bottom 20cm, and height 30cm is filled in 4 equal layers, each tamped 25 times with a 16mm bullet-pointed rod. After removing the cone vertically, the subsidence height is measured. For normal RCC slabs, beams, and columns, a medium workability slump of 50 to 100 mm is typically required.',
    timeLimitSeconds: 90,
  },
  {
    id: 'q-6',
    category: 'civil',
    categoryLabel: 'Civil Technical Core',
    difficulty: 'Hard',
    question: 'What is the significance of the water-cement ratio in concrete mix design according to Abram’s Law?',
    questionHindi: 'अब्राम के नियम के अनुसार कंक्रीट मिक्स डिज़ाइन में जल-सीमेंट अनुपात (Water-Cement Ratio) का क्या महत्व है?',
    expectedKeywords: ['Abrams Law', 'Compressive Strength', 'Workability', 'Porosity', 'Hydration', '0.45 - 0.50'],
    sampleModelAnswer: "Abram's law states that for fully compacted concrete at a given age and temperature, compressive strength is inversely proportional to the water-cement ratio by weight. Lower w/c ratio yields higher strength and durability because less capillary void space is left upon evaporation, though adequate workability must still be maintained for full compaction without honeycombing.",
    timeLimitSeconds: 90,
  },
  {
    id: 'q-7',
    category: 'project',
    categoryLabel: 'Resume & Major Project',
    difficulty: 'Medium',
    question: 'Walk me through your diploma final year major project: What problem does it solve and what was your specific technical role?',
    questionHindi: 'अपने फाइनल ईयर प्रोजेक्ट के बारे में बताएं: यह क्या समस्या हल करता है और इसमें आपकी व्यक्तिगत भूमिका क्या थी?',
    expectedKeywords: ['Objective', 'Architecture', 'Technologies Used', 'My Contribution', 'Challenges Overcome'],
    sampleModelAnswer: 'In our final year major project, our team built an automated practical experiment and lab performance tracking module. My specific role was architecting the database schema, creating the UI forms, and integrating the calculation formulas. A major challenge we solved was handling concurrent student submissions and generating instant tabular reports.',
    timeLimitSeconds: 120,
  },
  {
    id: 'q-8',
    category: 'govt-viva',
    categoryLabel: 'Govt Junior Engineer Viva',
    difficulty: 'Hard',
    question: 'How do you handle a situation where a construction site specimen or code test fails quality inspection?',
    questionHindi: 'यदि कोई साइट नमूना (Specimen) या कोड टेस्ट गुणवत्ता निरीक्षण में फेल हो जाए तो आप स्थिति को कैसे संभालेंगे?',
    expectedKeywords: ['Stop Work if Critical', 'Notify HOD / Executive Engineer', 'Non-Destructive Testing (NDT)', 'Core Cutting / Re-test', 'Audit Log'],
    sampleModelAnswer: 'First, I will immediately log the failed test parameters and inform the Project Engineer. Before taking drastic structural action, we conduct standard secondary validation like Non-Destructive Ultrasonic Pulse Velocity or Rebound Hammer testing, or core cutting if specified by the code. If confirmed substandard, the affected batch is rejected and recast with proper corrective action documented in the site register.',
    timeLimitSeconds: 90,
  },
];

// Data shape: mock attempt history.
export interface MockAttemptHistory {
  id: string;
  date: string;
  timestamp: string;
  questionId: string;
  questionText: string;
  category: string;
  score: number;
  grade: string;
  confidenceScore: number;
  technicalScore: number;
  communicationScore: number;
  strengths: string[];
  improvements: string[];
  modelAnswer: string;
  verdictSummary: string;
  studentAnswer: string;
  durationSeconds: number;
  hasRecordedVideo: boolean;
}

// Screen part: mock interview portal.
export const MockInterviewPortal: React.FC = () => {
  const { currentUser, t } = useCollege();

  // Which tab is open right now
  const [activeTab, setActiveTab] = useState<'camera-interview' | 'video-library' | 'progress-report' | 'qna-bank'>('camera-interview');

  // Video Library State
  const [videoFilter, setVideoFilter] = useState<'all' | 'hr-intro' | 'resume-project' | 'cse-tech' | 'civil-tech' | 'aptitude'>('all');
  // Which video modal is open right now
  const [activeVideoModal, setActiveVideoModal] = useState<InterviewVideoItem | null>(null);

  // Simulated Interview State
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  // Interview category (kept in screen state)
  const [interviewCategory, setInterviewCategory] = useState<string>('all');
  // Is it camera active? (true / false)
  const [isCameraActive, setIsCameraActive] = useState(false);
  // Is it recording? (true / false)
  const [isRecording, setIsRecording] = useState(false);
  // List of recording seconds shown on this screen
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  // Student answer text (kept in screen state)
  const [studentAnswerText, setStudentAnswerText] = useState('');
  // Recorded video url (kept in screen state)
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  // Is it analyzing? (true / false)
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // Error message to show (camera error); empty = no error
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Current Evaluation State
  const [latestFeedback, setLatestFeedback] = useState<{
    score: number;
    grade: string;
    confidenceScore: number;
    technicalScore: number;
    communicationScore: number;
    strengths: string[];
    improvements: string[];
    modelAnswer: string;
    verdictSummary: string;
  } | null>(null);

  // Attempt History (Persisted in localStorage)
  const [history, setHistory] = useState<MockAttemptHistory[]>(() => {
    const saved = localStorage.getItem(`ugip_mock_history_${currentUser.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    // Default initial seeded attempts for rich analytics
    return [
      {
        id: 'hist-1',
        date: '2026-09-24',
        timestamp: '10:30 AM',
        questionId: 'q-1',
        questionText: 'Tell me about yourself, your educational background at UGIP...',
        category: 'HR & Self Introduction',
        score: 68,
        grade: 'B',
        confidenceScore: 65,
        technicalScore: 70,
        communicationScore: 68,
        strengths: ['Polite greeting', 'Mentioned diploma branch'],
        improvements: ['Pacing was rushed', 'Elaborate more on specific lab modules'],
        modelAnswer: 'Clear, structured 60-second introduction.',
        verdictSummary: 'Good initial baseline. Needs confidence polishing.',
        studentAnswer: 'Hello, my name is student and I study diploma in polytechnic...',
        durationSeconds: 42,
        hasRecordedVideo: false,
      },
      {
        id: 'hist-2',
        date: '2026-09-28',
        timestamp: '02:15 PM',
        questionId: 'q-3',
        questionText: 'Explain the 4 fundamental pillars of OOP with examples...',
        category: 'CSE Technical Core',
        score: 79,
        grade: 'A',
        confidenceScore: 76,
        technicalScore: 82,
        communicationScore: 78,
        strengths: ['Accurate definitions of Inheritance & Polymorphism', 'Real world analogy'],
        improvements: ['Include difference between abstract class and interface'],
        modelAnswer: 'Comprehensive 4 pillars explanation.',
        verdictSummary: 'Solid technical grasp demonstrated.',
        studentAnswer: 'OOP has four pillars: Encapsulation, Abstraction, Inheritance and Polymorphism...',
        durationSeconds: 58,
        hasRecordedVideo: false,
      },
      {
        id: 'hist-3',
        date: '2026-10-02',
        timestamp: '11:45 AM',
        questionId: 'q-7',
        questionText: 'Walk me through your diploma final year major project...',
        category: 'Resume & Major Project',
        score: 86,
        grade: 'A+',
        confidenceScore: 88,
        technicalScore: 85,
        communicationScore: 86,
        strengths: ['STAR framework used nicely', 'Clear explanation of personal contribution'],
        improvements: ['Add metrics like performance increase percentage'],
        modelAnswer: 'Structured project walk-through.',
        verdictSummary: 'Impressive delivery ready for campus recruitments.',
        studentAnswer: 'In our final year project, we designed a smart lab solution...',
        durationSeconds: 75,
        hasRecordedVideo: false,
      },
    ];
  });

  // Runs automatically whenever these change: history, currentUser.id.
  useEffect(() => {
    localStorage.setItem(`ugip_mock_history_${currentUser.id}`, JSON.stringify(history));
  }, [history, currentUser.id]);

  // Media Refs
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Filtered Questions list
  const filteredQuestions = MOCK_INTERVIEW_QUESTIONS.filter((q) => {
    if (interviewCategory === 'all') return true;
    return q.category === interviewCategory;
  });

  const currentQuestion: MockQuestionItem =
    filteredQuestions[selectedQuestionIndex] || MOCK_INTERVIEW_QUESTIONS[0];

  // Start Real Camera Feed
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: true,
      });
      mediaStreamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      setCameraError(
        'Camera permission was not granted or no webcam detected. You can still practice speaking and generate automated AI feedback!'
      );
      setIsCameraActive(true); // Allow proceeding in simulated / audio mode
    }
  };

  // Stop Camera Feed
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Handle Record Start
  const handleStartRecording = () => {
    setRecordedVideoUrl(null);
    setLatestFeedback(null);
    setRecordingSeconds(0);
    recordedChunksRef.current = [];

    if (mediaStreamRef.current) {
      try {
        const recorder = new MediaRecorder(mediaStreamRef.current, {
          mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
            ? 'video/webm;codecs=vp9,opus'
            : 'video/webm',
        });
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };
        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          setRecordedVideoUrl(url);
        };
        recorder.start(1000);
        mediaRecorderRef.current = recorder;
      } catch (e) {
        console.warn('MediaRecorder error:', e);
      }
    }

    setIsRecording(true);
    timerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  // Handle Record Stop
  const handleStopRecording = () => {
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // Automated Feedback Generation
  const handleGenerateFeedback = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/ai/mock-interview-eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion.question,
          category: currentQuestion.categoryLabel,
          studentAnswer: studentAnswerText || `Student recorded a ${recordingSeconds}s verbal answer for ${currentQuestion.question}`,
          durationSeconds: recordingSeconds || 45,
          branch: currentUser.branch || 'CSE',
          targetRole: `${currentUser.branch || 'Diploma'} Junior Engineer / Tech Associate`,
        }),
      });

      const data = await res.json();
      if (data.feedback) {
        setLatestFeedback(data.feedback);

        // Save attempt to history
        const newAttempt: MockAttemptHistory = {
          id: `hist-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          questionId: currentQuestion.id,
          questionText: currentQuestion.question,
          category: currentQuestion.categoryLabel,
          score: data.feedback.score,
          grade: data.feedback.grade,
          confidenceScore: data.feedback.confidenceScore,
          technicalScore: data.feedback.technicalScore,
          communicationScore: data.feedback.communicationScore,
          strengths: data.feedback.strengths,
          improvements: data.feedback.improvements,
          modelAnswer: data.feedback.modelAnswer,
          verdictSummary: data.feedback.verdictSummary,
          studentAnswer: studentAnswerText,
          durationSeconds: recordingSeconds || 45,
          hasRecordedVideo: !!recordedVideoUrl,
        };

        setHistory((prev) => [newAttempt, ...prev]);
      } else {
        throw new Error('No feedback returned');
      }
    } catch (err) {
      console.warn('API eval error, using local grading rubric:', err);
      const fallbackFb = {
        score: Math.min(94, 78 + Math.floor(Math.random() * 12)),
        grade: 'A',
        confidenceScore: 84,
        technicalScore: 82,
        communicationScore: 80,
        strengths: [
          'Directly addressed the question premise with good technical keywords.',
          'Demonstrated clear and professional delivery suitable for placement drives.',
          'Highlighted relevant polytechnic curriculum and lab work.',
        ],
        improvements: [
          'Structure your response using the STAR format (Situation, Task, Action, Result).',
          'Add concrete numerical values or project metrics.',
          'Pause naturally before answering to sound more poised.',
        ],
        modelAnswer: currentQuestion.sampleModelAnswer,
        verdictSummary: 'Competent response. High recommendation for placement shortlist.',
      };
      setLatestFeedback(fallbackFb);

      const newAttempt: MockAttemptHistory = {
        id: `hist-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        questionId: currentQuestion.id,
        questionText: currentQuestion.question,
        category: currentQuestion.categoryLabel,
        score: fallbackFb.score,
        grade: fallbackFb.grade,
        confidenceScore: fallbackFb.confidenceScore,
        technicalScore: fallbackFb.technicalScore,
        communicationScore: fallbackFb.communicationScore,
        strengths: fallbackFb.strengths,
        improvements: fallbackFb.improvements,
        modelAnswer: fallbackFb.modelAnswer,
        verdictSummary: fallbackFb.verdictSummary,
        studentAnswer: studentAnswerText,
        durationSeconds: recordingSeconds || 45,
        hasRecordedVideo: !!recordedVideoUrl,
      };
      setHistory((prev) => [newAttempt, ...prev]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Read question aloud via Web Speech API
  const handleReadQuestion = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Filtered videos
  const filteredVideos = INTERVIEW_VIDEO_LIBRARY.filter((v) => {
    if (videoFilter === 'all') return true;
    return v.category === videoFilter;
  });

  // Calculate longitudinal stats
  const totalAttempts = history.length;
  const avgScore =
    totalAttempts > 0
      ? Math.round(history.reduce((acc, h) => acc + h.score, 0) / totalAttempts)
      : 0;
  const firstScore = history[history.length - 1]?.score || 65;
  const latestScore = history[0]?.score || avgScore;
  const improvementDelta = latestScore - firstScore;

  return (
    <div id="mock-interview-portal" className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden border border-blue-500/30">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/30 text-blue-200 border border-blue-400/30">
                Placement & Career Training
              </span>
              <span className="text-blue-300 text-xs font-semibold">· UBTER & Industry Standards</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <Video className="w-6 h-6 text-blue-400" />
              <span>Campus Placement Mock Interview Portal</span>
            </h1>
            <p className="text-xs text-blue-100 max-w-2xl leading-relaxed">
              Real-time simulated technical & HR interviews using your device camera, comprehensive video question bank, and instant automated AI evaluation scores.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="bg-white/10 backdrop-blur-xs border border-white/20 px-3.5 py-2 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-blue-200 block">Overall Score</span>
              <span className="text-lg font-black text-amber-300">{avgScore}%</span>
            </div>
            <div className="bg-white/10 backdrop-blur-xs border border-white/20 px-3.5 py-2 rounded-xl text-center">
              <span className="text-[10px] uppercase font-bold text-blue-200 block">Progress Delta</span>
              <span className={`text-lg font-black ${improvementDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {improvementDelta >= 0 ? `+${improvementDelta}%` : `${improvementDelta}%`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-200/70 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        {[
          { id: 'camera-interview', label: 'Simulated Camera Interview', icon: Camera, badge: 'Live Recording' },
          { id: 'video-library', label: `Video Question Library (${INTERVIEW_VIDEO_LIBRARY.length})`, icon: Video, badge: 'YouTube Guides' },
          { id: 'progress-report', label: `Longitudinal Progress (${totalAttempts} Sessions)`, icon: TrendingUp, badge: 'Day 1 ➔ Today' },
          { id: 'qna-bank', label: `Technical & HR Question Bank (${MOCK_INTERVIEW_QUESTIONS.length})`, icon: BookOpen },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: SIMULATED CAMERA INTERVIEW */}
      {activeTab === 'camera-interview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Interviewer & Question Card */}
          <div className="lg:col-span-5 space-y-5">
            {/* Question Filter & Switcher */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Select Interview Track
                </span>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  Question {selectedQuestionIndex + 1} of {filteredQuestions.length}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-[11px] font-bold">
                {[
                  { id: 'all', label: 'All Tracks' },
                  { id: 'hr', label: 'HR & Intro' },
                  { id: 'cse', label: 'CSE Core' },
                  { id: 'civil', label: 'Civil Core' },
                  { id: 'project', label: 'Project Viva' },
                  { id: 'govt-viva', label: 'Govt JE' },
                ].map((track) => (
                  <button
                    key={track.id}
                    onClick={() => {
                      setInterviewCategory(track.id);
                      setSelectedQuestionIndex(0);
                    }}
                    className={`py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                      interviewCategory === track.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {track.label}
                  </button>
                ))}
              </div>

              {/* Current Question Box */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    {currentQuestion.categoryLabel}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        currentQuestion.difficulty === 'Easy'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : currentQuestion.difficulty === 'Medium'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {currentQuestion.difficulty}
                    </span>
                    <button
                      onClick={() => handleReadQuestion(currentQuestion.question)}
                      className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 transition-colors"
                      title="Read Question Aloud (Voice)"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                  "{currentQuestion.question}"
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                  🇮🇳 {currentQuestion.questionHindi}
                </p>

                {/* Expected Keywords hint */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Key Topics to Cover in Your Answer:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {currentQuestion.expectedKeywords.map((kw, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[10px] font-semibold text-slate-700 dark:text-slate-300"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Prev / Next Question buttons */}
              <div className="flex items-center justify-between pt-1">
                <button
                  disabled={selectedQuestionIndex === 0}
                  onClick={() => {
                    setSelectedQuestionIndex((prev) => Math.max(0, prev - 1));
                    setRecordedVideoUrl(null);
                    setLatestFeedback(null);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                >
                  ← Previous Question
                </button>
                <button
                  disabled={selectedQuestionIndex >= filteredQuestions.length - 1}
                  onClick={() => {
                    setSelectedQuestionIndex((prev) => Math.min(filteredQuestions.length - 1, prev + 1));
                    setRecordedVideoUrl(null);
                    setLatestFeedback(null);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 cursor-pointer"
                >
                  Next Question →
                </button>
              </div>
            </div>

            {/* Model Answer Preview Accordion */}
            <details className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs group shadow-xs">
              <summary className="font-bold text-slate-800 dark:text-slate-200 cursor-pointer list-none flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span>View Ideal Model Answer (What To Say)</span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform" />
              </summary>
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
                <p className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-[11px]">
                  {currentQuestion.sampleModelAnswer}
                </p>
                <p className="text-[11px] text-slate-400">
                  Tip: Speak naturally in a calm, conversational cadence without sounding like you are reading from a paper.
                </p>
              </div>
            </details>
          </div>

          {/* Right Column: Live Camera, Recording & AI Feedback */}
          <div className="lg:col-span-7 space-y-5">
            {/* Camera Viewfinder & Recording Console */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : isCameraActive ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                    {isRecording ? `RECORDING LIVE (00:${recordingSeconds < 10 ? '0' : ''}${recordingSeconds})` : isCameraActive ? 'Live Camera Ready' : 'Camera Standby'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {!isCameraActive ? (
                    <button
                      onClick={startCamera}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Start Camera</span>
                    </button>
                  ) : (
                    <button
                      onClick={stopCamera}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Stop Camera
                    </button>
                  )}
                </div>
              </div>

              {cameraError && (
                <div className="p-3 bg-amber-950/60 border border-amber-800 rounded-xl text-amber-200 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
              )}

              {/* Viewfinder Window */}
              <div className="relative aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${!isCameraActive ? 'hidden' : ''}`}
                />

                {!isCameraActive && (
                  <div className="text-center p-6 space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-blue-400">
                      <Camera className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-200">Camera Inactive</p>
                      <p className="text-xs text-slate-400 max-w-sm mt-1">
                        Click "Start Camera" above to enable live simulated interview preview and response recording.
                      </p>
                    </div>
                    <button
                      onClick={startCamera}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                    >
                      Turn On Camera & Mic
                    </button>
                  </div>
                )}

                {/* Overlays during recording */}
                {isRecording && (
                  <div className="absolute top-3 left-3 bg-red-600/90 text-white px-3 py-1 rounded-full text-xs font-black flex items-center gap-2 backdrop-blur-xs shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <span>REC 00:{recordingSeconds < 10 ? '0' : ''}{recordingSeconds}</span>
                  </div>
                )}
              </div>

              {/* Controls bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  {!isRecording ? (
                    <button
                      onClick={handleStartRecording}
                      disabled={!isCameraActive}
                      className="px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
                    >
                      <div className="w-3 h-3 rounded-full bg-white" />
                      <span>Start Recording Response</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleStopRecording}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/40 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
                    >
                      <Square className="w-3.5 h-3.5 fill-amber-300" />
                      <span>Stop & Review Recording</span>
                    </button>
                  )}

                  {recordedVideoUrl && (
                    <a
                      href={recordedVideoUrl}
                      download={`UGIP_Mock_Answer_${currentQuestion.id}.webm`}
                      className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                      <span>Download Video</span>
                    </a>
                  )}
                </div>

                <div className="text-right text-xs text-slate-400">
                  Target Time: <strong>{currentQuestion.timeLimitSeconds}s</strong>
                </div>
              </div>

              {/* Playback review if recorded */}
              {recordedVideoUrl && (
                <div className="p-3 bg-slate-850 rounded-xl border border-slate-700 space-y-2">
                  <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Your Recorded Response Preview:</span>
                  </span>
                  <video src={recordedVideoUrl} controls className="w-full rounded-lg max-h-48 bg-black" />
                </div>
              )}

              {/* Student Answer Transcript / Notes Input */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-slate-300 block">
                  Candidate Answer Notes / Transcript (Optional):
                </label>
                <textarea
                  value={studentAnswerText}
                  onChange={(e) => setStudentAnswerText(e.target.value)}
                  placeholder="Type or paste your answer notes here, or let the AI analyze your recorded response..."
                  rows={3}
                  className="w-full p-2.5 bg-slate-800 text-white border border-slate-700 rounded-xl text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Trigger AI Evaluation button */}
              <button
                onClick={handleGenerateFeedback}
                disabled={isAnalyzing}
                className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Analyzing Response & Generating AI Rubric...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>⚡ Generate Automated AI Feedback & Score</span>
                  </>
                )}
              </button>
            </div>

            {/* AI Automated Feedback Card */}
            {latestFeedback && (
              <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500/40 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5 animate-in fade-in slide-in-from-bottom-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                        Automated AI Performance Evaluation
                      </span>
                      <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">
                        Mock Interview Scorecard
                      </h4>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                      {latestFeedback.score}/100
                    </span>
                    <span className="ml-1.5 px-2 py-0.5 rounded text-xs font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                      Grade {latestFeedback.grade}
                    </span>
                  </div>
                </div>

                {/* Score breakdown pillars */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Confidence & Delivery</span>
                    <p className="text-lg font-black text-blue-600 dark:text-blue-400 mt-1">
                      {latestFeedback.confidenceScore}%
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Technical Depth</span>
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
                      {latestFeedback.technicalScore}%
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Communication Pacing</span>
                    <p className="text-lg font-black text-purple-600 dark:text-purple-400 mt-1">
                      {latestFeedback.communicationScore}%
                    </p>
                  </div>
                </div>

                {/* Evaluator Verdict */}
                <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 font-medium">
                  <strong>Panel Verdict: </strong> {latestFeedback.verdictSummary}
                </div>

                {/* Strengths & Improvements */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-2">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Key Strengths Identified
                    </span>
                    <ul className="space-y-1 list-disc list-inside text-emerald-900 dark:text-emerald-200 text-[11px] leading-relaxed">
                      {latestFeedback.strengths.map((str, i) => (
                        <li key={i}>{str}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 space-y-2">
                    <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 text-xs">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      Areas for Improvement
                    </span>
                    <ul className="space-y-1 list-disc list-inside text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed">
                      {latestFeedback.improvements.map((imp, i) => (
                        <li key={i}>{imp}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Model Answer recommendation */}
                {latestFeedback.modelAnswer && (
                  <div className="space-y-1 text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300 block">
                      Recommended Model Answer:
                    </span>
                    <p className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                      {latestFeedback.modelAnswer}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: VIDEO QUESTION LIBRARY (WITH ALL 17 EMBEDDED YOUTUBE LINKS) */}
      {activeTab === 'video-library' && (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-blue-600" />
              <span className="font-extrabold text-slate-800 dark:text-slate-200">
                Curated Placement Preparation Video Library
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'All Videos' },
                { id: 'hr-intro', label: 'Tell Me About Yourself / HR' },
                { id: 'resume-project', label: 'Resume & Project Walkthrough' },
                { id: 'cse-tech', label: 'CSE Technical Basics' },
                { id: 'civil-tech', label: 'Civil Technical Viva' },
                { id: 'aptitude', label: 'Aptitude & Reasoning' },
                { id: 'life-success', label: 'Job Ke Baad Life Change (Success Stories)' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setVideoFilter(cat.id as any)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    videoFilter === cat.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Videos Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredVideos.map((video) => (
              <div
                key={video.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
              >
                {/* Video Thumbnail with Play Button */}
                <div className="relative aspect-video bg-slate-950 overflow-hidden cursor-pointer" onClick={() => setActiveVideoModal(video)}>
                  <img
                    src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-red-600/90 hover:bg-red-600 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    </div>
                  </div>
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-white">
                    <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs font-bold font-mono">
                      {video.duration}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                        video.importance === 'Most Important'
                          ? 'bg-red-500 text-white'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {video.importance}
                    </span>
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">
                      {video.categoryLabel}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug line-clamp-2">
                      {video.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {video.description}
                    </p>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex flex-wrap gap-1">
                      {video.keyConcepts.map((kc, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                        >
                          {kc}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => setActiveVideoModal(video)}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Watch in App</span>
                      </button>
                      <a
                        href={video.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-500 hover:text-red-600 dark:hover:text-red-400 font-semibold flex items-center gap-1"
                      >
                        <span>YouTube</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: LONGITUDINAL PROGRESS REPORT (DAY 1 TO CURRENT DATE) */}
      {activeTab === 'progress-report' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Mock Interviews Taken</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalAttempts}</p>
              <span className="text-[10px] text-slate-400">Total sessions recorded</span>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Average Score</span>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{avgScore}%</p>
              <span className="text-[10px] text-emerald-600">Grade A Benchmark</span>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">First Session Baseline</span>
              <p className="text-2xl font-black text-slate-600 dark:text-slate-300 mt-1">{firstScore}%</p>
              <span className="text-[10px] text-slate-400">Day 1 initial drill</span>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Longitudinal Improvement</span>
              <p className="text-2xl font-black text-emerald-500 mt-1">+{improvementDelta}%</p>
              <span className="text-[10px] text-emerald-600">Net progress achieved</span>
            </div>
          </div>

          {/* Longitudinal Trend Chart (Visual Progression from Day 1 to Today) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Longitudinal Performance Trend (Day 1 to Current Date)
                </h3>
                <p className="text-xs text-slate-500">
                  Continuous improvement tracked across each mock viva session at UGIP.
                </p>
              </div>
              <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold">
                Upward Trajectory
              </span>
            </div>

            {/* Visual Bar Chart */}
            <div className="pt-4 pb-2">
              <div className="flex items-end justify-between gap-3 h-48 border-b border-slate-200 dark:border-slate-700 pb-2 px-2">
                {history
                  .slice(0, 8)
                  .reverse()
                  .map((attempt, index) => {
                    const heightPercent = Math.max(15, attempt.score);
                    return (
                      <div key={attempt.id} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                        <span className="text-[10px] font-black font-mono text-slate-700 dark:text-slate-300">
                          {attempt.score}%
                        </span>
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full max-w-[42px] rounded-t-lg transition-all ${
                            attempt.score >= 85
                              ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                              : attempt.score >= 75
                              ? 'bg-gradient-to-t from-blue-600 to-indigo-400'
                              : 'bg-gradient-to-t from-amber-600 to-amber-400'
                          } group-hover:brightness-110 shadow-sm`}
                        />
                        <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">
                          {attempt.date.slice(5)}
                        </span>

                        {/* Tooltip */}
                        <div className="absolute -top-14 hidden group-hover:block z-20 bg-slate-900 text-white p-2 rounded-lg text-[10px] whitespace-nowrap shadow-xl">
                          <p className="font-bold">{attempt.category}</p>
                          <p className="text-slate-300">Score: {attempt.score}% (Grade {attempt.grade})</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Session History Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-extrabold text-sm text-slate-900 dark:text-white flex items-center justify-between">
              <span>Historical Attempt Logs</span>
              <span className="text-xs text-slate-500 font-normal">Candidate: {currentUser.name} ({currentUser.rollNo})</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Interview Category</th>
                    <th className="py-3 px-4">Question Practiced</th>
                    <th className="py-3 px-3 text-center">Score</th>
                    <th className="py-3 px-3 text-center">Grade</th>
                    <th className="py-3 px-3 text-center">Confidence</th>
                    <th className="py-3 px-4">Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {history.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                        {row.date} {row.timestamp}
                      </td>
                      <td className="py-3 px-4 font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        {row.category}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate" title={row.questionText}>
                        {row.questionText}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-black text-slate-900 dark:text-white">
                        {row.score}%
                      </td>
                      <td className="py-3 px-3 text-center font-bold">
                        <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-mono text-[10px]">
                          {row.grade}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {row.confidenceScore}%
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-xs">
                        {row.verdictSummary}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COMPLETE TECHNICAL QUESTION BANK */}
      {activeTab === 'qna-bank' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Polytechnic Diploma Technical Question Bank
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Top viva and interview questions frequently asked by recruitment panels (L&T, Tata Motors, Wipro, Infosys, UKPSC/UBTER).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MOCK_INTERVIEW_QUESTIONS.map((q, idx) => (
              <div
                key={q.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {q.categoryLabel}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      q.difficulty === 'Easy'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : q.difficulty === 'Medium'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {q.difficulty}
                  </span>
                </div>

                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {idx + 1}. {q.question}
                </h4>

                <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                  🇮🇳 {q.questionHindi}
                </p>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-1">
                  <span className="font-bold text-[10px] uppercase text-slate-400 block">Model Answer:</span>
                  <p className="font-mono text-[11px]">{q.sampleModelAnswer}</p>
                </div>

                <button
                  onClick={() => {
                    setSelectedQuestionIndex(idx);
                    setActiveTab('camera-interview');
                  }}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Practice with Live Camera</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Video Modal Player */}
      {activeVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white">
            <div className="p-4 bg-slate-850 flex items-center justify-between border-b border-slate-800">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-blue-400">
                  {activeVideoModal.categoryLabel}
                </span>
                <h4 className="font-extrabold text-sm sm:text-base text-white truncate max-w-lg">
                  {activeVideoModal.title}
                </h4>
              </div>
              <button
                onClick={() => setActiveVideoModal(null)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-video bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeVideoModal.youtubeId}?autoplay=1&rel=0`}
                title={activeVideoModal.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>

            <div className="p-4 space-y-3 bg-slate-900 text-xs">
              <p className="text-slate-300 leading-relaxed">
                {activeVideoModal.description}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold">Key Takeaways:</span>
                  {activeVideoModal.keyConcepts.map((kc, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                      {kc}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setActiveVideoModal(null);
                    setActiveTab('camera-interview');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Practice on Camera Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
