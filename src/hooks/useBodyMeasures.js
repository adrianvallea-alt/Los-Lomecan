import { useState, useEffect, useCallback } from 'react';

const STORAGE_PREFIX = 'bodyMeasures_';

const defaultMeasures = {
  chest: null,
  waist: null,
  hips: null,
  arms: null,
  thighs: null,
};

export default function useBodyMeasures(profileId) {
  const [measures, setMeasures] = useState(defaultMeasures);
  const [history, setHistory] = useState([]);

  // Cargar desde localStorage
  useEffect(() => {
    if (!profileId) return;
    const stored = localStorage.getItem(STORAGE_PREFIX + profileId);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setMeasures(parsed.current || defaultMeasures);
        setHistory(parsed.history || []);
      } catch (e) {
        setMeasures(defaultMeasures);
        setHistory([]);
      }
    }
  }, [profileId]);

  // Guardar cambios
  const saveMeasures = useCallback((newMeasures) => {
    if (!profileId) return;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const existingIndex = history.findIndex(entry => entry.date === today);
    let newHistory = [...history];
    if (existingIndex >= 0) {
      newHistory[existingIndex] = { date: today, ...newMeasures };
    } else {
      newHistory.push({ date: today, ...newMeasures });
    }
    newHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

    const payload = { current: newMeasures, history: newHistory };
    localStorage.setItem(STORAGE_PREFIX + profileId, JSON.stringify(payload));
    setMeasures(newMeasures);
    setHistory(newHistory);
  }, [profileId, history]);

  return { measures, history, saveMeasures };
}