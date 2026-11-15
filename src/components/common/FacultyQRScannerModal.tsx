// ===================================================================================================
// Teacher scans students' ID-card QR codes to mark attendance in an open session.
// ===================================================================================================
import React, { useState } from 'react';
import { useCollege } from '../../context/CollegeContext';
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  Camera,
  X,
  UserCheck,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';

// Data shape: faculty qr scanner modal props.
interface FacultyQRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Screen part: faculty qr scanner modal.
export const FacultyQRScannerModal: React.FC<FacultyQRScannerModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    users,
    attendanceSessions,
    markStudentByFacultyScan,
  } = useCollege();

  // The session id chosen by the user (filter / list selection)
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  // Manual input (kept in screen state)
  const [manualInput, setManualInput] = useState('');
  // Last scanned result (kept in screen state)
  const [lastScannedResult, setLastScannedResult] = useState<{
    success: boolean;
    message: string;
    studentName?: string;
    rollNo?: string;
  } | null>(null);
  // Is it scanning? (true / false)
  const [isScanning, setIsScanning] = useState(false);
  // Text typed in the search box
  const [filterSearch, setFilterSearch] = useState('');

  if (!isOpen) return null;

  const studentsList = users.filter((u) => u.role === 'student');
  const activeSessions = attendanceSessions.filter((s) => s.status === 'Active');
  const currentSession = attendanceSessions.find((s) => s.id === selectedSessionId) || activeSessions[0] || attendanceSessions[0];

  // Runs when the user does this on screen: scan student.
  const handleScanStudent = (studentData: string, name?: string, roll?: string) => {
    setIsScanning(true);
    setTimeout(async () => {
      const res = await markStudentByFacultyScan(studentData, currentSession?.id);
      setIsScanning(false);
      setLastScannedResult({
        success: res.success,
        message: res.message,
        studentName: res.student?.name || name,
        rollNo: res.student?.rollNo || roll,
      });
    }, 400);
  };

  // Runs when the user does this on screen: manual submit.
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleScanStudent(manualInput.trim());
    setManualInput('');
  };

  const filteredStudents = studentsList.filter(
    (s) =>
      s.name.toLowerCase().includes(filterSearch.toLowerCase()) ||
      (s.rollNo && s.rollNo.includes(filterSearch)) ||
      (s.branch && s.branch.toLowerCase().includes(filterSearch.toLowerCase()))
  );

  return (
    <div
      id="faculty-qr-scanner-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in"
    >
      <div
        id="faculty-qr-scanner-modal-content"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/20">
              <Camera className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-500/40 text-blue-100">
                  Faculty Desk
                </span>
                <span className="text-xs text-blue-200">UGIP Attendance Scanner</span>
              </div>
              <h3 className="font-bold text-lg text-white">Student QR Attendance Scanner</h3>
            </div>
          </div>
          <button
            id="close-faculty-qr-scanner-btn"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Target Lecture Session Selector */}
          <div className="bg-blue-50/80 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-800/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="block text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider mb-1">
                  Active Class / Subject Session
                </label>
                <select
                  id="faculty-scanner-session-select"
                  value={currentSession?.id || ''}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-blue-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  {attendanceSessions.map((sess) => (
                    <option key={sess.id} value={sess.id}>
                      [{sess.status}] {sess.subjectCode} - {sess.subjectName} ({sess.facultyName} · PIN: {sess.pinCode})
                    </option>
                  ))}
                </select>
              </div>
              {currentSession && (
                <div className="text-right shrink-0">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Total Marked in Session:</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-800 px-3 py-1 rounded-md border border-slate-200 dark:border-slate-700 inline-block mt-0.5">
                    {currentSession.records.length} Students
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Live Scanner / Feedback Box */}
          {lastScannedResult && (
            <div
              id="faculty-scan-status-alert"
              className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                lastScannedResult.success
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800'
                  : 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800'
              }`}
            >
              {lastScannedResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-xs">
                <p className="font-bold text-sm">{lastScannedResult.message}</p>
                {lastScannedResult.studentName && (
                  <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                    Student: <span className="font-semibold">{lastScannedResult.studentName}</span> · Roll No:{' '}
                    <span className="font-mono font-bold">{lastScannedResult.rollNo}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Quick Manual Roll / QR Code Input */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Scan Student QR Code or Enter Roll No / Name
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <QrCode className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="faculty-scanner-manual-input"
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="e.g. 24090050011 or student name"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                id="faculty-scanner-submit-btn"
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" /> Mark Present
              </button>
            </div>
          </form>

          {/* Quick-Tap Student Directory for Instant Batch Scanning */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                Tap to Scan / Verify UGIP Students:
              </label>
              <span className="text-[11px] text-slate-500">Optical scanner simulation</span>
            </div>

            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="search-students-for-scan"
                type="text"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="Search by student name (Diya, Anurag, Aditya, Ritu, Muskan...) or roll no"
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {filteredStudents.map((stu) => {
                const isMarkedInCurrent = currentSession?.records.some((r) => r.studentId === stu.id);
                return (
                  <div
                    key={stu.id}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                      isMarkedInCurrent
                        ? 'bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-400 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar
                        name={stu.name}
                        avatar={stu.avatar}
                        role={stu.role}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{stu.name}</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          Roll: <span className="font-semibold text-blue-600 dark:text-blue-400">{stu.rollNo}</span> · Sem {stu.semester} ({stu.branch})
                        </p>
                      </div>
                    </div>

                    {isMarkedInCurrent ? (
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> Present
                      </span>
                    ) : (
                      <button
                        id={`scan-student-btn-${stu.id}`}
                        onClick={() => handleScanStudent(stu.id, stu.name, stu.rollNo)}
                        disabled={isScanning}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors shrink-0 cursor-pointer"
                      >
                        <Camera className="w-3 h-3" /> Scan QR
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/70 px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Lecturer: {currentUser.name}</span>
          <button
            id="done-faculty-scanning-btn"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold transition-colors cursor-pointer"
          >
            Finish Scanning
          </button>
        </div>
      </div>
    </div>
  );
};
