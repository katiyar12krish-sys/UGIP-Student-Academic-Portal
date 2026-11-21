// ===================================================================================================
// Doubt Q&A board: the admin (any class) or a teacher (own subject) posts a question with an optional answer
// and an optional PDF / picture for a class. Students see the posts of their own class and open the file.
// Server rules: server/qa/service.ts
// ===================================================================================================
import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Paperclip, Plus, Trash2, X, HelpCircle } from 'lucide-react';
import { useCollege } from '../../context/CollegeContext';
import { call } from '../../services/academicApi';
import { uploadFile } from '../../services/materialsApi';
import { notify, confirmDialog } from './ui/feedback';

interface QaPost {
  id: string; title: string; body: string; answer: string; branch: string; semester: number;
  subjectId: string | null; subjectCode: string; subjectName: string; authorName: string; authorRole: string; createdAt: number;
  file: { name: string; kind: string; size: number } | null; canDelete: boolean;
}

export const ClassQuestionBoard: React.FC<{ mode: 'student' | 'faculty' | 'admin' }> = ({ mode }) => {
  const { subjects, currentUser } = useCollege();
  const [posts, setPosts] = useState<QaPost[]>([]);
  const [open, setOpen] = useState(false);
  const [showAnswer, setShowAnswer] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ branch: 'CSE', semester: 1, subjectId: '', title: '', body: '', answer: '' });
  const [file, setFile] = useState<File | null>(null);

  const load = async () => { const r = await call<QaPost[]>('GET', '/api/qa'); if (r.ok) setPosts(r.data); };
  useEffect(() => { load(); }, []);

  // admin: every subject of the chosen class (or "all subjects"); teacher: only their own subjects
  const subjectChoices = useMemo(() => (mode === 'admin'
    ? subjects.filter((s) => s.branch === form.branch && s.semester === form.semester)
    : subjects.filter((s) => (currentUser.assignedSubjectIds ?? []).includes(s.id))), [mode, subjects, form.branch, form.semester, currentUser.assignedSubjectIds]);

  const submit = async () => {
    if (!form.title.trim()) return notify.error('Write the question');
    if (mode === 'faculty' && !form.subjectId) return notify.error('Choose your subject');
    setBusy(true);
    let fileId: string | undefined;
    if (file) {
      const up = await uploadFile(file);
      if (!up.ok) { setBusy(false); return notify.error('Could not upload the file', up.error); }
      fileId = up.data.fileId;
    }
    const r = await call<QaPost>('POST', '/api/qa', { ...form, subjectId: form.subjectId || undefined, fileId });
    setBusy(false);
    if (!r.ok) return notify.error('Could not post', r.error);
    notify.success('Question posted for the class');
    setForm((f) => ({ ...f, title: '', body: '', answer: '' })); setFile(null); setOpen(false); load();
  };

  const remove = async (p: QaPost) => {
    if (!(await confirmDialog({ title: 'Delete this question?', message: p.title, confirmText: 'Delete', danger: true }))) return;
    const r = await call<{ ok: true }>('DELETE', `/api/qa/${encodeURIComponent(p.id)}`);
    if (!r.ok) return notify.error('Could not delete', r.error);
    load();
  };

  const inp = 'w-full p-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 rounded-lg text-xs';
  if (mode === 'student' && !posts.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-3">
        <div className="w-full">
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2"><HelpCircle className="w-4 h-4 text-indigo-600 shrink-0" /> Class questions & PDFs</h3>
          <p className="text-xs text-slate-500 mt-1">{mode === 'student' ? 'Questions and files posted by the college for your class.' : 'Post a question (with answer and PDF if you like) for a whole class.'}</p>
        </div>
        {mode !== 'student' && (
          <div className="w-full sm:w-auto">
            <button onClick={() => setOpen((o) => !o)} className="w-full sm:w-auto px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">
              {open ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {open ? 'Close' : 'Post a question'}
            </button>
          </div>
        )}
      </div>

      {open && mode !== 'student' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
          {mode === 'admin' && (<>
            <select className={inp} value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value, subjectId: '' })} aria-label="Branch">
              <option value="CSE">CSE</option><option value="Civil">Civil</option>
            </select>
            <select className={inp} value={form.semester} onChange={(e) => setForm({ ...form, semester: Number(e.target.value), subjectId: '' })} aria-label="Semester">
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>Semester {n}</option>)}
            </select>
          </>)}
          <select className={`${inp} ${mode === 'admin' ? '' : 'sm:col-span-3'}`} value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} aria-label="Subject">
            <option value="">{mode === 'admin' ? 'All subjects (whole class)' : '— Choose your subject —'}</option>
            {subjectChoices.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code}){mode !== 'admin' ? ` · ${s.branch} Sem ${s.semester}` : ''}</option>)}
          </select>
          <input className={`${inp} sm:col-span-3`} placeholder="Question *" value={form.title} maxLength={300} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className={`${inp} sm:col-span-3`} rows={3} placeholder="Details (optional)" value={form.body} maxLength={4000} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <textarea className={`${inp} sm:col-span-3`} rows={3} placeholder="Answer / explanation (optional)" value={form.answer} maxLength={4000} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
          <label className="sm:col-span-2 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
            <Paperclip className="w-4 h-4" />
            <input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-xs" />
          </label>
          <button disabled={busy} onClick={submit} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold cursor-pointer">{busy ? 'Posting…' : 'Post'}</button>
        </div>
      )}

      <div className="space-y-2.5">
        {posts.map((p) => (
          <div key={p.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] text-slate-500">{p.branch} · Sem {p.semester} · {p.subjectName} · by {p.authorName} · {new Date(p.createdAt).toLocaleDateString()}</p>
                <p className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">{p.title}</p>
                {p.body && <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap">{p.body}</p>}
              </div>
              {p.canDelete && (
                <button onClick={() => remove(p)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg cursor-pointer" aria-label="Delete question"><Trash2 className="w-4 h-4" /></button>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {p.file && (
                <a href={`/api/qa/${encodeURIComponent(p.id)}/file`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                  <FileText className="w-3.5 h-3.5" /> {p.file.name}
                </a>
              )}
              {p.answer && (
                <button onClick={() => setShowAnswer((s) => ({ ...s, [p.id]: !s[p.id] }))} className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-xs font-semibold cursor-pointer">
                  {showAnswer[p.id] ? 'Hide answer' : 'Show answer'}
                </button>
              )}
            </div>
            {p.answer && showAnswer[p.id] && <p className="mt-2 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30">{p.answer}</p>}
          </div>
        ))}
        {!posts.length && <p className="text-xs text-slate-500 text-center py-4">No questions posted yet.</p>}
      </div>
    </div>
  );
};
