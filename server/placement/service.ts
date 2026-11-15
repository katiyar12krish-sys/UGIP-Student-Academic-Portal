// ===================================================================================================
// Placement (Step 11): drives posted by the placement cell, student applications with eligibility
// checks (branch, deadline, minimum percentage), applicant lists, and government / private job listings.
// ===================================================================================================
import { db } from '../db/connection';
import { studentRow, newId } from '../academic/access';
import { istParts } from '../notify/time';
import type { SessionUser } from '../auth/session';

// Step 11: placement drives, student applications and government / private job listings.
//   post / delete a drive or job : admin, and faculty (a faculty member may delete only what they posted; admin any).
//   see drives and jobs          : every signed-in student, faculty and admin. A student sees only drives / jobs for their branch (or "Both"). Parents: none.
//   apply                        : a student, once per drive, only while the drive is active and before 23:59 IST on the deadline, only for their branch,
//                                  and only if their recorded percentage reaches the minimum. The server decides this, not the screen.
//   applicants                   : admin and the faculty who posted the drive see the list; a student sees only their own application and the count.
//   change applicant status      : admin and the faculty who posted the drive (Applied / Shortlisted / Selected / Rejected).

export const DRIVE_TYPES = ['Campus Placement', 'Industrial Training', 'Government PSU', 'Off-Campus Drive'] as const;
export const JOB_TYPES = ['Government', 'PSU', 'Private EPC / IT'] as const;
export const BRANCHES = ['CSE', 'Civil', 'Both'] as const;
export const APP_STATUSES = ['Applied', 'Shortlisted', 'Selected', 'Rejected'] as const;

// Data shape: result.
export type Result<T = {}> = ({ ok: true } & T) | { ok: false; status: number; error: string };
// Fail.
const fail = (status: number, error: string) => ({ ok: false as const, status, error });
// Str.
const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
// Valid date.
const validDate = (d: unknown): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) === d;
// List.
const list = (v: unknown, maxItems: number, maxLen: number): string[] =>
  (Array.isArray(v) ? v : []).map((x) => str(x, maxLen)).filter(Boolean).slice(0, maxItems);
// Http url.
const httpUrl = (v: unknown): string => { const s = str(v, 500); try { const u = new URL(s); return u.protocol === 'https:' || u.protocol === 'http:' ? s : ''; } catch { return ''; } };
// true / false: is staff?
const isStaff = (u: SessionUser) => u.role === 'admin' || u.role === 'faculty';

/** A drive is open until the very end of its deadline day, Indian time. */
export const closesAt = (deadline: string): number => Date.parse(`${deadline}T23:59:59.999+05:30`);

// Find drive.
export const findDrive = (id: string): any => db.prepare('SELECT * FROM placement_drives WHERE id=?').get(id);
// Find job.
export const findJob = (id: string): any => db.prepare('SELECT * FROM placement_jobs WHERE id=?').get(id);

/** The student's recorded percentage: the average of the semester results on file, or null when nothing is recorded. */
export function studentPercentage(studentId: string): number | null {
  const r = db.prepare('SELECT AVG(percentage) AS p, COUNT(percentage) AS n FROM semester_results WHERE student_id=? AND percentage IS NOT NULL').get(studentId) as any;
  return r && r.n > 0 ? Math.round(r.p * 100) / 100 : null;
}

// Branch ok.
const branchOk = (driveBranch: string, studentBranch: string) => driveBranch === 'Both' || driveBranch === studentBranch;

/** Why this student cannot apply (null = they can). Used for the button state and again when applying. */
export function applyBlock(d: any, studentId: string, now = Date.now()): string | null {
  const st = studentRow(studentId);
  if (!st) return 'Student record not found';
  if (!d.is_active) return 'This drive is closed';
  if (now > closesAt(d.deadline)) return 'The deadline has passed';
  if (!branchOk(d.branch, st.branch)) return `This drive is only for ${d.branch} students`;
  if (d.min_percentage > 0) {
    const p = studentPercentage(studentId);
    if (p === null) return 'Your marks are not on record yet. Please contact the placement cell.';
    if (p < d.min_percentage) return `Minimum ${d.min_percentage}% is required (your recorded average is ${p}%)`;
  }
  return null;
}

// ---------- shapes sent to the browser (same field names the screen always used) ----------
export function driveDto(d: any, u: SessionUser, now = Date.now()) {
  const count = (db.prepare('SELECT COUNT(*) AS n FROM placement_applications WHERE drive_id=?').get(d.id) as any).n as number;
  const out: any = {
    id: d.id, title: d.title, company: d.company, branch: d.branch, type: d.type, ctc: d.ctc, stipend: d.stipend || undefined,
    location: d.location, deadline: d.deadline, vacancies: d.vacancies, fullDescription: d.description,
    eligibilityCriteria: { minPercentage: d.min_percentage, allowedBacklogs: 0, passingYear: 0, branches: d.branch === 'Both' ? ['CSE', 'Civil'] : [d.branch], otherCriteria: d.other_criteria || undefined },
    selectionProcess: JSON.parse(d.selection_process), keySkills: JSON.parse(d.key_skills),
    applyUrl: d.apply_url || undefined, contactPerson: d.contact_person || undefined, isActive: !!d.is_active,
    postedByName: d.posted_by_name, postedAt: new Date(d.created_at).toISOString(),
    closed: !d.is_active || now > closesAt(d.deadline),
    applicantCount: count, mine: d.posted_by_user_id === u.id,
  };
  if (u.role === 'student' && u.studentId) {
    const a = db.prepare('SELECT status, applied_at FROM placement_applications WHERE drive_id=? AND student_id=?').get(d.id, u.studentId) as any;
    out.applied = !!a; out.myStatus = a?.status; out.appliedAt = a ? new Date(a.applied_at).toISOString() : undefined;
    out.cannotApplyReason = a ? undefined : applyBlock(d, u.studentId, now) || undefined;
  }
  return out;
}

// Job dto.
export function jobDto(j: any, u: SessionUser) {
  return {
    id: j.id, title: j.title, organization: j.organization, branch: j.branch, jobType: j.job_type, examOrPostName: j.exam_or_post,
    expectedMonth: j.expected_month, payScale: j.pay_scale, vacancies: j.vacancies, qualification: j.qualification, ageLimit: j.age_limit,
    officialLink: j.official_link, syllabusSummary: j.syllabus_summary, applicationDeadline: j.application_deadline,
    isActive: !!j.is_active, notes: j.notes || undefined, postedByName: j.posted_by_name, mine: j.posted_by_user_id === u.id,
  };
}

// Visible to student.
function visibleToStudent(u: SessionUser, branch: string): boolean {
  if (!u.studentId) return false;
  const st = studentRow(u.studentId);
  return !!st && branchOk(branch, st.branch);
}
// true / false: can see placement?
const canSeePlacement = (u: SessionUser, branch: string) => isStaff(u) || (u.role === 'student' && visibleToStudent(u, branch));

// List drives.
export function listDrives(u: SessionUser, now = Date.now()) {
  if (!isStaff(u) && !(u.role === 'student' && u.studentId)) return [];
  return (db.prepare('SELECT * FROM placement_drives ORDER BY created_at DESC, rowid DESC LIMIT 500').all() as any[])
    .filter((d) => canSeePlacement(u, d.branch)).map((d) => driveDto(d, u, now));
}
// List jobs.
export function listJobs(u: SessionUser) {
  if (!isStaff(u) && !(u.role === 'student' && u.studentId)) return [];
  return (db.prepare('SELECT * FROM placement_jobs ORDER BY created_at DESC, rowid DESC LIMIT 500').all() as any[])
    .filter((j) => canSeePlacement(u, j.branch)).map((j) => jobDto(j, u));
}

// ---------- drives: post / change / delete ----------
export function createDrive(u: SessionUser, b: any, now = Date.now()): Result<{ id: string }> {
  if (!isStaff(u)) return fail(403, 'Only the placement cell (admin or faculty) can post a drive');
  const title = str(b?.title, 200), company = str(b?.company, 150);
  if (!title || !company) return fail(400, 'Title and company are required');
  if (!BRANCHES.includes(b?.branch)) return fail(400, 'Choose the branch (CSE, Civil or Both)');
  if (!DRIVE_TYPES.includes(b?.type)) return fail(400, 'Choose the drive type');
  if (!validDate(b?.deadline)) return fail(400, 'Enter the deadline');
  if (b.deadline < istParts(now).date) return fail(400, 'The deadline cannot be in the past');
  const vac = Math.round(Number(b?.vacancies));
  if (!Number.isFinite(vac) || vac < 1 || vac > 100000) return fail(400, 'Vacancies must be a number from 1 to 100000');
  let minPct = 0;
  if (b?.minPercentage !== undefined && b?.minPercentage !== '') {
    minPct = Number(b.minPercentage);
    if (!Number.isFinite(minPct) || minPct < 0 || minPct > 100) return fail(400, 'Minimum percentage must be between 0 and 100');
  }
  const id = newId('drive');
  db.prepare(`INSERT INTO placement_drives (id,title,company,branch,type,ctc,stipend,location,deadline,vacancies,description,min_percentage,other_criteria,selection_process,key_skills,apply_url,contact_person,is_active,posted_by_user_id,posted_by_name,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?)`)
    .run(id, title, company, b.branch, b.type, str(b?.ctc, 80), str(b?.stipend, 80), str(b?.location, 120), b.deadline, vac, str(b?.fullDescription, 3000), minPct,
      str(b?.otherCriteria, 500), JSON.stringify(list(b?.selectionProcess, 12, 120)), JSON.stringify(list(b?.keySkills, 20, 60)), httpUrl(b?.applyUrl), str(b?.contactPerson, 120) || u.name, u.id, u.name, now);
  return { ok: true, id };
}

// true / false: can manage drive?
const canManageDrive = (u: SessionUser, d: any) => u.role === 'admin' || (u.role === 'faculty' && d.posted_by_user_id === u.id);

// Set drive active.
export function setDriveActive(u: SessionUser, id: string, active: boolean): Result {
  const d = findDrive(id);
  if (!d || !isStaff(u)) return fail(404, 'Not found');
  if (!canManageDrive(u, d)) return fail(403, 'Only the person who posted this drive, or admin, can change it');
  db.prepare('UPDATE placement_drives SET is_active=? WHERE id=?').run(active ? 1 : 0, id);
  return { ok: true };
}

// Delete drive.
export function deleteDrive(u: SessionUser, id: string): Result<{ title: string }> {
  const d = findDrive(id);
  if (!d || !isStaff(u)) return fail(404, 'Not found');
  if (!canManageDrive(u, d)) return fail(403, 'Only the person who posted this drive, or admin, can delete it');
  db.prepare('DELETE FROM placement_drives WHERE id=?').run(id);   // applications go with it (ON DELETE CASCADE)
  return { ok: true, title: d.title };
}

// ---------- student applies / withdraws ----------
export function apply(u: SessionUser, id: string, now = Date.now()): Result<{ created: boolean }> {
  if (u.role !== 'student' || !u.studentId) return fail(403, 'Only students apply to a drive');
  const d = findDrive(id);
  if (!d || !canSeePlacement(u, d.branch)) return fail(404, 'Not found');       // another branch: "not found", not "forbidden"
  const old = db.prepare('SELECT id FROM placement_applications WHERE drive_id=? AND student_id=?').get(id, u.studentId);
  if (old) return { ok: true, created: false };                                 // applying twice is harmless
  const why = applyBlock(d, u.studentId, now);
  if (why) return fail(403, why);
  db.prepare('INSERT INTO placement_applications (id,drive_id,student_id,applied_at) VALUES (?,?,?,?)').run(newId('papp'), id, u.studentId, now);
  return { ok: true, created: true };
}

// Withdraw.
export function withdraw(u: SessionUser, id: string, now = Date.now()): Result {
  if (u.role !== 'student' || !u.studentId) return fail(403, 'Only students can withdraw an application');
  const d = findDrive(id);
  if (!d) return fail(404, 'Not found');
  const a = db.prepare('SELECT id, status FROM placement_applications WHERE drive_id=? AND student_id=?').get(id, u.studentId) as any;
  if (!a) return fail(404, 'You have not applied to this drive');
  if (a.status !== 'Applied') return fail(409, `Your application is already ${a.status.toLowerCase()} and cannot be withdrawn`);
  if (now > closesAt(d.deadline)) return fail(403, 'The deadline has passed. Please contact the placement cell.');
  db.prepare('DELETE FROM placement_applications WHERE id=?').run(a.id);
  return { ok: true };
}

// ---------- applicants (staff who own the drive, and admin) ----------
export function applicants(u: SessionUser, id: string): Result<{ rows: any[] }> {
  const d = findDrive(id);
  if (!d || !isStaff(u)) return fail(404, 'Not found');
  if (!canManageDrive(u, d)) return fail(403, 'Only the person who posted this drive, or admin, can see the applicants');
  const rows = (db.prepare(`SELECT a.id, a.status, a.applied_at, s.id AS sid, s.name, s.roll_no, s.branch, s.year, s.semester
      FROM placement_applications a JOIN students s ON s.id=a.student_id WHERE a.drive_id=? AND s.deleted_at IS NULL ORDER BY s.roll_no`).all(id) as any[])
    .map((r) => ({ id: r.id, studentId: r.sid, name: r.name, rollNo: r.roll_no, branch: r.branch, year: r.year, semester: r.semester, status: r.status,
      appliedAt: new Date(r.applied_at).toISOString(), percentage: studentPercentage(r.sid) }));
  return { ok: true, rows };
}

// Set application status.
export function setApplicationStatus(u: SessionUser, id: string, applicationId: string, status: unknown, now = Date.now()): Result<{ studentId: string; driveTitle: string }> {
  const d = findDrive(id);
  if (!d || !isStaff(u)) return fail(404, 'Not found');
  if (!canManageDrive(u, d)) return fail(403, 'Only the person who posted this drive, or admin, can change an application');
  if (!APP_STATUSES.includes(status as any)) return fail(400, 'Choose a valid status');
  const a = db.prepare('SELECT id, student_id FROM placement_applications WHERE id=? AND drive_id=?').get(applicationId, id) as any;
  if (!a) return fail(404, 'Application not found');
  db.prepare('UPDATE placement_applications SET status=?, status_by=?, status_at=? WHERE id=?').run(status as string, u.id, now, a.id);
  return { ok: true, studentId: a.student_id, driveTitle: d.title };
}

// ---------- government / private job listings ----------
export function createJob(u: SessionUser, b: any): Result<{ id: string }> {
  if (!isStaff(u)) return fail(403, 'Only the placement cell (admin or faculty) can post a job listing');
  const title = str(b?.title, 200), org = str(b?.organization, 150);
  if (!title || !org) return fail(400, 'Title and organization are required');
  if (!BRANCHES.includes(b?.branch)) return fail(400, 'Choose the branch (CSE, Civil or Both)');
  if (!JOB_TYPES.includes(b?.jobType)) return fail(400, 'Choose the job type');
  const vac = Math.round(Number(b?.vacancies ?? 0));
  if (!Number.isFinite(vac) || vac < 0 || vac > 1000000) return fail(400, 'Vacancies must be a number');
  const deadline = b?.applicationDeadline ? str(b.applicationDeadline, 10) : '';
  if (deadline && !validDate(deadline)) return fail(400, 'Enter the application deadline as a date');
  const id = newId('pjob');
  db.prepare(`INSERT INTO placement_jobs (id,title,organization,branch,job_type,exam_or_post,expected_month,pay_scale,vacancies,qualification,age_limit,official_link,syllabus_summary,application_deadline,notes,is_active,posted_by_user_id,posted_by_name,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?)`)
    .run(id, title, org, b.branch, b.jobType, str(b?.examOrPostName, 200), str(b?.expectedMonth, 60), str(b?.payScale, 120), vac, str(b?.qualification, 300), str(b?.ageLimit, 80),
      httpUrl(b?.officialLink), str(b?.syllabusSummary, 2000), deadline, str(b?.notes, 1000), u.id, u.name, Date.now());
  return { ok: true, id };
}

// Delete job.
export function deleteJob(u: SessionUser, id: string): Result<{ title: string }> {
  const j = findJob(id);
  if (!j || !isStaff(u)) return fail(404, 'Not found');
  if (!(u.role === 'admin' || j.posted_by_user_id === u.id)) return fail(403, 'Only the person who posted this listing, or admin, can delete it');
  db.prepare('DELETE FROM placement_jobs WHERE id=?').run(id);
  return { ok: true, title: j.title };
}
