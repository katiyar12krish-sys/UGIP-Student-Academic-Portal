// Timetable picture / PDF of one class (server: server/routes/timetableImage.ts).
// Staff upload or replace it; students and parents see the picture of their own class.
import React, { useEffect, useState } from 'react';
import { ImageUp, FileText, Trash2 } from 'lucide-react';
import { call } from '../../services/academicApi';
import { uploadFile } from '../../services/materialsApi';
import { notify, confirmDialog } from './ui/feedback';

interface Pic { branch: string; semester: number; note: string; name: string; kind: string; uploadedBy: string; updatedAt: number; url: string }

export const TimetablePicture: React.FC<{ branch: string; semester: number; canEdit: boolean }> = ({ branch, semester, canEdit }) => {
  const [pic, setPic] = useState<Pic | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const base = `/api/timetable-image/${encodeURIComponent(branch)}/${semester}`;

  const load = async () => { const r = await call<Pic | null>('GET', base); setPic(r.ok ? r.data : null); };
  useEffect(() => { load(); }, [branch, semester]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    const up = await uploadFile(file);
    if (!up.ok) { setBusy(false); return notify.error('Could not upload', up.error); }
    const r = await call<Pic>('PUT', base, { fileId: up.data.fileId, note });
    setBusy(false);
    if (!r.ok) return notify.error('Could not save the timetable', r.error);
    notify.success(`Timetable picture saved for ${branch} Semester ${semester}`);
    setPic(r.data); setNote('');
  };
  const remove = async () => {
    if (!(await confirmDialog({ title: 'Remove the timetable picture?', confirmText: 'Remove', danger: true }))) return;
    const r = await call<{ ok: true }>('DELETE', base);
    if (!r.ok) return notify.error('Could not remove', r.error);
    setPic(null);
  };

  if (!pic && !canEdit) return null;
  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2"><ImageUp className="w-4 h-4 text-blue-600" /> Timetable picture · {branch} Semester {semester}</h4>
          <p className="text-xs text-slate-500">{pic ? `Uploaded by ${pic.uploadedBy} on ${new Date(pic.updatedAt).toLocaleDateString()}${pic.note ? ` · ${pic.note}` : ''}` : 'No picture yet. Upload a photo or PDF of the printed timetable.'}</p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Note (e.g. valid from 1 Aug)" className="p-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
            <label className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer ${busy ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {busy ? 'Uploading…' : pic ? 'Replace picture / PDF' : 'Upload picture / PDF'}
              <input type="file" accept="image/*,.pdf" className="hidden" disabled={busy} onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            {pic && <button onClick={remove} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg cursor-pointer" aria-label="Remove timetable picture"><Trash2 className="w-4 h-4" /></button>}
          </div>
        )}
      </div>
      {pic && (pic.kind === 'image'
        ? <a href={pic.url} target="_blank" rel="noopener noreferrer"><img src={pic.url} alt={`Timetable ${branch} semester ${semester}`} className="w-full max-h-[520px] object-contain rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50" /></a>
        : <a href={pic.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-blue-700 dark:text-blue-300"><FileText className="w-4 h-4" /> Open {pic.name}</a>)}
    </div>
  );
};
