import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Plus, Edit3, Trash2 } from 'lucide-react';
import {
  getCurrentMonth, getCurrentYear,
  updatePersonalRecords, getDayRecords, limitHistory,
  getSuggestedWeight, getSuggestedReps
} from '../utils/gymHelpers';
import { fetchWorkoutHistory, saveUserRoutine, deleteUserRoutine, saveWorkoutSession, fetchAllGlobalRoutines, importRoutineToProfile } from '../lib/dataService';
import { supabase } from '../lib/supabaseClient';

import RoutineHome from './gym/RoutineHome';
import DaySelector from './gym/DaySelector';
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

export default function GymTracker({ 
  activeProfile, 
  routines, 
  onUpdateRoutines, 
  openLibrary, 
  onLibraryOpened, 
  addToQueue,
}) {
  const [view, setView] = useState('home');
  const [previousView, setPreviousView] = useState('home');
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
  const [showImportModal, setShowImportModal] = useState(false);

  const libraryCache = useRef(null);
  const navigate = useCallback((nextView) => {
    setPreviousView(view);
    setView(nextView);
  }, [view]);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const currentRoutine = routines.find(r => r.month === currentMonth && r.year === currentYear);

  // ========== CARGAR RUTINAS GLOBALES PARA IMPORTAR ==========
  const getAllGlobalRoutines = useCallback(async () => {
    try {
      const globalRoutines = await fetchAllGlobalRoutines();
      return globalRoutines || [];
    } catch (err) {
      console.error("Error cargando rutinas globales:", err);
      return [];
    }
  }, []);

  // ========== CONVERTIR UNA PLANTILLA EN RUTINA ACTIVA ==========
  const handleSetActiveRoutine = async (template) => {
    const newActiveRoutine = {
      ...template,
      id: 'r_' + Date.now(),
      month: currentMonth,
      year: currentYear,
    };

    const updatedRoutines = [...routines, newActiveRoutine];
    onUpdateRoutines(updatedRoutines);
    setToastMessage(`✅ "${newActiveRoutine.name}" establecida como rutina activa`);
    setTimeout(() => setToastMessage(null), 2500);

    try {
      await saveUserRoutine(activeProfile.id, newActiveRoutine);
    } catch (e) {
      addToQueue('saveRoutine', newActiveRoutine);
    }
    navigate('home');
  };

  // ========== IMPORTAR RUTINA ==========
  const addRoutineToProfile = async (routineId) => {
    if (!activeProfile) return;
    try {
      await importRoutineToProfile(activeProfile.id, routineId);
      const { data: routineData, error } = await supabase
        .from('routines').select('*').eq('id', routineId).single();
      if (error) throw error;

      if (routineData) {
        const importedRoutine = {
          id: routineData.id,
          name: routineData.name,
          month: routineData.month,
          year: routineData.year,
          trainingDays: routineData.training_days || [],
          createdBy: routineData.created_by,
        };
        const updatedRoutines = [...routines, importedRoutine];
        onUpdateRoutines(updatedRoutines);
        setToastMessage(`✅ Rutina "${importedRoutine.name}" importada`);
        setTimeout(() => setToastMessage(null), 2500);
        setShowImportModal(false);
      }
    } catch (err) {
      console.error('Error importando rutina:', err);
      setToastMessage('❌ Error al importar la rutina');
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  // ========== RESTO DE FUNCIONES (ENTRENAMIENTO) ==========
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

  const handleSelectRoutine = (routine) => {
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
    if (window.confirm('¿Eliminar esta rutina?')) {
      const updated = routines.filter(r => r.id !== routineId);
      onUpdateRoutines(updated);
      try { await deleteUserRoutine(activeProfile.id, routineId); } catch (e) { console.error(e); }
      if (currentRoutine?.id === routineId) { setActiveRoutine(null); setRoutineData(null); }
      loadAllHistory();
    }
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

  const handleSetPassword = (pass) => {
    localStorage.setItem('libraryPassword', pass);
    setLibraryPassword(pass);
    navigate('library');
  };

  // ========== RENDERIZADO DE VISTAS ==========
  const renderView = () => {
    switch (view) {
      case 'home':
        return (
          <RoutineHome
            currentRoutine={currentRoutine}
            onStartWorkout={handleSelectRoutine}
            onManageTemplates={() => navigate('library')}
            onDeleteRoutine={handleDeleteRoutine} // ✅ CORREGIDO: Se agregó esta línea
          />
        );
      case 'daySelector':
        return activeRoutine ? (
          <DaySelector
            routine={activeRoutine}
            onSelectDay={startWorkout}
            onBack={() => navigate('home')}
            completedDays={completedDaysMap}
          />
        ) : null;
      case 'history':
        return <HistoryView activeProfile={activeProfile} onBack={() => navigate('home')} />;
      case 'library':
        return (
          <div className="flex flex-col h-full bg-[#0A0A0C] p-4 relative">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white tracking-tight">Mis Plantillas</h2>
              <button onClick={() => navigate('home')} className="p-2.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pb-20">
              {routines.map(routine => (
                <div key={routine.id} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{routine.name}</p>
                    <p className="text-xs text-zinc-500">{routine.trainingDays?.length || 0} días</p>
                  </div>
                  <div className="flex gap-2">
                    {routine.id !== currentRoutine?.id ? (
                      <button 
                        onClick={() => handleSetActiveRoutine(routine)}
                        className="px-3 py-1.5 bg-[#D4FF00] text-[#09090B] text-xs font-bold rounded-lg hover:bg-[#C4E600]"
                      >
                        Usar este mes
                      </button>
                    ) : (
                      <span className="px-3 py-1.5 bg-white/[0.05] border border-white/[0.08] text-zinc-400 text-xs rounded-lg">
                        En curso
                      </span>
                    )}
                    <button onClick={() => handleEditRoutine(routine)} className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => handleDeleteRoutine(routine.id)} className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex flex-col gap-3 pt-4">
                 <button onClick={() => setShowImportModal(true)} className="w-full py-4 bg-white/[0.02] border border-white/[0.06] rounded-2xl text-sm text-zinc-300 hover:text-white hover:border-white/[0.12] transition-colors">
                   Importar rutina global
                 </button>
                 <button onClick={() => { setEditingRoutine(null); navigate('create'); }} className="w-full py-4 border border-dashed border-white/[0.08] rounded-2xl text-sm text-zinc-400 hover:border-[#D4FF00]/30 hover:text-[#D4FF00] flex items-center justify-center gap-2 font-medium">
                   <Plus size={16} /> Nueva plantilla
                 </button>
              </div>
            </div>
          </div>
        );
      case 'libraryAuth':
        return <LibraryAuth password={libraryPassword} onCorrectPassword={() => navigate('library')} onBack={() => navigate(previousView)} />;
      case 'create':
        return (
          <RoutineCreator
            initialData={editingRoutine}
            onSave={async (routineData) => {
              let updated;
              if (editingRoutine) updated = routines.map(r => r.id === routineData.id ? routineData : r);
              else updated = [...routines, routineData];
              onUpdateRoutines(updated);
              try { await saveUserRoutine(activeProfile.id, routineData); } catch (e) { addToQueue('saveRoutine', routineData); }
              setEditingRoutine(null);
              navigate('library');
            }}
            onCancel={() => { setEditingRoutine(null); navigate('library'); }}
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

              try { await saveWorkoutSession(activeProfile.id, session); } catch (e) { addToQueue('saveWorkoutSession', session); }

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
              if (brokenPRs.length > 0) window.dispatchEvent(new CustomEvent('newPRs', { detail: brokenPRs }));

              navigate('finished');
              window.dispatchEvent(new Event('workoutFinished'));
            }}
            onGoBack={() => navigate('daySelector')}
          />
        ) : null;
      case 'finished':
        return (
          <FinishedView onRestart={() => {
            navigate('home');
            setActiveRoutine(null);
            setActiveDayIndex(null);
            setRoutineData(null);
          }} />
        );
      default: return null;
    }
  };

  const isActive = (v) => view === v;

  return (
    <div className="flex-1 flex flex-col bg-[#0A0A0C] relative min-h-0 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,#ffffff08,transparent_80%)]" />
      </div>

      <div className="flex-1 relative">
        {view === 'home' && <AnimatedView isActive={isActive('home')}>{renderView()}</AnimatedView>}
        {view === 'daySelector' && <AnimatedView isActive={isActive('daySelector')}>{renderView()}</AnimatedView>}
        {view === 'history' && <AnimatedView isActive={isActive('history')}>{renderView()}</AnimatedView>}
        {view === 'library' && <AnimatedView isActive={isActive('library')}>{renderView()}</AnimatedView>}
        {view === 'libraryAuth' && <AnimatedView isActive={isActive('libraryAuth')}>{renderView()}</AnimatedView>}
        {view === 'create' && <AnimatedView isActive={isActive('create')}>{renderView()}</AnimatedView>}
        {view === 'tracker' && <AnimatedView isActive={isActive('tracker')}>{renderView()}</AnimatedView>}
        {view === 'finished' && <AnimatedView isActive={isActive('finished')}>{renderView()}</AnimatedView>}
      </div>

      {toastMessage && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#D4FF00] text-[#09090B] font-semibold px-5 py-2.5 rounded-full text-xs tracking-wide shadow-[0_0_24px_rgba(212,255,0,0.3)] animate-toast-in-out backdrop-blur-sm">
          {toastMessage}
        </div>
      )}

      {showImportModal && (
        <ImportRoutineModal 
          onFetchGlobalRoutines={getAllGlobalRoutines}
          onImport={addRoutineToProfile}
          onClose={() => setShowImportModal(false)}
          currentRoutines={routines}
        />
      )}
    </div>
  );
}

// Componente Modal de Importación
function ImportRoutineModal({ onFetchGlobalRoutines, onImport, onClose, currentRoutines }) {
  const [selectedId, setSelectedId] = useState(null);
  const [globalRoutines, setGlobalRoutines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (onFetchGlobalRoutines) {
      onFetchGlobalRoutines()
        .then(data => { setGlobalRoutines(data || []); setLoading(false); })
        .catch(err => { console.error(err); setGlobalRoutines([]); setLoading(false); });
    }
  }, [onFetchGlobalRoutines]);

  const availableRoutines = loading ? [] : globalRoutines.filter(r => !currentRoutines.some(cr => cr.id === r.id));

  return (
    <div className="fixed inset-0 z-[100] bg-[#09090B]/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#0A0A0C] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full max-h-[80vh] flex flex-col shadow-2xl">
        <h3 className="text-white font-bold text-base mb-2">Importar rutina</h3>
        <p className="text-zinc-400 text-xs mb-4">Selecciona una rutina global para añadirla a tus plantillas.</p>
        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <div className="text-center py-8 text-zinc-500">Cargando...</div>
          ) : availableRoutines.length === 0 ? (
            <p className="text-zinc-500 text-sm text-center py-4">No hay rutinas disponibles para importar.</p>
          ) : (
            availableRoutines.map(r => (
              <button key={r.id} onClick={() => setSelectedId(r.id)} className={`w-full text-left p-3 rounded-xl border transition-all ${selectedId === r.id ? 'border-[#D4FF00]/40 bg-[#D4FF00]/5' : 'border-white/[0.06] bg-white/[0.02]'}`}>
                <p className="text-white font-semibold text-sm">{r.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{r.trainingDays?.length || 0} días</p>
              </button>
            ))
          )}
        </div>
        <div className="flex gap-3 mt-4 pt-4 border-t border-white/[0.05]">
          <button onClick={onClose} className="flex-1 py-3 border border-white/[0.08] rounded-xl text-zinc-400 text-sm">Cancelar</button>
          <button onClick={() => { if (selectedId) { onImport(selectedId); } }} disabled={!selectedId || loading} className="flex-1 py-3 bg-[#D4FF00] text-[#09090B] font-bold rounded-xl text-sm disabled:opacity-30">Importar</button>
        </div>
      </div>
    </div>
  );
}