import React from 'react'
import { Trash2, Play, FileText, Calendar, Clock } from 'lucide-react'

export default function RoutineCard({ routine, viewMode, onImport, onDelete, onStartWorkout }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-white/[0.05] transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-[#D4FF00]">
          <FileText size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-white font-semibold truncate">{routine.name}</h4>
            {viewMode === 'templates' && (
              <span className="text-[10px] font-medium bg-zinc-700/50 text-zinc-300 px-2 py-0.5 rounded-full border border-white/[0.05]">
                Plantilla
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-0.5">
            <span className="flex items-center gap-1">
              <Calendar size={12} /> 
              {viewMode === 'active' 
                ? `Mes ${routine.month} - ${routine.year}` 
                : 'Sin fecha asignada'}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} /> {routine.training_days?.length || 0} días
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        {viewMode === 'templates' ? (
          <button
            onClick={() => onImport(routine)}
            className="flex-1 sm:flex-none px-4 py-2 bg-[#D4FF00] text-[#09090B] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 hover:bg-[#C4E600] transition-colors"
          >
            <Play size={14} /> Importar y editar
          </button>
        ) : (
          // ✅ CORRECCIÓN AQUÍ: LLAMAMOS A onStartWorkout
          <button
            onClick={() => onStartWorkout(routine.id)}
            className="flex-1 sm:flex-none px-4 py-2 bg-white/[0.05] border border-white/[0.08] text-zinc-300 font-medium rounded-xl text-xs flex items-center justify-center gap-1.5 hover:text-white transition-colors"
          >
            <Play size={14} /> Iniciar
          </button>
        )}

        <button
          onClick={() => onDelete(routine.id)}
          className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-zinc-500 hover:text-red-400 hover:border-red-500/30 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}