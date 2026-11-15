// ===================================================================================================
// Faculty daily punch-in / punch-out (staff gate register).
// ===================================================================================================
import React, { useState, useRef, useEffect } from 'react';
import { useCollege } from '../../context/CollegeContext';
import QRCode from 'qrcode';
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  Building2,
  Clock,
  MapPin,
  Sparkles,
  ShieldCheck,
  Download,
  X,
  UserCheck,
  Fingerprint,
  CreditCard,
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';

// Data shape: faculty punch modal props.
interface FacultyPunchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Screen part: faculty punch modal.
export const FacultyPunchModal: React.FC<FacultyPunchModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    users,
    facultyPunches,
    punchFacultyAttendance,
    getFacultyTodayPunch,
  } = useCollege();

  // The staff id chosen by the user (filter / list selection)
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    currentUser.role === 'student' ? 'fac-hod-cse' : currentUser.id
  );
  // Punch method (kept in screen state)
  const [punchMethod, setPunchMethod] = useState<'QR Scan' | 'Staff Badge' | 'Biometric' | 'Manual'>('QR Scan');
  // Punch location (kept in screen state)
  const [punchLocation, setPunchLocation] = useState<string>('UGIP Academic Gate - Scanner #01');
  // Feedback (kept in screen state)
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const staffMembers = users.filter((u) => u.role === 'faculty' || u.role === 'admin');
  const selectedStaff = staffMembers.find((s) => s.id === selectedStaffId) || staffMembers[0];
  const todayPunch = selectedStaff ? getFacultyTodayPunch(selectedStaff.id) : undefined;

  const facultyQRPayload = JSON.stringify({
    type: 'UGIP_STAFF',
    id: selectedStaff?.id,
    name: selectedStaff?.name,
    designation: selectedStaff?.designation,
    department: selectedStaff?.department || selectedStaff?.branch,
    institution: 'Uttarakhand Government Institute of Polytechnic',
  });

  // Runs automatically whenever these change: facultyQRPayload, selectedStaff.
  useEffect(() => {
    if (canvasRef.current && selectedStaff) {
      QRCode.toCanvas(
        canvasRef.current,
        facultyQRPayload,
        {
          width: 170,
          margin: 1.5,
          color: {
            dark: '#1e3a8a',
            light: '#ffffff',
          },
        },
        (err) => {
          if (err) console.error('Faculty QR Error:', err);
        }
      );
    }
  }, [facultyQRPayload, selectedStaff]);

  if (!isOpen) return null;

  // Runs when the user does this on screen: punch.
  const handlePunch = () => {
    if (!selectedStaff) return;
    const res = punchFacultyAttendance(selectedStaff.id, punchMethod, punchLocation);
    setFeedback({
      success: res.success,
      message: res.message,
    });
  };

  // Runs when the user does this on screen: download staff qr.
  const handleDownloadStaffQR = () => {
    if (canvasRef.current && selectedStaff) {
      const url = canvasRef.current.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `UGIP_Staff_QR_${selectedStaff.name.replace(/\s+/g, '_')}.png`;
      a.click();
    }
  };

  return (
    <div
      id="faculty-punch-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in"
    >
      <div
        id="faculty-punch-modal-content"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-950 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-400/30">
              <Building2 className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-600/40 text-blue-200">
                  Govt of Uttarakhand
                </span>
                <span className="text-xs text-slate-300">Staff & Faculty Attendance</span>
              </div>
              <h3 className="font-bold text-lg text-white">Daily Campus Staff Gate Register</h3>
            </div>
          </div>
          <button
            id="close-faculty-punch-modal-btn"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Select Staff Member */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Select Staff / Faculty Member:
                </label>
                <select
                  id="faculty-punch-staff-select"
                  value={selectedStaffId}
                  onChange={(e) => {
                    setSelectedStaffId(e.target.value);
                    setFeedback(null);
                  }}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold rounded-lg px-3 py-2"
                >
                  {staffMembers.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} — {staff.designation} ({staff.department || staff.branch})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Pill */}
              <div className="text-right shrink-0">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Today's Entry Status:</span>
                {todayPunch ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    In: {todayPunch.inTime} {todayPunch.outTime ? ` · Out: ${todayPunch.outTime}` : ' · Active on Campus'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 mt-0.5">
                    <Clock className="w-3.5 h-3.5" /> Not Punched In Yet
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Feedback alert */}
          {feedback && (
            <div
              id="faculty-punch-feedback"
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                feedback.success
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-200'
                  : 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-200'
              }`}
            >
              {feedback.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-semibold">{feedback.message}</div>
            </div>
          )}

          {/* Staff ID Badge & Campus Entry Details */}
          {selectedStaff && (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center bg-slate-900 text-white p-5 rounded-2xl border border-slate-800">
              <div className="sm:col-span-8 space-y-3">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={selectedStaff.name}
                    avatar={selectedStaff.avatar}
                    role={selectedStaff.role}
                    size="lg"
                  />
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/30 text-blue-300 uppercase">
                      {selectedStaff.department || selectedStaff.branch || 'Academic Faculty'}
                    </span>
                    <h4 className="text-base font-bold text-white mt-0.5">{selectedStaff.name}</h4>
                    <p className="text-xs text-slate-300 font-semibold">{selectedStaff.designation}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-white/5 p-3 rounded-xl border border-white/10">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Campus Gate Scanner</span>
                    <span className="font-semibold text-blue-200">{punchLocation}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Verification Mode</span>
                    <span className="font-semibold text-emerald-300 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> {punchMethod}
                    </span>
                  </div>
                </div>
              </div>

              {/* QR Canvas */}
              <div className="sm:col-span-4 flex flex-col items-center justify-center text-center bg-white/5 p-3 rounded-xl border border-white/10">
                <div className="p-2 bg-white rounded-xl shadow-md border-2 border-blue-400">
                  <canvas ref={canvasRef} className="mx-auto rounded" />
                </div>
                <button
                  id="download-staff-qr-badge-btn"
                  onClick={handleDownloadStaffQR}
                  className="mt-2.5 px-3 py-1 bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Download className="w-3 h-3" /> Save Staff QR
                </button>
              </div>
            </div>
          )}

          {/* Punch Configuration Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Punch / Scanning Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'QR Scan', label: 'QR Scan', icon: QrCode },
                  { id: 'Staff Badge', label: 'Staff Card', icon: CreditCard },
                  { id: 'Biometric', label: 'Biometric', icon: Fingerprint },
                  { id: 'Manual', label: 'Gate Register', icon: UserCheck },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSel = punchMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPunchMethod(m.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                        isSel
                          ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/40 dark:border-blue-500 dark:text-blue-300 ring-2 ring-blue-500/20'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSel ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Campus Location Terminal
              </label>
              <select
                id="faculty-punch-location-select"
                value={punchLocation}
                onChange={(e) => setPunchLocation(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-900 dark:text-white"
              >
                <option value="UGIP Academic Gate - Scanner #01">UGIP Main Academic Gate #01</option>
                <option value="CSE Department Faculty Lounge">CSE Dept Faculty Lounge Terminal</option>
                <option value="Principal Office / Admin Block Entry">Principal Office / Admin Block Terminal</option>
                <option value="Central Mechanical Workshop Entry">Central Mechanical Workshop Terminal</option>
                <option value="Central Library & Reading Room">Central Library & Reading Room Terminal</option>
              </select>

              <button
                id="faculty-trigger-punch-btn"
                onClick={handlePunch}
                className="mt-2.5 w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {todayPunch
                    ? !todayPunch.outTime
                      ? 'Record Evening Punch-OUT'
                      : 'Both In/Out Punches Recorded'
                    : 'Record Morning Punch-IN Now'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/70 px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Uttarakhand Government Institute of Polytechnic · Biometric & Gate System</span>
          <button
            id="done-faculty-punch-btn"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
