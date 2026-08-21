const CACHE_NAME = 'lomecan-v3'; // Incrementa la versión para forzar actualización

// ============================================================
// Función para obtener la URL base de la app (relativa al SW)
// ============================================================
const getBaseUrl = () => {
  return self.location.pathname.replace(/\/[^/]*$/, '/');
};

// ============================================================
// INSTALACIÓN: precargar recursos esenciales con URLs correctas
// ============================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const base = getBaseUrl();
      const precacheUrls = [
        base,                    // página principal (index.html)
        base + 'index.html',
        base + 'manifest.json',
        base + 'favicon-16x16.png',
        base + 'icons/icon-192.png',
        base + 'icons/icon-512.png'
      ];

      console.log('🔧 Service Worker: Instalando...', precacheUrls);
      return cache.addAll(precacheUrls).catch(err => {
        console.warn('⚠️ Error precargando algunos recursos:', err);
        // No lanzamos error para que la instalación continúe
      });
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
          const base = getBaseUrl();
          return caches.match(base + 'index.html').then(cached => {
            if (cached) {
              console.log('📄 Sirviendo index.html desde caché (offline)');
              return cached;
            }
            // Último recurso: intentar con la URL original
            return caches.match('/index.html').then(cached2 => {
              if (cached2) return cached2;
              return new Response(
                '<h1>Sin conexión</h1><p>La aplicación no está disponible offline.</p>',
                { headers: { 'Content-Type': 'text/html' } }
              );
            });
          });
        })
    );
    return;
  }

  // === 4. RECURSOS ESTÁTICOS: cache-first con stale-while-revalidate ===
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Actualizar en segundo plano
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