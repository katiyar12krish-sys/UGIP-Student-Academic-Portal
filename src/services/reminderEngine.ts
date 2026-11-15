// ===================================================================================================
// Deadline helpers for online tests: time left, reminder schedule (shown on the screens).
// ===================================================================================================
import type { OnlineTestAssignment } from '../types';

/**
 * Assignment / test deadlines. The reminders themselves (72 h, 24 h and 3 h before the deadline, only to students who have not
 * submitted, and the teacher's summary after the deadline) are now sent by the SERVER (server/notify/rules.ts), so they reach
 * people even when no browser is open. This file only keeps what the screen needs to show the countdown.
 */
export const REMINDER_HOURS = [72, 24, 3]; // reminder 1, 2, 3
const HOUR = 3600_000;

/** Deadlines are Indian time, the same way the server reads them. */
export const deadlineMs = (t: Pick<OnlineTestAssignment, 'deadlineDate' | 'deadlineTime'>) =>
  new Date(`${t.deadlineDate}T${t.deadlineTime || '23:59'}:00+05:30`).getTime();

// Time left label.
export const timeLeftLabel = (msLeft: number) => {
  if (msLeft <= 0) return 'Deadline passed';
  const h = Math.floor(msLeft / HOUR);
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h left` : `${h}h ${Math.floor((msLeft % HOUR) / 60000)}m left`;
};
