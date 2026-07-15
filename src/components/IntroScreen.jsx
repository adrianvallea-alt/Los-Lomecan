import React, { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';

export default function IntroScreen({ onFinish }) {
  const [stage, setStage] = useState(0);
  const [skip, setSkip] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const loadingTexts = [
    "Alistando las mancuernas virtuales...",
    "Quemando las calorías de la pantalla de carga...",
    "Todo listo. ¡A darle con todo!"
  ];

  useEffect(() => {
    if (skip) return;
    const t1 = setTimeout(() => setStage(1), 800);
    const t2 = setTimeout(() => setStage(2), 2400);
    const t3 = setTimeout(() => onFinish(), 3200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [skip, onFinish]);

  const handleSkip = () => {
    setSkip(true);
    setStage(2);
    setTimeout(onFinish, 400);
  };

  // Progreso real mapeado a porcentaje de la barra
  const progressPercent = stage === 0 ? 20 : stage === 1 ? 65 : 100;

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-between py-12 px-6 transition-all duration-700 ease-out-expo ${
        stage === 2 ? 'opacity-0 scale-98 blur-lg pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{ backgroundColor: '#09090B' }}
      role="status"
      aria-live="polite"
      aria-label="Cargando aplicación de fitness"
    >
      {/* Luces de ambiente optimizadas */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-20 -left-20 w-72 h-72 rounded-full blur-[100px] opacity-[0.06] animate-pulse-slow" 
          style={{ backgroundColor: '#D4FF00' }}
        />
      </div>

      {/* Top: Indicador de progreso real */}
      <div className="w-full flex justify-between items-center z-10">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/25">
          {stage < 2 ? 'Cargando' : 'Listo'}
        </span>
        <div className="flex gap-1.5 items-center">
          <div className={`h-1 w-5 rounded-full transition-colors duration-500 ${stage >= 0 ? 'bg-[#D4FF00]' : 'bg-white/10'}`} />
          <div className={`h-1 w-5 rounded-full transition-colors duration-500 ${stage >= 1 ? 'bg-[#D4FF00]' : 'bg-white/10'}`} />
        </div>
      </div>

      {/* Hero centrado */}
      <div className="text-center relative z-10 w-full max-w-xs mx-auto flex flex-col items-center">
        <div className="relative mb-8">
          <div 
            className="absolute -inset-3 rounded-full blur-2xl opacity-[0.12] animate-pulse-slow" 
            style={{ backgroundColor: '#D4FF00' }}
          />
          {!logoError ? (
            <img
              src="/logo.png"
              alt="Logo"
              className="w-40 h-40 mx-auto relative z-10 object-contain"
              style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }}
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="w-16 h-16 mx-auto relative z-10 flex items-center justify-center bg-white/[0.03] border border-white/10 rounded-2xl backdrop-blur-sm">
              <Zap size={28} style={{ color: '#D4FF00', filter: 'drop-shadow(0 0 8px rgba(212,255,0,0.4))' }} />
            </div>
          )}
        </div>

        <h1 className="text-3xl font-bold text-white tracking-[0.1em] uppercase leading-tight">
          LOS LOMECAN
        </h1>
        <p className="text-[11px] text-white/35 uppercase tracking-[0.2em] mt-2 font-medium">
          TU ECOSISTEMA DE SALUD
        </p>

        {/* Barra de progreso real */}
        <div className="w-16 h-[2px] bg-white/10 my-7 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#D4FF00] rounded-full transition-all duration-700 ease-out-expo"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Microcopy con transición suave (sin key) */}
        <div className="min-h-[32px] flex items-center justify-center px-4">
          <p className="text-xs font-normal tracking-wide text-white/70 transition-opacity duration-500 ease-in-out">
            {loadingTexts[stage] || loadingTexts[0]}
          </p>
        </div>
      </div>

      {/* Botón Saltar siempre presente pero invisible hasta que sea interactuable */}
      <div className="w-full max-w-xs z-10">
        <button
          onClick={handleSkip}
          className={`w-full py-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.04] text-xs font-semibold uppercase tracking-[0.15em] transition-all duration-300 ease-out-expo select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4FF00]/50
            ${stage >= 1 
              ? 'opacity-100 translate-y-0 text-white/70 active:scale-[0.97] active:bg-white/[0.1]' 
              : 'opacity-0 translate-y-2 pointer-events-none text-white/40'
            }`}
          aria-label="Saltar introducción"
        >
          Saltar
        </button>
      </div>

      {/* Estilos locales para las animaciones personalizadas */}
      <style>{`
        .ease-out-expo {
          transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.06; }
          50% { opacity: 0.12; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); filter: blur(4px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}