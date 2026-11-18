// ===================================================================================================
// The green chat button (bottom right) on every signed-in screen, with the unread count.
// ===================================================================================================
import React, { useCallback, useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { chatApi } from '../../services/chatApi';
import { ChatHub } from './ChatHub';

// The green chat button (bottom right) on every signed-in screen: parent, student, teacher and admin.
// It shows how many messages are waiting; the chat opens full-screen on a phone and as a window on a computer.
export const ChatLauncher: React.FC = () => {
  // Is the 'panel' shown on screen? (true / false)
  const [open, setOpen] = useState(false);
  // Unread (kept in screen state)
  const [unread, setUnread] = useState(0);

  // Poll.
  const poll = useCallback(async () => {
    if (document.visibilityState !== 'visible') return;
    const r = await chatApi.unread();
    if (r.ok) setUnread(r.data.unread);
  }, []);

  // Runs automatically whenever these change: poll.
  useEffect(() => { poll(); const t = window.setInterval(poll, 15000); return () => window.clearInterval(t); }, [poll]);
  // Runs automatically whenever these change: open.
  useEffect(() => { if (open) { const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev; }; } }, [open]);

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Messages / संदेश"
          className="fixed bottom-20 right-3.5 sm:bottom-6 sm:right-6 z-[60] w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xl flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 border-2 border-white dark:border-slate-850"
        >
          <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-950">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-[70] md:inset-auto md:bottom-4 md:right-4 md:w-[920px] md:max-w-[calc(100vw-2rem)] md:h-[640px] md:max-h-[calc(100vh-2rem)] md:rounded-2xl md:shadow-2xl md:border md:border-slate-200 dark:md:border-slate-700 bg-white dark:bg-slate-950">
          <ChatHub onClose={() => { setOpen(false); poll(); }} onUnread={poll} />
        </div>
      )}
    </>
  );
};
