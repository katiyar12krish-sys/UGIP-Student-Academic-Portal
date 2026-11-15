// ===================================================================================================
// Draws a QR code (attendance session, student ID card).
// ===================================================================================================
import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

// Data shape: qr code display props.
interface QRCodeDisplayProps {
  token: string;
  pinCode: string;
  subjectName: string;
  subjectCode: string;
  expiresAt: string;
  activeAttendeesCount: number;
}

// Screen part: qr code display.
export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  token,
  pinCode,
  subjectName,
  subjectCode,
  activeAttendeesCount,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Runs automatically whenever these change: token.
  useEffect(() => {
    if (canvasRef.current && token) {
      QRCode.toCanvas(
        canvasRef.current,
        token,
        {
          width: 240,
          margin: 2,
          color: {
            dark: '#1e3a8a',
            light: '#ffffff',
          },
        },
        (err) => {
          if (err) console.error('QR code generation error:', err);
        }
      );
    }
  }, [token]);

  return (
    <div id="qr-code-display-card" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl text-center flex flex-col items-center">
      <div className="mb-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          Live Attendance QR Active
        </span>
      </div>
      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
        {subjectName} ({subjectCode})
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Students: Scan with phone camera or enter 6-Digit PIN
      </p>

      {/* QR Canvas */}
      <div className="p-3 bg-white border-2 border-dashed border-blue-400 rounded-2xl shadow-inner mb-4 inline-block">
        <canvas ref={canvasRef} className="mx-auto rounded-lg" />
      </div>

      {/* PIN Code Backup Block */}
      <div className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 mb-4">
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
          Backup Attendance PIN
        </div>
        <div className="text-3xl font-extrabold tracking-widest text-blue-700 dark:text-blue-400 font-mono">
          {pinCode}
        </div>
      </div>

      {/* Live Attendees Counter */}
      <div className="flex items-center justify-between w-full text-xs font-medium text-slate-600 dark:text-slate-300 bg-blue-50 dark:bg-blue-950/40 px-3 py-2 rounded-lg">
        <span className="flex items-center gap-1.5">
          Marked Present Now:
        </span>
        <span className="text-sm font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded shadow-xs">
          {activeAttendeesCount} Students
        </span>
      </div>
    </div>
  );
};
