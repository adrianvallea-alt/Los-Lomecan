import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, Dumbbell, Zap } from 'lucide-react';
import ExerciseDetailModal from './ExerciseDetailModal';

export default function DaySelector({ routine, onSelectDay, onBack, completedDays }) {
  const days = routine.trainingDays || [];
  const completedSet = completedDays?.[routine.id] || new Set();
  const [detailExercise, setDetailExercise] = useState(null);

  return (
    <div className="flex flex-col h-full animate-fade-in safe-top safe-bottom bg-[#09090B]">
      {/* Header con acento neón */}
      <div className="flex items-center px-5 pt-5 pb-4">
        <button
          onClick={onBack}
          className="p-2.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-zinc-400 hover:text-white hover:border-[#D4FF00]/40 hover:shadow-[0_0_12px_rgba(212,255,0,0.2)] active:scale-95 transition-all mr-3"
          aria-label="Volver"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            {routine.name}
            <span className="inline-block w-2 h-2 rounded-full bg-[#D4FF00] shadow-[0_0_8px_rgba(212,255,0,0.8)]" />
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
            <Dumbbell size={12} className="text-[#D4FF00]" />
            {days.length} días de entrenamiento
          </p>
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
                  onClick={() => onSelectDay(routine, idx)}
                  className={`w-full text-left rounded-2xl p-4 flex items-center justify-between transition-all duration-300 active:scale-[0.98] ${
                    isCompleted
                      ? 'bg-gradient-to-r from-[#D4FF00]/15 via-[#D4FF00]/5 to-transparent border border-[#D4FF00]/50 shadow-[0_0_20px_rgba(212,255,0,0.2)]'
                      : 'bg-white/[0.03] border border-white/[0.08] hover:border-[#D4FF00]/30 hover:shadow-[0_0_15px_rgba(212,255,0,0.1)]'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold transition-all ${
                        isCompleted
                          ? 'bg-[#D4FF00]/20 text-[#D4FF00] border border-[#D4FF00]/40 shadow-[0_0_10px_rgba(212,255,0,0.4)]'
                          : 'bg-white/[0.05] text-zinc-400 border border-white/[0.08]'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle size={22} className="drop-shadow-[0_0_6px_rgba(212,255,0,0.7)]" />
                      ) : (
                        idx + 1
                      )}
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

                  {isCompleted ? (
                    <span className="text-[10px] text-[#D4FF00] font-medium bg-[#D4FF00]/10 border border-[#D4FF00]/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Zap size={10} />
                      Completado
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                      <Zap size={10} />
                      Pendiente
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