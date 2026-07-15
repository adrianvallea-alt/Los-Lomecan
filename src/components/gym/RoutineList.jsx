import React from 'react';
import { Calendar, ChevronRight, Plus, Clock, Edit3, Trash2 } from 'lucide-react';
import { MONTHS } from '../../utils/gymHelpers';

export default function RoutineList({ routines, onSelectRoutine, onCreateRoutine, onEditRoutine, onDeleteRoutine, completedDays, onGoToHistory }) {
  // Estado vacío
  if (!routines || routines.length === 0) {
    return (
      <div className="flex flex-col h-full animate-fade-in safe-top safe-bottom bg-[#09090B]">
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-safe">
          <div className="flex flex-col items-center justify-center min-h-full py-12">
            <div className="w-24 h-24 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-6">
              <Calendar size={44} className="text-zinc-700" />
            </div>
            <p className="text-zinc-400 text-sm font-medium mb-1">No tienes rutinas guardadas</p>
            <p className="text-xs text-zinc-600 mb-8 max-w-[200px] text-center">
              Crea tu primera rutina para empezar
            </p>
            <button
              onClick={onCreateRoutine}
              className="px-8 py-3.5 bg-[#D4FF00] text-[#09090B] font-bold rounded-2xl text-sm active:scale-95 transition-all shadow-lg shadow-[#D4FF00]/20"
            >
              Crear Rutina
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sorted = [...routines].sort((a, b) => b.year - a.year || b.month - a.month);

  return (
    <div className="flex flex-col h-full animate-fade-in safe-top safe-bottom bg-[#09090B]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <h2 className="text-xl font-bold text-white tracking-tight">Mis Rutinas</h2>
        <button
          onClick={onGoToHistory}
          className="p-2.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white active:scale-95 transition-all"
          aria-label="Historial"
        >
          <Clock size={20} />
        </button>
      </div>

      {/* Lista de rutinas */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-safe space-y-3">
        {sorted.map((routine, index) => {
          const totalDays = routine.trainingDays?.length || 0;
          const completed = completedDays?.[routine.id] || new Set();
          const progressPercent = totalDays > 0 ? Math.round((completed.size / totalDays) * 100) : 0;

          return (
            <div
              key={routine.id}
              className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 transition-all active:scale-[0.98] hover:border-white/[0.08] hover:bg-white/[0.03] animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => onSelectRoutine(routine)}
                  className="text-left flex-1 min-w-0"
                >
                  <h3 className="text-white font-semibold text-sm truncate">{routine.name}</h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    {MONTHS[routine.month - 1]} {routine.year} · {totalDays} días
                  </p>
                </button>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); onEditRoutine(routine); }}
                    className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-zinc-400 hover:text-white active:scale-90 transition-all"
                    aria-label="Editar rutina"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteRoutine(routine.id); }}
                    className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-zinc-400 hover:text-red-400 hover:border-red-400/20 active:scale-90 transition-all"
                    aria-label="Eliminar rutina"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Barra de progreso con acento amarillo neón */}
              {totalDays > 0 && (
                <div className="mt-3 w-full bg-white/[0.05] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-[#D4FF00] rounded-full transition-all duration-700 ease-out shadow-[0_0_6px_rgba(212,255,0,0.3)]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Botón crear nueva rutina */}
        <button
          onClick={onCreateRoutine}
          className="w-full py-4 border border-dashed border-white/[0.08] rounded-2xl text-sm text-zinc-400 hover:border-[#D4FF00]/30 hover:text-[#D4FF00] transition-colors flex items-center justify-center gap-2 font-medium"
        >
          <Plus size={16} />
          Crear nueva rutina
        </button>
      </div>

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
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