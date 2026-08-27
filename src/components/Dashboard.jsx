// src/components/Dashboard.jsx
import React, { useMemo, useState, useEffect, memo, useCallback } from 'react';
import { 
  Play, Sun, Scale, Share2, Waves, 
  Utensils, Trash2, Zap, Trophy, Copy, X
} from 'lucide-react';
import useAchievements from '../hooks/useAchievements';
import MealSuggestions from './MealSuggestions';
import ShareAchievementModal from './ShareAchievementModal';

const triggerHaptic = (pattern = 25) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch {}
  }
};

const WaterTracker = memo(({ waterGoal, profileId }) => {
  const getTodayDateString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };

  const storageKey = `water_${profileId}_${getTodayDateString()}`;
  const [waterCurrent, setWaterCurrent] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, waterCurrent.toString());
    } catch {}
  }, [waterCurrent, storageKey]);

  const targetGoal = waterGoal || 2000;
  const waterPercent = Math.min(Math.round((waterCurrent / targetGoal) * 100), 100);

  const addWater = useCallback((ml) => {
    triggerHaptic(20);
    setWaterCurrent((prev) => Math.min(prev + ml, targetGoal * 2));
  }, [targetGoal]);

  const removeWater = useCallback((ml) => {
    triggerHaptic(20);
    setWaterCurrent((prev) => Math.max(prev - ml, 0));
  }, []);

  return (
    <div className="relative z-10 mb-4 shrink-0">
      <div className="luxury-card p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#00F5FF]/10 text-[#00F5FF]">
              <Waves size={15} />
            </div>
            <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-white">
              Hidratación Diaria
            </span>
          </div>
          <span className="text-[11px] font-mono font-bold text-zinc-300 bg-black/40 px-2.5 py-0.5 rounded-full border border-white/[0.08]">
            <strong className="text-[#00F5FF]">{waterCurrent}</strong> <span className="text-zinc-500">/ {targetGoal} ml</span>
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-mono">
            <span className="text-zinc-400 font-bold">Progreso:</span>
            <span className="text-white font-black">{waterPercent}%</span>
          </div>
          <div className="w-full bg-black/60 rounded-full h-2 overflow-hidden border border-white/[0.06] p-[1px]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#00F5FF] to-[#38BDF8] transition-all duration-500 ease-out shadow-[0_0_12px_rgba(0,245,255,0.5)]"
              style={{ width: `${waterPercent}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 pt-1">
          <button
            onClick={() => removeWater(250)}
            disabled={waterCurrent <= 0}
            className="py-2 rounded-xl bg-white/[0.02] border border-white/[0.06] text-zinc-400 hover:text-rose-400 text-xs font-mono font-bold active:scale-95 disabled:opacity-20 transition-all flex items-center justify-center"
            title="Restar 250ml"
          >
            -250
          </button>
          <button
            onClick={() => addWater(250)}
            className="py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-zinc-200 hover:text-[#00F5FF] hover:border-[#00F5FF]/40 text-xs font-mono font-bold active:scale-95 transition-all"
          >
            +250ml
          </button>
          <button
            onClick={() => addWater(500)}
            className="py-2 rounded-xl bg-[#00F5FF]/10 border border-[#00F5FF]/30 text-[#00F5FF] text-xs font-mono font-bold active:scale-95 transition-all shadow-[0_0_15px_rgba(0,245,255,0.15)]"
          >
            +500ml
          </button>
          <button
            onClick={() => {
              triggerHaptic(40);
              setWaterCurrent(targetGoal);
            }}
            className="py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-zinc-300 text-[10px] font-mono font-extrabold uppercase tracking-wider active:scale-95 transition-all hover:text-white hover:border-[#D4FF00]/40"
          >
            Meta
          </button>
        </div>
      </div>
    </div>
  );
});

const MEAL_CATEGORIES = [
  { id: 'desayuno', label: 'Desayuno', icon: '🌅' },
  { id: 'comida', label: 'Comida / Almuerzo', icon: '☀️' },
  { id: 'cena', label: 'Cena', icon: '🌙' },
  { id: 'snack', label: 'Snacks & Extras', icon: '⚡' },
];

export default function Dashboard({
  profile,
  dailyIntake = [],
  currentRoutine,
  onStartWorkout,
  onGoToEvolution,
  onAddFood,
  onDeleteFood,
}) {
  const goals = profile?.goals || { cal: 2500, pro: 160, carb: 260, fat: 70 };
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState(null);

  const [quickName, setQuickName] = useState('');
  const [quickCal, setQuickCal] = useState('');
  const [quickPro, setQuickPro] = useState('');
  const [quickCarb, setQuickCarb] = useState('');
  const [quickFat, setQuickFat] = useState('');
  const [quickCategory, setQuickCategory] = useState('comida');

  // =========================================================================
  // CONTROLADOR DEL BOTÓN FÍSICO ATRÁS EN DASHBOARD
  // =========================================================================
  useEffect(() => {
    const handleBackEvent = (e) => {
      if (showQuickAddModal) {
        e.preventDefault();
        setShowQuickAddModal(false);
        return;
      }
      if (showShareModal) {
        e.preventDefault();
        setShowShareModal(false);
        return;
      }
    };

    window.addEventListener('lomecan-hardware-back', handleBackEvent);
    return () => window.removeEventListener('lomecan-hardware-back', handleBackEvent);
  }, [showQuickAddModal, showShareModal]);

  // Fechas exactas y atómicas
  const todayStr = useMemo(() => new Date().toDateString(), []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toDateString();
  }, []);

  const todayItems = useMemo(() => {
    return dailyIntake.filter((entry) => {
      if (!entry?.timestamp) return false;
      return new Date(entry.timestamp).toDateString() === todayStr;
    });
  }, [dailyIntake, todayStr]);

  const yesterdayItems = useMemo(() => {
    return dailyIntake.filter((entry) => {
      if (!entry?.timestamp) return false;
      return new Date(entry.timestamp).toDateString() === yesterdayStr;
    });
  }, [dailyIntake, yesterdayStr]);

  const todayTotals = useMemo(() => {
    return todayItems.reduce(
      (acc, item) => {
        acc.cal += Number(item.macros?.cal) || 0;
        acc.pro += Number(item.macros?.pro) || 0;
        acc.carb += Number(item.macros?.carb) || 0;
        acc.fat += Number(item.macros?.fat) || 0;
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

  const remainingMacros = {
    cal: Math.max(goals.cal - todayTotals.cal, 0),
    pro: Math.max(goals.pro - todayTotals.pro, 0),
    carb: Math.max(goals.carb - todayTotals.carb, 0),
    fat: Math.max(goals.fat - todayTotals.fat, 0),
  };

  const groupedMeals = useMemo(() => {
    const groups = { desayuno: [], comida: [], cena: [], snack: [] };

    todayItems.forEach(item => {
      let cat = item.mealType;
      if (!cat) {
        const hour = new Date(item.timestamp).getHours();
        if (hour >= 5 && hour < 12) cat = 'desayuno';
        else if (hour >= 12 && hour < 17) cat = 'comida';
        else if (hour >= 17 && hour < 22) cat = 'cena';
        else cat = 'snack';
      }
      if (groups[cat]) groups[cat].push(item);
      else groups.snack.push(item);
    });

    return groups;
  }, [todayItems]);

  const showToast = useCallback((msg) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 2500);
  }, []);

  const handleCopyYesterday = useCallback((catId) => {
    triggerHaptic(35);
    const itemsToCopy = yesterdayItems.filter(item => {
      const hour = new Date(item.timestamp).getHours();
      let c = item.mealType;
      if (!c) {
        if (hour >= 5 && hour < 12) c = 'desayuno';
        else if (hour >= 12 && hour < 17) c = 'comida';
        else if (hour >= 17 && hour < 22) c = 'cena';
        else c = 'snack';
      }
      return c === catId;
    });

    if (itemsToCopy.length === 0) {
      showToast('⚠️ No hay comidas registradas ayer en esta categoría');
      return;
    }

    itemsToCopy.forEach(item => {
      const grams = item.grams || 100;
      const factor = 100 / grams;

      onAddFood({
        name: item.foodName,
        cal: Math.round((item.macros?.cal || 0) * factor),
        pro: parseFloat(((item.macros?.pro || 0) * factor).toFixed(1)),
        carb: parseFloat(((item.macros?.carb || 0) * factor).toFixed(1)),
        fat: parseFloat(((item.macros?.fat || 0) * factor).toFixed(1)),
        base_g: 100,
        mealType: catId
      }, grams);
    });

    showToast(`✅ ${itemsToCopy.length} alimentos copiados de ayer`);
  }, [yesterdayItems, onAddFood, showToast]);

  const handleSaveQuickEntry = useCallback(() => {
    if (!quickName.trim() || !quickCal) return;
    triggerHaptic(30);

    const fakeFood = {
      name: quickName.trim(),
      cal: parseFloat(quickCal) || 0,
      pro: parseFloat(quickPro) || 0,
      carb: parseFloat(quickCarb) || 0,
      fat: parseFloat(quickFat) || 0,
      base_g: 100,
      mealType: quickCategory
    };

    onAddFood(fakeFood, 100);
    setQuickName('');
    setQuickCal('');
    setQuickPro('');
    setQuickCarb('');
    setQuickFat('');
    setShowQuickAddModal(false);
    showToast('✅ Calorías registradas');
  }, [quickName, quickCal, quickPro, quickCarb, quickFat, quickCategory, onAddFood, showToast]);

  return (
    <div className="flex flex-col px-5 pt-2 pb-44 text-white bg-transparent select-none relative no-scrollbar">
      
      {notificationMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#0C0C12] border border-[#D4FF00]/40 text-[#D4FF00] text-xs font-mono font-bold px-4 py-2 rounded-full shadow-[0_0_20px_rgba(212,255,0,0.3)] backdrop-blur-xl animate-fade-in">
          {notificationMsg}
        </div>
      )}

      {/* Header del Dashboard */}
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

      {/* Botón Acción de Entrenamiento */}
      <div className="mb-4 shrink-0">
        <button
          onClick={onStartWorkout}
          className="w-full py-4 volt-button flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_0_25px_rgba(212,255,0,0.3)] text-xs font-black uppercase tracking-wider font-mono"
        >
          <Play size={16} fill="currentColor" />
          {currentRoutine ? `ENTRENAR: ${currentRoutine.name}` : 'INICIAR RUTINA DE HOY'}
        </button>
      </div>

      {/* Cockpit de Calorías & Macronutrientes */}
      <div className="relative z-10 mb-4 shrink-0">
        <div className="luxury-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-zinc-400 uppercase block">
                Kcal Restantes
              </span>
              <span className="text-3xl font-mono font-black text-white tracking-tighter">
                {Math.max(todayData.cal.max - todayData.cal.current, 0)}
              </span>
            </div>
            
            <div className="text-right font-mono text-[11px] text-zinc-400 bg-black/40 px-3 py-1.5 rounded-xl border border-white/[0.06]">
              <div>Ingesta: <strong className="text-white">{todayData.cal.current}</strong></div>
              <div>Meta: <strong className="text-[#D4FF00]">{todayData.cal.max}</strong></div>
            </div>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <div>
              <div className="flex justify-between mb-1 text-[11px]">
                <span className="font-bold text-blue-400">Proteína</span>
                <span className="text-zinc-400">{todayData.pro.current} / <strong className="text-white">{todayData.pro.max}g</strong></span>
              </div>
              <div className="h-2 bg-black/60 rounded-full overflow-hidden border border-white/[0.04]">
                <div className="h-full bg-blue-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(96,165,250,0.5)]" style={{ width: `${Math.min((todayData.pro.current/Math.max(todayData.pro.max, 1))*100, 100)}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1 text-[11px]">
                <span className="font-bold text-purple-400">Carbohidratos</span>
                <span className="text-zinc-400">{todayData.carb.current} / <strong className="text-white">{todayData.carb.max}g</strong></span>
              </div>
              <div className="h-2 bg-black/60 rounded-full overflow-hidden border border-white/[0.04]">
                <div className="h-full bg-purple-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(192,132,252,0.5)]" style={{ width: `${Math.min((todayData.carb.current/Math.max(todayData.carb.max, 1))*100, 100)}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1 text-[11px]">
                <span className="font-bold text-amber-400">Grasas</span>
                <span className="text-zinc-400">{todayData.fat.current} / <strong className="text-white">{todayData.fat.max}g</strong></span>
              </div>
              <div className="h-2 bg-black/60 rounded-full overflow-hidden border border-white/[0.04]">
                <div className="h-full bg-amber-400 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(251,191,36,0.5)]" style={{ width: `${Math.min((todayData.fat.current/Math.max(todayData.fat.max, 1))*100, 100)}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 shrink-0">
        <MealSuggestions remainingMacros={remainingMacros} goals={goals} onAddFood={onAddFood} />
      </div>

      {/* Desglose de Comidas */}
      <div className="space-y-3 mb-4 shrink-0">
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-1.5">
            <Utensils size={13} className="text-[#D4FF00]" /> Comidas del Día
          </span>
          
          <button
            onClick={() => setShowQuickAddModal(true)}
            className="px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono font-bold text-zinc-300 hover:text-white flex items-center gap-1 active:scale-95 transition-all"
          >
            <Zap size={11} className="text-[#D4FF00]" /> Entrada Rápida
          </button>
        </div>

        {MEAL_CATEGORIES.map(cat => {
          const items = groupedMeals[cat.id] || [];
          const catCalories = Math.round(items.reduce((sum, i) => sum + (Number(i.macros?.cal) || 0), 0));
          const catProtein = items.reduce((sum, i) => sum + (Number(i.macros?.pro) || 0), 0);

          return (
            <div key={cat.id} className="luxury-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{cat.icon}</span>
                  <span className="text-xs font-black text-white uppercase">{cat.label}</span>
                </div>
                <div className="flex items-center gap-2.5 text-[10px] font-mono">
                  <span className="text-[#D4FF00] font-bold">{catCalories} kcal</span>
                  <span className="text-blue-400 font-semibold">P:{catProtein.toFixed(1)}g</span>
                  <button
                    onClick={() => handleCopyYesterday(cat.id)}
                    className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:text-white active:scale-90 transition-all"
                    title="Copiar comidas de ayer"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>

              {items.length === 0 ? (
                <p className="text-[11px] font-mono text-zinc-600 pl-6">Sin alimentos registrados.</p>
              ) : (
                <div className="space-y-1.5 pl-6">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-xs font-mono py-1 border-b border-white/[0.03] last:border-0">
                      <span className="text-zinc-300 truncate max-w-[170px]">{item.foodName} ({item.grams}g)</span>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400 font-bold">{item.macros?.cal || 0} kcal</span>
                        <button 
                          onClick={() => onDeleteFood(item.id)} 
                          className="p-1 text-zinc-600 hover:text-rose-400 active:scale-90 transition-colors"
                          aria-label="Eliminar alimento"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <WaterTracker waterGoal={profile?.water_goal || 2000} profileId={profile?.id} />

      <ClubLeaderboard currentProfileId={profile?.id} />

      <div className="pt-2 shrink-0">
        <button
          onClick={onGoToEvolution}
          className="w-full py-3.5 bg-white/[0.025] border border-white/[0.08] rounded-2xl text-xs font-mono font-extrabold uppercase tracking-widest text-zinc-300 hover:text-white hover:border-[#D4FF00]/40 flex items-center justify-center gap-2 active:scale-95 transition-all shadow-inner-light"
        >
          <Scale size={15} className="text-[#D4FF00]" />
          Ver Evolución y Métricas
        </button>
      </div>

      {showQuickAddModal && (
        <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="luxury-card p-6 max-w-sm w-full space-y-4 animate-scale-in">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-white uppercase tracking-wider font-sans">Entrada Rápida</h3>
              <button onClick={() => setShowQuickAddModal(false)} className="p-1 text-zinc-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nombre (ej. Comida fuera, Batido)"
                value={quickName}
                onChange={e => setQuickName(e.target.value)}
                className="w-full bg-black/70 border border-white/[0.1] rounded-xl p-3 text-xs text-white outline-none focus:border-[#D4FF00]"
              />

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={quickCategory}
                  onChange={e => setQuickCategory(e.target.value)}
                  className="bg-black/70 border border-white/[0.1] rounded-xl p-2.5 text-xs text-white font-bold outline-none"
                >
                  <option value="desayuno">🌅 Desayuno</option>
                  <option value="comida">☀️ Comida</option>
                  <option value="cena">🌙 Cena</option>
                  <option value="snack">⚡ Snack</option>
                </select>

                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Calorías (kcal) *"
                  value={quickCal}
                  onChange={e => setQuickCal(e.target.value)}
                  className="bg-black/70 border border-white/[0.1] rounded-xl p-2.5 text-xs text-center text-[#D4FF00] font-bold outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 font-mono">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Proteína (g)"
                  value={quickPro}
                  onChange={e => setQuickPro(e.target.value)}
                  className="bg-black/70 border border-white/[0.1] rounded-xl p-2 text-xs text-center text-blue-400 outline-none font-bold"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Carbos (g)"
                  value={quickCarb}
                  onChange={e => setQuickCarb(e.target.value)}
                  className="bg-black/70 border border-white/[0.1] rounded-xl p-2 text-xs text-center text-purple-400 outline-none font-bold"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Grasas (g)"
                  value={quickFat}
                  onChange={e => setQuickFat(e.target.value)}
                  className="bg-black/70 border border-white/[0.1] rounded-xl p-2 text-xs text-center text-amber-400 outline-none font-bold"
                />
              </div>
            </div>

            <button
              onClick={handleSaveQuickEntry}
              disabled={!quickName.trim() || !quickCal}
              className="w-full py-3.5 volt-button rounded-xl text-xs font-black uppercase tracking-wider active:scale-95 disabled:opacity-30 font-mono"
            >
              Registrar en mi día
            </button>
          </div>
        </div>
      )}

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

const ClubLeaderboard = memo(function ClubLeaderboard({ currentProfileId }) {
  const [ranking, setRanking] = useState([]);

  const computeScores = useCallback(() => {
    try {
      const profiles = JSON.parse(localStorage.getItem('userProfiles') || '[]');
      if (!Array.isArray(profiles) || profiles.length === 0) return;

      const scores = profiles.map(p => {
        let totalVolume = 0;
        let sessionsCount = 0;
        const prefix = `workoutHistory_${p.id}_`;

        // Lectura atómica segura
        Object.keys(localStorage)
          .filter(k => k.startsWith(prefix))
          .forEach(key => {
            try {
              const sessions = JSON.parse(localStorage.getItem(key));
              if (Array.isArray(sessions)) {
                sessionsCount += sessions.length;
                sessions.forEach(s => {
                  (s.exercises || []).forEach(ex => {
                    (ex.sets || []).forEach(set => {
                      totalVolume += (parseFloat(set.weight) || 0) * (parseInt(set.repsDone || set.reps, 10) || 0);
                    });
                  });
                });
              }
            } catch {}
          });

        return {
          id: p.id,
          name: p.name,
          avatar: p.avatar || '😎',
          volume: Math.round(totalVolume),
          sessions: sessionsCount,
        };
      });

      scores.sort((a, b) => b.volume - a.volume);
      setRanking(scores);
    } catch {}
  }, []);

  useEffect(() => {
    computeScores();
    window.addEventListener('workoutFinished', computeScores);
    return () => window.removeEventListener('workoutFinished', computeScores);
  }, [computeScores]);

  if (ranking.length <= 1) return null;

  return (
    <div className="luxury-card p-5 space-y-3 mb-4 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-[#D4FF00]" />
          <h3 className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-white">
            Leaderboard del Club Lomecan
          </h3>
        </div>
        <span className="text-[9px] font-mono text-zinc-500 font-bold">Top Volumen</span>
      </div>

      <div className="space-y-2">
        {ranking.slice(0, 4).map((user, idx) => {
          const isCurrentUser = user.id === currentProfileId;
          const medals = ['🥇', '🥈', '🥉', '⚡'];

          return (
            <div
              key={user.id}
              className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
                isCurrentUser
                  ? 'bg-[#D4FF00]/10 border-[#D4FF00]/40 shadow-[0_0_15px_rgba(212,255,0,0.1)]'
                  : 'bg-black/40 border-white/[0.04]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-base">{medals[idx] || '💪'}</span>
                <span className="text-xs font-black text-white truncate">{user.name}</span>
                {isCurrentUser && (
                  <span className="text-[8px] font-mono bg-[#D4FF00] text-black font-bold px-1.5 py-0.2 rounded-full">TÚ</span>
                )}
              </div>

              <div className="text-right font-mono text-[10px]">
                <span className="text-[#D4FF00] font-bold">{user.volume.toLocaleString()} kg</span>
                <span className="text-zinc-500 block text-[8px]">{user.sessions} entrenamientos</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});