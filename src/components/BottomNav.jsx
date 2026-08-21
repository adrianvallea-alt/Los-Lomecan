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
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md"
      role="navigation"
      aria-label="Navegación principal"
    >
      <div className="bg-[#0A0A0C]/90 backdrop-blur-2xl border border-[#D4FF00]/15 rounded-[2rem] px-2 py-2 flex justify-around items-center shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_25px_rgba(212,255,0,0.08)] safe-bottom">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          const showBadge = tab.key === 'gimnasio' && pendingWorkout;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex flex-col items-center justify-center gap-1 min-w-[64px] py-2.5 px-3 rounded-2xl transition-all duration-300 active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4FF00]/50 ${
                isActive
                  ? 'text-[#D4FF00] bg-[#D4FF00]/10 shadow-[0_0_15px_rgba(212,255,0,0.15)]'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
              }`}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Indicador superior */}
              {isActive && (
                <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#D4FF00] shadow-[0_0_12px_rgba(212,255,0,0.9)]" />
              )}

              <Icon
                size={22}
                fill={isActive ? 'currentColor' : 'none'}
                strokeWidth={isActive ? 2.5 : 2}
                className={`transition-all duration-300 ${
                  isActive ? 'drop-shadow-[0_0_6px_rgba(212,255,0,0.6)]' : ''
                }`}
              />
              <span className={`text-[10px] font-bold tracking-wide transition-all duration-300 ${
                isActive ? 'opacity-100' : 'opacity-60'
              }`}>
                {tab.label}
              </span>

              {/* Badge de entrenamiento pendiente */}
              {showBadge && (
                <span className="absolute top-1 right-2 w-2.5 h-2.5 bg-[#D4FF00] rounded-full shadow-[0_0_12px_rgba(212,255,0,0.8)] animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}