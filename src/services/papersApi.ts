// Server calls for question papers and answer keys (server/routes/papers.ts). The server decides who may see / change what.
// A new file is sent first with uploadFile() (POST /api/files) and then attached here by its fileId.
import { call } from './academicApi';

export type PaperKind = 'sample' | 'previous' | 'model';
export interface PaperFileInfo { name: string; mime: string; size: string; url: string }
export interface QuestionPaper {
  id: string; kind: PaperKind; title: string; builtIn: boolean;
  subjectCode: string; subjectName: string; branch: 'All' | 'CSE' | 'Civil'; semester: number; examYear?: string;
  paper: PaperFileInfo;
  answer: (PaperFileInfo & { updatedBy?: string; updatedAt?: string }) | null;
  uploadedBy: string; uploadedAt: string; downloads: number;
  canEdit: boolean; canRemove: boolean;
}
export interface PaperSubject { code: string; name: string; semester: number; branch: string }
export interface NewPaperInput {
  kind: PaperKind; title?: string; subjectCode: string; subjectName: string; branch: string; semester: number; examYear?: string;
  paperFileId: string; answerFileId?: string;
}

export const papersApi = {
  list: () => call<QuestionPaper[]>('GET', '/api/question-papers'),
  subjects: () => call<PaperSubject[]>('GET', '/api/question-papers/subjects'),
  create: (p: NewPaperInput) => call<QuestionPaper>('POST', '/api/question-papers', p),
  setAnswer: (id: string, fileId: string) => call<QuestionPaper>('PUT', `/api/question-papers/${encodeURIComponent(id)}/answer`, { fileId }),
  setPaper: (id: string, fileId: string) => call<QuestionPaper>('PUT', `/api/question-papers/${encodeURIComponent(id)}/paper`, { fileId }),
  remove: (id: string) => call<{ ok: true }>('DELETE', `/api/question-papers/${encodeURIComponent(id)}`),
  restoreSamples: () => call<{ ok: true; restored: number }>('POST', '/api/question-papers/restore-samples', {}),
};

/** Open in a new tab (PDF / picture) or save (download=true). */
export const fileLink = (url: string, download: boolean) => (download ? `${url}?download=1` : url);
