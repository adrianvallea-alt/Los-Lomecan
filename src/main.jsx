import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// ============================================================
// GESTOR AVANZADO DEL CICLO DE VIDA DEL SERVICE WORKER (PWA)
// ============================================================
if ('serviceWorker' in navigator) {
  let refreshing = false;

  // 1. Recargar suavemente solo cuando el nuevo SW tome el control activo
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      console.log('🔄 Nueva versión activada. Actualizando interfaz...');
      window.location.reload();
    }
  });

  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}service-worker.js`;

    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        console.log('✅ Service Worker registrado en:', registration.scope);

        // Forzar chequeo inicial
        registration.update();

        // 2. Escuchar si se encuentra una actualización
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🚀 Nueva versión descargada y lista para activarse.');
              }
            });
          }
        });

        // 3. Chequear actualizaciones cada vez que la app pasa a primer plano (PWA móvil)
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update();
          }
        });

        // 4. Chequear periódicamente cada 15 minutos en segundo plano
        setInterval(() => {
          registration.update();
        }, 15 * 60 * 1000);
      })
      .catch((err) => {
        console.error('❌ Error al registrar Service Worker:', err);
      });
  });
}