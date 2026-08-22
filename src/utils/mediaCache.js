// src/utils/mediaCache.js

const DB_NAME = 'LomecanMediaCache';
const DB_VERSION = 1;
const STORE_NAME = 'media_blobs';

const openDB = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB no soportado'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'url' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Recupera el Blob de un video guardado localmente en IndexedDB.
 */
export async function getCachedMediaBlob(url) {
  if (!url || url.includes('youtube.com') || url.includes('youtu.be')) return null;
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(url);

      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          resolve(req.result.blob);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

/**
 * Guarda un video en segundo plano de forma silenciosa (sin bloquear la UI).
 */
export async function autoCacheMediaInBackground(url) {
  if (!url || url.includes('youtube.com') || url.includes('youtu.be')) return;

  try {
    // Si ya está en caché, no hacer nada
    const existing = await getCachedMediaBlob(url);
    if (existing) return;

    const response = await fetch(url);
    if (!response.ok) return;

    const blob = await response.blob();
    const db = await openDB();

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({
      url,
      blob,
      size: blob.size,
      cachedAt: Date.now(),
    });
  } catch (err) {
    // Falla silenciosa si no hay internet o es un origen no CORS
  }
}