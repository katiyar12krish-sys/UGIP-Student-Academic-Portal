// ===================================================================================================
// File upload (step one) and study-material routes (Step 9).
// ===================================================================================================
import { Router, raw } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import { audit } from '../auth/service';
import { hit } from '../auth/rateLimit';
import { savePending, MAX_UPLOAD_BYTES } from '../files/store';
import { materialPublished } from '../notify/rules';
import { createMaterial, updateMaterial, deleteMaterial, findMaterial, toDto, listFor, openFile } from '../materials/service';

export const materialsRouter = Router();
// Quiet.
const quiet = (what: string, fn: () => unknown) => { try { fn(); } catch (e) { console.warn(`[notify] ${what} failed:`, (e as Error).message); } };   // a notification problem never fails the save

// ---- step one of an upload: the bytes. Staff, and students (to hand in work). The body is read only after the login / role check. ----
// The browser sends the file as the request body (any Content-Type) and its name in the X-File-Name header (URL-encoded).
materialsRouter.post('/files', requireRole('admin', 'faculty', 'student'), (req, res, next) => {
  // students upload only to hand in work (Step 10): fewer per hour. A pending file is invisible to everyone until a record uses it.
  if (!hit(`upload:${req.user!.id}`, req.user!.role === 'student' ? 10 : 30, 3600_000).allowed) return res.status(429).json({ error: 'Too many uploads in an hour. Please wait.' });
  next();
}, raw({ type: () => true, limit: MAX_UPLOAD_BYTES }), (req, res) => {
  let name = '';
  try { name = decodeURIComponent(String(req.headers['x-file-name'] || '')); } catch { /* keep the default */ }
  const r = savePending(req.user!.id, req.body, name);
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'file_uploaded', 'file', r.file.fileId, `${r.file.size}B ${r.file.mime}`);
  res.status(201).json(r.file);
});
materialsRouter.use((err: any, _req: any, res: any, next: any) => {       // body too big / broken body
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: `The file is larger than ${Math.round(MAX_UPLOAD_BYTES / 1048576)} MB` });
  if (err?.type?.startsWith?.('request.') || err?.type === 'entity.verify.failed') return res.status(400).json({ error: 'The upload was interrupted. Please try again.' });
  next(err);
});

// ---- step two and the rest ----
materialsRouter.get('/materials', requireAuth, (req, res) => res.json(listFor(req.user!)));

// POST /api/materials  (who: only admin, faculty)
materialsRouter.post('/materials', requireRole('admin', 'faculty'), (req, res) => {
  if (!hit(`material:${req.user!.id}`, 40, 3600_000).allowed) return res.status(429).json({ error: 'Too many materials in an hour. Please wait.' });
  const r = createMaterial(req.user!, req.body || {});
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'material_published', 'material', r.id);
  quiet('material', () => materialPublished(r.id));
  res.status(201).json(toDto(findMaterial(r.id), req.user!));
});

// PATCH /api/materials/:id  (who: only admin, faculty)
materialsRouter.patch('/materials/:id', requireRole('admin', 'faculty'), (req, res) => {
  const r = updateMaterial(req.user!, String(req.params.id), req.body || {});
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'material_updated', 'material', String(req.params.id));
  res.json(toDto(findMaterial(String(req.params.id)), req.user!));
});

// DELETE /api/materials/:id  (who: only admin, faculty)
materialsRouter.delete('/materials/:id', requireRole('admin', 'faculty'), (req, res) => {
  const r = deleteMaterial(req.user!, String(req.params.id));
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'material_deleted', 'material', String(req.params.id), r.title);
  res.json({ ok: true });
});

// The file itself. Only through this route, after the "who may see this material" check; there is no public link to a file.
// PDFs and pictures open in the browser (?download=1 saves them); Word / PowerPoint / Excel files are always saved.
materialsRouter.get('/materials/:id/file', requireAuth, (req, res) => {
  const r = openFile(req.user!, String(req.params.id));
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  const inline = (r.kind === 'pdf' || r.kind === 'image') && req.query.download !== '1';
  const ascii = r.name.replace(/[^\x20-\x7e]/g, '_');
  res.setHeader('Content-Type', r.mime);
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(r.name)}`);
  res.setHeader('Cache-Control', 'private, no-cache');            // the browser may keep it but must ask again (access can be withdrawn)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(r.path);
});
