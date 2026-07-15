import React, { useState, useEffect } from 'react';
import { X, Search, Film } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

export default function LibrarySelector({ onSelect, onClose }) {
  // Lógica sin cambios
  const [exercises, setExercises] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error: queryError } = await supabase
          .from('exercises')
          .select('*')
          .order('name');
        if (queryError) throw queryError;
        setExercises(data || []);
      } catch (err) {
        console.error('Error cargando ejercicios:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = exercises.filter(
    ex =>
      ex.name.toLowerCase().includes(search.toLowerCase()) ||
      ex.muscle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#09090B]/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#0A0A0C] border border-white/[0.08] rounded-[2.5rem] p-6 flex flex-col max-h-[80vh] shadow-2xl shadow-black/40 safe-top safe-bottom animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-white tracking-tight">Biblioteca</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white active:scale-95 transition-all"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Búsqueda */}
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3.5 top-3 text-zinc-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar ejercicio"
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-[#D4FF00]/40 outline-none transition-colors"
            aria-label="Buscar ejercicio"
          />
        </div>

        {/* Lista de ejercicios */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {loading && (
            <p className="text-center text-zinc-500 text-sm py-6">Cargando...</p>
          )}
          {error && (
            <p className="text-center text-red-400 text-sm py-6">Error: {error}</p>
          )}
          {!loading && !error && filtered.length === 0 && (
            <p className="text-center text-zinc-500 text-sm py-6">
              {search ? 'Sin resultados' : 'No hay ejercicios en la biblioteca'}
            </p>
          )}
          {!loading &&
            !error &&
            filtered.map((ex, index) => (
              <button
                key={ex.id}
                onClick={() => onSelect(ex)}
                className="w-full text-left bg-white/[0.02] border border-white/[0.05] rounded-xl p-3.5 transition-all hover:border-[#D4FF00]/20 hover:bg-white/[0.04] active:scale-[0.98] flex items-center justify-between animate-fade-in-up"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-white font-medium text-sm truncate">{ex.name}</p>
                  <p className="text-xs text-[#D4FF00]/80 mt-0.5">
                    {ex.muscle}
                    {ex.secondary_muscles ? ` + ${ex.secondary_muscles}` : ''}
                  </p>
                  {ex.default_series > 0 && (
                    <p className="text-[10px] text-zinc-500 mt-1 font-medium">
                      {ex.default_series} series{ex.default_reps ? ` · ${ex.default_reps}` : ''}
                    </p>
                  )}
                </div>
                {ex.video_url && (
                  <Film size={16} className="text-[#D4FF00]/60 ml-2 flex-shrink-0" />
                )}
              </button>
            ))}
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
