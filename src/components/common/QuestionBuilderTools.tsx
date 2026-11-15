// ===================================================================================================
// Two helpers inside "Create online test" (faculty / admin):
//  1. Upload questions the teacher already made: an Excel (.xlsx) or CSV file with the columns
//     Question | A | B | C | D | Answer (A-D or 1-4) | Explanation (optional). A sample file can be downloaded.
//  2. Auto-create questions: pick a unit / topic from the official syllabus (or type one) and the server makes MCQs
//     (Gemini when GEMINI_API_KEY is set, otherwise the built-in question bank).
// Both only ADD lines to the question box; the teacher checks / edits them before "Create & Announce".
// Line format (same as typing by hand): Question | option A | option B | option C | option D | correct no. (1-4) | explanation
// ===================================================================================================
import React, { useMemo, useState } from 'react';
import { Upload, Sparkles, Download } from 'lucide-react';
import { readSheetFile } from '../../utils/importer';
import { exportExcel } from '../../utils/exporter';
import { SYLLABUS_YEAR1 } from '../../data/syllabusYear1';
import { SYLLABUS_CSE_SEM3 } from '../../data/syllabusCseSem3';
import { SYLLABUS_CSE_SEM5 } from '../../data/syllabusCseSem5';
import { notify } from './ui/feedback';

const clean = (s: unknown) => String(s ?? '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim();   // '|' would break the line format
const stripLetter = (s: string) => s.replace(/^\s*[A-Da-d][).:-]\s*/, '').trim();                  // "B) Stack" -> "Stack"

/** One question as a line of the question box. */
export const toLine = (q: string, options: string[], correctIndex: number, explanation = '') =>
  [clean(q), ...options.map(clean), String(correctIndex + 1), clean(explanation)].filter((x, i, a) => i < a.length - 1 || x).join(' | ');

/** Units of the official syllabus that belong to this subject name (matched like the Syllabus screen). */
function unitsFor(subjectName: string) {
  const n = subjectName.toLowerCase().trim();
  const c = [...SYLLABUS_YEAR1, ...SYLLABUS_CSE_SEM3, ...SYLLABUS_CSE_SEM5].find((x) => x.match.includes(n) || x.name.toLowerCase() === n);
  return c ? c.units : [];
}

interface Props {
  subjectName: string;                 // chosen subject ('' = none chosen yet)
  onAdd: (lines: string[]) => void;    // add these lines to the question box
}

// Screen part: question builder tools.
export const QuestionBuilderTools: React.FC<Props> = ({ subjectName, onAdd }) => {
  const units = useMemo(() => unitsFor(subjectName), [subjectName]);
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState('Medium');
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [busy, setBusy] = useState(false);

  // ---- 1. upload a file ----
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try {
      const rows = await readSheetFile(f, ['question']);
      const get = (r: Record<string, unknown>, ...keys: string[]) => {
        const k = Object.keys(r).find((h) => keys.includes(h.toLowerCase().replace(/[^a-z]/g, '')));
        return k ? String(r[k]) : '';
      };
      const lines: string[] = []; let bad = 0;
      for (const r of rows) {
        const q = get(r, 'question', 'questions');
        const opts = [get(r, 'a', 'optiona', 'option1'), get(r, 'b', 'optionb', 'option2'), get(r, 'c', 'optionc', 'option3'), get(r, 'd', 'optiond', 'option4')].filter(Boolean);
        const ans = get(r, 'answer', 'correct', 'correctanswer', 'correctoption').trim().toUpperCase();
        const idx = /^[A-D]$/.test(ans) ? ans.charCodeAt(0) - 65 : /^[1-4]$/.test(ans) ? Number(ans) - 1 : -1;
        if (!q || opts.length < 2 || idx < 0 || idx >= opts.length) { bad++; continue; }
        lines.push(toLine(q, opts, idx, get(r, 'explanation', 'reason')));
      }
      if (!lines.length) return notify.error('No questions found', 'Use the columns Question, A, B, C, D, Answer. Download the sample file to see the format.');
      onAdd(lines);
      notify.success(`${lines.length} questions added`, bad ? `${bad} rows were skipped (question, at least 2 options and the answer are needed).` : 'Check them in the box below.');
    } catch (err: any) {
      notify.error('Could not read the file', err?.message || String(err));
    }
  };

  const downloadSample = () => exportExcel({
    title: 'Question upload format', filename: 'Online_Test_Questions_Sample', sheetName: 'Questions',
    columns: ['Question', 'A', 'B', 'C', 'D', 'Answer', 'Explanation'],
    rows: [
      ['Which data structure works on LIFO?', 'Queue', 'Stack', 'Tree', 'Graph', 'B', 'A stack removes the last item added first.'],
      ['Binary of decimal 5 is', '100', '101', '110', '111', 'B', '5 = 4 + 1 = 101 in binary.'],
    ],
  });

  // ---- 2. auto-create ----
  const autoCreate = async () => {
    if (!subjectName) return notify.error('Choose the subject first');
    const t = topic.trim() || units.map((u) => u.unitTitle).join(', ');
    if (!t) return notify.error('Type a topic', 'For example: Pointers, Laplace transform, Water hardness');
    setBusy(true);
    const lines: string[] = []; const seen: string[] = []; let provider = '';
    try {
      for (let left = count; left > 0;) {
        const n = Math.min(5, left);
        const r = await fetch('/api/ai/qna-generate-questions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject: subjectName, topic: t, language, difficulty, count: n, excludeQuestions: seen }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || `Server answered ${r.status}`);
        provider = j.provider || provider;
        const fresh = (j.questions || []).filter((q: any) => q?.question && !seen.includes(q.question));
        if (!fresh.length) break;                                       // the question bank has nothing new
        for (const q of fresh) {
          const opts: string[] = (q.options || []).map((o: string) => stripLetter(String(o)));
          const idx = (q.options || []).findIndex((o: string) => String(o).trim() === String(q.correctAnswer).trim());
          if (opts.length < 2 || idx < 0) continue;
          seen.push(q.question); lines.push(toLine(q.question, opts, idx, q.explanation || ''));
        }
        left -= n;
      }
    } catch (err: any) {
      setBusy(false);
      return notify.error('Could not create questions', err?.message || String(err));
    }
    setBusy(false);
    if (!lines.length) return notify.error('No questions could be made for this topic', 'Try another topic, or upload your own questions.');
    onAdd(lines);
    notify.success(`${lines.length} questions created`, provider === 'gemini'
      ? 'Made by AI from your topic. Please check every question and answer before announcing.'
      : 'AI is not switched on (no GEMINI_API_KEY), so these come from the built-in question bank and may not match the topic exactly. Please check them.');
  };

  return (
    <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 p-3 space-y-3">
      <div className="font-bold text-slate-800 dark:text-slate-100">Add questions quickly</div>

      {/* upload */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 font-bold cursor-pointer hover:bg-slate-50">
          <Upload className="w-3.5 h-3.5" /> Upload my questions (Excel / CSV)
          <input type="file" accept=".xlsx,.csv,.txt" className="hidden" onChange={onFile} />
        </label>
        <button type="button" onClick={downloadSample} className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-300 font-bold hover:underline cursor-pointer">
          <Download className="w-3.5 h-3.5" /> Sample file
        </button>
      </div>

      {/* auto-create */}
      <div className="flex flex-wrap items-center gap-2">
        {units.length > 0 ? (
          <select value={topic} onChange={(e) => setTopic(e.target.value)} className="flex-1 min-w-[180px] p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
            <option value="">Whole syllabus of this subject</option>
            {units.map((u) => <option key={u.unitNo} value={`${u.unitTitle}: ${u.topics.slice(0, 4).join('; ')}`}>Unit {u.unitNo}: {u.unitTitle}</option>)}
          </select>
        ) : (
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic, e.g. Pointers in C"
            className="flex-1 min-w-[180px] p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
        )}
        <select value={count} onChange={(e) => setCount(Number(e.target.value))} aria-label="How many" className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
          {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n} questions</option>)}
        </select>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} aria-label="Difficulty" className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
          <option>Easy</option><option>Medium</option><option>Hard</option>
        </select>
        <select value={language} onChange={(e) => setLanguage(e.target.value as 'en' | 'hi')} aria-label="Language" className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
          <option value="en">English</option><option value="hi">हिंदी</option>
        </select>
        <button type="button" onClick={autoCreate} disabled={busy || !subjectName}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold cursor-pointer">
          <Sparkles className="w-3.5 h-3.5" /> {busy ? 'Creating…' : 'Auto-create'}
        </button>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">Questions are added to the box below. You can change or delete any line before creating the test.</p>
    </div>
  );
};
