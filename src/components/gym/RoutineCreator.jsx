import React, { useState } from 'react';
import {
  X, Save, Plus, Trash2, ChevronRight, ChevronLeft,
  Calendar, Dumbbell
} from 'lucide-react';
import { getCurrentMonth, getCurrentYear } from '../../utils/gymHelpers';
import LibrarySelector from './LibrarySelector';

const TOTAL_STEPS = 3;

export default function RoutineCreator({ onSave, onCancel, initialData = null }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(initialData?.name || '');
  const [trainingDays, setTrainingDays] = useState(() => initialData?.trainingDays || []);
  const [editingDayIndex, setEditingDayIndex] = useState(null);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [dayNameTemp, setDayNameTemp] = useState('');

  const canGoNext = () => {
    if (step === 1) return name.trim().length > 0;
    if (step === 2) return trainingDays.length > 0 && trainingDays.every(day => day.exercises.length > 0);
    return true;
  };

  const nextStep = () => { if (canGoNext()) setStep(prev => Math.min(prev + 1, TOTAL_STEPS)); };
  const prevStep = () => { setStep(prev => Math.max(prev - 1, 1)); };

  const addTrainingDay = () => {
    setTrainingDays(prev => [...prev, { name: `Día ${prev.length + 1}`, exercises: [] }]);
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
      id: crypto.randomUUID(), // ✅ Usar UUID
      setNum: i + 1,
      weight: '',
      reps: repsValue
    }));
    const newExercise = {
      id: crypto.randomUUID(), // ✅ Usar UUID
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
      id: initialData ? initialData.id : crypto.randomUUID(), // ✅ Usar UUID
      name,
      month: getCurrentMonth(),
      year: getCurrentYear(),
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

  const renderStep1 = () => (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 space-y-8">
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
            placeholder="Ej: Fuerza e Hipertrofia"
            autoFocus
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="flex-1 flex flex-col p-4 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-bold text-lg">Días y Ejercicios</h3>
        <button
          onClick={addTrainingDay}
          className="flex items-center gap-1 bg-[#D4FF00] text-[#09090B] px-3 py-1.5 rounded-xl font-bold text-xs"
        >
          <Plus size={14} /> Añadir Día
        </button>
      </div>

      <div className="space-y-4">
        {trainingDays.map((day, dIdx) => (
          <div key={dIdx} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <input
                value={day.name}
                onChange={e => {
                  const newName = e.target.value;
                  setTrainingDays(prev => prev.map((d, i) => i === dIdx ? { ...d, name: newName } : d));
                }}
                className="bg-transparent font-bold text-white text-base outline-none border-b border-transparent focus:border-[#D4FF00]"
              />
              <button onClick={() => removeTrainingDay(dIdx)} className="text-zinc-500 hover:text-red-400">
                <Trash2 size={16} />
              </button>
            </div>

            <div className="space-y-2 mb-3">
              {day.exercises.map((ex) => (
                <div key={ex.id} className="bg-white/[0.03] p-3 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="text-white text-sm font-medium">{ex.name}</p>
                    <p className="text-xs text-zinc-500">{ex.sets.length} series</p>
                  </div>
                  <button onClick={() => { setEditingDayIndex(dIdx); removeExercise(ex.id); }} className="text-zinc-500 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => { setEditingDayIndex(dIdx); setShowLibraryModal(true); }}
              className="w-full py-2 bg-white/[0.04] border border-dashed border-white/[0.08] text-zinc-400 rounded-xl text-xs flex items-center justify-center gap-1 hover:text-white"
            >
              <Dumbbell size={14} /> Añadir ejercicio
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-[#D4FF00]/10 flex items-center justify-center mb-4">
        <Save size={32} className="text-[#D4FF00]" />
      </div>
      <h3 className="text-white font-bold text-xl mb-2">Resumen de la Rutina</h3>
      <p className="text-zinc-400 text-sm mb-6">{name} · {trainingDays.length} día(s)</p>
      <p className="text-xs text-zinc-500 mb-6 max-w-xs">
        La rutina se guardará como plantilla global y estará disponible para todos los perfiles.
      </p>
      <button
        onClick={handleSubmit}
        className="w-full max-w-xs bg-[#D4FF00] text-[#09090B] font-bold py-4 rounded-2xl"
      >
        Guardar Rutina
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#0A0A0C] relative">
      <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
        <button onClick={onCancel} className="text-zinc-400 hover:text-white">
          <X size={20} />
        </button>
        <span className="text-xs font-semibold uppercase text-zinc-400">Paso {step} de {TOTAL_STEPS}</span>
        <div className="w-5" />
      </div>

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}

      <div className="flex justify-between p-4 pb-24 border-t border-white/[0.06] bg-[#09090B]">
        <button
          onClick={prevStep}
          disabled={step === 1}
          className="px-4 py-2 border border-white/[0.08] text-zinc-300 rounded-xl text-xs disabled:opacity-30 flex items-center gap-1"
        >
          <ChevronLeft size={16} /> Anterior
        </button>
        {step < TOTAL_STEPS && (
          <button
            onClick={nextStep}
            disabled={!canGoNext()}
            className="px-4 py-2 bg-[#D4FF00] text-[#09090B] font-bold rounded-xl text-xs disabled:opacity-30 flex items-center gap-1"
          >
            Siguiente <ChevronRight size={16} />
          </button>
        )}
      </div>

      {showLibraryModal && (
        <LibrarySelector
          onSelect={addExerciseFromLibrary}
          onClose={() => setShowLibraryModal(false)}
        />
      )}
    </div>
  );
}