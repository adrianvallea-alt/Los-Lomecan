import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Check, Calendar, Ruler, Activity, Target, Sparkles } from 'lucide-react';

// Fórmulas simplificadas (mismas que en EditProfileModal)
const calculateBMR = (weight, height, age, gender) => {
  if (!weight || !height || !age) return 0;
  return gender === 'female'
    ? Math.round((10 * weight) + (6.25 * height) - (5 * age) - 161)
    : Math.round((10 * weight) + (6.25 * height) - (5 * age) + 5);
};

const getActivityFactor = (level) => {
  const factors = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  return factors[level] || 1.55;
};

const calculateTDEE = (bmr, activityLevel) => Math.round(bmr * getActivityFactor(activityLevel));

const calculateGoals = (tdee, goalType) => {
  let targetCalories = tdee;
  if (goalType === 'lose') targetCalories = tdee - 500;
  else if (goalType === 'gain') targetCalories = tdee + 500;

  const protein = Math.round((targetCalories * 0.25) / 4);
  const fat = Math.round((targetCalories * 0.3) / 9);
  const carbs = Math.round((targetCalories - protein * 4 - fat * 9) / 4);

  return { cal: targetCalories, pro: protein, carb: Math.max(carbs, 0), fat };
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
    const bmr = calculateBMR(parseFloat(weight), parseFloat(height), parseInt(age), gender);
    const tdee = calculateTDEE(bmr, activityLevel);
    const goals = calculateGoals(tdee, goalType);

    onComplete({
      weight: parseFloat(weight),
      height: parseFloat(height),
      age: parseInt(age),
      gender,
      activity_level: activityLevel,
      goal_type: goalType,
      goals,
      auto_calculate_macros: true,
    });
  };

  // Omite el wizard con valores predeterminados
  const handleSkip = () => {
    onComplete({
      weight: 70,
      height: 170,
      age: 30,
      gender: 'male',
      activity_level: 'moderate',
      goal_type: 'maintain',
      goals: { cal: 2500, pro: 150, carb: 250, fat: 65 },
      auto_calculate_macros: true,
    });
  };

  const renderStep0 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
          <Calendar size={28} className="text-[#D4FF00]" />
        </div>
        <h3 className="text-lg font-semibold text-white">Sexo y edad</h3>
        <p className="text-xs text-zinc-500 mt-1">Para calcular tu metabolismo basal</p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setGender('male')}
          className={`flex-1 py-4 rounded-2xl border font-medium transition-all duration-300 ${
            gender === 'male'
              ? 'border-[#D4FF00]/40 bg-[#D4FF00]/5 text-white shadow-[0_0_20px_rgba(212,255,0,0.05)]'
              : 'border-white/[0.06] text-zinc-500 hover:border-white/10 hover:text-zinc-300'
          }`}
        >
          🙋‍♂️ <span className="text-sm ml-1">Hombre</span>
        </button>
        <button
          onClick={() => setGender('female')}
          className={`flex-1 py-4 rounded-2xl border font-medium transition-all duration-300 ${
            gender === 'female'
              ? 'border-[#D4FF00]/40 bg-[#D4FF00]/5 text-white shadow-[0_0_20px_rgba(212,255,0,0.05)]'
              : 'border-white/[0.06] text-zinc-500 hover:border-white/10 hover:text-zinc-300'
          }`}
        >
          🙋‍♀️ <span className="text-sm ml-1">Mujer</span>
        </button>
      </div>

      <div>
        <label className="text-[11px] text-zinc-500 ml-1 mb-1.5 block">Edad</label>
        <input
          type="number"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="25"
          className="w-full bg-[#09090B] border border-white/[0.08] rounded-2xl p-3.5 text-sm text-white placeholder-zinc-600 focus:border-[#D4FF00]/40 focus:ring-1 focus:ring-[#D4FF00]/10 transition-all outline-none"
        />
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
          <Ruler size={28} className="text-[#D4FF00]" />
        </div>
        <h3 className="text-lg font-semibold text-white">Peso y altura</h3>
        <p className="text-xs text-zinc-500 mt-1">Datos esenciales para tus metas</p>
      </div>

      <div>
        <label className="text-[11px] text-zinc-500 ml-1 mb-1.5 block">Peso (kg)</label>
        <input
          type="number"
          step="0.1"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="70"
          className="w-full bg-[#09090B] border border-white/[0.08] rounded-2xl p-3.5 text-sm text-white placeholder-zinc-600 focus:border-[#D4FF00]/40 focus:ring-1 focus:ring-[#D4FF00]/10 transition-all outline-none"
        />
      </div>
      <div>
        <label className="text-[11px] text-zinc-500 ml-1 mb-1.5 block">Altura (cm)</label>
        <input
          type="number"
          step="0.1"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          placeholder="170"
          className="w-full bg-[#09090B] border border-white/[0.08] rounded-2xl p-3.5 text-sm text-white placeholder-zinc-600 focus:border-[#D4FF00]/40 focus:ring-1 focus:ring-[#D4FF00]/10 transition-all outline-none"
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
          <Activity size={28} className="text-[#D4FF00]" />
        </div>
        <h3 className="text-lg font-semibold text-white">Nivel de actividad</h3>
        <p className="text-xs text-zinc-500 mt-1">¿Cuánto te mueves en el día?</p>
      </div>

      <div className="space-y-2">
        {[
          { value: 'sedentary', label: 'Sedentario (poco o nada de ejercicio)' },
          { value: 'light', label: 'Ligero (1-3 días/semana)' },
          { value: 'moderate', label: 'Moderado (3-5 días/semana)' },
          { value: 'active', label: 'Activo (6-7 días/semana)' },
          { value: 'very_active', label: 'Muy activo (atleta, trabajo físico)' },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => setActivityLevel(opt.value)}
            className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 ${
              activityLevel === opt.value
                ? 'border-[#D4FF00]/40 bg-[#D4FF00]/5 text-white shadow-[0_0_20px_rgba(212,255,0,0.05)]'
                : 'border-white/[0.05] text-zinc-400 hover:border-white/10 hover:text-zinc-200 hover:bg-white/[0.02]'
            }`}
          >
            <span className="text-sm font-medium">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
          <Target size={28} className="text-[#D4FF00]" />
        </div>
        <h3 className="text-lg font-semibold text-white">Objetivo</h3>
        <p className="text-xs text-zinc-500 mt-1">¿Qué quieres lograr?</p>
      </div>

      <div className="space-y-2">
        {[
          { value: 'lose', label: 'Perder grasa', icon: '🔥' },
          { value: 'maintain', label: 'Mantener peso', icon: '⚖️' },
          { value: 'gain', label: 'Ganar músculo', icon: '💪' },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => setGoalType(opt.value)}
            className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 flex items-center gap-4 ${
              goalType === opt.value
                ? 'border-[#D4FF00]/40 bg-[#D4FF00]/5 text-white shadow-[0_0_20px_rgba(212,255,0,0.05)]'
                : 'border-white/[0.05] text-zinc-400 hover:border-white/10 hover:text-zinc-200 hover:bg-white/[0.02]'
            }`}
          >
            <span className="text-2xl">{opt.icon}</span>
            <span className="text-sm font-medium">{opt.label}</span>
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
    <div className="min-h-screen bg-[#09090B] flex flex-col justify-center px-5 safe-top safe-bottom relative overflow-hidden">
      {/* Fondo ambiental */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-[#D4FF00]/[0.015] rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md mx-auto text-center relative z-10">
        {/* Encabezado */}
        <div className="mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] shadow-lg mb-5">
            <Sparkles size={28} className="text-[#D4FF00]" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Configura tu perfil</h1>
          <p className="text-xs text-zinc-500 mt-2 max-w-[250px] mx-auto leading-relaxed">
            Esto nos ayudará a personalizar tus metas
          </p>
        </div>

        {/* Indicador de paso mejorado */}
        <div className="flex justify-center items-center gap-2 mb-8">
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`transition-all duration-500 ease-out-expo ${
                idx === step
                  ? 'w-8 h-2 bg-[#D4FF00] rounded-full shadow-[0_0_10px_rgba(212,255,0,0.4)]'
                  : idx < step
                  ? 'w-2 h-2 bg-[#D4FF00]/60 rounded-full'
                  : 'w-2 h-2 bg-white/10 rounded-full'
              }`}
            />
          ))}
        </div>

        {/* Contenedor del paso actual */}
        <div className="bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-[2.5rem] p-6 shadow-2xl shadow-black/20 mb-6 transition-all duration-500 ease-out-expo">
          <div className="animate-fade-in-up" key={step}>
            {renderContent()}
          </div>
        </div>

        {/* Navegación */}
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={prevStep}
              className="flex-1 py-3.5 border border-white/[0.08] rounded-2xl text-zinc-400 text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-white/[0.03] hover:text-white active:scale-[0.98] transition-all"
            >
              <ChevronLeft size={16} />
              Atrás
            </button>
          )}
          <button
            onClick={nextStep}
            disabled={
              (step === 0 && !age) ||
              (step === 1 && (!weight || !height))
            }
            className="flex-1 py-3.5 bg-[#D4FF00] text-[#09090B] font-bold rounded-2xl text-sm flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:pointer-events-none hover:bg-[#e5ff1a] active:scale-[0.98] transition-all shadow-lg shadow-[#D4FF00]/10"
          >
            {step === totalSteps - 1 ? (
              <>
                <Check size={16} strokeWidth={2.5} />
                Finalizar
              </>
            ) : (
              <>
                Siguiente
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>

        {/* Botón para omitir y configurar más tarde */}
        <button
          onClick={handleSkip}
          className="mt-5 text-xs text-zinc-500 hover:text-white transition-colors"
        >
          Configurar más tarde
        </button>
      </div>

      <style>{`
        .ease-out-expo {
          transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); filter: blur(4px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}