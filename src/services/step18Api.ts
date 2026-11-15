// =====================================================================================================
// Browser-side calls for Step 18 (server code: server/routes/practicals.ts, academicYear.ts, edits.ts)
// -----------------------------------------------------------------------------------------------------
// Every function returns { ok: true, data } or { ok: false, error } (see `call` in academicApi.ts), so a screen
// can simply do:   const r = await practicalsApi.remove(id); if (!r.ok) notify.error(r.error);
// The server checks every permission again; hiding a button in the screen is only for convenience.
// =====================================================================================================
import { call } from './academicApi';
import type { PracticalExperiment, TestExam } from '../types';

// ---------------- types shared by the screens ----------------
export interface PracticalRecordRow {
  studentId: string; rollNo: string; name: string;
  status: 'Completed' | 'Pending' | 'Absent' | 'Needs Revision' | null;   // null = nothing entered yet
  marks: number | null; remarks: string; updatedBy: string | null; updatedAt: string | null; maxMarks: number;
}
// Data shape: server practical.
export type ServerPractical = PracticalExperiment & { academicYear: string; isDemo: boolean };

// Data shape: board result subject.
export interface BoardResultSubject {
  code: string; name: string | null; theory: number | null; practical: number | null;
  theoryNote?: string | null; practicalNote?: string | null; grade: string | null; gradePoint: number | null;
}
// Data shape: board result.
export interface BoardResult {
  id: string; studentId: string; rollNo: string; studentName: string; fatherName: string | null; dob: string | null; branch: string;
  semester: number; examSession: string; theoryTotal: number | null; practicalTotal: number | null; gp: number | null; ie: number | null;
  semTotal: number | null; maxTotal: number | null; percentage: number | null; sgpa: number | null; result: string | null;
  promoted: boolean | null; backPapers: string | null; remarks: string | null; isDemo: boolean; subjects: BoardResultSubject[]; updatedAt: string;
}
// Data shape: promotion plan row.
export interface PromotionPlanRow {
  id: string; rollNo: string; name: string; branch: string; year: number; semester: number; status: string;
  toYear?: number; toSemester?: number; toStatus?: string; reason?: string;
}
// Data shape: calendar status.
export interface CalendarStatus {
  academicYear: string; semesterHalf: 'odd' | 'even'; promotionTarget: string; promotionDate: string; autoEnabled: boolean;
  promotionDoneFor: string | null; semesterSwitchDoneFor: string | null;
  classes: { branch: string; year: number; semester: number; students: number }[];
  notMoving: { status: string; students: number }[];
  history: { id: string; academicYear: string; branch: string | null; fromYear: number | null; mode: string; moved: number; runBy: string; runAt: string; undoneAt: string | null; undoneBy: string | null }[];
}
// Data shape: demo counts.
export interface DemoCounts { students: number; exams: number; attendanceSessions: number; practicals: number; assignments: number; boardResults: number; createdAt: string | null }

const enc = encodeURIComponent;
// Qs.
const qs = (o: Record<string, string | number | undefined | null>) => {
  const p = Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${k}=${enc(String(v))}`);
  return p.length ? '?' + p.join('&') : '';
};

// ---------------- practicals ----------------
export const practicalsApi = {
  list: (academicYear?: string) => call<ServerPractical[]>('GET', '/api/practicals' + qs({ academicYear })),
  create: (p: Partial<PracticalExperiment>) => call<ServerPractical>('POST', '/api/practicals', p),
  update: (id: string, p: Partial<PracticalExperiment>) => call<ServerPractical>('PUT', `/api/practicals/${enc(id)}`, p),
  remove: (id: string) => call<{ ok: true }>('DELETE', `/api/practicals/${enc(id)}`),
  records: (id: string) => call<PracticalRecordRow[]>('GET', `/api/practicals/${enc(id)}/records`),
  saveRecords: (id: string, records: { studentId: string; status?: string; marks: number | null; remarks?: string }[]) =>
    call<{ ok: true; saved: number }>('PUT', `/api/practicals/${enc(id)}/records`, { records }),
  removeRecord: (id: string, studentId: string) => call<{ ok: true }>('DELETE', `/api/practicals/${enc(id)}/records/${enc(studentId)}`),
};

// ---------------- academic year + promotion + sample data ----------------
export const academicYearApi = {
  calendar: () => call<CalendarStatus>('GET', '/api/academic/calendar'),
  preview: (branch?: string, fromYear?: number) => call<{ target: string; move: PromotionPlanRow[]; skip: PromotionPlanRow[] }>('GET', '/api/academic/promotion/preview' + qs({ branch, fromYear })),
  promote: (b: { branch?: string; fromYear?: number; excludeIds?: string[] }) => call<{ ok: true; moved: number; skipped: number; target: string; message: string }>('POST', '/api/academic/promotion', b),
  semesterSwitch: () => call<{ ok: true; moved: number; message: string }>('POST', '/api/academic/semester-switch', {}),
  undo: () => call<{ ok: true; restored: number; message: string }>('POST', '/api/academic/promotion/undo', {}),
  classHistory: (studentId: string) => call<{ academicYear: string; branch: string; year: number; semester: number; status: string }[]>('GET', `/api/academic/class-history/${enc(studentId)}`),
  demoCounts: () => call<DemoCounts>('GET', '/api/admin/demo-data'),
  removeDemo: () => call<{ ok: true; message: string }>('DELETE', '/api/admin/demo-data'),
};

// ---------------- UBTER board results ----------------
export const boardResultsApi = {
  list: (f: { branch?: string; semester?: number; session?: string; studentId?: string } = {}) => call<BoardResult[]>('GET', '/api/board-results' + qs(f)),
  create: (r: Partial<BoardResult>) => call<BoardResult>('POST', '/api/board-results', r),
  update: (id: string, r: Partial<BoardResult>) => call<BoardResult>('PUT', `/api/board-results/${enc(id)}`, r),
  remove: (id: string) => call<{ ok: true }>('DELETE', `/api/board-results/${enc(id)}`),
};

// ---------------- edit / delete added in Step 18 for older features ----------------
export const editsApi = {
  updateTest: (id: string, t: Partial<TestExam>) => call<TestExam>('PUT', `/api/tests/${enc(id)}`, t),
  updateAttendanceSession: (id: string, s: { date?: string; timeSlot?: string; topicTaught?: string }) => call<{ ok: true }>('PUT', `/api/attendance/sessions/${enc(id)}`, s),
  deleteAttendanceSession: (id: string) => call<{ ok: true }>('DELETE', `/api/attendance/sessions/${enc(id)}`),
  updateOnlineTest: (id: string, t: Record<string, unknown>) => call<any>('PUT', `/api/online-tests/${enc(id)}`, t),
  deleteOnlineTest: (id: string) => call<{ ok: true }>('DELETE', `/api/online-tests/${enc(id)}`),
  updateNotice: (id: string, n: Record<string, unknown>) => call<any>('PUT', `/api/notices/${enc(id)}`, n),
  updateDirectNotice: (id: string, n: { title?: string; message?: string; priority?: string }) => call<any>('PUT', `/api/direct-notices/${enc(id)}`, n),
  deleteDirectNotice: (id: string) => call<{ ok: true }>('DELETE', `/api/direct-notices/${enc(id)}`),
  deleteDoubt: (id: string) => call<{ ok: true }>('DELETE', `/api/doubts/${enc(id)}`),
  updateDispatch: (id: string, d: { title?: string; description?: string; dueDate?: string; maxMarks?: number }) => call<any>('PUT', `/api/dispatches/${enc(id)}`, d),
  updateDrive: (id: string, d: Record<string, unknown>) => call<any>('PUT', `/api/placement/drives/${enc(id)}`, d),
  updateJob: (id: string, j: Record<string, unknown>) => call<any>('PUT', `/api/placement/jobs/${enc(id)}`, j),
};
