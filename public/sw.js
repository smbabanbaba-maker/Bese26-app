const CACHE_NAME = 'bese26-shell-v6-push';
const APP_SHELL = ['/', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached || caches.match('/'))));
});

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch { payload = { body: event.data?.text() || '' }; }
  const title = payload.title || 'New on Bese26';
  const options = {
    body: payload.body || 'New marketplace updates are waiting for you.',
    icon: '/images/bese26-logo-icon.webp',
    badge: '/images/bese26-logo-icon.webp',
    image: payload.image || payload.images?.[0] || undefined,
    dir: 'auto',
    vibrate: [120, 60, 120],
    tag: payload.tag || (payload.type === 'new_marketplace_listing' ? 'bese26-marketplace-listings' : `bese26-${payload.notificationId || Date.now()}`),
    renotify: true,
    data: { url: payload.url || '/', notificationId: payload.notificationId || '' },
    actions: [
      { action: 'open', title: 'View listings' },
      { action: 'dismiss', title: 'Later' },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = clients.find((client) => 'focus' in client);
    if (existing) {
      await existing.focus();
      if ('navigate' in existing) await existing.navigate(target);
      return;
    }
    await self.clients.openWindow(target);
  })());
});
