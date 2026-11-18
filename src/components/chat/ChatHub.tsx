// ===================================================================================================
// WhatsApp-style chat window: contact list, messages, voice notes, photos and files.
// ===================================================================================================
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Check, CheckCheck, FileText, Languages, Loader2, Mic, MessageCircle, Paperclip, Pause, Play, Plus, Search, Send, Trash2, X, Download,
  Users, Settings2, UserPlus,
} from 'lucide-react';
import { chatApi, type ChatContact, type ChatMessage, type ChatThread, type GroupMember } from '../../services/chatApi';
import { UserAvatar } from '../common/UserAvatar';
import { useCollege } from '../../context/CollegeContext';

// WhatsApp-style chat for everybody: one-to-one chats and group chats (All faculty, CSE / Civil students, class groups,
// custom groups made by the admin). Text, voice messages, photos and files.
// All permissions are decided by the server (server/chat/service.ts, server/chat/groups.ts); this screen only shows what the server returns.

const MAX_REC_MS = 5 * 60_000;
const IST = 'Asia/Kolkata';

// ---------- small helpers ----------
const timeOf = (ms: number) => new Date(ms).toLocaleTimeString('en-IN', { timeZone: IST, hour: '2-digit', minute: '2-digit', hour12: true });
// Day key.
const dayKey = (ms: number) => new Date(ms).toLocaleDateString('en-CA', { timeZone: IST });
// Day label.
function dayLabel(ms: number): string {
  const k = dayKey(ms);
  if (k === dayKey(Date.now())) return 'आज / Today';
  if (k === dayKey(Date.now() - 86400_000)) return 'कल / Yesterday';
  return new Date(ms).toLocaleDateString('en-IN', { timeZone: IST, day: 'numeric', month: 'short', year: 'numeric' });
}
// List time.
function listTime(ms: number): string {
  const k = dayKey(ms);
  if (k === dayKey(Date.now())) return timeOf(ms);
  if (k === dayKey(Date.now() - 86400_000)) return 'कल';
  return new Date(ms).toLocaleDateString('en-IN', { timeZone: IST, day: 'numeric', month: 'short' });
}
// Mmss.
const mmss = (ms: number) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
// Size label.
const sizeLabel = (b?: number) => (!b ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

const QUICK_FAMILY = ['अटेंडेंस के बारे में बात करनी है', 'रिज़ल्ट / मार्क्स की जानकारी चाहिए', 'आपसे मिलना चाहता/चाहती हूँ, कब आऊँ?', 'छुट्टी (leave) की सूचना देनी है'];
const QUICK_STAFF = ['कृपया कॉलेज आकर मिलें', 'अटेंडेंस कम है, कृपया ध्यान दें', 'आपका संदेश मिला, धन्यवाद'];

// only one voice message plays at a time
let playing: HTMLAudioElement | null = null;

// ---------- voice message bubble ----------
const VoicePlayer: React.FC<{ url: string; durationMs: number; mine: boolean }> = ({ url, durationMs, mine }) => {
  const ref = useRef<HTMLAudioElement>(null);
  // On (kept in screen state)
  const [on, setOn] = useState(false);
  // List of pos shown on this screen
  const [pos, setPos] = useState(0);
  // Rate (kept in screen state)
  const [rate, setRate] = useState(1);
  // Err (kept in screen state)
  const [err, setErr] = useState(false);

  // Toggle.
  const toggle = () => {
    const a = ref.current; if (!a) return;
    if (on) { a.pause(); return; }
    if (playing && playing !== a) playing.pause();
    playing = a;
    a.playbackRate = rate;
    a.play().catch(() => setErr(true));
  };
  // Seek.
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = ref.current; if (!a || !durationMs) return;
    const r = e.currentTarget.getBoundingClientRect();
    a.currentTime = (Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * durationMs) / 1000;
  };
  // Cycle.
  const cycle = () => { const n = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1; setRate(n); if (ref.current) ref.current.playbackRate = n; };
  const pct = durationMs ? Math.min(100, (pos / durationMs) * 100) : 0;

  return (
    <div className="flex items-center gap-2 min-w-[210px] sm:min-w-[250px]">
      <audio ref={ref} src={url} preload="none"
        onPlay={() => setOn(true)} onPause={() => setOn(false)} onEnded={() => { setOn(false); setPos(0); }}
        onTimeUpdate={(e) => setPos(e.currentTarget.currentTime * 1000)} onError={() => setErr(true)} />
      <button onClick={toggle} aria-label={on ? 'Pause' : 'Play'} className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer ${mine ? 'bg-emerald-600 text-white' : 'bg-slate-600 text-white'}`}>
        {on ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div onClick={seek} className="h-6 flex items-center cursor-pointer">
          <div className="relative w-full h-1.5 rounded-full bg-black/15 dark:bg-white/20">
            <div className="absolute inset-y-0 left-0 rounded-full bg-emerald-600 dark:bg-emerald-400" style={{ width: `${pct}%` }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-600 dark:bg-emerald-400 shadow" style={{ left: `calc(${pct}% - 6px)` }} />
          </div>
        </div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex justify-between">
          <span>{err ? 'चल नहीं पाया / Cannot play' : on || pos ? mmss(pos) : mmss(durationMs)}</span>
          <span>{mmss(durationMs)}</span>
        </div>
      </div>
      <button onClick={cycle} className="text-[10px] font-bold px-1.5 py-1 rounded-md bg-black/10 dark:bg-white/10 text-slate-700 dark:text-slate-200 cursor-pointer" aria-label="Speed">{rate}x</button>
    </div>
  );
};

// ---------- picture of a chat: a person's photo / initials, or a group icon ----------
const ChatAvatar: React.FC<{ t: { other: ChatThread['other'] } }> = ({ t }) =>
  t.other.role === 'group'
    ? <span className="w-10 h-10 rounded-full bg-blue-700 text-white flex items-center justify-center shrink-0"><Users className="w-5 h-5" /></span>
    : <UserAvatar name={t.other.name} avatar={t.other.photoUrl || undefined} role={t.other.role} size="md" />;

// ---------- one message bubble ----------
const Bubble: React.FC<{ m: ChatMessage; group: boolean; selected: boolean; onSelect: () => void; onDelete: () => void; onZoom: (url: string) => void }> = ({ m, group, selected, onSelect, onDelete, onZoom }) => {
  const own = m.mine;
  const deletable = !m.deleted && (m.canDelete ?? own);   // own message, or (groups) the admin
  return (
    <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[85%] sm:max-w-[70%]">
        <div onClick={deletable ? onSelect : undefined}
          className={`rounded-2xl px-3 py-2 shadow-sm text-sm ${own ? 'bg-emerald-100 dark:bg-emerald-900/70 rounded-tr-sm' : 'bg-white dark:bg-slate-800 rounded-tl-sm'} text-slate-800 dark:text-slate-100 ${deletable ? 'cursor-pointer' : ''}`}>
          {group && !own && m.senderName && <p className="text-[11px] font-bold text-blue-700 dark:text-blue-300 mb-0.5">{m.senderName}{m.senderRole && m.senderRole !== 'student' ? ` · ${m.senderRole === 'admin' ? 'Admin' : m.senderRole === 'faculty' ? 'Teacher' : 'Parent'}` : ''}</p>}
          {m.deleted ? (
            <p className="italic text-slate-500 dark:text-slate-400 text-xs">{m.deletedByAdmin ? 'एडमिन ने यह संदेश हटाया / Removed by the admin' : 'यह संदेश हटा दिया गया / This message was deleted'}</p>
          ) : (
            <>
              {m.kind === 'voice' && m.fileUrl && <VoicePlayer url={m.fileUrl} durationMs={m.durationMs || 0} mine={own} />}
              {m.kind === 'image' && m.fileUrl && (
                <img src={m.fileUrl} alt={m.fileName || 'Photo'} loading="lazy" onClick={(e) => { e.stopPropagation(); onZoom(m.fileUrl!); }}
                  className="rounded-xl max-h-64 w-auto max-w-full object-cover cursor-zoom-in mb-1" />
              )}
              {m.kind === 'file' && m.fileUrl && (
                <a href={m.fileUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 p-2 rounded-xl bg-black/5 dark:bg-white/10 min-w-[200px]">
                  <FileText className="w-8 h-8 text-slate-500 shrink-0" />
                  <span className="min-w-0 flex-1"><span className="block text-xs font-bold truncate">{m.fileName}</span><span className="block text-[10px] text-slate-500">{sizeLabel(m.size)}</span></span>
                  <Download className="w-4 h-4 text-slate-500 shrink-0" />
                </a>
              )}
              {m.text && <p className="whitespace-pre-wrap break-words leading-relaxed">{m.text}</p>}
            </>
          )}
          <div className="flex items-center justify-end gap-1 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
            <span>{timeOf(m.at)}</span>
            {own && !m.deleted && (m.status === 'seen' ? <CheckCheck className="w-3.5 h-3.5 text-sky-500" aria-label="Seen" /> : <Check className="w-3.5 h-3.5" aria-label="Sent" />)}
          </div>
        </div>
        {selected && deletable && (
          <button onClick={onDelete} className={`mt-1 ${own ? 'ml-auto' : ''} flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900 rounded-lg px-2 py-1 cursor-pointer`}>
            <Trash2 className="w-3 h-3" /> {own ? 'सबके लिए हटाएँ / Delete for everyone' : 'हटाएँ (एडमिन) / Remove (admin)'}
          </button>
        )}
      </div>
    </div>
  );
};

// ---------- the open conversation ----------
const Conversation: React.FC<{ thread: ChatThread; onBack: () => void; onChanged: () => void; onManage: () => void }> = ({ thread, onBack, onChanged, onManage }) => {
  const isGroup = !!thread.isGroup;
  // Member list of a group (shown on request)
  const [members, setMembers] = useState<GroupMember[] | null>(null);
  // Show members.
  const showMembers = async () => {
    if (members) { setMembers(null); return; }
    const r = await chatApi.members(thread.id);
    if (r.ok) setMembers(r.data); else setError(r.error);
  };
  // List of msgs shown on this screen
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  // Does it have more? (true / false)
  const [hasMore, setHasMore] = useState(false);
  // true while waiting for the server (buttons are disabled meanwhile)
  const [loading, setLoading] = useState(true);
  // Text (kept in screen state)
  const [text, setText] = useState('');
  // Can send (kept in screen state)
  const [canSend, setCanSend] = useState(thread.canSend);
  // Error message to show (error); empty = no error
  const [error, setError] = useState('');
  // true while waiting for the server (buttons are disabled meanwhile)
  const [busy, setBusy] = useState(false);
  // Sel (kept in screen state)
  const [sel, setSel] = useState<number | null>(null);
  // Zoom (kept in screen state)
  const [zoom, setZoom] = useState<string | null>(null);
  // New below (kept in screen state)
  const [newBelow, setNewBelow] = useState(false);
  // voice recording
  const [rec, setRec] = useState<{ ms: number } | null>(null);
  const recorder = useRef<{ mr: MediaRecorder; chunks: Blob[]; start: number; stream: MediaStream; cancel: boolean; timer: number } | null>(null);
  // dictation (speak -> text)
  const [dictating, setDictating] = useState(false);
  const speech = useRef<any>(null);

  const box = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const lastId = useRef(0);
  const since = useRef(0);
  const fileIn = useRef<HTMLInputElement>(null);
  const family = !isGroup && (thread.other.role === 'admin' || thread.other.role === 'faculty');   // quick replies for writing to staff
  const SpeechRec = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : undefined;

  // Converts to bottom.
  const toBottom = (smooth = false) => { const el = box.current; if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }); };

  // Merge.
  const merge = useCallback((incoming: ChatMessage[], deletedIds: number[], otherLastRead: number | null) => {
    setMsgs((old) => {
      const byId = new Map(old.map((m) => [m.id, m] as const));
      for (const m of incoming) byId.set(m.id, m);
      return [...byId.values()].sort((a, b) => a.id - b.id).map((m) => ({
        ...m,
        deleted: m.deleted || deletedIds.includes(m.id),
        status: m.mine ? (otherLastRead === null ? m.status : otherLastRead >= m.id ? 'seen' : 'sent') : undefined,
        ...(deletedIds.includes(m.id) ? { text: '', fileUrl: undefined } : {}),
      }));
    });
  }, []);

  // Mark read if visible.
  const markReadIfVisible = useCallback(() => { if (document.visibilityState === 'visible') chatApi.read(thread.id).then(() => onChanged()); }, [thread.id, onChanged]);

  // first load
  useEffect(() => {
    let alive = true;
    setLoading(true); setMsgs([]); lastId.current = 0; stick.current = true;
    chatApi.messages(thread.id).then((r) => {
      if (!alive) return;
      setLoading(false);
      if (!r.ok) { setError(r.error); return; }
      since.current = r.data.now; setHasMore(r.data.hasMore); setCanSend(r.data.thread.canSend);
      merge(r.data.messages, r.data.deletedIds, r.data.otherLastRead);
      lastId.current = r.data.messages.length ? r.data.messages[r.data.messages.length - 1].id : 0;
      setTimeout(() => toBottom(), 0);
      if (r.data.thread.unread) markReadIfVisible();
    });
    return () => { alive = false; };
  }, [thread.id, merge, markReadIfVisible]);

  // refresh every 3 seconds while the tab is visible
  useEffect(() => {
    const t = window.setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      const r = await chatApi.messages(thread.id, { after: lastId.current, since: since.current });
      if (!r.ok) return;
      since.current = r.data.now; setCanSend(r.data.thread.canSend);
      merge(r.data.messages, r.data.deletedIds, r.data.otherLastRead);
      if (r.data.messages.length) {
        lastId.current = r.data.messages[r.data.messages.length - 1].id;
        if (stick.current) setTimeout(() => toBottom(true), 0); else setNewBelow(true);
        if (r.data.messages.some((m) => !m.mine)) markReadIfVisible();
      }
    }, 3000);
    return () => window.clearInterval(t);
  }, [thread.id, merge, markReadIfVisible]);

  // stop the microphone if the screen closes
  useEffect(() => () => { const r = recorder.current; if (r) { r.cancel = true; window.clearInterval(r.timer); try { r.mr.stop(); } catch { /* already stopped */ } r.stream.getTracks().forEach((t) => t.stop()); } speech.current?.abort?.(); }, []);

  // Called when: scroll.
  const onScroll = () => {
    const el = box.current; if (!el) return;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (stick.current) setNewBelow(false);
  };

  // Loads older from the server.
  const loadOlder = async () => {
    if (!msgs.length) return;
    const el = box.current, prevH = el?.scrollHeight || 0;
    const r = await chatApi.messages(thread.id, { before: msgs[0].id });
    if (!r.ok) return;
    setHasMore(r.data.hasMore);
    merge(r.data.messages, [], r.data.otherLastRead);
    setTimeout(() => { if (el) el.scrollTop = el.scrollHeight - prevH; }, 0);
  };

  // After send.
  const afterSend = () => { stick.current = true; setTimeout(() => toBottom(true), 50); onChanged(); };

  // Send.
  const send = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true); setError('');
    const r = await chatApi.sendText(thread.id, body);
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    setText('');
    const p = await chatApi.messages(thread.id, { after: lastId.current, since: since.current });
    if (p.ok) { since.current = p.data.now; merge(p.data.messages, p.data.deletedIds, p.data.otherLastRead); if (p.data.messages.length) lastId.current = p.data.messages[p.data.messages.length - 1].id; }
    afterSend();
  };

  // Upload blob.
  const uploadBlob = async (blob: Blob, name: string, extra: { durationMs?: number; caption?: string }) => {
    setBusy(true); setError('');
    const r = await chatApi.upload(thread.id, blob, name, extra);
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    const p = await chatApi.messages(thread.id, { after: lastId.current, since: since.current });
    if (p.ok) { since.current = p.data.now; merge(p.data.messages, p.data.deletedIds, p.data.otherLastRead); if (p.data.messages.length) lastId.current = p.data.messages[p.data.messages.length - 1].id; }
    afterSend();
  };

  // Pick file.
  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { setError('फ़ाइल 10 MB से बड़ी है / The file is larger than 10 MB'); return; }
    uploadBlob(f, f.name, { caption: text.trim() || undefined }).then(() => setText(''));
  };

  // ----- voice recording -----
  const startRec = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setError('इस फ़ोन/ब्राउज़र में वॉइस रिकॉर्डिंग नहीं चलती / Voice recording is not supported here'); return; }
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { setError('माइक्रोफ़ोन की अनुमति दें (ब्राउज़र की सेटिंग में) / Please allow the microphone'); return; }
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((t) => (MediaRecorder as any).isTypeSupported?.(t)) || '';
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const state = { mr, chunks: [] as Blob[], start: Date.now(), stream, cancel: false, timer: 0 };
    mr.ondataavailable = (e) => { if (e.data.size) state.chunks.push(e.data); };
    mr.onstop = () => {
      window.clearInterval(state.timer);
      stream.getTracks().forEach((t) => t.stop());
      const ms = Math.min(MAX_REC_MS, Date.now() - state.start);
      recorder.current = null; setRec(null);
      if (state.cancel || ms < 600 || !state.chunks.length) { if (!state.cancel && ms < 600) setError('बहुत छोटा संदेश — माइक दबाकर बोलें / Too short'); return; }
      const type = mr.mimeType || mime || 'audio/webm';
      const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
      uploadBlob(new Blob(state.chunks, { type }), `voice.${ext}`, { durationMs: ms });
    };
    state.timer = window.setInterval(() => {
      const ms = Date.now() - state.start;
      setRec({ ms });
      if (ms >= MAX_REC_MS) mr.stop();
    }, 200);
    recorder.current = state; setRec({ ms: 0 });
    mr.start(250);
  };
  // Stop rec.
  const stopRec = (cancel: boolean) => { const r = recorder.current; if (!r) return; r.cancel = cancel; try { r.mr.stop(); } catch { /* ignore */ } };

  // ----- speak to type -----
  const dictate = () => {
    if (dictating) { speech.current?.stop?.(); return; }
    const r = new SpeechRec();
    r.lang = 'hi-IN'; r.interimResults = false; r.continuous = false;
    r.onresult = (e: any) => { const t = Array.from(e.results).map((x: any) => x[0].transcript).join(' ').trim(); if (t) setText((old) => (old ? `${old} ${t}` : t)); };
    r.onend = () => setDictating(false);
    r.onerror = () => { setDictating(false); setError('आवाज़ पहचान नहीं हो पाई / Could not hear you'); };
    speech.current = r; setDictating(true);
    try { r.start(); } catch { setDictating(false); }
  };

  // Remove.
  const remove = async (id: number) => {
    setSel(null);
    const r = await chatApi.remove(thread.id, id);
    if (!r.ok) { setError(r.error); return; }
    merge([], [id], null);
    onChanged();
  };

  // Called when: key.
  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(min-width: 640px)').matches) { e.preventDefault(); send(); }
  };

  const quick = family ? QUICK_FAMILY : QUICK_STAFF;
  const items: React.ReactNode[] = [];
  let prevDay = '';
  for (const m of msgs) {
    const k = dayKey(m.at);
    if (k !== prevDay) { prevDay = k; items.push(<div key={`d${k}`} className="flex justify-center my-2"><span className="text-[10px] font-bold px-3 py-1 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-500 shadow-sm">{dayLabel(m.at)}</span></div>); }
    items.push(<Bubble key={m.id} m={m} group={isGroup} selected={sel === m.id} onSelect={() => setSel(sel === m.id ? null : m.id)} onDelete={() => remove(m.id)} onZoom={setZoom} />);
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-3 px-3 py-2.5 bg-emerald-700 dark:bg-emerald-900 text-white shrink-0">
        <button onClick={onBack} className="md:hidden p-1.5 -ml-1 rounded-full hover:bg-white/10 cursor-pointer" aria-label="Back"><ArrowLeft className="w-5 h-5" /></button>
        <ChatAvatar t={thread} />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm truncate">{thread.other.name}</p>
          <p className="text-[11px] text-emerald-100 truncate">{thread.other.label}{thread.aboutStudent ? ` · ${thread.aboutStudent.name}` : ''}</p>
        </div>
        {isGroup && <button onClick={showMembers} className="p-1.5 rounded-full hover:bg-white/10 cursor-pointer" aria-label="Members" title="सदस्य / Members"><Users className="w-5 h-5" /></button>}
        {thread.group?.canManage && <button onClick={onManage} className="p-1.5 rounded-full hover:bg-white/10 cursor-pointer" aria-label="Manage group" title="ग्रुप बदलें / Manage group"><Settings2 className="w-5 h-5" /></button>}
      </div>
      {members && (
        <div className="max-h-56 overflow-y-auto border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <p className="px-3 pt-2 text-[11px] font-bold text-slate-500">{members.length} सदस्य / members</p>
          {members.map((p) => <div key={p.id} className="px-3 py-1.5 text-xs flex justify-between gap-2"><span className="font-bold text-slate-800 dark:text-slate-100 truncate">{p.name}</span><span className="text-slate-500 truncate">{p.label}</span></div>)}
        </div>
      )}

      <div ref={box} onScroll={onScroll} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-1.5 bg-[#efeae2] dark:bg-slate-900 relative">
        {loading && <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>}
        {hasMore && <div className="flex justify-center"><button onClick={loadOlder} className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-800 rounded-full px-3 py-1 shadow-sm cursor-pointer">पुराने संदेश / Older messages</button></div>}
        {!loading && !msgs.length && (
          <div className="text-center py-8 px-4 space-y-3">
            <div className="mx-auto w-14 h-14 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm"><MessageCircle className="w-7 h-7 text-emerald-600" /></div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{canSend ? 'बातचीत शुरू करें / Say hello' : 'अभी कोई संदेश नहीं / No messages yet'}</p>
            <p className="text-xs text-slate-500">लिखकर या माइक दबाकर बोलकर संदेश भेज सकते हैं। / You can type or speak.</p>
            {canSend && <div className="flex flex-wrap justify-center gap-2 pt-1">{quick.map((q) => <button key={q} onClick={() => setText(q)} className="text-[11px] px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 cursor-pointer">{q}</button>)}</div>}
          </div>
        )}
        {items}
        {newBelow && <button onClick={() => { toBottom(true); setNewBelow(false); }} className="sticky bottom-1 left-full ml-auto flex items-center gap-1 text-[11px] font-bold bg-emerald-600 text-white rounded-full px-3 py-1.5 shadow-lg cursor-pointer">↓ नया संदेश / New</button>}
      </div>

      {error && <div className="px-3 py-2 text-xs bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-t border-rose-200 flex items-start gap-2"><span className="flex-1">{error}</span><button onClick={() => setError('')} aria-label="Close"><X className="w-3.5 h-3.5" /></button></div>}

      {!canSend ? (
        <div className="px-4 py-3 text-xs text-center bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">अब इस चैट में संदेश नहीं भेजे जा सकते (क्लास, ग्रुप या शिक्षक बदल गया) / You can no longer send messages in this chat.</div>
      ) : rec ? (
        <div className="flex items-center gap-3 px-3 py-3 bg-slate-100 dark:bg-slate-800 shrink-0">
          <button onClick={() => stopRec(true)} className="p-2.5 rounded-full text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950 cursor-pointer" aria-label="Cancel recording"><Trash2 className="w-5 h-5" /></button>
          <div className="flex-1 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200"><span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" /> रिकॉर्ड हो रहा है… {mmss(rec.ms)}</div>
          <button onClick={() => stopRec(false)} className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow cursor-pointer" aria-label="Send voice message"><Send className="w-5 h-5" /></button>
        </div>
      ) : (
        <div className="flex items-end gap-2 px-2.5 py-2.5 bg-slate-100 dark:bg-slate-800 shrink-0">
          <input ref={fileIn} type="file" accept="image/*,application/pdf,.docx,.pptx,.xlsx" className="hidden" onChange={pickFile} />
          <button onClick={() => fileIn.current?.click()} disabled={busy} className="p-2.5 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-40" aria-label="Attach photo or file"><Paperclip className="w-5 h-5" /></button>
          <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} rows={1} maxLength={2000}
            placeholder="संदेश लिखें / Type a message"
            className="flex-1 resize-none max-h-32 rounded-2xl px-4 py-2.5 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            style={{ height: 'auto', minHeight: 42 }} onInput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight, 128)}px`; }} />
          {SpeechRec && <button onClick={dictate} className={`p-2.5 rounded-full cursor-pointer ${dictating ? 'bg-rose-100 text-rose-600 animate-pulse' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`} aria-label="Speak to type (Hindi)" title="बोलकर लिखें / Speak to type"><Languages className="w-5 h-5" /></button>}
          {text.trim() ? (
            <button onClick={send} disabled={busy} className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow cursor-pointer disabled:opacity-50" aria-label="Send"><Send className="w-5 h-5" /></button>
          ) : (
            <button onClick={startRec} disabled={busy} className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow cursor-pointer disabled:opacity-50" aria-label="Record voice message" title="वॉइस मैसेज / Voice message">{busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}</button>
          )}
        </div>
      )}

      {zoom && <div onClick={() => setZoom(null)} className="fixed inset-0 z-[80] bg-black/85 flex items-center justify-center p-4 cursor-zoom-out"><img src={zoom} alt="Photo" className="max-w-full max-h-full rounded-lg" /></div>}
    </div>
  );
};

// ---------- start a new chat ----------
const NewChat: React.FC<{ staffView: boolean; onPick: (c: ChatContact) => void; onBack: () => void }> = ({ staffView, onPick, onBack }) => {
  // Q (kept in screen state)
  const [q, setQ] = useState('');
  // Branch (kept in screen state)
  const [branch, setBranch] = useState('');
  // Sem (kept in screen state)
  const [sem, setSem] = useState('');
  // List of rows shown on this screen
  const [rows, setRows] = useState<ChatContact[] | null>(null);
  // More (kept in screen state)
  const [more, setMore] = useState(false);
  // Err (kept in screen state)
  const [err, setErr] = useState('');

  // Runs automatically whenever these change: q, branch, sem.
  useEffect(() => {
    let alive = true;
    const t = window.setTimeout(() => {
      chatApi.contacts({ q: q.trim() || undefined, branch: branch || undefined, semester: sem ? Number(sem) : undefined }).then((r) => {
        if (!alive) return;
        if (!r.ok) { setErr(r.error); return; }
        setErr(''); setRows(r.data.contacts); setMore(r.data.more);
      });
    }, 250);
    return () => { alive = false; window.clearTimeout(t); };
  }, [q, branch, sem]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-3 px-3 py-3 bg-emerald-700 dark:bg-emerald-900 text-white shrink-0">
        <button onClick={onBack} className="p-1.5 -ml-1 rounded-full hover:bg-white/10 cursor-pointer" aria-label="Back"><ArrowLeft className="w-5 h-5" /></button>
        <p className="font-bold text-sm">नई चैट / New chat</p>
      </div>
      <div className="p-2.5 space-y-2 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={staffView ? 'नाम, Roll No या शिक्षक / Name, roll no or teacher' : 'शिक्षक / सहपाठी का नाम खोजें / Search teacher or classmate'} className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        {staffView && (
          <div className="flex gap-2">
            <select value={branch} onChange={(e) => setBranch(e.target.value)} className="flex-1 text-xs rounded-lg px-2 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"><option value="">सभी ब्रांच / All branches</option><option value="CSE">CSE</option><option value="Civil">Civil</option></select>
            <select value={sem} onChange={(e) => setSem(e.target.value)} className="flex-1 text-xs rounded-lg px-2 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"><option value="">सभी सेमेस्टर / All sems</option>{[1, 2, 3, 4, 5, 6].map((s) => <option key={s} value={s}>Sem {s}</option>)}</select>
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {err && <p className="p-4 text-xs text-rose-600">{err}</p>}
        {!rows && !err && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>}
        {rows && !rows.length && <p className="p-6 text-center text-xs text-slate-500">कोई नहीं मिला / Nobody found</p>}
        {rows?.map((c) => (
          <button key={`${c.userId}:${c.studentId}`} onClick={() => onPick(c)} className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 cursor-pointer">
            <UserAvatar name={c.name} avatar={c.photoUrl || undefined} role={c.role} size="md" />
            <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{c.name}</span><span className="block text-[11px] text-slate-500 truncate">{c.label}{c.studentName && c.role !== 'parent' && c.role !== 'student' ? ` · ${c.studentName}` : ''}</span></span>
            {c.threadId && <span className="text-[10px] text-emerald-600 font-bold shrink-0">चैट है</span>}
          </button>
        ))}
        {more && <p className="p-3 text-center text-[11px] text-slate-400">और भी हैं — नाम लिखकर खोजें / More exist: type a name to narrow down</p>}
      </div>
    </div>
  );
};

// ---------- admin: make / change a custom group (e.g. a sports group) ----------
const GroupEditor: React.FC<{ existing: ChatThread | null; onDone: (t: ChatThread | null) => void; onBack: () => void }> = ({ existing, onDone, onBack }) => {
  // Group name
  const [name, setName] = useState(existing?.other.name || '');
  // People chosen (id -> person)
  const [chosen, setChosen] = useState<Map<string, GroupMember>>(new Map());
  // Search filters
  const [q, setQ] = useState(''); const [role, setRole] = useState(''); const [branch, setBranch] = useState('');
  // Search results
  const [rows, setRows] = useState<GroupMember[] | null>(null);
  // Error / busy
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);

  // An existing group: start from its members (the admin is always in every group, so not listed).
  useEffect(() => {
    if (!existing) return;
    chatApi.members(existing.id).then((r) => { if (r.ok && Array.isArray(r.data)) setChosen(new Map(r.data.filter((p) => p.role !== 'admin').map((p) => [p.id, p]))); });
  }, [existing]);
  // Search people.
  useEffect(() => {
    let alive = true;
    const t = window.setTimeout(() => chatApi.people({ q: q.trim() || undefined, role: role || undefined, branch: branch || undefined }).then((r) => { if (alive) { if (r.ok) setRows(r.data); else setErr(r.error); } }), 250);
    return () => { alive = false; window.clearTimeout(t); };
  }, [q, role, branch]);

  // Toggle one person.
  const toggle = (p: GroupMember) => setChosen((old) => { const n = new Map(old); if (n.has(p.id)) n.delete(p.id); else n.set(p.id, p); return n; });
  // Add everybody in the list.
  const addAll = () => setChosen((old) => { const n = new Map(old); for (const p of rows || []) if (p.role !== 'admin') n.set(p.id, p); return n; });
  // Save.
  const save = async () => {
    setBusy(true); setErr('');
    const ids = [...chosen.keys()];
    const r = existing ? await chatApi.updateGroup(existing.id, { name: name.trim(), memberIds: ids }) : await chatApi.createGroup(name.trim(), ids);
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    onDone(r.data);
  };
  // Delete.
  const remove = async () => {
    if (!existing || !window.confirm(`"${existing.other.name}" ग्रुप हटाएँ? / Delete this group?`)) return;
    const r = await chatApi.deleteGroup(existing.id);
    if (!r.ok) { setErr(r.error); return; }
    onDone(null);
  };
  const sel = 'flex-1 text-xs rounded-lg px-2 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200';
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-3 px-3 py-3 bg-emerald-700 dark:bg-emerald-900 text-white shrink-0">
        <button onClick={onBack} className="p-1.5 -ml-1 rounded-full hover:bg-white/10 cursor-pointer" aria-label="Back"><ArrowLeft className="w-5 h-5" /></button>
        <p className="font-bold text-sm flex-1">{existing ? 'ग्रुप बदलें / Edit group' : 'नया ग्रुप / New group'}</p>
        {existing && <button onClick={remove} className="p-1.5 rounded-full hover:bg-white/10 cursor-pointer" aria-label="Delete group"><Trash2 className="w-5 h-5" /></button>}
      </div>
      <div className="p-2.5 space-y-2 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="ग्रुप का नाम (जैसे Sports Team 2026) / Group name" className="w-full px-3 py-2.5 rounded-xl text-sm bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="नाम / Roll No खोजें / Search people" className="w-full pl-9 pr-3 py-2 rounded-xl text-sm bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" /></div>
        <div className="flex gap-2">
          <select value={role} onChange={(e) => setRole(e.target.value)} className={sel}><option value="">सभी / Everybody</option><option value="faculty">Teachers</option><option value="student">Students</option><option value="parent">Parents</option></select>
          <select value={branch} onChange={(e) => setBranch(e.target.value)} className={sel}><option value="">All branches</option><option value="CSE">CSE</option><option value="Civil">Civil</option></select>
          <button onClick={addAll} className="text-[11px] font-bold px-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 cursor-pointer">+ सभी / All</button>
        </div>
        <p className="text-[11px] text-slate-500">{chosen.size} चुने गए / chosen · एडमिन हर ग्रुप में रहते हैं / the admin is in every group</p>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {!rows && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>}
        {rows?.filter((p) => p.role !== 'admin').map((p) => (
          <label key={p.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60">
            <input type="checkbox" checked={chosen.has(p.id)} onChange={() => toggle(p)} />
            <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{p.name}</span><span className="block text-[11px] text-slate-500 truncate">{p.label}</span></span>
          </label>
        ))}
      </div>
      {err && <p className="px-3 py-2 text-xs text-rose-600">{err}</p>}
      <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <button disabled={busy || name.trim().length < 2} onClick={save} className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50 cursor-pointer">{busy ? 'Saving…' : existing ? 'सेव करें / Save' : 'ग्रुप बनाएँ / Create group'}</button>
      </div>
    </div>
  );
};

// ---------- the whole chat window ----------
export const ChatHub: React.FC<{ onClose: () => void; onUnread?: () => void }> = ({ onClose, onUnread }) => {
  // List of threads shown on this screen
  const [threads, setThreads] = useState<ChatThread[] | null>(null);
  // Which  is open right now
  const [active, setActive] = useState<ChatThread | null>(null);
  // Picking (kept in screen state)
  const [picking, setPicking] = useState(false);
  // Filter (kept in screen state)
  const [filter, setFilter] = useState('');
  // Err (kept in screen state)
  const [err, setErr] = useState('');
  const { authUser } = useCollege();
  const staffView = authUser?.role === 'admin' || authUser?.role === 'faculty';
  const isAdmin = authUser?.role === 'admin';
  // Admin: making a new group ('new') or changing the open one ('edit')
  const [groupEdit, setGroupEdit] = useState<null | 'new' | 'edit'>(null);
  // List filter: everything / groups only / one-to-one only
  const [kind, setKind] = useState<'all' | 'groups' | 'people'>('all');

  // Loads the data from the server.
  const refresh = useCallback(async () => {
    const r = await chatApi.threads();
    if (r.ok) { setThreads(Array.isArray(r.data) ? r.data : []); setErr(''); onUnread?.(); } else setErr(r.error);
  }, [onUnread]);

  // Runs automatically whenever these change: refresh.
  useEffect(() => { refresh(); const t = window.setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 8000); return () => window.clearInterval(t); }, [refresh]);

  // Pick.
  const pick = async (c: ChatContact) => {
    const r = await chatApi.open(c.userId, c.studentId);
    if (!r.ok) { setErr(r.error); return; }
    setPicking(false); setActive(r.data); refresh();
  };

  const shown = (Array.isArray(threads) ? threads : []).filter((t) => (kind === 'all' || (kind === 'groups') === !!t.isGroup) && (!filter.trim() || `${t?.other?.name || ''} ${t?.other?.label || ''} ${t?.aboutStudent?.name || ''}`.toLowerCase().includes(filter.trim().toLowerCase())));
  // Group saved / deleted.
  const groupDone = (t: ChatThread | null) => { setGroupEdit(null); setActive(t); refresh(); };
  const activeFresh = active ? (threads || []).find((t) => t.id === active.id) || active : null;

  return (
    <div className="flex h-full w-full bg-white dark:bg-slate-950 md:rounded-2xl overflow-hidden">
      <div className={`${active || picking || groupEdit ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 md:border-r border-slate-200 dark:border-slate-800 min-h-0 shrink-0`}>
        {groupEdit ? (
          <GroupEditor existing={groupEdit === 'edit' ? activeFresh : null} onDone={groupDone} onBack={() => setGroupEdit(null)} />
        ) : picking ? (
          <NewChat staffView={staffView} onPick={pick} onBack={() => setPicking(false)} />
        ) : (
          <>
            <div className="flex items-center gap-2 px-3 py-3 bg-emerald-700 dark:bg-emerald-900 text-white shrink-0">
              <MessageCircle className="w-5 h-5" />
              <p className="font-bold text-sm flex-1">संदेश / Messages</p>
              {isAdmin && <button onClick={() => { setGroupEdit('new'); setActive(null); }} className="p-1.5 rounded-full hover:bg-white/10 cursor-pointer" aria-label="New group" title="नया ग्रुप / New group"><UserPlus className="w-5 h-5" /></button>}
              <button onClick={() => setPicking(true)} className="p-1.5 rounded-full hover:bg-white/10 cursor-pointer" aria-label="New chat"><Plus className="w-5 h-5" /></button>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 cursor-pointer" aria-label="Close"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="चैट खोजें / Search chats" className="w-full pl-9 pr-3 py-2 rounded-xl text-sm bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none" /></div>
              <div className="flex gap-1.5 mt-2">
                {([['all', 'सभी / All'], ['groups', 'ग्रुप / Groups'], ['people', 'व्यक्ति / People']] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setKind(k)} className={`text-[11px] font-bold px-2.5 py-1 rounded-full cursor-pointer ${kind === k ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>{l}</button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {err && <p className="p-4 text-xs text-rose-600">{err}</p>}
              {!threads && !err && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>}
              {threads && !threads.length && (
                <div className="p-6 text-center space-y-3">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">अभी कोई चैट नहीं / No chats yet</p>
                  <button onClick={() => setPicking(true)} className="px-4 py-2 rounded-full bg-emerald-600 text-white text-xs font-bold cursor-pointer">+ नई चैट शुरू करें / Start a chat</button>
                </div>
              )}
              {shown.map((t) => (
                <button key={t.id} onClick={() => setActive(t)} className={`w-full flex items-center gap-3 px-3 py-3 text-left border-b border-slate-100 dark:border-slate-800 cursor-pointer ${activeFresh?.id === t.id ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
                  <ChatAvatar t={t} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2"><span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{t.other.name}</span><span className={`text-[10px] shrink-0 ${t.unread ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>{t.last ? listTime(t.last.at) : ''}</span></span>
                    <span className="block text-[10px] text-slate-400 truncate">{t.other.label}{t.aboutStudent ? ` · ${t.aboutStudent.name}` : ''}</span>
                    <span className="flex items-center justify-between gap-2"><span className="text-xs text-slate-500 dark:text-slate-400 truncate">{t.last ? `${t.last.mine ? 'आप: ' : t.isGroup && t.last.senderName ? `${t.last.senderName}: ` : ''}${t.last.preview}` : t.isGroup ? 'अभी कोई संदेश नहीं / No messages yet' : ''}</span>{t.unread > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{t.unread}</span>}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className={`${active && !groupEdit ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 flex-col`}>
        {activeFresh ? (
          <Conversation key={activeFresh.id} thread={activeFresh} onBack={() => setActive(null)} onChanged={refresh} onManage={() => setGroupEdit('edit')} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-[#efeae2] dark:bg-slate-900 text-center p-6">
            <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm"><MessageCircle className="w-8 h-8 text-emerald-600" /></div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">कॉलेज संदेश / College Messages</p>
            <p className="text-xs text-slate-500 max-w-xs">बाईं ओर से चैट चुनें या + दबाकर नई चैट शुरू करें। / Pick a chat, or press + to start one.</p>
          </div>
        )}
      </div>
    </div>
  );
};
