// ===================================================================================================
// Camera QR scanner used by students (attendance and other QR codes).
// ===================================================================================================
import React, { useState, useMemo, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { useCollege } from '../../context/CollegeContext';
import { UserProfile, BranchCode, Subject, AttendanceSession } from '../../types';
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
  Clock,
  ChevronRight,
  ShieldCheck,
  Info,
  BookOpen,
  Check,
  AlertTriangle,
  Upload,
  RefreshCw,
  Video,
  Volume2,
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { PhotoUploadModal } from './PhotoUploadModal';

// Data shape: student qr scanner modal props.
interface StudentQRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  scannerRole?: 'admin' | 'faculty';
  facultyName?: string;
}

// Screen part: student qr scanner modal.
export const StudentQRScannerModal: React.FC<StudentQRScannerModalProps> = ({
  isOpen,
  onClose,
  scannerRole = 'faculty',
  facultyName,
}) => {
  const {
    currentUser,
    users,
    subjects,
    attendanceSessions,
    createAttendanceSession,
    manualUpdateAttendance,
    getStudentSummary,
  } = useCollege();

  // The branch chosen by the user (filter / list selection)
  const [selectedBranch, setSelectedBranch] = useState<BranchCode>('CSE');
  // The year chosen by the user (filter / list selection)
  const [selectedYear, setSelectedYear] = useState<number>(2);
  // The semester chosen by the user (filter / list selection)
  const [selectedSemester, setSelectedSemester] = useState<number>(4);
  // The subject id chosen by the user (filter / list selection)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  // Lecture date (kept in screen state)
  const [lectureDate, setLectureDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  // Lecture period (kept in screen state)
  const [lecturePeriod, setLecturePeriod] = useState<string>('Slot 3: 11:30 AM - 12:30 PM');

  // Input code (kept in screen state)
  const [inputCode, setInputCode] = useState('');
  // The student chosen by the user (filter / list selection)
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
  // Is it camera active? (true / false)
  const [isCameraActive, setIsCameraActive] = useState(false);
  // Is it scanning active? (true / false)
  const [isScanningActive, setIsScanningActive] = useState(false);
  // Text typed in the search box
  const [filterSearch, setFilterSearch] = useState('');
  // Status message (kept in screen state)
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  // Photo modal student (kept in screen state)
  const [photoModalStudent, setPhotoModalStudent] = useState<UserProfile | null>(null);
  // Which tab is open right now
  const [activeTab, setActiveTab] = useState<'scanner' | 'liveRegister'>('scanner');
  // Scan sound enabled (kept in screen state)
  const [scanSoundEnabled, setScanSoundEnabled] = useState(true);

  // Video & Canvas Refs for Real Camera Scanning
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const studentsList = users.filter((u) => u.role === 'student');

  // Available subjects filtered by branch and semester
  const availableSubjects = useMemo(() => {
    const matched = subjects.filter(
      (s) => s.branch === selectedBranch && s.semester === selectedSemester
    );
    return matched.length > 0 ? matched : subjects;
  }, [subjects, selectedBranch, selectedSemester]);

  const currentSubject: Subject | undefined = useMemo(() => {
    if (selectedSubjectId) {
      const found = subjects.find((s) => s.id === selectedSubjectId);
      if (found) return found;
    }
    return availableSubjects[0] || subjects[0];
  }, [selectedSubjectId, availableSubjects, subjects]);

  const currentSubjectSession: AttendanceSession | undefined = useMemo(() => {
    if (!currentSubject) return undefined;
    return (
      attendanceSessions.find(
        (s) =>
          s.subjectId === currentSubject.id &&
          s.date === lectureDate &&
          s.status === 'Active'
      ) ||
      attendanceSessions.find(
        (s) => s.subjectId === currentSubject.id && s.date === lectureDate
      ) ||
      attendanceSessions.find((s) => s.subjectId === currentSubject.id) ||
      attendanceSessions[0]
    );
  }, [attendanceSessions, currentSubject, lectureDate]);

  // Audio chime on successful QR scan
  const playBeep = () => {
    if (!scanSoundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {
      // AudioContext fallback
    }
  };

  // Robust Resolver supporting JSON payload from StudentQRCodeCard, roll no, name, ID
  const resolveStudent = (query: string): UserProfile | null => {
    const trimmed = (query || '').trim();
    if (!trimmed) return null;

    let targetId = trimmed;
    let targetRoll = trimmed;
    let targetName = '';

    // Check if query is JSON string from generated student QR
    try {
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || trimmed.includes('"type"') || trimmed.includes('UGIP')) {
        const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.id) targetId = parsed.id;
          if (parsed.rollNo) targetRoll = parsed.rollNo;
          if (parsed.name) targetName = parsed.name;
        }
      }
    } catch (e) {}

    const byIdOrRoll = studentsList.find(
      (s) =>
        s.id.toLowerCase() === targetId.toLowerCase() ||
        (s.rollNo && (s.rollNo.toLowerCase() === targetRoll.toLowerCase() || s.rollNo.toLowerCase() === trimmed.toLowerCase())) ||
        (s.enrollmentNo && (s.enrollmentNo.toLowerCase() === targetId.toLowerCase() || s.enrollmentNo.toLowerCase() === trimmed.toLowerCase()))
    );
    if (byIdOrRoll) return byIdOrRoll;

    if (targetName) {
      const byNameFromJson = studentsList.find(s => s.name.toLowerCase().includes(targetName.toLowerCase()));
      if (byNameFromJson) return byNameFromJson;
    }

    const byName = studentsList.find(
      (s) => s.name.toLowerCase().includes(trimmed.toLowerCase())
    );
    return byName || null;
  };

  // Runs when the user does this on screen: inspect student.
  const handleInspectStudent = (student: UserProfile) => {
    setSelectedStudent(student);
    setStatusMessage({
      type: 'info',
      text: `Inspecting: ${student.name} (Roll: ${student.rollNo || 'N/A'})`,
    });
  };

  // Start Real Webcam QR Scanner with robust fallback
  const startCamera = async () => {
    setStatusMessage(null);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch (firstErr) {
        // Fallback to basic video stream for laptop webcams without environment camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
      setIsScanningActive(true);
      requestAnimationFrame(scanVideoLoop);
    } catch (err: any) {
      console.warn('Live camera error:', err);
      setStatusMessage({
        type: 'error',
        text: 'Camera access denied or webcam not detected. You can upload student QR images or select any student below to scan!',
      });
      setIsCameraActive(false);
    }
  };

  // Stop camera.
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsCameraActive(false);
    setIsScanningActive(false);
  };

  // QR Scanning Loop using jsQR with bidirectional inversion
  const scanVideoLoop = () => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) return;
    const video = videoRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (code && code.data) {
          const matched = resolveStudent(code.data);
          if (matched) {
            playBeep();
            handleInspectStudent(matched);
            setStatusMessage({
              type: 'success',
              text: `Scanned QR for ${matched.name} (Roll: ${matched.rollNo})! You can now mark attendance.`,
            });
            // Stop scanning once verified
            stopCamera();
            return;
          }
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanVideoLoop);
  };

  // Upload QR Image to Decode
  const handleUploadQRImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code && code.data) {
            const matched = resolveStudent(code.data);
            if (matched) {
              playBeep();
              handleInspectStudent(matched);
              setStatusMessage({
                type: 'success',
                text: `Successfully Decoded Image QR: ${matched.name} (Roll: ${matched.rollNo})!`,
              });
              return;
            }
          }

          setStatusMessage({
            type: 'error',
            text: 'Could not detect a valid UGIP student QR code in uploaded image. Please ensure photo is clear.',
          });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Returns the or create session.
  const getOrCreateSession = async (): Promise<AttendanceSession | undefined> => {
    if (!currentSubject) return undefined;
    const existing = attendanceSessions.find(
      (s) =>
        s.subjectId === currentSubject.id &&
        s.date === lectureDate &&
        s.status === 'Active'
    );
    if (existing) return existing;
    const created = await createAttendanceSession({
      subjectId: currentSubject.id,
      subjectCode: currentSubject.code,
      subjectName: currentSubject.name,
      facultyId: currentUser.id,
      facultyName: facultyName || currentUser.name,
      branch: currentSubject.branch,
      semester: currentSubject.semester as any,
      date: lectureDate,
      timeSlot: lecturePeriod,
      topicTaught: `Unit 3: Core concepts in ${currentSubject.name}`,
    });
    return created || undefined;
  };

  // Runs when the user does this on screen: scan input submit.
  const handleScanInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    const stu = resolveStudent(inputCode);
    if (stu) {
      playBeep();
      handleInspectStudent(stu);
      setInputCode('');
    } else {
      setStatusMessage({
        type: 'error',
        text: `Student not found for input: "${inputCode}". Verify Roll Number or Name.`,
      });
    }
  };

  // Runs when the user does this on screen: mark subject attendance.
  const handleMarkSubjectAttendance = async (status: 'Present' | 'Late' | 'Absent') => {
    if (!selectedStudent || !currentSubject) return;
    const targetSession = (await getOrCreateSession()) || currentSubjectSession;
    if (!targetSession) {
      setStatusMessage({
        type: 'error',
        text: `Could not initialize attendance session for ${currentSubject.name}.`,
      });
      return;
    }
    const saved = await manualUpdateAttendance(targetSession.id, selectedStudent.id, status);
    if (!saved) {
      setStatusMessage({ type: 'error', text: `Attendance was NOT saved for ${selectedStudent.name} (the server refused; see the notification for the reason).` });
      return;
    }
    playBeep();
    setStatusMessage({
      type: 'success',
      text: `Attendance recorded (${status}) for ${selectedStudent.name} in [${currentSubject.code}] ${currentSubject.name}!`,
    });
  };

  const studentSummary = selectedStudent ? getStudentSummary(selectedStudent.id) : null;

  const filteredStudents = studentsList.filter((s) => {
    return (
      s.name.toLowerCase().includes(filterSearch.toLowerCase()) ||
      (s.rollNo && s.rollNo.includes(filterSearch)) ||
      (s.branch && s.branch.toLowerCase().includes(filterSearch.toLowerCase()))
    );
  });

  return (
    <div
      id="student-qr-scanner-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in overflow-y-auto"
    >
      <div
        id="student-qr-scanner-modal-content"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[96vh]"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-5 sm:px-6 py-4 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl border border-white/20 shadow-inner">
              <Camera className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  {scannerRole === 'admin' ? 'Admin Authority' : 'Faculty Incharge'}
                </span>
                <span className="text-xs text-blue-200 hidden sm:inline">
                  Subject-Wise & Year-Wise Student QR Scanner (Live Camera & File)
                </span>
              </div>
              <h3 className="font-extrabold text-base sm:text-lg text-white">
                Student QR Scanner & Details Inspector
              </h3>
            </div>
          </div>
          <button
            id="close-student-qr-scanner-btn"
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOP BAR: Class, Subject, Year & Semester Configuration */}
        <div className="bg-slate-100 dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Class & Lecture Configuration
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('scanner')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'scanner'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Scan & Inspect
              </button>
              <button
                onClick={() => setActiveTab('liveRegister')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'liveRegister'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <span>Class Session Register</span>
                <span className="px-1.5 py-0.2 bg-emerald-500 text-white text-[10px] rounded-full">
                  {currentSubjectSession?.records.length || 0}
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Branch
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value as BranchCode)}
                className="w-full p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-600 font-bold rounded-xl focus:border-blue-600 shadow-xs cursor-pointer"
              >
                <option value="CSE">CSE</option>
                <option value="Civil">Civil</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => {
                  const yr = Number(e.target.value);
                  setSelectedYear(yr);
                  setSelectedSemester(yr === 1 ? 2 : yr === 2 ? 4 : 6);
                }}
                className="w-full p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-600 font-bold rounded-xl focus:border-blue-600 shadow-xs cursor-pointer"
              >
                <option value={1}>1st Year</option>
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Semester
              </label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(Number(e.target.value))}
                className="w-full p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-600 font-bold rounded-xl focus:border-blue-600 shadow-xs cursor-pointer"
              >
                {selectedYear === 1 ? (
                  <>
                    <option value={1}>Semester 1</option>
                    <option value={2}>Semester 2</option>
                  </>
                ) : selectedYear === 2 ? (
                  <>
                    <option value={3}>Semester 3</option>
                    <option value={4}>Semester 4</option>
                  </>
                ) : (
                  <>
                    <option value={5}>Semester 5</option>
                    <option value={6}>Semester 6</option>
                  </>
                )}
              </select>
            </div>

            <div className="col-span-2 sm:col-span-2">
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Subject
              </label>
              <select
                value={currentSubject?.id || ''}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-600 font-bold rounded-xl focus:border-blue-600 shadow-xs cursor-pointer"
              >
                {availableSubjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    [{sub.code}] {sub.name} (Credits: {sub.credits})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs font-medium flex items-start gap-2.5 transition-all ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 text-rose-900 border border-rose-300 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800'
                  : 'bg-blue-50 text-blue-900 border border-blue-300 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">{statusMessage.text}</div>
            </div>
          )}

          {activeTab === 'liveRegister' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Live Register: [{currentSubject?.code}] {currentSubject?.name}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Session Date: {lectureDate} · {selectedYear} Year / Sem {selectedSemester} ({selectedBranch})
                  </p>
                </div>
                <span className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-xs font-bold">
                  {currentSubjectSession?.records.length || 0} Students Marked
                </span>
              </div>
              {!currentSubjectSession || currentSubjectSession.records.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-2">
                  <UserCheck className="w-8 h-8 text-blue-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No students marked present yet for this subject today.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {currentSubjectSession.records.map((rec, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <div>
                          <h5 className="font-bold text-slate-900 dark:text-white">
                            {rec.studentName}
                          </h5>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            Roll: {rec.rollNo} · Marked: {rec.timestamp} ({rec.markedVia})
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {rec.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Selected Student Card */}
              {selectedStudent && (
                <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 text-white p-5 rounded-2xl border border-slate-700 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                        Official Student Academic Profile
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedStudent(null)}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 text-xs"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                    <div className="md:col-span-5 flex items-center gap-4">
                      <UserAvatar
                        name={selectedStudent.name}
                        avatar={selectedStudent.avatar}
                        role={selectedStudent.role}
                        size="xl"
                      />
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/30 text-blue-300 uppercase">
                          {selectedStudent.branch} · Year {selectedStudent.year || 2} (Sem {selectedStudent.semester})
                        </span>
                        <h4 className="text-lg font-bold text-white mt-1 leading-snug">
                          {selectedStudent.name}
                        </h4>
                        <p className="text-xs font-mono text-blue-300">
                          Roll: <span className="font-bold text-white">{selectedStudent.rollNo || 'N/A'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="bg-white/10 p-3 rounded-xl border border-white/15 text-center">
                        <span className="text-[10px] uppercase font-bold text-blue-200 block truncate">
                          Overall Attendance
                        </span>
                        <p className="text-xl font-black text-amber-300 mt-0.5">
                          {studentSummary && studentSummary.totalClasses > 0 ? `${studentSummary.overallAttendance}%` : '–'}
                        </p>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Category</span>
                        <p className="text-base font-bold text-white mt-0.5">
                          {selectedStudent.category || 'General'}
                        </p>
                      </div>
                      <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Mobile No.</span>
                        <p className="text-xs font-bold text-white mt-1 truncate">
                          {selectedStudent.phone || '+91 98370 XXXXX'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-slate-300">
                      <span>Recording attendance for: </span>
                      <strong className="text-white">
                        [{currentSubject?.code}] {currentSubject?.name} · Year {selectedYear} (Sem {selectedSemester})
                      </strong>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleMarkSubjectAttendance('Present')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Mark Present</span>
                      </button>
                      <button
                        onClick={() => handleMarkSubjectAttendance('Late')}
                        className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <Clock className="w-4 h-4" />
                        <span>Late</span>
                      </button>
                      <button
                        onClick={() => handleMarkSubjectAttendance('Absent')}
                        className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        <span>Absent</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Real Camera Viewfinder & File QR Scanner */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-5 space-y-4">
                  <div className="bg-slate-900 rounded-2xl p-4 text-white border border-slate-800 relative overflow-hidden flex flex-col items-center justify-center min-h-[220px]">
                    {/* Live Video Camera Element */}
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full max-h-52 object-cover rounded-xl ${!isCameraActive ? 'hidden' : ''}`}
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {isCameraActive && (
                      <div className="mt-2.5 flex items-center justify-between w-full text-xs">
                        <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Align Student QR in Camera...</span>
                        </span>
                        <button
                          onClick={stopCamera}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-bold"
                        >
                          Stop Camera
                        </button>
                      </div>
                    )}

                    {!isCameraActive && (
                      <div className="space-y-3 text-center z-10 p-2">
                        <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center mx-auto text-blue-400">
                          <Camera className="w-7 h-7" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Live Camera QR Scanner</p>
                          <p className="text-[11px] text-slate-400">
                            Scan physical student ID QR code instantly
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 justify-center flex-wrap">
                          <button
                            type="button"
                            onClick={startCamera}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                          >
                            <Camera className="w-3.5 h-3.5 text-blue-200" />
                            <span>Start Camera Scan</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                          >
                            <Upload className="w-3.5 h-3.5 text-blue-300" />
                            <span>Upload QR Photo</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const sampleStu = studentsList[0];
                              if (sampleStu) {
                                playBeep();
                                handleInspectStudent(sampleStu);
                                setStatusMessage({
                                  type: 'success',
                                  text: `Test Scan Verified for ${sampleStu.name} (Roll: ${sampleStu.rollNo || ''})! Ready to mark attendance.`,
                                });
                              }
                            }}
                            className="px-3 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Test Scan Sample QR</span>
                          </button>
                          <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handleUploadQRImage}
                            className="hidden"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Manual Roll Number Search Form */}
                  <form onSubmit={handleScanInputSubmit} className="space-y-2">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Or Enter Roll No / Student ID Manually
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={inputCode}
                          onChange={(e) => setInputCode(e.target.value)}
                          placeholder="e.g. 24090050011, Diya Adhikari..."
                          className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold placeholder:text-slate-400"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm shrink-0"
                      >
                        Inspect
                      </button>
                    </div>
                  </form>
                </div>

                {/* Right: Quick Student Selector from Roster */}
                <div className="md:col-span-7 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-600" />
                      Select Student from {selectedBranch}
                    </label>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {filteredStudents.length} Students
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      placeholder="Search student by name or Roll No..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-xl font-bold placeholder:text-slate-400"
                    />
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {filteredStudents.map((stu) => {
                      const isSelected = selectedStudent?.id === stu.id;
                      return (
                        <div
                          key={stu.id}
                          onClick={() => handleInspectStudent(stu)}
                          className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 border-blue-400 dark:bg-blue-950/40 dark:border-blue-700 shadow-xs'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                          }`}
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
                                <h5 className="font-bold text-slate-900 dark:text-white">
                                  {stu.name}
                                </h5>
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                  {stu.branch}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                Roll: {stu.rollNo || 'N/A'} · Mobile: {stu.phone || 'N/A'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInspectStudent(stu);
                              }}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold"
                            >
                              Scan / Inspect
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
