// ===================================================================================================
// Class & subject dispatcher: send notes / tasks to a class, students submit, teacher grades.
// Step 18: Edit button and a proper confirmation before delete.
// ===================================================================================================
import React, { useState, useMemo } from 'react';
import { useCollege } from '../../context/CollegeContext';
import { BranchCode, DispatchedSubmission, UserProfile } from '../../types';
import { uploadFile } from '../../services/materialsApi';
import { withDownload, dispatchApi, type DispatchView, type DispatchType } from '../../services/dispatchApi';
import {
  Send,
  BookOpen,
  Users,
  Calendar,
  FileText,
  Upload,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Layers,
  Award,
  Plus,
  MessageSquare,
  Sparkles,
  Paperclip,
  Maximize2,
  Minimize2,
  Phone,
  Edit,
  Eye,
  EyeOff,
  ExternalLink,
  FileSpreadsheet,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { Pencil } from 'lucide-react';                            // Step 18
import { editsApi } from '../../services/step18Api';              // Step 18: edit dispatches
import { notify, confirmDialog } from './ui/feedback';              // Step 18: styled messages

// Data shape: class subject dispatcher props.
interface ClassSubjectDispatcherProps {
  mode: 'faculty' | 'student' | 'admin';
}

// Step 10: everything here is on the server. The class comes from the subject, files are uploaded to the server and
// downloaded only through links the server checks, and the server decides who may send, submit, grade and delete.
const istToday = (plusDays = 0) => new Date(Date.now() + 330 * 60_000 + plusDays * 86_400_000).toISOString().slice(0, 10);
const FILE_HINT = 'PDF, JPEG, PNG, Word, PowerPoint or Excel. Up to 10 MB.';
const FILE_ACCEPT = '.pdf,.jpg,.jpeg,.png,.docx,.pptx,.xlsx';

// Screen part: class subject dispatcher.
export const ClassSubjectDispatcher: React.FC<ClassSubjectDispatcherProps> = ({ mode }) => {
  const {
    currentUser,
    users,
    subjects,
    dispatchedMaterials,
    dispatchMaterialToClass,
    submitToDispatchedMaterial,
    gradeDispatchedSubmission,
    deleteDispatchedMaterial,
    updateStudentPhone,
    t,
    reloadDispatches,
  } = useCollege();

  // ---- Step 18: edit a dispatched item (title, description, due date, marks) ----
  const [editDisp, setEditDisp] = useState<{ id: string; title: string; description: string; dueDate: string; maxMarks: number; isTask: boolean } | null>(null);
  // Save disp edit.
  const saveDispEdit = async () => {
    if (!editDisp) return;
    const r = await editsApi.updateDispatch(editDisp.id, editDisp.isTask ? editDisp : { title: editDisp.title, description: editDisp.description });
    if (!r.ok) return notify.error('Could not save', r.error);
    notify.success('Updated', editDisp.title); setEditDisp(null); reloadDispatches();
  };

  // Fullscreen expansion toggle
  const [isExpanded, setIsExpanded] = useState(false);

  // Selection states for dispatching. A teacher starts on the class of their own (first) subject.
  const firstOwn = mode === 'faculty' ? subjects.find((s) => (currentUser.assignedSubjectIds ?? []).includes(s.id)) : undefined;
  const [selectedBranch, setSelectedBranch] = useState<BranchCode>(
    firstOwn?.branch || currentUser.branch || currentUser.department || 'CSE'
  );
  // The year chosen by the user (filter / list selection)
  const [selectedYear, setSelectedYear] = useState<1 | 2 | 3>(
    firstOwn?.year || currentUser.year || 3
  );
  // The semester chosen by the user (filter / list selection)
  const [selectedSemester, setSelectedSemester] = useState<1 | 2 | 3 | 4 | 5 | 6>(
    firstOwn?.semester || currentUser.semester || 5
  );
  // The subject id chosen by the user (filter / list selection)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // Form states for dispatch
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  // Dispatch type (kept in screen state)
  const [dispatchType, setDispatchType] = useState<DispatchType>('Lecture Notes');
  // Title (kept in screen state)
  const [title, setTitle] = useState('');
  // Description (kept in screen state)
  const [description, setDescription] = useState('');
  // Picked file (kept in screen state)
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  // Due date (kept in screen state)
  const [dueDate, setDueDate] = useState(istToday(7));
  // List of max marks shown on this screen
  const [maxMarks, setMaxMarks] = useState<number>(20);
  // true while waiting for the server (buttons are disabled meanwhile)
  const [busy, setBusy] = useState(false);                 // an upload / save is running
  // Error message to show (form error); empty = no error
  const [formError, setFormError] = useState<string | null>(null);   // the server's reason, shown inside the open form

  // Student submission states
  const [selectedMatForSubmit, setSelectedMatForSubmit] = useState<DispatchView | null>(null);
  // Submission content (kept in screen state)
  const [submissionContent, setSubmissionContent] = useState('');
  // Submission file (kept in screen state)
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);

  // Faculty grading states
  // Only the id is kept: the item itself always comes from the list the server last sent, so a new grade shows at once.
  const [viewSubmissionsId, setViewSubmissionsId] = useState<string | null>(null);
  // Grading sub id (kept in screen state)
  const [gradingSubId, setGradingSubId] = useState<string | null>(null);
  // List of grade marks shown on this screen
  const [gradeMarks, setGradeMarks] = useState<string>('');
  // Grade feedback (kept in screen state)
  const [gradeFeedback, setGradeFeedback] = useState<string>('');

  // Student Phone Management Modal State
  const [showPhoneManagerModal, setShowPhoneManagerModal] = useState(false);
  // The student being edited right now (null = nothing open)
  const [editingStudent, setEditingStudent] = useState<UserProfile | null>(null);
  // Phone input val (kept in screen state)
  const [phoneInputVal, setPhoneInputVal] = useState('');
  // Phone success msg (kept in screen state)
  const [phoneSuccessMsg, setPhoneSuccessMsg] = useState<string | null>(null);

  // Read More / Read Less expanded map
  const [expandedDescIds, setExpandedDescIds] = useState<Record<string, boolean>>({});

  // Filter / Search
  const [searchFilter, setSearchFilter] = useState('');
  // Type filter (kept in screen state)
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Subjects filtered for the chosen Branch and Semester
  const availableClassSubjects = useMemo(() => {
    // A teacher can dispatch only for the subjects assigned to them (the server checks too); the admin for any subject.
    return subjects.filter(
      (s) => s.branch === selectedBranch && s.semester === selectedSemester &&
        (mode === 'admin' || (currentUser.assignedSubjectIds ?? []).includes(s.id))
    );
  }, [subjects, selectedBranch, selectedSemester, mode, currentUser.assignedSubjectIds]);

  // Current active subject
  const currentSubject = useMemo(() => {
    if (selectedSubjectId) {
      const found = availableClassSubjects.find((s) => s.id === selectedSubjectId);
      if (found) return found;
    }
    return availableClassSubjects[0];
  }, [selectedSubjectId, availableClassSubjects]);

  const viewSubmissionsMat = useMemo(() => dispatchedMaterials.find((m) => m.id === viewSubmissionsId) ?? null, [dispatchedMaterials, viewSubmissionsId]);
  // Set view submissions mat.
  const setViewSubmissionsMat = (m: { id: string } | null) => setViewSubmissionsId(m ? m.id : null);

  // Filter materials based on role
  const displayMaterials = useMemo(() => {
    return dispatchedMaterials.filter((mat) => {
      // In student mode, show only materials dispatched to student's branch and semester
      if (mode === 'student') {
        if (currentUser.branch && mat.branch !== currentUser.branch) return false;
        if (currentUser.semester && mat.semester !== currentUser.semester) return false;
      } else {
        // In faculty mode, allow filtering by selected branch & semester
        if (selectedBranch && mat.branch !== selectedBranch) return false;
        if (selectedSemester && mat.semester !== selectedSemester) return false;
      }
      if (typeFilter !== 'all' && mat.type !== typeFilter) return false;
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchesTitle = mat.title.toLowerCase().includes(q);
        const matchesSub = mat.subjectCode.toLowerCase().includes(q) || mat.subjectName.toLowerCase().includes(q);
        const matchesDesc = mat.description.toLowerCase().includes(q);
        return matchesTitle || matchesSub || matchesDesc;
      }
      return true;
    });
  }, [dispatchedMaterials, mode, currentUser, selectedBranch, selectedSemester, typeFilter, searchFilter]);

  // Runs when the user does this on screen: year change.
  const handleYearChange = (newYear: 1 | 2 | 3) => {
    setSelectedYear(newYear);
    const defSem = (newYear * 2 - 1) as 1 | 2 | 3 | 4 | 5 | 6;
    setSelectedSemester(defSem);
  };

  const classStudents = useMemo(() => {
    return users.filter((u) => {
      if (u.role !== 'student') return false;
      const branchMatch = !selectedBranch || u.branch === selectedBranch;
      const semMatch = !selectedSemester || u.semester === selectedSemester;
      return branchMatch && semMatch;
    });
  }, [users, selectedBranch, selectedSemester]);

  // Reset dispatch form.
  const resetDispatchForm = () => { setTitle(''); setDescription(''); setPickedFile(null); setFormError(null); setDueDate(istToday(7)); setMaxMarks(20); };

  /** Step one: upload the file to the server (if there is one). Step two: send the item with the file id. */
  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !currentSubject || busy) return;
    setBusy(true); setFormError(null);
    let fileId: string | undefined;
    if (pickedFile) {
      const up = await uploadFile(pickedFile);
      if (!up.ok) { setBusy(false); setFormError(up.error); return; }
      fileId = up.data.fileId;
    }
    const r = await dispatchMaterialToClass({
      subjectId: currentSubject.id, type: dispatchType, title: title.trim(), description: description.trim(), fileId,
      ...(dispatchType === 'Assignment & Task' ? { dueDate, maxMarks } : {}),
    });
    setBusy(false);
    if (!r.ok) { setFormError(r.error); return; }
    resetDispatchForm();
    setShowDispatchModal(false);
  };

  // Keep the file handed in earlier when only the text is edited (self-service).
  const [keepOldFile, setKeepOldFile] = useState(true);
  // Open submit modal.
  const openSubmitModal = (mat: DispatchView) => {
    const mine = mat.submissions.find((s) => s.studentId === currentUser.id);
    setSubmissionContent(mine?.content ?? ''); setSubmissionFile(null); setFormError(null); setKeepOldFile(true);
    setSelectedMatForSubmit(mat);
  };
  // Self-service: take back my submission (before the due date, while not graded). The server checks all of it.
  const handleWithdraw = async (mat: DispatchView) => {
    if (!(await confirmDialog({ title: 'Withdraw your submission?', message: `Your answer and file for "${mat.title}" will be deleted. You can submit again before the due date.`, danger: true }))) return;
    const r = await dispatchApi.withdraw(mat.id);
    if (!r.ok) return notify.error('Could not withdraw', r.error);
    notify.success('Submission withdrawn'); setSelectedMatForSubmit(null); reloadDispatches();
  };

  // Runs when the user does this on screen: student submit work.
  const handleStudentSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatForSubmit || busy) return;
    const oldSub = selectedMatForSubmit.submissions.find((x) => x.studentId === currentUser.id);
    const keepFile = !submissionFile && keepOldFile && !!oldSub?.attachmentName;
    if (!submissionContent.trim() && !submissionFile && !keepFile) { setFormError('Write your answer or attach a file.'); return; }
    setBusy(true); setFormError(null);
    let fileId: string | undefined;
    if (submissionFile) {
      const up = await uploadFile(submissionFile);
      if (!up.ok) { setBusy(false); setFormError(up.error); return; }
      fileId = up.data.fileId;
    }
    const r = await submitToDispatchedMaterial(selectedMatForSubmit.id, { content: submissionContent.trim(), fileId, keepFile });
    setBusy(false);
    if (!r.ok) { setFormError(r.error); return; }
    setSelectedMatForSubmit(null); setSubmissionContent(''); setSubmissionFile(null);
  };

  // Open grading.
  const openGrading = (sub: DispatchedSubmission) => {
    setGradingSubId(sub.id); setGradeMarks(sub.marksAwarded !== undefined ? String(sub.marksAwarded) : ''); setGradeFeedback(sub.feedback ?? ''); setFormError(null);
  };

  // Runs when the user does this on screen: grade submit.
  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewSubmissionsMat || !gradingSubId || busy) return;
    if (gradeMarks.trim() === '' || !Number.isFinite(Number(gradeMarks))) { setFormError('Enter the marks.'); return; }
    setBusy(true); setFormError(null);
    const r = await gradeDispatchedSubmission(viewSubmissionsMat.id, gradingSubId, Number(gradeMarks), gradeFeedback.trim());
    setBusy(false);
    if (!r.ok) { setFormError(r.error); return; }
    setGradingSubId(null);
  };

  // Runs when the user does this on screen: delete item.
  const handleDeleteItem = async (mat: DispatchView) => {
    if (!(await confirmDialog({ title: `Delete "${mat.title}"?`, message: 'Its file and all student submissions will be deleted too.', danger: true }))) return;
    await deleteDispatchedMaterial(mat.id);
  };

  /** The server checks the login and the class on every request; a copied link does not work for anybody else. */
  const saveFile = (url: string, name?: string) => {
    const a = document.createElement('a');
    a.href = withDownload(url);
    a.download = name || '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  /** A student's text-only answer (no file) can be saved as a text file for marking offline. */
  const handleDownloadSubmission = (sub: DispatchedSubmission, mat: DispatchView) => {
    if (sub.attachmentUrl) return saveFile(sub.attachmentUrl, sub.attachmentName);
    const text = `SUBMISSION: [${mat.subjectCode}] ${mat.title}\nStudent: ${sub.studentName} (Roll: ${sub.rollNo})\nSubmitted At: ${sub.submittedAt}\nStatus: ${sub.status}\n---------------------------------------------------\n${sub.content}\n`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sub.rollNo}_${mat.subjectCode}_solution.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Runs when the user does this on screen: open phone editor.
  const handleOpenPhoneEditor = (stu: UserProfile) => {
    setEditingStudent(stu);
    setPhoneInputVal(stu.phone || '');
    setPhoneSuccessMsg(null);
  };

  // Runs when the user does this on screen: save student phone.
  const handleSaveStudentPhone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    updateStudentPhone(editingStudent.id, phoneInputVal.trim());
    setPhoneSuccessMsg(`Saved phone for ${editingStudent.name} (${phoneInputVal.trim()})`);
    setTimeout(() => {
      setPhoneSuccessMsg(null);
      setEditingStudent(null);
    }, 1200);
  };

  return (
    <div className={`space-y-6 ${isExpanded ? 'fixed inset-0 z-50 p-4 sm:p-8 bg-slate-900/95 overflow-y-auto backdrop-blur-md' : ''}`}>
      {/* Top Banner & Dispatch Hub Selector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Class & Subject Targeted Broadcast
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Uttarakhand Government Institute of Polytechnic
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              {mode === 'student'
                ? 'My Class Subject Study Materials & Tasks'
                : 'Class & Subject Material Dispatch Hub'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {mode === 'student'
                ? `Materials dispatched specifically to your class: ${currentUser.branch} Year ${currentUser.year} (Sem ${currentUser.semester}).`
                : 'Select specific Class (Branch & Year/Semester) and Subject to transmit notes, assignments, tasks, and circulars directly to students.'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {mode !== 'student' && (
              <button
                type="button"
                onClick={() => setShowPhoneManagerModal(true)}
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                title="View & update student contact mobile numbers"
              >
                <Phone className="w-4 h-4 text-emerald-200" />
                <span>Class Student Numbers ({classStudents.length})</span>
              </button>
            )}

            {mode !== 'student' && (
            <button
              id="open-dispatch-modal-btn"
              onClick={() => { setFormError(null); setShowDispatchModal(true); }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
              title="Upload PDF, notes, lecture documents, pyq or assignments"
            >
              <Upload className="w-4 h-4 text-cyan-200" />
              <span>Upload & Dispatch Class Material (PDF / Notes / Tasks)</span>
            </button>
            )}

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all cursor-pointer"
              title={isExpanded ? 'Collapse Full View' : 'Expand Fullscreen View'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Class Selection Controls (Branch, Year, Semester) */}
        {mode !== 'student' && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Select Branch
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value as BranchCode)}
                className="w-full p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg font-bold"
              >
                <option value="CSE">Computer Science & Engg (CSE)</option>
                <option value="Civil">Civil Engineering</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Select Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(Number(e.target.value) as 1 | 2 | 3)}
                className="w-full p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg font-bold"
              >
                <option value={1}>1st Year (Diploma)</option>
                <option value={2}>2nd Year (Diploma)</option>
                <option value={3}>3rd Year (Final Year)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Select Semester
              </label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(Number(e.target.value) as any)}
                className="w-full p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg font-bold"
              >
                {selectedYear === 1 && (
                  <>
                    <option value={1}>Semester 1</option>
                    <option value={2}>Semester 2</option>
                  </>
                )}
                {selectedYear === 2 && (
                  <>
                    <option value={3}>Semester 3</option>
                    <option value={4}>Semester 4</option>
                  </>
                )}
                {selectedYear === 3 && (
                  <>
                    <option value={5}>Semester 5</option>
                    <option value={6}>Semester 6</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Class Target Summary
              </label>
              <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800 rounded-lg font-bold truncate">
                {selectedBranch} · {selectedYear} Year (Sem {selectedSemester})
              </div>
            </div>
            {/* subjects of this class with their teacher (a teacher sees only their own subject) */}
            <div className="sm:col-span-4">
              <span className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">{mode === 'admin' ? 'Subjects & teachers' : 'Your subject'}</span>
              <div className="flex flex-wrap gap-1.5">
                {availableClassSubjects.map((s) => (
                  <span key={s.id} className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <b>{s.name}</b> <span className="text-slate-500">· {s.facultyName || 'no teacher yet'}</span>
                  </span>
                ))}
                {!availableClassSubjects.length && <span className="text-slate-500">{mode === 'admin' ? 'No subjects in this semester.' : 'You are not teaching a subject in this semester.'}</span>}
              </div>
            </div>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search by material title or subject code..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-lg font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            <span className="text-[11px] text-slate-400 font-semibold uppercase">Type:</span>
            {['all', 'Lecture Notes', 'Assignment & Task', 'Formula Sheet', 'Circular Notice'].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  typeFilter === t
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {t === 'all' ? 'All Types' : t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dispatched Materials Grid */}
      <div className="space-y-4">
        {displayMaterials.length === 0 ? (
          <div className="text-center py-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-3">
            <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No Materials Dispatched Yet
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {mode === 'student'
                ? 'Your teachers have not dispatched items for this category yet. Check back soon!'
                : 'Click "Dispatch Material to Class" to transmit lecture notes or assignments to this class.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayMaterials.map((mat) => {
              const mySub = mat.submissions.find((s) => s.studentId === currentUser.id);

              return (
                <div
                  key={mat.id}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs hover:border-blue-400 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                        {mat.subjectCode} · Sem {mat.semester} ({mat.branch})
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {mat.type}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                        {mat.title}
                      </h4>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                        {mat.subjectName}
                      </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700">
                      <p className={`text-xs text-slate-600 dark:text-slate-300 leading-relaxed ${expandedDescIds[mat.id] ? '' : 'line-clamp-2'}`}>
                        {mat.description}
                      </p>
                      {mat.description && mat.description.length > 90 && (
                        <button
                          type="button"
                          onClick={() => setExpandedDescIds((prev) => ({ ...prev, [mat.id]: !prev[mat.id] }))}
                          className="text-blue-600 dark:text-blue-400 font-bold text-[11px] mt-1 hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          {expandedDescIds[mat.id] ? (
                            <>
                              <span>Read Less</span>
                              <ChevronUp className="w-3 h-3" />
                            </>
                          ) : (
                            <>
                              <span>Read More</span>
                              <ChevronDown className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 pt-1">
                      <div className="flex items-center justify-between">
                        <span>Dispatched by: <strong className="text-slate-700 dark:text-slate-200">{mat.sentByFacultyName}</strong></span>
                        <span className="font-mono">{mat.fileSizeBytes}</span>
                      </div>
                      {mat.attachmentName && (
                        <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 truncate">
                          <Paperclip className="w-3 h-3 shrink-0" />
                          <span className="truncate">{mat.attachmentName}</span>
                        </div>
                      )}
                      {mat.dueDate && (
                        <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 font-semibold">
                          <span>Due: {mat.dueDate}{mat.closed ? ' (closed)' : ''}</span>
                          <span>Max: {mat.maxMarks} Marks</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer actions with download and delete for everyone */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      {mat.attachmentUrl && (
                        <button
                          onClick={() => saveFile(mat.attachmentUrl!, mat.attachmentName)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Download file"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                      )}
                      {mat.attachmentUrl && (mat.fileKind === 'pdf' || mat.fileKind === 'image') && (
                        <a
                          href={mat.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Open in a new tab"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </a>
                      )}

                      {mode === 'student' && mat.type === 'Assignment & Task' && (
                        mySub?.status === 'Graded' ? (
                          <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {`Graded: ${mySub.marksAwarded}/${mat.maxMarks}`}
                          </span>
                        ) : mat.closed ? (
                          <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {mySub ? 'Submitted · closed' : 'Closed'}
                          </span>
                        ) : (
                          <>
                            {mySub && (
                              <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Submitted
                              </span>
                            )}
                            <button
                              onClick={() => openSubmitModal(mat)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>{mySub ? 'Change Submission' : 'Submit Solution'}</span>
                            </button>
                          </>
                        )
                      )}

                      {mode !== 'student' && (
                        <button
                          onClick={() => setViewSubmissionsMat(mat)}
                          className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                          <span>Submissions ({mat.submittedCount})</span>
                        </button>
                      )}
                    </div>

                    {mode !== 'student' && (mode === 'admin' || mat.mine) && (
                      <button
                        onClick={() => setEditDisp({ id: mat.id, title: mat.title, description: mat.description || '', dueDate: mat.dueDate || '', maxMarks: mat.maxMarks || 10, isTask: mat.type === 'Assignment & Task' })}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                        title="Edit" aria-label="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {mode !== 'student' && (mode === 'admin' || mat.mine) && (
                      <button
                        onClick={() => handleDeleteItem(mat)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg cursor-pointer transition-colors"
                        title="Delete material"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: Dispatch Material (Faculty & Admin) */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-xl text-blue-600 dark:text-blue-400">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Dispatch Subject Material to Class
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Transmits directly to targeted students
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDispatchModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDispatchSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Target Branch *</label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value as BranchCode)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white"
                  >
                    <option value="CSE">CSE</option>
                    <option value="Civil">Civil</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Target Semester *</label>
                  <select
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(Number(e.target.value) as any)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white"
                  >
                    {[1, 2, 3, 4, 5, 6].map((sem) => (
                      <option key={sem} value={sem}>
                        Semester {sem}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Select Subject *</label>
                <select
                  value={currentSubject?.id || ''}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white"
                >
                  {availableClassSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      [{sub.code}] {sub.name} — {sub.facultyName || 'no teacher yet'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Material Type *</label>
                  <select
                    value={dispatchType}
                    onChange={(e) => setDispatchType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white"
                  >
                    <option value="Lecture Notes">Lecture Notes</option>
                    <option value="Assignment & Task">Assignment & Task</option>
                    <option value="Test / Exam Paper">Test / Exam Paper</option>
                    <option value="Lab Module">Lab Practical Guide</option>
                    <option value="Formula Sheet">Formula Sheet</option>
                    <option value="Circular Notice">Class Circular</option>
                  </select>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 self-end pb-1">
                  The class (branch + semester) is taken from the subject you pick.
                </p>
              </div>

              {/* Real File Upload Section */}
              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 border-2 border-dashed border-blue-400/60 dark:border-blue-700/60 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>Upload Attachment (optional)</span>
                  </label>
                </div>
                <p className="text-[10px] text-slate-500">{FILE_HINT}</p>
                <input
                  type="file"
                  accept={FILE_ACCEPT}
                  onChange={(e) => setPickedFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />
                {pickedFile && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Selected: <strong>{pickedFile.name}</strong> ({(pickedFile.size / 1048576).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Topic / Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Unit 4: Memory Management & Pointers Practical Pack"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Instructions & Description *</label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed instructions for students of this class..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {dispatchType === 'Assignment & Task' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Due Date</label>
                    <input
                      type="date"
                      min={istToday()}
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-800 border rounded-lg text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Max Marks</label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={maxMarks}
                      onChange={(e) => setMaxMarks(Number(e.target.value))}
                      className="w-full p-2 bg-white dark:bg-slate-800 border rounded-lg text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                </div>
              )}

              {formError && <p role="alert" className="text-[12px] font-semibold text-red-600 dark:text-red-400">{formError}</p>}
              {!currentSubject && <p className="text-[12px] font-semibold text-amber-600">No subject of yours in this branch and semester. Choose another class.</p>}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  className="px-4 py-2 text-slate-500 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || !currentSubject}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{busy ? 'Saving...' : 'Send to Class Now'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Student Submit Work */}
      {selectedMatForSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">
                {selectedMatForSubmit.subjectCode} · {selectedMatForSubmit.type}
              </span>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                Submit: {selectedMatForSubmit.title}
              </h3>
            </div>

            <form onSubmit={handleStudentSubmitWork} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Your Answer / Solution / Code
                </label>
                <textarea
                  rows={4}
                  value={submissionContent}
                  onChange={(e) => setSubmissionContent(e.target.value)}
                  placeholder="Paste your solution, answers, or report summary..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {/* Student Solution File Upload */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block text-xs flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span>Attach Solution File (optional)</span>
                </label>
                <p className="text-[10px] text-slate-500">{FILE_HINT} Only you and your subject teachers can open it.</p>
                <input
                  type="file"
                  accept={FILE_ACCEPT}
                  onChange={(e) => setSubmissionFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />
                {submissionFile && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    File selected: <strong>{submissionFile.name}</strong>
                  </p>
                )}
                {(() => {
                  const old = selectedMatForSubmit.submissions.find((x) => x.studentId === currentUser.id);
                  if (!old) return null;
                  return (
                    <div className="space-y-1.5">
                      {old.attachmentName && !submissionFile && (
                        <label className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input type="checkbox" checked={keepOldFile} onChange={(e) => setKeepOldFile(e.target.checked)} />
                          <span>पुरानी फ़ाइल रखें / Keep my earlier file: <strong>{old.attachmentName}</strong></span>
                        </label>
                      )}
                      <p className="text-[11px] text-amber-600 dark:text-amber-400">You already submitted. Saving again replaces your earlier answer{old.attachmentName ? (keepOldFile && !submissionFile ? ' (the file is kept)' : ' and file') : ''}. You can change it until the due date.</p>
                      <button type="button" onClick={() => handleWithdraw(selectedMatForSubmit)} className="text-[11px] font-bold text-rose-600 underline cursor-pointer">Withdraw my submission / जमा किया हुआ वापस लें</button>
                    </div>
                  );
                })()}
              </div>

              {formError && <p role="alert" className="text-[12px] font-semibold text-red-600 dark:text-red-400">{formError}</p>}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedMatForSubmit(null)}
                  className="px-4 py-2 text-slate-500 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  {busy ? 'Saving...' : 'Confirm Submission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Faculty View Submissions & Grade */}
      {viewSubmissionsMat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Student Submissions: {viewSubmissionsMat.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Target: {viewSubmissionsMat.branch} Sem {viewSubmissionsMat.semester} · {viewSubmissionsMat.subjectCode}
                </p>
              </div>
              <button
                onClick={() => {
                  setViewSubmissionsMat(null);
                  setGradingSubId(null);
                  setFormError(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {viewSubmissionsMat.submissions.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">
                No students have submitted solutions for this task yet.
              </p>
            ) : (
              <div className="space-y-3">
                {viewSubmissionsMat.submissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{sub.studentName}</span>
                        <span className="font-mono text-slate-500">Roll: {sub.rollNo}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-mono">{sub.submittedAt}</span>
                        <button
                          type="button"
                          onClick={() => handleDownloadSubmission(sub, viewSubmissionsMat)}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-950/60 hover:bg-blue-200 text-blue-700 dark:text-blue-300 rounded font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                          title="Download Student Solution"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download Solution</span>
                        </button>
                      </div>
                    </div>

                    <p className="p-2.5 bg-white dark:bg-slate-700/60 rounded-lg text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                      {sub.content}
                    </p>

                    {sub.attachmentName && (
                      <p className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <Paperclip className="w-3 h-3" />
                        <span>Attached file: <strong>{sub.attachmentName}</strong></span>
                      </p>
                    )}

                    {gradingSubId !== sub.id && sub.status === 'Graded' ? (
                      <div className="flex items-center justify-between gap-2 text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                        <span>Score: {sub.marksAwarded} / {viewSubmissionsMat.maxMarks}</span>
                        {sub.feedback && <span className="truncate">Feedback: "{sub.feedback}"</span>}
                        <button onClick={() => openGrading(sub)} className="px-2 py-1 text-[11px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded">Change grade</button>
                      </div>
                    ) : gradingSubId === sub.id ? (
                      <form onSubmit={handleGradeSubmit} className="pt-2 border-t space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            min={0}
                            max={viewSubmissionsMat.maxMarks}
                            step={0.5}
                            value={gradeMarks}
                            onChange={(e) => setGradeMarks(e.target.value)}
                            className="p-1.5 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold"
                            placeholder={`Marks (0 to ${viewSubmissionsMat.maxMarks})`}
                          />
                          <input
                            type="text"
                            value={gradeFeedback}
                            onChange={(e) => setGradeFeedback(e.target.value)}
                            className="p-1.5 border rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            placeholder="Feedback"
                          />
                        </div>
                        {formError && <p role="alert" className="text-[12px] font-semibold text-red-600 dark:text-red-400">{formError}</p>}
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setGradingSubId(null)}
                            className="px-3 py-1 text-slate-500"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={busy}
                            className="px-4 py-1 bg-emerald-600 disabled:opacity-60 text-white font-bold rounded"
                          >
                            {busy ? 'Saving...' : 'Save Grade'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => openGrading(sub)}
                        className="px-3 py-1 bg-blue-600 text-white font-bold rounded"
                      >
                        Grade Submission
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Class Student Directory & Contact Number Manager */}
      {showPhoneManagerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950 rounded-xl text-emerald-600">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Class Student Contact Directory & Phone Manager
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedBranch} · Year {selectedYear} (Semester {selectedSemester}) · {classStudents.length} Enrolled Students
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPhoneManagerModal(false);
                  setEditingStudent(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {phoneSuccessMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{phoneSuccessMsg}</span>
              </div>
            )}

            {/* Editing Phone Sub-form */}
            {editingStudent && (
              <form onSubmit={handleSaveStudentPhone} className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                    Update Mobile Phone for: <strong>{editingStudent.name}</strong> (Roll: {editingStudent.rollNo || 'N/A'})
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    required
                    value={phoneInputVal}
                    onChange={(e) => setPhoneInputVal(e.target.value)}
                    placeholder="+91 98370 12345"
                    className="flex-1 p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border rounded-xl text-xs font-bold"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Save Contact
                  </button>
                </div>
              </form>
            )}

            {classStudents.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No students enrolled in {selectedBranch} Semester {selectedSemester}.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {classStudents.map((stu) => (
                  <div
                    key={stu.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        name={stu.name}
                        avatar={stu.avatar}
                        role={stu.role}
                        size="sm"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-slate-900 dark:text-white">{stu.name}</h5>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            Roll: {stu.rollNo || 'N/A'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {stu.email} · Category: {stu.category || 'General'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {stu.phone ? (
                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-600">
                          <Phone className="w-3 h-3 text-emerald-500" />
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                            {stu.phone}
                          </span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          No Phone
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenPhoneEditor(stu)}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit className="w-3 h-3" />
                        <span>{stu.phone ? 'Edit' : 'Add Phone'}</span>
                      </button>

                      {stu.phone && (
                        <a
                          href={`tel:${stu.phone.replace(/[^0-9+]/g, '')}`}
                          className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg cursor-pointer"
                          title="Call Student"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Step 18: edit a dispatched item */}
      {editDisp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditDisp(null); }}>
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-3 text-sm">
            <h3 className="font-bold text-slate-900 dark:text-white">Edit: {editDisp.title}</h3>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Title</span>
              <input className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" value={editDisp.title} onChange={(e) => setEditDisp({ ...editDisp, title: e.target.value })} /></label>
            <label className="block"><span className="text-xs font-semibold text-slate-600">Description</span>
              <textarea rows={3} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" value={editDisp.description} onChange={(e) => setEditDisp({ ...editDisp, description: e.target.value })} /></label>
            {editDisp.isTask && (
              <div className="grid grid-cols-2 gap-3">
                <label><span className="text-xs font-semibold text-slate-600">Due date</span>
                  <input type="date" className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" value={editDisp.dueDate} onChange={(e) => setEditDisp({ ...editDisp, dueDate: e.target.value })} /></label>
                <label><span className="text-xs font-semibold text-slate-600">Max marks</span>
                  <input type="number" min={1} className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" value={editDisp.maxMarks} onChange={(e) => setEditDisp({ ...editDisp, maxMarks: Number(e.target.value) })} /></label>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditDisp(null)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 font-semibold cursor-pointer">Cancel</button>
              <button onClick={saveDispEdit} className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold cursor-pointer">Save changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
