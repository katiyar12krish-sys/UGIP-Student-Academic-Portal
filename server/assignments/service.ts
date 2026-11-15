// ===================================================================================================
// Online tests and assignments (Step 7) - all rules in one place.
// Who may create / see a test, parsing and checking the questions, server-side grading (the answer key is
// never sent to a student before they submit), deadlines in Indian time, and reminder bookkeeping.
// The routes in server/routes/onlineTests.ts and server/routes/edits.ts only call these functions.
// ===================================================================================================
import { db } from '../db/connection';
import type { SessionUser } from '../auth/session';
import { keepRow } from '../auth/sample';
import { canTeach, studentRow, clean, newId } from '../academic/access';

// Deadlines are entered and shown in Indian time, whatever time zone the server runs in.
import { writeDenied } from '../auth/permissions';   // admin-given feature switches + cross-subject alerts
export const REMINDER_HOURS = [72, 24, 3];
const HOUR = 3600_000;
export const GRACE_MS = 2 * 60_000;        // a timed attempt started before the deadline may finish a moment after it

// Deadline at.
export const deadlineAt = (date: string, time: string): number => Date.parse(`${date}T${time}:00+05:30`);
// Valid date.
const validDate = (d: unknown): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d + 'T00:00:00Z')) && new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) === d;
// Valid time.
const validTime = (t: unknown): t is string => typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

/** Which reminder number (0-3) is due when `msLeft` remains: 1 = 72 h, 2 = 24 h, 3 = 3 h. */
export const dueReminder = (msLeft: number) =>
  msLeft <= 0 ? 0 : msLeft <= REMINDER_HOURS[2] * HOUR ? 3 : msLeft <= REMINDER_HOURS[1] * HOUR ? 2 : msLeft <= REMINDER_HOURS[0] * HOUR ? 1 : 0;

// Time left label.
export const timeLeftLabel = (msLeft: number) => {
  if (msLeft <= 0) return 'deadline passed';
  const h = Math.floor(msLeft / HOUR);
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h left` : `${h}h ${Math.floor((msLeft % HOUR) / 60000)}m left`;
};

/** Same scale the online-test screen always used. */
export const onlineGrade = (pct: number) => (pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : pct >= 40 ? 'E' : 'F');

// Data shape: question.
export interface Question { question: string; options: string[]; correctIndex: number; explanation?: string }

const TEST_SQL = `SELECT o.*, s.code AS scode, s.name AS sname FROM online_tests o JOIN subjects s ON s.id=o.subject_id WHERE o.deleted_at IS NULL`;
// Find test.
export const findTest = (id: string): any => db.prepare(TEST_SQL + ' AND o.id=?').get(id);

// Questions of.
export const questionsOf = (testId: string): Question[] =>
  (db.prepare('SELECT * FROM online_test_questions WHERE test_id=? ORDER BY idx').all(testId) as any[])
    .map((q) => ({ question: q.question, options: JSON.parse(q.options), correctIndex: q.correct_index, ...(q.explanation ? { explanation: q.explanation } : {}) }));

// Class students.
export const classStudents = (branch: string, semester: number) =>
  db.prepare('SELECT id, name, roll_no FROM students WHERE deleted_at IS NULL AND branch=? AND semester=? ORDER BY roll_no').all(branch, semester) as { id: string; name: string; roll_no: string }[];

// Pending students.
export const pendingStudents = (t: any) => {
  const done = new Set((db.prepare('SELECT student_id FROM online_test_submissions WHERE test_id=?').all(t.id) as any[]).map((r) => r.student_id));
  return classStudents(t.branch, t.semester).filter((s) => !done.has(s.id));
};

/** Faculty who should hear about this test: whoever created it, plus the teacher(s) currently assigned to the subject. */
export const teachersOf = (t: any): string[] => {
  const ids = new Set<string>([t.created_by]);
  for (const r of db.prepare('SELECT user_id FROM faculty_subject_assignments WHERE subject_id=?').all(t.subject_id) as any[]) ids.add(r.user_id);
  return [...ids].filter((id) => !!db.prepare('SELECT 1 FROM users WHERE id=? AND is_active=1').get(id));
};

// ---------- who may see / change what (subject-wise) ----------
/** Teacher of the subject, or admin. Same rule as marks and attendance. */
export const canManage = (u: SessionUser, t: { subject_id: string }) => canTeach(u, t.subject_id);

/** Students see tests of their own class (branch + semester). Parents see their child's class (read-only, no answer key). Staff: the subjects they teach (admin: all). */
export function canSee(u: SessionUser, t: any): boolean {
  if (u.role === 'admin' || u.role === 'faculty') return canManage(u, t);
  if (u.role === 'student' && u.studentId) { const s = studentRow(u.studentId); return !!s && s.branch === t.branch && s.semester === t.semester; }
  if (u.role === 'parent') return u.childIds.some((id) => { const s = studentRow(id); return !!s && s.branch === t.branch && s.semester === t.semester; });   // Step 14: read-only
  return false;
}

// ---------- shape sent to the browser ----------
const resultOf = (r: any) => ({ score: r.score, total: r.total, percentage: r.percentage, correct: r.correct, wrong: r.wrong, grade: r.grade, submittedAt: new Date(r.submitted_at).toISOString(), attempts: r.attempts });

// Converts to dto.
export function toDto(t: any, u: SessionUser, now = Date.now()) {
  const subs = db.prepare('SELECT * FROM online_test_submissions WHERE test_id=?').all(t.id) as any[];
  const staff = u.role === 'admin' || u.role === 'faculty';
  const own = u.role === 'parent' ? u.childIds : u.studentId ? [u.studentId] : [];
  const mine = !staff ? subs.filter((r) => own.includes(r.student_id)) : [];
  const shown = staff ? subs : mine;
  const qCount = (db.prepare('SELECT COUNT(*) c FROM online_test_questions WHERE test_id=?').get(t.id) as any).c;
  const status = t.status === 'active' && now > t.deadline_at ? 'expired' : t.status;
  return {
    id: t.id, title: t.title, subjectId: t.subject_id, subjectCode: t.scode, subjectName: t.sname,
    branch: t.branch, year: t.year, semester: t.semester, deadlineDate: t.deadline_date, deadlineTime: t.deadline_time,
    totalMarks: t.total_marks, description: t.description || '', assignedByFacultyName: t.created_by_name,
    submittedStudentIds: shown.map((r) => r.student_id), submittedCount: subs.length, questionCount: qCount,
    results: Object.fromEntries(shown.filter((r) => r.score !== null).map((r) => [r.student_id, resultOf(r)])),
    remindersSentCount: t.reminders_sent, reminderLog: t.reminder_log ? JSON.parse(t.reminder_log) : [], facultyAlerted: !!t.faculty_alerted,
    status,
    ...(staff ? { questions: questionsOf(t.id) } : {}),      // the answer key: staff only
  };
}

// List for.
export function listFor(u: SessionUser, now = Date.now()) {
  if (u.role !== 'admin' && u.role !== 'faculty' && !(u.role === 'student' && u.studentId) && !(u.role === 'parent' && u.childIds.length)) return [];
  return (db.prepare(TEST_SQL + ' ORDER BY o.deadline_at DESC, o.created_at DESC').all() as any[]).filter(keepRow(u)).filter((t) => canSee(u, t)).map((t) => toDto(t, u, now));
}

// ---------- create ----------
export function parseQuestions(raw: unknown): { questions: Question[]; error?: string } {
  if (raw === undefined || raw === null) return { questions: [] };
  if (!Array.isArray(raw) || raw.length > 100) return { questions: [], error: 'A test can have at most 100 questions' };
  const out: Question[] = [];
  for (let i = 0; i < raw.length; i++) {
    const q: any = raw[i];
    const text = clean(q?.question, 1000);
    const opts = Array.isArray(q?.options) ? q.options.map((o: unknown) => String(o ?? '').trim().slice(0, 300)).filter(Boolean) : [];
    if (!text) return { questions: [], error: `Question ${i + 1}: text is missing` };
    if (opts.length < 2 || opts.length > 6 || (Array.isArray(q.options) && q.options.length !== opts.length)) return { questions: [], error: `Question ${i + 1}: give 2 to 6 non-empty options` };
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= opts.length) return { questions: [], error: `Question ${i + 1}: the correct answer must be one of the options` };
    out.push({ question: text, options: opts, correctIndex: q.correctIndex, ...(clean(q.explanation, 1000) ? { explanation: clean(q.explanation, 1000)! } : {}) });
  }
  return { questions: out };
}

// Data shape: create result.
export type CreateResult = { ok: true; id: string } | { ok: false; status: number; error: string };

// Create test.
export function createTest(u: SessionUser, b: any, now = Date.now()): CreateResult {
  const sub = db.prepare('SELECT * FROM subjects WHERE id=?').get(String(b?.subjectId || '')) as any;
  if (!sub) return { ok: false, status: 400, error: 'Choose a subject' };
  { const no = writeDenied(u, sub.id, 'online_tests', 'create an online test'); if (no) return { ok: false, status: 403, error: no }; }
  const title = String(b.title ?? '').trim().slice(0, 200);
  if (!title) return { ok: false, status: 400, error: 'Title is required' };
  const total = Number(b.totalMarks);
  if (!Number.isFinite(total) || total <= 0 || total > 1000) return { ok: false, status: 400, error: 'Total marks must be between 1 and 1000' };
  if (!validDate(b.deadlineDate) || !validTime(b.deadlineTime)) return { ok: false, status: 400, error: 'Enter the deadline as a date and a time' };
  const at = deadlineAt(b.deadlineDate, b.deadlineTime);
  if (at <= now) return { ok: false, status: 400, error: 'The deadline must be in the future' };
  const pq = parseQuestions(b.questions);
  if (pq.error) return { ok: false, status: 400, error: pq.error };
  const id = newId('ot');
  db.exec('BEGIN');
  try {
    db.prepare(`INSERT INTO online_tests (id,title,subject_id,branch,year,semester,deadline_date,deadline_time,deadline_at,total_marks,description,created_by,created_by_name,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, title, sub.id, sub.branch, sub.year, sub.semester, b.deadlineDate, b.deadlineTime, at, total, clean(b.description, 2000), u.id, u.name, now);
    const ins = db.prepare('INSERT INTO online_test_questions (test_id,idx,question,options,correct_index,explanation) VALUES (?,?,?,?,?,?)');
    pq.questions.forEach((q, i) => ins.run(id, i, q.question, JSON.stringify(q.options), q.correctIndex, q.explanation ?? null));
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  return { ok: true, id };
}

// ---------- student side ----------
/** The questions a student sees while answering: no answer key, no explanation. */
export const questionsForStudent = (testId: string) => questionsOf(testId).map((q) => ({ question: q.question, options: q.options }));

// Data shape: submit result.
export type SubmitResult =
  | { ok: true; result: ReturnType<typeof resultOf>; review: (Question & { yourIndex: number | null })[] }
  | { ok: false; status: number; error: string };

/** Grades on the server. A retake keeps the better score (as before). Nothing is accepted after the deadline (plus a 2-minute grace). */
export function submit(u: SessionUser, t: any, rawAnswers: unknown, now = Date.now()): SubmitResult {
  if (u.role !== 'student' || !u.studentId) return { ok: false, status: 403, error: 'Only students submit tests' };
  if (!canSee(u, t)) return { ok: false, status: 404, error: 'Test not found' };
  if (now > t.deadline_at + GRACE_MS) return { ok: false, status: 403, error: 'The deadline has passed. This test is closed.' };
  const qs = questionsOf(t.id);
  const old = db.prepare('SELECT * FROM online_test_submissions WHERE test_id=? AND student_id=?').get(t.id, u.studentId) as any;

  if (!qs.length) {   // plain assignment: nothing to grade, the student just confirms
    if (!old) db.prepare('INSERT INTO online_test_submissions (test_id,student_id,total,submitted_at) VALUES (?,?,?,?)').run(t.id, u.studentId, t.total_marks, now);
    return { ok: true, result: resultOf(db.prepare('SELECT * FROM online_test_submissions WHERE test_id=? AND student_id=?').get(t.id, u.studentId)), review: [] };
  }
  if (!Array.isArray(rawAnswers) || rawAnswers.length > qs.length) return { ok: false, status: 400, error: 'Send one answer per question' };
  const answers: (number | null)[] = qs.map((q, i) => { const a = (rawAnswers as unknown[])[i]; return Number.isInteger(a) && (a as number) >= 0 && (a as number) < q.options.length ? (a as number) : null; });
  const correct = qs.filter((q, i) => answers[i] === q.correctIndex).length;
  const percentage = Math.round((correct / qs.length) * 100);
  const score = Math.round((correct / qs.length) * t.total_marks);
  if (!old) {
    db.prepare('INSERT INTO online_test_submissions (test_id,student_id,score,total,percentage,correct,wrong,grade,answers,submitted_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(t.id, u.studentId, score, t.total_marks, percentage, correct, qs.length - correct, onlineGrade(percentage), JSON.stringify(answers), now);
  } else if (old.score === null || score > old.score) {
    db.prepare('UPDATE online_test_submissions SET score=?,total=?,percentage=?,correct=?,wrong=?,grade=?,answers=?,attempts=attempts+1,submitted_at=? WHERE test_id=? AND student_id=?')
      .run(score, t.total_marks, percentage, correct, qs.length - correct, onlineGrade(percentage), JSON.stringify(answers), now, t.id, u.studentId);
  } else db.prepare('UPDATE online_test_submissions SET attempts=attempts+1 WHERE test_id=? AND student_id=?').run(t.id, u.studentId);
  // The review shows THIS attempt (what the student just did), with the right answers - they have submitted, so the key is no longer secret to them.
  return {
    ok: true,
    result: resultOf(db.prepare('SELECT * FROM online_test_submissions WHERE test_id=? AND student_id=?').get(t.id, u.studentId)),
    review: qs.map((q, i) => ({ ...q, yourIndex: answers[i] })),
  };
}

// ---------- one-time move of the old browser data ----------
export function importLegacy(list: any[], importer: SessionUser): { added: number; submissionsAdded: number; skipped: string[] } {
  const out = { added: 0, submissionsAdded: 0, skipped: [] as string[] };
  // Skip.
  const skip = (m: string) => { if (out.skipped.length < 25) out.skipped.push(m); };
  for (const o of list.slice(0, 2000)) {
    const sub = db.prepare('SELECT * FROM subjects WHERE (id=? OR (code=? AND branch=?))').get(String(o?.subjectId ?? ''), String(o?.subjectCode ?? ''), String(o?.branch ?? '')) as any;
    if (!sub) { skip(`online test ${o?.id}: unknown subject ${o?.subjectCode}`); continue; }
    const id = /^[A-Za-z0-9_-]{3,64}$/.test(String(o.id)) ? String(o.id) : newId('ot');
    const total = Number(o.totalMarks), title = clean(o.title, 200);
    if (!title || !Number.isFinite(total) || total <= 0 || !validDate(o.deadlineDate) || !validTime(o.deadlineTime || '23:59')) { skip(`online test ${o?.id}: invalid`); continue; }
    const pq = parseQuestions(o.questions);
    if (pq.error) { skip(`online test ${o?.id}: ${pq.error}`); continue; }
    const time = validTime(o.deadlineTime) ? o.deadlineTime : '23:59';
    const author = db.prepare("SELECT id, name FROM users WHERE role='faculty' AND is_active=1 AND name=?").get(String(o.assignedByFacultyName ?? '')) as any
      || db.prepare("SELECT u.id, u.name FROM faculty_subject_assignments a JOIN users u ON u.id=a.user_id WHERE a.subject_id=? AND u.is_active=1 LIMIT 1").get(sub.id) as any
      || { id: importer.id, name: importer.name };
    const r = db.prepare(`INSERT OR IGNORE INTO online_tests (id,title,subject_id,branch,year,semester,deadline_date,deadline_time,deadline_at,total_marks,description,created_by,created_by_name,status,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, title, sub.id, sub.branch, sub.year, sub.semester, o.deadlineDate, time, deadlineAt(o.deadlineDate, time), total, clean(o.description, 2000),
      author.id, author.name, ['active', 'expired', 'completed'].includes(o.status) ? o.status : 'active', Date.now());
    if (!Number(r.changes)) continue;   // imported earlier
    out.added++;
    const ins = db.prepare('INSERT INTO online_test_questions (test_id,idx,question,options,correct_index,explanation) VALUES (?,?,?,?,?,?)');
    pq.questions.forEach((q, i) => ins.run(id, i, q.question, JSON.stringify(q.options), q.correctIndex, q.explanation ?? null));
    for (const sid of Array.isArray(o.submittedStudentIds) ? o.submittedStudentIds : []) {
      const st = studentRow(String(sid));
      if (!st || st.branch !== sub.branch || st.semester !== sub.semester) { skip(`submission ${sid} in ${id}: student not in class`); continue; }
      const x = o.results?.[sid];
      const ok = x && Number.isFinite(x.score) && Number.isFinite(x.percentage);
      const rr = db.prepare('INSERT OR IGNORE INTO online_test_submissions (test_id,student_id,score,total,percentage,correct,wrong,grade,submitted_at) VALUES (?,?,?,?,?,?,?,?,?)')
        .run(id, st.id, ok ? x.score : null, total, ok ? x.percentage : null, ok ? (Number(x.correct) || 0) : null, ok ? (Number(x.wrong) || 0) : null, ok ? onlineGrade(x.percentage) : null, Date.now());
      out.submissionsAdded += Number(rr.changes);
    }
  }
  return out;
}

