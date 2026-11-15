// ===================================================================================================
// Placement preparation (ported from the sister project UGIP-Tanakpur-Portal, in this portal's style).
// -----------------------------------------------------------------------------------------------------
//   Practice / mock tests : a student starts a test of N questions from the placement bank (Aptitude,
//                           Reasoning, English, HR, own branch's technical section). The answers stay on the
//                           server until the student submits; grading is done here. Every attempt is saved.
//   Resume score (ATS)    : the resume the student uploaded in the Career Center is read on the server and
//                           scored out of 100 with an ATS keyword match and plain suggestions.
//   Placement tracker     : teachers and the admin see every student's preparation in one table
//                           (resume score, tests taken, average / best %, weakest section, drives applied).
// Who may see what:
//   student : only their own tests and resume score.      parent : their child's summary (read only).
//   faculty : students of their department's branch and of the classes they teach.      admin : everybody.
// ===================================================================================================
import crypto from 'crypto';
import fs from 'fs';
import { db } from '../db/connection';
import type { SessionUser } from '../auth/session';
import { hideSample } from '../auth/sample';
import { studentRow } from '../academic/access';
import { fileOnDisk, findFile } from '../files/store';
import { categoriesFor, questionsFor, mcqById, sectionCounts, type Branch } from './bank';
import { analyseResume, extractResumeText, type ResumeAnalysis } from './resumeAnalyzer';

db.exec(`
-- One row per placement practice / mock test a student starts (question ids fixed at the start; answers saved at submit).
CREATE TABLE IF NOT EXISTS prep_attempts (
  id TEXT PRIMARY KEY,                                                       -- id: unique id of the row
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,        -- student_id: the student (students.id)
  category TEXT NOT NULL,                                                    -- category: Aptitude / Reasoning / ... / Mixed
  mode TEXT NOT NULL CHECK (mode IN ('practice','mock')),                    -- mode: practice (no timer) or mock (timed)
  question_ids TEXT NOT NULL,                                                -- question_ids: JSON list of bank ids, in order
  answers TEXT,                                                              -- answers: JSON list of chosen option (or null = skipped)
  total INTEGER NOT NULL, correct INTEGER, wrong INTEGER, skipped INTEGER,   -- counts after grading
  score_pct REAL,                                                            -- score_pct: correct / total x 100
  time_limit_sec INTEGER,                                                    -- time_limit_sec: mock tests only
  started_at INTEGER NOT NULL, submitted_at INTEGER                          -- epoch ms; submitted_at NULL = not finished
);
CREATE INDEX IF NOT EXISTS idx_prep_attempts_student ON prep_attempts(student_id, started_at);
-- Same table as server/routes/resumes.ts (made here too so this module works on its own).
CREATE TABLE IF NOT EXISTS student_resumes (
  student_id TEXT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  file_id TEXT NOT NULL,
  uploaded_at INTEGER NOT NULL
);
-- Resume score of the CURRENT resume of a student (worked out again when a new resume is uploaded).
CREATE TABLE IF NOT EXISTS resume_scores (
  student_id TEXT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,     -- student_id: the student (students.id)
  file_id TEXT NOT NULL,                                                     -- file_id: the resume file that was scored
  score INTEGER NOT NULL, ats_score INTEGER NOT NULL,                        -- score / ats_score: 0-100
  analysis TEXT NOT NULL,                                                    -- analysis: JSON (sections, skills, suggestions)
  analysed_at INTEGER NOT NULL                                               -- when it was scored (epoch ms)
);`);

// Data shape: result.
export type Result<T = {}> = ({ ok: true } & T) | { ok: false; status: number; error: string };
// Fail.
const fail = (status: number, error: string) => ({ ok: false as const, status, error });

export const MIN_Q = 5, MAX_Q = 30, MOCK_Q = 20, MOCK_SEC_PER_Q = 60, GRACE_SEC = 120;

// The student behind a login (students only).
const myStudent = (u: SessionUser): { id: string; name: string; roll_no: string; branch: Branch; semester: number } | null =>
  u.role === 'student' && u.studentId ? studentRow(u.studentId) ?? null : null;

// Random pick of n items (crypto random, so students cannot predict the paper).
function pick<T>(list: T[], n: number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}

/** What the start screen needs: my sections and how many questions each has. */
export function prepInfo(u: SessionUser) {
  const st = myStudent(u);
  if (!st) return null;
  return { branch: st.branch, sections: sectionCounts(st.branch), minQuestions: MIN_Q, maxQuestions: MAX_Q, mockQuestions: MOCK_Q, mockMinutes: Math.round((MOCK_Q * MOCK_SEC_PER_Q) / 60) };
}

/** Start a practice test (count questions, no timer) or a mock test (20 questions, 20 minutes). Answers are NOT sent. */
export function startTest(u: SessionUser, b: any, now = Date.now()): Result<{ attempt: { id: string; category: string; mode: string; timeLimitSec: number | null; startedAt: number; questions: { id: string; question: string; options: string[] }[] } }> {
  const st = myStudent(u);
  if (!st) return fail(403, 'Only students take placement practice tests');
  const category = typeof b?.category === 'string' ? b.category : 'Mixed';
  if (category !== 'Mixed' && !(categoriesFor(st.branch) as string[]).includes(category)) return fail(400, 'Choose one of your sections');
  const mode = b?.mode === 'mock' ? 'mock' : 'practice';
  const count = mode === 'mock' ? MOCK_Q : Math.min(MAX_Q, Math.max(MIN_Q, Math.round(Number(b?.count) || 10)));
  const pool = questionsFor(st.branch, category);
  if (pool.length < count) return fail(400, 'Not enough questions in this section');
  const qs = pick(pool, count);
  const id = `prep-${crypto.randomBytes(8).toString('hex')}`;
  const limit = mode === 'mock' ? count * MOCK_SEC_PER_Q : null;
  db.prepare('INSERT INTO prep_attempts (id,student_id,category,mode,question_ids,total,time_limit_sec,started_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, st.id, category, mode, JSON.stringify(qs.map((q) => q.id)), count, limit, now);
  return { ok: true, attempt: { id, category, mode, timeLimitSec: limit, startedAt: now, questions: qs.map((q) => ({ id: q.id, question: q.question, options: q.options })) } };
}

/** Submit answers (list in question order: option index 0-3, or null = skipped). Graded here; the review shows the right answers. */
export function submitTest(u: SessionUser, attemptId: string, rawAnswers: unknown, now = Date.now()) {
  const st = myStudent(u);
  if (!st) return fail(403, 'Only students take placement practice tests');
  const a = db.prepare('SELECT * FROM prep_attempts WHERE id=?').get(String(attemptId)) as any;
  if (!a || a.student_id !== st.id) return fail(404, 'Test not found');                 // somebody else's test: not found
  if (a.submitted_at) return fail(409, 'This test is already submitted');
  if (a.time_limit_sec && now > a.started_at + (a.time_limit_sec + GRACE_SEC) * 1000) {
    // time over long ago: the test is closed with every answer counted as skipped
    rawAnswers = [];
  }
  const ids: string[] = JSON.parse(a.question_ids);
  const list = Array.isArray(rawAnswers) ? rawAnswers : [];
  const answers = ids.map((_, i) => { const v = list[i]; return Number.isInteger(v) && v >= 0 && v <= 3 ? (v as number) : null; });
  let correct = 0, wrong = 0, skipped = 0;
  const review = ids.map((qid, i) => {
    const q = mcqById(qid)!;
    const chosen = answers[i];
    const ok = chosen !== null && chosen === q.correctIndex;
    if (chosen === null) skipped++; else if (ok) correct++; else wrong++;
    return { id: qid, question: q.question, options: q.options, correctIndex: q.correctIndex, chosen, correct: ok, explanation: q.explanation };
  });
  const pct = Math.round((correct / ids.length) * 1000) / 10;
  const changed = Number(db.prepare('UPDATE prep_attempts SET answers=?, correct=?, wrong=?, skipped=?, score_pct=?, submitted_at=? WHERE id=? AND submitted_at IS NULL')
    .run(JSON.stringify(answers), correct, wrong, skipped, pct, now, a.id).changes);
  if (changed !== 1) return fail(409, 'This test is already submitted');
  return { ok: true as const, result: { id: a.id, category: a.category, mode: a.mode, total: ids.length, correct, wrong, skipped, scorePct: pct, durationSec: Math.round((now - a.started_at) / 1000), review } };
}

// Summary of the finished attempts of one student.
function statsOf(studentId: string) {
  const rows = db.prepare('SELECT category, mode, total, correct, wrong, skipped, score_pct, started_at, submitted_at, id FROM prep_attempts WHERE student_id=? AND submitted_at IS NOT NULL ORDER BY submitted_at DESC').all(studentId) as any[];
  const byCat = new Map<string, { attempts: number; sum: number; best: number }>();
  for (const r of rows) {
    const c = byCat.get(r.category) ?? { attempts: 0, sum: 0, best: 0 };
    c.attempts++; c.sum += r.score_pct; c.best = Math.max(c.best, r.score_pct);
    byCat.set(r.category, c);
  }
  const sections = [...byCat].map(([category, c]) => ({ category, attempts: c.attempts, avgPct: Math.round((c.sum / c.attempts) * 10) / 10, bestPct: c.best }));
  const weakest = sections.filter((x) => x.category !== 'Mixed').sort((a, b) => a.avgPct - b.avgPct)[0]?.category ?? null;
  return {
    attempts: rows.length,
    avgPct: rows.length ? Math.round((rows.reduce((n, r) => n + r.score_pct, 0) / rows.length) * 10) / 10 : null,
    bestPct: rows.length ? Math.max(...rows.map((r) => r.score_pct)) : null,
    mockAttempts: rows.filter((r) => r.mode === 'mock').length,
    lastAt: rows[0]?.submitted_at ?? null,
    weakest,
    sections,
    recent: rows.slice(0, 20).map((r) => ({ id: r.id, category: r.category, mode: r.mode, total: r.total, correct: r.correct, wrong: r.wrong, skipped: r.skipped, scorePct: r.score_pct, at: r.submitted_at, durationSec: Math.round((r.submitted_at - r.started_at) / 1000) })),
  };
}

/** My own history (student). */
export function myHistory(u: SessionUser) {
  const st = myStudent(u);
  return st ? statsOf(st.id) : null;
}

// ---------- resume score ----------
/** May this person see this student's resume score? The student, their parent, staff (faculty: branch / classes rule). */
export function canSeeStudent(u: SessionUser, studentId: string): boolean {
  if (u.role === 'admin') return true;
  if (u.role === 'student') return u.studentId === studentId;
  if (u.role === 'parent') return u.childIds.includes(studentId);
  if (u.role === 'faculty') { const st = studentRow(studentId); return !!st && facultySees(u, st.branch, st.semester); }
  return false;
}

// Faculty sees: their department's branch, and the classes they teach.
function facultySees(u: SessionUser, branch: string, semester: number): boolean {
  const dept = u.department || '';
  if (branch === 'CSE' ? /\bcse\b|computer/i.test(dept) : /civil/i.test(dept)) return true;
  return !!db.prepare('SELECT 1 FROM faculty_subject_assignments a JOIN subjects s ON s.id=a.subject_id WHERE a.user_id=? AND s.branch=? AND s.semester=? LIMIT 1').get(u.id, branch, semester);
}

/** The score of the student's current resume (worked out once per uploaded file, then read from the table). */
export function resumeScoreOf(studentId: string, now = Date.now()): { uploaded: false } | { uploaded: true; fileName: string; analysis: ResumeAnalysis; analysedAt: number } {
  const r = db.prepare('SELECT r.file_id FROM student_resumes r WHERE r.student_id=?').get(studentId) as any;
  const f = r ? findFile(r.file_id) : null;
  if (!r || !f) return { uploaded: false };
  const cached = db.prepare('SELECT * FROM resume_scores WHERE student_id=? AND file_id=?').get(studentId, r.file_id) as any;
  if (cached) return { uploaded: true, fileName: f.original_name, analysis: JSON.parse(cached.analysis), analysedAt: cached.analysed_at };
  const st = studentRow(studentId);
  let text = '';
  try {
    const ext = f.mime === 'application/pdf' ? 'pdf' : 'docx';
    text = extractResumeText(`resume.${ext}`, fs.readFileSync(fileOnDisk(f.id)));
  } catch { text = ''; }
  const analysis = analyseResume(text, st?.branch || 'CSE');
  db.prepare(`INSERT INTO resume_scores (student_id,file_id,score,ats_score,analysis,analysed_at) VALUES (?,?,?,?,?,?)
    ON CONFLICT(student_id) DO UPDATE SET file_id=excluded.file_id, score=excluded.score, ats_score=excluded.ats_score, analysis=excluded.analysis, analysed_at=excluded.analysed_at`)
    .run(studentId, f.id, analysis.score, analysis.atsScore, JSON.stringify(analysis), now);
  return { uploaded: true, fileName: f.original_name, analysis, analysedAt: now };
}

/** Resume score for a person who may see it; others get "not found". */
export function resumeScoreFor(u: SessionUser, studentId: string) {
  if (!studentId || !canSeeStudent(u, studentId)) return fail(404, 'Not found');
  return { ok: true as const, ...resumeScoreOf(studentId) };
}

// ---------- placement tracker (staff) ----------
/** One row per student the teacher / admin may see, with resume and test results. */
export function tracker(u: SessionUser, q: { branch?: string; semester?: number } = {}) {
  if (u.role !== 'admin' && u.role !== 'faculty') return null;
  const where = ['s.deleted_at IS NULL'], args: (string | number)[] = [];
  if (hideSample(u)) where.push('s.is_demo=0');   // sample students only for admin / CSE HOD
  if (q.branch === 'CSE' || q.branch === 'Civil') { where.push('s.branch=?'); args.push(q.branch); }
  if (Number.isInteger(q.semester)) { where.push('s.semester=?'); args.push(q.semester as number); }
  const students = (db.prepare(`SELECT s.id, s.name, s.roll_no, s.branch, s.semester FROM students s WHERE ${where.join(' AND ')} ORDER BY s.branch, s.semester, s.roll_no`).all(...args) as any[])
    .filter((s) => u.role === 'admin' || facultySees(u, s.branch, s.semester));
  const applied = new Map((db.prepare("SELECT student_id, COUNT(*) n, SUM(CASE WHEN status='Selected' THEN 1 ELSE 0 END) sel FROM placement_applications GROUP BY student_id").all() as any[]).map((r) => [r.student_id, r]));
  return students.map((s) => {
    const t = statsOf(s.id);
    const rs = resumeScoreOf(s.id);
    const ap = applied.get(s.id);
    return {
      studentId: s.id, name: s.name, rollNo: s.roll_no, branch: s.branch, semester: s.semester,
      resume: rs.uploaded ? { score: rs.analysis.score, atsScore: rs.analysis.atsScore, readable: rs.analysis.textExtracted } : null,
      tests: { attempts: t.attempts, mockAttempts: t.mockAttempts, avgPct: t.avgPct, bestPct: t.bestPct, weakest: t.weakest, lastAt: t.lastAt },
      drivesApplied: ap?.n ?? 0, selected: ap?.sel ?? 0,
      // simple readiness: resume 40 % + average test score 60 % (0 when missing)
      readiness: Math.round((rs.uploaded ? rs.analysis.score : 0) * 0.4 + (t.avgPct ?? 0) * 0.6),
    };
  });
}

/** One student's full preparation (staff, or the parent of the student). */
export function studentDetail(u: SessionUser, studentId: string) {
  if (u.role === 'student' || !canSeeStudent(u, studentId)) return fail(404, 'Not found');
  const st = studentRow(studentId);
  if (!st) return fail(404, 'Not found');
  return { ok: true as const, student: { id: st.id, name: st.name, rollNo: st.roll_no, branch: st.branch, semester: st.semester }, tests: statsOf(studentId), resume: resumeScoreOf(studentId) };
}
