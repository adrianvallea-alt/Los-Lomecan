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
import { Edit3, Users, Lock, Radio } from 'lucide-react';
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
  const [activeProfile, setActiveProfile] = useState(() => {
    const saved = localStorage.getItem('lastActiveProfile');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentTab, setCurrentTab] = useState('hoy');
  const [dailyIntake, setDailyIntake] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [editingName, setEditingName] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileManager, setShowProfileManager] = useState(false);
  const [showNewProfileModal, setShowNewProfileModal] = useState(false);
  const [openLibrary, setOpenLibrary] = useState(false);
  const [introSkipped, setIntroSkipped] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

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
        const cleaned = uniqueById(merged);
        setProfiles(cleaned);

        if (activeProfile) {
          const fresh = cleaned.find(p => p.id === activeProfile.id);
          if (fresh) {
            setActiveProfile(fresh);
            localStorage.setItem('lastActiveProfile', JSON.stringify(fresh));
          }
        }
      } catch (err) {
        const saved = localStorage.getItem('userProfiles');
        setProfiles(saved ? uniqueById(JSON.parse(saved)) : DEFAULT_PROFILES);
      } finally {
        setLoading(false);
      }
    };
    loadProfiles();
  }, []);

  const handleSelectProfile = (profile) => {
    setActiveProfile(profile);
    localStorage.setItem('lastActiveProfile', JSON.stringify(profile));
  };

  const handleLogout = () => {
    setActiveProfile(null);
    localStorage.removeItem('lastActiveProfile');
  };

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

  // Onboarding
  useEffect(() => {
    if (activeProfile) {
      const needsOnboarding = !activeProfile.weight || !activeProfile.height || !activeProfile.age;
      setShowOnboarding(needsOnboarding);
    }
  }, [activeProfile]);

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

  // Añadir alimento al día (CON PRESERVACIÓN DE CATEGORÍA / MEALTYPE)
  const addFoodToDay = async (food, grams) => {
    const newEntry = {
      id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      foodId: food.id || null,
      foodName: food.name,
      grams,
      mealType: food.mealType || null,
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
      localStorage.setItem('lastActiveProfile', JSON.stringify(updatedProfile));
    }
  };

  const currentRoutine = routines.find(r => r.is_active === true);
  const pendingWorkout = Boolean(currentRoutine);

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
          onSelectProfile={handleSelectProfile}
          onAddProfile={() => setShowNewProfileModal(true)}
          onUpdateProfile={handleUpdateProfile}
        />
        {showNewProfileModal && (
          <EditProfileModal
            profile={{ name: '', color: 'lime', pin: '', avatar: '' }}
            onSave={(profile) => {
              handleSelectProfile(profile);
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
      <div className="w-full max-w-md bg-transparent relative flex flex-col h-[100dvh] z-10">
        
        {queue.length > 0 && (
          <div className="bg-[#D4FF00]/10 border-b border-[#D4FF00]/25 text-[#D4FF00] text-[10px] font-mono tracking-wider font-bold text-center py-1 z-30 backdrop-blur-xl flex items-center justify-center gap-1.5">
            <Radio size={11} className="animate-pulse" />
            {isSyncing ? 'SINCRONIZANDO CON NUBE...' : `MODO OFFLINE · ${queue.length} CAMBIOS EN COLA`}
          </div>
        )}

        {/* Header superior */}
        <header className="px-5 pt-3.5 pb-2.5 flex justify-between items-center z-20 bg-[#050507]/80 backdrop-blur-2xl border-b border-white/[0.05] shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-full p-[1px] bg-gradient-to-b from-white/20 via-[#D4FF00]/40 to-transparent shadow-[0_0_12px_rgba(212,255,0,0.15)]">
              <div className="w-full h-full rounded-full overflow-hidden bg-[#0A0A0F] flex items-center justify-center">
                {activeProfile.avatar?.startsWith('http') ? (
                  <img src={activeProfile.avatar} alt={activeProfile.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-black text-xs text-white">{activeProfile.avatar || activeProfile.name?.charAt(0)}</span>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-white text-xs font-extrabold tracking-tight">{activeProfile.name}</span>
              </div>
              <span className="text-[9px] font-mono font-bold tracking-[0.2em] text-[#D4FF00]/80 uppercase block">
                {activeProfile.role || 'ATLETA PRO'}
              </span>
            </div>
          </div>

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
              onClick={handleLogout}
              className="text-[10px] font-mono tracking-widest font-extrabold uppercase border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 rounded-full text-zinc-400 hover:text-white hover:border-[#D4FF00]/40 transition-all active:scale-95"
            >
              Cambiar
            </button>
          </div>
        </header>

        {/* Vista activa */}
        <div className="flex-1 overflow-y-auto flex flex-col overscroll-none touch-pan-y no-scrollbar">
          {renderContent()}
        </div>

        {/* Navegación inferior */}
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