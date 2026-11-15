// The college runs on Indian time (no daylight saving), whatever time zone the server itself is set to.
const IST_MS = 330 * 60_000;
// true / false: ist parts?
export function istParts(ms: number) {
  const d = new Date(ms + IST_MS);
  const date = d.toISOString().slice(0, 10);
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7))).toISOString().slice(0, 10);
  return { date, hour: d.getUTCHours(), minute: d.getUTCMinutes(), weekStart: monday };
}
/** Whole days from IST-today to a YYYY-MM-DD date (negative = past). */
export function daysUntil(dateStr: string, nowMs: number): number {
  const a = Date.parse(istParts(nowMs).date + 'T00:00:00Z'), b = Date.parse(dateStr + 'T00:00:00Z');
  return Math.round((b - a) / 86400_000);
}
/** Push messages are held back at night: 07:00-21:00 IST only. (In-app notifications appear at once.) */
export const quietHours = (ms: number) => { const h = istParts(ms).hour; return h < 7 || h >= 21; };
