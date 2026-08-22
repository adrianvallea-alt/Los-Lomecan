// src/components/BottomNav.jsx
import React from 'react';
import { Home, Utensils, Dumbbell, TrendingUp } from 'lucide-react';

const tabs = [
  { key: 'hoy', label: 'Hoy', icon: Home },
  { key: 'alimentos', label: 'Alimentos', icon: Utensils },
  { key: 'gimnasio', label: 'Gimnasio', icon: Dumbbell },
  { key: 'evolucion', label: 'Evolución', icon: TrendingUp },
];

const triggerHaptic = (ms = 18) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(ms); } catch (e) {}
  }
};

export default function BottomNav({ activeTab, setActiveTab, pendingWorkout }) {
  return (
    <>
      {/* Cortina de degradado oscura para que el scroll se desvanezca con elegancia */}
      <div className="fixed bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#050507] via-[#050507]/90 to-transparent pointer-events-none z-40" />

      {/* Dock Flotante de Cristal de Zafiro Opaco (Sin transparencias sucias) */}
      <nav
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md pointer-events-auto select-none"
        role="navigation"
        aria-label="Navegación principal"
      >
        <div className="bg-[#0C0C12] border border-white/[0.12] rounded-[2.25rem] px-2.5 py-2 flex justify-around items-center relative shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_20px_rgba(212,255,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.15)] safe-bottom">
          
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            const showBadge = tab.key === 'gimnasio' && pendingWorkout;

            return (
              <button
                key={tab.key}
                onClick={() => {
                  triggerHaptic(18);
                  setActiveTab(tab.key);
                }}
                className={`relative flex flex-col items-center justify-center gap-1 min-w-[68px] py-2 px-2.5 rounded-[1.5rem] transition-all duration-300 active:scale-90 ${
                  isActive
                    ? 'text-[#D4FF00] bg-[#D4FF00]/[0.08] shadow-[inset_0_1px_1px_rgba(212,255,0,0.3)]'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'
                }`}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Micro-línea de luz de neón sobre la pestaña activa */}
                {isActive && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-3.5 h-[2px] rounded-full bg-[#D4FF00] shadow-[0_0_10px_#D4FF00]" />
                )}

                {/* Icono */}
                <div className="relative">
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    className={`transition-all duration-300 ${
                      isActive ? 'text-[#D4FF00] drop-shadow-[0_0_8px_rgba(212,255,0,0.7)] scale-105' : 'text-zinc-500'
                    }`}
                  />

                  {/* Badge de entrenamiento activo */}
                  {showBadge && (
                    <span className="absolute -top-1 -right-1.5 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4FF00] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D4FF00] shadow-[0_0_8px_#D4FF00]" />
                    </span>
                  )}
                </div>

                {/* Micro-texto en tipografía monoespaciada */}
                <span className={`text-[9px] font-mono tracking-[0.18em] uppercase transition-all duration-300 ${
                  isActive ? 'font-black text-[#D4FF00] opacity-100' : 'font-semibold text-zinc-500 opacity-60'
                }`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}