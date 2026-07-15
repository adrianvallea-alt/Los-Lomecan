import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function DaySelector({ routine, onSelectDay, onBack }) {
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
          <p className="text-xs text-zinc-500 mt-0.5">
            {routine.trainingDays?.length || 0} días de entrenamiento
          </p>
        </div>
      </div>

      {/* Contenido central */}
      <div className="flex-1 flex flex-col items-center justify-center px-5">
        {routine.trainingDays?.length > 0 ? (
          <div className="w-full text-center">
            <div className="grid grid-cols-2 gap-3 mb-10 max-w-xs mx-auto">
              {routine.trainingDays.map((day, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectDay(routine, idx)}
                  className="py-6 px-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] text-white hover:border-[#D4FF00]/30 hover:bg-white/[0.04] active:scale-95 transition-all flex flex-col items-center gap-2 shadow-sm animate-fade-in-up"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <span className="text-[#D4FF00] text-xs font-semibold uppercase tracking-wider">
                    Día {idx + 1}
                  </span>
                  <span className="text-sm font-medium text-zinc-300">
                    {day.name || `${day.exercises.length} ejercicios`}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-600">
              Elegí el día que toca entrenar
            </p>
          </div>
        ) : (
          <div className="text-center text-zinc-500 text-sm">
            Esta rutina no tiene días configurados.
          </div>
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