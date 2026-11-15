// ===================================================================================================
// Finds marks / attendance that older versions kept in this browser, so the admin can move them to the server.
// ===================================================================================================
import { academicApi } from './academicApi';
import { INITIAL_TESTS, INITIAL_ATTENDANCE_SESSIONS } from '../data/mockData';

// Older versions kept exams, marks and attendance in the browser. These keys are what they used.
const KEYS = { tests: 'ugip_tests_v8', attendance: 'ugip_attendance_v8', subjects: 'ugip_subjects_v8', online: 'ugip_online_tests_v9' };

// Read.
function read<T>(key: string): T[] {
  try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}

// The sample exams / sessions that shipped with the app are not real college data, so they are not moved.
const demoTestIds = new Set(INITIAL_TESTS.map((t) => t.id));
const demoSessionIds = new Set(INITIAL_ATTENDANCE_SESSIONS.map((s) => s.id));
const demoOnlineIds = new Set(['test-assign-1', 'test-assign-2']);   // the two sample assignments the old version created on first run

// Legacy browser data.
export function legacyBrowserData() {
  const tests = read<any>(KEYS.tests).filter((t) => !demoTestIds.has(t.id));
  const sessions = read<any>(KEYS.attendance).filter((s) => !demoSessionIds.has(s.id));
  const subjects = read<any>(KEYS.subjects);
  const onlineTests = read<any>(KEYS.online).filter((t) => !demoOnlineIds.has(t.id));
  const marks = tests.reduce((n, t) => n + (t.results?.length || 0), 0);
  const records = sessions.reduce((n, s) => n + (s.records?.length || 0), 0);
  const hasAnyOldKey = [KEYS.tests, KEYS.attendance].some((k) => localStorage.getItem(k) !== null) || onlineTests.length > 0;
  return { tests, sessions, subjects, onlineTests, marks, records, hasAnyOldKey, hasRealData: tests.length + sessions.length + onlineTests.length > 0 };
}

/** Sends the old browser data to the server (admin only), then removes it from this browser. */
export async function importLegacyBrowserData(): Promise<{ ok: boolean; message: string }> {
  const d = legacyBrowserData();
  if (d.hasRealData) {
    const r = await academicApi.importLegacy({ subjects: d.subjects, tests: d.tests, attendanceSessions: d.sessions, onlineTests: d.onlineTests });
    if (!r.ok) return { ok: false, message: r.error };
    const x = r.data;
    localStorage.removeItem(KEYS.tests);
    localStorage.removeItem(KEYS.attendance);
    localStorage.removeItem(KEYS.online);
    return {
      ok: true,
      message: `Moved to the server: ${x.testsAdded} exams, ${x.marksAdded} marks, ${x.sessionsAdded} attendance sessions, ${x.recordsAdded} attendance records, ${x.onlineTestsAdded ?? 0} online tests / assignments (${x.onlineSubmissionsAdded ?? 0} submissions).` +
        (x.skipped.length ? `\n\nSkipped ${x.skipped.length} item(s), for example:\n- ${x.skipped.slice(0, 5).join('\n- ')}` : ''),
    };
  }
  localStorage.removeItem(KEYS.tests);
  localStorage.removeItem(KEYS.attendance);
  localStorage.removeItem(KEYS.online);
  return { ok: true, message: 'Only sample data was found in this browser, so nothing needed moving. The old copy has been cleared.' };
}
