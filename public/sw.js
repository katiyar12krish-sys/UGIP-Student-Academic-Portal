// Service worker: shows push notifications and opens the portal when one is tapped. It caches nothing and never touches /api.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = {}; }
  event.waitUntil(self.registration.showNotification(String(d.title || 'UGIP Portal').slice(0, 120), {
    body: String(d.body || '').slice(0, 300),
    tag: d.tag || undefined,
    data: { url: typeof d.url === 'string' ? d.url : '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin);
  if (target.origin !== self.location.origin) return;                       // never navigate away from the portal
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) if (new URL(c.url).origin === target.origin && 'focus' in c) return c.focus();
    return self.clients.openWindow(target.href);
  }));
});
