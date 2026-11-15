// ===================================================================================================
// Exam datesheet: list exams of a class; staff add, Step 18 edit and delete (with confirmation).
// ===================================================================================================
import React, { useState, useMemo } from 'react';
import { useCollege } from '../../context/CollegeContext';
import { useSeesSample } from '../../hooks/useSeesSample';
import { BranchCode, TestExam } from '../../types';
import {
  Calendar,
  Clock,
  MapPin,
  Search,
  Filter,
  Printer,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  X,
  AlertTriangle,
  Info,
  Plus,
  Trash2,
  Pencil,
} from 'lucide-react';
import { EditTestModal } from '../common/EditTestModal';
import { ExamCalendar } from '../common/ExamCalendar';   // dates: exam forms, tests, practicals, final papers   // Step 18: edit an existing exam
import { confirmDialog } from '../common/ui/feedback';                 // Step 18: styled 'are you sure?' dialog

// Data shape: exam schedule props.
interface ExamScheduleProps {
  onOpenAISolver?: (subjectName: string, subjectCode: string) => void;
  allowManage?: boolean;
}

// Screen part: exam schedule.
export const ExamSchedule: React.FC<ExamScheduleProps> = ({ onOpenAISolver, allowManage = false }) => {
  const { tests, createTest, deleteTest, subjects, currentUser, t, getStudentAttendanceStats, refreshAcademic } = useCollege();
  const showSample = useSeesSample();   // SAMPLE badges only for admin / CSE HOD
  // The exam being edited right now (null = nothing open)
  const [editingExam, setEditingExam] = useState<TestExam | null>(null);   // Step 18: exam open in the edit dialog
  /** Step 18: ask before deleting (marks stay saved on the server, the exam is only hidden). */
  const askDelete = async (exam: TestExam) => {
    if (await confirmDialog({ title: `Delete "${exam.title}"?`, message: `${exam.subjectCode} · ${exam.branch} semester ${exam.semester}. Marks already entered stay saved in the records.`, danger: true })) deleteTest(exam.id);
  };
  // Text typed in the search box
  const [searchQuery, setSearchQuery] = useState('');
  // The branch chosen by the user (filter / list selection)
  const [selectedBranch, setSelectedBranch] = useState<BranchCode | 'all'>(currentUser.branch || 'CSE');
  // The semester chosen by the user (filter / list selection)
  const [selectedSemester, setSelectedSemester] = useState<number | 'all'>(
    currentUser.semester || 5
  );
  // Is the 'add pop-up' shown on screen? (true / false)
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states for creating exam schedule entry
  const [title, setTitle] = useState('');
  // The subject id chosen by the user (filter / list selection)
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  // Exam type (kept in screen state)
  const [examType, setExamType] = useState<TestExam['type']>('Board Exam');
  // Date (kept in screen state)
  const [date, setDate] = useState('2026-11-20');
  // Time slot (kept in screen state)
  const [timeSlot, setTimeSlot] = useState('10:00 AM - 01:00 PM');
  // Room number (kept in screen state)
  const [roomNumber, setRoomNumber] = useState('Examination Hall A');
  // List of max marks shown on this screen
  const [maxMarks, setMaxMarks] = useState<number>(50);
  // Exam branch (kept in screen state)
  const [examBranch, setExamBranch] = useState<BranchCode>(currentUser.branch || 'CSE');
  // Exam semester (kept in screen state)
  const [examSemester, setExamSemester] = useState<1 | 2 | 3 | 4 | 5 | 6>(5);

  const canManage = allowManage || currentUser.role === 'admin' || currentUser.role === 'faculty';

  const attStats = currentUser.role === 'student' ? getStudentAttendanceStats(currentUser.id) : { overallPercent: 88 };
  const isEligible = attStats.overallPercent >= 75;

  const branchSubjects = subjects.filter((s) => s.branch === (canManage ? examBranch : selectedBranch));

  const sortedExams = useMemo(() => {
    return tests
      .filter((t) => {
        const matchesBranch = currentUser.role === 'student'
          ? (!t.branch || !currentUser.branch || t.branch === currentUser.branch)
          : (!selectedBranch || selectedBranch === 'all' || t.branch === selectedBranch);
        const matchesSemester = selectedSemester === 'all' ? true : t.semester === selectedSemester;
        const q = searchQuery.toLowerCase().trim();
        const matchesQ =
          !q ||
          t.subjectCode.toLowerCase().includes(q) ||
          t.subjectName.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q);
        return matchesBranch && matchesSemester && matchesQ;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [tests, currentUser.role, currentUser.branch, selectedBranch, selectedSemester, searchQuery]);

  // Runs when the user does this on screen: create exam schedule.
  const handleCreateExamSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const sub = subjects.find((s) => s.id === selectedSubjectId) || branchSubjects[0] || subjects[0];
    if (!sub || !title.trim()) return;

    const created = await createTest({
      title: title.trim(),
      type: examType,
      subjectId: sub.id,
      subjectName: sub.name,
      subjectCode: sub.code,
      maxMarks: Number(maxMarks) || 50,
      date,
      timeSlot,
      roomNumber,
      branch: examBranch,
      semester: examSemester,
      results: [],
    });

    if (!created) return;   // the server refused (e.g. you do not teach this subject); keep the form so nothing is lost
    setTitle('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      <ExamCalendar />
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
                UBTER Datesheet & Schedule Master
              </span>
              <h3 className="text-lg font-bold text-white">Examination & Sessional Datesheet</h3>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-2">
            Uttarakhand Government Institute of Polytechnic · {currentUser.name} ({currentUser.role.toUpperCase()})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {currentUser.role === 'student' && (
            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold ${isEligible ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
              Attendance: {attStats.overallPercent}% ({isEligible ? 'Admit Card Eligible' : 'Risk'})
            </div>
          )}
          <button
            onClick={() => window.print()}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Datesheet</span>
          </button>
          {canManage && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create / Add Exam Schedule</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search datesheet by subject or paper..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          {currentUser.role !== 'student' && (
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value as BranchCode)}
              className="p-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-bold"
            >
              <option value="CSE">CSE</option>
              <option value="Civil">Civil</option>
            </select>
          )}
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="p-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-bold"
          >
            <option value="all">All Semesters</option>
            {[1, 2, 3, 4, 5, 6].map((sem) => (
              <option key={sem} value={sem}>Semester {sem}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedExams.map((exam) => (
          <div
            key={exam.id}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3 hover:border-blue-400 transition-colors"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white">
                  {exam.subjectCode}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {exam.type}
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">{exam.title}</h4>
              <p className="text-xs text-slate-500">{exam.subjectName} · {exam.branch} Sem {exam.semester}{exam.academicYear ? ` · ${exam.academicYear}` : ''}</p>
              {exam.isDemo && showSample && <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">SAMPLE</span>}

              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700/60 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                <p className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-blue-500" /> {exam.date}</p>
                <p className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-amber-500" /> {exam.timeSlot || '10:00 AM - 12:00 PM'}</p>
                <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-emerald-500" /> {exam.roomNumber || 'Room 204'}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Max: {exam.maxMarks} Marks</span>
              <div className="flex items-center gap-1.5">
                {onOpenAISolver && (
                  <button
                    onClick={() => onOpenAISolver(exam.subjectName, exam.subjectCode)}
                    className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    <span>AI Prep</span>
                  </button>
                )}
                {canManage && (
                  <button
                    onClick={() => setEditingExam(exam)}
                    className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                    title="Edit exam"
                    aria-label="Edit exam"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {canManage && (
                  <button
                    onClick={() => askDelete(exam)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                    title="Delete exam entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {editingExam && <EditTestModal exam={editingExam} onClose={() => setEditingExam(null)} onSaved={refreshAcademic} />}

      {/* MODAL: Create / Add Exam Schedule Entry */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Create Exam Schedule Sheet Entry
                </h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExamSchedule} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Branch *</label>
                  <select
                    value={examBranch}
                    onChange={(e) => setExamBranch(e.target.value as BranchCode)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                  >
                    <option value="CSE">CSE</option>
                    <option value="Civil">Civil</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Semester *</label>
                  <select
                    value={examSemester}
                    onChange={(e) => setExamSemester(Number(e.target.value) as any)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                  >
                    {[1, 2, 3, 4, 5, 6].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Exam Type *</label>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                >
                  <option value="Board Exam">UBTER Final Board Exam</option>
                  <option value="Sessional 1">Sessional Exam 1</option>
                  <option value="Sessional 2">Sessional Exam 2</option>
                  <option value="Class Test">Class Test (CT)</option>
                  <option value="MCQ Test">MCQ Test</option>
                  <option value="Assignment">Assignment</option>
                  <option value="Unit Test">Unit Class Test</option>
                  <option value="Practical / Viva">Lab Practical & Viva Examination</option>
                  <option value="Pre-Board Mock">Pre-Board Mock Test</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Subject *</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold"
                >
                  {branchSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      [{sub.code}] {sub.name} (Sem {sub.semester})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Exam Title / Paper Name *</label>
                <input
                  type="text"
                  placeholder="e.g. End Semester Theory Examination 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Exam Date *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Time Slot *</label>
                  <input
                    type="text"
                    placeholder="10:00 AM - 01:00 PM"
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Room / Hall *</label>
                  <input
                    type="text"
                    placeholder="Exam Hall 1 / Room 204"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Max Marks *</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  Save Schedule Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
