const CACHE_NAME = 'gla-campus-navigator-shell-v1';
const APP_ROOT = new URL('./', self.registration.scope);
const APP_SHELL = [
  APP_ROOT.pathname,
  new URL('manifest.webmanifest', APP_ROOT).pathname,
  new URL('icons/icon-192.png', APP_ROOT).pathname,
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(error => console.warn('App shell cache is incomplete:', error))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('gla-campus-navigator-') && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith(new URL('src/', APP_ROOT).pathname) || url.pathname.startsWith(new URL('@vite/', APP_ROOT).pathname) || url.searchParams.has('t')) return;

  event.respondWith(
    fetch(request).then(response => {
      if (response.ok && (request.mode === 'navigate' || ['script', 'style', 'image', 'font'].includes(request.destination))) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') return caches.match(APP_ROOT.pathname);
      return Response.error();
    })
  );
});
