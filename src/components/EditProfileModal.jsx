// src/components/EditProfileModal.jsx
import React, { useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  X, Camera, User, Weight, Heart, Bell, RefreshCw, Sparkles, Smile, Loader2, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { COLORS } from '../utils/colors';
import useReminders from '../hooks/useReminders';

const EMOJIS = ['😎', '🏋️', '💪', '🔥', '🧘', '🤸', '⚡', '👑', '🐺', '🦍', '🏊', '🚴', '🎯', '🥊', '🥋'];

const DICEBEAR_STYLES = [
  { id: 'adventurer', label: 'Aventurero' },
  { id: 'avataaars', label: 'Cómic' },
  { id: 'personas', label: 'Personas' },
  { id: 'lorelei', label: 'Rostros Pro' },
  { id: 'bottts', label: 'Robots' },
  { id: 'notionists', label: 'Notion' },
  { id: 'fun-emoji', label: 'Emoji 3D' },
  { id: 'big-smile', label: 'Sonrisas' },
];

const ROLES = ['Coach', 'Athlete', 'Atleta Pro', 'Fitness Partner', 'Principiante'];

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentario', sub: 'Poco o nada de ejercicio (trabajo de escritorio)' },
  { value: 'light', label: 'Ligero', sub: 'Ejercicio 1 a 3 días por semana' },
  { value: 'moderate', label: 'Moderado', sub: 'Gimnasio 3 a 5 días por semana' },
  { value: 'active', label: 'Activo', sub: 'Entrenamiento intenso 6 a 7 días por semana' },
  { value: 'very_active', label: 'Muy activo / Pro', sub: 'Doble sesión o trabajo físico extenuante' },
];

const GOAL_TYPES = [
  { value: 'lose', label: 'Perder Grasa (Definición)', icon: '🔥', desc: 'Déficit moderado 20% + 2.2g proteína/kg' },
  { value: 'maintain', label: 'Mantenimiento / Recomposición', icon: '⚖️', desc: 'Normocalórica + 1.8g proteína/kg' },
  { value: 'gain', label: 'Ganar Músculo (Volumen Limpio)', icon: '💪', desc: 'Superávit 10% + 2.0g proteína/kg' },
];

const HEALTH_CONDITIONS = [
  { value: 'hypertension', label: 'Hipertensión arterial' },
  { value: 'pcos', label: 'Ovario poliquístico (SOP)' },
  { value: 'insulin_resistance', label: 'Resistencia a la insulina' },
  { value: 'type2_diabetes', label: 'Diabetes tipo 2' },
];

const calculateBMR = (weight, height, age, gender) => {
  if (!weight || !height || !age) return 0;
  const w = parseFloat(weight);
  const h = parseFloat(height);
  const a = parseInt(age, 10);
  return gender === 'female'
    ? Math.round((10 * w) + (6.25 * h) - (5 * a) - 161)
    : Math.round((10 * w) + (6.25 * h) - (5 * a) + 5);
};

const getActivityFactor = (level) => {
  const factors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  return factors[level] || 1.55;
};

const calculateTDEE = (bmr, activityLevel) => Math.round(bmr * getActivityFactor(activityLevel));

const calculateMacroGoals = (tdee, weight, goalType, conditions = []) => {
  const w = parseFloat(weight) || 70;
  let targetCalories = tdee;
  if (goalType === 'lose') {
    const deficit = Math.min(Math.max(tdee * 0.20, 300), 750);
    targetCalories = tdee - deficit;
  } else if (goalType === 'gain') {
    const surplus = Math.min(Math.max(tdee * 0.10, 200), 500);
    targetCalories = tdee + surplus;
  }

  let proteinPerKg = goalType === 'lose' ? 2.2 : goalType === 'gain' ? 2.0 : 1.8;
  if (conditions.includes('pcos') || conditions.includes('insulin_resistance') || conditions.includes('type2_diabetes')) {
    proteinPerKg = Math.max(proteinPerKg, 2.2);
  }

  const protein = Math.round(proteinPerKg * w);
  let fatPerKg = goalType === 'lose' ? 0.6 : 0.8;
  if (conditions.includes('hypertension')) fatPerKg = 0.7;

  const fat = Math.round(Math.max(fatPerKg * w, 0.5 * w));
  const proteinCalories = protein * 4;
  const fatCalories = fat * 9;
  const carbCalories = Math.max(targetCalories - proteinCalories - fatCalories, 0);
  const carbs = Math.round(carbCalories / 4);

  return {
    cal: Math.round(targetCalories),
    pro: protein,
    carb: Math.max(carbs, 0),
    fat: fat,
  };
};

const calculateWaterGoal = (weight, activityLevel = 'moderate') => {
  const w = parseFloat(weight) || 70;
  let base = w * 35;
  if (activityLevel === 'active' || activityLevel === 'very_active') base += 600;
  else if (activityLevel === 'moderate') base += 350;
  return Math.round(base);
};

const compressImage = (file, maxWidth = 300, maxHeight = 300, quality = 0.85) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(blob), 'image/webp', quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

const blobToBase64 = (blob) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};

const getColorKey = (c) => c.id || c.name;
const getDefaultColor = () => COLORS[0] ? getColorKey(COLORS[0]) : 'lime';

export default function EditProfileModal({ profile, onSave, onCancel }) {
  const [tab, setTab] = useState('profile');
  const [name, setName] = useState(profile?.name || '');
  const [pin, setPin] = useState(profile?.pin || '');
  const [role, setRole] = useState(profile?.role || 'Athlete');
  const [imageLoading, setImageLoading] = useState(false);

  const [color, setColor] = useState(() => {
    if (profile?.color) {
      const found = COLORS.find(c => getColorKey(c) === profile.color);
      return found ? getColorKey(found) : getDefaultColor();
    }
    return getDefaultColor();
  });

  const [avatarMode, setAvatarMode] = useState(() => {
    if (profile?.avatar?.includes('dicebear.com')) return 'dicebear';
    if (profile?.avatar?.startsWith('http') || profile?.avatar?.startsWith('data:')) return 'photo';
    if (profile?.avatar && EMOJIS.includes(profile.avatar)) return 'emoji';
    return 'dicebear';
  });

  const [dicebearStyle, setDicebearStyle] = useState('adventurer');
  const [dicebearSeed, setDicebearSeed] = useState(profile?.name || 'Adrian');

  const buildSeedUrl = (style, seed) => {
    const cleanSeed = encodeURIComponent((seed || '').trim() || 'Adrian');
    return `https://api.dicebear.com/9.x/${style}/svg?seed=${cleanSeed}`;
  };

  const [avatar, setAvatar] = useState(() => {
    if (profile?.avatar && (profile.avatar.startsWith('http') || profile.avatar.startsWith('data:'))) {
      return profile.avatar;
    }
    return buildSeedUrl(dicebearStyle, dicebearSeed);
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(() => {
    if (profile?.avatar && (profile.avatar.startsWith('http') || profile.avatar.startsWith('data:'))) {
      return profile.avatar;
    }
    return buildSeedUrl(dicebearStyle, dicebearSeed);
  });

  const [saving, setSaving] = useState(false);

  const [weight, setWeight] = useState(profile?.weight?.toString() || '');
  const [height, setHeight] = useState(profile?.height?.toString() || '');
  const [age, setAge] = useState(profile?.age?.toString() || '');
  const [gender, setGender] = useState(profile?.gender || 'male');
  const [activityLevel, setActivityLevel] = useState(profile?.activity_level || 'moderate');
  const [goalType, setGoalType] = useState(profile?.goal_type || 'maintain');

  const [healthConditions, setHealthConditions] = useState(profile?.health_conditions || []);
  const { reminders, updateReminders } = useReminders(profile?.id);
  const fileRef = useRef(null);

  const handleStyleChange = (newStyle) => {
    setDicebearStyle(newStyle);
    setImageLoading(true);
    const newUrl = buildSeedUrl(newStyle, dicebearSeed);
    setAvatar(newUrl);
    setImagePreview(newUrl);
  };

  const handleSeedChange = (newSeed) => {
    setDicebearSeed(newSeed);
    setImageLoading(true);
    const newUrl = buildSeedUrl(dicebearStyle, newSeed);
    setAvatar(newUrl);
    setImagePreview(newUrl);
  };

  const handleRandomSeed = () => {
    const randomWords = ['Titan', 'Viper', 'Shadow', 'Apex', 'Volt', 'Storm', 'Cyber', 'Neon', 'Ares', 'Thor', 'Nova', 'Max'];
    const randomWord = randomWords[Math.floor(Math.random() * randomWords.length)] + '_' + Math.floor(Math.random() * 999);
    handleSeedChange(randomWord);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Máximo 8MB');
      return;
    }
    setImageFile(file);
    const compressed = await compressImage(file);
    const blobUrl = URL.createObjectURL(compressed);
    setImagePreview(blobUrl);
    setAvatar(blobUrl);
    setAvatarMode('photo');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setSaving(true);

    let finalAvatar = avatar;
    if (avatarMode === 'photo' && imageFile) {
      try {
        const compressed = await compressImage(imageFile);
        const fileName = `profile_${Date.now()}.webp`;
        const { error: uploadError } = await supabase.storage
          .from('profile-pictures')
          .upload(fileName, compressed, { cacheControl: '3600', upsert: false });
        
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('profile-pictures').getPublicUrl(fileName);
        finalAvatar = urlData.publicUrl;
      } catch (err) {
        // Fallback robusto a Base64 si no hay conexión para que la foto persista offline
        try {
          const compressed = await compressImage(imageFile);
          finalAvatar = await blobToBase64(compressed);
        } catch {
          finalAvatar = imagePreview;
        }
      }
    }

    let newGoals = profile?.goals || { cal: 2000, pro: 120, carb: 200, fat: 55 };
    let waterGoal = profile?.water_goal || 2000;

    if (weight && height && age) {
      const bmrVal = calculateBMR(parseFloat(weight), parseFloat(height), parseInt(age, 10), gender);
      const tdeeVal = calculateTDEE(bmrVal, activityLevel);
      newGoals = calculateMacroGoals(tdeeVal, parseFloat(weight), goalType, healthConditions);
      waterGoal = calculateWaterGoal(parseFloat(weight), activityLevel);
    }

    const generatedId = profile?.id || name.toLowerCase().replace(/[^a-z0-9_]/g, '') || `user_${Date.now()}`;

    const updatedProfile = {
      ...profile,
      id: generatedId,
      name: name.trim(),
      pin: pin.trim(),
      role: role || 'Athlete',
      color,
      avatar: finalAvatar,
      weight: parseFloat(weight) || null,
      height: parseFloat(height) || null,
      age: parseInt(age, 10) || null,
      gender,
      activity_level: activityLevel,
      goal_type: goalType,
      health_conditions: healthConditions,
      water_goal: waterGoal,
      goals: newGoals,
      auto_calculate_macros: true
    };

    onSave(updatedProfile);
    setSaving(false);
    toast.success('Atleta actualizado');
  };

  const bmr = calculateBMR(parseFloat(weight) || 0, parseFloat(height) || 0, parseInt(age, 10) || 0, gender);
  const tdee = bmr ? calculateTDEE(bmr, activityLevel) : null;
  const suggestedGoals = bmr ? calculateMacroGoals(tdee, parseFloat(weight) || 70, goalType, healthConditions) : null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[150] bg-[#09090B]/95 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-fade-in">
      <div className="w-full sm:max-w-md bg-[#0A0A0C] border border-white/[0.08] sm:rounded-[2.5rem] rounded-t-[2.5rem] flex flex-col max-h-[92vh] shadow-2xl shadow-black/80 overflow-hidden animate-slide-up">
        
        {/* Cabecera */}
        <div className="flex justify-between items-center px-6 pt-5 pb-3 border-b border-white/[0.05]">
          <div>
            <h2 className="text-base font-black text-white tracking-tight uppercase font-sans">
              {profile?.name ? `Editar Atleta: ${profile.name}` : 'Nuevo Miembro VIP'}
            </h2>
            <p className="text-[10px] text-zinc-400 font-mono">Calibración Biométrica y Preferencias</p>
          </div>
          <button onClick={onCancel} className="p-2 rounded-full bg-white/[0.04] text-zinc-400 hover:text-white" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Selector de Pestañas */}
        <div className="px-6 py-2.5 bg-black/40 border-b border-white/[0.04] shrink-0">
          <div className="flex bg-white/[0.04] rounded-2xl p-1 gap-1 text-xs">
            {[
              { key: 'profile', icon: User, label: 'Perfil' },
              { key: 'body', icon: Weight, label: 'Biometría' },
              { key: 'health', icon: Heart, label: 'Salud' },
              { key: 'reminders', icon: Bell, label: 'Alarmas' },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex-1 py-2 rounded-xl font-mono font-bold transition-all flex items-center justify-center gap-1 ${
                  tab === key ? 'bg-[#D4FF00] text-[#09090B] shadow-md font-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Icon size={12} />
                <span className="text-[10px]">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Contenido del Formulario */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 no-scrollbar">
          
          {tab === 'profile' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col items-center gap-2.5">
                <div className="relative w-28 h-28 rounded-full bg-[#050507] border-2 border-[#D4FF00] flex items-center justify-center overflow-hidden shadow-[0_0_25px_rgba(212,255,0,0.25)]">
                  {imageLoading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                      <Loader2 size={24} className="text-[#D4FF00] animate-spin" />
                    </div>
                  )}

                  {avatarMode === 'emoji' ? (
                    <span className="text-5xl">{avatar}</span>
                  ) : (avatar?.startsWith('http') || avatar?.startsWith('data:') || imagePreview) ? (
                    <img 
                      key={imagePreview || avatar}
                      src={imagePreview || avatar} 
                      alt="" 
                      className="w-full h-full object-cover"
                      onLoad={() => setImageLoading(false)}
                      onError={() => setImageLoading(false)}
                    />
                  ) : (
                    <span className="text-3xl font-black text-white">{name.charAt(0) || 'A'}</span>
                  )}
                </div>

                <div className="flex bg-white/[0.04] p-1 rounded-xl border border-white/[0.06] text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarMode('dicebear');
                      const url = buildSeedUrl(dicebearStyle, dicebearSeed);
                      setAvatar(url);
                      setImagePreview(url);
                    }}
                    className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                      avatarMode === 'dicebear' ? 'bg-[#D4FF00] text-[#09090B] shadow-md font-black' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Sparkles size={12} /> Ilustración
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarMode('emoji')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                      avatarMode === 'emoji' ? 'bg-[#D4FF00] text-[#09090B] shadow-md font-black' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Smile size={12} /> Emoji
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarMode('photo');
                      fileRef.current?.click();
                    }}
                    className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                      avatarMode === 'photo' ? 'bg-[#D4FF00] text-[#09090B] shadow-md font-black' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Camera size={12} /> Foto
                  </button>
                </div>
              </div>

              {avatarMode === 'dicebear' && (
                <div className="bg-black/60 border border-white/[0.08] p-4 rounded-2xl space-y-3 animate-fade-in">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                      Estilo de Ilustración
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {DICEBEAR_STYLES.map(st => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => handleStyleChange(st.id)}
                          className={`p-2 rounded-xl text-[10px] font-mono font-bold text-left truncate transition-all ${
                            dicebearStyle === st.id
                              ? 'bg-[#D4FF00] text-[#09090B] shadow-md font-black'
                              : 'bg-white/[0.03] text-zinc-400 border border-white/[0.06] hover:text-white'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase">
                        Palabra Clave / Semilla
                      </label>
                      <button
                        type="button"
                        onClick={handleRandomSeed}
                        className="text-[10px] font-mono text-[#D4FF00] hover:underline flex items-center gap-1 font-bold"
                      >
                        <RefreshCw size={11} /> Aleatorio 🎲
                      </button>
                    </div>

                    <input
                      type="text"
                      value={dicebearSeed}
                      onChange={e => handleSeedChange(e.target.value)}
                      placeholder="Escribe un apodo o palabra..."
                      className="w-full bg-black/80 border border-white/[0.1] rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#D4FF00] font-mono font-bold"
                    />
                  </div>
                </div>
              )}

              {avatarMode === 'emoji' && (
                <div className="flex flex-wrap gap-2 p-3 bg-black/40 rounded-2xl border border-white/[0.05] justify-center animate-fade-in">
                  {EMOJIS.map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setAvatar(em)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                        avatar === em ? 'bg-[#D4FF00]/20 border border-[#D4FF00] scale-110' : 'bg-white/[0.02] border border-white/[0.04]'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}

              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase block mb-1.5">Color de Identidad</label>
                <div className="flex gap-2 flex-wrap justify-center bg-black/40 p-2.5 rounded-2xl border border-white/[0.05]">
                  {COLORS.map(c => {
                    const isSelected = color === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setColor(c.id)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-md ${
                          isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0A0A0C] scale-110' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.label}
                      >
                        {isSelected && <Check size={12} className="text-white drop-shadow-md" strokeWidth={3.5} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase block mb-1">Nombre Completo</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ej: Carlos Pérez"
                  className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3 text-xs text-white outline-none focus:border-[#D4FF00] font-sans font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase block mb-1">Rol / Nivel</label>
                <div className="flex gap-1.5 flex-wrap">
                  {ROLES.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold transition-all ${
                        role === r
                          ? 'bg-[#D4FF00] text-[#09090B] shadow-[0_0_10px_rgba(212,255,0,0.3)] font-black'
                          : 'bg-white/[0.03] text-zinc-400 border border-white/[0.06] hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase block mb-1">PIN (4 Dígitos, Opcional)</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3 text-center text-sm font-mono tracking-widest text-[#D4FF00] outline-none focus:border-[#D4FF00]"
                />
              </div>
            </div>
          )}

          {tab === 'body' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase block mb-1.5">Sexo Biológico</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={`flex-1 py-3 rounded-xl border text-xs font-bold transition-all ${
                      gender === 'male'
                        ? 'border-[#D4FF00]/50 bg-[#D4FF00]/10 text-white shadow-md font-black'
                        : 'border-white/[0.08] text-zinc-400'
                    }`}
                  >
                    🙋‍♂️ Hombre
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    className={`flex-1 py-3 rounded-xl border text-xs font-bold transition-all ${
                      gender === 'female'
                        ? 'border-[#D4FF00]/50 bg-[#D4FF00]/10 text-white shadow-md font-black'
                        : 'border-white/[0.08] text-zinc-400'
                    }`}
                  >
                    🙋‍♀️ Mujer
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase block mb-1">Edad (años)</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    placeholder="25"
                    className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-2.5 text-xs text-center text-white font-mono font-bold outline-none focus:border-[#D4FF00]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase block mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={weight}
                    onChange={e => setWeight(e.target.value)}
                    placeholder="70"
                    className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-2.5 text-xs text-center text-white font-mono font-bold outline-none focus:border-[#D4FF00]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase block mb-1">Estatura (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    inputMode="decimal"
                    value={height}
                    onChange={e => setHeight(e.target.value)}
                    placeholder="175"
                    className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-2.5 text-xs text-center text-white font-mono font-bold outline-none focus:border-[#D4FF00]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase block mb-1.5">Nivel de Actividad (PAL)</label>
                <div className="space-y-1.5">
                  {ACTIVITY_LEVELS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setActivityLevel(opt.value)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        activityLevel === opt.value
                          ? 'border-[#D4FF00]/50 bg-[#D4FF00]/10 text-white shadow-sm'
                          : 'border-white/[0.06] text-zinc-400 hover:border-white/10'
                      }`}
                    >
                      <span className="text-xs font-bold text-white block">{opt.label}</span>
                      <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">{opt.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase block mb-1.5">Objetivo Metabólico</label>
                <div className="space-y-1.5">
                  {GOAL_TYPES.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setGoalType(opt.value)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${
                        goalType === opt.value
                          ? 'border-[#D4FF00]/50 bg-[#D4FF00]/10 text-white shadow-sm'
                          : 'border-white/[0.06] text-zinc-400 hover:border-white/10'
                      }`}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <div>
                        <span className="text-xs font-bold text-white block">{opt.label}</span>
                        <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">{opt.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {bmr > 0 && (
                <div className="bg-black/60 border border-white/[0.08] rounded-2xl p-4 space-y-2.5 font-mono text-xs">
                  <span className="text-[#D4FF00] font-bold block text-[10px] uppercase tracking-wider">
                    Telemetría y Metas Calculadas:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-zinc-400">
                    <div>Tasa Metabólica Basal: <strong className="text-white block">{bmr} kcal</strong></div>
                    <div>Gasto Diario (TDEE): <strong className="text-white block">{tdee} kcal</strong></div>
                    <div>Calorías Objetivo: <strong className="text-[#D4FF00] block">{suggestedGoals?.cal} kcal</strong></div>
                    <div>Proteína Diaria: <strong className="text-blue-400 block">{suggestedGoals?.pro}g</strong></div>
                    <div>Carbohidratos: <strong className="text-purple-400 block">{suggestedGoals?.carb}g</strong></div>
                    <div>Grasas Saludables: <strong className="text-amber-400 block">{suggestedGoals?.fat}g</strong></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'health' && (
            <div className="space-y-3.5 animate-fade-in">
              <p className="text-xs text-zinc-400 font-mono">Condiciones médicas y metabólicas para ajustar macros:</p>
              <div className="space-y-2">
                {HEALTH_CONDITIONS.map(cond => (
                  <label key={cond.value} className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={healthConditions.includes(cond.value)}
                      onChange={() => {
                        setHealthConditions(prev =>
                          prev.includes(cond.value) ? prev.filter(c => c !== cond.value) : [...prev, cond.value]
                        );
                      }}
                      className="accent-[#D4FF00]"
                    />
                    <span className="text-xs text-white font-medium">{cond.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {tab === 'reminders' && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
                <div>
                  <span className="text-xs font-bold text-white block">Recordatorio de Agua</span>
                  <span className="text-[10px] text-zinc-500 font-mono">Notificación periódica para hidratarte</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateReminders({ ...reminders, water: { ...reminders.water, enabled: !reminders.water?.enabled } })}
                  className={`w-11 h-6 rounded-full transition-colors relative ${reminders?.water?.enabled ? 'bg-[#D4FF00]' : 'bg-zinc-800'}`}
                >
                  <span className={`w-5 h-5 rounded-full bg-white absolute top-0.5 left-0.5 transition-transform ${reminders?.water?.enabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          className="p-5 border-t border-white/[0.06] bg-[#0A0A0C] shrink-0"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 volt-button rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_25px_rgba(212,255,0,0.35)] font-mono"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Guardando Atleta...
              </>
            ) : (
              'Guardar y Aplicar Cambios'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}