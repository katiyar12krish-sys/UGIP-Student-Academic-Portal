// ===================================================================================================
// Faculty permissions (rules: server/auth/permissions.ts).
//   GET /api/admin/faculty-permissions        admin: every teacher with their switches + the feature list
//   PUT /api/admin/faculty-permissions/:id    admin: save one teacher's switches { perms: { marks: true, ... } }
//   GET /api/me/permissions                   any signed-in user: what they may do (faculty: their switches)
// ===================================================================================================
import { Router } from 'express';
import { db } from '../db/connection';
import { requireAuth, requireRole } from '../auth/middleware';
import { FEATURES, permissionsOf, setPermissions } from '../auth/permissions';

export const permissionsRouter = Router();

permissionsRouter.get('/admin/faculty-permissions', requireRole('admin'), (_req, res) => {
  const fac = db.prepare("SELECT id, name, username, department FROM users WHERE role='faculty' AND is_active=1 ORDER BY name").all() as any[];
  res.set('Cache-Control', 'no-store').json({
    features: FEATURES,
    faculty: fac.map((f) => ({
      ...f,
      perms: permissionsOf(f.id),
      subjects: (db.prepare('SELECT s.id, s.code, s.name, s.branch, s.semester FROM faculty_subject_assignments a JOIN subjects s ON s.id=a.subject_id WHERE a.user_id=? ORDER BY s.semester, s.name').all(f.id) as any[]),
    })),
  });
});

permissionsRouter.put('/admin/faculty-permissions/:id', requireRole('admin'), (req, res) => {
  const r = setPermissions(String(req.params.id), req.body?.perms || {}, req.user!.username);
  if (!r.ok) return res.status(404).json({ error: r.error });
  res.json({ ok: true, perms: permissionsOf(String(req.params.id)) });
});

permissionsRouter.get('/me/permissions', requireAuth, (req, res) => {
  const u = req.user!;
  const all = Object.fromEntries(FEATURES.map((f) => [f.key, true]));
  res.set('Cache-Control', 'no-store').json({ role: u.role, perms: u.role === 'faculty' ? permissionsOf(u.id) : all, subjectIds: u.subjectIds });
});
