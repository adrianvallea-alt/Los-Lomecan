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
import { Edit3, Users, Lock } from 'lucide-react';
import { fetchProfiles, fetchRoutines, fetchDailyIntake, addDailyIntakeItem, updateProfile } from './lib/dataService';
import useReminders from './hooks/useReminders';
import useOfflineQueue from './hooks/useOfflineQueue';

const DEFAULT_PROFILES = [
  { id: 'adrian', name: 'Adrián', role: 'Coach', color: 'bg-pastel-green text-dark-bg', goals: { cal: 2800, pro: 180, carb: 300, fat: 75 }, pin: null, avatar: null },
  { id: 'esposa', name: 'Esposa', role: 'Fitness Partner', color: 'bg-pastel-lavender text-dark-bg', goals: { cal: 2000, pro: 120, carb: 200, fat: 55 }, pin: null, avatar: null },
  { id: 'hermano', name: 'Hermano', role: 'Athlete', color: 'bg-pastel-blue text-dark-bg', goals: { cal: 2500, pro: 150, carb: 250, fat: 65 }, pin: null, avatar: null },
  { id: 'cunada', name: 'Cuñada', role: 'Athlete', color: 'bg-soft-gray text-dark-bg', goals: { cal: 1900, pro: 110, carb: 180, fat: 50 }, pin: null, avatar: null },
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
        let merged = supabaseProfiles.length > 0
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
      }
      setLoading(false);
    };
    loadProfiles();
  }, []);

  useEffect(() => {
    if (profiles.length > 0) localStorage.setItem('userProfiles', JSON.stringify(uniqueById(profiles)));
  }, [profiles]);

  useEffect(() => {
    if (!activeProfile) return;
    const loadData = async () => {
      try {
        const supabaseRoutines = await fetchRoutines(activeProfile.id);
        setRoutines(supabaseRoutines.length > 0 ? supabaseRoutines : JSON.parse(localStorage.getItem(`workoutRoutines_${activeProfile.id}`) || '[]'));
        const supabaseIntake = await fetchDailyIntake(activeProfile.id);
        setDailyIntake(supabaseIntake.length > 0 ? supabaseIntake : JSON.parse(localStorage.getItem(`dailyIntake_${activeProfile.id}`) || '[]'));
      } catch (err) {
        setRoutines(JSON.parse(localStorage.getItem(`workoutRoutines_${activeProfile.id}`) || '[]'));
        setDailyIntake(JSON.parse(localStorage.getItem(`dailyIntake_${activeProfile.id}`) || '[]'));
      }
    };
    loadData();
  }, [activeProfile]);

  useEffect(() => {
    if (activeProfile) {
      const needsOnboarding = !activeProfile.weight || !activeProfile.height || !activeProfile.age;
      setShowOnboarding(needsOnboarding);
    }
  }, [activeProfile]);

  const updateRoutines = (newRoutines) => {
    setRoutines(newRoutines);
    if (activeProfile) localStorage.setItem(`workoutRoutines_${activeProfile.id}`, JSON.stringify(newRoutines));
  };

  const addFoodToDay = async (food, grams) => {
    const newEntry = {
      id: Date.now(),
      foodId: food.id,
      foodName: food.name,
      grams,
      macros: {
        cal: (food.cal * grams) / food.base_g,
        pro: (food.pro * grams) / food.base_g,
        carb: (food.carb * grams) / food.base_g,
        fat: (food.fat * grams) / food.base_g,
      },
      timestamp: new Date().toISOString(),
    };
    setDailyIntake(prev => [...prev, newEntry]);
    if (activeProfile) {
      const key = `dailyIntake_${activeProfile.id}`;
      const stored = JSON.parse(localStorage.getItem(key) || '[]');
      stored.push(newEntry);
      localStorage.setItem(key, JSON.stringify(stored));
      try {
        await addDailyIntakeItem(activeProfile.id, newEntry);
      } catch (e) {
        addToQueue('saveFood', newEntry);
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
      try { await updateProfile(updatedProfile); } catch (e) { addToQueue('updateProfile', updatedProfile); }
    }
  };

  const handleAddProfile = () => setShowNewProfileModal(true);

  const handleSaveNewProfile = async (newProfile) => {
    const profile = {
      ...newProfile,
      id: newProfile.id || 'user_' + Date.now(),
      goals: newProfile.goals || { cal: 2000, pro: 100, carb: 200, fat: 50 },
      role: newProfile.role || 'Athlete',
      color: newProfile.color || 'bg-pastel-green text-dark-bg',
      pin: newProfile.pin || null,
      avatar: newProfile.avatar || null,
    };
    const updated = uniqueById([...profiles, profile]);
    setProfiles(updated);
    localStorage.setItem('userProfiles', JSON.stringify(updated));
    try { await updateProfile(profile); } catch (e) { addToQueue('updateProfile', profile); }
    setShowNewProfileModal(false);
  };

  const handleUpdateProfile = async (updatedProfile) => {
    const updated = profiles.map(p => p.id === updatedProfile.id ? updatedProfile : p);
    const cleaned = uniqueById(updated);
    setProfiles(cleaned);
    localStorage.setItem('userProfiles', JSON.stringify(cleaned));
    try { await updateProfile(updatedProfile); } catch (e) { addToQueue('updateProfile', updatedProfile); }
    if (activeProfile && activeProfile.id === updatedProfile.id) setActiveProfile(updatedProfile);
  };

  const handleProfilesUpdate = (newProfiles) => {
    const cleaned = uniqueById(newProfiles);
    setProfiles(cleaned);
    localStorage.setItem('userProfiles', JSON.stringify(cleaned));
  };

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const currentRoutine = routines.find(r => r.month === currentMonth && r.year === currentYear);
  const pendingWorkout = !!currentRoutine;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#D4FF00]/20 border-t-[#D4FF00] rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  if (showIntro) return <IntroScreen onFinish={finishIntro} />;

  if (showProfileManager) {
    return (
      <ProfileManager
        profiles={profiles}
        onUpdateProfiles={handleProfilesUpdate}
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
          onAddProfile={handleAddProfile}
          onUpdateProfile={handleUpdateProfile}
        />
        {showNewProfileModal && (
          <EditProfileModal
            profile={{ name: '', color: 'bg-pastel-green text-dark-bg', pin: '', avatar: '' }}
            onSave={(profile) => { handleSaveNewProfile(profile); setShowNewProfileModal(false); }}
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
          />
        );
      case 'alimentos':
        return <FoodCatalog onAddToDay={addFoodToDay} />;
      case 'gimnasio':
        return (
          <GymTracker
            routines={routines}
            onUpdateRoutines={updateRoutines}
            activeProfile={activeProfile}
            openLibrary={openLibrary}
            onLibraryOpened={() => setOpenLibrary(false)}
            addToQueue={addToQueue}
            currentRoutine={currentRoutine}
          />
        );
      case 'evolucion':
        return <EvolutionView activeProfile={activeProfile} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] flex justify-center font-sans relative">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#D4FF00]/[0.03] via-transparent to-transparent opacity-40 pointer-events-none z-0" />
      
      <div className="w-full max-w-md bg-transparent relative flex flex-col h-screen z-10">
        {queue.length > 0 && (
          <div className="absolute top-0 left-0 right-0 bg-[#D4FF00]/10 border-b border-[#D4FF00]/20 text-[#D4FF00] text-xs text-center py-1.5 z-20 font-medium backdrop-blur-sm">
            {isSyncing ? 'Sincronizando...' : `${queue.length} cambio(s) pendiente(s)`}
          </div>
        )}

        <header className="px-5 pt-5 pb-3 flex justify-between items-center z-10 bg-[#09090B]/80 backdrop-blur-xl border-b border-white/[0.04]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden bg-white/[0.06] border border-white/[0.08]">
              {activeProfile.avatar?.startsWith('http') ? (
                <img src={activeProfile.avatar} alt={activeProfile.name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-sm text-white">{activeProfile.avatar || activeProfile.name.charAt(0)}</span>
              )}
            </div>
            {editingName ? (
              <input
                autoFocus
                className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-white text-sm focus:outline-none focus:border-[#D4FF00]/40"
                defaultValue={activeProfile.name}
                onBlur={(e) => { handleUpdateProfileName(e.target.value); setEditingName(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { handleUpdateProfileName(e.target.value); setEditingName(false); } else if (e.key === 'Escape') setEditingName(false); }}
              />
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-300 text-sm font-medium">{activeProfile.name}</span>
                <button onClick={() => setEditingName(true)} className="p-1 text-zinc-500 hover:text-white transition-colors">
                  <Edit3 size={12} />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeProfile.id === 'adrian' && (
              <>
                <button onClick={() => setShowProfileManager(true)} className="p-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white transition-all" title="Gestionar perfiles">
                  <Users size={16} />
                </button>
                <button onClick={() => { setCurrentTab('gimnasio'); setOpenLibrary(true); }} className="p-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white transition-all" title="Biblioteca de ejercicios">
                  <Lock size={16} />
                </button>
              </>
            )}
            <button
              onClick={() => { setActiveProfile(null); setEditingName(false); }}
              className="text-[11px] uppercase tracking-wider font-semibold border border-white/[0.08] px-3 py-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-all"
            >
              Cambiar
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pt-4 pb-24 flex flex-col">
          {renderContent()}
        </div>

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