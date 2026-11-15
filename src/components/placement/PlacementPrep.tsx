// ===================================================================================================
// Placement preparation (ported from the sister project UGIP-Tanakpur-Portal):
//   <PlacementPracticeCenter/>  student: practice / mock tests from the placement question bank (graded on the
//                               server, answers shown only after submitting), test history, resume score + ATS.
//   <PlacementTracker/>         teacher / admin: every visible student's preparation in one table.
// All rules are on the server (server/prep/service.ts); this screen only shows what the server returns.
// ===================================================================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Award, BarChart3, CheckCircle2, Clock, FileText, Loader2, Play, RotateCcw, Target, TrendingUp, XCircle, Users } from 'lucide-react';
import { call } from '../../services/academicApi';

// ---------- data shapes (same as the server sends) ----------
interface PrepInfo { branch: string; sections: { category: string; count: number }[]; minQuestions: number; maxQuestions: number; mockQuestions: number; mockMinutes: number }
interface Attempt { id: string; category: string; mode: string; timeLimitSec: number | null; startedAt: number; questions: { id: string; question: string; options: string[] }[] }
interface ReviewItem { id: string; question: string; options: string[]; correctIndex: number; chosen: number | null; correct: boolean; explanation: string }
interface TestResult { id: string; category: string; mode: string; total: number; correct: number; wrong: number; skipped: number; scorePct: number; durationSec: number; review: ReviewItem[] }
interface History {
  attempts: number; avgPct: number | null; bestPct: number | null; mockAttempts: number; lastAt: number | null; weakest: string | null;
  sections: { category: string; attempts: number; avgPct: number; bestPct: number }[];
  recent: { id: string; category: string; mode: string; total: number; correct: number; wrong: number; skipped: number; scorePct: number; at: number; durationSec: number }[];
}
interface ResumeAnalysis { score: number; atsScore: number; wordCount: number; sectionsFound: string[]; sectionsMissing: string[]; skillsFound: string[]; strengths: string[]; suggestions: string[]; textExtracted: boolean }
type ResumeScore = { uploaded: false } | { uploaded: true; fileName: string; analysis: ResumeAnalysis; analysedAt: number };
interface TrackerRow {
  studentId: string; name: string; rollNo: string; branch: string; semester: number;
  resume: { score: number; atsScore: number; readable: boolean } | null;
  tests: { attempts: number; mockAttempts: number; avgPct: number | null; bestPct: number | null; weakest: string | null; lastAt: number | null };
  drivesApplied: number; selected: number; readiness: number;
}

const card = 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm';
const tone = (p: number | null) => (p === null ? 'text-slate-400' : p >= 70 ? 'text-emerald-600' : p >= 45 ? 'text-amber-600' : 'text-rose-600');
const when = (ms: number | null) => (ms ? new Date(ms).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' }) : '—');
const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

// ---------- resume score card ----------
export const ResumeScoreCard: React.FC<{ studentId?: string }> = ({ studentId }) => {
  // Score from the server (null while loading)
  const [r, setR] = useState<ResumeScore | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    call<ResumeScore>('GET', `/api/prep/resume-score${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ''}`).then((x) => (x.ok ? setR(x.data) : setErr(x.error)));
  }, [studentId]);
  if (err) return <p className="text-xs text-rose-600">{err}</p>;
  if (!r) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  if (!r.uploaded) return (
    <div className={`${card} p-5 text-xs text-slate-600 dark:text-slate-300`}>
      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><FileText className="w-4 h-4 text-blue-700" /> रिज़्यूमे स्कोर / Resume score (ATS)</h3>
      <p className="mt-2">अभी कोई रिज़्यूमे अपलोड नहीं है। TPO Placement Portal → Resume में PDF / Word रिज़्यूमे अपलोड करें, फिर यहाँ स्कोर दिखेगा। / Upload your resume (PDF or Word) in TPO Placement Portal → Resume and its score appears here.</p>
    </div>
  );
  const a = r.analysis;
  const Ring: React.FC<{ v: number; label: string }> = ({ v, label }) => (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90"><circle cx="18" cy="18" r="15.9" fill="none" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3" strokeLinecap="round" className={v >= 70 ? 'stroke-emerald-500' : v >= 45 ? 'stroke-amber-500' : 'stroke-rose-500'} strokeDasharray={`${v} 100`} /></svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-extrabold text-slate-900 dark:text-white">{v}</span>
      </div>
      <span className="text-[11px] font-bold text-slate-500 mt-1">{label}</span>
    </div>
  );
  return (
    <div className={`${card} p-5 space-y-3`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><FileText className="w-4 h-4 text-blue-700" /> रिज़्यूमे स्कोर / Resume score (ATS)</h3>
          <p className="text-[11px] text-slate-500 mt-1">{r.fileName} · {a.wordCount} words · checked {when(r.analysedAt)}</p>
        </div>
        <div className="flex gap-4"><Ring v={a.score} label="Overall" /><Ring v={a.atsScore} label="ATS match" /></div>
      </div>
      {!a.textExtracted && <p className="text-xs text-amber-700 dark:text-amber-300">फ़ाइल का टेक्स्ट पढ़ा नहीं जा सका (शायद स्कैन की हुई फ़ोटो है)। Word या टेक्स्ट वाली PDF अपलोड करें। / The text could not be read; upload a Word file or a text PDF.</p>}
      {a.skillsFound.length > 0 && <div className="flex flex-wrap gap-1.5">{a.skillsFound.map((s) => <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200">{s}</span>)}</div>}
      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        {a.strengths.length > 0 && <div><p className="font-bold text-emerald-700 dark:text-emerald-300 mb-1">अच्छा है / Strengths</p><ul className="space-y-1 list-disc pl-4 text-slate-700 dark:text-slate-300">{a.strengths.map((x) => <li key={x}>{x}</li>)}</ul></div>}
        {a.suggestions.length > 0 && <div><p className="font-bold text-amber-700 dark:text-amber-300 mb-1">सुधार करें / Improve</p><ul className="space-y-1 list-disc pl-4 text-slate-700 dark:text-slate-300">{a.suggestions.map((x) => <li key={x}>{x}</li>)}</ul></div>}
      </div>
    </div>
  );
};

// ---------- student: practice / mock tests ----------
export const PlacementPracticeCenter: React.FC = () => {
  const [info, setInfo] = useState<PrepInfo | null>(null);
  const [hist, setHist] = useState<History | null>(null);
  const [category, setCategory] = useState('Mixed');
  const [count, setCount] = useState(10);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [idx, setIdx] = useState(0);
  const [result, setResult] = useState<TestResult | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Loads the start screen and my history.
  const load = useCallback(() => {
    call<PrepInfo>('GET', '/api/prep/info').then((r) => (r.ok ? setInfo(r.data) : setErr(r.error)));
    call<History>('GET', '/api/prep/history').then((r) => r.ok && setHist(r.data));
  }, []);
  useEffect(load, [load]);

  // Start.
  const start = async (mode: 'practice' | 'mock') => {
    setBusy(true); setErr(''); setResult(null);
    const r = await call<Attempt>('POST', '/api/prep/tests', { category, count, mode });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setAttempt(r.data); setAnswers(r.data.questions.map(() => null)); setIdx(0);
    setLeft(r.data.timeLimitSec);
  };
  // Submit.
  const submit = useCallback(async () => {
    if (!attempt) return;
    setBusy(true);
    const r = await call<TestResult>('POST', `/api/prep/tests/${encodeURIComponent(attempt.id)}/submit`, { answers });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setResult(r.data); setAttempt(null); setLeft(null); load();
  }, [attempt, answers, load]);

  // Mock test timer: submits by itself when the time is up.
  useEffect(() => {
    if (!attempt?.timeLimitSec) return;
    const t = window.setInterval(() => {
      const s = Math.round(attempt.timeLimitSec! - (Date.now() - attempt.startedAt) / 1000);
      setLeft(s);
      if (s <= 0) { window.clearInterval(t); submit(); }
    }, 1000);
    return () => window.clearInterval(t);
  }, [attempt, submit]);

  if (err && !info) return <p className="text-xs text-rose-600">{err}</p>;
  if (!info) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  // ----- taking a test -----
  if (attempt) {
    const q = attempt.questions[idx];
    const done = answers.filter((a) => a !== null).length;
    return (
      <div className={`${card} p-5 space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-extrabold text-slate-900 dark:text-white">{attempt.mode === 'mock' ? 'Mock test' : 'Practice'} · {attempt.category}</p>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500">{done}/{attempt.questions.length} answered</span>
            {left !== null && <span className={`font-mono font-bold flex items-center gap-1 ${left < 60 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-200'}`}><Clock className="w-3.5 h-3.5" />{mmss(left)}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {attempt.questions.map((x, i) => (
            <button key={x.id} onClick={() => setIdx(i)} className={`w-7 h-7 rounded-lg text-[11px] font-bold cursor-pointer ${i === idx ? 'bg-blue-700 text-white' : answers[i] !== null ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>{i + 1}</button>
          ))}
        </div>
        <p className="text-sm font-bold text-slate-900 dark:text-white whitespace-pre-wrap">Q{idx + 1}. {q.question}</p>
        <div className="grid gap-2">
          {q.options.map((o, i) => (
            <button key={i} onClick={() => setAnswers((a) => a.map((v, j) => (j === idx ? (v === i ? null : i) : v)))}
              className={`text-left px-3 py-2.5 rounded-xl border text-sm cursor-pointer ${answers[idx] === i ? 'border-blue-700 bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100 font-bold' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <span className="font-mono mr-2">{'ABCD'[i]}.</span>{o}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <div className="flex gap-2">
            <button disabled={idx === 0} onClick={() => setIdx(idx - 1)} className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer">← Previous</button>
            <button disabled={idx === attempt.questions.length - 1} onClick={() => setIdx(idx + 1)} className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-40 cursor-pointer">Next →</button>
          </div>
          <button disabled={busy} onClick={() => { if (done < attempt.questions.length && !window.confirm(`${attempt.questions.length - done} questions are not answered. Submit anyway?`)) return; submit(); }} className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 cursor-pointer">{busy ? 'Checking…' : 'Submit test / जमा करें'}</button>
        </div>
        {err && <p className="text-xs text-rose-600">{err}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* start */}
      <div className={`${card} p-5 space-y-4`}>
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><Target className="w-4 h-4 text-blue-700" /> प्लेसमेंट प्रैक्टिस टेस्ट / Placement practice tests ({info.branch})</h3>
          <p className="text-[11px] text-slate-500 mt-1">Aptitude, Reasoning, English, HR और {info.branch} technical के {info.sections.reduce((n, s) => n + s.count, 0)}+ प्रश्न। जवाब सर्वर पर जाँचे जाते हैं; हर टेस्ट का रिज़ल्ट आपके शिक्षक Placement Tracker में देखते हैं।</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[{ category: 'Mixed', count: info.sections.reduce((n, s) => n + s.count, 0) }, ...info.sections].map((s) => (
            <button key={s.category} onClick={() => setCategory(s.category)} className={`px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer ${category === s.category ? 'bg-blue-700 border-blue-700 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}>
              {s.category === 'Mixed' ? 'Mixed (सभी)' : s.category} <span className="opacity-70">· {s.count}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">प्रश्न / Questions
            <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">{[5, 10, 15, 20, 30].map((n) => <option key={n} value={n}>{n}</option>)}</select>
          </label>
          <button disabled={busy} onClick={() => start('practice')} className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"><Play className="w-3.5 h-3.5" /> Practice शुरू करें</button>
          <button disabled={busy} onClick={() => start('mock')} className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"><Clock className="w-3.5 h-3.5" /> Mock test ({info.mockQuestions} Q · {info.mockMinutes} min)</button>
        </div>
        {err && <p className="text-xs text-rose-600">{err}</p>}
      </div>

      {/* result + review */}
      {result && (
        <div className={`${card} p-5 space-y-4`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><Award className="w-4 h-4 text-amber-500" /> रिज़ल्ट / Result · {result.category}</p>
            <button onClick={() => setResult(null)} className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1 cursor-pointer"><RotateCcw className="w-3.5 h-3.5" /> New test</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
            {[['Score', `${result.scorePct}%`, tone(result.scorePct)], ['Correct', result.correct, 'text-emerald-600'], ['Wrong', result.wrong, 'text-rose-600'], ['Skipped', result.skipped, 'text-slate-500'], ['Time', mmss(result.durationSec), 'text-slate-700 dark:text-slate-200']].map(([l, v, c]) => (
              <div key={String(l)} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60"><p className={`text-lg font-extrabold ${c}`}>{v}</p><p className="text-[10px] font-bold text-slate-500">{l}</p></div>
            ))}
          </div>
          <div className="space-y-3">
            {result.review.map((q, i) => (
              <div key={q.id} className={`p-3 rounded-xl border text-xs ${q.correct ? 'border-emerald-200 dark:border-emerald-900' : 'border-rose-200 dark:border-rose-900'}`}>
                <p className="font-bold text-slate-900 dark:text-white flex gap-1.5">{q.correct ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-600 shrink-0" />} Q{i + 1}. {q.question}</p>
                <p className="mt-1 text-slate-600 dark:text-slate-300">सही उत्तर / Answer: <b className="text-emerald-700 dark:text-emerald-300">{q.options[q.correctIndex]}</b>{q.chosen === null ? ' · (skipped)' : !q.correct ? ` · आपका / yours: ${q.options[q.chosen]}` : ''}</p>
                {q.explanation && <p className="mt-1 text-slate-500">{q.explanation}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* my progress */}
      {hist && hist.attempts > 0 && (
        <div className={`${card} p-5 space-y-3`}>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-700" /> मेरी प्रगति / My progress</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {[['Tests', hist.attempts], ['Average', hist.avgPct !== null ? `${hist.avgPct}%` : '—'], ['Best', hist.bestPct !== null ? `${hist.bestPct}%` : '—'], ['Mock tests', hist.mockAttempts]].map(([l, v]) => (
              <div key={String(l)} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60"><p className="text-lg font-extrabold text-slate-900 dark:text-white">{v}</p><p className="text-[10px] font-bold text-slate-500">{l}</p></div>
            ))}
          </div>
          {hist.weakest && <p className="text-xs text-amber-700 dark:text-amber-300">सबसे कमज़ोर सेक्शन / Weakest section: <b>{hist.weakest}</b> — इसकी और प्रैक्टिस करें।</p>}
          <div className="space-y-1.5">
            {hist.sections.map((s) => (
              <div key={s.category} className="flex items-center gap-2 text-xs">
                <span className="w-32 shrink-0 text-slate-600 dark:text-slate-300 truncate">{s.category}</span>
                <span className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"><span className={`block h-full ${s.avgPct >= 70 ? 'bg-emerald-500' : s.avgPct >= 45 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${s.avgPct}%` }} /></span>
                <span className="w-24 text-right text-slate-500">{s.avgPct}% · {s.attempts}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ResumeScoreCard />
    </div>
  );
};

// ---------- teacher / admin: placement tracker ----------
export const PlacementTracker: React.FC = () => {
  const [rows, setRows] = useState<TrackerRow[] | null>(null);
  const [branch, setBranch] = useState('');
  const [sem, setSem] = useState('');
  const [sort, setSort] = useState<'readiness' | 'roll' | 'resume' | 'tests'>('readiness');
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    setRows(null);
    const qs = [branch && `branch=${branch}`, sem && `semester=${sem}`].filter(Boolean).join('&');
    call<TrackerRow[]>('GET', `/api/prep/tracker${qs ? `?${qs}` : ''}`).then((r) => (r.ok ? setRows(r.data) : setErr(r.error)));
  }, [branch, sem]);

  const shown = useMemo(() => {
    const list = [...(rows || [])];
    if (sort === 'readiness') list.sort((a, b) => b.readiness - a.readiness);
    if (sort === 'resume') list.sort((a, b) => (b.resume?.score ?? -1) - (a.resume?.score ?? -1));
    if (sort === 'tests') list.sort((a, b) => b.tests.attempts - a.tests.attempts);
    return list;
  }, [rows, sort]);
  const total = rows?.length || 0;
  const withResume = rows?.filter((r) => r.resume).length || 0;
  const practising = rows?.filter((r) => r.tests.attempts > 0).length || 0;
  const avg = rows && rows.length ? Math.round(rows.reduce((n, r) => n + r.readiness, 0) / rows.length) : 0;
  const sel = 'text-xs rounded-lg px-2 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200';

  return (
    <div className="space-y-5">
      <div className={`${card} p-5 space-y-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-700" /> प्लेसमेंट ट्रैकर / Student placement tracker</h3>
            <p className="text-[11px] text-slate-500 mt-1">रिज़्यूमे स्कोर, प्रैक्टिस टेस्ट और ड्राइव आवेदन — एक जगह। Readiness = resume 40% + test average 60%.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={branch} onChange={(e) => setBranch(e.target.value)} className={sel}><option value="">All branches</option><option value="CSE">CSE</option><option value="Civil">Civil</option></select>
            <select value={sem} onChange={(e) => setSem(e.target.value)} className={sel}><option value="">All sems</option>{[1, 2, 3, 4, 5, 6].map((s) => <option key={s} value={s}>Sem {s}</option>)}</select>
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className={sel}><option value="readiness">Sort: readiness</option><option value="resume">Sort: resume score</option><option value="tests">Sort: tests taken</option><option value="roll">Sort: roll no</option></select>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          {[['Students', total, Users], ['Resume uploaded', `${withResume}/${total}`, FileText], ['Practising', `${practising}/${total}`, Target], ['Avg readiness', `${avg}%`, TrendingUp]].map(([l, v, I]) => {
            const Icon = I as typeof Users;
            return <div key={String(l)} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60"><Icon className="w-4 h-4 mx-auto text-blue-700 dark:text-blue-300" /><p className="text-lg font-extrabold text-slate-900 dark:text-white">{String(v)}</p><p className="text-[10px] font-bold text-slate-500">{String(l)}</p></div>;
          })}
        </div>
      </div>

      {err && <p className="text-xs text-rose-600">{err}</p>}
      {!rows && !err && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>}
      {rows && (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full text-xs">
            <thead><tr className="text-left text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <th className="p-3">Student</th><th className="p-3">Class</th><th className="p-3 text-center">Resume</th><th className="p-3 text-center">ATS</th><th className="p-3 text-center">Tests</th><th className="p-3 text-center">Avg / Best</th><th className="p-3">Weakest</th><th className="p-3 text-center">Drives</th><th className="p-3 text-center">Readiness</th>
            </tr></thead>
            <tbody>
              {shown.map((r) => (
                <React.Fragment key={r.studentId}>
                  <tr onClick={() => setOpen(open === r.studentId ? null : r.studentId)} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                    <td className="p-3"><p className="font-bold text-slate-900 dark:text-white">{r.name}</p><p className="text-[10px] text-slate-500 font-mono">{r.rollNo}</p></td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{r.branch} · Sem {r.semester}</td>
                    <td className={`p-3 text-center font-bold ${tone(r.resume?.score ?? null)}`}>{r.resume ? r.resume.score : '—'}</td>
                    <td className={`p-3 text-center font-bold ${tone(r.resume?.atsScore ?? null)}`}>{r.resume ? r.resume.atsScore : '—'}</td>
                    <td className="p-3 text-center text-slate-700 dark:text-slate-200">{r.tests.attempts}{r.tests.mockAttempts ? <span className="text-slate-400"> ({r.tests.mockAttempts} mock)</span> : null}</td>
                    <td className={`p-3 text-center font-bold ${tone(r.tests.avgPct)}`}>{r.tests.avgPct !== null ? `${r.tests.avgPct}% / ${r.tests.bestPct}%` : '—'}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{r.tests.weakest || '—'}</td>
                    <td className="p-3 text-center text-slate-700 dark:text-slate-200">{r.drivesApplied}{r.selected ? <span className="text-emerald-600 font-bold"> · {r.selected} selected</span> : null}</td>
                    <td className="p-3"><div className="flex items-center gap-2"><span className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden min-w-12"><span className={`block h-full ${r.readiness >= 70 ? 'bg-emerald-500' : r.readiness >= 45 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${r.readiness}%` }} /></span><b className="w-8 text-right">{r.readiness}</b></div></td>
                  </tr>
                  {open === r.studentId && <tr><td colSpan={9} className="p-3 bg-slate-50 dark:bg-slate-900/60">{r.resume ? <ResumeScoreCard studentId={r.studentId} /> : <p className="text-xs text-slate-500">इस छात्र ने अभी रिज़्यूमे अपलोड नहीं किया। / No resume uploaded yet. Last test: {when(r.tests.lastAt)}</p>}</td></tr>}
                </React.Fragment>
              ))}
              {!shown.length && <tr><td colSpan={9} className="p-6 text-center text-slate-500">कोई छात्र नहीं / No students</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
