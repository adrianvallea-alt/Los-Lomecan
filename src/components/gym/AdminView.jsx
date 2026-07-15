import React from 'react';
import { ArrowLeft, Plus, Edit3, Trash2, Calendar } from 'lucide-react';
import { MONTHS } from '../../utils/gymHelpers';

export default function AdminView({ routines, onBack, onCreateNew, onEditRoutine, onDeleteRoutine, isAdmin }) {
  return (
    <div className="flex flex-col h-full animate-fade-in safe-top safe-bottom bg-[#09090B]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white active:scale-95 transition-all"
            aria-label="Volver"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-bold text-white tracking-tight">Rutinas</h2>
        </div>
        <button 
          onClick={onCreateNew} 
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#D4FF00] text-[#09090B] text-xs font-bold rounded-full active:scale-95 transition-all shadow-lg shadow-[#D4FF00]/20"
        >
          <Plus size={14} strokeWidth={2.5} />
          Nueva
        </button>
      </div>

      {/* Lista de rutinas */}
      <div className="flex-1 overflow-y-auto px-5 pb-safe space-y-3">
        {routines.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
            <Calendar size={48} className="mb-4 text-zinc-700" />
            <p className="text-sm">No hay rutinas guardadas</p>
            <p className="text-xs text-zinc-600 mt-1">Crea tu primera rutina para empezar</p>
          </div>
        ) : (
          routines.map((routine, index) => (
            <div
              key={routine.id}
              className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 transition-all duration-300 hover:border-white/[0.08] hover:bg-white/[0.03] animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-sm truncate">{routine.name}</h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    {MONTHS[routine.month-1]} {routine.year} · {routine.trainingDays?.length || 0} días
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {routine.trainingDays?.map((day, idx) => (
                      <span 
                        key={idx} 
                        className="text-[10px] bg-white/[0.04] border border-white/[0.05] px-2.5 py-1 rounded-full text-zinc-400 font-medium"
                      >
                        D{idx+1}: {day.name || 'Sin nombre'}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1.5 ml-3 flex-shrink-0">
                  <button 
                    onClick={() => onEditRoutine(routine)} 
                    className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-zinc-400 hover:text-white hover:bg-white/[0.06] active:scale-90 transition-all"
                    aria-label="Editar rutina"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button 
                    onClick={() => onDeleteRoutine(routine.id)} 
                    className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-zinc-400 hover:text-red-400 hover:border-red-400/20 active:scale-90 transition-all"
                    aria-label="Eliminar rutina"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
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