// src/components/GymTracker.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, Plus, Edit3, Trash2, Globe, Sparkles } from 'lucide-react';
import {
  updatePersonalRecords, getDayRecords, limitHistory,
  getProgressionSuggestion
} from '../utils/gymHelpers';
import { 
  fetchWorkoutHistory, 
  fetchUserRoutines,
  saveUserRoutine, 
  deleteUserRoutine, 
  saveWorkoutSession, 
  fetchAllGlobalRoutines, 
  importRoutineToProfile 
} from '../lib/dataService';

import RoutineHome from './gym/RoutineHome';
import DaySelector from './gym/DaySelector';
import LibraryAuth from './gym/LibraryAuth';
import LibraryView from './gym/LibraryView';
import RoutineCreator from './gym/RoutineCreator';
import TrackerView from './gym/TrackerView';
import FinishedView from './gym/FinishedView';
import HistoryView from './gym/HistoryView';

export default function GymTracker({ 
  activeProfile, 
  routines = [], 
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
  const [globalRoutinesVersion, setGlobalRoutinesVersion] = useState(0);

  const viewRef = useRef(view);
  viewRef.current = view;
  const showImportModalRef = useRef(showImportModal);
  showImportModalRef.current = showImportModal;

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  const navigate = useCallback((nextView) => {
    setPreviousView(view);
    setView(nextView);
  }, [view]);

  // =========================================================================
  // GESTIÓN JERÁRQUICA DEL BOTÓN ATRÁS EN GIMNASIO
  // =========================================================================
  useEffect(() => {
    const handleBackEvent = (e) => {
      // 1. Si el modal de importar está abierto, cerrarlo y detener retroceso
      if (showImportModalRef.current) {
        e.preventDefault();
        setShowImportModal(false);
        return;
      }

      const currentV = viewRef.current;

      // 2. Si estamos dentro de TrackerView, TrackerView se encarga con su propio diálogo de confirmación
      if (currentV === 'tracker') {
        return;
      }

      // 3. Si estamos en el creador, regresar al listado
      if (currentV === 'create') {
        e.preventDefault();
        setEditingRoutine(null);
        setView('library');
        return;
      }

      // 4. Si estamos en cualquier otra sub-vista del gym, regresar a la pantalla 'home' de rutinas
      if (currentV === 'daySelector' || currentV === 'history' || currentV === 'library' || currentV === 'exerciseLibrary' || currentV === 'finished' || currentV === 'libraryAuth') {
        e.preventDefault();
        setView('home');
        return;
      }

      // 5. Si ya estamos en 'home' (pantalla principal de rutinas):
      // NO llamamos a e.preventDefault(). Dejamos que App.jsx capture el evento
      // y regrese fluidamente a la pestaña "Hoy" (Dashboard).
    };

    window.addEventListener('lomecan-hardware-back', handleBackEvent);
    return () => window.removeEventListener('lomecan-hardware-back', handleBackEvent);
  }, []);

  const currentRoutine = useMemo(() => routines.find(r => r.is_active === true), [routines]);
  const isAdmin = activeProfile?.id === 'adrian';

  useEffect(() => {
    if (openLibrary) {
      setView('exerciseLibrary');
      if (onLibraryOpened) onLibraryOpened();
    }
  }, [openLibrary, onLibraryOpened]);

  const getAllGlobalRoutines = useCallback(async () => {
    try {
      const globalRoutines = await fetchAllGlobalRoutines();
      return globalRoutines || [];
    } catch (err) {
      console.error("Error cargando rutinas globales:", err);
      return [];
    }
  }, []);

  const handleSetActiveRoutine = async (routineToActivate) => {
    const previousActive = routines.find(r => r.id !== routineToActivate.id && r.is_active === true);

    const updatedRoutines = routines.map(r => ({
      ...r,
      is_active: r.id === routineToActivate.id
    }));

    onUpdateRoutines(updatedRoutines);
    showToast(`✅ "${routineToActivate.name}" ahora está En curso`);

    try {
      if (previousActive) {
        await saveUserRoutine(activeProfile.id, { ...previousActive, is_active: false });
      }
      const newActive = updatedRoutines.find(r => r.id === routineToActivate.id);
      if (newActive) {
        await saveUserRoutine(activeProfile.id, newActive);
      }
    } catch {
      if (previousActive) addToQueue('saveRoutine', { ...previousActive, is_active: false, profileId: activeProfile.id });
      if (newActive) addToQueue('saveRoutine', { ...newActive, profileId: activeProfile.id });
    }
    navigate('home');
  };

  const handleImportGlobal = async (globalRoutineId) => {
    if (!activeProfile?.id) return;
    try {
      await importRoutineToProfile(activeProfile.id, globalRoutineId);
      const freshRoutines = await fetchUserRoutines(activeProfile.id);
      onUpdateRoutines(freshRoutines);
      showToast('✅ Rutina importada a tus rutinas');
      setShowImportModal(false);
    } catch (err) {
      console.error('Error importando rutina:', err);
      showToast('❌ Error al importar la rutina');
    }
  };

  const handleDeleteGlobalRoutine = async (routineId) => {
    if (!isAdmin) {
      showToast('⚠️ Solo el administrador puede borrar plantillas globales');
      return;
    }
    if (window.confirm('¿Eliminar esta rutina del catálogo global del club?')) {
      try {
        await deleteUserRoutine(activeProfile.id, routineId, true);
        showToast('🗑️ Rutina global eliminada');
        setGlobalRoutinesVersion(prev => prev + 1);
      } catch {
        addToQueue('deleteRoutine', { id: routineId, isGlobal: true, profileId: activeProfile.id });
        showToast('🗑️ Rutina eliminada (pendiente sincronización)');
      }
    }
  };

  const handleEditGlobalRoutine = (routine) => {
    setEditingRoutine({ ...routine, is_global: true });
    navigate('create');
  };

  const loadAllHistory = useCallback(async () => {
    if (!activeProfile?.id) return;
    const allSessions = [];
    const prefix = `workoutHistory_${activeProfile.id}_`;

    Object.keys(localStorage)
      .filter(key => key.startsWith(prefix))
      .forEach(key => {
        try {
          const sessions = JSON.parse(localStorage.getItem(key));
          if (Array.isArray(sessions)) allSessions.push(...sessions);
        } catch {}
      });

    let globalRecs = {};
    allSessions.forEach(s => { globalRecs = updatePersonalRecords(globalRecs, s); });
    setPersonalRecords(globalRecs);

    const lastSets = {};
    const sorted = [...allSessions].sort((a, b) => new Date(b.date) - new Date(a.date));
    sorted.forEach(session => {
      (session.exercises || []).forEach(ex => {
        const key = ex.libraryExerciseId || ex.id;
        if (!lastSets[key]) {
          lastSets[key] = {
            sets: (ex.sets || []).map(s => ({ weight: s.weight, reps: s.repsDone || s.reps })),
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
  }, [activeProfile?.id]);

  useEffect(() => { 
    if (activeProfile?.id) loadAllHistory(); 
  }, [activeProfile?.id, loadAllHistory]);

  const handleSelectRoutine = (routine) => {
    setActiveRoutine(routine);
    navigate('daySelector');
  };

  const startWorkout = (routine, dayIndex) => {
    setActiveDayIndex(dayIndex);
    const trainingDay = routine.trainingDays?.[dayIndex];
    if (!trainingDay) return;

    if (!trainingDay.exercises || trainingDay.exercises.length === 0) {
      showToast('⚠️ Esta rutina no tiene ejercicios en este día');
      return;
    }

    const exercisesClone = trainingDay.exercises.map(ex => {
      const exKey = ex.libraryExerciseId || ex.id;
      const lastSets = lastGlobalSets[exKey]?.sets || [];

      return {
        ...ex,
        muscle: ex.muscle || '',
        secondaryMuscles: ex.secondaryMuscles || ex.secondary_muscles || '',
        sets: (ex.sets || []).map(s => {
          const suggestion = getProgressionSuggestion(lastSets, s.reps, s.weight || '');
          return {
            ...s,
            weight: suggestion.weight || s.weight,
            originalWeight: s.weight,
            originalReps: s.reps,
            suggestionText: suggestion.text,
            suggestionAction: suggestion.action,
            done: false
          };
        })
      };
    });

    setRoutineData({ ...routine, dayIndex, exercises: exercisesClone });
    loadHistoryAndRecords(routine.id, dayIndex);
    navigate('tracker');
  };

  const handleEditRoutine = (routine) => {
    setEditingRoutine(routine);
    navigate('create');
  };

  const handleDeleteRoutine = async (routineId) => {
    if (window.confirm('¿Eliminar esta rutina de tu lista personal?')) {
      const updated = routines.filter(r => r.id !== routineId);
      onUpdateRoutines(updated);
      try { 
        await deleteUserRoutine(activeProfile.id, routineId, false);
      } catch { 
        addToQueue('deleteRoutine', { id: routineId, profileId: activeProfile.id });
      }
      if (currentRoutine?.id === routineId) { 
        setActiveRoutine(null); 
        setRoutineData(null); 
      }
      loadAllHistory();
    }
  };

  const loadHistoryAndRecords = async (routineId, dayIndex) => {
    try {
      const historyArray = await fetchWorkoutHistory(activeProfile.id, routineId);
      const sessionsSameDay = (historyArray || []).filter(s => s.dayIndex === dayIndex);
      setLastSession(sessionsSameDay.length > 0 ? sessionsSameDay[sessionsSameDay.length - 1] : null);
      setDayRecords(getDayRecords(sessionsSameDay));
    } catch {
      const saved = localStorage.getItem(`workoutHistory_${activeProfile.id}_${routineId}`);
      if (saved) {
        const arr = JSON.parse(saved);
        const same = arr.filter(s => s.dayIndex === dayIndex);
        setLastSession(same.length ? same[same.length - 1] : null);
        setDayRecords(getDayRecords(same));
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0A0A0C] relative min-h-0 overflow-hidden select-none">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,#ffffff08,transparent_80%)]" />
      </div>

      <div className="flex-1 relative overflow-hidden">
        {view === 'home' && (
          <RoutineHome
            currentRoutine={currentRoutine}
            onStartWorkout={handleSelectRoutine}
            onManageTemplates={() => navigate('library')}
            onDeleteRoutine={handleDeleteRoutine}
          />
        )}

        {view === 'daySelector' && activeRoutine && (
          <DaySelector
            routine={activeRoutine}
            onSelectDay={startWorkout}
            onBack={() => navigate('home')}
            completedDays={completedDaysMap}
          />
        )}

        {view === 'history' && (
          <HistoryView activeProfile={activeProfile} onBack={() => navigate('home')} />
        )}

        {view === 'library' && (
          <div className="flex flex-col h-full bg-[#0A0A0C] p-4 relative">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-white tracking-tight">Mis Rutinas</h2>
              <button onClick={() => navigate('home')} className="p-2.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pb-20 no-scrollbar">
              {routines.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 text-xs font-mono">
                  No tienes rutinas activas. Importa una del club o crea una nueva.
                </div>
              ) : (
                routines.map(routine => (
                  <div key={routine.id} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium text-sm">{routine.name}</p>
                      <p className="text-xs text-zinc-500">{routine.trainingDays?.length || 0} días configurados</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {routine.id !== currentRoutine?.id ? (
                        <button 
                          onClick={() => handleSetActiveRoutine(routine)}
                          className="px-3 py-1.5 bg-[#D4FF00] text-[#09090B] text-xs font-black rounded-lg hover:bg-[#C4E600] active:scale-95 transition-all font-mono"
                        >
                          Usar este mes
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 bg-[#D4FF00]/10 border border-[#D4FF00]/30 text-[#D4FF00] text-xs font-mono font-bold rounded-lg">
                          En curso
                        </span>
                      )}
                      <button 
                        onClick={() => handleEditRoutine(routine)} 
                        className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white active:scale-90"
                        title="Editar / Crear nueva versión"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteRoutine(routine.id)} 
                        className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-red-400 active:scale-90"
                        title="Eliminar de mi lista"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}

              <div className="flex flex-col gap-3 pt-4">
                 <button 
                   onClick={() => setShowImportModal(true)} 
                   className="w-full py-4 bg-[#D4FF00]/10 border border-[#D4FF00]/30 rounded-2xl text-xs font-mono font-black uppercase tracking-wider text-[#D4FF00] hover:bg-[#D4FF00] hover:text-[#09090B] transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(212,255,0,0.15)] active:scale-95"
                 >
                   <Globe size={15} /> Importar rutina global del club
                 </button>

                 <button 
                   onClick={() => { setEditingRoutine(null); navigate('create'); }} 
                   className="w-full py-4 border border-dashed border-white/[0.08] rounded-2xl text-xs font-mono font-bold text-zinc-400 hover:border-[#D4FF00]/30 hover:text-[#D4FF00] flex items-center justify-center gap-2 transition-all active:scale-95"
                 >
                   <Plus size={16} /> Crear nueva rutina
                 </button>
              </div>
            </div>
          </div>
        )}

        {view === 'exerciseLibrary' && (
          <LibraryView
            password={libraryPassword}
            onSetPassword={(newPass) => {
              setLibraryPassword(newPass);
              localStorage.setItem('libraryPassword', newPass);
            }}
            onBack={() => navigate('home')}
          />
        )}

        {view === 'libraryAuth' && (
          <LibraryAuth password={libraryPassword} onCorrectPassword={() => navigate('library')} onBack={() => navigate(previousView)} />
        )}

        {view === 'create' && (
          <RoutineCreator
            initialData={editingRoutine}
            onSave={async (routineData) => {
              const newGlobalRoutineId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
                ? crypto.randomUUID() 
                : `rot_global_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
              
              const newLocalRoutineId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
                ? crypto.randomUUID() 
                : `rot_local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

              const globalRoutineToSave = {
                ...routineData,
                id: newGlobalRoutineId,
                is_global: true,
                createdBy: activeProfile.id,
                parent_routine_id: editingRoutine?.id || null,
                is_active: false,
              };

              const localRoutineToSave = {
                ...routineData,
                id: newLocalRoutineId,
                is_global: false,
                createdBy: activeProfile.id,
                parent_routine_id: newGlobalRoutineId,
                is_active: editingRoutine?.is_active ?? false,
              };

              try {
                await saveUserRoutine(activeProfile.id, globalRoutineToSave);
                await saveUserRoutine(activeProfile.id, localRoutineToSave);

                const freshRoutines = await fetchUserRoutines(activeProfile.id);
                onUpdateRoutines(freshRoutines);
                setGlobalRoutinesVersion(prev => prev + 1);
                showToast(editingRoutine ? '✅ Nueva versión creada y publicada en el Club' : '✅ Rutina creada y compartida en el Club');
              } catch (e) {
                console.error('Error guardando rutina:', e);
                showToast('⚠️ Guardado localmente (en cola de sincronización)');
                addToQueue('saveRoutine', { ...globalRoutineToSave, profileId: activeProfile.id });
                addToQueue('saveRoutine', { ...localRoutineToSave, profileId: activeProfile.id });
              }

              setEditingRoutine(null);
              navigate('library');
            }}
            onCancel={() => { setEditingRoutine(null); navigate('library'); }}
          />
        )}

        {view === 'tracker' && routineData && (
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
              } catch { 
                addToQueue('saveWorkoutSession', { session, profileId: activeProfile.id }); 
              }

              window.dispatchEvent(new CustomEvent('workoutFinished'));
              await loadAllHistory();
              navigate('finished');
            }}
            onGoBack={() => navigate('daySelector')}
          />
        )}

        {view === 'finished' && (
          <FinishedView onRestart={() => {
            navigate('home');
            setActiveRoutine(null);
            setActiveDayIndex(null);
            setRoutineData(null);
          }} />
        )}
      </div>

      {toastMessage && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#D4FF00] text-[#09090B] font-black px-5 py-2.5 rounded-full text-xs tracking-wide shadow-[0_0_24px_rgba(212,255,0,0.3)] backdrop-blur-sm">
          {toastMessage}
        </div>
      )}

      {showImportModal && (
        <ImportRoutineModal 
          onFetchGlobalRoutines={getAllGlobalRoutines}
          onImport={handleImportGlobal}
          onClose={() => setShowImportModal(false)}
          currentRoutines={routines}
          isAdmin={isAdmin}
          onEditGlobal={handleEditGlobalRoutine}
          onDeleteGlobal={handleDeleteGlobalRoutine}
          refreshToken={globalRoutinesVersion}
        />
      )}
    </div>
  );
}

function ImportRoutineModal({ 
  onFetchGlobalRoutines, 
  onImport, 
  onClose, 
  currentRoutines = [], 
  isAdmin,
  onEditGlobal,
  onDeleteGlobal,
  refreshToken
}) {
  const [globalRoutines, setGlobalRoutines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (onFetchGlobalRoutines) {
      setLoading(true);
      onFetchGlobalRoutines()
        .then(data => { 
          if (isMounted) {
            setGlobalRoutines(data || []); 
            setLoading(false); 
          }
        })
        .catch(err => { 
          console.error(err); 
          if (isMounted) {
            setGlobalRoutines([]); 
            setLoading(false); 
          }
        });
    }
    return () => { isMounted = false; };
  }, [onFetchGlobalRoutines, refreshToken]);

  return (
    <div className="fixed inset-0 z-[100] bg-[#09090B]/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-[#0C0C12] border border-white/[0.08] rounded-[2.5rem] p-6 max-w-sm w-full max-h-[85vh] flex flex-col shadow-2xl animate-scale-in">
        
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-[#D4FF00]" />
            <h3 className="text-white font-black text-sm uppercase tracking-wider font-sans">Plantillas Globales</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/[0.04] text-zinc-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <p className="text-zinc-400 text-xs mb-4 font-mono">
          Selecciona una rutina para duplicarla en tu lista personal.
        </p>

        <div className="flex-1 overflow-y-auto space-y-2.5 no-scrollbar pr-0.5">
          {loading ? (
            <div className="text-center py-10 text-zinc-500 font-mono text-xs">Cargando rutinas del club...</div>
          ) : globalRoutines.length === 0 ? (
            <p className="text-zinc-500 text-xs text-center py-8 font-mono">No hay plantillas globales disponibles.</p>
          ) : (
            globalRoutines.map(r => (
              <div key={r.id} className="p-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between gap-2 hover:border-white/[0.12] transition-all">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <p className="text-white font-bold text-xs truncate">{r.name}</p>
                    <span className="text-[8px] font-mono font-black text-[#D4FF00] bg-[#D4FF00]/10 px-1.5 py-0.2 rounded shrink-0">GLOBAL</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{r.trainingDays?.length || 0} días de entreno</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isAdmin && (
                    <>
                      <button 
                        onClick={() => {
                          onClose();
                          onEditGlobal(r);
                        }} 
                        className="p-2 rounded-xl bg-white/[0.04] text-zinc-400 hover:text-white active:scale-90" 
                        title="Crear nueva versión basada en esta"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button 
                        onClick={() => onDeleteGlobal(r.id)} 
                        className="p-2 rounded-xl bg-white/[0.04] text-zinc-400 hover:text-rose-400 active:scale-90" 
                        title="Eliminar plantilla del club"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => onImport(r.id)} 
                    className="px-3 py-2 bg-[#D4FF00] text-[#09090B] text-xs font-mono font-black uppercase tracking-wider rounded-xl hover:bg-[#C4E600] active:scale-95 transition-all shadow-sm"
                  >
                    Importar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end mt-4 pt-4 border-t border-white/[0.05]">
          <button onClick={onClose} className="w-full py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-zinc-400 text-xs font-mono font-bold uppercase active:scale-95">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}