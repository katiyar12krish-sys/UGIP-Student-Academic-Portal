// ===================================================================================================
// Parent: teacher messages, doubts and online tests of their child (read-only) + reminders.
// ===================================================================================================
import React, { useEffect, useState } from 'react';
import { Bell, HelpCircle, ClipboardList, MessageCircle, Loader2 } from 'lucide-react';
import { directNoticesApi, doubtsApi } from '../../services/commsApi';
import { call } from '../../services/academicApi';
import type { DirectStudentNotice, StudentDoubtTicket } from '../../types';

// Data shape: test row.
interface TestRow {
  id: string; title: string; subjectName: string; deadlineDate: string; deadlineTime: string; totalMarks: number; status: string;
  submittedStudentIds: string[]; results: Record<string, { score: number; total: number; percentage: number; grade: string }>;
}

// Step 14: what a parent can now see about their child, read-only: messages from teachers, doubts, online tests.
// The server sends only this parent's own children (and never the answer key).
export const ParentUpdates: React.FC<{ kids: { id: string; name: string }[] }> = ({ kids }) => {
  // List of notices shown on this screen
  const [notices, setNotices] = useState<DirectStudentNotice[] | null>(null);
  // List of doubts shown on this screen
  const [doubts, setDoubts] = useState<StudentDoubtTicket[] | null>(null);
  // List of tests shown on this screen
  const [tests, setTests] = useState<TestRow[] | null>(null);
  // Error message to show (error); empty = no error
  const [error, setError] = useState('');

  // Runs once when this part of the screen opens.
  useEffect(() => {
    let alive = true;
    // Loads the data from the server.
    const load = async () => {
      const [a, b, c] = await Promise.all([directNoticesApi.list(), doubtsApi.list(), call<TestRow[]>('GET', '/api/online-tests')]);
      if (!alive) return;
      if (a.ok) setNotices(a.data); else setError(a.error);
      if (b.ok) setDoubts(b.data);
      if (c.ok) setTests(c.data);
    };
    load();
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') load(); }, 30000);
    return () => { alive = false; window.clearInterval(t); };
  }, []);

  // First.
  const first = (n: string) => n.split(/\s+/)[0];
  const multi = kids.length > 1;
  // Box.
  const Box: React.FC<{ icon: React.ReactNode; title: string; hi: string; children: React.ReactNode }> = ({ icon, title, hi, children }) => (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5">
      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-3">{icon} {hi} <span className="text-slate-400 font-medium">/ {title}</span></h3>
      {children}
    </section>
  );
  const Loading = <Loader2 className="w-4 h-4 animate-spin text-slate-400" />;
  // Empty.
  const Empty = ({ t }: { t: string }) => <p className="text-xs text-slate-500">{t}</p>;
  // Prio.
  const prio = (p: string) => (p === 'critical' ? 'bg-rose-100 text-rose-700' : p === 'urgent' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600');

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
        <MessageCircle className="w-4 h-4 shrink-0" />
        <span>शिक्षक से बात करने के लिए नीचे-दाएँ हरा चैट बटन दबाएँ (लिखकर या बोलकर)। / Use the green chat button (bottom right) to message a teacher by text or voice.</span>
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}

      <Box icon={<Bell className="w-4 h-4 text-amber-600" />} hi="शिक्षक के संदेश" title="Messages from teachers">
        {!notices ? Loading : !notices.length ? <Empty t="कोई संदेश नहीं / No messages." /> : (
          <ul className="space-y-2">{notices.slice(0, 8).map((n) => (
            <li key={n.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs">
              <div className="flex items-center justify-between gap-2"><span className="font-bold text-slate-800 dark:text-slate-100">{n.title}</span><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${prio(n.priority)}`}>{n.priority}</span></div>
              <p className="mt-1 text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{n.message}</p>
              <p className="mt-1 text-[10px] text-slate-400">{multi ? `${first(n.targetStudentName)} · ` : ''}{n.sentByName} · {n.sentAt}</p>
            </li>))}</ul>
        )}
      </Box>

      <Box icon={<HelpCircle className="w-4 h-4 text-sky-600" />} hi="बच्चे के सवाल (doubts)" title="Your child's doubts (read-only)">
        {!doubts ? Loading : !doubts.length ? <Empty t="कोई doubt नहीं / No doubts." /> : (
          <ul className="space-y-2">{doubts.slice(0, 8).map((d) => (
            <li key={d.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs">
              <div className="flex items-center justify-between gap-2"><span className="font-bold text-slate-800 dark:text-slate-100">{d.subjectName}: {d.questionTitle}</span><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${d.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' : d.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>{d.status}</span></div>
              <p className="mt-1 text-[10px] text-slate-400">{multi ? `${first(d.studentName)} · ` : ''}{d.askedAt} · {d.replies.length} reply</p>
            </li>))}</ul>
        )}
      </Box>

      <Box icon={<ClipboardList className="w-4 h-4 text-violet-600" />} hi="ऑनलाइन टेस्ट / असाइनमेंट" title="Online tests">
        {!tests ? Loading : !tests.length ? <Empty t="कोई टेस्ट नहीं / No tests." /> : (
          <ul className="space-y-2">{tests.slice(0, 10).map((t) => (
            <li key={t.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs">
              <div className="font-bold text-slate-800 dark:text-slate-100">{t.subjectName}: {t.title}</div>
              <p className="text-[10px] text-slate-400">अंतिम तिथि / Deadline {t.deadlineDate} {t.deadlineTime}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">{kids.map((k) => {
                const r = t.results[k.id], done = t.submittedStudentIds.includes(k.id);
                return <span key={k.id} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{first(k.name)}: {done ? (r ? `${r.score}/${r.total} · ${r.grade}` : 'जमा / Submitted') : 'जमा नहीं / Not submitted'}</span>;
              })}</div>
            </li>))}</ul>
        )}
      </Box>
    </div>
  );
};
