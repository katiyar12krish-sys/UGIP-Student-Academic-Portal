// =====================================================================================================
// Shared, professional-looking feedback for the whole portal (Step 18)
// -----------------------------------------------------------------------------------------------------
// Replaces the browser's plain grey alert() / confirm() boxes with:
//   * toast messages   ->  notify.success('Saved'), notify.error('Could not save: ...'), notify.info(...), notify.warning(...)
//                          small cards at the bottom-right that disappear by themselves after a few seconds
//   * confirm dialog   ->  if (await confirmDialog({ title: 'Delete this exam?', message: '...', danger: true })) { ... }
//                          a centred card with a clear title, explanation and two buttons
// Both work from ANY file (no React context needed): they send an event to <FeedbackHost/>, which is placed
// once in App.tsx and draws them. Plain functions mean old code can switch from alert() with a one-word change.
// =====================================================================================================
import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X, Trash2, HelpCircle } from 'lucide-react';

// Data shape: kind.
type Kind = 'success' | 'error' | 'info' | 'warning';
// Data shape: toast msg.
interface ToastMsg { id: number; kind: Kind; title: string; message?: string }
// Data shape: confirm req.
interface ConfirmReq {
  id: number; title: string; message?: string; confirmText?: string; cancelText?: string; danger?: boolean;
  resolve: (ok: boolean) => void;
}

// ---------- tiny event bus between the plain functions and the host component ----------
const listeners = { toast: new Set<(t: ToastMsg) => void>(), confirm: new Set<(c: ConfirmReq) => void>() };
let nextId = 1;

/** Show a toast. `text` may be "Title" or "Title\nmore details". */
function push(kind: Kind, text: string, details?: string) {
  const [title, ...rest] = String(text ?? '').split('\n');
  const msg: ToastMsg = { id: nextId++, kind, title, message: details ?? (rest.join('\n') || undefined) };
  if (listeners.toast.size === 0) { console.log(`[${kind}] ${text}`); return; }   // host not mounted (e.g. tests)
  listeners.toast.forEach((l) => l(msg));
}
export const notify = {
  success: (text: string, details?: string) => push('success', text, details),
  error: (text: string, details?: string) => push('error', text, details),
  info: (text: string, details?: string) => push('info', text, details),
  warning: (text: string, details?: string) => push('warning', text, details),
};

/** Drop-in replacement for window.alert(): shows an info toast (or an error toast when the text looks like an error). */
export function uiAlert(text: string) {
  const t = String(text ?? '');
  (/(error|failed|could not|cannot|invalid|not allowed|denied|)/i.test(t) ? notify.error : notify.info)(t);
}

/** Ask the user to confirm. Resolves true for "Yes", false for "Cancel" / Esc / clicking outside. */
export function confirmDialog(opts: { title: string; message?: string; confirmText?: string; cancelText?: string; danger?: boolean } | string): Promise<boolean> {
  const o = typeof opts === 'string' ? { title: opts } : opts;
  if (listeners.confirm.size === 0) return Promise.resolve(window.confirm(o.title + (o.message ? '\n\n' + o.message : '')));
  return new Promise((resolve) => listeners.confirm.forEach((l) => l({ id: nextId++, ...o, resolve })));
}

// ---------- the host: put <FeedbackHost/> once near the top of the app ----------
const STYLE: Record<Kind, { icon: React.ElementType; ring: string; iconColor: string; bar: string }> = {
  success: { icon: CheckCircle2, ring: 'border-emerald-200 dark:border-emerald-800', iconColor: 'text-emerald-600', bar: 'bg-emerald-500' },
  error: { icon: XCircle, ring: 'border-rose-200 dark:border-rose-800', iconColor: 'text-rose-600', bar: 'bg-rose-500' },
  info: { icon: Info, ring: 'border-sky-200 dark:border-sky-800', iconColor: 'text-sky-600', bar: 'bg-sky-500' },
  warning: { icon: AlertTriangle, ring: 'border-amber-200 dark:border-amber-800', iconColor: 'text-amber-600', bar: 'bg-amber-500' },
};

// Screen part: feedback host.
export const FeedbackHost: React.FC = () => {
  // List of toasts shown on this screen
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  // Ask (kept in screen state)
  const [ask, setAsk] = useState<ConfirmReq | null>(null);
  const okRef = useRef<HTMLButtonElement>(null);

  // Runs once when this part of the screen opens.
  useEffect(() => {
    // Called when: toast.
    const onToast = (t: ToastMsg) => {
      setToasts((list) => [...list.slice(-3), t]);                               // at most 4 on screen
      setTimeout(() => setToasts((list) => list.filter((x) => x.id !== t.id)), t.kind === 'error' ? 7000 : 4500);
    };
    // Called when: confirm.
    const onConfirm = (c: ConfirmReq) => setAsk(c);
    listeners.toast.add(onToast); listeners.confirm.add(onConfirm);
    return () => { listeners.toast.delete(onToast); listeners.confirm.delete(onConfirm); };
  }, []);

  // keyboard: Esc = cancel, Enter = confirm; focus the main button when the dialog opens
  useEffect(() => {
    if (!ask) return;
    okRef.current?.focus();
    // Called when: key.
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ask]);

  // Close.
  const close = (ok: boolean) => { ask?.resolve(ok); setAsk(null); };

  return (
    <>
      {/* toasts: bottom-right on desktop, full width at the bottom on phones */}
      <div className="fixed z-[100] bottom-4 right-4 left-4 sm:left-auto sm:w-96 flex flex-col gap-2 pointer-events-none" aria-live="polite">
        {toasts.map((t) => {
          const s = STYLE[t.kind]; const Icon = s.icon;
          return (
            <div key={t.id} role={t.kind === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto relative overflow-hidden bg-white dark:bg-slate-900 border ${s.ring} rounded-xl shadow-lg pl-4 pr-9 py-3 flex gap-3 items-start animate-in slide-in-from-bottom-3 fade-in duration-200`}>
              <span className={`absolute left-0 top-0 bottom-0 w-1 ${s.bar}`} />
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${s.iconColor}`} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">{t.title}</p>
                {t.message && <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed whitespace-pre-line">{t.message}</p>}
              </div>
              <button onClick={() => setToasts((l) => l.filter((x) => x.id !== t.id))} aria-label="Close message"
                className="absolute top-2 right-2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* confirm dialog */}
      {ask && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[2px] animate-in fade-in duration-150"
          onMouseDown={(e) => { if (e.target === e.currentTarget) close(false); }}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="ui-confirm-title"
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 animate-in zoom-in-95 duration-150">
            <div className="flex gap-4">
              <div className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${ask.danger ? 'bg-rose-100 dark:bg-rose-950 text-rose-600' : 'bg-sky-100 dark:bg-sky-950 text-sky-600'}`}>
                {ask.danger ? <Trash2 className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <h3 id="ui-confirm-title" className="text-base font-bold text-slate-900 dark:text-white">{ask.title}</h3>
                {ask.message && <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">{ask.message}</p>}
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button onClick={() => close(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                {ask.cancelText || 'Cancel'}
              </button>
              <button ref={okRef} onClick={() => close(true)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm cursor-pointer ${ask.danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-800 hover:bg-blue-900'}`}>
                {ask.confirmText || (ask.danger ? 'Delete' : 'Yes, continue')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
