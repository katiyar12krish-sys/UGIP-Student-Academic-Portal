// ===================================================================================================
// Chat routes (Step 13). Every route is for the two people of the chat only.
// ===================================================================================================
import { Router, raw } from 'express';
import { requireAuth, requireRole } from '../auth/middleware';
import { audit } from '../auth/service';
import { hit } from '../auth/rateLimit';
import { MAX_UPLOAD_BYTES } from '../files/store';
import {
  contactsFor, openThread, listThreads, findThread, isParticipant, toThreadDto, messagesOf, markRead, sendText, sendFile,
  findMessage, deleteMessage, openMessageFile, unreadTotal, notifyNewMessage,
} from '../chat/service';
import {
  isGroupId, findGroup, isMember, listGroups, toGroupDto, groupMessagesOf, markGroupRead, sendGroupText, sendGroupFile, findGroupMessage, deleteGroupMessage,
  openGroupMessageFile, groupUnreadTotal, notifyGroupMessage, createGroup, updateGroup, archiveGroup, groupMembers, searchPeople,
} from '../chat/groups';
import { userRow } from '../chat/service';

export const chatRouter = Router();
// Quiet.
const quiet = (what: string, fn: () => unknown) => { try { fn(); } catch (e) { console.warn(`[notify] ${what} failed:`, (e as Error).message); } };
// Num.
const num = (v: unknown): number | undefined => { const n = Number(v); return v !== undefined && v !== '' && Number.isInteger(n) && n >= 0 ? n : undefined; };

// Everything here is for the two people of a chat (or the members of a group) only. A chat that is not yours is "not found".
// Group ids start with "grp-"; the same /chat/threads/:id/... routes serve one-to-one chats and groups.
chatRouter.get('/chat/unread', requireAuth, (req, res) => res.json({ unread: unreadTotal(req.user!) + groupUnreadTotal(req.user!) }));
// GET /api/chat/threads  (who: any signed-in user) - my one-to-one chats and my groups, newest first
chatRouter.get('/chat/threads', requireAuth, (req, res) => {
  const all = [...listGroups(req.user!), ...listThreads(req.user!)] as { lastAt: number }[];
  res.json(all.sort((a, b) => b.lastAt - a.lastAt));
});
// GET /api/chat/contacts  (who: any signed-in user)
chatRouter.get('/chat/contacts', requireAuth, (req, res) =>
  res.json(contactsFor(req.user!, { q: String(req.query.q || ''), branch: String(req.query.branch || ''), semester: num(req.query.semester) })));

// POST /api/chat/threads  (who: any signed-in user)
chatRouter.post('/chat/threads', requireAuth, (req, res) => {
  if (!hit(`chatnew:${req.user!.id}`, 30, 86400_000).allowed) return res.status(429).json({ error: 'You have started many chats today. Please try tomorrow.' });
  const r = openThread(req.user!, req.body || {});
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  if (r.created) audit(req.user!.username, 'chat_started', 'chat', r.id);
  res.status(r.created ? 201 : 200).json(toThreadDto(req.user!, findThread(r.id)));
});

// Mine: a one-to-one chat I am in. (Groups are answered by myGroup.)
const mine = (req: any, res: any) => {
  const t = findThread(String(req.params.id));
  if (!t || !isParticipant(req.user!, t)) { res.status(404).json({ error: 'Chat not found' }); return null; }
  return t;
};
// My group: a group I am a member of.
const myGroup = (req: any, res: any) => {
  const g = findGroup(String(req.params.id));
  if (!g || !isMember(userRow(req.user!.id), g)) { res.status(404).json({ error: 'Chat not found' }); return null; }
  return g;
};

// GET /api/chat/threads/:id/messages  (who: the two people / the group members)
chatRouter.get('/chat/threads/:id/messages', requireAuth, (req, res) => {
  const q = { after: num(req.query.after), before: num(req.query.before), since: num(req.query.since) };
  if (isGroupId(String(req.params.id))) { const g = myGroup(req, res); if (!g) return; return res.json({ thread: toGroupDto(req.user!, g), ...groupMessagesOf(req.user!, g, q) }); }
  const t = mine(req, res); if (!t) return;
  res.json({ thread: toThreadDto(req.user!, t), ...messagesOf(req.user!, t, q) });
});

// POST /api/chat/threads/:id/read  (who: the two people / the group members)
chatRouter.post('/chat/threads/:id/read', requireAuth, (req, res) => {
  if (isGroupId(String(req.params.id))) { const g = myGroup(req, res); if (!g) return; return res.json(markGroupRead(req.user!, g, num(req.body?.upTo))); }
  const t = mine(req, res); if (!t) return;
  res.json(markRead(req.user!, t, num(req.body?.upTo)));
});

// POST /api/chat/threads/:id/messages  (who: the two people / the group members)
chatRouter.post('/chat/threads/:id/messages', requireAuth, (req, res) => {
  const group = isGroupId(String(req.params.id));
  const t = group ? myGroup(req, res) : mine(req, res); if (!t) return;
  if (!hit(`chatmsg:${req.user!.id}`, 60, 10 * 60_000).allowed) return res.status(429).json({ error: 'You are sending messages very fast. Please wait a minute.' });
  const r = group ? sendGroupText(req.user!, t, req.body?.text) : sendText(req.user!, t, req.body?.text);
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  quiet('chat', () => (group ? notifyGroupMessage(req.user!, t) : notifyNewMessage(req.user!, t, r.id)));
  res.status(201).json({ id: r.id });
});

// DELETE /api/chat/threads/:id/messages/:mid  (who: the writer; in a group also the admin = moderation)
chatRouter.delete('/chat/threads/:id/messages/:mid', requireAuth, (req, res) => {
  if (isGroupId(String(req.params.id))) {
    const g = myGroup(req, res); if (!g) return;
    const m = findGroupMessage(g.id, Number(req.params.mid));
    if (!m) return res.status(404).json({ error: 'Message not found' });
    const r = deleteGroupMessage(req.user!, g, m);
    if (!r.ok) return res.status(r.status).json({ error: r.error });
    audit(req.user!.username, m.sender_id === req.user!.id ? 'group_message_deleted' : 'group_message_moderated', 'chat_group', g.id, `#${m.id}`);
    return res.json({ ok: true });
  }
  const t = mine(req, res); if (!t) return;
  const m = findMessage(Number(req.params.mid));
  if (!m || m.thread_id !== t.id) return res.status(404).json({ error: 'Message not found' });
  const r = deleteMessage(req.user!, m);
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'chat_message_deleted', 'chat', String(m.thread_id), `#${m.id}`);
  res.json({ ok: true });
});

// ---------- groups: members, and custom groups made by the admin ----------
// GET /api/chat/groups/:id/members  (who: members of the group)
chatRouter.get('/chat/groups/:id/members', requireAuth, (req, res) => {
  const r = groupMembers(req.user!, findGroup(String(req.params.id)));
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  res.json(r.members);
});
// GET /api/chat/people  (who: admin) - find people to add to a custom group
chatRouter.get('/chat/people', requireRole('admin'), (req, res) =>
  res.json(searchPeople(req.user!, { q: String(req.query.q || ''), role: String(req.query.role || ''), branch: String(req.query.branch || ''), semester: num(req.query.semester) })));
// POST /api/chat/groups  (who: admin) {name, memberIds}
chatRouter.post('/chat/groups', requireRole('admin'), (req, res) => {
  const r = createGroup(req.user!, req.body || {});
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'chat_group_created', 'chat_group', r.id, String(req.body?.name || '').slice(0, 80));
  res.status(201).json(toGroupDto(req.user!, findGroup(r.id)));
});
// PUT /api/chat/groups/:id  (who: admin, custom groups) {name?, memberIds?}
chatRouter.put('/chat/groups/:id', requireRole('admin'), (req, res) => {
  const g = findGroup(String(req.params.id));
  const r = updateGroup(req.user!, g, req.body || {});
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'chat_group_updated', 'chat_group', g.id, `+${r.added} -${r.removed}`);
  res.json(toGroupDto(req.user!, findGroup(g.id)));
});
// DELETE /api/chat/groups/:id  (who: admin, custom groups)
chatRouter.delete('/chat/groups/:id', requireRole('admin'), (req, res) => {
  const g = findGroup(String(req.params.id));
  const r = archiveGroup(req.user!, g);
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'chat_group_deleted', 'chat_group', g.id);
  res.json({ ok: true });
});

// Voice message / photo / file: the bytes are the request body (any Content-Type). Headers: X-File-Name (URL-encoded), X-Duration-Ms (voice), X-Caption (URL-encoded).
chatRouter.post('/chat/threads/:id/upload', requireAuth, (req, res, next) => {
  const t = isGroupId(String(req.params.id)) ? myGroup(req, res) : mine(req, res); if (!t) return;
  if (!hit(`chatfile:${req.user!.id}`, 40, 3600_000).allowed) return res.status(429).json({ error: 'Too many voice messages / files in an hour. Please wait.' });
  (req as any).chatThread = t;
  next();
}, raw({ type: () => true, limit: MAX_UPLOAD_BYTES }), (req, res) => {
  // Dec.
  const dec = (h: unknown) => { try { return decodeURIComponent(String(h || '')); } catch { return ''; } };
  const t = (req as any).chatThread;
  const group = isGroupId(String(req.params.id));
  const r = (group ? sendGroupFile : sendFile)(req.user!, t, req.body, dec(req.headers['x-file-name']), req.headers['x-duration-ms'], dec(req.headers['x-caption']));
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  quiet('chat', () => (group ? notifyGroupMessage(req.user!, t) : notifyNewMessage(req.user!, t, r.id)));
  res.status(201).json({ id: r.id });
});
chatRouter.use((err: any, _req: any, res: any, next: any) => {
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: `The file is larger than ${Math.round(MAX_UPLOAD_BYTES / 1048576)} MB` });
  if (err?.type?.startsWith?.('request.') || err?.type === 'entity.verify.failed') return res.status(400).json({ error: 'The upload was interrupted. Please try again.' });
  next(err);
});

// Msg of.
const msgOf = (req: any, res: any) => {
  const m = findMessage(Number(req.params.mid));
  const t = m && findThread(m.thread_id);
  if (!m || !t || !isParticipant(req.user!, t)) { res.status(404).json({ error: 'Message not found' }); return null; }
  return m;
};
// DELETE /api/chat/messages/:mid  (who: any signed-in user)
chatRouter.delete('/chat/messages/:mid', requireAuth, (req, res) => {
  const m = msgOf(req, res); if (!m) return;
  const r = deleteMessage(req.user!, m);
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  audit(req.user!.username, 'chat_message_deleted', 'chat', String(m.thread_id), `#${m.id}`);
  res.json({ ok: true });
});

// Voice and photos open in the browser (voice supports seeking); other files are saved.
const sendChatFile = (req: any, res: any, r: ReturnType<typeof openMessageFile>) => {
  if (!r.ok) return res.status(r.status).json({ error: r.error });
  const inline = (r.kind === 'audio' || r.kind === 'image' || r.kind === 'pdf') && req.query.download !== '1';
  const ascii = r.name.replace(/[^\x20-\x7e]/g, '_');
  res.setHeader('Content-Type', r.mime);
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(r.name)}`);
  res.setHeader('Cache-Control', 'private, no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(r.path);
};
// GET /api/chat/messages/:mid/file  (who: the two people of the chat)
chatRouter.get('/chat/messages/:mid/file', requireAuth, (req, res) => {
  const m = msgOf(req, res); if (!m) return;
  sendChatFile(req, res, openMessageFile(req.user!, m));
});
// GET /api/chat/groups/:id/messages/:mid/file  (who: members of the group)
chatRouter.get('/chat/groups/:id/messages/:mid/file', requireAuth, (req, res) => {
  const g = myGroup(req, res); if (!g) return;
  sendChatFile(req, res, openGroupMessageFile(req.user!, g, findGroupMessage(g.id, Number(req.params.mid))));
});
