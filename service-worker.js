// public/service-worker.js
const CACHE_NAME = 'lomecan-v10'; // Incrementada versión para forzar actualización limpia

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
      return cache.addAll(precacheUrls).catch(() => {});
    })
  );
  self.skipWaiting();
});

// ============================================================
// FETCH
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. SUPABASE y APIs Externas: NO interceptar con respuestas 503 falsas
  // Dejar que el código de la app gestione el offline directamente con LocalStorage
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('openfoodfacts.org') ||
    url.hostname.includes('r2.dev') ||
    url.hostname.includes('youtube.com') ||
    request.url.startsWith('chrome-extension://')
  ) {
    return;
  }

  // 2. Navegación (HTML): Network-first con fallback a index.html en caché
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(getBaseUrl() + 'index.html'))
    );
    return;
  }

  // 3. Archivos estáticos de la app (JS, CSS, Imágenes locales): Cache-first
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});

// ============================================================
// ACTIVACIÓN
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});