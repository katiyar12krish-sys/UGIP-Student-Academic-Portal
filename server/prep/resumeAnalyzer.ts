// ===================================================================================================
// Resume score + ATS (keyword / format) match, ported from the sister project UGIP-Tanakpur-Portal.
// Reads the text of a PDF / DOCX resume without extra npm packages and scores it out of 100 with plain
// suggestions. Scanned (photo) resumes have no text and get 0 with a hint to upload a text resume.
// ===================================================================================================
// Data shape: the analysis shown to the student and the placement cell.
export interface ResumeAnalysis {
  score: number; atsScore: number; wordCount: number;
  sectionsFound: string[]; sectionsMissing: string[]; skillsFound: string[];
  hasEmail: boolean; hasPhone: boolean; hasLinkedIn: boolean; actionVerbs: number;
  strengths: string[]; suggestions: string[]; textExtracted: boolean;
}
import zlib from 'node:zlib';

// ---------- text extraction (no extra npm packages) ----------

/** DOCX = zip; read word/document.xml and strip tags. */
function docxText(buf: Buffer): string {
  let i = 0;
  while ((i = buf.indexOf('PK\x03\x04', i, 'binary')) !== -1) {
    const method = buf.readUInt16LE(i + 8);
    const compSize = buf.readUInt32LE(i + 18);
    const nameLen = buf.readUInt16LE(i + 26);
    const extraLen = buf.readUInt16LE(i + 28);
    const name = buf.toString('utf8', i + 30, i + 30 + nameLen);
    const start = i + 30 + nameLen + extraLen;
    if (name === 'word/document.xml') {
      const raw = buf.subarray(start, start + compSize);
      const xml = (method === 8 ? zlib.inflateRawSync(raw) : raw).toString('utf8');
      return xml
        .replace(/<\/w:p>/g, '\n')
        .replace(/<w:tab\/>/g, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
    }
    i = start;
  }
  return '';
}

/** Best-effort PDF text: inflate content streams and read Tj / TJ strings. Works for most generated resumes. */
function pdfText(buf: Buffer): string {
  const out: string[] = [];
  const src = buf.toString('latin1');
  const re = /stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const start = m.index + m[0].length;
    const end = src.indexOf('endstream', start);
    if (end < 0) break;
    let chunk: string;
    try {
      chunk = zlib.inflateSync(buf.subarray(start, end)).toString('latin1');
    } catch {
      chunk = src.slice(start, end);
    }
    const strings = chunk.match(/\((?:\\.|[^\\)])*\)\s*Tj|\[(?:[^\]])*\]\s*TJ/g) || [];
    for (const s of strings) {
      const parts = s.match(/\((?:\\.|[^\\)])*\)/g) || [];
      out.push(parts.map(p => p.slice(1, -1).replace(/\\([()\\])/g, '$1')).join(''));
    }
    re.lastIndex = end;
  }
  return out.join(' ');
}

export function extractResumeText(fileName: string, buf: Buffer): string {
  const ext = fileName.toLowerCase().split('.').pop();
  try {
    if (ext === 'docx') return docxText(buf);
    if (ext === 'pdf') return pdfText(buf);
    if (ext === 'txt' || ext === 'md') return buf.toString('utf8');
  } catch {
    /* fall through */
  }
  return '';
}

// ---------- scoring ----------

const SECTIONS: Array<[string, RegExp]> = [
  ['Career Objective', /objective|summary|profile/i],
  ['Education', /education|qualification|diploma|polytechnic|10th|12th|high school/i],
  ['Skills', /skills|technical skills|competenc/i],
  ['Projects', /project/i],
  ['Training / Internship', /internship|training|apprentice|experience/i],
  ['Certifications', /certificat|course|nptel|coursera|udemy/i],
  ['Achievements', /achievement|award|activities|extra.?curricular|hobbies/i],
];

const SKILLS: Record<string, string[]> = {
  CSE: ['c', 'c++', 'java', 'python', 'javascript', 'html', 'css', 'react', 'node', 'sql', 'mysql', 'mongodb', 'dbms', 'networking', 'ccna', 'linux', 'git', 'data structures', 'oops', 'excel', 'php', 'android', 'hardware', 'troubleshooting'],
  Civil: ['autocad', 'staad', 'revit', 'surveying', 'total station', 'estimation', 'costing', 'concrete', 'rcc', 'quantity', 'site supervision', 'levelling', 'drawing', 'boq', 'ms project', 'gis', 'soil', 'excel'],
  Common: ['communication', 'teamwork', 'leadership', 'ms office', 'problem solving', 'time management'],
};

const ACTION_VERBS = /\b(developed|built|designed|created|implemented|managed|led|organised|organized|supervised|improved|completed|prepared|analysed|analyzed|tested|deployed|coordinated|achieved|trained)\b/gi;

export function analyseResume(text: string, department: string): ResumeAnalysis {
  const t = text.replace(/\s+/g, ' ').trim();
  const lower = t.toLowerCase();
  const words = t ? t.split(' ').length : 0;
  const textExtracted = words >= 30;

  const isCivil = /civil/i.test(department);
  const skillList = [...(isCivil ? SKILLS.Civil : SKILLS.CSE), ...SKILLS.Common];
  const skillsFound = skillList.filter(s => {
    const esc = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z])${esc}([^a-z+]|$)`, 'i').test(lower);
  });

  const sectionsFound = SECTIONS.filter(([, re]) => re.test(t)).map(([n]) => n);
  const sectionsMissing = SECTIONS.map(([n]) => n).filter(n => !sectionsFound.includes(n));
  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.]+/.test(t);
  const hasPhone = /(\+91[\s-]?)?[6-9]\d{9}\b/.test(t.replace(/[\s-]/g, ''));
  const hasLinkedIn = /linkedin\.com|github\.com/i.test(t);
  const actionVerbs = (t.match(ACTION_VERBS) || []).length;

  // 100 points
  let score = 0;
  score += Math.round((sectionsFound.length / SECTIONS.length) * 35); // structure
  score += Math.min(25, skillsFound.length * 2.5); // skills
  score += (hasEmail ? 5 : 0) + (hasPhone ? 5 : 0) + (hasLinkedIn ? 5 : 0); // contact
  score += Math.min(10, actionVerbs * 2); // impact words
  score += words >= 200 && words <= 800 ? 15 : words >= 120 ? 8 : words > 800 ? 10 : 0; // length
  score = textExtracted ? Math.min(100, Math.round(score)) : 0;

  const atsScore = textExtracted
    ? Math.min(100, Math.round((skillsFound.length / Math.min(12, skillList.length)) * 70 + (sectionsFound.length >= 5 ? 30 : sectionsFound.length * 5)))
    : 0;

  const strengths: string[] = [];
  const suggestions: string[] = [];
  if (!textExtracted) {
    suggestions.push(
      words === 0
        ? 'Text could not be read. Upload a text-based PDF or DOCX (not a scanned photo) so it can be analysed.'
        : `Your resume has only ${words} words. A good one-page diploma resume has about 250–500 words: use one of the sample resumes below as a guide.`
    );
  } else {
    if (skillsFound.length >= 8) strengths.push(`Good skill coverage (${skillsFound.length} relevant skills).`);
    if (sectionsFound.length >= 6) strengths.push('Well structured – most standard sections present.');
    if (actionVerbs >= 4) strengths.push('Uses action words (developed, managed …).');
    if (hasLinkedIn) strengths.push('LinkedIn / GitHub link included.');
    sectionsMissing.forEach(s => suggestions.push(`Add a "${s}" section.`));
    if (skillsFound.length < 6) suggestions.push(`Mention more ${isCivil ? 'civil tools (AutoCAD, STAAD Pro, surveying, estimation)' : 'technical skills (Python/Java, SQL, HTML/CSS, networking)'}.`);
    if (!hasEmail || !hasPhone) suggestions.push('Put email and mobile number at the top.');
    if (!hasLinkedIn) suggestions.push('Add a LinkedIn (and GitHub for CSE) profile link.');
    if (actionVerbs < 3) suggestions.push('Start project / training points with action verbs: Developed, Designed, Supervised …');
    if (words < 200) suggestions.push('Resume is too short – describe 2-3 projects and your training in 2 lines each.');
    if (words > 800) suggestions.push('Resume is long – keep it to 1 page for diploma placements.');
  }

  return { score, atsScore, wordCount: words, sectionsFound, sectionsMissing, skillsFound, hasEmail, hasPhone, hasLinkedIn, actionVerbs, strengths, suggestions, textExtracted };
}
