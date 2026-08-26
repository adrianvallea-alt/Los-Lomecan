// src/hooks/useReminders.js
import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'reminders_';

const defaultReminders = {
  water: { enabled: false, interval: 120 },
  meals: { enabled: false, times: ['08:00', '13:00', '20:00'] },
  workout: { enabled: false, time: '06:00' },
  macros: { enabled: false, time: '21:00' },
};

export default function useReminders(profileId) {
  const [reminders, setReminders] = useState(() => {
    if (!profileId) return defaultReminders;
    try {
      const stored = localStorage.getItem(STORAGE_KEY + profileId);
      return stored ? { ...defaultReminders, ...JSON.parse(stored) } : defaultReminders;
    } catch {
      return defaultReminders;
    }
  });

  const timersRef = useRef([]);

  useEffect(() => {
    if (!profileId) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY + profileId);
      if (stored) {
        setReminders({ ...defaultReminders, ...JSON.parse(stored) });
      }
    } catch {}
  }, [profileId]);

  useEffect(() => {
    if (!profileId) return;
    localStorage.setItem(STORAGE_KEY + profileId, JSON.stringify(reminders));
  }, [reminders, profileId]);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(id => {
      clearTimeout(id);
      clearInterval(id);
    });
    timersRef.current = [];
  }, []);

  const schedule = useCallback(() => {
    clearAllTimers();
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    // --- AGUA ---
    if (reminders.water?.enabled) {
      const intervalMs = (reminders.water.interval || 120) * 60 * 1000;
      const show = () => {
        try {
          new Notification('💧 Beber agua', {
            body: '¡Recuerda hidratarte! Lleva un vaso de agua.',
            icon: '/favicon.svg',
          });
        } catch {}
      };
      const first = setTimeout(() => {
        show();
        const intervalId = setInterval(show, intervalMs);
        timersRef.current.push(intervalId);
      }, 60000);
      timersRef.current.push(first);
    }

    // --- COMIDAS ---
    if (reminders.meals?.enabled && Array.isArray(reminders.meals.times)) {
      reminders.meals.times.forEach(timeStr => {
        const [h, m] = timeStr.split(':').map(Number);
        const now = new Date();
        const target = new Date(now);
        target.setHours(h, m, 0, 0);
        if (target <= now) target.setDate(target.getDate() + 1);

        const timeout = setTimeout(() => {
          try {
            new Notification('🍽️ Registrar comida', {
              body: 'Es hora de registrar tu comida en Lomecan.',
              icon: '/favicon.svg',
            });
          } catch {}
        }, target - now);
        timersRef.current.push(timeout);
      });
    }

    // --- ENTRENAMIENTO ---
    if (reminders.workout?.enabled && reminders.workout.time) {
      const [h, m] = reminders.workout.time.split(':').map(Number);
      const now = new Date();
      const target = new Date(now);
      target.setHours(h, m, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);

      const timeout = setTimeout(() => {
        try {
          new Notification('🏋️ Hora de entrenar', {
            body: '¡Tu rutina te espera hoy!',
            icon: '/favicon.svg',
          });
        } catch {}
      }, target - now);
      timersRef.current.push(timeout);
    }

    // --- MACROS ---
    if (reminders.macros?.enabled && reminders.macros.time) {
      const [h, m] = reminders.macros.time.split(':').map(Number);
      const now = new Date();
      const target = new Date(now);
      target.setHours(h, m, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);

      const timeout = setTimeout(() => {
        try {
          new Notification('📊 Completar macros', {
            body: 'Revisa si alcanzaste tus objetivos nutricionales de hoy.',
            icon: '/favicon.svg',
          });
        } catch {}
      }, target - now);
      timersRef.current.push(timeout);
    }
  }, [reminders, clearAllTimers]);

  useEffect(() => {
    if (profileId && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      schedule();
    }
    return () => clearAllTimers();
  }, [profileId, schedule, clearAllTimers]);

  const updateReminders = (newRem) => {
    setReminders(newRem);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const anyEnabled = Object.values(newRem).some(r => r.enabled);
      if (anyEnabled && Notification.permission === 'default') {
        Notification.requestPermission().then(perm => {
          if (perm === 'granted') schedule();
        });
      } else if (anyEnabled && Notification.permission === 'granted') {
        schedule();
      } else {
        clearAllTimers();
      }
    }
  };

  return { reminders, updateReminders };
}