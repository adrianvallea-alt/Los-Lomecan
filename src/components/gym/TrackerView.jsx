import React, { useState, useEffect, useRef } from 'react';
import { Check, Dumbbell, Award, Clock, Star, Timer, Pause, Play, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import ExerciseDetailModal from './ExerciseDetailModal';
import { getLastSetData } from '../../utils/gymHelpers';

export default function TrackerView({
  routineData,
  activeRoutine,
  activeDayIndex,
  lastSession,
  lastGlobalSets,
  personalRecords,
  dayRecords,
  onFinish,
  onGoBack
}) {
  const [exercises, setExercises] = useState(() => {
    // Inicializar ejercicios con repsDone para cada set
    return routineData.exercises.map(ex => ({
      ...ex,
      sets: ex.sets.map(s => ({
        ...s,
        repsDone: '' // Campo para el número real de repeticiones que el usuario hará
      }))
    }));
  });
  const [expandedId, setExpandedId] = useState(null);
  const [restTimer, setRestTimer] = useState({ active: false, seconds: 90, running: false });
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [detailExercise, setDetailExercise] = useState(null);
  const timerRef = useRef(null);
  const DRAFT_KEY = `draft_${activeRoutine.id}_${activeDayIndex}`;
  const exerciseRefs = useRef({});

  // Cargar borrador (asegurando que tenga repsDone)
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Asegurar que cada set tenga repsDone
        const withRepsDone = parsed.map(ex => ({
          ...ex,
          sets: ex.sets.map(s => ({
            ...s,
            repsDone: s.repsDone || ''
          }))
        }));
        setExercises(withRepsDone);
      } catch (e) {}
    }
  }, []);

  // Guardar borrador automáticamente
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(exercises));
    }, 1000);
    return () => clearTimeout(timer);
  }, [exercises, DRAFT_KEY]);

  // Temporizador de descanso
  useEffect(() => {
    if (restTimer.running && restTimer.seconds > 0) {
      timerRef.current = setInterval(() => setRestTimer(prev => ({ ...prev, seconds: prev.seconds - 1 })), 1000);
    } else if (restTimer.seconds === 0) {
      setRestTimer(prev => ({ ...prev, running: false }));
      if (Notification.permission === 'granted') {
        new Notification('¡Descanso terminado!', { body: 'Es hora de la siguiente serie.' });
      }
    }
    return () => clearInterval(timerRef.current);
  }, [restTimer.running, restTimer.seconds]);

  const toggleSetDone = (exerciseId, setId) => {
    setExercises(prev => prev.map(ex =>
      ex.id === exerciseId
        ? { ...ex, sets: ex.sets.map(s => s.id === setId ? { ...s, done: !s.done } : s) }
        : ex
    ));
    const exercise = exercises.find(ex => ex.id === exerciseId);
    const set = exercise?.sets.find(s => s.id === setId);
    if (set && !set.done) setRestTimer(prev => ({ ...prev, running: true }));
  };

  const updateSetInput = (exerciseId, setId, field, value) => {
    setExercises(prev => prev.map(ex =>
      ex.id === exerciseId
        ? { ...ex, sets: ex.sets.map(s => s.id === setId ? { ...s, [field]: value } : s) }
        : ex
    ));
  };

  const handleFinish = () => {
    const session = {
      date: new Date().toISOString(),
      routineId: activeRoutine.id,
      dayIndex: activeDayIndex,
      exercises: exercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        libraryExerciseId: ex.libraryExerciseId,
        sets: ex.sets.map(s => ({
          setNum: s.setNum,
          weight: s.weight || '',
          reps: s.repsDone || '',
          done: s.done || false
        }))
      }))
    };
    localStorage.removeItem(DRAFT_KEY);
    onFinish(session);
  };

  const dayName = routineData.trainingDays[activeDayIndex]?.name || `Día ${activeDayIndex + 1}`;
  const formatTime = (sec) => {
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const totalVolume = exercises.reduce((sum, ex) =>
    sum + ex.sets.reduce((s, set) => s + (parseFloat(set.weight) || 0) * (parseInt(set.repsDone) || 0), 0), 0);

  const toggleExpand = (id) => {
    const newExpandedId = expandedId === id ? null : id;
    setExpandedId(newExpandedId);
    if (newExpandedId !== null) {
      setTimeout(() => {
        const ref = exerciseRefs.current[id];
        if (ref) {
          ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#09090B] safe-top safe-bottom relative">
      {/* Temporizador de descanso flotante */}
      {restTimer.active && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 bg-[#0A0A0C] backdrop-blur-xl border border-white/[0.08] rounded-2xl px-5 py-3 flex items-center gap-4 shadow-2xl shadow-black/30 animate-slide-up">
          <Timer size={18} className="text-[#D4FF00]" />
          <span className="text-white font-bold text-lg tabular-nums">{formatTime(restTimer.seconds)}</span>
          <button
            onClick={() => setRestTimer(prev => ({ ...prev, running: !prev.running }))}
            className="p-1.5 rounded-full bg-white/[0.04] text-zinc-400 hover:text-white transition-colors"
          >
            {restTimer.running ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            onClick={() => setRestTimer({ active: false, seconds: 90, running: false })}
            className="text-xs text-zinc-500 hover:text-red-400 transition-colors font-medium"
          >
            Omitir
          </button>
        </div>
      )}

      {/* Header fijo */}
      <div className="flex justify-between items-center px-5 pt-5 pb-3 bg-[#09090B] z-10">
        <div>
          <span className="text-[10px] bg-white/[0.04] border border-white/[0.05] px-2.5 py-1 rounded-lg text-zinc-400 uppercase tracking-wider font-medium">
            {activeRoutine.name}
          </span>
          <h2 className="text-xl font-bold text-white mt-1.5 tracking-tight">{dayName}</h2>
        </div>
        <button
          onClick={() => setShowExitConfirm(true)}
          className="text-xs text-zinc-400 border border-white/[0.08] rounded-full px-4 py-2 active:scale-95 transition-all hover:bg-white/[0.03]"
        >
          Salir
        </button>
      </div>

      {/* Volumen total fijo */}
      <div className="px-5 mb-3">
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3 flex justify-between items-center text-sm">
          <span className="text-zinc-400">Volumen total</span>
          <span className="text-white font-bold tabular-nums">{totalVolume} kg</span>
        </div>
      </div>

      {/* Contenedor scrollable */}
      <div className="flex-1 overflow-y-auto px-5 pb-32 space-y-4">
        {exercises.map(ex => {
          const exKey = ex.libraryExerciseId || ex.id;
          const record = personalRecords[exKey];
          const completedSets = ex.sets.filter(s => s.done).length;
          const totalSets = ex.sets.length;
          const progressPercent = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
          const isExpanded = expandedId === ex.id;

          return (
            <div
              key={ex.id}
              ref={el => (exerciseRefs.current[ex.id] = el)}
              className="bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden transition-all"
            >
              <button
                onClick={() => toggleExpand(ex.id)}
                className="w-full p-4 text-left flex items-center justify-between active:scale-[0.99] transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {/* ==================================================== */}
                    {/* 🔥 AQUÍ ESTÁ EL BOTÓN CON TOOLTIP QUE FALTABA 🔥 */}
                    {/* ==================================================== */}
                    <h3 className="text-white font-semibold text-sm truncate">{ex.name}</h3>
                    
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); // Evita expandir la tarjeta al hacer clic en el ojo
                        setDetailExercise(ex); 
                      }}
                      className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-[#D4FF00] hover:border-[#D4FF00]/30 transition-colors relative group ml-1"
                      title="Ver guía y video" // Tooltip nativo del navegador
                    >
                      <Eye size={14} />
                      {/* Tooltip personalizado visualmente bonito */}
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-[#09090B] border border-white/[0.08] text-[10px] text-zinc-300 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                        Ver guía y video
                      </span>
                    </button>
                    {/* ==================================================== */}

                    {completedSets === totalSets && totalSets > 0 && (
                      <Check size={14} className="text-[#D4FF00] flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-0.5">{ex.muscle} · {totalSets} series</p>
                  {record && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-600">
                      <Award size={10} className="text-[#D4FF00]" />
                      <span>PR: {record.weight} kg × {record.reps} reps</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500">{completedSets}/{totalSets}</span>
                  {isExpanded ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
                </div>
              </button>

              <div className="px-4 pb-1">
                <div className="w-full bg-white/[0.05] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-[#D4FF00] rounded-full transition-all duration-500 ease-out shadow-[0_0_5px_rgba(212,255,0,0.3)]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-white/[0.05] mt-2">
                  <div className="grid grid-cols-5 text-center text-[10px] font-semibold text-zinc-500 mb-2 uppercase tracking-wider">
                    <div>Serie</div>
                    <div>Kg</div>
                    <div>Reps sugeridas</div>
                    <div>Reps realizadas</div>
                    <div>Listo</div>
                  </div>
                  <div className="space-y-2">
                    {ex.sets.map(set => {
                      const lastSet = lastSession ? getLastSetData(lastSession, ex.id, set.setNum, ex.libraryExerciseId) : null;
                      const globalSet = lastGlobalSets?.[exKey]?.sets?.[set.setNum - 1];
                      const ghostWeight = lastSet?.weight || globalSet?.weight || '';
                      const ghostReps = lastSet?.reps || globalSet?.reps || '';
                      const suggestedReps = set.reps || '';

                      return (
                        <div
                          key={set.id}
                          className={`grid grid-cols-5 items-center text-center py-2 rounded-xl border transition-all ${
                            set.done ? 'bg-[#D4FF00]/5 border-[#D4FF00]/20' : 'bg-white/[0.02] border-transparent'
                          }`}
                        >
                          <span className={`text-xs font-bold ${set.done ? 'text-[#D4FF00]' : 'text-zinc-500'}`}>{set.setNum}</span>
                          <div className="flex flex-col items-center">
                            <input
                              type="number"
                              inputMode="decimal"
                              value={set.weight}
                              disabled={set.done}
                              onChange={e => updateSetInput(ex.id, set.id, 'weight', e.target.value)}
                              placeholder={ghostWeight}
                              className="w-14 h-9 bg-white/[0.04] border border-white/[0.06] rounded-lg text-center text-sm py-1 text-white font-semibold focus:outline-none focus:border-[#D4FF00]/40 disabled:opacity-50 placeholder:text-zinc-600 transition-colors"
                            />
                            {ghostWeight && <span className="text-[10px] text-zinc-600 mt-0.5">Antes: {ghostWeight} kg</span>}
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-xs text-[#D4FF00]/70 font-mono">
                              {suggestedReps || '—'}
                            </span>
                          </div>
                          <div className="flex flex-col items-center">
                            <input
                              type="number"
                              inputMode="numeric"
                              value={set.repsDone || ''}
                              disabled={set.done}
                              onChange={e => updateSetInput(ex.id, set.id, 'repsDone', e.target.value)}
                              placeholder={ghostReps}
                              className="w-14 h-9 bg-white/[0.04] border border-white/[0.06] rounded-lg text-center text-sm py-1 text-white font-semibold focus:outline-none focus:border-[#D4FF00]/40 disabled:opacity-50 placeholder:text-zinc-600 transition-colors"
                            />
                            {ghostReps && <span className="text-[10px] text-zinc-600 mt-0.5">Antes: {ghostReps}</span>}
                          </div>
                          <div className="flex justify-center">
                            <button
                              onClick={() => toggleSetDone(ex.id, set.id)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 ${
                                set.done
                                  ? 'bg-[#D4FF00] text-[#09090B] shadow-[0_0_10px_rgba(212,255,0,0.3)]'
                                  : 'bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:text-white'
                              }`}
                            >
                              <Check size={16} strokeWidth={3} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Botón finalizar fijo */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#09090B]/95 backdrop-blur-md border-t border-white/[0.05] p-4 z-20" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 70px)' }}>
        <button
          onClick={handleFinish}
          className="w-full bg-[#D4FF00] text-[#09090B] font-bold py-4 rounded-2xl text-sm transition-all active:scale-[0.98] shadow-lg shadow-[#D4FF00]/20 hover:bg-[#e5ff1a]"
        >
          Finalizar Entrenamiento
        </button>
      </div>

      {/* Modal de confirmación al salir */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[250] bg-[#09090B]/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0A0A0C] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-white font-semibold text-sm mb-2">¿Salir del entrenamiento?</h3>
            <p className="text-zinc-400 text-xs mb-5">Tu progreso actual se guardará como borrador. Podrás retomarlo más tarde.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowExitConfirm(false)} className="flex-1 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm">Continuar</button>
              <button onClick={() => { setShowExitConfirm(false); onGoBack(); }} className="flex-1 py-3 bg-[#D4FF00] text-[#09090B] font-bold rounded-xl text-sm">Salir</button>
            </div>
          </div>
        </div>
      )}

      {/* 🎬 Renderizado del modal al final del componente */}
      {detailExercise && <ExerciseDetailModal exercise={detailExercise} onClose={() => setDetailExercise(null)} />}

      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translate(-50%, 10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
      `}</style>
    </div>
  );
      }
