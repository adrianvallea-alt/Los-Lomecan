import React, { useState, useRef } from 'react';
import {
  X, Save, Camera, Check, Shield, User, Calculator, Weight, Ruler, Calendar,
  Activity, Target, Heart, Plus, Droplets, Bell, Utensils, Dumbbell
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
  { value: 'lose', label: 'Perder grasa' },
  { value: 'maintain', label: 'Mantener peso' },
  { value: 'gain', label: 'Ganar músculo' },
];

const HEALTH_CONDITIONS = [
  { value: 'hypertension', label: 'Hipertensión arterial' },
  { value: 'pcos', label: 'Ovario poliquístico (SOP)' },
  { value: 'insulin_resistance', label: 'Resistencia a la insulina' },
  { value: 'type2_diabetes', label: 'Diabetes tipo 2' },
  { value: 'type1_diabetes', label: 'Diabetes tipo 1' },
];

const AVAILABLE_SUPPLEMENTS = [
  { name: 'Creatina monohidrato', waterPerGram: 100 },
  { name: 'Cafeína', waterPerGram: 5 },
  { name: 'Proteína en polvo', waterPerGram: 0 },
  { name: 'Multivitamínico', waterPerGram: 0 },
  { name: 'Omega 3', waterPerGram: 0 },
  { name: 'BCAA', waterPerGram: 0 },
  { name: 'Preentreno', waterPerGram: 5 },
  { name: 'Glutamina', waterPerGram: 0 },
];

// ==================== FÓRMULAS CIENTÍFICAS (INTACTAS) ====================
const calculateBMR = (weight, height, age, gender) => {
  if (!weight || !height || !age) return 0;
  const bmr = gender === 'female'
    ? (10 * weight) + (6.25 * height) - (5 * age) - 161
    : (10 * weight) + (6.25 * height) - (5 * age) + 5;
  return Math.round(bmr);
};

const getActivityFactor = (level) => {
  const factors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  return factors[level] || 1.55;
};

const calculateTDEE = (bmr, activityLevel) => Math.round(bmr * getActivityFactor(activityLevel));

const calculateMacroGoalsWithConditions = (tdee, weight, goalType, conditions = []) => {
  let targetCalories = tdee;
  if (goalType === 'lose') targetCalories = tdee - 500;
  else if (goalType === 'gain') targetCalories = tdee + 500;

  let proteinPct = 0.25, carbPct = 0.45, fatPct = 0.30;

  if (conditions.includes('pcos') || conditions.includes('insulin_resistance') || conditions.includes('type2_diabetes')) {
    proteinPct = 0.30;
    carbPct = 0.40;
    fatPct = 0.30;
  } else if (conditions.includes('hypertension')) {
    proteinPct = 0.25;
    carbPct = 0.45;
    fatPct = 0.30;
  }

  const protein = Math.round((targetCalories * proteinPct) / 4);
  const fat = Math.round((targetCalories * fatPct) / 9);
  const carbs = Math.round((targetCalories - (protein * 4) - (fat * 9)) / 4);

  return {
    cal: targetCalories,
    pro: protein,
    carb: Math.max(carbs, 0),
    fat: fat,
  };
};

const calculateWaterGoal = (weight) => Math.round(weight * 35);

// ==================== COMPRESIÓN DE IMAGEN (INTACTA) ====================
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

// Clave única para cada color (soporta ambos formatos)
const getColorKey = (c) => c.id || c.name;
const getDefaultColor = () => COLORS[0] ? getColorKey(COLORS[0]) : '';

export default function EditProfileModal({ profile, onSave, onCancel }) {
  // ==================== LÓGICA DE ESTADO 100% INTACTA ====================
  const [tab, setTab] = useState('profile');
  const [name, setName] = useState(profile?.name || '');
  const [pin, setPin] = useState(profile?.pin || '');
  const [role, setRole] = useState(profile?.role || '');
  
  // ---- CORRECCIÓN DEL COLOR (soporta ambos formatos) ----
  const [color, setColor] = useState(() => {
    if (profile?.color) {
      const found = COLORS.find(c => getColorKey(c) === profile.color);
      return found ? getColorKey(found) : getDefaultColor();
    }
    return getDefaultColor();
  });
  // ------------------------------
  const [avatar, setAvatar] = useState(profile?.avatar || '😎');
  const [useImage, setUseImage] = useState(!!profile?.avatar?.startsWith('http'));
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(profile?.avatar?.startsWith('http') ? profile.avatar : null);
  const [uploading, setUploading] = useState(false);
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

  const { reminders, updateReminders } = useReminders(profile?.id);

  const fileRef = useRef();

  const toggleCondition = (value) => {
    setHealthConditions(prev =>
      prev.includes(value) ? prev.filter(c => c !== value) : [...prev, value]
    );
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Máximo 5MB', { icon: '📦' });
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
        console.warn('Usando base64:', err);
        const reader = new FileReader();
        reader.onloadend = () => {
          finalAvatar = reader.result;
          completeSave(finalAvatar);
        };
        reader.readAsDataURL(imageFile);
        setSaving(false);
        return;
      }
    } else if (useImage && imagePreview?.startsWith('http')) {
      finalAvatar = imagePreview;
    }

    completeSave(finalAvatar);
  };

  const completeSave = async (avatarUrl) => {
    let newGoals = profile?.goals || { cal: 2000, pro: 120, carb: 200, fat: 55 };
    let waterGoal = profile?.water_goal || null;

    if (autoCalculate && weight && height && age) {
      const bmr = calculateBMR(parseFloat(weight), parseFloat(height), parseInt(age), gender);
      const tdee = calculateTDEE(bmr, activityLevel);
      newGoals = calculateMacroGoalsWithConditions(tdee, parseFloat(weight), goalType, healthConditions);
      waterGoal = calculateWaterGoal(parseFloat(weight));
    } else if (!waterGoal) {
      waterGoal = 2000;
    }

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
      color, // Guardamos la clave única (id o name)
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
      toast.success('Perfil guardado', { icon: '💾' });
    }, 600);
  };

  const bmr = calculateBMR(parseFloat(weight) || 0, parseFloat(height) || 0, parseInt(age) || 0, gender);
  const tdee = bmr ? calculateTDEE(bmr, activityLevel) : null;
  const suggestedGoals = (bmr && autoCalculate) ? calculateMacroGoalsWithConditions(tdee, parseFloat(weight) || 70, goalType, healthConditions) : null;
  const suggestedWater = (autoCalculate && weight) ? calculateWaterGoal(parseFloat(weight)) : 2000;

  let previewWaterGoal = suggestedWater;
  supplements.forEach(sup => {
    const found = AVAILABLE_SUPPLEMENTS.find(s => s.name === sup.name);
    if (found && found.waterPerGram > 0) {
      previewWaterGoal += Math.round((sup.dose_g || 0) * found.waterPerGram);
    }
  });

  // ==================== NUEVA INTERFAZ PREMIUM ====================
  return (
    <div className="fixed inset-0 z-50 bg-[#09090B]/95 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-[#0A0A0C] border border-white/[0.07] sm:rounded-[2.5rem] rounded-t-[2.5rem] flex flex-col max-h-[90vh] shadow-2xl shadow-black/40 animate-slide-up">
        
        {/* Cabecera */}
        <div className="flex justify-between items-center px-6 pt-6 pb-3">
          <h2 className="text-lg font-bold text-white tracking-tight">
            {profile ? 'Editar perfil' : 'Nuevo perfil'}
          </h2>
          <button 
            onClick={onCancel} 
            className="p-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white active:scale-95 transition-all"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Pestañas */}
        <div className="px-6 pb-3">
          <div className="flex bg-white/[0.04] rounded-full p-1 gap-1 text-sm">
            {[
              { key: 'profile', icon: User, label: 'Perfil' },
              { key: 'body', icon: Weight, label: 'Cuerpo' },
              { key: 'health', icon: Heart, label: 'Salud' },
              { key: 'reminders', icon: Bell, label: 'Rec.' },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 py-2.5 rounded-full font-medium transition-all duration-300 flex items-center justify-center gap-1.5 text-xs ${
                  tab === key
                    ? 'bg-[#D4FF00] text-[#09090B] shadow-lg shadow-[#D4FF00]/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="space-y-6">
            
            {/* ---------- PESTAÑA PERFIL ---------- */}
            {tab === 'profile' && (
              <>
                {/* Avatar */}
                <div className="flex flex-col items-center gap-4">
                  <label className="relative w-24 h-24 rounded-full bg-white/[0.03] border-2 border-white/[0.06] flex items-center justify-center overflow-hidden group cursor-pointer transition-all hover:border-white/20 hover:shadow-[0_0_20px_rgba(212,255,0,0.1)]">
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" aria-label="Subir foto de perfil" />
                    {useImage && imagePreview ? (
                      <img src={imagePreview} alt="Vista previa" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl transition-transform group-hover:scale-110">{avatar}</span>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera size={20} className="text-white" />
                    </div>
                  </label>

                  <div className="flex gap-2 text-sm">
                    <button onClick={() => setUseImage(false)} className={`px-4 py-2 rounded-full font-medium transition-all ${!useImage ? 'bg-white/[0.06] text-white' : 'text-zinc-500 hover:text-white'}`}>😎 Emoji</button>
                    <button onClick={() => setUseImage(true)} className={`px-4 py-2 rounded-full font-medium transition-all ${useImage ? 'bg-white/[0.06] text-white' : 'text-zinc-500 hover:text-white'}`}>🖼️ Imagen</button>
                  </div>

                  {!useImage && (
                    <div className="flex flex-wrap justify-center gap-2">
                      {EMOJIS.map((emoji) => (
                        <button key={emoji} onClick={() => setAvatar(emoji)} className={`text-2xl p-2 rounded-xl transition-all hover:bg-white/[0.05] ${avatar === emoji ? 'bg-white/[0.08] ring-1 ring-white/20 scale-110' : ''}`} aria-label={`Emoji ${emoji}`}>{emoji}</button>
                      ))}
                    </div>
                  )}
                  {useImage && (
                    <button onClick={removeImage} className="text-xs text-red-400 hover:underline flex items-center gap-1"><X size={12} /> Quitar imagen</button>
                  )}
                </div>

                {/* Nombre */}
                <div>
                  <label className="text-[11px] text-zinc-500 ml-1 mb-1.5 block"><User size={12} className="inline mr-1" /> Nombre</label>
                  <div className="relative">
                    <input
                      id="profile-name"
                      value={name}
                      onChange={(e) => setName(e.target.value.slice(0, 20))}
                      className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3.5 text-sm text-white placeholder-zinc-600 focus:border-[#D4FF00]/40 outline-none transition-colors"
                      placeholder="Tu nombre"
                      maxLength={20}
                    />
                    <span className="text-[10px] text-zinc-600 absolute right-3 bottom-1.5">{name.length}/20</span>
                  </div>
                </div>

                {/* PIN */}
                <div>
                  <label className="text-[11px] text-zinc-500 ml-1 mb-1.5 block"><Shield size={12} className="inline mr-1" /> PIN (opcional)</label>
                  <input
                    id="profile-pin"
                    type="password"
                    inputMode="numeric"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3.5 text-sm text-white focus:border-[#D4FF00]/40 outline-none transition-colors"
                    placeholder="••••"
                    maxLength={4}
                  />
                </div>

                {/* Rol */}
                <div>
                  <label className="text-[11px] text-zinc-500 ml-1 mb-2 block">Rol</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {ROLES.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all active:scale-95 ${
                          role === r
                            ? 'border-[#D4FF00]/40 bg-[#D4FF00]/5 text-[#D4FF00]'
                            : 'border-white/[0.06] text-zinc-400 hover:border-white/10 hover:text-zinc-200'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <input
                    id="profile-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3.5 text-sm text-white focus:border-[#D4FF00]/40 outline-none"
                    placeholder="O escribe tu propio rol"
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="text-[11px] text-zinc-500 ml-1 mb-2 block">Color de fondo</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map((c) => {
                      const colorKey = getColorKey(c);
                      return (
                        <button
                          key={colorKey}
                          onClick={() => setColor(colorKey)}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                            color === colorKey ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0A0A0C] scale-110' : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.label}
                        >
                          {color === colorKey && <Check size={14} className="text-white drop-shadow-md" strokeWidth={3} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* ---------- PESTAÑA CUERPO ---------- */}
            {tab === 'body' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-zinc-500 flex items-center gap-1 mb-1.5"><Weight size={12} /> Peso (kg)</label>
                    <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="70" className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3.5 text-sm text-white focus:border-[#D4FF00]/40 outline-none" />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-500 flex items-center gap-1 mb-1.5"><Ruler size={12} /> Estatura (cm)</label>
                    <input type="number" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="170" className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3.5 text-sm text-white focus:border-[#D4FF00]/40 outline-none" />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-500 flex items-center gap-1 mb-1.5"><Calendar size={12} /> Edad</label>
                    <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="30" className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3.5 text-sm text-white focus:border-[#D4FF00]/40 outline-none" />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-500 mb-1.5 block">Sexo</label>
                    <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3.5 text-sm text-white focus:border-[#D4FF00]/40 outline-none">
                      <option value="male">Hombre</option>
                      <option value="female">Mujer</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-500 flex items-center gap-1 mb-1.5"><Activity size={12} /> Nivel de actividad</label>
                  <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)} className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3.5 text-sm text-white focus:border-[#D4FF00]/40 outline-none">
                    {ACTIVITY_LEVELS.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-500 flex items-center gap-1 mb-1.5"><Target size={12} /> Objetivo</label>
                  <select value={goalType} onChange={(e) => setGoalType(e.target.value)} className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3.5 text-sm text-white focus:border-[#D4FF00]/40 outline-none">
                    {GOAL_TYPES.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>

                {goalType !== 'maintain' && (
                  <div>
                    <label className="text-[11px] text-zinc-500 mb-1.5 block">Peso objetivo (kg)</label>
                    <input type="number" step="0.1" value={goalWeight} onChange={(e) => setGoalWeight(e.target.value)} placeholder={goalType === 'lose' ? '65' : '75'} className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3.5 text-sm text-white focus:border-[#D4FF00]/40 outline-none" />
                  </div>
                )}

                {/* Toggle Auto-calcular */}
                <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
                  <span className="text-sm text-zinc-300">Calcular metas automáticamente</span>
                  <button
                    onClick={() => setAutoCalculate(!autoCalculate)}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${autoCalculate ? 'bg-[#D4FF00]' : 'bg-white/[0.08]'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${autoCalculate ? 'translate-x-5' : ''}`} />
                  </button>
                </div>

                {/* Resultados del cálculo */}
                {autoCalculate && weight && height && age && (
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 space-y-3 backdrop-blur-sm">
                    <h4 className="text-white font-semibold text-sm flex items-center gap-2"><Calculator size={14} className="text-[#D4FF00]" /> Tu metabolismo</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <span className="text-zinc-500">TMB</span>
                      <span className="text-white font-medium text-right">{bmr} kcal</span>
                      <span className="text-zinc-500">TDEE</span>
                      <span className="text-white font-medium text-right">{tdee} kcal</span>
                      <span className="text-zinc-500">Meta diaria</span>
                      <span className="text-[#D4FF00] font-bold text-right">{suggestedGoals?.cal || '—'} kcal</span>
                      <span className="text-zinc-500">Proteína</span>
                      <span className="text-white text-right">{suggestedGoals?.pro || '—'} g</span>
                      <span className="text-zinc-500">Carbohidratos</span>
                      <span className="text-white text-right">{suggestedGoals?.carb || '—'} g</span>
                      <span className="text-zinc-500">Grasas</span>
                      <span className="text-white text-right">{suggestedGoals?.fat || '—'} g</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ---------- PESTAÑA SALUD ---------- */}
            {tab === 'health' && (
              <>
                <p className="text-xs text-zinc-500 mb-4">Selecciona tus condiciones de salud para ajustar tus recomendaciones</p>
                <div className="space-y-2">
                  {HEALTH_CONDITIONS.map((cond) => (
                    <label key={cond.value} className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] rounded-xl p-3.5 cursor-pointer transition-all hover:border-white/10">
                      <input
                        type="checkbox"
                        checked={healthConditions.includes(cond.value)}
                        onChange={() => toggleCondition(cond.value)}
                        className="w-4 h-4 rounded border-white/10 bg-[#09090B] text-[#D4FF00] focus:ring-0 accent-[#D4FF00]"
                      />
                      <span className="text-white text-sm">{cond.label}</span>
                    </label>
                  ))}
                </div>

                {/* Agua recomendada */}
                <div className="bg-[#D4FF00]/5 border border-[#D4FF00]/20 rounded-2xl p-4 mt-5 flex items-center gap-3">
                  <Droplets size={18} className="text-[#D4FF00]" />
                  <div className="text-sm text-[#D4FF00]">
                    <p>💧 Agua recomendada: <strong>{previewWaterGoal} ml/día</strong> ({Math.round(previewWaterGoal / 250)} vasos)</p>
                    {supplements.some(s => s.name.toLowerCase().includes('creatina')) && (
                      <p className="mt-1 opacity-80 text-xs">Incluye ajuste por creatina</p>
                    )}
                  </div>
                </div>

                {/* Suplementos */}
                <div className="mt-6">
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Suplementos</h4>
                  <div className="space-y-2">
                    {supplements.map((sup, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.05] rounded-xl p-2">
                        <select
                          value={sup.name}
                          onChange={(e) => {
                            const newSupps = [...supplements];
                            newSupps[idx].name = e.target.value;
                            newSupps[idx].dose_g = 0;
                            setSupplements(newSupps);
                          }}
                          className="flex-1 bg-transparent text-sm text-white px-2 rounded-lg border-r border-white/[0.05]"
                        >
                          <option value="">Seleccionar...</option>
                          {AVAILABLE_SUPPLEMENTS.filter(s => !supplements.some(sup => sup.name === s.name) || sup.name === s.name).map((opt) => (
                            <option key={opt.name} value={opt.name}>{opt.name}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.1"
                          value={sup.dose_g}
                          onChange={(e) => {
                            const newSupps = [...supplements];
                            newSupps[idx].dose_g = parseFloat(e.target.value) || 0;
                            setSupplements(newSupps);
                          }}
                          placeholder="g/día"
                          className="w-16 bg-transparent text-sm text-white text-center border-l border-white/[0.05]"
                        />
                        <button
                          onClick={() => setSupplements(prev => prev.filter((_, i) => i !== idx))}
                          className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-white/[0.04]"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setSupplements(prev => [...prev, { name: '', dose_g: 0 }])}
                      className="w-full py-3 border border-dashed border-white/[0.08] rounded-xl text-xs text-zinc-400 hover:border-[#D4FF00]/30 hover:text-[#D4FF00] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Plus size={12} /> Añadir suplemento
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ---------- PESTAÑA RECORDATORIOS ---------- */}
            {tab === 'reminders' && (
              <div className="space-y-5">
                <p className="text-xs text-zinc-500 mb-2">Configura recordatorios para mantener tus hábitos</p>

                {/* Agua */}
                <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <Droplets size={18} className="text-[#D4FF00]" />
                    <span className="text-white text-sm font-medium">Beber agua</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={reminders.water.interval}
                      onChange={(e) => updateReminders({ ...reminders, water: { ...reminders.water, interval: parseInt(e.target.value) || 120 } })}
                      className="w-14 bg-[#09090B] border border-white/[0.08] rounded-lg p-2 text-xs text-white text-center disabled:opacity-30"
                      disabled={!reminders.water.enabled}
                    />
                    <span className="text-xs text-zinc-500">min</span>
                    <button
                      onClick={() => updateReminders({ ...reminders, water: { ...reminders.water, enabled: !reminders.water.enabled } })}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${reminders.water.enabled ? 'bg-[#D4FF00]' : 'bg-white/[0.08]'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${reminders.water.enabled ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Comidas */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Utensils size={18} className="text-[#D4FF00]" />
                      <span className="text-white text-sm font-medium">Registrar comidas</span>
                    </div>
                    <button
                      onClick={() => updateReminders({ ...reminders, meals: { ...reminders.meals, enabled: !reminders.meals.enabled } })}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${reminders.meals.enabled ? 'bg-[#D4FF00]' : 'bg-white/[0.08]'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${reminders.meals.enabled ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                  {reminders.meals.enabled && (
                    <div className="flex flex-wrap gap-2">
                      {reminders.meals.times.map((time, idx) => (
                        <input
                          key={idx}
                          type="time"
                          value={time}
                          onChange={(e) => {
                            const newTimes = [...reminders.meals.times];
                            newTimes[idx] = e.target.value;
                            updateReminders({ ...reminders, meals: { ...reminders.meals, times: newTimes } });
                          }}
                          className="bg-[#09090B] border border-white/[0.08] rounded-lg p-2 text-xs text-white"
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Entrenamiento */}
                <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <Dumbbell size={18} className="text-[#D4FF00]" />
                    <span className="text-white text-sm font-medium">Entrenamiento</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={reminders.workout.time}
                      onChange={(e) => updateReminders({ ...reminders, workout: { ...reminders.workout, time: e.target.value } })}
                      className="bg-[#09090B] border border-white/[0.08] rounded-lg p-2 text-xs text-white disabled:opacity-30"
                      disabled={!reminders.workout.enabled}
                    />
                    <button
                      onClick={() => updateReminders({ ...reminders, workout: { ...reminders.workout, enabled: !reminders.workout.enabled } })}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${reminders.workout.enabled ? 'bg-[#D4FF00]' : 'bg-white/[0.08]'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${reminders.workout.enabled ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Macros */}
                <div className="flex items-center justify-between bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <Target size={18} className="text-[#D4FF00]" />
                    <span className="text-white text-sm font-medium">Completar macros</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={reminders.macros.time}
                      onChange={(e) => updateReminders({ ...reminders, macros: { ...reminders.macros, time: e.target.value } })}
                      className="bg-[#09090B] border border-white/[0.08] rounded-lg p-2 text-xs text-white disabled:opacity-30"
                      disabled={!reminders.macros.enabled}
                    />
                    <button
                      onClick={() => updateReminders({ ...reminders, macros: { ...reminders.macros, enabled: !reminders.macros.enabled } })}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${reminders.macros.enabled ? 'bg-[#D4FF00]' : 'bg-white/[0.08]'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${reminders.macros.enabled ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botón Guardar */}
        <div className="px-6 pt-2 pb-6">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className={`w-full font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none text-sm shadow-lg ${
              showSuccess
                ? 'bg-[#D4FF00] text-[#09090B] shadow-[#D4FF00]/30'
                : 'bg-[#D4FF00] text-[#09090B] hover:bg-[#e5ff1a] shadow-[#D4FF00]/20'
            }`}
          >
            {showSuccess ? (
              <Check size={20} className="animate-bounce" />
            ) : saving ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <Save size={20} />
            )}
            {showSuccess ? '¡Guardado!' : saving ? 'Guardando...' : 'Guardar perfil'}
          </button>
        </div>
      </div>

      <Toaster position="top-center" toastOptions={{ style: { background: '#0A0A0C', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem', fontSize: '13px' } }} />

      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}