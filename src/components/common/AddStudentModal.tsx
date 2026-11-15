// ===================================================================================================
// Pop-up to add a new student (with login creation) from the dashboards.
// ===================================================================================================
import React, { useState } from 'react';
import { useCollege } from '../../context/CollegeContext';
import { BranchCode, StudentCategory } from '../../types';
import { X, UserPlus, Sparkles, CheckCircle2, KeyRound, Eye, EyeOff, Lock } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { cleanPhone, validateStudent } from '../../utils/studentRules';

// Data shape: add student modal props.
interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  creatorRole?: 'admin' | 'faculty';
}

// Screen part: add student modal.
export const AddStudentModal: React.FC<AddStudentModalProps> = ({
  isOpen,
  onClose,
  creatorRole = 'admin',
}) => {
  const { addUser, users } = useCollege();
  // Error message to show (form error); empty = no error
  const [formError, setFormError] = useState<string | null>(null);
  // Name (kept in screen state)
  const [name, setName] = useState('');
  // Roll no (kept in screen state)
  const [rollNo, setRollNo] = useState('');
  // Branch (kept in screen state)
  const [branch, setBranch] = useState<BranchCode>('CSE');
  // Year (kept in screen state)
  const [year, setYear] = useState<1 | 2 | 3>(1);
  // Semester (kept in screen state)
  const [semester, setSemester] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  // Category (kept in screen state)
  const [category, setCategory] = useState<StudentCategory>('General');
  // Phone (kept in screen state)
  const [phone, setPhone] = useState('');
  // Email (kept in screen state)
  const [email, setEmail] = useState('');
  // Student password (kept in screen state)
  const [studentPassword, setStudentPassword] = useState('');
  // Is the 'password' shown on screen? (true / false)
  const [showPassword, setShowPassword] = useState(false);
  // Success notice (kept in screen state)
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  // Runs when the user does this on screen: year change.
  const handleYearChange = (newYear: 1 | 2 | 3) => {
    setYear(newYear);
    const defaultSem = (newYear * 2 - 1) as 1 | 2 | 3 | 4 | 5 | 6;
    setSemester(defaultSem);
  };

  // Runs when the user does this on screen: generate password.
  const handleGeneratePassword = () => {
    const cleanName = name.trim().toLowerCase().split(' ')[0] || 'student';
    const cleanRoll = rollNo.trim() || '2026';
    const generated = `${cleanName}@${cleanRoll.slice(-4)}`;
    setStudentPassword(generated);
  };

  // Runs when the user does this on screen: submit.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !rollNo.trim()) return;
    const problem = validateStudent({ name, rollNo: rollNo.trim(), branch, year, semester, phone: phone.trim(), category })
      || (users.some((u) => u.role === 'student' && (u.rollNo === rollNo.trim() || u.ubterRollNumber === rollNo.trim())) ? `A student with roll number ${rollNo.trim()} already exists` : null);
    if (problem) { setFormError(problem); return; }
    setFormError(null);

    const generatedEmail =
      email.trim() ||
      `${name.toLowerCase().split(/\s+/)[0].replace(/[^a-z0-9]/g, '')}${rollNo.trim().slice(-3)}@student.gpt-tanakpur.gov.in`;

    addUser({
      name: name.trim(),
      email: generatedEmail,
      role: 'student',
      branch: branch,
      rollNo: rollNo.trim(),
      year: year,
      semester: semester,
      category: category,
      phone: phone.trim() ? cleanPhone(phone) ?? undefined : undefined,   // blank stays blank (add it later from the student directory)
      avatar: '',
      enrollmentNo: `UBTER-${2026 - (3 - year)}-GP-${rollNo.trim()}`,
    });

    setSuccessNotice(`Student "${name.trim()}" (Roll: ${rollNo.trim()}) registered! Add the remaining details (Aadhaar, marks, parents, address) from the student directory, and use “Issue password” to give them a login.`);
    setTimeout(() => {
      setName('');
      setRollNo('');
      setPhone('');
      setEmail('');
      setStudentPassword('');
      setSuccessNotice(null);
      onClose();
    }, 1200);
  };

  return (
    <div
      id="add-student-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in overflow-y-auto"
    >
      <div
        id="add-student-modal-content"
        className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl border border-white/20">
              <UserPlus className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200">
                  {creatorRole === 'admin' ? 'Admin Registration' : 'Faculty Admission Desk'}
                </span>
              </div>
              <h3 className="font-bold text-base sm:text-lg text-white">
                Add New Student
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {successNotice ? (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-3 font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successNotice}</span>
            </div>
          ) : (
            <>
              {/* Live Preview */}
              <div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 p-3.5 rounded-xl flex items-center gap-3">
                <UserAvatar name={name || 'Student'} avatar="" role="student" size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-600 text-white uppercase">
                      Live Preview
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {name || 'Student Full Name'}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-0.5">
                    Roll: <span className="font-bold text-blue-700 dark:text-blue-400">{rollNo || 'Pending'}</span> ·{' '}
                    {branch} · Year {year} (Sem {semester})
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {formError && (
                  <div role="alert" className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-200 text-xs font-semibold">
                    {formError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Vikas Pandey"
                    className="w-full p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs border border-slate-300 dark:border-slate-700 rounded-xl placeholder:text-slate-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                      Roll Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={rollNo}
                      onChange={(e) => setRollNo(e.target.value)}
                      placeholder="e.g. 2404520"
                      className="w-full p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs border border-slate-300 dark:border-slate-700 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                      Branch / Department *
                    </label>
                    <select
                      value={branch}
                      onChange={(e) => setBranch(e.target.value as BranchCode)}
                      className="w-full p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs border border-slate-300 dark:border-slate-700 rounded-xl"
                    >
                      <option value="CSE">CSE (Computer Science & Engg)</option>
                      <option value="Civil">Civil (Civil Engineering)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                      Academic Year *
                    </label>
                    <select
                      value={year}
                      onChange={(e) => handleYearChange(Number(e.target.value) as 1 | 2 | 3)}
                      className="w-full p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs border border-slate-300 dark:border-slate-700 rounded-xl"
                    >
                      <option value={1}>1st Year</option>
                      <option value={2}>2nd Year</option>
                      <option value={3}>3rd Year</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                      Current Semester *
                    </label>
                    <select
                      value={semester}
                      onChange={(e) => setSemester(Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6)}
                      className="w-full p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs border border-slate-300 dark:border-slate-700 rounded-xl"
                    >
                      <option value={1}>Semester 1</option>
                      <option value={2}>Semester 2</option>
                      <option value={3}>Semester 3</option>
                      <option value={4}>Semester 4</option>
                      <option value={5}>Semester 5</option>
                      <option value={6}>Semester 6</option>
                    </select>
                  </div>
                </div>

                <p className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-[11px] text-amber-900 dark:text-amber-300">
                  Login: the roll number is the username. After saving, use “Issue password” in the student directory to give the student a one-time temporary password.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                      Social Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as StudentCategory)}
                      className="w-full p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs border border-slate-300 dark:border-slate-700 rounded-xl"
                    >
                      <option value="General">General</option>
                      <option value="OBC">OBC</option>
                      <option value="SC">SC</option>
                      <option value="ST">ST</option>
                      <option value="EWS">EWS</option>
                      <option value="TFW">TFW</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98370 XXXXX"
                      className="w-full p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs border border-slate-300 dark:border-slate-700 rounded-xl placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-blue-200" />
                    <span>Save Student & Password</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
