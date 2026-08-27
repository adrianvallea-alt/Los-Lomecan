// public/service-worker.js
const CACHE_NAME = 'lomecan-v14';

const getBaseUrl = () => {
  return self.location.pathname.replace(/\/[^/]*$/, '/');
};

// ============================================================
// INSTALACIÓN
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const base = getBaseUrl();
      const precacheUrls = [
        base,
        base + 'index.html',
        base + 'manifest.json',
        base + 'favicon-16x16.png',
        base + 'favicon-32x32.png',
        base + 'icons/icon-192.png',
        base + 'icons/icon-512.png'
      ];
      return cache.addAll(precacheUrls).catch((err) => {
        console.warn('⚠️ Fallo menor en precache inicial:', err);
      });
    })
  );
  self.skipWaiting();
});

// ============================================================
// ACTIVACIÓN: Limpiar todas las cachés anteriores
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('🧹 Purgando caché obsoleta:', key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ============================================================
// FETCH: Network-First garantizado para capturar actualizaciones
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('openfoodfacts.org') ||
    url.hostname.includes('dicebear.com') ||
    url.hostname.includes('r2.dev') ||
    url.hostname.includes('youtube.com') ||
    url.hostname.includes('googlevideo.com') ||
    request.url.startsWith('chrome-extension://')
  ) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(getBaseUrl() + 'index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && request.method === 'GET') {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});