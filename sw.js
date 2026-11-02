// Keeps Cart & Cook working offline: the app files, fonts and the Gemma runtime are cached.
// The 2 GB model itself is stored separately by the app (private file storage), not here.

const SHELL_CACHE = 'cc-shell-v4';
const RUNTIME_CACHE = 'cc-runtime-v1';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './gemma.js',
  './stores.js',
  './startup-guard.js',
  './diagnostics.js',
  './limits.js',
  './download-worker.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];
const RUNTIME_HOSTS = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('cc-') && k !== SHELL_CACHE && k !== RUNTIME_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // App files: answer from cache at once, refresh in the background.
    event.respondWith(staleWhileRevalidate(req, req.mode === 'navigate' ? './index.html' : null));
    return;
  }
  if (RUNTIME_HOSTS.includes(url.hostname)) {
    // Pinned library versions and fonts never change: cache first.
    event.respondWith(cacheFirst(req));
  }
  // Everything else (model download, map searches) goes straight to the network.
});

async function staleWhileRevalidate(req, fallbackPath) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = (await cache.match(req, { ignoreSearch: true })) || (fallbackPath && (await cache.match(fallbackPath)));
  const network = fetch(req)
    .then((res) => {
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  if (cached) {
    network.catch(() => {});
    return cached;
  }
  const res = await network;
  return res || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
}

async function cacheFirst(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()).catch(() => {});
  return res;
}

// Tapping the shopping-list notification opens the app on the List tab.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || './#list', self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if ('focus' in w) {
          w.postMessage({ type: 'open-list' });
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
