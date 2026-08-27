// src/hooks/useAchievements.js
import { useState, useEffect, useCallback } from 'react';

const ACHIEVEMENTS_LIST = [
  { id: 'first_session', name: 'Primera sesión', icon: '🎯', condition: (s) => s.totalSessions >= 1 },
  { id: '5_sessions', name: '5 entrenamientos', icon: '🏅', condition: (s) => s.totalSessions >= 5 },
  { id: '10_sessions', name: '10 entrenamientos', icon: '🔥', condition: (s) => s.totalSessions >= 10 },
  { id: '25_sessions', name: '25 entrenamientos', icon: '💪', condition: (s) => s.totalSessions >= 25 },
  { id: '50_sessions', name: '50 entrenamientos', icon: '🚀', condition: (s) => s.totalSessions >= 50 },
  { id: '100_sessions', name: '100 entrenamientos', icon: '👑', condition: (s) => s.totalSessions >= 100 },
  { id: 'streak_3', name: 'Racha de 3 días', icon: '⭐', condition: (s) => s.longestStreak >= 3 },
  { id: 'streak_7', name: 'Racha de 7 días', icon: '🌟', condition: (s) => s.longestStreak >= 7 },
  { id: 'streak_14', name: 'Racha de 14 días', icon: '✨', condition: (s) => s.longestStreak >= 14 },
  { id: 'streak_30', name: 'Racha de 30 días', icon: '💎', condition: (s) => s.longestStreak >= 30 },
  { id: 'volume_10000', name: '10,000 kg levantados', icon: '🏋️', condition: (s) => s.totalVolume >= 10000 },
  { id: 'volume_50000', name: '50,000 kg levantados', icon: '🏆', condition: (s) => s.totalVolume >= 50000 },
  { id: 'volume_100000', name: '100,000 kg levantados', icon: '👑', condition: (s) => s.totalVolume >= 100000 },
];

const toISODateOnly = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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

    const allSessions = [];
    const prefix = `workoutHistory_${activeProfileId}_`;

    // Lectura atómica segura de LocalStorage
    Object.keys(localStorage)
      .filter(key => key.startsWith(prefix))
      .forEach(key => {
        try {
          const parsed = JSON.parse(localStorage.getItem(key));
          if (Array.isArray(parsed)) allSessions.push(...parsed);
        } catch {}
      });

    const totalSessions = allSessions.length;
    let totalVolume = 0;
    const uniqueDaysSet = new Set();

    allSessions.forEach(session => {
      if (session.date) uniqueDaysSet.add(toISODateOnly(session.date));
      if (Array.isArray(session.exercises)) {
        session.exercises.forEach(ex => {
          if (Array.isArray(ex.sets)) {
            ex.sets.forEach(set => {
              const w = parseFloat(set.weight) || 0;
              const r = parseInt(set.repsDone || set.reps, 10) || 0;
              totalVolume += (w * r);
            });
          }
        });
      }
    });

    const sortedDateTimestamps = Array.from(uniqueDaysSet)
      .map(str => new Date(str + 'T00:00:00').getTime())
      .sort((a, b) => a - b);

    // Racha Actual
    let currentStreak = 0;
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDayMs = 86400000;

    let checkDay = todayMidnight;
    if (!uniqueDaysSet.has(toISODateOnly(checkDay))) {
      checkDay -= oneDayMs;
    }

    while (uniqueDaysSet.has(toISODateOnly(checkDay))) {
      currentStreak++;
      checkDay -= oneDayMs;
    }

    // Mejor Racha Histórica
    let longestStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < sortedDateTimestamps.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round((sortedDateTimestamps[i] - sortedDateTimestamps[i - 1]) / oneDayMs);
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    const calculatedStats = { totalSessions, currentStreak, longestStreak, totalVolume };
    setStats(calculatedStats);

    const savedKey = `achievements_${activeProfileId}`;
    const saved = JSON.parse(localStorage.getItem(savedKey) || '[]');
    const newUnlocked = [...saved];

    ACHIEVEMENTS_LIST.forEach(ach => {
      if (!newUnlocked.includes(ach.id) && ach.condition(calculatedStats)) {
        newUnlocked.push(ach.id);
      }
    });

    if (newUnlocked.length > saved.length) {
      localStorage.setItem(savedKey, JSON.stringify(newUnlocked));
    }
    setUnlocked(newUnlocked);
  }, [activeProfileId]);

  useEffect(() => {
    calculateStats();
    const handler = () => calculateStats();
    window.addEventListener('workoutFinished', handler);
    return () => window.removeEventListener('workoutFinished', handler);
  }, [calculateStats]);

  return {
    ...stats,
    unlockedAchievements: ACHIEVEMENTS_LIST.filter(a => unlocked.includes(a.id)),
    refresh: calculateStats,
  };
}