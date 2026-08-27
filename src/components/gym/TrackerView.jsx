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

// Generador de sonido sintético para el descanso
const playBeep = (freq = 880, duration = 0.45) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
};

// Disparador de vibración táctil
const triggerHaptic = (pattern = 25) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch {}
  }
};

// Canvas de Confeti para Nuevos Récords (PR)
const ConfettiCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#D4FF00', '#00F5FF', '#FF2A55', '#B347FF', '#FFFFFF', '#FFD700'];
    const particles = Array.from({ length: 80 }, () => ({
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

const RIR_CONFIG = {
  0: { label: 'R0', name: 'Fallo', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/50' },
  1: { label: 'R1', name: 'Límite', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/50' },
  2: { label: 'R2', name: 'Óptimo', bg: 'bg-[#D4FF00]/20', text: 'text-[#D4FF00]', border: 'border-[#D4FF00]/50' },
  3: { label: 'R3+', name: 'Reserva', bg: 'bg-sky-500/20', text: 'text-sky-400', border: 'border-sky-500/50' }
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
    return (routineData?.exercises || []).map(ex => ({
      ...ex,
      muscle: ex.muscle || '',
      secondaryMuscles: ex.secondaryMuscles || ex.secondary_muscles || '',
      sets: (ex.sets || []).map((s, idx) => ({
        ...s,
        weight: s.weight !== undefined && s.weight !== null ? String(s.weight) : '',
        reps: s.reps !== undefined && s.reps !== null ? String(s.reps) : '10',
        repsDone: s.repsDone !== undefined && s.repsDone !== null ? String(s.repsDone) : (s.done ? String(s.reps || '10') : ''),
        setNum: s.setNum || idx + 1,
        rir: s.rir ?? 2
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

  const stateRef = useRef({
    newPrCelebration,
    detailExercise,
    plateCalcTarget,
    warmupTarget,
    showExitConfirm
  });

  stateRef.current = {
    newPrCelebration,
    detailExercise,
    plateCalcTarget,
    warmupTarget,
    showExitConfirm
  };

  // =========================================================================
  // CONTROLADOR DEL BOTÓN ATRÁS EN TRACKER VIEW
  // =========================================================================
  useEffect(() => {
    const handleBackEvent = (e) => {
      e.preventDefault();
      const current = stateRef.current;

      // 1. Cerrar submodales internos si están abiertos
      if (current.newPrCelebration) {
        setNewPrCelebration(null);
        return;
      }
      if (current.detailExercise) {
        setDetailExercise(null);
        return;
      }
      if (current.plateCalcTarget) {
        setPlateCalcTarget(null);
        return;
      }
      if (current.warmupTarget) {
        setWarmupTarget(null);
        return;
      }
      if (current.showExitConfirm) {
        setShowExitConfirm(false);
        return;
      }

      // 2. Si no hay modal abierto, abrir diálogo de confirmación de pausa
      setShowExitConfirm(true);
    };

    window.addEventListener('lomecan-hardware-back', handleBackEvent);
    return () => window.removeEventListener('lomecan-hardware-back', handleBackEvent);
  }, []);

  // Mantener pantalla encendida
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

  // Cargar ejercicios de biblioteca
  useEffect(() => {
    fetchAllExercises()
      .then(data => setLibraryExercises(data || []))
      .catch(err => console.warn('Error cargando ejercicios:', err));
  }, []);

  // Cargar borrador previo
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setExercises(parsed.map(ex => ({
            ...ex,
            muscle: ex.muscle || '',
            secondaryMuscles: ex.secondaryMuscles || ex.secondary_muscles || '',
            sets: (ex.sets || []).map((s, idx) => ({
              ...s,
              weight: s.weight !== undefined && s.weight !== null ? String(s.weight) : '',
              reps: s.reps !== undefined && s.reps !== null ? String(s.reps) : '10',
              repsDone: s.repsDone !== undefined && s.repsDone !== null ? String(s.repsDone) : '',
              setNum: s.setNum || idx + 1,
              rir: s.rir ?? 2
            }))
          })));
        }
      } catch (e) {}
    }
  }, [DRAFT_KEY]);

  // Expandir primer ejercicio incompleto
  useEffect(() => {
    const firstIncomplete = exercises.find(ex => ex.sets.some(s => !s.done));
    if (firstIncomplete) {
      setExpandedId(firstIncomplete.id);
    } else if (exercises[0]) {
      setExpandedId(exercises[0].id);
    }
  }, []);

  // Guardar borrador automático
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(exercises));
    }, 500);
    return () => clearTimeout(timer);
  }, [exercises, DRAFT_KEY]);

  // Temporizador de descanso
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

  const toggleSetDone = (exerciseId, setIdx) => {
    const ex = exercises.find(e => e.id === exerciseId);
    if (!ex) return;
    const targetSet = ex.sets[setIdx];
    if (!targetSet) return;

    const nextDone = !targetSet.done;

    setExercises(prev => prev.map(e => {
      if (e.id !== exerciseId) return e;
      return {
        ...e,
        sets: e.sets.map((s, idx) => {
          if (idx !== setIdx) return s;
          return {
            ...s,
            done: nextDone,
            repsDone: nextDone && !s.repsDone ? (s.reps || '10') : (s.repsDone ?? '')
          };
        })
      };
    }));

    if (nextDone) {
      triggerHaptic(45);
      setRestTimer({ active: true, seconds: 90, running: true, totalSeconds: 90 });

      const exKey = ex.libraryExerciseId || ex.id;
      const currentPrWeight = personalRecords?.[exKey]?.weight || 0;
      const completedWeight = parseFloat(targetSet.weight) || 0;
      const completedReps = parseInt(targetSet.repsDone || targetSet.reps) || 0;

      if (completedWeight > currentPrWeight && completedWeight > 0 && completedReps > 0) {
        triggerHaptic([100, 50, 100, 50, 200, 80, 250]);
        if (soundEnabled) {
          playBeep(523.25, 0.15);
          setTimeout(() => playBeep(659.25, 0.15), 150);
          setTimeout(() => playBeep(783.99, 0.35), 300);
        }
        setNewPrCelebration({
          exerciseName: ex.name,
          weight: completedWeight,
          reps: completedReps,
          prevWeight: currentPrWeight
        });
      }
    } else {
      setRestTimer({ active: false, seconds: 90, running: false, totalSeconds: 90 });
    }
  };

  const handleWeightStep = (exerciseId, setIdx, delta) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s, idx) => {
          if (idx !== setIdx) return s;
          const current = parseFloat(s.weight) || 0;
          const next = Math.max(0, parseFloat((current + delta).toFixed(1)));
          return { ...s, weight: String(next) };
        })
      };
    }));
    triggerHaptic(18);
  };

  const handleRepsStep = (exerciseId, setIdx, delta) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s, idx) => {
          if (idx !== setIdx) return s;
          const baseVal = s.repsDone !== '' && s.repsDone !== undefined ? s.repsDone : (s.reps || '10');
          const current = parseInt(baseVal) || 0;
          const next = Math.max(0, current + delta);
          return { ...s, repsDone: String(next) };
        })
      };
    }));
    triggerHaptic(18);
  };

  const cycleRIR = (exerciseId, setIdx) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s, idx) => {
          if (idx !== setIdx) return s;
          const currentRIR = s.rir ?? 2;
          const nextRIR = currentRIR === 3 ? 0 : currentRIR + 1;
          return { ...s, rir: nextRIR };
        })
      };
    }));
    triggerHaptic(22);
  };

  const copyFromPreviousSet = (exerciseId, setIdx) => {
    if (setIdx === 0) return;
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      const prevSet = ex.sets[setIdx - 1];
      return {
        ...ex,
        sets: ex.sets.map((s, idx) => {
          if (idx !== setIdx) return s;
          return {
            ...s,
            weight: String(prevSet.weight ?? s.weight ?? ''),
            repsDone: String(prevSet.repsDone || prevSet.reps || s.repsDone || ''),
            rir: prevSet.rir ?? s.rir ?? 2
          };
        })
      };
    }));
    triggerHaptic(25);
  };

  const updateSetInput = (exerciseId, setIdx, field, value) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s, idx) => idx === setIdx ? { ...s, [field]: String(value) } : s)
      };
    }));
  };

  const handleFinish = () => {
    const completedExercises = exercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      muscle: ex.muscle || '',
      secondaryMuscles: ex.secondaryMuscles || ex.secondary_muscles || '',
      libraryExerciseId: ex.libraryExerciseId,
      sets: ex.sets.map((s, idx) => ({
        setNum: s.setNum || idx + 1,
        weight: s.weight ?? '',
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

  const dayName = routineData?.trainingDays?.[activeDayIndex]?.name || `Día ${activeDayIndex + 1}`;

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
      
      {newPrCelebration && <ConfettiCanvas />}

      {/* MODAL NUEVO RÉCORD (PR) */}
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
              className="w-full py-3.5 volt-button rounded-xl text-xs font-black uppercase tracking-wider active:scale-95 font-mono"
            >
              ¡A SEGUIR ENTRENANDO!
            </button>
          </div>
        </div>
      )}

      {/* HEADER SUPERIOR */}
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

      {/* TEMPORIZADOR DE DESCANSO */}
      {restTimer.active && (
        <div className="px-4 py-2.5 shrink-0 bg-[#0C0C12] border-b border-[#D4FF00]/40 flex items-center justify-between shadow-[0_4px_25px_rgba(212,255,0,0.15)] animate-fade-in z-20">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl bg-[#D4FF00]/15 text-[#D4FF00] ${restTimer.running ? 'animate-pulse' : ''}`}>
              <Timer size={18} />
            </div>
            <div>
              <span className="text-[9px] font-mono uppercase text-[#D4FF00] font-black tracking-wider block">Descanso sugerido</span>
              <span className="text-white font-mono font-black text-lg tabular-nums leading-none">
                {formatTime(restTimer.seconds)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                triggerHaptic(15);
                setRestTimer(prev => ({ ...prev, seconds: prev.seconds + 30 }));
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-xs font-mono font-bold text-zinc-200 active:scale-90 hover:border-[#D4FF00]/40"
            >
              +30s
            </button>
            <button
              onClick={() => {
                triggerHaptic(15);
                setRestTimer(prev => ({ ...prev, running: !prev.running }));
              }}
              className="p-2 rounded-xl bg-white/[0.05] border border-white/[0.1] text-zinc-200 hover:text-white active:scale-90"
              title={restTimer.running ? "Pausar" : "Reanudar"}
            >
              {restTimer.running ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button
              onClick={() => {
                triggerHaptic(15);
                setSoundEnabled(!soundEnabled);
              }}
              className="p-2 rounded-xl bg-white/[0.05] border border-white/[0.1] text-zinc-400 hover:text-[#D4FF00] active:scale-90"
              title="Sonido de alarma"
            >
              {soundEnabled ? <Volume2 size={14} className="text-[#D4FF00]" /> : <VolumeX size={14} />}
            </button>
            <button
              onClick={() => {
                triggerHaptic(20);
                setRestTimer({ active: false, seconds: 90, running: false, totalSeconds: 90 });
              }}
              className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 active:scale-90"
              title="Ocultar descanso"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* TICKER DE VOLUMEN TOTAL */}
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

      {/* LISTADO DE EJERCICIOS Y SERIES */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-36 space-y-3 touch-pan-y no-scrollbar">
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
                      title="Ver técnica del ejercicio"
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
                      className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[10px] font-mono text-zinc-300 hover:text-[#D4FF00] hover:border-[#D4FF00]/40 flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <Disc size={13} className="text-[#D4FF00]" /> Discos en barra
                    </button>

                    <button
                      onClick={() => setWarmupTarget({ name: ex.name, weight: activeWeight || 80 })}
                      className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[10px] font-mono text-zinc-300 hover:text-amber-400 hover:border-amber-400/40 flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <Flame size={13} className="text-amber-400" /> Calentamiento
                    </button>
                  </div>

                  {ex.sets.map((set, setIdx) => {
                    const rirData = RIR_CONFIG[set.rir ?? 2] || RIR_CONFIG[2];

                    return (
                      <div
                        key={set.id || `set_${setIdx}`}
                        className={`p-3 rounded-2xl border transition-all space-y-2.5 ${
                          set.done
                            ? 'bg-[#D4FF00]/10 border-[#D4FF00]/40 shadow-[0_0_15px_rgba(212,255,0,0.15)]'
                            : 'bg-[#050507]/90 border-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-black ${
                              set.done ? 'bg-[#D4FF00] text-[#050507]' : 'bg-white/[0.06] text-[#D4FF00]'
                            }`}>
                              S{set.setNum || setIdx + 1}
                            </span>

                            <button
                              type="button"
                              disabled={set.done}
                              onClick={() => cycleRIR(ex.id, setIdx)}
                              className={`px-2.5 py-1 rounded-lg border text-[10px] font-mono font-black flex items-center gap-1 transition-all active:scale-90 disabled:opacity-50 ${rirData.bg} ${rirData.text} ${rirData.border}`}
                              title={`Toca para cambiar RIR (Actual: ${rirData.name})`}
                            >
                              <span>RIR:</span>
                              <strong>{rirData.label}</strong>
                              <span className="opacity-60 text-[8px]">({rirData.name})</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            {setIdx > 0 && !set.done && (
                              <button
                                type="button"
                                onClick={() => copyFromPreviousSet(ex.id, setIdx)}
                                className="text-[10px] font-mono font-bold text-zinc-500 hover:text-[#D4FF00] flex items-center gap-1 transition-colors py-1 px-1.5 rounded-lg active:scale-90"
                                title="Repetir valores de la serie anterior"
                              >
                                <Copy size={11} /> Repetir
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => toggleSetDone(ex.id, setIdx)}
                              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-black uppercase tracking-wider transition-all active:scale-90 font-mono ${
                                set.done
                                  ? 'bg-[#D4FF00] text-[#050507] shadow-[0_0_12px_rgba(212,255,0,0.6)]'
                                  : 'bg-white/[0.05] border border-white/[0.1] text-zinc-300 hover:text-white'
                              }`}
                            >
                              <Check size={14} strokeWidth={3.5} />
                              <span>{set.done ? 'Hecho' : 'Listo'}</span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-black/60 border border-white/[0.08] rounded-xl p-2 flex items-center justify-between">
                            <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase pl-1">Peso (kg)</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={set.done}
                                onClick={() => handleWeightStep(ex.id, setIdx, -2.5)}
                                className="w-7 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center active:scale-90 disabled:opacity-20 transition-all shrink-0"
                              >
                                <Minus size={12} strokeWidth={3} />
                              </button>
                              <input
                                type="number"
                                step="0.5"
                                inputMode="decimal"
                                value={set.weight ?? ''}
                                disabled={set.done}
                                onChange={e => updateSetInput(ex.id, setIdx, 'weight', e.target.value)}
                                placeholder="0"
                                className="w-12 h-8 bg-black/80 border border-white/[0.12] rounded-lg text-center text-xs text-white font-mono font-bold focus:border-[#D4FF00] outline-none disabled:opacity-50"
                              />
                              <button
                                type="button"
                                disabled={set.done}
                                onClick={() => handleWeightStep(ex.id, setIdx, 2.5)}
                                className="w-7 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center active:scale-90 disabled:opacity-20 transition-all shrink-0"
                              >
                                <Plus size={12} strokeWidth={3} />
                              </button>
                            </div>
                          </div>

                          <div className="bg-black/60 border border-white/[0.08] rounded-xl p-2 flex items-center justify-between">
                            <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase pl-1">Reps</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={set.done}
                                onClick={() => handleRepsStep(ex.id, setIdx, -1)}
                                className="w-7 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center active:scale-90 disabled:opacity-20 transition-all shrink-0"
                              >
                                <Minus size={12} strokeWidth={3} />
                              </button>
                              <input
                                type="number"
                                inputMode="numeric"
                                value={set.repsDone !== undefined && set.repsDone !== null ? String(set.repsDone) : ''}
                                placeholder={set.reps || '10'}
                                disabled={set.done}
                                onChange={e => updateSetInput(ex.id, setIdx, 'repsDone', e.target.value)}
                                className="w-12 h-8 bg-black/80 border border-white/[0.12] rounded-lg text-center text-xs text-white font-mono font-bold focus:border-[#D4FF00] outline-none disabled:opacity-50"
                              />
                              <button
                                type="button"
                                disabled={set.done}
                                onClick={() => handleRepsStep(ex.id, setIdx, 1)}
                                className="w-7 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center active:scale-90 disabled:opacity-20 transition-all shrink-0"
                              >
                                <Plus size={12} strokeWidth={3} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FOOTER FIJO */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-30 pt-6 pb-5 px-5 bg-gradient-to-t from-[#050507] via-[#050507]/95 to-transparent pointer-events-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 12px)' }}
      >
        <div className="max-w-md mx-auto">
          <button
            onClick={handleFinish}
            className="w-full py-4 volt-button rounded-2xl flex items-center justify-center gap-2 shadow-[0_12px_35px_rgba(212,255,0,0.35)] active:scale-[0.98] transition-all font-black text-xs tracking-wider uppercase font-mono"
          >
            <Check size={18} strokeWidth={3.5} />
            FINALIZAR ENTRENAMIENTO
          </button>
        </div>
      </div>

      {/* MODAL CALCULADORA DE DISCOS */}
      {plateCalcTarget && (
        <PlateCalculatorModal
          initialWeight={plateCalcTarget.weight}
          exerciseName={plateCalcTarget.name}
          onClose={() => setPlateCalcTarget(null)}
        />
      )}

      {/* MODAL PIRÁMIDE DE CALENTAMIENTO */}
      {warmupTarget && (
        <WarmupModal
          workingWeight={warmupTarget.weight}
          exerciseName={warmupTarget.name}
          onClose={() => setWarmupTarget(null)}
        />
      )}

      {/* MODAL CONFIRMACIÓN DE SALIDA DEL ENTRENAMIENTO */}
      {showExitConfirm && (
        <div 
          className="fixed inset-0 z-[999] bg-black/85 backdrop-blur-md flex items-center justify-center p-5 animate-fade-in"
          onClick={() => setShowExitConfirm(false)}
        >
          <div 
            className="luxury-card p-6 max-w-sm w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <AlertTriangle size={18} />
              </div>
              <h3 className="text-white font-extrabold text-sm uppercase tracking-wider font-sans">¿Pausar entrenamiento?</h3>
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

      {/* MODAL DE TÉCNICA DEL EJERCICIO */}
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
            <h3 className="text-sm font-black text-white uppercase tracking-wider font-sans">Calculadora de Discos</h3>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-zinc-400 truncate">{exerciseName}</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Peso Total (kg)</label>
            <input
              type="number"
              step="2.5"
              value={targetWeight}
              onChange={e => setTargetWeight(parseFloat(e.target.value) || 0)}
              className="w-full bg-black border border-white/[0.1] rounded-xl p-2.5 text-center text-sm font-black text-[#D4FF00] mt-1 outline-none font-mono"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase font-mono">Peso de Barra</label>
            <select
              value={barWeight}
              onChange={e => setBarWeight(parseFloat(e.target.value))}
              className="w-full bg-black border border-white/[0.1] rounded-xl p-2.5 text-center text-sm font-bold text-white mt-1 outline-none font-mono"
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
                  className="bg-[#D4FF00] text-[#09090B] font-black text-xs px-2.5 py-3 rounded-lg shadow-[0_0_10px_rgba(212,255,0,0.3)] font-mono"
                >
                  {p} kg
                </div>
              ))
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 volt-button rounded-xl text-xs font-black uppercase tracking-wider font-mono"
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
            <h3 className="text-sm font-black text-white uppercase tracking-wider font-sans">Pirámide de Calentamiento</h3>
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
          className="w-full py-3 volt-button rounded-xl text-xs font-black uppercase tracking-wider font-mono"
        >
          ¡Listo para calentar!
        </button>
      </div>
    </div>
  );
}