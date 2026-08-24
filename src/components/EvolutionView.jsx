// src/components/EvolutionView.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  TrendingUp, Award, Weight, Ruler, Dumbbell, 
  Image as ImageIcon, Calculator, Zap, ChevronDown, ChevronUp, 
  Flame, Activity
} from 'lucide-react';
import useWeightLogs from '../hooks/useWeightLogs';
import useBodyMeasures from '../hooks/useBodyMeasures';
import ProgressPhotos from './ProgressPhotos';

export const calculate1RM = (weight, reps) => {
  const w = parseFloat(weight) || 0;
  const r = parseInt(reps) || 0;
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return w;
  const epley = w * (1 + r / 30);
  const brzycki = r < 37 ? w * (36 / (37 - r)) : epley;
  return parseFloat(((epley + brzycki) / 2).toFixed(1));
};

// =========================================================================
// GRÁFICA TÁCTIL INTERACTIVA (SIN COLISIÓN DE TEXTO)
// =========================================================================
const InteractiveLineChart = ({ data, color, unit = '', height = 130 }) => {
  const [activeIndex, setActiveIndex] = useState(null);
  const svgRef = useRef(null);

  if (!data || data.length === 0) return null;

  const validData = data
    .filter(item => typeof item.value === 'number' && !isNaN(item.value))
    .map(item => ({ ...item, value: Math.max(0, item.value) }));

  if (validData.length === 0) return null;

  const width = 320;
  const padding = { top: 20, right: 15, bottom: 25, left: 15 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const minVal = Math.min(...validData.map(d => d.value));
  const maxVal = Math.max(...validData.map(d => d.value));
  const range = maxVal - minVal || 1;

  const points = validData.map((item, idx) => ({
    x: padding.left + (idx / Math.max(validData.length - 1, 1)) * chartWidth,
    y: padding.top + chartHeight - ((item.value - minVal) / range) * chartHeight,
    ...item
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const handleTouch = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const touchX = ((clientX - rect.left) / rect.width) * width;

    let closestIdx = 0;
    let minDist = Infinity;
    points.forEach((p, idx) => {
      const dist = Math.abs(p.x - touchX);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = idx;
      }
    });

    setActiveIndex(closestIdx);
  };

  const selectedPoint = activeIndex !== null ? points[activeIndex] : points[points.length - 1];

  return (
    <div className="flex flex-col items-center select-none">
      <div className="flex items-center justify-between w-full px-2 mb-1 text-[10px] font-mono">
        <span className="text-zinc-500">Fecha: <strong className="text-zinc-300">{selectedPoint?.label || '—'}</strong></span>
        <span className="text-zinc-500">Valor: <strong className="text-white text-xs font-black">{selectedPoint?.value}{unit}</strong></span>
      </div>

      <div 
        className="w-full flex justify-center touch-none py-1"
        onTouchMove={handleTouch}
        onTouchStart={handleTouch}
        onMouseMove={handleTouch}
        onMouseLeave={() => setActiveIndex(null)}
      >
        <svg ref={svgRef} width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible max-w-[340px]">
          {selectedPoint && (
            <line
              x1={selectedPoint.x}
              y1={padding.top}
              x2={selectedPoint.x}
              y2={height - padding.bottom}
              stroke="rgba(255,255,255,0.15)"
              strokeDasharray="3 3"
            />
          )}

          {validData.length > 1 && (
            <path 
              d={pathD} 
              fill="none" 
              stroke={color} 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              style={{ filter: `drop-shadow(0 0 8px ${color}60)` }}
            />
          )}

          {points.map((point, idx) => {
            const isSelected = point === selectedPoint;
            return (
              <circle
                key={idx}
                cx={point.x}
                cy={point.y}
                r={isSelected ? "5.5" : "3"}
                fill={isSelected ? color : "#050507"}
                stroke={color}
                strokeWidth={isSelected ? "2" : "1.5"}
                className="transition-all duration-150"
              />
            );
          })}

          <text x={padding.left} y={height - 5} textAnchor="start" fill="#71717A" fontSize="8" fontWeight="700" fontFamily="monospace">
            {points[0]?.label}
          </text>
          <text x={width - padding.right} y={height - 5} textAnchor="end" fill="#71717A" fontSize="8" fontWeight="700" fontFamily="monospace">
            {points[points.length - 1]?.label}
          </text>
        </svg>
      </div>
    </div>
  );
};

export default function EvolutionView({ activeProfile }) {
  const [weightInput, setWeightInput] = useState('');
  const [showMeasureForm, setShowMeasureForm] = useState(false);
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');
  const [arms, setArms] = useState('');
  const [thighs, setThighs] = useState('');
  const [showPhotos, setShowPhotos] = useState(false);

  const [calcWeight, setCalcWeight] = useState('');
  const [calcReps, setCalcReps] = useState('');
  const [showInteractiveCalc, setShowInteractiveCalc] = useState(false);

  const { logs: weightLogs, addLog } = useWeightLogs(activeProfile.id);
  const { measures, history: measuresHistory, saveMeasures } = useBodyMeasures(activeProfile.id);

  const [topExercises, setTopExercises] = useState([]);
  const [muscleDistribution, setMuscleDistribution] = useState({});
  const [loading, setLoading] = useState(true);

  const weightData = useMemo(() => {
    return (weightLogs || [])
      .slice(-30)
      .map(entry => ({
        label: `${new Date(entry.date).getDate()}/${new Date(entry.date).getMonth() + 1}`,
        value: parseFloat(entry.weight)
      }))
      .filter(item => typeof item.value === 'number' && !isNaN(item.value));
  }, [weightLogs]);

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

      const exerciseRecords = {};
      const muscleSets = { Pecho: 0, Espalda: 0, Pierna: 0, Hombro: 0, Brazo: 0, Abdomen: 0 };
      const sevenDaysAgo = Date.now() - 7 * 86400000;

      allSessions.forEach(session => {
        const isRecent = new Date(session.date).getTime() >= sevenDaysAgo;

        (session.exercises || []).forEach(ex => {
          const exKey = ex.libraryExerciseId || ex.id;
          const muscleName = (ex.muscle || '').toLowerCase();

          (ex.sets || []).forEach(set => {
            const w = parseFloat(set.weight) || 0;
            const r = parseInt(set.reps) || 0;
            if (w > 0 && r > 0) {
              const estimated1RM = calculate1RM(w, r);
              if (!exerciseRecords[exKey] || estimated1RM > exerciseRecords[exKey].oneRepMax) {
                exerciseRecords[exKey] = { name: ex.name, weight: w, reps: r, oneRepMax: estimated1RM };
              }
            }

            if (isRecent && set.done) {
              if (muscleName.includes('pecho')) muscleSets.Pecho += 1;
              else if (muscleName.includes('espalda')) muscleSets.Espalda += 1;
              else if (muscleName.includes('pierna') || muscleName.includes('cuádriceps') || muscleName.includes('femoral') || muscleName.includes('glúteo')) muscleSets.Pierna += 1;
              else if (muscleName.includes('hombro')) muscleSets.Hombro += 1;
              else if (muscleName.includes('bíceps') || muscleName.includes('tríceps') || muscleName.includes('brazo')) muscleSets.Brazo += 1;
              else muscleSets.Abdomen += 1;
            }
          });
        });
      });

      setMuscleDistribution(muscleSets);
      const top = Object.values(exerciseRecords).sort((a, b) => b.oneRepMax - a.oneRepMax).slice(0, 8);
      setTopExercises(top);
      setLoading(false);
    };

    loadData();
  }, [activeProfile.id]);

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
    saveMeasures(parsed);
    setShowMeasureForm(false);
  };

  if (showPhotos) {
    return <ProgressPhotos activeProfile={activeProfile} onBack={() => setShowPhotos(false)} />;
  }

  return (
    <div className="flex-1 flex flex-col animate-fade-in bg-[#09090B] pb-40 no-scrollbar select-none">
      
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
          >
            <Calculator size={17} />
          </button>
          
          <button
            onClick={() => setShowPhotos(true)}
            className="p-2.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-zinc-400 hover:text-white active:scale-95 transition-all"
          >
            <ImageIcon size={17} />
          </button>
        </div>
      </div>

      {/* Gráfica de Peso Corporal */}
      {weightData.length > 0 && (
        <div className="px-5 mb-5 shrink-0">
          <div className="luxury-card p-5">
            <h3 className="text-xs font-black uppercase tracking-wider text-white mb-3 text-center">
              Tendencia de Peso Corporal
            </h3>
            <InteractiveLineChart data={weightData} color="#D4FF00" unit=" kg" height={130} />
          </div>
        </div>
      )}

      {/* Mapa de Volumen Muscular */}
      <div className="px-5 mb-5 shrink-0">
        <div className="luxury-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-[#D4FF00]" />
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Series Efectivas esta Semana
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#D4FF00] font-bold">Últimos 7 días</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            {Object.entries(muscleDistribution).map(([muscle, count]) => {
              const isOptimal = count >= 10;
              const isLow = count > 0 && count < 6;

              return (
                <div key={muscle} className="bg-black/60 border border-white/[0.05] p-2.5 rounded-xl">
                  <span className="text-[10px] text-zinc-400 uppercase block">{muscle}</span>
                  <span className="text-sm font-black text-white">{count} <span className="text-[9px] text-zinc-500">series</span></span>
                  <span className={`text-[8px] font-bold uppercase block mt-0.5 ${
                    isOptimal ? 'text-[#D4FF00]' : isLow ? 'text-amber-400' : 'text-zinc-600'
                  }`}>
                    {isOptimal ? 'ÓPTIMO' : isLow ? 'BAJO' : count === 0 ? 'SIN SERIES' : 'MEDIO'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Formulario rápido de peso */}
      <div className="px-5 mb-4 shrink-0">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3.5 flex items-center gap-3">
          <Weight size={18} className="text-[#D4FF00]" />
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            placeholder="Registrar peso de hoy (kg)"
            className="flex-1 bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-[#D4FF00] outline-none"
          />
          <button
            onClick={handleAddWeight}
            disabled={!weightInput}
            className="px-4 py-2.5 volt-button rounded-xl text-xs font-black uppercase tracking-wider active:scale-95 disabled:opacity-30 transition-all shrink-0"
          >
            Guardar
          </button>
        </div>
      </div>

      {/* Récords Personales (1RM) */}
      <div className="px-5 space-y-4">
        {topExercises.length > 0 && (
          <div className="luxury-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award size={16} className="text-[#D4FF00]" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  Récords y 1RM Estimado
                </h3>
              </div>
              <span className="text-[10px] text-[#D4FF00] font-mono font-bold">Top levantamientos</span>
            </div>

            <div className="space-y-2">
              {topExercises.map((ex, idx) => (
                <div key={idx} className="bg-black/60 border border-white/[0.04] p-3 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white truncate max-w-[170px]">{ex.name}</p>
                    <p className="text-[10px] text-zinc-500 font-mono">Mejor serie: {ex.weight}kg × {ex.reps} reps</p>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-[9px] text-zinc-400 block uppercase">1RM</span>
                    <span className="text-xs font-black text-[#D4FF00]">{ex.oneRepMax} kg</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}