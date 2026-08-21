const CACHE_NAME = 'lomecan-v9'; // Incrementa versión para forzar actualización

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
        base + 'icons/icon-192.png',
        base + 'icons/icon-512.png'
      ];
      console.log('🔧 SW instalando...', precacheUrls);
      return cache.addAll(precacheUrls).catch(err => console.warn('Precarga parcial:', err));
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

  // No interceptar videos ni archivos externos con problemas de CORS
  if (url.hostname.includes('cloudfront.net') || url.pathname.endsWith('.mp4')) {
    // Dejar pasar sin interceptar (el navegador los maneja)
    return;
  }

  // SUPABASE: sin cachear
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request).catch(() => new Response(JSON.stringify({ error: 'No hay conexión' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }))
    );
    return;
  }

  // Ignorar extensiones de Chrome
  if (request.url.startsWith('chrome-extension://')) return;

  // Navegación: network-first
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

  // Estáticos: cache-first
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
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});