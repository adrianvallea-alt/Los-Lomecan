import React, { useState } from 'react';
import {
  X, Save, Plus, Trash2, ChevronRight, ChevronLeft,
  Search, Dumbbell, Check, Calendar, Eye, Edit3
} from 'lucide-react';
import { MONTHS, getCurrentMonth, getCurrentYear, generateId } from '../../utils/gymHelpers';
import LibrarySelector from './LibrarySelector';

const TOTAL_STEPS = 3;

export default function RoutineCreator({ onSave, onCancel, initialData = null }) {
  // ========== ESTADOS ==========
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
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
  const [dayNameTemp, setDayNameTemp] = useState('');

  // ========== FUNCIONES ==========
  const canGoNext = () => {
    if (step === 1) return name.trim().length > 0;
    if (step === 2) return trainingDays.length > 0 && trainingDays.every(day => day.exercises.length > 0);
    return true;
  };

  const nextStep = () => { if (canGoNext()) setStep(prev => Math.min(prev + 1, TOTAL_STEPS)); };
  const prevStep = () => { setStep(prev => Math.max(prev - 1, 1)); };

  const addTrainingDay = () => {
    setTrainingDays(prev => [...prev, { name: `Día ${prev.length + 1}`, exercises: [] }]);
    // Abrir edición del nuevo día
    setTimeout(() => {
      setEditingDayIndex(trainingDays.length);
      setDayNameTemp(`Día ${trainingDays.length + 1}`);
    }, 100);
  };

  const removeTrainingDay = (index) => {
    if (trainingDays.length <= 1) {
      alert('Debes tener al menos un día de entrenamiento.');
      return;
    }
    setTrainingDays(prev => prev.filter((_, i) => i !== index));
    if (editingDayIndex === index) setEditingDayIndex(null);
    if (editingDayIndex > index) setEditingDayIndex(prev => prev - 1);
  };

  const addExerciseFromLibrary = (libraryExercise) => {
    if (editingDayIndex === null) return;
    const seriesCount = libraryExercise.default_series || 1;
    const repsValue = libraryExercise.default_reps || '';
    const sets = Array.from({ length: seriesCount }, (_, i) => ({
      id: generateId(),
      setNum: i + 1,
      weight: '',
      reps: repsValue
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

  const updateSetWeight = (exerciseId, setId, weight) => {
    if (editingDayIndex === null) return;
    setTrainingDays(prev =>
      prev.map((day, i) =>
        i === editingDayIndex
          ? {
              ...day,
              exercises: day.exercises.map(ex =>
                ex.id === exerciseId
                  ? { ...ex, sets: ex.sets.map(s => (s.id === setId ? { ...s, weight } : s)) }
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

  const handleSubmit = () => {
    if (!name.trim() || trainingDays.length === 0) {
      alert('Completa el nombre y al menos un día de entrenamiento.');
      return;
    }
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
    // Se envía el segundo parámetro para que el padre sepa si es plantilla o no
    onSave(routineData, saveAsTemplate);
  };

  const openDayEditor = (index) => {
    setEditingDayIndex(index);
    setDayNameTemp(trainingDays[index].name || `Día ${index + 1}`);
  };

  const closeDayEditor = () => {
    // Guardar nombre del día
    if (editingDayIndex !== null && dayNameTemp.trim()) {
      setTrainingDays(prev =>
        prev.map((day, i) =>
          i === editingDayIndex ? { ...day, name: dayNameTemp.trim() } : day
        )
      );
    }
    setEditingDayIndex(null);
  };

  const updateDayName = (value) => {
    setDayNameTemp(value);
  };

  // ========== RENDERIZADO DE PASOS ==========
  const renderStep1 = () => (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 space-y-8 animate-fade-in-up">
      <div className="text-center">
        <div className="w-20 h-20 rounded-2xl bg-[#D4FF00]/10 border border-[#D4FF00]/20 flex items-center justify-center mx-auto mb-4">
          <Calendar size={40} className="text-[#D4FF00]" />
        </div>
        <h2 className="text-2xl font-bold text-white">Información básica</h2>
        <p className="text-sm text-zinc-400 mt-2">Dale un nombre a tu rutina</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <div>
          <label className="text-xs text-zinc-400 font-medium block mb-1.5">Nombre de la rutina</label>
          <input
            required
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-[#09090B] border border-white/[0.08] rounded-2xl p-4 text-white text-lg placeholder-zinc-600 focus:border-[#D4FF00]/40 outline-none transition-colors"
            placeholder="Ej: Fuerza Junio"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-400 font-medium block mb-1.5">Mes</label>
            <select
              value={month}
              onChange={e => setMonth(parseInt(e.target.value))}
              className="w-full bg-[#09090B] border border-white/[0.08] rounded-2xl p-3.5 text-white focus:border-[#D4FF00]/40 outline-none"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 font-medium block mb-1.5">Año</label>
            <input
              type="number"
              value={year}
              onChange={e => setYear(parseInt(e.target.value))}
              className="w-full bg-[#09090B] border border-white/[0.08] rounded-2xl p-3.5 text-white focus:border-[#D4FF00]/40 outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="flex-1 flex flex-col px-5 py-4 space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Días de entrenamiento</h2>
          <p className="text-xs text-zinc-400 mt-0.5">{trainingDays.length} días configurados</p>
        </div>
        <button
          onClick={addTrainingDay}
          className="px-4 py-2.5 bg-[#D4FF00] text-[#09090B] font-bold rounded-xl text-sm flex items-center gap-1.5 shadow-lg shadow-[#D4FF00]/20"
        >
          <Plus size={16} /> Añadir día
        </button>
      </div>

      {trainingDays.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-500 space-y-3">
          <Dumbbell size={48} className="text-zinc-700" />
          <p className="text-sm">No hay días agregados</p>
          <p className="text-xs text-zinc-600">Presiona "Añadir día" para comenzar</p>
        </div>
      ) : (
        <div className="flex-1 space-y-3 pb-4">
          {trainingDays.map((day, idx) => (
            <div
              key={idx}
              className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 flex items-center justify-between hover:border-white/[0.1] transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-white font-bold text-sm">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{day.name || `Día ${idx + 1}`}</p>
                  <p className="text-xs text-zinc-500">{day.exercises.length} ejercicios</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openDayEditor(idx)}
                  className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white transition-colors"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => removeTrainingDay(idx)}
                  className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="flex-1 flex flex-col px-5 py-4 space-y-4 animate-fade-in-up">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#D4FF00]/10 border border-[#D4FF00]/20 flex items-center justify-center mx-auto mb-3">
          <Check size={32} className="text-[#D4FF00]" />
        </div>
        <h2 className="text-xl font-bold text-white">Resumen de la rutina</h2>
        <p className="text-xs text-zinc-400 mt-1">Revisa todo antes de guardar</p>
      </div>

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 flex-1 overflow-y-auto">
        <h3 className="text-white font-bold text-lg">{name}</h3>
        <p className="text-xs text-zinc-400 mb-4">
          {MONTHS[month - 1]} {year} · {trainingDays.length} días
        </p>
        <div className="space-y-3">
          {trainingDays.map((day, idx) => (
            <div key={idx} className="bg-white/[0.03] border border-white/[0.04] rounded-xl p-3">
              <p className="text-white font-semibold text-sm">{day.name || `Día ${idx + 1}`}</p>
              <ul className="mt-1.5 space-y-1">
                {day.exercises.map((ex, exIdx) => (
                  <li key={exIdx} className="text-xs text-zinc-300 flex justify-between">
                    <span>{ex.name}</span>
                    <span className="text-zinc-500">{ex.sets.length} series</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Selector para guardar como Rutina Activa o Plantilla */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
        <h4 className="text-white text-sm font-medium mb-2">Opciones de guardado</h4>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-zinc-400 text-sm hover:text-white transition-colors">
            <input 
              type="radio" 
              name="saveType" 
              checked={!saveAsTemplate} 
              onChange={() => setSaveAsTemplate(false)}
              className="accent-[#D4FF00] w-4 h-4"
            />
            Rutina activa (Aparece en Mis Rutinas)
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-zinc-400 text-sm hover:text-white transition-colors">
            <input 
              type="radio" 
              name="saveType" 
              checked={saveAsTemplate} 
              onChange={() => setSaveAsTemplate(true)}
              className="accent-[#D4FF00] w-4 h-4"
            />
            Plantilla (Se guarda en el banco de plantillas)
          </label>
        </div>
      </div>
    </div>
  );

  // ========== MODAL DE EDICIÓN DE DÍA ==========
  const renderDayEditor = () => {
    if (editingDayIndex === null) return null;
    const day = trainingDays[editingDayIndex];
    if (!day) return null;

    return (
      <div className="fixed inset-0 z-[100] bg-[#09090B]/95 backdrop-blur-xl flex items-center justify-center p-4 pb-24 animate-fade-in">
        <div 
          className="w-full max-w-md bg-[#0A0A0C] border border-white/[0.08] rounded-[2.5rem] px-6 pt-6 pb-12 max-h-[90vh] flex flex-col shadow-2xl animate-scale-in" 
          style={{ paddingBottom: 'calc(3rem + env(safe-area-inset-bottom))' }}
        >
          {/* Header del modal */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Edit3 size={18} className="text-[#D4FF00]" />
              <h3 className="text-white font-bold text-lg">Editar día</h3>
            </div>
            <button
              onClick={closeDayEditor}
              className="p-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Nombre del día */}
          <div className="mb-4">
            <label className="text-xs text-zinc-400 font-medium block mb-1">Nombre del día</label>
            <input
              value={dayNameTemp}
              onChange={e => updateDayName(e.target.value)}
              className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3 text-white text-sm focus:border-[#D4FF00]/40 outline-none"
              placeholder="Ej: Día 1 - Pecho"
            />
          </div>

          {/* Lista de ejercicios con margen inferior amplio */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-4 pb-40">
            {day.exercises.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-sm">
                <p>No hay ejercicios en este día.</p>
                <p className="text-xs text-zinc-600 mt-1">Añade uno desde la biblioteca.</p>
              </div>
            ) : (
              day.exercises.map(ex => (
                <div key={ex.id} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{ex.name}</p>
                      <p className="text-[10px] text-[#D4FF00]/80">{ex.muscle}</p>
                    </div>
                    <button
                      onClick={() => removeExercise(ex.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {ex.sets.map(set => (
                      <div key={set.id} className="flex items-center gap-1 bg-[#09090B] rounded-lg p-1.5">
                        <span className="text-[9px] text-zinc-500 font-medium w-6 text-center">S{set.setNum}</span>
                        <input
                          type="number"
                          value={set.weight}
                          onChange={e => updateSetWeight(ex.id, set.id, e.target.value)}
                          className="w-full bg-transparent text-center text-xs py-1 text-white placeholder-zinc-600 focus:outline-none"
                          placeholder="Kg"
                        />
                        <input
                          type="text"
                          value={set.reps}
                          onChange={e => updateSetReps(ex.id, set.id, e.target.value)}
                          className="w-full bg-transparent text-center text-xs py-1 text-white placeholder-zinc-600 focus:outline-none"
                          placeholder="Reps"
                        />
                        {ex.sets.length > 1 && (
                          <button
                            onClick={() => removeSet(ex.id, set.id)}
                            className="text-zinc-500 hover:text-red-400"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => addSet(ex.id)}
                    className="text-[10px] text-[#D4FF00] font-medium hover:underline mt-2 block text-center w-full"
                  >
                    + Añadir serie
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Botones de acción del modal */}
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setShowLibraryModal(true)}
              className="flex-1 py-3 bg-[#D4FF00]/10 border border-[#D4FF00]/20 text-[#D4FF00] rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-[#D4FF00]/20 transition-colors"
            >
              <Search size={16} /> Añadir ejercicio
            </button>
            <button
              onClick={closeDayEditor}
              className="flex-1 py-3 bg-[#D4FF00] text-[#09090B] font-bold rounded-xl text-sm flex items-center justify-center gap-1.5"
            >
              <Check size={16} /> Listo
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ========== RENDER PRINCIPAL ==========
  return (
    <div className="flex flex-col h-full bg-[#09090B] safe-top safe-bottom relative">
      {/* Header con indicador de paso */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-white/[0.05]">
        <button
          onClick={onCancel}
          className="p-2.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white active:scale-95 transition-all"
        >
          <X size={20} />
        </button>
        <div className="flex items-center gap-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`w-8 h-1.5 rounded-full transition-all ${
                i + 1 <= step
                  ? 'bg-[#D4FF00] shadow-[0_0_8px_rgba(212,255,0,0.4)]'
                  : 'bg-white/[0.1]'
              }`}
            />
          ))}
          <span className="text-[10px] text-zinc-500 ml-1 font-medium">
            {step}/{TOTAL_STEPS}
          </span>
        </div>
        <div className="w-8" />
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>

      {/* Footer con botones de navegación */}
      <div className="px-5 py-4 bg-[#09090B]/95 backdrop-blur-md border-t border-white/[0.05] flex items-center gap-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 70px)' }}>
        {step > 1 && (
          <button
            onClick={prevStep}
            className="px-5 py-3.5 border border-white/[0.08] rounded-2xl text-zinc-400 text-sm font-medium flex items-center gap-1.5 hover:bg-white/[0.03] hover:text-white active:scale-[0.98] transition-all"
          >
            <ChevronLeft size={16} /> Atrás
          </button>
        )}
        <div className="flex-1" />
        {step < TOTAL_STEPS ? (
          <button
            onClick={nextStep}
            disabled={!canGoNext()}
            className="px-8 py-3.5 bg-[#D4FF00] text-[#09090B] font-bold rounded-2xl text-sm flex items-center gap-2 disabled:opacity-30 disabled:pointer-events-none active:scale-[0.98] transition-all shadow-lg shadow-[#D4FF00]/20"
          >
            Siguiente <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="px-8 py-3.5 bg-[#D4FF00] text-[#09090B] font-bold rounded-2xl text-sm flex items-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-[#D4FF00]/20"
          >
            <Save size={16} /> {initialData ? 'Guardar Cambios' : 'Guardar Rutina'}
          </button>
        )}
      </div>

      {/* Modal de edición de día */}
      {renderDayEditor()}

      {/* Modal de biblioteca */}
      {showLibraryModal && (
        <LibrarySelector onSelect={addExerciseFromLibrary} onClose={() => setShowLibraryModal(false)} />
      )}

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}