// src/lib/dataService.js
import { supabase } from './supabaseClient';

// ==================== HELPER DE CACHÉ OFFLINE-FIRST ====================
const cacheOrFetch = async (key, fetcher) => {
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  if (isOffline) {
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  try {
    const data = await fetcher();
    if (data !== null && data !== undefined) {
      localStorage.setItem(key, JSON.stringify(data));
    }
    return data;
  } catch (error) {
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  }
};

// ==================== HELPER DE FORMATEO ====================
function formatRoutineData(r) {
  let trainingDays = [];

  if (r.training_days && Array.isArray(r.training_days)) {
    trainingDays = r.training_days;
  } else if (r.routine_days && r.routine_days.length > 0) {
    const sortedDays = [...r.routine_days].sort((a, b) => (a.day_index ?? 0) - (b.day_index ?? 0));
    trainingDays = sortedDays.map(day => ({
      id: day.id,
      dayName: day.name,
      dayIndex: day.day_index,
      exercises: (day.routine_exercises || []).map(ex => ({
        id: ex.id,
        name: ex.name,
        sets: ex.routine_sets || []
      }))
    }));
  }

  return {
    id: r.id,
    name: r.name,
    month: r.month ?? 0,
    year: r.year ?? 0,
    trainingDays,
    createdBy: r.created_by,
    createdAt: r.created_at,
    is_active: Boolean(r.is_active),
    is_global: Boolean(r.is_global),
    parent_routine_id: r.parent_routine_id ?? null
  };
}

// ==================== PERFILES ====================
export async function fetchProfiles() {
  const result = await cacheOrFetch('profilesCache', async () => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) throw error;
    return data || [];
  });
  return result || [];
}

export async function updateProfile(profile) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  const { error } = await supabase
    .from('profiles')
    .upsert(profile, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteProfile(profileId) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', profileId);
  if (error) throw error;
}

// ==================== RUTINAS ====================
export async function fetchUserRoutines(profileId) {
  const result = await cacheOrFetch(`userRoutines_${profileId}`, async () => {
    const { data, error } = await supabase
      .from('routines')
      .select('*')
      .eq('created_by', profileId)
      .eq('is_global', false)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(formatRoutineData);
  });
  return result || [];
}

export async function fetchAllGlobalRoutines() {
  const result = await cacheOrFetch('globalRoutinesCache', async () => {
    const { data, error } = await supabase
      .from('routines')
      .select('*')
      .eq('is_global', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(formatRoutineData);
  });
  return result || [];
}

export async function saveUserRoutine(profileId, routine) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  const isGlobal = routine.is_global ?? (routine.parent_routine_id ? false : true);

  const routineData = {
    id: routine.id,
    name: routine.name,
    month: routine.month ?? 0,
    year: routine.year ?? 0,
    training_days: routine.trainingDays || [],
    created_by: isGlobal ? null : profileId,
    is_active: Boolean(routine.is_active),
    is_global: Boolean(isGlobal),
    parent_routine_id: isGlobal ? null : (routine.parent_routine_id ?? null)
  };

  const { error } = await supabase
    .from('routines')
    .upsert(routineData, { onConflict: 'id' });

  if (error) throw error;
}

export async function importRoutineToProfile(profileId, globalRoutineId) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  const { data: globalRoutine, error: fetchError } = await supabase
    .from('routines')
    .select('*')
    .eq('id', globalRoutineId)
    .single();
  if (fetchError) throw fetchError;

  const newId = crypto.randomUUID ? crypto.randomUUID() : `rot_${Date.now()}`;
  const localRoutine = {
    id: newId,
    name: globalRoutine.name,
    month: 0,
    year: 0,
    training_days: globalRoutine.training_days || [],
    created_by: profileId,
    is_active: false,
    is_global: false,
    parent_routine_id: globalRoutineId
  };

  const { error: insertError } = await supabase
    .from('routines')
    .insert(localRoutine);
  if (insertError) throw insertError;
}

export async function deleteUserRoutine(profileId, routineId, isGlobal = false) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  let query = supabase
    .from('routines')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', routineId);

  if (!isGlobal) {
    query = query.eq('created_by', profileId).eq('is_global', false);
  }

  const { error } = await query;
  if (error) throw error;
}

// ==================== EJERCICIOS ====================
export async function fetchAllExercises() {
  const result = await cacheOrFetch('exercisesCache', async () => {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  });
  return result || [];
}

// ==================== HISTORIAL DE ENTRENAMIENTOS ====================
export async function fetchWorkoutHistory(profileId, routineId) {
  const cacheKey = `workoutHistory_${profileId}_${routineId}`;
  const result = await cacheOrFetch(cacheKey, async () => {
    const { data: sessions, error } = await supabase
      .from('workout_sessions')
      .select(`*, session_sets (*)`)
      .eq('profile_id', profileId)
      .eq('routine_id', routineId)
      .order('date', { ascending: false });
    if (error) throw error;

    if (!sessions || sessions.length === 0) return [];

    return sessions.map(session => ({
      date: session.date,
      routineId: session.routine_id,
      dayIndex: session.day_index,
      exercises: Object.values(
        (session.session_sets || []).reduce((acc, set) => {
          if (!acc[set.exercise_name]) {
            acc[set.exercise_name] = { id: set.exercise_name, name: set.exercise_name, sets: [] };
          }
          acc[set.exercise_name].sets.push({
            setNum: set.set_number,
            weight: set.weight,
            reps: set.reps,
            done: Boolean(set.done)
          });
          return acc;
        }, {})
      )
    }));
  });
  return result || [];
}

export async function saveWorkoutSession(profileId, session) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  const { data: sessionData, error: sessionError } = await supabase
    .from('workout_sessions')
    .insert({
      profile_id: profileId,
      routine_id: session.routineId,
      day_index: session.dayIndex,
      date: session.date || new Date().toISOString()
    })
    .select('id')
    .single();

  if (sessionError) throw sessionError;

  // Sanitizar series para evitar errores 400 de tipos en PostgreSQL
  const setsToInsert = [];
  for (const exercise of session.exercises || []) {
    for (const set of exercise.sets || []) {
      const parsedWeight = parseFloat(set.weight);
      const parsedReps = parseInt(set.reps, 10);

      setsToInsert.push({
        session_id: sessionData.id,
        exercise_name: exercise.name || 'Ejercicio',
        set_number: parseInt(set.setNum, 10) || 1,
        weight: !isNaN(parsedWeight) ? parsedWeight : 0,
        reps: !isNaN(parsedReps) ? parsedReps : 0,
        done: Boolean(set.done)
      });
    }
  }

  if (setsToInsert.length > 0) {
    const { error: setsError } = await supabase
      .from('session_sets')
      .insert(setsToInsert);

    if (setsError) {
      console.warn('⚠️ Error al insertar series:', setsError);
    }
  }
}

// ==================== INGESTA Y ALIMENTOS ====================
export async function fetchDailyIntake(profileId) {
  const result = await cacheOrFetch(`dailyIntake_${profileId}`, async () => {
    const { data, error } = await supabase
      .from('daily_intake')
      .select('*')
      .eq('profile_id', profileId)
      .order('timestamp', { ascending: false });
    if (error) throw error;
    return (data || []).map(item => ({
      id: item.id,
      foodId: item.food_id,
      foodName: item.food_name,
      grams: item.grams,
      macros: item.macros,
      timestamp: item.timestamp
    }));
  });
  return result || [];
}

export async function addDailyIntakeItem(profileId, item) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
  const { data, error } = await supabase
    .from('daily_intake')
    .insert({
      profile_id: profileId,
      food_id: item.foodId || null,
      food_name: item.foodName,
      grams: item.grams,
      macros: item.macros,
      timestamp: item.timestamp || new Date().toISOString()
    })
    .select('id')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteDailyIntakeItem(profileId, intakeId) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  const { error } = await supabase
    .from('daily_intake')
    .delete()
    .eq('id', intakeId);

  if (error) throw error;
}

export async function fetchFoods() {
  const result = await cacheOrFetch('foodsCache', async () => {
    const { data, error } = await supabase
      .from('foods')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  });
  return result || [];
}

export async function saveFood(food) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  const { error } = await supabase
    .from('foods')
    .upsert(food, { onConflict: 'id' });
  if (error) throw error;
}

// ==================== ALIASES ====================
export const saveRoutine = saveUserRoutine;
export const deleteRoutine = deleteUserRoutine;