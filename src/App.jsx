// src/App.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { App as CapApp } from '@capacitor/app';
import ProfileSelection from './components/ProfileSelection';
import BottomNav from './components/BottomNav';
import Dashboard from './components/Dashboard';
import FoodCatalog from './components/FoodCatalog';
import GymTracker from './components/GymTracker';
import EvolutionView from './components/EvolutionView';
import ProfileManager from './components/ProfileManager';
import OnboardingWizard from './components/OnboardingWizard';
import InstallPrompt from './components/InstallPrompt';
import IntroScreen from './components/IntroScreen';
import { Users, Lock, Radio, LogOut } from 'lucide-react';
import {
  fetchProfiles,
  fetchUserRoutines,
  saveUserRoutine,
  deleteUserRoutine,
  fetchDailyIntake,
  addDailyIntakeItem,
  deleteDailyIntakeItem,
  updateProfile,
} from './lib/dataService';
import useReminders from './hooks/useReminders';
import useOfflineQueue from './hooks/useOfflineQueue';
import useWeightLogs from './hooks/useWeightLogs';

const DEFAULT_PROFILES = [
  { id: 'adrian', name: 'Adrián', role: 'Coach', color: 'lime', goals: { cal: 2800, pro: 180, carb: 300, fat: 75 }, pin: null, avatar: null },
  { id: 'esposa', name: 'Esposa', role: 'Fitness Partner', color: 'lavender', goals: { cal: 2000, pro: 120, carb: 200, fat: 55 }, pin: null, avatar: null },
  { id: 'hermano', name: 'Hermano', role: 'Athlete', color: 'sky', goals: { cal: 2500, pro: 150, carb: 250, fat: 65 }, pin: null, avatar: null },
  { id: 'cunada', name: 'Cuñada', role: 'Athlete', color: 'silver', goals: { cal: 1900, pro: 110, carb: 180, fat: 50 }, pin: null, avatar: null },
];

const uniqueById = (arr) => Array.from(new Map(arr.map(p => [p.id, p])).values());

export default function App() {
  const [showIntro, setShowIntro] = useState(() => {
    return !sessionStorage.getItem('lomecan_intro_shown');
  });

  const [activeProfile, setActiveProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('lastActiveProfile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentTab, setCurrentTab] = useState('hoy');
  const [dailyIntake, setDailyIntake] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileManager, setShowProfileManager] = useState(false);
  const [openLibrary, setOpenLibrary] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [exitToast, setExitToast] = useState(false);

  const stateRef = useRef({
    showIntro: false,
    currentTab: 'hoy',
    showOnboarding: false,
    showProfileManager: false,
    openLibrary: false,
    activeProfile: null,
  });

  stateRef.current = {
    showIntro,
    currentTab,
    showOnboarding,
    showProfileManager,
    openLibrary,
    activeProfile,
  };

  const lastBackPressRef = useRef(0);
  const exitToastTimerRef = useRef(null);

  useReminders(activeProfile?.id);
  const { queue, isSyncing, addToQueue } = useOfflineQueue(activeProfile?.id);
  const { logs: weightLogs } = useWeightLogs(activeProfile?.id);

  // =========================================================================
  // GESTOR PRINCIPAL DEL BOTÓN ATRÁS (UNIFICADO Y PERSISTENTE)
  // =========================================================================
  const executeBackAction = useCallback(() => {
    const currentState = stateRef.current;

    // 0. Si está la pantalla de inicio, saltarla
    if (currentState.showIntro) {
      sessionStorage.setItem('lomecan_intro_shown', 'true');
      setShowIntro(false);
      return;
    }

    // 1. Emitir evento a componentes hijos (Modales de Gym, Catálogo, etc.)
    const customBackEvent = new CustomEvent('lomecan-hardware-back', { cancelable: true });
    window.dispatchEvent(customBackEvent);

    if (customBackEvent.defaultPrevented) {
      return;
    }

    // 2. Modales de nivel superior de App.jsx
    if (currentState.showOnboarding) {
      setShowOnboarding(false);
      return;
    }
    if (currentState.showProfileManager) {
      setShowProfileManager(false);
      return;
    }
    if (currentState.openLibrary) {
      setOpenLibrary(false);
      return;
    }

    // 3. Si no estamos en la pestaña principal "Hoy" (Dashboard), regresar a "Hoy"
    if (currentState.currentTab !== 'hoy') {
      setCurrentTab('hoy');
      return;
    }

    // 4. En el Dashboard: Doble pulsación para salir
    const now = Date.now();
    if (now - lastBackPressRef.current < 2000) {
      if (exitToastTimerRef.current) clearTimeout(exitToastTimerRef.current);
      setExitToast(false);
      try {
        CapApp.exitApp();
      } catch (e) {}
    } else {
      lastBackPressRef.current = now;
      setExitToast(true);

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(30); } catch {}
      }

      if (exitToastTimerRef.current) clearTimeout(exitToastTimerRef.current);
      exitToastTimerRef.current = setTimeout(() => {
        setExitToast(false);
      }, 2000);
    }
  }, []);

  useEffect(() => {
    let capListener;

    const setupListeners = async () => {
      try {
        capListener = await CapApp.addListener('backButton', () => {
          executeBackAction();
        });
      } catch (e) {}
    };

    setupListeners();

    const pushHistoryTrap = () => {
      window.history.pushState({ lomecanTrap: Date.now() }, '');
    };
    pushHistoryTrap();

    const handlePopState = () => {
      pushHistoryTrap();
      executeBackAction();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      if (capListener) capListener.remove();
      window.removeEventListener('popstate', handlePopState);
      if (exitToastTimerRef.current) clearTimeout(exitToastTimerRef.current);
    };
  }, [executeBackAction]);

  // Cargar perfiles
  useEffect(() => {
    let isMounted = true;
    const loadProfiles = async () => {
      try {
        const list = await fetchProfiles();
        if (!isMounted) return;
        const cleaned = uniqueById(list && list.length > 0 ? list : DEFAULT_PROFILES);
        setProfiles(cleaned);

        if (activeProfile) {
          const fresh = cleaned.find(p => p.id === activeProfile.id);
          if (fresh) {
            setActiveProfile(fresh);
            localStorage.setItem('lastActiveProfile', JSON.stringify(fresh));
          }
        }
      } catch {
        if (!isMounted) return;
        const saved = localStorage.getItem('userProfiles') || localStorage.getItem('profilesCache');
        setProfiles(saved ? uniqueById(JSON.parse(saved)) : DEFAULT_PROFILES);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadProfiles();
    return () => { isMounted = false; };
  }, []);

  const handleSelectProfile = useCallback((profile) => {
    setActiveProfile(profile);
    localStorage.setItem('lastActiveProfile', JSON.stringify(profile));
  }, []);

  const handleLogout = useCallback(() => {
    setActiveProfile(null);
    localStorage.removeItem('lastActiveProfile');
  }, []);

  // Cargar rutinas
  useEffect(() => {
    if (!activeProfile?.id) {
      setRoutines([]);
      return;
    }

    let isMounted = true;
    const loadRoutines = async () => {
      try {
        const userRoutines = await fetchUserRoutines(activeProfile.id);
        if (isMounted) setRoutines(userRoutines || []);
      } catch {
        if (!isMounted) return;
        const cached = localStorage.getItem(`userRoutines_${activeProfile.id}`);
        setRoutines(cached ? JSON.parse(cached) : []);
      }
    };
    loadRoutines();
    return () => { isMounted = false; };
  }, [activeProfile?.id]);

  // Cargar ingesta diaria
  useEffect(() => {
    if (!activeProfile?.id) return;
    let isMounted = true;
    const loadData = async () => {
      try {
        const supabaseIntake = await fetchDailyIntake(activeProfile.id);
        if (isMounted) setDailyIntake(supabaseIntake || []);
      } catch {
        if (isMounted) {
          setDailyIntake(JSON.parse(localStorage.getItem(`dailyIntake_${activeProfile.id}`) || '[]'));
        }
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [activeProfile?.id]);

  // Calibración inicial si faltan datos
  useEffect(() => {
    if (activeProfile?.id && !activeProfile.id.startsWith('temp_')) {
      const needsOnboarding = !activeProfile.weight || !activeProfile.height || !activeProfile.age;
      setShowOnboarding(needsOnboarding);
    }
  }, [activeProfile?.id, activeProfile?.weight, activeProfile?.height, activeProfile?.age]);

  const updateRoutines = useCallback(async (newRoutines) => {
    setRoutines(newRoutines);
    if (!activeProfile?.id) return;

    localStorage.setItem(`userRoutines_${activeProfile.id}`, JSON.stringify(newRoutines));

    for (const routine of newRoutines) {
      try {
        await saveUserRoutine(activeProfile.id, routine);
      } catch {
        addToQueue('saveRoutine', { profileId: activeProfile.id, routine });
      }
    }

    const existingIds = new Set(newRoutines.map(r => r.id));
    for (const routine of routines) {
      if (!existingIds.has(routine.id)) {
        try {
          await deleteUserRoutine(activeProfile.id, routine.id, false);
        } catch {
          addToQueue('deleteRoutine', { profileId: activeProfile.id, id: routine.id });
        }
      }
    }
  }, [activeProfile?.id, routines, addToQueue]);

  const addFoodToDay = useCallback(async (food, grams) => {
    const base = Number(food.base_g) || 100;
    const g = Number(grams) || 100;
    const ratio = g / base;

    const newEntry = {
      id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      foodId: food.id || null,
      foodName: food.name,
      grams: g,
      mealType: food.mealType || null,
      macros: {
        cal: Math.round((Number(food.cal) || 0) * ratio),
        pro: parseFloat(((Number(food.pro) || 0) * ratio).toFixed(1)),
        carb: parseFloat(((Number(food.carb) || 0) * ratio).toFixed(1)),
        fat: parseFloat(((Number(food.fat) || 0) * ratio).toFixed(1)),
      },
      timestamp: new Date().toISOString(),
    };

    setDailyIntake(prev => [newEntry, ...prev]);

    if (activeProfile?.id) {
      const key = `dailyIntake_${activeProfile.id}`;
      const stored = JSON.parse(localStorage.getItem(key) || '[]');
      stored.unshift(newEntry);
      localStorage.setItem(key, JSON.stringify(stored));

      try {
        const saved = await addDailyIntakeItem(activeProfile.id, newEntry);
        if (saved?.id) {
          setDailyIntake(prev => prev.map(i => i.id === newEntry.id ? { ...i, id: saved.id } : i));
        }
      } catch {
        addToQueue('saveFood', { profileId: activeProfile.id, ...newEntry });
      }
    }
  }, [activeProfile?.id, addToQueue]);

  const deleteFoodFromDay = useCallback(async (entryId) => {
    setDailyIntake(prev => prev.filter(item => item.id !== entryId));

    if (activeProfile?.id) {
      const key = `dailyIntake_${activeProfile.id}`;
      const stored = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = stored.filter(item => item.id !== entryId);
      localStorage.setItem(key, JSON.stringify(updated));

      try {
        await deleteDailyIntakeItem(activeProfile.id, entryId);
      } catch {
        addToQueue('deleteFood', { id: entryId, profileId: activeProfile.id });
      }
    }
  }, [activeProfile?.id, addToQueue]);

  const handleUpdateProfile = useCallback(async (updatedProfile) => {
    const validId = updatedProfile.id || updatedProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '') || `user_${Date.now()}`;
    const profileWithId = {
      ...updatedProfile,
      id: validId,
      goals: updatedProfile.goals || { cal: 2000, pro: 120, carb: 200, fat: 55 }
    };

    setProfiles(prev => {
      const exists = prev.some(p => p.id === profileWithId.id);
      const updatedList = exists
        ? prev.map(p => p.id === profileWithId.id ? profileWithId : p)
        : [...prev, profileWithId];
      const cleaned = uniqueById(updatedList);
      localStorage.setItem('userProfiles', JSON.stringify(cleaned));
      localStorage.setItem('profilesCache', JSON.stringify(cleaned));
      return cleaned;
    });

    try {
      await updateProfile(profileWithId);
    } catch {
      addToQueue('updateProfile', profileWithId);
    }

    if (!activeProfile || activeProfile.id === profileWithId.id) {
      setActiveProfile(profileWithId);
      localStorage.setItem('lastActiveProfile', JSON.stringify(profileWithId));
    }
  }, [activeProfile, addToQueue]);

  const handleAddNewProfile = useCallback(() => {
    const tempId = `temp_${Date.now()}`;
    const newEmptyProfile = {
      id: tempId,
      name: '',
      role: 'Athlete',
      color: 'lime',
      avatar: `https://api.dicebear.com/9.x/adventurer/svg?seed=${tempId}`,
      weight: null,
      height: null,
      age: null,
      gender: 'male',
      goals: { cal: 2000, pro: 120, carb: 200, fat: 55 },
      water_goal: 2000,
    };
    setActiveProfile(newEmptyProfile);
    setShowOnboarding(true);
  }, []);

  const currentRoutine = useMemo(() => routines.find(r => r.is_active === true), [routines]);
  const pendingWorkout = Boolean(currentRoutine);

  if (showIntro) {
    return (
      <IntroScreen
        onFinish={() => {
          sessionStorage.setItem('lomecan_intro_shown', 'true');
          setShowIntro(false);
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#050507] flex items-center justify-center select-none">
        <div className="flex flex-col items-center gap-3.5">
          <div className="w-12 h-12 border-2 border-[#D4FF00]/20 border-t-[#D4FF00] rounded-full animate-spin shadow-[0_0_20px_rgba(212,255,0,0.2)]" />
          <p className="text-zinc-400 text-[10px] font-mono tracking-[0.25em] uppercase font-bold">LOMECAN SYSTEM</p>
        </div>
      </div>
    );
  }

  if (showProfileManager) {
    return (
      <ProfileManager
        profiles={profiles}
        onUpdateProfiles={(newProfiles) => {
          const cleaned = uniqueById(newProfiles);
          setProfiles(cleaned);
          localStorage.setItem('userProfiles', JSON.stringify(cleaned));
          localStorage.setItem('profilesCache', JSON.stringify(cleaned));
        }}
        onClose={() => setShowProfileManager(false)}
      />
    );
  }

  if (!activeProfile && !showOnboarding) {
    return (
      <ProfileSelection
        profiles={profiles}
        onSelectProfile={handleSelectProfile}
        onAddProfile={handleAddNewProfile}
        onUpdateProfile={handleUpdateProfile}
      />
    );
  }

  if (showOnboarding) {
    return (
      <OnboardingWizard
        initialName={activeProfile?.name || ''}
        onCancel={() => {
          try {
            const saved = localStorage.getItem('lastActiveProfile');
            const lastProf = saved ? JSON.parse(saved) : null;
            if (lastProf && profiles.some(p => p.id === lastProf.id)) {
              setActiveProfile(lastProf);
            } else {
              setActiveProfile(null);
            }
          } catch {
            setActiveProfile(null);
          }
          setShowOnboarding(false);
        }}
        onComplete={async (data) => {
          const finalName = data.name?.trim() || activeProfile?.name?.trim() || `Atleta ${profiles.length + 1}`;
          const newRealId = `user_${Date.now()}`;
          const updatedProfile = {
            ...activeProfile,
            ...data,
            name: finalName,
            id: (activeProfile?.id && !activeProfile.id.startsWith('temp_')) ? activeProfile.id : newRealId,
          };
          await handleUpdateProfile(updatedProfile);
          setActiveProfile(updatedProfile);
          localStorage.setItem('lastActiveProfile', JSON.stringify(updatedProfile));
          setShowOnboarding(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#050507] flex justify-center font-sans relative overflow-hidden">
      <div className="w-full max-w-md bg-transparent relative flex flex-col h-[100dvh] z-10">
        
        {/* Banner de Sincronización */}
        {queue.length > 0 && (
          <div 
            className="bg-[#D4FF00]/10 border-b border-[#D4FF00]/25 text-[#D4FF00] text-[10px] font-mono tracking-wider font-bold text-center py-1 z-30 backdrop-blur-xl flex items-center justify-center gap-1.5"
            style={{ paddingTop: 'calc(0.25rem + env(safe-area-inset-top, 0px))' }}
          >
            <Radio size={11} className="animate-pulse" />
            {isSyncing ? 'SINCRONIZANDO CON NUBE...' : `MODO OFFLINE · ${queue.length} CAMBIOS EN COLA`}
          </div>
        )}

        {/* Header Superior */}
        <header 
          className="px-5 pb-2.5 flex justify-between items-center z-20 bg-[#050507]/80 backdrop-blur-2xl border-b border-white/[0.05] shrink-0"
          style={{ paddingTop: queue.length > 0 ? '0.75rem' : 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
        >
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-full p-[1px] bg-gradient-to-b from-white/20 via-[#D4FF00]/40 to-transparent shadow-[0_0_12px_rgba(212,255,0,0.15)]">
              <div className="w-full h-full rounded-full overflow-hidden bg-[#0A0A0F] flex items-center justify-center">
                {activeProfile?.avatar?.startsWith('http') ? (
                  <img src={activeProfile.avatar} alt={activeProfile.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-black text-xs text-white">{activeProfile?.avatar || activeProfile?.name?.charAt(0) || 'A'}</span>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-white text-xs font-extrabold tracking-tight">{activeProfile?.name || 'Atleta'}</span>
              </div>
              <span className="text-[9px] font-mono font-bold tracking-[0.2em] text-[#D4FF00]/80 uppercase block">
                {activeProfile?.role || 'ATLETA PRO'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeProfile?.id === 'adrian' && (
              <>
                <button
                  onClick={() => setShowProfileManager(true)}
                  className="p-2 rounded-full bg-white/[0.03] border border-white/[0.08] text-zinc-400 hover:text-white active:scale-95 transition-all"
                  title="Gestionar perfiles"
                >
                  <Users size={14} />
                </button>
                <button
                  onClick={() => {
                    setCurrentTab('gimnasio');
                    setOpenLibrary(true);
                  }}
                  className="p-2 rounded-full bg-white/[0.03] border border-white/[0.08] text-zinc-400 hover:text-white active:scale-95 transition-all"
                  title="Biblioteca de ejercicios"
                >
                  <Lock size={14} />
                </button>
              </>
            )}

            <button
              onClick={handleLogout}
              className="text-[10px] font-mono tracking-widest font-extrabold uppercase border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 rounded-full text-zinc-400 hover:text-white hover:border-[#D4FF00]/40 transition-all active:scale-95 flex items-center gap-1"
            >
              <LogOut size={11} /> Cambiar
            </button>
          </div>
        </header>

        {/* Vista activa */}
        <main className="flex-1 overflow-y-auto flex flex-col overscroll-none touch-pan-y no-scrollbar">
          {currentTab === 'hoy' && (
            <Dashboard
              profile={activeProfile}
              dailyIntake={dailyIntake}
              weightLogs={weightLogs}
              currentRoutine={currentRoutine}
              onStartWorkout={() => setCurrentTab('gimnasio')}
              onGoToRoutines={() => setCurrentTab('gimnasio')}
              onGoToEvolution={() => setCurrentTab('evolucion')}
              onAddFood={addFoodToDay}
              onDeleteFood={deleteFoodFromDay}
              onUpdateProfile={handleUpdateProfile}
            />
          )}

          {currentTab === 'alimentos' && (
            <FoodCatalog onAddToDay={addFoodToDay} goals={activeProfile?.goals} />
          )}

          {currentTab === 'gimnasio' && (
            <GymTracker
              activeProfile={activeProfile}
              routines={routines}
              onUpdateRoutines={updateRoutines}
              openLibrary={openLibrary}
              onLibraryOpened={() => setOpenLibrary(false)}
              addToQueue={addToQueue}
            />
          )}

          {currentTab === 'evolucion' && (
            <EvolutionView activeProfile={activeProfile} />
          )}
        </main>

        {/* Navegación inferior */}
        <BottomNav
          activeTab={currentTab}
          setActiveTab={setCurrentTab}
          pendingWorkout={pendingWorkout}
        />

        <InstallPrompt />

        {/* Aviso flotante de salida */}
        {exitToast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[999] bg-[#0A0A0F]/95 border border-[#D4FF00] text-white text-xs font-mono font-black px-5 py-3 rounded-full shadow-[0_0_35px_rgba(212,255,0,0.4)] backdrop-blur-2xl animate-fade-in flex items-center gap-2.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D4FF00] animate-ping" />
            <span>Presiona de nuevo para salir de Lomecan</span>
          </div>
        )}
      </div>
    </div>
  );
}