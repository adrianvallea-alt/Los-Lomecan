import React, { useState } from 'react';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import ExerciseDetailModal from './ExerciseDetailModal';

export default function DaySelector({ routine, onSelectDay, onBack, completedDays }) {
  const days = routine.trainingDays || [];
  const completedSet = completedDays?.[routine.id] || new Set();
  const [detailExercise, setDetailExercise] = useState(null);

  return (
    <div className="flex flex-col h-full animate-fade-in safe-top safe-bottom bg-[#09090B]">
      {/* Header */}
      <div className="flex items-center px-5 pt-5 pb-4">
        <button
          onClick={onBack}
          className="p-2.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white active:scale-95 transition-all mr-3"
          aria-label="Volver"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">{routine.name}</h2>
          <p className="text-xs text-zinc-500 mt-0.5">{days.length} días de entrenamiento</p>
        </div>
      </div>

      {/* Lista de días */}
      <div className="flex-1 overflow-y-auto px-5 pb-safe">
        {days.length > 0 ? (
          <div className="grid gap-3">
            {days.map((day, idx) => {
              const isCompleted = completedSet.has(idx);
              return (
                <button
                  key={idx}
                  onClick={() => onSelectDay(routine, idx)} // ✅ directo al tracker
                  className={`w-full bg-white/[0.02] border rounded-2xl p-4 flex items-center justify-between transition-all active:scale-[0.98] text-left ${
                    isCompleted
                      ? 'border-[#D4FF00]/20 bg-[#D4FF00]/[0.03]'
                      : 'border-white/[0.05] hover:border-white/10 hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${
                        isCompleted
                          ? 'bg-[#D4FF00]/10 text-[#D4FF00]'
                          : 'bg-white/[0.04] text-zinc-400'
                      }`}
                    >
                      {isCompleted ? <CheckCircle size={20} /> : idx + 1}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">
                        {day.name || `Día ${idx + 1}`}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {day.exercises?.length || 0} ejercicios
                      </p>
                    </div>
                  </div>
                  {isCompleted && (
                    <span className="text-[10px] text-[#D4FF00] font-medium bg-[#D4FF00]/10 px-2 py-0.5 rounded-full">
                      Completado
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-zinc-500 text-sm py-16">
            Esta rutina no tiene días configurados.
          </div>
        )}
      </div>

      {/* Modal de detalle del ejercicio (opcional, desde el tracker o si se requiere) */}
      {detailExercise && (
        <ExerciseDetailModal
          exercise={detailExercise}
          onClose={() => setDetailExercise(null)}
        />
      )}

      <style>{`
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