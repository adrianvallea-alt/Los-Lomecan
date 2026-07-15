import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Dumbbell, Clock, BarChart2 } from 'lucide-react';
import { MONTHS } from '../../utils/gymHelpers';

export default function HistoryView({ activeProfile, onBack }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterExercise, setFilterExercise] = useState('');

  useEffect(() => {
    const all = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`workoutHistory_${activeProfile.id}_`)) {
        try {
          const sessions = JSON.parse(localStorage.getItem(key));
          if (Array.isArray(sessions)) sessions.forEach(s => all.push(s));
        } catch (e) {}
      }
    }
    all.sort((a, b) => new Date(b.date) - new Date(a.date));
    setHistory(all);
    setLoading(false);
  }, [activeProfile.id]);

  const formatDateTime = (dateStr) => {
    const d = new Date(dateStr);
    return {
      date: `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const filtered = filterExercise
    ? history.filter(s => s.exercises.some(ex => ex.name.toLowerCase().includes(filterExercise.toLowerCase())))
    : history;

  const last7Days = history.slice(0, 7).reverse();
  const volumes = last7Days.map(s =>
    s.exercises.reduce((sum, ex) =>
      sum + ex.sets.reduce((s, set) => s + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0), 0)
  );
  const maxVolume = Math.max(...volumes, 1);

  return (
    <div className="flex flex-col h-full min-h-0 animate-fade-in safe-top safe-bottom bg-[#09090B]">
      {/* Header */}
      <div className="flex items-center px-5 pt-5 pb-3">
        <button
          onClick={onBack}
          className="p-2.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white active:scale-95 transition-all mr-3"
          aria-label="Volver"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold text-white tracking-tight">Historial</h2>
      </div>

      {/* Filtro */}
      <div className="px-5 mb-4">
        <input
          value={filterExercise}
          onChange={(e) => setFilterExercise(e.target.value)}
          placeholder="Filtrar por ejercicio..."
          className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-[#D4FF00]/40 outline-none transition-colors"
        />
      </div>

      {/* Gráfico de volumen */}
      {history.length > 0 && (
        <div className="px-5 mb-4">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 size={15} className="text-[#D4FF00]" />
              <span className="text-xs font-medium text-zinc-400">Volumen (kg) últimos 7 días</span>
            </div>
            {volumes.some(v => v > 0) ? (
              <div className="flex items-end gap-1.5 h-20">
                {last7Days.map((s, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-[#D4FF00]/20 rounded-t-md transition-all duration-500"
                      style={{ height: `${(volumes[i] / maxVolume) * 100}%` }}
                    />
                    <span className="text-[10px] text-zinc-500 font-medium">
                      {new Date(s.date).getDate()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 text-center py-2">No hay registros de peso</p>
            )}
          </div>
        </div>
      )}

      {/* Lista de sesiones */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-safe">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-zinc-500 text-sm">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Calendar size={48} className="text-zinc-700 mb-4" />
            <p className="text-zinc-500 text-sm">
              {filterExercise ? 'Sin resultados' : 'No hay sesiones registradas'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((session, idx) => {
              const { date, time } = formatDateTime(session.date);
              return (
                <div
                  key={idx}
                  className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 transition-all hover:border-white/[0.08] animate-fade-in-up"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  {/* Cabecera de sesión */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-white font-semibold text-sm">{date}</p>
                      <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
                        <Clock size={11} />
                        {time}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#D4FF00] font-medium">Día {session.dayIndex + 1}</p>
                      <p className="text-[10px] text-zinc-500">{session.exercises.length} ejercicios</p>
                    </div>
                  </div>

                  {/* Ejercicios */}
                  <div className="space-y-2">
                    {session.exercises.map((ex, eIdx) => (
                      <div
                        key={eIdx}
                        className="bg-white/[0.03] border border-white/[0.04] rounded-xl p-3"
                      >
                        <p className="text-xs font-medium text-white mb-2 flex items-center gap-1.5">
                          <Dumbbell size={12} className="text-zinc-500" />
                          {ex.name}
                        </p>
                        <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                          {ex.sets.map((set, sIdx) => (
                            <div key={sIdx} className="text-center bg-white/[0.02] rounded-lg py-1.5">
                              <span className="text-[#D4FF00] font-bold">{set.weight}</span>
                              <span className="text-zinc-400"> × </span>
                              <span className="text-zinc-300 font-medium">{set.reps}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
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