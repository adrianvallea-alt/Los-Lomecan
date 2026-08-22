// src/components/EvolutionView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, Award, Calendar, Dumbbell, Ruler, Weight, 
  Image as ImageIcon, Calculator, Zap, ChevronDown, ChevronUp, 
  Flame, Target, Sparkles 
} from 'lucide-react';
import { MONTHS } from '../utils/gymHelpers';
import useWeightLogs from '../hooks/useWeightLogs';
import useBodyMeasures from '../hooks/useBodyMeasures';
import ProgressPhotos from './ProgressPhotos';

// ==================== FÓRMULA CIENTÍFICA DE 1RM (Epley + Brzycki) ====================
export const calculate1RM = (weight, reps) => {
  const w = parseFloat(weight) || 0;
  const r = parseInt(reps) || 0;
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return w;

  const epley = w * (1 + r / 30);
  const brzycki = r < 37 ? w * (36 / (37 - r)) : epley;
  return parseFloat(((epley + brzycki) / 2).toFixed(1));
};

// ==================== GRÁFICA DE LÍNEAS OPTIMIZADA ====================
const LineChart = ({ data, maxValue, color, unit = '', width = 320, height = 130 }) => {
  if (!data || data.length === 0) return null;

  const validData = data
    .filter(item => typeof item.value === 'number' && !isNaN(item.value))
    .map(item => ({ ...item, value: Math.max(0, item.value) }));

  if (validData.length === 0) return null;

  const padding = { top: 22, right: 12, bottom: 22, left: 12 };
  const chartWidth = Math.max(width - padding.left - padding.right, 0);
  const chartHeight = Math.max(height - padding.top - padding.bottom, 0);

  const maxInData = Math.max(...validData.map(d => d.value));
  const safeMax = Math.max(maxInData, maxValue || 0, 1);
  const effectiveMax = validData.length === 1 ? maxInData * 1.2 || 1 : safeMax;

  const points = validData.map((item, idx) => ({
    x: padding.left + (idx / Math.max(validData.length - 1, 1)) * chartWidth,
    y: padding.top + chartHeight - (item.value / effectiveMax) * chartHeight,
    ...item
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="flex justify-center overflow-x-auto no-scrollbar py-1">
      <svg width={width} height={height} className="overflow-visible">
        {validData.length > 1 && (
          <path 
            d={pathD} 
            fill="none" 
            stroke={color} 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
          />
        )}
        {points.map((point, idx) => (
          <g key={idx}>
            <circle cx={point.x} cy={point.y} r="4.5" fill="#09090B" stroke={color} strokeWidth="2.5" />
            <text x={point.x} y={point.y - 9} textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="700">
              {Number.isFinite(point.value) ? `${point.value}${unit}` : ''}
            </text>
            <text x={point.x} y={height - 2} textAnchor="middle" fill="#71717A" fontSize="8" fontWeight="600">
              {point.label || ''}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

// Helpers de semanas
function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

function getMondayOfWeek(year, weekNumber) {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);
  const monday = new Date(firstMonday);
  monday.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);
  return monday;
}

export default function EvolutionView({ activeProfile }) {
  const [weightInput, setWeightInput] = useState('');
  const [showMeasureForm, setShowMeasureForm] = useState(false);
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');
  const [arms, setArms] = useState('');
  const [thighs, setThighs] = useState('');
  const [showPhotos, setShowPhotos] = useState(false);
  const [expandedPrIndex, setExpandedPrIndex] = useState(null);

  // Estado para la calculadora interactiva de 1RM
  const [calcWeight, setCalcWeight] = useState('');
  const [calcReps, setCalcReps] = useState('');
  const [showInteractiveCalc, setShowInteractiveCalc] = useState(false);

  const { logs: weightLogs, addLog } = useWeightLogs(activeProfile.id);
  const { measures, history: measuresHistory, saveMeasures } = useBodyMeasures(activeProfile.id);

  // Datos de peso
  const weightData = (weightLogs || [])
    .slice(-30)
    .map(entry => ({
      label: `${new Date(entry.date).getDate()}/${new Date(entry.date).getMonth() + 1}`,
      value: parseFloat(entry.weight)
    }))
    .filter(item => typeof item.value === 'number' && !isNaN(item.value));

  const maxWeight = weightData.length > 0 ? Math.max(...weightData.map(w => w.value), 1) : 1;

  // Medidas
  const measuresKeys = ['chest', 'waist', 'hips', 'arms', 'thighs'];
  const measuresColors = { chest: '#F472B6', waist: '#60A5FA', hips: '#C084FC', arms: '#34D399', thighs: '#FBBF24' };
  const measuresLabels = { chest: 'Pecho', waist: 'Cintura', hips: 'Cadera', arms: 'Brazos', thighs: 'Muslos' };

  const measuresData = measuresKeys.map(key => {
    const data = (measuresHistory || [])
      .filter(entry => entry[key] != null)
      .slice(-30)
      .map(entry => ({
        label: `${new Date(entry.date).getDate()}/${new Date(entry.date).getMonth() + 1}`,
        value: parseFloat(entry[key])
      }))
      .filter(item => typeof item.value === 'number' && !isNaN(item.value));

    const maxVal = data.length > 0 ? Math.max(...data.map(d => d.value), 1) : 1;
    return { key, data, maxVal, color: measuresColors[key], label: measuresLabels[key] };
  });

  // Volumen, frecuencia y PRs con 1RM
  const [weeklyVolume, setWeeklyVolume] = useState([]);
  const [weeklyFrequency, setWeeklyFrequency] = useState([]);
  const [topExercises, setTopExercises] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = () => {
      const allSessions = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(`workoutHistory_${activeProfile.id}_`)) {
          try {
            const sessions = JSON.parse(localStorage.getItem(key));
            if (Array.isArray(sessions)) allSessions.push(...sessions);
          } catch (e) {}
        }
      }

      if (allSessions.length === 0) {
        setLoading(false);
        return;
      }

      const byWeek = {};
      const exerciseRecords = {};

      allSessions.forEach(session => {
        const d = new Date(session.date);
        const weekNumber = getWeekNumber(d);
        const year = d.getFullYear();
        const keyWeek = `${year}-W${weekNumber}`;

        if (!byWeek[keyWeek]) {
          const monday = getMondayOfWeek(year, weekNumber);
          const displayLabel = `${monday.getDate()}/${monday.getMonth() + 1}`;
          byWeek[keyWeek] = { volume: 0, days: new Set(), displayLabel };
        }

        const volume = (session.exercises || []).reduce((sum, ex) =>
          sum + (ex.sets || []).reduce((s, set) => s + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0), 0);
        byWeek[keyWeek].volume += volume;
        byWeek[keyWeek].days.add(d.getDate());

        (session.exercises || []).forEach(ex => {
          const exKey = ex.libraryExerciseId || ex.id;
          (ex.sets || []).forEach(set => {
            const w = parseFloat(set.weight);
            const r = parseInt(set.reps);
            if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return;

            const estimated1RM = calculate1RM(w, r);

            if (!exerciseRecords[exKey] || estimated1RM > exerciseRecords[exKey].oneRepMax) {
              exerciseRecords[exKey] = { 
                name: ex.name, 
                weight: w, 
                reps: r,
                oneRepMax: estimated1RM 
              };
            }
          });
        });
      });

      const sortedWeeks = Object.entries(byWeek)
        .sort(([a], [b]) => {
          const [yearA, weekA] = a.split('-W').map(Number);
          const [yearB, weekB] = b.split('-W').map(Number);
          return new Date(yearA, 0, (weekA - 1) * 7 + 1) - new Date(yearB, 0, (weekB - 1) * 7 + 1);
        })
        .slice(-12);

      setWeeklyVolume(sortedWeeks.map(([_, data]) => ({ label: data.displayLabel, value: Math.round(data.volume) })));
      setWeeklyFrequency(sortedWeeks.map(([_, data]) => ({ label: data.displayLabel, value: data.days.size })));

      const top = Object.values(exerciseRecords)
        .sort((a, b) => b.oneRepMax - a.oneRepMax)
        .slice(0, 8);

      setTopExercises(top);
      setLoading(false);
    };

    loadData();
  }, [activeProfile.id]);

  const maxVolume = weeklyVolume.length > 0 ? Math.max(...weeklyVolume.map(m => m.value), 1) : 1;
  const maxDays = weeklyFrequency.length > 0 ? Math.max(...weeklyFrequency.map(m => m.value), 1) : 1;

  // Manejo de peso y medidas
  const handleAddWeight = () => {
    const weight = parseFloat(weightInput);
    if (!isNaN(weight) && weight > 0) {
      addLog(weight);
      setWeightInput('');
    }
  };

  const handleSaveMeasures = () => {
    const parsed = {
      chest: parseFloat(chest) || measures.chest || null,
      waist: parseFloat(waist) || measures.waist || null,
      hips: parseFloat(hips) || measures.hips || null,
      arms: parseFloat(arms) || measures.arms || null,
      thighs: parseFloat(thighs) || measures.thighs || null,
    };
    if (Object.values(parsed).some(v => v !== null && !isNaN(v))) {
      saveMeasures(parsed);
      setChest(''); setWaist(''); setHips(''); setArms(''); setThighs('');
      setShowMeasureForm(false);
    }
  };

  const openMeasureForm = () => {
    setChest(measures.chest?.toString() || '');
    setWaist(measures.waist?.toString() || '');
    setHips(measures.hips?.toString() || '');
    setArms(measures.arms?.toString() || '');
    setThighs(measures.thighs?.toString() || '');
    setShowMeasureForm(true);
  };

  // Cálculo del resultado de la calculadora interactiva
  const interactive1RMResult = useMemo(() => {
    const w = parseFloat(calcWeight);
    const r = parseInt(calcReps);
    if (!w || !r || w <= 0 || r <= 0) return null;
    const max = calculate1RM(w, r);
    return {
      oneRepMax: max,
      percentages: [
        { pct: 95, reps: '1-2 reps', weight: Math.round(max * 0.95), focus: 'Fuerza Máxima' },
        { pct: 85, reps: '5-6 reps', weight: Math.round(max * 0.85), focus: 'Fuerza / Potencia' },
        { pct: 75, reps: '8-10 reps', weight: Math.round(max * 0.75), focus: 'Hipertrofia Óptima' },
        { pct: 65, reps: '12-15 reps', weight: Math.round(max * 0.65), focus: 'Resistencia Muscular' },
      ]
    };
  }, [calcWeight, calcReps]);

  if (showPhotos) {
    return <ProgressPhotos activeProfile={activeProfile} onBack={() => setShowPhotos(false)} />;
  }

  return (
    <div className="flex-1 flex flex-col animate-fade-in bg-[#09090B] pb-32 no-scrollbar select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-3 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <TrendingUp size={22} className="text-[#D4FF00]" />
          <h2 className="text-xl font-black text-white tracking-tight">Evolución</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInteractiveCalc(!showInteractiveCalc)}
            className={`p-2.5 rounded-full border transition-all active:scale-95 ${
              showInteractiveCalc
                ? 'bg-[#D4FF00] border-[#D4FF00] text-[#09090B] shadow-[0_0_12px_rgba(212,255,0,0.4)]'
                : 'bg-white/[0.03] border-white/[0.08] text-zinc-400 hover:text-white'
            }`}
            title="Calculadora de 1RM"
            aria-label="Abrir calculadora de 1RM"
          >
            <Calculator size={17} />
          </button>
          
          <button
            onClick={() => setShowPhotos(true)}
            className="p-2.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-zinc-400 hover:text-white active:scale-95 transition-all"
            aria-label="Fotos de progreso"
          >
            <ImageIcon size={17} />
          </button>
        </div>
      </div>

      {/* ========== CALCULADORA INTERACTIVA DE 1RM ========== */}
      {showInteractiveCalc && (
        <div className="px-5 mb-5 animate-fade-in">
          <div className="bg-gradient-to-br from-[#0A0A0C] to-[#121216] border border-[#D4FF00]/30 rounded-3xl p-5 shadow-[0_0_30px_rgba(212,255,0,0.1)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-[#D4FF00]" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Calculadora de 1RM</h3>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">Fórmula Epley / Brzycki</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Peso levantado (kg)</label>
                <input
                  type="number"
                  step="0.5"
                  value={calcWeight}
                  onChange={(e) => setCalcWeight(e.target.value)}
                  placeholder="Ej: 80"
                  className="w-full bg-black/60 border border-white/[0.08] rounded-xl p-3 text-sm text-center font-bold text-white focus:border-[#D4FF00] outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Reps realizadas</label>
                <input
                  type="number"
                  value={calcReps}
                  onChange={(e) => setCalcReps(e.target.value)}
                  placeholder="Ej: 8"
                  className="w-full bg-black/60 border border-white/[0.08] rounded-xl p-3 text-sm text-center font-bold text-white focus:border-[#D4FF00] outline-none"
                />
              </div>
            </div>

            {interactive1RMResult ? (
              <div className="space-y-3 pt-1 animate-fade-in">
                {/* Resultado 1RM */}
                <div className="bg-[#D4FF00]/10 border border-[#D4FF00]/30 rounded-2xl p-4 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">1RM Máximo Estimado:</span>
                  <p className="text-3xl font-black text-[#D4FF00] mt-0.5 tracking-tight">
                    {interactive1RMResult.oneRepMax} <span className="text-sm font-bold text-white">kg</span>
                  </p>
                </div>

                {/* Tabla de intensidades */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {interactive1RMResult.percentages.map((p) => (
                    <div key={p.pct} className="bg-white/[0.02] border border-white/[0.04] p-2.5 rounded-xl">
                      <div className="flex justify-between items-center text-[10px] font-mono mb-1">
                        <span className="text-[#D4FF00] font-bold">{p.pct}%</span>
                        <span className="text-zinc-500">{p.reps}</span>
                      </div>
                      <p className="text-sm font-bold text-white">{p.weight} kg</p>
                      <span className="text-[9px] text-zinc-400 block mt-0.5">{p.focus}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-zinc-500 text-center py-1">
                Ingresa peso y repeticiones para calcular tu 1RM y porcentajes de entrenamiento.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Formulario rápido de peso */}
      <div className="px-5 mb-4 shrink-0">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3.5 flex items-center gap-3">
          <Weight size={18} className="text-[#D4FF00] shrink-0" />
          <input
            type="number"
            step="0.1"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            placeholder="Registrar peso de hoy (kg)"
            className="flex-1 bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-[#D4FF00] outline-none"
          />
          <button
            onClick={handleAddWeight}
            disabled={!weightInput}
            className="px-4 py-2.5 bg-[#D4FF00] text-[#09090B] font-black rounded-xl text-xs uppercase tracking-wider active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all shrink-0"
          >
            Guardar
          </button>
        </div>
      </div>

      {/* Formulario de medidas corporales */}
      <div className="px-5 mb-5 shrink-0">
        {showMeasureForm ? (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Ruler size={15} className="text-[#D4FF00]" /> Medidas corporales (cm)
              </span>
              <button onClick={() => setShowMeasureForm(false)} className="text-xs text-zinc-400 hover:text-white">
                Cancelar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Pecho', value: chest, setter: setChest },
                { label: 'Cintura', value: waist, setter: setWaist },
                { label: 'Cadera', value: hips, setter: setHips },
                { label: 'Brazos', value: arms, setter: setArms },
                { label: 'Muslos', value: thighs, setter: setThighs },
              ].map((item) => (
                <div key={item.label}>
                  <label className="text-[10px] text-zinc-500 block mb-1">{item.label}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={item.value}
                    onChange={(e) => item.setter(e.target.value)}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-2.5 text-xs text-white text-center focus:border-[#D4FF00] outline-none"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={handleSaveMeasures}
              className="w-full py-3 bg-[#D4FF00] text-[#09090B] font-bold rounded-xl text-xs uppercase tracking-wider active:scale-95 transition-all"
            >
              Guardar Medidas
            </button>
          </div>
        ) : (
          <button
            onClick={openMeasureForm}
            className="w-full bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3.5 flex items-center justify-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-all active:scale-[0.99]"
          >
            <Ruler size={15} className="text-[#D4FF00]" />
            {measuresHistory && measuresHistory.length > 0 ? 'Actualizar medidas corporales' : 'Registrar medidas corporales'}
          </button>
        )}
      </div>

      {/* Contenedor de Gráficas y Métricas */}
      <div className="px-5 space-y-5">
        
        {loading ? (
          <div className="py-12 text-center text-xs font-mono text-zinc-500">Cargando métricas...</div>
        ) : (
          <>
            {/* ========== MEJORES MARCAS PERSONALES & 1RM ESTIMADO ========== */}
            {topExercises.length > 0 && (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-[2rem] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award size={16} className="text-[#D4FF00]" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">
                      Récords y 1RM Estimado
                    </h3>
                  </div>
                  <span className="text-[10px] text-[#D4FF00] font-mono font-bold">Top levantamientos</span>
                </div>

                <div className="space-y-2.5">
                  {topExercises.map((ex, idx) => {
                    const isExpanded = expandedPrIndex === idx;
                    const max = ex.oneRepMax;

                    return (
                      <div
                        key={idx}
                        className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-3.5 hover:border-white/[0.08] transition-all cursor-pointer"
                        onClick={() => setExpandedPrIndex(isExpanded ? null : idx)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className="w-8 h-8 rounded-xl bg-[#D4FF00]/10 border border-[#D4FF00]/25 text-[#D4FF00] flex items-center justify-center shrink-0">
                              <Dumbbell size={14} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">{ex.name}</p>
                              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                Mejor serie: {ex.weight} kg × {ex.reps} reps
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">1RM Estimado</span>
                              <span className="text-xs font-black text-[#D4FF00] font-mono">{max} kg</span>
                            </div>
                            {isExpanded ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
                          </div>
                        </div>

                        {/* Desglose de porcentajes al expandir */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-white/[0.04] grid grid-cols-4 gap-1.5 text-center font-mono text-[10px] animate-fade-in">
                            <div className="bg-black/40 p-2 rounded-xl border border-white/[0.04]">
                              <span className="text-[#D4FF00] font-bold block">95%</span>
                              <span className="text-white font-bold">{Math.round(max * 0.95)}kg</span>
                              <span className="text-zinc-500 text-[8px] block mt-0.5">1-2 reps</span>
                            </div>
                            <div className="bg-black/40 p-2 rounded-xl border border-white/[0.04]">
                              <span className="text-blue-400 font-bold block">85%</span>
                              <span className="text-white font-bold">{Math.round(max * 0.85)}kg</span>
                              <span className="text-zinc-500 text-[8px] block mt-0.5">5-6 reps</span>
                            </div>
                            <div className="bg-black/40 p-2 rounded-xl border border-white/[0.04]">
                              <span className="text-purple-400 font-bold block">75%</span>
                              <span className="text-white font-bold">{Math.round(max * 0.75)}kg</span>
                              <span className="text-zinc-500 text-[8px] block mt-0.5">8-10 reps</span>
                            </div>
                            <div className="bg-black/40 p-2 rounded-xl border border-white/[0.04]">
                              <span className="text-amber-400 font-bold block">65%</span>
                              <span className="text-white font-bold">{Math.round(max * 0.65)}kg</span>
                              <span className="text-zinc-500 text-[8px] block mt-0.5">12-15 reps</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Gráfica de Volumen Semanal */}
            {weeklyVolume.length > 0 && (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-[2rem] p-5">
                <h3 className="text-xs font-black uppercase tracking-wider text-white mb-4 text-center">
                  Volumen Semanal (kg)
                </h3>
                <LineChart data={weeklyVolume} maxValue={maxVolume} color="#D4FF00" width={320} height={130} />
              </div>
            )}

            {/* Gráfica de Frecuencia Semanal */}
            {weeklyFrequency.length > 0 && (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-[2rem] p-5">
                <h3 className="text-xs font-black uppercase tracking-wider text-white mb-4 text-center">
                  Días Entrenados por Semana
                </h3>
                <LineChart data={weeklyFrequency} maxValue={maxDays} color="#A78BFA" width={320} height={120} />
              </div>
            )}

            {/* Gráfica de Peso Corporal */}
            {weightLogs && weightLogs.length > 0 && (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-[2rem] p-5">
                <h3 className="text-xs font-black uppercase tracking-wider text-white mb-4 text-center">
                  Evolución de Peso Corporal (kg)
                </h3>
                {weightData.length > 1 ? (
                  <LineChart data={weightData} maxValue={maxWeight} color="#F472B6" width={320} height={130} />
                ) : (
                  <div className="text-center py-4">
                    <p className="text-2xl font-black text-white">{weightData[0]?.value} kg</p>
                    <p className="text-xs text-zinc-500 mt-1">Registra otro pesaje para trazar la gráfica</p>
                  </div>
                )}
              </div>
            )}

            {/* Gráfica de Medidas Corporales */}
            {measuresHistory && measuresHistory.length > 0 && (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-[2rem] p-5 space-y-5">
                <h3 className="text-xs font-black uppercase tracking-wider text-white text-center">
                  Medidas Corporales (cm)
                </h3>
                {measuresData.filter(m => m.data.length > 0).map(measure => (
                  <div key={measure.key} className="space-y-1">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">{measure.label}</p>
                    {measure.data.length > 1 ? (
                      <LineChart data={measure.data} maxValue={measure.maxVal} color={measure.color} width={320} height={100} />
                    ) : (
                      <p className="text-center text-sm font-bold text-white py-1">{measure.data[0]?.value} cm</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}