// ===================================================================================================
// One-time import of marks / attendance that older versions kept only in the admin's browser.
// ===================================================================================================
import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db/connection';
import { requireRole } from '../auth/middleware';
import { audit } from '../auth/service';
import { studentInClass, newId, clean } from '../academic/access';
import { importLegacy as importOnlineTests } from '../assignments/service';

export const legacyImportRouter = Router();
const SAFE_ID = /^[A-Za-z0-9_-]{3,64}$/;
const TYPES = ['Sessional 1', 'Sessional 2', 'Unit Test', 'Practical / Viva', 'Pre-Board Mock', 'Board Exam'];

/**
 * One-time move of the exams, marks and attendance that older versions kept in the browser (localStorage) into the server.
 * Admin only. Safe to run twice: existing ids are skipped, nothing is overwritten.
 * Body: { subjects?, tests?, attendanceSessions? } in the shapes the old app used.
 */
legacyImportRouter.post('/admin/import-legacy', requireRole('admin'), (req, res) => {
  const b = req.body || {};
  const sum = { subjectsAdded: 0, testsAdded: 0, marksAdded: 0, sessionsAdded: 0, recordsAdded: 0, onlineTestsAdded: 0, onlineSubmissionsAdded: 0, skipped: [] as string[] };
  // Skip.
  const skip = (m: string) => { if (sum.skipped.length < 25) sum.skipped.push(m); };
  const subjects: any[] = Array.isArray(b.subjects) ? b.subjects.slice(0, 500) : [];
  const tests: any[] = Array.isArray(b.tests) ? b.tests.slice(0, 2000) : [];
  const sessions: any[] = Array.isArray(b.attendanceSessions) ? b.attendanceSessions.slice(0, 20000) : [];

  db.exec('BEGIN');
  try {
    for (const s of subjects) {
      if (!SAFE_ID.test(String(s?.id)) || !clean(s.code, 30) || !clean(s.name, 200) || !['CSE', 'Civil'].includes(s.branch)
        || !(s.semester >= 1 && s.semester <= 6) || !(s.year >= 1 && s.year <= 3)) { skip(`subject ${s?.id}: invalid`); continue; }
      const r = db.prepare('INSERT OR IGNORE INTO subjects (id,code,name,branch,semester,year,credits,has_practical) VALUES (?,?,?,?,?,?,?,?)')
        .run(s.id, clean(s.code, 30), clean(s.name, 200), s.branch, s.semester, s.year, Math.max(0, Math.min(30, Number(s.credits) || 0)), s.hasPractical ? 1 : 0);
      sum.subjectsAdded += Number(r.changes);
    }

    for (const t of tests) {
      const sub = db.prepare('SELECT * FROM subjects WHERE id=?').get(String(t?.subjectId)) as any;
      if (!sub) { skip(`exam ${t?.id}: unknown subject ${t?.subjectId}`); continue; }
      const max = Number(t.maxMarks);
      if (!Number.isFinite(max) || max <= 0 || !clean(t.title, 200)) { skip(`exam ${t?.id}: invalid`); continue; }
      const id = SAFE_ID.test(String(t.id)) ? String(t.id) : newId('tst');
      const r = db.prepare(`INSERT OR IGNORE INTO tests (id,title,type,subject_id,max_marks,date,time_slot,room,duration,reporting_time,instructions,status,branch,semester,created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, clean(t.title, 200), TYPES.includes(t.type) ? t.type : 'Unit Test', sub.id, max, clean(t.date, 20), clean(t.timeSlot, 60),
        clean(t.roomNumber, 80), clean(t.duration, 40), clean(t.reportingTime, 40), clean(t.instructions, 1000),
        ['Upcoming', 'Ongoing', 'Completed'].includes(t.status) ? t.status : 'Completed', sub.branch, sub.semester, `import:${req.user!.username}`);
      sum.testsAdded += Number(r.changes);
      for (const m of Array.isArray(t.results) ? t.results : []) {
        const v = m?.marksObtained;
        if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > max) { skip(`mark ${m?.studentId} in ${id}: bad value`); continue; }
        if (!studentInClass(String(m.studentId), sub.branch, sub.semester)) { skip(`mark ${m?.studentId} in ${id}: student not in class`); continue; }
        const mr = db.prepare('INSERT OR IGNORE INTO test_marks (test_id,student_id,marks_obtained,remarks,updated_by) VALUES (?,?,?,?,?)')
          .run(id, m.studentId, v, clean(m.remarks, 300), `import:${req.user!.username}`);
        sum.marksAdded += Number(mr.changes);
      }
    }

    for (const s of sessions) {
      const sub = db.prepare('SELECT * FROM subjects WHERE id=?').get(String(s?.subjectId)) as any;
      if (!sub) { skip(`attendance ${s?.id}: unknown subject ${s?.subjectId}`); continue; }
      const id = SAFE_ID.test(String(s.id)) ? String(s.id) : newId('att');
      const fac = (db.prepare("SELECT id FROM users WHERE id=? AND role='faculty'").get(String(s.facultyId)) as any)?.id
        || (db.prepare('SELECT user_id FROM faculty_subject_assignments WHERE subject_id=? LIMIT 1').get(sub.id) as any)?.user_id || req.user!.id;
      const date = /^\d{4}-\d{2}-\d{2}$/.test(String(s.date)) ? s.date : new Date().toISOString().slice(0, 10);
      const at = Date.parse(date + 'T09:00:00Z') || Date.now();
      const r = db.prepare(`INSERT OR IGNORE INTO attendance_sessions (id,subject_id,faculty_id,branch,semester,date,time_slot,topic,qr_token,pin,status,expires_at,created_at,closed_at)
        VALUES (?,?,?,?,?,?,?,?,?,?, 'Closed', ?, ?, ?)`).run(id, sub.id, fac, sub.branch, sub.semester, date, clean(s.timeSlot, 60), clean(s.topicTaught, 300),
        `IMPORTED-${crypto.randomBytes(12).toString('hex')}`, String(crypto.randomInt(100000, 1000000)), at, at, at);
      sum.sessionsAdded += Number(r.changes);
      if (!Number(r.changes)) continue;   // already imported earlier
      for (const rec of Array.isArray(s.records) ? s.records : []) {
        if (!['Present', 'Absent', 'Late'].includes(rec?.status) || !studentInClass(String(rec.studentId), sub.branch, sub.semester)) { skip(`attendance record ${rec?.studentId} in ${id}: skipped`); continue; }
        const rr = db.prepare('INSERT OR IGNORE INTO attendance_records (session_id,student_id,status,marked_via,marked_by,marked_at) VALUES (?,?,?,?,?,?)')
          .run(id, rec.studentId, rec.status, ['QR', 'PIN', 'Manual'].includes(rec.markedVia) ? rec.markedVia : 'Manual', `import:${req.user!.username}`, at);
        sum.recordsAdded += Number(rr.changes);
      }
    }
    if (Array.isArray(b.onlineTests) && b.onlineTests.length) {   // assignments / online tests (Step 7)
      const o = importOnlineTests(b.onlineTests, req.user!);
      sum.onlineTestsAdded = o.added; sum.onlineSubmissionsAdded = o.submissionsAdded;
      for (const m of o.skipped) skip(m);
    }
    audit(req.user!.username, 'legacy_import', 'import', null, JSON.stringify({ ...sum, skipped: sum.skipped.length }));
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  res.json(sum);
});
