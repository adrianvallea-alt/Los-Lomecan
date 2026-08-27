// public/service-worker.js
const CACHE_NAME = 'lomecan-v13';

const getBaseUrl = () => {
  return self.location.pathname.replace(/\/[^/]*$/, '/');
};

// ============================================================
// INSTALACIÓN: Pre-cachear assets esenciales e instalar de inmediato
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
  // Forzar activación inmediata sin esperar a que se cierren pestañas
  self.skipWaiting();
});

// ============================================================
// ACTIVACIÓN: Limpiar cachés antiguas y tomar control de clientes
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('🧹 Eliminando caché antigua:', key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ============================================================
// FETCH: Estrategia Network-First para Navegación y Stale-While-Revalidate
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // APIs Externas, Supabase, Videos y Extensiones: Directo a la red
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

  // 1. Navegación (HTML principal): Network-First forzado para capturar releases de GitHub
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
        .catch(() => {
          // Si no hay red, servir index.html en caché
          return caches.match(getBaseUrl() + 'index.html');
        })
    );
    return;
  }

  // 2. Archivos estáticos y chunks: Cache con fallback a red y actualización en segundo plano
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