// src/utils/gymHelpers.js

export const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export const getCurrentMonth = () => new Date().getMonth() + 1;
export const getCurrentYear = () => new Date().getFullYear();

export const generateId = () => {
  return (typeof crypto !== 'undefined' && crypto.randomUUID) 
    ? crypto.randomUUID() 
    : Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export const getLastSetData = (lastSession, exerciseId, setNum, libraryExerciseId) => {
  if (!lastSession?.exercises) return null;
  const ex = lastSession.exercises.find(e =>
    (libraryExerciseId && e.libraryExerciseId === libraryExerciseId) ||
    e.id === exerciseId
  );
  if (!ex?.sets) return null;
  return ex.sets.find(s => s.setNum === setNum) || null;
};

export const updatePersonalRecords = (currentRecords = {}, session) => {
  const records = { ...currentRecords };
  if (!session?.exercises) return records;

  session.exercises.forEach(ex => {
    const key = ex.libraryExerciseId || ex.id || ex.name;
    (ex.sets || []).forEach(set => {
      const w = parseFloat(set.weight);
      const r = parseInt(set.repsDone || set.reps, 10);
      if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return;

      if (!records[key] || w > records[key].weight || (w === records[key].weight && r > records[key].reps)) {
        records[key] = { weight: w, reps: r };
      }
    });
  });
  return records;
};

export const getDayRecords = (sessionsSameDay = []) => {
  const dayRec = {};
  sessionsSameDay.forEach(session => {
    (session.exercises || []).forEach(ex => {
      const key = ex.libraryExerciseId || ex.id || ex.name;
      (ex.sets || []).forEach(set => {
        const w = parseFloat(set.weight);
        const r = parseInt(set.repsDone || set.reps, 10);
        if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return;

        if (!dayRec[key] || w > dayRec[key].weight || (w === dayRec[key].weight && r > dayRec[key].reps)) {
          dayRec[key] = { weight: w, reps: r };
        }
      });
    });
  });
  return dayRec;
};

export const limitHistory = (historyArray, max = 30) => {
  return (Array.isArray(historyArray) ? historyArray : []).slice(-max);
};

export const getProgressionSuggestion = (lastSets = [], goalReps, defaultWeight = '') => {
  if (!lastSets || lastSets.length === 0) {
    return {
      weight: defaultWeight,
      action: 'no-data',
      text: 'Sin referencia'
    };
  }

  const lastWeight = parseFloat(lastSets[0]?.weight) || 0;
  const lastReps = parseInt(lastSets[0]?.reps, 10) || 0;
  const goal = parseInt(goalReps, 10) || 0;

  if (lastWeight > 0 && goal > 0 && lastReps >= goal) {
    const newWeight = (lastWeight + 2.5).toFixed(1);
    return {
      weight: newWeight,
      action: 'up',
      text: `Subir a ${newWeight} kg`
    };
  } else if (lastWeight > 0) {
    return {
      weight: lastWeight.toString(),
      action: 'maintain',
      text: `Mantener ${lastWeight} kg`
    };
  }

  return {
    weight: defaultWeight,
    action: 'no-data',
    text: 'Sin referencia'
  };
};