// ===================================================================================================
// Group chats. Every "who is in this group / who may read, write or delete" decision is in this file.
// -----------------------------------------------------------------------------------------------------
//   All faculty            : every active teacher + the admin
//   CSE / Civil students   : students of that branch, the teachers of that branch (department or a subject
//                            of the branch) + the admin
//   Class groups           : branch + study year (year 1 = sem 1-2, year 2 = sem 3-4, year 3 = sem 5-6): its
//                            students, the teachers of its subjects + the admin
//   Custom groups          : made by the admin (e.g. a sports group); members are listed by name. Anybody
//                            (staff, students, parents) can be added.
// Only members read or write a group (others get "not found"). Everybody may delete their own message;
// the admin may delete any message (moderation). Parents are never in the built-in groups.
// CHAT_STUDENT_CHAT=0 takes students out of every group.
// ===================================================================================================
import crypto from 'crypto';
import { db } from '../db/connection';
import { savePending, findFile, removeFile, fileOnDisk, kindOfMime } from '../files/store';
import { notifyUser } from '../notify/service';
import type { SessionUser } from '../auth/session';
import { userRow, previewOf, MAX_TEXT, MAX_VOICE_MS, type UserRow } from './service';

// Data shape: result.
export type Result<T = {}> = ({ ok: true } & T) | { ok: false; status: number; error: string };
// Fail.
const fail = (status: number, error: string) => ({ ok: false as const, status, error });

export const BRANCHES = ['CSE', 'Civil'] as const;
export const MAX_GROUP_MEMBERS = 500;
const YEAR_WORD = ['', '1st', '2nd', '3rd'];

/** The built-in groups always exist (made on start, safe to run again). */
export function ensureBuiltinGroups(now = Date.now()) {
  const ins = db.prepare('INSERT OR IGNORE INTO chat_groups (id,kind,name,branch,year,created_at,last_at) VALUES (?,?,?,?,?,?,?)');
  ins.run('grp-faculty', 'faculty', 'All Faculty / सभी शिक्षक', null, null, now, now);
  for (const b of BRANCHES) {
    ins.run(`grp-branch-${b}`, 'branch', `${b} Students / ${b} छात्र`, b, null, now, now);
    for (const y of [1, 2, 3]) ins.run(`grp-class-${b}-${y}`, 'class', `${b} ${YEAR_WORD[y]} Year (Class)`, b, y, now, now);
  }
}
ensureBuiltinGroups();

// Find group.
export const findGroup = (id: string): any => db.prepare('SELECT * FROM chat_groups WHERE id=? AND archived=0').get(id);
export const isGroupId = (id: string) => id.startsWith('grp-');
const studentsOff = () => process.env.CHAT_STUDENT_CHAT === '0';
const semsOf = (year: number) => [year * 2 - 1, year * 2];

// Faculty teaches in a branch (optionally only the given semesters).
const teachesIn = (userId: string, branch: string, sems?: number[]): boolean =>
  !!db.prepare(`SELECT 1 FROM faculty_subject_assignments a JOIN subjects s ON s.id=a.subject_id WHERE a.user_id=? AND s.branch=?${sems ? ` AND s.semester IN (${sems.join(',')})` : ''} LIMIT 1`).get(userId, branch);
// Department text names the branch? ("CSE", "Computer Science", "Civil Engineering" ...)
const deptIs = (dept: string | null, branch: string) => !!dept && (branch === 'CSE' ? /\bcse\b|computer/i.test(dept) : /civil/i.test(dept));
// Student record of a student login.
const ownStudent = (u: UserRow): { branch: string; semester: number } | undefined =>
  u.student_id ? (db.prepare('SELECT branch, semester FROM students WHERE id=? AND deleted_at IS NULL').get(u.student_id) as any) : undefined;

/** Is this person a member of the group right now? */
export function isMember(u: UserRow | undefined, g: any): boolean {
  if (!u || !g || !u.is_active || g.archived) return false;
  if (u.role === 'student' && studentsOff()) return false;
  if (u.role === 'admin') return true;                                    // the admin is in every group (moderator)
  switch (g.kind) {
    case 'faculty': return u.role === 'faculty';
    case 'branch':
      if (u.role === 'faculty') return deptIs(u.department, g.branch) || teachesIn(u.id, g.branch);
      if (u.role === 'student') return ownStudent(u)?.branch === g.branch;
      return false;
    case 'class': {
      const sems = semsOf(g.year);
      if (u.role === 'faculty') return teachesIn(u.id, g.branch, sems);
      if (u.role === 'student') { const st = ownStudent(u); return !!st && st.branch === g.branch && sems.includes(st.semester); }
      return false;
    }
    case 'custom': return !!db.prepare('SELECT 1 FROM chat_group_members WHERE group_id=? AND user_id=?').get(g.id, u.id);
    default: return false;
  }
}

/** Members of a group (ids), for the member list and the bell. */
export function memberIds(g: any): string[] {
  const off = studentsOff();
  const admins = (db.prepare("SELECT id FROM users WHERE role='admin' AND is_active=1").all() as any[]).map((r) => r.id);
  let rest: string[] = [];
  if (g.kind === 'faculty') rest = (db.prepare("SELECT id FROM users WHERE role='faculty' AND is_active=1").all() as any[]).map((r) => r.id);
  else if (g.kind === 'branch' || g.kind === 'class') {
    const sems = g.kind === 'class' ? semsOf(g.year) : [1, 2, 3, 4, 5, 6];
    const fac = (db.prepare("SELECT id, department FROM users WHERE role='faculty' AND is_active=1").all() as any[])
      .filter((f) => (g.kind === 'branch' && deptIs(f.department, g.branch)) || teachesIn(f.id, g.branch, sems)).map((f) => f.id);
    const stu = off ? [] : (db.prepare(`SELECT u.id FROM users u JOIN students s ON s.id=u.student_id AND s.deleted_at IS NULL
      WHERE u.role='student' AND u.is_active=1 AND s.branch=? AND s.semester IN (${sems.join(',')})`).all(g.branch) as any[]).map((r) => r.id);
    rest = [...fac, ...stu];
  } else if (g.kind === 'custom') {
    rest = (db.prepare(`SELECT m.user_id id FROM chat_group_members m JOIN users u ON u.id=m.user_id AND u.is_active=1 WHERE m.group_id=?${off ? " AND u.role<>'student'" : ''}`).all(g.id) as any[]).map((r) => r.id);
  }
  return [...new Set([...admins, ...rest])];
}

/** May this person add / remove members, rename or delete the group? Admin only, custom groups only. */
export const canManageGroup = (u: { role: string }, g: any) => u.role === 'admin' && g?.kind === 'custom';

// ---------- read state ----------
const lastReadOf = (gid: string, uid: string): number => (db.prepare('SELECT last_read FROM chat_group_reads WHERE group_id=? AND user_id=?').get(gid, uid) as any)?.last_read ?? 0;
const unreadIn = (g: any, uid: string): number =>
  (db.prepare('SELECT COUNT(*) c FROM chat_group_messages WHERE group_id=? AND sender_id<>? AND id>? AND deleted_at IS NULL').get(g.id, uid, lastReadOf(g.id, uid)) as any).c;

/** "I have read everything up to here." Only ever moves forward. */
export function markGroupRead(u: SessionUser, g: any, upTo?: number): { ok: true; lastRead: number } {
  const newest = (db.prepare('SELECT COALESCE(MAX(id),0) m FROM chat_group_messages WHERE group_id=?').get(g.id) as any).m as number;
  const to = Math.min(newest, Number.isInteger(upTo) && (upTo as number) > 0 ? (upTo as number) : newest);
  db.prepare(`INSERT INTO chat_group_reads (group_id,user_id,last_read) VALUES (?,?,?)
    ON CONFLICT(group_id,user_id) DO UPDATE SET last_read=MAX(last_read, excluded.last_read)`).run(g.id, u.id, to);
  return { ok: true, lastRead: lastReadOf(g.id, u.id) };
}

// ---------- list ----------
const lastMsg = (gid: string): any => db.prepare('SELECT * FROM chat_group_messages WHERE group_id=? ORDER BY id DESC LIMIT 1').get(gid);
const KIND_LABEL: Record<string, string> = { faculty: 'Staff group', branch: 'Branch group', class: 'Class group', custom: 'Group' };

/** Same shape as a one-to-one chat (server/chat/service.ts toThreadDto), so the chat screen shows both. */
export function toGroupDto(u: SessionUser, g: any) {
  const m = lastMsg(g.id);
  const members = memberIds(g).length;
  return {
    id: g.id, isGroup: true as const,
    group: { kind: g.kind as string, members, canManage: canManageGroup(u, g), branch: g.branch as string | null, year: g.year as number | null },
    other: { id: g.id, name: g.name, role: 'group' as const, label: `${KIND_LABEL[g.kind] || 'Group'} · ${members} members`, photoUrl: null },
    aboutStudent: null,
    last: m ? { preview: previewOf(m), kind: m.kind, mine: m.sender_id === u.id, at: m.created_at, deleted: !!m.deleted_at, senderName: m.sender_id === u.id ? 'You' : m.sender_name } : null,
    lastAt: g.last_at,
    unread: unreadIn(g, u.id),
    canSend: isMember(userRow(u.id), g),
  };
}

/** The groups I am in. Groups without messages are listed too (so people see them from day one). */
export function listGroups(u: SessionUser) {
  const me = userRow(u.id);
  if (!me) return [];
  return (db.prepare('SELECT * FROM chat_groups WHERE archived=0 ORDER BY last_at DESC').all() as any[]).filter((g) => isMember(me, g)).map((g) => toGroupDto(u, g));
}

/** Unread messages in all my groups (for the number on the chat button). */
export function groupUnreadTotal(u: SessionUser): number {
  const me = userRow(u.id);
  if (!me) return 0;
  return (db.prepare('SELECT * FROM chat_groups WHERE archived=0').all() as any[]).filter((g) => isMember(me, g)).reduce((n, g) => n + unreadIn(g, u.id), 0);
}

// ---------- messages ----------
export function toGroupMessageDto(u: SessionUser, g: any, m: any) {
  const mine = m.sender_id === u.id;
  const gone = !!m.deleted_at;
  return {
    id: m.id, mine, kind: m.kind as 'text' | 'voice' | 'image' | 'file', deleted: gone, at: m.created_at,
    text: gone ? '' : m.body,
    fileUrl: !gone && m.file_id ? `/api/chat/groups/${encodeURIComponent(g.id)}/messages/${m.id}/file` : undefined,
    fileName: !gone && m.file_id ? m.file_name : undefined, mime: !gone && m.file_id ? m.file_mime : undefined, size: !gone && m.file_id ? m.file_size : undefined,
    durationMs: !gone && m.kind === 'voice' ? m.duration_ms : undefined,
    senderName: m.sender_name, senderRole: m.sender_role,
    canDelete: !gone && (mine || u.role === 'admin'),
    deletedByAdmin: gone && !!m.deleted_by && m.deleted_by !== m.sender_id,
  };
}

/** Same paging as one-to-one chats: latest 50 / before=<id> / after=<id>, plus deleted ids since=<time>. */
export function groupMessagesOf(u: SessionUser, g: any, q: { after?: number; before?: number; since?: number } = {}, limit = 50) {
  let rows: any[]; let hasMore = false;
  if (q.after !== undefined) rows = db.prepare('SELECT * FROM chat_group_messages WHERE group_id=? AND id>? ORDER BY id LIMIT 200').all(g.id, q.after) as any[];
  else if (q.before !== undefined) { rows = db.prepare('SELECT * FROM chat_group_messages WHERE group_id=? AND id<? ORDER BY id DESC LIMIT ?').all(g.id, q.before, limit + 1) as any[]; hasMore = rows.length > limit; rows = rows.slice(0, limit).reverse(); }
  else { rows = db.prepare('SELECT * FROM chat_group_messages WHERE group_id=? ORDER BY id DESC LIMIT ?').all(g.id, limit + 1) as any[]; hasMore = rows.length > limit; rows = rows.slice(0, limit).reverse(); }
  const deletedIds = q.since === undefined ? [] : (db.prepare('SELECT id FROM chat_group_messages WHERE group_id=? AND deleted_at IS NOT NULL AND deleted_at>=?').all(g.id, q.since) as any[]).map((r) => r.id);
  return { messages: rows.map((m) => toGroupMessageDto(u, g, m)), hasMore, otherLastRead: null, deletedIds, now: Date.now() };
}

// May write.
function mayWrite(u: SessionUser, g: any): Result<{ me: UserRow }> {
  const me = userRow(u.id);
  if (!g || !isMember(me, g)) return fail(404, 'Chat not found');
  return { ok: true, me: me! };
}

// Insert message.
function insertMessage(u: SessionUser, me: UserRow, g: any, m: { kind: string; body: string; file?: { id: string; name: string; mime: string; size: number }; durationMs?: number }, now: number): number {
  const r = db.prepare('INSERT INTO chat_group_messages (group_id,sender_id,sender_name,sender_role,kind,body,file_id,file_name,file_mime,file_size,duration_ms,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(g.id, u.id, me.name, me.role, m.kind, m.body, m.file?.id ?? null, m.file?.name ?? null, m.file?.mime ?? null, m.file?.size ?? null, m.durationMs ?? null, now);
  const id = Number(r.lastInsertRowid);
  db.prepare('UPDATE chat_groups SET last_at=? WHERE id=?').run(now, g.id);
  markGroupRead(u, g, id);
  return id;
}

// Send text.
export function sendGroupText(u: SessionUser, g: any, text: unknown, now = Date.now()): Result<{ id: number }> {
  const w = mayWrite(u, g); if (!w.ok) return w;
  const body = typeof text === 'string' ? text.replace(/\r\n/g, '\n').trim().slice(0, MAX_TEXT) : '';
  if (!body) return fail(400, 'Write a message first');
  return { ok: true, id: insertMessage(u, w.me, g, { kind: 'text', body }, now) };
}

/** Voice message, photo or file in a group (the bytes are checked by their first bytes, like one-to-one chats). */
export function sendGroupFile(u: SessionUser, g: any, bytes: unknown, rawName: string, durationMs: unknown, caption: unknown, now = Date.now()): Result<{ id: number }> {
  const w = mayWrite(u, g); if (!w.ok) return w;
  const saved = savePending(u.id, bytes, rawName, now, { audio: true });
  if (!saved.ok) return saved;
  const f = saved.file;
  const kind = f.kind === 'audio' ? 'voice' : f.kind === 'image' ? 'image' : 'file';
  const dur = kind === 'voice' ? Math.min(MAX_VOICE_MS, Math.max(0, Math.round(Number(durationMs) || 0))) : undefined;
  if (kind === 'voice' && dur === 0) { removeFile(f.fileId); return fail(400, 'The voice message is empty'); }
  const body = kind === 'voice' || typeof caption !== 'string' ? '' : caption.trim().slice(0, 500);
  let id: number;
  try {
    id = insertMessage(u, w.me, g, { kind, body, file: { id: f.fileId, name: f.name, mime: f.mime, size: f.size }, durationMs: dur }, now);
    db.prepare('UPDATE stored_files SET attached_to=? WHERE id=?').run(`gchat:${id}`, f.fileId);
  } catch (e) { removeFile(f.fileId); throw e; }
  return { ok: true, id };
}

// Find message.
export const findGroupMessage = (gid: string, id: number): any => (Number.isInteger(id) ? db.prepare('SELECT * FROM chat_group_messages WHERE id=? AND group_id=?').get(id, gid) : undefined);

/** Delete for everyone: the writer, or the admin (moderation). Text and file are erased, the row stays. */
export function deleteGroupMessage(u: SessionUser, g: any, m: any, now = Date.now()): Result {
  const me = userRow(u.id);
  if (!g || !m || m.group_id !== g.id || !isMember(me, g)) return fail(404, 'Message not found');
  if (m.sender_id !== u.id && u.role !== 'admin') return fail(403, 'You can delete only your own messages');
  if (m.deleted_at) return { ok: true };
  if (m.file_id) removeFile(m.file_id);
  db.prepare("UPDATE chat_group_messages SET deleted_at=?, deleted_by=?, body='', file_id=NULL, file_name=NULL, file_mime=NULL, file_size=NULL WHERE id=?").run(now, u.id, m.id);
  return { ok: true };
}

/** The file of a group message, for members only. */
export function openGroupMessageFile(u: SessionUser, g: any, m: any): Result<{ path: string; mime: string; name: string; kind: ReturnType<typeof kindOfMime> }> {
  if (!g || !m || m.group_id !== g.id || !isMember(userRow(u.id), g) || m.deleted_at || !m.file_id) return fail(404, 'File not found');
  const f = findFile(m.file_id);
  return f ? { ok: true, path: fileOnDisk(f.id), mime: f.mime, name: f.original_name, kind: kindOfMime(f.mime) } : fail(404, 'The file is no longer available');
}

// ---------- custom groups (admin) ----------
// Valid member ids: active users, at most MAX_GROUP_MEMBERS.
function cleanMembers(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return [];
  const ids = [...new Set(raw.filter((x) => typeof x === 'string' && x.length <= 80))] as string[];
  if (ids.length > MAX_GROUP_MEMBERS) return null;
  return ids.filter((id) => !!db.prepare('SELECT 1 FROM users WHERE id=? AND is_active=1').get(id));
}

/** Admin: make a custom group (e.g. "Sports Team 2026") with any people in it. */
export function createGroup(u: SessionUser, b: any, now = Date.now()): Result<{ id: string }> {
  if (u.role !== 'admin') return fail(403, 'Only the admin can make a group');
  const name = typeof b?.name === 'string' ? b.name.replace(/\s+/g, ' ').trim().slice(0, 80) : '';
  if (name.length < 2) return fail(400, 'Give the group a name');
  const ids = cleanMembers(b?.memberIds);
  if (!ids) return fail(400, `A group can have at most ${MAX_GROUP_MEMBERS} members`);
  const id = `grp-${crypto.randomBytes(6).toString('hex')}`;
  db.exec('BEGIN');
  try {
    db.prepare("INSERT INTO chat_groups (id,kind,name,created_by,created_at,last_at) VALUES (?,'custom',?,?,?,?)").run(id, name, u.id, now, now);
    const add = db.prepare('INSERT OR IGNORE INTO chat_group_members (group_id,user_id,added_by,added_at) VALUES (?,?,?,?)');
    for (const m of ids) add.run(id, m, u.id, now);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  return { ok: true, id };
}

/** Admin: rename a custom group and / or set its members (the full list). */
export function updateGroup(u: SessionUser, g: any, b: any, now = Date.now()): Result<{ added: number; removed: number }> {
  if (!g) return fail(404, 'Group not found');
  if (!canManageGroup(u, g)) return fail(403, g.kind === 'custom' ? 'Only the admin can change a group' : 'Members of this group come from the college records and cannot be edited');
  if (b?.name !== undefined) {
    const name = typeof b.name === 'string' ? b.name.replace(/\s+/g, ' ').trim().slice(0, 80) : '';
    if (name.length < 2) return fail(400, 'Give the group a name');
    db.prepare('UPDATE chat_groups SET name=? WHERE id=?').run(name, g.id);
  }
  let added = 0, removed = 0;
  if (b?.memberIds !== undefined) {
    const ids = cleanMembers(b.memberIds);
    if (!ids) return fail(400, `A group can have at most ${MAX_GROUP_MEMBERS} members`);
    const old = new Set((db.prepare('SELECT user_id FROM chat_group_members WHERE group_id=?').all(g.id) as any[]).map((r) => r.user_id));
    const want = new Set(ids);
    db.exec('BEGIN');
    try {
      for (const id of want) if (!old.has(id)) { db.prepare('INSERT INTO chat_group_members (group_id,user_id,added_by,added_at) VALUES (?,?,?,?)').run(g.id, id, u.id, now); added++; }
      for (const id of old) if (!want.has(id)) { db.prepare('DELETE FROM chat_group_members WHERE group_id=? AND user_id=?').run(g.id, id); removed++; }
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
  }
  return { ok: true, added, removed };
}

/** Admin: delete (archive) a custom group. Its messages stay in the database for the records. */
export function archiveGroup(u: SessionUser, g: any): Result {
  if (!g) return fail(404, 'Group not found');
  if (!canManageGroup(u, g)) return fail(403, 'Only custom groups can be deleted, by the admin');
  db.prepare('UPDATE chat_groups SET archived=1 WHERE id=?').run(g.id);
  return { ok: true };
}

/** Members of a group with names (members and the admin only). */
export function groupMembers(u: SessionUser, g: any): Result<{ members: { id: string; name: string; role: string; label: string }[] }> {
  if (!g || !isMember(userRow(u.id), g)) return fail(404, 'Group not found');
  const rows = memberIds(g).map((id) => db.prepare(`SELECT u.id, u.name, u.role, u.department, s.roll_no, s.branch, s.semester FROM users u LEFT JOIN students s ON s.id=u.student_id WHERE u.id=?`).get(id) as any).filter(Boolean);
  const order: Record<string, number> = { admin: 0, faculty: 1, student: 2, parent: 3 };
  rows.sort((a, b) => order[a.role] - order[b.role] || String(a.name).localeCompare(String(b.name)));
  return { ok: true, members: rows.map((r) => ({ id: r.id, name: r.name, role: r.role,
    label: r.role === 'student' ? `Student · ${r.branch} Sem ${r.semester} · ${r.roll_no}` : r.role === 'faculty' ? `Teacher${r.department ? ` · ${r.department}` : ''}` : r.role === 'admin' ? 'Admin' : 'Parent' })) };
}

/** Admin: find people to put in a custom group (all roles). */
export function searchPeople(u: SessionUser, q: { q?: string; role?: string; branch?: string; semester?: number }) {
  if (u.role !== 'admin') return [];
  const where = ['u.is_active=1'], args: (string | number)[] = [];
  if (['admin', 'faculty', 'student', 'parent'].includes(q.role || '')) { where.push('u.role=?'); args.push(q.role!); }
  if (q.branch === 'CSE' || q.branch === 'Civil') { where.push('(s.branch=? OR (u.role=\'faculty\' AND u.department LIKE ?))'); args.push(q.branch, `%${q.branch}%`); }
  if (Number.isInteger(q.semester)) { where.push('s.semester=?'); args.push(q.semester!); }
  const text = (q.q || '').trim().toLowerCase().slice(0, 60);
  if (text) { where.push('(LOWER(u.name) LIKE ? OR LOWER(u.username) LIKE ? OR s.roll_no LIKE ?)'); args.push(`%${text}%`, `%${text}%`, `%${text}%`); }
  return (db.prepare(`SELECT u.id, u.name, u.role, u.department, s.roll_no, s.branch, s.semester FROM users u LEFT JOIN students s ON s.id=u.student_id
    WHERE ${where.join(' AND ')} ORDER BY CASE u.role WHEN 'admin' THEN 0 WHEN 'faculty' THEN 1 WHEN 'student' THEN 2 ELSE 3 END, s.branch, s.semester, s.roll_no, u.name LIMIT 300`).all(...args) as any[])
    .map((r) => ({ id: r.id, name: r.name, role: r.role, label: r.role === 'student' ? `${r.branch} Sem ${r.semester} · ${r.roll_no}` : r.role === 'faculty' ? `Teacher${r.department ? ` · ${r.department}` : ''}` : r.role === 'admin' ? 'Admin' : 'Parent' }));
}

// ---------- the bell ----------
/** One bell message per member per group until they open it. No message text on the lock screen. */
export function notifyGroupMessage(u: SessionUser, g: any, now = Date.now()): number {
  let n = 0;
  for (const id of memberIds(g)) {
    if (id === u.id) continue;
    if (notifyUser(id, { kind: 'chat', title: `New message in ${g.name}`, body: `${u.name} wrote in the group. Open Messages to read it.`, url: '/', dedupeKey: `gchat:${g.id}:${id}:after:${lastReadOf(g.id, id)}` }, now)) n++;
  }
  return n;
}
