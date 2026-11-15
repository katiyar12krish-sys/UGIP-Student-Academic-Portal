// Assignments / online tests on the server. The server decides who may see or change what:
// a teacher only handles the subjects assigned to them, a student only sees their own class and never receives the answer key before submitting.
import { call } from './academicApi';
import type { OnlineTestAssignment, TestQuestion, TestResult } from '../types';

// Data shape: new online test.
export interface NewOnlineTest { title: string; subjectId: string; deadlineDate: string; deadlineTime: string; totalMarks: number; description: string; questions: TestQuestion[] }
// Data shape: review item.
export interface ReviewItem extends TestQuestion { yourIndex: number | null }
// Data shape: submit response.
export interface SubmitResponse { result: TestResult; review: ReviewItem[]; test: OnlineTestAssignment }
// Data shape: remind response.
export interface RemindResponse { pending: number; sentCount: number; targetStudents: string[] }

export const assignmentsApi = {
  list: () => call<OnlineTestAssignment[]>('GET', '/api/online-tests'),
  create: (t: NewOnlineTest) => call<OnlineTestAssignment>('POST', '/api/online-tests', t),
  questions: (id: string) => call<{ questions: { question: string; options: string[] }[] }>('GET', `/api/online-tests/${encodeURIComponent(id)}/questions`),
  submit: (id: string, answers: (number | null)[]) => call<SubmitResponse>('POST', `/api/online-tests/${encodeURIComponent(id)}/submit`, { answers }),
  remind: (id: string) => call<RemindResponse>('POST', `/api/online-tests/${encodeURIComponent(id)}/remind`, {}),
};
