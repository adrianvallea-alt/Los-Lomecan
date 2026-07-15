// src/utils/exportData.js

// Función principal que recopila todos los datos del usuario
export function getAllUserData(profileId) {
  const data = {
    exportedAt: new Date().toISOString(),
    profileId,
    weightLogs: [],
    bodyMeasures: [],
    workoutHistory: [],
    foodIntake: [],
  };

  // 1. Peso
  const weightStr = localStorage.getItem(`weightLogs_${profileId}`);
  if (weightStr) {
    try { data.weightLogs = JSON.parse(weightStr); } catch (e) {}
  }

  // 2. Medidas corporales
  const measuresStr = localStorage.getItem(`bodyMeasures_${profileId}`);
  if (measuresStr) {
    try {
      const parsed = JSON.parse(measuresStr);
      data.bodyMeasures = parsed.history || [];
    } catch (e) {}
  }

  // 3. Historial de entrenamientos (varias claves)
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`workoutHistory_${profileId}_`)) {
      try {
        const sessions = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(sessions)) {
          data.workoutHistory.push(...sessions);
        }
      } catch (e) {}
    }
  }

  // 4. Ingesta diaria de alimentos
  const intakeStr = localStorage.getItem(`dailyIntake_${profileId}`);
  if (intakeStr) {
    try { data.foodIntake = JSON.parse(intakeStr); } catch (e) {}
  }

  return data;
}

// Formatear los datos a CSV (pestañas separadas por tipo)
export function generateCSV(data) {
  let csv = '';

  // Peso
  if (data.weightLogs.length > 0) {
    csv += 'Peso\nFecha,Peso (kg)\n';
    data.weightLogs.forEach(entry => {
      csv += `${entry.date},${entry.weight}\n`;
    });
    csv += '\n';
  }

  // Medidas
  if (data.bodyMeasures.length > 0) {
    csv += 'Medidas\nFecha,Pecho, Cintura, Cadera, Brazos, Muslos\n';
    data.bodyMeasures.forEach(entry => {
      csv += `${entry.date},${entry.chest || ''},${entry.waist || ''},${entry.hips || ''},${entry.arms || ''},${entry.thighs || ''}\n`;
    });
    csv += '\n';
  }

  // Entrenamientos
  if (data.workoutHistory.length > 0) {
    csv += 'Entrenamientos\nFecha, Rutina, Día, Ejercicio, Serie, Peso (kg), Reps\n';
    data.workoutHistory.forEach(session => {
      const sessionDate = new Date(session.date).toISOString();
      session.exercises.forEach(ex => {
        ex.sets.forEach(set => {
          csv += `${sessionDate},${session.routineId || ''},${session.dayIndex},${ex.name},${set.setNum},${set.weight},${set.reps}\n`;
        });
      });
    });
    csv += '\n';
  }

  // Comidas
  if (data.foodIntake.length > 0) {
    csv += 'Comidas\nFecha, Alimento, Gramos, Calorías, Proteínas, Carbohidratos, Grasas\n';
    data.foodIntake.forEach(entry => {
      csv += `${entry.timestamp},${entry.foodName},${entry.grams},${entry.macros?.cal || 0},${entry.macros?.pro || 0},${entry.macros?.carb || 0},${entry.macros?.fat || 0}\n`;
    });
  }

  return csv;
}

// Descargar archivo
export function downloadFile(content, filename, type = 'text/csv') {
  const blob = new Blob(['\uFEFF' + content], { type }); // BOM para Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}