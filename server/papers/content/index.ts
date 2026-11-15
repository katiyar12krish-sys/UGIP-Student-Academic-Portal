// All built-in sample papers. Add a new subject file here and it is created on the next server start.
import type { SubjectPapers } from './types';
import { SEM1 } from './sem1';
import { SEM2 } from './sem2';
import { CSE_SEM3 } from './cseSem3';
import { CSE_SEM5 } from './cseSem5';

export const ALL_SAMPLE_SUBJECTS: SubjectPapers[] = [...SEM1, ...SEM2, ...CSE_SEM3, ...CSE_SEM5];
