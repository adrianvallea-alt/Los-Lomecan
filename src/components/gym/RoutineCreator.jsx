import React, { useState } from 'react';
import {
  X, Save, Plus, Trash2, ChevronRight, ChevronLeft,
  Search, Copy, Dumbbell, Check, Calendar
} from 'lucide-react';
import { MONTHS, getCurrentMonth, getCurrentYear, generateId } from '../../utils/gymHelpers';
import LibrarySelector from './LibrarySelector';

const TOTAL_STEPS = 3;

export default function RoutineCreator({ onSave, onCancel, initialData = null }) {
  // --- LÓGICA DE ESTADO 100% INTACTA ---
  const [step, setStep] = useState(1);
  const [name, setName] = useState(initialData?.name || '');
  const [month, setMonth] = useState(initialData?.month || getCurrentMonth());
  const [year, setYear] = useState(initialData?.year || getCurrentYear());
  const [trainingDays, setTrainingDays] = useState(() => {
    if (initialData?.trainingDays) return initialData.trainingDays;
    return [];
  });

  const [editingDayIndex, setEditingDayIndex] = useState(null);
  const [showLibraryModal, setShowLibraryModal] = useState(false);

  const canGoNext = () => {
    if (step === 1) return name.trim().length > 0;
    if (step === 2) return trainingDays.length > 0 && trainingDays.every(day => day.exercises.length > 0);
    return true;
  };

  const nextStep = () => { if (canGoNext()) setStep(prev => Math.min(prev + 1, TOTAL_STEPS)); };
  const prevStep = () => { setStep(prev => Math.max(prev - 1, 1)); setEditingDayIndex(null); };

  const addTrainingDay = () => {
    setTrainingDays(prev => {
      const newDays = [...prev, { name: '', exercises: [] }];
      setTimeout(() => setEditingDayIndex(newDays.length - 1), 0);
      return newDays;
    });
  };

  const removeTrainingDay = (index) => {
    setTrainingDays(prev => prev.filter((_, i) => i !== index));
    if (editingDayIndex === index) setEditingDayIndex(null);
  };

  const updateTrainingDayName = (index, value) => {
    setTrainingDays(prev => prev.map((day, i) => i === index ? { ...day, name: value } : day));
  };

  const addExerciseFromLibrary = (libraryExercise) => {
    if (editingDayIndex === null) return;
    const seriesCount = libraryExercise.default_series || 1;
    const repsArray = libraryExercise.default_reps
      ? libraryExercise.default_reps.split(',').map(r => r.trim())
      : [];
    const sets = Array.from({ length: seriesCount }, (_, i) => ({
      id: generateId(),
      setNum: i + 1,
      weight: '',
      reps: repsArray[i] || ''
    }));
    const newExercise = {
      id: generateId(),
      name: libraryExercise.name,
      muscle: libraryExercise.muscle,
      secondaryMuscles: libraryExercise.secondary_muscles || '',
      description: libraryExercise.description,
      video_url: libraryExercise.video_url || '',
      libraryExerciseId: libraryExercise.id,
      sets,
    };
    setTrainingDays(prev =>
      prev.map((day, i) =>
        i === editingDayIndex
          ? { ...day, exercises: [...day.exercises, newExercise] }
          : day
      )
    );
    setShowLibraryModal(false);
  };

  const removeExercise = (exerciseId) => {
    if (editingDayIndex === null) return;
    setTrainingDays(prev =>
      prev.map((day, i) =>
        i === editingDayIndex
          ? { ...day, exercises: day.exercises.filter(ex => ex.id !== exerciseId) }
          : day
      )
    );
  };

  const addSet = (exerciseId) => {
    if (editingDayIndex === null) return;
    setTrainingDays(prev =>
      prev.map((day, i) =>
        i === editingDayIndex
          ? {
              ...day,
              exercises: day.exercises.map(ex =>
                ex.id === exerciseId
                  ? { ...ex, sets: [...ex.sets, { id: generateId(), setNum: ex.sets.length + 1, weight: '', reps: '' }] }
                  : ex
              )
            }
          : day
      )
    );
  };

  const removeSet = (exerciseId, setId) => {
    if (editingDayIndex === null) return;
    setTrainingDays(prev =>
      prev.map((day, i) =>
        i === editingDayIndex
          ? {
              ...day,
              exercises: day.exercises.map(ex =>
                ex.id === exerciseId
                  ? { ...ex, sets: ex.sets.filter(s => s.id !== setId).map((s, idx) => ({ ...s, setNum: idx + 1 })) }
                  : ex
              )
            }
          : day
      )
    );
  };

  const updateSetReps = (exerciseId, setId, reps) => {
    if (editingDayIndex === null) return;
    setTrainingDays(prev =>
      prev.map((day, i) =>
        i === editingDayIndex
          ? {
              ...day,
              exercises: day.exercises.map(ex =>
                ex.id === exerciseId
                  ? { ...ex, sets: ex.sets.map(s => (s.id === setId ? { ...s, reps } : s)) }
                  : ex
              )
            }
          : day
      )
    );
  };

  const copyExercisesToOtherDays = () => {
    if (editingDayIndex === null) return;
    const sourceExercises = trainingDays[editingDayIndex]?.exercises || [];
    if (sourceExercises.length === 0) return;
    setTrainingDays(prev =>
      prev.map((day, i) => {
        if (i !== editingDayIndex) {
          return {
            ...day,
            exercises: sourceExercises.map(ex => ({
              ...ex,
              id: generateId(),
              sets: ex.sets.map(s => ({ ...s, id: generateId() }))
            }))
          };
        }
        return day;
      })
    );
  };

  const handleSubmit = () => {
    if (!name.trim() || trainingDays.length === 0) return;
    const routineData = {
      id: initialData ? initialData.id : 'r_' + generateId(),
      name,
      month,
      year,
      trainingDays: trainingDays.map(day => ({
        name: day.name,
        exercises: day.exercises.map(ex => ({
          id: ex.id,
          name: ex.name,
          muscle: ex.muscle,
          secondaryMuscles: ex.secondaryMuscles || '',
          description: ex.description || '',
          video_url: ex.video_url || '',
          libraryExerciseId: ex.libraryExerciseId,
          sets: ex.sets.map(s => ({
            id: s.id,
            setNum: s.setNum,
            weight: s.weight || '',
            reps: s.reps || ''
          }))
        }))
      }))
    };
    onSave(routineData);
  };

  // ---------- RENDERIZADO POR PASOS (UI renombrada) ----------
  const renderStep1 = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
          <Calendar size={28} className="text-[#D4FF00]" />
        </div>
        <h3 className="text-lg font-semibold text-white">Información básica</h3>
        <p className="text-xs text-zinc-500 mt-1">Dale un nombre a tu rutina y elige el mes</p>
      </div>
      <div>
        <label className="text-[11px] text-zinc-500 ml-1 mb-1.5 block">Nombre de la rutina</label>
        <input
          required
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full bg-[#09090B] border border-white/[0.08] rounded-2xl p-3.5 text-sm text-white placeholder-zinc-600 focus:border-[#D4FF00]/40 outline-none transition-colors"
          placeholder="Ej. Fuerza Junio"
          aria-label="Nombre de la rutina"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] text-zinc-500 ml-1 mb-1.5 block">Mes</label>
          <select
            value={month}
            onChange={e => setMonth(parseInt(e.target.value))}
            className="w-full bg-[#09090B] border border-white/[0.08] rounded-2xl p-3.5 text-sm text-white focus:border-[#D4FF00]/40 outline-none"
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-zinc-500 ml-1 mb-1.5 block">Año</label>
          <input
            type="number"
            value={year}
            onChange={e => setYear(parseInt(e.target.value))}
            className="w-full bg-[#09090B] border border-white/[0.08] rounded-2xl p-3.5 text-sm text-white focus:border-[#D4FF00]/40 outline-none"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4 animate-fade-in-up">
      <div className="text-center mb-4">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
          <Dumbbell size={28} className="text-[#D4FF00]" />
        </div>
        <h3 className="text-lg font-semibold text-white">Días de entrenamiento</h3>
        <p className="text-xs text-zinc-500 mt-1">Añade los días y configura sus ejercicios</p>
      </div>

      {/* Lista de días */}
      <div className="space-y-2 mb-4">
        {trainingDays.map((day, idx) => (
          <div
            key={idx}
            onClick={() => setEditingDayIndex(idx)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setEditingDayIndex(idx); }}
            className={`w-full bg-white/[0.02] border rounded-2xl p-4 flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer ${
              editingDayIndex === idx ? 'border-[#D4FF00]/40 bg-[#D4FF00]/5' : 'border-white/[0.05] hover:border-white/10'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                editingDayIndex === idx ? 'bg-[#D4FF00]/10 text-[#D4FF00]' : 'bg-white/[0.04] text-zinc-400'
              }`}>
                {idx + 1}
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-sm">
                  {day.name || `Día ${idx + 1}`}
                </p>
                <p className="text-xs text-zinc-500">
                  {day.exercises.length} ejercicios
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeTrainingDay(idx); }}
                className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-zinc-400 hover:text-red-400 active:scale-90"
                aria-label="Eliminar día"
              >
                <Trash2 size={15} />
              </button>
              <ChevronRight size={16} className="text-zinc-500" />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addTrainingDay}
        className="w-full py-4 border border-dashed border-white/[0.08] rounded-2xl text-sm text-zinc-400 hover:border-[#D4FF00]/30 hover:text-[#D4FF00] transition-colors flex items-center justify-center gap-2 font-medium"
      >
        <Plus size={16} />
        Añadir día
      </button>

      {/* Editor del día seleccionado */}
      {editingDayIndex !== null && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 mt-4 animate-scale-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-[#D4FF00] font-bold">Día {editingDayIndex + 1}</span>
              <input
                value={trainingDays[editingDayIndex].name}
                onChange={e => updateTrainingDayName(editingDayIndex, e.target.value)}
                placeholder="Nombre del día"
                className="bg-transparent border-b border-white/[0.08] text-white text-sm px-1 py-1 focus:border-[#D4FF00]/40 outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setEditingDayIndex(null)}
              className="p-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white active:scale-95 transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Ejercicios del día */}
          <div className="space-y-3 mb-4">
            {trainingDays[editingDayIndex].exercises.map(exercise => (
              <div key={exercise.id} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3.5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{exercise.name}</p>
                    <p className="text-xs text-[#D4FF00]/80 mt-0.5">{exercise.muscle}</p>
                  </div>
                  <button 
                    onClick={() => removeExercise(exercise.id)} 
                    className="p-2 rounded-lg text-zinc-400 hover:text-red-400 active:scale-90"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {exercise.sets.map(set => (
                    <div key={set.id} className="flex items-center gap-1.5">
                      <span className="text-[10px] text-zinc-500 font-medium">S{set.setNum}</span>
                      <input
                        type="number"
                        value={set.reps}
                        onChange={e => updateSetReps(exercise.id, set.id, e.target.value)}
                        className="w-full bg-[#09090B] border border-white/[0.08] rounded-lg text-center text-xs py-2 text-white placeholder-zinc-600 focus:border-[#D4FF00]/40 outline-none"
                        placeholder="Reps"
                      />
                      {exercise.sets.length > 1 && (
                        <button onClick={() => removeSet(exercise.id, set.id)} className="text-zinc-500 hover:text-red-400">
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addSet(exercise.id)}
                    className="text-[11px] text-[#D4FF00] font-medium hover:underline col-span-3 mt-1"
                  >
                    + Añadir serie
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowLibraryModal(true)}
              className="flex-1 py-3 bg-[#D4FF00]/10 border border-[#D4FF00]/20 text-[#D4FF00] rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-[#D4FF00]/20 transition-colors"
            >
              <Search size={15} />
              Añadir ejercicio
            </button>
            {trainingDays[editingDayIndex].exercises.length > 0 && (
              <button
                type="button"
                onClick={copyExercisesToOtherDays}
                className="py-3 px-4 bg-white/[0.03] border border-white/[0.06] rounded-xl text-zinc-400 text-sm flex items-center gap-1.5 hover:text-white transition-colors"
              >
                <Copy size={15} />
                Copiar a otros
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#D4FF00]/10 border border-[#D4FF00]/20 flex items-center justify-center mx-auto mb-3">
          <Check size={28} className="text-[#D4FF00]" />
        </div>
        <h3 className="text-lg font-semibold text-white">Resumen de la rutina</h3>
        <p className="text-xs text-zinc-500 mt-1">Revisa todo antes de guardar</p>
      </div>

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
        <h4 className="text-white font-bold text-sm mb-1">{name}</h4>
        <p className="text-xs text-zinc-500 mb-4">
          {MONTHS[month - 1]} {year} · {trainingDays.length} días
        </p>
        {trainingDays.map((day, idx) => (
          <div key={idx} className="mb-3 last:mb-0">
            <p className="text-sm text-[#D4FF00] font-semibold">{day.name || `Día ${idx + 1}`}</p>
            <ul className="list-disc list-inside text-xs text-zinc-400 mt-1.5 space-y-0.5">
              {day.exercises.map(ex => (
                <li key={ex.id}>{ex.name} ({ex.sets.length} series)</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full animate-fade-in safe-top safe-bottom bg-[#09090B]">
      {/* Header con indicador de paso mejorado */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <button 
          onClick={onCancel} 
          className="p-2.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white active:scale-95 transition-all"
          aria-label="Cancelar"
        >
          <X size={20} />
        </button>
        
        {/* Indicador de paso estilo barra */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`transition-all duration-500 ease-out-expo ${
                i + 1 === step
                  ? 'w-8 h-2 bg-[#D4FF00] rounded-full shadow-[0_0_8px_rgba(212,255,0,0.4)]'
                  : i + 1 < step
                  ? 'w-2 h-2 bg-[#D4FF00]/60 rounded-full'
                  : 'w-2 h-2 bg-white/10 rounded-full'
              }`}
            />
          ))}
        </div>
        
        <div className="w-8" />
      </div>

      {/* Contenido del paso */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>

      {/* Footer con botones de navegación */}
      <div className="px-5 py-4 flex items-center gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={prevStep}
            className="px-5 py-3.5 border border-white/[0.08] rounded-2xl text-zinc-400 text-sm font-medium flex items-center gap-1.5 hover:bg-white/[0.03] hover:text-white active:scale-[0.98] transition-all"
          >
            <ChevronLeft size={16} />
            Atrás
          </button>
        )}
        <div className="flex-1" />
        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={nextStep}
            disabled={!canGoNext()}
            className="px-6 py-3.5 bg-[#D4FF00] text-[#09090B] font-bold rounded-2xl text-sm flex items-center gap-1.5 disabled:opacity-30 disabled:pointer-events-none active:scale-[0.98] transition-all shadow-lg shadow-[#D4FF00]/20"
          >
            Siguiente
            <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="px-6 py-3.5 bg-[#D4FF00] text-[#09090B] font-bold rounded-2xl text-sm flex items-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-[#D4FF00]/20"
          >
            <Save size={16} />
            {initialData ? 'Guardar Cambios' : 'Guardar Rutina'}
          </button>
        )}
      </div>

      {/* Modal de biblioteca */}
      {showLibraryModal && (
        <LibrarySelector
          onSelect={addExerciseFromLibrary}
          onClose={() => setShowLibraryModal(false)}
        />
      )}

      <style>{`
        .ease-out-expo {
          transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(12px); filter: blur(4px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-scale-in {
          animation: scale-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}