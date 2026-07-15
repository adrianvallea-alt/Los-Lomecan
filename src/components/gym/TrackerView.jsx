import React, { useState, useEffect, useRef } from 'react';
import { Check, Dumbbell, Award, Clock, Info, Star, Timer, Pause, Play, ChevronLeft } from 'lucide-react';
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
  const [exercises, setExercises] = useState(routineData.exercises);
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [restTimer, setRestTimer] = useState({ active: false, seconds: 90, running: false });
  const [showExitConfirm, setShowExitConfirm] = useState(false); // ← nuevo estado
  const timerRef = useRef(null);
  const DRAFT_KEY = `draft_${activeRoutine.id}_${activeDayIndex}`;

  // Borrador
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try { setExercises(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem(DRAFT_KEY, JSON.stringify(exercises)), 1000);
    return () => clearTimeout(timer);
  }, [exercises, DRAFT_KEY]);

  // Temporizador de descanso
  useEffect(() => {
    if (restTimer.running && restTimer.seconds > 0) {
      timerRef.current = setInterval(() => setRestTimer(prev => ({ ...prev, seconds: prev.seconds - 1 })), 1000);
    } else if (restTimer.seconds === 0) {
      setRestTimer(prev => ({ ...prev, running: false }));
      if (Notification.permission === 'granted') new Notification('¡Descanso terminado!', { body: 'Es hora de la siguiente serie.' });
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
        sets: ex.sets.map(s => ({ setNum: s.setNum, weight: s.weight, reps: s.reps }))
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
    sum + ex.sets.reduce((s, set) => s + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0), 0);

  const selectedEx = exercises.find(ex => ex.id === selectedExerciseId);

  return (
    <div className="flex flex-col h-full bg-[#09090B] safe-top safe-bottom">
      {/* Temporizador de descanso flotante con diseño premium */}
      {restTimer.active && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 bg-[#0A0A0C] backdrop-blur-xl border border-white/[0.08] rounded-2xl px-5 py-3 flex items-center gap-4 shadow-2xl shadow-black/30 animate-slide-up">
          <Timer size={18} className="text-[#D4FF00]" />
          <span className="text-white font-bold text-lg tabular-nums">{formatTime(restTimer.seconds)}</span>
          <button
            onClick={() => setRestTimer(prev => ({ ...prev, running: !prev.running }))}
            className="p-1.5 rounded-full bg-white/[0.04] text-zinc-400 hover:text-white transition-colors"
            aria-label={restTimer.running ? 'Pausar descanso' : 'Reanudar descanso'}
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

      {/* Header */}
      <div className="flex justify-between items-center px-5 pt-5 pb-3">
        <div>
          <span className="text-[10px] bg-white/[0.04] border border-white/[0.05] px-2.5 py-1 rounded-lg text-zinc-400 uppercase tracking-wider font-medium">
            {activeRoutine.name}
          </span>
          <h2 className="text-xl font-bold text-white mt-1.5 tracking-tight">{dayName}</h2>
        </div>
        {/* Botón Salir ahora abre la confirmación */}
        <button
          onClick={() => setShowExitConfirm(true)}
          className="text-xs text-zinc-400 border border-white/[0.08] rounded-full px-4 py-2 active:scale-95 transition-all hover:bg-white/[0.03]"
        >
          Salir
        </button>
      </div>

      {/* Volumen total */}
      <div className="px-5 mb-3">
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3 flex justify-between items-center text-sm">
          <span className="text-zinc-400">Volumen total</span>
          <span className="text-white font-bold tabular-nums">{totalVolume} kg</span>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
        {selectedEx ? (
          /* Vista detalle del ejercicio */
          <>
            <button
              onClick={() => setSelectedExerciseId(null)}
              className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm mb-2 transition-colors"
            >
              <ChevronLeft size={16} /> Volver a la lista
            </button>

            <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-5 shadow-lg">
              <div className="flex justify-between items-start mb-4 border-b border-white/[0.05] pb-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">{selectedEx.name}</h3>
                    {(selectedEx.description || selectedEx.video_url) && (
                      <button
                        onClick={() => setSelectedExercise(selectedEx)}
                        className="ml-2 p-2 rounded-full bg-white/[0.04] border border-white/[0.05] text-zinc-400 hover:text-[#D4FF00] active:scale-90 transition-all"
                      >
                        <Info size={18} />
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] text-[#D4FF00]/80">{selectedEx.muscle}</span>

                  {personalRecords[selectedEx.libraryExerciseId || selectedEx.id] && (
                    <div className="flex items-center gap-1 mt-2 px-2.5 py-1 bg-[#D4FF00]/5 border border-[#D4FF00]/10 rounded-full w-fit">
                      <Star size={12} className="text-[#D4FF00]" />
                      <span className="text-[11px] text-[#D4FF00] font-semibold">
                        PR: {personalRecords[selectedEx.libraryExerciseId || selectedEx.id].weight} kg × {personalRecords[selectedEx.libraryExerciseId || selectedEx.id].reps} reps
                      </span>
                    </div>
                  )}

                  {lastGlobalSets?.[selectedEx.libraryExerciseId || selectedEx.id] && (
                    <div className="flex items-center gap-1 mt-1.5 text-[10px] text-zinc-500">
                      <Clock size={10} />
                      <span>Último: {lastGlobalSets[selectedEx.libraryExerciseId || selectedEx.id].sets.map((s, i) => `${s.weight}×${s.reps}`).join(', ')}</span>
                    </div>
                  )}
                </div>
                <Dumbbell size={18} className="text-zinc-600 mt-1" />
              </div>

              <div className="grid grid-cols-4 text-center text-[10px] font-semibold text-zinc-500 mb-3 uppercase tracking-wider">
                <div>Serie</div><div>Kg</div><div>Reps</div><div>Listo</div>
              </div>

              <div className="space-y-2">
                {selectedEx.sets.map(set => {
                  const lastSet = lastSession ? getLastSetData(lastSession, selectedEx.id, set.setNum, selectedEx.libraryExerciseId) : null;
                  const globalSet = lastGlobalSets?.[selectedEx.libraryExerciseId || selectedEx.id]?.sets?.[set.setNum - 1];
                  const ghostWeight = lastSet?.weight || globalSet?.weight || '';
                  const ghostReps = lastSet?.reps || globalSet?.reps || '';
                  return (
                    <div
                      key={set.id}
                      className={`grid grid-cols-4 items-center text-center py-2 rounded-xl border transition-all ${
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
                          onChange={e => updateSetInput(selectedEx.id, set.id, 'weight', e.target.value)}
                          placeholder={ghostWeight}
                          className="w-14 h-9 bg-white/[0.04] border border-white/[0.06] rounded-lg text-center text-sm py-1 text-white font-semibold focus:outline-none focus:border-[#D4FF00]/40 disabled:opacity-50 placeholder:text-zinc-600 transition-colors"
                        />
                        {ghostWeight && <span className="text-[10px] text-zinc-600 mt-0.5">Antes: {ghostWeight} kg</span>}
                      </div>
                      <div className="flex flex-col items-center">
                        <input
                          type="number"
                          inputMode="numeric"
                          value={set.reps}
                          disabled={set.done}
                          onChange={e => updateSetInput(selectedEx.id, set.id, 'reps', e.target.value)}
                          placeholder={ghostReps}
                          className="w-14 h-9 bg-white/[0.04] border border-white/[0.06] rounded-lg text-center text-sm py-1 text-white font-semibold focus:outline-none focus:border-[#D4FF00]/40 disabled:opacity-50 placeholder:text-zinc-600 transition-colors"
                        />
                        {ghostReps && <span className="text-[10px] text-zinc-600 mt-0.5">Antes: {ghostReps} reps</span>}
                      </div>
                      <div className="flex justify-center">
                        <button
                          onClick={() => toggleSetDone(selectedEx.id, set.id)}
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
          </>
        ) : (
          /* Lista de ejercicios */
          exercises.map(ex => {
            const exKey = ex.libraryExerciseId || ex.id;
            const record = personalRecords[exKey];
            const completedSets = ex.sets.filter(s => s.done).length;
            const totalSets = ex.sets.length;
            const progressPercent = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
            return (
              <button
                key={ex.id}
                onClick={() => setSelectedExerciseId(ex.id)}
                className={`w-full bg-white/[0.02] border rounded-2xl p-4 text-left transition-all active:scale-[0.98] ${
                  completedSets === totalSets && totalSets > 0
                    ? 'border-[#D4FF00]/20 bg-[#D4FF00]/[0.03]'
                    : 'border-white/[0.05] hover:border-white/10 hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold text-sm">{ex.name}</h3>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{ex.muscle} · {totalSets} series</p>
                    {record && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-600">
                        <Award size={10} className="text-[#D4FF00]" />
                        <span>PR: {record.weight} kg × {record.reps}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {completedSets === totalSets && totalSets > 0 && (
                      <Check size={16} className="text-[#D4FF00]" />
                    )}
                    <ChevronLeft size={16} className="text-zinc-600 rotate-180" />
                  </div>
                </div>
                <div className="mt-3 w-full bg-white/[0.05] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-[#D4FF00] rounded-full transition-all duration-500 ease-out shadow-[0_0_5px_rgba(212,255,0,0.3)]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Botón finalizar siempre visible */}
      <div className="p-5 bg-[#09090B]/90 backdrop-blur-md">
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
            <p className="text-zinc-400 text-xs mb-5">
              Tu progreso actual se guardará como borrador. Podrás retomarlo más tarde.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm"
              >
                Continuar
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  onGoBack();
                }}
                className="flex-1 py-3 bg-[#D4FF00] text-[#09090B] font-bold rounded-xl text-sm"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedExercise && <ExerciseDetailModal exercise={selectedExercise} onClose={() => setSelectedExercise(null)} />}
      
      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translate(-50%, 10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}