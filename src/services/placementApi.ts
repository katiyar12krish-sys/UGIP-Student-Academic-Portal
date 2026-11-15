// Server calls for placement drives, applications and job listings (Step 11).
// The server decides who may post, see, apply and change an application (branch, deadline and minimum percentage included).
import { call } from './academicApi';
import type { PlacementDrive, GovernmentPrivateJob } from '../types';

// Data shape: drive view.
export type DriveView = PlacementDrive & {
  closed: boolean;                 // deactivated, or the deadline (end of day, IST) has passed
  applicantCount: number;          // everybody sees the number; only the poster / admin see the names
  mine: boolean;                   // posted by the signed-in person
  postedByName: string;
  applied?: boolean;               // students only
  myStatus?: ApplicationStatus;    // students only: their own application
  cannotApplyReason?: string;      // students only: why the Apply button is blocked
};
// Data shape: job view.
export type JobView = GovernmentPrivateJob & { mine: boolean; postedByName: string };
// Data shape: application status.
export type ApplicationStatus = 'Applied' | 'Shortlisted' | 'Selected' | 'Rejected';
// Data shape: applicant.
export interface Applicant { id: string; studentId: string; name: string; rollNo: string; branch: string; year: number; semester: number; status: ApplicationStatus; appliedAt: string; percentage: number | null }

// Data shape: drive input.
export type DriveInput = Omit<PlacementDrive, 'id' | 'isActive' | 'eligibilityCriteria'> & { minPercentage: number; otherCriteria?: string };
// Data shape: job input.
export type JobInput = Omit<GovernmentPrivateJob, 'id' | 'isActive'>;

// D.
const d = (id: string) => encodeURIComponent(id);
export const placementApi = {
  drives: () => call<DriveView[]>('GET', '/api/placement/drives'),
  jobs: () => call<JobView[]>('GET', '/api/placement/jobs'),
  postDrive: (b: DriveInput) => call<DriveView>('POST', '/api/placement/drives', b),
  setActive: (id: string, active: boolean) => call<DriveView>('POST', `/api/placement/drives/${d(id)}/active`, { active }),
  removeDrive: (id: string) => call<{ ok: true }>('DELETE', `/api/placement/drives/${d(id)}`),
  apply: (id: string) => call<DriveView>('POST', `/api/placement/drives/${d(id)}/apply`),
  withdraw: (id: string) => call<DriveView>('DELETE', `/api/placement/drives/${d(id)}/apply`),
  applicants: (id: string) => call<Applicant[]>('GET', `/api/placement/drives/${d(id)}/applicants`),
  setStatus: (id: string, applicationId: string, status: ApplicationStatus) =>
    call<Applicant[]>('POST', `/api/placement/drives/${d(id)}/applicants/${d(applicationId)}/status`, { status }),
  postJob: (b: JobInput) => call<JobView>('POST', '/api/placement/jobs', b),
  removeJob: (id: string) => call<{ ok: true }>('DELETE', `/api/placement/jobs/${d(id)}`),
};
