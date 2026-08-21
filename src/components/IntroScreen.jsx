import React, { useState, useEffect } from 'react';
import { Zap, Sparkles } from 'lucide-react';

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

  const progressPercent = stage === 0 ? 20 : stage === 1 ? 65 : 100;

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-between py-12 px-6 transition-all duration-700 ease-out-expo ${
        stage === 2 ? 'opacity-0 scale-95 blur-lg pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        backgroundColor: '#09090B',
        backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(212,255,0,0.08) 0%, transparent 60%), radial-gradient(circle at 80% 80%, rgba(212,255,0,0.05) 0%, transparent 50%)',
      }}
      role="status"
      aria-live="polite"
      aria-label="Cargando aplicación de fitness"
    >
      {/* Luces ambientales */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-[120px] opacity-20 animate-pulse-slow bg-[#D4FF00]" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full blur-[120px] opacity-10 animate-pulse-slow bg-[#D4FF00]" />
      </div>

      {/* Partículas flotantes */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-[#D4FF00]/40 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      {/* Top: Indicador de progreso */}
      <div className="w-full flex justify-between items-center z-10">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
          {stage < 2 ? 'Cargando' : 'Listo'}
        </span>
        <div className="flex gap-1.5 items-center">
          <div className={`h-1.5 w-6 rounded-full transition-all duration-500 ${stage >= 0 ? 'bg-[#D4FF00] shadow-[0_0_8px_rgba(212,255,0,0.6)]' : 'bg-white/10'}`} />
          <div className={`h-1.5 w-6 rounded-full transition-all duration-500 ${stage >= 1 ? 'bg-[#D4FF00] shadow-[0_0_8px_rgba(212,255,0,0.6)]' : 'bg-white/10'}`} />
        </div>
      </div>

      {/* Hero centrado */}
      <div className="text-center relative z-10 w-full max-w-xs mx-auto flex flex-col items-center">
        <div className="relative mb-8">
          {/* Anillos giratorios */}
          <div className="absolute -inset-8 rounded-full border border-[#D4FF00]/20 animate-spin-slow" />
          <div className="absolute -inset-12 rounded-full border border-[#D4FF00]/10" />
          <div className="absolute -inset-16 rounded-full border border-[#D4FF00]/5" />
          
          {/* Glow */}
          <div className="absolute inset-0 rounded-full blur-3xl opacity-30 animate-pulse-slow bg-[#D4FF00]" />

          {!logoError ? (
            <img
              src="/Los-Lomecan/logo.png"
              alt="Logo"
              className="w-40 h-40 mx-auto relative z-10 object-contain animate-float"
              style={{ filter: 'drop-shadow(0 0 20px rgba(212,255,0,0.4))' }}
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="w-16 h-16 mx-auto relative z-10 flex items-center justify-center bg-white/[0.05] border border-[#D4FF00]/30 rounded-2xl backdrop-blur-sm shadow-[0_0_30px_rgba(212,255,0,0.2)]">
              <Zap size={28} className="text-[#D4FF00] drop-shadow-[0_0_8px_rgba(212,255,0,0.8)]" />
            </div>
          )}
        </div>

        {/* Título con neón */}
        <h1 className="text-4xl font-black text-white tracking-[0.1em] uppercase leading-tight">
          LOS <span className="text-[#D4FF00] drop-shadow-[0_0_10px_rgba(212,255,0,0.6)]">LOMECAN</span>
        </h1>
        <p className="text-[11px] text-white/50 uppercase tracking-[0.25em] mt-2 font-bold flex items-center gap-1">
          <Sparkles size={12} className="text-[#D4FF00]" />
          TU ECOSISTEMA DE SALUD
          <Sparkles size={12} className="text-[#D4FF00]" />
        </p>

        {/* Barra de progreso */}
        <div className="w-24 h-1.5 bg-white/10 my-8 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#D4FF00] to-[#e5ff1a] rounded-full transition-all duration-700 ease-out-expo shadow-[0_0_10px_rgba(212,255,0,0.6)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Microcopy */}
        <div className="min-h-[32px] flex items-center justify-center px-4">
          <p className="text-xs font-medium tracking-wide text-white/80 transition-opacity duration-500 ease-in-out">
            {loadingTexts[stage] || loadingTexts[0]}
          </p>
        </div>
      </div>

      {/* Botón Saltar */}
      <div className="w-full max-w-xs z-10">
        <button
          onClick={handleSkip}
          className={`w-full py-4 rounded-2xl border border-[#D4FF00]/30 bg-[#D4FF00]/5 text-xs font-bold uppercase tracking-[0.15em] transition-all duration-300 ease-out-expo select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4FF00]/50
            ${stage >= 1 
              ? 'opacity-100 translate-y-0 text-white hover:bg-[#D4FF00]/10 hover:shadow-[0_0_20px_rgba(212,255,0,0.3)] active:scale-[0.97]' 
              : 'opacity-0 translate-y-2 pointer-events-none text-white/40'
            }`}
          aria-label="Saltar introducción"
        >
          Saltar
        </button>
      </div>

      {/* Estilos locales */}
      <style>{`
        .ease-out-expo {
          transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.3; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
      `}</style>
    </div>
  );
}