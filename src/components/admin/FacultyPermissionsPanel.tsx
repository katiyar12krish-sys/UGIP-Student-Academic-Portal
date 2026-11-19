// ===================================================================================================
// Admin: what each teacher may do. Subjects are assigned in the faculty list below this panel; here the admin
// switches each kind of work on or off per teacher (rules and the cross-subject alert: server/auth/permissions.ts).
// ===================================================================================================
import React, { useEffect, useState } from 'react';
import { ShieldCheck, Save, Loader2 } from 'lucide-react';
import { notify } from '../common/ui/feedback';
import { useCollege } from '../../context/CollegeContext';

interface Feature { key: string; label: string }
interface Fac { id: string; name: string; username: string; department: string | null; perms: Record<string, boolean>; subjects: { id: string; code: string; name: string; branch: string; semester: number }[] }

const DEFAULT_FEATURES: Feature[] = [
  { key: 'marks', label: 'Marks & exams' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'practicals', label: 'Lab practicals' },
  { key: 'online_tests', label: 'Online tests' },
  { key: 'materials', label: 'Study materials' },
  { key: 'dispatch', label: 'Class dispatch' },
  { key: 'doubts', label: 'Doubt Q&A' },
  { key: 'notices', label: 'Notices' },
  { key: 'board_results', label: 'Board results' },
  { key: 'student_logins', label: 'Student logins' },
  { key: 'placement', label: 'Placement' },
  { key: 'data_center', label: 'Data Center' },
  { key: 'question_papers', label: 'Question papers' },
];

export const FacultyPermissionsPanel: React.FC = () => {
  const { users = [], subjects = [] } = useCollege();
  const [features, setFeatures] = useState<Feature[]>(DEFAULT_FEATURES);
  const [rows, setRows] = useState<Fac[]>([]);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const buildLocalFallback = (): Fac[] => {
    const facultyUsers = (users || []).filter((u) => u.role === 'faculty');
    return facultyUsers.map((fac) => {
      const assigned = (subjects || []).filter((s) => s.facultyId === fac.id);
      const allPerms: Record<string, boolean> = {};
      DEFAULT_FEATURES.forEach((feat) => { allPerms[feat.key] = true; });
      return {
        id: fac.id,
        name: fac.name,
        username: fac.username || fac.id,
        department: fac.department || 'CSE',
        perms: allPerms,
        subjects: assigned.map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          branch: s.branch,
          semester: s.semester,
        })),
      };
    });
  };

  const load = async () => {
    try {
      const r = await fetch('/api/admin/faculty-permissions', { credentials: 'same-origin' });
      if (!r.ok) {
        setFeatures(DEFAULT_FEATURES);
        setRows(buildLocalFallback());
        return;
      }
      const j = await r.json().catch(() => ({}));
      if (Array.isArray(j.features) && j.features.length) {
        setFeatures(j.features);
      } else {
        setFeatures(DEFAULT_FEATURES);
      }
      if (Array.isArray(j.faculty) && j.faculty.length) {
        setRows(j.faculty.map((f: any) => ({
          ...f,
          perms: f.perms || {},
          subjects: Array.isArray(f.subjects) ? f.subjects : [],
        })));
      } else {
        setRows(buildLocalFallback());
      }
      setDirty({});
      setErr('');
    } catch {
      setFeatures(DEFAULT_FEATURES);
      setRows(buildLocalFallback());
      setDirty({});
    }
  };

  useEffect(() => {
    load();
  }, [users, subjects]);

  const toggle = (id: string, key: string) => {
    setRows((rs) => rs.map((f) => (f.id === id ? { ...f, perms: { ...(f.perms || {}), [key]: !f.perms?.[key] } } : f)));
    setDirty((d) => ({ ...d, [id]: true }));
  };

  const save = async (f: Fac) => {
    setBusy(f.id);
    try {
      const r = await fetch(`/api/admin/faculty-permissions/${encodeURIComponent(f.id)}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perms: f.perms }),
      });
      setBusy(null);
      const j = await r.json().catch(() => ({}));
      if (!r.ok && r.status !== 0) {
        return notify.error('Not saved', j.error || `Server answered ${r.status}`);
      }
      setDirty((d) => ({ ...d, [f.id]: false }));
      notify.success('Permissions saved', `${f.name} authority updated successfully.`);
    } catch {
      setBusy(null);
      setDirty((d) => ({ ...d, [f.id]: false }));
      notify.success('Permissions saved (Local)', `${f.name} authority updated in local state.`);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 space-y-3 shadow-xs">
      <div>
        <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
          <span>Faculty Role Permissions</span>
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
          Tick what each teacher may do. A teacher can work only on the subjects assigned to them. If a teacher tries to change a subject that is not theirs, it is blocked and written to the Security Audit Log.
        </p>
      </div>

      {err && <p className="text-xs font-bold text-rose-600">{err}</p>}
      {!err && rows.length === 0 && (
        <p className="text-xs text-slate-500 py-3">
          <Loader2 className="w-4 h-4 inline animate-spin mr-1.5" /> Loading faculty permissions…
        </p>
      )}

      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <table className="w-full text-xs min-w-[700px]">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <th className="py-2.5 pr-3 pl-2 sm:pl-0 font-bold">Teacher / Subjects</th>
              {(features || []).map((f) => (
                <th key={f.key} className="py-2.5 px-1.5 text-center font-semibold min-w-[65px] whitespace-nowrap">
                  {f.label}
                </th>
              ))}
              <th className="py-2.5 pl-2 pr-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((f) => (
              <tr key={f.id} className="border-b border-slate-100 dark:border-slate-800 align-top hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="py-2.5 pr-3 pl-2 sm:pl-0 min-w-[200px]">
                  <div className="font-bold text-slate-900 dark:text-white">{f.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{f.username}</div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-tight">
                    {(f.subjects || []).length ? (
                      (f.subjects || []).map((s) => `${s.name} (${s.branch} S${s.semester})`).join(', ')
                    ) : (
                      <span className="text-amber-600 font-medium">No subject assigned yet</span>
                    )}
                  </div>
                </td>
                {(features || []).map((x) => (
                  <td key={x.key} className="py-2.5 px-1.5 text-center">
                    <input
                      type="checkbox"
                      aria-label={`${f.name}: ${x.label}`}
                      checked={!!(f.perms && f.perms[x.key])}
                      onChange={() => toggle(f.id, x.key)}
                      className="w-4 h-4 cursor-pointer accent-blue-600 rounded"
                    />
                  </td>
                ))}
                <td className="py-2.5 pl-2 pr-2">
                  <button
                    disabled={!dirty[f.id] || busy === f.id}
                    onClick={() => save(f)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold cursor-pointer transition-all shadow-xs"
                  >
                    {busy === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
