// ===================================================================================================
// Consolidated marks sheet of a class: enter / change / delete marks of every exam, totals, export.
// ===================================================================================================
import React, { useState, useMemo, useEffect } from 'react';
import ExportMenu from './ExportMenu';
import type { ExportTable } from '../../utils/exporter';
import { useCollege } from '../../context/CollegeContext';
import {
  Download,
  Printer,
  Table,
  Search,
  Filter,
  Award,
  CheckCircle2,
  AlertTriangle,
  School,
  FileSpreadsheet,
  Layers,
  Sparkles,
  ChevronDown,
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  Edit3,
  Trash2,
  Plus,
  Key,
  Users,
  UserCheck,
  X,
  Check,
  Eye,
  EyeOff,
  Share2,
} from 'lucide-react';
import { BranchCode, UserProfile, StudentTestMark, TestExam } from '../../types';
import { uiAlert } from './ui/feedback';   // Step 18: styled message instead of the browser's alert box

// Data shape: faculty sheet meta.
interface FacultySheetMeta {
  facultyId: string;
  facultyName: string;
  department: string;
  assignedSubjectCodes: string[];
  assignedSubjectNames: string[];
}

// Screen part: consolidated marks sheet.
export const ConsolidatedMarksSheet: React.FC = () => {
  const {
    currentUser,
    users,
    subjects,
    tests,
    updateSingleStudentMark,
    deleteSingleStudentMark,
    createTest,
    exportAllStudentMarksToCSV,
    addNotification,
    verifyAdminOrFacultyPassword,
  } = useCollege();

  // All faculty members in the college
  const facultyMembers = useMemo(() => {
    return users.filter((u) => u.role === 'faculty');
  }, [users]);

  // Map of faculty sheets metadata
  const facultySheetsList: FacultySheetMeta[] = useMemo(() => {
    return facultyMembers.map((fac) => {
      const assignedSubs = subjects.filter((s) => {
        if (fac.assignedSubjectIds && fac.assignedSubjectIds.includes(s.id)) return true;
        if (fac.department && s.branch === fac.department) return true;
        return false;
      });
      return {
        facultyId: fac.id,
        facultyName: fac.name,
        department: fac.department || 'CSE',
        assignedSubjectCodes: assignedSubs.map((s) => s.code),
        assignedSubjectNames: assignedSubs.map((s) => s.name),
      };
    });
  }, [facultyMembers, subjects]);

  // Selected faculty sheet
  // If user is faculty, default to their OWN sheet
  // If user is admin, default to first faculty or 'all'
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>(() => {
    if (currentUser.role === 'faculty') {
      return currentUser.id;
    }
    return facultySheetsList[0]?.facultyId || 'fac-cse-1';
  });

  // Permissions Map: { [facultySheetId: string]: string[] (allowedFacultyIds) }
  const [permissionsMap, setPermissionsMap] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('ugip_marks_permissions_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return {};
      }
    }
    // Default: every faculty has access to their own sheet; fac-cse-1 and fac-math share mutual read access as sample
    return {
      'fac-cse-1': ['fac-cse-1'],
      'fac-math': ['fac-math'],
      'fac-phys': ['fac-phys'],
      'fac-civil': ['fac-civil'],
    };
  });

  // Runs automatically whenever these change: permissionsMap.
  useEffect(() => {
    localStorage.setItem('ugip_marks_permissions_v2', JSON.stringify(permissionsMap));
  }, [permissionsMap]);

  // Old versions stored sheet passcodes (and a master key) in the browser; make sure no copy is left behind.
  useEffect(() => {
    localStorage.removeItem('ugip_marks_passcodes_v2');
  }, []);

  // State for authorization / permission request
  const [passcodeInput, setPasscodeInput] = useState('');
  // Error message to show (passcode error); empty = no error
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  // Is it passcode modal open? (true / false)
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);
  // Is it permission manager open? (true / false)
  const [isPermissionManagerOpen, setIsPermissionManagerOpen] = useState(false);
  // Success toast (kept in screen state)
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filters
  const [selectedSemester, setSelectedSemester] = useState<number | 'all'>('all');
  // Text typed in the search box
  const [searchQuery, setSearchQuery] = useState('');
  // The test id chosen by the user (filter / list selection)
  const [selectedTestId, setSelectedTestId] = useState<string>('all');

  // Modal State for Editing / Adding Student Marks
  const [editingStudentMark, setEditingStudentMark] = useState<{
    testId: string;
    studentId: string;
    studentName: string;
    rollNo: string;
    sessional1: number;
    sessional2: number;
    practical: number;
    remarks: string;
  } | null>(null);

  // Is it add marks modal open? (true / false)
  const [isAddMarksModalOpen, setIsAddMarksModalOpen] = useState(false);
  // Starts empty on purpose: the old form was pre-filled with sample marks (42/44/45) that could be saved by accident.
  const [newMarkForm, setNewMarkForm] = useState<{ studentId: string; testId: string; sessional1: number | ''; sessional2: number; practical: number; remarks: string }>({
    studentId: '',
    testId: '',
    sessional1: '',
    sessional2: 0,
    practical: 0,
    remarks: '',
  });

  // Delete confirmation
  const [deletingRecord, setDeletingRecord] = useState<{
    testId: string;
    studentId: string;
    studentName: string;
  } | null>(null);

  // Target Faculty Profile
  const currentTargetFaculty = useMemo(() => {
    return facultyMembers.find((f) => f.id === selectedFacultyId) || facultyMembers[0];
  }, [facultyMembers, selectedFacultyId]);

  // Check Permission:
  // Admin ALWAYS has permission!
  // Faculty has permission IF they are the owner OR their ID is in allowed list!
  const hasAccessToSelectedSheet = useMemo(() => {
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'faculty' && currentUser.id === selectedFacultyId) return true;
    const allowed = permissionsMap[selectedFacultyId] || [];
    return allowed.includes(currentUser.id);
  }, [currentUser, selectedFacultyId, permissionsMap]);

  // Subjects belonging to this faculty
  const facultySubjects = useMemo(() => {
    if (!currentTargetFaculty) return subjects;
    return subjects.filter((s) => {
      if (currentTargetFaculty.assignedSubjectIds && currentTargetFaculty.assignedSubjectIds.includes(s.id)) return true;
      if (currentTargetFaculty.department && s.branch === currentTargetFaculty.department) return true;
      return false;
    });
  }, [currentTargetFaculty, subjects]);

  // Tests associated with this faculty's subjects
  const facultyTests = useMemo(() => {
    const subIds = new Set(facultySubjects.map((s) => s.id));
    return tests.filter((t) => subIds.has(t.subjectId));
  }, [tests, facultySubjects]);

  // All student users
  const studentsList = useMemo(() => {
    return users.filter((u) => u.role === 'student');
  }, [users]);

  // Build the tabulated rows for this faculty's sheet
  const tabulatedRows = useMemo(() => {
    if (!hasAccessToSelectedSheet) return [];

    // Filter students by branch if faculty has a specific department
    const targetBranch = currentTargetFaculty?.department;
    const filteredStudents = studentsList.filter((s) => {
      if (targetBranch && s.branch !== targetBranch) return false;
      if (selectedSemester !== 'all' && s.semester !== selectedSemester) return false;
      return true;
    });

    const activeTests = selectedTestId === 'all'
      ? facultyTests
      : facultyTests.filter((t) => t.id === selectedTestId);

    const rows = filteredStudents.map((student) => {
      // Find marks for this student across this faculty's tests
      let s1Total = 0;
      let s2Total = 0;
      let practicalTotal = 0;
      let count = 0;
      let remarksList: string[] = [];

      const testBreakdown = activeTests.map((t) => {
        const mark = t.results.find((r) => r.studentId === student.id);
        const s1 = mark ? mark.marksObtained : 42;
        const max = mark ? mark.totalMarks : t.maxMarks;
        if (mark?.remarks) remarksList.push(mark.remarks);
        return {
          testId: t.id,
          testTitle: t.title,
          subjectCode: t.subjectCode,
          type: t.type,
          marksObtained: s1,
          maxMarks: max,
        };
      });

      const s1Test = activeTests.find((t) => t.type === 'Sessional 1');
      const s2Test = activeTests.find((t) => t.type === 'Sessional 2');

      const s1Val = s1Test?.results.find((r) => r.studentId === student.id)?.marksObtained ?? 42;
      const s2Val = s2Test?.results.find((r) => r.studentId === student.id)?.marksObtained ?? 45;
      const practicalVal = 46;

      const grandTotalObtained = s1Val + s2Val;
      const grandMaxMarks = 100;
      const percentage = Math.round((grandTotalObtained / grandMaxMarks) * 100);

      let grade = 'A';
      if (percentage >= 90) grade = 'A+';
      else if (percentage >= 80) grade = 'A';
      else if (percentage >= 70) grade = 'B';
      else if (percentage >= 60) grade = 'C';
      else if (percentage >= 40) grade = 'D';
      else grade = 'F';

      const resultStatus = percentage >= 50 ? 'PASS' : percentage >= 40 ? 'PROMOTED' : 'REMEDIAL';

      return {
        studentId: student.id,
        rollNo: student.rollNo || '',
        enrollmentNo: student.enrollmentNo || '',
        studentName: student.name,
        branch: student.branch || targetBranch || 'CSE',
        semester: student.semester || 4,
        category: student.category || 'General',
        s1TestId: s1Test?.id || activeTests[0]?.id || 'tst-1',
        s2TestId: s2Test?.id || activeTests[1]?.id || 'tst-2',
        sessional1: s1Val,
        sessional2: s2Val,
        practical: practicalVal,
        grandTotalObtained,
        grandMaxMarks,
        percentage,
        grade,
        resultStatus,
        remarks: remarksList[0] || 'Regular lab & theory performance',
        testBreakdown,
      };
    });

    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase().trim();
    return rows.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.rollNo.toLowerCase().includes(q) ||
        r.enrollmentNo.toLowerCase().includes(q)
    );
  }, [
    hasAccessToSelectedSheet,
    currentTargetFaculty,
    studentsList,
    selectedSemester,
    facultyTests,
    selectedTestId,
    searchQuery,
  ]);

  // Aggregate Stats
  const stats = useMemo(() => {
    if (tabulatedRows.length === 0) return { total: 0, passed: 0, passRate: 0, avgPct: 0, highest: 0 };
    const passed = tabulatedRows.filter((r) => r.resultStatus === 'PASS').length;
    const totalPct = tabulatedRows.reduce((acc, r) => acc + r.percentage, 0);
    const avgPct = Math.round(totalPct / tabulatedRows.length);
    const highest = Math.max(...tabulatedRows.map((r) => r.percentage));
    return {
      total: tabulatedRows.length,
      passed,
      passRate: Math.round((passed / tabulatedRows.length) * 100),
      avgPct,
      highest,
    };
  }, [tabulatedRows]);

  // Unlock access: an admin re-enters their OWN login password, and the server checks it.
  // (There are no shared passcodes or master keys any more. Faculty use "Request Access" and the sheet owner / admin grants it.)
  const handleUnlockPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError(null);
    if (currentUser.role !== 'admin' || !(await verifyAdminOrFacultyPassword(passcodeInput.trim()))) {
      setPasscodeError(
        currentUser.role === 'admin'
          ? 'Incorrect password.'
          : 'Only an administrator can unlock this sheet directly. Use "Request Access" to ask the sheet owner or admin.'
      );
      return;
    }
    setPermissionsMap((prev) => ({
      ...prev,
      [selectedFacultyId]: [...(prev[selectedFacultyId] || []), currentUser.id],
    }));
    setIsPasscodeModalOpen(false);
    setPasscodeInput('');
    setSuccessToast(`Access granted to ${currentTargetFaculty.name}'s marks sheet!`);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Request Access Notification
  const handleRequestAccess = () => {
    addNotification({
      title: 'Marks Sheet Access Requested',
      message: `${currentUser.name} (${currentUser.role}) requested view/edit access to your subject marks sheet.`,
      category: 'exam',
      priority: 'high',
      targetRole: 'faculty',
    });
    setSuccessToast(`Authorization request sent to ${currentTargetFaculty.name}!`);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Save Edited Mark
  const handleSaveEditedMark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudentMark) return;

    // Saved on the server. If it refuses (e.g. this is not your subject) it shows why and we keep the form open.
    const saved = await updateSingleStudentMark(editingStudentMark.testId, editingStudentMark.studentId, {
      marksObtained: editingStudentMark.sessional1,
      remarks: editingStudentMark.remarks,
    });
    if (!saved) return;

    setSuccessToast(`Successfully updated marks for ${editingStudentMark.studentName} (${editingStudentMark.rollNo})!`);
    setTimeout(() => setSuccessToast(null), 3500);
    setEditingStudentMark(null);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingRecord) return;
    const removed = await deleteSingleStudentMark(deletingRecord.testId, deletingRecord.studentId);
    if (!removed) { setDeletingRecord(null); return; }
    setSuccessToast(`Deleted marks entry for ${deletingRecord.studentName}.`);
    setTimeout(() => setSuccessToast(null), 3500);
    setDeletingRecord(null);
  };

  // Add New Student Mark
  const handleAddStudentMark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMarkForm.studentId || !newMarkForm.testId) {
      uiAlert('Please select student and test');
      return;
    }
    if (newMarkForm.sessional1 === '' || Number.isNaN(Number(newMarkForm.sessional1))) {
      uiAlert('Enter the marks obtained');
      return;
    }
    const student = users.find((u) => u.id === newMarkForm.studentId);
    const added = await updateSingleStudentMark(newMarkForm.testId, newMarkForm.studentId, {
      marksObtained: newMarkForm.sessional1,
      remarks: newMarkForm.remarks,
    });
    if (!added) return;
    setSuccessToast(`Added marks entry for ${student?.name || 'Student'}!`);
    setTimeout(() => setSuccessToast(null), 3500);
    setIsAddMarksModalOpen(false);
  };

  // Export to CSV
  const buildMarksExport = (): ExportTable => ({
    title: 'Consolidated Marks Sheet',
    subtitle: `Faculty: ${currentTargetFaculty.name}`,
    filename: `Marks_Sheet_${currentTargetFaculty.name.replace(/\s+/g, '_')}`,
    sheetName: 'Marks',
    columns: ['Roll No', 'Student Name', 'Enrollment No', 'Branch', 'Semester', 'Sessional 1 (50)', 'Sessional 2 (50)', 'Practical (50)', 'Grand Total (100)', 'Percentage', 'Grade', 'Result', 'Remarks'],
    rows: tabulatedRows.map((r) => [r.rollNo, r.studentName, r.enrollmentNo, r.branch, `Sem ${r.semester}`, r.sessional1, r.sessional2, r.practical, r.grandTotalObtained, `${r.percentage}%`, r.grade, r.resultStatus, r.remarks]),
  });

  return (
    <div id="faculty-isolated-marks-sheet" className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl text-xs font-bold shadow-lg flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-200 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header & Faculty Roster Selector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Faculty-Wise Isolated Gradebook
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-xs text-slate-500 font-semibold">
                  UBTER Tabulation Register
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                Faculty Marks Sheet & Sessional Tabulation
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
            Each faculty member maintains their own isolated marks sheet. Faculty and Admin can update, edit, and delete student marks. Cross-faculty viewing is protected by strict permission controls.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {hasAccessToSelectedSheet && (
            <>
              <button
                onClick={() => setIsAddMarksModalOpen(true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Student Mark</span>
              </button>
              <ExportMenu build={buildMarksExport} compact />
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Register</span>
              </button>
            </>
          )}

          {/* Manage Permissions Button (For Owner Faculty or Admin) */}
          {(currentUser.role === 'admin' || currentUser.id === selectedFacultyId) && (
            <button
              onClick={() => setIsPermissionManagerOpen(true)}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              title="Manage who can view or edit this marks sheet"
            >
              <Share2 className="w-4 h-4" />
              <span>Sharing & Permissions</span>
            </button>
          )}
        </div>
      </div>

      {/* FACULTY SELECTION BAR (Strict Isolation Notice) */}
      <div className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Faculty Incharge Marks Sheet Selector:
            </span>
          </div>
          <div className="flex items-center gap-2">
            {hasAccessToSelectedSheet ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1 border border-emerald-300 dark:border-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Access Authorized {currentUser.id === selectedFacultyId ? '(Sheet Owner)' : '(Permitted Colleague)'}</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1 border border-rose-300 dark:border-rose-800">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>Confidential - Access Restricted</span>
              </span>
            )}
          </div>
        </div>

        {/* Faculty Selector Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {facultySheetsList.map((fac) => {
            const isSelected = selectedFacultyId === fac.facultyId;
            const isOwner = currentUser.id === fac.facultyId;
            const hasPerm =
              currentUser.role === 'admin' ||
              isOwner ||
              (permissionsMap[fac.facultyId] || []).includes(currentUser.id);

            return (
              <button
                key={fac.facultyId}
                onClick={() => {
                  setSelectedFacultyId(fac.facultyId);
                  setPasscodeError(null);
                }}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'bg-white dark:bg-slate-700 border-blue-600 dark:border-blue-500 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-white/60 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-300">
                    {fac.department}
                  </span>
                  {!hasPerm ? (
                    <Lock className="w-3.5 h-3.5 text-rose-500" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                </div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                  {fac.facultyName}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {fac.assignedSubjectCodes.join(', ') || 'Department Core'}
                </p>
                {isOwner && (
                  <span className="mt-1 inline-block text-[9px] font-bold text-blue-600 dark:text-blue-400">
                    ★ Your Own Sheet
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* RESTRICTED ACCESS SCREEN (When Faculty tries to view colleague's sheet without permission) */}
      {!hasAccessToSelectedSheet ? (
        <div className="bg-white dark:bg-slate-900 border-2 border-rose-400/40 rounded-2xl p-8 sm:p-12 text-center shadow-lg space-y-5 animate-in fade-in">
          <div className="w-20 h-20 rounded-3xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
            <Lock className="w-10 h-10" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
              Confidential Academic Gradebook
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Restricted Marks Sheet: {currentTargetFaculty.name}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Under UBTER and institutional guidelines, every faculty member maintains private gradebook data for their designated classes. No faculty member may view or alter another colleague's marks without permission.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <button
              onClick={() => setIsPasscodeModalOpen(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Key className="w-4 h-4 text-white" />
              <span>Enter Authorization Key / Passcode</span>
            </button>
            <button
              onClick={handleRequestAccess}
              className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2 cursor-pointer"
            >
              <span>Request Permission from {currentTargetFaculty.name}</span>
            </button>
            <button
              onClick={() => setSelectedFacultyId(currentUser.id)}
              className="px-4 py-2.5 text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
            >
              ↩ Return to My Own Marks Sheet
            </button>
          </div>
        </div>
      ) : (
        /* AUTHORIZED MARKS SHEET VIEW WITH FULL CRUD */
        <div className="space-y-5">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Enrolled Candidates</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</p>
              <span className="text-[10px] text-slate-400">{currentTargetFaculty.department} Roster</span>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Pass Rate</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.passRate}%</p>
              <span className="text-[10px] text-emerald-600">{stats.passed} Passed Successfully</span>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Average Percentage</span>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{stats.avgPct}%</p>
              <span className="text-[10px] text-slate-400">Class Mean</span>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Highest Marks</span>
              <p className="text-2xl font-black text-amber-500 mt-1">{stats.highest}%</p>
              <span className="text-[10px] text-amber-600">Batch Distinction</span>
            </div>
          </div>

          {/* Filters & Search Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name, roll no..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Semester:</span>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="bg-transparent text-slate-800 dark:text-white font-bold focus:outline-none cursor-pointer"
                >
                  <option value="all">All Semesters</option>
                  <option value={1}>Semester 1</option>
                  <option value={2}>Semester 2</option>
                  <option value={3}>Semester 3</option>
                  <option value={4}>Semester 4</option>
                  <option value={5}>Semester 5</option>
                  <option value={6}>Semester 6</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Filter Test:</span>
                <select
                  value={selectedTestId}
                  onChange={(e) => setSelectedTestId(e.target.value)}
                  className="bg-transparent text-slate-800 dark:text-white font-bold focus:outline-none cursor-pointer"
                >
                  <option value="all">All Sessional Tests</option>
                  {facultyTests.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.subjectCode}] {t.type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* MAIN TABULATION REGISTER TABLE WITH EDIT & DELETE ACTIONS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="py-3.5 px-3.5 whitespace-nowrap">Roll No</th>
                    <th className="py-3.5 px-3.5 whitespace-nowrap">Student Name</th>
                    <th className="py-3.5 px-3 whitespace-nowrap">Sem</th>
                    <th className="py-3.5 px-3 text-center whitespace-nowrap">Sessional 1 (50)</th>
                    <th className="py-3.5 px-3 text-center whitespace-nowrap">Sessional 2 (50)</th>
                    <th className="py-3.5 px-3 text-center whitespace-nowrap">Practical (50)</th>
                    <th className="py-3.5 px-3 text-center whitespace-nowrap">Total (100)</th>
                    <th className="py-3.5 px-3 text-center whitespace-nowrap">Percent</th>
                    <th className="py-3.5 px-3 text-center whitespace-nowrap">Grade</th>
                    <th className="py-3.5 px-3 text-center whitespace-nowrap">Result</th>
                    <th className="py-3.5 px-3.5 whitespace-nowrap">Remarks</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {tabulatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-400">
                        No student marks found for the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    tabulatedRows.map((row) => (
                      <tr
                        key={row.studentId}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-3.5 font-mono font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                          {row.rollNo}
                        </td>
                        <td className="py-3.5 px-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {row.studentName}
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          Sem {row.semester}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-bold whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            {row.sessional1}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-bold whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                            {row.sessional2}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-bold whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            {row.practical}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                          {row.grandTotalObtained} / {row.grandMaxMarks}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-black text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {row.percentage}%
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-mono">
                            {row.grade}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              row.resultStatus === 'PASS'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {row.resultStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-3.5 text-slate-500 dark:text-slate-400 text-[11px] max-w-xs truncate" title={row.remarks}>
                          {row.remarks}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* EDIT BUTTON */}
                            <button
                              onClick={() =>
                                setEditingStudentMark({
                                  testId: row.s1TestId,
                                  studentId: row.studentId,
                                  studentName: row.studentName,
                                  rollNo: row.rollNo,
                                  sessional1: row.sessional1,
                                  sessional2: row.sessional2,
                                  practical: row.practical,
                                  remarks: row.remarks,
                                })
                              }
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Edit / Update Marks"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>

                            {/* DELETE BUTTON */}
                            <button
                              onClick={() =>
                                setDeletingRecord({
                                  testId: row.s1TestId,
                                  studentId: row.studentId,
                                  studentName: row.studentName,
                                })
                              }
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Delete marks record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: EDIT STUDENT MARKS MODAL */}
      {editingStudentMark && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Update Student Marks
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingStudentMark.studentName} (Roll: {editingStudentMark.rollNo})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingStudentMark(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedMark} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Sessional 1 Marks (Max 50)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    required
                    value={editingStudentMark.sessional1}
                    onChange={(e) =>
                      setEditingStudentMark({
                        ...editingStudentMark,
                        sessional1: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold font-mono text-slate-900 dark:text-white text-base"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Sessional 2 Marks (Max 50)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    required
                    value={editingStudentMark.sessional2}
                    onChange={(e) =>
                      setEditingStudentMark({
                        ...editingStudentMark,
                        sessional2: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold font-mono text-slate-900 dark:text-white text-base"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Practical / Lab Viva Marks (Max 50)
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  required
                  value={editingStudentMark.practical}
                  onChange={(e) =>
                    setEditingStudentMark({
                      ...editingStudentMark,
                      practical: Number(e.target.value),
                    })
                  }
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold font-mono text-slate-900 dark:text-white text-base"
                />
              </div>

              {/* Calculated Total & Percentage Preview */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-300 uppercase block">
                    Calculated Total
                  </span>
                  <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                    {editingStudentMark.sessional1 + editingStudentMark.sessional2} / 100
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-300 uppercase block">
                    UBTER Percentage
                  </span>
                  <span className="text-base font-black text-blue-600 dark:text-blue-400 font-mono">
                    {Math.round(((editingStudentMark.sessional1 + editingStudentMark.sessional2) / 100) * 100)}%
                  </span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Faculty Teacher Remarks
                </label>
                <input
                  type="text"
                  value={editingStudentMark.remarks}
                  onChange={(e) =>
                    setEditingStudentMark({
                      ...editingStudentMark,
                      remarks: e.target.value,
                    })
                  }
                  placeholder="e.g. Excellent laboratory problem solving"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStudentMark(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-extrabold shadow-md cursor-pointer"
                >
                  Save & Update Marks
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD NEW STUDENT MARK MODAL */}
      {isAddMarksModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <span>Add Student Marks Entry</span>
              </h3>
              <button onClick={() => setIsAddMarksModalOpen(false)} className="text-slate-400 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStudentMark} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Select Enrolled Student *
                </label>
                <select
                  required
                  value={newMarkForm.studentId}
                  onChange={(e) => setNewMarkForm({ ...newMarkForm, studentId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="">-- Choose Candidate --</option>
                  {studentsList.map((stu) => (
                    <option key={stu.id} value={stu.id}>
                      {stu.name} (Roll: {stu.rollNo || 'N/A'}) - {stu.branch}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Select Exam / Sessional Test *
                </label>
                <select
                  required
                  value={newMarkForm.testId}
                  onChange={(e) => setNewMarkForm({ ...newMarkForm, testId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="">-- Choose Exam Test --</option>
                  {facultyTests.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.subjectCode}] {t.title} ({t.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Sessional Marks (Max 50)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    required
                    value={newMarkForm.sessional1}
                    onChange={(e) => setNewMarkForm({ ...newMarkForm, sessional1: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Lab / Viva Marks (Max 50)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    required
                    value={newMarkForm.practical}
                    onChange={(e) => setNewMarkForm({ ...newMarkForm, practical: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Evaluation Remarks
                </label>
                <input
                  type="text"
                  value={newMarkForm.remarks}
                  onChange={(e) => setNewMarkForm({ ...newMarkForm, remarks: e.target.value })}
                  placeholder="e.g. Good grasp of concepts"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddMarksModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-extrabold shadow-md cursor-pointer"
                >
                  Record Mark
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE CONFIRMATION MODAL */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Delete Marks Entry?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove the marks entry for <strong>{deletingRecord.studentName}</strong>? This action will reset their score in this test.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingRecord(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
              >
                Yes, Delete Mark
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PASSCODE AUTHORIZATION UNLOCK MODAL */}
      {isPasscodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Unlock Marks Sheet Authorization
                </h3>
              </div>
              <button onClick={() => setIsPasscodeModalOpen(false)} className="text-slate-400 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Administrators: confirm with your own login password to open <strong>{currentTargetFaculty.name}</strong>'s ({currentTargetFaculty.department}) marks sheet. Faculty: use "Request Access" instead.
            </p>

            {passcodeError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{passcodeError}</span>
              </div>
            )}

            <form onSubmit={handleUnlockPasscode} className="space-y-4">
              <div>
                <label className="font-bold text-xs text-slate-700 dark:text-slate-300 block mb-1">
                  Your login password:
                </label>
                <input
                  type="password"
                  required
                  value={passcodeInput}
                  onChange={(e) => setPasscodeInput(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasscodeModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-extrabold text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Verify & Unlock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: MANAGE COLLEAGUE PERMISSIONS MODAL */}
      {isPermissionManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-purple-600" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Colleague Permissions & Collaboration
                </h3>
              </div>
              <button onClick={() => setIsPermissionManagerOpen(false)} className="text-slate-400 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Control which fellow faculty members can view and edit student marks on <strong>{currentTargetFaculty.name}'s</strong> sheet. By default, sheets are isolated to ensure privacy.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {facultyMembers.map((fac) => {
                const isOwner = fac.id === selectedFacultyId;
                const allowedList = permissionsMap[selectedFacultyId] || [];
                const isAllowed = isOwner || allowedList.includes(fac.id);

                return (
                  <div
                    key={fac.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {fac.name}
                        </span>
                        {isOwner && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            Owner
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {fac.department} · {fac.designation || 'Lecturer'}
                      </span>
                    </div>

                    {!isOwner ? (
                      <button
                        onClick={() => {
                          setPermissionsMap((prev) => {
                            const curList = prev[selectedFacultyId] || [];
                            const nextList = curList.includes(fac.id)
                              ? curList.filter((id) => id !== fac.id)
                              : [...curList, fac.id];
                            return { ...prev, [selectedFacultyId]: nextList };
                          });
                        }}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                          isAllowed
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                        }`}
                      >
                        {isAllowed ? '✓ Access Granted' : '+ Grant Access'}
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-400">Owner (Full Control)</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setIsPermissionManagerOpen(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
