import React, { useMemo, useState, useEffect, memo } from 'react';
import { Play, Sun, Plus, Minus, Scale, Share2, Droplet } from 'lucide-react';
import useAchievements from '../hooks/useAchievements';
import MealSuggestions from './MealSuggestions';
import ShareAchievementModal from './ShareAchievementModal';

// ==========================================================================
// CÍRCULO DE AGUA – Estable, sin cambios de layout
// ==========================================================================
const WaterCircle = memo(({ percent }) => {
  const getMotivationalMessage = (p) => {
    if (p === 0) return { msg: 'Empieza a beber', color: '#52525b' };
    if (p <= 20) return { msg: 'Buen comienzo', color: '#60a5fa' };
    if (p <= 60) return { msg: 'Más de la mitad', color: '#3b82f6' };
    if (p <= 99) return { msg: 'Casi al 100%', color: '#059669' };
    return { msg: '¡Hidratación completa!', color: '#d4ff00' };
  };

  const { msg, color } = getMotivationalMessage(percent);
  const radius = 52, stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3 w-full shrink-0">
      <div className="relative w-[116px] h-[116px] flex items-center justify-center">
        <svg height="116" width="116" className="transform -rotate-90">
          <circle
            stroke="rgba(255,255,255,0.04)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx="58"
            cy="58"
          />
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            r={normalizedRadius}
            cx="58"
            cy="58"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <Droplet size={22} style={{ color }} className="mb-0.5" />
          <span className="text-lg font-bold tracking-tight text-white leading-none">
            {Math.round(percent)}%
          </span>
        </div>
      </div>
      <div className="h-7 flex items-center">
        <span className="text-[10px] font-medium text-stone-400 tracking-wide px-2 py-1 rounded-full bg-white/[0.03] border border-white/[0.04]">
          {msg}
        </span>
      </div>
    </div>
  );
});

// ==========================================================================
// COMPONENTE AISLADO DEL AGUA – Se renderiza solo al cambiar el agua
// ==========================================================================
const WaterTracker = memo(({ waterGoal, profileId }) => {
  const storageKey = `water_${profileId}_${new Date().toDateString()}`;
  const [waterCurrent, setWaterCurrent] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [manualInput, setManualInput] = useState('');

  useEffect(() => {
    // Escritura asíncrona en localStorage para no bloquear el renderizado
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
      <div className="border border-white/[0.05] bg-white/[0.02] backdrop-blur-xl rounded-[2rem] p-5 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <span className="text-[11px] font-semibold text-stone-300 uppercase tracking-wider">Agua</span>
          <span className="text-[10px] font-semibold text-stone-400 tabular-nums bg-stone-950/40 px-3 py-1 rounded-full border border-white/[0.04]">
            {waterCurrent} / {waterGoal} ml
          </span>
        </div>

        <div className="w-full py-2" style={{ minHeight: '180px' }}>
          <WaterCircle percent={waterPercent} />
        </div>

        <div className="flex items-center justify-between w-full bg-white/[0.02] border border-white/[0.04] rounded-2xl p-2.5 mt-4">
          <button
            onClick={() => removeWater(250)}
            disabled={waterCurrent <= 0}
            className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.05] hover:border-red-400/30 active:scale-95 flex items-center justify-center text-stone-300 disabled:opacity-20 transition-all"
          >
            <Minus size={14} />
          </button>
          <div className="flex flex-col items-center justify-center">
            <input
              type="number"
              value={manualInput}
              onChange={handleManualChange}
              placeholder={waterCurrent.toString()}
              className="w-16 bg-transparent text-center text-lg font-bold text-white focus:placeholder-transparent outline-none tabular-nums"
              min="0"
              inputMode="numeric"
            />
            <span className="text-[9px] text-stone-500 uppercase tracking-widest font-medium">ml</span>
          </div>
          <button
            onClick={() => addWater(250)}
            className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.05] hover:border-[#d4ff00]/30 active:scale-95 flex items-center justify-center text-stone-300 transition-all"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex justify-between items-center w-full mt-3 text-[10px]">
          <button
            onClick={() => setWaterCurrent(waterGoal)}
            className="text-[#d4ff00] font-semibold hover:text-white transition-colors uppercase tracking-wide"
          >
            Completar día
          </button>
          <span className="text-stone-500 tabular-nums">
            ~{Math.round((waterCurrent / 250) * 10) / 10} vasos
          </span>
        </div>
      </div>
    </div>
  );
});

// ==========================================================================
// MACROBAR – memoizada
// ==========================================================================
const MacroBar = memo(({ label, current, max, color, unit = 'g' }) => {
  const percent = Math.min((current / max) * 100, 100);
  return (
    <div className="w-full shrink-0">
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-[11px] text-stone-300 font-semibold tracking-wide">{label}</span>
        <span className="text-[11px] font-semibold text-white tabular-nums">
          {current}
          <span className="text-stone-500 font-normal text-[10px]">/{max}{unit}</span>
        </span>
      </div>
      <div className="w-full h-[3px] bg-white/[0.05] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_6px_currentColor]"
          style={{ width: `${percent}%`, backgroundColor: color, color }}
        />
      </div>
    </div>
  );
});

// ==========================================================================
// ANILLO DE CALORÍAS – memoizado
// ==========================================================================
const CalorieRing = memo(({ current, max }) => {
  const remaining = max - current;
  const percent = Math.min((current / max) * 100, 100);
  const radius = 64, stroke = 7;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percent / 100) * circumference;
  const isOverGoal = percent > 100;
  const strokeColor = isOverGoal ? '#ef4444' : '#d4ff00';

  return (
    <div className="relative flex flex-col items-center justify-center py-3 w-full shrink-0">
      <div className="relative w-[136px] h-[136px] flex items-center justify-center">
        <svg height="136" width="136" className="-rotate-90 absolute">
          <circle
            stroke="rgba(255,255,255,0.04)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx="68"
            cy="68"
          />
          <circle
            stroke={strokeColor}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx="68"
            cy="68"
            filter="drop-shadow(0 0 8px currentColor)"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-bold text-white tracking-tight leading-none tabular-nums">
            {remaining}
          </span>
          <span className="text-[10px] text-stone-400 uppercase tracking-[0.15em] mt-1 font-medium">
            kcal restantes
          </span>
        </div>
      </div>
    </div>
  );
});

// ==========================================================================
// DASHBOARD PRINCIPAL – Ya no maneja el estado del agua
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
    <div className="flex-1 flex flex-col px-5 pt-8 pb-40 text-white bg-[#09090B] select-none min-h-screen relative overflow-y-auto">
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(circle_at_50%_0%,#ffffff10,transparent_70%)]" />

      {/* Header + racha */}
      <div className="flex items-center justify-between mb-5 relative z-10 shrink-0">
        <div className="flex items-center gap-2">
          <Sun size={14} className="text-[#d4ff00]" />
          <h2 className="text-[11px] font-semibold tracking-[0.15em] text-stone-400 uppercase">Hoy</h2>
          <div className="flex items-center gap-1.5 ml-2 bg-[#d4ff00]/10 border border-[#d4ff00]/20 rounded-full px-3 py-1 text-[10px] font-semibold tracking-wider text-[#d4ff00] uppercase">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d4ff00] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#d4ff00]"></span>
            </span>
            {currentStreak} días
          </div>
        </div>
        <button
          onClick={() => setShowShareModal(true)}
          className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] active:scale-[0.97] rounded-full px-3.5 py-1.5 text-[10px] font-medium text-stone-300 tracking-wide uppercase transition-all"
        >
          <Share2 size={12} className="text-[#d4ff00]" />
          Compartir
        </button>
      </div>

      {/* Tarjeta de Calorías */}
      <div className="relative z-10 mb-4 shrink-0">
        <div className="border border-white/[0.05] bg-white/[0.02] backdrop-blur-xl rounded-[2.5rem] p-5 flex flex-col items-center">
          <CalorieRing current={todayData.cal.current} max={todayData.cal.max} />
        </div>
      </div>

      {/* Macros */}
      <div className="relative z-10 mb-4 shrink-0">
        <div className="border border-white/[0.05] bg-white/[0.02] backdrop-blur-xl rounded-[2rem] p-5 flex flex-col gap-4">
          <MacroBar label="Proteína" current={todayData.pro.current} max={todayData.pro.max} color="#60a5fa" />
          <MacroBar label="Carbohidratos" current={todayData.carb.current} max={todayData.carb.max} color="#a78bfa" />
          <MacroBar label="Grasas" current={todayData.fat.current} max={todayData.fat.max} color="#fbbf24" />
        </div>
      </div>

      {/* Sugerencias */}
      <div className="mb-4 relative z-10 shrink-0">
        <MealSuggestions remainingMacros={remainingMacros} goals={goals} onAddFood={onAddFood} />
      </div>

      {/* Componente aislado del agua – se re‑renderiza solo */}
      <WaterTracker waterGoal={profile?.water_goal || 2000} profileId={profile?.id} />

      {/* Acciones */}
      <div className="flex flex-col gap-3 relative z-10 shrink-0 pb-6">
        <button
          onClick={onGoToEvolution}
          className="mx-auto flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-stone-400 hover:text-white transition-all bg-white/[0.02] border border-white/[0.05] rounded-full px-5 py-2.5 active:scale-95"
        >
          <Scale size={13} className="text-[#d4ff00]" />
          Registrar peso
        </button>

        <button
          onClick={currentRoutine ? onStartWorkout : onGoToRoutines}
          className="w-full h-14 rounded-2xl flex items-center justify-center gap-3.5 transition-all duration-300 active:scale-[0.98] uppercase tracking-[0.15em] font-semibold text-xs text-stone-950 bg-white hover:bg-stone-100 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        >
          <Play size={12} fill="currentColor" />
          {currentRoutine ? 'Comenzar Entrenamiento' : 'Elegir una Rutina'}
        </button>
      </div>

      {/* Modal de compartir */}
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