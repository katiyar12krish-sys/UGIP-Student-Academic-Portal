// ===================================================================================================
// Faculty authority, decided by the administrator.
//  1. Subjects: which subjects a teacher may work on stay in faculty_subject_assignments (admin sets them in
//     "Faculty Role Control"); the check is canTeach() in server/academic/access.ts.
//  2. Features: for every teacher the admin can switch each kind of work on or off (marks, attendance, lab /
//     practicals, online tests, materials, class dispatch, doubts, notices, board results, student logins,
//     placement, data center). Nothing saved = allowed, so existing teachers keep working until the admin changes it.
//  3. Cross-access alert: when a teacher tries to change something of a subject that is NOT assigned to them,
//     the request is refused and the teacher(s) of that subject AND every admin get a notification
//     ("<name> tried to change <what> in your subject <subject>"), and the security audit log records it.
// Students are limited to their own branch / class by the routes themselves (they only ever get their own class).
// ===================================================================================================
import { db } from '../db/connection';
import type { SessionUser } from './session';
import { canTeach } from '../academic/access';
import { notifyUser } from '../notify/service';
import { audit } from './service';

/** Every feature the admin can give or take away. Keys are stored in the database; labels are shown on screen. */
export const FEATURES: { key: string; label: string }[] = [
  { key: 'marks', label: 'Marks & exams' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'practicals', label: 'Lab practicals / experiments' },
  { key: 'online_tests', label: 'Online tests & assignments' },
  { key: 'materials', label: 'Study materials' },
  { key: 'dispatch', label: 'Class dispatch (notes / tasks)' },
  { key: 'doubts', label: 'Doubt Q&A' },
  { key: 'notices', label: 'Notices' },
  { key: 'board_results', label: 'UBTER board results' },
  { key: 'student_logins', label: 'Student logins & passwords' },
  { key: 'placement', label: 'Placement posts' },
  { key: 'data_center', label: 'Data Center downloads' },
  { key: 'question_papers', label: 'Question papers & answer keys (upload)' },
];
const KEYS = new Set(FEATURES.map((f) => f.key));

db.exec(`
-- Which kinds of work the administrator allows each teacher to do (no row = allowed).
CREATE TABLE IF NOT EXISTS faculty_permissions (
  user_id    TEXT NOT NULL,        -- the teacher (users.id, role faculty)
  feature    TEXT NOT NULL,        -- one of FEATURES in server/auth/permissions.ts, e.g. 'marks', 'practicals'
  allowed    INTEGER NOT NULL,     -- 1 = may do it, 0 = switched off by the admin
  updated_by TEXT,                 -- username of the admin who changed it
  updated_at INTEGER NOT NULL,     -- when (ms since 1970)
  PRIMARY KEY (user_id, feature)
);`);

/** Allowed / not allowed for every feature of one teacher. */
export function permissionsOf(userId: string): Record<string, boolean> {
  const rows = db.prepare('SELECT feature, allowed FROM faculty_permissions WHERE user_id=?').all(userId) as any[];
  const out: Record<string, boolean> = Object.fromEntries(FEATURES.map((f) => [f.key, true]));
  for (const r of rows) if (KEYS.has(r.feature)) out[r.feature] = !!r.allowed;
  return out;
}

/** May this person use this feature? Admin always; faculty unless the admin switched it off; others: decided by the route. */
export function hasFeature(u: SessionUser, feature: string): boolean {
  if (u.role === 'admin') return true;
  if (u.role !== 'faculty') return true;
  const r = db.prepare('SELECT allowed FROM faculty_permissions WHERE user_id=? AND feature=?').get(u.id, feature) as any;
  return r ? !!r.allowed : true;
}

/** Admin saves the switches of one teacher. */
export function setPermissions(userId: string, perms: Record<string, unknown>, actor: string): { ok: true } | { ok: false; error: string } {
  const t = db.prepare("SELECT id, name FROM users WHERE id=? AND role='faculty'").get(userId) as any;
  if (!t) return { ok: false, error: 'No such teacher' };
  const now = Date.now();
  const up = db.prepare(`INSERT INTO faculty_permissions (user_id, feature, allowed, updated_by, updated_at) VALUES (?,?,?,?,?)
    ON CONFLICT(user_id, feature) DO UPDATE SET allowed=excluded.allowed, updated_by=excluded.updated_by, updated_at=excluded.updated_at`);
  const off: string[] = [];
  for (const [k, v] of Object.entries(perms || {})) {
    if (!KEYS.has(k)) continue;
    up.run(userId, k, v ? 1 : 0, actor, now);
    if (!v) off.push(k);
  }
  audit(actor, 'faculty_permissions', 'user', userId, `switched off: ${off.join(', ') || 'nothing'}`);
  notifyUser(userId, { kind: 'permissions', title: 'Your portal permissions were changed', body: off.length ? `The administrator switched off: ${off.map((k) => FEATURES.find((f) => f.key === k)?.label || k).join(', ')}.` : 'The administrator gave you access to all features.', dedupeKey: `perm-${userId}-${now}` });
  return { ok: true };
}

/**
 * The check every write route uses: feature allowed AND subject assigned.
 * When a teacher reaches for a subject that is not theirs, the owners of that subject and all admins are told.
 * Returns null when allowed, or the error message to send back (403).
 */
export function writeDenied(u: SessionUser, subjectId: string, feature: string, what: string): string | null {
  if (u.role === 'admin') return null;
  const featureLabel = FEATURES.find((f) => f.key === feature)?.label || feature;
  if (!hasFeature(u, feature)) {
    audit(u.username, 'denied_feature', feature, subjectId, what);
    return `The administrator has not given you permission for "${featureLabel}". Please ask the admin.`;
  }
  if (canTeach(u, subjectId)) return null;
  reportCrossAccess(u, subjectId, what);
  return 'This subject is not assigned to you. The subject teacher and the administrator have been informed.';
}

/** Security alerts always reach the in-app bell (they protect the person's own records), even when the optional
 *  "notifications" consent is off; no phone push is sent for them. */
function securityAlert(userId: string, n: { kind: string; title: string; body: string; dedupeKey: string }) {
  db.prepare("INSERT OR IGNORE INTO notifications (user_id,kind,title,body,url,dedupe_key,created_at,push_state) VALUES (?,?,?,?,?,?,?,'skipped')")
    .run(userId, n.kind, n.title.slice(0, 120), n.body.slice(0, 300), null, n.dedupeKey, Date.now());
}

/** Tell the teachers of the subject and every admin that someone else tried to change it. */
export function reportCrossAccess(u: SessionUser, subjectId: string, what: string) {
  if (u.role !== 'faculty') return;
  const sub = db.prepare('SELECT id, code, name FROM subjects WHERE id=?').get(subjectId) as any;
  const subjectText = sub ? `${sub.name} (${sub.code})` : subjectId;
  const minute = Math.floor(Date.now() / 60000);   // one alert per person / subject / action per minute
  audit(u.username, 'cross_subject_attempt', 'subject', subjectId, `${u.name} tried: ${what}`);
  const owners = (db.prepare("SELECT a.user_id FROM faculty_subject_assignments a JOIN users x ON x.id=a.user_id WHERE a.subject_id=? AND x.is_active=1").all(subjectId) as any[])
    .map((r) => r.user_id).filter((id: string) => id !== u.id);
  for (const id of owners) securityAlert(id, {
    kind: 'security', title: 'Someone tried to change your subject',
    body: `${u.name} (${u.username}) tried to ${what} in your subject ${subjectText}. It was blocked. The admin has been told.`,
    dedupeKey: `xs-${u.id}-${subjectId}-${what}-${minute}-${id}`,
  });
  const admins = (db.prepare("SELECT id FROM users WHERE role='admin' AND is_active=1").all() as any[]).map((r) => r.id);
  for (const id of admins) securityAlert(id, {
    kind: 'security', title: 'Blocked: teacher outside own subject',
    body: `${u.name} (${u.username}) tried to ${what} in ${subjectText}, which is not assigned to them. It was blocked.`,
    dedupeKey: `xs-${u.id}-${subjectId}-${what}-${minute}-${id}`,
  });
}

/**
 * One gate for the features that have no subject (notices, doubts, board results, logins, placement, data center):
 * a teacher whose feature is switched off gets 403 before the route runs. Mounted in server/index.ts before the routers.
 * Data Center is gated for reading too (downloads); the others only for changes (POST / PUT / DELETE).
 */
const GATES: { re: RegExp; feature: string; readsToo?: boolean }[] = [
  { re: /^\/(notices|direct-notices)\b/, feature: 'notices' },
  { re: /^\/doubts\b/, feature: 'doubts' },
  { re: /^\/board-results\b/, feature: 'board_results' },
  { re: /^\/admin\/logins\b/, feature: 'student_logins', readsToo: true },
  { re: /^\/placement\b/, feature: 'placement' },
  { re: /^\/data\//, feature: 'data_center', readsToo: true },
  { re: /^\/question-papers\b/, feature: 'question_papers' },
];
export function featureGate(req: any, res: any, next: any) {
  const u = req.user as SessionUser | undefined;
  if (!u || u.role !== 'faculty') return next();
  const g = GATES.find((x) => x.re.test(req.path));
  if (!g || (!g.readsToo && req.method === 'GET')) return next();
  if (hasFeature(u, g.feature)) return next();
  audit(u.username, 'denied_feature', g.feature, null, `${req.method} ${req.path}`);
  const label = FEATURES.find((f) => f.key === g.feature)?.label || g.feature;
  return res.status(403).json({ error: `The administrator has not given you permission for "${label}". Please ask the admin.` });
}
