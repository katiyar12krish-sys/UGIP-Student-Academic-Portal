// Web Push sending. The `web-push` package does the encryption (RFC 8291) and VAPID signing (RFC 8292); it is loaded only when
// the first message is sent, so the server also starts (and the tests run) before `npm install` has fetched it.
export interface PushSub { endpoint: string; p256dh: string; auth: string }
// Data shape: push message.
export interface PushMessage { title: string; body: string; url?: string; tag?: string }
// Data shape: push result.
export type PushResult = { ok: true } | { ok: false; gone: boolean; error: string };
// Data shape: sender.
export type Sender = (sub: PushSub, msg: PushMessage) => Promise<PushResult>;

// Vapid.
export const vapid = () => ({
  publicKey: process.env.VAPID_PUBLIC_KEY || '', privateKey: process.env.VAPID_PRIVATE_KEY || '',
  subject: process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
});
// Push enabled.
export const pushEnabled = () => { const v = vapid(); return !!v.publicKey && !!v.privateKey; };

let override: Sender | null = null;
// Set push sender.
export const setPushSender = (s: Sender | null) => { override = s; };   // tests

// Real sender.
const realSender: Sender = async (sub, msg) => {
  try {
    const webpush = (await import('web-push')).default;
    const v = vapid();
    webpush.setVapidDetails(v.subject, v.publicKey, v.privateKey);
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(msg), { TTL: 24 * 3600, urgency: 'normal', timeout: 10_000 });
    return { ok: true };
  } catch (e: any) {
    const code = Number(e?.statusCode);
    return { ok: false, gone: code === 404 || code === 410, error: `${code || ''} ${String(e?.message || e)}`.trim().slice(0, 160) };
  }
};
// Send push.
export const sendPush: Sender = (sub, msg) => (override || realSender)(sub, msg);
