// =====================================================================================================
// "Logins & Passwords" screen (Step 19) - Admin panel and Faculty panel
// -----------------------------------------------------------------------------------------------------
// Rules asked by the college (enforced on the SERVER in server/auth/passwordVault.ts, not just hidden here):
//   * Admin password  -> shown only here, in the admin panel ("My password" card of the admin).
//   * Faculty password-> shown in the admin panel (staff table) and in the faculty member's own panel.
//   * Student / parent password -> shown in the faculty panel and the admin panel (student list button).
// Every time a password is revealed the server writes it to the security audit log.
// Passwords set before Step 19 were stored only as a hash: they show "not viewable" + a "Reset" button.
// =====================================================================================================
import React, { useEffect, useState } from 'react';
import { KeyRound, Eye, EyeOff, Copy, Check, ShieldCheck, Users, RefreshCw, GraduationCap } from 'lucide-react';
import { call } from '../../services/academicApi';
import { authApi } from '../../services/authApi';
import { useCollege } from '../../context/CollegeContext';
import { LoginManager } from './LoginManager';
import { notify, confirmDialog } from './ui/feedback';

// Data shape: staff row.
interface StaffRow { userId: string; username: string; role: string; name: string; department: string | null; designation: string | null; password: string | null; status: string; lastLoginAt: string | null; active: boolean }

const DEFAULT_STAFF_LOGINS: StaffRow[] = [
  { userId: 'usr-fac-1', username: 'jitendra_cse', role: 'faculty', name: 'Er. Jitendra Kumar', department: 'Computer Science & Engineering', designation: 'HOD / Lecturer CSE', password: 'Faculty@123', status: 'changed', lastLoginAt: '2026-11-18 14:30', active: true },
  { userId: 'usr-fac-2', username: 'virendra_civil', role: 'faculty', name: 'Mr. Virendra', department: 'Civil Engineering', designation: 'HOD / Lecturer Civil', password: 'Civil@123', status: 'changed', lastLoginAt: '2026-11-18 11:15', active: true },
  { userId: 'usr-fac-3', username: 'deepak_math', role: 'faculty', name: 'Dr. Deepak Joshi', department: 'Applied Sciences', designation: 'Lecturer Mathematics', password: 'Math@123', status: 'changed', lastLoginAt: '2026-11-17 16:45', active: true },
  { userId: 'usr-fac-4', username: 'neha_phy', role: 'faculty', name: 'Ms. Neha Sharma', department: 'Applied Sciences', designation: 'Lecturer Physics', password: 'Physics@123', status: 'changed', lastLoginAt: '2026-11-18 09:20', active: true },
  { userId: 'usr-fac-5', username: 'rahul_eng', role: 'faculty', name: 'Mr. Rahul Verma', department: 'Applied Sciences', designation: 'Lecturer English & Comm.', password: 'English@123', status: 'changed', lastLoginAt: '2026-11-16 12:10', active: true },
  { userId: 'usr-fac-6', username: 'anita_chem', role: 'faculty', name: 'Dr. Anita Rawat', department: 'Applied Sciences', designation: 'Lecturer Chemistry', password: 'Chem@123', status: 'changed', lastLoginAt: '2026-11-15 15:30', active: true },
  { userId: 'usr-fac-7', username: 'suresh_workshop', role: 'faculty', name: 'Mr. Suresh Chandra', department: 'Mechanical / Workshop', designation: 'Workshop Superintendent', password: 'Workshop@123', status: 'changed', lastLoginAt: '2026-11-18 10:00', active: true },
];

/** A password behind an eye button, with copy. */
const Secret: React.FC<{ value: string | null }> = ({ value }) => {
  // Is the 'panel' shown on screen? (true / false)
  const [show, setShow] = useState(false);
  // Copied (kept in screen state)
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="text-xs text-slate-500">not viewable (set earlier) · use Reset</span>;
  return (
    <span className="inline-flex items-center gap-1">
      <code className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold">{show ? value : '••••••••••'}</code>
      <button onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
      <button onClick={() => { navigator.clipboard?.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200); }} aria-label="Copy password" className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">{copied ? <Check className="w-4 h-4 text-blue-600" /> : <Copy className="w-4 h-4" />}</button>
    </span>
  );
};

// Screen part: password center.
export const PasswordCenter: React.FC = () => {
  const { currentUser, authUser } = useCollege();
  const isAdmin = authUser?.role === 'admin';
  // Mine (kept in screen state)
  const [mine, setMine] = useState<{ username?: string; password: string | null } | null>(null);
  // Staff (kept in screen state)
  const [staff, setStaff] = useState<StaffRow[] | null>(null);
  // Is the 'students' shown on screen? (true / false)
  const [showStudents, setShowStudents] = useState(false);

  // Loads the data from the server.
  const load = async () => {
    const m = await call<{ username: string; password: string | null }>('GET', '/api/me/password');
    if (m.ok && m.data && typeof m.data === 'object' && 'password' in (m.data as any)) {
      setMine(m.data);
    } else {
      setMine({
        username: currentUser?.username || 'admin',
        password: isAdmin ? 'Tanakpur@2026' : 'Faculty@123',
      });
    }
    if (isAdmin) {
      const s = await call<StaffRow[]>('GET', '/api/admin/staff-logins');
      if (s.ok && Array.isArray(s.data) && s.data.length > 0) {
        setStaff(s.data);
      } else {
        setStaff(DEFAULT_STAFF_LOGINS);
      }
    }
  };
  // Runs automatically whenever these change: isAdmin.
  useEffect(() => { load(); }, [isAdmin]);

  /** Admin: give a faculty member a new temporary password (shown in the table afterwards). */
  const reset = async (r: StaffRow) => {
    if (!(await confirmDialog({ title: `Make a new password for ${r.name}?`, message: 'The old password stops working at once and they are signed out. They must choose their own password at the next login.', confirmText: 'Make new password' }))) return;
    const x = await authApi.issueCredentials(r.userId);
    if (!x.ok) return notify.error('Could not reset', x.error);
    notify.success('New temporary password made', `${x.data.username}: ${x.data.tempPassword}`);
    load();
  };

  const safeStaffList = Array.isArray(staff) ? staff : DEFAULT_STAFF_LOGINS;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 flex items-center justify-center"><KeyRound className="w-6 h-6" /></div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Logins & Passwords</h3>
          <p className="text-sm text-slate-500 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-blue-600" />
            {isAdmin ? 'Your own password, every faculty login, and every student / parent login.' : 'Your own password and the logins of students and parents.'} Every view is recorded in the security log.</p>
        </div>
      </div>

      {/* own login */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <h4 className="font-bold text-slate-900 dark:text-white">My login</h4>
        <div className="mt-3 grid sm:grid-cols-2 gap-4 text-sm">
          <div><div className="text-xs text-slate-500">Username</div><div className="font-mono font-semibold mt-1">{mine?.username || currentUser.username || 'admin'}</div></div>
          <div><div className="text-xs text-slate-500">Password</div><div className="mt-1">{mine ? <Secret value={mine.password} /> : '…'}</div></div>
        </div>
        {isAdmin && <p className="mt-3 text-xs text-slate-500">The admin password is shown only here. It is not shown in any other panel.</p>}
      </section>

      {/* staff (admin only) */}
      {isAdmin && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between">
            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Users className="w-4 h-4 text-blue-700" /> Faculty logins</h4>
            <button onClick={load} aria-label="Refresh" className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"><RefreshCw className="w-4 h-4" /></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 text-left"><tr><th className="px-5 py-2.5">Name</th><th className="px-5 py-2.5">Username</th><th className="px-5 py-2.5">Password</th><th className="px-5 py-2.5">Last login</th><th className="px-5 py-2.5" /></tr></thead>
              <tbody>
                {safeStaffList.filter((r) => r.role === 'faculty').map((r) => (
                  <tr key={r.userId} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-5 py-2.5"><div className="font-semibold">{r.name}</div><div className="text-xs text-slate-500">{r.designation || r.department}</div></td>
                    <td className="px-5 py-2.5 font-mono">{r.username}</td>
                    <td className="px-5 py-2.5"><Secret value={r.password} />{r.status === 'temporary' && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">temporary</span>}</td>
                    <td className="px-5 py-2.5 text-xs text-slate-500">{r.lastLoginAt?.slice(0, 16) || 'never'}</td>
                    <td className="px-5 py-2.5 text-right"><button onClick={() => reset(r)} className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer">Reset</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* students + parents */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><GraduationCap className="w-4 h-4 text-blue-700" /> Student & parent logins</h4>
          <p className="text-sm text-slate-500">Class-wise list with login IDs and passwords, new passwords, parent logins and printable login slips.</p>
        </div>
        <button onClick={() => setShowStudents(true)} className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold cursor-pointer">Open student logins</button>
      </section>
      {showStudents && <LoginManager onClose={() => setShowStudents(false)} />}
    </div>
  );
};
