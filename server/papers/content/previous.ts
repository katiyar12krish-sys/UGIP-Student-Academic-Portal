// Old board papers given by the college (the PDF files are in server/papers/previous/).
// They are put into the database on start-up like the sample papers, so a fresh database gets them too.
// Subject code / name follow the sample papers of the same subject, so both show together on the screen.
import type { OldAnswerKey } from '../pdf';
import { ENGLISH_1_2025 } from './old-answers/english-1-2025';
import { CHEMISTRY_1_2025 } from './old-answers/chemistry-1-2025';
import { MATHS_312301 } from './old-answers/maths-312301';
import { C_PAPERS } from './old-answers/c-papers';
import { OS_PAPERS } from './old-answers/os-papers';
import { WEB_TECH_2025 } from './old-answers/web-tech-2025';
import { CHEMISTRY_991004_2025 } from './old-answers/chemistry-991004-2025';
import { MATHS_991002_2022 } from './old-answers/maths-991002-2022';
import { DRAWING_1005_2018 } from './old-answers/drawing-1005-2018';

export interface PreviousPaper {
  file: string; title: string; examYear?: string;
  subjectCode: string; subjectName: string; branch: 'All' | 'CSE' | 'Civil'; semester: number;
  answers?: OldAnswerKey;   // model answers written by the institute (server/papers/content/old-answers)
}

export const PREVIOUS_PAPERS: PreviousPaper[] = [
  // 1st year, given by the college in November 2026 (scanned board papers)
  { file: 'applied-chemistry-1-991004-board-2025-winter.pdf', title: 'Board Paper 2025 (Winter) · old code 991004 (Applied Chemistry - I)', examYear: '2025', subjectCode: '100499', subjectName: 'Engineering Chemistry - I', branch: 'All', semester: 1, answers: CHEMISTRY_991004_2025 },
  { file: 'applied-maths-1-991002-board-2022-summer.pdf', title: 'Board Paper 2022 (Summer) · old code 991002', examYear: '2022', subjectCode: '100299', subjectName: 'Applied Mathematics - I', branch: 'All', semester: 1, answers: MATHS_991002_2022 },
  { file: 'engineering-drawing-1-1005-board-2018-winter.pdf', title: 'Board Paper 2018 (Winter) · Engineering Drawing - I, old code 1005', examYear: '2018', subjectCode: '100699', subjectName: 'Engineering Graphics - I', branch: 'All', semester: 1, answers: DRAWING_1005_2018 },
  { file: 'english-1-board-2025-winter.pdf', title: 'Board Paper 2025 (Winter) · old code 991001', examYear: '2025', subjectCode: '100199', subjectName: 'English and Communication Skills - I', branch: 'All', semester: 1, answers: ENGLISH_1_2025 },
  { file: 'chemistry-1-board-2025-winter.pdf', title: 'Board Paper 2025 (Winter)', examYear: '2025', subjectCode: '100499', subjectName: 'Engineering Chemistry - I', branch: 'All', semester: 1, answers: CHEMISTRY_1_2025 },
  { file: 'applied-maths-312301.pdf', title: 'Old Paper · Applied Mathematics (paper code 312301)', subjectCode: '200299', subjectName: 'Applied Mathematics - II', branch: 'All', semester: 2, answers: MATHS_312301 },
  { file: 'programming-in-c-board-papers.pdf', title: 'Board Papers · Programming in C (053006), several years', subjectCode: '25053001', subjectName: 'Concepts of C Programming', branch: 'CSE', semester: 3, answers: C_PAPERS },
  { file: 'operating-system-board-papers.pdf', title: 'Board Papers 2017–2025 (5 papers, code 053005)', examYear: '2017-2025', subjectCode: '25053003', subjectName: 'Operating System', branch: 'CSE', semester: 3, answers: OS_PAPERS },
  { file: 'internet-web-technology-board-papers.pdf', title: 'Board Papers 2025 (2 papers)', examYear: '2025', subjectCode: '054004', subjectName: 'Internet and Web Technology', branch: 'CSE', semester: 4, answers: WEB_TECH_2025 },
];
