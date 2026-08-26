// src/utils/exportData.js

export function getAllUserData(profileId) {
  const data = {
    exportedAt: new Date().toISOString(),
    profileId,
    weightLogs: [],
    bodyMeasures: [],
    workoutHistory: [],
    foodIntake: [],
  };

  const weightStr = localStorage.getItem(`weightLogs_${profileId}`);
  if (weightStr) {
    try { data.weightLogs = JSON.parse(weightStr) || []; } catch {}
  }

  const measuresStr = localStorage.getItem(`bodyMeasures_${profileId}`);
  if (measuresStr) {
    try {
      const parsed = JSON.parse(measuresStr);
      data.bodyMeasures = parsed.history || [];
    } catch {}
  }

  const prefix = `workoutHistory_${profileId}_`;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) {
      try {
        const sessions = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(sessions)) {
          data.workoutHistory.push(...sessions);
        }
      } catch {}
    }
  }

  const intakeStr = localStorage.getItem(`dailyIntake_${profileId}`);
  if (intakeStr) {
    try { data.foodIntake = JSON.parse(intakeStr) || []; } catch {}
  }

  return data;
}

const escapeCsv = (val) => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export function generateCSV(data) {
  let csv = '';

  // Peso
  if (data.weightLogs?.length > 0) {
    csv += '--- REGISTROS DE PESO ---\nFecha,Peso (kg)\n';
    data.weightLogs.forEach(entry => {
      csv += `${escapeCsv(entry.date)},${entry.weight}\n`;
    });
    csv += '\n';
  }

  // Medidas
  if (data.bodyMeasures?.length > 0) {
    csv += '--- MEDIDAS CORPORALES ---\nFecha,Pecho,Cintura,Cadera,Brazos,Muslos\n';
    data.bodyMeasures.forEach(entry => {
      csv += `${escapeCsv(entry.date)},${entry.chest || ''},${entry.waist || ''},${entry.hips || ''},${entry.arms || ''},${entry.thighs || ''}\n`;
    });
    csv += '\n';
  }

  // Entrenamientos
  if (data.workoutHistory?.length > 0) {
    csv += '--- HISTORIAL DE ENTRENAMIENTOS ---\nFecha,Rutina,Dia,Ejercicio,Serie,Peso (kg),Reps,Completado\n';
    data.workoutHistory.forEach(session => {
      const sessionDate = session.date ? new Date(session.date).toISOString() : '';
      (session.exercises || []).forEach(ex => {
        (ex.sets || []).forEach(set => {
          csv += `${escapeCsv(sessionDate)},${escapeCsv(session.routineId || '')},${session.dayIndex ?? ''},${escapeCsv(ex.name)},${set.setNum || ''},${set.weight || 0},${set.repsDone || set.reps || 0},${Boolean(set.done)}\n`;
        });
      });
    });
    csv += '\n';
  }

  // Comidas
  if (data.foodIntake?.length > 0) {
    csv += '--- INGESTA DE COMIDAS ---\nFecha,Momento,Alimento,Gramos,Calorias (kcal),Proteina (g),Carbohidratos (g),Grasas (g)\n';
    data.foodIntake.forEach(entry => {
      csv += `${escapeCsv(entry.timestamp)},${escapeCsv(entry.mealType || '')},${escapeCsv(entry.foodName)},${entry.grams || 0},${entry.macros?.cal || 0},${entry.macros?.pro || 0},${entry.macros?.carb || 0},${entry.macros?.fat || 0}\n`;
    });
  }

  return csv;
}

export function downloadFile(content, filename, type = 'text/csv;charset=utf-8;') {
  const blob = new Blob(['\uFEFF' + content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}