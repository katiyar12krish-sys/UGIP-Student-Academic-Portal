// ===================================================================================================
// Who may see the random SAMPLE data (is_demo = 1: sample students, their exams, attendance, practicals,
// online tests, board results) and the database viewer: only the admin and the HOD of Computer Science.
// Everybody else (other teachers, students, parents) gets only real records; the server leaves the sample
// rows out of every list, so nothing about them reaches the browser.
// ===================================================================================================
import type { SessionUser } from './session';

/** Admin, or the faculty member whose designation says HOD of Computer Science. */
export function seesSample(u: SessionUser | null | undefined): boolean {
  if (!u) return false;
  if (u.role === 'admin') return true;
  const d = u.designation || '';
  return u.role === 'faculty' && /\bHOD\b/i.test(d) && /computer\s*science/i.test(d);
}

/**
 * Lists that teachers use leave sample rows out for every teacher except the CSE HOD. Students and parents only
 * ever get their own class / child, so a sample student still sees their own sample exams (nothing changes for them).
 */
export const hideSample = (u: SessionUser | null | undefined): boolean => !!u && u.role === 'faculty' && !seesSample(u);

/** Keep a row unless it is sample data that this person must not see. */
export const keepRow = (u: SessionUser | null | undefined) => (r: { is_demo?: number | null }): boolean => !(hideSample(u) && r.is_demo);

/** SQL piece to add to a WHERE clause: '' or ' AND <alias>.is_demo=0'. */
export const realOnly = (u: SessionUser | null | undefined, alias = ''): string => (hideSample(u) ? ` AND ${alias ? alias + '.' : ''}is_demo=0` : '');
