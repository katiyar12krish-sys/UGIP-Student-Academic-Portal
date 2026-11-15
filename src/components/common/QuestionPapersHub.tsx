// ===================================================================================================
// "Question Papers & Answer Keys" screen for admin, faculty and students.
//  - every subject has two built-in sample papers (Set A / Set B) made from the UBTER syllabus, each with an answer key
//  - staff can upload old board papers / new papers (with or without answer key) and upload / replace any answer key
//  - everybody who can see a paper can open it in the browser or download it; same for its answer key
// Files live inside the database on the server (server/papers/service.ts); this screen only shows and sends them.
// ===================================================================================================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Download, Eye, Upload, KeyRound, Trash2, RefreshCw, Search, Plus, X, FolderDown, FolderUp } from 'lucide-react';
import { useCollege } from '../../context/CollegeContext';
import { papersApi, fileLink, type QuestionPaper, type PaperSubject, type PaperKind } from '../../services/papersApi';
import { uploadFile } from '../../services/materialsApi';

const KIND_LABEL: Record<PaperKind, string> = { sample: 'Sample paper', previous: 'Old board paper', model: 'Model / practice paper' };
const KIND_STYLE: Record<PaperKind, string> = {
  sample: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  previous: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  model: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
};
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.docx';
const btn = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-colors disabled:opacity-50';
const inp = 'w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white';

/** Pick one file and upload it (step one); returns the fileId or an error text. */
async function pickAndUpload(file: File | undefined): Promise<{ id?: string; error?: string }> {
  if (!file) return {};
  const r = await uploadFile(file);
  return r.ok ? { id: r.data.fileId } : { error: r.error };
}

export const QuestionPapersHub: React.FC = () => {
  const { authUser } = useCollege();
  const isStaff = authUser?.role === 'admin' || authUser?.role === 'faculty';
  const isAdmin = authUser?.role === 'admin';
  // Papers from the server
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  // Filters
  const [sem, setSem] = useState<number | 'all'>('all');
  const [branch, setBranch] = useState<'all' | 'CSE' | 'Civil'>('all');
  const [kind, setKind] = useState<PaperKind | 'all'>('all');
  const [q, setQ] = useState('');
  // Which paper is busy (uploading an answer key etc.)
  const [busyId, setBusyId] = useState<string | null>(null);
  // The separate "Upload / Download" panel
  const [panel, setPanel] = useState<'none' | 'upload' | 'download'>('none');

  const load = async () => {
    setLoading(true);
    const r = await papersApi.list();
    setLoading(false);
    if (r.ok) setPapers(r.data); else setMsg({ ok: false, t: r.error });
  };
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => papers.filter((p) =>
    (sem === 'all' || p.semester === sem) &&
    (branch === 'all' || p.branch === 'All' || p.branch === branch) &&
    (kind === 'all' || p.kind === kind) &&
    (!q.trim() || `${p.subjectName} ${p.subjectCode} ${p.title} ${p.examYear || ''}`.toLowerCase().includes(q.trim().toLowerCase()))), [papers, sem, branch, kind, q]);

  // group: semester -> subject -> papers
  const groups = useMemo(() => {
    const m = new Map<number, Map<string, QuestionPaper[]>>();
    for (const p of shown) {
      if (!m.has(p.semester)) m.set(p.semester, new Map());
      const s = m.get(p.semester)!; const k = `${p.subjectCode}|${p.subjectName}|${p.branch}`;
      if (!s.has(k)) s.set(k, []);
      s.get(k)!.push(p);
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [shown]);
  const semesters = useMemo(() => [...new Set(papers.map((p) => p.semester))].sort(), [papers]);

  const replaceIn = (p: QuestionPaper) => setPapers((all) => all.map((x) => (x.id === p.id ? p : x)));

  const uploadAnswer = async (p: QuestionPaper, file: File | undefined) => {
    if (!file) return;
    setBusyId(p.id); setMsg(null);
    const up = await pickAndUpload(file);
    if (up.error || !up.id) { setBusyId(null); return setMsg({ ok: false, t: up.error || 'Upload failed' }); }
    const r = await papersApi.setAnswer(p.id, up.id);
    setBusyId(null);
    if (!r.ok) return setMsg({ ok: false, t: r.error });
    replaceIn(r.data);
    setMsg({ ok: true, t: `Answer key saved for ${p.subjectName} – ${p.title}.` });
  };
  const uploadPaperFile = async (p: QuestionPaper, file: File | undefined) => {
    if (!file) return;
    setBusyId(p.id); setMsg(null);
    const up = await pickAndUpload(file);
    if (up.error || !up.id) { setBusyId(null); return setMsg({ ok: false, t: up.error || 'Upload failed' }); }
    const r = await papersApi.setPaper(p.id, up.id);
    setBusyId(null);
    if (!r.ok) return setMsg({ ok: false, t: r.error });
    replaceIn(r.data);
    setMsg({ ok: true, t: `Question paper replaced for ${p.subjectName} – ${p.title}.` });
  };
  const remove = async (p: QuestionPaper) => {
    if (!window.confirm(`Remove "${p.subjectName} – ${p.title}" and its answer key?`)) return;
    setBusyId(p.id);
    const r = await papersApi.remove(p.id);
    setBusyId(null);
    if (!r.ok) return setMsg({ ok: false, t: r.error });
    setPapers((all) => all.filter((x) => x.id !== p.id));
    setMsg({ ok: true, t: 'Paper removed.' });
  };
  const restore = async () => {
    const r = await papersApi.restoreSamples();
    if (!r.ok) return setMsg({ ok: false, t: r.error });
    setMsg({ ok: true, t: r.data.restored ? `${r.data.restored} sample paper(s) brought back.` : 'No sample paper was missing.' });
    load();
  };

  return (
    <div className="space-y-4">
      {/* title */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" /> प्रश्न पत्र और उत्तर कुंजी / Question Papers & Answer Keys
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Two sample papers (Set A, Set B) for every subject, made from the UBTER syllabus, each with a separate answer key. Old board papers can be added too.
              Open a paper in the browser or download it.{isStaff ? ' Staff can upload new papers and upload or replace any answer key.' : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setPanel(panel === 'download' ? 'none' : 'download')} className={`${btn} px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800`}>
              <FolderDown className="w-4 h-4" /> पेपर डाउनलोड / Download papers
            </button>
            {isStaff && (
              <button onClick={() => setPanel(panel === 'upload' ? 'none' : 'upload')} className={`${btn} px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white`}>
                <FolderUp className="w-4 h-4" /> नया पेपर अपलोड / Upload new paper
              </button>
            )}
          </div>
        </div>
        {msg && <p className={`mt-3 text-xs font-bold ${msg.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{msg.t}</p>}
      </section>

      {panel === 'upload' && isStaff && <UploadPanel onClose={() => setPanel('none')} onDone={(p) => { setPapers((all) => [...all, p]); setMsg({ ok: true, t: `Saved: ${p.subjectName} – ${p.title}.` }); setPanel('none'); }} />}
      {panel === 'download' && <DownloadPanel papers={papers} onClose={() => setPanel('none')} />}

      {/* filters */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {(['all', ...semesters] as (number | 'all')[]).map((s) => (
            <button key={String(s)} onClick={() => setSem(s)} className={`${btn} ${sem === s ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'}`}>
              {s === 'all' ? 'All semesters' : `Semester ${s}`}
            </button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search subject / code / year" className={`${inp} pl-8`} />
          </div>
          <select value={kind} onChange={(e) => setKind(e.target.value as any)} className={inp}>
            <option value="all">All kinds of papers</option>
            <option value="sample">Sample papers (from syllabus)</option>
            <option value="previous">Old board papers</option>
            <option value="model">Model / practice papers</option>
          </select>
          {isStaff ? (
            <select value={branch} onChange={(e) => setBranch(e.target.value as any)} className={inp}>
              <option value="all">All branches</option><option value="CSE">CSE</option><option value="Civil">Civil</option>
            </select>
          ) : <div />}
        </div>
        {isAdmin && (
          <button onClick={restore} className={`${btn} text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800`}>
            <RefreshCw className="w-3.5 h-3.5" /> Bring back removed sample papers
          </button>
        )}
      </section>

      {loading && <p className="text-xs text-slate-500">Loading papers…</p>}
      {!loading && !shown.length && <p className="text-xs text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">No paper matches these filters.</p>}

      {groups.map(([s, subjects]) => (
        <section key={s} className="space-y-2">
          <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400 px-1">Semester {s}</h4>
          <div className="grid gap-3 lg:grid-cols-2">
            {[...subjects.entries()].map(([k, list]) => (
              <article key={k} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">{list[0].subjectName}</h5>
                    <p className="text-[11px] text-slate-500 font-mono">{list[0].subjectCode} · {list[0].branch === 'All' ? 'All branches' : list[0].branch}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{list.length} paper{list.length > 1 ? 's' : ''}</span>
                </div>
                <ul className="mt-3 space-y-2.5">
                  {list.map((p) => <PaperRow key={p.id} p={p} busy={busyId === p.id} onAnswer={uploadAnswer} onPaper={uploadPaperFile} onRemove={remove} />)}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

/** One paper: open / download the paper and its answer key; staff: upload or replace. */
const PaperRow: React.FC<{ p: QuestionPaper; busy: boolean; onAnswer: (p: QuestionPaper, f?: File) => void; onPaper: (p: QuestionPaper, f?: File) => void; onRemove: (p: QuestionPaper) => void }> = ({ p, busy, onAnswer, onPaper, onRemove }) => {
  const ansRef = useRef<HTMLInputElement>(null), paperRef = useRef<HTMLInputElement>(null);
  return (
    <li className="rounded-xl border border-slate-100 dark:border-slate-800 p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-900 dark:text-white">{p.title}{p.examYear ? ` (${p.examYear})` : ''}</span>
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${KIND_STYLE[p.kind]}`}>{KIND_LABEL[p.kind]}</span>
        <span className="text-[10px] text-slate-400 ml-auto">{p.paper.size} · {p.downloads} opens</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold text-slate-500 w-20">Question paper</span>
        <a href={fileLink(p.paper.url, false)} target="_blank" rel="noopener" className={`${btn} bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200`}><Eye className="w-3.5 h-3.5" /> खोलें / Open</a>
        <a href={fileLink(p.paper.url, true)} className={`${btn} bg-blue-600 hover:bg-blue-700 text-white`}><Download className="w-3.5 h-3.5" /> Download</a>
        {p.canRemove && (
          <>
            <button disabled={busy} onClick={() => paperRef.current?.click()} className={`${btn} text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800`}><Upload className="w-3.5 h-3.5" /> Replace</button>
            <input ref={paperRef} type="file" accept={ACCEPT} hidden onChange={(e) => { onPaper(p, e.target.files?.[0]); e.target.value = ''; }} />
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold text-slate-500 w-20">Answer key</span>
        {p.answer ? (
          <>
            <a href={fileLink(p.answer.url, false)} target="_blank" rel="noopener" className={`${btn} bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100`}><Eye className="w-3.5 h-3.5" /> खोलें / Open</a>
            <a href={fileLink(p.answer.url, true)} className={`${btn} bg-emerald-600 hover:bg-emerald-700 text-white`}><Download className="w-3.5 h-3.5" /> Download</a>
          </>
        ) : <span className="text-[11px] text-slate-400">not added yet</span>}
        {p.canEdit && (
          <>
            <button disabled={busy} onClick={() => ansRef.current?.click()} className={`${btn} text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950`}>
              <KeyRound className="w-3.5 h-3.5" /> {busy ? 'Uploading…' : p.answer ? 'Upload new / update' : 'Upload answer key'}
            </button>
            <input ref={ansRef} type="file" accept={ACCEPT} hidden onChange={(e) => { onAnswer(p, e.target.files?.[0]); e.target.value = ''; }} />
          </>
        )}
        {p.canRemove && <button disabled={busy} onClick={() => onRemove(p)} title="Remove paper" className={`${btn} ml-auto text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950`}><Trash2 className="w-3.5 h-3.5" /></button>}
      </div>
      {p.answer?.updatedBy && <p className="text-[10px] text-slate-400">Answer key updated by {p.answer.updatedBy}{p.answer.updatedAt ? ` on ${p.answer.updatedAt}` : ''}</p>}
    </li>
  );
};

/** Separate panel: add any new paper (old board paper, sample, model) with an optional answer key. */
const UploadPanel: React.FC<{ onClose: () => void; onDone: (p: QuestionPaper) => void }> = ({ onClose, onDone }) => {
  const [subjects, setSubjects] = useState<PaperSubject[]>([]);
  const [subjectKey, setSubjectKey] = useState('');
  const [other, setOther] = useState({ code: '', name: '', semester: 1, branch: 'All' });
  const [kind, setKind] = useState<PaperKind>('previous');
  const [title, setTitle] = useState('');
  const [examYear, setExamYear] = useState('');
  const [paperFile, setPaperFile] = useState<File | null>(null);
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { papersApi.subjects().then((r) => r.ok && setSubjects(r.data)); }, []);
  const chosen = subjects.find((s) => `${s.code}|${s.name}` === subjectKey);

  const save = async () => {
    setErr('');
    const subj = chosen ? { subjectCode: chosen.code, subjectName: chosen.name, semester: chosen.semester, branch: chosen.branch } : { subjectCode: other.code, subjectName: other.name, semester: Number(other.semester), branch: other.branch };
    if (!subj.subjectName.trim()) return setErr('Choose the subject (or type it under "Other subject").');
    if (!paperFile) return setErr('Choose the question paper file.');
    setBusy(true);
    const p = await pickAndUpload(paperFile);
    if (p.error || !p.id) { setBusy(false); return setErr(p.error || 'Upload failed'); }
    let answerFileId: string | undefined;
    if (answerFile) {
      const a = await pickAndUpload(answerFile);
      if (a.error || !a.id) { setBusy(false); return setErr(a.error || 'Answer key upload failed'); }
      answerFileId = a.id;
    }
    const r = await papersApi.create({ kind, title: title.trim() || undefined, examYear: examYear.trim() || undefined, paperFileId: p.id, answerFileId, ...subj });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    onDone(r.data);
  };

  return (
    <section className="bg-white dark:bg-slate-900 border-2 border-blue-200 dark:border-blue-900 rounded-2xl p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2"><Plus className="w-4 h-4 text-blue-600" /> नया पेपर अपलोड करें / Upload a new paper</h4>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 space-y-1">Subject
          <select value={subjectKey} onChange={(e) => setSubjectKey(e.target.value)} className={inp}>
            <option value="">— Other subject (type below) —</option>
            {subjects.map((s) => <option key={`${s.code}|${s.name}`} value={`${s.code}|${s.name}`}>Sem {s.semester} · {s.name} ({s.code}){s.branch !== 'All' ? ` · ${s.branch}` : ''}</option>)}
          </select>
        </label>
        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 space-y-1">Kind of paper
          <select value={kind} onChange={(e) => setKind(e.target.value as PaperKind)} className={inp}>
            <option value="previous">Old board paper</option><option value="sample">Sample paper</option><option value="model">Model / practice paper</option>
          </select>
        </label>
        {!chosen && (
          <>
            <input placeholder="Subject name" value={other.name} onChange={(e) => setOther({ ...other, name: e.target.value })} className={inp} />
            <input placeholder="Subject code (optional)" value={other.code} onChange={(e) => setOther({ ...other, code: e.target.value })} className={inp} />
            <select value={other.semester} onChange={(e) => setOther({ ...other, semester: Number(e.target.value) })} className={inp}>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>Semester {n}</option>)}
            </select>
            <select value={other.branch} onChange={(e) => setOther({ ...other, branch: e.target.value })} className={inp}>
              <option value="All">All branches</option><option value="CSE">CSE</option><option value="Civil">Civil</option>
            </select>
          </>
        )}
        <input placeholder="Title (e.g. Board Paper Winter 2024)" value={title} onChange={(e) => setTitle(e.target.value)} className={inp} />
        <input placeholder="Exam year (optional, e.g. 2024)" value={examYear} onChange={(e) => setExamYear(e.target.value)} className={inp} />
        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 space-y-1">Question paper (PDF / photo / Word) *
          <input type="file" accept={ACCEPT} onChange={(e) => setPaperFile(e.target.files?.[0] || null)} className={inp} />
        </label>
        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 space-y-1">Answer key (optional, can be added later)
          <input type="file" accept={ACCEPT} onChange={(e) => setAnswerFile(e.target.files?.[0] || null)} className={inp} />
        </label>
      </div>
      {err && <p className="text-xs font-bold text-rose-600">{err}</p>}
      <button disabled={busy} onClick={save} className={`${btn} px-4 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white`}><Upload className="w-4 h-4" /> {busy ? 'Uploading…' : 'Save paper'}</button>
    </section>
  );
};

/** Separate panel: pick semester -> subject -> paper and download the paper and / or its answer key. */
const DownloadPanel: React.FC<{ papers: QuestionPaper[]; onClose: () => void }> = ({ papers, onClose }) => {
  const sems = [...new Set(papers.map((p) => p.semester))].sort();
  const [sem, setSem] = useState<number>(sems[0] || 1);
  const subjects = [...new Map(papers.filter((p) => p.semester === sem).map((p) => [`${p.subjectCode}|${p.subjectName}|${p.branch}`, p])).entries()];
  const [subj, setSubj] = useState('');
  const list = papers.filter((p) => `${p.subjectCode}|${p.subjectName}|${p.branch}` === subj);
  return (
    <section className="bg-white dark:bg-slate-900 border-2 border-emerald-200 dark:border-emerald-900 rounded-2xl p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2"><FolderDown className="w-4 h-4 text-emerald-600" /> पेपर डाउनलोड करें / Download papers</h4>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <select value={sem} onChange={(e) => { setSem(Number(e.target.value)); setSubj(''); }} className={inp}>
          {sems.map((s) => <option key={s} value={s}>Semester {s}</option>)}
        </select>
        <select value={subj} onChange={(e) => setSubj(e.target.value)} className={inp}>
          <option value="">— Choose subject —</option>
          {subjects.map(([k, p]) => <option key={k} value={k}>{p.subjectName} ({p.subjectCode}){p.branch !== 'All' ? ` · ${p.branch}` : ''}</option>)}
        </select>
      </div>
      {list.length > 0 && (
        <ul className="space-y-1.5">
          {list.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-100 mr-auto">{p.title}{p.examYear ? ` (${p.examYear})` : ''}</span>
              <a href={fileLink(p.paper.url, true)} className={`${btn} bg-blue-600 hover:bg-blue-700 text-white`}><Download className="w-3.5 h-3.5" /> Paper</a>
              {p.answer && <a href={fileLink(p.answer.url, true)} className={`${btn} bg-emerald-600 hover:bg-emerald-700 text-white`}><Download className="w-3.5 h-3.5" /> Answer key</a>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
