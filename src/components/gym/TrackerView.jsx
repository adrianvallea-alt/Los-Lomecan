// src/components/gym/TrackerView.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { 
  Check, Award, Info, Timer, Pause, Play, ChevronDown, ChevronUp, 
  Plus, Minus, Copy, Volume2, VolumeX, Sparkles, 
  Disc, Flame, X, Trophy, AlertTriangle
} from 'lucide-react';
import ExerciseDetailModal from './ExerciseDetailModal';
import { fetchAllExercises } from '../../lib/dataService';

const playBeep = (freq = 880, duration = 0.45) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
};

const triggerHaptic = (pattern = 25) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch (e) {}
  }
};

const ConfettiCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#D4FF00', '#00F5FF', '#FF2A55', '#B347FF', '#FFFFFF', '#FFD700'];
    const particles = Array.from({ length: 90 }, () => ({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.7) * 16,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      opacity: 1,
    }));

    let animationId;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35;
        p.opacity -= 0.012;
        p.rotation += p.rotationSpeed;

        if (p.opacity > 0) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      if (particles.some((p) => p.opacity > 0)) {
        animationId = requestAnimationFrame(render);
      }
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[250]" />;
};

export default function TrackerView({
  routineData,
  activeRoutine,
  activeDayIndex,
  lastSession,
  lastGlobalSets,
  personalRecords,
  dayRecords,
  onFinish,
  onGoBack
}) {
  const [exercises, setExercises] = useState(() => {
    return routineData.exercises.map(ex => ({
      ...ex,
      sets: ex.sets.map((s, idx) => ({
        ...s,
        setNum: s.setNum || idx + 1,
        rir: s.rir ?? 2,
        repsDone: s.repsDone || (s.done ? (s.reps || '') : '')
      }))
    }));
  });

  const [expandedId, setExpandedId] = useState(null);
  const [restTimer, setRestTimer] = useState({ active: false, seconds: 90, running: false, totalSeconds: 90 });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [detailExercise, setDetailExercise] = useState(null);
  const [libraryExercises, setLibraryExercises] = useState([]);

  const [plateCalcTarget, setPlateCalcTarget] = useState(null);
  const [warmupTarget, setWarmupTarget] = useState(null);
  const [newPrCelebration, setNewPrCelebration] = useState(null);

  const timerRef = useRef(null);
  const exerciseRefs = useRef({});
  const DRAFT_KEY = `draft_${activeRoutine.id}_${activeDayIndex}`;

  // Screen Wake Lock API
  useEffect(() => {
    let wakeLock = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {}
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (wakeLock !== null) {
        wakeLock.release().catch(() => {});
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    fetchAllExercises()
      .then(data => setLibraryExercises(data || []))
      .catch(err => console.warn('Error cargando ejercicios:', err));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setExercises(parsed.map(ex => ({
            ...ex,
            sets: ex.sets.map((s, idx) => ({
              ...s,
              setNum: s.setNum || idx + 1,
              rir: s.rir ?? 2
            }))
          })));
        }
      } catch (e) {}
    }
  }, [DRAFT_KEY]);

  useEffect(() => {
    const firstIncomplete = exercises.find(ex => ex.sets.some(s => !s.done));
    if (firstIncomplete) {
      setExpandedId(firstIncomplete.id);
    } else if (exercises[0]) {
      setExpandedId(exercises[0].id);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(exercises));
    }, 500);
    return () => clearTimeout(timer);
  }, [exercises, DRAFT_KEY]);

  useEffect(() => {
    if (restTimer.running && restTimer.seconds > 0) {
      timerRef.current = setInterval(() => {
        setRestTimer(prev => {
          if (prev.seconds <= 1) {
            clearInterval(timerRef.current);
            triggerHaptic([100, 50, 100, 50, 200]);
            if (soundEnabled) {
              playBeep(980, 0.2);
              setTimeout(() => playBeep(1200, 0.4), 220);
            }
            return { ...prev, seconds: 0, running: false, active: true };
          }
          return { ...prev, seconds: prev.seconds - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [restTimer.running, soundEnabled]);

  const toggleSetDone = (exerciseId, setId) => {
    let wasCompleted = false;
    let completedExName = '';
    let completedWeight = 0;
    let completedReps = 0;

    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s, idx) => {
          if (s.id !== setId) return s;
          const nextDone = !s.done;
          wasCompleted = nextDone;
          completedExName = ex.name;
          completedWeight = parseFloat(s.weight) || 0;
          completedReps = parseInt(s.repsDone || s.reps) || 0;
          return {
            ...s,
            setNum: s.setNum || idx + 1,
            done: nextDone,
            repsDone: nextDone && !s.repsDone ? (s.reps || '10') : s.repsDone
          };
        })
      };
    }));

    if (wasCompleted) {
      triggerHaptic(45);
      setRestTimer({ active: true, seconds: 90, running: true, totalSeconds: 90 });

      const ex = exercises.find(e => e.id === exerciseId);
      const exKey = ex?.libraryExerciseId || ex?.id;
      const currentPrWeight = personalRecords?.[exKey]?.weight || 0;

      if (completedWeight > currentPrWeight && completedWeight > 0 && completedReps > 0) {
        triggerHaptic([100, 50, 100, 50, 200, 80, 250]);
        if (soundEnabled) {
          playBeep(523.25, 0.15);
          setTimeout(() => playBeep(659.25, 0.15), 150);
          setTimeout(() => playBeep(783.99, 0.35), 300);
        }
        setNewPrCelebration({
          exerciseName: completedExName,
          weight: completedWeight,
          reps: completedReps,
          prevWeight: currentPrWeight
        });
      }
    }
  };

  const handleWeightStep = (exerciseId, setId, delta) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        sets: ex.sets.map(s => {
          if (s.id !== setId) return s;
          const current = parseFloat(s.weight) || 0;
          const next = Math.max(0, parseFloat((current + delta).toFixed(1)));
          return { ...s, weight: next.toString() };
        })
      };
    }));
    triggerHaptic(15);
  };

  const handleRepsStep = (exerciseId, setId, delta) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        sets: ex.sets.map(s => {
          if (s.id !== setId) return s;
          const baseVal = s.repsDone !== '' ? s.repsDone : (s.reps || '10');
          const current = parseInt(baseVal) || 0;
          const next = Math.max(0, current + delta);
          return { ...s, repsDone: next.toString() };
        })
      };
    }));
    triggerHaptic(15);
  };

  const copyFromPreviousSet = (exerciseId, setIndex) => {
    if (setIndex === 0) return;
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      const prevSet = ex.sets[setIndex - 1];
      return {
        ...ex,
        sets: ex.sets.map((s, idx) => {
          if (idx !== setIndex) return s;
          return {
            ...s,
            weight: prevSet.weight || s.weight,
            repsDone: prevSet.repsDone || prevSet.reps || s.repsDone,
            rir: prevSet.rir ?? s.rir
          };
        })
      };
    }));
    triggerHaptic(25);
  };

  const updateSetInput = (exerciseId, setId, field, value) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        sets: ex.sets.map(s => s.id === setId ? { ...s, [field]: value } : s)
      };
    }));
  };

  const handleFinish = () => {
    const completedExercises = exercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      libraryExerciseId: ex.libraryExerciseId,
      sets: ex.sets.map((s, idx) => ({
        setNum: s.setNum || idx + 1,
        weight: s.weight || '',
        reps: s.repsDone || s.reps || '',
        rir: s.rir ?? 2,
        done: Boolean(s.done)
      }))
    }));

    const session = {
      date: new Date().toISOString(),
      routineId: activeRoutine.id,
      dayIndex: activeDayIndex,
      exercises: completedExercises
    };

    localStorage.removeItem(DRAFT_KEY);
    triggerHaptic([60, 40, 100]);
    onFinish(session);
  };

  const dayName = routineData.trainingDays[activeDayIndex]?.name || `Día ${activeDayIndex + 1}`;

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const totalVolume = useMemo(() => {
    return exercises.reduce((sum, ex) =>
      sum + ex.sets.reduce((s, set) => {
        if (!set.done) return s;
        const w = parseFloat(set.weight) || 0;
        const r = parseInt(set.repsDone || set.reps) || 0;
        return s + (w * r);
      }, 0), 0);
  }, [exercises]);

  const toggleExpand = (id) => {
    const nextId = expandedId === id ? null : id;
    setExpandedId(nextId);
    if (nextId) {
      setTimeout(() => {
        exerciseRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[100] bg-[#050507] flex flex-col h-[100dvh] w-full select-none overflow-hidden animate-fade-in">
      
      {/* Confeti al batir récord */}
      {newPrCelebration && <ConfettiCanvas />}

      {/* Modal Celebración de PR */}
      {newPrCelebration && (
        <div className="fixed inset-0 z-[260] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-scale-in">
          <div className="luxury-card p-6 max-w-xs w-full text-center space-y-4 border-[#D4FF00] shadow-[0_0_40px_rgba(212,255,0,0.3)]">
            <div className="w-16 h-16 rounded-3xl bg-[#D4FF00]/15 border-2 border-[#D4FF00] flex items-center justify-center mx-auto text-[#D4FF00] shadow-[0_0_25px_#D4FF00]">
              <Trophy size={32} />
            </div>
            <div>
              <span className="text-[10px] font-mono font-black text-[#D4FF00] uppercase tracking-[0.25em]">
                ¡NUEVO RÉCORD PERSONAL!
              </span>
              <h3 className="text-lg font-black text-white mt-1">{newPrCelebration.exerciseName}</h3>
            </div>
            <div className="bg-black/60 border border-white/[0.08] p-3.5 rounded-2xl">
              <p className="text-2xl font-black text-white font-mono">
                {newPrCelebration.weight} <span className="text-xs text-[#D4FF00]">KG</span> × {newPrCelebration.reps} <span className="text-xs text-zinc-400">REPS</span>
              </p>
              {newPrCelebration.prevWeight > 0 && (
                <p className="text-[10px] text-zinc-500 font-mono mt-1">
                  Superó récord anterior de {newPrCelebration.prevWeight} kg
                </p>
              )}
            </div>
            <button
              onClick={() => setNewPrCelebration(null)}
              className="w-full py-3.5 volt-button rounded-xl text-xs font-black uppercase tracking-wider active:scale-95"
            >
              ¡A SEGUIR ROMPIÉNDOLA!
            </button>
          </div>
        </div>
      )}

      {/* HUD de Descanso */}
      {restTimer.active && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-40 glass-dock-surface rounded-full px-5 py-2.5 flex items-center gap-3.5 shadow-[0_15px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(212,255,0,0.25)] animate-fade-in">
          <div className="flex items-center gap-2">
            <Timer size={16} className={`text-[#D4FF00] ${restTimer.running ? 'animate-pulse drop-shadow-[0_0_8px_#D4FF00]' : ''}`} />
            <span className="text-white font-mono font-black text-base tabular-nums tracking-tighter">
              {formatTime(restTimer.seconds)}
            </span>
          </div>
          <div className="h-4 w-[1px] bg-white/10" />
          <button
            onClick={() => {
              triggerHaptic(15);
              setRestTimer(prev => ({ ...prev, running: !prev.running }));
            }}
            className="p-1.5 rounded-full bg-white/[0.06] text-zinc-300 hover:text-white active:scale-90 transition-all"
          >
            {restTimer.running ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button
            onClick={() => {
              triggerHaptic(15);
              setSoundEnabled(!soundEnabled);
            }}
            className="p-1.5 rounded-full bg-white/[0.06] text-zinc-400 hover:text-[#D4FF00] transition-colors"
          >
            {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>
          <button
            onClick={() => {
              triggerHaptic(20);
              setRestTimer({ active: false, seconds: 90, running: false, totalSeconds: 90 });
            }}
            className="text-[10px] font-mono font-extrabold text-zinc-500 hover:text-rose-400 uppercase tracking-widest pl-1 transition-colors"
          >
            Omitir
          </button>
        </div>
      )}

      {/* Header Superior */}
      <div className="flex justify-between items-center px-5 pt-4 pb-2.5 shrink-0 bg-[#050507]/95 backdrop-blur-2xl z-10 border-b border-white/[0.05]">
        <div className="min-w-0 flex-1 pr-2">
          <div className="flex items-center gap-2">
            <span className="luxury-badge text-[8px] py-0.5 px-2">
              {activeRoutine.name}
            </span>
          </div>
          <h2 className="text-lg font-black text-white mt-1 tracking-tight truncate font-sans">{dayName}</h2>
        </div>

        <button
          onClick={() => {
            triggerHaptic(20);
            setShowExitConfirm(true);
          }}
          className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-zinc-400 border border-white/[0.08] bg-white/[0.02] rounded-full px-3.5 py-1.5 active:scale-95 transition-all hover:bg-white/[0.06] hover:text-white"
        >
          Salir
        </button>
      </div>

      {/* Ticker de Volumen */}
      <div className="px-5 py-2 shrink-0 bg-[#050507]">
        <div className="bg-[#0A0A0F] border border-white/[0.06] rounded-2xl px-4 py-2 flex justify-between items-center shadow-inner-light">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-[#D4FF00]/10 text-[#D4FF00]">
              <Sparkles size={13} />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">Volumen Acumulado</span>
          </div>
          <span className="text-[#D4FF00] font-mono font-black text-sm tabular-nums tracking-tight drop-shadow-[0_0_8px_rgba(212,255,0,0.4)]">
            {totalVolume.toLocaleString()} <span className="text-[10px] text-white">KG</span>
          </span>
        </div>
      </div>

      {/* ✅ LISTADO DE EJERCICIOS CON pb-44 PARA QUE NADA QUEDE OCULTO DETRÁS DEL FOOTER */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-44 space-y-3 touch-pan-y no-scrollbar">
        {exercises.map((ex, exIdx) => {
          const exKey = ex.libraryExerciseId || ex.id;
          const record = personalRecords?.[exKey];
          const completedSets = ex.sets.filter(s => s.done).length;
          const totalSets = ex.sets.length;
          const isAllCompleted = completedSets === totalSets && totalSets > 0;
          const isExpanded = expandedId === ex.id;
          const progressPercent = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
          const activeWeight = parseFloat(ex.sets[0]?.weight) || 0;

          return (
            <div
              key={ex.id}
              ref={el => (exerciseRefs.current[ex.id] = el)}
              className={`rounded-[1.75rem] border transition-all duration-300 overflow-hidden ${
                isAllCompleted
                  ? 'bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                  : isExpanded
                  ? 'luxury-card border-[#D4FF00]/35 shadow-[0_0_25px_rgba(212,255,0,0.1)]'
                  : 'bg-[#0A0A0F]/80 border-white/[0.06] hover:border-white/10'
              }`}
            >
              <div
                onClick={() => {
                  triggerHaptic(15);
                  toggleExpand(ex.id);
                }}
                className="w-full p-4 text-left flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-zinc-500">#{exIdx + 1}</span>
                    <h3 className="text-white font-extrabold text-sm truncate tracking-tight">{ex.name}</h3>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic(15);
                        const matched = libraryExercises.find(libEx => libEx.name?.toLowerCase() === ex.name?.toLowerCase()) ||
                                        libraryExercises.find(libEx => libEx.id === ex.libraryExerciseId);
                        setDetailExercise(matched ? { ...ex, ...matched } : ex);
                      }}
                      className="p-1 text-zinc-500 hover:text-[#D4FF00] rounded-full transition-colors"
                      title="Ver técnica"
                    >
                      <Info size={14} />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-zinc-500">
                    <span className="text-[#D4FF00] font-bold uppercase">{ex.muscle || 'EJERCICIO'}</span>
                    <span>·</span>
                    <span>{totalSets} SERIES</span>
                    
                    {record && (
                      <>
                        <span>·</span>
                        <span className="text-amber-300 font-bold flex items-center gap-0.5">
                          <Award size={10} className="text-amber-400" /> {record.weight}kg × {record.reps}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-mono font-black ${
                    isAllCompleted ? 'text-emerald-400 drop-shadow-[0_0_6px_#34D399]' : 'text-zinc-400'
                  }`}>
                    {completedSets}/{totalSets}
                  </span>

                  {isExpanded ? (
                    <ChevronUp size={16} className="text-zinc-400" />
                  ) : (
                    <ChevronDown size={16} className="text-zinc-500" />
                  )}
                </div>
              </div>

              <div className="px-4 pb-2">
                <div className="w-full bg-black/60 rounded-full h-1 overflow-hidden border border-white/[0.04]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      isAllCompleted ? 'bg-emerald-400 shadow-[0_0_8px_#34D399]' : 'bg-[#D4FF00] shadow-[0_0_8px_#D4FF00]'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 pb-4 pt-1.5 border-t border-white/[0.04] space-y-2.5 bg-black/30 animate-fade-in">
                  <div className="flex items-center justify-between gap-2 pt-1 pb-1">
                    <button
                      onClick={() => setPlateCalcTarget({ name: ex.name, weight: activeWeight || 60 })}
                      className="px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[10px] font-mono text-zinc-300 hover:text-[#D4FF00] hover:border-[#D4FF00]/40 flex items-center gap-1.5 transition-all"
                    >
                      <Disc size={12} className="text-[#D4FF00]" /> Discos en barra
                    </button>

                    <button
                      onClick={() => setWarmupTarget({ name: ex.name, weight: activeWeight || 80 })}
                      className="px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[10px] font-mono text-zinc-300 hover:text-amber-400 hover:border-amber-400/40 flex items-center gap-1.5 transition-all"
                    >
                      <Flame size={12} className="text-amber-400" /> Calentamiento
                    </button>
                  </div>

                  <div className="grid grid-cols-12 text-center text-[9px] font-mono font-black text-zinc-500 uppercase tracking-widest px-1">
                    <div className="col-span-2">SERIE</div>
                    <div className="col-span-4">PESO (KG)</div>
                    <div className="col-span-2">RIR</div>
                    <div className="col-span-3">REPS</div>
                    <div className="col-span-1">LISTO</div>
                  </div>

                  {ex.sets.map((set, setIdx) => (
                    <div
                      key={set.id}
                      className={`grid grid-cols-12 items-center gap-1.5 py-2 px-2.5 rounded-2xl border transition-all ${
                        set.done
                          ? 'bg-[#D4FF00]/10 border-[#D4FF00]/40 shadow-[0_0_15px_rgba(212,255,0,0.15)]'
                          : 'bg-[#050507]/60 border-white/[0.05]'
                      }`}
                    >
                      <div className="col-span-2 flex justify-center">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-black ${
                          set.done ? 'bg-[#D4FF00] text-[#050507] shadow-[0_0_8px_#D4FF00]' : 'bg-white/[0.04] border border-white/[0.08] text-[#D4FF00]'
                        }`}>
                          {set.setNum || setIdx + 1}
                        </span>
                      </div>

                      <div className="col-span-4 flex items-center justify-center gap-1">
                        <button
                          type="button"
                          disabled={set.done}
                          onClick={() => handleWeightStep(ex.id, set.id, -2.5)}
                          className="w-6 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:text-white flex items-center justify-center active:scale-90 disabled:opacity-20 transition-all"
                        >
                          <Minus size={10} />
                        </button>
                        <input
                          type="number"
                          step="0.5"
                          inputMode="decimal"
                          value={set.weight}
                          disabled={set.done}
                          onChange={e => updateSetInput(ex.id, set.id, 'weight', e.target.value)}
                          placeholder="0"
                          className="w-12 h-8 bg-black/60 border border-white/[0.08] rounded-lg text-center text-xs text-white font-mono font-bold focus:border-[#D4FF00] outline-none disabled:opacity-50"
                        />
                        <button
                          type="button"
                          disabled={set.done}
                          onClick={() => handleWeightStep(ex.id, set.id, 2.5)}
                          className="w-6 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:text-white flex items-center justify-center active:scale-90 disabled:opacity-20 transition-all"
                        >
                          <Plus size={10} />
                        </button>
                      </div>

                      <div className="col-span-2 flex justify-center">
                        <select
                          disabled={set.done}
                          value={set.rir ?? 2}
                          onChange={e => updateSetInput(ex.id, set.id, 'rir', parseInt(e.target.value))}
                          className="bg-black/60 border border-white/[0.08] rounded-lg text-[10px] font-mono font-bold text-[#D4FF00] py-1 px-1 outline-none text-center disabled:opacity-50"
                          title="Reps en Reserva antes del fallo"
                        >
                          <option value={0}>RIR 0 (Fallo)</option>
                          <option value={1}>RIR 1</option>
                          <option value={2}>RIR 2</option>
                          <option value={3}>RIR 3+</option>
                        </select>
                      </div>

                      <div className="col-span-3 flex items-center justify-center gap-1">
                        <button
                          type="button"
                          disabled={set.done}
                          onClick={() => handleRepsStep(ex.id, set.id, -1)}
                          className="w-5 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:text-white flex items-center justify-center active:scale-90 disabled:opacity-20 transition-all"
                        >
                          <Minus size={9} />
                        </button>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={set.repsDone !== undefined ? set.repsDone : ''}
                          placeholder={set.reps || '10'}
                          disabled={set.done}
                          onChange={e => updateSetInput(ex.id, set.id, 'repsDone', e.target.value)}
                          className="w-10 h-8 bg-black/60 border border-white/[0.08] rounded-lg text-center text-xs text-white font-mono font-bold focus:border-[#D4FF00] outline-none disabled:opacity-50"
                        />
                        <button
                          type="button"
                          disabled={set.done}
                          onClick={() => handleRepsStep(ex.id, set.id, 1)}
                          className="w-5 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:text-white flex items-center justify-center active:scale-90 disabled:opacity-20 transition-all"
                        >
                          <Plus size={9} />
                        </button>
                      </div>

                      <div className="col-span-1 flex justify-center">
                        <button
                          type="button"
                          onClick={() => toggleSetDone(ex.id, set.id)}
                          className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                            set.done
                              ? 'bg-[#D4FF00] text-[#050507] shadow-[0_0_12px_rgba(212,255,0,0.6)]'
                              : 'bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white hover:border-[#D4FF00]/40'
                          }`}
                        >
                          <Check size={13} strokeWidth={3.5} />
                        </button>
                      </div>

                      {setIdx > 0 && !set.done && (
                        <div className="col-span-12 flex justify-end pr-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => copyFromPreviousSet(ex.id, setIdx)}
                            className="text-[9px] font-mono font-bold text-zinc-500 hover:text-[#D4FF00] flex items-center gap-1 transition-colors"
                          >
                            <Copy size={9} /> IGUAL A LA ANTERIOR
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ✅ CORTINA PROTECTORA DE DEGRADADO Y FOOTER FIJO PERFECTAMENTE ANCLADO */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-30 pt-8 pb-5 px-5 bg-gradient-to-t from-[#050507] via-[#050507]/95 to-transparent pointer-events-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 12px)' }}
      >
        <div className="max-w-md mx-auto">
          <button
            onClick={handleFinish}
            className="w-full py-4 volt-button rounded-2xl flex items-center justify-center gap-2 shadow-[0_12px_35px_rgba(212,255,0,0.35)] active:scale-[0.98] transition-all"
          >
            <Check size={18} strokeWidth={3.5} />
            FINALIZAR ENTRENAMIENTO
          </button>
        </div>
      </div>

      {plateCalcTarget && (
        <PlateCalculatorModal
          initialWeight={plateCalcTarget.weight}
          exerciseName={plateCalcTarget.name}
          onClose={() => setPlateCalcTarget(null)}
        />
      )}

      {warmupTarget && (
        <WarmupModal
          workingWeight={warmupTarget.weight}
          exerciseName={warmupTarget.name}
          onClose={() => setWarmupTarget(null)}
        />
      )}

      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-5 animate-fade-in">
          <div className="luxury-card p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <AlertTriangle size={18} />
              </div>
              <h3 className="text-white font-extrabold text-sm uppercase tracking-wider">¿Pausar entrenamiento?</h3>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed font-sans">
              Tu progreso actual se guardará automáticamente como borrador para que lo retomes cuando quieras.
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-xs font-bold hover:bg-white/[0.08] active:scale-95"
              >
                Continuar
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  onGoBack();
                }}
                className="flex-1 py-3 bg-[#D4FF00] text-[#050507] rounded-xl text-xs font-black uppercase tracking-wider active:scale-95 hover:bg-[#e5ff1a]"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      )}

      {detailExercise && (
        <ExerciseDetailModal
          exercise={detailExercise}
          onClose={() => setDetailExercise(null)}
        />
      )}
    </div>,
    document.body
  );
}

function PlateCalculatorModal({ initialWeight, exerciseName, onClose }) {
  const [targetWeight, setTargetWeight] = useState(initialWeight || 60);
  const [barWeight, setBarWeight] = useState(20);

  const availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25];

  const plateBreakdown = useMemo(() => {
    let remainder = Math.max(0, (targetWeight - barWeight) / 2);
    const plates = [];

    for (const plate of availablePlates) {
      const count = Math.floor(remainder / plate);
      if (count > 0) {
        for (let i = 0; i < count; i++) plates.push(plate);
        remainder -= count * plate;
      }
    }
    return plates;
  }, [targetWeight, barWeight]);

  return (
    <div className="fixed inset-0 z-[220] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="luxury-card p-6 max-w-sm w-full space-y-4 shadow-2xl">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Disc size={18} className="text-[#D4FF00]" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Calculadora de Discos</h3>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-zinc-400 truncate">{exerciseName}</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase">Peso Total (kg)</label>
            <input
              type="number"
              step="2.5"
              value={targetWeight}
              onChange={e => setTargetWeight(parseFloat(e.target.value) || 0)}
              className="w-full bg-black border border-white/[0.1] rounded-xl p-2.5 text-center text-sm font-black text-[#D4FF00] mt-1 outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase">Peso de Barra</label>
            <select
              value={barWeight}
              onChange={e => setBarWeight(parseFloat(e.target.value))}
              className="w-full bg-black border border-white/[0.1] rounded-xl p-2.5 text-center text-sm font-bold text-white mt-1 outline-none"
            >
              <option value={20}>20 kg (Olímpica)</option>
              <option value={15}>15 kg (Mujer)</option>
              <option value={10}>10 kg (Z / Corta)</option>
            </select>
          </div>
        </div>

        <div className="bg-black/60 border border-white/[0.06] p-4 rounded-2xl text-center space-y-2">
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
            Cargar en cada lado de la barra ({((targetWeight - barWeight) / 2).toFixed(1)} kg):
          </span>

          <div className="flex items-center justify-center gap-1.5 py-3 flex-wrap">
            {plateBreakdown.length === 0 ? (
              <span className="text-xs text-zinc-500 font-mono">Solo la barra (sin discos)</span>
            ) : (
              plateBreakdown.map((p, idx) => (
                <div
                  key={idx}
                  className="bg-[#D4FF00] text-[#09090B] font-black text-xs px-2.5 py-3 rounded-lg shadow-[0_0_10px_rgba(212,255,0,0.3)]"
                >
                  {p} kg
                </div>
              ))
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 volt-button rounded-xl text-xs font-black uppercase tracking-wider"
        >
          Listo
        </button>
      </div>
    </div>
  );
}

function WarmupModal({ workingWeight, exerciseName, onClose }) {
  const target = Math.max(workingWeight, 20);

  const warmupSteps = [
    { label: 'Aproximación 1', pct: 'Barra sola', weight: 20, reps: '10 reps', rest: '45s' },
    { label: 'Aproximación 2 (50%)', pct: '50%', weight: Math.round((target * 0.5) / 2.5) * 2.5, reps: '5 reps', rest: '60s' },
    { label: 'Aproximación 3 (70%)', pct: '70%', weight: Math.round((target * 0.7) / 2.5) * 2.5, reps: '3 reps', rest: '90s' },
    { label: 'Activación (85%)', pct: '85%', weight: Math.round((target * 0.85) / 2.5) * 2.5, reps: '1 rep', rest: '120s' },
  ];

  return (
    <div className="fixed inset-0 z-[220] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="luxury-card p-6 max-w-sm w-full space-y-4 shadow-2xl">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-amber-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Pirámide de Calentamiento</h3>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-zinc-400 truncate">
          Para serie efectiva de: <strong className="text-white">{target} kg</strong> en {exerciseName}
        </p>

        <div className="space-y-2">
          {warmupSteps.map((step, idx) => (
            <div key={idx} className="bg-black/60 border border-white/[0.06] p-2.5 rounded-xl flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-zinc-400 block text-[10px]">{step.label}</span>
                <span className="text-white font-bold text-sm">{step.weight} kg</span>
              </div>
              <div className="text-right">
                <span className="text-[#D4FF00] font-bold block">{step.reps}</span>
                <span className="text-zinc-500 text-[10px]">Descanso: {step.rest}</span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 volt-button rounded-xl text-xs font-black uppercase tracking-wider"
        >
          ¡Listo para calentar!
        </button>
      </div>
    </div>
  );
}