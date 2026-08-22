// src/components/IntroScreen.jsx
import React, { useState, useEffect } from 'react';
import { Zap, Sparkles, Activity, ShieldCheck, ChevronRight } from 'lucide-react';

export default function IntroScreen({ onFinish }) {
  const [stage, setStage] = useState(0);
  const [skip, setSkip] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const loadingTexts = [
    "CALIBRANDO TELEMETRÍA BIOMÉTRICA...",
    "SINCRONIZANDO ECOSISTEMA DE ÉLITE...",
    "SISTEMA LISTO. BIENVENIDO AL CLUB."
  ];

  useEffect(() => {
    if (skip) return;
    const t1 = setTimeout(() => setStage(1), 750);
    const t2 = setTimeout(() => setStage(2), 2200);
    const t3 = setTimeout(() => onFinish(), 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [skip, onFinish]);

  const handleSkip = () => {
    setSkip(true);
    setStage(2);
    setTimeout(onFinish, 300);
  };

  const progressPercent = stage === 0 ? 30 : stage === 1 ? 75 : 100;

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-between py-12 px-6 transition-all duration-700 select-none ${
        stage === 2 ? 'opacity-0 scale-95 blur-md pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        backgroundColor: '#050507',
        backgroundImage: 'radial-gradient(circle at 50% 30%, rgba(212,255,0,0.09) 0%, transparent 60%), radial-gradient(circle at 80% 80%, rgba(179,71,255,0.04) 0%, transparent 50%)',
      }}
      role="status"
      aria-label="Cargando ecosistema de fitness"
    >
      {/* Luces atmosféricas de fondo OLED */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[450px] h-[450px] bg-[#D4FF00]/[0.05] rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[350px] h-[350px] bg-[#00F5FF]/[0.03] rounded-full blur-[140px]" />
      </div>

      {/* Barra superior de estado */}
      <div className="w-full max-w-sm flex justify-between items-center z-10">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF00] animate-pulse" />
          <span className="text-[9px] font-mono font-extrabold uppercase tracking-[0.25em] text-zinc-400">
            LOMECAN OS
          </span>
        </div>

        <div className="flex gap-1.5 items-center">
          <div className={`h-1 w-5 rounded-full transition-all duration-500 ${stage >= 0 ? 'bg-[#D4FF00] shadow-[0_0_8px_#D4FF00]' : 'bg-white/10'}`} />
          <div className={`h-1 w-5 rounded-full transition-all duration-500 ${stage >= 1 ? 'bg-[#D4FF00] shadow-[0_0_8px_#D4FF00]' : 'bg-white/10'}`} />
          <div className={`h-1 w-5 rounded-full transition-all duration-500 ${stage >= 2 ? 'bg-[#D4FF00] shadow-[0_0_8px_#D4FF00]' : 'bg-white/10'}`} />
        </div>
      </div>

      {/* Centro: Escudo / Logo con anillo de luz */}
      <div className="text-center relative z-10 w-full max-w-xs mx-auto flex flex-col items-center my-auto">
        <div className="relative mb-8">
          
          {/* Anillos concéntricos de zafiro */}
          <div className="absolute -inset-8 rounded-full border border-white/[0.04] animate-pulse" />
          <div className="absolute -inset-14 rounded-full border border-[#D4FF00]/15" />
          <div className="absolute inset-0 rounded-full blur-3xl opacity-30 bg-[#D4FF00]" />

          {!logoError ? (
            <img
              src="./logo.png"
              alt="Lomecan Logo"
              className="w-36 h-36 mx-auto relative z-10 object-contain drop-shadow-[0_0_25px_rgba(212,255,0,0.45)]"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="w-24 h-24 mx-auto relative z-10 flex items-center justify-center bg-[#0A0A0F] border border-[#D4FF00]/40 rounded-[2rem] shadow-[0_0_35px_rgba(212,255,0,0.25)]">
              <Zap size={36} className="text-[#D4FF00] drop-shadow-[0_0_10px_#D4FF00]" />
            </div>
          )}
        </div>

        {/* Título Principal */}
        <h1 className="text-3xl font-black text-white tracking-tight uppercase leading-none font-sans">
          LOS <span className="text-[#D4FF00] drop-shadow-[0_0_12px_rgba(212,255,0,0.6)]">LOMECAN</span>
        </h1>

        <div className="flex items-center gap-1.5 mt-2.5">
          <span className="luxury-badge text-[8px] tracking-[0.25em]">
            THE PERFORMANCE CLUB
          </span>
        </div>

        {/* Barra de progreso de zafiro */}
        <div className="w-36 h-1 bg-white/[0.06] my-8 rounded-full overflow-hidden p-[0.5px]">
          <div
            className="h-full bg-gradient-to-r from-[#E5FF33] to-[#D4FF00] rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_#D4FF00]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Microcopy de telemetría */}
        <div className="min-h-[24px] flex items-center justify-center px-4">
          <p className="text-[10px] font-mono font-bold tracking-[0.18em] text-zinc-400 uppercase transition-opacity duration-300">
            {loadingTexts[stage] || loadingTexts[0]}
          </p>
        </div>
      </div>

      {/* Botón de Entrada Rápida */}
      <div className="w-full max-w-xs z-10">
        <button
          onClick={handleSkip}
          className={`w-full py-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.02] text-[10px] font-mono font-extrabold uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-1.5
            ${stage >= 1 
              ? 'opacity-100 text-zinc-300 hover:text-white hover:border-[#D4FF00]/40 hover:bg-white/[0.05] active:scale-95' 
              : 'opacity-0 pointer-events-none text-zinc-600'
            }`}
          aria-label="Saltar introducción"
        >
          Entrar al Sistema <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}