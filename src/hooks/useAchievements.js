import { useState, useEffect, useCallback } from 'react';

const ACHIEVEMENTS_LIST = [
  { id: 'first_session', name: 'Primera sesión', icon: '🎯', condition: (stats) => stats.totalSessions >= 1 },
  { id: '5_sessions', name: '5 entrenamientos', icon: '🏅', condition: (stats) => stats.totalSessions >= 5 },
  { id: '10_sessions', name: '10 entrenamientos', icon: '🔥', condition: (stats) => stats.totalSessions >= 10 },
  { id: '25_sessions', name: '25 entrenamientos', icon: '💪', condition: (stats) => stats.totalSessions >= 25 },
  { id: '50_sessions', name: '50 entrenamientos', icon: '🚀', condition: (stats) => stats.totalSessions >= 50 },
  { id: '100_sessions', name: '100 entrenamientos', icon: '👑', condition: (stats) => stats.totalSessions >= 100 },
  { id: 'streak_3', name: 'Racha de 3 días', icon: '⭐', condition: (stats) => stats.longestStreak >= 3 },
  { id: 'streak_7', name: 'Racha de 7 días', icon: '🌟', condition: (stats) => stats.longestStreak >= 7 },
  { id: 'streak_14', name: 'Racha de 14 días', icon: '✨', condition: (stats) => stats.longestStreak >= 14 },
  { id: 'streak_30', name: 'Racha de 30 días', icon: '💎', condition: (stats) => stats.longestStreak >= 30 },
  { id: 'volume_10000', name: '10,000 kg levantados', icon: '🏋️', condition: (stats) => stats.totalVolume >= 10000 },
  { id: 'volume_50000', name: '50,000 kg levantados', icon: '🏆', condition: (stats) => stats.totalVolume >= 50000 },
  { id: 'volume_100000', name: '100,000 kg levantados', icon: '👑', condition: (stats) => stats.totalVolume >= 100000 },
];

function getDateKey(date) {
  return new Date(date).toDateString();
}

export default function useAchievements(activeProfileId) {
  const [stats, setStats] = useState({
    totalSessions: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalVolume: 0,
  });
  const [unlocked, setUnlocked] = useState([]);

  const calculateStats = useCallback(() => {
    if (!activeProfileId) return;

    // Obtener todas las sesiones desde localStorage
    const allSessions = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`workoutHistory_${activeProfileId}_`)) {
        try {
          const sessions = JSON.parse(localStorage.getItem(key));
          if (Array.isArray(sessions)) allSessions.push(...sessions);
        } catch (e) {}
      }
    }

    // Ordenar por fecha ascendente
    allSessions.sort((a, b) => new Date(a.date) - new Date(b.date));

    const totalSessions = allSessions.length;

    // Volumen total
    let totalVolume = 0;
    allSessions.forEach(session => {
      const volume = session.exercises.reduce((sum, ex) =>
        sum + ex.sets.reduce((s, set) => s + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0), 0);
      totalVolume += volume;
    });

    // Días únicos con entrenamiento
    const uniqueDays = new Set();
    allSessions.forEach(s => uniqueDays.add(getDateKey(s.date)));
    const sortedDays = Array.from(uniqueDays).map(d => new Date(d)).sort((a, b) => a - b);

    // Racha actual (desde hoy hacia atrás)
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let checkDate = new Date(today);

    // Si hoy no entrenó, miramos ayer
    if (!uniqueDays.has(getDateKey(checkDate))) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (uniqueDays.has(getDateKey(checkDate))) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Mejor racha histórica
    let longestStreak = 0;
    let tempStreak = 0;
    for (let i = 0; i < sortedDays.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const diff = (sortedDays[i] - sortedDays[i-1]) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    const newStats = { totalSessions, currentStreak, longestStreak, totalVolume };
    setStats(newStats);

    // Desbloquear logros
    const savedAchievements = JSON.parse(localStorage.getItem(`achievements_${activeProfileId}`) || '[]');
    const newUnlocked = [...savedAchievements];
    ACHIEVEMENTS_LIST.forEach(ach => {
      if (!newUnlocked.includes(ach.id) && ach.condition(newStats)) {
        newUnlocked.push(ach.id);
      }
    });
    if (newUnlocked.length > savedAchievements.length) {
      localStorage.setItem(`achievements_${activeProfileId}`, JSON.stringify(newUnlocked));
    }
    setUnlocked(newUnlocked);
  }, [activeProfileId]);

  useEffect(() => {
    calculateStats();
    // Escuchar el evento para refrescar cuando se termine un entrenamiento
    const handler = () => calculateStats();
    window.addEventListener('workoutFinished', handler);
    return () => window.removeEventListener('workoutFinished', handler);
  }, [calculateStats]);

  const unlockedAchievements = ACHIEVEMENTS_LIST.filter(ach => unlocked.includes(ach.id));

  return {
    totalSessions: stats.totalSessions,
    currentStreak: stats.currentStreak,
    longestStreak: stats.longestStreak,
    totalVolume: stats.totalVolume,
    unlockedAchievements,
    refresh: calculateStats,
  };
}