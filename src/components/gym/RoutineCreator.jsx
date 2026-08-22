// src/components/gym/RoutineCreator.jsx
import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import {
  X, Save, Plus, Trash2, ChevronRight, ChevronLeft,
  Calendar, Dumbbell, Sparkles, ChevronDown, ChevronUp,
  ArrowRight
} from 'lucide-react';
import { getCurrentMonth, getCurrentYear } from '../../utils/gymHelpers';
import LibrarySelector from './LibrarySelector';

const TOTAL_STEPS = 3;

const PRESET_SCHEMES = [
  { label: '3 × 10', sets: ['10', '10', '10'] },
  { label: '4 × 12', sets: ['12', '12', '12', '12'] },
  { label: '4 × 8', sets: ['8', '8', '8', '8'] },
  { label: 'Pirámide (12-10-8)', sets: ['12', '10', '8'] },
  { label: 'Fuerza (5 × 5)', sets: ['5', '5', '5', '5', '5'] },
];

const triggerHaptic = (ms = 25) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(ms); } catch (e) {}
  }
};

export default function RoutineCreator({ onSave, onCancel, initialData = null }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(initialData?.name || '');
  const [trainingDays, setTrainingDays] = useState(() => {
    if (initialData?.trainingDays && initialData.trainingDays.length > 0) {
      return initialData.trainingDays;
    }
    return [{ name: 'Día 1: Empuje / Pecho', exercises: [] }];
  });

  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [expandedExerciseId, setExpandedExerciseId] = useState(null);
  const [showLibraryModal, setShowLibraryModal] = useState(false);

  // Validar si puede avanzar de paso
  const canGoNext = () => {
    if (step === 1) return name.trim().length > 0;
    if (step === 2) {
      return trainingDays.length > 0 && trainingDays.some(d => d.exercises.length > 0);
    }
    return true;
  };

  const nextStep = () => {
    if (canGoNext()) {
      triggerHaptic(25);
      setStep(prev => Math.min(prev + 1, TOTAL_STEPS));
    }
  };

  const prevStep = () => {
    triggerHaptic(20);
    setStep(prev => Math.max(prev - 1, 1));
  };

  // ==================== GESTIÓN DE DÍAS ====================
  const addTrainingDay = () => {
    triggerHaptic(30);
    const newDayNum = trainingDays.length + 1;
    const newDay = { name: `Día ${newDayNum}`, exercises: [] };
    setTrainingDays(prev => [...prev, newDay]);
    setActiveDayIndex(trainingDays.length);
  };

  const removeTrainingDay = (indexToRemove) => {
    if (trainingDays.length <= 1) {
      alert('Debes tener al menos 1 día de entrenamiento.');
      return;
    }
    triggerHaptic(40);
    setTrainingDays(prev => prev.filter((_, i) => i !== indexToRemove));
    setActiveDayIndex(prev => (prev >= indexToRemove && prev > 0 ? prev - 1 : prev));
  };

  const updateDayName = (index, newName) => {
    setTrainingDays(prev => prev.map((day, i) => i === index ? { ...day, name: newName } : day));
  };

  // ==================== GESTIÓN DE EJERCICIOS ====================
  const addExerciseFromLibrary = (libraryExercise) => {
    triggerHaptic(35);
    const seriesCount = Math.max(1, libraryExercise.default_series || 3);
    const repsValue = libraryExercise.default_reps || '10-12';

    const defaultSets = Array.from({ length: seriesCount }, (_, i) => ({
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${i}`,
      setNum: i + 1,
      weight: '',
      reps: repsValue,
    }));

    const newExercise = {
      id: crypto.randomUUID ? crypto.randomUUID() : `ex_${Date.now()}`,
      name: libraryExercise.name,
      muscle: libraryExercise.muscle,
      secondaryMuscles: libraryExercise.secondary_muscles || '',
      description: libraryExercise.description || '',
      video_url: libraryExercise.video_url || '',
      libraryExerciseId: libraryExercise.id,
      sets: defaultSets,
    };

    setTrainingDays(prev =>
      prev.map((day, idx) =>
        idx === activeDayIndex
          ? { ...day, exercises: [...day.exercises, newExercise] }
          : day
      )
    );

    setExpandedExerciseId(newExercise.id);
    setShowLibraryModal(false);
  };

  const removeExercise = (exerciseId) => {
    triggerHaptic(30);
    setTrainingDays(prev =>
      prev.map((day, idx) =>
        idx === activeDayIndex
          ? { ...day, exercises: day.exercises.filter(ex => ex.id !== exerciseId) }
          : day
      )
    );
  };

  // ==================== GESTIÓN DE SERIES ====================
  const addSetToExercise = (exerciseId) => {
    triggerHaptic(20);
    setTrainingDays(prev =>
      prev.map((day, idx) => {
        if (idx !== activeDayIndex) return day;
        return {
          ...day,
          exercises: day.exercises.map(ex => {
            if (ex.id !== exerciseId) return ex;
            const lastSet = ex.sets[ex.sets.length - 1];
            const nextSet = {
              id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${ex.sets.length}`,
              setNum: ex.sets.length + 1,
              weight: lastSet?.weight || '',
              reps: lastSet?.reps || '10',
            };
            return { ...ex, sets: [...ex.sets, nextSet] };
          })
        };
      })
    );
  };

  const removeSetFromExercise = (exerciseId, setId) => {
    triggerHaptic(25);
    setTrainingDays(prev =>
      prev.map((day, idx) => {
        if (idx !== activeDayIndex) return day;
        return {
          ...day,
          exercises: day.exercises.map(ex => {
            if (ex.id !== exerciseId) return ex;
            if (ex.sets.length <= 1) return ex;
            const filtered = ex.sets.filter(s => s.id !== setId);
            const reindexed = filtered.map((s, i) => ({ ...s, setNum: i + 1 }));
            return { ...ex, sets: reindexed };
          })
        };
      })
    );
  };

  const updateSetDetail = (exerciseId, setId, field, value) => {
    setTrainingDays(prev =>
      prev.map((day, idx) => {
        if (idx !== activeDayIndex) return day;
        return {
          ...day,
          exercises: day.exercises.map(ex => {
            if (ex.id !== exerciseId) return ex;
            return {
              ...ex,
              sets: ex.sets.map(s => s.id === setId ? { ...s, [field]: value } : s)
            };
          })
        };
      })
    );
  };

  const applySchemePreset = (exerciseId, preset) => {
    triggerHaptic(30);
    setTrainingDays(prev =>
      prev.map((day, idx) => {
        if (idx !== activeDayIndex) return day;
        return {
          ...day,
          exercises: day.exercises.map(ex => {
            if (ex.id !== exerciseId) return ex;
            const newSets = preset.sets.map((targetReps, i) => ({
              id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${i}`,
              setNum: i + 1,
              weight: ex.sets[i]?.weight || '',
              reps: targetReps,
            }));
            return { ...ex, sets: newSets };
          })
        };
      })
    );
  };

  // ==================== GUARDAR ====================
  const handleSubmit = () => {
    if (!name.trim()) return;

    const formattedData = {
      id: initialData?.id || (crypto.randomUUID ? crypto.randomUUID() : `rot_${Date.now()}`),
      name: name.trim(),
      month: initialData?.month || getCurrentMonth(),
      year: initialData?.year || getCurrentYear(),
      trainingDays: trainingDays.map((day, dIdx) => ({
        id: day.id || `day_${dIdx + 1}`,
        name: day.name.trim() || `Día ${dIdx + 1}`,
        exercises: day.exercises.map(ex => ({
          id: ex.id,
          name: ex.name,
          muscle: ex.muscle || '',
          secondaryMuscles: ex.secondaryMuscles || '',
          description: ex.description || '',
          video_url: ex.video_url || '',
          libraryExerciseId: ex.libraryExerciseId || null,
          sets: ex.sets.map((s, sIdx) => ({
            id: s.id || `set_${sIdx + 1}`,
            setNum: sIdx + 1,
            weight: s.weight?.toString() || '',
            reps: (s.reps || '10').toString(),
          }))
        }))
      }))
    };

    triggerHaptic([40, 30, 80]);
    onSave(formattedData);
  };

  const totalExercisesCount = trainingDays.reduce((acc, d) => acc + d.exercises.length, 0);
  const totalSetsCount = trainingDays.reduce((acc, d) =>
    acc + d.exercises.reduce((sAcc, ex) => sAcc + ex.sets.length, 0), 0
  );

  const currentDay = trainingDays[activeDayIndex] || trainingDays[0];

  // ==================== PASO 1: NOMBRE ====================
  const renderStep1 = () => (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 space-y-6 text-center animate-fade-in max-w-sm mx-auto w-full">
      <div className="w-16 h-16 rounded-2xl bg-[#D4FF00]/10 border border-[#D4FF00]/30 flex items-center justify-center text-[#D4FF00] shadow-[0_0_20px_rgba(212,255,0,0.15)]">
        <Calendar size={32} />
      </div>

      <div>
        <h2 className="text-xl font-black text-white tracking-tight">Nombre del Plan de Entrenamiento</h2>
        <p className="text-xs text-zinc-400 mt-1">Dale un título claro a esta rutina</p>
      </div>

      <div className="w-full space-y-4">
        <input
          required
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && name.trim()) {
              nextStep();
            }
          }}
          placeholder="Escribe el nombre aquí..."
          className="w-full bg-[#0A0A0C] border border-white/[0.12] rounded-2xl p-4 text-center text-base font-bold text-white placeholder-zinc-600 focus:border-[#D4FF00] focus:shadow-[0_0_15px_rgba(212,255,0,0.2)] outline-none transition-all"
        />

        <div className="flex flex-wrap justify-center gap-1.5">
          {['Torso / Pierna', 'Empuje / Tirón / Pierna', 'Fuerza 5x5', 'Full Body'].map(presetName => (
            <button
              key={presetName}
              type="button"
              onClick={() => {
                triggerHaptic(15);
                setName(presetName);
              }}
              className={`px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-all ${
                name === presetName
                  ? 'bg-[#D4FF00]/20 border-[#D4FF00] text-[#D4FF00]'
                  : 'bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:text-white'
              }`}
            >
              {presetName}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={!name.trim()}
          onClick={nextStep}
          className="w-full py-4 mt-2 bg-[#D4FF00] text-[#09090B] font-black rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-[0_0_20px_rgba(212,255,0,0.3)] hover:bg-[#e5ff1a]"
        >
          Continuar a los Días <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );

  // ==================== PASO 2: DÍAS Y SERIES ====================
  const renderStep2 = () => (
    <div className="flex-1 flex flex-col min-h-0 animate-fade-in overflow-hidden">
      
      {/* Pestañas de días (fijas arriba) */}
      <div className="px-4 pt-3 pb-2 shrink-0 border-b border-white/[0.04] bg-[#09090B]">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {trainingDays.map((day, idx) => (
            <button
              key={idx}
              onClick={() => {
                triggerHaptic(15);
                setActiveDayIndex(idx);
              }}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 active:scale-95 ${
                activeDayIndex === idx
                  ? 'bg-[#D4FF00] text-[#09090B] shadow-[0_0_12px_rgba(212,255,0,0.3)]'
                  : 'bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white'
              }`}
            >
              <span>{day.name || `Día ${idx + 1}`}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                activeDayIndex === idx ? 'bg-black/20 text-black font-bold' : 'bg-white/[0.06] text-zinc-400'
              }`}>
                {day.exercises.length}
              </span>
            </button>
          ))}

          <button
            onClick={addTrainingDay}
            className="px-3 py-2 rounded-2xl bg-white/[0.03] border border-dashed border-white/[0.15] text-[#D4FF00] text-xs font-bold hover:bg-[#D4FF00]/10 flex items-center gap-1 shrink-0 active:scale-95 transition-all"
            title="Añadir otro día"
          >
            <Plus size={14} /> Día
          </button>
        </div>
      </div>

      {/* Cabecera del día activo */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-3 shrink-0 bg-[#0A0A0C]">
        <div className="flex-1">
          <input
            value={currentDay?.name || ''}
            onChange={e => updateDayName(activeDayIndex, e.target.value)}
            placeholder="Nombre del día (ej. Pecho y Tríceps)"
            className="w-full bg-transparent text-sm font-black text-white border-b border-transparent focus:border-[#D4FF00] outline-none py-1 transition-colors"
          />
        </div>

        {trainingDays.length > 1 && (
          <button
            onClick={() => removeTrainingDay(activeDayIndex)}
            className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-white/[0.04] transition-colors"
            title="Eliminar este día"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* Listado de ejercicios CON SCROLL INDEPENDIENTE */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3 no-scrollbar touch-pan-y">
        {currentDay?.exercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500 gap-3 bg-white/[0.01] border border-white/[0.04] rounded-3xl p-6">
            <Dumbbell size={32} className="text-zinc-600" />
            <p className="text-xs font-medium text-zinc-400">Este día aún no tiene ejercicios</p>
            <button
              onClick={() => setShowLibraryModal(true)}
              className="px-4 py-2.5 bg-[#D4FF00] text-[#09090B] rounded-xl text-xs font-bold uppercase tracking-wider shadow-md active:scale-95"
            >
              + Añadir Ejercicio
            </button>
          </div>
        ) : (
          currentDay?.exercises.map((ex, exIdx) => {
            const isExpanded = expandedExerciseId === ex.id;
            return (
              <div
                key={ex.id}
                className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden transition-all"
              >
                {/* Cabecera del ejercicio */}
                <div
                  onClick={() => setExpandedExerciseId(isExpanded ? null : ex.id)}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] active:scale-[0.99] transition-all"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-zinc-500">#{exIdx + 1}</span>
                      <h4 className="text-xs font-bold text-white truncate">{ex.name}</h4>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500">
                      <span className="text-[#D4FF00]/80 font-medium">{ex.muscle || 'Músculo'}</span>
                      <span>·</span>
                      <span className="text-zinc-300 font-semibold">{ex.sets.length} series</span>
                      <span>({ex.sets.map(s => s.reps || '?').join(', ')})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeExercise(ex.id);
                      }}
                      className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-white/[0.04] transition-colors"
                      title="Quitar ejercicio"
                    >
                      <Trash2 size={14} />
                    </button>
                    {isExpanded ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
                  </div>
                </div>

                {/* Editor detallado de series */}
                {isExpanded && (
                  <div className="px-3.5 pb-4 pt-1 border-t border-white/[0.04] space-y-3 bg-black/30 animate-fade-in">
                    
                    {/* Presets rápidos */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Presets rápidos:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_SCHEMES.map(scheme => (
                          <button
                            key={scheme.label}
                            type="button"
                            onClick={() => applySchemePreset(ex.id, scheme)}
                            className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-zinc-300 hover:text-[#D4FF00] hover:border-[#D4FF00]/40 transition-all"
                          >
                            {scheme.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tabla de series individuales */}
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-12 text-center text-[9px] font-bold text-zinc-500 uppercase tracking-wider px-1">
                        <div className="col-span-2">Serie</div>
                        <div className="col-span-5">Reps Objetivo</div>
                        <div className="col-span-4">Peso Sugerido</div>
                        <div className="col-span-1"></div>
                      </div>

                      {ex.sets.map((set, sIdx) => (
                        <div
                          key={set.id}
                          className="grid grid-cols-12 items-center gap-2 bg-white/[0.02] border border-white/[0.04] p-1.5 rounded-xl text-center"
                        >
                          <span className="col-span-2 text-xs font-mono font-bold text-[#D4FF00]">
                            S{sIdx + 1}
                          </span>

                          <div className="col-span-5">
                            <input
                              type="text"
                              value={set.reps}
                              onChange={e => updateSetDetail(ex.id, set.id, 'reps', e.target.value)}
                              placeholder="10-12"
                              className="w-full bg-black/60 border border-white/[0.08] rounded-lg text-center text-xs font-bold text-white py-1.5 focus:border-[#D4FF00] outline-none"
                            />
                          </div>

                          <div className="col-span-4">
                            <input
                              type="number"
                              step="0.5"
                              value={set.weight}
                              onChange={e => updateSetDetail(ex.id, set.id, 'weight', e.target.value)}
                              placeholder="Opcional"
                              className="w-full bg-black/60 border border-white/[0.08] rounded-lg text-center text-xs font-bold text-white py-1.5 focus:border-[#D4FF00] outline-none"
                            />
                          </div>

                          <div className="col-span-1 flex justify-center">
                            <button
                              type="button"
                              disabled={ex.sets.length <= 1}
                              onClick={() => removeSetFromExercise(ex.id, set.id)}
                              className="text-zinc-600 hover:text-red-400 disabled:opacity-20"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => addSetToExercise(ex.id)}
                      className="w-full py-2 border border-dashed border-white/[0.08] rounded-xl text-[10px] font-bold text-zinc-400 hover:text-[#D4FF00] hover:border-[#D4FF00]/40 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Plus size={12} /> Añadir Serie a {ex.name}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}

        <button
          onClick={() => setShowLibraryModal(true)}
          className="w-full py-3.5 rounded-2xl border border-dashed border-[#D4FF00]/40 bg-[#D4FF00]/[0.03] text-[#D4FF00] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#D4FF00]/10 active:scale-95 transition-all shadow-sm"
        >
          <Plus size={15} /> Añadir Ejercicio a {currentDay?.name || 'este día'}
        </button>
      </div>
    </div>
  );

  // ==================== PASO 3: RESUMEN ====================
  const renderStep3 = () => (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-6 text-center space-y-6 animate-fade-in max-w-sm mx-auto w-full">
      <div className="w-16 h-16 rounded-2xl bg-[#D4FF00]/10 border border-[#D4FF00]/30 flex items-center justify-center text-[#D4FF00] shadow-[0_0_20px_rgba(212,255,0,0.15)]">
        <Sparkles size={32} />
      </div>

      <div>
        <h3 className="text-xl font-black text-white tracking-tight">¡Plan de Entrenamiento Listo!</h3>
        <p className="text-xs text-zinc-400 mt-1">Revisa el resumen antes de guardar</p>
      </div>

      <div className="w-full bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 text-left space-y-3 font-mono">
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Nombre:</span>
          <span className="text-white font-bold truncate max-w-[180px]">{name}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Días de entreno:</span>
          <span className="text-[#D4FF00] font-bold">{trainingDays.length} días</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Total ejercicios:</span>
          <span className="text-white font-bold">{totalExercisesCount}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Total series:</span>
          <span className="text-white font-bold">{totalSetsCount}</span>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        className="w-full py-4 bg-[#D4FF00] text-[#09090B] font-black rounded-2xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(212,255,0,0.35)] hover:bg-[#e5ff1a] active:scale-[0.98] transition-all"
      >
        <Save size={16} /> Guardar y Asignar Rutina
      </button>
    </div>
  );

  // Renderizado mediante React Portal directo en document.body para desacoplarlo del contenedor padre
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[200] bg-[#09090B] flex flex-col h-[100dvh] w-full select-none overflow-hidden animate-fade-in">
      
      {/* Header superior fijo */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/[0.04] shrink-0 bg-[#09090B]">
        <button
          onClick={onCancel}
          className="p-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white active:scale-95"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
          Paso {step} de {TOTAL_STEPS}
        </span>

        <div className="w-8" />
      </div>

      {/* Contenido dinámico del paso */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>

      {/* Barra de navegación inferior SIEMPRE FIJA Y VISIBLE */}
      <div className="px-5 py-3.5 border-t border-white/[0.06] bg-[#0A0A0C] flex items-center justify-between shrink-0 safe-bottom">
        <button
          onClick={prevStep}
          disabled={step === 1}
          className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-xs font-bold text-zinc-400 hover:text-white disabled:opacity-20 flex items-center gap-1 active:scale-95 transition-all"
        >
          <ChevronLeft size={14} /> Anterior
        </button>

        {step < TOTAL_STEPS && (
          <button
            onClick={nextStep}
            disabled={!canGoNext()}
            className="px-5 py-2.5 bg-[#D4FF00] text-[#09090B] rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-30 flex items-center gap-1 shadow-[0_0_15px_rgba(212,255,0,0.3)] hover:bg-[#e5ff1a] active:scale-95 transition-all"
          >
            Siguiente <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* Modal selector de ejercicios */}
      {showLibraryModal && (
        <LibrarySelector
          onSelect={addExerciseFromLibrary}
          onClose={() => setShowLibraryModal(false)}
        />
      )}
    </div>,
    document.body
  );
}