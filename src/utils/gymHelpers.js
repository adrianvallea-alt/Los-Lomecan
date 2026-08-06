export const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export const getCurrentMonth = () => {
  return new Date().getMonth() + 1;
};

export const getCurrentYear = () => {
  return new Date().getFullYear();
};

export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
export const getLastSetData = (lastSession, exerciseId, setNum, libraryExerciseId) => {
  if (!lastSession) return null;
  const ex = lastSession.exercises.find(e =>
    (libraryExerciseId && e.libraryExerciseId === libraryExerciseId) ||
    e.id === exerciseId
  );
  if (!ex) return null;
  return ex.sets.find(s => s.setNum === setNum) || null;
};

export const updatePersonalRecords = (currentRecords, session) => {
  const records = { ...currentRecords };
  session.exercises.forEach(ex => {
    const key = ex.libraryExerciseId || ex.id;
    ex.sets.forEach(set => {
      const w = parseFloat(set.weight), r = parseInt(set.reps);
      if (isNaN(w) || isNaN(r)) return;
      if (!records[key] || w > records[key].weight || (w === records[key].weight && r > records[key].reps)) {
        records[key] = { weight: w, reps: r };
      }
    });
  });
  return records;
};

export const getDayRecords = (sessionsSameDay) => {
  const dayRec = {};
  sessionsSameDay.forEach(session => {
    session.exercises.forEach(ex => {
      const key = ex.libraryExerciseId || ex.id;
      ex.sets.forEach(set => {
        const w = parseFloat(set.weight), r = parseInt(set.reps);
        if (isNaN(w) || isNaN(r)) return;
        if (!dayRec[key] || w > dayRec[key].weight || (w === dayRec[key].weight && r > dayRec[key].reps)) {
          dayRec[key] = { weight: w, reps: r };
        }
      });
    });
  });
  return dayRec;
};

export const limitHistory = (historyArray, max = 30) => historyArray.slice(-max);

export const getSuggestedWeight = (lastSets, defaultWeight) => {
  if (!lastSets || lastSets.length === 0) return defaultWeight || '';
  const allDone = lastSets.every(s => s.done !== false);
  const lastWeight = parseFloat(lastSets[0]?.weight) || 0;
  if (allDone && lastWeight > 0) {
    return (lastWeight + 2.5).toFixed(1);
  }
  return lastWeight > 0 ? lastWeight.toString() : (defaultWeight || '');
};

export const getSuggestedReps = (lastSets, defaultReps) => {
  if (!lastSets || lastSets.length === 0) return defaultReps || '';
  return lastSets[0]?.reps || defaultReps || '';
};