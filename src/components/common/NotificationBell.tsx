// ===================================================================================================
// The bell in the top bar: unread notifications, mark as read, clear.
// ===================================================================================================
import React, { useState, useRef, useEffect } from 'react';
import { useCollege } from '../../context/CollegeContext';
import { NotificationCategory } from '../../types';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  Check,
  Trash2,
  Volume2,
  VolumeX,
  Megaphone,
  Radio,
  Sparkles,
} from 'lucide-react';

// Screen part: notification bell.
export const NotificationBell: React.FC = () => {
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearAllNotifications,
    soundEnabled,
    toggleSound,
    broadcastLiveAlert,
    currentUser,
    t,
  } = useCollege();

  // Is the 'en' shown on screen? (true / false)
  const [isOpen, setIsOpen] = useState(false);
  // The filter chosen by the user (filter / list selection)
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  // Is the 'broadcast pop-up' shown on screen? (true / false)
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  // Broadcast title (kept in screen state)
  const [broadcastTitle, setBroadcastTitle] = useState('');
  // Broadcast msg (kept in screen state)
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Runs automatically whenever these change: isOpen.
  useEffect(() => {
    // Runs when the user does this on screen: click outside.
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredNotifications = notifications.filter((n) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'unread') return !n.isRead;
    return n.category === selectedFilter;
  });

  // Runs when the user does this on screen: broadcast.
  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMsg.trim()) return;
    broadcastLiveAlert(broadcastTitle.trim(), broadcastMsg.trim(), 'circular', 'urgent');
    setBroadcastTitle('');
    setBroadcastMsg('');
    setShowBroadcastModal(false);
  };

  // Returns the category icon.
  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'attendance':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'exam':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'circular':
        return <AlertCircle className="w-4 h-4 text-rose-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
        title="Live Real-Time Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadNotificationsCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-4.5 h-4.5 rounded-full bg-blue-600 text-white font-extrabold text-[10px] flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
            {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id="notifications-dropdown-menu"
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <h3 className="font-bold text-xs sm:text-sm">{t.notifications}</h3>
              {unreadNotificationsCount > 0 && (
                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                  {unreadNotificationsCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleSound}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                title={soundEnabled ? 'Mute Alert Sound' : 'Enable Alert Sound'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-blue-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
              </button>
              {(currentUser.role === 'admin' || currentUser.role === 'faculty') && (
                <button
                  onClick={() => setShowBroadcastModal(true)}
                  className="p-1.5 text-slate-400 hover:text-amber-300 rounded-lg transition-colors cursor-pointer"
                  title="Broadcast Instant Alert"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1 overflow-x-auto text-[11px]">
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: 'Unread' },
              { id: 'attendance', label: 'Attendance' },
              { id: 'exam', label: 'Exams' },
              { id: 'circular', label: 'Circulars' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedFilter === f.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-1">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-1">
                <Bell className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs font-semibold">{t.noNotifications}</p>
                <p className="text-[10px] text-slate-400">Live events will appear here in real-time.</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => markNotificationAsRead(notif.id)}
                  className={`p-3 rounded-xl transition-all cursor-pointer flex items-start gap-2.5 ${
                    !notif.isRead
                      ? 'bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{getCategoryIcon(notif.category)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4
                        className={`text-xs font-bold leading-tight truncate ${
                          !notif.isRead
                            ? 'text-slate-900 dark:text-white'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {notif.timestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug line-clamp-2">
                      {notif.message}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1" />
                  )}
                </div>
              ))
            )}
          </div>

          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/70 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <button
              onClick={markAllNotificationsAsRead}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer text-[11px]"
            >
              <Check className="w-3 h-3" />
              <span>{t.markAllRead}</span>
            </button>
            <button
              onClick={clearAllNotifications}
              className="text-slate-400 hover:text-rose-600 font-semibold flex items-center gap-1 cursor-pointer text-[11px]"
            >
              <Trash2 className="w-3 h-3" />
              <span>{t.clearAll}</span>
            </button>
          </div>
        </div>
      )}

      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Send Real-Time Campus Push Alert
                </h3>
              </div>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleBroadcast} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Alert Title *
                </label>
                <input
                  type="text"
                  required
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="e.g. Sessional Exam Hall Seating Announced"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Alert Message *
                </label>
                <textarea
                  rows={3}
                  required
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  placeholder="Enter message text that will pop up immediately on all user screens..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="px-4 py-2 text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Broadcast Now</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
