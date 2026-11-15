// ===================================================================================================
// Exam calendar of the semester. Everybody signed in reads it; the admin adds / changes / removes dates.
// The first start fills in the odd-semester 2026 dates given by the college (seedExamCalendar, once).
// ===================================================================================================
import { Router } from 'express';
import { db } from '../db/connection';
import { requireAuth, requireRole } from '../auth/middleware';
import { audit } from '../auth/service';
import { newId } from '../academic/access';

export const examCalendarRouter = Router();
const KINDS = ['form', 'test', 'checking', 'practical', 'theory', 'result', 'holiday', 'other'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const dto = (r: any) => ({ id: r.id, title: r.title, kind: r.kind, startDate: r.start_date, endDate: r.end_date, note: r.note, updatedBy: r.updated_by, updatedAt: r.updated_at });

function check(b: any): string | null {
  if (typeof b?.title !== 'string' || !b.title.trim()) return 'Write a title';
  if (!KINDS.includes(b?.kind)) return 'Choose a type';
  if (!DATE.test(String(b?.startDate)) || !DATE.test(String(b?.endDate)) || isNaN(Date.parse(b.startDate)) || isNaN(Date.parse(b.endDate))) return 'Choose the start and end date';
  if (b.endDate < b.startDate) return 'The end date is before the start date';
  return null;
}

/** The dates the college gave for the odd semester 2026 (only on a database that has no calendar yet). */
export function seedExamCalendar(): string[] {
  db.exec(`CREATE TABLE IF NOT EXISTS library_seed (key TEXT PRIMARY KEY, created_at INTEGER NOT NULL)`);
  if (db.prepare("SELECT 1 FROM library_seed WHERE key='exam-calendar-2026-odd'").get()) return [];
  const now = Date.now();
  const rows: [string, string, string, string, string][] = [
    ['Exam forms', 'form', '2026-10-27', '2026-11-16', 'Fill the UBTER semester exam form and pay the fee before 16 November.'],
    ['Sessional tests, assignments & practical work', 'test', '2026-11-17', '2026-12-01', 'Class tests are held; submit all assignments and complete practical files.'],
    ['Assignment & practical copies checked', 'checking', '2026-11-17', '2026-12-01', 'Teachers check assignment and practical copies and enter the sessional marks by 1 December.'],
    ['Practical exams & final theory papers', 'theory', '2026-12-01', '2026-12-15', 'Board practical exams and final theory papers. Check the date sheet for each subject.'],
  ];
  db.exec('BEGIN');
  for (const [title, kind, s, e, note] of rows)
    db.prepare('INSERT INTO exam_calendar (id,title,kind,start_date,end_date,note,updated_by,updated_at) VALUES (?,?,?,?,?,?,?,?)').run(newId('cal'), title, kind, s, e, note, 'College office', now);
  db.prepare("INSERT INTO library_seed (key, created_at) VALUES ('exam-calendar-2026-odd', ?)").run(now);
  db.exec('COMMIT');
  return [`exam calendar: ${rows.length} dates added for the odd semester 2026`];
}

examCalendarRouter.get('/exam-calendar', requireAuth, (_req, res) =>
  res.json((db.prepare('SELECT * FROM exam_calendar ORDER BY start_date, end_date').all() as any[]).map(dto)));

examCalendarRouter.post('/exam-calendar', requireRole('admin'), (req, res) => {
  const b = req.body || {}, err = check(b);
  if (err) return res.status(400).json({ error: err });
  const id = newId('cal');
  db.prepare('INSERT INTO exam_calendar (id,title,kind,start_date,end_date,note,updated_by,updated_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, b.title.trim().slice(0, 150), b.kind, b.startDate, b.endDate, String(b.note || '').trim().slice(0, 500), req.user!.name, Date.now());
  audit(req.user!.username, 'exam_calendar_added', 'exam_calendar', id);
  res.status(201).json(dto(db.prepare('SELECT * FROM exam_calendar WHERE id=?').get(id)));
});

examCalendarRouter.put('/exam-calendar/:id', requireRole('admin'), (req, res) => {
  const b = req.body || {}, err = check(b);
  if (err) return res.status(400).json({ error: err });
  const r = db.prepare('UPDATE exam_calendar SET title=?, kind=?, start_date=?, end_date=?, note=?, updated_by=?, updated_at=? WHERE id=?')
    .run(b.title.trim().slice(0, 150), b.kind, b.startDate, b.endDate, String(b.note || '').trim().slice(0, 500), req.user!.name, Date.now(), req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Not found' });
  audit(req.user!.username, 'exam_calendar_changed', 'exam_calendar', String(req.params.id));
  res.json(dto(db.prepare('SELECT * FROM exam_calendar WHERE id=?').get(req.params.id)));
});

examCalendarRouter.delete('/exam-calendar/:id', requireRole('admin'), (req, res) => {
  const r = db.prepare('DELETE FROM exam_calendar WHERE id=?').run(req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'Not found' });
  audit(req.user!.username, 'exam_calendar_deleted', 'exam_calendar', String(req.params.id));
  res.json({ ok: true });
});
