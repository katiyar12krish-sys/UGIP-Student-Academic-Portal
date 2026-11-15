// ===================================================================================================
// Student scans the teacher's attendance QR code (or types the PIN) to mark attendance.
// ===================================================================================================
import React, { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { useCollege } from '../../context/CollegeContext';
import { QrCode, KeyRound, CheckCircle2, AlertCircle, Sparkles, X, Camera, Upload, Volume2 } from 'lucide-react';

// Data shape: qr scanner modal props.
interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Screen part: qr scanner modal.
export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, attendanceSessions, markAttendance } = useCollege();
  // Pin code input (kept in screen state)
  const [pinCodeInput, setPinCodeInput] = useState('');
  // Status message (kept in screen state)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const punchBusy = React.useRef(false);
  const pauseScanUntil = React.useRef(0);
  // Is it camera active? (true / false)
  const [isCameraActive, setIsCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Play chime.
  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {}
  };

  // Stop camera.
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Start camera.
  const startCamera = async () => {
    setStatusMessage(null);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch (e) {
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
      requestAnimationFrame(scanVideoFrame);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: 'Camera not available. Please enter the 6-digit PIN code displayed by the teacher or upload a photo of the QR code.',
      });
      setIsCameraActive(false);
    }
  };

  // Scan video frame.
  const scanVideoFrame = () => {
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
        if (code && code.data && !punchBusy.current && Date.now() > pauseScanUntil.current) {
          punchBusy.current = true;
          playChime();
          markAttendance(code.data, currentUser.id).then((result) => {
            punchBusy.current = false;
            if (result.success) {
              setStatusMessage({ type: 'success', text: result.message });
              stopCamera();
            } else {
              pauseScanUntil.current = Date.now() + 4000;   // don't hammer the server with the same wrong code
              setStatusMessage({ type: 'error', text: result.message });
            }
          });
        }
      }
    }
    if (streamRef.current) animFrameRef.current = requestAnimationFrame(scanVideoFrame);
  };

  // Runs when the user does this on screen: upload image.
  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });
          if (code && code.data) {
            playChime();
            markAttendance(code.data, currentUser.id).then((result) => {
              setStatusMessage({ type: result.success ? 'success' : 'error', text: result.message });
            });
            return;
          }
          setStatusMessage({
            type: 'error',
            text: 'Could not detect a valid session QR code in this image. Try entering the 6-digit PIN.',
          });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Runs automatically whenever these change: isOpen.
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const activeSessions = attendanceSessions.filter((s) => s.status === 'Active');

  // Runs when the user does this on screen: pin submit.
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinCodeInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a 6-digit PIN code.' });
      return;
    }
    const result = await markAttendance(pinCodeInput.trim(), currentUser.id);
    if (result.success) {
      setStatusMessage({ type: 'success', text: result.message });
      setPinCodeInput('');
    } else {
      setStatusMessage({ type: 'error', text: result.message });
    }
  };

  return (
    <div id="qr-scanner-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div id="qr-scanner-modal-content" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <QrCode className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="font-bold text-base">QR Attendance Punch</h3>
              <p className="text-xs text-blue-100">Uttarakhand Government Institute of Polytechnic</p>
            </div>
          </div>
          <button
            id="close-qr-scanner-btn"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Student Banner */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400">Student:</span>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{currentUser.name}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 dark:text-slate-400">Roll No:</span>
              <p className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{currentUser.rollNo || ''}</p>
            </div>
          </div>

          {/* Status Alert */}
          {statusMessage && (
            <div
              id="attendance-punch-status"
              className={`p-3.5 rounded-xl text-xs font-medium flex items-start gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">{statusMessage.text}</div>
            </div>
          )}

          {/* Live Camera Scanner Viewport */}
          <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 text-white flex flex-col items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full max-h-44 object-cover rounded-lg ${!isCameraActive ? 'hidden' : ''}`}
            />
            <canvas ref={canvasRef} className="hidden" />

            {isCameraActive ? (
              <div className="mt-2 flex items-center justify-between w-full text-xs">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Point camera at teacher's QR...
                </span>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-bold"
                >
                  Stop Camera
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-2 py-1">
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Camera className="w-3.5 h-3.5 text-blue-200" />
                  <span>Open Live Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-300" />
                  <span>Upload QR Photo</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleUploadImage}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Active Sessions */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Currently Active Lecture Sessions
            </label>
            {activeSessions.length === 0 ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-center">
                <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                  No teacher has an active live session right now.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeSessions.map((sess) => {
                  const alreadyMarked = sess.records.some((r) => r.studentId === currentUser.id);
                  return (
                    <div
                      key={sess.id}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                        alreadyMarked
                          ? 'bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900'
                          : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                      }`}
                    >
                      <div className="flex-1 mr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">{sess.subjectCode}</span>
                          <span className="text-xs text-slate-600 dark:text-slate-300 truncate">{sess.subjectName}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {sess.facultyName ? `Teacher: ${sess.facultyName} · ` : ''}enter the PIN shown in class
                        </p>
                      </div>
                      {alreadyMarked ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Marked
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                          Not marked yet
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PIN Input Form */}
          <form onSubmit={handlePinSubmit} className="space-y-3">
            <div className="relative">
              <KeyRound className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                maxLength={6}
                value={pinCodeInput}
                onChange={(e) => setPinCodeInput(e.target.value)}
                placeholder="Enter 6-Digit Class PIN"
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-center text-lg font-mono font-bold tracking-widest text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" /> Punch Attendance Now
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
