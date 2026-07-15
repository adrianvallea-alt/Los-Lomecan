import { useState, useEffect, useCallback } from 'react';

const STORAGE_PREFIX = 'weightLogs_';

export default function useWeightLogs(profileId) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (!profileId) return;
    const stored = localStorage.getItem(STORAGE_PREFIX + profileId);
    if (stored) {
      try {
        setLogs(JSON.parse(stored));
      } catch (e) {
        setLogs([]);
      }
    } else {
      setLogs([]);
    }
  }, [profileId]);

  useEffect(() => {
    if (!profileId) return;
    localStorage.setItem(STORAGE_PREFIX + profileId, JSON.stringify(logs));
  }, [logs, profileId]);

  const addLog = useCallback((weight) => {
    const newEntry = {
      id: Date.now(),
      date: new Date().toISOString(),
      weight: parseFloat(weight),
    };
    setLogs(prev => {
      const today = new Date().toDateString();
      const filtered = prev.filter(entry => new Date(entry.date).toDateString() !== today);
      return [...filtered, newEntry].sort((a, b) => new Date(a.date) - new Date(b.date));
    });
  }, []);

  const getRecentLogs = (count = 30) => logs.slice(-count);

  return { logs, addLog, getRecentLogs };
}