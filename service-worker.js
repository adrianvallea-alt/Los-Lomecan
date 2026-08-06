const CACHE_NAME = 'lomecan-v2';

// ============================================================
// INSTALACIÓN: precargar recursos esenciales
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('🔧 Service Worker: Instalando...');
      return cache.addAll([
        '/',
        '/index.html',
        '/manifest.json',
        '/favicon-16x16.png',
        '/icons/icon-192.png',
        '/icons/icon-512.png'
      ]).catch(err => console.warn('⚠️ Error precargando:', err));
    })
  );
  self.skipWaiting();
});

// ============================================================
// FETCH: estrategia según el tipo de recurso
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // === 1. NO CACHEAR peticiones a Supabase (API) ===
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request).catch(() => {
        // Si falla la red, devolver un error (no caché)
        return new Response(
          JSON.stringify({ error: 'No hay conexión a internet' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // === 2. IGNORAR extensiones de Chrome ===
  if (request.url.startsWith('chrome-extension://')) return;

  // === 3. NAVEGACIÓN (HTML): network-first con fallback a caché ===
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          return caches.match('/index.html').then(cached => {
            if (cached) {
              console.log('📄 Sirviendo index.html desde caché (offline)');
              return cached;
            }
            return new Response(
              '<h1>Sin conexión</h1><p>La aplicación no está disponible offline.</p>',
              { headers: { 'Content-Type': 'text/html' } }
            );
          });
        })
    );
    return;
  }

  // === 4. RECURSOS ESTÁTICOS: cache-first ===
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Si está en caché, devolverlo y actualizar en segundo plano (stale-while-revalidate)
        fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      // Si no está en caché, ir a la red
      return fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          console.warn('⚠️ Recurso no disponible:', request.url);
          return new Response('Recurso no disponible', { status: 404 });
        });
    })
  );
});

// ============================================================
// ACTIVACIÓN: limpiar cachés antiguas
// ============================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});