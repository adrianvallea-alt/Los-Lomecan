import { supabase } from './supabaseClient';

// ==================== PERFILES ====================
export async function fetchProfiles() {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) throw error;
  return data;
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
export async function fetchRoutines(profileId) {
  const { data: routines, error } = await supabase
    .from('routines')
    .select(`
      *,
      routine_days (
        *,
        routine_exercises (
          *,
          routine_sets (*)
        )
      )
    `)
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return routines.map(r => ({
    id: r.id,
    name: r.name,
    month: r.month,
    year: r.year,
    trainingDays: (r.routine_days || []).map(day => ({
      name: day.name,
      exercises: (day.routine_exercises || []).map(ex => ({
        id: ex.id,
        name: ex.name,
        muscle: ex.muscle,
        secondaryMuscles: ex.secondary_muscles,
        description: ex.description,
        video_url: ex.video_url,
        libraryExerciseId: ex.library_exercise_id,
        sets: (ex.routine_sets || []).map(s => ({
          id: s.id,
          setNum: s.set_number,
          weight: '',
          reps: s.reps,
          done: false
        }))
      }))
    }))
  }));
}

export async function saveRoutine(profileId, routine) {
  const { error: routineError } = await supabase
    .from('routines')
    .upsert({
      id: routine.id,
      profile_id: profileId,
      name: routine.name,
      month: routine.month,
      year: routine.year
    }, { onConflict: 'id' });
  
  if (routineError) throw routineError;

  await supabase.from('routine_days').delete().eq('routine_id', routine.id);

  for (const [dayIndex, day] of routine.trainingDays.entries()) {
    const { data: dayData, error: dayError } = await supabase
      .from('routine_days')
      .insert({
        routine_id: routine.id,
        day_index: dayIndex,
        name: day.name
      })
      .select('id')
      .single();
    
    if (dayError) throw dayError;

    for (const exercise of day.exercises) {
      const { data: exData, error: exError } = await supabase
        .from('routine_exercises')
        .insert({
          routine_day_id: dayData.id,
          library_exercise_id: exercise.libraryExerciseId || null,
          name: exercise.name,
          muscle: exercise.muscle,
          secondary_muscles: exercise.secondaryMuscles || '',
          description: exercise.description || '',
          video_url: exercise.video_url || ''
        })
        .select('id')
        .single();
      
      if (exError) throw exError;

      for (const set of exercise.sets) {
        const { error: setError } = await supabase
          .from('routine_sets')
          .insert({
            routine_exercise_id: exData.id,
            set_number: set.setNum,
            reps: set.reps
          });
        
        if (setError) throw setError;
      }
    }
  }
}

export async function deleteRoutine(routineId) {
  const { error } = await supabase.from('routines').delete().eq('id', routineId);
  if (error) throw error;
}

// ==================== HISTORIAL DE ENTRENAMIENTO ====================
export async function fetchWorkoutHistory(profileId, routineId) {
  const { data: sessions, error } = await supabase
    .from('workout_sessions')
    .select(`
      *,
      session_sets (*)
    `)
    .eq('profile_id', profileId)
    .eq('routine_id', routineId)
    .order('date', { ascending: false });
  
  if (error) throw error;

  return sessions.map(session => ({
    date: session.date,
    routineId: session.routine_id,
    dayIndex: session.day_index,
    exercises: Object.values(
      session.session_sets.reduce((acc, set) => {
        if (!acc[set.exercise_name]) {
          acc[set.exercise_name] = {
            id: set.exercise_name,
            name: set.exercise_name,
            sets: []
          };
        }
        acc[set.exercise_name].sets.push({
          setNum: set.set_number,
          weight: set.weight,
          reps: set.reps,
          done: set.done
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
        weight: set.weight,
        reps: set.reps,
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

// ==================== INGESTA DIARIA ====================
export async function fetchDailyIntake(profileId) {
  const { data, error } = await supabase
    .from('daily_intake')
    .select('*')
    .eq('profile_id', profileId)
    .order('timestamp', { ascending: false });
  
  if (error) throw error;
  
  return data.map(item => ({
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