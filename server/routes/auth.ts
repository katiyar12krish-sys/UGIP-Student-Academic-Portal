// ===================================================================================================
// Sign-in routes: login (+ authenticator code), logout, change password, forgot password by SMS,
// authenticator setup, privacy consent, and admin tools to create users and issue temporary passwords.
// ===================================================================================================
import { Router } from 'express';
import { db } from '../db/connection';
import { requireRole } from '../auth/middleware';
import { login, changeOwnPassword, issueTempPassword, createParent, audit } from '../auth/service';
import { cookieHeader, clearCookieHeader, destroySession, destroyAllSessions } from '../auth/session';
import { verifyPassword } from '../auth/password';
import { hit } from '../auth/rateLimit';
import { startEnrollment, confirmEnrollment, disableMfa, regenerateRecoveryCodes, adminResetMfa, completeMfaLogin, recoveryCodesLeft } from '../auth/mfa';
import { noticeText, consentState, saveOwn, saveForChild, withdrawService, setAdultVerified } from '../auth/consent';
import { mfaRequiredFor } from '../auth/policy';
import { requestPasswordResetOtp, resetPasswordWithOtp } from '../auth/otpReset';
import { smsEnabled } from '../auth/sms';
import { loadSession } from '../auth/session';

export const authRouter = Router();
// Ip of.
const ipOf = (req: any) => req.ip || req.socket?.remoteAddress || 'unknown';
// Public user.
const publicUser = (u: any) => u && ({ id: u.id, username: u.username, role: u.role, name: u.name, email: u.email, phone: u.phone,
  department: u.department, designation: u.designation, studentId: u.studentId, subjectIds: u.subjectIds, childIds: u.childIds, mustChangePassword: u.mustChangePassword,
  mfaEnabled: u.mfaEnabled, mfaSetupRequired: u.mfaSetupRequired, consentRequired: u.consentRequired, minor: u.minor, photoUrl: u.photoUrl, subjectScope: u.subjectScope ?? null });

// POST /api/auth/login  (who: checked inside)
// GET /api/auth/faculty-subjects  (who: anyone, before login) - the subjects a teacher can sign in for.
// Only subjects that have a teacher assigned by the admin are listed; teacher names are not shown here.
authRouter.get('/auth/faculty-subjects', (_req, res) => {
  res.set('Cache-Control', 'no-store').json(db.prepare(`SELECT DISTINCT s.id, s.code, s.name, s.branch, s.semester FROM subjects s
    JOIN faculty_subject_assignments a ON a.subject_id=s.id JOIN users u ON u.id=a.user_id AND u.role='faculty' AND u.is_active=1
    ORDER BY s.branch, s.semester, s.name`).all());
});

authRouter.post('/auth/login', (req, res) => {
  const { username, password, role, subjectId } = req.body || {};
  const r = login(username, password, { ip: ipOf(req), ua: req.headers['user-agent'], role, subjectId: typeof subjectId === 'string' ? subjectId : undefined });
  if (r.mfaRequired) return res.json({ mfaRequired: true, challenge: r.challenge });   // no cookie yet
  if (!r.ok) {
    if (r.retryAfterSec) res.setHeader('Retry-After', String(r.retryAfterSec));
    return res.status(r.status).json({ error: r.error });
  }
  res.setHeader('Set-Cookie', cookieHeader(r.token, r.expiresAt));
  res.json({ user: publicUser(r.user) });
});

// POST /api/auth/logout  (who: checked inside)
authRouter.post('/auth/logout', (req, res) => {
  if (req.sessionHash) destroySession(req.sessionHash);
  res.setHeader('Set-Cookie', clearCookieHeader());
  res.json({ ok: true });
});

// GET /api/auth/me  (who: checked inside)
authRouter.get('/auth/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not logged in' });
  res.json({ user: publicUser(req.user) });
});

// POST /api/auth/change-password  (who: checked inside)
authRouter.post('/auth/change-password', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Login required' });
  const l = hit(`chpw:${req.user.id}`, 10, 15 * 60_000);
  if (!l.allowed) return res.status(429).json({ error: 'Too many attempts. Try later.' });
  const { currentPassword, newPassword } = req.body || {};
  const err = changeOwnPassword(req.user.id, currentPassword, newPassword, req.sessionHash);
  if (err) return res.status(400).json({ error: err });
  res.json({ ok: true });
});

// Re-confirm the logged-in user's password before a sensitive action (replaces the old client-side check).
authRouter.post('/auth/verify-password', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Login required' });
  const l = hit(`vpw:${req.user.id}`, 10, 15 * 60_000);
  if (!l.allowed) return res.status(429).json({ error: 'Too many attempts. Try later.' });
  const row = db.prepare('SELECT password_hash FROM users WHERE id=?').get(req.user.id) as any;
  res.json({ ok: verifyPassword(String(req.body?.password || ''), row?.password_hash) });
});

// ---- Admin: credential management (no UI yet; also available via `npm run credentials`) ----
authRouter.get('/admin/users', requireRole('admin'), (_req, res) => {
  res.json(db.prepare(`SELECT id,username,role,name,department,designation,student_id AS studentId,is_active AS isActive,
    (password_hash IS NOT NULL) AS hasPassword, must_change_password AS mustChangePassword, last_login_at AS lastLoginAt FROM users ORDER BY role,username`).all());
});

// Create a faculty login. Returns the temporary password ONCE (it is stored only as a hash).
authRouter.post('/admin/users', requireRole('admin'), (req, res) => {
  const b = req.body || {};
  const username = String(b.username || '').trim();
  const name = String(b.name || '').trim().slice(0, 100);
  if (!/^[A-Za-z0-9_.-]{3,32}$/.test(username)) return res.status(400).json({ error: 'Username must be 3-32 letters, digits, _ . -' });
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const id = /^[A-Za-z0-9_-]{3,64}$/.test(String(b.id || '')) ? String(b.id) : `fac-${username.toLowerCase()}`;
  // S.
  const s = (v: unknown, n = 100) => (v ? String(v).slice(0, n) : null);
  db.exec('BEGIN');
  try {
    db.prepare('INSERT INTO users (id,username,role,name,email,phone,department,designation) VALUES (?,?,?,?,?,?,?,?)')
      .run(id, username, 'faculty', name, s(b.email), s(b.phone, 30), s(b.department, 20), s(b.designation));
    for (const sub of Array.isArray(b.subjectIds) ? b.subjectIds.slice(0, 50) : []) {
      db.prepare('INSERT OR IGNORE INTO faculty_subject_assignments VALUES (?,?)').run(id, String(sub).slice(0, 64));
    }
    audit(req.user!.username, 'user_created', 'user', id, 'role=faculty');
    db.exec('COMMIT');
  } catch (e: any) {
    db.exec('ROLLBACK');
    return res.status(409).json({ error: /UNIQUE/i.test(e.message) ? 'That username or id already exists' : 'Could not create user' });
  }
  const t = issueTempPassword(id, req.user!.username)!;
  res.status(201).json({ id, username, tempPassword: t.tempPassword });
});

// Admin: any user. Faculty: students and parents only (so teachers can hand out those logins). Always written to the audit log.
authRouter.post('/admin/users/:id/issue-credentials', requireRole('admin', 'faculty'), (req, res) => {
  const target = db.prepare('SELECT role FROM users WHERE id=?').get(req.params.id) as any;
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (req.user!.role === 'faculty' && !['student', 'parent'].includes(target.role)) return res.status(403).json({ error: 'Faculty can only issue student and parent passwords' });
  res.json(issueTempPassword(req.params.id, req.user!.username));
});

// Create a parent login for a student (admin or faculty). Returns the temporary password ONCE.
authRouter.post('/admin/parents', requireRole('admin', 'faculty'), (req, res) => {
  const { studentId, name, phone, relation } = req.body || {};
  const r = createParent(String(studentId || ''), { name, phone, relation }, req.user!.username);
  if ('error' in r) return res.status(r.status ?? 400).json({ error: r.error });   // 400 if the service gave no code
  res.status(201).json(r);
});

// POST /api/admin/users/issue-credentials  (who: only admin)
authRouter.post('/admin/users/issue-credentials', requireRole('admin'), (req, res) => {
  const { role = 'student', branch, year } = req.body || {};
  if (!['student', 'faculty', 'parent'].includes(role)) return res.status(400).json({ error: 'role must be student, faculty or parent' });
  let sql = 'SELECT u.id FROM users u';
  const p: any[] = [];
  if (role === 'student') {
    sql += ' JOIN students s ON s.id=u.student_id WHERE u.role=? AND u.is_active=1';
    p.push(role);
    if (branch) { sql += ' AND s.branch=?'; p.push(branch); }
    if (year) { sql += ' AND s.year=?'; p.push(Number(year)); }
  } else { sql += ' WHERE u.role=? AND u.is_active=1'; p.push(role); }  // faculty or parent
  const ids = (db.prepare(sql).all(...p) as any[]).map((r) => r.id);
  res.json(ids.map((id) => issueTempPassword(id, req.user!.username)));
});

// POST /api/admin/users/:id/active  (who: only admin)
authRouter.post('/admin/users/:id/active', requireRole('admin'), (req, res) => {
  const active = req.body?.active ? 1 : 0;
  if (req.params.id === req.user!.id && !active) return res.status(400).json({ error: 'You cannot deactivate yourself' });
  const r = db.prepare('UPDATE users SET is_active=? WHERE id=?').run(active, req.params.id);
  if (!r.changes) return res.status(404).json({ error: 'User not found' });
  if (!active) destroyAllSessions(req.params.id);
  audit(req.user!.username, active ? 'user_activated' : 'user_deactivated', 'user', req.params.id);
  res.json({ ok: true });
});

// ================= Step 3: second step at login, authenticator-app setup =================
const ctxOf = (req: any) => ({ ip: ipOf(req), ua: req.headers['user-agent'] as string | undefined });

// Second step of login: the challenge from /auth/login + a 6-digit code (or a recovery code).
authRouter.post('/auth/login/mfa', (req, res) => {
  const { challenge, code } = req.body || {};
  const r = completeMfaLogin(String(challenge || ''), String(code || ''), ctxOf(req));
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  res.setHeader('Set-Cookie', cookieHeader(r.token, r.expiresAt));
  const s = loadSession(r.token);
  res.json({ user: publicUser(s!.user) });
});

// GET /api/auth/mfa  (who: checked inside)
authRouter.get('/auth/mfa', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Login required' });
  res.json({ enabled: req.user.mfaEnabled, required: mfaRequiredFor(req.user.role), recoveryCodesLeft: req.user.mfaEnabled ? recoveryCodesLeft(req.user.id) : 0 });
});
// POST /api/auth/mfa/setup  (who: checked inside)
authRouter.post('/auth/mfa/setup', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Login required' });
  if (req.user.mustChangePassword) return res.status(403).json({ error: 'password_change_required' });
  const r = await startEnrollment(req.user);
  if ('error' in r) return res.status(r.status ?? 400).json({ error: r.error });   // 400 if the service gave no code
  res.json(r);
});
// POST /api/auth/mfa/confirm  (who: checked inside)
authRouter.post('/auth/mfa/confirm', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Login required' });
  if (req.user.mustChangePassword) return res.status(403).json({ error: 'password_change_required' });
  const r = confirmEnrollment(req.user, String(req.body?.code || ''));
  if ('error' in r) return res.status(r.status ?? 400).json({ error: r.error });   // 400 if the service gave no code
  res.json(r);   // recovery codes: shown once
});
// POST /api/auth/mfa/disable  (who: checked inside)
authRouter.post('/auth/mfa/disable', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Login required' });
  const r = disableMfa(req.user, String(req.body?.password || ''), String(req.body?.code || ''));
  if ('error' in r) return res.status(r.status ?? 400).json({ error: r.error });   // 400 if the service gave no code
  res.json(r);
});
// POST /api/auth/mfa/recovery-codes  (who: checked inside)
authRouter.post('/auth/mfa/recovery-codes', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Login required' });
  const r = regenerateRecoveryCodes(req.user, String(req.body?.password || ''), String(req.body?.code || ''));
  if ('error' in r) return res.status(r.status ?? 400).json({ error: r.error });   // 400 if the service gave no code
  res.json(r);
});
// POST /api/admin/users/:id/reset-mfa  (who: only admin)
authRouter.post('/admin/users/:id/reset-mfa', requireRole('admin'), (req, res) => {
  adminResetMfa(req.params.id, req.user!.username) ? res.json({ ok: true }) : res.status(404).json({ error: 'User not found' });
});

// ================= Step 3: password reset by SMS code (switched off until SMS_PROVIDER is configured) =================
authRouter.get('/auth/sms-status', (_req, res) => res.json({ enabled: smsEnabled() }));
// POST /api/auth/forgot/request  (who: checked inside)
authRouter.post('/auth/forgot/request', async (req, res) => {
  const r = await requestPasswordResetOtp(req.body?.username, req.body?.role, ipOf(req));
  r.ok ? res.json(r) : res.status(r.status).json({ error: r.error });
});
// POST /api/auth/forgot/verify  (who: checked inside)
authRouter.post('/auth/forgot/verify', (req, res) => {
  const r = resetPasswordWithOtp(req.body?.username, req.body?.code, req.body?.newPassword, ipOf(req), req.body?.role);
  r.ok ? res.json({ ok: true }) : res.status(r.status).json({ error: r.error });
});

// ================= Step 3: DPDP consent =================
const childrenOf = (u: { childIds: string[] }) => u.childIds.map((id) => {
  const s = db.prepare('SELECT s.id, s.name, s.roll_no AS rollNo, u.adult_verified AS adult FROM students s JOIN users u ON u.id=s.id WHERE s.id=?').get(id) as any;
  return s ? { userId: s.id, name: s.name, rollNo: s.rollNo, adult: !!s.adult, consents: consentState(s.id) } : null;
}).filter(Boolean);

// GET /api/auth/consent  (who: checked inside)
authRouter.get('/auth/consent', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Login required' });
  res.json({ notice: noticeText(), mine: consentState(req.user.id), minor: req.user.minor, children: req.user.role === 'parent' ? childrenOf(req.user) : [] });
});
// POST /api/auth/consent  (who: checked inside)
authRouter.post('/auth/consent', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Login required' });
  if (req.user.mustChangePassword) return res.status(403).json({ error: 'password_change_required' });
  if (req.user.mfaSetupRequired) return res.status(403).json({ error: 'mfa_setup_required' });
  const r = saveOwn(req.user, req.body?.grants || {}, ctxOf(req));
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  res.json({ ok: true, ignored: r.ignored, mine: consentState(req.user.id) });
});
// POST /api/auth/consent/child/:studentId  (who: only parent)
authRouter.post('/auth/consent/child/:studentId', requireRole('parent'), (req, res) => {
  const r = saveForChild(req.user!, req.params.studentId, req.body?.grants || {}, ctxOf(req));
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  res.json({ ok: true, consents: consentState(req.params.studentId) });
});
// POST /api/auth/consent/withdraw-service  (who: checked inside)
authRouter.post('/auth/consent/withdraw-service', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Login required' });
  withdrawService(req.user, ctxOf(req));
  res.setHeader('Set-Cookie', clearCookieHeader());
  res.json({ ok: true });
});
// Admin: confirm a student is 18+ (then they give their own consent instead of a parent).
authRouter.post('/admin/students/:id/adult', requireRole('admin'), (req, res) => {
  setAdultVerified(req.params.id, !!req.body?.adult, req.user!.username) ? res.json({ ok: true }) : res.status(404).json({ error: 'Student not found' });
});
