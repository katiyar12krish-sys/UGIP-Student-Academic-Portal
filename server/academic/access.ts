// ===================================================================================================
// Access helpers for marks / attendance / practicals.
// The "faculty-subject rule" lives here: a teacher may write marks and attendance only for subjects the
// admin assigned to them. Also: which students belong to a class (now also via class history, so last
// year's records stay editable after promotion), grade from percentage, input cleaning and id creation.
// ===================================================================================================
import { db } from '../db/connection';
import type { SessionUser } from '../auth/session';

// ---- The faculty-subject rule lives here. Every marks / attendance route goes through these helpers. ----

/** May this user WRITE marks / run attendance for this subject? Admin: always. Faculty: only subjects assigned to them. */
export function canTeach(u: SessionUser, subjectId: string): boolean {
  if (u.role === 'admin') return true;
  return u.role === 'faculty' && u.subjectIds.includes(subjectId);
}

/** May this user READ the whole class marks of this subject? Teachers, admin, and colleagues the owner granted access to. */
export function canReadSubjectMarks(u: SessionUser, subjectId: string): boolean {
  if (canTeach(u, subjectId)) return true;
  if (u.role !== 'faculty') return false;
  const row = db.prepare(`SELECT 1 FROM marks_access_grants g
      JOIN faculty_subject_assignments a ON a.user_id = g.owner_user_id
      WHERE g.grantee_user_id = ? AND a.subject_id = ?`).get(u.id, subjectId);
  return !!row;
}

// Student row.
export function studentRow(studentId: string): any {
  return db.prepare('SELECT id, name, roll_no, branch, semester FROM students WHERE id=? AND deleted_at IS NULL').get(studentId);
}

/**
 * Is (or was) this student in the class branch + semester?
 *   * current class matches                                         -> yes
 *   * Step 18: the class history says they were in that branch and study year during `academicYear`
 *     (e.g. a 2025-26 RDBMS test of semester 4, for a student who has since been promoted to semester 5) -> yes
 * Without the second rule, marks of last year could no longer be corrected after the class was promoted.
 */
export function studentInClass(studentId: string, branch: string, semester: number, academicYear?: string | null): boolean {
  const s = studentRow(studentId);
  if (!s) return false;
  if (s.branch === branch && s.semester === semester) return true;
  return studentWasInClass(studentId, branch, semester, academicYear);
}

/** Class-history check only: was the student in this branch and study year (semester 3/4 = year 2) in that academic year? */
export function studentWasInClass(studentId: string, branch: string, semester: number, academicYear?: string | null): boolean {
  const year = Math.ceil(semester / 2);
  const row = academicYear
    ? db.prepare('SELECT 1 FROM student_class_history WHERE student_id=? AND branch=? AND year=? AND academic_year=?').get(studentId, branch, year, academicYear)
    : db.prepare('SELECT 1 FROM student_class_history WHERE student_id=? AND branch=? AND year=?').get(studentId, branch, year);
  return !!row;
}

/** Student ids whose records this user may see as "their own": the student themself, or a parent's linked children. */
export function ownStudentIds(u: SessionUser): string[] {
  if (u.role === 'student' && u.studentId) return [u.studentId];
  if (u.role === 'parent') return u.childIds;
  return [];
}

// Grade for.
export function gradeFor(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
}

// Clean.
export const clean = (v: unknown, max = 200): string | null => (v === undefined || v === null || v === '' ? null : String(v).slice(0, max));

// New id.
export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
