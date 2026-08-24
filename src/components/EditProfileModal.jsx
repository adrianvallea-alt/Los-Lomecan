// src/components/EditProfileModal.jsx
import React, { useState, useRef } from 'react';
import {
  X, Save, Camera, Check, Shield, User, Calculator, Weight, Ruler, Calendar,
  Activity, Target, Heart, Plus, Droplets, Bell, Utensils, Dumbbell,
  Wand2, RefreshCw
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import { COLORS } from '../utils/colors';
import useReminders from '../hooks/useReminders';

const EMOJIS = ['😎', '🏋️', '💪', '🔥', '🧘', '🤸', '⚡', '👑', '🐺', '🦍'];
const ROLES = ['Atleta', 'Principiante', 'Intermedio', 'Avanzado', 'Entrenador'];

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentario (poco o nada de ejercicio)' },
  { value: 'light', label: 'Ligero (ejercicio 1-3 días/semana)' },
  { value: 'moderate', label: 'Moderado (ejercicio 3-5 días/semana)' },
  { value: 'active', label: 'Activo (ejercicio 6-7 días/semana)' },
  { value: 'very_active', label: 'Muy activo (atleta, trabajo físico)' },
];

const GOAL_TYPES = [
  { value: 'lose', label: 'Perder grasa (Déficit 20%)' },
  { value: 'maintain', label: 'Mantener peso (Normocalórica)' },
  { value: 'gain', label: 'Ganar músculo (Superávit 10%)' },
];

const HEALTH_CONDITIONS = [
  { value: 'hypertension', label: 'Hipertensión arterial' },
  { value: 'pcos', label: 'Ovario poliquístico (SOP)' },
  { value: 'insulin_resistance', label: 'Resistencia a la insulina' },
  { value: 'type2_diabetes', label: 'Diabetes tipo 2' },
];

const AVAILABLE_SUPPLEMENTS = [
  { name: 'Creatina monohidrato', waterPerGram: 100 },
  { name: 'Cafeína / Pre-entreno', waterPerGram: 50 },
  { name: 'Proteína en polvo', waterPerGram: 0 },
  { name: 'Multivitamínico', waterPerGram: 0 },
  { name: 'Omega 3', waterPerGram: 0 },
  { name: 'Glutamina', waterPerGram: 0 },
];

// =========================================================================
// ALGORITMOS NUTRICIONALES BASADOS EN EVIDENCIA
// =========================================================================

// 1. TMB - Mifflin-St Jeor (1990)
const calculateBMR = (weight, height, age, gender) => {
  if (!weight || !height || !age) return 0;
  const w = parseFloat(weight);
  const h = parseFloat(height);
  const a = parseInt(age);
  return gender === 'female'
    ? Math.round((10 * w) + (6.25 * h) - (5 * a) - 161)
    : Math.round((10 * w) + (6.25 * h) - (5 * a) + 5);
};

// 2. Factores PAL (FAO/OMS)
const getActivityFactor = (level) => {
  const factors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  return factors[level] || 1.55;
};

// 3. TDEE
const calculateTDEE = (bmr, activityLevel) => Math.round(bmr * getActivityFactor(activityLevel));

// 4. Objetivos con Ajuste Clínico (ISSN / Layman et al. 2008)
const calculateMacroGoalsWithConditions = (tdee, weight, goalType, conditions = []) => {
  const w = parseFloat(weight) || 70;

  // Ajuste Calórico
  let targetCalories = tdee;
  if (goalType === 'lose') {
    const deficit = Math.min(Math.max(tdee * 0.20, 300), 750);
    targetCalories = tdee - deficit;
  } else if (goalType === 'gain') {
    const surplus = Math.min(Math.max(tdee * 0.10, 200), 500);
    targetCalories = tdee + surplus;
  }

  // Proteína (Morton et al. 2018; Helms et al. 2014)
  let proteinPerKg = 1.8;
  if (goalType === 'lose') proteinPerKg = 2.2;
  else if (goalType === 'gain') proteinPerKg = 2.0;

  // Condiciones clínicas que requieren mayor proteína y control insulínico
  if (conditions.includes('pcos') || conditions.includes('insulin_resistance') || conditions.includes('type2_diabetes')) {
    proteinPerKg = Math.max(proteinPerKg, 2.2);
  }

  const protein = Math.round(proteinPerKg * w);

  // Grasas esenciales
  let fatPerKg = goalType === 'lose' ? 0.6 : 0.8;
  if (conditions.includes('hypertension')) fatPerKg = 0.7;

  const fat = Math.round(Math.max(fatPerKg * w, 0.5 * w));

  // Carbohidratos restantes
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

// 5. Hidratación
const calculateWaterGoal = (weight, activityLevel = 'moderate') => {
  const w = parseFloat(weight) || 70;
  let base = w * 35;
  if (activityLevel === 'active' || activityLevel === 'very_active') base += 600;
  else if (activityLevel === 'moderate') base += 350;
  return Math.round(base);
};

const compressImage = (file, maxWidth = 200, maxHeight = 200, quality = 0.8) => {
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
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, Math.min(width, height) / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/webp', quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

const getColorKey = (c) => c.id || c.name;
const getDefaultColor = () => COLORS[0] ? getColorKey(COLORS[0]) : '';

export default function EditProfileModal({ profile, onSave, onCancel }) {
  const [tab, setTab] = useState('profile');
  const [name, setName] = useState(profile?.name || '');
  const [pin, setPin] = useState(profile?.pin || '');
  const [role, setRole] = useState(profile?.role || '');

  const [color, setColor] = useState(() => {
    if (profile?.color) {
      const found = COLORS.find(c => getColorKey(c) === profile.color);
      return found ? getColorKey(found) : getDefaultColor();
    }
    return getDefaultColor();
  });

  const [avatar, setAvatar] = useState(profile?.avatar || '😎');
  const [useImage, setUseImage] = useState(!!profile?.avatar?.startsWith('http'));
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(profile?.avatar?.startsWith('http') ? profile.avatar : null);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [weight, setWeight] = useState(profile?.weight?.toString() || '');
  const [height, setHeight] = useState(profile?.height?.toString() || '');
  const [age, setAge] = useState(profile?.age?.toString() || '');
  const [gender, setGender] = useState(profile?.gender || 'male');
  const [activityLevel, setActivityLevel] = useState(profile?.activity_level || 'moderate');
  const [goalType, setGoalType] = useState(profile?.goal_type || 'maintain');
  const [goalWeight, setGoalWeight] = useState(profile?.goal_weight?.toString() || '');
  const [autoCalculate, setAutoCalculate] = useState(profile?.auto_calculate_macros ?? true);

  const [healthConditions, setHealthConditions] = useState(profile?.health_conditions || []);
  const [supplements, setSupplements] = useState(profile?.supplements || []);

  const [dicebearStyle, setDicebearStyle] = useState('adventurer');
  const [dicebearSeed, setDicebearSeed] = useState(profile?.name || '');

  const { reminders, updateReminders } = useReminders(profile?.id);
  const fileRef = useRef();

  const toggleCondition = (value) => {
    setHealthConditions(prev =>
      prev.includes(value) ? prev.filter(c !== value) : [...prev, value]
    );
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Máximo 5MB');
      return;
    }
    setImageFile(file);
    const compressed = await compressImage(file);
    setImagePreview(URL.createObjectURL(compressed));
    setUseImage(true);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setUseImage(false);
    setAvatar('😎');
  };

  const generateAvatar = () => {
    if (!dicebearSeed) return;
    const url = `https://api.dicebear.com/7.x/${dicebearStyle}/png?seed=${encodeURIComponent(dicebearSeed)}&size=200`;
    setAvatar(url);
    setUseImage(true);
    setImagePreview(url);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setSaving(true);

    let finalAvatar = avatar;
    if (useImage && imageFile) {
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
        const reader = new FileReader();
        reader.onloadend = () => {
          finalAvatar = reader.result;
          completeSave(finalAvatar);
        };
        reader.readAsDataURL(imageFile);
        return;
      }
    } else if (useImage && imagePreview?.startsWith('http')) {
      finalAvatar = imagePreview;
    }

    completeSave(finalAvatar);
  };

  const completeSave = (avatarUrl) => {
    let newGoals = profile?.goals || { cal: 2000, pro: 120, carb: 200, fat: 55 };
    let waterGoal = profile?.water_goal || 2000;

    if (autoCalculate && weight && height && age) {
      const bmr = calculateBMR(parseFloat(weight), parseFloat(height), parseInt(age), gender);
      const tdee = calculateTDEE(bmr, activityLevel);
      newGoals = calculateMacroGoalsWithConditions(tdee, parseFloat(weight), goalType, healthConditions);
      waterGoal = calculateWaterGoal(parseFloat(weight), activityLevel);
    }

    // Hiperhidratación por Creatina y Suplementos (ISSN)
    supplements.forEach(sup => {
      const found = AVAILABLE_SUPPLEMENTS.find(s => s.name === sup.name);
      if (found && found.waterPerGram > 0) {
        waterGoal += Math.round((sup.dose_g || 0) * found.waterPerGram);
      }
    });

    const updatedProfile = {
      ...profile,
      name,
      pin,
      role,
      color,
      avatar: avatarUrl,
      weight: parseFloat(weight) || null,
      height: parseFloat(height) || null,
      age: parseInt(age) || null,
      gender,
      activity_level: activityLevel,
      goal_type: goalType,
      goal_weight: parseFloat(goalWeight) || null,
      auto_calculate_macros: autoCalculate,
      health_conditions: healthConditions,
      supplements,
      water_goal: waterGoal,
      goals: newGoals,
    };

    setShowSuccess(true);
    setTimeout(() => {
      onSave(updatedProfile);
      setShowSuccess(false);
      setSaving(false);
      toast.success('Perfil calibrado');
    }, 500);
  };

  const bmr = calculateBMR(parseFloat(weight) || 0, parseFloat(height) || 0, parseInt(age) || 0, gender);
  const tdee = bmr ? calculateTDEE(bmr, activityLevel) : null;
  const suggestedGoals = (bmr && autoCalculate) ? calculateMacroGoalsWithConditions(tdee, parseFloat(weight) || 70, goalType, healthConditions) : null;

  return (
    <div className="fixed inset-0 z-50 bg-[#09090B]/95 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
      <div className="w-full sm:max-w-md bg-[#0A0A0C] border border-white/[0.07] sm:rounded-[2.5rem] rounded-t-[2.5rem] flex flex-col max-h-[90vh] shadow-2xl shadow-black/40 animate-slide-up">
        
        <div className="flex justify-between items-center px-6 pt-6 pb-3">
          <h2 className="text-lg font-bold text-white tracking-tight">
            {profile ? 'Configuración de Atleta' : 'Nuevo Miembro'}
          </h2>
          <button onClick={onCancel} className="p-2 rounded-full bg-white/[0.03] text-zinc-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 pb-3">
          <div className="flex bg-white/[0.04] rounded-full p-1 gap-1 text-xs">
            {[
              { key: 'profile', icon: User, label: 'Perfil' },
              { key: 'body', icon: Weight, label: 'Biometría' },
              { key: 'health', icon: Heart, label: 'Salud' },
              { key: 'reminders', icon: Bell, label: 'Alarmas' },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 py-2.5 rounded-full font-bold transition-all flex items-center justify-center gap-1.5 ${
                  tab === key ? 'bg-[#D4FF00] text-[#09090B] shadow-md' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
          {tab === 'profile' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3">
                <label className="relative w-20 h-20 rounded-full bg-white/[0.03] border-2 border-white/[0.08] flex items-center justify-center overflow-hidden cursor-pointer">
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  {useImage && imagePreview ? (
                    <img src={imagePreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">{avatar}</span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera size={18} className="text-white" />
                  </div>
                </label>

                <div className="flex gap-2">
                  <button onClick={() => setUseImage(false)} className={`px-3 py-1 rounded-full text-xs ${!useImage ? 'bg-white/10 text-white font-bold' : 'text-zinc-500'}`}>Emoji</button>
                  <button onClick={() => setUseImage(true)} className={`px-3 py-1 rounded-full text-xs ${useImage ? 'bg-white/10 text-white font-bold' : 'text-zinc-500'}`}>Foto</button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 block mb-1">Nombre</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3 text-sm text-white outline-none focus:border-[#D4FF00]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 block mb-1">PIN (4 dígitos, opcional)</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3 text-sm text-white outline-none focus:border-[#D4FF00]"
                />
              </div>
            </div>
          )}

          {tab === 'body' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-1">Peso (kg)</label>
                  <input type="number" step="0.1" inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)} placeholder="70" className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3 text-sm text-white outline-none focus:border-[#D4FF00]" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-1">Estatura (cm)</label>
                  <input type="number" step="0.5" inputMode="decimal" value={height} onChange={e => setHeight(e.target.value)} placeholder="170" className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3 text-sm text-white outline-none focus:border-[#D4FF00]" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-1">Edad</label>
                  <input type="number" inputMode="numeric" value={age} onChange={e => setAge(e.target.value)} placeholder="25" className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3 text-sm text-white outline-none focus:border-[#D4FF00]" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 block mb-1">Sexo Biológico</label>
                  <select value={gender} onChange={e => setGender(e.target.value)} className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3 text-sm text-white outline-none">
                    <option value="male">Hombre</option>
                    <option value="female">Mujer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">Nivel de Actividad (PAL)</label>
                <select value={activityLevel} onChange={e => setActivityLevel(e.target.value)} className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3 text-xs text-white outline-none">
                  {ACTIVITY_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">Objetivo</label>
                <select value={goalType} onChange={e => setGoalType(e.target.value)} className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3 text-xs text-white outline-none">
                  {GOAL_TYPES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>

              {bmr > 0 && (
                <div className="bg-black/60 border border-white/[0.06] rounded-2xl p-4 space-y-2 font-mono text-xs">
                  <span className="text-[#D4FF00] font-bold block text-[10px] uppercase">Cálculo Científico Basal:</span>
                  <div className="grid grid-cols-2 gap-2 text-zinc-400">
                    <div>TMB: <strong className="text-white">{bmr} kcal</strong></div>
                    <div>TDEE: <strong className="text-white">{tdee} kcal</strong></div>
                    <div>Meta: <strong className="text-[#D4FF00]">{suggestedGoals?.cal} kcal</strong></div>
                    <div>Proteína: <strong className="text-blue-400">{suggestedGoals?.pro}g</strong></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'health' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400">Ajustes hormonales y metabólicos:</p>
              <div className="space-y-2">
                {HEALTH_CONDITIONS.map(cond => (
                  <label key={cond.value} className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] rounded-xl p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={healthConditions.includes(cond.value)}
                      onChange={() => toggleCondition(cond.value)}
                      className="accent-[#D4FF00]"
                    />
                    <span className="text-xs text-white font-medium">{cond.label}</span>
                  </label>
                ))}
              </div>

              <div className="pt-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Suplementación con requerimiento hídrico</span>
                <div className="space-y-2">
                  {supplements.map((sup, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-black/50 p-2 rounded-xl border border-white/[0.05]">
                      <select
                        value={sup.name}
                        onChange={e => {
                          const n = [...supplements];
                          n[idx].name = e.target.value;
                          setSupplements(n);
                        }}
                        className="flex-1 bg-transparent text-xs text-white outline-none"
                      >
                        <option value="">Seleccionar...</option>
                        {AVAILABLE_SUPPLEMENTS.map(opt => <option key={opt.name} value={opt.name}>{opt.name}</option>)}
                      </select>
                      <input
                        type="number"
                        placeholder="g/día"
                        value={sup.dose_g || ''}
                        onChange={e => {
                          const n = [...supplements];
                          n[idx].dose_g = parseFloat(e.target.value) || 0;
                          setSupplements(n);
                        }}
                        className="w-16 bg-black border border-white/[0.1] rounded-lg p-1.5 text-xs text-center text-white"
                      />
                      <button onClick={() => setSupplements(prev => prev.filter((_, i) => i !== idx))} className="text-zinc-500 hover:text-red-400">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setSupplements(prev => [...prev, { name: '', dose_g: 5 }])}
                    className="w-full py-2.5 border border-dashed border-white/[0.1] rounded-xl text-xs font-bold text-zinc-400 hover:text-[#D4FF00]"
                  >
                    + Añadir suplemento
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'reminders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
                <span className="text-xs font-bold text-white">Recordatorio de Agua</span>
                <button
                  onClick={() => updateReminders({ ...reminders, water: { ...reminders.water, enabled: !reminders.water.enabled } })}
                  className={`w-11 h-6 rounded-full transition-colors relative ${reminders.water.enabled ? 'bg-[#D4FF00]' : 'bg-zinc-800'}`}
                >
                  <span className={`w-5 h-5 rounded-full bg-white absolute top-0.5 left-0.5 transition-transform ${reminders.water.enabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 volt-button rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_20px_rgba(212,255,0,0.3)]"
          >
            {saving ? 'Calibrando...' : 'Guardar y Calibrar'}
          </button>
        </div>
      </div>
    </div>
  );
}