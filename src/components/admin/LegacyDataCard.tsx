// ===================================================================================================
// Admin card that moves old browser-only marks / attendance to the server (shown only when such data exists).
// ===================================================================================================
import React, { useState } from 'react';
import { DatabaseBackup } from 'lucide-react';
import { legacyBrowserData, importLegacyBrowserData } from '../../services/legacyImport';
import { useCollege } from '../../context/CollegeContext';

// Shown to the admin only while this browser still holds marks / attendance from the old (browser-only) version.
export const LegacyDataCard: React.FC = () => {
  const { refreshAcademic } = useCollege();
  // Version (kept in screen state)
  const [version, setVersion] = useState(0);
  // true while waiting for the server (buttons are disabled meanwhile)
  const [busy, setBusy] = useState(false);
  // Result (kept in screen state)
  const [result, setResult] = useState('');
  const d = React.useMemo(() => legacyBrowserData(), [version]);
  if (!d.hasAnyOldKey && !result) return null;

  // Run.
  const run = async () => {
    if (!window.confirm(
      `Move this browser's old data to the server?\n\n${d.tests.length} exams (${d.marks} marks), ${d.sessions.length} attendance sessions (${d.records} records) and ${d.onlineTests.length} online tests / assignments.\n` +
      `Sample data that came with the app is not moved.\nAfter a successful move the old copy is removed from this browser.`)) return;
    setBusy(true);
    const r = await importLegacyBrowserData();
    setBusy(false);
    setResult(r.message);
    setVersion((v) => v + 1);
    if (r.ok) refreshAcademic();
  };

  return (
    <div className="mb-6 p-4 rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 flex flex-col sm:flex-row sm:items-center gap-3">
      <DatabaseBackup className="w-6 h-6 text-amber-600 shrink-0" />
      <div className="flex-1 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
        <p className="font-bold text-sm">Old marks, attendance &amp; online tests found in this browser</p>
        {result ? <p className="whitespace-pre-line mt-1">{result}</p> : (
          <p>
            Exams, marks, attendance and online tests / assignments are now stored on the server. This browser still has {d.tests.length} exam(s), {d.sessions.length} attendance session(s) and {d.onlineTests.length} online test(s) from the old version.
            Move them once so nothing is lost. Do this on the computer where the real data was entered.
          </p>
        )}
      </div>
      {!result && (
        <button onClick={run} disabled={busy} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl cursor-pointer shrink-0">
          {busy ? 'Moving…' : 'Move to server'}
        </button>
      )}
    </div>
  );
};
