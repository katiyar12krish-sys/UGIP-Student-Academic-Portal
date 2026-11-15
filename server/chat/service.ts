// ===================================================================================================
// Chat (Step 13) between families (student / parent) and staff (teacher / admin).
// Who may talk to whom, threads, text / voice / photo / file messages, read ticks, delete-for-everyone.
// ===================================================================================================
import { db } from '../db/connection';
import { newId, studentRow } from '../academic/access';
import { savePending, findFile, removeFile, fileOnDisk, kindOfMime } from '../files/store';
import { notifyUser } from '../notify/service';
import type { SessionUser } from '../auth/session';
import { hideSample } from '../auth/sample';

// Step 13: chat between families (student / parent) and staff (teacher / admin), WhatsApp style: text, voice, photos, files.
// Every "who may talk to whom" decision is in this file. The routes only call it.
//
//   parent             <->  a teacher of the child's class, or the admin       (always "about" one child)
//   student            <->  any teacher, or the admin                          (about the student themself)
//   staff              <->  staff: admin <-> teacher, teacher <-> teacher, admin <-> admin
//   student            <->  student of the SAME branch, or of another branch only when both are in one custom group
//   parent             <->  their own child
//   parent <-> parent, parent <-> other students:  never.
//   Groups (All faculty, branch, class, custom): server/chat/groups.ts.
//   Set CHAT_STUDENT_CHAT=0 to switch off students' own chats (parents and staff keep working).

// Data shape: result.
export type Result<T = {}> = ({ ok: true } & T) | { ok: false; status: number; error: string };
// Fail.
const fail = (status: number, error: string) => ({ ok: false as const, status, error });

export const MAX_TEXT = 2000;
export const MAX_VOICE_MS = 5 * 60_000;
export const MAX_LIST = 80;
// true / false: is staff role?
const isStaffRole = (r: string) => r === 'admin' || r === 'faculty';
// true / false: is family role?
const isFamilyRole = (r: string) => r === 'student' || r === 'parent';

// Data shape: user row.
export interface UserRow { id: string; username: string; role: 'admin' | 'faculty' | 'student' | 'parent'; name: string; department: string | null; designation: string | null; student_id: string | null; is_active: number; photo_version: number | null }
const USER_COLS = 'id, username, role, name, department, designation, student_id, is_active, photo_version';
// User row.
export const userRow = (id: string): UserRow | undefined => db.prepare(`SELECT ${USER_COLS} FROM users WHERE id=?`).get(id) as any;

// Class label.
const classLabel = (st: { branch: string; semester: number }) => `${st.branch} Sem ${st.semester}`;

/** The students a family login is about: a student -> themself, a parent -> linked students (not deleted). */
function childrenOf(u: UserRow): string[] {
  if (u.role === 'student') return u.student_id && studentRow(u.student_id) ? [u.student_id] : [];
  if (u.role === 'parent')
    return (db.prepare('SELECT l.student_id FROM parent_student_links l JOIN students s ON s.id=l.student_id AND s.deleted_at IS NULL WHERE l.parent_user_id=?').all(u.id) as any[]).map((r) => r.student_id);
  return [];
}

// Faculty teaches class.
const facultyTeachesClass = (facultyId: string, branch: string, semester: number): boolean =>
  !!db.prepare('SELECT 1 FROM faculty_subject_assignments a JOIN subjects s ON s.id=a.subject_id WHERE a.user_id=? AND s.branch=? AND s.semester=? LIMIT 1').get(facultyId, branch, semester);

/** Are both people members of one custom group (e.g. a sports group)? */
export const shareCustomGroup = (a: string, b: string): boolean =>
  !!db.prepare('SELECT 1 FROM chat_group_members x JOIN chat_group_members y ON y.group_id=x.group_id JOIN chat_groups g ON g.id=x.group_id AND g.archived=0 WHERE x.user_id=? AND y.user_id=? LIMIT 1').get(a, b);

/**
 * May these two people write to each other? studentId = the child the talk is about:
 * '' for staff <-> staff and student <-> student; the child for parent <-> child and staff <-> family.
 */
export function canChat(a: UserRow, b: UserRow, studentId: string): boolean {
  if (a.id === b.id || !a.is_active || !b.is_active) return false;
  if ((a.role === 'student' || b.role === 'student') && process.env.CHAT_STUDENT_CHAT === '0') return false;
  if (isStaffRole(a.role) && isStaffRole(b.role)) return !studentId;                          // any two staff members
  if (isFamilyRole(a.role) && isFamilyRole(b.role)) {
    if (a.role === 'student' && b.role === 'student') {                                         // classmates / same branch, or one custom group
      if (studentId) return false;
      const x = a.student_id ? studentRow(a.student_id) : null, y = b.student_id ? studentRow(b.student_id) : null;
      if (!x || !y) return false;
      return x.branch === y.branch || shareCustomGroup(a.id, b.id);
    }
    if (a.role === 'parent' && b.role === 'parent') return false;
    const [par, kid] = a.role === 'parent' ? [a, b] : [b, a];                                   // a parent and their own child
    return !!studentId && kid.student_id === studentId && childrenOf(par).includes(studentId);
  }
  const [staff, fam] = isStaffRole(a.role) ? [a, b] : [b, a];
  if (!isStaffRole(staff.role) || !isFamilyRole(fam.role)) return false;
  if (!studentId || !childrenOf(fam).includes(studentId)) return false;
  const st = studentRow(studentId);
  if (!st) return false;
  if (staff.role === 'admin') return true;
  if (fam.role === 'student') return true;                                                      // a student may write to any teacher
  return facultyTeachesClass(staff.id, st.branch, st.semester);                                 // a parent: the teachers of the child's class
}

/** The "about which child" value of a talk between these two people. */
function studentIdFor(me: UserRow, other: UserRow, asked: string): string {
  if (isStaffRole(me.role) && isStaffRole(other.role)) return '';
  if (me.role === 'student' && other.role === 'student') return '';
  if (me.role === 'parent' && other.role === 'student') return other.student_id || '';
  if (me.role === 'student' && other.role === 'parent') return me.student_id || '';
  if (asked) return asked;
  const fam = isFamilyRole(me.role) ? me : other;
  if (fam.role === 'student') return fam.student_id || '';
  const kids = childrenOf(fam);
  return kids.length === 1 ? kids[0] : '';
}

// ---------- labels: the first thing a teacher wants to know is "whose parent is this?" ----------
const relationOf = (parentId: string, studentId: string): string => (db.prepare('SELECT relation FROM parent_student_links WHERE parent_user_id=? AND student_id=?').get(parentId, studentId) as any)?.relation || 'Parent';

// Subjects taught.
function subjectsTaught(facultyId: string, branch: string, semester: number): string[] {
  return (db.prepare('SELECT s.name FROM faculty_subject_assignments a JOIN subjects s ON s.id=a.subject_id WHERE a.user_id=? AND s.branch=? AND s.semester=? ORDER BY s.name').all(facultyId, branch, semester) as any[]).map((r) => r.name);
}

// Label for.
function labelFor(other: UserRow, studentId: string): string {
  if (other.role === 'admin') return other.designation || 'Principal / Administration Office';
  if (other.role === 'student' && other.student_id) {
    const own = studentRow(other.student_id);
    if (own) return `Student · Roll ${own.roll_no} · ${classLabel(own)}`;
  }
  if (other.role === 'faculty') {
    const st = studentId ? studentRow(studentId) : null;
    const subs = st ? subjectsTaught(other.id, st.branch, st.semester) : [];
    return subs.length ? `Teacher · ${subs.slice(0, 3).join(', ')}` : `Teacher${other.department ? ` · ${other.department}` : ''}`;
  }
  const st = studentId ? studentRow(studentId) : null;
  if (!st) return other.role === 'parent' ? 'Parent' : 'Student';
  return other.role === 'parent' ? `${relationOf(other.id, studentId)} of ${st.name} · ${classLabel(st)}` : `Student · Roll ${st.roll_no} · ${classLabel(st)}`;
}

// Photo of.
const photoOf = (r: UserRow) => (r.photo_version ? `/api/photos/${encodeURIComponent(r.id)}?v=${r.photo_version}` : null);

// ---------- threads ----------
const pair = (x: string, y: string): [string, string] => (x < y ? [x, y] : [y, x]);
// Find thread.
export const findThread = (id: string): any => db.prepare('SELECT * FROM chat_threads WHERE id=?').get(id);
// true / false: is participant?
export const isParticipant = (u: { id: string }, t: any) => !!t && (t.user_lo === u.id || t.user_hi === u.id);
// Other id of.
const otherIdOf = (u: { id: string }, t: any): string => (t.user_lo === u.id ? t.user_hi : t.user_lo);
// My last read.
const myLastRead = (u: { id: string }, t: any): number => (t.user_lo === u.id ? t.last_read_lo : t.last_read_hi);
// Their last read.
const theirLastRead = (u: { id: string }, t: any): number => (t.user_lo === u.id ? t.last_read_hi : t.last_read_lo);

/** Open (or create) the thread with someone about a child. A new thread is created only when the two may talk. */
export function openThread(u: SessionUser, b: any, now = Date.now()): Result<{ id: string; created: boolean }> {
  const other = userRow(String(b?.userId || ''));
  if (!other) return fail(404, 'Person not found');
  const me = userRow(u.id);
  if (!me) return fail(401, 'Login required');
  // a student always talks about themself; a parent with one child does not need to say which
  const studentId = studentIdFor(me, other, typeof b?.studentId === 'string' ? b.studentId : '');
  if (!canChat(me, other, studentId)) return fail(403, 'You cannot start a chat with this person');
  const [lo, hi] = pair(me.id, other.id);
  const old = db.prepare('SELECT id FROM chat_threads WHERE user_lo=? AND user_hi=? AND student_id=?').get(lo, hi, studentId) as any;
  if (old) return { ok: true, id: old.id, created: false };
  const id = newId('ch');
  db.prepare('INSERT INTO chat_threads (id,user_lo,user_hi,student_id,created_at,last_at) VALUES (?,?,?,?,?,?)').run(id, lo, hi, studentId, now, now);
  return { ok: true, id, created: true };
}

// Last msg.
const lastMsg = (threadId: string): any => db.prepare('SELECT * FROM chat_messages WHERE thread_id=? ORDER BY id DESC LIMIT 1').get(threadId);
// Unread in.
const unreadIn = (u: { id: string }, t: any): number =>
  (db.prepare('SELECT COUNT(*) c FROM chat_messages WHERE thread_id=? AND sender_id<>? AND id>? AND deleted_at IS NULL').get(t.id, u.id, myLastRead(u, t)) as any).c;

/** The short line shown under a name in the chat list. */
export function previewOf(m: any): string {
  if (m.deleted_at) return 'This message was deleted';
  if (m.kind === 'voice') return `🎤 Voice message ${durationLabel(m.duration_ms)}`;
  if (m.kind === 'image') return m.body ? `📷 ${m.body}` : '📷 Photo';
  if (m.kind === 'file') return `📎 ${m.file_name || 'File'}`;
  return String(m.body).replace(/\s+/g, ' ').slice(0, 80);
}
// Duration label.
export const durationLabel = (ms: number | null) => { const s = Math.max(0, Math.round((ms || 0) / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

// Converts to thread dto.
export function toThreadDto(u: SessionUser, t: any) {
  const other = userRow(otherIdOf(u, t))!;
  const me = userRow(u.id)!;
  const st = t.student_id ? studentRow(t.student_id) : null;
  const m = lastMsg(t.id);
  return {
    id: t.id,
    other: { id: other.id, name: other.name, role: other.role, label: labelFor(other, t.student_id), photoUrl: photoOf(other) },
    aboutStudent: st && me.role !== 'student' ? { id: st.id, name: st.name, rollNo: st.roll_no, className: classLabel(st) } : null,
    last: m ? { preview: previewOf(m), kind: m.kind, mine: m.sender_id === u.id, at: m.created_at, deleted: !!m.deleted_at } : null,
    lastAt: t.last_at,
    unread: unreadIn(u, t),
    canSend: canChat(me, other, t.student_id),
  };
}

/** My chats, newest first. Shown even if the two may no longer start a chat (the old messages stay readable). */
export function listThreads(u: SessionUser) {
  const rows = db.prepare('SELECT * FROM chat_threads WHERE (user_lo=? OR user_hi=?) AND EXISTS (SELECT 1 FROM chat_messages m WHERE m.thread_id=chat_threads.id) ORDER BY last_at DESC, rowid DESC LIMIT 200').all(u.id, u.id) as any[];
  return rows.map((t) => toThreadDto(u, t));
}

/** Number on the chat button: messages from others I have not opened. */
export function unreadTotal(u: SessionUser): number {
  const rows = db.prepare('SELECT * FROM chat_threads WHERE user_lo=? OR user_hi=?').all(u.id, u.id) as any[];
  return rows.reduce((n, t) => n + unreadIn(u, t), 0);
}

// ---------- messages ----------
export function toMessageDto(u: SessionUser, t: any, m: any) {
  const mine = m.sender_id === u.id;
  const gone = !!m.deleted_at;
  return {
    id: m.id, mine, kind: m.kind as 'text' | 'voice' | 'image' | 'file', deleted: gone, at: m.created_at,
    text: gone ? '' : m.body,
    fileUrl: !gone && m.file_id ? `/api/chat/messages/${m.id}/file` : undefined,
    fileName: !gone && m.file_id ? m.file_name : undefined, mime: !gone && m.file_id ? m.file_mime : undefined, size: !gone && m.file_id ? m.file_size : undefined,
    durationMs: !gone && m.kind === 'voice' ? m.duration_ms : undefined,
    status: mine ? (theirLastRead(u, t) >= m.id ? 'seen' : 'sent') : undefined,
    canDelete: mine && !gone,
  };
}

/**
 * Messages of a thread. No parameters: the latest 50. `before=<id>`: the 50 older than that. `after=<id>`: everything newer (the 3-second refresh).
 * `since=<server time>`: also tell which messages were deleted since then.
 */
export function messagesOf(u: SessionUser, t: any, q: { after?: number; before?: number; since?: number } = {}, limit = 50) {
  // Dto.
  const dto = (m: any) => toMessageDto(u, t, m);
  let rows: any[];
  let hasMore = false;
  if (q.after !== undefined) rows = db.prepare('SELECT * FROM chat_messages WHERE thread_id=? AND id>? ORDER BY id LIMIT 200').all(t.id, q.after) as any[];
  else if (q.before !== undefined) { rows = (db.prepare('SELECT * FROM chat_messages WHERE thread_id=? AND id<? ORDER BY id DESC LIMIT ?').all(t.id, q.before, limit + 1) as any[]); hasMore = rows.length > limit; rows = rows.slice(0, limit).reverse(); }
  else { rows = (db.prepare('SELECT * FROM chat_messages WHERE thread_id=? ORDER BY id DESC LIMIT ?').all(t.id, limit + 1) as any[]); hasMore = rows.length > limit; rows = rows.slice(0, limit).reverse(); }
  const deletedIds = q.since === undefined ? [] : (db.prepare('SELECT id FROM chat_messages WHERE thread_id=? AND deleted_at IS NOT NULL AND deleted_at>=?').all(t.id, q.since) as any[]).map((r) => r.id);
  return { messages: rows.map(dto), hasMore, otherLastRead: theirLastRead(u, t), deletedIds, now: Date.now() };
}

/** "I have read everything up to here." Only ever moves forward. */
export function markRead(u: SessionUser, t: any, upTo?: number): { ok: true; lastRead: number } {
  const newest = (db.prepare('SELECT COALESCE(MAX(id),0) m FROM chat_messages WHERE thread_id=?').get(t.id) as any).m as number;
  const to = Math.min(newest, Number.isInteger(upTo) && (upTo as number) > 0 ? (upTo as number) : newest);
  const col = t.user_lo === u.id ? 'last_read_lo' : 'last_read_hi';
  db.prepare(`UPDATE chat_threads SET ${col}=? WHERE id=? AND ${col}<?`).run(to, t.id, to);
  return { ok: true, lastRead: Math.max(to, myLastRead(u, t)) };
}

// May write.
function mayWrite(u: SessionUser, t: any): Result<{ me: UserRow; other: UserRow }> {
  if (!isParticipant(u, t)) return fail(404, 'Chat not found');
  const me = userRow(u.id), other = userRow(otherIdOf(u, t));
  if (!me || !other) return fail(404, 'Chat not found');
  if (!canChat(me, other, t.student_id)) return fail(403, 'You can no longer send messages in this chat');
  return { ok: true, me, other };
}

// Insert message.
function insertMessage(u: SessionUser, t: any, m: { kind: string; body: string; file?: { id: string; name: string; mime: string; size: number }; durationMs?: number }, now: number): number {
  const r = db.prepare('INSERT INTO chat_messages (thread_id,sender_id,kind,body,file_id,file_name,file_mime,file_size,duration_ms,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(t.id, u.id, m.kind, m.body, m.file?.id ?? null, m.file?.name ?? null, m.file?.mime ?? null, m.file?.size ?? null, m.durationMs ?? null, now);
  const id = Number(r.lastInsertRowid);
  db.prepare('UPDATE chat_threads SET last_at=? WHERE id=?').run(now, t.id);
  // sending means "I am here": everything before my message counts as read by me
  markRead(u, findThread(t.id), id);
  return id;
}

// Send text.
export function sendText(u: SessionUser, t: any, text: unknown, now = Date.now()): Result<{ id: number }> {
  const w = mayWrite(u, t); if (!w.ok) return w;
  const body = typeof text === 'string' ? text.replace(/\r\n/g, '\n').trim().slice(0, MAX_TEXT) : '';
  if (!body) return fail(400, 'Write a message first');
  return { ok: true, id: insertMessage(u, t, { kind: 'text', body }, now) };
}

/** A voice message, photo or file. The bytes are checked by their first bytes (files/store.ts), the browser's file name and type are not trusted. */
export function sendFile(u: SessionUser, t: any, bytes: unknown, rawName: string, durationMs: unknown, caption: unknown, now = Date.now()): Result<{ id: number }> {
  const w = mayWrite(u, t); if (!w.ok) return w;
  const saved = savePending(u.id, bytes, rawName, now, { audio: true });
  if (!saved.ok) return saved;
  const f = saved.file;
  const kind = f.kind === 'audio' ? 'voice' : f.kind === 'image' ? 'image' : 'file';
  const dur = kind === 'voice' ? Math.min(MAX_VOICE_MS, Math.max(0, Math.round(Number(durationMs) || 0))) : undefined;
  if (kind === 'voice' && dur === 0) { removeFile(f.fileId); return fail(400, 'The voice message is empty'); }
  const body = kind === 'voice' || typeof caption !== 'string' ? '' : caption.trim().slice(0, 500);
  let id: number;
  try {
    id = insertMessage(u, t, { kind, body, file: { id: f.fileId, name: f.name, mime: f.mime, size: f.size }, durationMs: dur }, now);
    db.prepare('UPDATE stored_files SET attached_to=? WHERE id=?').run(`chat:${id}`, f.fileId);
  } catch (e) { removeFile(f.fileId); throw e; }
  return { ok: true, id };
}

// Find message.
export const findMessage = (id: number): any => (Number.isInteger(id) ? db.prepare('SELECT * FROM chat_messages WHERE id=?').get(id) : undefined);

/** Delete for everyone: only your own message. Text and file are erased. */
export function deleteMessage(u: SessionUser, m: any, now = Date.now()): Result {
  if (m.sender_id !== u.id) return fail(403, 'You can delete only your own messages');
  if (m.deleted_at) return { ok: true };
  if (m.file_id) removeFile(m.file_id);
  db.prepare("UPDATE chat_messages SET deleted_at=?, body='', file_id=NULL, file_name=NULL, file_mime=NULL, file_size=NULL WHERE id=?").run(now, m.id);
  return { ok: true };
}

/** The file of a message, for the two people of the thread only. */
export function openMessageFile(u: SessionUser, m: any): Result<{ path: string; mime: string; name: string; kind: ReturnType<typeof kindOfMime> }> {
  const t = findThread(m.thread_id);
  if (!isParticipant(u, t) || m.deleted_at || !m.file_id) return fail(404, 'File not found');
  const f = findFile(m.file_id);
  return f ? { ok: true, path: fileOnDisk(f.id), mime: f.mime, name: f.original_name, kind: kindOfMime(f.mime) } : fail(404, 'The file is no longer available');
}

// ---------- who can I write to? ----------
export interface Contact { userId: string; name: string; role: UserRow['role']; label: string; studentId: string; studentName: string | null; photoUrl: string | null; threadId: string | null }

// Contact of.
function contactOf(me: UserRow, other: UserRow, studentId: string): Contact {
  const [lo, hi] = pair(me.id, other.id);
  const th = db.prepare('SELECT id FROM chat_threads WHERE user_lo=? AND user_hi=? AND student_id=?').get(lo, hi, studentId) as any;
  const st = studentId ? studentRow(studentId) : null;
  return { userId: other.id, name: other.name, role: other.role, label: labelFor(other, studentId), studentId, studentName: st && me.role !== 'student' ? st.name : null, photoUrl: photoOf(other), threadId: th?.id ?? null };
}

/**
 * The people this person may start a chat with.
 *  student / parent: the teachers of each child's class (with the subjects they teach) and the admin office.
 *  teacher: students and parents of the classes they teach (+ the admin). admin: everybody (filter with q / branch / semester).
 */
export function contactsFor(u: SessionUser, q: { q?: string; branch?: string; semester?: number } = {}): { contacts: Contact[]; more: boolean } {
  const me = userRow(u.id);
  if (!me) return { contacts: [], more: false };
  const out: Contact[] = [];
  const text = (q.q || '').trim().toLowerCase().slice(0, 60);
  const match = (...parts: (string | null | undefined)[]) => !text || parts.some((p) => (p || '').toLowerCase().includes(text));

  if (isFamilyRole(me.role)) {
    if (me.role === 'student' && process.env.CHAT_STUDENT_CHAT === '0') return { contacts: [], more: false };
    for (const sid of childrenOf(me)) {
      const st = studentRow(sid);
      for (const f of db.prepare("SELECT DISTINCT u.id FROM faculty_subject_assignments a JOIN subjects s ON s.id=a.subject_id JOIN users u ON u.id=a.user_id WHERE s.branch=? AND s.semester=? AND u.role='faculty' AND u.is_active=1 ORDER BY u.name").all(st.branch, st.semester) as any[]) {
        const r = userRow(f.id)!; if (canChat(me, r, sid) && match(r.name, labelFor(r, sid))) out.push(contactOf(me, r, sid));
      }
      for (const a of db.prepare("SELECT id FROM users WHERE role='admin' AND is_active=1 ORDER BY name").all() as any[]) {
        const r = userRow(a.id)!; if (canChat(me, r, sid) && match(r.name, labelFor(r, sid))) out.push(contactOf(me, r, sid));
      }
      // a parent <-> their own child; a student <-> their own parents
      if (me.role === 'parent') { const k = db.prepare("SELECT id FROM users WHERE role='student' AND student_id=? AND is_active=1").get(sid) as any; if (k) { const r = userRow(k.id)!; if (canChat(me, r, sid) && match(r.name, labelFor(r, sid))) out.push(contactOf(me, r, sid)); } }
      if (me.role === 'student') for (const p of db.prepare("SELECT l.parent_user_id id FROM parent_student_links l JOIN users u ON u.id=l.parent_user_id WHERE l.student_id=? AND u.is_active=1 ORDER BY u.name").all(sid) as any[]) {
        const r = userRow(p.id)!; if (canChat(me, r, sid) && match(r.name, labelFor(r, sid))) out.push(contactOf(me, r, sid));
      }
    }
    if (me.role === 'student') {
      const own = me.student_id ? studentRow(me.student_id) : null;
      const seen = new Set(out.map((c) => c.userId));
      // other teachers (outside my class), then students of my branch, then students I share a custom group with
      for (const f of db.prepare("SELECT id FROM users WHERE role='faculty' AND is_active=1 ORDER BY name").all() as any[]) {
        if (seen.has(f.id)) continue;
        const r = userRow(f.id)!; if (canChat(me, r, me.student_id || '') && match(r.name, r.department, labelFor(r, ''))) { out.push(contactOf(me, r, me.student_id || '')); seen.add(r.id); }
      }
      if (own) for (const x of db.prepare(`SELECT u.id FROM users u JOIN students s ON s.id=u.student_id AND s.deleted_at IS NULL
          WHERE u.role='student' AND u.is_active=1 AND u.id<>? AND (s.branch=? OR u.id IN (SELECT y.user_id FROM chat_group_members x JOIN chat_group_members y ON y.group_id=x.group_id JOIN chat_groups g ON g.id=x.group_id AND g.archived=0 WHERE x.user_id=?))
          ORDER BY CASE WHEN s.semester=? THEN 0 ELSE 1 END, s.semester, s.roll_no LIMIT 400`).all(me.id, own.branch, me.id, own.semester) as any[]) {
        const r = userRow(x.id)!; if (canChat(me, r, '') && match(r.name, labelFor(r, ''), r.username)) out.push(contactOf(me, r, ''));
      }
    }
    return { contacts: out.slice(0, MAX_LIST), more: out.length > MAX_LIST };
  }

  // staff: the admin office first, then every teacher (staff talk), then the families
  for (const a of db.prepare("SELECT id FROM users WHERE role='admin' AND is_active=1 AND id<>? ORDER BY name").all(me.id) as any[]) { const r = userRow(a.id)!; if (match(r.name, labelFor(r, ''), r.username)) out.push(contactOf(me, r, '')); }
  for (const f of db.prepare("SELECT id FROM users WHERE role='faculty' AND is_active=1 AND id<>? ORDER BY name").all(me.id) as any[]) { const r = userRow(f.id)!; if (match(r.name, r.department, r.username)) out.push(contactOf(me, r, '')); }

  const where = ['s.deleted_at IS NULL'], args: (string | number)[] = [];
  if (hideSample(u)) where.push('s.is_demo=0');   // sample students only for admin / CSE HOD
  if (q.branch === 'CSE' || q.branch === 'Civil') { where.push('s.branch=?'); args.push(q.branch); }
  if (Number.isInteger(q.semester)) { where.push('s.semester=?'); args.push(q.semester as number); }
  if (text) { where.push('(LOWER(s.name) LIKE ? OR s.roll_no LIKE ? OR LOWER(COALESCE(s.father,\'\')) LIKE ? OR LOWER(COALESCE(s.mother,\'\')) LIKE ?)'); args.push(`%${text}%`, `%${text}%`, `%${text}%`, `%${text}%`); }
  const students = db.prepare(`SELECT s.id FROM students s WHERE ${where.join(' AND ')} ORDER BY s.branch, s.semester, s.roll_no LIMIT 400`).all(...args) as any[];
  for (const s of students) {
    const su = db.prepare("SELECT id FROM users WHERE role='student' AND student_id=? AND is_active=1").get(s.id) as any;
    if (su && process.env.CHAT_STUDENT_CHAT !== '0') { const r = userRow(su.id)!; if (canChat(me, r, s.id)) out.push(contactOf(me, r, s.id)); }
    for (const p of db.prepare("SELECT l.parent_user_id id FROM parent_student_links l JOIN users u ON u.id=l.parent_user_id WHERE l.student_id=? AND u.is_active=1 ORDER BY u.name").all(s.id) as any[]) {
      const r = userRow(p.id)!; if (canChat(me, r, s.id)) out.push(contactOf(me, r, s.id));
    }
  }
  return { contacts: out.slice(0, MAX_LIST), more: out.length > MAX_LIST };
}

// ---------- the bell ----------
/** One bell message per thread until the person opens it (the key contains what they have read so far). No message text on the lock screen. */
export function notifyNewMessage(u: SessionUser, t: any, messageId: number, now = Date.now()): boolean {
  const to = otherIdOf(u, t);
  const read = to === t.user_lo ? t.last_read_lo : t.last_read_hi;
  return notifyUser(to, { kind: 'chat', title: `New message from ${u.name}`, body: 'Open Messages to read it', url: '/', dedupeKey: `chat:${t.id}:after:${read}` }, now);
}
