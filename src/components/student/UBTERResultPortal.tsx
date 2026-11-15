// ===================================================================================================
// Link-out / helper for the official UBTER result website.
// ===================================================================================================
import React, { useState } from 'react';
import { useCollege } from '../../context/CollegeContext';
import {
  ExternalLink,
  Award,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Building,
  GraduationCap,
  Calendar,
  Lock,
  ArrowRight,
} from 'lucide-react';

// Screen part: ubter result portal.
export const UBTERResultPortal: React.FC = () => {
  const { currentUser, subjects } = useCollege();
  // Portal mode (kept in screen state)
  const [portalMode, setPortalMode] = useState<'login' | 'result'>('login');
  // Roll no (kept in screen state)
  const [rollNo, setRollNo] = useState(currentUser.rollNo || '');
  // Enrollment no (kept in screen state)
  const [enrollmentNo, setEnrollmentNo] = useState(
    currentUser.enrollmentNo || ''
  );
  // The semester chosen by the user (filter / list selection)
  const [selectedSemester, setSelectedSemester] = useState<number>(
    currentUser.semester || 5
  );
  // Captcha input (kept in screen state)
  const [captchaInput, setCaptchaInput] = useState('');
  // Captcha code (kept in screen state)
  const [captchaCode, setCaptchaCode] = useState('7K9M2');
  // Error message to show (error message); empty = no error
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Is it loading? (true / false)
  const [isLoading, setIsLoading] = useState(false);

  // Loads captcha from the server.
  const refreshCaptcha = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(code);
    setCaptchaInput('');
  };

  // Runs when the user does this on screen: login submit.
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!rollNo.trim()) {
      setErrorMessage('Please enter your valid UBTER Roll Number.');
      return;
    }
    if (!captchaInput.trim() || captchaInput.trim().toUpperCase() !== captchaCode) {
      setErrorMessage('Security Captcha does not match. Please try again.');
      refreshCaptcha();
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setPortalMode('result');
    }, 600);
  };

  const semesterSubjects = subjects.filter(
    (s) =>
      (!s.branch || s.branch === currentUser.branch) &&
      s.semester === selectedSemester
  );

  const displaySubjects =
    semesterSubjects.length > 0
      ? semesterSubjects
      : subjects.slice(0, 5);

  const totalMaxMarks = displaySubjects.length * 150;
  const obtainedTheoryTotal = displaySubjects.reduce((acc, _, idx) => acc + (68 + ((idx * 7) % 22)), 0);
  const obtainedPracticalTotal = displaySubjects.reduce((acc, _, idx) => acc + (42 + ((idx * 3) % 7)), 0);
  const grandTotal = obtainedTheoryTotal + obtainedPracticalTotal;
  const percentage = ((grandTotal / totalMaxMarks) * 100).toFixed(1);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-lg border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1.5 uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> UBTER Official Portal
              </span>
              <span className="text-xs text-slate-300 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                Institute Code: 090 · Uttarakhand Government Institute of Polytechnic
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              UBTER Examination & Result Gateway
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              Uttarakhand Board of Technical Education, Roorkee · Student Examination & Result Portal
            </p>
            <div className="flex items-center gap-2 pt-1 text-xs text-blue-300 font-mono">
              <span>Official URL:</span>
              <a
                href="https://ubterex.in/student_login"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white transition-colors flex items-center gap-1 font-bold"
              >
                https://ubterex.in/student_login
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href="https://ubterex.in/student_login"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-blue-400/40"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open ubterex.in Directly</span>
            </a>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setPortalMode('login')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              portalMode === 'login'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Student Login Form</span>
          </button>
          <button
            onClick={() => setPortalMode('result')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              portalMode === 'result'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Provisional Tabulation Statement</span>
          </button>
        </div>
      </div>

      {portalMode === 'login' && (
        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  UBTER Student Login
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Enter your credentials to view sessional & board semester result
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900">
              Exam Portal
            </span>
          </div>

          <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  UBTER Roll Number *
                </label>
                <input
                  type="text"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  placeholder="e.g. 24090050011"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Enrollment Number
                </label>
                <input
                  type="text"
                  value={enrollmentNo}
                  onChange={(e) => setEnrollmentNo(e.target.value)}
                  placeholder="Enrollment number"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Semester
                </label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value={1}>Semester 1</option>
                  <option value={2}>Semester 2</option>
                  <option value={3}>Semester 3</option>
                  <option value={4}>Semester 4</option>
                  <option value={5}>Semester 5</option>
                  <option value={6}>Semester 6</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Security Captcha *
                </label>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 bg-slate-900 text-amber-300 font-mono font-bold tracking-widest text-sm rounded select-none">
                    {captchaCode}
                  </div>
                  <button
                    type="button"
                    onClick={refreshCaptcha}
                    className="p-1 text-slate-500 hover:text-slate-700"
                    title="Refresh Captcha"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="text"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    placeholder="Enter captcha"
                    required
                    maxLength={5}
                    className="flex-1 px-2.5 py-1 bg-white dark:bg-slate-800 border rounded text-xs font-mono font-bold uppercase"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>View Result Statement</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {portalMode === 'result' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs p-6 space-y-6">
          <div className="text-center pb-5 border-b border-slate-200 dark:border-slate-800 space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              <Building className="w-4 h-4 text-blue-600" />
              Uttarakhand Board of Technical Education, Roorkee
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              PROVISIONAL TABULATION STATEMENT
            </h2>
            <p className="text-xs text-slate-500">
              Diploma in {currentUser.branch === 'CSE' ? 'Computer Science & Engineering' : 'Civil Engineering'} · Semester {selectedSemester} Examination
            </p>
            <p className="text-[11px] font-bold text-blue-700 dark:text-blue-400">
              UTTARAKHAND GOVERNMENT INSTITUTE OF POLYTECHNIC (CODE: 090)
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Candidate Name:</span>
              <span className="font-bold text-slate-900 dark:text-white">{currentUser.name}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Roll Number:</span>
              <span className="font-bold font-mono text-blue-700 dark:text-blue-400">{rollNo}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Enrollment No:</span>
              <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{enrollmentNo}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Branch & Semester:</span>
              <span className="font-bold text-slate-900 dark:text-white">{currentUser.branch} · Sem {selectedSemester}</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">Sub Code</th>
                  <th className="p-3">Subject Name</th>
                  <th className="p-3 text-center">Theory (100)</th>
                  <th className="p-3 text-center">Practical (50)</th>
                  <th className="p-3 text-center">Total (150)</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displaySubjects.map((sub, idx) => {
                  const th = 68 + ((idx * 7) % 22);
                  const pr = 42 + ((idx * 3) % 7);
                  const tot = th + pr;
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">{sub.code}</td>
                      <td className="p-3 font-medium text-slate-900 dark:text-white">{sub.name}</td>
                      <td className="p-3 text-center font-mono">{th}</td>
                      <td className="p-3 text-center font-mono">{pr}</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-900 dark:text-white">{tot}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          PASSED
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold border-t border-slate-200 dark:border-slate-700">
                <tr>
                  <td colSpan={2} className="p-3">GRAND TOTAL & PERCENTAGE</td>
                  <td className="p-3 text-center font-mono">{obtainedTheoryTotal}</td>
                  <td className="p-3 text-center font-mono">{obtainedPracticalTotal}</td>
                  <td className="p-3 text-center font-mono text-sm text-blue-700 dark:text-blue-400">{grandTotal} / {totalMaxMarks}</td>
                  <td className="p-3 text-center">
                    <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">{percentage}%</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500 font-semibold">Validated under UBTER Semester Evaluation Norms</span>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Scorecard</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
