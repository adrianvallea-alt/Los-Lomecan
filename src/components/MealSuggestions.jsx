// src/components/MealSuggestions.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Target } from 'lucide-react';
import { fetchFoods } from '../lib/dataService';

export default function MealSuggestions({ remainingMacros, goals, onAddFood }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSuggestions = async () => {
      setLoading(true);
      let foods = [];

      try {
        foods = await fetchFoods();
      } catch (err) {
        const cached = localStorage.getItem('foodsCache');
        if (cached) {
          try { foods = JSON.parse(cached); } catch (e) {}
        }
      }

      if (!isMounted) return;

      if (!foods || foods.length === 0) {
        setSuggestions([]);
        setLoading(false);
        setIsVisible(false);
        return;
      }

      const { cal, pro, carb, fat } = remainingMacros || {};
      const now = new Date();
      const currentHour = now.getHours();

      const almostComplete =
        (goals?.pro > 0 && pro / goals.pro < 0.25) ||
        (goals?.carb > 0 && carb / goals.carb < 0.25) ||
        (goals?.fat > 0 && fat / goals.fat < 0.25);

      const isEvening = currentHour >= 19;
      const shouldShow = (almostComplete || isEvening) && (cal > 0 || pro > 0 || carb > 0 || fat > 0);

      if (!shouldShow) {
        setSuggestions([]);
        setLoading(false);
        setIsVisible(false);
        return;
      }

      // Puntuación según los macros que faltan por cumplir
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

      setTimeout(() => {
        if (isMounted) setIsVisible(true);
      }, 100);
    };

    loadSuggestions();

    return () => {
      isMounted = false;
    };
  }, [remainingMacros?.cal, remainingMacros?.pro, remainingMacros?.carb, remainingMacros?.fat, goals?.pro, goals?.carb, goals?.fat]);

  if (loading || suggestions.length === 0) return null;

  return (
    <div className={`mb-4 relative z-10 shrink-0 transition-all duration-500 ease-out ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
    }`}>
      <div className="border border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl rounded-[2.2rem] p-5 shadow-lg">
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-[#D4FF00]" />
            <span className="text-xs font-black text-white uppercase tracking-wider">
              Sugerencias para completar tus macros
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">Personalizado</span>
        </div>

        <div className="space-y-2">
          {suggestions.map((food) => (
            <div
              key={food.id || food.barcode}
              className="flex items-center justify-between bg-white/[0.02] border border-white/[0.04] rounded-2xl p-3 hover:border-white/[0.08] transition-all"
            >
              <div className="text-left flex-1 min-w-0 mr-3">
                <p className="text-white text-xs font-bold truncate">
                  {food.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-zinc-400">
                  <span className="text-[#D4FF00] font-bold">{food.cal} kcal</span>
                  <span>·</span>
                  <span className="text-blue-400">P:{food.pro}g</span>
                  <span className="text-purple-400">C:{food.carb}g</span>
                  <span className="text-amber-400">G:{food.fat}g</span>
                </div>
              </div>

              <button
                onClick={() => onAddFood(food, 100)}
                className="shrink-0 px-3 py-2 bg-[#D4FF00] text-[#09090B] text-xs font-black rounded-xl flex items-center gap-1 active:scale-95 transition-all shadow-md hover:bg-[#e5ff1a]"
                aria-label={`Añadir 100g de ${food.name}`}
              >
                <Plus size={14} strokeWidth={3} />
                <span>100g</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}