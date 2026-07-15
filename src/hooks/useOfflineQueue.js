import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const QUEUE_KEY = (profileId) => `offline_queue_${profileId}`;

export default function useOfflineQueue(profileId) {
  const [queue, setQueue] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncInProgress = useRef(false);

  // Cargar cola del localStorage
  useEffect(() => {
    if (!profileId) return;
    const stored = localStorage.getItem(QUEUE_KEY(profileId));
    if (stored) {
      try {
        setQueue(JSON.parse(stored));
      } catch (e) {
        setQueue([]);
      }
    }
  }, [profileId]);

  // Guardar cola en localStorage cuando cambie
  useEffect(() => {
    if (!profileId) return;
    localStorage.setItem(QUEUE_KEY(profileId), JSON.stringify(queue));
  }, [queue, profileId]);

  // Detectar cambios de conexión
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Procesar cola cuando se recupere la conexión
  useEffect(() => {
    if (isOnline && queue.length > 0 && !syncInProgress.current) {
      processQueue();
    }
  }, [isOnline, queue]);

  const processQueue = async () => {
    if (syncInProgress.current || queue.length === 0) return;
    syncInProgress.current = true;
    setIsSyncing(true);

    const remaining = [...queue];
    const failed = [];

    for (const item of remaining) {
      try {
        await executeOperation(item);
      } catch (err) {
        console.error('Error al sincronizar:', item, err);
        failed.push(item);
      }
    }

    setQueue(failed);
    setIsSyncing(false);
    syncInProgress.current = false;
  };

  const executeOperation = async (item) => {
    switch (item.type) {
      case 'saveRoutine':
        await supabase.from('routines').upsert([item.payload]);
        break;
      case 'saveWorkoutSession':
        await supabase.from('workout_sessions').insert([item.payload]);
        break;
      case 'saveFood':
        await supabase.from('daily_intake').insert([item.payload]);
        break;
      case 'updateProfile':
        await supabase.from('profiles').update(item.payload).eq('id', item.payload.id);
        break;
      case 'saveExercise':
        if (item.payload.id) {
          await supabase.from('exercises').update(item.payload).eq('id', item.payload.id);
        } else {
          await supabase.from('exercises').insert([item.payload]);
        }
        break;
      default:
        console.warn('Tipo de operación desconocida:', item.type);
    }
  };

  const addToQueue = useCallback((type, payload) => {
    setQueue(prev => [...prev, { type, payload, timestamp: Date.now() }]);
  }, []);

  return { queue, isOnline, isSyncing, addToQueue };
}