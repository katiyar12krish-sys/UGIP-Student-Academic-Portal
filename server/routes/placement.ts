// ===================================================================================================
// Placement routes (Step 11): drives, applications, applicant status, job listings. Edit: server/routes/edits.ts.
// ===================================================================================================
import { Router } from 'express';
import { requireRole } from '../auth/middleware';
import { audit } from '../auth/service';
import { hit } from '../auth/rateLimit';
import { placementDriveCreated, placementStatusChanged } from '../notify/rules';
import { listDrives, listJobs, createDrive, findDrive, driveDto, setDriveActive, deleteDrive, apply, withdraw, applicants, setApplicationStatus, createJob, findJob, jobDto, deleteJob } from '../placement/service';

export const placementRouter = Router();
// Quiet.
const quiet = (what: string, fn: () => unknown) => { try { fn(); } catch (e) { console.warn(`[notify] ${what} failed:`, (e as Error).message); } };   // a notification problem never fails the save
// Send.
const send = (res: any, r: { ok: false; status: number; error: string }) => res.status(r.status).json({ error: r.error });

// GET /api/placement/drives  (who: only admin, faculty, student)
placementRouter.get('/placement/drives', requireRole('admin', 'faculty', 'student'), (req, res) => res.json(listDrives(req.user!)));
// GET /api/placement/jobs  (who: only admin, faculty, student)
placementRouter.get('/placement/jobs', requireRole('admin', 'faculty', 'student'), (req, res) => res.json(listJobs(req.user!)));

// POST /api/placement/drives  (who: only admin, faculty)
placementRouter.post('/placement/drives', requireRole('admin', 'faculty'), (req, res) => {
  if (!hit(`pdrive:${req.user!.id}`, 30, 3600_000).allowed) return res.status(429).json({ error: 'Too many drives posted in an hour. Please wait.' });
  const r = createDrive(req.user!, req.body || {});
  if (!r.ok) return send(res, r);
  audit(req.user!.username, 'placement_drive_posted', 'placement_drive', r.id);
  quiet('placement drive', () => placementDriveCreated(r.id));
  res.status(201).json(driveDto(findDrive(r.id), req.user!));
});

// POST /api/placement/drives/:id/active  (who: only admin, faculty)
placementRouter.post('/placement/drives/:id/active', requireRole('admin', 'faculty'), (req, res) => {
  const r = setDriveActive(req.user!, String(req.params.id), !!req.body?.active);
  if (!r.ok) return send(res, r);
  audit(req.user!.username, req.body?.active ? 'placement_drive_opened' : 'placement_drive_closed', 'placement_drive', String(req.params.id));
  res.json(driveDto(findDrive(String(req.params.id)), req.user!));
});

// DELETE /api/placement/drives/:id  (who: only admin, faculty)
placementRouter.delete('/placement/drives/:id', requireRole('admin', 'faculty'), (req, res) => {
  const r = deleteDrive(req.user!, String(req.params.id));
  if (!r.ok) return send(res, r);
  audit(req.user!.username, 'placement_drive_deleted', 'placement_drive', String(req.params.id), r.title);
  res.json({ ok: true });
});

// POST /api/placement/drives/:id/apply  (who: only student)
placementRouter.post('/placement/drives/:id/apply', requireRole('student'), (req, res) => {
  if (!hit(`papply:${req.user!.id}`, 30, 3600_000).allowed) return res.status(429).json({ error: 'Too many requests. Please wait.' });
  const r = apply(req.user!, String(req.params.id));
  if (!r.ok) return send(res, r);
  if (r.created) audit(req.user!.username, 'placement_applied', 'placement_drive', String(req.params.id));
  res.status(r.created ? 201 : 200).json(driveDto(findDrive(String(req.params.id)), req.user!));
});

// DELETE /api/placement/drives/:id/apply  (who: only student)
placementRouter.delete('/placement/drives/:id/apply', requireRole('student'), (req, res) => {
  const r = withdraw(req.user!, String(req.params.id));
  if (!r.ok) return send(res, r);
  audit(req.user!.username, 'placement_withdrawn', 'placement_drive', String(req.params.id));
  res.json(driveDto(findDrive(String(req.params.id)), req.user!));
});

// GET /api/placement/drives/:id/applicants  (who: only admin, faculty)
placementRouter.get('/placement/drives/:id/applicants', requireRole('admin', 'faculty'), (req, res) => {
  const r = applicants(req.user!, String(req.params.id));
  if (!r.ok) return send(res, r);
  audit(req.user!.username, 'placement_applicants_viewed', 'placement_drive', String(req.params.id));
  res.json(r.rows);
});

// POST /api/placement/drives/:id/applicants/:aid/status  (who: only admin, faculty)
placementRouter.post('/placement/drives/:id/applicants/:aid/status', requireRole('admin', 'faculty'), (req, res) => {
  if (!hit(`pstatus:${req.user!.id}`, 300, 3600_000).allowed) return res.status(429).json({ error: 'Too many requests. Please wait.' });
  const r = setApplicationStatus(req.user!, String(req.params.id), String(req.params.aid), req.body?.status);
  if (!r.ok) return send(res, r);
  audit(req.user!.username, 'placement_status_set', 'placement_drive', String(req.params.id), `${req.params.aid}:${req.body?.status}`);
  quiet('placement status', () => placementStatusChanged(String(req.params.id), r.studentId));
  const a = applicants(req.user!, String(req.params.id));
  res.json(a.ok ? a.rows : []);
});

// POST /api/placement/jobs  (who: only admin, faculty)
placementRouter.post('/placement/jobs', requireRole('admin', 'faculty'), (req, res) => {
  if (!hit(`pjob:${req.user!.id}`, 30, 3600_000).allowed) return res.status(429).json({ error: 'Too many listings posted in an hour. Please wait.' });
  const r = createJob(req.user!, req.body || {});
  if (!r.ok) return send(res, r);
  audit(req.user!.username, 'placement_job_posted', 'placement_job', r.id);
  res.status(201).json(jobDto(findJob(r.id), req.user!));
});

// DELETE /api/placement/jobs/:id  (who: only admin, faculty)
placementRouter.delete('/placement/jobs/:id', requireRole('admin', 'faculty'), (req, res) => {
  const r = deleteJob(req.user!, String(req.params.id));
  if (!r.ok) return send(res, r);
  audit(req.user!.username, 'placement_job_deleted', 'placement_job', String(req.params.id), r.title);
  res.json({ ok: true });
});
