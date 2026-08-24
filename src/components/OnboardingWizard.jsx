// src/components/OnboardingWizard.jsx
import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Check, Calendar, Ruler, Activity, Target, Sparkles, Droplets } from 'lucide-react';

// =========================================================================
// FÓRMULAS CIENTÍFICAS DE GRADO CLÍNICO Y DEPORTIVO
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
  const factors = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  return factors[level] || 1.55;
};

// 3. TDEE
const calculateTDEE = (bmr, activityLevel) => Math.round(bmr * getActivityFactor(activityLevel));

// 4. Objetivos de Macronutrientes (ISSN / Helms et al. 2014)
const calculateGoals = (tdee, weight, goalType) => {
  const w = parseFloat(weight) || 70;

  // Ajuste Calórico (Déficit moderado 20% / Superávit limpio 10%)
  let targetCalories = tdee;
  if (goalType === 'lose') {
    const deficit = Math.min(Math.max(tdee * 0.20, 300), 750);
    targetCalories = tdee - deficit;
  } else if (goalType === 'gain') {
    const surplus = Math.min(Math.max(tdee * 0.10, 200), 500);
    targetCalories = tdee + surplus;
  }

  // Proteína (Morton et al. 2018 / Helms et al. 2014)
  let proteinPerKg = 1.8;
  if (goalType === 'lose') proteinPerKg = 2.2;
  else if (goalType === 'gain') proteinPerKg = 2.0;

  const protein = Math.round(proteinPerKg * w);

  // Grasas esenciales (ISSN / ACSM: 0.6 a 0.8 g/kg)
  let fatPerKg = goalType === 'lose' ? 0.6 : 0.8;
  const fat = Math.round(Math.max(fatPerKg * w, 0.5 * w));

  // Carbohidratos glucolíticos restantes
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

// 5. Hidratación (EFSA/ACSM: 35 ml/kg + compensación por actividad)
const calculateWaterGoal = (weight, activityLevel) => {
  const w = parseFloat(weight) || 70;
  let baseWater = w * 35;

  if (activityLevel === 'active' || activityLevel === 'very_active') {
    baseWater += 600;
  } else if (activityLevel === 'moderate') {
    baseWater += 350;
  }

  return Math.round(baseWater);
};

const STEPS = [
  { title: 'Sexo y edad', icon: Calendar },
  { title: 'Peso y altura', icon: Ruler },
  { title: 'Actividad', icon: Activity },
  { title: 'Objetivo', icon: Target },
];

export default function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState('male');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [goalType, setGoalType] = useState('maintain');

  const totalSteps = STEPS.length;

  const nextStep = () => {
    if (step < totalSteps - 1) setStep(prev => prev + 1);
    else handleFinish();
  };

  const prevStep = () => {
    if (step > 0) setStep(prev => prev - 1);
  };

  const handleFinish = () => {
    const w = parseFloat(weight) || 70;
    const h = parseFloat(height) || 170;
    const a = parseInt(age) || 25;

    const bmr = calculateBMR(w, h, a, gender);
    const tdee = calculateTDEE(bmr, activityLevel);
    const goals = calculateGoals(tdee, w, goalType);
    const waterGoal = calculateWaterGoal(w, activityLevel);

    onComplete({
      weight: w,
      height: h,
      age: a,
      gender,
      activity_level: activityLevel,
      goal_type: goalType,
      goals,
      water_goal: waterGoal,
      auto_calculate_macros: true,
    });
  };

  const handleSkip = () => {
    onComplete({
      weight: 70,
      height: 170,
      age: 28,
      gender: 'male',
      activity_level: 'moderate',
      goal_type: 'maintain',
      goals: { cal: 2450, pro: 140, carb: 260, fat: 60 },
      water_goal: 2800,
      auto_calculate_macros: true,
    });
  };

  const renderStep0 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#D4FF00]/10 border border-[#D4FF00]/30 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(212,255,0,0.2)]">
          <Calendar size={28} className="text-[#D4FF00]" />
        </div>
        <h3 className="text-lg font-bold text-white">Sexo biológico y edad</h3>
        <p className="text-xs text-zinc-500 mt-1">Cálculo de Tasa Metabólica Basal (Mifflin-St Jeor)</p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setGender('male')}
          className={`flex-1 py-4 rounded-2xl border font-medium transition-all duration-300 ${
            gender === 'male'
              ? 'border-[#D4FF00]/50 bg-[#D4FF00]/10 text-white shadow-[0_0_20px_rgba(212,255,0,0.15)]'
              : 'border-white/[0.08] text-zinc-500 hover:border-[#D4FF00]/30'
          }`}
        >
          🙋‍♂️ <span className="text-sm ml-1">Hombre</span>
        </button>
        <button
          type="button"
          onClick={() => setGender('female')}
          className={`flex-1 py-4 rounded-2xl border font-medium transition-all duration-300 ${
            gender === 'female'
              ? 'border-[#D4FF00]/50 bg-[#D4FF00]/10 text-white shadow-[0_0_20px_rgba(212,255,0,0.15)]'
              : 'border-white/[0.08] text-zinc-500 hover:border-[#D4FF00]/30'
          }`}
        >
          🙋‍♀️ <span className="text-sm ml-1">Mujer</span>
        </button>
      </div>

      <div>
        <label className="text-[11px] text-zinc-400 ml-1 mb-1.5 block font-semibold">Edad (años)</label>
        <input
          type="number"
          inputMode="numeric"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="Ej: 25"
          className="w-full bg-[#09090B] border border-white/[0.08] rounded-2xl p-3.5 text-sm text-white placeholder-zinc-600 focus:border-[#D4FF00]/50 outline-none transition-all"
        />
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#D4FF00]/10 border border-[#D4FF00]/30 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(212,255,0,0.2)]">
          <Ruler size={28} className="text-[#D4FF00]" />
        </div>
        <h3 className="text-lg font-bold text-white">Antropometría</h3>
        <p className="text-xs text-zinc-500 mt-1">Determinación precisa de agua y proteínas por kg</p>
      </div>

      <div>
        <label className="text-[11px] text-zinc-400 ml-1 mb-1.5 block font-semibold">Peso corporal actual (kg)</label>
        <input
          type="number"
          step="0.1"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="Ej: 75.5"
          className="w-full bg-[#09090B] border border-white/[0.08] rounded-2xl p-3.5 text-sm text-white placeholder-zinc-600 focus:border-[#D4FF00]/50 outline-none transition-all"
        />
      </div>
      <div>
        <label className="text-[11px] text-zinc-400 ml-1 mb-1.5 block font-semibold">Estatura (cm)</label>
        <input
          type="number"
          step="0.5"
          inputMode="decimal"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          placeholder="Ej: 175"
          className="w-full bg-[#09090B] border border-white/[0.08] rounded-2xl p-3.5 text-sm text-white placeholder-zinc-600 focus:border-[#D4FF00]/50 outline-none transition-all"
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#D4FF00]/10 border border-[#D4FF00]/30 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(212,255,0,0.2)]">
          <Activity size={28} className="text-[#D4FF00]" />
        </div>
        <h3 className="text-lg font-bold text-white">Nivel de actividad (PAL)</h3>
        <p className="text-xs text-zinc-500 mt-1">Factor multiplicador de gasto calórico diario</p>
      </div>

      <div className="space-y-2">
        {[
          { value: 'sedentary', label: 'Sedentario', sub: 'Poco o nada de ejercicio (trabajo de escritorio)' },
          { value: 'light', label: 'Ligero', sub: 'Ejercicio 1 a 3 días por semana' },
          { value: 'moderate', label: 'Moderado', sub: 'Gimnasio 3 a 5 días por semana' },
          { value: 'active', label: 'Activo', sub: 'Entrenamiento intenso 6 a 7 días por semana' },
          { value: 'very_active', label: 'Muy activo / Pro', sub: 'Doble sesión o trabajo físico extenuante' },
        ].map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setActivityLevel(opt.value)}
            className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-300 ${
              activityLevel === opt.value
                ? 'border-[#D4FF00]/50 bg-[#D4FF00]/10 text-white shadow-[0_0_20px_rgba(212,255,0,0.15)]'
                : 'border-white/[0.08] text-zinc-400 hover:border-[#D4FF00]/30'
            }`}
          >
            <span className="text-xs font-bold text-white block">{opt.label}</span>
            <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">{opt.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#D4FF00]/10 border border-[#D4FF00]/30 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(212,255,0,0.2)]">
          <Target size={28} className="text-[#D4FF00]" />
        </div>
        <h3 className="text-lg font-bold text-white">Objetivo metabólico</h3>
        <p className="text-xs text-zinc-500 mt-1">Ajuste de balance energético y ratio de proteína</p>
      </div>

      <div className="space-y-2.5">
        {[
          { value: 'lose', label: 'Perder Grasa (Definición)', icon: '🔥', desc: 'Déficit moderado 20% + 2.2g proteína/kg' },
          { value: 'maintain', label: 'Mantenimiento / Recomposición', icon: '⚖️', desc: 'Normocalórica + 1.8g proteína/kg' },
          { value: 'gain', label: 'Ganar Músculo (Volumen Limpio)', icon: '💪', desc: 'Superávit 10% + 2.0g proteína/kg' },
        ].map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setGoalType(opt.value)}
            className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 flex items-center gap-3.5 ${
              goalType === opt.value
                ? 'border-[#D4FF00]/50 bg-[#D4FF00]/10 text-white shadow-[0_0_20px_rgba(212,255,0,0.15)]'
                : 'border-white/[0.08] text-zinc-400 hover:border-[#D4FF00]/30'
            }`}
          >
            <span className="text-2xl">{opt.icon}</span>
            <div>
              <span className="text-xs font-bold text-white block">{opt.label}</span>
              <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">{opt.desc}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (step) {
      case 0: return renderStep0();
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] flex flex-col justify-center px-5 safe-top safe-bottom relative overflow-hidden select-none">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-[#D4FF00]/[0.03] rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md mx-auto text-center relative z-10">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-[#D4FF00]/10 border border-[#D4FF00]/30 shadow-[0_0_25px_rgba(212,255,0,0.2)] mb-3 text-[#D4FF00]">
            <Sparkles size={28} />
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">Calibración Biométrica</h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-[280px] mx-auto leading-relaxed">
            Algoritmos validados por la ISSN y Mifflin-St Jeor
          </p>
        </div>

        {/* Indicador de pasos */}
        <div className="flex justify-center items-center gap-2 mb-6">
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`transition-all duration-300 ${
                idx === step
                  ? 'w-7 h-1.5 bg-[#D4FF00] rounded-full shadow-[0_0_10px_#D4FF00]'
                  : idx < step
                  ? 'w-1.5 h-1.5 bg-[#D4FF00]/60 rounded-full'
                  : 'w-1.5 h-1.5 bg-white/10 rounded-full'
              }`}
            />
          ))}
        </div>

        {/* Contenedor del paso */}
        <div className="bg-gradient-to-br from-white/[0.04] to-transparent border border-[#D4FF00]/20 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-[0_0_30px_rgba(212,255,0,0.1)] mb-6 text-left">
          {renderContent()}
        </div>

        {/* Botones de navegación */}
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={prevStep}
              className="flex-1 py-3.5 border border-white/[0.1] rounded-2xl text-zinc-400 text-xs font-bold flex items-center justify-center gap-1 hover:bg-white/[0.05] hover:text-white transition-all"
            >
              <ChevronLeft size={16} /> Atrás
            </button>
          )}
          <button
            type="button"
            onClick={nextStep}
            disabled={
              (step === 0 && !age) ||
              (step === 1 && (!weight || !height))
            }
            className="flex-1 py-4 volt-button rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-30 transition-all shadow-[0_0_20px_rgba(212,255,0,0.3)]"
          >
            {step === totalSteps - 1 ? (
              <>
                <Check size={16} strokeWidth={3} /> Guardar Perfil
              </>
            ) : (
              <>
                Continuar <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={handleSkip}
          className="mt-4 text-[10px] font-mono uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
        >
          Omitir y calibrar después
        </button>
      </div>
    </div>
  );
}