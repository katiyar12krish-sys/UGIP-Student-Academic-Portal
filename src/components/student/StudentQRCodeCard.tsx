// ===================================================================================================
// Student ID card with a QR code (scanned by the teacher for attendance).
// ===================================================================================================
import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { UserProfile } from '../../types';
import { Download, CheckCircle2, ShieldCheck, Building2, UserCheck, Smartphone, Camera, QrCode } from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { PhotoUploadModal } from '../common/PhotoUploadModal';

// Data shape: student qr code card props.
interface StudentQRCodeCardProps {
  student: UserProfile;
  onScanLectureQR?: () => void;
}

// Screen part: student qr code card.
export const StudentQRCodeCard: React.FC<StudentQRCodeCardProps> = ({ student, onScanLectureQR }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Copied (kept in screen state)
  const [copied, setCopied] = useState(false);
  // Is it photo modal open? (true / false)
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  const studentQRPayload = JSON.stringify({
    type: 'UGIP_STUDENT',
    id: student.id,
    rollNo: student.rollNo || '',
    name: student.name,
    branch: student.branch || 'CSE',
    semester: student.semester || 3,
    enrollmentNo: student.enrollmentNo || '',
  });

  // Runs automatically whenever these change: studentQRPayload.
  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        studentQRPayload,
        {
          width: 200,
          margin: 1.5,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        (err) => {
          if (err) console.error('Student QR Error:', err);
        }
      );
    }
  }, [studentQRPayload]);

  // Runs when the user does this on screen: download qr.
  const handleDownloadQR = () => {
    if (canvasRef.current) {
      const url = canvasRef.current.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `UGIP_ID_QR_${student.rollNo || student.name.replace(/\s+/g, '_')}.png`;
      a.click();
    }
  };

  // Runs when the user does this on screen: copy code.
  const handleCopyCode = () => {
    navigator.clipboard.writeText(student.rollNo || student.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="student-qr-identity-card" className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-blue-500/30 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-blue-500/20 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-white/10 p-1.5 flex items-center justify-center border border-white/20">
            <Building2 className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-200">
              Uttarakhand Government Institute of Polytechnic
            </h4>
            <p className="text-[10px] text-slate-300">Department of Technical Education, Uttarakhand</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> Verified Student ID
        </span>
      </div>

      {/* Card Content */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-7 space-y-4">
          <div className="flex items-center gap-3.5">
            <div className="relative group">
              <UserAvatar
                name={student.name}
                avatar={student.avatar}
                role={student.role}
                size="lg"
                editable={true}
                onEditClick={() => setIsPhotoModalOpen(true)}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/30 text-blue-200 uppercase">
                  {student.branch || 'CSE'} Engineering · Semester {student.semester || 3}
                </span>
                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="text-[10px] text-blue-300 hover:text-white flex items-center gap-1 underline cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                  <span>{student.avatar ? 'Change Photo' : 'Upload Photo'}</span>
                </button>
              </div>
              <h3 className="text-lg font-bold text-white mt-1">{student.name}</h3>
              <p className="text-xs text-slate-300 font-mono">
                Enrollment: {student.enrollmentNo || 'Not filled yet'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs bg-white/5 p-3 rounded-xl border border-white/10">
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-semibold block">University Roll No</span>
              <span className="font-mono font-bold text-blue-300 text-sm">{student.rollNo || ''}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-semibold block">Academic Year</span>
              <span className="font-bold text-slate-200">Year {student.year || 2} (Diploma)</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-semibold block">Category</span>
              <span className="font-medium text-slate-300">{student.category || 'General'}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-semibold block">College Code</span>
              <span className="font-mono font-semibold text-slate-300">090 (UGIP)</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed flex items-start gap-1.5">
            <UserCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Faculty Scanner Ready:</strong> Show this QR code to your Lecturer or Lab Incharge to mark your attendance instantly.
            </span>
          </p>
        </div>

        {/* QR Code Canvas */}
        <div className="md:col-span-5 flex flex-col items-center justify-center text-center bg-white/5 p-4 rounded-xl border border-white/10">
          <div className="p-2.5 bg-white rounded-xl shadow-lg border-2 border-blue-400 inline-block">
            <canvas ref={canvasRef} className="mx-auto rounded" />
          </div>
          <span className="text-[11px] font-mono font-bold text-blue-300 mt-2">
            ID: {student.rollNo || student.id}
          </span>
          <div className="flex items-center gap-2 mt-3 w-full">
            <button
              onClick={handleDownloadQR}
              className="flex-1 py-1.5 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Save QR
            </button>
            <button
              onClick={handleCopyCode}
              className="py-1.5 px-2.5 bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <QrCode className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {onScanLectureQR && (
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-300">
          <span className="flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-blue-400" />
            Want to scan teacher's class QR or enter PIN?
          </span>
          <button
            onClick={onScanLectureQR}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            Scan Class PIN / QR
          </button>
        </div>
      )}

      <PhotoUploadModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        targetUser={student}
      />
    </div>
  );
};
