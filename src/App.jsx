// src/App.jsx
import React, { useState, useEffect } from 'react';
import ProfileSelection from './components/ProfileSelection';
import BottomNav from './components/BottomNav';
import Dashboard from './components/Dashboard';
import FoodCatalog from './components/FoodCatalog';
import GymTracker from './components/GymTracker';
import EvolutionView from './components/EvolutionView';
import ProfileManager from './components/ProfileManager';
import EditProfileModal from './components/EditProfileModal';
import IntroScreen from './components/IntroScreen';
import OnboardingWizard from './components/OnboardingWizard';
import InstallPrompt from './components/InstallPrompt';
import { Edit3, Users, Lock, Sparkles, Shield, Radio } from 'lucide-react';
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

const DEFAULT_PROFILES = [
  { id: 'adrian', name: 'Adrián', role: 'Coach', color: 'lime', goals: { cal: 2800, pro: 180, carb: 300, fat: 75 }, pin: null, avatar: null },
  { id: 'esposa', name: 'Esposa', role: 'Fitness Partner', color: 'lavender', goals: { cal: 2000, pro: 120, carb: 200, fat: 55 }, pin: null, avatar: null },
  { id: 'hermano', name: 'Hermano', role: 'Athlete', color: 'sky', goals: { cal: 2500, pro: 150, carb: 250, fat: 65 }, pin: null, avatar: null },
  { id: 'cunada', name: 'Cuñada', role: 'Athlete', color: 'silver', goals: { cal: 1900, pro: 110, carb: 180, fat: 50 }, pin: null, avatar: null },
];

const uniqueById = (arr) => Array.from(new Map(arr.map(p => [p.id, p])).values());

export default function App() {
  const [activeProfile, setActiveProfile] = useState(null);
  const [currentTab, setCurrentTab] = useState('hoy');
  const [dailyIntake, setDailyIntake] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [editingName, setEditingName] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileManager, setShowProfileManager] = useState(false);
  const [showNewProfileModal, setShowNewProfileModal] = useState(false);
  const [openLibrary, setOpenLibrary] = useState(false);
  const [introSkipped, setIntroSkipped] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const showIntro = !activeProfile && !introSkipped;
  const finishIntro = () => setIntroSkipped(true);

  useReminders(activeProfile?.id);
  const { queue, isSyncing, addToQueue } = useOfflineQueue(activeProfile?.id);

  // Cargar perfiles
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const supabaseProfiles = await fetchProfiles();
        let merged = supabaseProfiles && supabaseProfiles.length > 0
          ? supabaseProfiles.map(p => ({
              ...p,
              goals: p.goals || { cal: 2000, pro: 100, carb: 200, fat: 50 },
              pin: p.pin || null,
              avatar: p.avatar || null,
            }))
          : DEFAULT_PROFILES;
        setProfiles(uniqueById(merged));
      } catch (err) {
        const saved = localStorage.getItem('userProfiles');
        setProfiles(saved ? uniqueById(JSON.parse(saved)) : DEFAULT_PROFILES);
      } finally {
        setLoading(false);
      }
    };
    loadProfiles();
  }, []);

  useEffect(() => {
    if (profiles.length > 0) {
      localStorage.setItem('userProfiles', JSON.stringify(uniqueById(profiles)));
    }
  }, [profiles]);

  // Cargar rutinas del perfil activo
  useEffect(() => {
    if (!activeProfile) {
      setRoutines([]);
      return;
    }

    const loadRoutines = async () => {
      try {
        const userRoutines = await fetchUserRoutines(activeProfile.id);
        setRoutines(userRoutines || []);
      } catch (err) {
        const cached = localStorage.getItem(`userRoutines_${activeProfile.id}`);
        setRoutines(cached ? JSON.parse(cached) : []);
      }
    };
    loadRoutines();
  }, [activeProfile]);

  // Cargar ingesta diaria
  useEffect(() => {
    if (!activeProfile) return;
    const loadData = async () => {
      try {
        const supabaseIntake = await fetchDailyIntake(activeProfile.id);
        setDailyIntake(supabaseIntake || []);
      } catch (err) {
        setDailyIntake(JSON.parse(localStorage.getItem(`dailyIntake_${activeProfile.id}`) || '[]'));
      }
    };
    loadData();
  }, [activeProfile]);

  // Verificar si requiere onboarding
  useEffect(() => {
    if (activeProfile) {
      const needsOnboarding = !activeProfile.weight || !activeProfile.height || !activeProfile.age;
      setShowOnboarding(needsOnboarding);
    }
  }, [activeProfile]);

  // Actualizar rutinas
  const updateRoutines = async (newRoutines) => {
    setRoutines(newRoutines);
    if (!activeProfile) return;

    localStorage.setItem(`userRoutines_${activeProfile.id}`, JSON.stringify(newRoutines));

    for (const routine of newRoutines) {
      try {
        await saveUserRoutine(activeProfile.id, routine);
      } catch (err) {
        addToQueue('saveRoutine', { profileId: activeProfile.id, routine });
      }
    }

    const existingIds = new Set(newRoutines.map(r => r.id));
    for (const routine of routines) {
      if (!existingIds.has(routine.id)) {
        try {
          await deleteUserRoutine(activeProfile.id, routine.id, false);
        } catch (err) {
          console.warn('Error al eliminar rutina:', err);
        }
      }
    }
  };

  // Añadir alimento al día
  const addFoodToDay = async (food, grams) => {
    const newEntry = {
      id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      foodId: food.id || null,
      foodName: food.name,
      grams,
      macros: {
        cal: Math.round(((food.cal || 0) * grams) / (food.base_g || 100)),
        pro: parseFloat((((food.pro || 0) * grams) / (food.base_g || 100)).toFixed(1)),
        carb: parseFloat((((food.carb || 0) * grams) / (food.base_g || 100)).toFixed(1)),
        fat: parseFloat((((food.fat || 0) * grams) / (food.base_g || 100)).toFixed(1)),
      },
      timestamp: new Date().toISOString(),
    };

    setDailyIntake(prev => [newEntry, ...prev]);

    if (activeProfile) {
      const key = `dailyIntake_${activeProfile.id}`;
      const stored = JSON.parse(localStorage.getItem(key) || '[]');
      stored.unshift(newEntry);
      localStorage.setItem(key, JSON.stringify(stored));

      try {
        const saved = await addDailyIntakeItem(activeProfile.id, newEntry);
        if (saved?.id) {
          setDailyIntake(prev => prev.map(i => i.id === newEntry.id ? { ...i, id: saved.id } : i));
        }
      } catch (e) {
        addToQueue('saveFood', { profileId: activeProfile.id, ...newEntry });
      }
    }
  };

  // Eliminar alimento del día
  const deleteFoodFromDay = async (entryId) => {
    setDailyIntake(prev => prev.filter(item => item.id !== entryId));

    if (activeProfile) {
      const key = `dailyIntake_${activeProfile.id}`;
      const stored = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = stored.filter(item => item.id !== entryId);
      localStorage.setItem(key, JSON.stringify(updated));

      try {
        await deleteDailyIntakeItem(activeProfile.id, entryId);
      } catch (e) {
        addToQueue('deleteFood', { id: entryId });
      }
    }
  };

  const handleUpdateProfileName = async (newName) => {
    if (!activeProfile || !newName.trim()) return;
    const updatedProfiles = profiles.map(p => p.id === activeProfile.id ? { ...p, name: newName.trim() } : p);
    const cleaned = uniqueById(updatedProfiles);
    setProfiles(cleaned);
    setActiveProfile(prev => ({ ...prev, name: newName.trim() }));

    const updatedProfile = cleaned.find(p => p.id === activeProfile.id);
    if (updatedProfile) {
      try {
        await updateProfile(updatedProfile);
      } catch (e) {
        addToQueue('updateProfile', updatedProfile);
      }
    }
  };

  const handleSaveNewProfile = async (newProfile) => {
    const profile = {
      ...newProfile,
      id: newProfile.id || 'user_' + Date.now(),
      goals: newProfile.goals || { cal: 2000, pro: 100, carb: 200, fat: 50 },
      role: newProfile.role || 'Athlete',
      color: newProfile.color || 'lime',
      pin: newProfile.pin || null,
      avatar: newProfile.avatar || null,
    };
    const updated = uniqueById([...profiles, profile]);
    setProfiles(updated);
    localStorage.setItem('userProfiles', JSON.stringify(updated));

    try {
      await updateProfile(profile);
    } catch (e) {
      addToQueue('updateProfile', profile);
    }
    setShowNewProfileModal(false);
  };

  const handleUpdateProfile = async (updatedProfile) => {
    const updated = profiles.map(p => p.id === updatedProfile.id ? updatedProfile : p);
    const cleaned = uniqueById(updated);
    setProfiles(cleaned);
    localStorage.setItem('userProfiles', JSON.stringify(cleaned));

    try {
      await updateProfile(updatedProfile);
    } catch (e) {
      addToQueue('updateProfile', updatedProfile);
    }

    if (activeProfile && activeProfile.id === updatedProfile.id) {
      setActiveProfile(updatedProfile);
    }
  };

  const currentRoutine = routines.find(r => r.is_active === true);
  const pendingWorkout = Boolean(currentRoutine);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#050507] flex items-center justify-center select-none">
        <div className="flex flex-col items-center gap-3.5">
          <div className="w-12 h-12 border-2 border-[#D4FF00]/20 border-t-[#D4FF00] rounded-full animate-spin shadow-[0_0_20px_rgba(212,255,0,0.2)]" />
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF00] animate-pulse" />
            <p className="text-zinc-400 text-[10px] font-mono tracking-[0.25em] uppercase font-bold">LOMECAN SYSTEM</p>
          </div>
        </div>
      </div>
    );
  }

  if (showIntro) return <IntroScreen onFinish={finishIntro} />;

  if (showProfileManager) {
    return (
      <ProfileManager
        profiles={profiles}
        onUpdateProfiles={(newProfiles) => {
          const cleaned = uniqueById(newProfiles);
          setProfiles(cleaned);
          localStorage.setItem('userProfiles', JSON.stringify(cleaned));
        }}
        onClose={() => setShowProfileManager(false)}
      />
    );
  }

  if (!activeProfile) {
    return (
      <>
        <ProfileSelection
          profiles={profiles}
          onSelectProfile={setActiveProfile}
          onAddProfile={() => setShowNewProfileModal(true)}
          onUpdateProfile={handleUpdateProfile}
        />
        {showNewProfileModal && (
          <EditProfileModal
            profile={{ name: '', color: 'lime', pin: '', avatar: '' }}
            onSave={(profile) => {
              handleSaveNewProfile(profile);
              setShowNewProfileModal(false);
            }}
            onCancel={() => setShowNewProfileModal(false)}
          />
        )}
      </>
    );
  }

  if (showOnboarding) {
    return (
      <OnboardingWizard
        onComplete={(data) => {
          const updatedProfile = { ...activeProfile, ...data };
          handleUpdateProfile(updatedProfile);
          setShowOnboarding(false);
        }}
      />
    );
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'hoy':
        return (
          <Dashboard
            profile={activeProfile}
            dailyIntake={dailyIntake}
            currentRoutine={currentRoutine}
            onStartWorkout={() => setCurrentTab('gimnasio')}
            onGoToRoutines={() => setCurrentTab('gimnasio')}
            onGoToEvolution={() => setCurrentTab('evolucion')}
            onAddFood={addFoodToDay}
            onDeleteFood={deleteFoodFromDay}
          />
        );
      case 'alimentos':
        return <FoodCatalog onAddToDay={addFoodToDay} />;
      case 'gimnasio':
        return (
          <GymTracker
            activeProfile={activeProfile}
            routines={routines}
            onUpdateRoutines={updateRoutines}
            openLibrary={openLibrary}
            onLibraryOpened={() => setOpenLibrary(false)}
            addToQueue={addToQueue}
          />
        );
      case 'evolucion':
        return <EvolutionView activeProfile={activeProfile} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#050507] flex justify-center font-sans relative overflow-hidden">
      
      {/* Luces atmosféricas de fondo OLED */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#D4FF00]/[0.035] rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[350px] bg-[#B347FF]/[0.02] rounded-full blur-[160px]" />
      </div>

      <div className="w-full max-w-md bg-transparent relative flex flex-col h-[100dvh] z-10">
        
        {/* Micro-badge de sincronización en segundo plano */}
        {queue.length > 0 && (
          <div className="bg-[#D4FF00]/10 border-b border-[#D4FF00]/25 text-[#D4FF00] text-[10px] font-mono tracking-wider font-bold text-center py-1 z-30 backdrop-blur-xl flex items-center justify-center gap-1.5">
            <Radio size={11} className="animate-pulse" />
            {isSyncing ? 'SINCRONIZANDO CON NUBE...' : `MODO OFFLINE · ${queue.length} CAMBIOS EN COLA`}
          </div>
        )}

        {/* Header superior de telemetría de atleta VIP */}
        <header className="px-5 pt-3.5 pb-2.5 flex justify-between items-center z-20 bg-[#050507]/80 backdrop-blur-2xl border-b border-white/[0.05] shrink-0">
          <div className="flex items-center gap-3">
            
            {/* Avatar con anillo de titanio */}
            <div className="relative w-9 h-9 rounded-full p-[1px] bg-gradient-to-b from-white/20 via-[#D4FF00]/40 to-transparent shadow-[0_0_12px_rgba(212,255,0,0.15)]">
              <div className="w-full h-full rounded-full overflow-hidden bg-[#0A0A0F] flex items-center justify-center">
                {activeProfile.avatar?.startsWith('http') ? (
                  <img src={activeProfile.avatar} alt={activeProfile.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-black text-xs text-white">{activeProfile.avatar || activeProfile.name?.charAt(0)}</span>
                )}
              </div>
            </div>

            {/* Nombre y etiqueta de rendimiento */}
            {editingName ? (
              <input
                autoFocus
                className="bg-white/[0.05] border border-[#D4FF00] rounded-lg px-2 py-0.5 text-white text-xs font-bold focus:outline-none"
                defaultValue={activeProfile.name}
                onBlur={(e) => {
                  handleUpdateProfileName(e.target.value);
                  setEditingName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleUpdateProfileName(e.target.value);
                    setEditingName(false);
                  } else if (e.key === 'Escape') setEditingName(false);
                }}
              />
            ) : (
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-xs font-extrabold tracking-tight">{activeProfile.name}</span>
                  <button
                    onClick={() => setEditingName(true)}
                    className="p-0.5 text-zinc-500 hover:text-white transition-colors"
                  >
                    <Edit3 size={10} />
                  </button>
                </div>
                <span className="text-[9px] font-mono font-bold tracking-[0.2em] text-[#D4FF00]/80 uppercase block">
                  {activeProfile.role || 'ATLETA PRO'}
                </span>
              </div>
            )}
          </div>

          {/* Acciones de administración y cambio de perfil */}
          <div className="flex items-center gap-2">
            {activeProfile.id === 'adrian' && (
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
              onClick={() => {
                setActiveProfile(null);
                setEditingName(false);
              }}
              className="text-[10px] font-mono tracking-widest font-extrabold uppercase border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 rounded-full text-zinc-400 hover:text-white hover:border-[#D4FF00]/40 transition-all active:scale-95"
            >
              Cambiar
            </button>
          </div>
        </header>

        {/* Contenedor principal de vistas */}
        <div className="flex-1 overflow-y-auto flex flex-col overscroll-none touch-pan-y no-scrollbar">
          {renderContent()}
        </div>

        {/* Dock de navegación flotante */}
        <BottomNav
          activeTab={currentTab}
          setActiveTab={setCurrentTab}
          pendingWorkout={pendingWorkout}
        />

        <InstallPrompt />
      </div>
    </div>
  );
}