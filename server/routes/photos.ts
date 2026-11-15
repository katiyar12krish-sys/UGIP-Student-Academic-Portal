// ===================================================================================================
// Profile photo routes: upload (JPEG, EXIF removed), view (with who-may-see rules), delete.
// ===================================================================================================
import { Router, raw } from 'express';
import fs from 'fs';
import { db } from '../db/connection';
import { requireAuth } from '../auth/middleware';
import type { SessionUser } from '../auth/session';
import { audit } from '../auth/service';
import { hasConsent } from '../auth/consent';
import { photoFile } from '../db/photoStore';
import { cleanJpeg } from '../db/jpeg';

export const photosRouter = Router();

const MAX_IN = 400 * 1024;       // what we accept from the browser

// true / false: is staff?
const isStaff = (r: string) => r === 'admin' || r === 'faculty';

/** Who may SEE this user's photo. Staff photos are a directory (every signed-in user); a student's photo is private to the student, their parents and staff. */
function canView(viewer: SessionUser, target: any): boolean {
  if (viewer.id === target.id) return true;
  if (isStaff(viewer.role)) return true;
  if (isStaff(target.role)) return true;
  return viewer.role === 'parent' && viewer.childIds.includes(target.id);
}
/** Who may CHANGE it: the person; admin for anyone; faculty for students (the existing "only admin edits faculty" rule). */
function canEdit(editor: SessionUser, target: any): boolean {
  if (editor.id === target.id) return true;
  if (editor.role === 'admin') return true;
  return editor.role === 'faculty' && target.role === 'student';
}

// Target.
function target(req: any, res: any) {
  const id = req.params.userId === 'me' ? req.user.id : String(req.params.userId);
  const t = /^[A-Za-z0-9_-]{1,64}$/.test(id) ? db.prepare('SELECT id, role, name, photo_version FROM users WHERE id=? AND is_active=1').get(id) as any : null;
  if (!t) { res.status(404).json({ error: 'Not found' }); return null; }
  return t;
}

// GET /api/photos/:userId  (who: any signed-in user)
photosRouter.get('/photos/:userId', requireAuth, (req, res) => {
  const t = target(req, res); if (!t) return;
  if (!canView(req.user!, t)) return res.status(403).json({ error: 'Not allowed' });
  if (!t.photo_version || !fs.existsSync(photoFile(t.id))) return res.status(404).json({ error: 'No photo' });
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'private, max-age=3600');       // the ?v= in the URL changes whenever the photo does
  res.setHeader('Content-Disposition', 'inline');
  res.sendFile(photoFile(t.id));
});

// POST /api/photos/:userId  (who: any signed-in user)
photosRouter.post('/photos/:userId', requireAuth, raw({ type: 'image/jpeg', limit: MAX_IN }), (req, res) => {
  const t = target(req, res); if (!t) return;
  if (!canEdit(req.user!, t)) return res.status(403).json({ error: 'Not allowed' });
  if (!hasConsent(t.id, 'photo')) {
    const self = req.user!.id === t.id;
    const minor = !!(db.prepare("SELECT 1 FROM users WHERE id=? AND role='student' AND adult_verified=0").get(t.id));
    return res.status(403).json({ error: 'photo_consent_required', canSelfConsent: self && !minor,
      message: minor ? 'A parent / guardian must allow the profile photo from their parent login.' : 'Photo consent is needed before a photo can be stored.' });
  }
  if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(415).json({ error: 'Send the photo as a JPEG (Content-Type: image/jpeg)' });
  const c = cleanJpeg(req.body);
  if ('error' in c) return res.status(400).json({ error: c.error });
  const tmp = `${photoFile(t.id)}.tmp`;
  fs.writeFileSync(tmp, c.bytes, { mode: 0o600 });
  fs.renameSync(tmp, photoFile(t.id));
  const v = Date.now();
  db.prepare('UPDATE users SET photo_version=? WHERE id=?').run(v, t.id);
  audit(req.user!.username, 'photo_uploaded', 'user', t.id, `${c.bytes.length}B ${c.width}x${c.height}`);
  res.status(201).json({ photoUrl: `/api/photos/${encodeURIComponent(t.id)}?v=${v}` });
});

// DELETE /api/photos/:userId  (who: any signed-in user)
photosRouter.delete('/photos/:userId', requireAuth, (req, res) => {
  const t = target(req, res); if (!t) return;
  if (!canEdit(req.user!, t)) return res.status(403).json({ error: 'Not allowed' });
  try { fs.rmSync(photoFile(t.id), { force: true }); } catch { /* already gone */ }
  db.prepare('UPDATE users SET photo_version=NULL WHERE id=?').run(t.id);
  audit(req.user!.username, 'photo_deleted', 'user', t.id);
  res.json({ ok: true });
});
