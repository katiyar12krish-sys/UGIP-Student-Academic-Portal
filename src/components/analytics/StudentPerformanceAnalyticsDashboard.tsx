// ===================================================================================================
// Charts of student performance over semesters (marks, attendance, trends) for staff and students.
// ===================================================================================================
import React, { useState, useMemo } from 'react';
import { useCollege } from '../../context/CollegeContext';
import {
  COMPREHENSIVE_STUDENT_ANALYTICS,
  COHORT_SUMMARY_METRICS,
  StudentLongitudinalData,
  DailyQuizRecord,
} from '../../data/studentAnalyticsData';
import { BranchCode } from '../../types';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  Filter,
  Download,
  Printer,
  Sparkles,
  Users,
  Search,
  BookOpen,
  PieChart,
  Activity,
  Layers,
  FileText,
  Clock,
  Flame,
  ChevronRight,
  HelpCircle,
  GraduationCap,
  ShieldCheck,
  Zap,
} from 'lucide-react';

// Data shape: student performance analytics dashboard props.
interface StudentPerformanceAnalyticsDashboardProps {
  initialStudentId?: string;
  onExit?: () => void;
}

// Screen part: student performance analytics dashboard.
export const StudentPerformanceAnalyticsDashboard: React.FC<StudentPerformanceAnalyticsDashboardProps> = ({
  initialStudentId,
  onExit,
}) => {
  const { currentUser, users, subjects, studentProgressPoints, t } = useCollege();

  // Role Detection
  const isStudent = currentUser.role === 'student';
  const isFacultyOrAdmin = currentUser.role === 'faculty' || currentUser.role === 'admin';

  // Determine active student
  const defaultStudentId = isStudent
    ? currentUser.id
    : initialStudentId || 'stu-diya';

  // The student id chosen by the user (filter / list selection)
  const [selectedStudentId, setSelectedStudentId] = useState<string>(defaultStudentId);
  // The branch filter chosen by the user (filter / list selection)
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<'All' | 'CSE' | 'Civil'>('All');
  // The time range chosen by the user (filter / list selection)
  const [selectedTimeRange, setSelectedTimeRange] = useState<'all' | '30d' | '14d' | '7d'>('all');
  // The subject filter chosen by the user (filter / list selection)
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  // View mode (kept in screen state)
  const [viewMode, setViewMode] = useState<'individual' | 'cohort'>(
    isStudent ? 'individual' : 'individual'
  );
  // Text typed in the search box
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  // Hovered daily index (kept in screen state)
  const [hoveredDailyIndex, setHoveredDailyIndex] = useState<number | null>(null);

  // List of all students for Faculty/Admin selector
  const allStudents = useMemo(() => {
    return users.filter((u) => u.role === 'student');
  }, [users]);

  const filteredStudentList = useMemo(() => {
    return allStudents.filter((stu) => {
      const matchBranch = selectedBranchFilter === 'All' || stu.branch === selectedBranchFilter;
      const matchSearch =
        !studentSearchQuery ||
        stu.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
        (stu.rollNo && stu.rollNo.includes(studentSearchQuery));
      return matchBranch && matchSearch;
    });
  }, [allStudents, selectedBranchFilter, studentSearchQuery]);

  // Retrieve or compute current student data
  const studentData: StudentLongitudinalData = useMemo(() => {
    const existing = COMPREHENSIVE_STUDENT_ANALYTICS[selectedStudentId];
    if (existing) {
      // Dynamic merge with any real progress points added in context
      const contextPoints = studentProgressPoints.filter((p) => p.studentId === selectedStudentId);
      if (contextPoints.length > 0) {
        const latestPoint = contextPoints[contextPoints.length - 1];
        return {
          ...existing,
          currentScore: latestPoint.scorePercentage,
          overallImprovement: latestPoint.scorePercentage - existing.firstDayBaselineScore,
        };
      }
      return existing;
    }

    // Fallback template for any other student
    const matchedUser = allStudents.find((s) => s.id === selectedStudentId) || currentUser;
    const isCivil = matchedUser.branch === 'Civil';

    return {
      studentId: matchedUser.id,
      studentName: matchedUser.name,
      rollNo: matchedUser.rollNo || '2404599',
      branch: matchedUser.branch || 'CSE',
      semester: matchedUser.semester || 3,
      firstDayDate: '2026-08-10',
      firstDayBaselineScore: 54,
      currentDate: '2026-10-02',
      currentScore: 82,
      overallImprovement: 28,
      learningVelocityPerWeek: 3.8,
      totalQuizzesTaken: 19,
      totalQuestionsAttempted: 310,
      totalCorrect: 254,
      totalWrong: 56,
      overallSuccessRate: 81.9,
      overallFailureRate: 18.1,
      status: 'High Growth',
      strengths: [
        isCivil ? 'Surveying - I Total Station leveling' : 'Computer Programming in C logic & loops',
        'Academic consistency and regular participation in daily drills',
      ],
      remedialRecommendations: [
        isCivil ? 'Practice Strength of Materials bending stress' : 'Focus on Data Structures tree recursions',
        'Maintain daily 15-minute quiz cadence',
      ],
      subjectBreakdown: [
        {
          subject: isCivil ? 'Surveying - I' : 'Computer Programming Using C',
          quizzesCount: 7,
          attempted: 110,
          correct: 94,
          wrong: 16,
          successRate: 85.5,
          failureRate: 14.5,
          baselineRate: 55,
          delta: 30.5,
          masteryLevel: 'Mastered',
        },
        {
          subject: isCivil ? 'Concrete Technology' : 'Data Structures & Algorithms',
          quizzesCount: 6,
          attempted: 100,
          correct: 82,
          wrong: 18,
          successRate: 82.0,
          failureRate: 18.0,
          baselineRate: 52,
          delta: 30.0,
          masteryLevel: 'Proficient',
        },
        {
          subject: 'Applied Mathematics',
          quizzesCount: 6,
          attempted: 100,
          correct: 78,
          wrong: 22,
          successRate: 78.0,
          failureRate: 22.0,
          baselineRate: 55,
          delta: 23.0,
          masteryLevel: 'Proficient',
        },
      ],
      longitudinalMilestones: [
        { milestone: 'Day 1 Baseline Assessment', dayLabel: 'Day 1', date: '2026-08-10', score: 54, successRate: 54, failureRate: 46, notes: 'Initial diagnostic assessment.' },
        { milestone: 'Mid-Term Standing', dayLabel: 'Day 28', date: '2026-09-07', score: 70, successRate: 70, failureRate: 30, notes: 'Significant improvement in core concepts.' },
        { milestone: 'Current Date Standing', dayLabel: 'Day 53 (Today)', date: '2026-10-02', score: 82, successRate: 82, failureRate: 18, notes: 'Steady distinction trajectory.' },
      ],
      dailyRecords: [
        { id: `gen-1`, date: '2026-08-10', dayNumber: 1, formattedDate: '10 Aug 2026', subject: isCivil ? 'Surveying - I' : 'Computer Programming Using C', topic: 'Core Foundations', branch: matchedUser.branch || 'CSE', totalQuestions: 15, correctAnswers: 8, wrongAnswers: 7, successRate: 53.3, failureRate: 46.7, timeSpentMinutes: 18, difficulty: 'Easy', feedback: 'Baseline assessment recorded.' },
        { id: `gen-2`, date: '2026-08-25', dayNumber: 16, formattedDate: '25 Aug 2026', subject: isCivil ? 'Concrete Tech' : 'Data Structures', topic: 'Standard Units', branch: matchedUser.branch || 'CSE', totalQuestions: 20, correctAnswers: 14, wrongAnswers: 6, successRate: 70.0, failureRate: 30.0, timeSpentMinutes: 20, difficulty: 'Medium', feedback: 'Good conceptual progress.' },
        { id: `gen-3`, date: '2026-10-02', dayNumber: 53, formattedDate: '02 Oct 2026', subject: isCivil ? 'Surveying - I' : 'Computer Programming Using C', topic: 'Advanced Application', branch: matchedUser.branch || 'CSE', totalQuestions: 25, correctAnswers: 21, wrongAnswers: 4, successRate: 84.0, failureRate: 16.0, timeSpentMinutes: 22, difficulty: 'Hard', feedback: 'High accuracy achieved.' },
      ],
    };
  }, [selectedStudentId, allStudents, currentUser, studentProgressPoints]);

  // Filtered Daily Records based on time range and subject
  const filteredDailyRecords = useMemo(() => {
    let records = studentData.dailyRecords;
    if (selectedSubjectFilter !== 'all') {
      records = records.filter((r) => r.subject === selectedSubjectFilter);
    }
    if (selectedTimeRange === '7d') {
      records = records.slice(-3);
    } else if (selectedTimeRange === '14d') {
      records = records.slice(-5);
    } else if (selectedTimeRange === '30d') {
      records = records.slice(-8);
    }
    return records;
  }, [studentData, selectedSubjectFilter, selectedTimeRange]);

  // Handle Printable Report
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div id="student-performance-analytics-container" className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-indigo-500/20">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <BarChart3 className="w-64 h-64 text-indigo-400" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 uppercase tracking-wider">
                <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                Performance Analytics & Longitudinal Engine
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                UBTER Roorkee Session 2026-2027
              </span>
              {isStudent && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Student Self-Service Portal
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Student Performance Analytics
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Visualizing daily quiz performance, success vs. failure rates, and comprehensive longitudinal improvement tracking from the first day to the current date.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isFacultyOrAdmin && (
              <div className="flex items-center bg-white/10 rounded-2xl p-1 border border-white/10">
                <button
                  onClick={() => setViewMode('individual')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'individual'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Student Inspector
                </button>
                <button
                  onClick={() => setViewMode('cohort')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'cohort'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Cohort Overview (Class)
                </button>
              </div>
            )}

            <button
              onClick={handlePrintReport}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer shadow-xs"
              title="Print or Export Longitudinal Report"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span>Print / PDF Report</span>
            </button>

            {onExit && (
              <button
                onClick={onExit}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <span>पोर्टल से बाहर निकलें (Exit)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Faculty/Admin Student Switcher Bar */}
      {isFacultyOrAdmin && viewMode === 'individual' && (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Faculty / Admin Inspector
              </span>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Inspect Individual Student Longitudinal Report
              </h4>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Branch Filter */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-700 p-1 rounded-xl text-xs font-semibold">
              {(['All', 'CSE', 'Civil'] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setSelectedBranchFilter(b)}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    selectedBranchFilter === b
                      ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>

            {/* Student Dropdown Selector */}
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {filteredStudentList.map((stu) => (
                <option key={stu.id} value={stu.id}>
                  {stu.name} ({stu.rollNo || 'Roll N/A'} · {stu.branch} Sem {stu.semester})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* COHORT OVERVIEW VIEW (Available to Faculty & Admin) */}
      {/* ========================================================================= */}
      {viewMode === 'cohort' && isFacultyOrAdmin && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Cohort KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Cohort Baseline (Day 1)
              </span>
              <p className="text-2xl font-black text-slate-700 dark:text-slate-300">
                {COHORT_SUMMARY_METRICS.cohortAverageBaselineDay1}%
              </p>
              <p className="text-xs text-slate-500">Across 112 Diploma Students</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Cohort Average Today
              </span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {COHORT_SUMMARY_METRICS.cohortAverageCurrentToday}%
              </p>
              <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+{COHORT_SUMMARY_METRICS.cohortNetGrowthPercent}% Net Class Improvement</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Overall Success Rate
              </span>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {COHORT_SUMMARY_METRICS.overallSuccessRateClass}%
              </p>
              <p className="text-xs text-rose-500 font-semibold">
                Failure Rate: {COHORT_SUMMARY_METRICS.overallFailureRateClass}%
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Remedial Action Flagged
              </span>
              <p className="text-2xl font-black text-amber-600">
                {COHORT_SUMMARY_METRICS.remedialNeededStudentsCount} Students
              </p>
              <p className="text-xs text-slate-500">
                Declining trend from Day 1 requires tutorial
              </p>
            </div>
          </div>

          {/* Top Gainers & At-Risk Strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-emerald-600" />
                  Top Longitudinal Gainer
                </span>
                <h4 className="font-bold text-base text-slate-900 dark:text-white mt-1">
                  {COHORT_SUMMARY_METRICS.topGainer.name} ({COHORT_SUMMARY_METRICS.topGainer.branch})
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                  Leap: {COHORT_SUMMARY_METRICS.topGainer.leap} from First Day Baseline
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedStudentId('stu-aditya');
                  setViewMode('individual');
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                Inspect Report →
              </button>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-800 dark:text-indigo-300 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-indigo-600" />
                  Highest Accuracy Standing Today
                </span>
                <h4 className="font-bold text-base text-slate-900 dark:text-white mt-1">
                  {COHORT_SUMMARY_METRICS.highestAccuracyToday.name} ({COHORT_SUMMARY_METRICS.highestAccuracyToday.branch})
                </h4>
                <p className="text-xs text-indigo-700 dark:text-indigo-400 font-semibold">
                  Standing: {COHORT_SUMMARY_METRICS.highestAccuracyToday.score} (Overall 85.2% Success)
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedStudentId('stu-diya');
                  setViewMode('individual');
                }}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                Inspect Report →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INDIVIDUAL STUDENT PERFORMANCE & LONGITUDINAL PROGRESS REPORT */}
      {/* ========================================================================= */}
      {viewMode === 'individual' && (
        <div className="space-y-6">
          {/* Student Profile & Longitudinal KPI Strip */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                  {studentData.studentName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {studentData.studentName}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      {studentData.branch} Engineering · Sem {studentData.semester}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                        studentData.status === 'High Growth'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : studentData.status === 'Needs Intervention'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                      }`}
                    >
                      {studentData.overallImprovement >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>{studentData.status}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Roll No: {studentData.rollNo} · Longitudinal Assessment Track: {studentData.firstDayDate} to {studentData.currentDate}
                  </p>
                </div>
              </div>

              {/* Longitudinal Delta Badge */}
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-600">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Day 1 ➔ Today Delta
                  </span>
                  <p
                    className={`text-xl font-black ${
                      studentData.overallImprovement >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {studentData.overallImprovement >= 0 ? `+${studentData.overallImprovement}%` : `${studentData.overallImprovement}%`}
                  </p>
                </div>
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                    studentData.overallImprovement >= 0
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {studentData.overallImprovement >= 0 ? (
                    <TrendingUp className="w-5 h-5" />
                  ) : (
                    <TrendingDown className="w-5 h-5" />
                  )}
                </div>
              </div>
            </div>

            {/* 6 Key Performance Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Metric 1: Day 1 Baseline */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Day 1 Baseline
                </span>
                <p className="text-xl font-black text-slate-700 dark:text-slate-300">
                  {studentData.firstDayBaselineScore}%
                </p>
                <span className="text-[10px] text-slate-400 block font-mono">
                  {studentData.firstDayDate}
                </span>
              </div>

              {/* Metric 2: Current Score Today */}
              <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 space-y-1">
                <span className="text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-300 block">
                  Today Current Level
                </span>
                <p className="text-xl font-black text-indigo-700 dark:text-indigo-400">
                  {studentData.currentScore}%
                </p>
                <span className="text-[10px] text-indigo-500 dark:text-indigo-400 block font-mono">
                  {studentData.currentDate}
                </span>
              </div>

              {/* Metric 3: Overall Success Rate */}
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-900/60 space-y-1">
                <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300 block">
                  Success Rate
                </span>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {studentData.overallSuccessRate}%
                </p>
                <span className="text-[10px] text-emerald-600 block">
                  {studentData.totalCorrect} Correct
                </span>
              </div>

              {/* Metric 4: Overall Failure Rate */}
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-100 dark:border-rose-900/60 space-y-1">
                <span className="text-[10px] font-bold uppercase text-rose-700 dark:text-rose-300 block">
                  Failure Rate
                </span>
                <p className="text-xl font-black text-rose-600 dark:text-rose-400">
                  {studentData.overallFailureRate}%
                </p>
                <span className="text-[10px] text-rose-600 block">
                  {studentData.totalWrong} Wrong
                </span>
              </div>

              {/* Metric 5: Learning Velocity */}
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-100 dark:border-amber-900/60 space-y-1">
                <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300 block">
                  Velocity Rate
                </span>
                <p className="text-xl font-black text-amber-700 dark:text-amber-400">
                  {studentData.learningVelocityPerWeek >= 0 ? `+${studentData.learningVelocityPerWeek}%` : `${studentData.learningVelocityPerWeek}%`}
                </p>
                <span className="text-[10px] text-amber-600 block">
                  Per Week Gain
                </span>
              </div>

              {/* Metric 6: Total Quizzes */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Quizzes Solved
                </span>
                <p className="text-xl font-black text-slate-900 dark:text-white">
                  {studentData.totalQuizzesTaken}
                </p>
                <span className="text-[10px] text-slate-500 block">
                  {studentData.totalQuestionsAttempted} Questions
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 1: VISUAL CHARTS (DAILY PERFORMANCE & SUCCESS/FAILURE RATES) */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Daily Quiz Success vs Failure Rate (Stacked Bar Visualization) */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-slate-100 dark:border-slate-700">
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    <span>Daily Quiz Performance (Success vs Failure Rates)</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Day-by-day count of Correct (Success) and Incorrect (Failure) answers attempted.
                  </p>
                </div>

                {/* Filter Time Range */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-700 p-1 rounded-xl text-xs font-semibold">
                  {[
                    { id: 'all', label: 'All Days' },
                    { id: '30d', label: '30 Days' },
                    { id: '14d', label: '14 Days' },
                    { id: '7d', label: '7 Days' },
                  ].map((tRange) => (
                    <button
                      key={tRange.id}
                      onClick={() => setSelectedTimeRange(tRange.id as any)}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        selectedTimeRange === tRange.id
                          ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {tRange.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-5 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-emerald-500 inline-block shadow-xs"></span>
                  <span className="text-slate-700 dark:text-slate-300">
                    Success (Correct Answers)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-rose-500 inline-block shadow-xs"></span>
                  <span className="text-slate-700 dark:text-slate-300">
                    Failure (Wrong Answers)
                  </span>
                </div>
                <div className="ml-auto text-[11px] text-slate-400 font-mono">
                  Showing {filteredDailyRecords.length} Sessions
                </div>
              </div>

              {/* Interactive SVG / Bar Chart Representation */}
              <div className="h-64 sm:h-72 w-full flex items-end gap-2 sm:gap-3 pt-6 pb-2 px-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
                {filteredDailyRecords.map((record, rIdx) => {
                  const maxH = 200; // max px height
                  const successHeight = Math.max(12, (record.correctAnswers / record.totalQuestions) * maxH);
                  const failureHeight = Math.max(8, (record.wrongAnswers / record.totalQuestions) * maxH);
                  const isHovered = hoveredDailyIndex === rIdx;

                  return (
                    <div
                      key={record.id}
                      onMouseEnter={() => setHoveredDailyIndex(rIdx)}
                      onMouseLeave={() => setHoveredDailyIndex(null)}
                      className="flex-1 min-w-[38px] max-w-[60px] flex flex-col items-center justify-end h-full relative cursor-pointer group"
                    >
                      {/* Tooltip on hover */}
                      {isHovered && (
                        <div className="absolute -top-24 z-30 bg-slate-900 text-white text-[11px] rounded-xl p-2.5 shadow-xl w-48 pointer-events-none border border-slate-700 space-y-1">
                          <p className="font-bold text-indigo-300">{record.formattedDate} (Day {record.dayNumber})</p>
                          <p className="text-[10px] text-slate-300 line-clamp-1">{record.subject}</p>
                          <div className="flex justify-between pt-1 border-t border-slate-700 font-mono">
                            <span className="text-emerald-400 font-bold">✓ {record.correctAnswers} ({record.successRate}%)</span>
                            <span className="text-rose-400 font-bold">✕ {record.wrongAnswers} ({record.failureRate}%)</span>
                          </div>
                        </div>
                      )}

                      {/* Percentage Tag */}
                      <span className="text-[10px] font-mono font-bold text-slate-500 mb-1">
                        {record.successRate}%
                      </span>

                      {/* Stacked Vertical Bar */}
                      <div className="w-full flex flex-col justify-end rounded-t-xl overflow-hidden shadow-xs transition-all duration-300 group-hover:ring-2 group-hover:ring-indigo-400">
                        {/* Wrong / Failure portion (top) */}
                        <div
                          style={{ height: `${failureHeight}px` }}
                          className="w-full bg-rose-500 hover:bg-rose-400 transition-colors"
                          title={`Failure: ${record.wrongAnswers} (${record.failureRate}%)`}
                        ></div>
                        {/* Correct / Success portion (bottom) */}
                        <div
                          style={{ height: `${successHeight}px` }}
                          className="w-full bg-emerald-500 hover:bg-emerald-400 transition-colors"
                          title={`Success: ${record.correctAnswers} (${record.successRate}%)`}
                        ></div>
                      </div>

                      {/* Day Label */}
                      <span className="text-[10px] text-slate-500 mt-2 font-mono whitespace-nowrap">
                        D{record.dayNumber}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Chart Footnote */}
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>← Day 1 Baseline Evaluation</span>
                <span>Current Progress (Today) →</span>
              </div>
            </div>

            {/* Chart 2: Success Rate vs Failure Rate Circular Donut Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-indigo-600" />
                  <span>Overall Success vs Failure Ratio</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Aggregate distribution across all {studentData.totalQuestionsAttempted} solved questions.
                </p>
              </div>

              {/* Circular SVG Donut */}
              <div className="relative w-44 h-44 mx-auto my-2 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  {/* Background Circle */}
                  <path
                    className="text-slate-100 dark:text-slate-700"
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Failure Segment (Red) */}
                  <path
                    className="text-rose-500"
                    strokeDasharray="100, 100"
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Success Segment (Green) */}
                  <path
                    className="text-emerald-500 transition-all duration-1000 ease-out"
                    strokeDasharray={`${studentData.overallSuccessRate}, 100`}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>

                {/* Center Badge */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    {studentData.overallSuccessRate}%
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                    Success Rate
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {studentData.totalCorrect} / {studentData.totalQuestionsAttempted}
                  </span>
                </div>
              </div>

              {/* Stats Breakdown Box */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800">
                  <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Total Correct (Success)</span>
                  </span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                    {studentData.totalCorrect} ({studentData.overallSuccessRate}%)
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-800">
                  <span className="font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Total Incorrect (Failure)</span>
                  </span>
                  <span className="font-mono font-bold text-rose-700 dark:text-rose-300">
                    {studentData.totalWrong} ({studentData.overallFailureRate}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2: LONGITUDINAL PROGRESS REPORT (FIRST DAY TO CURRENT DATE) */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-slate-100 dark:border-slate-700">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  Longitudinal Academic Growth Report
                </span>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  Improvement Trajectory: First Day ({studentData.firstDayDate}) ➔ Current Date ({studentData.currentDate})
                </h4>
                <p className="text-xs text-slate-500">
                  Continuous performance curve tracking foundational entry benchmark up to current semester mastery.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {studentData.longitudinalMilestones.length} Official Checkpoints
                </span>
              </div>
            </div>

            {/* Continuous SVG Longitudinal Trend Line Chart */}
            <div className="p-5 bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-800/80 dark:to-indigo-950/20 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Longitudinal Mastery Curve (% Accuracy)</span>
                </span>
                <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                  UBTER Distinction Threshold: 75%
                </span>
              </div>

              {/* Responsive SVG Longitudinal Line Curve */}
              <div className="w-full h-48 sm:h-56 relative pt-4 pb-2">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 600 160">
                  {/* Grid Lines */}
                  <line x1="0" y1="20" x2="600" y2="20" stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-700" />
                  <line x1="0" y1="60" x2="600" y2="60" stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-700" />
                  <line x1="0" y1="100" x2="600" y2="100" stroke="currentColor" strokeDasharray="3 3" className="text-slate-200 dark:text-slate-700" />
                  <line x1="0" y1="140" x2="600" y2="140" stroke="currentColor" className="text-slate-300 dark:text-slate-600" />

                  {/* Benchmark distinction line at 75% (y = 40) */}
                  <line x1="0" y1="40" x2="600" y2="40" stroke="#10b981" strokeDasharray="4 4" strokeWidth="1.5" opacity="0.6" />
                  <text x="500" y="34" fill="#10b981" fontSize="10" fontWeight="bold">75% Distinction Target</text>

                  {/* Dynamic Curve Calculation for Milestones */}
                  {(() => {
                    const points = studentData.longitudinalMilestones.map((m, idx) => {
                      const x = (idx / (studentData.longitudinalMilestones.length - 1)) * 560 + 20;
                      // map score 40%..100% to y 140..20
                      const y = 140 - ((m.score - 40) / 60) * 120;
                      return { x, y, ...m };
                    });

                    const pathD = points.reduce((acc, curr, i) => {
                      if (i === 0) return `M ${curr.x} ${curr.y}`;
                      const prev = points[i - 1];
                      const cx = (prev.x + curr.x) / 2;
                      return `${acc} C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
                    }, '');

                    const areaD = `${pathD} L ${points[points.length - 1].x} 140 L ${points[0].x} 140 Z`;

                    return (
                      <>
                        {/* Shaded Area under Curve */}
                        <defs>
                          <linearGradient id="longitudinalGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
                          </linearGradient>
                        </defs>
                        <path d={areaD} fill="url(#longitudinalGradient)" />

                        {/* Smooth Line Curve */}
                        <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="3.5" strokeLinecap="round" />

                        {/* Milestone Coordinate Points */}
                        {points.map((pt, pIdx) => {
                          const isFirst = pIdx === 0;
                          const isLast = pIdx === points.length - 1;
                          return (
                            <g key={pIdx}>
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r={isFirst || isLast ? '6' : '4.5'}
                                fill={isLast ? '#10b981' : isFirst ? '#f59e0b' : '#6366f1'}
                                stroke="#ffffff"
                                strokeWidth="2.5"
                                className="transition-all hover:scale-125 cursor-pointer shadow-md"
                              />
                              <text
                                x={pt.x}
                                y={pt.y - 10}
                                textAnchor="middle"
                                fontSize="10"
                                fontWeight="bold"
                                fill={isLast ? '#10b981' : isFirst ? '#d97706' : '#4f46e5'}
                              >
                                {pt.score}%
                              </text>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>

              {/* Milestone Timeline Steps Below Chart */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                {studentData.longitudinalMilestones.map((m, mIdx) => (
                  <div key={mIdx} className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 block font-mono">
                      {m.dayLabel} ({m.date})
                    </span>
                    <p className="font-black text-xs text-slate-900 dark:text-white">
                      {m.score}% Accuracy
                    </p>
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {m.notes}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Subject-Wise Longitudinal Mastery Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>Subject-Wise Performance & Longitudinal Delta</span>
                </h5>
                <span className="text-xs text-slate-400">
                  Compared against initial subject baselines
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {studentData.subjectBreakdown.map((sub, sIdx) => (
                  <div
                    key={sIdx}
                    className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h6 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                          {sub.subject}
                        </h6>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {sub.quizzesCount} Quizzes · {sub.attempted} Questions Solved
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sub.masteryLevel === 'Mastered'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : sub.masteryLevel === 'Proficient'
                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                            : sub.masteryLevel === 'Needs Remedial'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {sub.masteryLevel}
                      </span>
                    </div>

                    {/* Progress Bar & Success/Failure ratio */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono font-semibold">
                        <span className="text-emerald-600">Success: {sub.successRate}% ({sub.correct}✓)</span>
                        <span className="text-rose-500">Failure: {sub.failureRate}% ({sub.wrong}✕)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                        <div
                          style={{ width: `${sub.successRate}%` }}
                          className="bg-emerald-500 h-full"
                        ></div>
                        <div
                          style={{ width: `${sub.failureRate}%` }}
                          className="bg-rose-500 h-full"
                        ></div>
                      </div>
                    </div>

                    {/* Delta From Baseline */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-700">
                      <span>Baseline: {sub.baselineRate}%</span>
                      <span
                        className={`font-bold font-mono ${
                          sub.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {sub.delta >= 0 ? `+${sub.delta}% Gain` : `${sub.delta}% Decline`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths & Actionable Remedial Recommendations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Identified Strengths */}
              <div className="p-5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/50 space-y-2">
                <span className="text-xs font-black uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>Demonstrated Core Strengths</span>
                </span>
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  {studentData.strengths.map((str, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold shrink-0">✓</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Remedial Recommendations */}
              <div className="p-5 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200/80 dark:border-amber-800/50 space-y-2">
                <span className="text-xs font-black uppercase text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span>Remedial & Growth Next Steps</span>
                </span>
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  {studentData.remedialRecommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-600 font-bold shrink-0">➔</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 3: DETAILED DAILY QUIZ LOG TABLE */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-slate-100 dark:border-slate-700">
              <div>
                <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <span>Daily Quiz Performance Session Log</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Granular session history recording topic, difficulty, questions attempted, correct/wrong split and success/failure rates.
                </p>
              </div>

              {/* Subject Filter Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Filter Subject:</span>
                <select
                  value={selectedSubjectFilter}
                  onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
                >
                  <option value="all">All Subjects</option>
                  {studentData.subjectBreakdown.map((s, idx) => (
                    <option key={idx} value={s.subject}>
                      {s.subject}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3">Date & Day</th>
                    <th className="p-3">Subject & Topic</th>
                    <th className="p-3">Attempted</th>
                    <th className="p-3 font-bold text-emerald-600">Success (✓)</th>
                    <th className="p-3 font-bold text-rose-500">Failure (✕)</th>
                    <th className="p-3 font-bold text-indigo-600">Success Rate</th>
                    <th className="p-3">Difficulty</th>
                    <th className="p-3">Analytical Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredDailyRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                      <td className="p-3 font-mono">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {rec.formattedDate}
                        </span>
                        <span className="text-[10px] text-slate-400">Day {rec.dayNumber}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">
                          {rec.subject}
                        </span>
                        <span className="text-[11px] text-slate-500">{rec.topic}</span>
                      </td>
                      <td className="p-3 font-mono font-semibold">{rec.totalQuestions} Qs</td>
                      <td className="p-3 font-mono font-bold text-emerald-600">{rec.correctAnswers}</td>
                      <td className="p-3 font-mono font-bold text-rose-600">{rec.wrongAnswers}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold ${
                              rec.successRate >= 75 ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            {rec.successRate}%
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            (Fail: {rec.failureRate}%)
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rec.difficulty === 'Hard'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : rec.difficulty === 'Medium'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          }`}
                        >
                          {rec.difficulty}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-slate-600 dark:text-slate-400 max-w-xs">
                        {rec.feedback}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
