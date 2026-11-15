// Server calls for the chat (Step 13). The server decides who may talk to whom; a chat is visible only to its two people.
import { call } from './academicApi';

// Data shape: chat role.
export type ChatRole = 'admin' | 'faculty' | 'student' | 'parent';
// Data shape: chat person.
export interface ChatPerson { id: string; name: string; role: ChatRole | 'group'; label: string; photoUrl: string | null }
// Data shape: chat thread.
export interface ChatThread {
  id: string; other: ChatPerson;
  isGroup?: boolean;                                                  // group chat (id starts with "grp-")
  group?: { kind: 'faculty' | 'branch' | 'class' | 'custom'; members: number; canManage: boolean; branch: string | null; year: number | null };
  aboutStudent: { id: string; name: string; rollNo: string; className: string } | null;
  last: { preview: string; kind: string; mine: boolean; at: number; deleted: boolean; senderName?: string } | null;
  lastAt: number; unread: number; canSend: boolean;
}
// Data shape: chat message.
export interface ChatMessage {
  id: number; mine: boolean; kind: 'text' | 'voice' | 'image' | 'file'; deleted: boolean; at: number; text: string;
  fileUrl?: string; fileName?: string; mime?: string; size?: number; durationMs?: number; status?: 'sent' | 'seen';
  canDelete?: boolean;                                                // my own message, or (groups) the admin = moderation
  senderName?: string; senderRole?: string; deletedByAdmin?: boolean;  // groups only
}
// Data shape: a group member / a person the admin can add to a group.
export interface GroupMember { id: string; name: string; role: ChatRole; label: string }
// Data shape: chat page.
export interface ChatPage { thread: ChatThread; messages: ChatMessage[]; hasMore: boolean; otherLastRead: number | null; deletedIds: number[]; now: number }
// Data shape: chat contact.
export interface ChatContact { userId: string; name: string; role: ChatRole; label: string; studentId: string; studentName: string | null; photoUrl: string | null; threadId: string | null }

// Q.
const q = (o: Record<string, string | number | undefined>) => {
  const p = Object.entries(o).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
  return p.length ? `?${p.join('&')}` : '';
};

export const chatApi = {
  unread: () => call<{ unread: number }>('GET', '/api/chat/unread'),
  threads: () => call<ChatThread[]>('GET', '/api/chat/threads'),
  contacts: (f: { q?: string; branch?: string; semester?: number } = {}) => call<{ contacts: ChatContact[]; more: boolean }>('GET', `/api/chat/contacts${q(f)}`),
  open: (userId: string, studentId: string) => call<ChatThread>('POST', '/api/chat/threads', { userId, studentId }),
  messages: (id: string, o: { after?: number; before?: number; since?: number } = {}) => call<ChatPage>('GET', `/api/chat/threads/${encodeURIComponent(id)}/messages${q(o)}`),
  read: (id: string) => call<{ ok: true; lastRead: number }>('POST', `/api/chat/threads/${encodeURIComponent(id)}/read`, {}),
  sendText: (id: string, text: string) => call<{ id: number }>('POST', `/api/chat/threads/${encodeURIComponent(id)}/messages`, { text }),
  remove: (threadId: string, messageId: number) => call<{ ok: true }>('DELETE', `/api/chat/threads/${encodeURIComponent(threadId)}/messages/${messageId}`),
  // groups
  members: (groupId: string) => call<GroupMember[]>('GET', `/api/chat/groups/${encodeURIComponent(groupId)}/members`),
  people: (f: { q?: string; role?: string; branch?: string; semester?: number } = {}) => call<GroupMember[]>('GET', `/api/chat/people${q(f)}`),
  createGroup: (name: string, memberIds: string[]) => call<ChatThread>('POST', '/api/chat/groups', { name, memberIds }),
  updateGroup: (id: string, b: { name?: string; memberIds?: string[] }) => call<ChatThread>('PUT', `/api/chat/groups/${encodeURIComponent(id)}`, b),
  deleteGroup: (id: string) => call<{ ok: true }>('DELETE', `/api/chat/groups/${encodeURIComponent(id)}`),

  /** Voice message, photo or file: the bytes are the request body. */
  async upload(id: string, blob: Blob, name: string, extra: { durationMs?: number; caption?: string } = {}): Promise<{ ok: true; data: { id: number } } | { ok: false; error: string; status: number }> {
    try {
      const res = await fetch(`/api/chat/threads/${encodeURIComponent(id)}/upload`, {
        method: 'POST', credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-File-Name': encodeURIComponent(name),
          ...(extra.durationMs ? { 'X-Duration-Ms': String(Math.round(extra.durationMs)) } : {}),
          ...(extra.caption ? { 'X-Caption': encodeURIComponent(extra.caption) } : {}),
        },
        body: blob,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, status: res.status, error: json?.error || `Upload failed (${res.status})` };
      return { ok: true, data: json };
    } catch {
      return { ok: false, status: 0, error: 'Cannot reach the server. Check your connection.' };
    }
  },
};
