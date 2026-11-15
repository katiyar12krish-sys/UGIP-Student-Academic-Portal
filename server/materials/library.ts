// ===================================================================================================
// Ready-made study materials ("college library"), put into Study Materials once per database so students
// have something useful from day one. For every subject of every class:
//   * Unit-wise syllabus & study plan (PDF)   - from the UBTER syllabus typed into src/data/syllabus*.ts
//   * Solved question bank (PDF)              - every question + model answer of the built-in sample papers
//   * Video lectures (YouTube search link) and a free tutorial / course link where one fits the subject
// plus a few free national e-learning sites for everybody. Each item is made only once (library_seed table),
// so a material the admin deletes does not come back. Published in the admin's name.
// ===================================================================================================
import PDFDocument from 'pdfkit';
import { createRequire } from 'module';
import path from 'path';
import { db } from '../db/connection';
import { toSessionUser } from '../auth/session';
import { savePending } from '../files/store';
import { createMaterial } from './service';
import { ALL_SAMPLE_SUBJECTS } from '../papers/content';
import type { SubjectPapers } from '../papers/content/types';
import { SYLLABUS_YEAR1 } from '../../src/data/syllabusYear1';
import { SYLLABUS_CSE_SEM3 } from '../../src/data/syllabusCseSem3';
import { SYLLABUS_CSE_SEM5 } from '../../src/data/syllabusCseSem5';
import type { SyllabusCourse } from '../../src/data/syllabusTypes';

const require = createRequire(import.meta.url);
const FONT_DIR = path.join(path.dirname(require.resolve('dejavu-fonts-ttf/package.json')), 'ttf');
const SYLLABI: SyllabusCourse[] = [...SYLLABUS_YEAR1, ...SYLLABUS_CSE_SEM3, ...SYLLABUS_CSE_SEM5];
const SKIP = /proficiency|industrial exposure|minor project|project work/i;
const INSTITUTE = 'Uttarakhand Government Institute of Polytechnic';

db.exec(`CREATE TABLE IF NOT EXISTS library_seed (key TEXT PRIMARY KEY, created_at INTEGER NOT NULL)`);   // which library items were already made
const done = (key: string) => !!db.prepare('SELECT 1 FROM library_seed WHERE key=?').get(key);
const mark = (key: string) => db.prepare('INSERT OR IGNORE INTO library_seed (key, created_at) VALUES (?,?)').run(key, Date.now());

// ---------------------------------------------------------------- PDF helpers
function pdf(title: string, build: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 56, left: 56, right: 56 }, bufferPages: true, info: { Title: title, Author: INSTITUTE, Creator: 'UGIP Portal' } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.registerFont('reg', path.join(FONT_DIR, 'DejaVuSans.ttf')).registerFont('bold', path.join(FONT_DIR, 'DejaVuSans-Bold.ttf'));
    build(doc);
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0;
      doc.font('reg').fontSize(7.5).fillColor('#64748b').text(`UGIP Study Library · ${title} · page ${i + 1} of ${range.count}`, 56, doc.page.height - 36, { width: doc.page.width - 112, align: 'center', lineBreak: false });
    }
    doc.end();
  });
}
const header = (doc: PDFKit.PDFDocument, kind: string, s: any) => {
  doc.font('reg').fontSize(9).fillColor('#475569').text(INSTITUTE, { align: 'center' });
  doc.font('bold').fontSize(16).fillColor('#1e3a8a').text(kind, { align: 'center' });
  doc.font('bold').fontSize(13).fillColor('#0f172a').text(s.name, { align: 'center' });
  doc.font('reg').fontSize(9.5).fillColor('#475569').text(`Subject code ${s.code} · ${s.branch} · Semester ${s.semester}`, { align: 'center' });
  doc.moveDown(0.8);
};

/** Unit-wise syllabus with a tick list and a simple study plan. */
function studyPlanPdf(s: any, c: SyllabusCourse): Promise<Buffer> {
  return pdf(`${s.name} – syllabus & study plan`, (doc) => {
    header(doc, 'Unit-wise Syllabus & Study Plan', s);
    if (c.outcome) doc.font('reg').fontSize(10).fillColor('#0f172a').text(c.outcome).moveDown(0.5);
    const total = c.units.reduce((t, u) => t + (u.hours || 0), 0);
    doc.font('reg').fontSize(10).fillColor('#0f172a').text(`Credits: ${c.credits}${total ? ` · Teaching hours: ${total}` : ''} · Board syllabus code: ${c.boardCode}`);
    doc.moveDown(0.4).font('bold').fontSize(10.5).fillColor('#047857').text('How to use this sheet');
    doc.font('reg').fontSize(9.5).fillColor('#0f172a').list([
      'Read one unit at a time. Tick (✓) each topic when you can explain it without the book.',
      'After each unit, write 5 short questions and 2 long questions on it and answer them in your notebook.',
      'Use the "Solved question bank" of this subject in Study Materials for practice in the exam pattern.',
      'Revise all ticked topics once a week; before the exam, read only your own short notes.',
    ], { bulletRadius: 1.6, textIndent: 10 });
    doc.moveDown(0.6);
    for (const u of c.units) {
      if (doc.y > doc.page.height - 140) doc.addPage();
      doc.font('bold').fontSize(11.5).fillColor('#1e3a8a').text(`Unit ${u.unitNo}: ${u.unitTitle}${u.hours ? `   (${u.hours} hours)` : ''}`);
      doc.moveDown(0.2);
      for (const t of u.topics) doc.font('reg').fontSize(9.8).fillColor('#0f172a').text(`☐  ${t}`, { indent: 8 });
      doc.moveDown(0.6);
    }
    if (doc.y > doc.page.height - 160) doc.addPage();
    doc.font('bold').fontSize(11.5).fillColor('#1e3a8a').text('Exam preparation tips');
    doc.font('reg').fontSize(9.5).fillColor('#0f172a').list([
      'Board paper (2½ hours): Section A short answers, Section B and C longer answers; you choose any 5 of 7 in B and C.',
      'Learn definitions, formulas, units and diagrams first – they are asked every year.',
      'Write answers point-wise with headings; draw neat labelled diagrams where possible.',
      'Solve at least two full practice papers in 2½ hours before the exam.',
    ], { bulletRadius: 1.6, textIndent: 10 });
  });
}

/** Every question + model answer of the sample papers, grouped by marks, without repeats. */
function questionBankPdf(s: any, p: SubjectPapers): Promise<Buffer> {
  const groups = new Map<number, { q: string; a: string }[]>();
  const seen = new Set<string>();
  for (const paper of p.papers) for (const sec of paper.sections) for (const it of sec.items) {
    const k = it.q.trim().toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    groups.set(sec.each, [...(groups.get(sec.each) || []), it]);
  }
  return pdf(`${s.name} – solved question bank`, (doc) => {
    header(doc, 'Solved Question Bank', s);
    doc.font('reg').fontSize(9).fillColor('#475569').text('Questions in the UBTER board pattern with model answers / key points. Try each question yourself first, then check the answer.', { align: 'center' });
    doc.moveDown(0.8);
    let n = 0;
    for (const marks of [...groups.keys()].sort((a, b) => a - b)) {
      if (doc.y > doc.page.height - 140) doc.addPage();
      doc.font('bold').fontSize(12).fillColor('#1e3a8a').text(`${marks}-mark questions`, { underline: true });
      doc.moveDown(0.3);
      for (const it of groups.get(marks)!) {
        if (doc.y > doc.page.height - 110) doc.addPage();
        n++;
        doc.font('bold').fontSize(10).fillColor('#0f172a').text(`Q${n}. ${it.q}`);
        doc.font('reg').fontSize(9.5).fillColor('#047857').text(`Answer: ${it.a}`, { indent: 12 });
        doc.moveDown(0.45);
      }
      doc.moveDown(0.4);
    }
  });
}

// ---------------------------------------------------------------- links
const TUTORIALS: [RegExp, string, string][] = [
  [/c programming/i, 'https://www.w3schools.com/c/', 'C tutorial with examples you can run in the browser (W3Schools)'],
  [/java/i, 'https://www.w3schools.com/java/', 'Java tutorial with examples and exercises (W3Schools)'],
  [/web design|internet/i, 'https://developer.mozilla.org/en-US/docs/Learn', 'Learn HTML, CSS and JavaScript step by step (MDN Web Docs)'],
  [/android/i, 'https://developer.android.com/courses', 'Free Android courses from Google (Android Developers)'],
  [/database|rdbms/i, 'https://www.w3schools.com/sql/', 'SQL tutorial with practice queries (W3Schools)'],
  [/mathematics/i, 'https://www.khanacademy.org/math', 'Free maths lessons and practice (Khan Academy)'],
  [/physics/i, 'https://www.khanacademy.org/science/physics', 'Free physics lessons and practice (Khan Academy)'],
  [/chemistry/i, 'https://www.khanacademy.org/science/chemistry', 'Free chemistry lessons and practice (Khan Academy)'],
  [/english/i, 'https://learnenglish.britishcouncil.org/', 'Grammar, vocabulary and speaking practice (British Council LearnEnglish)'],
];
const GENERAL: { key: string; title: string; url: string; description: string }[] = [
  { key: 'gen-swayam', title: 'SWAYAM – free online courses (Govt. of India)', url: 'https://swayam.gov.in/', description: 'Free courses by Indian teachers and institutes. Search your subject name.' },
  { key: 'gen-nptel', title: 'NPTEL – video lectures by IITs', url: 'https://nptel.ac.in/', description: 'Free engineering video lectures and notes. Good for C, OS, DBMS, Java, mechanics, surveying.' },
  { key: 'gen-ndl', title: 'National Digital Library of India', url: 'https://ndl.iitkgp.ac.in/', description: 'Free e-books, notes and previous papers. Sign up free with your email.' },
  { key: 'gen-ncert', title: 'NCERT textbooks (free PDF)', url: 'https://ncert.nic.in/textbook.php', description: 'Class 11–12 Physics, Chemistry and Maths books – very helpful for 1st-year Applied Science subjects.' },
];

// ---------------------------------------------------------------- seeding
async function addFile(admin: any, key: string, s: any, title: string, description: string, category: string, file: Buffer, name: string, tags: string[]) {
  const up = savePending(admin.id, file, name) as any;
  if (!up.ok) throw new Error(up.error);
  const r = createMaterial(admin, { kind: 'file', title, description, category, subjectId: s.id, fileId: up.file.fileId, tags });
  if (!r.ok) throw new Error((r as any).error);
  mark(key);
}
function addLink(admin: any, key: string, b: any) {
  const r = createMaterial(admin, { kind: 'link', ...b });
  if (!r.ok) throw new Error((r as any).error);
  mark(key);
}

/** Make whatever library items are still missing. Returns lines for the server log. */
export async function seedStudyLibrary(): Promise<string[]> {
  const adminRow = db.prepare("SELECT * FROM users WHERE role='admin' AND is_active=1 ORDER BY created_at LIMIT 1").get();
  if (!adminRow) return [];
  const admin = toSessionUser(adminRow);
  let files = 0, links = 0;
  for (const g of GENERAL) {
    if (done(g.key)) continue;
    addLink(admin, g.key, { title: g.title, description: g.description, category: 'Reference E-Book', linkUrl: g.url, tags: ['free', 'e-learning'] });
    links++;
  }
  const subjects = db.prepare('SELECT * FROM subjects ORDER BY branch, semester, code').all() as any[];
  for (const s of subjects) {
    if (SKIP.test(s.name)) continue;
    const lname = String(s.name).toLowerCase();
    const syl = SYLLABI.find((c) => c.semester === s.semester && (!c.branches || c.branches.includes(s.branch)) && (c.match.includes(lname) || c.boardCode === s.code));
    const papers = ALL_SAMPLE_SUBJECTS.find((p) => p.semester === s.semester && (p.branch === 'All' || p.branch === s.branch) && (p.code === s.code || p.name.toLowerCase() === lname));
    const k = (x: string) => `${s.id}:${x}`;
    if (syl && !done(k('plan'))) {
      await addFile(admin, k('plan'), s, `${s.name} – Unit-wise syllabus & study plan`, 'All units and topics of the UBTER syllabus with a tick list, study method and exam tips.',
        'Syllabus & Curriculum', await studyPlanPdf(s, syl), `${s.code} ${s.name} - Study plan.pdf`, ['syllabus', 'study plan']);
      files++;
    }
    if (papers && !done(k('qbank'))) {
      await addFile(admin, k('qbank'), s, `${s.name} – Solved question bank`, 'Important questions in the board exam pattern (1-mark to long answers) with model answers.',
        'Question Bank', await questionBankPdf(s, papers), `${s.code} ${s.name} - Question bank.pdf`, ['important questions', 'solved']);
      files++;
    }
    if (!done(k('video'))) {
      addLink(admin, k('video'), { subjectId: s.id, title: `${s.name} – video lectures (Hindi / English)`, category: 'Online Video / Lecture',
        description: 'Free video lectures on YouTube for this subject. Pick a playlist that follows your syllabus units.',
        linkUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${s.name} diploma polytechnic lecture`)}`, tags: ['video'] });
      links++;
    }
    const tut = TUTORIALS.find(([re]) => re.test(s.name));
    if (tut && !done(k('tutorial'))) {
      addLink(admin, k('tutorial'), { subjectId: s.id, title: `${s.name} – free online tutorial`, category: 'Reference E-Book', description: tut[2], linkUrl: tut[1], tags: ['tutorial', 'free'] });
      links++;
    }
  }
  return files || links ? [`study library: ${files} PDF(s) and ${links} link(s) added`] : [];
}
