// ===================================================================================================
// Placement practice question bank (MCQ), ported from the sister project UGIP-Tanakpur-Portal.
// The question files in ./qna/ build the questions from fixed seeds, so ids and answers are the same on
// every start. The answers stay on the server: a student gets them only after submitting a test.
// ===================================================================================================
import { APTITUDE_QUESTIONS } from './qna/aptitude';
import { REASONING_QUESTIONS } from './qna/reasoning';
import { ENGLISH_QUESTIONS } from './qna/english';
import { CSE_QUESTIONS } from './qna/cseTechnical';
import { CIVIL_QUESTIONS } from './qna/civilTechnical';
import { HR_GK_QUESTIONS } from './qna/hrGk';
import { CIVIL_MORE, CSE_MORE, ENGLISH_MORE, HR_MORE } from './qna/placementMore';

export type QnaCategory = 'Aptitude' | 'Reasoning' | 'English' | 'CSE Technical' | 'Civil Technical' | 'HR & Company'
  // kept so the copied question files type-check; not used in this bank
  | 'Diploma Subjects' | 'Uttarakhand GK' | 'Subject Bank' | 'India GK' | 'UBTER Syllabus' | 'CSE Subjects' | 'Civil Subjects';
export type Branch = 'CSE' | 'Civil';

// Data shape: one multiple-choice question.
export interface PlacementMcq {
  id: string; category: QnaCategory; subject?: string; branch?: Branch;
  question: string; options: string[]; correctIndex: number; explanation: string;
}

/** Sections every student sees, and the technical section of each branch. */
export const COMMON_CATEGORIES: QnaCategory[] = ['Aptitude', 'Reasoning', 'English', 'HR & Company'];
export const BRANCH_CATEGORY: Record<Branch, QnaCategory> = { CSE: 'CSE Technical', Civil: 'Civil Technical' };
const SECTION_SIZE: Partial<Record<QnaCategory, number>> = { Aptitude: 800, Reasoning: 600, English: 500, 'HR & Company': 300, 'CSE Technical': 800, 'Civil Technical': 1000 };

const RAW: PlacementMcq[] = [...APTITUDE_QUESTIONS, ...REASONING_QUESTIONS, ...ENGLISH_QUESTIONS, ...CSE_QUESTIONS, ...CIVIL_QUESTIONS, ...HR_GK_QUESTIONS];

/** One section: questions of the category plus the extra ones, same text only once, trimmed to its size. */
function section(category: QnaCategory, more: PlacementMcq[] = [], branch?: Branch): PlacementMcq[] {
  const seen = new Set<string>();
  const out: PlacementMcq[] = [];
  for (const q of [...RAW.filter((x) => x.category === category), ...more.map((x) => ({ ...x, category }))]) {
    if (seen.has(q.question) || q.options.length !== 4 || q.correctIndex < 0) continue;
    seen.add(q.question);
    out.push(branch ? { ...q, branch } : q);
  }
  const size = SECTION_SIZE[category];
  return size ? out.slice(0, size) : out;
}

export const BANK: PlacementMcq[] = [
  ...section('Aptitude'),
  ...section('Reasoning'),
  ...section('English', ENGLISH_MORE),
  ...section('HR & Company', HR_MORE),
  ...section('CSE Technical', CSE_MORE, 'CSE'),
  ...section('Civil Technical', CIVIL_MORE, 'Civil'),
];
const BY_ID = new Map(BANK.map((q) => [q.id, q]));
export const mcqById = (id: string) => BY_ID.get(id);

/** Sections a student of this branch practises. */
export const categoriesFor = (branch: Branch): QnaCategory[] => [...COMMON_CATEGORIES, BRANCH_CATEGORY[branch]];
/** Questions of one section (or 'Mixed' = all of the student's sections). */
export const questionsFor = (branch: Branch, category: string): PlacementMcq[] =>
  category === 'Mixed' ? BANK.filter((q) => !q.branch || q.branch === branch) : BANK.filter((q) => q.category === category && (!q.branch || q.branch === branch));
/** How many questions each section has (for the start screen). */
export const sectionCounts = (branch: Branch) => categoriesFor(branch).map((c) => ({ category: c, count: questionsFor(branch, c).length }));
