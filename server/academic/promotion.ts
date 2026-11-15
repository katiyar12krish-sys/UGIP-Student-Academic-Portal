// =====================================================================================================
// Class promotion (Step 18): move a whole class up one year in ONE action, automatically or by the admin
// -----------------------------------------------------------------------------------------------------
// What happens when classes are promoted (e.g. on 1 July 2027, after the May-June board result):
//   * every ACTIVE student of 1st year  -> 2nd year, semester 3
//   * every ACTIVE student of 2nd year  -> 3rd year, semester 5
//   * every ACTIVE student of 3rd year  -> status "Passed Out" (the record is kept forever, as alumni)
//   * students marked Detained / Year Back / Left / Passed Out are NOT moved (shown separately in the preview)
//   * the admin can also leave out chosen students (e.g. a student who failed) before pressing the button
// Nothing is deleted: marks, attendance, practicals and results stay linked to the student's id, and the
// class each student was in is written to student_class_history for every academic year.
// Every run stores a snapshot first, so the LAST promotion can be undone if it was a mistake.
//
// Also handled here: in January, students of an odd semester (1, 3, 5) move to the even semester (2, 4, 6)
// of the same year. That is a small "semester switch", also automatic and also undoable.
// =====================================================================================================
import { db } from '../db/connection';
import { audit } from '../auth/service';
import { newId } from './access';
import { academicYearOf, istParts, isEvenHalf, promotionDateReached, startYearOf, yearLabel } from './calendar';

/** Record statuses that mean "this student does not move up with the class". */
export const NOT_PROMOTED_STATUSES = ['Passed Out', 'Detained', 'Year Back', 'Left / Dropped'];
/** Status given to final-year students when their class is promoted. */
export const PASSED_OUT = 'Passed Out';

// ---------- tiny settings helpers (app_settings table) ----------
export function getSetting(key: string): string | null {
  const r = db.prepare('SELECT value FROM app_settings WHERE key=?').get(key) as any;
  return r ? r.value : null;
}
// Set setting.
export function setSetting(key: string, value: string) {
  db.prepare(`INSERT INTO app_settings (key,value,updated_at) VALUES (?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP`).run(key, value);
}

/**
 * The academic year a promotion done NOW moves students INTO.
 *   July..December -> the running year (e.g. Nov 2026 -> '2026-27': we are already in it)
 *   January..June  -> the coming year  (e.g. June 2027 -> '2027-28': the result is out, the new session is next)
 */
export function targetYearForPromotion(now = Date.now()): string {
  return yearLabel(istParts(now).y);   // both cases are "the academic year that starts in July of this calendar year"
}

/** First calendar year of a batch text like '2024-2027' (or '2024-27'), else null. */
function batchStart(batch: string | null): number | null {
  const m = /^(\d{4})/.exec(String(batch || '').trim());
  return m ? Number(m[1]) : null;
}

/**
 * Which study year a student SHOULD be in during academic year `target`, judged from the batch they joined.
 * A regular student of batch 2024-2027 is in year 1 in 2024-25, year 2 in 2025-26, year 3 in 2026-27.
 * A lateral-entry student joins straight into year 2, so their batch '2025-2027' means year 2 in 2025-26.
 * Returns null when the batch is unknown (then only the class-history check protects against double promotion).
 */
function expectedYear(s: any, target: string): number | null {
  const start = batchStart(s.batch);
  if (!start) return null;
  const lateral = /lateral/i.test(String(s.entry_type || ''));
  return startYearOf(target) - start + (lateral ? 2 : 1);
}

// Data shape: filter.
interface Filter { branch?: string | null; fromYear?: number | null; excludeIds?: string[] }

/** Students of the chosen class(es) with what would happen to each of them. Used by the preview and by the real run. */
export function planPromotion(f: Filter, target: string) {
  const where: string[] = ['deleted_at IS NULL'];
  const args: any[] = [];
  if (f.branch) { where.push('branch=?'); args.push(f.branch); }
  if (f.fromYear) { where.push('year=?'); args.push(f.fromYear); }
  const rows = db.prepare(`SELECT id, roll_no, name, branch, year, semester, batch, entry_type, record_status FROM students
    WHERE ${where.join(' AND ')} ORDER BY branch, year, roll_no`).all(...args) as any[];
  const exclude = new Set((f.excludeIds || []).map(String));
  const move: any[] = [], skip: any[] = [];
  for (const s of rows) {
    const base = { id: s.id, rollNo: s.roll_no, name: s.name, branch: s.branch, year: s.year, semester: s.semester, status: s.record_status };
    // 1) the admin unticked this student in the preview
    if (exclude.has(s.id)) { skip.push({ ...base, reason: 'Left out by admin' }); continue; }
    // 2) status says this student does not move (detained, year back, left, already passed out)
    if (NOT_PROMOTED_STATUSES.includes(s.record_status)) { skip.push({ ...base, reason: `Status: ${s.record_status}` }); continue; }
    // 3) already promoted into the target year (class history row exists) -> never promote twice
    if (db.prepare('SELECT 1 FROM student_class_history WHERE student_id=? AND academic_year=?').get(s.id, target)) {
      skip.push({ ...base, reason: `Already in ${target}` }); continue;
    }
    // 4) batch says the student is already in the right year (e.g. a NEW 1st-year admitted for this year)
    const exp = expectedYear(s, target);
    if (exp !== null && s.year >= exp) { skip.push({ ...base, reason: exp <= 1 ? 'New admission of this year' : `Batch ${s.batch}: already in year ${s.year}` }); continue; }
    // otherwise: move up (3rd year -> Passed Out)
    const toYear = s.year >= 3 ? 3 : s.year + 1;
    move.push({ ...base, toYear, toSemester: s.year >= 3 ? 6 : toYear * 2 - 1, toStatus: s.year >= 3 ? PASSED_OUT : s.record_status });
  }
  return { target, move, skip };
}

/** Write "student X was in class Y during academic year Z" (keeps the first value if the row already exists). */
function remember(studentId: string, ay: string, branch: string, year: number, semester: number, status: string | null) {
  db.prepare(`INSERT OR IGNORE INTO student_class_history (student_id,academic_year,branch,year,semester,record_status) VALUES (?,?,?,?,?,?)`)
    .run(studentId, ay, branch, year, semester, status);
}

/**
 * Promote now. mode 'auto' = the daily check did it, 'manual' = the admin pressed the button.
 * Returns the run id + counts. Runs inside one database transaction: either everybody moves or nobody does.
 */
export function promote(f: Filter, actor: string, mode: 'auto' | 'manual', now = Date.now()) {
  const target = targetYearForPromotion(now);
  const previous = yearLabel(startYearOf(target) - 1);
  const plan = planPromotion(f, target);
  const id = newId('prm');
  db.exec('BEGIN');
  try {
    const snapshot = plan.move.map((s) => ({ id: s.id, year: s.year, semester: s.semester, status: s.status }));
    for (const s of plan.move) {
      remember(s.id, previous, s.branch, s.year, s.semester, s.status);              // where they were last year
      db.prepare('UPDATE students SET year=?, semester=?, record_status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
        .run(s.toYear, s.toSemester, s.toStatus, s.id);
      remember(s.id, target, s.branch, s.toYear, s.toSemester, s.toStatus);          // where they are now
      const note = s.toStatus === PASSED_OUT ? `Passed out (final year completed, ${previous})` : `Promoted to year ${s.toYear}, semester ${s.toSemester} for ${target}`;
      db.prepare('INSERT INTO status_history (student_id,status,remarks,changed_by) VALUES (?,?,?,?)').run(s.id, s.toStatus || 'Active / Enrolled', note, actor);
    }
    db.prepare(`INSERT INTO promotion_runs (id,academic_year,branch,from_year,mode,moved,snapshot,run_by) VALUES (?,?,?,?,?,?,?,?)`)
      .run(id, target, f.branch || null, f.fromYear || null, mode, plan.move.length, JSON.stringify(snapshot), actor);
    audit(actor, 'class_promotion', 'promotion', id, `${mode} -> ${target}: ${plan.move.length} moved, ${plan.skip.length} not moved`);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  // A full promotion (all branches, all years) counts as "this year's promotion is done" for the automatic check.
  if (!f.branch && !f.fromYear) setSetting('promotion_done_for', target);
  return { id, target, moved: plan.move.length, skipped: plan.skip.length };
}

/** January: odd semester -> even semester for every active student (1->2, 3->4, 5->6). */
export function switchToEvenSemester(actor: string, mode: 'auto' | 'manual', now = Date.now()) {
  const ay = academicYearOf(now);
  const rows = db.prepare(`SELECT id, year, semester, record_status FROM students
    WHERE deleted_at IS NULL AND semester = year * 2 - 1 AND record_status NOT IN (${NOT_PROMOTED_STATUSES.map(() => '?').join(',')})`)
    .all(...NOT_PROMOTED_STATUSES) as any[];
  const id = newId('sem');
  db.exec('BEGIN');
  try {
    for (const s of rows) db.prepare('UPDATE students SET semester=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(s.semester + 1, s.id);
    db.prepare(`INSERT INTO promotion_runs (id,academic_year,mode,moved,snapshot,run_by) VALUES (?,?,?,?,?,?)`)
      .run(id, ay, 'semester', rows.length, JSON.stringify(rows.map((s) => ({ id: s.id, year: s.year, semester: s.semester, status: s.record_status }))), actor + (mode === 'auto' ? ' (auto)' : ''));
    audit(actor, 'semester_switch', 'promotion', id, `${ay}: ${rows.length} students to even semester`);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  return { id, academicYear: ay, moved: rows.length };
}

/** Undo the most recent promotion / semester switch (only the latest one, so the history stays consistent). */
export function undoLastRun(actor: string) {
  const run = db.prepare('SELECT * FROM promotion_runs WHERE undone_at IS NULL ORDER BY run_at DESC, rowid DESC LIMIT 1').get() as any;
  if (!run) return { ok: false as const, status: 404, error: 'There is no promotion to undo.' };
  const snap: { id: string; year: number; semester: number; status: string }[] = JSON.parse(run.snapshot || '[]');
  db.exec('BEGIN');
  try {
    for (const s of snap) {
      db.prepare('UPDATE students SET year=?, semester=?, record_status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(s.year, s.semester, s.status, s.id);
      // a class-promotion wrote a history row for the target year: remove it so the student can be promoted again later
      if (run.mode !== 'semester') db.prepare('DELETE FROM student_class_history WHERE student_id=? AND academic_year=?').run(s.id, run.academic_year);
      db.prepare('INSERT INTO status_history (student_id,status,remarks,changed_by) VALUES (?,?,?,?)').run(s.id, s.status || 'Active / Enrolled', 'Promotion undone', actor);
    }
    db.prepare('UPDATE promotion_runs SET undone_at=CURRENT_TIMESTAMP, undone_by=? WHERE id=?').run(actor, run.id);
    // promotion_done_for is NOT reset: the admin undid it on purpose, so the automatic check will not redo it.
    // They can promote again with the button when ready.
    audit(actor, 'promotion_undone', 'promotion', run.id, `${run.mode} ${run.academic_year}: ${snap.length} restored`);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  return { ok: true as const, restored: snap.length, run: run.id };
}

/** List of past runs for the admin screen (newest first). */
export function promotionHistory(limit = 50) {
  return (db.prepare('SELECT id, academic_year, branch, from_year, mode, moved, run_by, run_at, undone_at, undone_by FROM promotion_runs ORDER BY run_at DESC, rowid DESC LIMIT ?').all(limit) as any[])
    .map((r) => ({ id: r.id, academicYear: r.academic_year, branch: r.branch, fromYear: r.from_year, mode: r.mode, moved: r.moved,
      runBy: r.run_by, runAt: r.run_at, undoneAt: r.undone_at, undoneBy: r.undone_by }));
}

/** Is automatic promotion switched on? (PROMOTION_AUTO=0 in .env switches it off; default on) */
export const autoPromotionEnabled = () => process.env.PROMOTION_AUTO !== '0';

/**
 * Called once at start-up and then every hour by server/index.ts.
 *   * First ever start: only REMEMBERS the current year (does not move anybody: the data entered is already correct).
 *   * From the promotion date (default 1 July) on: promotes all classes once for the new academic year.
 *   * From 1 January on: moves odd-semester students to the even semester once per academic year.
 * Settings used: promotion_done_for (e.g. '2026-27'), semester_switch_done_for (e.g. '2026-27').
 */
export function autoAcademicTick(now = Date.now()): string[] {
  const done: string[] = [];
  const { y } = istParts(now);
  const thisYear = academicYearOf(now);                       // e.g. '2026-27'
  const promoDue = promotionDateReached(now);                 // true from the promotion date (1 July) until 31 December

  // First start of a new installation: just remember where we are, move nobody.
  if (getSetting('promotion_done_for') === null) {
    setSetting('promotion_done_for', yearLabel(promoDue ? y : y - 1));
    setSetting('semester_switch_done_for', isEvenHalf(now) ? thisYear : yearLabel(startYearOf(thisYear) - 1));
    return done;
  }
  if (!autoPromotionEnabled()) return done;

  // 1) Start of a new academic year: promote every class once.
  const lastPromo = startYearOf(getSetting('promotion_done_for') || '');
  if (promoDue && !(lastPromo >= y)) {
    const r = promote({}, 'system', 'auto', now);
    setSetting('promotion_done_for', yearLabel(y));
    done.push(`Promoted ${r.moved} students into ${yearLabel(y)}`);
  }
  // 2) January: odd -> even semester once per academic year.
  const lastSwitch = startYearOf(getSetting('semester_switch_done_for') || '');
  if (isEvenHalf(now) && !promoDue && !(lastSwitch >= startYearOf(thisYear))) {
    const r = switchToEvenSemester('system', 'auto', now);
    setSetting('semester_switch_done_for', thisYear);
    done.push(`Moved ${r.moved} students to the even semester of ${thisYear}`);
  }
  return done;
}

/** Status of the academic calendar, for the admin screen. */
export function calendarStatus(now = Date.now()) {
  const counts = db.prepare(`SELECT branch, year, semester, COUNT(*) n FROM students WHERE deleted_at IS NULL
    AND record_status NOT IN (${NOT_PROMOTED_STATUSES.map(() => '?').join(',')}) GROUP BY branch, year, semester ORDER BY branch, year`).all(...NOT_PROMOTED_STATUSES) as any[];
  const notMoving = db.prepare(`SELECT record_status AS status, COUNT(*) n FROM students WHERE deleted_at IS NULL
    AND record_status IN (${NOT_PROMOTED_STATUSES.map(() => '?').join(',')}) GROUP BY record_status`).all(...NOT_PROMOTED_STATUSES) as any[];
  return {
    academicYear: academicYearOf(now),
    semesterHalf: isEvenHalf(now) ? 'even' : 'odd',
    promotionTarget: targetYearForPromotion(now),
    promotionDate: process.env.PROMOTION_DATE || '07-01',
    autoEnabled: autoPromotionEnabled(),
    promotionDoneFor: getSetting('promotion_done_for'),
    semesterSwitchDoneFor: getSetting('semester_switch_done_for'),
    classes: counts.map((c) => ({ branch: c.branch, year: c.year, semester: c.semester, students: c.n })),
    notMoving: notMoving.map((c) => ({ status: c.status, students: c.n })),
    history: promotionHistory(20),
  };
}
