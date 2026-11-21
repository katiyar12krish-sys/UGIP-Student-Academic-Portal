// ===================================================================================================
// Online tests & assignments: create, answer (students), remind, report; Step 18 edit / delete.
// ===================================================================================================
import React, { useState } from 'react';
import ExportMenu from './ExportMenu';
import type { ExportTable } from '../../utils/exporter';
import { useCollege } from '../../context/CollegeContext';
import { OnlineTestAssignment, BranchCode, TestQuestion } from '../../types';
import { deadlineMs, timeLeftLabel, REMINDER_HOURS } from '../../services/reminderEngine';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Send,
  Plus,
  Users,
  Award,
  Bell,
  BookOpen,
  Calendar,
  FileText,
  ShieldCheck,
  Check,
  AlertCircle,
  Laptop,
  Building2,
} from 'lucide-react';
import { Pencil, Trash2 } from 'lucide-react';                     // Step 18
import { editsApi } from '../../services/step18Api';               // Step 18: edit / delete online tests
import { notify, confirmDialog } from './ui/feedback';               // Step 18: styled messages
import { QuestionBuilderTools } from './QuestionBuilderTools';     // upload / auto-create questions
import { TestAnalysisPanel } from './TestAnalysisPanel';           // student-wise / subject-wise analysis

// Data shape: online test assignment manager props.
interface OnlineTestAssignmentManagerProps {
  mode?: 'faculty' | 'admin' | 'student';
  forceMobileView?: boolean;
}

/** Parse lines: Question | option A | option B | option C | option D | correct option number (1-4) | explanation (optional) */
const parseQuestions = (text: string): TestQuestion[] =>
  text.split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((p) => p.length >= 4)
    .map((p) => {
      // the correct-option number is the last field that is only a number; anything after it is the explanation
      let k = p.length - 1;
      while (k > 2 && !/^\d+$/.test(p[k])) k--;
      const correct = parseInt(p[k], 10);
      const options = p.slice(1, k).filter(Boolean);
      const explanation = p.slice(k + 1).join(' | ').trim();
      return { question: p[0], options, correctIndex: correct - 1, ...(explanation ? { explanation } : {}) };
    })
    .filter((q) => q.question && q.options.length >= 2 && q.correctIndex >= 0 && q.correctIndex < q.options.length);

// Screen part: online test assignment manager.
export const OnlineTestAssignmentManager: React.FC<OnlineTestAssignmentManagerProps> = ({ mode = 'faculty', forceMobileView = false }) => {
  const {
    currentUser,
    users,
    subjects,
    onlineTestAssignments,
    createOnlineTestAssignment,
    fetchOnlineTestQuestions,
    submitOnlineTest,
    sendDeadlineAlertToUnsubmittedStudents,
    submitQuizAttempt,
    quizAttempts,
    refreshAcademic,
  } = useCollege();

  // ---- Step 18: edit / delete an online test or assignment ----
  const [editTest, setEditTest] = useState<{ id: string; title: string; description: string; totalMarks: number; deadlineDate: string; deadlineTime: string } | null>(null);
  // Save edit.
  const saveEdit = async () => {
    if (!editTest) return;
    const r = await editsApi.updateOnlineTest(editTest.id, editTest);
    if (!r.ok) return notify.error('Could not save', r.error);
    notify.success('Test updated', editTest.title);
    setEditTest(null); refreshAcademic();
  };
  // Delete online.
  const deleteOnline = async (test: OnlineTestAssignment) => {
    if (!(await confirmDialog({ title: `Delete "${test.title}"?`, message: 'Students will no longer see it. Answers already submitted stay saved in the records.', danger: true }))) return;
    const r = await editsApi.deleteOnlineTest(test.id);
    if (!r.ok) return notify.error('Could not delete', r.error);
    notify.success('Test deleted'); refreshAcademic();
  };

  // The year chosen by the user (filter / list selection)
  const [selectedYear, setSelectedYear] = useState<1 | 2 | 3 | 'all'>('all');
  // The branch chosen by the user (filter / list selection)
  const [selectedBranch, setSelectedBranch] = useState<BranchCode | 'all'>('all');
  // Subject filter: a student can give / look at tests subject-wise
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  // Is the 'create pop-up' shown on screen? (true / false)
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Live Test Runner States
  const [activeTestRun, setActiveTestRun] = useState<OnlineTestAssignment | null>(null);
  // List of test time left seconds shown on this screen
  const [testTimeLeftSeconds, setTestTimeLeftSeconds] = useState<number>(600); // 10 minutes
  // Which q index is open right now
  const [activeQIndex, setActiveQIndex] = useState<number>(0);
  // List of user selected options shown on this screen
  const [userSelectedOptions, setUserSelectedOptions] = useState<Record<number, number>>({});
  // Questions come from the server when the student starts (without the answers). The answers come back only after submitting.
  const [runnerQs, setRunnerQs] = useState<{ question: string; options: string[] }[]>([]);
  // List of review qs shown on this screen
  const [reviewQs, setReviewQs] = useState<{ question: string; options: string[]; correctIndex: number; explanation?: string; yourIndex: number | null }[]>([]);
  // Error message to show (run error); empty = no error
  const [runError, setRunError] = useState<string | null>(null);
  // Busy test id (kept in screen state)
  const [busyTestId, setBusyTestId] = useState<string | null>(null);
  const submittingRef = React.useRef(false);
  // Test result summary (kept in screen state)
  const [testResultSummary, setTestResultSummary] = useState<{
    score: number;
    total: number;
    percentage: number;
    correctCount: number;
    wrongCount: number;
  } | null>(null);

  // Alert trigger toast state
  const [alertSummary, setAlertSummary] = useState<{
    testTitle: string;
    sentCount: number;
    pendingCount: number;
    students: string[];
  } | null>(null);

  // New Test Form State
  const [testForm, setTestForm] = useState({
    title: '',
    subjectId: '',
    deadlineDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    deadlineTime: '17:00',
    totalMarks: 25,
    description: '',
    questionsText: '',
  });
  // Report test (kept in screen state)
  const [reportTest, setReportTest] = useState<OnlineTestAssignment | null>(null);

  const studentsList = users.filter((u) => u.role === 'student');

  // A teacher can only create tests for the subjects assigned to them (the server checks this too); admin can pick any subject.
  const teachableSubjects = subjects.filter((s) => currentUser.role === 'admin' || (currentUser.assignedSubjectIds || []).includes(s.id));
  const chosenSubject = teachableSubjects.find((s) => s.id === testForm.subjectId);

  // Filter tests
  const filteredTests = onlineTestAssignments.filter((t) => {
    const matchYear = selectedYear === 'all' || t.year === selectedYear;
    const matchBranch = selectedBranch === 'all' || t.branch === selectedBranch;
    const matchSubject = selectedSubject === 'all' || (t.subjectName || t.subjectCode) === selectedSubject;
    return matchYear && matchBranch && matchSubject;
  });
  // subjects that have tests in the chosen class (for the subject filter)
  const testSubjects = [...new Set(onlineTestAssignments
    .filter((t) => (selectedYear === 'all' || t.year === selectedYear) && (selectedBranch === 'all' || t.branch === selectedBranch))
    .map((t) => t.subjectName || t.subjectCode))].sort();

  // Runs when the user does this on screen: create test.
  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testForm.title.trim() || !chosenSubject) return;

    const ok = await createOnlineTestAssignment({
      title: testForm.title.trim(),
      subjectId: chosenSubject.id,
      deadlineDate: testForm.deadlineDate,
      deadlineTime: testForm.deadlineTime,
      totalMarks: Number(testForm.totalMarks) || 25,
      description: testForm.description.trim() || 'Online test and assignment evaluation.',
      questions: parseQuestions(testForm.questionsText),
    });
    if (!ok) return;   // the reason is shown in the notification bell; the form stays open so nothing is lost

    setShowCreateModal(false);
    setTestForm({
      title: '',
      subjectId: '',
      deadlineDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      deadlineTime: '17:00',
      totalMarks: 25,
      description: '',
      questionsText: '',
    });
  };

  // Runs when the user does this on screen: dispatch urgent alert.
  const handleDispatchUrgentAlert = async (test: OnlineTestAssignment) => {
    setBusyTestId(test.id);
    const result = await sendDeadlineAlertToUnsubmittedStudents(test.id);
    setBusyTestId(null);
    if (!result) return;
    setAlertSummary({
      testTitle: test.title,
      sentCount: result.sentCount,
      pendingCount: result.pending,
      students: result.targetStudents,
    });
    setTimeout(() => {
      setAlertSummary(null);
    }, 6000);
  };

  // The questions being answered (no answer key until the server has graded the submission)
  const TEST_RUNNER_QUESTIONS = runnerQs.map((q, i) => ({ id: i + 1, category: activeTestRun?.subjectName || '', question: q.question, options: q.options }));

  // Always call the latest finish handler (the timer would otherwise grade stale, empty answers)
  const finishRef = React.useRef<() => void>(() => {});

  // Runs automatically whenever these change: activeTestRun, testResultSummary.
  React.useEffect(() => {
    if (!activeTestRun || testResultSummary) return;
    const interval = setInterval(() => {
      setTestTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          finishRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTestRun, testResultSummary]);

  // Runs when the user does this on screen: start test.
  const handleStartTest = async (test: OnlineTestAssignment) => {
    setRunError(null);
    if (!test.questionCount) {   // a plain assignment has nothing to answer here: the student confirms the submission
      if (!window.confirm(`Mark "${test.title}" as submitted?`)) return;
      setBusyTestId(test.id);
      const r = await submitOnlineTest(test.id, []);
      setBusyTestId(null);
      if (!r.ok) setRunError(r.error);
      return;
    }
    setBusyTestId(test.id);
    const r = await fetchOnlineTestQuestions(test.id);
    setBusyTestId(null);
    if (!r.ok) { setRunError(r.error); return; }
    setRunnerQs(r.data.questions);
    setReviewQs([]);
    setActiveTestRun(test);
    setTestTimeLeftSeconds(600);
    setActiveQIndex(0);
    setUserSelectedOptions({});
    setTestResultSummary(null);
  };

  // Runs when the user does this on screen: finish test.
  const handleFinishTest = async () => {
    if (!activeTestRun || submittingRef.current) return;
    submittingRef.current = true;
    const answers = runnerQs.map((_, i) => userSelectedOptions[i] ?? null);
    const r = await submitOnlineTest(activeTestRun.id, answers);   // the server grades it
    submittingRef.current = false;
    if (!r.ok) { setRunError(r.error); return; }
    const { result, review } = r.data;
    setRunError(null);
    setReviewQs(review);
    setTestResultSummary({
      score: result.score,
      total: result.total,
      percentage: result.percentage,
      correctCount: result.correct,
      wrongCount: result.wrong,
    });

    submitQuizAttempt({
      quizId: activeTestRun.id,
      quizTitle: activeTestRun.title,
      studentId: currentUser.id,
      studentName: currentUser.name,
      rollNo: currentUser.rollNo || currentUser.ubterRollNumber || '24090050007',
      branch: (currentUser.branch as any) || 'CSE',
      score: result.score,
      totalMarks: result.total,
      percentage: result.percentage,
      passed: result.percentage >= 40,
    });
  };

  finishRef.current = handleFinishTest;

  // Report rows.
  const reportRows = (t: OnlineTestAssignment) =>
    studentsList.filter((u) => u.branch === t.branch && u.year === t.year).map((st) => ({
      st,
      res: Array.isArray(t.results) ? (t.results as any[]).find((r: any) => r.studentId === st.id) : (t.results as any)?.[st.id],
      submitted: (t.submittedStudentIds || []).includes(st.id) || (Array.isArray(t.results) ? (t.results as any[]).some((r: any) => r.studentId === st.id) : !!(t.results as any)?.[st.id]),
    }));

  // Build report export.
  const buildReportExport = (t: OnlineTestAssignment): ExportTable => ({
    title: `Online Test Report: ${t.title}`,
    subtitle: `${t.subjectCode}  ${t.branch}  Year ${t.year}`,
    filename: `Test_Report_${t.subjectCode}_${t.title.slice(0, 20)}`,
    sheetName: 'Test report',
    columns: ['Roll No', 'Name', 'Status', 'Score', 'Total', 'Percentage', 'Grade'],
    rows: reportRows(t).map(({ st, res, submitted }) => [st.rollNo || '', st.name, submitted ? 'Submitted' : 'Not submitted', res?.score ?? '', res?.total ?? t.totalMarks, res ? res.percentage : '', res?.grade ?? '']),
  });

  // Download report csv.
  const downloadReportCsv = (t: OnlineTestAssignment) => {
    // Q.
    const q = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [['Roll No', 'Name', 'Status', 'Score', 'Total', 'Percentage', 'Grade'].map(q).join(',')];
    reportRows(t).forEach(({ st, res, submitted }) => lines.push([st.rollNo, st.name, submitted ? 'Submitted' : 'Not submitted', res?.score ?? '', res?.total ?? t.totalMarks, res ? res.percentage + '%' : '', res?.grade ?? ''].map(q).join(',')));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv' }));
    a.download = `report-${t.subjectCode}-${t.title.slice(0, 20).replace(/\W+/g, '_')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* HEADER & FILTERS */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-5">
        <div className="flex flex-col gap-3.5 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="w-full">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                HOD & Faculty Exam Portal
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
                Targeted Alert Engine
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
              Online Tests, Assignments & Timed Submission Tracker
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Conduct online tests and assignments. Dispatch automated deadline alerts <span className="font-bold text-amber-600 dark:text-amber-400">ONLY to students who haven't submitted yet</span>.
            </p>
          </div>

          {(mode === 'faculty' || mode === 'admin') && (
            <div className="pt-0.5">
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full sm:w-auto justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Online Test / Task</span>
              </button>
            </div>
          )}
        </div>

        {/* YEAR SELECTION CARDS */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 mr-2">Filter Class:</span>
          {[
            { id: 'all', label: 'All Classes' },
            { id: 1, label: '1st Year (Sem 1 & 2)' },
            { id: 2, label: '2nd Year (Sem 3 & 4)' },
            { id: 3, label: '3rd Year (Sem 5 & 6)' },
          ].map((yr) => (
            <button
              key={yr.id}
              onClick={() => setSelectedYear(yr.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedYear === yr.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {yr.label}
            </button>
          ))}

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

          {[
            { id: 'all', label: 'All Branches' },
            { id: 'CSE', label: 'CSE' },
            { id: 'Civil', label: 'Civil' },
          ].map((br) => (
            <button
              key={br.id}
              onClick={() => setSelectedBranch(br.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedBranch === br.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {br.label}
            </button>
          ))}

          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
          <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} aria-label="Subject"
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 cursor-pointer">
            <option value="all">All subjects</option>
            {testSubjects.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
      </div>

      {/* ANALYSIS: student = own subject-wise analysis; staff = student-wise table */}
      <TestAnalysisPanel mode={mode} tests={filteredTests} students={studentsList as any} me={currentUser} />

      {/* ALERT TRIGGER CONFIRMATION BANNER */}
      {alertSummary && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-2xl shadow-md animate-in fade-in flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <div className="font-bold text-amber-900 dark:text-amber-200 text-sm">
              Targeted Deadline Alerts Dispatched!
            </div>
            <p className="text-amber-800 dark:text-amber-300">
              Sent urgent notifications strictly to <span className="font-bold underline">{alertSummary.sentCount} of {alertSummary.pendingCount} students</span> who have NOT submitted for <span className="font-bold">"{alertSummary.testTitle}"</span>.
            </p>
            <p className="text-slate-600 dark:text-slate-400 text-[11px]">
              Not submitted: {alertSummary.students.length > 0 ? alertSummary.students.join(', ') : 'None pending'}. Students who already submitted received no disturbance.
              {alertSummary.sentCount < alertSummary.pendingCount && ' Some students have not allowed notifications (or this reminder was already sent in the last hour), so they were not notified.'}
            </p>
          </div>
        </div>
      )}

      {runError && !activeTestRun && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3">
          <span>{runError}</span>
          <button onClick={() => setRunError(null)} className="font-bold cursor-pointer">✕</button>
        </div>
      )}

      {/* LIST OF ONLINE TESTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredTests.length === 0 ? (
          <div className="col-span-full p-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center text-slate-500">
            No online tests found for the selected class criteria.
          </div>
        ) : (
          filteredTests.map((test) => {
            const classStudents = studentsList.filter(
              (s) => s.branch === test.branch && s.year === test.year
            );
            const totalClassStrength = classStudents.length;
            const submittedCount = test.submittedCount ?? ((test.submittedStudentIds || []).length || (Array.isArray(test.results) ? test.results.length : Object.keys(test.results || {}).length));
            const unsubmittedCount = Math.max(0, totalClassStrength - submittedCount);
            const isUserSubmitted = currentUser.role === 'student' && ((test.submittedStudentIds || []).includes(currentUser.id) || (Array.isArray(test.results) ? (test.results as any[]).some((r: any) => r.studentId === currentUser.id) : !!(test.results as any)?.[currentUser.id]));

            return (
              <div
                key={test.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs space-y-4 hover:border-blue-400 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                        {test.branch} · Year {test.year} (Sem {test.semester})
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                        {test.subjectCode}
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {test.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {test.subjectName} · Assigned by {test.assignedByFacultyName}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-black border border-emerald-200 dark:border-emerald-800">
                      {test.totalMarks} Marks
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                  {test.description}
                </p>

                {/* DEADLINE & SUBMISSION PROGRESS */}
                <div className={`grid ${forceMobileView ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-2.5 text-xs`}>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-500" /> Deadline Expiry
                    </span>
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {test.deadlineDate} at {test.deadlineTime}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1">
                      <Users className="w-3 h-3 text-blue-500" /> Class Submissions
                    </span>
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex flex-wrap items-center justify-between gap-1">
                      <span>{submittedCount} / {totalClassStrength} Submitted</span>
                      <span className={`text-[10px] font-bold ${unsubmittedCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        ({unsubmittedCount} Pending)
                      </span>
                    </div>
                  </div>
                </div>

                {/* PROGRESS BAR */}
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{
                      width: `${totalClassStrength > 0 ? (submittedCount / totalClassStrength) * 100 : 0}%`,
                    }}
                  />
                </div>

                {/* REMINDER STATUS */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold">
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3].map((n) => (
                      <span key={n} title={`Reminder ${n}: ${REMINDER_HOURS[n - 1]}h before deadline`}
                        className={`px-2 py-0.5 rounded-full border ${test.remindersSentCount >= n ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800' : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                        R{n} {test.remindersSentCount >= n ? '✓ sent' : `· ${REMINDER_HOURS[n - 1]}h`}
                      </span>
                    ))}
                  </div>
                  <span className={deadlineMs(test) < Date.now() ? 'text-rose-600' : 'text-slate-500'}>
                    {test.status === 'expired' ? `Deadline passed · ${unsubmittedCount} not submitted` : test.status === 'completed' ? 'Closed · all submitted' : timeLeftLabel(deadlineMs(test) - Date.now())}
                  </span>
                </div>

                {/* ACTION BUTTONS */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
                  {/* Faculty Action: Trigger unsubmitted reminder */}
                  {(mode === 'faculty' || mode === 'admin') && (
                    <div className="flex flex-wrap items-center gap-2 w-full">
                      <button
                        onClick={() => handleDispatchUrgentAlert(test)}
                        disabled={unsubmittedCount === 0 || busyTestId === test.id}
                        className={`flex-1 sm:flex-initial min-w-[200px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                          unsubmittedCount > 0
                            ? 'bg-amber-600 hover:bg-amber-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                        }`}
                        title="Dispatch automated push notifications strictly to students who have not submitted"
                      >
                        <Bell className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {unsubmittedCount > 0
                            ? `Alert ${unsubmittedCount} Unsubmitted Students`
                            : 'All Students Submitted!'}
                        </span>
                      </button>
                      <button
                        onClick={() => setReportTest(test)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-xs"
                      >
                        Performance Report
                      </button>
                      {/* Step 18: edit + delete */}
                      <button onClick={() => setEditTest({ id: test.id, title: test.title, description: test.description || '', totalMarks: test.totalMarks, deadlineDate: test.deadlineDate, deadlineTime: test.deadlineTime })}
                        aria-label="Edit test" title="Edit" className="p-2 rounded-xl text-slate-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => deleteOnline(test)} aria-label="Delete test" title="Delete"
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-slate-800 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}

                  {/* Student View / Submit Simulation */}
                  {mode === 'student' && (
                    <div className="w-full">
                      {isUserSubmitted ? (
                        <div className="flex items-center gap-2 w-full">
                          <div className="flex-1 p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>{test.results?.[currentUser.id] ? 'Submitted & Evaluated' : 'Submitted'}{test.results?.[currentUser.id] ? ` · ${test.results[currentUser.id].score}/${test.results[currentUser.id].total} (${test.results[currentUser.id].grade})` : ''}</span>
                          </div>
                          {!!test.questionCount && (
                            <button
                              onClick={() => handleStartTest(test)}
                              disabled={busyTestId === test.id}
                              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-60"
                            >
                              Retake
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartTest(test)}
                          disabled={busyTestId === test.id}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
                        >
                          <Award className="w-4 h-4 text-cyan-200" />
                          <span>{test.questionCount ? `Start Live Timed Online Test (${test.questionCount} MCQs · 10 Mins)` : 'Mark Assignment as Submitted'}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE NEW TEST MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Create New Online Test / Assignment
                </h3>
                <p className="text-xs text-slate-500">
                  Targeted by Branch & Academic Year with automated submission alerts
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTest} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Test / Assignment Title *
                </label>
                <input
                  type="text"
                  required
                  value={testForm.title}
                  onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
                  placeholder="e.g. Unit Test 2: Data Structures Pointers & Trees"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subject * <span className="font-normal text-slate-400">(the class is taken from the subject)</span>
                </label>
                <select
                  required
                  value={testForm.subjectId}
                  onChange={(e) => setTestForm({ ...testForm, subjectId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value="">{teachableSubjects.length ? 'Choose a subject…' : 'No subject is assigned to you'}</option>
                  {teachableSubjects.map((sj) => (
                    <option key={sj.id} value={sj.id}>{sj.code} · {sj.name} ({sj.branch} Sem {sj.semester})</option>
                  ))}
                </select>
                {chosenSubject && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Goes to: <span className="font-bold">{chosenSubject.branch} · Year {chosenSubject.year} · Sem {chosenSubject.semester}</span> students.
                  </p>
                )}
                {currentUser.role !== 'admin' && (
                  <p className="mt-1 text-[11px] text-slate-400">Only the subjects assigned to you are listed. Ask the admin if one is missing.</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Deadline Date
                  </label>
                  <input
                    type="date"
                    required
                    value={testForm.deadlineDate}
                    onChange={(e) => setTestForm({ ...testForm, deadlineDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Deadline Time
                  </label>
                  <input
                    type="time"
                    required
                    value={testForm.deadlineTime}
                    onChange={(e) => setTestForm({ ...testForm, deadlineTime: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    required
                    value={testForm.totalMarks}
                    onChange={(e) => setTestForm({ ...testForm, totalMarks: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Test Description / Instructions
                </label>
                <textarea
                  rows={3}
                  value={testForm.description}
                  onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
                  placeholder="Enter test questions, format, or syllabus units covered..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <QuestionBuilderTools
                  subjectName={chosenSubject?.name || ''}
                  onAdd={(lines) => setTestForm((f) => ({ ...f, questionsText: [f.questionsText.trim(), ...lines].filter(Boolean).join('\n') }))}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  MCQ Questions for Auto-Grading (optional) — {parseQuestions(testForm.questionsText).length} valid
                </label>
                <textarea
                  rows={8}
                  value={testForm.questionsText}
                  onChange={(e) => setTestForm({ ...testForm, questionsText: e.target.value })}
                  placeholder={'One per line:\nQuestion | Option A | Option B | Option C | Option D | correct option number (1-4) | explanation (optional)\nWhich is a LIFO structure? | Queue | Stack | Tree | Graph | 2 | Last in, first out'}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!chosenSubject}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create & Announce
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* LIVE INTERACTIVE TEST RUNNER MODAL */}
      {activeTestRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5 sm:p-7 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                    {activeTestRun.subjectCode} · {activeTestRun.branch}
                  </span>
                  <span className="text-xs text-slate-400">Total Marks: {activeTestRun.totalMarks}</span>
                </div>
                <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white mt-1">
                  {activeTestRun.title}
                </h3>
              </div>

              {!testResultSummary && (
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold border ${
                    testTimeLeftSeconds < 120
                      ? 'bg-rose-50 text-rose-600 border-rose-300 animate-pulse'
                      : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {Math.floor(testTimeLeftSeconds / 60)}:
                      {(testTimeLeftSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm('Quit this test attempt? Unsaved answers will be lost.')) {
                        setActiveTestRun(null);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {runError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">
                {runError}
              </div>
            )}

            {/* Test Content: Question or Scorecard */}
            {!testResultSummary ? (
              <div className="space-y-4">
                {/* Question Header & Nav */}
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                    {TEST_RUNNER_QUESTIONS[activeQIndex].category}
                  </span>
                  <span className="font-mono text-slate-400">
                    Question {activeQIndex + 1} of {TEST_RUNNER_QUESTIONS.length}
                  </span>
                </div>

                {/* Question Text */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                    Q{activeQIndex + 1}. {TEST_RUNNER_QUESTIONS[activeQIndex].question}
                  </h4>
                </div>

                {/* Multiple Choice Options */}
                <div className="space-y-2.5">
                  {TEST_RUNNER_QUESTIONS[activeQIndex].options.map((opt, optIdx) => {
                    const isSelected = userSelectedOptions[activeQIndex] === optIdx;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => {
                          setUserSelectedOptions({
                            ...userSelectedOptions,
                            [activeQIndex]: optIdx,
                          });
                        }}
                        className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-900 dark:text-blue-100 ring-2 ring-blue-400/40 shadow-xs'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt}</span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Question Numbers Strip */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1.5">
                    {TEST_RUNNER_QUESTIONS.map((_, idx) => {
                      const isAnswered = userSelectedOptions[idx] !== undefined;
                      const isCurrent = activeQIndex === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveQIndex(idx)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                            isCurrent
                              ? 'bg-blue-600 text-white shadow-xs'
                              : isAnswered
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2">
                    {activeQIndex > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveQIndex(activeQIndex - 1)}
                        className="px-3 py-1.5 rounded-xl border text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        Previous
                      </button>
                    )}
                    {activeQIndex < TEST_RUNNER_QUESTIONS.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => setActiveQIndex(activeQIndex + 1)}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Next ➔
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleFinishTest}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Finish & Submit Test</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* SCORECARD & COMPREHENSIVE QUESTION REVIEW */
              <div className="space-y-5 animate-in fade-in">
                {/* Big Result Card */}
                <div className="p-6 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-3xl shadow-lg text-center space-y-2">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20">
                    Online Test Completed & Submitted
                  </span>
                  <div className="text-4xl sm:text-5xl font-black mt-2">
                    {testResultSummary.score} / {testResultSummary.total}
                  </div>
                  <p className="text-sm font-bold text-emerald-100">
                    Score: {testResultSummary.percentage}% Accuracy · Saved to Institutional Records
                  </p>
                  <div className="flex items-center justify-center gap-4 pt-3 text-xs font-semibold">
                    <span className="bg-white/15 px-3 py-1 rounded-lg">
                      {testResultSummary.correctCount} Correct
                    </span>
                    <span className="bg-white/15 px-3 py-1 rounded-lg">
                      {testResultSummary.wrongCount} Incorrect
                    </span>
                  </div>
                </div>

                {/* Question by Question Review */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                    Question-By-Question Detailed Solutions:
                  </h4>

                  {reviewQs.map((q, qIdx) => {
                    const userOpt = q.yourIndex ?? undefined;
                    const isCorrect = userOpt === q.correctIndex;
                    return (
                      <div
                        key={qIdx}
                        className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                          isCorrect
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300'
                            : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-slate-900 dark:text-white">
                            Q{qIdx + 1}. {q.question}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                          }`}>
                            {isCorrect ? 'Correct (+5)' : 'Incorrect'}
                          </span>
                        </div>
                        <div className="text-[11px] pt-1">
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            Correct Answer: {q.options[q.correctIndex]}
                          </span>
                          {userOpt !== undefined && userOpt !== q.correctIndex && (
                            <span className="text-rose-600 ml-2">
                              (Your answer: {q.options[userOpt]})
                            </span>
                          )}
                        </div>
                        {q.explanation && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-white/70 dark:bg-slate-800 p-2 rounded-lg">
                            {q.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Close Button */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setActiveTestRun(null)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm"
                  >
                    Close & Return to Tests
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AUTO-GENERATED PERFORMANCE REPORT */}
      {reportTest && (() => {
        const rows = reportRows(reportTest);
        const scored = rows.filter((r) => r.res).map((r) => r.res!);
        const avg = scored.length ? Math.round(scored.reduce((a, r) => a + r.percentage, 0) / scored.length) : 0;
        const pass = scored.filter((r) => r.percentage >= 40).length;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70">
            <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">{reportTest.title}</h3>
                  <p className="text-xs text-slate-500">{reportTest.subjectName} · {reportTest.branch} Year {reportTest.year} · auto-graded</p>
                </div>
                <button onClick={() => setReportTest(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-bold">
                {[['Submitted', `${rows.filter((r) => r.submitted).length}/${rows.length}`], ['Average', `${avg}%`], ['Highest', `${scored.length ? Math.max(...scored.map((r) => r.percentage)) : 0}%`], ['Pass rate', `${scored.length ? Math.round((pass / scored.length) * 100) : 0}%`]].map(([k, v]) => (
                  <div key={k} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800"><div className="text-slate-400 uppercase text-[10px]">{k}</div><div className="text-lg text-slate-900 dark:text-white">{v}</div></div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead><tr className="text-slate-500 border-b border-slate-200 dark:border-slate-700"><th className="py-2">Roll No</th><th>Name</th><th>Status</th><th>Score</th><th>%</th><th>Grade</th></tr></thead>
                  <tbody>
                    {rows.map(({ st, res, submitted }) => (
                      <tr key={st.id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2 font-mono">{st.rollNo}</td><td className="font-bold">{st.name}</td>
                        <td className={submitted ? 'text-emerald-600' : 'text-rose-600'}>{submitted ? 'Submitted' : 'Not submitted'}</td>
                        <td>{res ? `${res.score}/${res.total}` : '-'}</td><td>{res ? `${res.percentage}%` : '-'}</td><td className="font-bold">{res?.grade ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2">
                <ExportMenu build={() => buildReportExport(reportTest)} />
              </div>
            </div>
          </div>
        );
      })()}
      {/* Step 18: edit dialog */}
      {editTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditTest(null); }}>
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-3 text-sm">
            <h3 className="font-bold text-slate-900 dark:text-white">Edit online test / assignment</h3>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Title</span>
              <input className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" value={editTest.title} onChange={(e) => setEditTest({ ...editTest, title: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Description</span>
              <textarea rows={3} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" value={editTest.description} onChange={(e) => setEditTest({ ...editTest, description: e.target.value })} /></label>
            <div className="grid grid-cols-3 gap-3">
              <label><span className="text-xs font-semibold text-slate-600">Total marks</span>
                <input type="number" min={1} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" value={editTest.totalMarks} onChange={(e) => setEditTest({ ...editTest, totalMarks: Number(e.target.value) })} /></label>
              <label><span className="text-xs font-semibold text-slate-600">Deadline date</span>
                <input type="date" className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" value={editTest.deadlineDate} onChange={(e) => setEditTest({ ...editTest, deadlineDate: e.target.value })} /></label>
              <label><span className="text-xs font-semibold text-slate-600">Time</span>
                <input type="time" className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" value={editTest.deadlineTime} onChange={(e) => setEditTest({ ...editTest, deadlineTime: e.target.value })} /></label>
            </div>
            <p className="text-xs text-slate-500">Questions can be changed only while nobody has submitted. To change them later, make a new test.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditTest(null)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 font-semibold cursor-pointer">Cancel</button>
              <button onClick={saveEdit} className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer">Save changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
