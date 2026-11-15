// ===================================================================================================
// Question bank for government exams and practical viva, with AI answer checking.
// ===================================================================================================
import React, { useState, useEffect } from 'react';
import { useCollege } from '../../context/CollegeContext';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Search,
  Filter,
  RotateCcw,
  Trophy,
  Brain,
  GraduationCap,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Award,
  Layers,
  FileCheck,
  Building2,
  Clock,
  Compass,
  Check,
} from 'lucide-react';

// Data shape: govt viva question.
export interface GovtVivaQuestion {
  id: string;
  category:
    | 'computer-history'
    | 'history-gk'
    | 'quant-math'
    | 'reasoning'
    | 'gk-current-affairs'
    | 'english-hindi'
    | 'interview-personality';
  categoryLabel: string;
  topic: string;
  question: string;
  questionHindi: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export const GOVT_VIVA_QUESTIONS_BANK: GovtVivaQuestion[] = [
  // 1. History of Computer & Basics
  {
    id: 'ch-1',
    category: 'computer-history',
    categoryLabel: 'Computer History & Basics',
    topic: 'Computer Architecture & Pioneers',
    question: 'Who is recognized as the "Father of the Computer" and designed the Analytical Engine?',
    questionHindi: 'कंप्यूटर का जनक (Father of Computer) किसे कहा जाता है जिन्होंने एनालिटिकल इंजन की रूपरेखा तैयार की थी?',
    options: ['Alan Turing', 'Charles Babbage', 'John von Neumann', 'Blaise Pascal'],
    correctAnswerIndex: 1,
    explanation: 'Charles Babbage conceptualized and invented the first mechanical computer, the Analytical Engine in 1837, which contained an Arithmetic Logic Unit and basic flow control.',
    difficulty: 'Easy',
  },
  {
    id: 'ch-2',
    category: 'computer-history',
    categoryLabel: 'Computer History & Basics',
    topic: 'Computer Generations',
    question: 'Which electronic switching device was used in First Generation Computers (1940-1956)?',
    questionHindi: 'प्रथम पीढ़ी (First Generation) के कंप्यूटरों में मुख्य इलेक्ट्रॉनिक घटक के रूप में किसका उपयोग किया गया था?',
    options: ['Transistors', 'Vacuum Tubes (Valves)', 'Integrated Circuits (ICs)', 'VLSI Microprocessors'],
    correctAnswerIndex: 1,
    explanation: 'First generation computers like ENIAC and UNIVAC used Vacuum Tubes for circuitry and magnetic drums for memory, generating massive heat.',
    difficulty: 'Easy',
  },
  {
    id: 'ch-3',
    category: 'computer-history',
    categoryLabel: 'Computer History & Basics',
    topic: 'Memory Hierarchy',
    question: 'Which type of computer memory is the fastest and placed directly inside or closest to the CPU core?',
    questionHindi: 'कंप्यूटर में सबसे तीव्र गति वाली मेमोरी कौन-सी होती है जो सीपीयू कोर के सबसे समीप स्थित होती है?',
    options: ['DRAM (Dynamic RAM)', 'Hard Disk Drive', 'CPU Registers / L1 Cache', 'Optical ROM'],
    correctAnswerIndex: 2,
    explanation: 'CPU registers and Level 1 (L1) Cache operate at CPU clock speed with latency under 1-2 nanoseconds, making them the fastest storage.',
    difficulty: 'Medium',
  },
  {
    id: 'ch-4',
    category: 'computer-history',
    categoryLabel: 'Computer History & Basics',
    topic: 'Networking & Protocols',
    question: 'What is the default port number used by the secure HTTPS protocol for encrypted web communication?',
    questionHindi: 'सुरक्षित वेब संचार के लिए HTTPS प्रोटोकॉल द्वारा सामान्यतः किस पोर्ट नंबर का उपयोग किया जाता है?',
    options: ['Port 80', 'Port 21', 'Port 443', 'Port 25'],
    correctAnswerIndex: 2,
    explanation: 'HTTP runs on Port 80, whereas HTTPS (HTTP over TLS/SSL) uses Port 443 for encrypted communication.',
    difficulty: 'Medium',
  },

  // 2. History of India & Uttarakhand GK
  {
    id: 'hg-1',
    category: 'history-gk',
    categoryLabel: 'History of India & Uttarakhand GK',
    topic: 'Uttarakhand State Formation',
    question: 'On which date was the State of Uttaranchal (now Uttarakhand) officially carved out as the 27th state of India?',
    questionHindi: 'उत्तराखंड (पूर्व नाम उत्तरांचल) भारत के 27वें राज्य के रूप में किस तिथि को अस्तित्व में आया?',
    options: ['1 November 2000', '9 November 2000', '15 November 2000', '26 January 2001'],
    correctAnswerIndex: 1,
    explanation: 'Uttarakhand was established on 9 November 2000 under the Uttar Pradesh Reorganisation Act, 2000. It was officially renamed Uttarakhand from Uttaranchal on January 1, 2007.',
    difficulty: 'Easy',
  },
  {
    id: 'hg-2',
    category: 'history-gk',
    categoryLabel: 'History of India & Uttarakhand GK',
    topic: 'Uttarakhand Geography & Rivers',
    question: 'At which sacred confluence do the rivers Alaknanda and Bhagirathi meet to form the Holy Ganga?',
    questionHindi: 'किस पवित्र संगम पर अलकनंदा और भागीरथी नदियाँ मिलकर माँ गंगा के नाम से जानी जाती हैं?',
    options: ['Rudraprayag', 'Karnaprayag', 'Devprayag', 'Vishnuprayag'],
    correctAnswerIndex: 2,
    explanation: 'At Devprayag (one of the Panch Prayags in Garhwal), the turbulent Bhagirathi joins the calmer Alaknanda, forming the River Ganga.',
    difficulty: 'Easy',
  },
  {
    id: 'hg-3',
    category: 'history-gk',
    categoryLabel: 'History of India & Uttarakhand GK',
    topic: 'Indian Modern History',
    question: 'Who started the famous Chipko Movement in Reni village (Chamoli, Uttarakhand) in 1974 for forest conservation?',
    questionHindi: '1974 में चमोली के रेणी गाँव में वनों के संरक्षण के लिए ऐतिहासिक "चिपको आंदोलन" का नेतृत्व किसने किया था?',
    options: ['Gaura Devi', 'Bachendri Pal', 'Medha Patkar', 'Sarojini Naidu'],
    correctAnswerIndex: 0,
    explanation: 'Gaura Devi led the women of Reni village who hugged the trees to prevent commercial loggers from cutting them down, giving birth to the iconic Chipko Movement.',
    difficulty: 'Medium',
  },
  {
    id: 'hg-4',
    category: 'history-gk',
    categoryLabel: 'History of India & Uttarakhand GK',
    topic: 'Ancient Indian History',
    question: 'Which Mauryan Emperor erected the rock edict discovered in Kalsi (near Dehradun, Uttarakhand)?',
    questionHindi: 'देहरादून के कालसी में प्राप्त प्रसिद्ध ऐतिहासिक शिलालेख किस मौर्य सम्राट द्वारा स्थापित किया गया था?',
    options: ['Chandragupta Maurya', 'Samudragupta', 'Emperor Ashoka', 'Harshavardhana'],
    correctAnswerIndex: 2,
    explanation: 'The Kalsi rock edict is the only Ashokan edict in North India (Uttarakhand), inscribed in Prakrit language using Brahmi script around 250 BCE.',
    difficulty: 'Medium',
  },

  // 3. Quantitative Aptitude — गणित
  {
    id: 'qa-1',
    category: 'quant-math',
    categoryLabel: 'Quantitative Aptitude — गणित',
    topic: 'Percentage & Ratio',
    question: 'If a diploma student scores 72 marks out of 80 in Applied Mechanics, what is their percentage score?',
    questionHindi: 'यदि किसी डिप्लोमा छात्र ने अप्लाइड मैकेनिक्स में 80 में से 72 अंक प्राप्त किए, तो उसका प्रतिशत क्या है?',
    options: ['85%', '88%', '90%', '92%'],
    correctAnswerIndex: 2,
    explanation: 'Percentage = (Marks Obtained / Total Marks) × 100 = (72 / 80) × 100 = 0.9 × 100 = 90%.',
    difficulty: 'Easy',
  },
  {
    id: 'qa-2',
    category: 'quant-math',
    categoryLabel: 'Quantitative Aptitude — गणित',
    topic: 'Profit & Loss',
    question: 'A surveying instrument bought for ₹ 4,000 is sold for ₹ 4,800. What is the profit percentage?',
    questionHindi: '₹ 4,000 में खरीदा गया एक सर्वे उपकरण ₹ 4,800 में बेचा गया। लाभ प्रतिशत ज्ञात कीजिए?',
    options: ['15%', '20%', '25%', '30%'],
    correctAnswerIndex: 1,
    explanation: 'Profit = ₹ 4,800 - ₹ 4,000 = ₹ 800. Profit % = (Profit / Cost Price) × 100 = (800 / 4000) × 100 = 20%.',
    difficulty: 'Easy',
  },
  {
    id: 'qa-3',
    category: 'quant-math',
    categoryLabel: 'Quantitative Aptitude — गणित',
    topic: 'Time & Work',
    question: 'A can complete a software module in 12 days and B can do the same in 24 days. Working together, in how many days will they finish it?',
    questionHindi: 'A किसी कार्य को 12 दिनों में तथा B उसी कार्य को 24 दिनों में कर सकता है। दोनों मिलकर उस कार्य को कितने दिनों में पूरा करेंगे?',
    options: ['6 days', '8 days', '10 days', '18 days'],
    correctAnswerIndex: 1,
    explanation: "Combined rate = 1/12 + 1/24 = (2 + 1)/24 = 3/24 = 1/8 module per day. Total time = 8 days.",
    difficulty: 'Medium',
  },
  {
    id: 'qa-4',
    category: 'quant-math',
    categoryLabel: 'Quantitative Aptitude — गणित',
    topic: 'Speed, Time & Distance',
    question: 'A train traveling at 72 km/h crosses a 180-meter long railway platform in 15 seconds. Find the length of the train.',
    questionHindi: '72 किमी/घंटा की गति से चल रही एक ट्रेन 15 सेकंड में 180 मीटर लंबे प्लेटफॉर्म को पार करती है। ट्रेन की लंबाई ज्ञात कीजिए।',
    options: ['100 meters', '120 meters', '140 meters', '150 meters'],
    correctAnswerIndex: 1,
    explanation: 'Speed in m/s = 72 × (5/18) = 20 m/s. Total distance in 15s = 20 × 15 = 300 m. Train Length = Total Distance - Platform Length = 300 - 180 = 120 meters.',
    difficulty: 'Hard',
  },

  // 4. Reasoning — तर्कशक्ति
  {
    id: 'rs-1',
    category: 'reasoning',
    categoryLabel: 'Reasoning — तर्कशक्ति',
    topic: 'Number Series',
    question: 'Find the next number in the given series: 4, 9, 16, 25, 36, ?',
    questionHindi: 'दी गई संख्या श्रृंखला में अगली संख्या क्या होगी: 4, 9, 16, 25, 36, ?',
    options: ['45', '48', '49', '64'],
    correctAnswerIndex: 2,
    explanation: 'The series consists of squares of consecutive integers: 2²=4, 3²=9, 4²=16, 5²=25, 6²=36, so the next is 7² = 49.',
    difficulty: 'Easy',
  },
  {
    id: 'rs-2',
    category: 'reasoning',
    categoryLabel: 'Reasoning — तर्कशक्ति',
    topic: 'Coding-Decoding',
    question: 'If "CIVIL" is coded as "DJWJM" (+1 shift), how will "METRO" be coded under the same rule?',
    questionHindi: 'यदि "CIVIL" को किसी कूट भाषा में "DJWJM" लिखा जाता है, तो उसी नियम के अनुसार "METRO" को क्या लिखा जाएगा?',
    options: ['NFUSP', 'NEUQP', 'NFSPO', 'OFVSP'],
    correctAnswerIndex: 0,
    explanation: 'Each alphabet is shifted forward by 1: M->N, E->F, T->U, R->S, O->P = NFUSP.',
    difficulty: 'Easy',
  },
  {
    id: 'rs-3',
    category: 'reasoning',
    categoryLabel: 'Reasoning — तर्कशक्ति',
    topic: 'Blood Relations',
    question: 'Pointing to a photograph, a boy says, "Her mother is the only daughter of my maternal grandfather." How is the woman in the photograph related to the boy?',
    questionHindi: 'एक तस्वीर की ओर इशारा करते हुए एक लड़के ने कहा, "उसकी माँ मेरे नाना की इकलौती बेटी है।" तस्वीर वाली महिला का उस लड़के से क्या संबंध है?',
    options: ['Aunt (मामी/मौसी)', 'Sister (बहन)', 'Mother (माँ)', 'Cousin (ममेरी बहन)'],
    correctAnswerIndex: 2,
    explanation: 'The only daughter of the boy’s maternal grandfather (नाना) is the boy’s mother herself. Thus, the photograph is of his mother or her daughter.',
    difficulty: 'Medium',
  },
  {
    id: 'rs-4',
    category: 'reasoning',
    categoryLabel: 'Reasoning — तर्कशक्ति',
    topic: 'Direction Sense',
    question: 'A surveyor walks 20m North, turns Right and walks 30m, then turns Right again and walks 20m. In which direction and at what distance is he from the starting point?',
    questionHindi: 'एक सर्वेक्षक उत्तर दिशा में 20 मीटर चलता है, फिर दाएँ मुड़कर 30 मीटर चलता है, और फिर दाएँ मुड़कर 20 मीटर चलता है। वह प्रारंभिक बिंदु से किस दिशा में और कितनी दूरी पर है?',
    options: ['30 meters East', '30 meters West', '20 meters East', '50 meters North'],
    correctAnswerIndex: 0,
    explanation: 'Moving 20m North then 20m South cancels the vertical displacement. The horizontal displacement is 30m East of the origin.',
    difficulty: 'Medium',
  },

  // 5. General Knowledge & Current Affairs
  {
    id: 'gk-1',
    category: 'gk-current-affairs',
    categoryLabel: 'General Knowledge & Current Affairs',
    topic: 'Indian Constitution',
    question: 'Which Article of the Indian Constitution is described as the "Heart and Soul of the Constitution" by Dr. B.R. Ambedkar?',
    questionHindi: 'डॉ. बी.आर. अम्बेडकर ने भारतीय संविधान के किस अनुच्छेद को "संविधान का हृदय और आत्मा" कहा था?',
    options: ['Article 14', 'Article 19', 'Article 21', 'Article 32 (Right to Constitutional Remedies)'],
    correctAnswerIndex: 3,
    explanation: 'Article 32 provides the Right to Constitutional Remedies, empowering citizens to approach the Supreme Court via writs (Habeas Corpus, Mandamus, etc.) to enforce Fundamental Rights.',
    difficulty: 'Easy',
  },
  {
    id: 'gk-2',
    category: 'gk-current-affairs',
    categoryLabel: 'General Knowledge & Current Affairs',
    topic: 'Science & Physics',
    question: 'What is the SI unit of Electrical Resistance commonly measured in electronics laboratories?',
    questionHindi: 'इलेक्ट्रॉनिक्स प्रयोगशाला में सामान्यतः मापे जाने वाले विद्युत प्रतिरोध (Electrical Resistance) की SI इकाई क्या है?',
    options: ['Volt', 'Ampere', 'Ohm (Ω)', 'Watt'],
    correctAnswerIndex: 2,
    explanation: 'Resistance is measured in Ohms (Ω), defined by Ohm’s Law as V = I × R (Volts = Amperes × Ohms).',
    difficulty: 'Easy',
  },
  {
    id: 'gk-3',
    category: 'gk-current-affairs',
    categoryLabel: 'General Knowledge & Current Affairs',
    topic: 'Indian Geography',
    question: 'Which is the highest dam in India, constructed on the Bhagirathi River in Tehri Garhwal, Uttarakhand?',
    questionHindi: 'टिहरी गढ़वाल, उत्तराखंड में भागीरथी नदी पर बना भारत का सबसे ऊँचा बाँध कौन-सा है?',
    options: ['Bhakra Dam', 'Tehri Dam (260.5 m)', 'Sardar Sarovar Dam', 'Hirakud Dam'],
    correctAnswerIndex: 1,
    explanation: 'Tehri Dam on the Bhagirathi River with a height of 260.5 meters is the tallest dam in India and one of the highest embankment dams in the world.',
    difficulty: 'Medium',
  },

  // 6. English & Hindi Grammar
  {
    id: 'eh-1',
    category: 'english-hindi',
    categoryLabel: 'English & Hindi व्याकरण',
    topic: 'English Vocabulary (Antonyms)',
    question: 'What is the exact antonym of the word "DILIGENT" (hardworking, careful)?',
    questionHindi: '"DILIGENT" (परिश्रमी/कर्मठ) शब्द का सही विलोम (Antonym) क्या होगा?',
    options: ['Careful', 'Lazy / Negligent', 'Active', 'Capable'],
    correctAnswerIndex: 1,
    explanation: 'Diligent means showing care and conscientiousness in one’s work; its opposite is lazy or negligent.',
    difficulty: 'Easy',
  },
  {
    id: 'eh-2',
    category: 'english-hindi',
    categoryLabel: 'English & Hindi व्याकरण',
    topic: 'Hindi व्याकरण (संधि)',
    question: '"सूर्योदय" शब्द का सही संधि-विच्छेद क्या होगा?',
    questionHindi: 'व्याकरण के नियमानुसार "सूर्योदय" का सही संधि-विच्छेद चुनिए:',
    options: ['सूर्य + दय', 'सूर्य + उदय (गुण स्वर संधि)', 'सूर्या + उदय', 'सूर्यो + दय'],
    correctAnswerIndex: 1,
    explanation: 'सूर्य + उदय = सूर्योदय। यहाँ अ + उ मिलकर "ओ" बनते हैं, जो गुण स्वर संधि का नियम है।',
    difficulty: 'Easy',
  },
  {
    id: 'eh-3',
    category: 'english-hindi',
    categoryLabel: 'English & Hindi व्याकरण',
    topic: 'English Sentence Correction',
    question: 'Choose the grammatically correct sentence:',
    questionHindi: 'व्याकरण की दृष्टि से शुद्ध वाक्य चुनिए:',
    options: [
      'Each of the students have completed their lab manual.',
      'Each of the students has completed his/her lab manual.',
      'All of student has completed lab manual.',
      'Each students has completed their manual.',
    ],
    correctAnswerIndex: 1,
    explanation: '"Each" is a singular distributive pronoun and takes a singular verb "has" and singular pronoun "his/her".',
    difficulty: 'Medium',
  },

  // 7. Interview & Personality
  {
    id: 'ip-1',
    category: 'interview-personality',
    categoryLabel: 'Interview & Personality (सरकारी व प्राइवेट)',
    topic: 'Government Service Motivation',
    question: 'When asked: "Why do you want a Government Job instead of private IT/Infrastructure firms?", what is the most mature answer?',
    questionHindi: 'इंटरव्यू में जब पूछा जाए: "आप प्राइवेट कंपनी के बजाय सरकारी नौकरी (JE / PSU) क्यों चुनना चाहते हैं?", तो सबसे परिपक्व उत्तर क्या है?',
    options: [
      '"Because private companies have too much workload and I want a relaxed life."',
      '"Because government service provides immense public impact, transparent career progression, and an opportunity to contribute directly to nation-building infrastructure."',
      '"Because government jobs give high pension and you cannot be fired easily."',
      '"Because my parents strictly ordered me to get a sarkari naukri."',
    ],
    correctAnswerIndex: 1,
    explanation: 'Interviewers look for public service orientation, integrity, accountability, and genuine dedication towards state/national infrastructure rather than complacency or entitlement.',
    difficulty: 'Easy',
  },
  {
    id: 'ip-2',
    category: 'interview-personality',
    categoryLabel: 'Interview & Personality (सरकारी व प्राइवेट)',
    topic: 'Handling Weaknesses',
    question: 'How should a polytechnic diploma engineer answer: "What is your biggest weakness?" in a campus interview?',
    questionHindi: 'कैंपस इंटरव्यू में "आपकी सबसे बड़ी कमजोरी क्या है?" पूछे जाने पर सही दृष्टिकोण क्या होना चाहिए?',
    options: [
      '"I have no weaknesses at all, I am perfect in everything."',
      '"State a genuine non-fatal developmental area (e.g. initial hesitation in public speaking) and immediately describe the proactive steps you are taking to overcome it."',
      '"I get very angry when someone points out my coding or surveying errors."',
      '"I find it difficult to wake up in the morning for shift work."',
    ],
    correctAnswerIndex: 1,
    explanation: 'Effective candidates show self-awareness: acknowledge a real area of improvement and present the concrete remediation already in progress (e.g. practicing mock presentations).',
    difficulty: 'Medium',
  },
  {
    id: 'ip-3',
    category: 'interview-personality',
    categoryLabel: 'Interview & Personality (सरकारी व प्राइवेट)',
    topic: 'Site Ethics & Integrity',
    question: 'If a contractor asks you to approve substandard concrete or code deployment under time pressure, what must be your response as a Junior Engineer?',
    questionHindi: 'यदि कोई ठेकेदार या वेंडर आपसे समय की कमी के कारण घटिया कंक्रीट या असुरक्षित कोड को पास करने का दबाव बनाए, तो एक कनिष्ठ अभियंता के रूप में आपकी क्या प्रतिक्रिया होनी चाहिए?',
    options: [
      'Approve it quietly to avoid conflict with the senior management.',
      'Politely but firmly refuse, adhere strictly to IS codes/security benchmarks, record the deviation in the logbook, and escalate immediately to the Assistant Engineer / HOD.',
      'Take personal responsibility and test it yourself later next month.',
      'Ignore the issue since everyone compromises on site.',
    ],
    correctAnswerIndex: 1,
    explanation: 'Engineering ethics and structural integrity are non-negotiable. Standard protocols require refusing substandard materials and reporting up the chain of command.',
    difficulty: 'Medium',
  },
];

// Screen part: govt exam and viva qn a module.
export const GovtExamAndVivaQnAModule: React.FC = () => {
  const { currentUser } = useCollege();

  // Storage key for score persistence per student
  const storageKey = `ugip_viva_qna_scores_${currentUser?.id || 'guest'}`;

  // State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  // Text typed in the search box
  const [searchQuery, setSearchQuery] = useState<string>('');
  // Difficulty filter (kept in screen state)
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'Easy' | 'Medium' | 'Hard'>('all');

  // Answers Map: questionId -> selectedOptionIndex
  const [studentAnswers, setStudentAnswers] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return {};
  });

  // Save answers whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(studentAnswers));
    } catch (e) {
      console.error(e);
    }
  }, [studentAnswers, storageKey]);

  // Categories list
  const categoriesList = [
    { id: 'all', label: 'All Subjects (सभी विषय)' },
    { id: 'computer-history', label: 'Computer History & Basics' },
    { id: 'history-gk', label: 'History of India & Uttarakhand GK' },
    { id: 'quant-math', label: 'Quantitative Aptitude — गणित' },
    { id: 'reasoning', label: 'Reasoning — तर्कशक्ति' },
    { id: 'gk-current-affairs', label: 'GK & Current Affairs' },
    { id: 'english-hindi', label: 'English & Hindi व्याकरण' },
    { id: 'interview-personality', label: 'Interview & Personality' },
  ];

  // Filtered Questions
  const filteredQuestions = GOVT_VIVA_QUESTIONS_BANK.filter((q) => {
    const matchCat = selectedCategory === 'all' || q.category === selectedCategory;
    const matchDiff = difficultyFilter === 'all' || q.difficulty === difficultyFilter;
    const qLower = searchQuery.toLowerCase().trim();
    const matchSearch =
      !qLower ||
      q.question.toLowerCase().includes(qLower) ||
      q.questionHindi.toLowerCase().includes(qLower) ||
      q.topic.toLowerCase().includes(qLower) ||
      q.explanation.toLowerCase().includes(qLower);

    return matchCat && matchDiff && matchSearch;
  });

  // Score Calculations across all attempted questions
  const totalAttempted = Object.keys(studentAnswers).length;
  let totalCorrect = 0;
  let totalWrong = 0;

  Object.entries(studentAnswers).forEach(([qId, ansIdx]) => {
    const questionObj = GOVT_VIVA_QUESTIONS_BANK.find((q) => q.id === qId);
    if (questionObj) {
      if (questionObj.correctAnswerIndex === ansIdx) {
        totalCorrect += 1;
      } else {
        totalWrong += 1;
      }
    }
  });

  const accuracyPercent = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

  // Runs when the user does this on screen: select option.
  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setStudentAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  // Runs when the user does this on screen: reset progress.
  const handleResetProgress = () => {
    if (window.confirm('Are you sure you want to reset your score history for this module?')) {
      setStudentAnswers({});
      localStorage.removeItem(storageKey);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                Government & Technical Examination Preparation
              </span>
              <span className="text-slate-300 text-xs font-semibold">· SSC JE / RRB / State JE / PSUs</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
              <Award className="w-6 h-6 text-cyan-400" />
              <span>Comprehensive Viva, GK & Aptitude Q&A Master Bank</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Curated preparation syllabus covering Computer History, India & Uttarakhand GK, Quantitative Aptitude (गणित), Reasoning (तर्कशक्ति), English/Hindi grammar, and Interview Personality. All question responses and scores are saved persistently.
            </p>
          </div>

          {/* Real-Time Live Score Counter Card */}
          <div className="flex flex-wrap items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shrink-0">
            <div className="text-center px-3 border-r border-white/20">
              <span className="text-[10px] font-bold text-slate-300 uppercase block">Attempted</span>
              <span className="text-xl font-black text-white">{totalAttempted}</span>
            </div>
            <div className="text-center px-3 border-r border-white/20">
              <span className="text-[10px] font-bold text-emerald-300 uppercase block">Correct</span>
              <span className="text-xl font-black text-emerald-400">{totalCorrect}</span>
            </div>
            <div className="text-center px-3 border-r border-white/20">
              <span className="text-[10px] font-bold text-rose-300 uppercase block">Incorrect</span>
              <span className="text-xl font-black text-rose-400">{totalWrong}</span>
            </div>
            <div className="text-center px-2">
              <span className="text-[10px] font-bold text-cyan-300 uppercase block">Accuracy</span>
              <span className="text-xl font-black text-cyan-300">{accuracyPercent}%</span>
            </div>
          </div>
        </div>

        {/* Quick Diploma Jobs External Link */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-cyan-200">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Interactive practice mode saves your real-time results for: <strong>{currentUser?.name || 'Student'}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://govtjobguru.in/jobs-by-qualification/diploma-freshers/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>डिप्लोमा के बाद Government Jobs (Diploma Freshers)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            {totalAttempted > 0 && (
              <button
                onClick={handleResetProgress}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                title="Reset your answered score history"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
                <span>Reset Score</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter & Subject Selection Navigation */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search in questions, Hindi text, or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-semibold text-[11px]">Difficulty:</span>
            {(['all', 'Easy', 'Medium', 'Hard'] as const).map((diff) => (
              <button
                key={diff}
                onClick={() => setDifficultyFilter(diff)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer transition-colors ${
                  difficultyFilter === diff
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {diff === 'all' ? 'All' : diff}
              </button>
            ))}
          </div>
        </div>

        {/* Subject Categories Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold no-scrollbar">
          {categoriesList.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-xs font-black ring-2 ring-indigo-400/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">No questions match your filter.</h4>
            <p className="text-xs text-slate-400 mt-1">Try clearing search terms or selecting another subject.</p>
          </div>
        ) : (
          filteredQuestions.map((q, qIndex) => {
            const chosenAnswer = studentAnswers[q.id];
            const hasAnswered = chosenAnswer !== undefined;
            const isCorrect = hasAnswered && chosenAnswer === q.correctAnswerIndex;

            return (
              <div
                key={q.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 sm:p-6 shadow-xs transition-all space-y-4 ${
                  hasAnswered
                    ? isCorrect
                      ? 'border-emerald-300 dark:border-emerald-700/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                      : 'border-rose-300 dark:border-rose-700/60 bg-rose-50/20 dark:bg-rose-950/10'
                    : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                }`}
              >
                {/* Question Header & Category */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px]">
                      {q.categoryLabel}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300 text-[11px]">
                      {q.topic}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        q.difficulty === 'Easy'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : q.difficulty === 'Medium'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {q.difficulty}
                    </span>

                    {hasAnswered && (
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-black flex items-center gap-1 ${
                          isCorrect
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-rose-600 text-white shadow-2xs'
                        }`}
                      >
                        {isCorrect ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Correct (+1)</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Incorrect (0)</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Texts (English & Hindi) */}
                <div className="space-y-1.5">
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed">
                    Q{qIndex + 1}. {q.question}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                    {q.questionHindi}
                  </p>
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = chosenAnswer === optIdx;
                    const isOptionCorrect = optIdx === q.correctAnswerIndex;

                    let btnStyle = 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200';

                    if (hasAnswered) {
                      if (isOptionCorrect) {
                        btnStyle = 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs';
                      } else if (isSelected && !isCorrect) {
                        btnStyle = 'bg-rose-600 text-white border-rose-600 font-bold shadow-xs';
                      } else {
                        btnStyle = 'opacity-60 bg-slate-50 dark:bg-slate-800 border-slate-200 text-slate-500';
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleSelectOption(q.id, optIdx)}
                        className={`p-3 rounded-xl border text-left text-xs transition-all flex items-start gap-2.5 cursor-pointer ${btnStyle}`}
                      >
                        <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="leading-snug">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Explanation Card (Reveals after answer) */}
                {hasAnswered && (
                  <div className="p-3.5 bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1 text-xs">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      <FileCheck className="w-3.5 h-3.5" />
                      Step-by-Step Explanation & Concept Note:
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans text-xs">
                      {q.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
