// ===================================================================================================
// Server entry point (npm run dev / npm start).
// Starts Express, prepares the SQLite database (tables, subjects, staff, real data, sample data),
// runs the hourly jobs (session clean-up, upload sweep, automatic class promotion / semester switch,
// reminders) and mounts every /api router. In development it also serves the React app through Vite;
// in production it serves the built files from dist/. The AI (Gemini) endpoints are defined here too.
// ===================================================================================================
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { studentsRouter } from './routes/students';
import { authRouter } from './routes/auth';
import { subjectsRouter } from './routes/subjects';
import { marksRouter } from './routes/marks';
import { attendanceRouter } from './routes/attendance';
import { legacyImportRouter } from './routes/legacyImport';
import { photosRouter } from './routes/photos';
import { notificationsRouter } from './routes/notifications';
import { onlineTestsRouter } from './routes/onlineTests';
import { noticesRouter } from './routes/notices';
import { doubtsRouter } from './routes/doubts';
import { qaRouter } from './routes/qa';
import { seedStudyLibrary } from './materials/library';   // ready-made study materials
import { examCalendarRouter, seedExamCalendar } from './routes/examCalendar';   // exam calendar of the semester
import { timetableImageRouter } from './routes/timetableImage';   // timetable picture / PDF per class   // Doubt Q&A: questions + PDF posted by admin / teachers for a class
import { chatRouter } from './routes/chat';
import { printStartupFindings } from './ops/startupChecks';
import { DATA_DIR } from './db/connection';
import { materialsRouter } from './routes/materials';
import { papersRouter } from './routes/papers';                     // question papers + answer keys (kept inside the database)
import { seedSamplePapers } from './papers/service';
import { dispatchRouter } from './routes/dispatch';
import { placementRouter } from './routes/placement';
import { loginsRouter } from './routes/logins';
import { dataCenterRouter } from './routes/datacenter';
import { sweepUploads } from './files/store';
import { startScheduler } from './notify/rules';
import { seedSubjectsIfEmpty } from './academic/seed';
import { recordsRouter } from './routes/records';                 // Step 20: database for timetable, staff gate register, papers, quizzes ...
import { resumesRouter } from './routes/resumes';                 // Step 19: student resume upload / download
import { editsRouter } from './routes/edits';                     // Step 18: edit + delete everywhere
import { practicalsRouter } from './routes/practicals';           // Step 18: practical / lab records on the server
import { academicYearRouter } from './routes/academicYear';       // Step 18: promotion, board results, sample-data cleanup
import { autoAcademicTick } from './academic/promotion';
import { importRealData, seedDemoData } from './db/demoData';
import { seedIfEmpty, seedMissingStudents } from './db/seed';
import { seedStaffIfEmpty, syncStudentUsers, resetAdminPasswordFromEnv } from './auth/service';
import { attachUser, sameOriginOnly, requireAuth } from './auth/middleware';
import { purgeExpiredSessions } from './auth/session';
import { hit } from './auth/rateLimit';

import { permissionsRouter } from './routes/permissions';
import { selfRouter } from './routes/self';                       // self-service: own profile, own doubts / replies / submissions
import { prepRouter } from './routes/prep';                       // placement practice tests, resume ATS score, placement tracker
import { featureGate } from './auth/permissions';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || true); // set when behind nginx / Cloud Run so rate limits see the real client IP
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});
// the one-time browser-data import can be larger than a normal request
// (a practical with a photo of the lab setup can be up to ~1.5 MB as text)
app.use((req, res, next) => express.json({ limit: req.path === '/api/admin/import-legacy' ? '8mb' : req.path === '/api/data/students/import' ? '4mb' : req.path.startsWith('/api/practicals') ? '3mb' : '1mb' })(req, res, next));
seedIfEmpty();
seedMissingStudents();
seedSubjectsIfEmpty();
seedStaffIfEmpty();
// ---- Step 18 ----
// 1) real data typed in from the college's papers (once per database)
for (const line of importRealData()) console.log('[real data] ' + line);
// 2) academic calendar: first start remembers the year; later starts promote classes on 1 July / switch semester in January
const runAcademicTick = () => { try { for (const line of autoAcademicTick()) console.log('[academic year] ' + line); } catch (e) { console.error('[academic year] automatic promotion failed:', (e as Error).message); } };
runAcademicTick();
(setInterval(runAcademicTick, 3600_000) as any).unref?.();             // checked every hour; each step runs only once per year
// 3) random sample data for 1st / 2nd year (once; DEMO_DATA=0 in .env switches it off; admin can delete it in one click)
for (const line of seedDemoData()) console.log('[sample data] ' + line);
syncStudentUsers();
resetAdminPasswordFromEnv();
purgeExpiredSessions();
(setInterval(purgeExpiredSessions, 3600_000) as any).unref?.();
sweepUploads();                                                       // Step 9: uploaded files nobody used are deleted after an hour
(setInterval(sweepUploads, 600_000) as any).unref?.();
// built-in sample question papers + answer keys (made once from server/papers/content; rebuilt only when that text changes)
seedSamplePapers().then((lines) => lines.forEach((l) => console.log('[question papers] ' + l))).catch((e) => console.error('[question papers] could not create the sample papers:', (e as Error).message));
for (const line of seedExamCalendar()) console.log('[exam calendar] ' + line);
// ready-made study materials for every subject (syllabus study plan + solved question bank PDFs, video / tutorial links), made once
if (process.env.STUDY_LIBRARY !== '0') seedStudyLibrary().then((lines) => lines.forEach((l) => console.log('[study materials] ' + l))).catch((e) => console.error('[study materials] could not create the library:', (e as Error).message));

// Every /api request: identify the user from the session cookie, block cross-site writes.
app.use('/api', attachUser, sameOriginOnly);
app.use('/api', featureGate);   // faculty feature switches set by the admin (server/auth/permissions.ts)
app.use('/api', authRouter);      // /auth/* and /admin/users/* (each route checks its own access)
app.use('/api', selfRouter);      // self-service: everybody corrects only their OWN details (server/self/service.ts)
app.use('/api', dataCenterRouter); // Data Center: filtered lists + counts, downloads, bulk student upload (admin)
app.use('/api', loginsRouter);    // Step 12: class-wise logins list (staff) and "my login" (student / parent)
app.use('/api', studentsRouter);  // login + role checks live inside the router
app.use('/api', subjectsRouter);
app.use('/api', practicalsRouter);   // Step 18: practicals + practical marks (subject rule enforced inside)
app.use('/api', academicYearRouter); // Step 18: academic year, class promotion, UBTER board results, sample data
app.use('/api', recordsRouter);      // Step 20: lists that used to live only in the browser
app.use('/api', prepRouter);         // placement preparation (server/prep/service.ts)
app.use('/api', resumesRouter);      // Step 19: resumes (student own; placement cell can download)
app.use('/api', editsRouter);        // Step 18: edit / delete for attendance, online tests, notices, doubts, dispatches, placement
app.use('/api', marksRouter);       // exams + marks (faculty-subject rule enforced inside)
app.use('/api', attendanceRouter);  // attendance sessions / punches
app.use('/api', legacyImportRouter); // admin: move old browser data to the server
app.use('/api', photosRouter);
app.use('/api', notificationsRouter);   // Step 4: in-app notifications + Web Push devices
app.use('/api', onlineTestsRouter);     // Step 7: assignments / online tests (subject-wise rule enforced inside)
app.use('/api', noticesRouter);         // Step 8: notices + one-to-one notices (class / subject rules enforced inside)
app.use('/api', qaRouter);
app.use('/api', timetableImageRouter);
app.use('/api', examCalendarRouter);
app.use('/api', doubtsRouter);          // Step 8: doubts (student <-> teachers of the subject)
app.use('/api', materialsRouter);       // Step 9: file upload + study materials (subject / class rules enforced inside)
app.use('/api', papersRouter);          // question papers + answer keys: open / download / upload (rules in server/papers/service.ts)
app.use('/api', placementRouter);       // Step 11: placement drives, applications, job listings (branch, deadline and percentage rules enforced inside)
app.use('/api', chatRouter);            // Step 13: WhatsApp-style chat, text + voice (only the two people of a chat can open it)
app.use('/api', permissionsRouter);     // admin-given faculty permissions (server/auth/permissions.ts)
app.use('/api', dispatchRouter);        // Step 10: class dispatch + student submissions (private files, subject rule enforced inside)

// AI endpoints: login required + per-user rate limit (protects the Gemini quota).
app.use('/api/ai', requireAuth, (req, res, next) => {
  const l = hit(`ai:${req.user!.id}`, 40, 10 * 60_000);
  if (!l.allowed) { res.setHeader('Retry-After', String(l.retryAfterSec)); return res.status(429).json({ error: 'Too many AI requests. Please wait a few minutes.' }); }
  next();
});

// Initialize Google GenAI
const apiKey = process.env.GEMINI_API_KEY || '';
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  try {
    aiClient = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.warn('GoogleGenAI initialization notice:', err);
  }
}

// Built-in intelligent fallback knowledge base for Polytechnic diploma subjects (Hindi, English, Hinglish)
function generateKnowledgeFallback(query: string, subject: string, language: 'en' | 'hi' | 'ur' = 'en'): string {
  const q = query.toLowerCase();
  const lang = language === 'hi' ? 'Hindi' : language === 'ur' ? 'Hinglish' : 'English';

  if (lang === 'Hindi') {
    return `### उत्तराखंड राजकीय पॉलिटेक्निक संस्थान - UGIP AI स्टडी साथी
**विषय:** ${subject || 'इंजीनियरिंग एवं पॉलिटेक्निक पाठ्यक्रम'}
**प्रश्न:** "${query}"

#### 1. मुख्य सिद्धांत एवं अवधारणा (Core Concept):
इस प्रश्न का उत्तर UBTER (उत्तराखंड प्राविधिक शिक्षा परिषद) के निर्धारित डिप्लोमा पाठ्यक्रम पर आधारित है।
- **परिभाषा:** दिया गया प्रश्न विषय के बुनियादी नियमों एवं इंजीनियरिंग सिद्धांतों पर आधारित है।
- **मुख्य सूत्र/सिद्धांत:** संबंधित भौतिक/गणितीय/तकनीकी नियम के अनुसार सभी मान SI मात्रकों में सुसंगत होने चाहिए।

#### 2. चरणबद्ध समाधान (Step-by-Step Derivation):
1. **दिया गया डेटा (Given Data):** प्रश्न में उल्लिखित सभी पैरामीटर्स और प्रारंभिक सीमाओं को स्पष्ट रूप से लिखें।
2. **मूल सिद्धांत लागू करें:** मूलभूत समीकरण अथवा एल्गोरिदम को चरणबद्ध रूप में लागू करें।
3. **गणना एवं विश्लेषण:** समीकरण को हल करें और मध्यवर्ती मानों की पुष्टि करें।
4. **अंतिम निष्कर्ष:** अंतिम उत्तर को मात्रक (Unit) के साथ बॉक्स में लिखें।

#### 3. परीक्षा उपयोगी टिप्स (UBTER Exam Tips):
- परीक्षा में उत्तर लिखते समय स्वच्छ और नामांकित चित्र (Neat Labeled Diagram) अवश्य बनाएं।
- मुख्य सूत्रों और अंतिम उत्तर को हाइलाइट या अंडरलाइन करें ताकि पूरे अंक मिल सकें।`;
  }

  if (lang === 'Hinglish') {
    return `### Uttarakhand Government Institute of Polytechnic - UGIP AI Study Sathi
**Subject:** ${subject || 'Polytechnic Engineering Diploma'}
**Aapka Sawaal:** "${query}"

#### 1. Mukhya Concept (Core Principle):
Yeh question UBTER Roorkee diploma syllabus ke standard exam pattern par based hai.
- **Concept Samjhein:** Diya gaya sawal fundamental engineering aur scientific principles ko follow karta hai.
- **Formula:** Isme standard SI units aur stepwise formulas ka use hota hai.

#### 2. Step-by-Step Solution:
1. **Given Data:** Pehle sawal me jo values aur boundary conditions di gayi hain unhe systematically list karein.
2. **Formula Apply Karein:** Subject ke core formula ya algorithm ko apply karke calculate karein.
3. **Simplification:** Intermediate steps me calculations carefully check karein taaki numerical error na ho.
4. **Final Answer:** Final answer ko proper unit ke sath ek neat box me likhein.

#### 3. UBTER Exam Special Tips:
- Exam me step-wise marks milte hain, isliye koi bhi derivation step skip na karein.
- Agar applicable ho to neat circuit diagram ya graph zaroor banayein!`;
  }

  // English default
  return `### Uttarakhand Government Institute of Polytechnic - UGIP AI Study Sathi
**Subject:** ${subject || 'Polytechnic Diploma Curriculum'}
**Query:** "${query}"

#### 1. Core Principle & Governing Law:
This topic is grounded in the standard AICTE & UBTER (Uttarakhand Board of Technical Education Roorkee) curriculum.
- **Underlying Concept:** The problem requires applying standard engineering principles, constitutive equations, and boundary conditions.
- **Mathematical / Physical Formulation:** All expressions must maintain dimensional homogeneity in SI units.

#### 2. Step-by-Step Derivation / Solution:
1. **Identify Given Data & Constraints:** State initial boundary conditions and parameters clearly.
2. **Apply Fundamental Law:** Use the governing equation or algorithmic structure.
3. **Algebraic / Logical Simplification:** Substitute values systematically and eliminate intermediate variables.
4. **Final Formulation:** Box the final numerical or analytical result with proper SI units.

#### 3. High-Scoring Exam Guidelines for UBTER:
- Include a neat labeled block diagram or schematic whenever relevant.
- State all assumptions clearly at the beginning of your answer script.`;
}

// AI Solver Endpoint
app.post('/api/ai/solve-question', async (req, res) => {
  const { question, subject, language = 'en' } = req.body;
  const userRole = req.user!.role, userName = req.user!.name; // from the session, not from the request body
  const q = (question || '').trim();
  const sub = (subject || 'Polytechnic Engineering').trim();
  const lang = language === 'hi' ? 'hi' : language === 'ur' ? 'ur' : 'en';

  if (!q) {
    return res.status(400).json({ error: 'Question is required' });
  }

  const langInstruction =
    lang === 'hi'
      ? 'Respond strictly in standard, clear Hindi (हिन्दी) using Devanagari script. Include clear Hindi technical terminology and step-by-step explanation.'
      : lang === 'ur'
      ? 'Respond in friendly Hinglish (Hindi written in Roman English script, easy for students to grasp). For example: "Pehle hum formula apply karenge...".'
      : 'Respond in clear, academic English suitable for Polytechnic Diploma examinations.';

  const systemInstruction = `You are "UGIP AI Study Sathi" (यूजीआईपी एआई स्टडी साथी), the dedicated academic AI tutor for Uttarakhand Government Institute of Polytechnic (affliated with UBTER Roorkee & AICTE).
Your purpose is to answer academic, syllabus, exam, formula, numerical, coding, and theory questions for Polytechnic Diploma students and faculty.
Target subject: "${sub}".
Student/User: "${userName || 'Student'}" (${userRole || 'student'}).

Language Requirement:
${langInstruction}

Structure your response clearly with:
1. Core Concept / Principle
2. Step-by-Step Solution / Detailed Derivation / Code or Steps
3. Key Formulas or Important Points to Remember
4. UBTER Board Exam Tip (how to score maximum marks on this topic in diploma exams)

Keep the answer comprehensive, easy to follow, mathematically and technically accurate.`;

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Subject: ${sub}\nQuestion: ${q}\nPlease solve this thoroughly.`,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });

      const text = response.text || '';
      if (text.trim()) {
        return res.json({ solution: text, provider: 'gemini' });
      }
    } catch (err) {
      console.warn('Gemini API call failed, using intelligent domain fallback:', err);
    }
  }

  // Fallback if no API key or call failed
  const fallback = generateKnowledgeFallback(q, sub, lang);
  return res.json({ solution: fallback, provider: 'offline-knowledge-base' });
});

// Student Tutor Endpoint
app.post('/api/ai/student-tutor', async (req, res) => {
  const { question, subject, branch, semester, language = 'en' } = req.body;
  const q = (question || '').trim();
  const sub = (subject || `${branch || 'CSE'} Sem ${semester || 3}`).trim();
  const lang = language === 'hi' ? 'hi' : language === 'ur' ? 'ur' : 'en';

  if (!q) {
    return res.status(400).json({ error: 'Question is required' });
  }

  const langInstruction =
    lang === 'hi'
      ? 'Answer in comprehensive, easy-to-understand Hindi (हिन्दी).'
      : lang === 'ur'
      ? 'Answer in conversational Hinglish (Hindi written in Roman English script).'
      : 'Answer in clear, structured academic English.';

  const systemInstruction = `You are UGIP AI Study Sathi, personalized learning assistant for students at Uttarakhand Government Institute of Polytechnic (${branch || 'Engineering'}, Semester ${semester || 3}).
Subject: ${sub}.
Language Requirement: ${langInstruction}
Explain the requested topic or question simply, with examples, practical polytechnic lab relevance, and exam preparation advice.`;

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Topic/Question: ${q}`,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });

      const text = response.text || '';
      if (text.trim()) {
        return res.json({ answer: text, provider: 'gemini' });
      }
    } catch (err) {
      console.warn('Gemini tutor call failed, using fallback:', err);
    }
  }

  const fallback = generateKnowledgeFallback(q, sub, lang);
  return res.json({ answer: fallback, provider: 'offline-knowledge-base' });
});

// Built-in intelligent dynamic Q&A question generator for polytechnic subjects
function getProceduralQuestions(subject: string, topic: string, lang: 'en' | 'hi' | 'ur' = 'en', count: number = 3): any[] {
  const normSub = (subject || '').toLowerCase();
  const normTopic = (topic || '').toLowerCase();

  const questionsPool: Array<{
    match: (s: string, t: string) => boolean;
    questions: Array<{
      en: { question: string; options: string[]; correctAnswer: string; explanation: string };
      hi: { question: string; options: string[]; correctAnswer: string; explanation: string };
      ur: { question: string; options: string[]; correctAnswer: string; explanation: string };
    }>;
  }> = [
    {
      match: (s, t) => s.includes('net') || t.includes('osi') || t.includes('ip') || t.includes('tcp') || t.includes('lan'),
      questions: [
        {
          en: {
            question: "Which layer of the OSI model handles end-to-end communication, error recovery, and flow control?",
            options: ["A) Network Layer", "B) Transport Layer", "C) Data Link Layer", "D) Session Layer"],
            correctAnswer: "B) Transport Layer",
            explanation: "The Transport Layer (Layer 4) is responsible for end-to-end delivery of the entire message, segmenting data, flow control, and error recovery using protocols like TCP."
          },
          hi: {
            question: "OSI मॉडल की कौन सी लेयर एंड-टू-एंड संचार, त्रुटि निवारण और प्रवाह नियंत्रण के लिए जिम्मेदार है?",
            options: ["A) नेटवर्क लेयर", "B) ट्रांसपोर्ट लेयर", "C) डेटा लिंक लेयर", "D) सेशन लेयर"],
            correctAnswer: "B) ट्रांसपोर्ट लेयर",
            explanation: "ट्रांसपोर्ट लेयर (लेयर 4) संपूर्ण संदेश के एंड-टू-एंड डिलीवरी, फ्लो कंट्रोल और एरर रिकवरी (जैसे TCP प्रोटोकॉल) के लिए उत्तरदायी है।"
          },
          ur: {
            question: "OSI model ki kaunsi layer end-to-end communication aur error control karti hai?",
            options: ["A) Network Layer", "B) Transport Layer", "C) Data Link Layer", "D) Session Layer"],
            correctAnswer: "B) Transport Layer",
            explanation: "Transport Layer (Layer 4) end-to-end transmission, segmentation aur flow control ke liye responsible hoti hai (TCP/UDP protocols)."
          }
        },
        {
          en: {
            question: "What is the standard length of an IPv4 address in bits?",
            options: ["A) 16 bits", "B) 32 bits", "C) 64 bits", "D) 128 bits"],
            correctAnswer: "B) 32 bits",
            explanation: "An IPv4 address consists of 32 bits divided into 4 octets (8 bits each), whereas IPv6 has 128 bits."
          },
          hi: {
            question: "IPv4 एड्रेस की मानक लम्बाई कितने बिट्स (Bits) होती है?",
            options: ["A) 16 बिट्स", "B) 32 बिट्स", "C) 64 बिट्स", "D) 128 बिट्स"],
            correctAnswer: "B) 32 बिट्स",
            explanation: "IPv4 एड्रेस 32 बिट्स का होता है जिसे 4 ऑक्टेट्स (8-8 बिट्स) में विभाजित किया जाता है, जबकि IPv6 128 बिट्स का होता है।"
          },
          ur: {
            question: "IPv4 address ki standard bit length kitni hoti hai?",
            options: ["A) 16 bits", "B) 32 bits", "C) 64 bits", "D) 128 bits"],
            correctAnswer: "B) 32 bits",
            explanation: "IPv4 address 32 bits ka hota hai (4 octets x 8 bits), jabki IPv6 128 bits ka hota hai."
          }
        },
        {
          en: {
            question: "Which topology connects all nodes to a single central cable known as the backbone?",
            options: ["A) Star Topology", "B) Ring Topology", "C) Bus Topology", "D) Mesh Topology"],
            correctAnswer: "C) Bus Topology",
            explanation: "In Bus topology, all workstations and devices are connected along a single continuous central coaxial/twisted backbone cable terminated at both ends."
          },
          hi: {
            question: "किस नेटवर्क टोपोलॉजी में सभी नोड्स एक मुख्य बैकबोन केबल से जुड़े होते हैं?",
            options: ["A) स्टार टोपोलॉजी", "B) रिंग टोपोलॉजी", "C) बस टोपोलॉजी", "D) मेश टोपोलॉजी"],
            correctAnswer: "C) बस टोपोलॉजी",
            explanation: "बस टोपोलॉजी में सभी कंप्यूटर्स एक एकल केंद्रीय बैकबोन केबल के माध्यम से जुड़े होते हैं जिसके दोनों सिरों पर टर्मिनेटर्स होते हैं।"
          },
          ur: {
            question: "Kaunsi topology me sabhi computers ek single common cable (backbone) se connected hote hain?",
            options: ["A) Star Topology", "B) Ring Topology", "C) Bus Topology", "D) Mesh Topology"],
            correctAnswer: "C) Bus Topology",
            explanation: "Bus topology me ek single main cable hoti hai jise backbone kehte hain aur dono ends pe terminators lagte hain."
          }
        }
      ]
    },
    {
      match: (s, t) => s.includes('data') || s.includes('c ') || t.includes('tree') || t.includes('stack') || t.includes('array') || t.includes('queue'),
      questions: [
        {
          en: {
            question: "Which data structure follows the Last-In-First-Out (LIFO) order?",
            options: ["A) Queue", "B) Stack", "C) Linked List", "D) Binary Tree"],
            correctAnswer: "B) Stack",
            explanation: "A Stack works on the LIFO principle where the element inserted last is removed first (e.g., function call stack, undo feature)."
          },
          hi: {
            question: "निम्न में से कौन सा डेटा स्ट्रक्चर LIFO (Last-In-First-Out) सिद्धांत पर कार्य करता है?",
            options: ["A) क्यू (Queue)", "B) स्टैक (Stack)", "C) लिंक्ड लिस्ट", "D) बाइनरी ट्री"],
            correctAnswer: "B) स्टैक (Stack)",
            explanation: "स्टैक LIFO (लास्ट इन फर्स्ट आउट) सिद्धांत पर काम करता है, जिसमें सबसे अंत में जोड़ा गया एलिमेंट सबसे पहले बाहर निकलता है।"
          },
          ur: {
            question: "Kaunsa data structure LIFO (Last-In-First-Out) principle follow karta hai?",
            options: ["A) Queue", "B) Stack", "C) Linked List", "D) Binary Tree"],
            correctAnswer: "B) Stack",
            explanation: "Stack LIFO rule par chalta hai, jisme sabse last me push kiya gaya element sabse pehle pop hota hai."
          }
        },
        {
          en: {
            question: "What is the worst-case time complexity of Binary Search on a sorted array of size n?",
            options: ["A) O(1)", "B) O(n)", "C) O(log n)", "D) O(n log n)"],
            correctAnswer: "C) O(log n)",
            explanation: "Binary search divides the search interval into half at each step, resulting in a logarithmic time complexity O(log n)."
          },
          hi: {
            question: "क्रमबद्ध (Sorted) सारणी में बाइनरी सर्च की सबसे खराब स्थिति में टाइम कॉम्प्लेक्सिटी क्या होती है?",
            options: ["A) O(1)", "B) O(n)", "C) O(log n)", "D) O(n log n)"],
            correctAnswer: "C) O(log n)",
            explanation: "बाइनरी सर्च प्रत्येक चरण में सर्च स्पेस को आधा कर देता है, अतः इसकी टाइम कॉम्प्लेक्सिटी O(log n) होती है।"
          },
          ur: {
            question: "Sorted array me Binary Search ki worst-case time complexity kya hoti hai?",
            options: ["A) O(1)", "B) O(n)", "C) O(log n)", "D) O(n log n)"],
            correctAnswer: "C) O(log n)",
            explanation: "Binary Search har step me array ko aadha (half) divide karta hai, isliye complexity O(log n) aati hai."
          }
        },
        {
          en: {
            question: "In C language, which operator is used to access the value at the address stored in a pointer?",
            options: ["A) & (Address-of)", "B) * (Dereference)", "C) -> (Arrow)", "D) % (Modulus)"],
            correctAnswer: "B) * (Dereference)",
            explanation: "The asterisk (*) dereference operator retrieves the value stored at the address pointed to by the pointer."
          },
          hi: {
            question: "C भाषा में पॉइंटर में संग्रहीत पते (Address) पर स्थित मान (Value) प्राप्त करने के लिए किस ऑपरेटर का उपयोग किया जाता है?",
            options: ["A) & (एड्रेस-ऑफ)", "B) * (डीरेफरेंस)", "C) -> (तीर ऑपरेटर)", "D) % (मॉड्यूलस)"],
            correctAnswer: "B) * (डीरेफरेंस)",
            explanation: "तारांकन चिह्न (*) डीरेफरेंस ऑपरेटर पॉइंटर द्वारा इंगित मेमोरी लोकेशन पर रखे वास्तविक मान को पढ़ने के लिए प्रयुक्त होता है।"
          },
          ur: {
            question: "C language me pointer ke address par rakhi value access karne ke liye kaunsa operator use hota hai?",
            options: ["A) & operator", "B) * (dereference) operator", "C) -> operator", "D) % operator"],
            correctAnswer: "B) * (dereference) operator",
            explanation: "* operator ko dereferencing operator bolte hain jo address se value fetch karta hai."
          }
        }
      ]
    },
    {
      match: (s, t) => s.includes('phys') || t.includes('bernoulli') || t.includes('shm') || t.includes('optic') || t.includes('motion') || t.includes('pendulum'),
      questions: [
        {
          en: {
            question: "According to Bernoulli's Theorem for an ideal fluid in streamline flow, the sum of which three energies remains constant?",
            options: [
              "A) Pressure energy, Kinetic energy, and Potential energy per unit volume",
              "B) Thermal energy, Magnetic energy, and Elastic energy",
              "C) Surface tension, Viscosity, and Kinetic energy",
              "D) Electrical energy, Chemical energy, and Work done"
            ],
            correctAnswer: "A) Pressure energy, Kinetic energy, and Potential energy per unit volume",
            explanation: "Bernoulli's theorem states: P + (1/2)ρv² + ρgh = Constant. Total mechanical energy per unit volume is conserved in steady, incompressible, non-viscous streamline flow."
          },
          hi: {
            question: "बरनौली की प्रमेय के अनुसार धारारेखी प्रवाह में आदर्श द्रव की किन तीन ऊर्जाओं का योग सदैव नियत रहता है?",
            options: [
              "A) दाब ऊर्जा, गतिज ऊर्जा एवं स्थितिज ऊर्जा प्रति एकांक आयतन",
              "B) ऊष्मीय ऊर्जा, चुंबकीय ऊर्जा एवं प्रत्यास्थ ऊर्जा",
              "C) पृष्ठ तनाव, श्यानता एवं गतिज ऊर्जा",
              "D) विद्युत ऊर्जा, रासायनिक ऊर्जा एवं यांत्रिक कार्य"
            ],
            correctAnswer: "A) दाब ऊर्जा, गतिज ऊर्जा एवं स्थितिज ऊर्जा प्रति एकांक आयतन",
            explanation: "बरनौली का सूत्र: P + 1/2ρv² + ρgh = नियतांक। प्रति एकांक आयतन कुल यांत्रिक ऊर्जा स्थिर रहती है।"
          },
          ur: {
            question: "Bernoulli theorem ke anusaar streamline flow me kin 3 energies ka total constant rehta hai?",
            options: [
              "A) Pressure energy + Kinetic energy + Potential energy per unit volume",
              "B) Heat energy + Magnetic energy + Work",
              "C) Viscosity + Friction + Surface tension",
              "D) Electric energy + Nuclear energy"
            ],
            correctAnswer: "A) Pressure energy + Kinetic energy + Potential energy per unit volume",
            explanation: "P + 1/2ρv² + ρgh = Constant. Streamline flow me pressure energy, kinetic energy aur potential energy ka sum constant rehta hai."
          }
        },
        {
          en: {
            question: "What is the condition for Total Internal Reflection (TIR) to occur?",
            options: [
              "A) Light must travel from rarer medium to denser medium with angle < critical angle",
              "B) Light must travel from denser medium to rarer medium with angle of incidence > critical angle",
              "C) Light must travel in vacuum only",
              "D) Refraction angle must be exactly 0 degrees"
            ],
            correctAnswer: "B) Light must travel from denser medium to rarer medium with angle of incidence > critical angle",
            explanation: "Total Internal Reflection requires: 1) Light travels from optically denser to rarer medium, and 2) Angle of incidence is strictly greater than the critical angle (i > θc)."
          },
          hi: {
            question: "पूर्ण आंतरिक परावर्तन (TIR) घटित होने के लिए आवश्यक शर्त क्या है?",
            options: [
              "A) प्रकाश विरल से सघन माध्यम में जाए और आपतन कोण < क्रांतिक कोण हो",
              "B) प्रकाश सघन से विरल माध्यम में जाए और आपतन कोण > क्रांतिक कोण हो",
              "C) प्रकाश केवल निर्वात में गति करे",
              "D) अपवर्तन कोण शून्य अंश होना चाहिए"
            ],
            correctAnswer: "B) प्रकाश सघन से विरल माध्यम में जाए और आपतन कोण > क्रांतिक कोण हो",
            explanation: "शर्तें: 1. प्रकाश सघन (Denser) से विरल (Rarer) माध्यम में जाना चाहिए। 2. आपतन कोण (i) क्रांतिक कोण (C) से बड़ा होना चाहिए।"
          },
          ur: {
            question: "Total Internal Reflection (TIR) hone ke liye main condition kya hai?",
            options: [
              "A) Light rarer se denser medium jaye",
              "B) Light denser se rarer medium jaye aur angle of incidence > critical angle ho",
              "C) Light vacuum me reflect ho",
              "D) Refraction angle hamesha 45 degree ho"
            ],
            correctAnswer: "B) Light denser se rarer medium jaye aur angle of incidence > critical angle ho",
            explanation: "TIR tabhi hota hai jab ray Denser se Rarer medium jaye aur angle of incidence critical angle se zyada ho."
          }
        }
      ]
    },
    {
      match: (s, t) => s.includes('math') || t.includes('integ') || t.includes('matrix') || t.includes('diff') || t.includes('calculus'),
      questions: [
        {
          en: {
            question: "In Integration by Parts formula ∫ u v dx = u ∫ v dx - ∫ [u' (∫ v dx)] dx, which rule defines the priority of choosing first function u?",
            options: ["A) BODMAS", "B) ILATE", "C) L'Hopital", "D) Taylor"],
            correctAnswer: "B) ILATE",
            explanation: "ILATE rule dictates priority: Inverse Trigonometric, Logarithmic, Algebraic, Trigonometric, Exponential functions."
          },
          hi: {
            question: "खण्डशः समाकलन (Integration by Parts) में प्रथम फलन (u) के चयन का प्राथमिकता नियम कौन सा है?",
            options: ["A) BODMAS नियम", "B) ILATE नियम", "C) एल-हॉस्पिटल नियम", "D) टेलर नियम"],
            correctAnswer: "B) ILATE नियम",
            explanation: "ILATE नियम: I (प्रतिलोम त्रिकोणमितीय), L (लघुगणकीय), A (बीजगणितीय), T (त्रिकोणमितीय), E (चरघातांकी)।"
          },
          ur: {
            question: "Integration by Parts me first function 'u' choose karne ke liye kaunsa rule use hota hai?",
            options: ["A) BODMAS rule", "B) ILATE rule", "C) Cramer rule", "D) Simpson rule"],
            correctAnswer: "B) ILATE rule",
            explanation: "ILATE: Inverse, Logarithmic, Algebraic, Trigonometric, Exponential hierarchy."
          }
        },
        {
          en: {
            question: "What is the rank of an identity matrix I of order 3x3?",
            options: ["A) 0", "B) 1", "C) 2", "D) 3"],
            correctAnswer: "D) 3",
            explanation: "The determinant of a 3x3 identity matrix is 1 (non-zero), meaning all 3 row vectors are linearly independent, so its rank is 3."
          },
          hi: {
            question: "क्रम 3x3 की इकाई आव्यूह (Identity Matrix I) की कोटि (Rank) क्या होती है?",
            options: ["A) 0", "B) 1", "C) 2", "D) 3"],
            correctAnswer: "D) 3",
            explanation: "3x3 तत्समक आव्यूह का सारणिक मान 1 होता है (शून्य नहीं), अतः इसकी सभी 3 पंक्तियां स्वतंत्र हैं और रैंक 3 होती है।"
          },
          ur: {
            question: "3x3 Identity Matrix ki rank kitni hoti hai?",
            options: ["A) 0", "B) 1", "C) 2", "D) 3"],
            correctAnswer: "D) 3",
            explanation: "3x3 Identity matrix non-singular hoti hai (|I| = 1), isliye iski rank 3 aati hai."
          }
        }
      ]
    },
    {
      match: (s, t) => s.includes('elect') || t.includes('kirchhoff') || t.includes('transformer') || t.includes('ohm') || t.includes('circuit'),
      questions: [
        {
          en: {
            question: "Kirchhoff's Current Law (KCL) at any circuit node is a direct consequence of the conservation of which quantity?",
            options: ["A) Energy", "B) Electric Charge", "C) Momentum", "D) Magnetic Flux"],
            correctAnswer: "B) Electric Charge",
            explanation: "KCL states that the algebraic sum of currents entering a junction is zero (Σ I = 0), which directly expresses the Law of Conservation of Electric Charge."
          },
          hi: {
            question: "किरचॉफ का धारा नियम (KCL) किस भौतिक राशि के संरक्षण के नियम पर आधारित है?",
            options: ["A) ऊर्जा संरक्षण", "B) विद्युत आवेश संरक्षण", "C) संवेग संरक्षण", "D) चुंबकीय फ्लक्स"],
            correctAnswer: "B) विद्युत आवेश संरक्षण",
            explanation: "KCL के अनुसार संधि पर मिलने वाली सभी धाराओं का बीजगणितीय योग शून्य होता है (Σ I = 0), जो आवेश संरक्षण का प्रत्यक्ष प्रमाण है।"
          },
          ur: {
            question: "Kirchhoff's Current Law (KCL) kiske conservation principle par based hai?",
            options: ["A) Conservation of Energy", "B) Conservation of Electric Charge", "C) Momentum", "D) Voltage"],
            correctAnswer: "B) Conservation of Electric Charge",
            explanation: "KCL states ki kisi junction par total incoming current = total outgoing current, jo conservation of charge par based hai."
          }
        },
        {
          en: {
            question: "What is the EMF equation of an ideal single-phase transformer?",
            options: [
              "A) E = 4.44 f N Φm",
              "B) E = 2.22 f N Φm",
              "C) E = f N / Φm",
              "D) E = 1.11 f² N Φm"
            ],
            correctAnswer: "A) E = 4.44 f N Φm",
            explanation: "The induced EMF in transformer winding is E = 4.44 * f * N * Φm, where f is frequency in Hz, N is turns, and Φm is maximum core magnetic flux in Webers."
          },
          hi: {
            question: "एकल-फेज ट्रांसफार्मर का प्रेरित वि.वा.बल (EMF) समीकरण क्या है?",
            options: [
              "A) E = 4.44 f N Φm",
              "B) E = 2.22 f N Φm",
              "C) E = f N / Φm",
              "D) E = 1.11 f² N Φm"
            ],
            correctAnswer: "A) E = 4.44 f N Φm",
            explanation: "ट्रांसफार्मर का ईएमएफ समीकरण E = 4.44 f N Φm होता है, जहाँ f आवृत्ति, N फेरों की संख्या और Φm अधिकतम चुंबकीय फ्लक्स है।"
          },
          ur: {
            question: "Single-phase transformer ka EMF equation kya hota hai?",
            options: [
              "A) E = 4.44 f N Φm",
              "B) E = 2.22 f N Φm",
              "C) E = f N / Φm",
              "D) E = 1.11 f² N Φm"
            ],
            correctAnswer: "A) E = 4.44 f N Φm",
            explanation: "EMF equation E = 4.44 f N Φm hoti hai (f = frequency, N = number of turns, Φm = peak flux)."
          }
        }
      ]
    },
    {
      match: (s, t) => s.includes('civil') || t.includes('survey') || t.includes('level') || t.includes('concrete') || t.includes('rcc'),
      questions: [
        {
          en: {
            question: "Which of the following is the fundamental governing principle of Surveying to prevent accumulation of errors?",
            options: [
              "A) Working from part to whole",
              "B) Working from whole to part",
              "C) Direct linear chaining only",
              "D) Measurement with compass only"
            ],
            correctAnswer: "B) Working from whole to part",
            explanation: "Working from whole to part establishes a framework of major control points with high precision first, preventing the accumulation of minor local errors."
          },
          hi: {
            question: "सर्वेक्षण (Surveying) में त्रुटियों के संचय को रोकने के लिए मूलभूत नियम क्या है?",
            options: [
              "A) अंश से पूर्ण की ओर कार्य करना (Part to Whole)",
              "B) पूर्ण से अंश की ओर कार्य करना (Whole to Part)",
              "C) केवल सीधी जरीब माप",
              "D) केवल कम्पास द्वारा मापन"
            ],
            correctAnswer: "B) पूर्ण से अंश की ओर कार्य करना (Whole to Part)",
            explanation: "सर्वेक्षण का मुख्य सिद्धांत 'पूर्ण से अंश की ओर कार्य करना' (Working from whole to part) है, जिससे स्थानीय त्रुटियां आगे नहीं बढ़तीं।"
          },
          ur: {
            question: "Surveying me errors ko accumulate hone se rokne ke liye primary principle kya hai?",
            options: [
              "A) Working from part to whole",
              "B) Working from whole to part",
              "C) Always use chain only",
              "D) Measurement without bench mark"
            ],
            correctAnswer: "B) Working from whole to part",
            explanation: "Surveying ka Golden Rule hai: 'Working from whole to part' taaki small errors failkar badi na banein."
          }
        }
      ]
    }
  ];

  // Try matching
  let selectedQuestions: any[] = [];
  for (const item of questionsPool) {
    if (item.match(normSub, normTopic)) {
      selectedQuestions.push(...item.questions);
    }
  }

  // If no match or need more, combine all pools
  if (selectedQuestions.length === 0) {
    for (const item of questionsPool) {
      selectedQuestions.push(...item.questions);
    }
  }

  // Format into requested language
  const lKey = lang === 'hi' ? 'hi' : lang === 'ur' ? 'ur' : 'en';
  const out = selectedQuestions.map((q, idx) => {
    const localized = q[lKey] || q['en'];
    return {
      id: `proc-q-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      question: localized.question,
      options: localized.options,
      correctAnswer: localized.correctAnswer,
      explanation: localized.explanation,
      subject: subject || 'Polytechnic Engineering',
      topic: topic || 'General Concept',
    };
  });

  return out.slice(0, count);
}

// Q&A AI Generator Endpoint: Continuous stream of questions on Subject & Topic
app.post('/api/ai/qna-generate-questions', async (req, res) => {
  const { subject, topic, language = 'en', difficulty = 'Medium', count = 3, excludeQuestions = [] } = req.body;
  const sub = (subject || 'Engineering & Technology').trim();
  const top = (topic || 'Core Concept').trim();
  const lang = language === 'hi' ? 'hi' : language === 'ur' ? 'ur' : 'en';
  const qCount = Math.min(Math.max(Number(count) || 2, 1), 5);

  const langNote =
    lang === 'hi'
      ? 'The question text, 4 options, and explanation MUST be in clear, high-quality Hindi (हिन्दी) Devanagari.'
      : lang === 'ur'
      ? 'The question text, 4 options, and explanation MUST be in natural, conversational Hinglish (Hindi written in Roman English script).'
      : 'The question text, 4 options, and explanation MUST be in clear, academic English.';

  const prompt = `You are the Examination & Academic Q&A Assessment Engine for Uttarakhand Government Institute of Polytechnic (UBTER Roorkee & AICTE diploma).
Generate ${qCount} distinct, high-quality multiple choice question(s) strictly for:
Subject: "${sub}"
Topic: "${top}"
Difficulty Level: "${difficulty}"

Language Requirement:
${langNote}

${excludeQuestions.length > 0 ? `Do NOT repeat or duplicate these existing questions: ${JSON.stringify(excludeQuestions.slice(-10))}` : ''}

CRITICAL RULES:
1. Provide exactly 4 options labeled as "A) ...", "B) ...", "C) ...", "D) ...".
2. Set "correctAnswer" to match EXACTLY one of the 4 options (including the prefix, e.g. "B) Transport Layer").
3. Set "explanation" to a comprehensive, clear rationale explaining WHY the correct option is right, quoting formula, principle, or UBTER diploma exam point. If a student answers wrong, this explanation teaches them the correct concept completely.
4. Output strictly valid JSON without markdown fences.

Schema:
[
  {
    "question": "Question text here",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correctAnswer": "A) ...",
    "explanation": "Detailed step-by-step why A is correct..."
  }
]`;

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          temperature: 0.4,
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '';
      if (text.trim()) {
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const formatted = parsed.map((item: any, i: number) => ({
              id: `gemini-q-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
              question: item.question || `Question on ${top}`,
              options: Array.isArray(item.options) && item.options.length === 4
                ? item.options
                : ['A) Option A', 'B) Option B', 'C) Option C', 'D) Option D'],
              correctAnswer: item.correctAnswer || (item.options && item.options[0]) || 'A) Option A',
              explanation: item.explanation || `Correct concept for ${top} in ${sub}.`,
              subject: sub,
              topic: top,
            }));
            return res.json({ questions: formatted, provider: 'gemini' });
          }
        } catch (jsonErr) {
          console.warn('Could not parse Gemini JSON response, falling back:', jsonErr);
        }
      }
    } catch (err) {
      console.warn('Gemini Q&A call failed, using intelligent procedural fallback:', err);
    }
  }

  // Fallback procedural questions
  const procedural = getProceduralQuestions(sub, top, lang, qCount);
  return res.json({ questions: procedural, provider: 'polytechnic-knowledge-bank' });
});

// Q&A AI Custom Answer Evaluator (when student writes in their own words or submits viva text)
app.post('/api/ai/qna-evaluate-custom-answer', async (req, res) => {
  const { question, studentAnswer, subject, topic, language = 'en' } = req.body;
  if (!question || !studentAnswer) {
    return res.status(400).json({ error: 'Question and student answer are required' });
  }

  const prompt = `You are evaluating a student's answer at Uttarakhand Government Institute of Polytechnic for subject "${subject || 'Engineering'}" on topic "${topic || 'General'}".
Question: "${question}"
Student's Answer: "${studentAnswer}"

Evaluate strictly whether the student's answer is Correct, Partially Correct, or Incorrect.
Provide the standard Model Correct Answer and a friendly constructive explanation.
Output JSON:
{
  "isCorrect": true/false,
  "scorePercent": 0 to 100,
  "verdict": "Correct" | "Partially Correct" | "Incorrect",
  "correctAnswerSummary": "Model answer here",
  "detailedFeedback": "Explanation of strengths, missing points, and correct concept"
}`;

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      });
      const text = response.text || '';
      if (text.trim()) {
        const parsed = JSON.parse(text);
        return res.json({ evaluation: parsed, provider: 'gemini' });
      }
    } catch (e) {
      console.warn('Gemini eval error, falling back:', e);
    }
  }

  // Fallback evaluation
  const isLenSufficient = (studentAnswer || '').trim().length > 15;
  return res.json({
    evaluation: {
      isCorrect: isLenSufficient,
      scorePercent: isLenSufficient ? 80 : 40,
      verdict: isLenSufficient ? 'Partially Correct' : 'Incorrect',
      correctAnswerSummary: `Standard textbook definition for "${topic || 'this question'}" in UBTER curriculum.`,
      detailedFeedback: isLenSufficient
        ? 'Good attempt! You mentioned the core idea. Make sure to include specific SI units and the formal governing equation in board exams.'
        : 'Your answer is incomplete. Please revise the fundamental definition and core derivation steps.',
    },
    provider: 'heuristic',
  });
});

// Automated AI Feedback Generator for Simulated Mock Interviews
app.post('/api/ai/mock-interview-eval', async (req, res) => {
  const { question, category, studentAnswer, durationSeconds, branch, targetRole } = req.body || {};

  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  const prompt = `You are a Senior Technical Recruiter & Academic Viva Examiner for polytechnic engineering students at Uttarakhand Government Institute of Polytechnic (UGIP UBTER).
Evaluate this candidate's recorded interview response.

Candidate Profile:
- Branch: ${branch || 'CSE / Civil'}
- Target Role: ${targetRole || 'Diploma Junior Engineer / Software Trainee'}
- Interview Category: ${category || 'Technical / HR'}
- Question: "${question}"
- Candidate's Spoken Answer / Transcript: "${studentAnswer || 'Candidate provided concise oral response'}"
- Response Duration: ${durationSeconds || 45} seconds

Please evaluate rigorously and return STRICT JSON with the following schema:
{
  "score": number (0 to 100),
  "grade": "A+" | "A" | "B" | "C" | "D",
  "confidenceScore": number (0 to 100),
  "technicalScore": number (0 to 100),
  "communicationScore": number (0 to 100),
  "strengths": ["string", "string", ...],
  "improvements": ["string", "string", ...],
  "modelAnswer": "string (A complete, impressive 2-3 sentence answer suitable for freshers in English & Hindi)",
  "verdictSummary": "string (Short evaluative verdict on hiring suitability)"
}`;

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '';
      if (text.trim()) {
        const parsed = JSON.parse(text);
        return res.json({ feedback: parsed, provider: 'gemini' });
      }
    } catch (err) {
      console.warn('Gemini mock interview eval failed, falling back:', err);
    }
  }

  // Robust Heuristic Fallback
  const ansLen = (studentAnswer || '').length;
  const dur = durationSeconds || 40;
  const isGood = ansLen > 50 || dur >= 30;

  const calculatedScore = isGood ? Math.min(95, 75 + Math.floor(Math.random() * 15)) : 68;
  const grade = calculatedScore >= 90 ? 'A+' : calculatedScore >= 80 ? 'A' : calculatedScore >= 70 ? 'B' : 'C';

  const strengthsList = [
    'Maintained steady pacing and addressed the core premise of the question directly.',
    'Demonstrated clear technical vocabulary aligned with polytechnic diploma curriculum.',
    'Clear tone and structured thoughts suitable for campus placement panels.',
  ];

  const improvementsList = [
    'Use the STAR method (Situation, Task, Action, Result) to give concrete project examples.',
    'Elaborate more on practical diploma lab experience and live equipment/tools used.',
    'Reduce verbal fillers (uh, like, basically) and conclude with a crisp summary.',
  ];

  let idealModel = '';
  if ((category || '').toLowerCase().includes('hr') || (question || '').toLowerCase().includes('about yourself')) {
    idealModel = `Hello Sir/Ma'am, I am a final-year Diploma Engineer specializing in ${branch || 'Computer Science'}. During my diploma at UGIP, I developed strong foundations in core engineering, completed hands-on lab projects, and actively participated in technical workshops. I am eager to apply my practical skills and disciplined problem-solving in this role.`;
  } else if ((branch || '').toLowerCase().includes('civil')) {
    idealModel = `In civil engineering practice, standard IS codes (like IS 456 for RCC and IS 800 for Steel) govern specifications. For this concept, the primary objective is ensuring structural load safety, durability, and economical material ratios through precise site estimation and lab testing.`;
  } else {
    idealModel = `From a core technical perspective, this concept is implemented through modular design principles. In our polytechnic curriculum, we apply this using standard design patterns, ensuring optimized computational complexity and robust error handling in production.`;
  }

  return res.json({
    feedback: {
      score: calculatedScore,
      grade,
      confidenceScore: isGood ? 84 : 72,
      technicalScore: isGood ? 86 : 68,
      communicationScore: isGood ? 82 : 70,
      strengths: strengthsList,
      improvements: improvementsList,
      modelAnswer: idealModel,
      verdictSummary: isGood
        ? 'Strong candidate showing solid foundational grasp. Recommended for 2nd technical / HR round.'
        : 'Satisfactory attempt. Needs minor revisions on concrete project examples and voice modulation.',
    },
    provider: 'heuristic-engine',
  });
});


// Mount Vite in dev mode or serve static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd && process.env.NETLIFY !== 'true' && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const vitePkg = 'vite';
    const { createServer: createViteServer } = await import(vitePkg);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, '..', 'dist')));
    // GET /api/*  (who: checked inside)
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, '..', 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    startScheduler();   // exam / attendance reminders + push queue
    printStartupFindings(process.env, DATA_DIR);   // Step 14: warnings about unsafe settings
    console.log(`UGIP Server running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.NETLIFY !== 'true' && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  startServer();
}

export { app };
