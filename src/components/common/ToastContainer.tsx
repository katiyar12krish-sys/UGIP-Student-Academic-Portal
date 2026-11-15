// ===================================================================================================
// Live alert pop-up for new notifications (bottom right).
// ===================================================================================================
import React from 'react';
import { useCollege } from '../../context/CollegeContext';
import { Bell, CheckCircle2, AlertTriangle, AlertCircle, X, Sparkles } from 'lucide-react';

// Screen part: toast container.
export const ToastContainer: React.FC = () => {
  const { activeToast, dismissToast } = useCollege();

  if (!activeToast) return null;

  const isUrgent = activeToast.priority === 'urgent';
  const isHigh = activeToast.priority === 'high';

  // Returns the icon.
  const getIcon = () => {
    switch (activeToast.category) {
      case 'attendance':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
      case 'exam':
        return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
      case 'circular':
        return <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500 shrink-0" />;
    }
  };

  return (
    <div
      id="live-toast-container"
      className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
      role="alert"
      aria-live="assertive"
    >
      <div
        className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-md transition-all ${
          isUrgent
            ? 'bg-slate-900/95 text-white border-rose-500/70 shadow-rose-950/40 ring-1 ring-rose-500/30'
            : isHigh
            ? 'bg-slate-900/95 text-white border-amber-500/70 shadow-amber-950/40 ring-1 ring-amber-500/30'
            : 'bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 shadow-xl'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
              {getIcon()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-600 text-white flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Live Alert
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {activeToast.timestamp}
                </span>
              </div>
              <h4 className="font-bold text-xs sm:text-sm mt-1 leading-snug line-clamp-1">
                {activeToast.title}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed line-clamp-2">
                {activeToast.message}
              </p>
            </div>
          </div>
          <button
            onClick={dismissToast}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Dismiss toast"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
