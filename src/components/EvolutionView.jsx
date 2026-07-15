import React, { useState, useEffect } from 'react';
import { TrendingUp, Award, Calendar, Dumbbell, Ruler, Weight, Image as ImageIcon } from 'lucide-react';
import { MONTHS } from '../utils/gymHelpers';
import useWeightLogs from '../hooks/useWeightLogs';
import useBodyMeasures from '../hooks/useBodyMeasures';
import ProgressPhotos from './ProgressPhotos';

// Componente LineChart con colores y tipografía refinados (lógica interna intacta)
const LineChart = ({ data, maxValue, color, unit = '', width = 300, height = 120 }) => {
  if (data.length === 0) return null;
  const padding = { top: 20, right: 10, bottom: 20, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const effectiveMax = data.length === 1 ? data[0].value * 1.2 : maxValue;
  const points = data.map((item, idx) => ({
    x: padding.left + (idx / Math.max(data.length - 1, 1)) * chartWidth,
    y: padding.top + chartHeight - (item.value / effectiveMax) * chartHeight,
    ...item
  }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="flex justify-center">
      <svg width={width} height={height} className="overflow-visible">
        {data.length > 1 && <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
        {points.map((point, idx) => (
          <g key={idx}>
            <circle cx={point.x} cy={point.y} r="4" fill="#09090B" stroke={color} strokeWidth="2" />
            <text x={point.x} y={point.y - 8} textAnchor="middle" fill="#A1A1AA" fontSize="9" fontWeight="500">{point.value}{unit}</text>
            <text x={point.x} y={height - 4} textAnchor="middle" fill="#52525B" fontSize="8">{point.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
};

// Helpers de semana (sin cambios)
function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return weekNo;
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
  // Estados (intactos)
  const [weightInput, setWeightInput] = useState('');
  const [showMeasureForm, setShowMeasureForm] = useState(false);
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');
  const [arms, setArms] = useState('');
  const [thighs, setThighs] = useState('');

  const [showPhotos, setShowPhotos] = useState(false);

  const { logs: weightLogs, addLog } = useWeightLogs(activeProfile.id);
  const { measures, history: measuresHistory, saveMeasures } = useBodyMeasures(activeProfile.id);

  // Datos de peso (intactos)
  const weightData = weightLogs.slice(-30).map(entry => ({
    label: `${new Date(entry.date).getDate()}/${new Date(entry.date).getMonth() + 1}`,
    value: entry.weight
  }));
  const maxWeight = Math.max(...weightData.map(w => w.value), 1);

  // Datos de medidas (intactos)
  const measuresKeys = ['chest', 'waist', 'hips', 'arms', 'thighs'];
  const measuresColors = { chest: '#F472B6', waist: '#60A5FA', hips: '#C084FC', arms: '#34D399', thighs: '#FBBF24' };
  const measuresLabels = { chest: 'Pecho', waist: 'Cintura', hips: 'Cadera', arms: 'Brazos', thighs: 'Muslos' };

  const measuresData = measuresKeys.map(key => {
    const data = measuresHistory
      .filter(entry => entry[key] != null)
      .slice(-30)
      .map(entry => ({
        label: `${new Date(entry.date).getDate()}/${new Date(entry.date).getMonth() + 1}`,
        value: parseFloat(entry[key])
      }));
    const maxVal = Math.max(...data.map(d => d.value), 1);
    return { key, data, maxVal, color: measuresColors[key], label: measuresLabels[key] };
  });

  // Cálculo de volumen y frecuencia (intacto)
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

        const volume = session.exercises.reduce((sum, ex) =>
          sum + ex.sets.reduce((s, set) => s + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0), 0);
        byWeek[keyWeek].volume += volume;
        byWeek[keyWeek].days.add(d.getDate());

        session.exercises.forEach(ex => {
          const exKey = ex.libraryExerciseId || ex.id;
          ex.sets.forEach(set => {
            const w = parseFloat(set.weight), r = parseInt(set.reps);
            if (isNaN(w) || isNaN(r)) return;
            if (!exerciseRecords[exKey] || w > exerciseRecords[exKey].weight ||
                (w === exerciseRecords[exKey].weight && r > exerciseRecords[exKey].reps)) {
              exerciseRecords[exKey] = { name: ex.name, weight: w, reps: r };
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

      setWeeklyVolume(sortedWeeks.map(([_, data]) => ({ label: data.displayLabel, value: data.volume })));
      setWeeklyFrequency(sortedWeeks.map(([_, data]) => ({ label: data.displayLabel, value: data.days.size })));

      const top = Object.values(exerciseRecords)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 5);
      setTopExercises(top);

      setLoading(false);
    };
    loadData();
  }, [activeProfile.id]);

  const maxVolume = Math.max(...weeklyVolume.map(m => m.value), 1);
  const maxDays = Math.max(...weeklyFrequency.map(m => m.value), 1);

  // Funciones de guardado (intactas)
  const handleAddWeight = () => {
    if (weightInput && parseFloat(weightInput) > 0) {
      addLog(weightInput);
      setWeightInput('');
    }
  };

  const handleSaveMeasures = () => {
    saveMeasures({
      chest: parseFloat(chest) || measures.chest || null,
      waist: parseFloat(waist) || measures.waist || null,
      hips: parseFloat(hips) || measures.hips || null,
      arms: parseFloat(arms) || measures.arms || null,
      thighs: parseFloat(thighs) || measures.thighs || null,
    });
    setChest(''); setWaist(''); setHips(''); setArms(''); setThighs('');
    setShowMeasureForm(false);
  };

  const openMeasureForm = () => {
    setChest(measures.chest?.toString() || '');
    setWaist(measures.waist?.toString() || '');
    setHips(measures.hips?.toString() || '');
    setArms(measures.arms?.toString() || '');
    setThighs(measures.thighs?.toString() || '');
    setShowMeasureForm(true);
  };

  if (showPhotos) {
    return <ProgressPhotos activeProfile={activeProfile} onBack={() => setShowPhotos(false)} />;
  }

  return (
    <div className="flex-1 flex flex-col animate-fade-in safe-top safe-bottom bg-[#09090B] relative">
      {/* Fondo ambiental sutil */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4FF00]/[0.02] rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 mb-4 relative z-10">
        <h2 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
          <TrendingUp size={22} className="text-[#D4FF00]" />
          Evolución
        </h2>
        <button
          onClick={() => setShowPhotos(true)}
          className="p-2.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white active:scale-95 transition-all"
          aria-label="Fotos de progreso"
        >
          <ImageIcon size={18} />
        </button>
      </div>

      {/* Formulario de peso */}
      <div className="px-5 mb-4 relative z-10">
        <div className="bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-2xl p-4 flex items-center gap-3">
          <Weight size={18} className="text-[#D4FF00] flex-shrink-0" />
          <input
            type="number"
            step="0.1"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            placeholder="Peso (kg)"
            className="flex-1 bg-[#09090B] border border-white/[0.08] rounded-xl px-3 py-3 text-sm text-white placeholder-zinc-600 focus:border-[#D4FF00]/40 outline-none"
          />
          <button
            onClick={handleAddWeight}
            disabled={!weightInput}
            className="px-4 py-3 bg-[#D4FF00] text-[#09090B] font-bold rounded-xl text-sm active:scale-95 disabled:opacity-30 disabled:pointer-events-none shadow-lg shadow-[#D4FF00]/10 transition-all flex-shrink-0"
          >
            Guardar
          </button>
        </div>
      </div>

      {/* Formulario de medidas */}
      <div className="px-5 mb-4 relative z-10">
        {showMeasureForm ? (
          <div className="bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white flex items-center gap-2">
                <Ruler size={16} className="text-[#D4FF00]" /> Medidas (cm)
              </span>
              <button onClick={() => setShowMeasureForm(false)} className="text-xs text-zinc-400 hover:text-white transition-colors">
                Cancelar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Pecho', value: chest, setter: setChest },
                { label: 'Cintura', value: waist, setter: setWaist },
                { label: 'Cadera', value: hips, setter: setHips },
                { label: 'Brazos', value: arms, setter: setArms },
                { label: 'Muslos', value: thighs, setter: setThighs },
              ].map((item) => (
                <div key={item.label}>
                  <label className="text-[11px] text-zinc-500 mb-1 block">{item.label}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={item.value}
                    onChange={(e) => item.setter(e.target.value)}
                    className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3 text-sm text-white text-center focus:border-[#D4FF00]/40 outline-none"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={handleSaveMeasures}
              className="w-full py-3.5 bg-[#D4FF00] text-[#09090B] font-bold rounded-xl text-sm active:scale-[0.98] transition-all shadow-lg shadow-[#D4FF00]/10"
            >
              Guardar medidas
            </button>
          </div>
        ) : (
          <button
            onClick={openMeasureForm}
            className="w-full bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-2xl p-4 flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors active:scale-[0.98]"
          >
            <Ruler size={16} className="text-[#D4FF00]" />
            {measuresHistory.length > 0 ? 'Actualizar medidas corporales' : 'Registrar medidas corporales'}
          </button>
        )}
      </div>

      {/* Contenido gráfico con scroll */}
      <div className="flex-1 overflow-y-auto px-5 pb-safe space-y-6 relative z-10">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-zinc-500 text-sm">Cargando...</div>
        ) : weeklyVolume.length === 0 && weightLogs.length === 0 && measuresHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-4">
            <Calendar size={48} className="text-zinc-700" />
            <p className="text-sm">No hay datos todavía</p>
            <p className="text-xs text-zinc-600 max-w-[250px] text-center leading-relaxed">
              Registra tu peso, medidas o entrenamientos para visualizar tu progreso.
            </p>
          </div>
        ) : (
          <>
            {/* Volumen semanal */}
            {weeklyVolume.length > 0 && (
              <div className="bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-2xl p-5 animate-fade-in-up">
                <h3 className="text-[11px] font-semibold text-zinc-400 mb-5 text-center uppercase tracking-wider">
                  Volumen semanal (kg)
                </h3>
                <LineChart data={weeklyVolume} maxValue={maxVolume} color="#D4FF00" width={320} height={140} />
              </div>
            )}

            {/* Frecuencia semanal */}
            {weeklyFrequency.length > 0 && (
              <div className="bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-2xl p-5 animate-fade-in-up">
                <h3 className="text-[11px] font-semibold text-zinc-400 mb-5 text-center uppercase tracking-wider">
                  Días entrenados por semana
                </h3>
                <LineChart data={weeklyFrequency} maxValue={maxDays} color="#A78BFA" width={320} height={120} />
              </div>
            )}

            {/* Peso corporal */}
            {weightLogs.length > 0 && (
              <div className="bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-2xl p-5 animate-fade-in-up">
                <h3 className="text-[11px] font-semibold text-zinc-400 mb-5 text-center uppercase tracking-wider">
                  Peso corporal (kg)
                </h3>
                {weightData.length > 1 ? (
                  <LineChart data={weightData} maxValue={maxWeight} color="#F472B6" width={320} height={140} />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-2xl font-bold text-white">{weightData[0].value} kg</p>
                    <p className="text-xs text-zinc-500">{weightData[0].label}</p>
                    <p className="text-[10px] text-zinc-600">Añade otro registro para ver la gráfica</p>
                  </div>
                )}
              </div>
            )}

            {/* Medidas corporales */}
            {measuresHistory.length > 0 && (
              <div className="bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-2xl p-5 animate-fade-in-up">
                <h3 className="text-[11px] font-semibold text-zinc-400 mb-5 text-center uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <Ruler size={14} className="text-[#D4FF00]" /> Medidas corporales (cm)
                </h3>
                <div className="space-y-6">
                  {measuresData.filter(m => m.data.length > 0).map(measure => (
                    <div key={measure.key}>
                      <p className="text-[10px] text-zinc-500 mb-2 text-center uppercase tracking-wider">{measure.label}</p>
                      {measure.data.length > 1 ? (
                        <LineChart data={measure.data} maxValue={measure.maxVal} color={measure.color} width={320} height={100} />
                      ) : (
                        <div className="text-center text-sm text-white">{measure.data[0].value} cm</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mejores marcas personales */}
            {topExercises.length > 0 && (
              <div className="bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-2xl p-5 animate-fade-in-up">
                <h3 className="text-[11px] font-semibold text-zinc-400 mb-5 text-center uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <Award size={14} className="text-[#D4FF00]" /> Mejores marcas personales
                </h3>
                <div className="space-y-2">
                  {topExercises.map((ex, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white/[0.03] border border-white/[0.04] rounded-xl p-3">
                      <div className="flex items-center gap-3">
                        <Dumbbell size={14} className="text-zinc-500" />
                        <span className="text-sm font-medium text-white">{ex.name}</span>
                      </div>
                      <span className="text-xs font-bold text-[#D4FF00] tabular-nums">{ex.weight} kg × {ex.reps}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(12px); filter: blur(4px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
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