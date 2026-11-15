// ===================================================================================================
// Logins & passwords screen (Step 12) and the "my login" card of a student / parent.
// ===================================================================================================
import { Router } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import { listLogins, createParentFromRecord, bulkIssue, ownLoginInfo } from '../auth/logins';
import { seesSample } from '../auth/sample';
import { staffLogins, passwordFor } from '../auth/passwordVault';   // Step 19

export const loginsRouter = Router();

// Staff (admin + faculty): who has a login, and the temporary password while it is still the temporary one.
loginsRouter.get('/admin/logins', requireRole('admin', 'faculty'), (req, res) => {
  const { branch, year, q } = req.query as Record<string, string>;
  res.set('Cache-Control', 'no-store').json(listLogins({ branch, year: year ? Number(year) : undefined, q, realOnly: !seesSample(req.user) }, req.user!.username));
});

// One tap: parent login from the father / mother name already in the student's record.
loginsRouter.post('/admin/logins/parent', requireRole('admin', 'faculty'), (req, res) => {
  const r = createParentFromRecord(String(req.body?.studentId || ''), req.body?.relation, req.user!.username);
  if ('error' in r) return res.status(r.status).json({ error: r.error });
  res.set('Cache-Control', 'no-store').status(201).json(r);
});

// Whole class: students with no password yet + students with no parent login yet. Never resets anybody who already chose their own password.
loginsRouter.post('/admin/logins/bulk', requireRole('admin', 'faculty'), (req, res) => {
  const b = req.body || {};
  res.set('Cache-Control', 'no-store').json(bulkIssue({ branch: b.branch ? String(b.branch) : undefined, year: b.year ? Number(b.year) : undefined, realOnly: !seesSample(req.user) },
    { students: b.students !== false, parents: b.parents !== false }, req.user!.username));
});

// Student / parent: only their own login ID (no password, no other person).
loginsRouter.get('/me/login-info', requireAuth, (req, res) => {
  res.set('Cache-Control', 'no-store').json(ownLoginInfo(req.user!));
});

// ---------------- Step 19: viewing passwords (rules: server/auth/passwordVault.ts) ----------------
// Admin panel: all staff logins (admin + faculty) with their passwords.
loginsRouter.get('/admin/staff-logins', requireRole('admin'), (req, res) => {
  res.set('Cache-Control', 'no-store').json(staffLogins(req.user!));
});
// Admin / faculty: their OWN password, shown in their own panel. (Students do not get this.)
loginsRouter.get('/me/password', requireRole('admin', 'faculty'), (req, res) => {
  const r = passwordFor(req.user!, req.user!.id);
  res.set('Cache-Control', 'no-store').json({ username: r?.username, password: r?.password ?? null });
});
