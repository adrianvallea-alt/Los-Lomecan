import React, { useState, useEffect } from 'react';
import { Plus, Sparkles, Target } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function MealSuggestions({ remainingMacros, goals, onAddFood }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      setLoading(true);
      const { data: foods } = await supabase.from('foods').select('*').limit(200);
      if (!foods || foods.length === 0) {
        setSuggestions([]);
        setLoading(false);
        setIsVisible(false);
        return;
      }

      const { cal, pro, carb, fat } = remainingMacros;
      const now = new Date();
      const currentHour = now.getHours();

      const almostComplete =
        (goals.pro > 0 && pro / goals.pro < 0.2) ||
        (goals.carb > 0 && carb / goals.carb < 0.2) ||
        (goals.fat > 0 && fat / goals.fat < 0.2);

      const isEvening = currentHour >= 20;
      const shouldShow = (almostComplete || isEvening) && (cal > 0 || pro > 0 || carb > 0 || fat > 0);

      if (!shouldShow) {
        setSuggestions([]);
        setLoading(false);
        setIsVisible(false);
        return;
      }

      const scored = foods.map(food => {
        const fCal = food.cal || 0;
        const fPro = food.pro || 0;
        const fCarb = food.carb || 0;
        const fFat = food.fat || 0;
        let score = 0;
        if (cal > 0) score += Math.min(fCal / cal, 1) * 25;
        if (pro > 0) score += Math.min(fPro / pro, 1) * 35;
        if (carb > 0) score += Math.min(fCarb / carb, 1) * 20;
        if (fat > 0) score += Math.min(fFat / fat, 1) * 20;
        return { ...food, score };
      });

      scored.sort((a, b) => b.score - a.score);
      setSuggestions(scored.slice(0, 3));
      setLoading(false);
      
      // Animación de entrada escalonada
      setTimeout(() => setIsVisible(true), 100);
    };

    fetchSuggestions();
  }, [remainingMacros, goals]);

  if (loading) {
    return (
      <div className="mb-5 relative z-10 shrink-0">
        <div className="border border-white/[0.05] bg-white/[0.02] backdrop-blur-xl rounded-[2rem] p-5 animate-pulse">
          <div className="h-3 w-28 bg-white/[0.04] rounded-full mx-auto mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between bg-white/[0.02] rounded-xl p-3.5">
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-24 bg-white/[0.04] rounded-lg" />
                  <div className="h-3 w-36 bg-white/[0.03] rounded-lg" />
                </div>
                <div className="h-9 w-20 bg-white/[0.04] rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className={`mb-5 relative z-10 shrink-0 transition-all duration-700 ease-out-expo ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
    }`}>
      <div className="border border-white/[0.05] bg-white/[0.02] backdrop-blur-xl rounded-[2rem] p-5">
        
        {/* Cabecera con microcopy inteligente */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <div className="w-6 h-6 rounded-full bg-[#D4FF00]/10 border border-[#D4FF00]/20 flex items-center justify-center">
            <Target size={11} className="text-[#D4FF00]" />
          </div>
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Completa tus macros
          </span>
        </div>

        {/* Lista de sugerencias */}
        <div className="space-y-2">
          {suggestions.map((food, index) => (
            <div
              key={food.id}
              className="flex items-center justify-between bg-white/[0.03] border border-white/[0.04] rounded-2xl p-3.5 transition-all duration-300 hover:border-white/[0.08] hover:bg-white/[0.04]"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
                transitionDelay: `${index * 80}ms`,
                transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {/* Info del alimento */}
              <div className="text-left flex-1 min-w-0 mr-3">
                <p className="text-white text-sm font-semibold tracking-tight truncate">
                  {food.name}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-zinc-500 font-medium">
                    {food.cal} kcal
                  </span>
                  <div className="flex gap-2 text-[10px]">
                    <span className="text-blue-400/80 font-medium">P:{food.pro}</span>
                    <span className="text-violet-400/80 font-medium">C:{food.carb}</span>
                    <span className="text-amber-400/80 font-medium">G:{food.fat}</span>
                  </div>
                </div>
              </div>

              {/* Botón de añadir con área táctil generosa */}
              <button
                onClick={() => onAddFood(food, 100)}
                className="flex-shrink-0 h-11 px-4 bg-[#D4FF00] text-[#09090B] text-xs font-bold rounded-xl flex items-center gap-1.5 active:scale-95 transition-all shadow-lg shadow-[#D4FF00]/10 hover:bg-[#e5ff1a]"
                aria-label={`Añadir 100g de ${food.name}`}
              >
                <Plus size={14} strokeWidth={2.5} />
                <span className="tracking-wide">100g</span>
              </button>
            </div>
          ))}
        </div>

        {/* Sutil indicador de que son sugerencias personalizadas */}
        <p className="text-[9px] text-zinc-600 text-center mt-4 tracking-wide">
          Basado en lo que te falta hoy
        </p>
      </div>

      <style>{`
        .ease-out-expo {
          transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}