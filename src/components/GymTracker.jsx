import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  getCurrentMonth, getCurrentYear,
  updatePersonalRecords, getDayRecords, limitHistory,
  getSuggestedWeight, getSuggestedReps
} from '../utils/gymHelpers';
import { fetchWorkoutHistory, saveRoutine, deleteRoutine, saveWorkoutSession } from '../lib/dataService';
import { supabase } from '../lib/supabaseClient';

import RoutineList from './gym/RoutineList';
import DaySelector from './gym/DaySelector';
import AdminView from './gym/AdminView';
import LibraryView from './gym/LibraryView';
import LibraryAuth from './gym/LibraryAuth';
import RoutineCreator from './gym/RoutineCreator';
import TrackerView from './gym/TrackerView';
import FinishedView from './gym/FinishedView';
import HistoryView from './gym/HistoryView';

const AnimatedView = ({ children, isActive }) => (
  <div
    className={`absolute inset-0 transition-all duration-500 ease-out-expo ${
      isActive
        ? 'opacity-100 translate-y-0 blur-0 z-10'
        : 'opacity-0 translate-y-3 blur-sm pointer-events-none z-0'
    }`}
    aria-hidden={!isActive}
  >
    {children}
  </div>
);

export default function GymTracker({ activeProfile, routines, onUpdateRoutines, openLibrary, onLibraryOpened, addToQueue, currentRoutine }) {
  const [view, setView] = useState('routineList');
  const [previousView, setPreviousView] = useState('routineList');
  const [activeRoutine, setActiveRoutine] = useState(null);
  const [activeDayIndex, setActiveDayIndex] = useState(null);
  const [routineData, setRoutineData] = useState(null);
  const [lastSession, setLastSession] = useState(null);
  const [lastGlobalSets, setLastGlobalSets] = useState({});
  const [personalRecords, setPersonalRecords] = useState({});
  const [dayRecords, setDayRecords] = useState({});
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [libraryPassword, setLibraryPassword] = useState(() => localStorage.getItem('libraryPassword') || '');
  const [completedDaysMap, setCompletedDaysMap] = useState({});
  const [toastMessage, setToastMessage] = useState(null);

  const libraryCache = useRef(null);
  const isAdmin = activeProfile?.id === 'adrian';
  const hasAutoStarted = useRef(false);

  const navigate = useCallback((nextView) => {
    setPreviousView(view);
    setView(nextView);
  }, [view]);

  // Cargar biblioteca una vez
  useEffect(() => {
    if (!libraryCache.current) {
      supabase
        .from('exercises')
        .select('id, name, description, video_url')
        .then(({ data }) => { libraryCache.current = data || []; })
        .catch(() => { libraryCache.current = []; });
    }
  }, []);

  // Manejar apertura de biblioteca desde fuera
  useEffect(() => {
    if (openLibrary) {
      if (libraryPassword) navigate('libraryAuth');
      else navigate('library');
      onLibraryOpened?.();
    }
  }, [openLibrary]);

  // Cargar historial completo
  const loadAllHistory = useCallback(async () => {
    if (!activeProfile) return;
    const allSessions = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`workoutHistory_${activeProfile.id}_`)) {
        try {
          const sessions = JSON.parse(localStorage.getItem(key));
          if (Array.isArray(sessions)) allSessions.push(...sessions);
        } catch (e) {}
      }
    }

    let globalRecs = {};
    allSessions.forEach(s => { globalRecs = updatePersonalRecords(globalRecs, s); });
    setPersonalRecords(globalRecs);

    const lastSets = {};
    const sorted = [...allSessions].sort((a, b) => new Date(b.date) - new Date(a.date));
    sorted.forEach(session => {
      session.exercises.forEach(ex => {
        const key = ex.libraryExerciseId || ex.id;
        if (!lastSets[key]) {
          lastSets[key] = {
            sets: ex.sets.map(s => ({ weight: s.weight, reps: s.reps })),
            date: session.date,
            dayIndex: session.dayIndex
          };
        }
      });
    });
    setLastGlobalSets(lastSets);

    const today = new Date().toDateString();
    const completed = {};
    allSessions.forEach(session => {
      if (new Date(session.date).toDateString() === today) {
        if (!completed[session.routineId]) completed[session.routineId] = new Set();
        completed[session.routineId].add(session.dayIndex);
      }
    });
    setCompletedDaysMap(completed);
  }, [activeProfile]);

  useEffect(() => { if (activeProfile) loadAllHistory(); }, [activeProfile, loadAllHistory]);

  // Auto-inicio: si viene una rutina del dashboard y no hemos auto-iniciado ya
  useEffect(() => {
    if (currentRoutine && !hasAutoStarted.current && !openLibrary) {
      hasAutoStarted.current = true;
      setActiveRoutine(currentRoutine);
      const completed = completedDaysMap?.[currentRoutine.id] || new Set();
      const days = currentRoutine.trainingDays || [];
      let targetDay = 0;
      for (let i = 0; i < days.length; i++) {
        if (!completed.has(i)) {
          targetDay = i;
          break;
        }
      }
      startWorkout(currentRoutine, targetDay);
    }
  }, [currentRoutine, completedDaysMap, openLibrary]);

  // Reiniciar el flag cuando se desmonta o se sale del tracker
  const resetAutoStart = () => {
    hasAutoStarted.current = false;
  };

  const loadHistoryAndRecords = async (routineId, dayIndex) => {
    try {
      const historyArray = await fetchWorkoutHistory(activeProfile.id, routineId);
      const sessionsSameDay = historyArray.filter(s => s.dayIndex === dayIndex);
      setLastSession(sessionsSameDay.length > 0 ? sessionsSameDay[sessionsSameDay.length - 1] : null);
      setDayRecords(getDayRecords(sessionsSameDay));
    } catch (err) {
      const saved = localStorage.getItem(`workoutHistory_${activeProfile.id}_${routineId}`);
      if (saved) {
        const arr = JSON.parse(saved);
        const same = arr.filter(s => s.dayIndex === dayIndex);
        setLastSession(same.length ? same[same.length - 1] : null);
        setDayRecords(getDayRecords(same));
      }
    }
  };

  const handleSelectRoutine = (routine) => {
    resetAutoStart();
    setActiveRoutine(routine);
    navigate('daySelector');
  };

  const startWorkout = (routine, dayIndex) => {
    setActiveDayIndex(dayIndex);
    const trainingDay = routine.trainingDays[dayIndex];
    if (!trainingDay) return;

    const exercisesClone = trainingDay.exercises.map(ex => {
      const exKey = ex.libraryExerciseId || ex.id;
      const lastSets = lastGlobalSets[exKey]?.sets || [];
      const suggestedWeight = getSuggestedWeight(lastSets, '');
      const suggestedReps = getSuggestedReps(lastSets, '');

      return {
        ...ex,
        sets: ex.sets.map(s => {
          const originalWeight = s.weight;
          const originalReps = s.reps;
          const weight = suggestedWeight || originalWeight;
          const reps = suggestedReps || originalReps;
          return { ...s, weight, reps, originalWeight, originalReps, done: false };
        })
      };
    });

    setRoutineData({ ...routine, dayIndex, exercises: exercisesClone });
    loadHistoryAndRecords(routine.id, dayIndex);
    navigate('tracker');
  };

  const handleEditRoutine = (routine) => { setEditingRoutine(routine); navigate('create'); };

  const handleDeleteRoutine = async (routineId) => {
    if (window.confirm('¿Eliminar esta rutina y todo su historial?')) {
      const updated = routines.filter(r => r.id !== routineId);
      onUpdateRoutines(updated);
      localStorage.removeItem(`workoutHistory_${activeProfile.id}_${routineId}`);
      try { await deleteRoutine(routineId); } catch (e) { console.error(e); }
      if (activeRoutine?.id === routineId) {
        setActiveRoutine(null);
        setRoutineData(null);
      }
      loadAllHistory();
    }
  };

  const handleImportTemplate = async (template) => {
    if (!libraryCache.current) {
      const { data } = await supabase.from('exercises').select('id, name, description, video_url');
      libraryCache.current = data || [];
    }

    const enrichedDays = template.trainingDays.map(day => ({
      name: day.name,
      exercises: day.exercises.map(ex => {
        const match = libraryCache.current.find(lib => lib.name.toLowerCase() === ex.name.toLowerCase());
        let videoUrl = match?.video_url || '';
        if (videoUrl && !videoUrl.startsWith('http')) {
          videoUrl = `https://www.youtube.com/watch?v=${videoUrl}`;
        }
        return {
          ...ex,
          libraryExerciseId: match?.id || null,
          description: match?.description || '',
          video_url: videoUrl,
          sets: ex.sets.map(s => ({ ...s, weight: s.weight || '', reps: s.reps || '' }))
        };
      })
    }));

    const newRoutine = {
      id: 'r_' + Date.now(),
      name: template.name,
      month: getCurrentMonth(),
      year: getCurrentYear(),
      trainingDays: enrichedDays,
    };

    const updated = [...routines, newRoutine];
    onUpdateRoutines(updated);
    setToastMessage(`✅ "${template.name}" importada`);
    setTimeout(() => setToastMessage(null), 2500);

    try {
      await saveRoutine(activeProfile.id, newRoutine);
    } catch (e) {
      console.error('Error al guardar rutina, encolando:', e);
      addToQueue('saveRoutine', newRoutine);
    }
  };

  const handleSetPassword = (pass) => {
    localStorage.setItem('libraryPassword', pass);
    setLibraryPassword(pass);
    navigate('library');
  };

  const renderView = () => {
    switch (view) {
      case 'routineList':
        return (
          <RoutineList
            routines={routines}
            onSelectRoutine={handleSelectRoutine}
            onCreateRoutine={() => { setEditingRoutine(null); navigate('create'); }}
            onEditRoutine={(routine) => { setEditingRoutine(routine); navigate('create'); }}
            onDeleteRoutine={handleDeleteRoutine}
            onImportTemplate={handleImportTemplate}
            completedDays={completedDaysMap}
            onGoToHistory={() => navigate('history')}
          />
        );
      case 'daySelector':
        return activeRoutine ? (
          <DaySelector
            routine={activeRoutine}
            onSelectDay={startWorkout}
            onBack={() => navigate('routineList')}
            completedDays={completedDaysMap}
          />
        ) : null;
      case 'history':
        return <HistoryView activeProfile={activeProfile} onBack={() => navigate('routineList')} />;
      case 'admin':
        return (
          <AdminView
            routines={routines}
            onBack={() => navigate('routineList')}
            onCreateNew={() => { setEditingRoutine(null); navigate('create'); }}
            onEditRoutine={handleEditRoutine}
            onDeleteRoutine={handleDeleteRoutine}
            isAdmin={isAdmin}
          />
        );
      case 'libraryAuth':
        return (
          <LibraryAuth
            password={libraryPassword}
            onCorrectPassword={() => navigate('library')}
            onBack={() => navigate(previousView)}
          />
        );
      case 'library':
        return (
          <LibraryView
            password={libraryPassword}
            onSetPassword={handleSetPassword}
            onBack={() => navigate(previousView)}
          />
        );
      case 'create':
        return (
          <RoutineCreator
            initialData={editingRoutine}
            onSave={async (routineData) => {
              let updated;
              if (editingRoutine) updated = routines.map(r => r.id === routineData.id ? routineData : r);
              else updated = [...routines, routineData];
              onUpdateRoutines(updated);
              try {
                await saveRoutine(activeProfile.id, routineData);
              } catch (e) {
                console.error('Error al guardar rutina, encolando:', e);
                addToQueue('saveRoutine', routineData);
              }
              setEditingRoutine(null);
              navigate(editingRoutine ? 'admin' : 'routineList');
            }}
            onCancel={() => { setEditingRoutine(null); navigate(isAdmin ? 'admin' : 'routineList'); }}
          />
        );
      case 'tracker':
        return routineData ? (
          <TrackerView
            routineData={routineData}
            activeRoutine={activeRoutine}
            activeDayIndex={activeDayIndex}
            lastSession={lastSession}
            lastGlobalSets={lastGlobalSets}
            personalRecords={personalRecords}
            dayRecords={dayRecords}
            onFinish={async (session) => {
              const key = `workoutHistory_${activeProfile.id}_${activeRoutine.id}`;
              const saved = localStorage.getItem(key);
              let arr = saved ? JSON.parse(saved) : [];
              arr.push(session);
              arr = limitHistory(arr);
              localStorage.setItem(key, JSON.stringify(arr));

              try {
                await saveWorkoutSession(activeProfile.id, session);
              } catch (e) {
                console.error('Error al guardar sesión, encolando:', e);
                addToQueue('saveWorkoutSession', session);
              }

              await loadAllHistory();

              const oldRecords = { ...personalRecords };
              const newRecords = updatePersonalRecords(personalRecords, session);
              const brokenPRs = [];

              for (const exKey in newRecords) {
                if (!oldRecords[exKey] ||
                    newRecords[exKey].weight > oldRecords[exKey].weight ||
                    (newRecords[exKey].weight === oldRecords[exKey].weight && newRecords[exKey].reps > oldRecords[exKey].reps)) {
                  brokenPRs.push({
                    exerciseName: session.exercises.find(ex => (ex.libraryExerciseId || ex.id) === exKey)?.name || exKey,
                    weight: newRecords[exKey].weight,
                    reps: newRecords[exKey].reps,
                  });
                }
              }

              if (brokenPRs.length > 0) {
                window.dispatchEvent(new CustomEvent('newPRs', { detail: brokenPRs }));
              }

              resetAutoStart();
              navigate('finished');
              window.dispatchEvent(new Event('workoutFinished'));
            }}
            onGoBack={() => {
              resetAutoStart();
              navigate('daySelector');
            }}
          />
        ) : null;
      case 'finished':
        return (
          <FinishedView onRestart={() => {
            resetAutoStart();
            navigate('routineList');
            setActiveRoutine(null);
            setActiveDayIndex(null);
            setRoutineData(null);
          }} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0A0A0C] relative min-h-0 overflow-hidden">
      {/* Fondo con textura de grid y gradiente ambiental */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,#ffffff08,transparent_80%)]" />
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.015] bg-[size:24px_24px]" />
      </div>

      <div className="flex-1 relative">
        <AnimatedView isActive={view === 'routineList'}>{view === 'routineList' && renderView()}</AnimatedView>
        <AnimatedView isActive={view === 'daySelector'}>{view === 'daySelector' && renderView()}</AnimatedView>
        <AnimatedView isActive={view === 'history'}>{view === 'history' && renderView()}</AnimatedView>
        <AnimatedView isActive={view === 'admin'}>{view === 'admin' && renderView()}</AnimatedView>
        <AnimatedView isActive={view === 'libraryAuth'}>{view === 'libraryAuth' && renderView()}</AnimatedView>
        <AnimatedView isActive={view === 'library'}>{view === 'library' && renderView()}</AnimatedView>
        <AnimatedView isActive={view === 'create'}>{view === 'create' && renderView()}</AnimatedView>
        <AnimatedView isActive={view === 'tracker'}>{view === 'tracker' && renderView()}</AnimatedView>
        <AnimatedView isActive={view === 'finished'}>{view === 'finished' && renderView()}</AnimatedView>
      </div>

      {toastMessage && (
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#D4FF00] text-[#09090B] font-semibold px-5 py-2.5 rounded-full text-xs tracking-wide shadow-[0_0_24px_rgba(212,255,0,0.3)] animate-toast-in-out backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          {toastMessage}
        </div>
      )}

      <style>{`
        .ease-out-expo {
          transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes toastInOut {
          0% { opacity: 0; transform: translate(-50%, 12px) scale(0.96); filter: blur(4px); }
          15% { opacity: 1; transform: translate(-50%, 0) scale(1); filter: blur(0); }
          85% { opacity: 1; transform: translate(-50%, 0) scale(1); filter: blur(0); }
          100% { opacity: 0; transform: translate(-50%, -6px) scale(0.98); filter: blur(2px); }
        }
        .animate-toast-in-out {
          animation: toastInOut 2.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}