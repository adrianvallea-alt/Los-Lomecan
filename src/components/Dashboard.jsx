import React, { useMemo, useState, useEffect, memo } from 'react';
import { Play, Sun, Plus, Minus, Scale, Share2, Droplet, Flame, Waves, Zap } from 'lucide-react';
import useAchievements from '../hooks/useAchievements';
import MealSuggestions from './MealSuggestions';
import ShareAchievementModal from './ShareAchievementModal';

// ==========================================================================
// CÍRCULO DE AGUA (nuevo diseño más amplio)
// ==========================================================================
const WaterCircle = memo(({ percent }) => {
  const getMotivationalMessage = (p) => {
    if (p === 0) return { msg: 'Empieza a beber', color: '#a1a1aa' };
    if (p <= 20) return { msg: 'Buen comienzo', color: '#60a5fa' };
    if (p <= 60) return { msg: 'Más de la mitad', color: '#3b82f6' };
    if (p <= 99) return { msg: 'Casi al 100%', color: '#059669' };
    return { msg: '¡Hidratación completa!', color: '#d4ff00' };
  };

  const { msg, color } = getMotivationalMessage(percent);
  const radius = 60, stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="relative w-[140px] h-[140px] flex items-center justify-center">
        <svg height="140" width="140" className="transform -rotate-90">
          <defs>
            <linearGradient id="waterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.95" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.75" />
            </linearGradient>
          </defs>
          <circle
            stroke="rgba(255,255,255,0.05)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx="70"
            cy="70"
          />
          <circle
            stroke="url(#waterGradient)"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            r={normalizedRadius}
            cx="70"
            cy="70"
            filter="drop-shadow(0 0 12px currentColor)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <Droplet size={26} style={{ color }} className="mb-1" />
          <span className="text-2xl font-bold tracking-tight text-white tabular-nums">
            {Math.round(percent)}%
          </span>
        </div>
      </div>
      <div className="h-8 flex items-center">
        <span className="text-[11px] font-medium text-stone-300 tracking-wide px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] shadow-[0_0_10px_rgba(255,255,255,0.05)]">
          {msg}
        </span>
      </div>
    </div>
  );
});

// ==========================================================================
// TRACKER DE AGUA (estilo más premium)
// ==========================================================================
const WaterTracker = memo(({ waterGoal, profileId }) => {
  const storageKey = `water_${profileId}_${new Date().toDateString()}`;
  const [waterCurrent, setWaterCurrent] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [manualInput, setManualInput] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem(storageKey, waterCurrent);
    }, 0);
    return () => clearTimeout(timeout);
  }, [waterCurrent, storageKey]);

  const waterPercent = Math.min((waterCurrent / waterGoal) * 100, 100);
  const addWater = (ml) => setWaterCurrent((prev) => Math.min(prev + ml, waterGoal * 1.5));
  const removeWater = (ml) => setWaterCurrent((prev) => Math.max(prev - ml, 0));

  const handleManualChange = (e) => {
    const value = e.target.value;
    setManualInput(value);
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0) setWaterCurrent(num);
    else if (value === '') setWaterCurrent(0);
  };

  return (
    <div className="relative z-10 mb-5 shrink-0">
      <div className="border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent backdrop-blur-xl rounded-[2.5rem] p-6 flex flex-col shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
        <div className="flex justify-between items-center mb-5">
          <span className="text-sm font-bold text-white flex items-center gap-2">
            <Waves size={18} className="text-[#D4FF00]" />
            Hidratación
          </span>
          <span className="text-xs font-semibold text-stone-300 tabular-nums bg-stone-900/80 px-3 py-1 rounded-full border border-white/[0.08]">
            {waterCurrent} / {waterGoal} ml
          </span>
        </div>
        <WaterCircle percent={waterPercent} />
        <div className="flex items-center justify-between w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl p-2.5 mt-6">
          <button
            onClick={() => removeWater(250)}
            disabled={waterCurrent <= 0}
            className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.1] hover:border-red-400/40 active:scale-95 flex items-center justify-center text-stone-300 disabled:opacity-20 transition-all"
          >
            <Minus size={16} />
          </button>
          <div className="flex flex-col items-center justify-center">
            <input
              type="number"
              value={manualInput}
              onChange={handleManualChange}
              placeholder={waterCurrent.toString()}
              className="w-20 bg-transparent text-center text-2xl font-bold text-white focus:placeholder-transparent outline-none tabular-nums"
              min="0"
              inputMode="numeric"
            />
            <span className="text-[9px] text-stone-500 uppercase tracking-widest font-medium">ml</span>
          </div>
          <button
            onClick={() => addWater(250)}
            className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.1] hover:border-[#D4FF00]/50 hover:shadow-[0_0_12px_rgba(212,255,0,0.3)] active:scale-95 flex items-center justify-center text-stone-300 transition-all"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="flex justify-between items-center w-full mt-4 text-xs">
          <button
            onClick={() => setWaterCurrent(waterGoal)}
            className="text-[#D4FF00] font-bold hover:text-white transition-colors uppercase tracking-wide"
          >
            Completar día
          </button>
          <span className="text-stone-400 tabular-nums">
            ~{Math.round((waterCurrent / 250) * 10) / 10} vasos
          </span>
        </div>
      </div>
    </div>
  );
});

// ==========================================================================
// MACROBAR (nuevo estilo con más brillo)
// ==========================================================================
const MacroBar = memo(({ label, current, max, color, unit = 'g' }) => {
  const percent = Math.min((current / max) * 100, 100);
  return (
    <div className="w-full shrink-0">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-xs font-semibold text-stone-300">{label}</span>
        <span className="text-xs font-bold text-white tabular-nums">
          {current}
          <span className="text-stone-500 font-medium text-[10px]">/{max}{unit}</span>
        </span>
      </div>
      <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${percent}%`,
            backgroundColor: color,
            boxShadow: `0 0 12px ${color}`,
          }}
        />
      </div>
    </div>
  );
});

// ==========================================================================
// ANILLO DE CALORÍAS (más grande y con gradiente)
// ==========================================================================
const CalorieRing = memo(({ current, max }) => {
  const remaining = max - current;
  const percent = Math.min((current / max) * 100, 100);
  const radius = 72, stroke = 9;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percent / 100) * circumference;
  const isOverGoal = percent > 100;
  const strokeColor = isOverGoal ? '#ef4444' : '#d4ff00';

  return (
    <div className="relative flex flex-col items-center justify-center py-4 w-full shrink-0">
      <div className="relative w-[160px] h-[160px] flex items-center justify-center">
        <svg height="160" width="160" className="-rotate-90 absolute">
          <defs>
            <linearGradient id="calorieGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.95" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.7" />
            </linearGradient>
          </defs>
          <circle
            stroke="rgba(255,255,255,0.05)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx="80"
            cy="80"
          />
          <circle
            stroke="url(#calorieGradient)"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx="80"
            cy="80"
            filter="drop-shadow(0 0 15px currentColor)"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-black text-white tracking-tight leading-none tabular-nums">
            {remaining}
          </span>
          <span className="text-[10px] text-stone-400 uppercase tracking-[0.2em] mt-1 font-bold">
            kcal restantes
          </span>
        </div>
      </div>
    </div>
  );
});

// ==========================================================================
// DASHBOARD PRINCIPAL (completamente renovado)
// ==========================================================================
export default function Dashboard({
  profile,
  dailyIntake,
  currentRoutine,
  onStartWorkout,
  onGoToRoutines,
  onGoToEvolution,
  onAddFood
}) {
  const goals = profile?.goals || { cal: 2800, pro: 180, carb: 300, fat: 75 };

  const todayTotals = useMemo(() => {
    const today = new Date().toDateString();
    const todayItems = dailyIntake.filter(
      (entry) => new Date(entry.timestamp).toDateString() === today
    );
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
  }, [dailyIntake]);

  const todayData = {
    cal: { current: Math.round(todayTotals.cal), max: goals.cal },
    pro: { current: Math.round(todayTotals.pro), max: goals.pro },
    carb: { current: Math.round(todayTotals.carb), max: goals.carb },
    fat: { current: Math.round(todayTotals.fat), max: goals.fat }
  };

  const { currentStreak, unlockedAchievements, longestStreak } = useAchievements(profile?.id);
  const [showShareModal, setShowShareModal] = useState(false);

  const remainingMacros = {
    cal: Math.max(goals.cal - todayTotals.cal, 0),
    pro: Math.max(goals.pro - todayTotals.pro, 0),
    carb: Math.max(goals.carb - todayTotals.carb, 0),
    fat: Math.max(goals.fat - todayTotals.fat, 0)
  };

  return (
    <div className="flex flex-col px-5 pt-2 pb-[140px] text-white bg-[#09090B] select-none relative">
      {/* Fondo con más brillo */}
      <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(circle_at_50%_0%,#D4FF0015,transparent_70%)]" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10 shrink-0">
        <div className="flex items-center gap-2">
          <Sun size={18} className="text-[#D4FF00] drop-shadow-[0_0_6px_rgba(212,255,0,0.5)]" />
          <h2 className="text-lg font-black tracking-wide text-white">Hoy</h2>
          <div className="flex items-center gap-1.5 ml-2 bg-[#D4FF00]/15 border border-[#D4FF00]/40 rounded-full px-4 py-1.5 text-xs font-bold tracking-wider text-[#D4FF00] uppercase shadow-[0_0_15px_rgba(212,255,0,0.2)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4FF00] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4FF00]"></span>
            </span>
            {currentStreak} días
          </div>
        </div>
        <button
          onClick={() => setShowShareModal(true)}
          className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.1] active:scale-[0.97] rounded-full px-4 py-2 text-xs font-bold text-white tracking-wide uppercase transition-all hover:bg-white/[0.1] hover:border-[#D4FF00]/40 hover:shadow-[0_0_15px_rgba(212,255,0,0.2)]"
        >
          <Share2 size={14} className="text-[#D4FF00]" />
          Compartir
        </button>
      </div>

      {/* Tarjeta principal de calorías */}
      <div className="relative z-10 mb-5 shrink-0">
        <div className="border border-[#D4FF00]/20 bg-gradient-to-br from-[#D4FF00]/10 via-white/[0.02] to-transparent backdrop-blur-2xl rounded-[2.5rem] p-6 flex flex-col items-center shadow-[0_0_30px_rgba(212,255,0,0.15)]">
          <CalorieRing current={todayData.cal.current} max={todayData.cal.max} />
        </div>
      </div>

      {/* Tarjeta de macros */}
      <div className="relative z-10 mb-5 shrink-0">
        <div className="border border-white/[0.08] bg-white/[0.04] backdrop-blur-2xl rounded-[2rem] p-6 flex flex-col gap-6 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
          <MacroBar label="Proteína" current={todayData.pro.current} max={todayData.pro.max} color="#60a5fa" />
          <MacroBar label="Carbohidratos" current={todayData.carb.current} max={todayData.carb.max} color="#a78bfa" />
          <MacroBar label="Grasas" current={todayData.fat.current} max={todayData.fat.max} color="#fbbf24" />
        </div>
      </div>

      {/* Sugerencias de comidas */}
      <div className="mb-5 relative z-10 shrink-0">
        <MealSuggestions remainingMacros={remainingMacros} goals={goals} onAddFood={onAddFood} />
      </div>

      {/* Tracker de agua */}
      <WaterTracker waterGoal={profile?.water_goal || 2000} profileId={profile?.id} />

      {/* Acciones inferiores */}
      <div className="flex flex-col gap-4 relative z-10 shrink-0">
        <button
          onClick={onGoToEvolution}
          className="mx-auto flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-300 hover:text-white transition-all bg-white/[0.05] border border-white/[0.1] rounded-full px-6 py-3 active:scale-95 hover:border-[#D4FF00]/40 hover:shadow-[0_0_15px_rgba(212,255,0,0.2)]"
        >
          <Scale size={14} className="text-[#D4FF00]" />
          Registrar peso
        </button>

        <button
          onClick={onGoToRoutines}
          className="w-full h-16 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 active:scale-[0.98] uppercase tracking-[0.2em] font-black text-sm text-stone-950 bg-[#D4FF00] hover:bg-[#e5ff1a] shadow-[0_0_30px_rgba(212,255,0,0.4)] hover:shadow-[0_0_40px_rgba(212,255,0,0.6)]"
        >
          <Play size={16} fill="currentColor" />
          Mis Rutinas
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