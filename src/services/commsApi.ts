// Server calls for notices, one-to-one notices and doubts (Step 8). The server decides who may see or do what:
// a teacher publishes only to classes they teach, a doubt is visible only to the student and the teachers of that subject.
import { call } from './academicApi';
import type { NoticeAnnouncement, DirectStudentNotice, StudentDoubtTicket } from '../types';

// Data shape: notice input.
export type NoticeInput = Pick<NoticeAnnouncement, 'title' | 'category' | 'priority' | 'content' | 'pdfAttachment' | 'targetBranch' | 'targetSemesters'> & { publishedBy?: string };
// Data shape: notice view.
export type NoticeView = NoticeAnnouncement & { mine?: boolean };
// Data shape: direct notice input.
export interface DirectNoticeInput { studentId: string; title: string; message: string; priority: DirectStudentNotice['priority'] }
// Data shape: doubt input.
export interface DoubtInput { subjectId: string; questionTitle: string; questionDetails: string }

export const noticesApi = {
  publicList: () => call<NoticeView[]>('GET', '/api/public/notices'),
  list: () => call<NoticeView[]>('GET', '/api/notices'),
  create: (n: NoticeInput) => call<NoticeView>('POST', '/api/notices', n),
  remove: (id: string) => call<{ ok: true }>('DELETE', `/api/notices/${encodeURIComponent(id)}`),
};

export const directNoticesApi = {
  list: () => call<DirectStudentNotice[]>('GET', '/api/direct-notices'),
  send: (n: DirectNoticeInput) => call<DirectStudentNotice>('POST', '/api/direct-notices', n),
  markRead: (id: string) => call<{ ok: true }>('POST', `/api/direct-notices/${encodeURIComponent(id)}/read`, {}),
};

export const doubtsApi = {
  list: () => call<StudentDoubtTicket[]>('GET', '/api/doubts'),
  ask: (d: DoubtInput) => call<StudentDoubtTicket>('POST', '/api/doubts', d),
  reply: (id: string, text: string) => call<StudentDoubtTicket>('POST', `/api/doubts/${encodeURIComponent(id)}/replies`, { text }),
  resolve: (id: string) => call<StudentDoubtTicket>('POST', `/api/doubts/${encodeURIComponent(id)}/resolve`, {}),
  /** Student: correct my own question while no teacher has answered. */
  editMine: (id: string, d: { questionTitle: string; questionDetails: string }) => call<StudentDoubtTicket>('PUT', `/api/doubts/${encodeURIComponent(id)}/mine`, d),
  /** Delete my own reply (admin: any reply). */
  removeReply: (id: string, replyId: string) => call<StudentDoubtTicket>('DELETE', `/api/doubts/${encodeURIComponent(id)}/replies/${encodeURIComponent(replyId)}`),
};

// Data shape: action result.
export type ActionResult = { ok: true } | { ok: false; error: string };
