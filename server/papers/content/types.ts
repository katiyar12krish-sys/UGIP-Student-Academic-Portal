// ===================================================================================================
// Shape of the built-in sample question papers (server/papers/content/*.ts), in the UBTER board pattern
// (Diploma Semester Examination, 2½ hours, questions numbered 1-26 across three sections):
//   1st year (50 marks): Section A any 10 of 12 × 1 · Section B any 5 of 7 × 3 · Section C any 5 of 7 × 5
//   2nd / 3rd year (70 marks): Section A any 10 of 12 × 1 · Section B any 5 of 7 × 5 · Section C any 5 of 7 × 7
// Every question has a model answer, printed in the separate answer-key PDF.
// To change a question: edit the text here and restart the server. Only papers whose text changed are rebuilt,
// and an answer key that a teacher replaced by hand is never overwritten.
// ===================================================================================================

/** One question and its model answer. Use "\n" for a new line; lines starting with two spaces are indented. */
export interface PaperItem { q: string; a: string }

/** One section: "Attempt any <pick> questions", <each> marks per question. */
export interface PaperSection { pick: number; each: number; items: PaperItem[] }

export interface SamplePaper { set: 'A' | 'B'; sections: PaperSection[] }

export interface SubjectPapers {
  key: string;          // same key as the syllabus course (src/data/syllabus*.ts)
  semester: number;     // 1..6
  branch: 'All' | 'CSE' | 'Civil';
  code: string;         // board subject code from the syllabus booklet
  name: string;         // subject name
  papers: SamplePaper[];
}

type QA = [string, string];
/** Short way to write one section: sec(pick, marksEach, [[question, answer], ...]). */
export const sec = (pick: number, each: number, items: QA[]): PaperSection => ({ pick, each, items: items.map(([q, a]) => ({ q, a })) });

/** 1st-year paper, 50 marks: A 12 short (1 mark, any 10) · B 7 (3 marks, any 5) · C 7 (5 marks, any 5). */
export const year1 = (set: 'A' | 'B', a: QA[], b: QA[], c: QA[]): SamplePaper => ({ set, sections: [sec(10, 1, a), sec(5, 3, b), sec(5, 5, c)] });
/** 2nd / 3rd-year paper, 70 marks: A 12 short (1 mark, any 10) · B 7 (5 marks, any 5) · C 7 (7 marks, any 5). */
export const senior = (set: 'A' | 'B', a: QA[], b: QA[], c: QA[]): SamplePaper => ({ set, sections: [sec(10, 1, a), sec(5, 5, b), sec(5, 7, c)] });
