import React from 'react';
import { X, Check, Calendar, Dumbbell, ClipboardList } from 'lucide-react';
import { MONTHS } from '../../utils/gymHelpers';

export default function RoutinePreviewModal({ routine, onClose, onConfirm }) {
  const { name, month, year, trainingDays } = routine;

  const totalExercises = trainingDays.reduce((acc, day) => acc + day.exercises.length, 0);
  const totalSets = trainingDays.reduce((acc, day) => 
    acc + day.exercises.reduce((s, ex) => s + ex.sets.length, 0), 0
  );

  return (
    <div className="fixed inset-0 z-[200] bg-[#09090B]/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-[#0A0A0C] border border-white/[0.08] rounded-[2.5rem] p-6 max-h-[90vh] flex flex-col shadow-2xl shadow-black/40 animate-scale-in">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <ClipboardList size={20} className="text-[#D4FF00]" />
            <h3 className="text-lg font-bold text-white">Vista previa</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white active:scale-95 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Resumen */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 mb-4">
          <h4 className="text-white font-bold text-lg">{name}</h4>
          <p className="text-xs text-zinc-400 mt-1">
            {MONTHS[month - 1]} {year} · {trainingDays.length} días
          </p>
          <div className="flex gap-4 mt-3 text-xs text-zinc-500">
            <span>{trainingDays.length} días</span>
            <span>·</span>
            <span>{totalExercises} ejercicios</span>
            <span>·</span>
            <span>{totalSets} series</span>
          </div>
        </div>

        {/* Lista de días */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {trainingDays.map((day, idx) => (
            <div key={idx} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-[#D4FF00]/10 text-[#D4FF00] flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </div>
                <h5 className="text-white font-semibold text-sm">
                  {day.name || `Día ${idx + 1}`}
                </h5>
                <span className="text-[10px] text-zinc-500 ml-auto">
                  {day.exercises.length} ejercicios
                </span>
              </div>
              <div className="space-y-2">
                {day.exercises.map((ex, exIdx) => (
                  <div key={exIdx} className="flex items-center justify-between bg-white/[0.03] border border-white/[0.04] rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{ex.name}</p>
                      <p className="text-[10px] text-[#D4FF00]/80">{ex.muscle}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                      <span>{ex.sets.length} series</span>
                      {ex.sets.length > 0 && (
                        <span className="text-zinc-600">
                          ({ex.sets.map(s => s.reps || '?').join(', ')})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex gap-3 mt-4 pt-4 border-t border-white/[0.05]">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 border border-white/[0.08] rounded-2xl text-zinc-400 text-sm font-medium hover:bg-white/[0.03] transition-colors"
          >
            Seguir editando
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3.5 bg-[#D4FF00] text-[#09090B] font-bold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#D4FF00]/20 hover:brightness-110 active:scale-[0.98] transition-all"
          >
            <Check size={16} /> Guardar rutina
          </button>
        </div>
      </div>

      <style>{`
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