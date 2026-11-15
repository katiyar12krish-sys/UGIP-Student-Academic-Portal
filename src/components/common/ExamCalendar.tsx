// ===================================================================================================
// Exam calendar of the semester: exam forms, sessional tests, copy checking, practical and theory exams.
// Everybody sees it, with what is happening today; the admin adds / changes / removes dates.
// Server: server/routes/examCalendar.ts
// ===================================================================================================
import React, { useEffect, useState } from 'react';
import { CalendarDays, Pencil, Plus, Trash2, X } from 'lucide-react';
import { call } from '../../services/academicApi';
import { notify, confirmDialog } from './ui/feedback';

interface Ev { id: string; title: string; kind: string; startDate: string; endDate: string; note: string; updatedBy: string }
const KINDS: Record<string, { label: string; cls: string }> = {
  form: { label: 'Exam form', cls: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' },
  test: { label: 'Tests / assignments', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  checking: { label: 'Copy checking', cls: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300' },
  practical: { label: 'Practical exam', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  theory: { label: 'Final exams', cls: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
  result: { label: 'Result', cls: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300' },
  holiday: { label: 'Holiday', cls: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' },
  other: { label: 'Other', cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
};
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fmt = (s: string) => new Date(`${s}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00`) - Date.parse(`${a}T00:00:00`)) / 86_400_000);
const EMPTY = { title: '', kind: 'test', startDate: today(), endDate: today(), note: '' };

export const ExamCalendar: React.FC<{ canEdit?: boolean }> = ({ canEdit = false }) => {
  const [events, setEvents] = useState<Ev[]>([]);
  const [form, setForm] = useState<typeof EMPTY & { id?: string } | null>(null);
  const load = async () => { const r = await call<Ev[]>('GET', '/api/exam-calendar'); if (r.ok) setEvents(r.data); };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form) return;
    const r = form.id ? await call<Ev>('PUT', `/api/exam-calendar/${encodeURIComponent(form.id)}`, form) : await call<Ev>('POST', '/api/exam-calendar', form);
    if (!r.ok) return notify.error('Could not save', r.error);
    setForm(null); load();
  };
  const remove = async (e: Ev) => {
    if (!(await confirmDialog({ title: `Remove "${e.title}"?`, confirmText: 'Remove', danger: true }))) return;
    const r = await call<{ ok: true }>('DELETE', `/api/exam-calendar/${encodeURIComponent(e.id)}`);
    if (!r.ok) return notify.error('Could not remove', r.error);
    load();
  };

  const t = today();
  const inp = 'w-full p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg text-xs';
  if (!events.length && !canEdit) return null;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2"><CalendarDays className="w-4 h-4 text-rose-600" /> Exam calendar</h3>
          <p className="text-xs text-slate-500">परीक्षा फॉर्म, टेस्ट, प्रैक्टिकल और फाइनल पेपर की तारीखें / Dates for exam forms, tests, practicals and final papers.</p>
        </div>
        {canEdit && !form && (
          <button onClick={() => setForm({ ...EMPTY })} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"><Plus className="w-4 h-4" /> Add date</button>
        )}
      </div>

      {form && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
          <input className={`${inp} sm:col-span-2`} placeholder="Title *" value={form.title} maxLength={150} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select className={`${inp} sm:col-span-2`} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} aria-label="Type">
            {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <label className="text-[11px] text-slate-500 sm:col-span-2">From<input type="date" className={inp} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></label>
          <label className="text-[11px] text-slate-500 sm:col-span-2">To<input type="date" className={inp} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></label>
          <input className={`${inp} sm:col-span-4`} placeholder="Note for students / teachers" value={form.note} maxLength={500} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <div className="sm:col-span-4 flex justify-end gap-2">
            <button onClick={() => setForm(null)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</button>
            <button onClick={save} className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer">Save</button>
          </div>
        </div>
      )}

      <ol className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-2 space-y-3">
        {events.map((e) => {
          const now = e.startDate <= t && t <= e.endDate, past = e.endDate < t;
          const k = KINDS[e.kind] || KINDS.other;
          const status = now ? `Going on now · ${daysBetween(t, e.endDate)} day(s) left` : past ? 'Over' : `Starts in ${daysBetween(t, e.startDate)} day(s)`;
          return (
            <li key={e.id} className={`ml-4 ${past ? 'opacity-60' : ''}`}>
              <span className={`absolute -left-[7px] mt-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${now ? 'bg-rose-500' : past ? 'bg-slate-400' : 'bg-blue-500'}`} />
              <div className={`p-3 rounded-xl border ${now ? 'border-rose-300 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/30' : 'border-slate-200 dark:border-slate-700'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${k.cls}`}>{k.label}</span>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{e.title}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-[11px] font-semibold ${now ? 'text-rose-700 dark:text-rose-300' : 'text-slate-500'}`}>{status}</span>
                    {canEdit && <button onClick={() => setForm({ id: e.id, title: e.title, kind: e.kind, startDate: e.startDate, endDate: e.endDate, note: e.note })} className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer" aria-label={`Edit ${e.title}`}><Pencil className="w-3.5 h-3.5" /></button>}
                    {canEdit && <button onClick={() => remove(e)} className="p-1 text-slate-400 hover:text-red-600 cursor-pointer" aria-label={`Remove ${e.title}`}><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">{fmt(e.startDate)}{e.endDate !== e.startDate ? ` – ${fmt(e.endDate)}` : ''}</p>
                {e.note && <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{e.note}</p>}
              </div>
            </li>
          );
        })}
        {!events.length && <li className="ml-4 text-xs text-slate-500">No dates yet. Use “Add date”.</li>}
      </ol>
    </div>
  );
};
