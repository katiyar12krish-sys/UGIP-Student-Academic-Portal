// ===================================================================================================
// Doubt Q&A: students ask the teachers of a subject, teachers reply / resolve; Step 18 delete.
// ===================================================================================================
import React, { useState } from 'react';
import { useCollege } from '../../context/CollegeContext';
import { StudentDoubtTicket, BranchCode } from '../../types';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  User,
  Plus,
  HelpCircle,
  Sparkles,
  BookOpen,
  Filter,
  GraduationCap,
  MessageCircle,
} from 'lucide-react';
import { Trash2 as Trash2Icon } from 'lucide-react';              // Step 18
import { editsApi } from '../../services/step18Api';              // Step 18: delete doubts
import { notify, confirmDialog } from './ui/feedback';              // Step 18: styled messages
import { doubtsApi } from '../../services/commsApi';               // self-service: edit own doubt, delete own reply
import { ClassQuestionBoard } from './ClassQuestionBoard';          // questions + PDFs posted by admin / teachers for a class

// Data shape: realtime doubt resolution hub props.
interface RealtimeDoubtResolutionHubProps {
  mode?: 'student' | 'faculty' | 'admin';
  forceMobileView?: boolean;
}

// Screen part: realtime doubt resolution hub.
export const RealtimeDoubtResolutionHub: React.FC<RealtimeDoubtResolutionHubProps> = ({ mode = 'student', forceMobileView = false }) => {
  const {
    currentUser,
    subjects,
    studentDoubtTickets,
    askStudentDoubt,
    replyToDoubt,
    resolveDoubt,
    reloadDirectAndDoubts,   // Step 18
    authUser,
  } = useCollege();
  // Editing my own question (student, while no teacher has answered)
  const [editing, setEditing] = useState<{ title: string; details: string } | null>(null);

  // Which ticket id is open right now
  const [activeTicketId, setActiveTicketId] = useState<string>(
    studentDoubtTickets[0]?.id || ''
  );
  const chatThreadRef = React.useRef<HTMLDivElement>(null);

  const handleSelectTicket = (id: string) => {
    setActiveTicketId(id);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setTimeout(() => {
        chatThreadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  };
  // Reply input (kept in screen state)
  const [replyInput, setReplyInput] = useState('');
  // Is the 'ask pop-up' shown on screen? (true / false)
  const [showAskModal, setShowAskModal] = useState(false);
  // Filter subject id (kept in screen state)
  const [filterSubjectId, setFilterSubjectId] = useState<string>('all');
  // List of filter status shown on this screen
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // A student can ask only about the subjects of their own class (the server checks this too).
  const askSubjects = subjects.filter((s) => s.branch === currentUser.branch && s.semester === currentUser.semester);
  const isStudent = mode === 'student';

  // Subjects offered in the filter: student = own class, faculty = own subjects, admin = subjects that have doubts
  const filterSubjects = isStudent
    ? askSubjects
    : mode === 'faculty'
      ? subjects.filter((s) => (currentUser.assignedSubjectIds || []).includes(s.id) || studentDoubtTickets.some((t) => t.subjectId === s.id))
      : subjects.filter((s) => studentDoubtTickets.some((t) => t.subjectId === s.id));

  // title of the doubt just asked: select it as soon as it is in the list
  const [openTitle, setOpenTitle] = useState('');
  React.useEffect(() => {
    if (!openTitle) return;
    const mine = studentDoubtTickets.find((t) => t.questionTitle === openTitle);
    if (mine) { setActiveTicketId(mine.id); setOpenTitle(''); }
  }, [openTitle, studentDoubtTickets]);

  // "Real-time": fetch new doubts and replies every 20 seconds while this screen is open
  React.useEffect(() => {
    const iv = setInterval(() => { try { reloadDirectAndDoubts(); } catch { /* next try in 20 s */ } }, 20000);
    return () => clearInterval(iv);
  }, [reloadDirectAndDoubts]);

  // New Doubt Form State
  const [askForm, setAskForm] = useState({ subjectId: '', questionTitle: '', questionDetails: '' });
  // Error message to show (ask error); empty = no error
  const [askError, setAskError] = useState('');
  // Error message to show (reply error); empty = no error
  const [replyError, setReplyError] = useState('');
  // true while waiting for the server (buttons are disabled meanwhile)
  const [busy, setBusy] = useState(false);
  const chosenSubjectId = askForm.subjectId || askSubjects[0]?.id || '';

  // Filtered tickets (the server already sends only the doubts this person may see)
  const filteredTickets = studentDoubtTickets.filter((t) => {
    const matchSubject = filterSubjectId === 'all' || t.subjectId === filterSubjectId;
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchSubject && matchStatus;
  });

  const activeTicket = studentDoubtTickets.find((t) => t.id === activeTicketId) || filteredTickets[0];
  const countOf = (st: string) => studentDoubtTickets.filter((t) => (filterSubjectId === 'all' || t.subjectId === filterSubjectId) && (st === 'all' || t.status === st)).length;
  // plain words for the three states
  const STATUS_LABEL: Record<string, string> = {
    Pending: isStudent ? 'Waiting for teacher' : 'New - not answered',
    'In Discussion': 'Answered',
    Resolved: 'Solved',
  };
  const teacherAnswers = activeTicket ? activeTicket.replies.filter((r) => r.senderRole === 'faculty' || r.senderRole === 'admin') : [];

  // Runs when the user does this on screen: send reply.
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput.trim() || !activeTicket || busy) return;
    setBusy(true); setReplyError('');
    const r = await replyToDoubt(activeTicket.id, replyInput.trim());   // sender name and role come from the login, on the server
    setBusy(false);
    if (!r.ok) { setReplyError(r.error); return; }
    setReplyInput('');
  };

  // Step 18: delete a doubt (student: only while still pending; teacher of the subject / admin: any time)
  const handleDeleteDoubt = async () => {
    if (!activeTicket) return;
    if (!(await confirmDialog({ title: 'Delete this doubt?', message: `"${activeTicket.questionTitle}" and all replies under it will be removed.`, danger: true }))) return;
    const r = await editsApi.deleteDoubt(activeTicket.id);
    if (!r.ok) return notify.error('Could not delete', r.error);
    notify.success('Doubt deleted'); reloadDirectAndDoubts();
  };

  // Self-service: correct my own question (the server allows it only until a teacher answers).
  const handleSaveEdit = async () => {
    if (!activeTicket || !editing) return;
    const r = await doubtsApi.editMine(activeTicket.id, { questionTitle: editing.title.trim(), questionDetails: editing.details.trim() });
    if (!r.ok) return notify.error('Could not save', r.error);
    setEditing(null); notify.success('Doubt updated'); reloadDirectAndDoubts();
  };
  // Self-service: delete my own reply (admin: any reply).
  const handleDeleteReply = async (replyId: string) => {
    if (!activeTicket) return;
    if (!(await confirmDialog({ title: 'Delete this reply?', message: 'The reply will be removed for everybody.', danger: true }))) return;
    const r = await doubtsApi.removeReply(activeTicket.id, replyId);
    if (!r.ok) return notify.error('Could not delete', r.error);
    reloadDirectAndDoubts();
  };
  const canEditQuestion = !!activeTicket && isStudent && activeTicket.status !== 'Resolved' && !activeTicket.replies.some((r) => r.senderRole !== 'student');

  // Runs when the user does this on screen: resolve.
  const handleResolve = async () => {
    if (!activeTicket) return;
    const r = await resolveDoubt(activeTicket.id);
    if (!r.ok) setReplyError(r.error);
  };

  // Runs when the user does this on screen: create doubt.
  const handleCreateDoubt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !askForm.questionTitle.trim() || !askForm.questionDetails.trim()) return;
    if (!chosenSubjectId) { setAskError('No subject found for your class.'); return; }
    setBusy(true); setAskError('');
    const r = await askStudentDoubt({ subjectId: chosenSubjectId, questionTitle: askForm.questionTitle.trim(), questionDetails: askForm.questionDetails.trim() });
    setBusy(false);
    if (!r.ok) { setAskError(r.error); return; }
    const title = askForm.questionTitle.trim();
    setShowAskModal(false);
    setAskForm({ subjectId: '', questionTitle: '', questionDetails: '' });
    setFilterSubjectId('all'); setFilterStatus('all');
    notify.success('Doubt sent to your teacher', 'You will see the answer here (and get a notification) as soon as the teacher replies.');
    setOpenTitle(title);   // open the doubt just asked once the reloaded list has it
  };

  return (
    <div className="space-y-6">
      <ClassQuestionBoard mode={mode} />
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
              Real-Time Academic Q&A
            </span>
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300">
              Direct Expert Connectivity
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Real-Time Doubt Resolution & Faculty Q&A
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            {isStudent
              ? 'Ask your subject teacher a question. The teacher answers here, and the answer stays saved for you.'
              : 'Students of your subjects ask questions here. Open a doubt on the left, type your answer and press Send.'}
          </p>
        </div>

        {isStudent && <button
          onClick={() => setShowAskModal(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Ask New Academic Doubt</span>
        </button>}
      </div>

      {/* HOW IT WORKS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {(isStudent
          ? [['1. Ask', 'Press "Ask New Academic Doubt", choose the subject, write your question.'],
             ['2. Teacher answers', 'Your subject teacher gets it and replies. Status changes to "Answered".'],
             ['3. Read & reply', 'Open your doubt to read the answer. Ask a follow-up or mark it "Solved".']]
          : [['1. New doubts', 'Doubts from students of your subjects appear on the left as "New - not answered".'],
             ['2. Answer', 'Open a doubt, type the solution or explanation below and press Send.'],
             ['3. Solved', 'When the student is satisfied, press "Mark Solved". It stays saved for later.']]
        ).map(([h, d]) => (
          <div key={h} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
            <div className="font-bold text-slate-900 dark:text-white">{h}</div>
            <div className="text-slate-600 dark:text-slate-300 mt-0.5">{d}</div>
          </div>
        ))}
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Filters:
        </span>

        <select
          value={filterSubjectId}
          onChange={(e) => setFilterSubjectId(e.target.value)}
          className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer"
        >
          <option value="all">All my subjects</option>
          {filterSubjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code}: {s.name}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer"
        >
          <option value="all">All ({countOf('all')})</option>
          <option value="Pending">{STATUS_LABEL.Pending} ({countOf('Pending')})</option>
          <option value="In Discussion">{STATUS_LABEL['In Discussion']} ({countOf('In Discussion')})</option>
          <option value="Resolved">{STATUS_LABEL.Resolved} ({countOf('Resolved')})</option>
        </select>
      </div>

      {/* SPLIT VIEW: THREAD LIST (LEFT) + ACTIVE DISCUSSION (RIGHT) */}
      <div className={`grid ${forceMobileView ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'} gap-6`}>
        {/* LEFT COLUMN: LIST OF DOUBTS */}
        <div className={`${forceMobileView ? 'w-full' : 'lg:col-span-5'} space-y-3`}>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Doubt Threads ({filteredTickets.length})
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredTickets.length === 0 ? (
              <div className="p-8 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500">
                {studentDoubtTickets.length === 0
                  ? (isStudent ? 'You have not asked any doubt yet. Press "Ask New Academic Doubt" above to ask your teacher.' : 'No student has asked a doubt in your subjects yet. New doubts will appear here automatically.')
                  : `No doubts with status "${filterStatus === 'all' ? 'All' : STATUS_LABEL[filterStatus]}"${filterSubjectId !== 'all' ? ' in this subject' : ''}. Choose "All" in the filters to see the others.`}
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const isSelected = activeTicket?.id === ticket.id;
                return (
                  <button
                    key={ticket.id}
                    onClick={() => handleSelectTicket(ticket.id)}
                    className={`w-full p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-500 shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {ticket.subjectName}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          ticket.status === 'Resolved'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : ticket.status === 'In Discussion'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {STATUS_LABEL[ticket.status] || ticket.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                      {ticket.questionTitle}
                    </h4>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {ticket.questionDetails}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span>By: {ticket.studentName} ({ticket.branch})</span>
                      <span>{ticket.replies.length} replies</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE THREAD & CHAT */}
        <div ref={chatThreadRef} className={`${forceMobileView ? 'w-full' : 'lg:col-span-7'}`}>
          {activeTicket ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-[650px]">
              {/* TICKET HEADER */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 uppercase">
                      {activeTicket.branch} · Year {activeTicket.year}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {activeTicket.subjectName}
                    </span>
                  </div>

                  {/* Step 18: delete */}
                  {(currentUser.role !== 'student' || activeTicket.status === 'Pending') && (
                    <button onClick={handleDeleteDoubt} aria-label="Delete doubt" title="Delete" className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 cursor-pointer"><Trash2Icon className="w-4 h-4" /></button>
                  )}
                  {/* Faculty Resolution Action */}
                  {activeTicket.status !== 'Resolved' && (
                    <button
                      onClick={handleResolve}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Solved</span>
                    </button>
                  )}
                </div>

                {editing ? (
                  <div className="space-y-2">
                    <input value={editing.title} maxLength={200} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" />
                    <textarea value={editing.details} maxLength={2000} rows={3} onChange={(e) => setEditing({ ...editing, details: e.target.value })} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100" />
                    <div className="flex gap-2">
                      <button onClick={handleSaveEdit} className="px-3 py-1.5 bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer">Save</button>
                      <button onClick={() => setEditing(null)} className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold cursor-pointer">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-start gap-2">
                      <span className="flex-1">{activeTicket.questionTitle}</span>
                      {canEditQuestion && <button onClick={() => setEditing({ title: activeTicket.questionTitle, details: activeTicket.questionDetails })} className="text-[11px] font-bold text-blue-700 dark:text-blue-300 underline cursor-pointer shrink-0">Edit / सुधारें</button>}
                    </h3>

                    <p className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 leading-relaxed font-sans">
                      {activeTicket.questionDetails}
                    </p>
                  </>
                )}

                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Student: <strong className="text-slate-800 dark:text-slate-200">{activeTicket.studentName}</strong> (Roll: {activeTicket.studentRoll})</span>
                  <span>Assigned Expert: <strong className="text-blue-600">{activeTicket.expertFacultyName || 'Subject teacher'}</strong></span>
                </div>
              </div>

              {/* TEACHER'S ANSWER (latest), shown clearly on top for the student */}
              {isStudent && (
                <div className={`px-5 py-3 border-b text-xs ${teacherAnswers.length ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900' : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'}`}>
                  {teacherAnswers.length ? (
                    <>
                      <div className="font-bold text-emerald-800 dark:text-emerald-300">Teacher's answer ({teacherAnswers[teacherAnswers.length - 1].senderName})</div>
                      <p className="mt-1 text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{teacherAnswers[teacherAnswers.length - 1].text}</p>
                    </>
                  ) : (
                    <div className="font-semibold text-amber-800 dark:text-amber-300">Waiting for your teacher's answer. It will appear here automatically.</div>
                  )}
                </div>
              )}

              {/* REPLIES STREAM */}
              <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-slate-50/50 dark:bg-slate-850">
                {activeTicket.replies.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    No replies yet. Type an answer below to start the discussion!
                  </div>
                ) : (
                  activeTicket.replies.map((reply) => {
                    const isFaculty = reply.senderRole === 'faculty' || reply.senderRole === 'admin';
                    return (
                      <div
                        key={reply.id}
                        className={`flex flex-col ${isFaculty ? 'items-start' : 'items-end'}`}
                      >
                        <div
                          className={`max-w-[85%] p-3.5 rounded-2xl text-xs space-y-1 shadow-xs ${
                            isFaculty
                              ? 'bg-blue-600 text-white rounded-tl-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-tr-xs'
                          }`}
                        >
                          <div className={`text-[10px] font-bold ${isFaculty ? 'text-blue-200' : 'text-blue-600'}`}>
                            {reply.senderName} {isFaculty ? '(Faculty Expert)' : '(Student)'}
                          </div>
                          <p className="leading-relaxed font-sans whitespace-pre-wrap">{reply.text}</p>
                          <div className={`text-[9px] flex items-center justify-end gap-2 ${isFaculty ? 'text-blue-200' : 'text-slate-400'}`}>
                            {(reply.senderId === authUser?.id || authUser?.role === 'admin') && (
                              <button onClick={() => handleDeleteReply(reply.id)} aria-label="Delete reply" title="Delete reply" className="hover:text-rose-500 cursor-pointer"><Trash2Icon className="w-3 h-3" /></button>
                            )}
                            <span>{reply.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* CHAT INPUT FORM */}
              {replyError && <p className="px-3 pt-2 text-xs font-bold text-rose-600">{replyError}</p>}
              <form onSubmit={handleSendReply} className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
                <input
                  type="text"
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  placeholder={
                    mode === 'faculty' || mode === 'admin'
                      ? 'Type expert solution, formulas, or explanation...'
                      : 'Ask a follow-up doubt or question...'
                  }
                  className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="p-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center text-slate-500 text-sm">
              Select a doubt from the left to view the interactive resolution thread.
            </div>
          )}
        </div>
      </div>

      {/* ASK DOUBT MODAL */}
      {showAskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Ask Academic Doubt to Faculty Expert
                </h3>
                <p className="text-xs text-slate-500">
                  Select course subject and faculty member for real-time resolution
                </p>
              </div>
              <button
                onClick={() => setShowAskModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDoubt} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subject *
                </label>
                <select
                  value={chosenSubjectId}
                  onChange={(e) => setAskForm({ ...askForm, subjectId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                >
                  {askSubjects.length === 0 && <option value="">No subjects found for your class</option>}
                  {askSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.code}: {sub.name} (Sem {sub.semester})
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[11px] text-slate-500">
                Your question goes to the teacher(s) assigned to this subject. Only you and they can read it.
              </p>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Doubt Headline / Question Title *
                </label>
                <input
                  type="text"
                  required
                  value={askForm.questionTitle}
                  onChange={(e) => setAskForm({ ...askForm, questionTitle: e.target.value })}
                  placeholder="e.g. How to balance red-black tree when double-black occurs in deletion?"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Specific Details & Problem Context *
                </label>
                <textarea
                  rows={4}
                  required
                  value={askForm.questionDetails}
                  onChange={(e) => setAskForm({ ...askForm, questionDetails: e.target.value })}
                  placeholder="Describe your doubt, what step you tried, or paste code snippet / formula..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              {askError && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 font-bold">
                  {askError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAskModal(false); setAskError(''); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl font-bold shadow-md cursor-pointer"
                >
                  {busy ? 'Sending…' : 'Submit Academic Doubt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
