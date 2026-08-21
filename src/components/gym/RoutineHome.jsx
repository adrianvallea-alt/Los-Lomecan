import React from 'react';
import { Calendar, Plus, Play, Dumbbell, CalendarDays } from 'lucide-react';

export default function RoutineHome({ 
  currentRoutine, 
  onStartWorkout, 
  onManageTemplates,
}) {
  // Si hay una rutina activa
  if (currentRoutine) {
    return (
      <div className="flex flex-col h-full animate-fade-in safe-top safe-bottom bg-[#09090B]">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Mi rutina en curso
            <span className="inline-block w-2 h-2 rounded-full bg-[#D4FF00] shadow-[0_0_8px_rgba(212,255,0,0.7)]" />
          </h2>
        </div>
        
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-safe space-y-4">
          {/* Tarjeta de la rutina activa */}
          <div className="group relative bg-gradient-to-br from-[#D4FF00]/10 via-white/[0.03] to-transparent border border-[#D4FF00]/25 rounded-3xl p-5 transition-all duration-300 hover:border-[#D4FF00]/50 hover:shadow-[0_0_25px_rgba(212,255,0,0.2)]">
            {/* Brillo sutil en la esquina */}
            <div className="absolute -top-1 -left-1 w-6 h-6 bg-[#D4FF00]/20 rounded-full blur-md pointer-events-none" />
            
            <div className="flex items-center justify-between gap-4">
              {/* Columna izquierda: nombre e info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-[#D4FF00]/15 border border-[#D4FF00]/30 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(212,255,0,0.3)]">
                    <Dumbbell size={16} className="text-[#D4FF00]" />
                  </div>
                  <h3 className="text-white font-semibold text-base truncate">{currentRoutine.name}</h3>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                    <CalendarDays size={12} className="text-[#D4FF00]" />
                    Activa
                  </span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-[11px] text-zinc-400">
                    {currentRoutine.trainingDays?.length || 0} días
                  </span>
                </div>
              </div>

              {/* Botón de iniciar */}
              <button
                onClick={() => onStartWorkout(currentRoutine)}
                className="flex-shrink-0 px-6 py-3.5 min-w-[120px] bg-[#D4FF00] text-[#09090B] font-bold rounded-2xl text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-[#D4FF00]/25 hover:bg-[#C4E600] hover:shadow-[0_0_25px_rgba(212,255,0,0.5)]"
              >
                <Play size={16} fill="currentColor" />
                Iniciar
              </button>
            </div>
          </div>

          {/* Botón para ir al gestor de plantillas */}
          <button
            onClick={onManageTemplates}
            className="w-full py-4 border border-dashed border-white/[0.12] rounded-2xl text-sm text-zinc-400 hover:border-[#D4FF00]/40 hover:text-[#D4FF00] hover:bg-[#D4FF00]/[0.04] transition-all flex items-center justify-center gap-2 font-medium"
          >
            <Plus size={16} />
            Gestionar mis rutinas y plantillas
          </button>
        </div>
      </div>
    );
  }

  // Si no hay rutina activa
  return (
    <div className="flex flex-col h-full animate-fade-in safe-top safe-bottom bg-[#09090B]">
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-safe">
        <div className="flex flex-col items-center justify-center min-h-full py-12">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#D4FF00]/20 to-transparent border border-[#D4FF00]/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(212,255,0,0.2)]">
            <Calendar size={44} className="text-[#D4FF00]" />
          </div>
          <p className="text-zinc-300 text-base font-medium mb-1">No tienes rutina activa</p>
          <p className="text-xs text-zinc-500 mb-8 max-w-[220px] text-center leading-relaxed">
            Selecciona una plantilla existente para empezar a entrenar.
          </p>
          <button
            onClick={onManageTemplates}
            className="px-8 py-3.5 bg-[#D4FF00] text-[#09090B] font-bold rounded-2xl text-sm active:scale-95 transition-all shadow-lg shadow-[#D4FF00]/25 flex items-center gap-2 hover:bg-[#C4E600] hover:shadow-[0_0_25px_rgba(212,255,0,0.5)]"
          >
            <Plus size={18} />
            Configurar mi rutina
          </button>
        </div>
      </div>
    </div>
  );
}