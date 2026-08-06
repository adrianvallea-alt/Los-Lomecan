import { supabase } from './supabaseClient';

// ==================== PERFILES ====================
export async function fetchProfiles() {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) throw error;
  return data || [];
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

// ==================== RUTINAS GLOBALES ====================

export async function fetchUserRoutines(profileId) {
  try {
    const { data: assignments, error: assignError } = await supabase
      .from('profile_routines')
      .select('routine_id')
      .eq('profile_id', profileId);

    if (assignError) throw assignError;
    if (!assignments || assignments.length === 0) return [];

    const routineIds = assignments.map(a => a.routine_id);

    const { data: routines, error: routinesError } = await supabase
      .from('routines')
      .select('*')
      .in('id', routineIds)
      .is('deleted_at', null); // 🔥 Solo traemos las que NO están en la papelera

    if (routinesError) throw routinesError;

    return (routines || []).map(r => ({
      id: r.id,
      name: r.name,
      month: r.month,
      year: r.year,
      trainingDays: r.training_days || [],
      createdBy: r.created_by,
      createdAt: r.created_at
    }));
  } catch (err) {
    console.error('Error en fetchUserRoutines:', err);
    throw err;
  }
}

export async function fetchAllGlobalRoutines() {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .is('deleted_at', null) // 🔥 Ocultamos las que están en la papelera
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(r => ({
    id: r.id,
    name: r.name,
    month: r.month,
    year: r.year,
    trainingDays: r.training_days || [],
    createdBy: r.created_by,
    createdAt: r.created_at
  }));
}

export async function saveUserRoutine(profileId, routine) {
  const routineData = {
    id: routine.id,
    name: routine.name,
    month: routine.month,
    year: routine.year,
    training_days: routine.trainingDays || [],
    created_by: profileId
  };

  const { error: routineError } = await supabase
    .from('routines')
    .upsert(routineData, { onConflict: 'id' });

  if (routineError) throw routineError;

  const { error: assignError } = await supabase
    .from('profile_routines')
    .upsert({
      profile_id: profileId,
      routine_id: routine.id
    }, { onConflict: 'profile_id, routine_id' });

  if (assignError) throw assignError;
}

// ================================================================
// 🔥 BORRADO INTELIGENTE (Seguro para Adrián) 🔥
// ================================================================
export async function deleteUserRoutine(profileId, routineId) {
  // 1. Verificar quién es el dueño de la rutina
  const { data: routine, error: fetchError } = await supabase
    .from('routines')
    .select('created_by')
    .eq('id', routineId)
    .single();

  if (fetchError) throw fetchError;

  const isAdrian = profileId === 'adrian';
  const isCreator = routine.created_by === profileId;

  if (isAdrian || isCreator) {
    // CASO 1: Adrián o el creador original la borra.
    // Se manda a la "papelera" (Soft Delete). Se puede recuperar después.
    const { error } = await supabase
      .from('routines')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', routineId);

    if (error) throw error;
  } else {
    // CASO 2: Un perfil secundario (ej. Esposa, NAYE) la borra.
    // NO se borra de la base de datos. SOLO se desvincula de ese perfil.
    // Adrián la seguirá teniendo intacta en su cuenta.
    const { error: deleteAssignError } = await supabase
      .from('profile_routines')
      .delete()
      .eq('profile_id', profileId)
      .eq('routine_id', routineId);

    if (deleteAssignError) throw deleteAssignError;
  }
}

// 🔥 FUNCIÓN PARA RECUPERAR RUTINAS DE LA PAPELERA 🔥
export async function restoreRoutine(routineId) {
  const { error } = await supabase
    .from('routines')
    .update({ deleted_at: null })
    .eq('id', routineId);

  if (error) throw error;
}

export async function importRoutineToProfile(profileId, routineId) {
  const { error } = await supabase
    .from('profile_routines')
    .insert({
      profile_id: profileId,
      routine_id: routineId
    });

  if (error) throw error;
}

// ==================== HISTORIAL DE ENTRENAMIENTO ====================
export async function fetchWorkoutHistory(profileId, routineId) {
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

// ==================== INGESTA DIARIA Y ALIMENTOS ====================
export async function fetchDailyIntake(profileId) {
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
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function saveFood(food) {
  const { error } = await supabase
    .from('foods')
    .upsert(food, { onConflict: 'id' });
  if (error) throw error;
}

// ==========================================
// ✅ ALIAS PARA EL GYM TRACKER
// ==========================================
export const saveRoutine = saveUserRoutine;
export const deleteRoutine = deleteUserRoutine;