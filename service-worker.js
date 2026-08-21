const CACHE_NAME = 'lomecan-v4'; // Incrementa versión para forzar actualización

const getBaseUrl = () => {
  return self.location.pathname.replace(/\/[^/]*$/, '/');
};

// Función para saber si la URL es un video MP4 (u otro archivo grande cacheable)
const isCacheableVideo = (url) => {
  return url.pathname.endsWith('.mp4') || url.hostname.includes('cloudfront.net');
};

// ============================================================
// INSTALACIÓN: precargar recursos esenciales
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
      console.log('🔧 Service Worker: Instalando...', precacheUrls);
      return cache.addAll(precacheUrls).catch(err => {
        console.warn('⚠️ Error precargando algunos recursos:', err);
      });
    })
  );
  self.skipWaiting();
});

// ============================================================
// FETCH: estrategia según tipo de recurso
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // === 1. VIDEOS MP4 / CLOUDFRONT: cache-first ===
  if (isCacheableVideo(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            // Actualizar en segundo plano (stale-while-revalidate)
            fetch(request).then((response) => {
              if (response && response.status === 200) {
                cache.put(request, response.clone());
              }
            }).catch(() => {});
            return cachedResponse;
          }

          return fetch(request).then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          }).catch(() => {
            return new Response('Sin conexión', { status: 503 });
          });
        });
      })
    );
    return;
  }

  // === 2. SUPABASE: NO CACHEAR (excepto storage si quieres, se puede extender) ===
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

  // === 3. IGNORAR extensiones de Chrome ===
  if (request.url.startsWith('chrome-extension://')) return;

  // === 4. NAVEGACIÓN (HTML): network-first con fallback a caché ===
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

  // === 5. RECURSOS ESTÁTICOS: cache-first ===
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
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