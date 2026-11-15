// Browser side of Step 4: the server's notification list and "allow notifications on this device".
export interface PushConfig { enabled: boolean; publicKey: string | null; consent: boolean; needsParent: boolean }
// Data shape: push device.
export interface PushDevice { id: number; userAgent: string | null; createdAt: number; lastOkAt: number | null }
// Data shape: result.
type Result<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

// Call.
async function call<T>(method: string, url: string, body?: unknown): Promise<Result<T>> {
  try {
    const res = await fetch(url, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, error: json?.error || `Request failed (${res.status})` };
    return { ok: true, data: json as T };
  } catch { return { ok: false, status: 0, error: 'Cannot reach the server. Check your connection.' }; }
}

// Push supported.
export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// Key bytes.
const keyBytes = (b64url: string) => {
  const pad = '='.repeat((4 - (b64url.length % 4)) % 4);
  const raw = atob((b64url + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

// Registration.
async function registration() {
  await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
}

// This device subscription.
export async function thisDeviceSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  return reg ? reg.pushManager.getSubscription() : null;
}

// Enable this device.
export async function enableThisDevice(publicKey: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!pushSupported()) return { ok: false, error: 'This browser cannot show notifications.' };
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, error: 'Notifications are blocked in this browser. Allow them in the site settings and try again.' };
  try {
    const reg = await registration();
    const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
    const r = await call('POST', '/api/push/subscribe', { subscription: sub.toJSON() });
    if (!r.ok) { await sub.unsubscribe().catch(() => {}); return { ok: false, error: r.error }; }
    return { ok: true };
  } catch (e) { return { ok: false, error: 'Could not turn on notifications on this device.' }; }
}

// Disable this device.
export async function disableThisDevice(): Promise<void> {
  const sub = await thisDeviceSubscription();
  if (!sub) return;
  await call('POST', '/api/push/unsubscribe', { endpoint: sub.endpoint });
  await sub.unsubscribe().catch(() => {});
}

export const pushApi = {
  config: () => call<PushConfig>('GET', '/api/push/config'),
  devices: () => call<PushDevice[]>('GET', '/api/push/devices'),
  removeDevice: (id: number) => call<{ ok: true }>('DELETE', `/api/push/devices/${id}`),
  test: () => call<{ ok: true; pushEnabled: boolean }>('POST', '/api/push/test', {}),
  list: () => call<{ items: { id: number; kind: string; title: string; body: string; createdAt: number; read: boolean }[]; unread: number }>('GET', '/api/notifications?limit=20'),
  markRead: (ids: number[]) => call<{ ok: true }>('POST', '/api/notifications/read', { ids }),
};
