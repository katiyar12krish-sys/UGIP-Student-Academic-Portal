// ===================================================================================================
// Saves student records to the server and reports which details are still missing.
// ===================================================================================================
import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { UserProfile } from '../types';
import { missingFields } from '../utils/studentRules';

/**
 * Keeps students in sync with the server database (data/portal.db).
 * - Works offline: changes wait in a local queue and are sent when the server is reachable again.
 * - Pull on start; push on every change (add / edit / delete / status).
 */
const QUEUE_KEY = 'ugip_sync_queue_v1';
// Data shape: op.
type Op = { id: string; op: 'save' | 'delete'; body?: any };

// Num.
const num = (v: unknown) => {
  const m = String(v ?? '').match(/[\d.]+/);
  return m ? parseFloat(m[0]) : null;
};
// Parse res.
function parseRes(v?: string) {
  if (!v || /n\/?a/i.test(v)) return null;
  let percentage: number | null = null, cgpa: number | null = null;
  for (const part of String(v).split('/')) {
    const n = num(part);
    if (n === null) continue;
    if (part.includes('%') || n > 10) percentage = n; else cgpa = n;
  }
  return percentage === null && cgpa === null ? null : { percentage, cgpa };
}

/** Details still blank for this student (same rule as the server's `missing` list). */
export function getMissing(u: UserProfile): string[] {
  const a = toApi(u);
  return missingFields({
    semester: Number(a.semester) || 1, batch: a.batch, entryType: a.entryType, aadharStored: !!(u.aadharNumber || u.aadharMasked),
    phone: a.phone, category: a.category, gender: a.gender, tenth: a.tenthPercentage, twelfth: a.twelfthPercentage,
    address: a.fullAddress, mother: a.motherName, father: a.fatherName, semesters: a.semesters, years: a.years,
  });
}

// Converts to api.
export function toApi(u: UserProfile) {
  const semesters: any[] = [], years: any[] = [];
  for (let k = 1; k <= 6; k++) {
    const r = parseRes((u.semestersPercentage as any)?.[`sem${k}`] ?? (u as any)[`sem${k}`]);
    if (r) semesters.push({ semester: k, ...r });
  }
  [u.firstYearCgpa, u.secondYearCgpa, u.thirdYearCgpa].forEach((v, i) => {
    const r = parseRes(v);
    if (r) years.push({ year: i + 1, ...r });
  });
  return {
    id: u.id, name: u.name, rollNo: u.ubterRollNumber || u.rollNo, branch: u.branch, year: u.year, semester: u.semester,
    phone: u.phone, aadharName: u.aadharName, aadharNumber: u.aadharNumber, batch: u.batch,
    entryType: /lateral/i.test(u.batch || '') ? 'Lateral' : 'Regular', category: u.category, gender: u.gender,
    tenthPercentage: num(u.tenthPercentage), twelfthPercentage: num(u.twelfthPercentage),
    fullAddress: u.fullAddress, motherName: u.motherName, fatherName: u.fatherName, recordStatus: u.recordStatus,
    semesters, years,
  };
}

// From api.
function fromApi(d: any, existing?: UserProfile): UserProfile {
  const first = String(d.name).split(' ')[0].toLowerCase();
  // Fmt.
  const fmt = (r: any) => (r.percentage != null ? `${r.percentage}%` : `${r.cgpa}`);
  const sem: any = {};
  (d.semesters || []).forEach((r: any) => (sem[`sem${r.semester}`] = fmt(r)));
  // Yr.
  const yr = (n: number) => { const r = (d.years || []).find((x: any) => x.year === n); return r ? (r.cgpa != null ? `${r.cgpa} CGPA` : `${r.percentage}%`) : undefined; };
  const base: any = existing ?? {
    id: d.id, role: 'student', avatar: '',
    email: `${first}${String(d.rollNo).slice(-3)}@student.gpt-tanakpur.gov.in`,
  };
  return {
    ...base, name: d.name, aadharName: d.aadharName ?? base.aadharName ?? d.name, rollNo: d.rollNo, ubterRollNumber: d.rollNo,
    phone: d.phone ?? undefined, branch: d.branch, year: d.year, semester: d.semester, batch: d.batch ?? base.batch,
    category: d.category ?? undefined, gender: d.gender ?? undefined,
    tenthPercentage: d.tenthPercentage != null ? `${d.tenthPercentage}%` : undefined, twelfthPercentage: d.twelfthPercentage != null ? `${d.twelfthPercentage}%` : undefined,
    fullAddress: d.fullAddress ?? undefined, motherName: d.motherName ?? undefined, fatherName: d.fatherName ?? undefined,
    recordStatus: d.recordStatus ?? base.recordStatus,
    studentPassword: d.studentPassword || 'Student@123',
    avatar: d.photoUrl || (String(base.avatar || '').startsWith('/api/photos/') ? '' : base.avatar) || '',     // server-stored photo wins; an older browser-only photo stays until replaced
    // the server copy wins (the old code kept the browser copy, so edits made on another device never showed up)
    semestersPercentage: sem,
    firstYearCgpa: yr(1), secondYearCgpa: yr(2), thirdYearCgpa: yr(3),
    // the full Aadhaar number is not kept in the browser once the server holds it; only the last 4 digits are shown
    aadharMasked: d.aadharMasked ?? undefined,
    aadharNumber: d.aadharStored ? undefined : base.aadharNumber,
  } as UserProfile;
}

// Read q.
const readQ = (): Op[] => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; } };
// Write q.
const writeQ = (q: Op[]) => localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
// Enqueue.
function enqueue(op: Op) { writeQ([...readQ().filter((o) => o.id !== op.id), op]); } // keep only the latest op per student

// Flush.
async function flush(): Promise<boolean> {
  for (const op of readQ()) {
    try {
      const res = op.op === 'delete'
        ? await fetch(`/api/students/${encodeURIComponent(op.id)}`, { method: 'DELETE' })
        : await fetch('/api/students', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(op.body) });
      if (res.status >= 500 || res.status === 401) return false; // server down / not logged in: keep the queue for later
      if (res.status >= 400) {   // bad data: drop it, but tell the person (the old code only wrote to the console)
        const msg = await res.json().then((b: any) => b?.error).catch(() => null);
        console.warn('Sync rejected', op.id, res.status, msg);
        window.dispatchEvent(new CustomEvent('ugip-sync-rejected', { detail: { id: op.id, status: res.status, message: msg || 'The server did not accept this record' } }));
      }
      writeQ(readQ().filter((o) => !(o.id === op.id && JSON.stringify(o) === JSON.stringify(op))));
    } catch { return false; } // offline: keep queue
  }
  return true;
}

// Use student sync.
export function useStudentSync(
  users: UserProfile[],
  setUsers: Dispatch<SetStateAction<UserProfile[]>>,
  auth: { id: string; role: string; studentId: string | null } | null,
) {
  const usersRef = useRef(users); usersRef.current = users;
  const snap = useRef(new Map<string, string>());
  const ready = useRef(false);

  const canWrite = auth?.role === 'admin' || auth?.role === 'faculty';
  const authKey = auth ? `${auth.id}:${auth.role}` : '';

  // Runs automatically whenever these change: authKey.
  useEffect(() => {
    ready.current = false;
    if (!auth) return; // not logged in: nothing to sync (the server would answer 401)
    let alive = true;
    (async () => {
      // A student / parent browser must never keep other children's records (e.g. left over from a staff login on a shared computer).
      // Parents read their children from /api/parent/children, so no student rows are needed here at all.
      if (!canWrite) {
        const keepId = auth.role === 'student' ? (auth.studentId || auth.id) : null;
        setUsers((prev) => prev.filter((u) => u.role !== 'student' || u.id === keepId));
      }
      if (canWrite) await flush(); // send offline changes first (students may not write)
      try {
        // staff pull the whole class list; a student pulls only their own record
        if (auth.role === 'parent') { ready.current = true; return; }   // nothing to pull: the parent screen has its own endpoint
        const res = await fetch(canWrite ? '/api/students' : `/api/students/${encodeURIComponent(auth.studentId || auth.id)}`);
        if (!res.ok) throw new Error('bad status');
        const body = await res.json();
        const list: any[] = Array.isArray(body) ? body : [body];
        if (!alive) return;
        const prev = usersRef.current;
        const byId = new Map(prev.map((u) => [u.id, u]));
        const serverIds = new Set(list.map((d) => d.id));
        const students = list.map((d) => fromApi(d, byId.get(d.id)));
        const localOnly = canWrite ? prev.filter((u) => u.role === 'student' && !serverIds.has(u.id)) : [];
        students.forEach((u) => snap.current.set(u.id, JSON.stringify(toApi(u))));
        localOnly.forEach((u) => enqueue({ id: u.id, op: 'save', body: toApi(u) }));
        setUsers(canWrite
          ? [...prev.filter((u) => u.role !== 'student'), ...students, ...localOnly]
          : [...prev.filter((u) => u.role !== 'student'), ...students]);
        if (canWrite) flush();
      } catch {
        prev_snapshot();
      }
      ready.current = true;
    })();
    // Prev snapshot.
    function prev_snapshot() {
      usersRef.current.filter((u) => u.role === 'student').forEach((u) => snap.current.set(u.id, JSON.stringify(toApi(u))));
    }
    // Retry.
    const retry = () => { if (canWrite) flush(); };
    window.addEventListener('online', retry);
    const t = setInterval(retry, 30000);
    return () => { alive = false; window.removeEventListener('online', retry); clearInterval(t); };
  }, [authKey]);

  // Runs automatically whenever these change: users.
  useEffect(() => {
    if (!ready.current || !canWrite) return;
    const cur = new Map(users.filter((u) => u.role === 'student').map((u) => [u.id, u]));
    cur.forEach((u, id) => {
      const json = JSON.stringify(toApi(u));
      if (snap.current.get(id) !== json) { snap.current.set(id, json); enqueue({ id, op: 'save', body: JSON.parse(json) }); }
    });
    [...snap.current.keys()].forEach((id) => {
      if (!cur.has(id)) { snap.current.delete(id); enqueue({ id, op: 'delete' }); }
    });
    flush();
  }, [users]);
}
