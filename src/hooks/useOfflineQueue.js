// src/hooks/useOfflineQueue.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const QUEUE_KEY = (profileId) => `offline_queue_${profileId}`;

export default function useOfflineQueue(profileId) {
  const [queue, setQueue] = useState(() => {
    if (!profileId) return [];
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY(profileId)) || '[]');
    } catch {
      return [];
    }
  });

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const syncInProgress = useRef(false);

  // Cargar cola al cambiar de perfil
  useEffect(() => {
    if (!profileId) {
      setQueue([]);
      return;
    }
    try {
      const stored = localStorage.getItem(QUEUE_KEY(profileId));
      setQueue(stored ? JSON.parse(stored) : []);
    } catch {
      setQueue([]);
    }
  }, [profileId]);

  // Persistir cola
  useEffect(() => {
    if (!profileId) return;
    localStorage.setItem(QUEUE_KEY(profileId), JSON.stringify(queue));
  }, [queue, profileId]);

  // Listeners de Red
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

  const executeOperation = async (item) => {
    switch (item.type) {
      case 'saveRoutine': {
        const routine = item.payload.routine || item.payload;
        const targetProfileId = item.payload.profileId || profileId;
        const isGlobal = routine.is_global ?? (!routine.parent_routine_id);

        const routineData = {
          id: routine.id,
          name: routine.name,
          month: routine.month ?? 0,
          year: routine.year ?? 0,
          training_days: routine.trainingDays || routine.training_days || [],
          created_by: isGlobal ? null : targetProfileId,
          is_active: Boolean(routine.is_active),
          is_global: Boolean(isGlobal),
          parent_routine_id: isGlobal ? null : (routine.parent_routine_id ?? null),
        };

        const { error } = await supabase.from('routines').upsert(routineData, { onConflict: 'id' });
        if (error) throw error;
        break;
      }

      case 'saveWorkoutSession': {
        const session = item.payload.session || item.payload;
        const targetProfileId = item.payload.profileId || profileId;

        const { data: sessionData, error: sessionError } = await supabase
          .from('workout_sessions')
          .insert({
            profile_id: targetProfileId,
            routine_id: session.routineId,
            day_index: session.dayIndex,
            date: session.date || new Date().toISOString(),
          })
          .select('id')
          .single();

        if (sessionError) throw sessionError;

        if (session.exercises?.length) {
          const setsToInsert = [];
          for (const exercise of session.exercises) {
            if (exercise.sets?.length) {
              for (const set of exercise.sets) {
                const parsedWeight = parseFloat(set.weight);
                const parsedReps = parseInt(set.repsDone || set.reps, 10);
                setsToInsert.push({
                  session_id: sessionData.id,
                  exercise_name: exercise.name || 'Ejercicio',
                  set_number: parseInt(set.setNum, 10) || 1,
                  weight: !isNaN(parsedWeight) ? parsedWeight : 0,
                  reps: !isNaN(parsedReps) ? parsedReps : 0,
                  done: Boolean(set.done),
                });
              }
            }
          }
          if (setsToInsert.length > 0) {
            const { error: setsError } = await supabase.from('session_sets').insert(setsToInsert);
            if (setsError) throw setsError;
          }
        }
        break;
      }

      case 'saveFood': {
        const intake = item.payload;
        const { error } = await supabase.from('daily_intake').insert({
          profile_id: intake.profileId || profileId,
          food_id: intake.foodId || null,
          food_name: intake.foodName || 'Alimento',
          grams: Number(intake.grams) || 100,
          macros: intake.macros || {},
          timestamp: intake.timestamp || new Date().toISOString()
        });
        if (error) throw error;
        break;
      }

      case 'deleteFood': {
        const { id } = item.payload;
        if (id && !id.startsWith('local_')) {
          const { error } = await supabase.from('daily_intake').delete().eq('id', id);
          if (error) throw error;
        }
        break;
      }

      case 'updateProfile': {
        const { error } = await supabase.from('profiles').upsert(item.payload, { onConflict: 'id' });
        if (error) throw error;
        break;
      }

      default:
        console.warn('⚠️ Operación de cola no reconocida:', item.type);
    }
  };

  const processQueue = useCallback(async () => {
    if (syncInProgress.current || queue.length === 0 || !navigator.onLine) return;

    syncInProgress.current = true;
    setIsSyncing(true);

    const snapshot = [...queue];
    const successfulIds = new Set();
    const retryIncrements = new Map();

    for (const item of snapshot) {
      try {
        await executeOperation(item);
        successfulIds.add(item.id);
      } catch (err) {
        console.error(`❌ Error sincronizando [${item.type}]:`, err);
        const retries = (item.retries || 0) + 1;
        retryIncrements.set(item.id, retries);
      }
    }

    // Actualización funcional para NUNCA perder datos ingresados mientras se sincronizaba
    setQueue(prevQueue =>
      prevQueue
        .filter(item => !successfulIds.has(item.id))
        .map(item => {
          const newRetries = retryIncrements.get(item.id);
          return newRetries !== undefined ? { ...item, retries: newRetries } : item;
        })
        .filter(item => item.retries <= 5) // Descartar si supera 5 intentos fallidos
    );

    setIsSyncing(false);
    syncInProgress.current = false;
  }, [queue, profileId]);

  useEffect(() => {
    if (isOnline && queue.length > 0 && !syncInProgress.current) {
      processQueue();
    }
  }, [isOnline, queue.length, processQueue]);

  const addToQueue = useCallback((type, payload) => {
    const newItem = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      timestamp: Date.now(),
      retries: 0,
    };
    setQueue(prev => [...prev, newItem]);
  }, []);

  return { queue, isOnline, isSyncing, addToQueue, processQueue };
}