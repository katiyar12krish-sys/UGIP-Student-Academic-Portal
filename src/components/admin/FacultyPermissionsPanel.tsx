// ===================================================================================================
// Admin: what each teacher may do. Subjects are assigned in the faculty list below this panel; here the admin
// switches each kind of work on or off per teacher (rules and the cross-subject alert: server/auth/permissions.ts).
// ===================================================================================================
import React, { useEffect, useState } from 'react';
import { ShieldCheck, Save, Loader2 } from 'lucide-react';
import { notify } from '../common/ui/feedback';

interface Feature { key: string; label: string }
interface Fac { id: string; name: string; username: string; department: string | null; perms: Record<string, boolean>; subjects: { id: string; code: string; name: string; branch: string; semester: number }[] }

// Screen part: faculty permissions panel.
export const FacultyPermissionsPanel: React.FC = () => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [rows, setRows] = useState<Fac[]>([]);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const load = async () => {
    const r = await fetch('/api/admin/faculty-permissions', { credentials: 'same-origin' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return setErr(j.error || 'Could not load permissions');
    setFeatures(j.features); setRows(j.faculty); setDirty({}); setErr('');
  };
  useEffect(() => { load(); }, []);

  const toggle = (id: string, key: string) => {
    setRows((rs) => rs.map((f) => (f.id === id ? { ...f, perms: { ...f.perms, [key]: !f.perms[key] } } : f)));
    setDirty((d) => ({ ...d, [id]: true }));
  };
  const save = async (f: Fac) => {
    setBusy(f.id);
    const r = await fetch(`/api/admin/faculty-permissions/${encodeURIComponent(f.id)}`, {
      method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ perms: f.perms }),
    });
    setBusy(null);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return notify.error('Not saved', j.error || `Server answered ${r.status}`);
    setDirty((d) => ({ ...d, [f.id]: false }));
    notify.success('Permissions saved', `${f.name} has been told about the change.`);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
      <div>
        <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-blue-600" /> Faculty permissions</h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
          Tick what each teacher may do. A teacher can work only on the subjects assigned to them (list below). If a teacher tries to change a subject that is not theirs, it is blocked and that subject's teacher and every admin get a notification; it is also written to the Security Audit Log.
        </p>
      </div>
      {err && <p className="text-xs font-bold text-rose-600">{err}</p>}
      {!err && rows.length === 0 && <p className="text-xs text-slate-500"><Loader2 className="w-4 h-4 inline animate-spin mr-1" />Loading…</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <th className="py-2 pr-3">Teacher / subjects</th>
              {features.map((f) => <th key={f.key} className="py-2 px-1 text-center font-semibold min-w-[70px]">{f.label}</th>)}
              <th className="py-2 pl-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.id} className="border-b border-slate-100 dark:border-slate-800 align-top">
                <td className="py-2 pr-3 min-w-[200px]">
                  <div className="font-bold text-slate-900 dark:text-white">{f.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{f.username}</div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                    {f.subjects.length ? f.subjects.map((s) => `${s.name} (${s.branch} S${s.semester})`).join(', ') : <span className="text-amber-700">No subject assigned yet</span>}
                  </div>
                </td>
                {features.map((x) => (
                  <td key={x.key} className="py-2 px-1 text-center">
                    <input type="checkbox" aria-label={`${f.name}: ${x.label}`} checked={!!f.perms[x.key]} onChange={() => toggle(f.id, x.key)} className="w-4 h-4 cursor-pointer" />
                  </td>
                ))}
                <td className="py-2 pl-2">
                  <button disabled={!dirty[f.id] || busy === f.id} onClick={() => save(f)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white font-bold cursor-pointer">
                    {busy === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
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
