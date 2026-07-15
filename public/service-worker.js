// public/service-worker.js
const CACHE_NAME = 'lomecan-v1';

// Precargamos los archivos esenciales de entrada para garantizar el funcionamiento offline
const urlsToPrecache = [
  './',
  './index.html',
  './manifest.json',
  './favicon-16x16.png'
];

// Instalación: precarga recursos estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Service Worker: precargando recursos estáticos esenciales');
      // Usamos un mapeo para evitar que un fallo en un archivo rompa toda la instalación
      return Promise.all(
        urlsToPrecache.map(url => {
          return cache.add(url).catch(err => {
            console.warn(`No se pudo precargar el recurso: ${url}`, err);
          });
        })
      );
    })
  );
  self.skipWaiting(); // Activar inmediatamente
});

// Estrategia: Network first, fallback a caché para navegación
self.addEventListener('fetch', event => {
  if (event.request.url.startsWith('chrome-extension://')) return;

  // Si es una petición de navegación (el usuario recarga o entra a una ruta)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Corregido a ruta relativa para que funcione en subcarpetas de GitHub Pages
        return caches.match('./index.html') || caches.match('./');
      })
    );
    return;
  }

  // Para otros recursos, intentar red primero, luego caché
  event.respondWith(
    fetch(event.request).then(response => {
      // Si la respuesta es exitosa, guardamos una copia en caché de archivos estáticos clave
      if (response.ok && (
        event.request.url.endsWith('.css') || 
        event.request.url.endsWith('.js') || 
        event.request.url.endsWith('.svg') ||
        event.request.url.endsWith('.png') || // Añadidos para guardar tus iconos y assets
        event.request.url.includes('/icons/')
      )) {
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
            console.log('Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});