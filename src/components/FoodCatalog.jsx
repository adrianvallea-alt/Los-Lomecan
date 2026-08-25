// src/components/FoodCatalog.jsx
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { 
  Search, Plus, X, Sparkles, Barcode, Scale, Edit3, Check, Zap, Lightbulb,
  Minus, AlertCircle, Database, ChefHat
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import BarcodeScanner from './BarcodeScanner';
import { getFoodByBarcode, searchFoods } from '../utils/openFoodFacts';
import MealPlannerModal from './MealPlannerModal';

const FILTER_TAGS = [
  { id: 'all', label: 'Todos' },
  { id: 'high_pro', label: '🔥 Alta Proteína (≥15g)' },
  { id: 'low_carb', label: '🥑 Bajo Carbo (≤5g)' },
];

const MEAL_OPTIONS = [
  { id: 'desayuno', label: '🌅 Desayuno' },
  { id: 'comida', label: '☀️ Comida' },
  { id: 'cena', label: '🌙 Cena' },
  { id: 'snack', label: '⚡ Snack' },
];

const triggerHaptic = (ms = 25) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(ms); } catch (e) {}
  }
};

// Función precisa para identificar si un alimento fue creado por el usuario
const isCustomFood = (f) => {
  if (!f) return false;
  if (f.is_custom === true) return true;
  if (typeof f.barcode === 'string' && f.barcode.startsWith('custom_')) return true;
  if (typeof f.id === 'string' && f.id.startsWith('custom_')) return true;
  if (f.brand === 'Casero' || f.brand === 'Personalizado') return true;
  return false;
};

export default function FoodCatalog({ onAddToDay, goals }) {
  const [foods, setFoods] = useState([]);
  const [search, setSearch] = useState('');
  
  // Pestaña activa: 'global' (Base de Datos) | 'custom' (Mis Alimentos Creados)
  const [sourceTab, setSourceTab] = useState('global');
  const [activeFilter, setActiveFilter] = useState('all');
  
  const [loading, setLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [selectedGrams, setSelectedGrams] = useState(100);
  const [selectedMealType, setSelectedMealType] = useState('comida');
  const [showScanner, setShowScanner] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [showMealPlanner, setShowMealPlanner] = useState(false);
  const [editingFood, setEditingFood] = useState(null);
  const [notFoundBarcode, setNotFoundBarcode] = useState(null);

  // Formulario de creación
  const [customName, setCustomName] = useState('');
  const [customBrand, setCustomBrand] = useState('Casero');
  const [customCal, setCustomCal] = useState('');
  const [customPro, setCustomPro] = useState('');
  const [customCarb, setCustomCarb] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customBarcode, setCustomBarcode] = useState('');

  // Cargar catálogo y alimentos creados locales
  const loadAllFoods = async () => {
    setLoading(true);
    try {
      const localCustom = JSON.parse(localStorage.getItem('userCustomFoods') || '[]');
      let baseList = [];

      const cached = localStorage.getItem('foodsCache');
      if (cached) {
        baseList = JSON.parse(cached);
      }

      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('foods')
          .select('*')
          .order('name')
          .limit(200);

        if (!error && data) {
          baseList = data;
          localStorage.setItem('foodsCache', JSON.stringify(data));
        }
      }

      // Combinar base de datos con los alimentos creados por el usuario
      const merged = Array.from(
        new Map([...baseList, ...localCustom].map(item => [item.id || item.barcode || item.name, item])).values()
      );

      setFoods(merged);
    } catch (err) {
      console.warn('⚠️ Error al cargar alimentos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllFoods();
  }, []);

  // Búsqueda en tiempo real
  useEffect(() => {
    if (!search.trim()) {
      loadAllFoods();
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const query = search.trim().toLowerCase();

      try {
        let localMatches = [];
        const cached = localStorage.getItem('foodsCache');
        const localCustom = JSON.parse(localStorage.getItem('userCustomFoods') || '[]');
        
        const allCached = [...(cached ? JSON.parse(cached) : []), ...localCustom];
        localMatches = allCached.filter(f =>
          f.name.toLowerCase().includes(query) || (f.brand && f.brand.toLowerCase().includes(query))
        );

        if (navigator.onLine && sourceTab === 'global') {
          const { data } = await supabase
            .from('foods')
            .select('*')
            .ilike('name', `%${query}%`)
            .limit(20);

          if (data && data.length > 0) {
            localMatches = Array.from(new Map([...localMatches, ...data].map(f => [f.name, f])).values());
          }

          if (localMatches.length < 5) {
            const offResults = await searchFoods(query);
            const combined = Array.from(
              new Map([...localMatches, ...offResults].map(f => [f.name.toLowerCase(), f])).values()
            );
            setFoods(combined);
            setLoading(false);
            return;
          }
        }

        setFoods(localMatches);
      } catch (e) {
        console.warn('Error en búsqueda de comida:', e);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [search, sourceTab]);

  // Auto-calcular calorías en el formulario (4*P + 4*C + 9*G)
  useEffect(() => {
    if (customPro || customCarb || customFat) {
      const p = parseFloat(customPro) || 0;
      const c = parseFloat(customCarb) || 0;
      const f = parseFloat(customFat) || 0;
      const calculated = Math.round((p * 4) + (c * 4) + (f * 9));
      setCustomCal(calculated > 0 ? calculated.toString() : '');
    }
  }, [customPro, customCarb, customFat]);

  const handleSelectFood = (food) => {
    triggerHaptic(18);
    const hour = new Date().getHours();
    let defaultMeal = 'comida';
    if (hour >= 5 && hour < 12) defaultMeal = 'desayuno';
    else if (hour >= 12 && hour < 17) defaultMeal = 'comida';
    else if (hour >= 17 && hour < 22) defaultMeal = 'cena';
    else defaultMeal = 'snack';

    setSelectedMealType(defaultMeal);
    setSelectedFood(food);
    setSelectedGrams(100);
  };

  const handleBarcode = async (code) => {
    setShowScanner(false);
    setLoading(true);

    try {
      const { data: cached } = await supabase
        .from('foods')
        .select('*')
        .eq('barcode', code)
        .maybeSingle();

      if (cached) {
        handleSelectFood(cached);
        setLoading(false);
        return;
      }

      const remote = await getFoodByBarcode(code);
      if (remote) {
        const { data: saved } = await supabase
          .from('foods')
          .insert([remote])
          .select()
          .single();
        const finalFood = saved || remote;
        setFoods(prev => [finalFood, ...prev]);
        handleSelectFood(finalFood);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn('Error escaneando producto:', e);
    }

    setLoading(false);
    setNotFoundBarcode(code);
  };

  const handleConfirmAdd = () => {
    if (selectedFood && selectedGrams > 0) {
      triggerHaptic(35);
      const foodWithMeal = {
        ...selectedFood,
        mealType: selectedMealType
      };
      onAddToDay(foodWithMeal, selectedGrams);
      setSelectedFood(null);
      setSelectedGrams(100);
    }
  };

  // Guardar Alimento Creado por el Usuario
  const handleSaveCustomFood = async () => {
    if (!customName.trim() || !customCal) return;
    triggerHaptic(30);

    const generatedId = editingFood?.id || `custom_${Date.now()}`;
    const foodData = {
      id: generatedId,
      name: customName.trim(),
      brand: customBrand.trim() || 'Casero',
      cal: Math.round(parseFloat(customCal) || 0),
      pro: parseFloat(Number(customPro || 0).toFixed(1)),
      carb: parseFloat(Number(customCarb || 0).toFixed(1)),
      fat: parseFloat(Number(customFat || 0).toFixed(1)),
      base_g: 100,
      barcode: customBarcode || `custom_${Date.now()}`,
      is_custom: true
    };

    // Guardar en localStorage para garantizar persistencia en "Mis Alimentos"
    const localCustom = JSON.parse(localStorage.getItem('userCustomFoods') || '[]');
    const updatedLocal = editingFood?.id
      ? localCustom.map(f => f.id === editingFood.id ? foodData : f)
      : [foodData, ...localCustom];
    localStorage.setItem('userCustomFoods', JSON.stringify(updatedLocal));

    try {
      if (editingFood?.id && !String(editingFood.id).startsWith('custom_')) {
        await supabase.from('foods').update(foodData).eq('id', editingFood.id);
      } else {
        await supabase.from('foods').insert([foodData]);
      }
    } catch (err) {
      console.warn('Guardado localmente:', err);
    }

    setFoods(prev => {
      const filtered = prev.filter(f => f.id !== foodData.id);
      return [foodData, ...filtered];
    });

    setSelectedFood(foodData);
    setCustomName('');
    setCustomBrand('Casero');
    setCustomCal('');
    setCustomPro('');
    setCustomCarb('');
    setCustomFat('');
    setCustomBarcode('');
    setEditingFood(null);
    setShowCustomForm(false);
    setSourceTab('custom'); // Llevarlo directamente a Mis Alimentos
  };

  const handleApplyFullPlan = (planItems) => {
    planItems.forEach(({ food, grams }) => {
      onAddToDay(food, grams);
    });
  };

  const handleAddSingleMealFromPlan = (food, grams) => {
    onAddToDay(food, grams);
  };

  // Separación estricta y correcta
  const filteredFoods = useMemo(() => {
    return foods.filter(f => {
      const custom = isCustomFood(f);
      
      // Si estamos en "Mis Alimentos", SOLO mostrar creados por el usuario
      if (sourceTab === 'custom' && !custom) return false;
      // Si estamos en "Base de Datos", SOLO mostrar alimentos oficiales
      if (sourceTab === 'global' && custom) return false;

      // Filtros de macronutrientes
      if (activeFilter === 'high_pro') return (f.pro || 0) >= 15;
      if (activeFilter === 'low_carb') return (f.carb || 0) <= 5;
      return true;
    });
  }, [foods, sourceTab, activeFilter]);

  const customFoodsCount = useMemo(() => foods.filter(isCustomFood).length, [foods]);
  const globalFoodsCount = useMemo(() => foods.filter(f => !isCustomFood(f)).length, [foods]);

  const currentMacros = useMemo(() => {
    if (!selectedFood) return { cal: 0, pro: 0, carb: 0, fat: 0 };
    const ratio = (selectedGrams || 0) / (selectedFood.base_g || 100);
    return {
      cal: Math.round((selectedFood.cal || 0) * ratio),
      pro: parseFloat(((selectedFood.pro || 0) * ratio).toFixed(1)),
      carb: parseFloat(((selectedFood.carb || 0) * ratio).toFixed(1)),
      fat: parseFloat(((selectedFood.fat || 0) * ratio).toFixed(1)),
    };
  }, [selectedFood, selectedGrams]);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative bg-[#09090B] overflow-hidden select-none">
      
      {/* Header Superior */}
      <div className="px-5 pt-3 pb-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[#D4FF00]" />
          <h2 className="text-xl font-black text-white tracking-tight font-sans">Catálogo</h2>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Botón Ideas de Menú */}
          <button
            onClick={() => {
              triggerHaptic(20);
              setShowMealPlanner(true);
            }}
            className="px-3 py-2 rounded-2xl bg-[#D4FF00]/10 border border-[#D4FF00]/30 text-[#D4FF00] hover:bg-[#D4FF00] hover:text-[#09090B] text-xs font-mono font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-[0_0_12px_rgba(212,255,0,0.15)]"
            title="Ver sugerencias de comidas balanceadas"
          >
            <Lightbulb size={14} /> Ideas
          </button>

          {/* Botón Crear Alimento */}
          <button
            onClick={() => {
              triggerHaptic(20);
              setEditingFood(null);
              setCustomName('');
              setCustomBrand('Casero');
              setCustomCal('');
              setCustomPro('');
              setCustomCarb('');
              setCustomFat('');
              setCustomBarcode('');
              setShowCustomForm(true);
            }}
            className="p-2.5 rounded-full bg-[#D4FF00]/10 border border-[#D4FF00]/30 text-[#D4FF00] hover:bg-[#D4FF00] hover:text-[#09090B] active:scale-95 transition-all shadow-[0_0_15px_rgba(212,255,0,0.15)]"
            aria-label="Crear alimento nuevo"
            title="Crear Alimento Casero"
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
          
          {/* Escanear Código */}
          <button
            onClick={() => {
              triggerHaptic(25);
              setShowScanner(true);
            }}
            className="p-2.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white active:scale-95 transition-all"
            aria-label="Escanear código de barras"
          >
            <Barcode size={18} />
          </button>
        </div>
      </div>

      {/* Selector de División: Base de Datos Global vs Mis Alimentos Creados */}
      <div className="px-5 mb-3 shrink-0">
        <div className="flex bg-white/[0.04] p-1 rounded-2xl border border-white/[0.06]">
          <button
            onClick={() => {
              triggerHaptic(15);
              setSourceTab('global');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 ${
              sourceTab === 'global'
                ? 'bg-[#D4FF00] text-[#09090B] shadow-md font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Database size={13} /> Base de Datos ({globalFoodsCount})
          </button>

          <button
            onClick={() => {
              triggerHaptic(15);
              setSourceTab('custom');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 ${
              sourceTab === 'custom'
                ? 'bg-[#D4FF00] text-[#09090B] shadow-md font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ChefHat size={14} /> Mis Alimentos ({customFoodsCount})
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="px-5 mb-3 shrink-0">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-3.5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={sourceTab === 'global' ? "Buscar en base de datos global..." : "Buscar en mis alimentos creados..."}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-zinc-500 focus:border-[#D4FF00]/50 outline-none transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Chips de filtro */}
      <div className="w-full mb-3 shrink-0 overflow-x-auto no-scrollbar touch-pan-x">
        <div className="flex gap-2 px-5 w-max">
          {FILTER_TAGS.map(tag => (
            <button
              key={tag.id}
              onClick={() => {
                triggerHaptic(15);
                setActiveFilter(tag.id);
              }}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all active:scale-95 ${
                activeFilter === tag.id
                  ? 'bg-[#D4FF00] text-[#09090B] shadow-[0_0_12px_rgba(212,255,0,0.35)] font-black'
                  : 'bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white'
              }`}
            >
              {tag.label}
            </button>
          ))}
          <div className="w-3 shrink-0" />
        </div>
      </div>

      {/* Listado de alimentos */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 space-y-2.5 pb-36 no-scrollbar">
        {loading && (
          <div className="py-8 text-center text-xs font-mono text-zinc-500 tracking-wider">
            Sincronizando alimentos...
          </div>
        )}

        {!loading && filteredFoods.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500 gap-3">
            <Scale size={40} className="text-zinc-700" />
            <div>
              <p className="text-xs font-bold text-zinc-300">
                {sourceTab === 'custom' 
                  ? 'Aún no has creado alimentos personalizados' 
                  : 'No se encontraron alimentos en la base de datos'}
              </p>
              <p className="text-[11px] text-zinc-500 font-mono mt-1">
                {sourceTab === 'custom' ? 'Toca el botón abajo para guardar tu primer platillo' : 'Intenta con otro término de búsqueda'}
              </p>
            </div>
            
            {sourceTab === 'custom' && (
              <button
                onClick={() => setShowCustomForm(true)}
                className="px-5 py-3 volt-button rounded-xl text-xs font-black uppercase tracking-wider font-mono active:scale-95 shadow-lg"
              >
                + Crear Mi Primer Alimento
              </button>
            )}
          </div>
        )}

        {!loading && filteredFoods.map(food => (
          <div
            key={food.id || food.barcode}
            onClick={() => handleSelectFood(food)}
            className="p-3.5 rounded-2xl border bg-white/[0.02] border-white/[0.05] hover:border-white/10 active:scale-[0.99] transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white font-bold text-xs truncate group-hover:text-[#D4FF00] transition-colors">{food.name}</p>
                {isCustomFood(food) && (
                  <span className="text-[8px] font-mono font-black bg-[#D4FF00]/15 text-[#D4FF00] border border-[#D4FF00]/30 px-1.5 py-0.5 rounded-md shrink-0">
                    CREADO
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400 font-mono">
                <span className="text-white font-bold">{food.cal} kcal</span>
                <span>·</span>
                <span className="text-blue-400 font-semibold">P: {food.pro}g</span>
                <span className="text-purple-400 font-semibold">C: {food.carb}g</span>
                <span className="text-amber-400 font-semibold">G: {food.fat}g</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectFood(food);
                }}
                className="px-3 py-1.5 bg-[#D4FF00]/10 border border-[#D4FF00]/30 text-[#D4FF00] hover:bg-[#D4FF00] hover:text-[#09090B] rounded-xl text-[10px] font-bold active:scale-90 transition-all flex items-center gap-1 font-mono"
                title="Añadir porción"
              >
                <Plus size={12} strokeWidth={3} /> Añadir
              </button>

              {isCustomFood(food) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingFood(food);
                    setCustomName(food.name);
                    setCustomBrand(food.brand || 'Casero');
                    setCustomCal(food.cal.toString());
                    setCustomPro(food.pro.toString());
                    setCustomCarb(food.carb.toString());
                    setCustomFat(food.fat.toString());
                    setCustomBarcode(food.barcode || '');
                    setShowCustomForm(true);
                  }}
                  className="p-2 rounded-xl bg-white/[0.03] text-zinc-400 hover:text-white active:scale-90"
                  title="Editar alimento"
                >
                  <Edit3 size={13} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: CONFIGURAR Y AÑADIR PORCIÓN */}
      {selectedFood && ReactDOM.createPortal(
        <div 
          className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-end justify-center animate-fade-in"
          onClick={() => setSelectedFood(null)}
        >
          <div 
            className="w-full max-w-md bg-[#0C0C12] border-t border-white/[0.12] rounded-t-[2.5rem] p-6 shadow-[0_-20px_50px_rgba(0,0,0,0.95)] animate-slide-up space-y-4"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 24px) + 24px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto -mt-2 mb-2" />

            <div className="flex items-start justify-between">
              <div className="min-w-0 pr-2">
                <h3 className="text-white font-extrabold text-base truncate">{selectedFood.name}</h3>
                <p className="text-xs text-zinc-400 mt-0.5 font-mono">{selectedFood.brand || 'Alimento'} · Base 100g</p>
              </div>
              <button
                onClick={() => setSelectedFood(null)}
                className="p-2 rounded-full bg-white/[0.05] text-zinc-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Selector de Momento de Comida */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">
                Asignar a:
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {MEAL_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic(15);
                      setSelectedMealType(opt.id);
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedMealType === opt.id
                        ? 'bg-[#D4FF00] text-[#09090B] shadow-[0_0_10px_rgba(212,255,0,0.3)] font-black'
                        : 'bg-white/[0.04] text-zinc-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Selector y Stepper de Gramaje Ergonómico */}
            <div className="bg-white/[0.03] border border-white/[0.06] p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300">Cantidad:</span>
                
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(15);
                      setSelectedGrams(prev => Math.max(5, prev - 25));
                    }}
                    className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center active:scale-90"
                    aria-label="Restar 25 gramos"
                  >
                    <Minus size={14} />
                  </button>
                  
                  <input
                    type="number"
                    inputMode="numeric"
                    value={selectedGrams}
                    onChange={(e) => setSelectedGrams(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-20 bg-black border border-white/[0.15] rounded-xl text-center text-sm font-bold text-[#D4FF00] py-1.5 outline-none focus:border-[#D4FF00] font-mono"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(15);
                      setSelectedGrams(prev => prev + 25);
                    }}
                    className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center active:scale-90"
                    aria-label="Sumar 25 gramos"
                  >
                    <Plus size={14} />
                  </button>
                  <span className="text-xs font-mono font-bold text-zinc-400 ml-1">g</span>
                </div>
              </div>

              {/* Accesos Rápidos de Gramaje */}
              <div className="flex gap-1.5">
                {[50, 100, 150, 200, 250].map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      triggerHaptic(15);
                      setSelectedGrams(g);
                    }}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                      selectedGrams === g
                        ? 'bg-[#D4FF00] text-[#09090B] shadow-[0_0_10px_rgba(212,255,0,0.3)] font-black'
                        : 'bg-white/[0.04] text-zinc-400 hover:text-white'
                    }`}
                  >
                    {g}g
                  </button>
                ))}
              </div>
            </div>

            {/* Resumen Nutricional Calculado */}
            <div className="grid grid-cols-4 gap-2 text-center text-[10px] bg-white/[0.02] border border-white/[0.04] p-3 rounded-2xl font-mono">
              <div>
                <span className="text-zinc-500 block">Kcal</span>
                <span className="text-sm text-white font-black">{currentMacros.cal}</span>
              </div>
              <div>
                <span className="text-blue-400 block">Proteína</span>
                <span className="text-sm text-white font-black">{currentMacros.pro}g</span>
              </div>
              <div>
                <span className="text-purple-400 block">Carbos</span>
                <span className="text-sm text-white font-black">{currentMacros.carb}g</span>
              </div>
              <div>
                <span className="text-amber-400 block">Grasas</span>
                <span className="text-sm text-white font-black">{currentMacros.fat}g</span>
              </div>
            </div>

            {/* Botón de Confirmación */}
            <button
              onClick={handleConfirmAdd}
              className="w-full py-4 volt-button rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_25px_rgba(212,255,0,0.4)] font-mono"
            >
              <Check size={18} strokeWidth={3} />
              Añadir a mi día ({selectedGrams}g)
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* DIÁLOGO DARK GLASS SI EL CÓDIGO ESCANEADO NO EXISTE */}
      {notFoundBarcode && (
        <div className="fixed inset-0 z-[140] bg-black/85 backdrop-blur-md flex items-center justify-center p-5 animate-fade-in">
          <div className="luxury-card p-6 max-w-sm w-full space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#D4FF00]/10 text-[#D4FF00]">
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm font-sans">Producto no encontrado</h3>
                <p className="text-zinc-500 text-[10px] font-mono mt-0.5">{notFoundBarcode}</p>
              </div>
            </div>

            <p className="text-zinc-400 text-xs leading-relaxed font-sans">
              Este código de barras no está en la base de datos. ¿Deseas registrarlo en "Mis Alimentos" ahora?
            </p>

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setNotFoundBarcode(null)}
                className="flex-1 py-3 bg-white/[0.04] border border-white/[0.08] text-white text-xs font-bold rounded-xl active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setCustomBarcode(notFoundBarcode);
                  setNotFoundBarcode(null);
                  setShowCustomForm(true);
                }}
                className="flex-1 py-3 bg-[#D4FF00] text-[#09090B] text-xs font-black uppercase tracking-wider rounded-xl active:scale-95 shadow-md font-mono"
              >
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ideas de Menús */}
      {showMealPlanner && (
        <MealPlannerModal
          goals={goals}
          onApplyPlan={handleApplyFullPlan}
          onAddSingleMeal={handleAddSingleMealFromPlan}
          onClose={() => setShowMealPlanner(false)}
        />
      )}

      {/* Modal: Crear / Editar Alimento Personalizado */}
      {showCustomForm && (
        <div className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0A0A0C] border border-white/[0.08] rounded-3xl p-5 space-y-4 shadow-2xl animate-scale-in">
            <div className="flex justify-between items-center">
              <h3 className="text-white font-bold text-sm font-sans">
                {editingFood ? 'Editar Mi Alimento' : 'Nuevo Alimento Casero (Base 100g)'}
              </h3>
              <button
                onClick={() => setShowCustomForm(false)}
                className="p-1 text-zinc-500 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Nombre del platillo o receta *"
                className="w-full bg-black/60 border border-white/[0.08] rounded-xl p-3 text-xs text-white focus:border-[#D4FF00] outline-none"
              />
              <input
                type="text"
                value={customBrand}
                onChange={(e) => setCustomBrand(e.target.value)}
                placeholder="Marca o referencia (ej. Casero, Mamá)"
                className="w-full bg-black/60 border border-white/[0.08] rounded-xl p-3 text-xs text-white focus:border-[#D4FF00] outline-none"
              />

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] font-mono font-bold text-blue-400 uppercase">Proteínas</label>
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={customPro}
                    onChange={(e) => setCustomPro(e.target.value)}
                    placeholder="0g"
                    className="w-full mt-1 bg-black/60 border border-white/[0.08] rounded-xl p-2.5 text-xs text-white text-center focus:border-[#D4FF00] outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono font-bold text-purple-400 uppercase">Carbos</label>
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={customCarb}
                    onChange={(e) => setCustomCarb(e.target.value)}
                    placeholder="0g"
                    className="w-full mt-1 bg-black/60 border border-white/[0.08] rounded-xl p-2.5 text-xs text-white text-center focus:border-[#D4FF00] outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono font-bold text-amber-400 uppercase">Grasas</label>
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={customFat}
                    onChange={(e) => setCustomFat(e.target.value)}
                    placeholder="0g"
                    className="w-full mt-1 bg-black/60 border border-white/[0.08] rounded-xl p-2.5 text-xs text-white text-center focus:border-[#D4FF00] outline-none font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-mono font-bold text-zinc-400 uppercase">Calorías Totales (kcal)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={customCal}
                  onChange={(e) => setCustomCal(e.target.value)}
                  placeholder="Auto-calculadas"
                  className="w-full mt-1 bg-black/60 border border-white/[0.08] rounded-xl p-2.5 text-xs text-white text-center font-black focus:border-[#D4FF00] outline-none font-mono text-[#D4FF00]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveCustomFood}
                disabled={!customName.trim() || !customCal}
                className="flex-1 py-3.5 volt-button rounded-xl text-xs font-black uppercase tracking-wider active:scale-95 disabled:opacity-40 font-mono"
              >
                Guardar en Mis Alimentos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escáner de Código de Barras */}
      {showScanner && (
        <BarcodeScanner
          onDetected={handleBarcode}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}