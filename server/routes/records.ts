// =====================================================================================================
// Server storage for the features that used to live ONLY in one browser (Step 20)
// -----------------------------------------------------------------------------------------------------
// Before this step, these lists were kept in the browser's localStorage: they were lost when the browser
// data was cleared and were not visible on another phone / computer. Now each one has its own database
// table (created below, with comments) and is kept for years like everything else:
//
//   collection          table                 what it holds
//   timetable           timetable_slots       class timetable periods
//   staff_attendance    staff_attendance      faculty gate punch-in / punch-out (staff gate register)
//   question_papers     question_papers       previous-year UBTER question papers (details)
//   shared_experiences  shared_experiences    interview / placement experiences shared by students and alumni
//   practice_quizzes    practice_quizzes      subject practice quizzes (MCQ) made by teachers
//   quiz_attempts       quiz_attempts         a student's score in a practice quiz
//   progress_points     progress_points       points of the student progress graph
//   mock_interviews     mock_interviews       mock interview results of a student
//   activity_logs       activity_logs         the screen activity log shown to the admin
//
// Each row keeps the most-used fields in their own columns (for searching and permissions) plus the full
// item as JSON in "data", so the screens get back exactly what they saved.
//
// Routes (every request is checked against the rules in COLLECTIONS below):
//   GET    /api/records/:collection          list what this user may see
//   PUT    /api/records/:collection/:id      add or change one item
//   DELETE /api/records/:collection/:id      delete one item
// =====================================================================================================
import { Router } from 'express';
import { db } from '../db/connection';
import { requireAuth } from '../auth/middleware';
import { audit } from '../auth/service';
import type { SessionUser } from '../auth/session';

export const recordsRouter = Router();

// ---------------- the tables (created on every start; "IF NOT EXISTS" keeps existing data) ----------------
db.exec(`
-- Class timetable: one row per period of a class (branch + semester + day + period number).
CREATE TABLE IF NOT EXISTS timetable_slots (
  id TEXT PRIMARY KEY,                      -- id made by the screen, e.g. tt-1731234567890
  branch TEXT,                              -- CSE / Civil
  semester INTEGER,                         -- 1..6
  day TEXT,                                 -- Monday..Saturday
  data TEXT NOT NULL,                       -- the full period as JSON (subject, teacher, room, time ...)
  created_by TEXT,                          -- username of the person who added it
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,   -- created_at: when the row was made
  updated_at TEXT   -- updated_at: last change
);
CREATE INDEX IF NOT EXISTS idx_timetable_class ON timetable_slots(branch, semester);

-- Staff gate register: a faculty member's punch-in / punch-out of one day.
CREATE TABLE IF NOT EXISTS staff_attendance (
  id TEXT PRIMARY KEY,   -- id: unique id of the row
  faculty_id TEXT,                          -- users.id of the faculty member
  date TEXT,                                -- YYYY-MM-DD
  data TEXT NOT NULL,                       -- full punch as JSON (in time, out time, method, location ...)
  created_by TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT   -- created_by: username who made it · created_at: when the row was made · updated_at: last change
);
CREATE INDEX IF NOT EXISTS idx_staff_att_fac ON staff_attendance(faculty_id, date);

-- Previous-year question papers (the details shown in the "UBTER Papers" screen).
CREATE TABLE IF NOT EXISTS question_papers (
  id TEXT PRIMARY KEY,   -- id: unique id of the row
  branch TEXT, semester INTEGER,   -- branch: CSE or Civil · semester: semester 1-6
  subject_code TEXT,                        -- e.g. 053006
  data TEXT NOT NULL,                       -- full paper record as JSON (title, year, session, questions ...)
  created_by TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT   -- created_by: username who made it · created_at: when the row was made · updated_at: last change
);

-- Interview / placement experiences written by students or alumni.
CREATE TABLE IF NOT EXISTS shared_experiences (
  id TEXT PRIMARY KEY,   -- id: unique id of the row
  author_id TEXT,                           -- users.id of the writer (only they, faculty or admin may change it)
  data TEXT NOT NULL,                       -- full story as JSON (company, role, text, likes ...)
  created_by TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT   -- created_by: username who made it · created_at: when the row was made · updated_at: last change
);

-- Practice quizzes (MCQ) that teachers make for a subject.
CREATE TABLE IF NOT EXISTS practice_quizzes (
  id TEXT PRIMARY KEY,   -- id: unique id of the row
  subject_id TEXT, branch TEXT, semester INTEGER,   -- subject_id: the subject (subjects.id) · branch: CSE or Civil · semester: semester 1-6
  data TEXT NOT NULL,                       -- full quiz as JSON including the questions
  created_by TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT   -- created_by: username who made it · created_at: when the row was made · updated_at: last change
);

-- One student's attempt at a practice quiz.
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id TEXT PRIMARY KEY,   -- id: unique id of the row
  student_id TEXT,                          -- students.id (the student's own login id)
  quiz_id TEXT,   -- quiz_id: the quiz
  data TEXT NOT NULL,                       -- score, total, percentage, date ...
  created_by TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT   -- created_by: username who made it · created_at: when the row was made · updated_at: last change
);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON quiz_attempts(student_id);

-- Points of the "progress over days" graph of a student.
CREATE TABLE IF NOT EXISTS progress_points (
  id TEXT PRIMARY KEY,   -- id: unique id of the row
  student_id TEXT,   -- student_id: the student (students.id)
  data TEXT NOT NULL,                       -- day label, date, score percentage ...
  created_by TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT   -- created_by: username who made it · created_at: when the row was made · updated_at: last change
);
CREATE INDEX IF NOT EXISTS idx_progress_student ON progress_points(student_id);

-- Result of one mock interview of a student (placement preparation).
CREATE TABLE IF NOT EXISTS mock_interviews (
  id TEXT PRIMARY KEY,   -- id: unique id of the row
  student_id TEXT,   -- student_id: the student (students.id)
  data TEXT NOT NULL,                       -- target role, score, feedback, strengths, areas to improve ...
  created_by TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT   -- created_by: username who made it · created_at: when the row was made · updated_at: last change
);
CREATE INDEX IF NOT EXISTS idx_mock_student ON mock_interviews(student_id);

-- Activity shown in the admin's "Activity / Audit Log" screen (what people did in the screens).
-- (Security events such as logins and password views are in the separate audit_logs table.)
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,   -- id: unique id of the row
  actor_user_id TEXT,                       -- who did it (from the login, never from the browser)
  data TEXT NOT NULL,                       -- action, details, time ...
  created_by TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT   -- created_by: username who made it · created_at: when the row was made · updated_at: last change
);
`);

// ---------------- rules: who may read / write each collection ----------------
type Rule = (u: SessionUser, row: { data: any; existing?: any }) => boolean;
// Data shape: collection.
interface Collection {
  table: string;
  /** values for the extra columns, taken from the item */
  columns: (d: any, u: SessionUser) => Record<string, any>;
  canRead: (u: SessionUser, row: any) => boolean;
  canWrite: Rule;
  maxRows?: number;                         // newest rows returned (activity log can be long)
}
// Staff.
const staff = (u: SessionUser) => u.role === 'admin' || u.role === 'faculty';
// Signed in.
const signedIn = (_u: SessionUser) => true;
/** a row that belongs to a student: staff see all, the student their own, a parent their children */
const ownStudentRow = (u: SessionUser, studentId: string) =>
  staff(u) || (u.role === 'student' && u.studentId === studentId) || (u.role === 'parent' && u.childIds.includes(studentId));

export const COLLECTIONS: Record<string, Collection> = {
  timetable: { table: 'timetable_slots', columns: (d) => ({ branch: d.branch ?? null, semester: d.semester ?? null, day: d.day ?? null }),
    canRead: signedIn, canWrite: (u) => staff(u) },
  staff_attendance: { table: 'staff_attendance', columns: (d) => ({ faculty_id: d.facultyId ?? null, date: d.date ?? null }),
    canRead: (u, r) => u.role === 'admin' || (u.role === 'faculty' && r.faculty_id === u.id),
    canWrite: (u, { data }) => u.role === 'admin' || (u.role === 'faculty' && data.facultyId === u.id) },
  question_papers: { table: 'question_papers', columns: (d) => ({ branch: d.branch ?? null, semester: d.semester ?? null, subject_code: d.subjectCode ?? null }),
    canRead: signedIn,
    // students may only raise the download counter of an existing paper (same item, only downloadCount changed)
    canWrite: (u, { data, existing }) => staff(u) || (!!existing && JSON.stringify({ ...existing, downloadCount: 0 }) === JSON.stringify({ ...data, downloadCount: 0 })) },
  shared_experiences: { table: 'shared_experiences', columns: (d, u) => ({ author_id: d.authorId || u.id }),
    canRead: signedIn,
    // anybody may post; only the writer, faculty or admin may change it (others may only like it: likes field)
    canWrite: (u, { data, existing }) => !existing || staff(u) || existing.authorId === u.id
      || JSON.stringify({ ...existing, likes: 0 }) === JSON.stringify({ ...data, likes: 0 }) },
  practice_quizzes: { table: 'practice_quizzes', columns: (d) => ({ subject_id: d.subjectId ?? null, branch: d.branch ?? null, semester: d.semester ?? null }),
    canRead: signedIn, canWrite: (u) => staff(u) },
  quiz_attempts: { table: 'quiz_attempts', columns: (d) => ({ student_id: d.studentId ?? null, quiz_id: d.quizId ?? null }),
    canRead: (u, r) => ownStudentRow(u, r.student_id), canWrite: (u, { data }) => staff(u) || (u.role === 'student' && data.studentId === u.studentId) },
  progress_points: { table: 'progress_points', columns: (d) => ({ student_id: d.studentId ?? null }),
    canRead: (u, r) => ownStudentRow(u, r.student_id), canWrite: (u, { data }) => staff(u) || (u.role === 'student' && data.studentId === u.studentId) },
  mock_interviews: { table: 'mock_interviews', columns: (d) => ({ student_id: d.studentId ?? null }),
    canRead: (u, r) => ownStudentRow(u, r.student_id), canWrite: (u, { data }) => staff(u) || (u.role === 'student' && data.studentId === u.studentId) },
  activity_logs: { table: 'activity_logs', columns: (_d, u) => ({ actor_user_id: u.id }), maxRows: 500,
    canRead: (u) => u.role === 'admin', canWrite: (_u, { existing }) => !existing },     // add only; nobody edits history
};

const ID_RE = /^[A-Za-z0-9_.:-]{1,80}$/;
const MAX_JSON = 300_000;                  // one item may be at most ~300 KB (quizzes with many questions)
// Parse.
const parse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };

// ---------------- list ----------------
recordsRouter.get('/records/:collection', requireAuth, (req, res) => {
  const c = COLLECTIONS[req.params.collection];
  if (!c) return res.status(404).json({ error: 'Unknown list' });
  const rows = db.prepare(`SELECT * FROM ${c.table} ORDER BY COALESCE(updated_at, created_at) DESC LIMIT ?`).all(c.maxRows || 5000) as any[];
  res.json(rows.filter((r) => c.canRead(req.user!, r)).map((r) => parse(r.data)).filter(Boolean));
});

// ---------------- add or change ----------------
recordsRouter.put('/records/:collection/:id', requireAuth, (req, res) => {
  const u = req.user!;
  const c = COLLECTIONS[req.params.collection];
  if (!c) return res.status(404).json({ error: 'Unknown list' });
  const id = String(req.params.id);
  if (!ID_RE.test(id)) return res.status(400).json({ error: 'Invalid id' });
  const data = req.body;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return res.status(400).json({ error: 'Send the item as an object' });
  data.id = id;                                                   // the id in the address always wins
  const json = JSON.stringify(data);
  if (json.length > MAX_JSON) return res.status(413).json({ error: 'This item is too large to save.' });
  const old = db.prepare(`SELECT * FROM ${c.table} WHERE id=?`).get(id) as any;
  const existing = old ? parse(old.data) : undefined;
  if (old && !c.canRead(u, old)) return res.status(404).json({ error: 'Not found' });
  if (!c.canWrite(u, { data, existing })) return res.status(403).json({ error: 'You are not allowed to change this.' });
  const cols = c.columns(data, u);
  const names = Object.keys(cols);
  if (old) {
    db.prepare(`UPDATE ${c.table} SET data=?, ${names.map((n) => `${n}=?`).join(', ')}${names.length ? ',' : ''} updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .run(json, ...names.map((n) => cols[n]), id);
  } else {
    db.prepare(`INSERT INTO ${c.table} (id, data, created_by${names.map((n) => ', ' + n).join('')}) VALUES (?, ?, ?${names.map(() => ', ?').join('')})`)
      .run(id, json, u.username, ...names.map((n) => cols[n]));
  }
  if (req.params.collection !== 'activity_logs') audit(u.username, old ? 'record_updated' : 'record_created', req.params.collection, id);
  res.json({ ok: true });
});

// ---------------- delete ----------------
recordsRouter.delete('/records/:collection/:id', requireAuth, (req, res) => {
  const u = req.user!;
  const c = COLLECTIONS[req.params.collection];
  if (!c) return res.status(404).json({ error: 'Unknown list' });
  const old = db.prepare(`SELECT * FROM ${c.table} WHERE id=?`).get(String(req.params.id)) as any;
  if (!old || !c.canRead(u, old)) return res.status(404).json({ error: 'Not found' });
  const existing = parse(old.data);
  // deleting needs the same right as changing; the activity log cannot be deleted at all
  if (req.params.collection === 'activity_logs' || !c.canWrite(u, { data: existing, existing: { ...existing, __delete: true } })) {
    return res.status(403).json({ error: 'You are not allowed to delete this.' });
  }
  db.prepare(`DELETE FROM ${c.table} WHERE id=?`).run(old.id);
  audit(u.username, 'record_deleted', req.params.collection, old.id);
  res.json({ ok: true });
});
