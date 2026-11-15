// =====================================================================================================
// Practical / Lab records screen (used by Admin, Faculty and Student dashboards)
// -----------------------------------------------------------------------------------------------------
// Step 18 rewrite: practicals are now saved ON THE SERVER (before, they lived only in one browser and were
// lost when its data was cleared). What each person can do:
//   * Admin / Faculty: add a practical (typed, photo, or handwritten-note), EDIT it, DELETE it, and open
//     "Marks" to enter each student's status + marks (save all at once, or delete one student's entry).
//     A faculty member can only change practicals of the subjects assigned to them (checked by the server).
//   * Student / Parent: see the practicals of their class and their own status / marks.
// Filters: branch, semester, academic year and a search box. Sample (random) practicals show a SAMPLE badge.
// Server: server/routes/practicals.ts      Browser calls: src/services/step18Api.ts (practicalsApi)
// =====================================================================================================
import React, { useEffect, useMemo, useState } from 'react';
import { FlaskConical, FileText, Plus, Camera, PenTool, Trash2, Download, X, Search, Pencil, ClipboardCheck, Save, RefreshCw } from 'lucide-react';
import { useCollege } from '../../context/CollegeContext';
import { useSeesSample } from '../../hooks/useSeesSample';
import type { BranchCode } from '../../types';
import { practicalsApi, type ServerPractical, type PracticalRecordRow } from '../../services/step18Api';
import { notify, confirmDialog } from './ui/feedback';

// Data shape: practical lab manager props.
interface PracticalLabManagerProps {
  isFacultyOrAdmin?: boolean;
}

/** Empty form values (also used to reset the form after saving). */
const BLANK = { id: '', subjectId: '', experimentNo: 1, title: '', objective: '', apparatusText: '', procedureText: '', vivaText: '', maxMarks: 10,
  inputType: 'typed' as 'typed' | 'image' | 'written_note', imageUrl: '', writtenNoteUrl: '' };

// Screen part: practical lab manager.
export const PracticalLabManager: React.FC<PracticalLabManagerProps> = ({ isFacultyOrAdmin = false }) => {
  const { currentUser, subjects } = useCollege();
  const showSample = useSeesSample();   // SAMPLE badges only for admin / CSE HOD
  const canManage = isFacultyOrAdmin || currentUser.role === 'admin' || currentUser.role === 'faculty';
  // A faculty member may only manage subjects assigned to them (the server checks this again)
  const mySubjectIds = new Set(currentUser.assignedSubjectIds || []);
  // true / false: can edit subject?
  const canEditSubject = (subjectId: string) => currentUser.role === 'admin' || mySubjectIds.has(subjectId);

  // List (kept in screen state)
  const [list, setList] = useState<ServerPractical[]>([]);
  // true while waiting for the server (buttons are disabled meanwhile)
  const [loading, setLoading] = useState(true);
  // Branch (kept in screen state)
  const [branch, setBranch] = useState<BranchCode>(currentUser.branch || 'CSE');
  // Semester (kept in screen state)
  const [semester, setSemester] = useState<number | ''>(canManage ? '' : (currentUser.semester || ''));
  // Year (kept in screen state)
  const [year, setYear] = useState('');
  // Text typed in the search box
  const [searchQuery, setSearchQuery] = useState('');
  // Form (kept in screen state)
  const [form, setForm] = useState<typeof BLANK | null>(null);      // add / edit modal
  // true while waiting for the server (buttons are disabled meanwhile)
  const [saving, setSaving] = useState(false);
  // Marks for (kept in screen state)
  const [marksFor, setMarksFor] = useState<ServerPractical | null>(null);   // "Marks" modal
  // List of my marks shown on this screen
  const [myMarks, setMyMarks] = useState<Record<string, PracticalRecordRow>>({});   // student: own record per practical

  /** Load all practicals the user may see. */
  const load = async () => {
    setLoading(true);
    const r = await practicalsApi.list();
    setLoading(false);
    if (!r.ok) return notify.error('Could not load the practicals', r.error);
    setList(r.data);
  };
  // Runs automatically whenever these change: list, canManage.
  useEffect(() => { load(); }, []);

  // Student / parent: fetch their own status + marks for each visible practical (small classes, so one call each is fine)
  useEffect(() => {
    if (canManage || !list.length) return;
    (async () => {
      const out: Record<string, PracticalRecordRow> = {};
      for (const p of list.slice(0, 60)) {
        const r = await practicalsApi.records(p.id);
        if (r.ok && r.data[0]) out[p.id] = r.data[0];
      }
      setMyMarks(out);
    })();
  }, [list, canManage]);

  const years = useMemo(() => [...new Set(list.map((p) => p.academicYear))].sort().reverse(), [list]);
  const branchSubjects = subjects.filter((s) => s.branch === branch && (currentUser.role === 'admin' || !canManage || mySubjectIds.has(s.id) || mySubjectIds.size === 0));
  const shown = list.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    return p.branch === branch && (!semester || p.semester === semester) && (!year || p.academicYear === year)
      && (!q || p.title.toLowerCase().includes(q) || p.subjectCode.toLowerCase().includes(q) || p.subjectName.toLowerCase().includes(q));
  });

  // ---------- add / edit ----------
  const openAdd = () => setForm({ ...BLANK, subjectId: branchSubjects[0]?.id || '' });
  // Open edit.
  const openEdit = (p: ServerPractical) => setForm({
    id: p.id, subjectId: p.subjectId, experimentNo: p.experimentNo, title: p.title, objective: p.objective, maxMarks: p.maxMarks,
    apparatusText: p.apparatus.join('\n'), procedureText: p.procedureSteps.join('\n'),
    vivaText: p.vivaQuestions.map((v) => `${v.question.replace(/\?$/, '')}? ${v.answerSummary}`).join('\n'),
    inputType: (p.inputType as any) || 'typed', imageUrl: p.imageUrl || '', writtenNoteUrl: p.writtenNoteUrl || '',
  });

  // Called when: image.
  const onImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) return notify.warning('Photo is too large', 'Please choose a photo smaller than 1 MB.');
    const reader = new FileReader();
    reader.onloadend = () => setForm((f) => (f ? { ...f, imageUrl: reader.result as string } : f));
    reader.readAsDataURL(file);
  };

  // Save.
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.subjectId) return notify.warning('Please choose a subject.');
    // Lines.
    const lines = (t: string) => t.split('\n').map((x) => x.trim()).filter(Boolean);
    const body = {
      subjectId: form.subjectId, experimentNo: Number(form.experimentNo) || 1, title: form.title.trim(), objective: form.objective.trim(), maxMarks: Number(form.maxMarks) || 10,
      apparatus: lines(form.apparatusText), procedureSteps: lines(form.procedureText),
      // "Question? Answer" per line
      vivaQuestions: lines(form.vivaText).map((l) => { const i = l.indexOf('?'); return i < 0 ? { question: l, answerSummary: '' } : { question: l.slice(0, i + 1), answerSummary: l.slice(i + 1).trim() }; }),
      inputType: form.inputType, imageUrl: form.inputType === 'image' ? form.imageUrl || undefined : undefined,
      writtenNoteUrl: form.inputType === 'written_note' ? form.writtenNoteUrl || undefined : undefined,
    };
    setSaving(true);
    const r = form.id ? await practicalsApi.update(form.id, body as any) : await practicalsApi.create(body as any);
    setSaving(false);
    if (!r.ok) return notify.error('Could not save the practical', r.error);
    setList((l) => [r.data, ...l.filter((x) => x.id !== r.data.id)].sort((a, b) => a.subjectCode.localeCompare(b.subjectCode) || a.experimentNo - b.experimentNo));
    notify.success(form.id ? 'Practical updated' : 'Practical added', `${r.data.subjectCode} · Practical ${r.data.experimentNo}: ${r.data.title}`);
    setForm(null);
  };

  // Remove.
  const remove = async (p: ServerPractical) => {
    if (!(await confirmDialog({ title: `Delete practical ${p.experimentNo}?`, message: `"${p.title}" (${p.subjectCode}) will be removed from the list. Marks already entered stay saved in the records.`, danger: true }))) return;
    const r = await practicalsApi.remove(p.id);
    if (!r.ok) return notify.error('Could not delete', r.error);
    setList((l) => l.filter((x) => x.id !== p.id));
    notify.success('Practical deleted');
  };

  /** Download the practical as a text file (manual sheet). */
  const download = (p: ServerPractical) => {
    const text = `UTTARAKHAND GOVERNMENT INSTITUTE OF POLYTECHNIC - PRACTICAL SHEET
-----------------------------------------------------------
Practical ${p.experimentNo}: ${p.title}
Subject: ${p.subjectCode} - ${p.subjectName}   (${p.branch}, Semester ${p.semester}, ${p.academicYear})
Maximum marks: ${p.maxMarks}
-----------------------------------------------------------
AIM / OBJECTIVE:
${p.objective}

APPARATUS / SOFTWARE:
${p.apparatus.map((a, i) => `${i + 1}. ${a}`).join('\n') || '-'}

PROCEDURE:
${p.procedureSteps.map((s, i) => `Step ${i + 1}: ${s}`).join('\n') || '-'}

VIVA QUESTIONS:
${p.vivaQuestions.map((v, i) => `Q${i + 1}: ${v.question}\nAns: ${v.answerSummary}`).join('\n\n') || '-'}
`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = `${p.subjectCode}_Practical${p.experimentNo}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const field = 'w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white';
  const statusTone: Record<string, string> = { Completed: 'bg-emerald-100 text-emerald-800', Pending: 'bg-slate-100 text-slate-700', Absent: 'bg-rose-100 text-rose-800', 'Needs Revision': 'bg-amber-100 text-amber-800' };

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center"><FlaskConical className="w-6 h-6" /></div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Practical & Lab Records</h3>
            <p className="text-sm text-slate-500">{canManage ? 'Add, edit or delete practicals and enter each student\'s practical marks.' : 'Practicals of your class with your status and marks.'}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={branch} onChange={(e) => setBranch(e.target.value as BranchCode)} className={field + ' w-auto'} aria-label="Branch"><option value="CSE">CSE</option><option value="Civil">Civil</option></select>
          <select value={semester} onChange={(e) => setSemester(e.target.value ? Number(e.target.value) : '')} className={field + ' w-auto'} aria-label="Semester"><option value="">All semesters</option>{[1, 2, 3, 4, 5, 6].map((s) => <option key={s} value={s}>Semester {s}</option>)}</select>
          <select value={year} onChange={(e) => setYear(e.target.value)} className={field + ' w-auto'} aria-label="Academic year"><option value="">All years</option>{years.map((y) => <option key={y}>{y}</option>)}</select>
          <button onClick={load} aria-label="Refresh" className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          {canManage && <button onClick={openAdd} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-semibold cursor-pointer"><Plus className="w-4 h-4" /> Add practical</button>}
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by title or subject code" className={field + ' pl-9'} />
      </div>

      {loading ? <div className="p-10 text-center text-sm text-slate-500">Loading practicals…</div>
        : shown.length === 0 ? <div className="p-10 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-sm text-slate-500">No practicals for this selection{canManage ? ' yet. Use "Add practical" to create one.' : '.'}</div>
        : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shown.map((p) => {
              const mine = myMarks[p.id];
              const editable = canManage && canEditSubject(p.subjectId);
              return (
                <article key={p.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm flex flex-col gap-3 hover:border-indigo-300 transition-colors">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">{p.subjectCode} · Practical {p.experimentNo}</span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Sem {p.semester} · {p.academicYear}</span>
                    {p.isDemo && showSample && <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">SAMPLE</span>}
                    <span className="ml-auto text-xs font-semibold text-slate-500">Max {p.maxMarks}</span>
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white leading-snug">{p.title}</h4>
                  <p className="text-xs text-slate-500">{p.subjectName}</p>
                  {p.imageUrl && <img src={p.imageUrl} alt={p.title} className="rounded-xl border border-slate-200 dark:border-slate-700 max-h-44 object-cover" />}
                  {p.writtenNoteUrl && <p className="text-xs flex items-center gap-1.5 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5"><PenTool className="w-3.5 h-3.5" /> Handwritten note: {p.writtenNoteUrl}</p>}
                  {p.objective && <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 rounded-lg p-2.5"><b>Aim:</b> {p.objective}</p>}
                  {!canManage && (
                    <div className="text-sm flex items-center gap-2">
                      <span className="text-slate-500">Your record:</span>
                      {mine?.status ? <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusTone[mine.status]}`}>{mine.status}</span> : <span className="text-xs text-slate-400">not entered yet</span>}
                      {mine?.marks !== null && mine?.marks !== undefined && <span className="font-bold">{mine.marks}/{p.maxMarks}</span>}
                    </div>
                  )}
                  <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                    <button onClick={() => download(p)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"><Download className="w-3.5 h-3.5" /> Download</button>
                    {canManage && <button onClick={() => setMarksFor(p)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-100 cursor-pointer"><ClipboardCheck className="w-3.5 h-3.5" /> Marks</button>}
                    {editable && <>
                      <button onClick={() => openEdit(p)} aria-label="Edit practical" className="ml-auto p-1.5 rounded-lg text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950 cursor-pointer"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => remove(p)} aria-label="Delete practical" className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                    </>}
                  </div>
                </article>
              );
            })}
          </div>
        )}

      {/* ---------- add / edit modal ---------- */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 overflow-y-auto" onMouseDown={(e) => { if (e.target === e.currentTarget) setForm(null); }}>
          <form onSubmit={save} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-900 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white">{form.id ? 'Edit practical' : 'Add practical'}</h3>
              <button type="button" onClick={() => setForm(null)} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-3 gap-2">
                {([['typed', FileText, 'Type it'], ['image', Camera, 'Photo / diagram'], ['written_note', PenTool, 'Handwritten note']] as const).map(([k, Icon, label]) => (
                  <button type="button" key={k} onClick={() => setForm({ ...form, inputType: k })}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 cursor-pointer ${form.inputType === k ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <Icon className="w-4 h-4" />{label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <label className="col-span-2"><span className="text-xs font-semibold text-slate-600">Subject *</span>
                  <select className={field} value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} required>
                    <option value="">Choose…</option>
                    {subjects.filter((s) => canEditSubject(s.id) || currentUser.role === 'admin').map((s) => <option key={s.id} value={s.id}>{s.branch} · Sem {s.semester} · {s.code} {s.name}</option>)}
                  </select></label>
                <label><span className="text-xs font-semibold text-slate-600">Practical no. *</span>
                  <input type="number" min={1} className={field} value={form.experimentNo} onChange={(e) => setForm({ ...form, experimentNo: Number(e.target.value) })} required /></label>
              </div>
              <label className="block"><span className="text-xs font-semibold text-slate-600">Title *</span>
                <input className={field} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Install and configure a DHCP server" /></label>
              {form.inputType === 'image' && (
                <label className="block"><span className="text-xs font-semibold text-slate-600">Photo of the setup / circuit (max 1 MB)</span>
                  <input type="file" accept="image/*" onChange={onImage} className={field} />
                  {form.imageUrl && <img src={form.imageUrl} alt="Preview" className="mt-2 rounded-lg max-h-40" />}</label>
              )}
              {form.inputType === 'written_note' && (
                <label className="block"><span className="text-xs font-semibold text-slate-600">Name of the handwritten page / scan</span>
                  <input className={field} value={form.writtenNoteUrl} onChange={(e) => setForm({ ...form, writtenNoteUrl: e.target.value })} placeholder="e.g. Practical_4_notes.pdf" /></label>
              )}
              <label className="block"><span className="text-xs font-semibold text-slate-600">Aim / objective</span>
                <textarea rows={2} className={field} value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} /></label>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block"><span className="text-xs font-semibold text-slate-600">Apparatus (one per line)</span>
                  <textarea rows={3} className={field} value={form.apparatusText} onChange={(e) => setForm({ ...form, apparatusText: e.target.value })} /></label>
                <label className="block"><span className="text-xs font-semibold text-slate-600">Procedure (one step per line)</span>
                  <textarea rows={3} className={field} value={form.procedureText} onChange={(e) => setForm({ ...form, procedureText: e.target.value })} /></label>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <label className="col-span-2 block"><span className="text-xs font-semibold text-slate-600">Viva questions ("Question? Answer" per line)</span>
                  <textarea rows={2} className={field} value={form.vivaText} onChange={(e) => setForm({ ...form, vivaText: e.target.value })} /></label>
                <label><span className="text-xs font-semibold text-slate-600">Max marks</span>
                  <input type="number" min={1} className={field} value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: Number(e.target.value) })} /></label>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white dark:bg-slate-900 px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button type="button" onClick={() => setForm(null)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm font-semibold cursor-pointer">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-semibold cursor-pointer disabled:opacity-60"><Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save practical'}</button>
            </div>
          </form>
        </div>
      )}

      {marksFor && <PracticalMarksModal practical={marksFor} editable={canEditSubject(marksFor.subjectId)} onClose={() => setMarksFor(null)} />}
    </div>
  );
};

/** Class list of one practical: status + marks + remark per student; save all at once, delete one student's entry. */
const PracticalMarksModal: React.FC<{ practical: ServerPractical; editable: boolean; onClose: () => void }> = ({ practical, editable, onClose }) => {
  // List of rows shown on this screen
  const [rows, setRows] = useState<PracticalRecordRow[]>([]);
  // true while waiting for the server (buttons are disabled meanwhile)
  const [loading, setLoading] = useState(true);
  // true while waiting for the server (buttons are disabled meanwhile)
  const [saving, setSaving] = useState(false);

  // Loads the data from the server.
  const load = async () => {
    setLoading(true);
    const r = await practicalsApi.records(practical.id);
    setLoading(false);
    if (!r.ok) return notify.error('Could not load the class list', r.error);
    setRows(r.data);
  };
  // Runs automatically whenever these change: practical.id.
  useEffect(() => { load(); }, [practical.id]);

  // Set row.
  const setRow = (i: number, patch: Partial<PracticalRecordRow>) => setRows((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  // Save all.
  const saveAll = async () => {
    const changed = rows.filter((r) => r.status || r.marks !== null);
    if (!changed.length) return notify.info('Nothing to save yet', 'Choose a status or type marks for at least one student.');
    const bad = changed.find((r) => r.marks !== null && (r.marks < 0 || r.marks > practical.maxMarks));
    if (bad) return notify.warning(`Marks of ${bad.name} must be between 0 and ${practical.maxMarks}.`);
    setSaving(true);
    const r = await practicalsApi.saveRecords(practical.id, changed.map((x) => ({ studentId: x.studentId, status: x.status || undefined, marks: x.marks, remarks: x.remarks })));
    setSaving(false);
    if (!r.ok) return notify.error('Could not save the marks', r.error);
    notify.success('Practical marks saved', `${r.data.saved} student(s) updated.`);
    load();
  };

  // Clear one.
  const clearOne = async (row: PracticalRecordRow) => {
    if (!(await confirmDialog({ title: `Delete the entry of ${row.name}?`, message: 'Their status and marks for this practical will be removed.', danger: true }))) return;
    const r = await practicalsApi.removeRecord(practical.id, row.studentId);
    if (!r.ok) return notify.error('Could not delete', r.error);
    notify.success('Entry deleted');
    load();
  };

  const done = rows.filter((r) => r.status === 'Completed').length;
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Practical {practical.experimentNo} · Marks</h3>
            <p className="text-xs text-slate-500">{practical.subjectCode} {practical.subjectName} · {practical.title} · Max {practical.maxMarks} · {done}/{rows.length} completed</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-auto px-6 py-3">
          {loading ? <p className="py-8 text-center text-sm text-slate-500">Loading class list…</p> : rows.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No students in this class.</p> : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white dark:bg-slate-900 text-xs text-slate-500 text-left"><tr><th className="py-2 pr-2">Roll no</th><th className="py-2 pr-2">Name</th><th className="py-2 pr-2">Status</th><th className="py-2 pr-2">Marks</th><th className="py-2 pr-2">Remark</th><th /></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.studentId} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-1.5 pr-2 font-mono text-xs">{r.rollNo}</td>
                    <td className="py-1.5 pr-2">{r.name}</td>
                    <td className="py-1.5 pr-2">
                      <select disabled={!editable} value={r.status || ''} onChange={(e) => setRow(i, { status: (e.target.value || null) as any })} className="px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs">
                        <option value="">—</option><option>Completed</option><option>Pending</option><option>Needs Revision</option><option>Absent</option>
                      </select></td>
                    <td className="py-1.5 pr-2"><input disabled={!editable} type="number" step="0.5" min={0} max={practical.maxMarks} value={r.marks ?? ''} aria-label={`Marks of ${r.name}`}
                      onChange={(e) => setRow(i, { marks: e.target.value === '' ? null : Number(e.target.value) })} className="w-20 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs" /></td>
                    <td className="py-1.5 pr-2"><input disabled={!editable} value={r.remarks || ''} onChange={(e) => setRow(i, { remarks: e.target.value })} className="w-full min-w-28 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs" /></td>
                    <td className="py-1.5">{editable && r.updatedAt && <button onClick={() => clearOne(r)} aria-label={`Delete entry of ${r.name}`} className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"><Trash2 className="w-4 h-4" /></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-2">
          <span className="text-xs text-slate-500">{editable ? 'Change any value, then press Save.' : 'Only the teacher of this subject can change these marks.'}</span>
          {editable && <button onClick={saveAll} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-semibold cursor-pointer disabled:opacity-60"><Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save all marks'}</button>}
        </div>
      </div>
    </div>
  );
};
