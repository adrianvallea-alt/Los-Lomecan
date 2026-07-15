import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'reminders_';

const defaultReminders = {
  water: { enabled: false, interval: 120 },       // minutos
  meals: { enabled: false, times: ['08:00', '13:00', '20:00'] },
  workout: { enabled: false, time: '06:00' },
  macros: { enabled: false, time: '21:00' },
};

export default function useReminders(profileId) {
  const [reminders, setReminders] = useState(defaultReminders);
  const timersRef = useRef([]);

  // Cargar configuración guardada
  useEffect(() => {
    if (!profileId) return;
    const stored = localStorage.getItem(STORAGE_KEY + profileId);
    if (stored) {
      try {
        setReminders(prev => ({ ...prev, ...JSON.parse(stored) }));
      } catch (e) {
        setReminders(defaultReminders);
      }
    }
  }, [profileId]);

  // Guardar al cambiar
  useEffect(() => {
    if (!profileId) return;
    localStorage.setItem(STORAGE_KEY + profileId, JSON.stringify(reminders));
  }, [reminders, profileId]);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(id => clearTimeout(id));
    timersRef.current = [];
  }, []);

  // Programar notificaciones según la configuración actual
  const schedule = useCallback(() => {
    clearAllTimers();
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    // --- AGUA ---
    if (reminders.water.enabled) {
      const intervalMs = reminders.water.interval * 60 * 1000;
      const show = () => {
        new Notification('💧 Beber agua', {
          body: '¡Recuerda hidratarte! Lleva un vaso de agua.',
          icon: '/favicon.svg',
        });
      };
      const first = setTimeout(() => {
        show();
        const intervalId = setInterval(show, intervalMs);
        timersRef.current.push(intervalId);
      }, 60000); // primera notificación tras 1 minuto
      timersRef.current.push(first);
    }

    // --- COMIDAS ---
    if (reminders.meals.enabled) {
      reminders.meals.times.forEach(timeStr => {
        const [h, m] = timeStr.split(':').map(Number);
        const now = new Date();
        const target = new Date(now);
        target.setHours(h, m, 0, 0);
        if (target <= now) target.setDate(target.getDate() + 1);

        const timeout = setTimeout(() => {
          new Notification('🍽️ Registrar comida', {
            body: 'Es hora de registrar tu comida.',
            icon: '/favicon.svg',
          });
          // Reprogramar para el día siguiente
          const nextDay = new Date(target);
          nextDay.setDate(nextDay.getDate() + 1);
          const nextTimeout = setTimeout(() => {
            new Notification('🍽️ Registrar comida', {
              body: 'Es hora de registrar tu comida.',
            });
          }, nextDay - Date.now());
          timersRef.current.push(nextTimeout);
        }, target - now);
        timersRef.current.push(timeout);
      });
    }

    // --- ENTRENAMIENTO ---
    if (reminders.workout.enabled) {
      const [h, m] = reminders.workout.time.split(':').map(Number);
      const now = new Date();
      const target = new Date(now);
      target.setHours(h, m, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);

      const timeout = setTimeout(() => {
        new Notification('🏋️ Hora de entrenar', {
          body: '¡Vamos! Tu entrenamiento te espera.',
          icon: '/favicon.svg',
        });
        const nextDay = new Date(target);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextTimeout = setTimeout(() => {
          new Notification('🏋️ Hora de entrenar', {
            body: '¡Vamos! Tu entrenamiento te espera.',
          });
        }, nextDay - Date.now());
        timersRef.current.push(nextTimeout);
      }, target - now);
      timersRef.current.push(timeout);
    }

    // --- MACROS ---
    if (reminders.macros.enabled) {
      const [h, m] = reminders.macros.time.split(':').map(Number);
      const now = new Date();
      const target = new Date(now);
      target.setHours(h, m, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);

      const timeout = setTimeout(() => {
        new Notification('📊 Completar macros', {
          body: 'Revisa si has alcanzado tus metas de macros hoy.',
          icon: '/favicon.svg',
        });
        const nextDay = new Date(target);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextTimeout = setTimeout(() => {
          new Notification('📊 Completar macros', {
            body: 'Revisa si has alcanzado tus metas de macros hoy.',
          });
        }, nextDay - Date.now());
        timersRef.current.push(nextTimeout);
      }, target - now);
      timersRef.current.push(timeout);
    }
  }, [reminders, clearAllTimers]);

  // Reactivar al cambiar configuración o al montar
  useEffect(() => {
    if (profileId && Notification.permission === 'granted') {
      schedule();
    }
    return () => clearAllTimers();
  }, [profileId, schedule, clearAllTimers]);

  const requestPermission = async () => {
    if (Notification.permission === 'default') {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') schedule();
    } else if (Notification.permission === 'granted') {
      schedule();
    }
  };

  const updateReminders = (newRem) => {
    setReminders(newRem);
    const anyEnabled = Object.values(newRem).some(r => r.enabled);
    if (anyEnabled && Notification.permission !== 'granted') {
      requestPermission();
    } else if (anyEnabled && Notification.permission === 'granted') {
      schedule();
    } else {
      clearAllTimers();
    }
  };

  return { reminders, updateReminders };
}