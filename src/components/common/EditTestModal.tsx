// =====================================================================================================
// "Edit exam" dialog (Step 18) - used wherever exams are listed (datesheet, marks sheet).
// Changes title, type, max marks, date, time, room, status of an existing exam through PUT /api/tests/:id.
// The server refuses a max-marks value lower than a mark already given, and only the subject's teacher /
// admin may edit. After saving, the shared exam list is reloaded so every screen shows the new values.
// =====================================================================================================
import React, { useState } from 'react';
import { X, Save, Pencil } from 'lucide-react';
import type { TestExam } from '../../types';
import { editsApi } from '../../services/step18Api';
import { notify } from './ui/feedback';

export const EXAM_TYPES: TestExam['type'][] = ['Sessional 1', 'Sessional 2', 'Unit Test', 'Class Test', 'MCQ Test', 'Assignment', 'Practical / Viva', 'Pre-Board Mock', 'Board Exam'];

// Screen part: edit test modal.
export const EditTestModal: React.FC<{ exam: TestExam; onClose: () => void; onSaved: () => void }> = ({ exam, onClose, onSaved }) => {
  // F (kept in screen state)
  const [f, setF] = useState({
    title: exam.title, type: exam.type, maxMarks: exam.maxMarks, date: exam.date || '', timeSlot: exam.timeSlot || '',
    roomNumber: exam.roomNumber || '', status: exam.status || 'Upcoming', instructions: exam.instructions || '',
  });
  // true while waiting for the server (buttons are disabled meanwhile)
  const [saving, setSaving] = useState(false);

  // Save.
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const r = await editsApi.updateTest(exam.id, { ...f, maxMarks: Number(f.maxMarks) } as any);
    setSaving(false);
    if (!r.ok) return notify.error('Could not save the exam', r.error);
    notify.success('Exam updated', `${exam.subjectCode} · ${f.title}`);
    onSaved();
    onClose();
  };

  const input = 'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={save} className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Pencil className="w-4 h-4 text-blue-600" /> Edit exam · {exam.subjectCode}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-3 text-sm">
          <label className="col-span-2"><span className="text-xs font-semibold text-slate-600">Title *</span><input required className={input} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
          <label><span className="text-xs font-semibold text-slate-600">Type</span>
            <select className={input} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as any })}>{EXAM_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label><span className="text-xs font-semibold text-slate-600">Max marks *</span><input required type="number" min={1} className={input} value={f.maxMarks} onChange={(e) => setF({ ...f, maxMarks: Number(e.target.value) })} /></label>
          <label><span className="text-xs font-semibold text-slate-600">Date</span><input type="date" className={input} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
          <label><span className="text-xs font-semibold text-slate-600">Time</span><input className={input} value={f.timeSlot} onChange={(e) => setF({ ...f, timeSlot: e.target.value })} placeholder="10:00 AM - 01:00 PM" /></label>
          <label><span className="text-xs font-semibold text-slate-600">Room</span><input className={input} value={f.roomNumber} onChange={(e) => setF({ ...f, roomNumber: e.target.value })} /></label>
          <label><span className="text-xs font-semibold text-slate-600">Status</span>
            <select className={input} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as any })}><option>Upcoming</option><option>Ongoing</option><option>Completed</option></select></label>
          <label className="col-span-2"><span className="text-xs font-semibold text-slate-600">Instructions</span><textarea rows={2} className={input} value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} /></label>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-semibold cursor-pointer">Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold cursor-pointer disabled:opacity-60"><Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>
    </div>
  );
};
