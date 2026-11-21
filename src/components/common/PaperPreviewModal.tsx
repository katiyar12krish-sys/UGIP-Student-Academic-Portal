// ===================================================================================================
// Preview of a previous-year UBTER question paper (Mobile-Friendly & Downloadable).
// ===================================================================================================
import React, { useState } from 'react';
import { PreviousYearPaper } from '../../types';
import { useCollege } from '../../context/CollegeContext';
import { FileText, Download, CheckCircle, X, BookOpen, Clock, Award, ExternalLink } from 'lucide-react';

interface PaperPreviewModalProps {
  paper: PreviousYearPaper | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PaperPreviewModal: React.FC<PaperPreviewModalProps> = ({ paper, isOpen, onClose }) => {
  const { incrementPaperDownload } = useCollege();
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'paper' | 'solutions' | 'scheme'>('paper');

  if (!isOpen || !paper) return null;

  const handleDownload = () => {
    incrementPaperDownload(paper.id);
    setDownloadSuccess(true);

    const docContent = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="utf-8">
  <title>${paper.title} - ${paper.subjectName} (${paper.subjectCode})</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 24px auto; max-width: 820px; padding: 0 16px; color: #0f172a; line-height: 1.6; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .header h2 { margin: 0; font-size: 18px; text-transform: uppercase; }
    .header h3 { margin: 4px 0; font-size: 15px; color: #334155; }
    .meta-bar { display: flex; justify-content: space-between; font-weight: bold; background: #f1f5f9; padding: 8px 14px; border-radius: 6px; margin-bottom: 16px; font-size: 13px; }
    .section-title { font-size: 14px; font-weight: 800; background: #0f172a; color: #fff; padding: 6px 12px; border-radius: 6px; margin: 18px 0 10px 0; }
    .q-item { margin-bottom: 10px; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; }
  </style>
</head>
<body>
  <div class="header">
    <h2>Uttarakhand Board of Technical Education, Roorkee (UBTER)</h2>
    <h3>${paper.subjectName} (${paper.subjectCode}) &bull; Semester ${paper.semester} &bull; ${paper.branch}</h3>
    <p>Official Board Examination Question Paper (${paper.year})</p>
  </div>
  <div class="meta-bar">
    <span>Time: 2.5 Hours</span>
    <span>Max Marks: 50</span>
    <span>Subject Code: ${paper.subjectCode}</span>
  </div>
  <div class="section-title">Core Highlighted Questions</div>
  ${paper.highlights.map((h, i) => `<div class="q-item"><strong>Q${i + 1}.</strong> ${h}</div>`).join('')}
</body>
</html>`;

    const blob = new Blob([docContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${paper.subjectCode}_${paper.year}_UBTER.html`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadSuccess(false);
    }, 2500);
  };

  return (
    <div id="paper-preview-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in">
      <div id="paper-preview-modal-content" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 sm:p-5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2.5 bg-white/10 rounded-xl mt-0.5 shrink-0">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-300" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  UBTER Board Paper &bull; {paper.year}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-medium bg-white/10 text-slate-200">
                  {paper.examSession}
                </span>
              </div>
              <h3 className="font-bold text-base sm:text-lg leading-snug truncate">{paper.title}</h3>
              <p className="text-xs text-blue-200 mt-0.5 truncate">
                {paper.subjectName} ({paper.subjectCode}) &bull; Semester {paper.semester} &bull; {paper.branch}
              </p>
            </div>
          </div>
          <button
            id="close-paper-modal-btn"
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Quick Info Banner */}
        <div className="bg-slate-100 dark:bg-slate-800/80 px-4 sm:px-6 py-2.5 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <span className="flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Time: 2.5 Hours
            </span>
            <span className="flex items-center gap-1 font-medium">
              <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Max Marks: 50
            </span>
            <span className="flex items-center gap-1 font-medium">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> {paper.questionCount} Questions
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>Size: {paper.fileSizeBytes}</span>
            <span>&bull; Downloads: {paper.downloadCount}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 bg-slate-50 dark:bg-slate-900">
          <button
            onClick={() => setActiveTab('paper')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'paper'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500'
            }`}
          >
            Question Paper View
          </button>
          <button
            onClick={() => setActiveTab('solutions')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'solutions'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500'
            }`}
          >
            Model Answers & Steps
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
          {activeTab === 'paper' && (
            <div className="space-y-4 text-slate-800 dark:text-slate-200 font-sans">
              <div className="border-b pb-3 text-center border-slate-200 dark:border-slate-800">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  UTTARAKHAND BOARD OF TECHNICAL EDUCATION, ROORKEE (UBTER)
                </p>
                <h4 className="font-bold text-sm sm:text-base mt-1 text-slate-900 dark:text-white">
                  DIPLOMA EXAMINATION IN {paper.branch.toUpperCase()} ENGINEERING
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Subject: {paper.subjectName} ({paper.subjectCode}) &bull; Total Marks: 50
                </p>
              </div>

              <div className="space-y-2.5">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Featured Core Questions from this Paper:
                </h5>
                {paper.highlights.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs flex items-start gap-2.5"
                  >
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed font-medium text-slate-800 dark:text-slate-200">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'solutions' && (
            <div className="space-y-3 font-sans">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl">
                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-1 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Verified Model Solutions Available
                </h4>
                <p className="text-xs text-emerald-800 dark:text-emerald-400">
                  Prepared and verified by Uttarakhand Government Institute of Polytechnic faculty members.
                </p>
              </div>
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3 bg-slate-50 dark:bg-slate-800/40 text-xs">
                <h5 className="font-bold text-slate-900 dark:text-white">UBTER Diploma Marking Pattern:</h5>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300 leading-relaxed">
                  <li><strong>Section A (10 x 1 Mark = 10 Marks):</strong> Objective and short 1-line definitions.</li>
                  <li><strong>Section B (5 x 4 Marks = 20 Marks):</strong> Step-by-step algorithms, derivations and labeled diagrams.</li>
                  <li><strong>Section C (2 x 10 Marks = 20 Marks):</strong> Comprehensive engineering problems divided into parts (a) and (b) of 5 marks each.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Download */}
        <div className="bg-slate-50 dark:bg-slate-800/80 px-4 sm:px-6 py-3.5 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-2.5">
          {downloadSuccess && (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle className="w-4 h-4" /> Download started!
            </span>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2 w-full">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer text-center"
            >
              Close
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Download Document ({paper.fileSizeBytes})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
