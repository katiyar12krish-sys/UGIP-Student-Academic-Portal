// =====================================================================================================
// Academic calendar helpers (Step 18)
// -----------------------------------------------------------------------------------------------------
// UBTER polytechnic year used by this portal:
//   * An ACADEMIC YEAR runs from 1 July to 30 June, written like '2026-27'.
//   * ODD semesters (1, 3, 5) run July..December, EVEN semesters (2, 4, 6) run January..June.
//   * The board result of the even semester comes out around May-June. After that, from the
//     PROMOTION DATE (default 1 July, can be changed with PROMOTION_DATE=MM-DD in .env), students move
//     up one year: 1st year -> 2nd year, 2nd year -> 3rd year, 3rd year -> "Passed Out".
// Everything here is plain date maths; nothing touches the database.
// =====================================================================================================

/** Dates are judged in Indian time (IST = UTC+5:30), so a promotion never happens "a few hours early". */
const IST_OFFSET_MS = 330 * 60_000;

/** Year / month / day of a moment, as seen on a clock in India. */
export function istParts(now: number = Date.now()): { y: number; m: number; d: number } {
  const t = new Date(now + IST_OFFSET_MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

/** Label of the academic year a calendar year starts, e.g. 2026 -> '2026-27'. */
export function yearLabel(startYear: number): string {
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

/** First calendar year of a label, e.g. '2026-27' -> 2026 (NaN if the text is not a valid label). */
export function startYearOf(label: string): number {
  const m = /^(\d{4})-(\d{2})$/.exec(String(label || ''));
  return m ? Number(m[1]) : NaN;
}

/** Academic year that contains this moment: 9 Nov 2026 -> '2026-27', 15 Mar 2027 -> '2026-27', 2 Jul 2027 -> '2027-28'. */
export function academicYearOf(now: number = Date.now()): string {
  const { y, m } = istParts(now);
  return yearLabel(m >= 7 ? y : y - 1);
}

/** Academic year of a 'YYYY-MM-DD' date string (falls back to "today" if the text is not a date). */
export function academicYearOfDate(date: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(date || ''));
  if (!m) return academicYearOf();
  const y = Number(m[1]);
  return yearLabel(Number(m[2]) >= 7 ? y : y - 1);
}

/** Is this moment in the even-semester half (January..June)? */
export function isEvenHalf(now: number = Date.now()): boolean {
  return istParts(now).m <= 6;
}

/** The semester a student of this study year should be in right now: year 2 in November -> 3, in February -> 4. */
export function semesterFor(year: number, now: number = Date.now()): number {
  return year * 2 - (isEvenHalf(now) ? 0 : 1);
}

/** Promotion date inside each calendar year, from PROMOTION_DATE=MM-DD (default '07-01' = 1 July). */
export function promotionMonthDay(): { m: number; d: number } {
  const raw = String(process.env.PROMOTION_DATE || '07-01').trim();
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(raw);
  const mm = m ? Number(m[1]) : 7, dd = m ? Number(m[2]) : 1;
  // Only allow a date in June..August: the result comes in May-June and the new session starts in July.
  if (mm < 6 || mm > 8 || dd < 1 || dd > 31) return { m: 7, d: 1 };
  return { m: mm, d: dd };
}

/** Has this year's promotion date been reached? (e.g. true from 1 July 2027 00:00 IST onwards, until 31 Dec) */
export function promotionDateReached(now: number = Date.now()): boolean {
  const { m, d } = istParts(now);
  const p = promotionMonthDay();
  return m > p.m || (m === p.m && d >= p.d);
}

/** Study year (1, 2, 3) a regular student admitted in `admissionYear` is in during academic year `label`. */
export function studyYearFor(admissionYear: number, label: string): number {
  return startYearOf(label) - admissionYear + 1;
}
