// =====================================================================================================
// Step 18: "Edit" and "Delete" for everything that could only be ADDED before
// -----------------------------------------------------------------------------------------------------
// Each route checks WHO may change the item (same people who may create it), cleans the input, saves,
// and writes an audit-log line. Nothing here is a hard delete of school records unless stated:
//
//   PUT    /attendance/sessions/:id          edit date / time / topic of an attendance session
//   DELETE /attendance/sessions/:id          delete a session (with its present/absent list)
//   PUT    /online-tests/:id                 edit an online test / assignment (questions only before anybody submitted)
//   DELETE /online-tests/:id                 delete it (soft delete: hidden, submissions kept in the database)
//   PUT    /notices/:id                      edit a notice
//   PUT    /direct-notices/:id               edit a one-to-one notice
//   DELETE /direct-notices/:id               delete a one-to-one notice
//   DELETE /doubts/:id                       delete a doubt (student while still pending, the subject's teacher, admin)
//   PUT    /dispatches/:id                   edit title / description / due date / marks of a class dispatch
//   PUT    /placement/drives/:id             edit a placement drive
//   PUT    /placement/jobs/:id               edit a job listing
// =====================================================================================================
import { Router } from 'express';
import { db } from '../db/connection';
import { requireRole } from '../auth/middleware';
import { audit } from '../auth/service';
import { canTeach, clean } from '../academic/access';
import { findTest, toDto as testDto, canManage, parseQuestions, deadlineAt } from '../assignments/service';
import { findNotice, toNoticeDto, NOTICE_CATEGORIES, NOTICE_PRIORITIES, classesTaught, noticeClasses, findDirect, toDirectDto, DIRECT_PRIORITIES, findDoubt } from '../comms/service';
import { findDispatch, toDto as dispatchDto, TASK_TYPE } from '../dispatch/service';
import { findDrive, findJob, driveDto, jobDto, BRANCHES as P_BRANCHES, DRIVE_TYPES, JOB_TYPES } from '../placement/service';

export const editsRouter = Router();
const staff = requireRole('admin', 'faculty');
// true / false: is date?
const isDate = (d: unknown): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d + 'T00:00:00Z'));
// true / false: is time?
const isTime = (t: unknown): t is string => typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
/** Value sent by the browser, or the old value when the field was not sent. */
const pick = (b: any, key: string, old: any) => (b && b[key] !== undefined ? b[key] : old);

// ---------------- attendance sessions ----------------
const canManageSession = (u: any, s: any) => u.role === 'admin' || s.faculty_id === u.id || canTeach(u, s.subject_id);

// PUT /api/attendance/sessions/:id  (who: checked inside)
editsRouter.put('/attendance/sessions/:id', staff, (req, res) => {
  const s = db.prepare('SELECT * FROM attendance_sessions WHERE id=?').get(req.params.id) as any;
  if (!s) return res.status(404).json({ error: 'Attendance session not found.' });
  if (!canManageSession(req.user!, s)) return res.status(403).json({ error: 'Only the teacher of this subject or the admin can edit it.' });
  const date = pick(req.body, 'date', s.date);
  if (!isDate(date)) return res.status(400).json({ error: 'Please enter a valid date.' });
  db.prepare('UPDATE attendance_sessions SET date=?, time_slot=?, topic=? WHERE id=?')
    .run(date, clean(pick(req.body, 'timeSlot', s.time_slot), 60), clean(pick(req.body, 'topicTaught', s.topic), 300), s.id);
  audit(req.user!.username, 'attendance_session_updated', 'attendance_session', s.id);
  res.json({ ok: true });
});

// DELETE /api/attendance/sessions/:id  (who: checked inside)
editsRouter.delete('/attendance/sessions/:id', staff, (req, res) => {
  const s = db.prepare('SELECT * FROM attendance_sessions WHERE id=?').get(req.params.id) as any;
  if (!s) return res.status(404).json({ error: 'Attendance session not found.' });
  if (!canManageSession(req.user!, s)) return res.status(403).json({ error: 'Only the teacher of this subject or the admin can delete it.' });
  db.prepare('DELETE FROM attendance_sessions WHERE id=?').run(s.id);   // its present/absent records go with it (cascade)
  audit(req.user!.username, 'attendance_session_deleted', 'attendance_session', s.id, `${s.subject_id} ${s.date}`);
  res.json({ ok: true });
});

// ---------------- online tests / assignments ----------------
editsRouter.put('/online-tests/:id', staff, (req, res) => {
  const t = findTest(String(req.params.id));
  if (!t || !canManage(req.user!, t)) return res.status(404).json({ error: 'Test not found.' });
  const b = req.body || {};
  const title = clean(pick(b, 'title', t.title), 200);
  if (!title) return res.status(400).json({ error: 'Title is required.' });
  const total = Number(pick(b, 'totalMarks', t.total_marks));
  if (!Number.isFinite(total) || total <= 0 || total > 1000) return res.status(400).json({ error: 'Total marks must be between 1 and 1000.' });
  const dd = pick(b, 'deadlineDate', t.deadline_date), dt = pick(b, 'deadlineTime', t.deadline_time);
  if (!isDate(dd) || !isTime(dt)) return res.status(400).json({ error: 'Enter the deadline as a date and a time.' });
  const at = deadlineAt(dd, dt);
  const submitted = (db.prepare('SELECT COUNT(*) n FROM online_test_submissions WHERE test_id=?').get(t.id) as any).n;
  db.exec('BEGIN');
  try {
    db.prepare(`UPDATE online_tests SET title=?, description=?, total_marks=?, deadline_date=?, deadline_time=?, deadline_at=?,
      status=CASE WHEN ? > ? THEN 'active' ELSE status END WHERE id=?`).run(title, clean(pick(b, 'description', t.description), 2000), total, dd, dt, at, at, Date.now(), t.id);
    if (Array.isArray(b.questions)) {
      // Changing questions after students answered would make their scores wrong -> not allowed then.
      if (submitted > 0) throw Object.assign(new Error('Questions cannot be changed after students have submitted. Edit the title / deadline only, or make a new test.'), { status: 409 });
      const pq = parseQuestions(b.questions);
      if (pq.error) throw Object.assign(new Error(pq.error), { status: 400 });
      db.prepare('DELETE FROM online_test_questions WHERE test_id=?').run(t.id);
      const ins = db.prepare('INSERT INTO online_test_questions (test_id,idx,question,options,correct_index,explanation) VALUES (?,?,?,?,?,?)');
      pq.questions.forEach((q, i) => ins.run(t.id, i, q.question, JSON.stringify(q.options), q.correctIndex, q.explanation ?? null));
    }
    db.exec('COMMIT');
  } catch (e: any) { db.exec('ROLLBACK'); if (e.status) return res.status(e.status).json({ error: e.message }); throw e; }
  audit(req.user!.username, 'online_test_updated', 'online_test', t.id);
  res.json(testDto(findTest(t.id), req.user!));
});

// DELETE /api/online-tests/:id  (who: checked inside)
editsRouter.delete('/online-tests/:id', staff, (req, res) => {
  const t = findTest(String(req.params.id));
  if (!t || !canManage(req.user!, t)) return res.status(404).json({ error: 'Test not found.' });
  db.prepare('UPDATE online_tests SET deleted_at=? WHERE id=?').run(Date.now(), t.id);    // hidden; submissions stay for the record
  audit(req.user!.username, 'online_test_deleted', 'online_test', t.id);
  res.json({ ok: true });
});

// ---------------- notices ----------------
editsRouter.put('/notices/:id', staff, (req, res) => {
  const u = req.user!;
  const n = findNotice(String(req.params.id));
  if (!n) return res.status(404).json({ error: 'Notice not found.' });
  if (u.role !== 'admin' && n.created_by_user_id !== u.id) return res.status(403).json({ error: 'You can edit only notices you published.' });
  const b = req.body || {};
  const title = clean(pick(b, 'title', n.title), 200), content = clean(pick(b, 'content', n.content), 5000);
  const category = pick(b, 'category', n.category), priority = pick(b, 'priority', n.priority);
  const branch = pick(b, 'targetBranch', n.target_branch) || 'All';
  const sems: number[] = pick(b, 'targetSemesters', JSON.parse(n.target_semesters || '[]'));
  if (!title || !content) return res.status(400).json({ error: 'Title and notice text are required.' });
  if (!NOTICE_CATEGORIES.includes(category)) return res.status(400).json({ error: 'Choose a category.' });
  if (!NOTICE_PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Choose a priority.' });
  if (branch !== 'All' && !['CSE', 'Civil'].includes(branch)) return res.status(400).json({ error: 'Unknown branch.' });
  if (!Array.isArray(sems) || sems.some((s) => !Number.isInteger(s) || s < 1 || s > 6)) return res.status(400).json({ error: 'Semesters must be numbers from 1 to 6.' });
  if (u.role === 'faculty') {
    const mine = classesTaught(u);
    if (noticeClasses(branch, sems).some((k) => !mine.has(k))) return res.status(403).json({ error: 'You can publish only to classes you teach.' });
  }
  db.prepare('UPDATE notices SET title=?, content=?, category=?, priority=?, target_branch=?, target_semesters=?, pdf_attachment=? WHERE id=?')
    .run(title, content, category, priority, branch, JSON.stringify([...new Set(sems)].sort()), clean(pick(b, 'pdfAttachment', n.pdf_attachment), 200), n.id);
  audit(u.username, 'notice_updated', 'notice', n.id);
  res.json(toNoticeDto(findNotice(n.id), u));
});

// ---------------- one-to-one notices ----------------
const canManageDirect = (u: any, d: any) => u.role === 'admin' || d.sent_by_user_id === u.id;

// PUT /api/direct-notices/:id  (who: checked inside)
editsRouter.put('/direct-notices/:id', staff, (req, res) => {
  const d = findDirect(String(req.params.id));
  if (!d) return res.status(404).json({ error: 'Message not found.' });
  if (!canManageDirect(req.user!, d)) return res.status(403).json({ error: 'You can edit only messages you sent.' });
  const title = clean(pick(req.body, 'title', d.title), 200), message = clean(pick(req.body, 'message', d.message), 2000);
  const priority = pick(req.body, 'priority', d.priority);
  if (!title || !message) return res.status(400).json({ error: 'Title and message are required.' });
  if (!DIRECT_PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Choose a priority.' });
  db.prepare('UPDATE direct_notices SET title=?, message=?, priority=? WHERE id=?').run(title, message, priority, d.id);
  audit(req.user!.username, 'direct_notice_updated', 'direct_notice', d.id);
  res.json(toDirectDto(findDirect(d.id)));
});

// DELETE /api/direct-notices/:id  (who: checked inside)
editsRouter.delete('/direct-notices/:id', staff, (req, res) => {
  const d = findDirect(String(req.params.id));
  if (!d) return res.status(404).json({ error: 'Message not found.' });
  if (!canManageDirect(req.user!, d)) return res.status(403).json({ error: 'You can delete only messages you sent.' });
  db.prepare('DELETE FROM direct_notices WHERE id=?').run(d.id);
  audit(req.user!.username, 'direct_notice_deleted', 'direct_notice', d.id);
  res.json({ ok: true });
});

// ---------------- doubts ----------------
editsRouter.delete('/doubts/:id', requireRole('admin', 'faculty', 'student'), (req, res) => {
  const u = req.user!;
  const d = findDoubt(String(req.params.id));
  if (!d) return res.status(404).json({ error: 'Doubt not found.' });
  const ownPending = u.role === 'student' && u.studentId === d.student_id && d.status === 'Pending';
  if (!(u.role === 'admin' || canTeach(u, d.subject_id) || ownPending)) {
    return res.status(403).json({ error: u.role === 'student' ? 'You can delete your doubt only while no teacher has replied.' : 'Only the teacher of this subject or the admin can delete it.' });
  }
  db.prepare('DELETE FROM doubts WHERE id=?').run(d.id);     // replies go with it (cascade)
  audit(u.username, 'doubt_deleted', 'doubt', d.id);
  res.json({ ok: true });
});

// ---------------- class dispatches ----------------
editsRouter.put('/dispatches/:id', staff, (req, res) => {
  const u = req.user!;
  const d = findDispatch(String(req.params.id));
  if (!d) return res.status(404).json({ error: 'Not found.' });
  if (u.role !== 'admin' && d.sent_by_user_id !== u.id) return res.status(403).json({ error: 'You can edit only material you sent.' });
  const title = clean(pick(req.body, 'title', d.title), 200);
  if (!title) return res.status(400).json({ error: 'Title is required.' });
  let due = d.due_date, max = d.max_marks;
  if (d.type === TASK_TYPE) {
    due = pick(req.body, 'dueDate', d.due_date);
    max = Number(pick(req.body, 'maxMarks', d.max_marks));
    if (!isDate(due)) return res.status(400).json({ error: 'Enter the due date.' });
    if (!Number.isFinite(max) || max <= 0 || max > 1000) return res.status(400).json({ error: 'Max marks must be between 1 and 1000.' });
  }
  db.prepare('UPDATE dispatches SET title=?, description=?, due_date=?, max_marks=? WHERE id=?').run(title, clean(pick(req.body, 'description', d.description), 2000), due, max, d.id);
  audit(u.username, 'dispatch_updated', 'dispatch', d.id);
  res.json(dispatchDto(findDispatch(d.id), u));
});

// ---------------- placement drives + job listings ----------------
const canManagePosting = (u: any, row: any) => u.role === 'admin' || row.posted_by_user_id === u.id;
// Http url.
const httpUrl = (v: unknown) => { const s = String(v ?? '').trim().slice(0, 500); try { const x = new URL(s); return x.protocol === 'https:' || x.protocol === 'http:' ? s : ''; } catch { return ''; } };
// Str list.
const strList = (v: unknown, n: number, len: number) => (Array.isArray(v) ? v.map((x) => String(x ?? '').trim().slice(0, len)).filter(Boolean).slice(0, n) : null);

// PUT /api/placement/drives/:id  (who: checked inside)
editsRouter.put('/placement/drives/:id', staff, (req, res) => {
  const u = req.user!, d = findDrive(String(req.params.id));
  if (!d) return res.status(404).json({ error: 'Drive not found.' });
  if (!canManagePosting(u, d)) return res.status(403).json({ error: 'Only the person who posted this drive, or admin, can edit it.' });
  const b = req.body || {};
  const title = clean(pick(b, 'title', d.title), 200), company = clean(pick(b, 'company', d.company), 150);
  const branch = pick(b, 'branch', d.branch), type = pick(b, 'type', d.type), deadline = pick(b, 'deadline', d.deadline);
  const vac = Math.round(Number(pick(b, 'vacancies', d.vacancies))), minPct = Number(pick(b, 'minPercentage', d.min_percentage) || 0);
  if (!title || !company) return res.status(400).json({ error: 'Title and company are required.' });
  if (!(P_BRANCHES as readonly string[]).includes(branch)) return res.status(400).json({ error: 'Choose the branch (CSE, Civil or Both).' });
  if (!(DRIVE_TYPES as readonly string[]).includes(type)) return res.status(400).json({ error: 'Choose the drive type.' });
  if (!isDate(deadline)) return res.status(400).json({ error: 'Enter the deadline.' });
  if (!Number.isFinite(vac) || vac < 1) return res.status(400).json({ error: 'Vacancies must be at least 1.' });
  if (!Number.isFinite(minPct) || minPct < 0 || minPct > 100) return res.status(400).json({ error: 'Minimum percentage must be between 0 and 100.' });
  db.prepare(`UPDATE placement_drives SET title=?, company=?, branch=?, type=?, ctc=?, stipend=?, location=?, deadline=?, vacancies=?, description=?, min_percentage=?,
    other_criteria=?, selection_process=?, key_skills=?, apply_url=?, contact_person=? WHERE id=?`)
    .run(title, company, branch, type, clean(pick(b, 'ctc', d.ctc), 80), clean(pick(b, 'stipend', d.stipend), 80), clean(pick(b, 'location', d.location), 120), deadline, vac,
      clean(pick(b, 'fullDescription', d.description), 3000), minPct, clean(pick(b, 'otherCriteria', d.other_criteria), 500),
      JSON.stringify(strList(b.selectionProcess, 12, 120) ?? JSON.parse(d.selection_process || '[]')), JSON.stringify(strList(b.keySkills, 20, 60) ?? JSON.parse(d.key_skills || '[]')),
      b.applyUrl !== undefined ? httpUrl(b.applyUrl) : d.apply_url, clean(pick(b, 'contactPerson', d.contact_person), 120), d.id);
  audit(u.username, 'placement_drive_updated', 'placement_drive', d.id);
  res.json(driveDto(findDrive(d.id), u));
});

// PUT /api/placement/jobs/:id  (who: checked inside)
editsRouter.put('/placement/jobs/:id', staff, (req, res) => {
  const u = req.user!, j = findJob(String(req.params.id));
  if (!j) return res.status(404).json({ error: 'Job listing not found.' });
  if (!canManagePosting(u, j)) return res.status(403).json({ error: 'Only the person who posted this listing, or admin, can edit it.' });
  const b = req.body || {};
  const title = clean(pick(b, 'title', j.title), 200), org = clean(pick(b, 'organization', j.organization), 150);
  const branch = pick(b, 'branch', j.branch), jobType = pick(b, 'jobType', j.job_type);
  const vac = Math.round(Number(pick(b, 'vacancies', j.vacancies) ?? 0));
  const deadline = String(pick(b, 'applicationDeadline', j.application_deadline) || '');
  if (!title || !org) return res.status(400).json({ error: 'Title and organization are required.' });
  if (!(P_BRANCHES as readonly string[]).includes(branch)) return res.status(400).json({ error: 'Choose the branch (CSE, Civil or Both).' });
  if (!(JOB_TYPES as readonly string[]).includes(jobType)) return res.status(400).json({ error: 'Choose the job type.' });
  if (!Number.isFinite(vac) || vac < 0) return res.status(400).json({ error: 'Vacancies must be a number.' });
  if (deadline && !isDate(deadline)) return res.status(400).json({ error: 'Enter the application deadline as a date.' });
  db.prepare(`UPDATE placement_jobs SET title=?, organization=?, branch=?, job_type=?, exam_or_post=?, expected_month=?, pay_scale=?, vacancies=?, qualification=?, age_limit=?,
    official_link=?, syllabus_summary=?, application_deadline=?, notes=? WHERE id=?`)
    .run(title, org, branch, jobType, clean(pick(b, 'examOrPostName', j.exam_or_post), 200), clean(pick(b, 'expectedMonth', j.expected_month), 60), clean(pick(b, 'payScale', j.pay_scale), 120),
      vac, clean(pick(b, 'qualification', j.qualification), 300), clean(pick(b, 'ageLimit', j.age_limit), 80), b.officialLink !== undefined ? httpUrl(b.officialLink) : j.official_link,
      clean(pick(b, 'syllabusSummary', j.syllabus_summary), 2000), deadline, clean(pick(b, 'notes', j.notes), 1000), j.id);
  audit(u.username, 'placement_job_updated', 'placement_job', j.id);
  res.json(jobDto(findJob(j.id), u));
});
