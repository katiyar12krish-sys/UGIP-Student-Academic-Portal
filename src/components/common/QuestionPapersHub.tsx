// ===================================================================================================
// "Question Papers & Answer Keys" screen for admin, faculty and students.
//  - every subject has authentic UBTER board papers and verified answer keys (50 Marks scheme)
//  - staff can upload old board papers / new papers (with or without answer key) and upload / replace any answer key
//  - mobile-friendly: open in browser, open in new tab / fullscreen, download, and print to PDF
// ===================================================================================================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText,
  Download,
  Eye,
  Upload,
  KeyRound,
  Trash2,
  RefreshCw,
  Search,
  Plus,
  X,
  FolderDown,
  FolderUp,
  Printer,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { useCollege } from '../../context/CollegeContext';
import { papersApi, type QuestionPaper, type PaperSubject, type PaperKind } from '../../services/papersApi';
import { uploadFile } from '../../services/materialsApi';

const KIND_LABEL: Record<PaperKind, string> = {
  sample: 'Sample paper (नमूना पत्र)',
  previous: 'Old board paper (बोर्ड पेपर)',
  model: 'Model paper (अभ्यास पत्र)',
};

const KIND_STYLE: Record<PaperKind, string> = {
  sample: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900',
  previous: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900',
  model: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 border border-violet-200 dark:border-violet-900',
};

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.docx,.txt,.html';
const btn = 'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all disabled:opacity-50 select-none';
const inp = 'w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

/** Reads a File object and converts it to a base64 Data URL for 100% offline & mobile viewing */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/** Resolves stored file URL or dataUrl safely */
function resolveDocUrl(url: string, name: string): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // If it's an /api/files/ link, check localStorage cache
  if (url.startsWith('/api/files/')) {
    const fileId = url.replace('/api/files/', '');
    try {
      const raw = localStorage.getItem('ugip_uploaded_files_cache');
      if (raw) {
        const cache = JSON.parse(raw);
        if (cache[fileId]?.dataUrl) return cache[fileId].dataUrl;
      }
    } catch {}
  }
  return url;
}

/** Open paper or answer key in a new browser tab with print/PDF support */
function openInNewTab(url: string, title?: string) {
  const resolved = resolveDocUrl(url, title || 'UBTER Paper');
  if (resolved.startsWith('data:text/html')) {
    const html = decodeURIComponent(resolved.replace(/^data:text\/html;[^,]*,/, ''));
    const win = window.open('', '_blank');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      return;
    }
  }
  window.open(resolved, '_blank');
}

/** Triggers a clean file download or mobile-friendly fallback */
function triggerDownload(filename: string, url: string) {
  const resolved = resolveDocUrl(url, filename);
  if (!resolved) return;

  try {
    if (resolved.startsWith('data:')) {
      const parts = resolved.split(',');
      const header = parts[0];
      const mime = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
      const isBase64 = header.includes('base64');
      const decoded = isBase64 ? atob(parts[1]) : decodeURIComponent(parts[1]);

      let blob: Blob;
      if (isBase64) {
        const u8arr = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) {
          u8arr[i] = decoded.charCodeAt(i);
        }
        blob = new Blob([u8arr], { type: mime });
      } else {
        blob = new Blob([decoded], { type: mime });
      }

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      }, 1500);
      return;
    }

    // Direct URL download
    const a = document.createElement('a');
    a.href = resolved;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 1500);
  } catch {
    // If download programmatic click was blocked on mobile, open directly
    window.open(resolved, '_blank');
  }
}

/** Pick one file and upload it; returns fileId and dataUrl */
async function pickAndUpload(file: File | undefined): Promise<{ id?: string; dataUrl?: string; error?: string }> {
  if (!file) return {};
  const dataUrl = await readFileAsDataUrl(file);
  const r = await uploadFile(file);
  return r.ok ? { id: r.data.fileId, dataUrl } : { error: r.error };
}

interface QuestionPapersHubProps {
  forceMobileView?: boolean;
}

export const QuestionPapersHub: React.FC<QuestionPapersHubProps> = ({ forceMobileView = false }) => {
  const { authUser } = useCollege();
  const isStaff = authUser?.role === 'admin' || authUser?.role === 'faculty';
  const isAdmin = authUser?.role === 'admin';

  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  // Filters
  const [sem, setSem] = useState<number | 'all'>('all');
  const [branch, setBranch] = useState<'all' | 'CSE' | 'Civil'>('all');
  const [kind, setKind] = useState<PaperKind | 'all'>('all');
  const [q, setQ] = useState('');

  const [busyId, setBusyId] = useState<string | null>(null);
  const [panel, setPanel] = useState<'none' | 'upload' | 'download'>('none');
  const [viewerPaper, setViewerPaper] = useState<{ paper: QuestionPaper; mode: 'paper' | 'answer' } | null>(null);

  const load = async () => {
    setLoading(true);
    const r = await papersApi.list();
    setLoading(false);
    if (r.ok && Array.isArray(r.data)) setPapers(r.data);
    else setMsg({ ok: false, t: r.error || 'प्रश्न पत्र लोड करने में समस्या आई।' });
  };
  useEffect(() => { load(); }, []);

  const safePapers = Array.isArray(papers) ? papers : [];

  const shown = useMemo(() => safePapers.filter((p) =>
    (sem === 'all' || p.semester === sem) &&
    (branch === 'all' || p.branch === 'All' || p.branch === branch) &&
    (kind === 'all' || p.kind === kind) &&
    (!q.trim() || `${p.subjectName} ${p.subjectCode} ${p.title} ${p.examYear || ''}`.toLowerCase().includes(q.trim().toLowerCase()))), [safePapers, sem, branch, kind, q]);

  // Group: semester -> subject -> papers
  const groups = useMemo(() => {
    const m = new Map<number, Map<string, QuestionPaper[]>>();
    for (const p of shown) {
      if (!m.has(p.semester)) m.set(p.semester, new Map());
      const s = m.get(p.semester)!;
      const k = `${p.subjectCode}|${p.subjectName}|${p.branch}`;
      if (!s.has(k)) s.set(k, []);
      s.get(k)!.push(p);
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [shown]);

  const semesters = useMemo(() => [...new Set(safePapers.map((p) => p.semester))].sort(), [safePapers]);
  const replaceIn = (p: QuestionPaper) => setPapers((all) => all.map((x) => (x.id === p.id ? p : x)));

  const uploadAnswer = async (p: QuestionPaper, file: File | undefined) => {
    if (!file) return;
    setBusyId(p.id); setMsg(null);
    const up = await pickAndUpload(file);
    if (up.error || !up.id) {
      setBusyId(null);
      return setMsg({ ok: false, t: up.error || 'उत्तर कुंजी अपलोड नहीं हो सकी।' });
    }
    const r = await papersApi.setAnswer(p.id, up.id, { url: up.dataUrl, name: file.name });
    setBusyId(null);
    if (!r.ok) return setMsg({ ok: false, t: r.error });
    replaceIn(r.data);
    setMsg({ ok: true, t: `उत्तर कुंजी सफलतापूर्वक सेव हुई: ${p.subjectName} - ${p.title}` });
  };

  const uploadPaperFile = async (p: QuestionPaper, file: File | undefined) => {
    if (!file) return;
    setBusyId(p.id); setMsg(null);
    const up = await pickAndUpload(file);
    if (up.error || !up.id) {
      setBusyId(null);
      return setMsg({ ok: false, t: up.error || 'प्रश्न पत्र अपलोड नहीं हो सका।' });
    }
    const r = await papersApi.setPaper(p.id, up.id, { url: up.dataUrl, name: file.name });
    setBusyId(null);
    if (!r.ok) return setMsg({ ok: false, t: r.error });
    replaceIn(r.data);
    setMsg({ ok: true, t: `प्रश्न पत्र सफलतापूर्वक बदल दिया गया: ${p.subjectName} - ${p.title}` });
  };

  const remove = async (p: QuestionPaper) => {
    if (!window.confirm(`क्या आप "${p.subjectName} - ${p.title}" को हटाना चाहते हैं?`)) return;
    setBusyId(p.id);
    const r = await papersApi.remove(p.id);
    setBusyId(null);
    if (!r.ok) return setMsg({ ok: false, t: r.error });
    setPapers((all) => all.filter((x) => x.id !== p.id));
    setMsg({ ok: true, t: 'प्रश्न पत्र हटा दिया गया।' });
  };

  const restore = async () => {
    const r = await papersApi.restoreSamples();
    if (!r.ok) return setMsg({ ok: false, t: r.error });
    setMsg({ ok: true, t: r.data.restored ? `${r.data.restored} सैंपल पेपर पुनः स्थापित किए गए।` : 'सभी पेपर पहले से मौजूद हैं।' });
    load();
  };

  return (
    <div className="space-y-4">
      {/* Title & Action Buttons */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-3.5">
          <div className="w-full">
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600 shrink-0" />
              <span>प्रश्न पत्र और उत्तर कुंजी / Question Papers & Answer Keys</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              UBTER बोर्ड परीक्षा प्रारूप (कुल 50 अंक: खण्ड क 10x1 अंक, खण्ड ख 5x4 अंक, खण्ड ग 2x10 अंक)। प्रश्न पत्र व उत्तर कुंजी ऑनलाइन देखें या PDF डाउनलोड करें।
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 w-full pt-1 border-t border-slate-100 dark:border-slate-800/60">
            <button
              onClick={() => setPanel(panel === 'download' ? 'none' : 'download')}
              className={`${btn} flex-1 sm:flex-initial justify-center border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800`}
            >
              <FolderDown className="w-4 h-4 text-emerald-600" />
              <span>पेपर डाउनलोड (Download)</span>
            </button>
            {isStaff && (
              <button
                onClick={() => setPanel(panel === 'upload' ? 'none' : 'upload')}
                className={`${btn} flex-1 sm:flex-initial justify-center bg-blue-600 hover:bg-blue-700 text-white shadow-sm`}
              >
                <FolderUp className="w-4 h-4" />
                <span>नया पेपर अपलोड (Upload)</span>
              </button>
            )}
          </div>
        </div>
        {msg && (
          <p className={`mt-3 text-xs font-bold ${msg.ok ? 'text-emerald-600' : 'text-rose-600'} animate-in fade-in`}>
            {msg.t}
          </p>
        )}
      </section>

      {panel === 'upload' && isStaff && (
        <UploadPanel
          onClose={() => setPanel('none')}
          onDone={(p) => {
            setPapers((all) => [p, ...all]);
            setMsg({ ok: true, t: `सफलतापूर्वक सेव हुआ: ${p.subjectName} - ${p.title}` });
            setPanel('none');
          }}
        />
      )}
      {panel === 'download' && <DownloadPanel papers={papers} onClose={() => setPanel('none')} />}

      {/* Filters */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        {/* Semester Buttons */}
        <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
          {(['all', ...semesters] as (number | 'all')[]).map((s) => (
            <button
              key={String(s)}
              onClick={() => setSem(s)}
              className={`${btn} py-1.5 px-3 text-xs ${
                sem === s
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {s === 'all' ? 'All Semesters (सभी)' : `Semester ${s}`}
            </button>
          ))}
        </div>

        {/* Search & Kind Filter */}
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="खोजें: विषय / कोड / वर्ष (Search Subject / Code)"
              className={`${inp} pl-9`}
            />
          </div>
          <select value={kind} onChange={(e) => setKind(e.target.value as any)} className={inp}>
            <option value="all">All Paper Types (सभी प्रकार)</option>
            <option value="previous">Old Board Papers (बोर्ड पेपर)</option>
            <option value="sample">Sample Papers (नमूना पत्र)</option>
            <option value="model">Model Practice Papers (अभ्यास पत्र)</option>
          </select>
          {isStaff ? (
            <select value={branch} onChange={(e) => setBranch(e.target.value as any)} className={inp}>
              <option value="all">All Branches (सभी शाखाएं)</option>
              <option value="CSE">CSE (Computer Science)</option>
              <option value="Civil">Civil Engineering</option>
            </select>
          ) : <div />}
        </div>

        {isAdmin && (
          <button
            onClick={restore}
            className={`${btn} text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>रीसेट / Bring back sample papers</span>
          </button>
        )}
      </section>

      {loading && <p className="text-xs text-slate-500 py-4 text-center font-medium">प्रश्न पत्र लोड हो रहे हैं...</p>}
      {!loading && !shown.length && (
        <p className="text-xs text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-center">
          कोई प्रश्न पत्र नहीं मिला।
        </p>
      )}

      {/* Subject Groups */}
      {groups.map(([s, subjects]) => (
        <section key={s} className="space-y-2">
          <h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400 px-1">
            Semester {s}
          </h4>
          <div className={`grid gap-3 ${forceMobileView ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
            {[...subjects.entries()].map(([k, list]) => (
              <article
                key={k}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <div className="min-w-0">
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {list[0].subjectName}
                    </h5>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Code: {list[0].subjectCode} &bull; {list[0].branch === 'All' ? 'All Branches' : list[0].branch}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                    {list.length} {list.length > 1 ? 'Papers' : 'Paper'}
                  </span>
                </div>
                <ul className="mt-3 space-y-2.5">
                  {list.map((p) => (
                    <PaperRow
                      key={p.id}
                      p={p}
                      busy={busyId === p.id}
                      onAnswer={uploadAnswer}
                      onPaper={uploadPaperFile}
                      onRemove={remove}
                      onOpenViewer={(paper, mode) => setViewerPaper({ paper, mode })}
                    />
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ))}

      {/* Viewer Modal */}
      {viewerPaper && (
        <PaperViewerModal
          paper={viewerPaper.paper}
          initialMode={viewerPaper.mode}
          onClose={() => setViewerPaper(null)}
        />
      )}
    </div>
  );
};

/** Full-Screen Interactive Paper & Verified Answer Key Modal */
const PaperViewerModal: React.FC<{
  paper: QuestionPaper;
  initialMode: 'paper' | 'answer';
  onClose: () => void;
}> = ({ paper, initialMode, onClose }) => {
  const [tab, setTab] = useState<'paper' | 'answer'>(initialMode);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeDoc = tab === 'paper' ? paper.paper : (paper.answer || paper.paper);
  const activeUrl = resolveDocUrl(activeDoc.url, activeDoc.name);
  const activeFileName = tab === 'paper' ? paper.paper.name : paper.answer?.name || `${paper.subjectCode}_AnswerKey.html`;

  const isHtmlDataUrl = activeUrl.startsWith('data:text/html');
  const htmlContent = isHtmlDataUrl ? decodeURIComponent(activeUrl.replace(/^data:text\/html;[^,]*,/, '')) : undefined;

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.print();
        return;
      } catch {}
    }
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-5xl h-[94vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header - Mobile Responsive */}
        <div className="bg-slate-900 text-white px-4 py-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-xs font-bold text-blue-400 uppercase tracking-wider">
                    UBTER Board Examination
                  </span>
                  <span className="text-[10px] text-slate-400 hidden sm:inline">
                    &bull; Sem {paper.semester} &bull; {paper.branch}
                  </span>
                </div>
                <h3 className="text-xs sm:text-sm font-extrabold text-white truncate">
                  {paper.subjectName} ({paper.subjectCode})
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer shrink-0"
              title="बंद करें (Close)"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-800">
            {/* Tab switchers */}
            <div className="flex p-0.5 bg-slate-800 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setTab('paper')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  tab === 'paper' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>प्रश्न पत्र / Paper</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('answer')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  tab === 'answer' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>उत्तर कुंजी / Answer Key</span>
              </button>
            </div>

            {/* Print, Fullscreen & Download Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => openInNewTab(activeUrl, paper.subjectName)}
                title="फुल स्क्रीन / नए टैब में खोलें (Open in New Tab)"
                className={`${btn} bg-slate-800 hover:bg-slate-700 text-slate-200 py-1.5 px-2.5`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">फुल स्क्रीन</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                title="प्रिंट या PDF सेव करें (Print / Save as PDF)"
                className={`${btn} bg-slate-800 hover:bg-slate-700 text-slate-200 py-1.5 px-2.5`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">प्रिंट</span>
              </button>
              <button
                type="button"
                onClick={() => triggerDownload(activeFileName, activeUrl)}
                title="डाउनलोड करें (Download File)"
                className={`${btn} bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>डाउनलोड</span>
              </button>
            </div>
          </div>
        </div>

        {/* Notice for Answer key status */}
        {tab === 'answer' && !paper.answer && (
          <div className="p-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs text-center font-semibold">
            इस विषय की उत्तर कुंजी अभी तैयार की जा रही है। आधिकारिक प्रश्न पत्र नीचे प्रदर्शित है।
          </div>
        )}

        {/* Document Viewer Frame */}
        <div className="flex-1 w-full bg-slate-100 dark:bg-slate-950 p-2 sm:p-3 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <iframe
            ref={iframeRef}
            src={isHtmlDataUrl ? undefined : activeUrl}
            srcDoc={htmlContent}
            title={`${paper.subjectName} - ${tab}`}
            className="w-full h-full min-h-[500px] rounded-xl border border-slate-300 dark:border-slate-800 bg-white shadow-inner"
          />
        </div>
      </div>
    </div>
  );
};

/** One paper: open / download the paper and its answer key; staff: upload or replace. */
const PaperRow: React.FC<{
  p: QuestionPaper;
  busy: boolean;
  onAnswer: (p: QuestionPaper, f?: File) => void;
  onPaper: (p: QuestionPaper, f?: File) => void;
  onRemove: (p: QuestionPaper) => void;
  onOpenViewer: (p: QuestionPaper, mode: 'paper' | 'answer') => void;
}> = ({ p, busy, onAnswer, onPaper, onRemove, onOpenViewer }) => {
  const ansRef = useRef<HTMLInputElement>(null);
  const paperRef = useRef<HTMLInputElement>(null);

  return (
    <li className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2.5 bg-slate-50/50 dark:bg-slate-800/40">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <span className="text-xs font-bold text-slate-900 dark:text-white">
          {p.title} {p.examYear ? `(${p.examYear})` : ''}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${KIND_STYLE[p.kind]}`}>
            {KIND_LABEL[p.kind]}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            {p.paper.size}
          </span>
          {p.canRemove && (
            <button
              disabled={busy}
              onClick={() => onRemove(p)}
              title="हटाएं (Remove)"
              className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Question Paper Row */}
      <div className="pt-2 flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 shrink-0">
            📄 प्रश्न पत्र:
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {p.paper.name || 'UBTER Board Paper'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 w-full">
          <button
            type="button"
            onClick={() => onOpenViewer(p, 'paper')}
            className={`${btn} py-1.5 px-2.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600 flex-1 sm:flex-initial justify-center`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>देखें</span>
          </button>
          <button
            type="button"
            onClick={() => triggerDownload(p.paper.name, p.paper.url)}
            className={`${btn} py-1.5 px-2.5 bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-initial justify-center`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>डाउनलोड</span>
          </button>
          <button
            type="button"
            onClick={() => openInNewTab(p.paper.url, `${p.subjectName} Paper`)}
            title="नए टैब में खोलें"
            className={`${btn} py-1.5 px-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 justify-center`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>नया टैब</span>
          </button>
          {p.canRemove && (
            <>
              <button
                disabled={busy}
                onClick={() => paperRef.current?.click()}
                className={`${btn} py-1.5 px-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>बदलें</span>
              </button>
              <input
                ref={paperRef}
                type="file"
                accept={ACCEPT}
                hidden
                onChange={(e) => {
                  onPaper(p, e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* Answer Key Row */}
      <div className="pt-2 flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
            🔑 उत्तर कुंजी:
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {p.answer ? p.answer.name || 'Verified Solution' : 'शीघ्र उपलब्ध होगी'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 w-full">
          {p.answer ? (
            <>
              <button
                type="button"
                onClick={() => onOpenViewer(p, 'answer')}
                className={`${btn} py-1.5 px-2.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 flex-1 sm:flex-initial justify-center`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>हल देखें</span>
              </button>
              <button
                type="button"
                onClick={() => triggerDownload(p.answer?.name || `${p.subjectCode}_AnswerKey.html`, p.answer?.url || '')}
                className={`${btn} py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-initial justify-center`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>डाउनलोड</span>
              </button>
              <button
                type="button"
                onClick={() => openInNewTab(p.answer?.url || '', `${p.subjectName} Answer Key`)}
                title="नए टैब में उत्तर कुंजी खोलें"
                className={`${btn} py-1.5 px-2.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200 justify-center`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>नया टैब</span>
              </button>
            </>
          ) : (
            p.canEdit && (
              <span className="text-[11px] text-slate-400 italic">कुंजी जोड़ें</span>
            )
          )}

          {p.canEdit && (
            <>
              <button
                disabled={busy}
                onClick={() => ansRef.current?.click()}
                className={`${btn} py-1.5 px-2 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 border border-emerald-300/40`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{busy ? 'अपलोडिंग...' : p.answer ? 'बदलें' : 'अपलोड'}</span>
              </button>
              <input
                ref={ansRef}
                type="file"
                accept={ACCEPT}
                hidden
                onChange={(e) => {
                  onAnswer(p, e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </>
          )}
        </div>
      </div>


      {p.answer?.updatedBy && (
        <p className="text-[10px] text-slate-400 pt-0.5">
          सत्यापित: {p.answer.updatedBy} {p.answer.updatedAt ? `(${p.answer.updatedAt})` : ''}
        </p>
      )}
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

  useEffect(() => {
    papersApi.subjects().then((r) => r.ok && setSubjects(r.data));
  }, []);

  const chosen = subjects.find((s) => `${s.code}|${s.name}` === subjectKey);

  const save = async () => {
    setErr('');
    const subj = chosen
      ? { subjectCode: chosen.code, subjectName: chosen.name, semester: chosen.semester, branch: chosen.branch }
      : { subjectCode: other.code, subjectName: other.name, semester: Number(other.semester), branch: other.branch };

    if (!subj.subjectName.trim()) return setErr('विषय चुनें या नीचे लिखें।');
    if (!paperFile) return setErr('कृपया प्रश्न पत्र की फाइल चुनें।');

    setBusy(true);

    const paperDataUrl = await readFileAsDataUrl(paperFile);
    const p = await pickAndUpload(paperFile);
    if (p.error || !p.id) {
      setBusy(false);
      return setErr(p.error || 'प्रश्न पत्र अपलोड नहीं हो सका।');
    }

    let answerFileId: string | undefined;
    let answerDataUrl: string | undefined;
    if (answerFile) {
      answerDataUrl = await readFileAsDataUrl(answerFile);
      const a = await pickAndUpload(answerFile);
      if (a.error || !a.id) {
        setBusy(false);
        return setErr(a.error || 'उत्तर कुंजी अपलोड नहीं हो सकी।');
      }
      answerFileId = a.id;
    }

    const r = await papersApi.create({
      kind,
      title: title.trim() || undefined,
      examYear: examYear.trim() || undefined,
      paperFileId: p.id,
      answerFileId,
      paperUrl: paperDataUrl,
      answerUrl: answerDataUrl,
      paperName: paperFile.name,
      answerName: answerFile?.name,
      ...subj,
    });

    setBusy(false);
    if (!r.ok) return setErr(r.error);
    onDone(r.data);
  };

  return (
    <section className="bg-white dark:bg-slate-900 border-2 border-blue-200 dark:border-blue-900 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-blue-600" />
          <span>नया प्रश्न पत्र अपलोड करें / Upload New Question Paper</span>
        </h4>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 space-y-1">
          <span>विषय (Subject) *</span>
          <select value={subjectKey} onChange={(e) => setSubjectKey(e.target.value)} className={inp}>
            <option value="">— विषय चुनें (या नीचे लिखें) —</option>
            {subjects.map((s) => (
              <option key={`${s.code}|${s.name}`} value={`${s.code}|${s.name}`}>
                Sem {s.semester} &bull; {s.name} ({s.code}) {s.branch !== 'All' ? ` &bull; ${s.branch}` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 space-y-1">
          <span>प्रकार (Kind of paper)</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as PaperKind)} className={inp}>
            <option value="previous">Old Board Paper (बोर्ड परीक्षा पत्र)</option>
            <option value="sample">Sample Paper (नमूना पत्र)</option>
            <option value="model">Model Practice Paper (अभ्यास पत्र)</option>
          </select>
        </label>

        {!chosen && (
          <>
            <input
              placeholder="विषय का नाम (Subject Name)"
              value={other.name}
              onChange={(e) => setOther({ ...other, name: e.target.value })}
              className={inp}
            />
            <input
              placeholder="विषय कोड (Subject Code e.g. 053001)"
              value={other.code}
              onChange={(e) => setOther({ ...other, code: e.target.value })}
              className={inp}
            />
            <select
              value={other.semester}
              onChange={(e) => setOther({ ...other, semester: Number(e.target.value) })}
              className={inp}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>Semester {n}</option>
              ))}
            </select>
            <select
              value={other.branch}
              onChange={(e) => setOther({ ...other, branch: e.target.value })}
              className={inp}
            >
              <option value="All">All Branches</option>
              <option value="CSE">CSE</option>
              <option value="Civil">Civil</option>
            </select>
          </>
        )}

        <input
          placeholder="शीर्षक (Title e.g. Board Paper Winter 2024)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inp}
        />
        <input
          placeholder="परीक्षा वर्ष (Exam Year e.g. 2024)"
          value={examYear}
          onChange={(e) => setExamYear(e.target.value)}
          className={inp}
        />

        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 space-y-1">
          <span>प्रश्न पत्र फाइल (PDF / Image / Doc) *</span>
          <input
            type="file"
            accept={ACCEPT}
            onChange={(e) => setPaperFile(e.target.files?.[0] || null)}
            className={inp}
          />
        </label>

        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 space-y-1">
          <span>उत्तर कुंजी फाइल (Optional Answer Key)</span>
          <input
            type="file"
            accept={ACCEPT}
            onChange={(e) => setAnswerFile(e.target.files?.[0] || null)}
            className={inp}
          />
        </label>
      </div>

      {err && <p className="text-xs font-bold text-rose-600">{err}</p>}

      <button
        disabled={busy}
        onClick={save}
        className={`${btn} px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto shadow-sm`}
      >
        <Upload className="w-4 h-4" />
        <span>{busy ? 'अपलोड हो रहा है...' : 'पेपर सेव करें (Save Paper)'}</span>
      </button>
    </section>
  );
};

/** Separate panel: pick semester -> subject -> paper and download the paper and / or its answer key. */
const DownloadPanel: React.FC<{ papers: QuestionPaper[]; onClose: () => void }> = ({ papers, onClose }) => {
  const sems = [...new Set(papers.map((p) => p.semester))].sort();
  const [sem, setSem] = useState<number>(sems[0] || 1);
  const subjects = [
    ...new Map(
      papers.filter((p) => p.semester === sem).map((p) => [`${p.subjectCode}|${p.subjectName}|${p.branch}`, p])
    ).entries(),
  ];
  const [subj, setSubj] = useState('');
  const list = papers.filter((p) => `${p.subjectCode}|${p.subjectName}|${p.branch}` === subj);

  return (
    <section className="bg-white dark:bg-slate-900 border-2 border-emerald-200 dark:border-emerald-900 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
          <FolderDown className="w-4 h-4 text-emerald-600" />
          <span>पेपर और उत्तर कुंजी डाउनलोड करें / Download Papers</span>
        </h4>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <select
          value={sem}
          onChange={(e) => {
            setSem(Number(e.target.value));
            setSubj('');
          }}
          className={inp}
        >
          {sems.map((s) => (
            <option key={s} value={s}>Semester {s}</option>
          ))}
        </select>

        <select value={subj} onChange={(e) => setSubj(e.target.value)} className={inp}>
          <option value="">— विषय चुनें (Choose Subject) —</option>
          {subjects.map(([k, p]) => (
            <option key={k} value={k}>
              {p.subjectName} ({p.subjectCode}) {p.branch !== 'All' ? ` &bull; ${p.branch}` : ''}
            </option>
          ))}
        </select>
      </div>

      {list.length > 0 && (
        <ul className="space-y-2 pt-2">
          {list.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
            >
              <span className="font-bold text-slate-800 dark:text-slate-100">
                {p.title} {p.examYear ? `(${p.examYear})` : ''}
              </span>
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => triggerDownload(p.paper.name, p.paper.url)}
                  className={`${btn} bg-blue-600 hover:bg-blue-700 text-white`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>प्रश्न पत्र</span>
                </button>
                {p.answer && (
                  <button
                    type="button"
                    onClick={() => triggerDownload(p.answer?.name || `${p.subjectCode}_AnswerKey.html`, p.answer?.url || '')}
                    className={`${btn} bg-emerald-600 hover:bg-emerald-700 text-white`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>उत्तर कुंजी</span>
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
