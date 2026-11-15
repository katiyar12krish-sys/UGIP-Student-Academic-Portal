// ===================================================================================================
// Preview of a previous-year UBTER question paper.
// ===================================================================================================
import React, { useState } from 'react';
import { PreviousYearPaper } from '../../types';
import { useCollege } from '../../context/CollegeContext';
import { FileText, Download, CheckCircle, X, BookOpen, Clock, Award } from 'lucide-react';

// Data shape: paper preview modal props.
interface PaperPreviewModalProps {
  paper: PreviousYearPaper | null;
  isOpen: boolean;
  onClose: () => void;
}

// Screen part: paper preview modal.
export const PaperPreviewModal: React.FC<PaperPreviewModalProps> = ({ paper, isOpen, onClose }) => {
  const { incrementPaperDownload } = useCollege();
  // Download success (kept in screen state)
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  // Which tab is open right now
  const [activeTab, setActiveTab] = useState<'paper' | 'solutions' | 'scheme'>('paper');

  if (!isOpen || !paper) return null;

  // Runs when the user does this on screen: download.
  const handleDownload = () => {
    incrementPaperDownload(paper.id);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div id="paper-preview-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
      <div id="paper-preview-modal-content" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl mt-0.5">
              <FileText className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  UBTER Board Paper · {paper.year}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-white/10 text-slate-200">
                  {paper.examSession}
                </span>
              </div>
              <h3 className="font-bold text-lg leading-snug">{paper.title}</h3>
              <p className="text-xs text-blue-200 mt-0.5">
                {paper.subjectName} ({paper.subjectCode}) · Semester {paper.semester} · {paper.branch}
              </p>
            </div>
          </div>
          <button
            id="close-paper-modal-btn"
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Quick Info Banner */}
        <div className="bg-slate-100 dark:bg-slate-800/80 px-6 py-2.5 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-4">
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
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Size: {paper.fileSizeBytes}</span>
            <span className="text-[11px] text-slate-500">· Downloads: {paper.downloadCount}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50 dark:bg-slate-900">
          <button
            onClick={() => setActiveTab('paper')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'paper'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500'
            }`}
          >
            Question Paper View
          </button>
          <button
            onClick={() => setActiveTab('solutions')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'solutions'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500'
            }`}
          >
            Model Answers & Steps
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Tab "paper" */}
          {activeTab === 'paper' && (
            <div className="space-y-4 text-slate-800 dark:text-slate-200 font-sans">
              <div className="border-b pb-3 text-center border-slate-200 dark:border-slate-800">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  UTTARAKHAND BOARD OF TECHNICAL EDUCATION, ROORKEE (UBTER)
                </p>
                <h4 className="font-bold text-base mt-1 text-slate-900 dark:text-white">
                  DIPLOMA EXAMINATION IN {paper.branch.toUpperCase()} ENGINEERING
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Subject: {paper.subjectName} ({paper.subjectCode})
                </p>
              </div>

              <div className="space-y-3">
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

          {/* Tab "solutions" */}
          {activeTab === 'solutions' && (
            <div className="space-y-3 font-sans">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl">
                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300 mb-1 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Verified Model Solutions Available
                </h4>
                <p className="text-xs text-emerald-800 dark:text-emerald-400">
                  Prepared by Uttarakhand Government Institute of Polytechnic senior faculty.
                </p>
              </div>
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3 bg-slate-50 dark:bg-slate-800/40 text-xs">
                <h5 className="font-bold text-slate-900 dark:text-white">Solution Outline for Key Questions:</h5>
                <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300 leading-relaxed">
                  <li><strong>Section A (2-Mark Definitions):</strong> Crisp 2-line standard technical definitions with SI units.</li>
                  <li><strong>Section B (5-Mark Derivations & Diagrams):</strong> Hand-drawn schematic layouts and step-by-step proofs.</li>
                  <li><strong>Section C (10-Mark Comprehensive Problems):</strong> Complete engineering design procedures with limit-state assumptions.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Download */}
        <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            {downloadSuccess && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle className="w-4 h-4" /> Downloaded successfully!
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Download Official PDF ({paper.fileSizeBytes})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
