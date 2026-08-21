import React from 'react';
import { Calendar, Plus, Play } from 'lucide-react';

export default function RoutineHome({ 
  currentRoutine, 
  onStartWorkout, 
  onManageTemplates,
}) {
  // Si hay una rutina activa
  if (currentRoutine) {
    return (
      <div className="flex flex-col h-full animate-fade-in safe-top safe-bottom bg-[#09090B]">
        <div className="px-5 pt-5 pb-2">
          <h2 className="text-xl font-bold text-white tracking-tight">Mi rutina en curso</h2>
        </div>
        
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-safe space-y-4">
          {/* Tarjeta de la rutina activa */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 transition-all hover:border-white/[0.08]">
            <div className="flex items-center justify-between gap-4">
              {/* Columna izquierda: nombre e info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-semibold text-base truncate">{currentRoutine.name}</h3>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Activa · {currentRoutine.trainingDays?.length || 0} días
                </p>
              </div>

              {/* Botón de iniciar más ancho */}
              <button
                onClick={() => onStartWorkout(currentRoutine)}
                className="flex-shrink-0 px-10 py-4 min-w-[120px] bg-[#D4FF00] text-[#09090B] font-bold rounded-xl text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-[#D4FF00]/20 hover:bg-[#C4E600]"
              >
                <Play size={16} />
                Iniciar
              </button>
            </div>
          </div>

          {/* Botón para ir al gestor de plantillas */}
          <button
            onClick={onManageTemplates}
            className="w-full py-4 border border-dashed border-white/[0.08] rounded-2xl text-sm text-zinc-400 hover:border-[#D4FF00]/30 hover:text-[#D4FF00] transition-colors flex items-center justify-center gap-2 font-medium"
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
          <div className="w-24 h-24 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-6">
            <Calendar size={44} className="text-zinc-700" />
          </div>
          <p className="text-zinc-400 text-sm font-medium mb-1">No tienes rutina activa</p>
          <p className="text-xs text-zinc-600 mb-8 max-w-[200px] text-center">
            Selecciona una plantilla existente para empezar a entrenar.
          </p>
          <button
            onClick={onManageTemplates}
            className="px-8 py-3.5 bg-[#D4FF00] text-[#09090B] font-bold rounded-2xl text-sm active:scale-95 transition-all shadow-lg shadow-[#D4FF00]/20 flex items-center gap-2"
          >
            <Plus size={18} />
            Configurar mi rutina
          </button>
        </div>
      </div>
    </div>
  );
}