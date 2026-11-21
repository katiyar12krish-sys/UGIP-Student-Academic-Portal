// ===================================================================================================
// News & circulars: list, filter, publish, Step 18 edit, delete (with confirmation).
// ===================================================================================================
import React, { useState } from 'react';
import { useCollege } from '../../context/CollegeContext';
import { NoticeAnnouncement } from '../../types';
import {
  Bell,
  Search,
  Filter,
  Calendar,
  FileText,
  Share2,
  Plus,
  Trash2,
  Pencil,
  ChevronRight,
  Printer,
  CheckCircle,
  X,
  Megaphone,
  Award,
  GraduationCap,
  Briefcase,
  Trophy,
  Building,
} from 'lucide-react';
import { editsApi } from '../../services/step18Api';            // Step 18: edit notices
import { notify, confirmDialog } from './ui/feedback';            // Step 18: styled messages

// Data shape: college news section props.
interface CollegeNewsSectionProps {
  allowPublish?: boolean;
  className?: string;
  defaultCategory?: string;
  onClose?: () => void;
  isModal?: boolean;
}

// Screen part: college news section.
export const CollegeNewsSection: React.FC<CollegeNewsSectionProps> = ({
  allowPublish = false,
  className = '',
  defaultCategory = 'All',
  onClose,
  isModal = false,
}) => {
  const { notices, addNotice, deleteNotice, currentUser, reloadNotices } = useCollege();
  // The id being edited right now (null = nothing open)
  const [editingId, setEditingId] = useState<string | null>(null);   // Step 18: id of the notice being edited (null = new notice)
  // Text typed in the search box
  const [searchQuery, setSearchQuery] = useState('');
  // The category chosen by the user (filter / list selection)
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultCategory);
  // The priority chosen by the user (filter / list selection)
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  // Is the 'publish pop-up' shown on screen? (true / false)
  const [showPublishModal, setShowPublishModal] = useState(false);
  // The notice for view chosen by the user (filter / list selection)
  const [selectedNoticeForView, setSelectedNoticeForView] = useState<NoticeAnnouncement | null>(null);
  // Copied id (kept in screen state)
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Values typed into the new notice form
  const [newNoticeForm, setNewNoticeForm] = useState({
    title: '',
    category: 'Exam' as NoticeAnnouncement['category'],
    priority: 'High' as NoticeAnnouncement['priority'],
    publishedBy: currentUser?.name
      ? `${currentUser.name} (${currentUser.role === 'admin' ? 'Principal / Administration' : 'Faculty Incharge'})`
      : 'Administrative Office, UGIP',
    content: '',
    pdfAttachment: '',
    targetBranch: 'All' as 'All' | 'CSE' | 'Civil',
    targetSemesters: [] as number[],
  });

  const categories = [
    { id: 'All', label: 'All Notices', icon: Bell },
    { id: 'Exam', label: 'UBTER Exam', icon: GraduationCap },
    { id: 'Academic', label: 'Academic', icon: FileText },
    { id: 'Scholarship', label: 'Scholarship', icon: Award },
    { id: 'Placement', label: 'Placement', icon: Briefcase },
    { id: 'Sports', label: 'Sports & Events', icon: Trophy },
    { id: 'Administrative', label: 'Administrative', icon: Building },
  ];

  // Students only see notices meant for their branch and semester (e.g. a Placement notice the admin addressed to semester 5 only).
  // Admin and faculty see everything. This is a display filter: the notice list itself is still stored in the browser.
  const canSee = (n: NoticeAnnouncement) => {
    if (currentUser.role !== 'student') return true;
    const branchOk = !n.targetBranch || n.targetBranch === 'All' || n.targetBranch === currentUser.branch;
    const semOk = !n.targetSemesters?.length || (!!currentUser.semester && n.targetSemesters.includes(currentUser.semester));
    return branchOk && semOk;
  };
  const visibleNotices = notices.filter(canSee);

  const filteredNotices = visibleNotices.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.publishedBy.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || item.category === selectedCategory;
    const matchesPriority =
      selectedPriority === 'All' || item.priority === selectedPriority;
    return matchesSearch && matchesCategory && matchesPriority;
  });

  const urgentCirculars = visibleNotices.filter((n) => n.priority === 'Urgent' || n.priority === 'High');

  // Error message to show (publish error); empty = no error
  const [publishError, setPublishError] = useState('');
  // Publishing (kept in screen state)
  const [publishing, setPublishing] = useState(false);
  // Error message to show (list error); empty = no error
  const [listError, setListError] = useState('');

  // Runs when the user does this on screen: publish submit.
  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (publishing || !newNoticeForm.title.trim() || !newNoticeForm.content.trim()) return;
    if (newNoticeForm.category === 'Placement' && newNoticeForm.targetSemesters.length === 0) return;   // placement notices must say which semester(s)
    setPublishing(true); setPublishError('');
    // Step 18: editing an existing notice -> PUT /api/notices/:id (same checks on the server as for a new one)
    if (editingId) {
      const u = await editsApi.updateNotice(editingId, { ...newNoticeForm, title: newNoticeForm.title.trim(), content: newNoticeForm.content.trim(), pdfAttachment: newNoticeForm.pdfAttachment.trim() || null });
      setPublishing(false);
      if (!u.ok) { setPublishError(u.error); return; }
      await reloadNotices();
      notify.success('Notice updated', newNoticeForm.title.trim());
      setEditingId(null); setShowPublishModal(false);
      return;
    }
    // The server decides: a teacher can publish only to classes they teach, and "published by" is their own name.
    const r = await addNotice({
      title: newNoticeForm.title.trim(),
      category: newNoticeForm.category,
      priority: newNoticeForm.priority,
      publishedBy: newNoticeForm.publishedBy.trim(),
      content: newNoticeForm.content.trim(),
      pdfAttachment: newNoticeForm.pdfAttachment.trim() || undefined,
      targetBranch: newNoticeForm.targetBranch,
      targetSemesters: newNoticeForm.targetSemesters,
    });
    setPublishing(false);
    if (!r.ok) { setPublishError(r.error); return; }
    setNewNoticeForm({
      title: '',
      category: 'Academic',
      priority: 'High',
      publishedBy: currentUser?.name
        ? `${currentUser.name} (${currentUser.role === 'admin' ? 'Principal Office' : 'Faculty Incharge'})`
        : 'Office of Principal, UGIP',
      content: '',
      pdfAttachment: '',
      targetBranch: 'All',
      targetSemesters: [],
    });
    setShowPublishModal(false);
  };

  /** Step 18: open the publish form filled with an existing notice. */
  const handleEdit = (n: NoticeAnnouncement) => {
    setNewNoticeForm({ title: n.title, category: n.category, priority: n.priority, publishedBy: n.publishedBy, content: n.content,
      pdfAttachment: n.pdfAttachment || '', targetBranch: ((n as any).targetBranch || 'All') as any, targetSemesters: ((n as any).targetSemesters || []) as number[] });
    setEditingId(n.id); setPublishError(''); setShowPublishModal(true);
  };

  // Runs when the user does this on screen: delete.
  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({ title: 'Delete this notice?', message: 'Students and parents will no longer see it.', danger: true }))) return;   // Step 18
    setListError('');
    const r = await deleteNotice(id);
    if (!r.ok) setListError(r.error);
  };

  // Runs when the user does this on screen: copy share link.
  const handleCopyShareLink = (notice: NoticeAnnouncement) => {
    navigator.clipboard?.writeText(
      `[UGIP Notice] ${notice.title} (${notice.date}) - Category: ${notice.category}. Published by: ${notice.publishedBy}. Details: ${notice.content}`
    );
    setCopiedId(notice.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div
      id="college-news-section-wrapper"
      className={`space-y-6 ${className} ${
        isModal
          ? 'p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full mx-auto max-h-[90vh] overflow-y-auto'
          : ''
      }`}
    >
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-4 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400 text-slate-950 shadow-xs flex items-center gap-1">
                <Megaphone className="w-3 h-3" />
                Official Bulletin
              </span>
              <span className="text-xs text-blue-200">
                Uttarakhand Government Institute of Polytechnic
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Institutional News & UBTER Circulars
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Official notifications regarding UBTER Board Examinations, Sessional Dates, Scholarships, Campus Placement, Lab Practicals, and Institutional Holidays.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            {(allowPublish || currentUser.role === 'admin' || currentUser.role === 'faculty') && (
              <button
                id="publish-new-notice-btn"
                onClick={() => setShowPublishModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Publish Notice
              </button>
            )}
            {isModal && onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {urgentCirculars.length > 0 && (
          <div className="mt-5 pt-4 border-t border-white/15 flex items-center gap-3 overflow-hidden text-xs">
            <span className="shrink-0 px-2.5 py-1 rounded-lg bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white inline-block animate-ping" />
              BREAKING
            </span>
            <div className="truncate text-slate-200 font-medium">
              <span className="text-amber-300 font-bold mr-2">[{urgentCirculars[0].category}]:</span>
              {urgentCirculars[0].title} — {urgentCirculars[0].content}
            </div>
          </div>
        )}
      </div>

      {/* Category Tabs & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search circulars by keyword, exam, scholarship, or author..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-700 font-semibold text-xs rounded-xl focus:border-blue-600 placeholder:text-slate-400 shadow-xs"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full">
            <div className="flex items-center gap-1.5 shrink-0 text-xs text-slate-500 dark:text-slate-400 font-semibold">
              <Filter className="w-3.5 h-3.5" />
              <span>Priority:</span>
            </div>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-700 font-bold text-xs rounded-xl focus:border-blue-600 shadow-xs cursor-pointer"
            >
              <option value="All">All Priorities</option>
              <option value="Urgent">Urgent Only</option>
              <option value="High">High Priority</option>
              <option value="Normal">Normal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notices Cards Grid */}
      <div className="space-y-3.5">
        {listError && <p className="text-xs font-bold text-rose-600">{listError}</p>}
        {filteredNotices.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 space-y-3 shadow-xs">
            <div className="w-12 h-12 bg-blue-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
              <Bell className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-base text-slate-800 dark:text-slate-200">No notices found</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No circulars match your current filter criteria.
            </p>
          </div>
        ) : (
          filteredNotices.map((notice) => {
            const isUrgent = notice.priority === 'Urgent';
            const isHigh = notice.priority === 'High';
            return (
              <div
                key={notice.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all hover:shadow-lg p-5 sm:p-6 space-y-3 relative group ${
                  isUrgent
                    ? 'border-rose-300 dark:border-rose-900/60 bg-gradient-to-r from-rose-50/40 via-white to-white dark:from-rose-950/20 dark:to-slate-900'
                    : isHigh
                    ? 'border-amber-300 dark:border-amber-900/60 bg-gradient-to-r from-amber-50/40 via-white to-white dark:from-amber-950/20 dark:to-slate-900'
                    : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isUrgent
                          ? 'bg-rose-600 text-white animate-pulse'
                          : isHigh
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {notice.priority}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {notice.category}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {notice.date}
                    </span>
                    {(notice.targetSemesters?.length || (notice.targetBranch && notice.targetBranch !== 'All')) ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {notice.targetBranch && notice.targetBranch !== 'All' ? notice.targetBranch : 'All branches'}
                        {notice.targetSemesters?.length ? ` · Sem ${notice.targetSemesters.join(', ')}` : ''}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyShareLink(notice)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Share notice"
                    >
                      {copiedId === notice.id ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                    </button>
                    {(currentUser.role === 'admin' || (currentUser.role === 'faculty' && (notice as any).mine)) && (
                      <button
                        onClick={() => handleEdit(notice)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Edit notice" aria-label="Edit notice"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {(currentUser.role === 'admin' || (currentUser.role === 'faculty' && (notice as any).mine)) && (
                      <button
                        onClick={() => handleDelete(notice.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Delete notice"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white leading-snug">
                    {notice.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    Issued by: <span className="text-slate-700 dark:text-slate-300 font-semibold">{notice.publishedBy}</span>
                  </p>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  {notice.content}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  {notice.pdfAttachment ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedNoticeForView(notice)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        View Attached PDF Circular
                      </button>
                      <span className="text-[11px] text-slate-400 hidden sm:inline">
                        ({notice.pdfAttachment})
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">
                      Official Institutional Circular · Ref: UGIP/{notice.date.replace(/-/g, '')}/{notice.id}
                    </span>
                  )}
                  <button
                    onClick={() => setSelectedNoticeForView(notice)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline cursor-pointer ml-auto"
                  >
                    View Official Stamp Circular
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Publish New Notice */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-xl text-blue-700 dark:text-blue-400">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {editingId ? 'Edit Notice / Circular' : 'Publish Official News / Circular'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Uttarakhand Government Institute of Polytechnic
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowPublishModal(false); setEditingId(null); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePublishSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">Notice Headline / Title *</label>
                <input
                  type="text"
                  required
                  value={newNoticeForm.title}
                  onChange={(e) => setNewNoticeForm({ ...newNoticeForm, title: e.target.value })}
                  placeholder="e.g. UBTER Semester Examination Schedule Released 2026"
                  className="w-full p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-700 font-bold text-xs rounded-xl focus:border-blue-600 shadow-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">Notice Category *</label>
                  <select
                    value={newNoticeForm.category}
                    onChange={(e) => setNewNoticeForm({ ...newNoticeForm, category: e.target.value as any })}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-700 font-bold text-xs rounded-xl focus:border-blue-600 shadow-xs cursor-pointer"
                  >
                    <option value="Exam">Exam (UBTER)</option>
                    <option value="Academic">Academic</option>
                    <option value="Scholarship">Scholarship</option>
                    <option value="Placement">Placement</option>
                    <option value="Sports">Sports & Events</option>
                    <option value="Administrative">Administrative</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">Priority Level *</label>
                  <select
                    value={newNoticeForm.priority}
                    onChange={(e) => setNewNoticeForm({ ...newNoticeForm, priority: e.target.value as any })}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-700 font-bold text-xs rounded-xl focus:border-blue-600 shadow-xs cursor-pointer"
                  >
                    <option value="Urgent">Urgent (Flashing Alert)</option>
                    <option value="High">High Priority</option>
                    <option value="Normal">Normal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">Branch</label>
                  <select
                    value={newNoticeForm.targetBranch}
                    onChange={(e) => setNewNoticeForm({ ...newNoticeForm, targetBranch: e.target.value as any })}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-700 font-bold text-xs rounded-xl focus:border-blue-600 shadow-xs cursor-pointer"
                  >
                    <option value="All">All branches</option>
                    <option value="CSE">CSE only</option>
                    <option value="Civil">Civil only</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Semester {newNoticeForm.category === 'Placement' ? '* (required for Placement)' : '(none = all semesters)'}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[1, 2, 3, 4, 5, 6].map((sem) => {
                      const on = newNoticeForm.targetSemesters.includes(sem);
                      return (
                        <button
                          type="button"
                          key={sem}
                          onClick={() => setNewNoticeForm({ ...newNoticeForm, targetSemesters: on ? newNoticeForm.targetSemesters.filter((x) => x !== sem) : [...newNoticeForm.targetSemesters, sem].sort() })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 cursor-pointer ${on ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'}`}
                        >
                          Sem {sem}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">Issuing Authority / Published By *</label>
                <input
                  type="text"
                  required
                  value={currentUser.role === 'admin' ? newNoticeForm.publishedBy : `${currentUser.name} (Faculty)`}
                  readOnly={currentUser.role !== 'admin'}
                  onChange={(e) => setNewNoticeForm({ ...newNoticeForm, publishedBy: e.target.value })}
                  placeholder="e.g. Office of the Principal / Controller of Examination"
                  className="w-full p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-700 font-bold text-xs rounded-xl focus:border-blue-600 shadow-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 dark:text-slate-200 block mb-1">Detailed Notice Content *</label>
                <textarea
                  rows={4}
                  required
                  value={newNoticeForm.content}
                  onChange={(e) => setNewNoticeForm({ ...newNoticeForm, content: e.target.value })}
                  placeholder="Write full circular details, instructions, dates, eligibility criteria, and room numbers..."
                  className="w-full p-2.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-700 font-bold text-xs rounded-xl focus:border-blue-600 shadow-xs"
                />
              </div>

              {currentUser.role === 'faculty' && (
                <p className="text-[11px] text-slate-500">You can publish only to classes you teach (choose a branch and the semesters). A notice for everybody is published by the admin.</p>
              )}
              {publishError && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 font-bold">
                  {publishError}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => { setShowPublishModal(false); setPublishError(''); }}
                  className="px-4 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={publishing || (newNoticeForm.category === 'Placement' && newNoticeForm.targetSemesters.length === 0)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  {publishing ? 'Publishing…' : 'Publish Circular'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Official Circular PDF / Print View */}
      {selectedNoticeForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl p-6 sm:p-8 space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="border-b-2 border-slate-800 dark:border-slate-200 pb-4 text-center space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Government of Uttarakhand · Technical Education Department
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white uppercase tracking-tight">
                Uttarakhand Government Institute of Polytechnic
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                AICTE & UBTER Approved Institution (Uttarakhand)
              </p>
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800 mt-2">
                <span>Ref: UGIP/ACAD/2026/{selectedNoticeForView.id.toUpperCase()}</span>
                <span>Date: {selectedNoticeForView.date}</span>
              </div>
            </div>

            <div className="text-center py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-800 dark:text-blue-300 block">
                OFFICIAL NOTIFICATION
              </span>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white mt-0.5 px-4">
                {selectedNoticeForView.title}
              </h3>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed px-2">
              <p>{selectedNoticeForView.content}</p>
            </div>

            <div className="flex items-end justify-between pt-6 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div className="p-2 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center inline-block">
                <div className="w-16 h-16 rounded-full border-2 border-blue-600/60 text-[9px] font-black text-blue-700 dark:text-blue-400 flex items-center justify-center text-center p-1 uppercase leading-tight rotate-[-12deg]">
                  UGIP Seal
                </div>
              </div>
              <div className="text-right space-y-1">
                <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  {selectedNoticeForView.publishedBy}
                </div>
                <div className="text-[10px] text-slate-500">Uttarakhand Government Institute of Polytechnic</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print Circular
              </button>
              <button
                onClick={() => setSelectedNoticeForView(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
