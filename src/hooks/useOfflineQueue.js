// src/hooks/useOfflineQueue.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const QUEUE_KEY = (profileId) => `offline_queue_${profileId}`;

export default function useOfflineQueue(profileId) {
  const [queue, setQueue] = useState([]);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const syncInProgress = useRef(false);

  useEffect(() => {
    if (!profileId) {
      setQueue([]);
      return;
    }
    const stored = localStorage.getItem(QUEUE_KEY(profileId));
    if (stored) {
      try {
        setQueue(JSON.parse(stored));
      } catch (e) {
        setQueue([]);
      }
    } else {
      setQueue([]);
    }
  }, [profileId]);

  useEffect(() => {
    if (!profileId) return;
    localStorage.setItem(QUEUE_KEY(profileId), JSON.stringify(queue));
  }, [queue, profileId]);

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

  const syncWorkoutSession = async (payload) => {
    const session = payload.session || payload;
    const targetProfileId = payload.profileId || profileId;

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

    if (session.exercises && Array.isArray(session.exercises)) {
      const setsToInsert = [];
      for (const exercise of session.exercises) {
        if (exercise.sets && Array.isArray(exercise.sets)) {
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
        const { error: setsError } = await supabase
          .from('session_sets')
          .insert(setsToInsert);
        if (setsError) throw setsError;
      }
    }
  };

  const syncRoutine = async (payload) => {
    const routine = payload.routine || payload;
    const targetProfileId = payload.profileId || profileId;
    const isGlobal = routine.is_global ?? (routine.parent_routine_id ? false : true);

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

    const { error } = await supabase
      .from('routines')
      .upsert(routineData, { onConflict: 'id' });

    if (error) throw error;
  };

  const executeOperation = async (item) => {
    switch (item.type) {
      case 'saveRoutine':
        await syncRoutine(item.payload);
        break;

      case 'saveWorkoutSession':
        await syncWorkoutSession(item.payload);
        break;

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
        if (id) {
          await supabase.from('daily_intake').delete().eq('id', id);
        }
        break;
      }

      case 'updateProfile': {
        const profileData = item.payload;
        const { error } = await supabase
          .from('profiles')
          .upsert(profileData, { onConflict: 'id' });
        if (error) throw error;
        break;
      }

      case 'saveExercise': {
        const exercise = item.payload;
        if (exercise.id) {
          const { error } = await supabase
            .from('exercises')
            .update(exercise)
            .eq('id', exercise.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('exercises').insert([exercise]);
          if (error) throw error;
        }
        break;
      }

      default:
        console.warn('⚠️ Operación de cola no reconocida:', item.type);
    }
  };

  const processQueue = useCallback(async () => {
    if (syncInProgress.current || queue.length === 0 || !isOnline) return;

    syncInProgress.current = true;
    setIsSyncing(true);

    const remaining = [...queue];
    const failed = [];

    for (const item of remaining) {
      try {
        await executeOperation(item);
      } catch (err) {
        console.error(`❌ Error sincronizando elemento [${item.type}]:`, err);
        const retryCount = (item.retries || 0) + 1;
        if (retryCount <= 5) {
          failed.push({ ...item, retries: retryCount });
        }
      }
    }

    setQueue(failed);
    setIsSyncing(false);
    syncInProgress.current = false;
  }, [queue, isOnline, profileId]);

  useEffect(() => {
    if (isOnline && queue.length > 0 && !syncInProgress.current) {
      processQueue();
    }
  }, [isOnline, queue.length, processQueue]);

  const addToQueue = useCallback((type, payload) => {
    setQueue(prev => [
      ...prev,
      {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`,
        type,
        payload,
        timestamp: Date.now(),
        retries: 0,
      },
    ]);
  }, []);

  return { queue, isOnline, isSyncing, addToQueue, processQueue };
}