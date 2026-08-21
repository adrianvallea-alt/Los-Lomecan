import { supabase } from './supabaseClient';

// ==================== HELPER DE CACHÉ ====================
const cacheOrFetch = async (key, fetcher) => {
  try {
    const data = await fetcher();
    if (data !== null && data !== undefined) {
      localStorage.setItem(key, JSON.stringify(data));
    }
    return data;
  } catch (error) {
    // Si falla (probablemente por red), intentar usar caché local
    const cached = localStorage.getItem(key);
    if (cached) {
      console.warn(`⚠️ Usando caché local para ${key}`);
      return JSON.parse(cached);
    }
    console.error(`❌ Sin caché disponible para ${key}:`, error);
    throw error; // Re-lanzar para que el componente maneje
  }
};

// ==================== HELPER DE FORMATEO ====================
function formatRoutineData(r) {
  let trainingDays = [];

  if (r.training_days && Array.isArray(r.training_days)) {
    trainingDays = r.training_days;
  } else {
    if (r.routine_days && r.routine_days.length > 0) {
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
  }

  return {
    id: r.id,
    name: r.name,
    month: r.month ?? 0,
    year: r.year ?? 0,
    trainingDays,
    createdBy: r.created_by,
    createdAt: r.created_at,
    is_active: r.is_active ?? false,
    is_global: r.is_global ?? false,
    parent_routine_id: r.parent_routine_id ?? null
  };
}

// ==================== PERFILES ====================
export async function fetchProfiles() {
  return cacheOrFetch('profilesCache', async () => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) throw error;
    return data || [];
  });
}

export async function updateProfile(profile) {
  const { error } = await supabase
    .from('profiles')
    .upsert(profile, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteProfile(profileId) {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', profileId);
  if (error) throw error;
}

// ==================== RUTINAS ====================
export async function fetchUserRoutines(profileId) {
  return cacheOrFetch(`userRoutines_${profileId}`, async () => {
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
}

export async function fetchAllGlobalRoutines() {
  return cacheOrFetch('globalRoutinesCache', async () => {
    const { data, error } = await supabase
      .from('routines')
      .select('*')
      .eq('is_global', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(formatRoutineData);
  });
}

export async function saveUserRoutine(profileId, routine) {
  const isGlobal = routine.is_global ?? (routine.parent_routine_id ? false : true);

  const routineData = {
    id: routine.id,
    name: routine.name,
    month: routine.month ?? 0,
    year: routine.year ?? 0,
    training_days: routine.trainingDays || [],
    created_by: isGlobal ? null : profileId,
    is_active: routine.is_active ?? false,
    is_global: isGlobal,
    parent_routine_id: isGlobal ? null : routine.parent_routine_id ?? null
  };

  const { error } = await supabase
    .from('routines')
    .upsert(routineData, { onConflict: 'id' });

  if (error) throw error;
}

export async function importRoutineToProfile(profileId, globalRoutineId) {
  const { data: globalRoutine, error: fetchError } = await supabase
    .from('routines')
    .select('*')
    .eq('id', globalRoutineId)
    .single();
  if (fetchError) throw fetchError;

  const newId = crypto.randomUUID();
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

export async function restoreRoutine(routineId) {
  const { error } = await supabase
    .from('routines')
    .update({ deleted_at: null })
    .eq('id', routineId);
  if (error) throw error;
}

// ==================== EJERCICIOS ====================
export async function fetchAllExercises() {
  return cacheOrFetch('exercisesCache', async () => {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  });
}

// ==================== HISTORIAL ====================
export async function fetchWorkoutHistory(profileId, routineId) {
  const cacheKey = `workoutHistory_${profileId}_${routineId}`;
  return cacheOrFetch(cacheKey, async () => {
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
            done: set.done || false
          });
          return acc;
        }, {})
      )
    }));
  });
}

export async function saveWorkoutSession(profileId, session) {
  const { data: sessionData, error: sessionError } = await supabase
    .from('workout_sessions')
    .insert({
      profile_id: profileId,
      routine_id: session.routineId,
      day_index: session.dayIndex,
      date: session.date
    })
    .select('id')
    .single();
  if (sessionError) throw sessionError;

  const setsToInsert = [];
  for (const exercise of session.exercises) {
    for (const set of exercise.sets) {
      setsToInsert.push({
        session_id: sessionData.id,
        exercise_name: exercise.name,
        set_number: set.setNum,
        weight: set.weight || '',
        reps: set.reps || '',
        done: set.done || false
      });
    }
  }

  if (setsToInsert.length > 0) {
    const { error: setsError } = await supabase
      .from('session_sets')
      .insert(setsToInsert);
    if (setsError) throw setsError;
  }
}

// ==================== INGESTA Y ALIMENTOS ====================
export async function fetchDailyIntake(profileId) {
  return cacheOrFetch(`dailyIntake_${profileId}`, async () => {
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
}

export async function addDailyIntakeItem(profileId, item) {
  const { error } = await supabase
    .from('daily_intake')
    .insert({
      profile_id: profileId,
      food_id: item.foodId,
      food_name: item.foodName,
      grams: item.grams,
      macros: item.macros
    });
  if (error) throw error;
}

export async function fetchFoods() {
  return cacheOrFetch('foodsCache', async () => {
    const { data, error } = await supabase
      .from('foods')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  });
}

export async function saveFood(food) {
  const { error } = await supabase
    .from('foods')
    .upsert(food, { onConflict: 'id' });
  if (error) throw error;
}

// ==================== ALIAS ====================
export const saveRoutine = saveUserRoutine;
export const deleteRoutine = deleteUserRoutine;