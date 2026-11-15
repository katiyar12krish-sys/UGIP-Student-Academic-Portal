// ===================================================================================================
// Automatic reminders and alerts: exam tomorrow / today, new marks, low attendance, absent from a
// lecture, assignment deadlines. Runs on a timer started from server/index.ts; each alert is sent only once.
// ===================================================================================================
import { db } from '../db/connection';
import { notifyUser, parentsOf, purgeOldNotifications, deliverPending } from './service';
import { daysUntil, istParts } from './time';
import { dueReminder, timeLeftLabel, pendingStudents, teachersOf } from '../assignments/service';
import { findNotice, noticeReaches, findDirect, findDoubt, teachersOfSubject } from '../comms/service';
import { findDispatch, findSubmission, TASK_TYPE } from '../dispatch/service';
import { findDrive } from '../placement/service';

// Min percent.
const MIN_PERCENT = () => Math.min(100, Math.max(1, Number(process.env.ATTENDANCE_MIN_PERCENT) || 75));
// First name.
const firstName = (n: string) => String(n || '').trim().split(/\s+/)[0] || 'Your child';
// Class students.
const classStudents = (branch: string, semester: number) =>
  db.prepare('SELECT id, name FROM students WHERE deleted_at IS NULL AND branch=? AND semester=?').all(branch, semester) as { id: string; name: string }[];

/** Exam tomorrow / exam today: to every student of the class and to their parents. Only the nearest reminder is sent (no catch-up spam). */
export function examReminders(now = Date.now()): number {
  let created = 0;
  const tests = db.prepare(`SELECT t.id, t.title, t.date, t.time_slot, t.room, t.branch, t.semester, s.name AS subject, s.code
      FROM tests t JOIN subjects s ON s.id=t.subject_id
      WHERE t.deleted_at IS NULL AND COALESCE(t.status,'Upcoming')<>'Completed' AND t.date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`).all() as any[];
  for (const t of tests) {
    const d = daysUntil(t.date, now);
    if (d !== 0 && d !== 1) continue;
    const when = d === 0 ? 'today' : 'tomorrow';
    const detail = [t.title, t.time_slot, t.room && `Room ${t.room}`].filter(Boolean).join(' · ');
    for (const st of classStudents(t.branch, t.semester)) {
      if (notifyUser(st.id, { kind: 'exam_reminder', title: `Exam ${when}: ${t.subject}`, body: detail, url: '/', dedupeKey: `exam:${t.id}:${d}` }, now)) created++;
      for (const p of parentsOf(st.id))
        if (notifyUser(p, { kind: 'exam_reminder', title: `Exam ${when}: ${t.subject}`, body: `${firstName(st.name)} · ${detail}`, url: '/', dedupeKey: `exam:${t.id}:${d}:${st.id}` }, now)) created++;
    }
  }
  return created;
}

/** Marks added: to the student and their parents. No marks in the text (a lock screen is public); only that they are available. */
export function marksPublished(testId: string, studentIds: string[], now = Date.now()): number {
  const t = db.prepare('SELECT t.id, t.title, s.name AS subject FROM tests t JOIN subjects s ON s.id=t.subject_id WHERE t.id=?').get(testId) as any;
  if (!t) return 0;
  let created = 0;
  for (const sid of studentIds) {
    const st = db.prepare('SELECT id, name FROM students WHERE id=? AND deleted_at IS NULL').get(sid) as any;
    if (!st) continue;
    if (notifyUser(st.id, { kind: 'marks_published', title: 'New marks added', body: `${t.subject} · ${t.title}`, url: '/', dedupeKey: `marks:${t.id}` }, now)) created++;
    for (const p of parentsOf(st.id))
      if (notifyUser(p, { kind: 'marks_published', title: 'New marks added', body: `${firstName(st.name)} · ${t.subject} · ${t.title}`, url: '/', dedupeKey: `marks:${t.id}:${st.id}` }, now)) created++;
  }
  return created;
}

/** A lecture's attendance was closed and the student has no Present/Late record: tell the parents. Looks back 6 hours only. */
export function absenceAlerts(now = Date.now()): number {
  db.prepare("UPDATE attendance_sessions SET status='Closed', closed_at=expires_at WHERE status='Active' AND expires_at<?").run(now);
  let created = 0;
  const sessions = db.prepare(`SELECT a.id, a.branch, a.semester, a.date, s.name AS subject, s.code FROM attendance_sessions a JOIN subjects s ON s.id=a.subject_id
      WHERE a.status='Closed' AND a.closed_at>=?`).all(now - 6 * 3600_000) as any[];
  for (const s of sessions) {
    const present = new Set((db.prepare("SELECT student_id FROM attendance_records WHERE session_id=? AND status IN ('Present','Late')").all(s.id) as any[]).map((r) => r.student_id));
    for (const st of classStudents(s.branch, s.semester)) {
      if (present.has(st.id)) continue;
      for (const p of parentsOf(st.id))
        if (notifyUser(p, { kind: 'absent', title: 'Marked absent', body: `${firstName(st.name)} was absent in ${s.subject} (${s.code}) on ${s.date}`, url: '/', dedupeKey: `abs:${s.id}:${st.id}` }, now)) created++;
    }
  }
  return created;
}

/** Overall attendance below the minimum (default 75%) once the class has had at least 5 lectures. At most one message per person per week. */
export function lowAttendance(now = Date.now()): number {
  const min = MIN_PERCENT(), week = istParts(now).weekStart;
  let created = 0;
  const totals = new Map<string, number>(
    (db.prepare("SELECT branch, semester, COUNT(*) c FROM attendance_sessions WHERE status='Closed' GROUP BY branch, semester").all() as any[]).map((r) => [`${r.branch}|${r.semester}`, r.c]));
  const rows = db.prepare(`SELECT s.id, s.name, s.branch, s.semester,
      (SELECT COUNT(*) FROM attendance_records r JOIN attendance_sessions a ON a.id=r.session_id WHERE r.student_id=s.id AND r.status IN ('Present','Late') AND a.status='Closed' AND a.branch=s.branch AND a.semester=s.semester) AS attended
      FROM students s WHERE s.deleted_at IS NULL`).all() as any[];
  for (const st of rows) {
    const total = totals.get(`${st.branch}|${st.semester}`) || 0;
    if (total < 5) continue;
    const pct = Math.round((st.attended / total) * 100);
    if (pct >= min) continue;
    const key = `lowatt:${week}`;
    if (notifyUser(st.id, { kind: 'low_attendance', title: 'Low attendance', body: `Your attendance is ${pct}% (minimum ${min}%).`, url: '/', dedupeKey: key }, now)) created++;
    for (const p of parentsOf(st.id))
      if (notifyUser(p, { kind: 'low_attendance', title: 'Low attendance', body: `${firstName(st.name)}'s attendance is ${pct}% (minimum ${min}%).`, url: '/', dedupeKey: `${key}:${st.id}` }, now)) created++;
  }
  return created;
}


/** A new assignment / online test: tell every student of the class. */
export function assignmentCreated(testId: string, now = Date.now()): number {
  const t = db.prepare('SELECT o.*, s.name AS sname FROM online_tests o JOIN subjects s ON s.id=o.subject_id WHERE o.id=? AND o.deleted_at IS NULL').get(testId) as any;
  if (!t) return 0;
  let created = 0;
  for (const st of classStudents(t.branch, t.semester))
    if (notifyUser(st.id, { kind: 'assignment_new', title: `New test: ${t.title}`, body: `${t.sname} · deadline ${t.deadline_date} ${t.deadline_time}`, url: '/', dedupeKey: `asg:${t.id}:new` }, now)) created++;
  return created;
}

/**
 * Assignment / online-test deadlines (this used to run in the browser).
 *  - 3 reminders: 72 h, 24 h and 3 h before the deadline, only to students who have NOT submitted. If the server was off, only the latest due one is sent.
 *  - After the deadline: the teacher gets one summary (how many did not submit), those students are told once, and the test is closed.
 */
export function assignmentReminders(now = Date.now()): number {
  let created = 0;
  const tests = db.prepare(`SELECT o.*, s.name AS sname FROM online_tests o JOIN subjects s ON s.id=o.subject_id WHERE o.deleted_at IS NULL AND o.status='active'`).all() as any[];
  for (const t of tests) {
    const left = t.deadline_at - now;
    const pending = pendingStudents(t);
    if (left > 0) {
      const due = dueReminder(left);
      if (due <= t.reminders_sent) continue;
      let sent = 0;
      for (const st of pending)
        if (notifyUser(st.id, { kind: 'assignment_reminder', title: `Reminder ${due} of 3: ${t.title}`,
          body: `${t.sname} is not submitted yet. Deadline ${t.deadline_date} ${t.deadline_time} (${timeLeftLabel(left)}).`, url: '/', dedupeKey: `asg:${t.id}:${due}` }, now)) sent++;
      for (const st of pending)      // Step 14: and their parents (the child's first name only)
        for (const p of parentsOf(st.id))
          if (notifyUser(p, { kind: 'assignment_reminder', title: `Reminder ${due} of 3: ${t.title}`, body: `${firstName(st.name)} has not submitted ${t.sname}. Deadline ${t.deadline_date} ${t.deadline_time}.`, url: '/', dedupeKey: `asg:${t.id}:${due}:p:${st.id}` }, now)) sent++;
      const log = [...(t.reminder_log ? JSON.parse(t.reminder_log) : []), { no: due, sentAt: new Date(now).toISOString(), recipientCount: sent }];
      db.prepare('UPDATE online_tests SET reminders_sent=?, reminder_log=? WHERE id=? AND reminders_sent<?').run(due, JSON.stringify(log), t.id, due);
      created += sent;
    } else {
      for (const st of pending) {
        if (notifyUser(st.id, { kind: 'assignment_reminder', title: `Deadline passed: ${t.title}`, body: `${t.sname}: your submission is missing. Please contact ${t.created_by_name}.`, url: '/', dedupeKey: `asg:${t.id}:expired` }, now)) created++;
        for (const p of parentsOf(st.id))
          if (notifyUser(p, { kind: 'assignment_reminder', title: `Deadline passed: ${t.title}`, body: `${firstName(st.name)}'s submission for ${t.sname} is missing.`, url: '/', dedupeKey: `asg:${t.id}:expired:p:${st.id}` }, now)) created++;
      }
      const total = classStudents(t.branch, t.semester).length;
      const body = pending.length ? `${pending.length} of ${total} student(s) did not submit. Open the Performance Report for the names.` : 'All students submitted on time.';
      for (const f of teachersOf(t))
        if (notifyUser(f, { kind: 'assignment_deadline', title: `Deadline over: ${t.title}`, body, url: '/', dedupeKey: `asg:${t.id}:faculty` }, now)) created++;
      db.prepare("UPDATE online_tests SET faculty_alerted=1, status=? WHERE id=?").run(pending.length ? 'expired' : 'completed', t.id);
    }
  }
  return created;
}


// ---------------- Step 8: notices, direct notices, doubts ----------------
/** A notice marked High or Urgent: every student it is meant for is told once. (Normal notices are only listed in the portal.) */
export function noticePublished(noticeId: string, now = Date.now()): number {
  const n = findNotice(noticeId);
  if (!n || n.priority === 'Normal') return 0;
  let created = 0;
  const students = db.prepare('SELECT id, branch, semester FROM students WHERE deleted_at IS NULL').all() as any[];
  for (const st of students)
    if (noticeReaches(n, st.branch, st.semester) && notifyUser(st.id, { kind: 'notice', title: `${n.priority === 'Urgent' ? 'Urgent notice' : 'Notice'}: ${n.title}`, body: `${n.category} · ${n.published_by}`, url: '/', dedupeKey: `notice:${n.id}` }, now)) created++;
  return created;
}

/** A new study material: the students of its class (all students if it is for everybody). The title only; the file stays in the portal. */
export function materialPublished(materialId: string, now = Date.now()): number {
  const m = db.prepare('SELECT id, title, branch, semester, category, uploaded_by_name FROM materials WHERE id=?').get(materialId) as any;
  if (!m) return 0;
  let created = 0;
  const students = db.prepare('SELECT id, branch, semester FROM students WHERE deleted_at IS NULL').all() as any[];
  for (const st of students)
    if ((m.branch === 'All' || m.branch === st.branch) && (m.semester === null || m.semester === st.semester)
      && notifyUser(st.id, { kind: 'material', title: `New material: ${m.title}`, body: `${m.category} · ${m.uploaded_by_name}`, url: '/', dedupeKey: `mat:${m.id}` }, now)) created++;
  return created;
}

/** Step 10: a note / task sent to a class: its students. Title and subject only; the file stays in the portal. */
export function dispatchCreated(dispatchId: string, now = Date.now()): number {
  const d = findDispatch(dispatchId);
  if (!d) return 0;
  let created = 0;
  for (const st of classStudents(d.branch, d.semester))
    if (notifyUser(st.id, { kind: 'dispatch_new', title: `${d.type === TASK_TYPE ? 'New task' : 'New class material'}: ${d.title}`, body: `${d.scode} · ${d.sent_by_name}${d.due_date ? ` · due ${d.due_date}` : ''}`, url: '/', dedupeKey: `disp:${d.id}:new` }, now)) created++;
  return created;
}

/** A student handed in (or re-sent) work: the teachers of the subject. Name only, never the answer. */
export function submissionReceived(submissionId: string, now = Date.now()): number {
  const x = findSubmission(submissionId), d = x && findDispatch(x.dispatch_id);
  if (!x || !d) return 0;
  let created = 0;
  for (const t of teachersOfSubject(d.subject_id))
    if (notifyUser(t.id, { kind: 'dispatch_submission', title: `Submission: ${d.title}`, body: `${firstName(x.stname)} handed in work`, url: '/', dedupeKey: `disp:${d.id}:sub:${x.student_id}:${x.attempts}` }, now)) created++;
  return created;
}

/** A teacher graded a submission: that student. The marks and feedback stay in the portal. */
export function submissionGraded(submissionId: string, now = Date.now()): number {
  const x = findSubmission(submissionId), d = x && findDispatch(x.dispatch_id);
  if (!x || !d || x.marks === null) return 0;
  return notifyUser(x.student_id, { kind: 'dispatch_graded', title: `Graded: ${d.title}`, body: 'Open the portal to see your marks.', url: '/', dedupeKey: `disp:${d.id}:graded:${x.graded_at}` }, now) ? 1 : 0;
}

/** A private message to one student. The text stays in the portal; the phone only says there is one (a lock screen is public). */
export function directNoticeSent(id: string, now = Date.now()): number {
  const d = findDirect(id);
  if (!d) return 0;
  return notifyUser(d.student_id, { kind: 'direct_notice', title: `Message from ${d.sent_by_name}`, body: 'Open the portal to read it.', url: '/', dedupeKey: `dn:${d.id}` }, now) ? 1 : 0;
}

/** A new doubt: the teachers of the subject. No question text in the notification. */
export function doubtAsked(doubtId: string, now = Date.now()): number {
  const d = findDoubt(doubtId);
  if (!d) return 0;
  let created = 0;
  for (const t of teachersOfSubject(d.subject_id))
    if (notifyUser(t.id, { kind: 'doubt_new', title: `New doubt: ${d.subject_name}`, body: `${firstName(d.student_name)} asked a question`, url: '/', dedupeKey: `doubt:${d.id}:new` }, now)) created++;
  return created;
}

/** A message in a doubt: if a teacher wrote it the student is told, if the student wrote it the teachers are told. */
export function doubtReplied(doubtId: string, replyId: number, now = Date.now()): number {
  const d = findDoubt(doubtId), r = db.prepare('SELECT * FROM doubt_replies WHERE id=? AND doubt_id=?').get(replyId, doubtId) as any;
  if (!d || !r) return 0;
  const key = `doubt:${d.id}:r:${r.id}`;
  if (r.sender_role !== 'student')
    return notifyUser(d.student_id, { kind: 'doubt_reply', title: `Reply to your doubt: ${d.subject_name}`, body: `${r.sender_name} answered`, url: '/', dedupeKey: key }, now) ? 1 : 0;
  let created = 0;
  for (const t of teachersOfSubject(d.subject_id))
    if (notifyUser(t.id, { kind: 'doubt_reply', title: `${firstName(d.student_name)} replied: ${d.subject_name}`, body: 'Open the doubt to read it', url: '/', dedupeKey: key }, now)) created++;
  return created;
}

/** A teacher closed a doubt: tell the student (a student closing their own needs no message). */
export function doubtResolved(doubtId: string, byUserId: string, now = Date.now()): number {
  const d = findDoubt(doubtId);
  if (!d || byUserId === d.student_id) return 0;
  return notifyUser(d.student_id, { kind: 'doubt_resolved', title: `Doubt resolved: ${d.subject_name}`, body: 'Your teacher marked it as resolved.', url: '/', dedupeKey: `doubt:${d.id}:resolved` }, now) ? 1 : 0;
}

/** One pass of everything that is time-based. Safe to run as often as you like: duplicates are blocked by the dedupe key. */
export function runRules(now = Date.now()) {
  return { exams: examReminders(now), absences: absenceAlerts(now), lowAttendance: lowAttendance(now), assignments: assignmentReminders(now) };
}

let timers: NodeJS.Timeout[] = [];
// Start scheduler.
export function startScheduler() {
  stopScheduler();
  // Safe.
  const safe = (name: string, fn: () => unknown) => () => { Promise.resolve().then(fn).catch((e) => console.warn(`[notify] ${name} failed:`, e?.message || e)); };
  timers = [
    setInterval(safe('rules', () => runRules()), 10 * 60_000),                       // every 10 minutes
    setInterval(safe('deliver', () => deliverPending()), 30_000),                    // push queue every 30 s
    setInterval(safe('purge', () => purgeOldNotifications()), 6 * 3600_000),
  ];
  timers.forEach((t) => (t as any).unref?.());
  safe('rules', () => runRules())();                                                 // and once at start
}
// Stop scheduler.
export function stopScheduler() { timers.forEach(clearInterval); timers = []; }

/** A new placement drive: the students of the branch(es) it is meant for. Only the company and deadline, never anything private. */
export function placementDriveCreated(driveId: string, now = Date.now()): number {
  const d = findDrive(driveId);
  if (!d) return 0;
  const students = (d.branch === 'Both'
    ? db.prepare('SELECT id FROM students WHERE deleted_at IS NULL').all()
    : db.prepare('SELECT id FROM students WHERE deleted_at IS NULL AND branch=?').all(d.branch)) as { id: string }[];
  let created = 0;
  for (const st of students)
    if (notifyUser(st.id, { kind: 'placement_new', title: `New placement drive: ${d.company}`, body: `${d.title} · apply by ${d.deadline}`, url: '/', dedupeKey: `drive:${d.id}:new` }, now)) created++;
  return created;
}

/** The status of a student's application changed (Shortlisted / Selected / Rejected): that student only. The status stays in the portal. */
export function placementStatusChanged(driveId: string, studentId: string, now = Date.now()): number {
  const d = findDrive(driveId);
  const a = d && db.prepare('SELECT status, status_at FROM placement_applications WHERE drive_id=? AND student_id=?').get(driveId, studentId) as any;
  if (!d || !a || a.status === 'Applied') return 0;
  return notifyUser(studentId, { kind: 'placement_status', title: `Placement update: ${d.company}`, body: 'Open the portal to see your application status.', url: '/', dedupeKey: `drive:${d.id}:status:${a.status_at}` }, now) ? 1 : 0;
}
