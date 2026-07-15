import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, CheckCircle, Info, X } from 'lucide-react';
import ExerciseDetailModal from './ExerciseDetailModal';

export default function DaySelector({ routine, onSelectDay, onBack, completedDays }) {
  const days = routine.trainingDays || [];
  const completedSet = completedDays?.[routine.id] || new Set();
  const [previewDay, setPreviewDay] = useState(null);
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
                <div key={idx}>
                  <button
                    onClick={() => setPreviewDay(idx)}
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
                    <div className="flex items-center gap-2">
                      {isCompleted && (
                        <span className="text-[10px] text-[#D4FF00] font-medium bg-[#D4FF00]/10 px-2 py-0.5 rounded-full">
                          Completado
                        </span>
                      )}
                      <ChevronRight size={16} className="text-zinc-500" />
                    </div>
                  </button>

                  {/* Modal de vista previa del día */}
                  {previewDay === idx && (
                    <div className="fixed inset-0 z-50 bg-[#09090B]/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
                      <div className="w-full sm:max-w-md bg-[#0A0A0C] border border-white/[0.08] rounded-[2.5rem] p-6 space-y-5 shadow-2xl shadow-black/40 max-h-[90vh] overflow-y-auto animate-scale-in">
                        {/* Cabecera del modal */}
                        <div className="flex justify-between items-center">
                          <h3 className="text-white font-bold text-lg">
                            {day.name || `Día ${idx + 1}`}
                          </h3>
                          <button
                            onClick={() => setPreviewDay(null)}
                            className="p-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white active:scale-95 transition-all"
                            aria-label="Cerrar vista previa"
                          >
                            <X size={18} />
                          </button>
                        </div>

                        {/* Lista de ejercicios del día */}
                        <div className="space-y-2">
                          {day.exercises.map((ex, eIdx) => (
                            <div
                              key={eIdx}
                              className="flex items-center justify-between bg-white/[0.03] border border-white/[0.05] rounded-xl p-3.5"
                            >
                              <span className="text-white text-sm font-medium">{ex.name}</span>
                              {(ex.description || ex.video_url) && (
                                <button
                                  onClick={() => setDetailExercise(ex)}
                                  className="p-2 rounded-full bg-white/[0.04] border border-white/[0.05] text-zinc-400 hover:text-[#D4FF00] transition-colors"
                                  aria-label="Ver detalles del ejercicio"
                                >
                                  <Info size={16} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Botón de inicio */}
                        <button
                          onClick={() => {
                            setPreviewDay(null);
                            onSelectDay(routine, idx);
                          }}
                          className="w-full py-3.5 bg-[#D4FF00] text-[#09090B] font-bold rounded-2xl text-sm active:scale-[0.98] transition-all shadow-lg shadow-[#D4FF00]/20"
                        >
                          Iniciar entrenamiento
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-zinc-500 text-sm py-16">
            Esta rutina no tiene días configurados.
          </div>
        )}
      </div>

      {/* Modal de detalle del ejercicio (compartido) */}
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
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
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