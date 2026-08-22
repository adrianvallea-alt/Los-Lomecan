// src/components/Dashboard.jsx
import React, { useMemo, useState, useEffect, memo } from 'react';
import { 
  Play, Sun, Plus, Minus, Scale, Share2, Droplet, Waves, Sparkles, 
  Utensils, Trash2, Clock, ChevronDown, ChevronUp, Zap, Target, Flame 
} from 'lucide-react';
import useAchievements from '../hooks/useAchievements';
import MealSuggestions from './MealSuggestions';
import ShareAchievementModal from './ShareAchievementModal';

const triggerHaptic = (pattern = 25) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch (e) {}
  }
};

// ==========================================================================
// CÍRCULO DE AGUA DE PRECISIÓN (AQUA NEÓN)
// ==========================================================================
const WaterCircle = memo(({ percent }) => {
  const getMotivationalMessage = (p) => {
    if (p === 0) return { msg: 'INICIAR HIDRATACIÓN', color: '#71717A' };
    if (p <= 30) return { msg: 'BUEN RITMO 💧', color: '#00F5FF' };
    if (p <= 70) return { msg: 'MÁS DEL 50%', color: '#38BDF8' };
    if (p < 100) return { msg: 'CASI EN LA META', color: '#00FFA3' };
    return { msg: 'META COMPLETADA 🎯', color: '#D4FF00' };
  };

  const { msg, color } = getMotivationalMessage(percent);
  const radius = 56;
  const stroke = 7;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2.5 w-full">
      <div className="relative w-[130px] h-[130px] flex items-center justify-center">
        <svg height="130" width="130" className="-rotate-90">
          <circle
            stroke="rgba(255,255,255,0.04)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx="65"
            cy="65"
          />
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ 
              strokeDashoffset: offset, 
              transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
              filter: `drop-shadow(0 0 8px ${color})`
            }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx="65"
            cy="65"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <Droplet size={20} style={{ color }} className="mb-0.5" />
          <span className="text-2xl font-mono font-black text-white tabular-nums tracking-tighter">
            {Math.round(percent)}<span className="text-xs text-zinc-500 font-bold">%</span>
          </span>
        </div>
      </div>

      <span className="text-[9px] font-mono font-black tracking-[0.22em] text-zinc-300 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
        {msg}
      </span>
    </div>
  );
});

// ==========================================================================
// TRACKER DE AGUA
// ==========================================================================
const WaterTracker = memo(({ waterGoal, profileId }) => {
  const storageKey = `water_${profileId}_${new Date().toDateString()}`;
  const [waterCurrent, setWaterCurrent] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, waterCurrent.toString());
  }, [waterCurrent, storageKey]);

  const waterPercent = Math.min((waterCurrent / (waterGoal || 2000)) * 100, 100);

  const addWater = (ml) => {
    triggerHaptic(20);
    setWaterCurrent((prev) => Math.min(prev + ml, (waterGoal || 2000) * 2));
  };

  const removeWater = (ml) => {
    triggerHaptic(20);
    setWaterCurrent((prev) => Math.max(prev - ml, 0));
  };

  return (
    <div className="relative z-10 mb-4 shrink-0">
      <div className="luxury-card p-5 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-white flex items-center gap-2">
            <Waves size={15} className="text-[#00F5FF]" />
            Telemetría de Hidratación
          </span>
          <span className="text-[11px] font-mono font-bold text-zinc-300 bg-black/40 px-2.5 py-0.5 rounded-full border border-white/[0.08]">
            {waterCurrent} <span className="text-zinc-500">/ {waterGoal} ml</span>
          </span>
        </div>

        <WaterCircle percent={waterPercent} />

        {/* Atajos rápidos táctiles */}
        <div className="grid grid-cols-4 gap-2 mt-5">
          <button
            onClick={() => removeWater(250)}
            disabled={waterCurrent <= 0}
            className="py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-zinc-400 hover:text-red-400 text-xs font-mono font-bold active:scale-95 disabled:opacity-20 transition-all flex items-center justify-center"
            title="Restar 250ml"
          >
            -250
          </button>
          <button
            onClick={() => addWater(250)}
            className="py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-zinc-200 hover:text-[#00F5FF] hover:border-[#00F5FF]/40 text-xs font-mono font-bold active:scale-95 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          >
            +250ml
          </button>
          <button
            onClick={() => addWater(500)}
            className="py-2.5 rounded-xl bg-[#00F5FF]/10 border border-[#00F5FF]/30 text-[#00F5FF] text-xs font-mono font-bold active:scale-95 transition-all shadow-[0_0_15px_rgba(0,245,255,0.15)]"
          >
            +500ml
          </button>
          <button
            onClick={() => {
              triggerHaptic(50);
              setWaterCurrent(waterGoal || 2000);
            }}
            className="py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-zinc-300 text-[10px] font-mono font-extrabold uppercase tracking-wider active:scale-95 transition-all hover:text-white hover:border-[#D4FF00]/40"
          >
            Meta
          </button>
        </div>
      </div>
    </div>
  );
});

// ==========================================================================
// CÁPSULA DE MACRONUTRIENTES
// ==========================================================================
const MacroCapsule = memo(({ label, current, max, color, glowColor, unit = 'g' }) => {
  const percent = Math.min((current / (max || 1)) * 100, 100);
  const isOver = current > max && max > 0;

  return (
    <div className="w-full shrink-0">
      <div className="flex justify-between items-baseline mb-1.5 font-mono">
        <span className="text-[11px] font-extrabold tracking-wider text-zinc-300 uppercase">{label}</span>
        <span className="text-xs font-bold text-white tabular-nums">
          {current}
          <span className="text-zinc-500 font-medium text-[10px]">/{max}{unit}</span>
        </span>
      </div>
      <div className="w-full h-2.5 bg-black/50 border border-white/[0.06] rounded-full overflow-hidden p-[1px]">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${percent}%`,
            background: isOver ? '#FF2A55' : color,
            boxShadow: `0 0 12px ${isOver ? '#FF2A55' : glowColor}`,
          }}
        />
      </div>
    </div>
  );
});

// ==========================================================================
// ANILLO DE CALORÍAS DE TELEMETRÍA (CON CENTRO OLED)
// ==========================================================================
const CalorieRing = memo(({ current, max }) => {
  const isOver = current > max && max > 0;
  const remaining = max - current;
  const percent = Math.min((current / (max || 1)) * 100, 100);

  const radius = 70;
  const stroke = 9;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  const strokeColor = isOver ? '#FF2A55' : '#D4FF00';
  const glowShadow = isOver ? 'rgba(255, 42, 85, 0.45)' : 'rgba(212, 255, 0, 0.4)';

  return (
    <div className="relative flex flex-col items-center justify-center py-2 w-full shrink-0">
      <div className="relative w-[155px] h-[155px] flex items-center justify-center">
        
        {/* Dial de fondo con ticks */}
        <svg height="155" width="155" className="-rotate-90 absolute">
          <circle
            stroke="rgba(255,255,255,0.035)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx="77.5"
            cy="77.5"
          />
          <circle
            stroke={strokeColor}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{
              strokeDashoffset,
              transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)',
              filter: `drop-shadow(0 0 10px ${glowShadow})`
            }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx="77.5"
            cy="77.5"
          />
        </svg>

        {/* Métricas centrales de precisión */}
        <div className="absolute flex flex-col items-center justify-center text-center px-2">
          {isOver ? (
            <>
              <span className="text-2xl font-mono font-black text-rose-400 tracking-tighter tabular-nums leading-tight">
                +{Math.abs(remaining)}
              </span>
              <span className="text-[9px] font-mono tracking-[0.25em] text-rose-300 uppercase font-black mt-0.5">
                SUPERÁVIT
              </span>
            </>
          ) : (
            <>
              <span className="text-3xl font-mono font-black text-white tracking-tighter tabular-nums leading-tight">
                {remaining}
              </span>
              <span className="text-[9px] font-mono tracking-[0.25em] text-zinc-400 uppercase font-bold mt-0.5">
                KCAL RESTANTES
              </span>
            </>
          )}
        </div>
      </div>

      {/* Barra de progreso numérica */}
      <div className="flex items-center gap-4 mt-3 text-[11px] font-mono text-zinc-400 bg-black/40 px-3.5 py-1 rounded-full border border-white/[0.06]">
        <span>Ingesta: <strong className="text-white font-black">{current}</strong></span>
        <span className="text-zinc-600">/</span>
        <span>Meta: <strong className="text-[#D4FF00] font-black">{max}</strong></span>
      </div>
    </div>
  );
});

// ==========================================================================
// REGISTRO DE COMIDAS DEL DÍA (OBSIDIAN GLASS)
// ==========================================================================
const TodayFoodLog = memo(({ items, onDeleteFood }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative z-10 mb-4 shrink-0">
      <div className="luxury-card p-5">
        
        {/* Cabecera del registro */}
        <div 
          onClick={() => {
            triggerHaptic(15);
            setIsExpanded(!isExpanded);
          }}
          className="flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-2">
            <Utensils size={15} className="text-[#D4FF00]" />
            <h3 className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-white">
              Registro de Comidas
            </h3>
            <span className="text-[10px] font-mono font-bold bg-[#D4FF00]/10 text-[#D4FF00] px-2 py-0.5 rounded-full border border-[#D4FF00]/30 shadow-[0_0_10px_rgba(212,255,0,0.15)]">
              {items.length}
            </span>
          </div>

          <button className="p-1 text-zinc-400 hover:text-white transition-colors">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Lista de comidas */}
        {isExpanded && (
          <div className="mt-4 space-y-2 animate-fade-in">
            {items.length === 0 ? (
              <p className="text-center text-xs font-mono text-zinc-500 py-3">
                Sin registros de alimentos hoy.
              </p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#050507]/60 border border-white/[0.05] rounded-2xl p-3 flex items-center justify-between gap-3 hover:border-white/[0.1] transition-all shadow-inner-light"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white truncate">{item.foodName}</p>
                      <span className="text-[9px] text-zinc-500 font-mono flex items-center gap-0.5">
                        <Clock size={9} /> {formatTime(item.timestamp)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-zinc-400">
                      <span className="text-[#D4FF00] font-black">{item.grams}g</span>
                      <span>·</span>
                      <span className="text-white font-bold">{item.macros?.cal || 0} kcal</span>
                      <span>·</span>
                      <span className="text-[#00F5FF]">P:{item.macros?.pro || 0}g</span>
                      <span className="text-[#B347FF]">C:{item.macros?.carb || 0}g</span>
                      <span className="text-[#FFB800]">G:{item.macros?.fat || 0}g</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      triggerHaptic(30);
                      onDeleteFood(item.id);
                    }}
                    className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all shrink-0"
                    title="Eliminar alimento"
                    aria-label="Eliminar alimento registrado"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
});

// ==========================================================================
// DASHBOARD PRINCIPAL DE ULTRA-LUJO
// ==========================================================================
export default function Dashboard({
  profile,
  dailyIntake,
  currentRoutine,
  onStartWorkout,
  onGoToRoutines,
  onGoToEvolution,
  onAddFood,
  onDeleteFood,
}) {
  const goals = profile?.goals || { cal: 2500, pro: 160, carb: 260, fat: 70 };

  const todayItems = useMemo(() => {
    const today = new Date().toDateString();
    return (dailyIntake || []).filter(
      (entry) => new Date(entry.timestamp).toDateString() === today
    );
  }, [dailyIntake]);

  const todayTotals = useMemo(() => {
    return todayItems.reduce(
      (acc, item) => {
        acc.cal += item.macros?.cal || 0;
        acc.pro += item.macros?.pro || 0;
        acc.carb += item.macros?.carb || 0;
        acc.fat += item.macros?.fat || 0;
        return acc;
      },
      { cal: 0, pro: 0, carb: 0, fat: 0 }
    );
  }, [todayItems]);

  const todayData = {
    cal: { current: Math.round(todayTotals.cal), max: goals.cal },
    pro: { current: Math.round(todayTotals.pro), max: goals.pro },
    carb: { current: Math.round(todayTotals.carb), max: goals.carb },
    fat: { current: Math.round(todayTotals.fat), max: goals.fat },
  };

  const { currentStreak, unlockedAchievements, longestStreak } = useAchievements(profile?.id);
  const [showShareModal, setShowShareModal] = useState(false);

  const remainingMacros = {
    cal: Math.max(goals.cal - todayTotals.cal, 0),
    pro: Math.max(goals.pro - todayTotals.pro, 0),
    carb: Math.max(goals.carb - todayTotals.carb, 0),
    fat: Math.max(goals.fat - todayTotals.fat, 0),
  };

  return (
    /* Espacio superior pt-2 y espacio inferior pb-44 para que el scroll suba holgadamente */
    <div className="flex flex-col px-5 pt-2 pb-44 text-white bg-transparent select-none relative no-scrollbar">
      
      {/* Header de rendimiento diario */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-[#D4FF00]/10 border border-[#D4FF00]/25 text-[#D4FF00] shadow-[0_0_12px_rgba(212,255,0,0.2)]">
            <Sun size={15} />
          </div>
          <h2 className="text-base font-black tracking-tight text-white font-sans">Panel de Hoy</h2>
          
          <div className="luxury-badge flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4FF00] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4FF00]" />
            </span>
            {currentStreak} DÍAS
          </div>
        </div>

        <button
          onClick={() => {
            triggerHaptic(20);
            setShowShareModal(true);
          }}
          className="p-2 rounded-full bg-white/[0.03] border border-white/[0.08] text-zinc-300 hover:text-white active:scale-95 transition-all shadow-inner-light"
          aria-label="Compartir logros"
        >
          <Share2 size={14} className="text-[#D4FF00]" />
        </button>
      </div>

      {/* Tarjeta principal de calorías (Obsidian Telemetry) */}
      <div className="relative z-10 mb-4 shrink-0">
        <div className="luxury-card p-6 flex flex-col items-center">
          <CalorieRing current={todayData.cal.current} max={todayData.cal.max} />
        </div>
      </div>

      {/* Tarjeta de macronutrientes (Cápsulas Neón) */}
      <div className="relative z-10 mb-4 shrink-0">
        <div className="luxury-card p-5 flex flex-col gap-4">
          <MacroCapsule 
            label="Proteína" 
            current={todayData.pro.current} 
            max={todayData.pro.max} 
            color="linear-gradient(90deg, #00C6FF 0%, #0072FF 100%)" 
            glowColor="rgba(0, 198, 255, 0.4)" 
          />
          <MacroCapsule 
            label="Carbohidratos" 
            current={todayData.carb.current} 
            max={todayData.carb.max} 
            color="linear-gradient(90deg, #D946EF 0%, #8B5CF6 100%)" 
            glowColor="rgba(217, 70, 239, 0.4)" 
          />
          <MacroCapsule 
            label="Grasas Saludables" 
            current={todayData.fat.current} 
            max={todayData.fat.max} 
            color="linear-gradient(90deg, #FBBF24 0%, #F59E0B 100%)" 
            glowColor="rgba(251, 191, 36, 0.4)" 
          />
        </div>
      </div>

      {/* Sugerencias de comidas de precisión */}
      <div className="mb-4 shrink-0">
        <MealSuggestions remainingMacros={remainingMacros} goals={goals} onAddFood={onAddFood} />
      </div>

      {/* Registro de comidas del día */}
      <TodayFoodLog items={todayItems} onDeleteFood={onDeleteFood} />

      {/* Tracker de Agua */}
      <WaterTracker waterGoal={profile?.water_goal || 2000} profileId={profile?.id} />

      {/* Botones de acción principales de alto impacto */}
      <div className="flex flex-col gap-3 pt-2 shrink-0">
        <button
          onClick={onGoToEvolution}
          className="w-full py-3.5 bg-white/[0.025] border border-white/[0.08] rounded-2xl text-xs font-mono font-extrabold uppercase tracking-widest text-zinc-300 hover:text-white hover:border-[#D4FF00]/40 flex items-center justify-center gap-2 active:scale-95 transition-all shadow-inner-light"
        >
          <Scale size={15} className="text-[#D4FF00]" />
          Registrar Peso y Métricas
        </button>

        <button
          onClick={onStartWorkout}
          className="w-full py-4 volt-button flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <Play size={16} fill="currentColor" />
          {currentRoutine ? `ENTRENAR: ${currentRoutine.name}` : 'INICIAR RUTINA DEL DÍA'}
        </button>
      </div>

      {showShareModal && (
        <ShareAchievementModal
          profile={profile}
          achievements={unlockedAchievements}
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}