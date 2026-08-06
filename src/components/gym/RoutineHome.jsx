import React from 'react';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { MONTHS } from '../../utils/gymHelpers';

export default function RoutineHome({ 
  currentRoutine, 
  onStartWorkout, 
  onManageTemplates,
  onDeleteRoutine
}) {
  // Si hay una rutina activa para este mes
  if (currentRoutine) {
    return (
      <div className="flex flex-col h-full animate-fade-in safe-top safe-bottom bg-[#09090B]">
        <div className="px-5 pt-5 pb-2">
          <h2 className="text-xl font-bold text-white tracking-tight">Mi rutina en curso</h2>
        </div>
        
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-safe space-y-4">
          
          {/* ✅ NUEVO DISEÑO DE TARJETA */}
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 hover:border-white/[0.08] transition-all">
            
            {/* Información del lado izquierdo */}
            <div className="flex-1 min-w-0 text-left">
              <h3 className="text-white font-semibold text-base truncate">{currentRoutine.name}</h3>
              <p className="text-xs text-zinc-500 mt-1">
                {MONTHS[currentRoutine.month - 1]} {currentRoutine.year} · {currentRoutine.trainingDays?.length || 0} días
              </p>
            </div>

            {/* Botones de acción del lado derecho */}
            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
              <button
                onClick={() => onStartWorkout(currentRoutine)}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-[#D4FF00] text-[#09090B] font-bold rounded-xl text-sm active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                Iniciar
              </button>
              <button
                onClick={() => onDeleteRoutine(currentRoutine.id)}
                className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-red-400 hover:border-red-400/20 active:scale-90 transition-all"
                title="Eliminar rutina en curso"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          {/* ✅ FIN DEL NUEVO DISEÑO */}

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

  // Si no hay rutina activa, mostramos pantalla vacía
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