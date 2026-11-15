// Rebuilt file: the original src/data folder was missing from the step-16 zip.
// Staff and subjects come from server/db/seed-staff.json and seed-subjects.json.
// Sample content that cannot be recovered (syllabus topics, demo quizzes, videos, placement figures) is left empty or zero.
export interface DailyQuizRecord {
  id: string; dayNumber: number; formattedDate: string; subject: string; topic: string; difficulty: string;
  totalQuestions: number; correctAnswers: number; wrongAnswers: number; successRate: number; failureRate: number; feedback: string;
}
// Data shape: subject breakdown item.
export interface SubjectBreakdownItem {
  subject: string; quizzesCount: number; attempted: number; correct: number; wrong: number;
  successRate: number; failureRate: number; baselineRate: number; delta: number; masteryLevel: string;
}
// Data shape: longitudinal milestone.
export interface LongitudinalMilestone {
  milestone: string; dayLabel: string; date: string; score: number; successRate: number; failureRate: number; notes: string;
}
// Data shape: student longitudinal data.
export interface StudentLongitudinalData {
  studentId: string; studentName: string; rollNo: string; branch: string; semester: number;
  firstDayDate: string; firstDayBaselineScore: number; currentDate: string; currentScore: number; overallImprovement: number;
  learningVelocityPerWeek: number; totalQuizzesTaken: number; totalQuestionsAttempted: number; totalCorrect: number; totalWrong: number;
  overallSuccessRate: number; overallFailureRate: number; status: string;
  strengths: string[]; remedialRecommendations: string[];
  subjectBreakdown: SubjectBreakdownItem[]; longitudinalMilestones: LongitudinalMilestone[]; dailyRecords: DailyQuizRecord[];
}

// Empty until real quiz history exists; the dashboard builds a sample view for any student not listed here.
export const COMPREHENSIVE_STUDENT_ANALYTICS: Record<string, StudentLongitudinalData> = {};

export const COHORT_SUMMARY_METRICS = {
  cohortAverageBaselineDay1: 0,
  cohortAverageCurrentToday: 0,
  cohortNetGrowthPercent: 0,
  overallSuccessRateClass: 0,
  overallFailureRateClass: 0,
  remedialNeededStudentsCount: 0,
  highestAccuracyToday: { name: '-', branch: '-', score: 0 },
  topGainer: { name: '-', branch: '-', leap: 0 },
};
