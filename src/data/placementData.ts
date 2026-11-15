// Rebuilt file: the original src/data folder was missing from the step-16 zip.
// Staff and subjects come from server/db/seed-staff.json and seed-subjects.json.
// Sample content that cannot be recovered (syllabus topics, demo quizzes, videos, placement figures) is left empty or zero.
import type { PlacementDrive, GovernmentPrivateJob, SharedExperience, StudentProgressGraphPoint, PlacementQuestionItem } from '../types';

export const INITIAL_PLACEMENT_DRIVES: PlacementDrive[] = [];
export const INITIAL_GOVT_PRIVATE_JOBS: GovernmentPrivateJob[] = [];
export const INITIAL_SHARED_EXPERIENCES: SharedExperience[] = [];
export const INITIAL_STUDENT_PROGRESS_POINTS: StudentProgressGraphPoint[] = [];

// Data shape: interview video.
export interface InterviewVideo { id: string; title: string; description: string; category: string; duration: string; videoId: string; url?: string }   // url: full YouTube link (optional, built from videoId when missing)
export const INTERVIEW_VIDEOS_TELL_ME_ABOUT_YOURSELF: InterviewVideo[] = [];
export const INTERVIEW_VIDEOS_RESUME_AND_BASIC: InterviewVideo[] = [];

export const PLACEMENT_QUESTION_MEGA_BANK: PlacementQuestionItem[] = [];

// Real figures must be entered by the placement cell. Zeros are shown until then.
export const COLLEGE_PLACEMENT_RECORDS_DATA = {
  overallStatistics: {
    year2026: {
      placementRatePercent: 0,
      placedStudents: 0,
      totalEligibleStudents: 0,
      highestPackageLPA: 0,
      averagePackageLPA: 0,
      totalCompaniesVisited: 0,
      totalOffersIssued: 0,
    },
  },
  topRecruiters: [] as { name: string; branch: string; hires: number; package: string }[],
};
