// ===================================================================================================
// Small Excel / PDF / CSV buttons for any table on screen.
// ===================================================================================================
import { FileSpreadsheet, FileText, Download } from 'lucide-react';
import { exportExcel, exportPdf, exportCsv, type ExportTable } from '../../utils/exporter';
import { uiAlert } from './ui/feedback';   // Step 18: styled message instead of the browser's alert box

/** Three small buttons: Excel (.xlsx), PDF and CSV for any table.
 *  `build` is called when a button is pressed, so the file always has the rows that are on screen right now. */
export default function ExportMenu({ build, disabled, compact }: { build: () => ExportTable; disabled?: boolean; compact?: boolean }) {
  const base = 'inline-flex items-center gap-1.5 rounded-lg font-bold text-white shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ' + (compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3.5 py-2 text-xs');
  // Run.
  const run = (fn: (t: ExportTable) => void) => () => { const t = build(); if (t.rows.length === 0) { uiAlert('Nothing to export yet.'); return; } fn(t); };
  return (
    <div className="inline-flex flex-wrap items-center gap-2" data-no-print>
      <button disabled={disabled} onClick={run((t) => exportExcel(t))} className={base + ' bg-emerald-600 hover:bg-emerald-500'} title="Download as Excel (.xlsx)">
        <FileSpreadsheet className="w-4 h-4" /> Excel
      </button>
      <button disabled={disabled} onClick={run(exportPdf)} className={base + ' bg-red-600 hover:bg-red-500'} title="Open the print window, choose 'Save as PDF'">
        <FileText className="w-4 h-4" /> PDF
      </button>
      <button disabled={disabled} onClick={run(exportCsv)} className={base + ' bg-slate-600 hover:bg-slate-500'} title="Download as CSV">
        <Download className="w-4 h-4" /> CSV
      </button>
    </div>
  );
}
