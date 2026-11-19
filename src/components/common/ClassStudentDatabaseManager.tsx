// ===================================================================================================
// 1st / 2nd / 3rd year student database: list by class, view, edit, change status
// (Step 18: Passed Out / Detained / Year Back / Left are not promoted with the class), delete, Excel export.
// ===================================================================================================
import React, { useState } from 'react';
import ExportMenu from './ExportMenu';
import type { ExportTable } from '../../utils/exporter';
import { useCollege } from '../../context/CollegeContext';
import { UserProfile, BranchCode } from '../../types';
import { StudentRecordForm } from './StudentRecordForm';
import { getMissing } from '../../services/studentSync';
import { MISSING_LABEL } from '../../utils/studentRules';
import {
  Users,
  GraduationCap,
  Download,
  Plus,
  Trash2,
  Edit,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Phone,
  FileSpreadsheet,
  Send,
  Eye,
  EyeOff,
  ShieldCheck,
  Building2,
  Laptop,
  MapPin,
  Heart,
  Award,
  ChevronRight,
  Filter,
  Edit3,
  Check,
} from 'lucide-react';

/** Helpers that show real saved values only. Blank details show "—" (never another student's numbers). */
const dash = '—';
// Txt.
const txt = (v: unknown) => (v === undefined || v === null || String(v).trim() === '' || /^n\/?a$/i.test(String(v).trim()) ? dash : String(v));
// Pct.
const pct = (v: unknown) => { const t = String(v ?? '').replace(/%/g, '').trim(); return !t || /^n\/?a$/i.test(t) ? dash : /cgpa/i.test(t) ? t : `${t}%`; };
// Aadhaar text.
const aadhaarText = (st: UserProfile) => st.aadharMasked || (st.aadharNumber ? `XXXX XXXX ${st.aadharNumber.replace(/\D/g, '').slice(-4)}` : 'Not added');

// Data shape: class student database manager props.
interface ClassStudentDatabaseManagerProps {
  mode?: 'admin' | 'faculty';
  forceMobileView?: boolean;
}

// Screen part: class student database manager.
export const ClassStudentDatabaseManager: React.FC<ClassStudentDatabaseManagerProps> = ({ mode = 'admin', forceMobileView = false }) => {
  const {
    users,
    currentUser,
    downloadClassExcelCSV,
    updateStudentRecordStatus,
    deleteStudent,
    updateUser,
    addUser,
    sendDirectStudentNotice,
    getAttendancePercent,
  } = useCollege();

  // Class Selection Filters
  const [selectedYear, setSelectedYear] = useState<1 | 2 | 3 | 'all'>('all');
  // The branch chosen by the user (filter / list selection)
  const [selectedBranch, setSelectedBranch] = useState<BranchCode | 'all'>('all');
  // Text typed in the search box
  const [searchQuery, setSearchQuery] = useState('');
  // The status filter chosen by the user (filter / list selection)
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  // View mode (kept in screen state)
  const [viewMode, setViewMode] = useState<'table' | 'spreadsheet'>('table');

  // Modals & Drawers
  const [viewingStudent, setViewingStudent] = useState<UserProfile | null>(null);
  // The student being edited right now (null = nothing open)
  const [editingStudent, setEditingStudent] = useState<UserProfile | null>(null);
  // Status modal target (kept in screen state)
  const [statusModalTarget, setStatusModalTarget] = useState<UserProfile | null>(null);
  // New status selection (kept in screen state)
  const [newStatusSelection, setNewStatusSelection] = useState<
    'Active / Enrolled' | 'Fee Cleared' | 'Documents Verified' | 'Placement Ready' | 'Pending Review' | 'Passed Out' | 'Detained' | 'Year Back' | 'Left / Dropped'
  >('Active / Enrolled');
  // List of status remarks shown on this screen
  const [statusRemarks, setStatusRemarks] = useState('');

  // Direct Notice Modal
  const [directNoticeTarget, setDirectNoticeTarget] = useState<UserProfile | null>(null);
  // Notice title (kept in screen state)
  const [noticeTitle, setNoticeTitle] = useState('');
  // Notice message (kept in screen state)
  const [noticeMessage, setNoticeMessage] = useState('');
  // Notice priority (kept in screen state)
  const [noticePriority, setNoticePriority] = useState<'normal' | 'urgent' | 'critical'>('urgent');
  // Notice sent toast (kept in screen state)
  const [noticeSentToast, setNoticeSentToast] = useState(false);
  // Error message to show (notice error); empty = no error
  const [noticeError, setNoticeError] = useState('');
  // Notice busy (kept in screen state)
  const [noticeBusy, setNoticeBusy] = useState(false);

  // Add / edit form (StudentRecordForm)
  const [showAddModal, setShowAddModal] = useState(false);
  // Only missing (kept in screen state)
  const [onlyMissing, setOnlyMissing] = useState(false);

  // Filter students list
  const studentsList = users.filter((u) => u.role === 'student');

  const filteredStudents = studentsList.filter((s) => {
    const matchYear = selectedYear === 'all' || s.year === selectedYear;
    const matchBranch = selectedBranch === 'all' || s.branch === selectedBranch;
    const matchStatus = selectedStatusFilter === 'all' || (s.recordStatus || 'Active / Enrolled') === selectedStatusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.aadharName && s.aadharName.toLowerCase().includes(q)) ||
      (s.rollNo && s.rollNo.includes(q)) ||
      (s.ubterRollNumber && s.ubterRollNumber.includes(q)) ||
      (s.phone && s.phone.includes(q)) ||
      (s.fullAddress && s.fullAddress.toLowerCase().includes(q));

    const matchMissing = !onlyMissing || getMissing(s).length > 0;
    return matchYear && matchBranch && matchStatus && matchSearch && matchMissing;
  });

  // Excel / PDF / CSV of exactly the students shown now (filters applied). Aadhaar is masked, no passwords.
  const buildClassExport = (): ExportTable => ({
    title: 'Class-wise Student Database',
    subtitle: `Year: ${selectedYear === 'all' ? 'All' : selectedYear}  Branch: ${selectedBranch === 'all' ? 'All' : selectedBranch}`,
    filename: `Class_Students_${selectedBranch}_${selectedYear}_${new Date().toISOString().split('T')[0]}`,
    sheetName: 'Students',
    columns: ['Sl. No', 'Name (Aadhaar)', 'Mobile', 'UBTER Roll No', 'Branch', 'Year', 'Semester', '10th %', '12th %', '1st Year %/CGPA', '2nd Year %/CGPA', 'Father', 'Mother', 'Address', 'Aadhaar (masked)', 'Status', 'Attendance %'],
    rows: filteredStudents.map((st, i) => [
      i + 1, st.aadharName || st.name, st.phone || '', st.ubterRollNumber || st.rollNo || '', st.branch || '', st.year ?? '', st.semester ?? '',
      txt(st.tenthPercentage), txt(st.twelfthPercentage), txt(st.firstYearCgpa), txt(st.secondYearCgpa),
      txt(st.fatherName), txt(st.motherName), st.fullAddress || '', aadhaarText(st), st.recordStatus || 'Active / Enrolled',
      getAttendancePercent(st.id) === null ? '' : (getAttendancePercent(st.id) as number),
    ]),
  });

  const missingCount = studentsList.filter((s) => (selectedYear === 'all' || s.year === selectedYear) && (selectedBranch === 'all' || s.branch === selectedBranch) && getMissing(s).length > 0).length;

  // Best average of the semester percentages saved so far (real data only)
  const semAvg = (st: UserProfile) => {
    const v = Object.values(st.semestersPercentage ?? {}).map((x) => parseFloat(String(x ?? '').replace(/[^\d.]/g, ''))).filter((n) => Number.isFinite(n) && n > 10);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const topStudent = filteredStudents
    .map((st) => ({ st, avg: semAvg(st) }))
    .filter((x): x is { st: UserProfile; avg: number } => x.avg !== null)
    .sort((a, b) => b.avg - a.avg)[0];

  // Statistics calculation for big banner display
  const totalCount = filteredStudents.length;
  const verifiedCount = filteredStudents.filter(
    (s) => s.recordStatus === 'Documents Verified' || s.recordStatus === 'Placement Ready'
  ).length;
  const knownAttendance = filteredStudents.map((x) => getAttendancePercent(x.id)).filter((x): x is number => x !== null);
  const avgAttendance = knownAttendance.length > 0
    ? (knownAttendance.reduce((acc, x) => acc + x, 0) / knownAttendance.length).toFixed(1)
    : '—';

  // Runs when the user does this on screen: open status modal.
  const handleOpenStatusModal = (student: UserProfile) => {
    setStatusModalTarget(student);
    setNewStatusSelection((student.recordStatus as any) || 'Active / Enrolled');
    setStatusRemarks('');
  };

  // Runs when the user does this on screen: save status.
  const handleSaveStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalTarget) return;
    updateStudentRecordStatus(statusModalTarget.id, newStatusSelection, statusRemarks.trim());
    setStatusModalTarget(null);
  };

  // Runs when the user does this on screen: open direct notice.
  const handleOpenDirectNotice = (student: UserProfile) => {
    setDirectNoticeTarget(student);
    setNoticeError('');
    setNoticeTitle(`Official Academic Notice: ${student.name}`);
    setNoticeMessage(`Dear ${student.name}, please report to the departmental office for document verification.`);
    setNoticePriority('urgent');
  };

  // Runs when the user does this on screen: send direct notice.
  const handleSendDirectNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directNoticeTarget || !noticeTitle.trim() || !noticeMessage.trim() || noticeBusy) return;
    setNoticeBusy(true); setNoticeError('');
    // the server allows this only for students of a class this teacher teaches
    const r = await sendDirectStudentNotice({
      targetStudentId: directNoticeTarget.id,
      targetStudentName: directNoticeTarget.name,
      targetStudentRoll: directNoticeTarget.rollNo || directNoticeTarget.ubterRollNumber || '',
      title: noticeTitle.trim(),
      message: noticeMessage.trim(),
      priority: noticePriority,
      sentByRole: mode === 'admin' ? 'admin' : 'faculty',
      sentByName: currentUser.name,
    });
    setNoticeBusy(false);
    if (!r.ok) { setNoticeError(r.error); return; }
    setNoticeSentToast(true);
    setTimeout(() => {
      setNoticeSentToast(false);
      setDirectNoticeTarget(null);
    }, 1400);
  };

  // Runs when the user does this on screen: start edit.
  const handleStartEdit = (student: UserProfile) => setEditingStudent(student);

  // Runs when the user does this on screen: save record.
  const handleSaveRecord = (data: Partial<UserProfile>, isNew: boolean) => {
    if (isNew) {
      const roll = String(data.rollNo);
      const first = String(data.name).toLowerCase().split(/\s+/)[0].replace(/[^a-z0-9]/g, '') || 'student';
      addUser({
        ...data,
        name: String(data.name),
        email: `${first}${roll.slice(-3)}@student.gpt-tanakpur.gov.in`,
        role: 'student',
        avatar: '',
        enrollmentNo: `UBTER/${roll.slice(0, 2)}/${roll}`,
        recordStatus: data.recordStatus || 'Active / Enrolled',
        statusTrackHistory: [{
          status: data.recordStatus || 'Active / Enrolled',
          changedAt: new Date().toISOString().split('T')[0],
          changedBy: currentUser.name,
          remarks: 'Newly added into class database',
        }],
      } as Omit<UserProfile, 'id'>);
    } else if (editingStudent) {
      updateUser(editingStudent.id, data);
    }
    setShowAddModal(false);
    setEditingStudent(null);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & CLASS SELECTION CONTROLS (BADE BADE OPTIONS) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Institutional Student Master Database
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                Live Dynamic Spreadsheet Sync
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Class-wise Student Database & Real-Time Dossier
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Select 1st Year, 2nd Year, or 3rd Year to view filtered academic records, generate class spreadsheets, track status, and dispatch individual notices.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ExportMenu build={buildClassExport} />
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>➕ Add New Student Record</span>
            </button>
          </div>
        </div>

        {/* 2. BADE BADE YEAR & BRANCH SELECTION BUTTONS */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              Select Academic Class / Year (क्लास चुनें):
            </label>
            <div className={`grid ${forceMobileView ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'} gap-2.5`}>
              {[
                { id: 'all', title: 'All Years (सभी वर्ष)', desc: 'Complete College Roster', icon: Users, badge: `${studentsList.length} Students` },
                { id: 1, title: '1st Year (प्रथम वर्ष)', desc: 'Semester 1 & 2 (Foundation)', icon: GraduationCap, badge: `${studentsList.filter(s => s.year === 1).length} Students` },
                { id: 2, title: '2nd Year (द्वितीय वर्ष)', desc: 'Semester 3 & 4 (Anurag & Core)', icon: Laptop, badge: `${studentsList.filter(s => s.year === 2).length} Students` },
                { id: 3, title: '3rd Year (तृतीय वर्ष)', desc: 'Semester 5 & 6 (Final / TPO)', icon: Building2, badge: `${studentsList.filter(s => s.year === 3).length} Students` },
              ].map((yr) => {
                const Icon = yr.icon;
                const isSel = selectedYear === yr.id;
                return (
                  <button
                    key={yr.id}
                    onClick={() => setSelectedYear(yr.id as any)}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative ${
                      isSel
                        ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSel ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${isSel ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                        {yr.badge}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">{yr.title}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{yr.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* BRANCH FILTER */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 mr-1">Branch (ब्रांच):</span>
            {[
              { id: 'all', label: 'All Branches' },
              { id: 'CSE', label: 'Computer Science & Engg (CSE)' },
              { id: 'Civil', label: 'Civil Engineering' },
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

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOnlyMissing((v) => !v)}
                aria-pressed={onlyMissing}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  onlyMissing
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100'
                }`}
              >
                Missing details ({missingCount})
              </button>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Status:</span>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="all">All Verification Statuses</option>
                <option value="Active / Enrolled">Active / Enrolled</option>
                <option value="Documents Verified">Documents Verified</option>
                <option value="Fee Cleared">Fee Cleared</option>
                <option value="Placement Ready">Placement Ready</option>
                <option value="Pending Review">Pending Review</option>
                <option value="Passed Out">Passed Out</option>
                <option value="Detained">Detained (not promoted)</option>
                <option value="Year Back">Year Back (not promoted)</option>
                <option value="Left / Dropped">Left / Dropped (not promoted)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. BADE BADE STATS CARDS */}
        <div className={`grid ${forceMobileView ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'} gap-2.5 pt-2`}>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-850 dark:to-slate-800 p-4 rounded-xl border border-blue-200/60 dark:border-slate-700">
            <span className="text-[11px] font-bold uppercase text-blue-700 dark:text-blue-300 block">Class Enrollment</span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">{totalCount}</div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Enrolled in selected scope</span>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-850 dark:to-slate-800 p-4 rounded-xl border border-emerald-200/60 dark:border-slate-700">
            <span className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-300 block">Verified / Placed</span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">{verifiedCount}</div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Aadhar & marks authenticated</span>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-850 dark:to-slate-800 p-4 rounded-xl border border-amber-200/60 dark:border-slate-700">
            <span className="text-[11px] font-bold uppercase text-amber-700 dark:text-amber-300 block">Mean Attendance</span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">{avgAttendance}%</div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Biometric & QR register avg</span>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-850 dark:to-slate-800 p-4 rounded-xl border border-purple-200/60 dark:border-slate-700">
            <span className="text-[11px] font-bold uppercase text-purple-700 dark:text-purple-300 block">Top Department Rank</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 truncate">
              {topStudent ? topStudent.st.name : '—'}
            </div>
            <span className="text-[11px] text-purple-600 dark:text-purple-300 font-bold">{topStudent ? `${topStudent.avg.toFixed(1)}% avg of saved semesters` : 'No marks saved yet'}</span>
          </div>
        </div>

        {/* SEARCH BAR & VIEW TOGGLE */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, roll number, mobile, Aadhar, address..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:flex sm:items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Dossier View</span>
            </button>
            <button
              onClick={() => setViewMode('spreadsheet')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                viewMode === 'spreadsheet'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Live Excel View</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. STUDENT MASTER TABLE (SHOWING EVERY DETAIL SPECIFIED BY USER) */}
      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Student Records Table ({filteredStudents.length} entries)
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Showing complete credentials: 10th%, 12th%, CGPA, 1st-4th Sem %, Parent Names, Mobile, Aadhar
          </span>
        </div>

        {/* MOBILE CARD VIEW FOR PHONES (< sm or forced mobile) */}
        <div className={`${forceMobileView ? 'block' : 'block sm:hidden'} divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-3`}>
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No student records found matching the current filters.
            </div>
          ) : (
            filteredStudents.map((st, idx) => {
              const isAnurag = st.id === 'stu-anurag';
              const att = getAttendancePercent(st.id);
              return (
                <div
                  key={st.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isAnurag
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 shadow-xs'
                      : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        isAnurag ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'
                      }`}>
                        {st.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                          {st.name}
                        </h4>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                          UBTER: <span className="font-bold text-slate-800 dark:text-slate-200">{st.ubterRollNumber || st.rollNo}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-400">#{idx + 1}</span>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {st.branch} · Year {st.year} (Sem {st.semester})
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      (att ?? 0) >= 75 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      हाजिरी: {att === null ? '—' : `${att}%`}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {st.recordStatus || 'Active'}
                    </span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <div>
                      <span className="text-slate-400 text-[10px] block">मोबाइल (Phone):</span>
                      <a href={`tel:${st.phone}`} className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-600" /> {st.phone || '—'}
                      </a>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">अकादमिक (10th / 12th):</span>
                      <span className="font-bold">{pct(st.highSchoolPercentage)} / {pct(st.intermediatePercentage)}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 text-[10px] block">अभिभावक (Parent):</span>
                      <span className="truncate block">{st.fatherName ? `पिता: ${st.fatherName}` : st.parentName || '—'}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setViewingStudent(st)}
                      className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>डोज़ियर (Dossier)</span>
                    </button>
                    <button
                      onClick={() => handleStartEdit(st)}
                      className="py-1.5 px-3 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>एडिट</span>
                    </button>
                    <button
                      onClick={() => handleOpenDirectNotice(st)}
                      className="py-1.5 px-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="Direct Notice"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP TABLE VIEW (hidden on mobile or forced mobile) */}
        <div className={`${forceMobileView ? 'hidden' : 'hidden sm:block'} overflow-x-auto`}>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-600">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Student Dossier</th>
                <th className="p-3">Class & Roll</th>
                <th className="p-3">Contact & Mobile</th>
                <th className="p-3">Academic Performance</th>
                <th className="p-3">Semester Marks (1st to 4th)</th>
                <th className="p-3">Parent & Address</th>
                <th className="p-3">Record Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500 dark:text-slate-400">
                    No student records found matching the current filters.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => {
                  const isAnurag = st.id === 'stu-anurag';
                  return (
                    <tr
                      key={st.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                        isAnurag ? 'bg-amber-50/40 dark:bg-amber-950/15' : ''
                      }`}
                    >
                      <td className="p-3 font-mono text-slate-400 font-bold">{idx + 1}</td>

                      {/* Student Dossier */}
                      <td className="p-3">
                        <div className="flex items-start gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isAnurag
                              ? 'bg-amber-500 text-white ring-2 ring-amber-300'
                              : 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                          }`}>
                            {st.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                              <span>{st.name}</span>
                              {isAnurag && (
                                <span className="px-1.5 py-0.2 bg-amber-500 text-white text-[9px] font-black rounded uppercase">
                                  Lead Dossier
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              Aadhar Name: <span className="font-semibold text-slate-700 dark:text-slate-300">{st.aadharName || st.name}</span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              Aadhar No: {aadhaarText(st)}
                            </div>
                            {getMissing(st).length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(st)}
                                title={getMissing(st).map((k) => MISSING_LABEL[k] ?? k).join(', ')}
                                className="mt-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold hover:bg-amber-200 dark:hover:bg-amber-900 cursor-pointer"
                              >
                                {getMissing(st).length} missing · Add details
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Class & Roll */}
                      <td className="p-3">
                        <div className="space-y-0.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            {st.branch} · Year {st.year} (Sem {st.semester})
                          </span>
                          <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                            UBTER: {st.ubterRollNumber || st.rollNo}
                          </div>
                        </div>
                      </td>

                      {/* Contact & Mobile */}
                      <td className="p-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200 font-mono">
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{st.phone || '—'}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                            {st.email}
                          </div>
                          <div className="text-[10px] font-semibold text-slate-500">
                            Att: <span className={(getAttendancePercent(st.id) ?? 0) >= 75 ? 'text-emerald-600 font-bold' : getAttendancePercent(st.id) === null ? 'text-slate-400 font-bold' : 'text-rose-600 font-bold'}>
                              {getAttendancePercent(st.id) === null ? '—' : `${getAttendancePercent(st.id)}%`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Academic Performance */}
                      <td className="p-3">
                        <div className="space-y-1 text-[11px]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500">10th %:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{pct(st.tenthPercentage)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500">12th %:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{pct(st.twelfthPercentage)}</span>
                          </div>
                          {st.secondYearCgpa && (
                            <div className="flex items-center justify-between gap-2 bg-emerald-50 dark:bg-emerald-950/40 px-1 rounded">
                              <span className="text-emerald-700 dark:text-emerald-300 font-bold">2nd Yr CGPA:</span>
                              <span className="font-black text-emerald-700 dark:text-emerald-300">{st.secondYearCgpa}</span>
                            </div>
                          )}
                          {st.firstYearCgpa && !st.secondYearCgpa && (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-blue-700 font-bold">1st Yr:</span>
                              <span className="font-black text-blue-700">{st.firstYearCgpa}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Semester Marks (1st to 4th) */}
                      <td className="p-3">
                        <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                            S1: {pct(st.semestersPercentage?.sem1)}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                            S2: {pct(st.semestersPercentage?.sem2)}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-bold">
                            S3: {pct(st.semestersPercentage?.sem3)}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 font-bold">
                            S4: {pct(st.semestersPercentage?.sem4)}
                          </span>
                        </div>
                      </td>

                      {/* Parent & Address */}
                      <td className="p-3 text-[11px]">
                        <div className="space-y-0.5 max-w-[190px]">
                          <div className="text-slate-800 dark:text-slate-200 font-semibold truncate">
                            M: {txt(st.motherName)} | F: {txt(st.fatherName)}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-[10px] flex items-start gap-1 line-clamp-2">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                            <span>{st.fullAddress || 'Bhindara, Majhola, Pilibhit, Uttar Pradesh'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Track Record Status */}
                      <td className="p-3">
                        <button
                          onClick={() => handleOpenStatusModal(st)}
                          className="group text-left cursor-pointer"
                          title="Click to track or update record status"
                        >
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-transform group-hover:scale-105 ${
                            st.recordStatus === 'Placement Ready'
                              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300'
                              : st.recordStatus === 'Documents Verified'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                              : st.recordStatus === 'Fee Cleared'
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300'
                          }`}>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{st.recordStatus || 'Active / Enrolled'}</span>
                          </span>
                          <span className="block text-[9px] text-slate-400 mt-0.5 group-hover:text-blue-500">
                            Click to update ✎
                          </span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleStartEdit(st)}
                            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:hover:bg-amber-900 dark:text-amber-300 transition-colors cursor-pointer"
                            title="Edit Student Academic & Personal Record"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenDirectNotice(st)}
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900 dark:text-blue-300 transition-colors cursor-pointer"
                            title="Send Direct Targeted Notice to this student"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setViewingStudent(st)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 transition-colors cursor-pointer"
                            title="View Full Dossier"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete ${st.name} from the student database?`)) {
                                deleteStudent(st.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:hover:bg-rose-900 dark:text-rose-400 transition-colors cursor-pointer"
                            title="Delete Student Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
      ) : (
        /* SPREADSHEET / EXCEL SHEET GRID VIEW */
        <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-emerald-500/40 shadow-lg overflow-hidden animate-in fade-in">
          {/* Excel Style Ribbon Header */}
          <div className="p-4 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
                <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm sm:text-base">
                    STUDENT_MASTER_DATABASE_{selectedYear === 'all' ? 'ALL_YEARS' : `YEAR_${selectedYear}`}.XLSX
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 text-emerald-100">
                    Live Excel Grid
                  </span>
                </div>
                <p className="text-[11px] text-emerald-200">
                  Direct spreadsheet records with real-time editing, deletion, and insertion capabilities.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3.5 py-2 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4 text-emerald-700" />
                <span>+ Insert Student Row</span>
              </button>
              <ExportMenu build={buildClassExport} />
            </div>
          </div>

          {/* Excel Spreadsheet Table */}
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-[11px] font-mono border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase text-[10px] sticky top-0 z-10 border-b-2 border-slate-300 dark:border-slate-600">
                <tr>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-600 text-center w-12 bg-slate-200 dark:bg-slate-600">Row</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-600">A: College Roll</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-600">B: UBTER Roll</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-600">C: Student Name</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-600">D: Aadhar Name</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-600">E: Branch</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-600">F: Year</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-600">G: Mobile Phone</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-600">H: 10th %</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-600">I: 12th %</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-600">J: 1st Yr CGPA</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-600">K: 2nd Yr CGPA</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-600">L: S1 %</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-600">M: S2 %</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-600">N: S3 %</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-600">O: S4 %</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-600">P: Attendance</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-600">Q: Father Name</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-600">R: Mother Name</th>
                  <th className="p-2 border-r border-slate-200 dark:border-slate-600">S: Status</th>
                  <th className="p-2 text-center sticky right-0 bg-slate-100 dark:bg-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {filteredStudents.map((st, idx) => (
                  <tr
                    key={st.id}
                    className="hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors"
                  >
                    <td className="p-2 text-center text-slate-400 bg-slate-50 dark:bg-slate-800 font-bold border-r border-slate-200 dark:border-slate-700">
                      {idx + 1}
                    </td>
                    <td className="p-2 font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700">
                      {st.rollNo}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                      {st.ubterRollNumber || st.rollNo}
                    </td>
                    <td className="p-2 font-bold text-blue-700 dark:text-blue-300 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">
                      {st.name}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">
                      {st.aadharName || st.name}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center font-bold">
                      {st.branch || 'CSE'}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center font-bold">
                      Y{st.year || 2}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 font-bold text-emerald-600">
                      {st.phone || '—'}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center">
                      {pct(st.tenthPercentage)}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center">
                      {pct(st.twelfthPercentage)}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-blue-600">
                      {txt(st.firstYearCgpa)}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-blue-600">
                      {txt(st.secondYearCgpa)}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center">
                      {pct(st.semestersPercentage?.sem1)}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center">
                      {pct(st.semestersPercentage?.sem2)}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center">
                      {pct(st.semestersPercentage?.sem3)}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center">
                      {pct(st.semestersPercentage?.sem4)}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 text-center font-bold text-emerald-600">
                      {getAttendancePercent(st.id) === null ? '—' : `${getAttendancePercent(st.id)}%`}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">
                      {txt(st.fatherName)}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">
                      {txt(st.motherName)}
                    </td>
                    <td className="p-2 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700">
                        {st.recordStatus || 'Active / Enrolled'}
                      </span>
                    </td>
                    <td className="p-2 text-center sticky right-0 bg-white dark:bg-slate-800 shadow-xs">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleStartEdit(st)}
                          className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] cursor-pointer"
                          title="Edit Row"
                        >
                          ✎ Edit
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete row for ${st.name}?`)) {
                              deleteStudent(st.id);
                            }
                          }}
                          className="px-1.5 py-1 rounded bg-rose-500 hover:bg-rose-600 text-white font-bold text-[10px] cursor-pointer"
                          title="Delete Row"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TARGETED DIRECT NOTICE MODAL (ONE-ON-ONE NOTICE) */}
      {directNoticeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Send Direct Notice to Student
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Recipient: <span className="font-bold text-blue-600">{directNoticeTarget.name}</span> (Roll: {directNoticeTarget.rollNo})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDirectNoticeTarget(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {noticeSentToast ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="font-bold text-emerald-800 dark:text-emerald-200 text-sm">
                  Direct Notice Successfully Dispatched!
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Notification and SMS alert delivered to {directNoticeTarget.name}.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendDirectNotice} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Notice Subject / Title
                  </label>
                  <input
                    type="text"
                    value={noticeTitle}
                    onChange={(e) => setNoticeTitle(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                    placeholder="e.g. Sessional II Submission Pending / Fee Clearance"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Priority Level
                  </label>
                  <select
                    value={noticePriority}
                    onChange={(e) => setNoticePriority(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                  >
                    <option value="normal">Normal Information Notice</option>
                    <option value="urgent">Urgent Reminder</option>
                    <option value="critical">Critical / Mandatory Action</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Direct Message Content
                  </label>
                  <textarea
                    rows={4}
                    value={noticeMessage}
                    onChange={(e) => setNoticeMessage(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                    placeholder="Enter message specifically intended for this student..."
                    required
                  />
                </div>

                {noticeError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 font-bold">
                    {noticeError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setDirectNoticeTarget(null); setNoticeError(''); }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Targeted Notice</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 6. STATUS UPDATE & AUDIT HISTORY MODAL */}
      {statusModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Update Record Status: {statusModalTarget.name}
                </h3>
                <p className="text-[11px] text-slate-500">
                  UBTER Roll: {statusModalTarget.ubterRollNumber || statusModalTarget.rollNo} · {statusModalTarget.branch} Year {statusModalTarget.year}
                </p>
              </div>
              <button
                onClick={() => setStatusModalTarget(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStatus} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Change Status To:
                </label>
                <select
                  value={newStatusSelection}
                  onChange={(e) => setNewStatusSelection(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value="Active / Enrolled">Active / Enrolled</option>
                  <option value="Documents Verified">Documents Verified</option>
                  <option value="Fee Cleared">Fee Cleared</option>
                  <option value="Placement Ready">Placement Ready</option>
                  <option value="Pending Review">Pending Review</option>
                  <option value="Passed Out">Passed Out</option>
                  <option value="Detained">Detained (not promoted)</option>
                  <option value="Year Back">Year Back (not promoted)</option>
                  <option value="Left / Dropped">Left / Dropped (not promoted)</option>
                <option value="Passed Out">Passed Out</option>
                <option value="Detained">Detained (not promoted)</option>
                <option value="Year Back">Year Back (not promoted)</option>
                <option value="Left / Dropped">Left / Dropped (not promoted)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Remarks / Audit Reason
                </label>
                <input
                  type="text"
                  value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                  placeholder="e.g. Aadhar card verified and sessional marks entered"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              {/* Status Tracking History */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Historical Status Audit Trail:
                </label>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 max-h-36 overflow-y-auto">
                  {(statusModalTarget.statusTrackHistory && statusModalTarget.statusTrackHistory.length > 0) ? (
                    statusModalTarget.statusTrackHistory.map((h, i) => (
                      <div key={i} className="text-[11px] pb-1 border-b border-slate-200 dark:border-slate-700 last:border-0">
                        <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                          <span>{h.status}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{h.changedAt}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          By: {h.changedBy} {h.remarks ? `· ${h.remarks}` : ''}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-[11px] text-slate-400">No prior status transitions logged.</div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModalTarget(null)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold cursor-pointer"
                >
                  Save Status Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. VIEW FULL STUDENT DOSSIER MODAL */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 uppercase">
                  Verified Dossier Record
                </span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white mt-1">
                  {viewingStudent.name}
                </h3>
              </div>
              <button
                onClick={() => setViewingStudent(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Aadhar Card Name</span>
                <div className="font-bold text-slate-800 dark:text-slate-200">{viewingStudent.aadharName || viewingStudent.name}</div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Mobile Number</span>
                <div className="font-bold text-slate-800 dark:text-slate-200 font-mono">{viewingStudent.phone || '—'}</div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">UBTER Roll Number</span>
                <div className="font-bold text-slate-800 dark:text-slate-200 font-mono">{viewingStudent.ubterRollNumber || viewingStudent.rollNo}</div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Aadhar Number</span>
                <div className="font-bold text-slate-800 dark:text-slate-200 font-mono">{aadhaarText(viewingStudent)}</div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">10th Percentage</span>
                <div className="font-bold text-slate-800 dark:text-slate-200">{pct(viewingStudent.tenthPercentage)}</div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">12th Percentage</span>
                <div className="font-bold text-slate-800 dark:text-slate-200">{pct(viewingStudent.twelfthPercentage)}</div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">1st Year % / CGPA</span>
                <div className="font-bold text-blue-600">{txt(viewingStudent.firstYearCgpa)}</div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">2nd Year % / CGPA</span>
                <div className="font-bold text-emerald-600">{txt(viewingStudent.secondYearCgpa)}</div>
              </div>
            </div>

            {/* Semester Marks */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2 text-xs">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Har Semester ka % (1st to 4th Sem)</span>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-white dark:bg-slate-700 p-2 rounded-lg border border-slate-200 dark:border-slate-600">
                  <div className="text-[10px] text-slate-400">1st Sem</div>
                  <div className="font-bold text-slate-800 dark:text-slate-100">{pct(viewingStudent.semestersPercentage?.sem1)}</div>
                </div>
                <div className="bg-white dark:bg-slate-700 p-2 rounded-lg border border-slate-200 dark:border-slate-600">
                  <div className="text-[10px] text-slate-400">2nd Sem</div>
                  <div className="font-bold text-slate-800 dark:text-slate-100">{pct(viewingStudent.semestersPercentage?.sem2)}</div>
                </div>
                <div className="bg-white dark:bg-slate-700 p-2 rounded-lg border border-slate-200 dark:border-slate-600">
                  <div className="text-[10px] text-slate-400">3rd Sem</div>
                  <div className="font-bold text-blue-600">{pct(viewingStudent.semestersPercentage?.sem3)}</div>
                </div>
                <div className="bg-white dark:bg-slate-700 p-2 rounded-lg border border-slate-200 dark:border-slate-600">
                  <div className="text-[10px] text-slate-400">4th Sem</div>
                  <div className="font-bold text-emerald-600">{pct(viewingStudent.semestersPercentage?.sem4)}</div>
                </div>
              </div>
            </div>

            {/* Parents & Address */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1.5 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Parents Information</span>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  Mother: <span className="font-bold">{txt(viewingStudent.motherName)}</span> | Father: <span className="font-bold">{txt(viewingStudent.fatherName)}</span>
                </div>
              </div>
              <div className="pt-1 border-t border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Poora Address</span>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  {txt(viewingStudent.fullAddress)}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingStudent(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. ADD / EDIT STUDENT (one shared form; blank details are marked "Missing") */}
      {(showAddModal || editingStudent) && (
        <StudentRecordForm
          key={editingStudent?.id ?? 'new-student'}
          student={editingStudent}
          canRevealAadhaar={currentUser.role === 'admin'}
          takenRollNos={studentsList.filter((u) => u.id !== editingStudent?.id).flatMap((u) => [u.rollNo, u.ubterRollNumber]).filter((x): x is string => !!x)}
          onClose={() => { setShowAddModal(false); setEditingStudent(null); }}
          onSave={handleSaveRecord}
        />
      )}
    </div>
  );
};
