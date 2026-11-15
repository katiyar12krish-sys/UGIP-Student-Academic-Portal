// Shape of the official UBTER syllabus data shown on the "Syllabus" screen (src/components/common/SyllabusViewer.tsx).
import type { SyllabusUnit } from '../types';

export interface SyllabusCourse {
  key: string;                 // stable id inside the syllabus files
  semester: number;            // 1..6
  branches?: string[];         // e.g. ['CSE']; leave out when common to all branches (1st year)
  boardCode: string;           // code printed in the UBTER booklet
  name: string;                // subject name as printed in the booklet
  credits: number;             // credit points from the booklet's study and evaluation scheme
  match: string[];             // lower-case subject names in the portal that this syllabus belongs to
  outcome?: string;            // one-line note shown above the units (optional)
  units: SyllabusUnit[];       // unitNo, unitTitle, topics[], hours (0 = not given)
}
