// ===================================================================================================
// Batch-wise attendance analysis (1st / 2nd / 3rd year) from recorded lectures; never invents numbers.
// ===================================================================================================
import React, { useState, useMemo } from 'react';
import ExportMenu from './ExportMenu';
import type { ExportTable } from '../../utils/exporter';
import { useCollege } from '../../context/CollegeContext';
import { BranchCode, UserProfile } from '../../types';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Download,
  Filter,
  Search,
  BookOpen,
  Calendar,
  Send,
  Edit3,
  Award,
  Layers,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

// Data shape: yearwise attendance analysis props.
interface YearwiseAttendanceAnalysisProps {
  initialYear?: 1 | 2 | 3 | 'all';
  initialBranch?: BranchCode | 'all';
  allowEdit?: boolean;
  forceMobileView?: boolean;
}

// Screen part: yearwise attendance analysis.
export const YearwiseAttendanceAnalysis: React.FC<YearwiseAttendanceAnalysisProps> = ({
  initialYear = 'all',
  initialBranch = 'all',
  allowEdit = true,
  forceMobileView = false,
}) => {
  const {
    users,
    subjects,
    currentUser,
    updateUser,
    sendDirectStudentNotice,
    logActivity,
    getAttendanceCounts,
    attendanceSummary,
    attendanceSessions,
  } = useCollege();
  // Real attendance from recorded classes. null = no classes recorded yet (we never invent a number).
  const pctOf = (s: UserProfile): number | null => getAttendanceCounts(s.id).percent;

  // The year chosen by the user (filter / list selection)
  const [selectedYear, setSelectedYear] = useState<1 | 2 | 3 | 'all'>(initialYear);
  // The branch chosen by the user (filter / list selection)
  const [selectedBranch, setSelectedBranch] = useState<BranchCode | 'all'>(initialBranch);
  // Text typed in the search box
  const [searchQuery, setSearchQuery] = useState('');
  // Status filter (kept in screen state)
  const [statusFilter, setStatusFilter] = useState<'all' | 'safe' | 'warning' | 'detained'>('all');

  // Edit attendance modal state
  const [editingStudent, setEditingStudent] = useState<UserProfile | null>(null);
  // New attendance percent (kept in screen state)
  const [newAttendancePercent, setNewAttendancePercent] = useState<number>(85);
  // Edit success msg (kept in screen state)
  const [editSuccessMsg, setEditSuccessMsg] = useState<string | null>(null);

  // Send warning notice state
  const [warningTargetStudent, setWarningTargetStudent] = useState<UserProfile | null>(null);
  // Warning notice sent (kept in screen state)
  const [warningNoticeSent, setWarningNoticeSent] = useState<string | null>(null);
  // Error message to show (warning notice error); empty = no error
  const [warningNoticeError, setWarningNoticeError] = useState<string | null>(null);

  // Filter students list
  const allStudents = useMemo(() => {
    return users.filter((u) => u.role === 'student');
  }, [users]);

  const filteredStudents = useMemo(() => {
    return allStudents.filter((s) => {
      const matchYear = selectedYear === 'all' || s.year === selectedYear;
      const matchBranch = selectedBranch === 'all' || s.branch === selectedBranch;

      const att = pctOf(s);
      let matchStatus = true;
      if (statusFilter !== 'all') {
        matchStatus = att !== null && (statusFilter === 'safe' ? att >= 75 : statusFilter === 'warning' ? att >= 60 && att < 75 : att < 60);
      }

      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.rollNo && s.rollNo.includes(q)) ||
        (s.ubterRollNumber && s.ubterRollNumber.includes(q)) ||
        (s.branch && s.branch.toLowerCase().includes(q));

      return matchYear && matchBranch && matchStatus && matchQuery;
    });
  }, [allStudents, selectedYear, selectedBranch, statusFilter, searchQuery, attendanceSummary]);

  // Aggregate stats across the current filter
  const stats = useMemo(() => {
    const total = filteredStudents.length;
    if (total === 0) {
      return {
        total: 0,
        avgAttendance: 0,
        safeCount: 0,
        warningCount: 0,
        detainedCount: 0,
        safePercent: 0,
        warningPercent: 0,
        detainedPercent: 0,
      };
    }

    let sum = 0;
    let safe = 0;
    let warn = 0;
    let detained = 0;

    let counted = 0;   // only students who have at least one recorded class
    filteredStudents.forEach((s) => {
      const att = pctOf(s);
      if (att === null) return;
      counted++;
      sum += att;
      if (att >= 75) safe++;
      else if (att >= 60) warn++;
      else detained++;
    });

    const avg = counted ? Math.round((sum / counted) * 10) / 10 : 0;
    return {
      total,
      avgAttendance: avg,
      safeCount: safe,
      warningCount: warn,
      detainedCount: detained,
      safePercent: counted ? Math.round((safe / counted) * 100) : 0,
      warningPercent: counted ? Math.round((warn / counted) * 100) : 0,
      detainedPercent: counted ? Math.round((detained / counted) * 100) : 0,
    };
  }, [filteredStudents, attendanceSummary]);

  // Year-by-Year breakdown comparisons
  const yearBreakdowns = useMemo(() => {
    return [1, 2, 3].map((yr) => {
      const yrStudents = allStudents.filter((s) => s.year === yr);
      const total = yrStudents.length;
      if (total === 0) {
        return { year: yr, total: 0, avg: 0, safe: 0, warn: 0, detained: 0 };
      }
      const known = yrStudents.map(pctOf).filter((x): x is number => x !== null);
      const sum = known.reduce((acc, x) => acc + x, 0);
      const safe = known.filter((x) => x >= 75).length;
      const warn = known.filter((x) => x >= 60 && x < 75).length;
      const detained = known.filter((x) => x < 60).length;
      return {
        year: yr,
        total,
        avg: known.length ? Math.round((sum / known.length) * 10) / 10 : 0,
        safe,
        warn,
        detained,
      };
    });
  }, [allStudents, attendanceSummary]);

  // Subject-wise attendance calculation
  const subjectBreakdown = useMemo(() => {
    return subjects.map((sub) => {
      const relevantStudents = allStudents.filter(
        (s) => s.branch === sub.branch && s.semester === sub.semester
      );
      const total = relevantStudents.length;
      const known = relevantStudents.map(pctOf).filter((x): x is number => x !== null);
      const avg = known.length ? Math.round((known.reduce((a, b) => a + b, 0) / known.length) * 10) / 10 : 0;
      const atRisk = known.filter((x) => x < 75).length;
      return {
        ...sub,
        totalEnrolled: total,
        avgAttendance: avg,
        atRiskCount: atRisk,
        conductedClasses: attendanceSessions.filter((x) => x.subjectId === sub.id).length,
      };
    });
  }, [subjects, allStudents, attendanceSummary, attendanceSessions]);

  // Runs when the user does this on screen: save attendance.
  const handleSaveAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    updateUser(editingStudent.id, {
      attendanceOverall: Number(newAttendancePercent),
    });

    logActivity(
      'UPDATE_ATTENDANCE',
      `Updated attendance for ${editingStudent.name} (${editingStudent.rollNo}) to ${newAttendancePercent}%.`
    );

    setEditSuccessMsg(`Saved attendance for ${editingStudent.name} (${newAttendancePercent}%)`);
    setTimeout(() => {
      setEditSuccessMsg(null);
      setEditingStudent(null);
    }, 1200);
  };

  // Runs when the user does this on screen: send attendance warning.
  const handleSendAttendanceWarning = async (student: UserProfile) => {
    const current = pctOf(student);
    if (current === null) return;   // no recorded classes, nothing to warn about
    setWarningNoticeError(null);
    const r = await sendDirectStudentNotice({
      targetStudentId: student.id,
      targetStudentName: student.name,
      targetStudentRoll: student.rollNo || student.ubterRollNumber || '',
      title: 'Urgent: Attendance Shortage Warning Notice',
      message: `Dear ${student.name}, your overall attendance is currently at ${current}%, which is below the mandatory 75% UBTER examination threshold. Please report immediately to the HOD office to regularize your attendance records.`,
      priority: 'urgent',
      sentByRole: currentUser.role === 'admin' ? 'admin' : 'faculty',
      sentByName: currentUser.name,
    });

    if (!r.ok) { setWarningNoticeError(r.error); return; }   // e.g. a teacher may write only to students of classes they teach
    setWarningNoticeSent(`Sent official attendance warning notice to ${student.name}`);
    setTimeout(() => {
      setWarningNoticeSent(null);
    }, 3500);
  };

  // Build attendance export.
  const buildAttendanceExport = (): ExportTable => ({
    title: 'Attendance Ledger (Yearwise)',
    subtitle: `Year: ${selectedYear}  Branch: ${selectedBranch}   (75%+ Eligible, 60-74% Warning, below 60% Detained)`,
    filename: `Attendance_Year_${selectedYear}_${selectedBranch}_${new Date().toISOString().split('T')[0]}`,
    sheetName: 'Attendance',
    columns: ['Roll No', 'UBTER Roll', 'Student Name', 'Branch', 'Year', 'Semester', 'Attendance %', 'Status', 'Mobile'],
    rows: filteredStudents.map((s) => {
      const att = pctOf(s);
      const status = att === null ? 'No classes recorded' : att >= 75 ? 'Eligible' : att >= 60 ? 'Warning' : 'Detained';
      return [s.rollNo || '', s.ubterRollNumber || '', s.name, s.branch || '', s.year ?? '', s.semester ?? '', att === null ? '' : att, status, s.phone || ''];
    }),
  });

  return (
    <div className="space-y-6">
      {/* 1. LARGE HERO BANNER: Attendance Analysis & Academic Trends */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                Automated Live Analysis Engine
              </span>
              <span className="text-slate-300 text-xs font-semibold">· UBTER AICTE Compliance</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
              <TrendingUp className="w-7 h-7 text-cyan-400" />
              <span>Attendance Analysis & Academic Trends</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Real-time attendance ledger and eligibility matrix for 1st Year, 2nd Year, and 3rd Year polytechnic diploma batches. Automated categorization into Safe Zone (≥75%), Warning Zone (60–74%), and Detained Shortage (&lt;60%).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <ExportMenu build={buildAttendanceExport} />
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span>Print Ledger</span>
            </button>
          </div>
        </div>

        {/* 2. AUTOMATIC YEAR-WISE QUICK SELECTOR BUTTONS (BADE BADE BUTTONS) */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">
            Select Class Year:
          </span>
          {[
            { id: 'all', label: 'All Years Combined' },
            { id: 1, label: '1st Year (Diploma 2026)' },
            { id: 2, label: '2nd Year (Diploma 2025)' },
            { id: 3, label: '3rd Year (Final Year 2024)' },
          ].map((tab) => {
            const isSelected = selectedYear === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedYear(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20 scale-102 ring-2 ring-cyan-300'
                    : 'bg-white/10 text-slate-200 hover:bg-white/20 border border-white/10'
                }`}
              >
                {tab.label}
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Branch:</span>
            {(['all', 'CSE', 'Civil'] as const).map((br) => (
              <button
                key={br}
                onClick={() => setSelectedBranch(br)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedBranch === br
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white/5 text-slate-300 hover:bg-white/15'
                }`}
              >
                {br === 'all' ? 'All' : br}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. FOUR EXECUTIVE KPI ANALYTICS CARDS (BADE BADE CARDS) */}
      <div className={`grid gap-4 ${forceMobileView ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
        {/* Card 1: Total Enrolled */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-blue-100 dark:bg-blue-950/70 rounded-2xl text-blue-600 dark:text-blue-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Enrolled Students
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {stats.total}
            </div>
            <span className="text-[11px] text-slate-500">
              Filtered for {selectedYear === 'all' ? 'All Years' : `Year ${selectedYear}`}
            </span>
          </div>
        </div>

        {/* Card 2: Average Attendance % */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-cyan-100 dark:bg-cyan-950/70 rounded-2xl text-cyan-600 dark:text-cyan-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Average Attendance
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {stats.avgAttendance}%
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold">
              Institutional Baseline: 75%
            </span>
          </div>
        </div>

        {/* Card 3: Safe Zone (>= 75%) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-emerald-100 dark:bg-emerald-950/70 rounded-2xl text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Eligible (Safe Zone ≥75%)
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {stats.safeCount} <span className="text-sm font-semibold text-slate-400">({stats.safePercent}%)</span>
            </div>
            <span className="text-[11px] text-slate-500">Admit Card Cleared</span>
          </div>
        </div>

        {/* Card 4: Detained & Warning Shortage */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-rose-100 dark:bg-rose-950/70 rounded-2xl text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Critical & Detained (&lt;75%)
            </span>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
              {stats.warningCount + stats.detainedCount}{' '}
              <span className="text-xs font-semibold text-slate-400">
                ({stats.detainedCount} Critical &lt;60%)
              </span>
            </div>
            <span className="text-[11px] text-rose-500 font-semibold">Requires Notice Action</span>
          </div>
        </div>
      </div>

      {/* 4. YEAR-WISE COMPARISON TILES (1st vs 2nd vs 3rd Year) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Automatic Batch Attendance Comparison (1st, 2nd & 3rd Year)</span>
          </h3>
          <span className="text-xs text-slate-400">Live Aggregate from Student Records</span>
        </div>

        <div className={`grid gap-4 ${forceMobileView ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
          {yearBreakdowns.map((yb) => (
            <div
              key={yb.year}
              className={`p-4 rounded-xl border transition-all ${
                selectedYear === yb.year
                  ? 'border-cyan-500 bg-cyan-50/40 dark:bg-cyan-950/20 shadow-xs ring-1 ring-cyan-400'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  {yb.year === 1 ? '1st Year' : yb.year === 2 ? '2nd Year' : '3rd Year'}
                </span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  {yb.avg}% Avg
                </span>
              </div>

              <div className="w-full bg-slate-200 dark:bg-slate-600 h-2 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full ${
                    yb.avg >= 75 ? 'bg-emerald-500' : yb.avg >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, yb.avg)}%` }}
                />
              </div>

              <div className="grid grid-cols-3 text-center text-[11px] gap-1 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-400 text-[10px] block">Students</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{yb.total}</span>
                </div>
                <div>
                  <span className="text-emerald-500 text-[10px] block">Safe ≥75%</span>
                  <span className="font-bold text-emerald-600">{yb.safe}</span>
                </div>
                <div>
                  <span className="text-rose-500 text-[10px] block">Risk &lt;75%</span>
                  <span className="font-bold text-rose-600">{yb.warn + yb.detained}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. SEARCH & STATUS FILTER TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, roll number, or UBTER code..."
            className="w-full text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-2.5 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Filter Zone:</span>
          {[
            { id: 'all', label: 'All Students' },
            { id: 'safe', label: 'Eligible (≥75%)' },
            { id: 'warning', label: 'Warning (60-74%)' },
            { id: 'detained', label: 'Critical Detained (<60%)' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === st.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {warningNoticeError && (
        <div className="p-3.5 bg-rose-100 dark:bg-rose-950/60 border border-rose-300 text-rose-800 dark:text-rose-300 rounded-xl text-xs font-bold flex items-center justify-between">
          <span>{warningNoticeError}</span>
          <button onClick={() => setWarningNoticeError(null)} className="text-rose-600">✕</button>
        </div>
      )}

      {/* WARNING NOTIFICATION BANNER IF SENT */}
      {warningNoticeSent && (
        <div className="p-3.5 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>{warningNoticeSent}</span>
          <button onClick={() => setWarningNoticeSent(null)} className="text-emerald-600">
            ✕
          </button>
        </div>
      )}

      {/* 6. SUBJECT-WISE ATTENDANCE ANALYSIS ACCORDION / SUMMARY */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs space-y-3">
        <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-cyan-600" />
          <span>Subject-Wise Attendance Trends & Faculty Engagement</span>
        </h3>

        <div className={`grid gap-3 ${forceMobileView ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
          {subjectBreakdown.slice(0, 6).map((sub) => (
            <div
              key={sub.id}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-mono font-bold text-blue-700 dark:text-blue-300">
                    {sub.code}
                  </span>
                  <span className="font-bold text-slate-500">
                    {sub.branch} · Sem {sub.semester}
                  </span>
                </div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                  {sub.name}
                </h4>
                <div className="text-[11px] text-slate-500 mt-1">
                  Faculty: <span className="font-semibold">{sub.facultyName}</span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-1 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Average:</span>
                  <span
                    className={`font-black ${
                      sub.avgAttendance >= 75
                        ? 'text-emerald-600'
                        : sub.avgAttendance >= 60
                        ? 'text-amber-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {sub.avgAttendance}%
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold">
                  {sub.atRiskCount} students &lt;75%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. STUDENT-WISE REAL-TIME ATTENDANCE LEDGER TABLE */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
              Student Attendance Ledger ({filteredStudents.length} Records)
            </h3>
            <p className="text-xs text-slate-500">
              Click "Edit" to modify attendance marks or "Send Warning" for shortage alert
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500">
            Updated: {new Date().toLocaleDateString()}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Student Profile</th>
                <th className="p-3">Class & Year</th>
                <th className="p-3">Classes Attended / Total</th>
                <th className="p-3">Attendance %</th>
                <th className="p-3">Examination Eligibility</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                    No student records found matching the current filters.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => {
                  const counts = getAttendanceCounts(st.id);
                  const hasData = counts.percent !== null;
                  const att = counts.percent ?? 0;
                  const totalLectures = counts.total;
                  const attendedCount = counts.attended;

                  return (
                    <tr
                      key={st.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">{st.name}</div>
                        <div className="font-mono text-[11px] text-slate-500">
                          Roll: {st.rollNo || st.ubterRollNumber || 'N/A'}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                          {st.branch || 'CSE'} · Year {st.year || 2} (Sem {st.semester || 4})
                        </span>
                      </td>
                      <td className="p-3 font-mono">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {attendedCount}
                        </span>{' '}
                        / {totalLectures}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-black text-sm ${
                              att >= 75
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : att >= 60
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {hasData ? `${att}%` : '—'}
                          </span>
                          <div className="w-16 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                att >= 75
                                  ? 'bg-emerald-500'
                                  : att >= 60
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(100, att)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            !hasData
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              : att >= 75
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : att >= 60
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                              : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {!hasData ? (
                            <>No classes yet</>
                          ) : att >= 75 ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Eligible
                            </>
                          ) : att >= 60 ? (
                            <>
                              <AlertTriangle className="w-3 h-3" /> Warning
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" /> Detained
                            </>
                          )}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Manual "Edit %" was removed: attendance now comes only from recorded classes (any faculty could overwrite it before). */}
                          {false && allowEdit && (
                            <button
                              onClick={() => {
                                setEditingStudent(st);
                                setNewAttendancePercent(st.attendanceOverall ?? 0);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                              title="Edit Attendance %"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                          )}
                          {att < 75 && (
                            <button
                              onClick={() => handleSendAttendanceWarning(st)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                              title="Send Urgent Shortage Warning Notice"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Send Warning</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT ATTENDANCE MODAL */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Update Student Attendance
                </h3>
                <p className="text-xs text-slate-500">
                  {editingStudent.name} (Roll: {editingStudent.rollNo || 'N/A'})
                </p>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAttendance} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Overall Attendance Percentage (%) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={newAttendancePercent}
                  onChange={(e) => setNewAttendancePercent(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-mono text-base font-bold text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1 text-[11px] text-slate-500">
                <div className="flex justify-between">
                  <span>Examination Status:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {newAttendancePercent >= 75
                      ? 'Eligible (Safe)'
                      : newAttendancePercent >= 60
                      ? 'Warning'
                      : 'Detained'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Lectures Attended:</span>
                  <span className="font-mono">
                    {Math.round((newAttendancePercent / 100) * 120)} / 120 lectures
                  </span>
                </div>
              </div>

              {editSuccessMsg && (
                <p className="text-xs text-emerald-600 font-bold">{editSuccessMsg}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold cursor-pointer shadow-sm"
                >
                  Save & Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
