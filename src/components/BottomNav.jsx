import React from 'react';
import { Home, Utensils, Dumbbell, TrendingUp } from 'lucide-react';

const tabs = [
  { key: 'hoy', label: 'Hoy', icon: Home },
  { key: 'alimentos', label: 'Alimentos', icon: Utensils },
  { key: 'gimnasio', label: 'Gimnasio', icon: Dumbbell },
  { key: 'evolucion', label: 'Evolución', icon: TrendingUp },
];

export default function BottomNav({ activeTab, setActiveTab, pendingWorkout }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 bg-[#09090B]/85 backdrop-blur-xl border-t border-white/[0.06] px-2 py-1.5 flex justify-around items-end safe-bottom"
      role="navigation"
      aria-label="Navegación principal"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        const showBadge = tab.key === 'gimnasio' && pendingWorkout;

        return (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative flex flex-col items-center justify-center gap-0.5 min-w-[64px] py-2 px-3 rounded-2xl transition-all duration-300 active:scale-90 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#D4FF00]/50
              ${isActive
                ? 'text-[#D4FF00]'
                : 'text-zinc-500 hover:text-zinc-300'
              }`}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
          >
            {/* Indicador de pestaña activa (punto superior) */}
            {isActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#D4FF00] shadow-[0_0_6px_rgba(212,255,0,0.6)]" />
            )}
            <Icon
              size={22}
              fill={isActive ? 'currentColor' : 'none'}
              strokeWidth={isActive ? 2.5 : 2}
              className="transition-all duration-300"
            />
            <span className={`text-[10px] font-semibold tracking-wide transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-70'}`}>
              {tab.label}
            </span>
            {/* Badge de entrenamiento pendiente */}
            {showBadge && (
              <span className="absolute top-1 right-2 w-2.5 h-2.5 bg-[#D4FF00] rounded-full shadow-[0_0_6px_rgba(212,255,0,0.6)] animate-pulse" />
            )}
          </button>
        );
      })}
    </nav>
  );
}