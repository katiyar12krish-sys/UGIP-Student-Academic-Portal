// Server calls for subjects, exams/marks and attendance. The server decides who may do what
// (a faculty member can only write marks / attendance for the subjects assigned to them).
import type { TestExam, AttendanceSession, Subject } from '../types';

// Data shape: api result.
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

// Call.
export async function call<T>(method: string, url: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method, credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, error: json?.error || `Request failed (${res.status})` };
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, status: 0, error: 'Cannot reach the server. Check your connection.' };
  }
}

// Data shape: server subject.
export interface ServerSubject { id: string; code: string; name: string; branch: string; semester: number; year: number; credits: number; hasPractical: boolean; facultyIds: string[]; facultyId: string; facultyName: string }
// Data shape: mark input.
export interface MarkInput { studentId: string; marksObtained: number; remarks?: string }
// Data shape: mark result.
export type MarkResult = { success: boolean; message: string; session?: AttendanceSession; student?: { id: string; name: string; rollNo: string } };

export const academicApi = {
  subjects: () => call<ServerSubject[]>('GET', '/api/subjects'),
  createSubject: (s: Partial<Subject>) => call<ServerSubject>('POST', '/api/subjects', s),
  updateSubject: (id: string, s: Partial<Subject>) => call<ServerSubject>('PUT', `/api/subjects/${encodeURIComponent(id)}`, s),
  deleteSubject: (id: string) => call<{ ok: true }>('DELETE', `/api/subjects/${encodeURIComponent(id)}`),

  tests: () => call<TestExam[]>('GET', '/api/tests'),
  createTest: (t: Partial<TestExam>) => call<TestExam>('POST', '/api/tests', t),
  deleteTest: (id: string) => call<{ ok: true }>('DELETE', `/api/tests/${encodeURIComponent(id)}`),
  saveMarks: (testId: string, marks: MarkInput[]) => call<TestExam>('PUT', `/api/tests/${encodeURIComponent(testId)}/marks`, { marks }),
  deleteMark: (testId: string, studentId: string) => call<{ ok: true }>('DELETE', `/api/tests/${encodeURIComponent(testId)}/marks/${encodeURIComponent(studentId)}`),

  sessions: () => call<AttendanceSession[]>('GET', '/api/attendance/sessions'),
  attendanceSummary: () => call<{ studentId: string; total: number; attended: number; percent: number | null }[]>('GET', '/api/attendance/summary'),
  openSession: (s: { subjectId: string; timeSlot?: string; topicTaught?: string; date?: string }) => call<AttendanceSession>('POST', '/api/attendance/sessions', s),
  closeSession: (id: string) => call<AttendanceSession>('POST', `/api/attendance/sessions/${encodeURIComponent(id)}/close`, {}),
  punch: (code: string) => call<MarkResult>('POST', '/api/attendance/mark', { code }),
  setRecord: (sessionId: string, studentId: string, status: 'Present' | 'Absent' | 'Late') =>
    call<AttendanceSession>('POST', `/api/attendance/sessions/${encodeURIComponent(sessionId)}/records`, { studentId, status }),
  scan: (sessionId: string, data: string) => call<MarkResult>('POST', `/api/attendance/sessions/${encodeURIComponent(sessionId)}/scan`, { data }),

  importLegacy: (payload: unknown) => call<{ subjectsAdded: number; testsAdded: number; marksAdded: number; sessionsAdded: number; recordsAdded: number; onlineTestsAdded?: number; onlineSubmissionsAdded?: number; skipped: string[] }>('POST', '/api/admin/import-legacy', payload),
};
