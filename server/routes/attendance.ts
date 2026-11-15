// ===================================================================================================
// Attendance routes: open / close a lecture session (QR code + PIN), students mark themselves,
// the teacher corrects a student, per-student percentage. Step 18: lists and percentages are per academic year.
// Edit / delete of a session is in server/routes/edits.ts.
// ===================================================================================================
import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db/connection';
import { requireAuth, requireRole } from '../auth/middleware';
import { keepRow, realOnly } from '../auth/sample';
import { audit } from '../auth/service';
import { hit } from '../auth/rateLimit';
import { canTeach, studentRow, studentInClass, ownStudentIds, clean, newId } from '../academic/access';
import type { SessionUser } from '../auth/session';
import { academicYearOf } from '../academic/calendar';   // Step 18: attendance counts per academic year
import { writeDenied } from '../auth/permissions';   // admin-given feature switches + cross-subject alerts

export const attendanceRouter = Router();
const SESSION_MS = 45 * 60_000;
const STATUS = ['Present', 'Absent', 'Late'];
// Fmt time.
const fmtTime = (ms: number) => new Date(ms).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });

/** Sessions close themselves 45 minutes after they start. */
function expireSessions() {
  db.prepare("UPDATE attendance_sessions SET status='Closed', closed_at=expires_at WHERE status='Active' AND expires_at<?").run(Date.now());
}

// Records of.
function recordsOf(sessionId: string, only?: Set<string>) {
  const rows = db.prepare(`SELECT r.*, s.name AS sname, s.roll_no FROM attendance_records r JOIN students s ON s.id=r.student_id
    WHERE r.session_id=? AND s.deleted_at IS NULL ORDER BY r.marked_at DESC`).all(sessionId) as any[];
  return rows.filter((r) => !only || only.has(r.student_id)).map((r) => ({
    studentId: r.student_id, studentName: r.sname, rollNo: r.roll_no, status: r.status, markedVia: r.marked_via,
    timestamp: fmtTime(r.marked_at), markedAt: new Date(r.marked_at).toISOString(),
  }));
}

// Session dto.
function sessionDto(s: any, opts: { secrets: boolean; only?: Set<string> }) {
  const fac = db.prepare('SELECT name FROM users WHERE id=?').get(s.faculty_id) as any;
  return {
    id: s.id, subjectId: s.subject_id, subjectCode: s.code, subjectName: s.sname, facultyId: s.faculty_id, facultyName: fac?.name || '',
    branch: s.branch, semester: s.semester, date: s.date, timeSlot: s.time_slot || '', topicTaught: s.topic || '',
    qrToken: opts.secrets ? s.qr_token : '', pinCode: opts.secrets ? s.pin : '',
    status: s.status, expiresAt: new Date(s.expires_at).toISOString(), records: recordsOf(s.id, opts.only),
    academicYear: s.academic_year || undefined, isDemo: !!s.is_demo,      // Step 18
  };
}
const SESSION_SQL = 'SELECT a.*, s.code, s.name AS sname FROM attendance_sessions a JOIN subjects s ON s.id=a.subject_id';
// Returns the session.
const getSession = (id: string) => db.prepare(SESSION_SQL + ' WHERE a.id=?').get(id) as any;

// Overall attendance per student (all subjects of their class). Staff only: it is a percentage, not the session-level detail.
attendanceRouter.get('/attendance/summary', requireRole('admin', 'faculty'), (req, res) => {
  expireSessions();
  const rows = db.prepare(`
    SELECT st.id AS studentId,
      COUNT(a.id) AS total,
      SUM(CASE WHEN r.status IN ('Present','Late') THEN 1 ELSE 0 END) AS attended
    FROM students st
    LEFT JOIN attendance_sessions a ON a.branch = st.branch AND a.semester = st.semester
      AND (a.academic_year IS NULL OR a.academic_year = ?)          -- Step 18: only THIS academic year's classes count
    LEFT JOIN attendance_records r ON r.session_id = a.id AND r.student_id = st.id
    WHERE st.deleted_at IS NULL${realOnly(req.user, 'st')}
    GROUP BY st.id`).all(academicYearOf()) as any[];
  res.json(rows.map((r) => ({ studentId: r.studentId, total: r.total, attended: r.attended || 0, percent: r.total ? Math.round(((r.attended || 0) / r.total) * 100) : null })));
});

// Who sees what:
//   admin -> all (with PIN/QR token)   faculty -> sessions of subjects they teach (PIN/QR token only on their own sessions)
//   student -> their class' sessions, only their own row, never the PIN   parent -> same for their children
attendanceRouter.get('/attendance/sessions', requireAuth, (req, res) => {
  expireSessions();
  const u = req.user!;
  // Step 18: by default only THIS academic year (old years stay in the database: ?academicYear=2025-26 or =all to see them)
  const wanted = String(req.query.academicYear || academicYearOf());
  const rows = ((wanted === 'all'
    ? db.prepare(SESSION_SQL + ' ORDER BY a.created_at DESC LIMIT 5000').all()
    : db.prepare(SESSION_SQL + ' WHERE (a.academic_year = ? OR a.academic_year IS NULL) ORDER BY a.created_at DESC LIMIT 5000').all(wanted)) as any[]).filter(keepRow(u));
  const own = new Set(ownStudentIds(u));
  const ownClasses = [...own].map(studentRow).filter(Boolean);
  const out: any[] = [];
  for (const s of rows) {
    if (u.role === 'admin') out.push(sessionDto(s, { secrets: true }));
    else if (u.role === 'faculty') { if (canTeach(u, s.subject_id)) out.push(sessionDto(s, { secrets: s.faculty_id === u.id })); }
    else if (ownClasses.some((c: any) => c.branch === s.branch && c.semester === s.semester)
      || [...own].some((sid) => db.prepare('SELECT 1 FROM attendance_records WHERE session_id=? AND student_id=?').get(s.id, sid))) out.push(sessionDto(s, { secrets: false, only: own }));
  }
  res.json(out);
});

// POST /api/attendance/sessions  (who: only admin, faculty)
attendanceRouter.post('/attendance/sessions', requireRole('admin', 'faculty'), (req, res) => {
  const b = req.body || {};
  const sub = db.prepare('SELECT * FROM subjects WHERE id=?').get(String(b.subjectId || '')) as any;
  if (!sub) return res.status(400).json({ error: 'Unknown subject' });
  { const no = writeDenied(req.user!, sub.id, 'attendance', 'start an attendance lecture'); if (no) return res.status(403).json({ error: no }); }
  expireSessions();
  const now = Date.now();
  const clash = db.prepare("SELECT 1 FROM attendance_sessions WHERE status='Active' AND faculty_id=? AND subject_id=?").get(req.user!.id, sub.id);
  if (clash) return res.status(409).json({ error: 'You already have an open attendance session for this subject. Close it first.' });
  // PIN must be unique among the open sessions of the same class (students enter it without choosing a subject)
  let pin = '';
  do { pin = String(crypto.randomInt(100000, 1000000)); }
  while (db.prepare("SELECT 1 FROM attendance_sessions WHERE status='Active' AND branch=? AND semester=? AND pin=?").get(sub.branch, sub.semester, pin));
  const id = newId('att');
  const token = `UGIP-ATT-${sub.code}-${crypto.randomBytes(8).toString('hex')}`;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date || '')) ? b.date : new Date(now).toISOString().slice(0, 10);
  db.prepare(`INSERT INTO attendance_sessions (id,subject_id,faculty_id,branch,semester,date,time_slot,topic,qr_token,pin,status,expires_at,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?, 'Active', ?, ?)`).run(id, sub.id, req.user!.id, sub.branch, sub.semester, date, clean(b.timeSlot, 60), clean(b.topicTaught ?? b.topic, 300), token, pin, now + SESSION_MS, now);
  audit(req.user!.username, 'attendance_opened', 'attendance_session', id, sub.code);
  res.status(201).json(sessionDto(getSession(id), { secrets: true }));
});

// POST /api/attendance/sessions/:id/close  (who: only admin, faculty)
attendanceRouter.post('/attendance/sessions/:id/close', requireRole('admin', 'faculty'), (req, res) => {
  const s = getSession(req.params.id);
  if (!s) return res.status(404).json({ error: 'Session not found' });
  if (req.user!.role !== 'admin' && s.faculty_id !== req.user!.id) return res.status(403).json({ error: 'Only the faculty who opened this session can close it' });
  db.prepare("UPDATE attendance_sessions SET status='Closed', closed_at=? WHERE id=? AND status='Active'").run(Date.now(), s.id);
  audit(req.user!.username, 'attendance_closed', 'attendance_session', s.id);
  res.json(sessionDto(getSession(s.id), { secrets: true }));
});

/** Student punches in with the QR text or the PIN. Identity comes from the login, never from the request. */
attendanceRouter.post('/attendance/mark', requireRole('student'), (req, res) => {
  const u = req.user!;
  const l1 = hit(`attmark:${u.id}`, 8, 5 * 60_000);
  const l2 = hit(`attmark:ip:${req.ip}`, 120, 5 * 60_000);   // a whole classroom may share one Wi-Fi address
  if (!l1.allowed || !l2.allowed) {
    res.setHeader('Retry-After', String(Math.max(l1.retryAfterSec, l2.retryAfterSec)));
    return res.status(429).json({ error: 'Too many attempts. Wait a few minutes and try again.' });
  }
  const code = String(req.body?.code || '').trim().slice(0, 300);
  const st = u.studentId ? studentRow(u.studentId) : null;
  if (!code || !st) return res.status(400).json({ error: 'Enter the PIN or scan the QR code' });
  expireSessions();
  const open = db.prepare("SELECT a.*, s.code, s.name AS sname FROM attendance_sessions a JOIN subjects s ON s.id=a.subject_id WHERE a.status='Active' AND a.branch=? AND a.semester=?").all(st.branch, st.semester) as any[];
  const s = open.find((x) => code === x.pin || code.includes(x.qr_token));
  if (!s) return res.status(404).json({ error: 'No active session found for your class matching this QR code or PIN.' });
  if (db.prepare('SELECT 1 FROM attendance_records WHERE session_id=? AND student_id=?').get(s.id, st.id)) {
    return res.status(409).json({ error: 'Your attendance is already recorded for this lecture!' });
  }
  db.prepare('INSERT INTO attendance_records (session_id,student_id,status,marked_via,marked_by,marked_at) VALUES (?,?,?,?,?,?)')
    .run(s.id, st.id, 'Present', code === s.pin ? 'PIN' : 'QR', u.username, Date.now());
  res.json({ success: true, message: `Attendance marked Present for ${s.sname} (${s.code})!`, session: sessionDto(s, { secrets: false, only: new Set([st.id]) }) });
});

// Put record.
function putRecord(s: any, studentId: string, status: string, via: 'QR' | 'Manual', by: string) {
  db.prepare(`INSERT INTO attendance_records (session_id,student_id,status,marked_via,marked_by,marked_at) VALUES (?,?,?,?,?,?)
    ON CONFLICT(session_id,student_id) DO UPDATE SET status=excluded.status, marked_via=excluded.marked_via, marked_by=excluded.marked_by, marked_at=excluded.marked_at`)
    .run(s.id, studentId, status, via, by, Date.now());
}
// Teacher session.
function teacherSession(req: any, res: any): any | null {
  const s = getSession(req.params.id);
  if (!s) { res.status(404).json({ error: 'Session not found' }); return null; }
  { const no = writeDenied(req.user as SessionUser, s.subject_id, 'attendance', 'change attendance'); if (no) { res.status(403).json({ error: no }); return null; } }
  return s;
}

// Teacher corrects / sets one student's status (Present / Late / Absent)
attendanceRouter.post('/attendance/sessions/:id/records', requireRole('admin', 'faculty'), (req, res) => {
  const s = teacherSession(req, res); if (!s) return;
  const { studentId, status } = req.body || {};
  if (!STATUS.includes(status)) return res.status(400).json({ error: 'Status must be Present, Absent or Late' });
  if (!studentInClass(String(studentId), s.branch, s.semester)) return res.status(400).json({ error: `Not a student of ${s.branch} semester ${s.semester}` });
  putRecord(s, studentId, status, 'Manual', req.user!.username);
  audit(req.user!.username, 'attendance_manual', 'attendance_session', s.id, `${studentId}=${status}`);
  res.json(sessionDto(getSession(s.id), { secrets: s.faculty_id === req.user!.id || req.user!.role === 'admin' }));
});

// Teacher scans a student's ID-card QR (JSON {id, rollNo}, or just the roll number / id)
attendanceRouter.post('/attendance/sessions/:id/scan', requireRole('admin', 'faculty'), (req, res) => {
  const s = teacherSession(req, res); if (!s) return;
  expireSessions();
  if (getSession(s.id).status !== 'Active') return res.status(409).json({ error: 'This session is closed' });
  const raw = String(req.body?.data || '').trim().slice(0, 300);
  let key = raw;
  try { if (raw.startsWith('{')) { const j = JSON.parse(raw); key = String(j.id || j.rollNo || ''); } } catch { /* plain text */ }
  const st = db.prepare('SELECT id, name, roll_no, branch, semester FROM students WHERE deleted_at IS NULL AND (id=? OR roll_no=?)').get(key, key) as any;
  if (!st) return res.status(404).json({ error: 'Student not recognised' });
  if (st.branch !== s.branch || st.semester !== s.semester) return res.status(400).json({ error: `${st.name} is not in ${s.branch} semester ${s.semester}` });
  if (db.prepare("SELECT 1 FROM attendance_records WHERE session_id=? AND student_id=? AND status<>'Absent'").get(s.id, st.id)) {
    return res.status(409).json({ error: `${st.name} (Roll: ${st.roll_no}) is already marked in ${s.code}!` });
  }
  putRecord(s, st.id, 'Present', 'QR', req.user!.username);
  res.json({ success: true, message: `Verified & Marked: ${st.name} (${st.roll_no}) Present for ${s.code}!`,
    student: { id: st.id, name: st.name, rollNo: st.roll_no }, session: sessionDto(getSession(s.id), { secrets: s.faculty_id === req.user!.id || req.user!.role === 'admin' }) });
});
