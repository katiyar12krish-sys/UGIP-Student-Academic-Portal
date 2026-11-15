// Server calls for class & subject dispatch and student submissions (Step 10).
// The server decides who may send, see, submit, grade and download. Files go up first (uploadFile in materialsApi.ts) and are then attached by id.
import { call } from './academicApi';
import type { DispatchedMaterial, DispatchedSubmission } from '../types';

// Data shape: dispatch type.
export type DispatchType = DispatchedMaterial['type'];
// Data shape: dispatch view.
export type DispatchView = DispatchedMaterial & {
  fileKind?: 'pdf' | 'image' | 'doc';
  closed: boolean;            // a task whose due date (end of day, IST) has passed
  submittedCount: number;     // how many students handed in (everybody may see the number, only staff see the names)
  mine: boolean;              // sent by the signed-in person
};
// Data shape: dispatch input.
export interface DispatchInput { subjectId: string; type: DispatchType; title: string; description: string; fileId?: string; dueDate?: string; maxMarks?: number }
// Data shape: submission input.
export interface SubmissionInput { content: string; fileId?: string; keepFile?: boolean }   // keepFile: edit only the text, keep the file handed in earlier

export const dispatchApi = {
  list: () => call<DispatchView[]>('GET', '/api/dispatches'),
  create: (d: DispatchInput) => call<DispatchView>('POST', '/api/dispatches', d),
  remove: (id: string) => call<{ ok: true }>('DELETE', `/api/dispatches/${encodeURIComponent(id)}`),
  submit: (id: string, s: SubmissionInput) => call<DispatchView>('POST', `/api/dispatches/${encodeURIComponent(id)}/submissions`, s),
  /** Student: take back my own submission (before the due date, while not graded). */
  withdraw: (id: string) => call<DispatchView>('DELETE', `/api/dispatches/${encodeURIComponent(id)}/submissions/mine`),
  grade: (id: string, submissionId: string, marks: number, feedback: string) =>
    call<DispatchView>('POST', `/api/dispatches/${encodeURIComponent(id)}/submissions/${encodeURIComponent(submissionId)}/grade`, { marks, feedback }),
};

/** A file link the browser can open: the server checks the login on every request. */
export const withDownload = (url: string) => `${url}${url.includes('?') ? '&' : '?'}download=1`;
export type { DispatchedSubmission };
