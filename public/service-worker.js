// public/service-worker.js
const CACHE_NAME = 'lomecan-v1';
const urlsToPrecache = ['/favicon.svg'];

// Instalación: precarga recursos estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Service Worker: precargando recursos estáticos');
      return cache.addAll(urlsToPrecache);
    })
  );
  self.skipWaiting(); // Activar inmediatamente
});

// Estrategia: Network first, fallback a caché para navegación
self.addEventListener('fetch', event => {
  if (event.request.url.startsWith('chrome-extension://')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Para otros recursos, intentar red primero, luego caché
  event.respondWith(
    fetch(event.request).then(response => {
      if (response.ok && (event.request.url.endsWith('.css') || event.request.url.endsWith('.js') || event.request.url.endsWith('.svg'))) {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});

// Activar: limpiar cachés antiguas
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});