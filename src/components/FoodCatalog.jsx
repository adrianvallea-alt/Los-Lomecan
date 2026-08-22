// src/components/FoodCatalog.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Plus, X, Sparkles, Barcode, Save, Edit3, 
  Check, Scale 
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import BarcodeScanner from './BarcodeScanner';
import { getFoodByBarcode, searchFoods } from '../utils/openFoodFacts';

const FILTER_TAGS = [
  { id: 'all', label: 'Todos' },
  { id: 'high_pro', label: '🔥 Proteína (>15g)' },
  { id: 'low_carb', label: '🥑 Bajo Carbo (<5g)' },
  { id: 'custom', label: '⭐ Mis Alimentos' },
];

export default function FoodCatalog({ onAddToDay }) {
  const [foods, setFoods] = useState([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [selectedGrams, setSelectedGrams] = useState(100);
  const [showScanner, setShowScanner] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [editingFood, setEditingFood] = useState(null);

  // Formulario personalizado
  const [customName, setCustomName] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [customCal, setCustomCal] = useState('');
  const [customPro, setCustomPro] = useState('');
  const [customCarb, setCustomCarb] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customBarcode, setCustomBarcode] = useState('');

  // Cargar alimentos de caché o Supabase
  const loadAllFoods = async () => {
    setLoading(true);
    try {
      const cached = localStorage.getItem('foodsCache');
      if (cached) {
        setFoods(JSON.parse(cached));
      }

      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('foods')
          .select('*')
          .order('name')
          .limit(150);

        if (!error && data) {
          setFoods(data);
          localStorage.setItem('foodsCache', JSON.stringify(data));
        }
      }
    } catch (err) {
      console.warn('⚠️ Error al cargar catálogo de alimentos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllFoods();
  }, []);

  // Búsqueda combinada: Supabase + OpenFoodFacts
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
        if (cached) {
          localMatches = JSON.parse(cached).filter(f =>
            f.name.toLowerCase().includes(query) || (f.brand && f.brand.toLowerCase().includes(query))
          );
        }

        if (navigator.onLine) {
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
  }, [search]);

  // Auto-cálculo de calorías en formulario
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
    if (window.confirm(`Producto (${code}) no encontrado. ¿Deseas registrarlo manualmente?`)) {
      setCustomBarcode(code);
      setShowCustomForm(true);
    }
  };

  const handleConfirmAdd = () => {
    if (selectedFood && selectedGrams > 0) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(40);
      }
      onAddToDay(selectedFood, selectedGrams);
      setSelectedFood(null);
      setSelectedGrams(100);
    }
  };

  const handleSaveCustomFood = async () => {
    if (!customName.trim() || !customCal) return;

    const foodData = {
      name: customName.trim(),
      brand: customBrand.trim() || 'Casero',
      cal: Math.round(parseFloat(customCal) || 0),
      pro: parseFloat(Number(customPro || 0).toFixed(1)),
      carb: parseFloat(Number(customCarb || 0).toFixed(1)),
      fat: parseFloat(Number(customFat || 0).toFixed(1)),
      base_g: 100,
      barcode: customBarcode || `custom_${Date.now()}`,
    };

    try {
      if (editingFood?.id) {
        const { data } = await supabase
          .from('foods')
          .update(foodData)
          .eq('id', editingFood.id)
          .select()
          .single();
        const updated = data || { ...editingFood, ...foodData };
        setFoods(prev => prev.map(f => f.id === editingFood.id ? updated : f));
        setSelectedFood(updated);
      } else {
        const { data } = await supabase
          .from('foods')
          .insert([foodData])
          .select()
          .single();
        const created = data || foodData;
        setFoods(prev => [created, ...prev]);
        setSelectedFood(created);
      }
    } catch (err) {
      console.warn('Guardando alimento en local:', err);
      setFoods(prev => [foodData, ...prev]);
      setSelectedFood(foodData);
    }

    setCustomName('');
    setCustomBrand('');
    setCustomCal('');
    setCustomPro('');
    setCustomCarb('');
    setCustomFat('');
    setCustomBarcode('');
    setEditingFood(null);
    setShowCustomForm(false);
  };

  const filteredFoods = useMemo(() => {
    return foods.filter(f => {
      if (activeFilter === 'high_pro') return (f.pro || 0) >= 15;
      if (activeFilter === 'low_carb') return (f.carb || 0) <= 5;
      if (activeFilter === 'custom') return !f.barcode || f.barcode.startsWith('custom_') || f.brand === 'Casero';
      return true;
    });
  }, [foods, activeFilter]);

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
    <div className="flex-1 flex flex-col relative pb-32 no-scrollbar select-none bg-[#09090B] overflow-x-hidden">
      
      {/* Header */}
      <div className="px-5 pt-3 pb-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[#D4FF00]" />
          <h2 className="text-xl font-black text-white tracking-tight">Alimentos</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingFood(null);
              setShowCustomForm(true);
            }}
            className="p-2.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-[#D4FF00] active:scale-95 transition-all"
            aria-label="Crear alimento nuevo"
          >
            <Plus size={18} />
          </button>
          <button
            onClick={() => setShowScanner(true)}
            className="p-2.5 rounded-full bg-[#D4FF00]/10 border border-[#D4FF00]/30 text-[#D4FF00] hover:bg-[#D4FF00]/20 active:scale-95 transition-all shadow-[0_0_15px_rgba(212,255,0,0.15)]"
            aria-label="Escanear código de barras"
          >
            <Barcode size={18} />
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
            placeholder="Buscar por nombre, pollo, avena, marca..."
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

      {/* ✅ Filtros rápidos (Chips corregidos con scroll elástico sin corte) */}
      <div className="w-full mb-4 shrink-0 overflow-x-auto no-scrollbar touch-pan-x">
        <div className="flex gap-2 px-5 w-max">
          {FILTER_TAGS.map(tag => (
            <button
              key={tag.id}
              onClick={() => setActiveFilter(tag.id)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all active:scale-95 ${
                activeFilter === tag.id
                  ? 'bg-[#D4FF00] text-[#09090B] shadow-[0_0_12px_rgba(212,255,0,0.35)]'
                  : 'bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white'
              }`}
            >
              {tag.label}
            </button>
          ))}
          {/* Espaciador final para asegurar que el último chip no toque el borde */}
          <div className="w-3 shrink-0" />
        </div>
      </div>

      {/* Listado de alimentos */}
      <div className="flex-1 overflow-y-auto px-5 space-y-2.5 no-scrollbar">
        {loading && (
          <div className="py-8 text-center text-xs font-mono text-zinc-500 tracking-wider">
            Buscando alimentos...
          </div>
        )}

        {!loading && filteredFoods.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500 gap-2">
            <Scale size={36} className="text-zinc-700" />
            <p className="text-xs font-medium">No se encontraron alimentos</p>
            <button
              onClick={() => setShowCustomForm(true)}
              className="mt-2 text-xs text-[#D4FF00] font-bold uppercase tracking-wider underline"
            >
              + Crear alimento personalizado
            </button>
          </div>
        )}

        {!loading && filteredFoods.map(food => {
          const isSelected = selectedFood?.id === food.id || (food.barcode && selectedFood?.barcode === food.barcode);
          return (
            <div
              key={food.id || food.barcode}
              onClick={() => handleSelectFood(food)}
              className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                isSelected
                  ? 'bg-[#D4FF00]/10 border-[#D4FF00]/50 shadow-[0_0_15px_rgba(212,255,0,0.1)]'
                  : 'bg-white/[0.02] border-white/[0.05] hover:border-white/10 active:scale-[0.99]'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-xs truncate">{food.name}</p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400 font-mono">
                  <span>{food.cal} kcal</span>
                  <span>·</span>
                  <span className="text-blue-400 font-semibold">P: {food.pro}g</span>
                  <span className="text-purple-400 font-semibold">C: {food.carb}g</span>
                  <span className="text-amber-400 font-semibold">G: {food.fat}g</span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingFood(food);
                  setCustomName(food.name);
                  setCustomBrand(food.brand || '');
                  setCustomCal(food.cal.toString());
                  setCustomPro(food.pro.toString());
                  setCustomCarb(food.carb.toString());
                  setCustomFat(food.fat.toString());
                  setCustomBarcode(food.barcode || '');
                  setShowCustomForm(true);
                }}
                className="p-2 rounded-xl bg-white/[0.03] text-zinc-500 hover:text-white"
                title="Editar alimento"
              >
                <Edit3 size={13} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal inferior flotante: Añadir porción rápida */}
      {selectedFood && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0C]/95 backdrop-blur-2xl border-t border-[#D4FF00]/20 p-5 rounded-t-[2.5rem] shadow-[0_-10px_30px_rgba(0,0,0,0.8)] animate-slide-up">
          <div className="max-w-md mx-auto space-y-4">
            
            {/* Header del producto seleccionado */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-white font-bold text-sm truncate max-w-[240px]">{selectedFood.name}</h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">{selectedFood.brand || 'Alimento'} · Base 100g</p>
              </div>
              <button
                onClick={() => setSelectedFood(null)}
                className="p-1 text-zinc-500 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Selector de gramos */}
            <div className="flex items-center justify-between gap-3 bg-white/[0.03] border border-white/[0.06] p-2.5 rounded-2xl">
              <span className="text-xs font-semibold text-zinc-400 pl-2">Cantidad (gramos):</span>
              <div className="flex items-center gap-2">
                {[50, 100, 150, 200].map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setSelectedGrams(g)}
                    className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                      selectedGrams === g
                        ? 'bg-[#D4FF00] text-[#09090B]'
                        : 'bg-white/[0.04] text-zinc-400 hover:text-white'
                    }`}
                  >
                    {g}g
                  </button>
                ))}
                <input
                  type="number"
                  inputMode="numeric"
                  value={selectedGrams}
                  onChange={(e) => setSelectedGrams(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-16 bg-black/60 border border-white/[0.1] rounded-xl text-center text-xs font-bold text-white py-1.5 outline-none focus:border-[#D4FF00]"
                />
              </div>
            </div>

            {/* Macros resultantes de la porción */}
            <div className="grid grid-cols-4 gap-2 text-center text-[10px] bg-white/[0.02] border border-white/[0.04] p-2.5 rounded-2xl font-mono">
              <div>
                <span className="text-zinc-500 block">Kcal</span>
                <span className="text-white font-bold">{currentMacros.cal}</span>
              </div>
              <div>
                <span className="text-blue-400 block">Proteína</span>
                <span className="text-white font-bold">{currentMacros.pro}g</span>
              </div>
              <div>
                <span className="text-purple-400 block">Carbos</span>
                <span className="text-white font-bold">{currentMacros.carb}g</span>
              </div>
              <div>
                <span className="text-amber-400 block">Grasas</span>
                <span className="text-white font-bold">{currentMacros.fat}g</span>
              </div>
            </div>

            {/* Botón de confirmación */}
            <button
              onClick={handleConfirmAdd}
              className="w-full py-3.5 bg-[#D4FF00] text-[#09090B] font-black rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_0_20px_rgba(212,255,0,0.3)] hover:bg-[#e5ff1a]"
            >
              <Check size={16} strokeWidth={2.5} />
              Añadir a mi día ({selectedGrams}g)
            </button>
          </div>
        </div>
      )}

      {/* Modal: Crear / Editar Alimento */}
      {showCustomForm && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0A0A0C] border border-white/[0.08] rounded-3xl p-5 space-y-4 shadow-2xl animate-scale-in">
            <div className="flex justify-between items-center">
              <h3 className="text-white font-bold text-sm">
                {editingFood ? 'Editar Alimento' : 'Nuevo Alimento (Base 100g)'}
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
                placeholder="Nombre del alimento *"
                className="w-full bg-black/60 border border-white/[0.08] rounded-xl p-3 text-xs text-white focus:border-[#D4FF00] outline-none"
              />
              <input
                type="text"
                value={customBrand}
                onChange={(e) => setCustomBrand(e.target.value)}
                placeholder="Marca (opcional, ej. Lala, Casero)"
                className="w-full bg-black/60 border border-white/[0.08] rounded-xl p-3 text-xs text-white focus:border-[#D4FF00] outline-none"
              />

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-blue-400 uppercase">Proteínas</label>
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={customPro}
                    onChange={(e) => setCustomPro(e.target.value)}
                    placeholder="0g"
                    className="w-full mt-1 bg-black/60 border border-white/[0.08] rounded-xl p-2.5 text-xs text-white text-center focus:border-[#D4FF00] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-purple-400 uppercase">Carbos</label>
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={customCarb}
                    onChange={(e) => setCustomCarb(e.target.value)}
                    placeholder="0g"
                    className="w-full mt-1 bg-black/60 border border-white/[0.08] rounded-xl p-2.5 text-xs text-white text-center focus:border-[#D4FF00] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-amber-400 uppercase">Grasas</label>
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={customFat}
                    onChange={(e) => setCustomFat(e.target.value)}
                    placeholder="0g"
                    className="w-full mt-1 bg-black/60 border border-white/[0.08] rounded-xl p-2.5 text-xs text-white text-center focus:border-[#D4FF00] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] font-bold text-zinc-400 uppercase">Calorías Totales (kcal)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={customCal}
                  onChange={(e) => setCustomCal(e.target.value)}
                  placeholder="Auto-calculadas"
                  className="w-full mt-1 bg-black/60 border border-white/[0.08] rounded-xl p-2.5 text-xs text-white text-center font-bold focus:border-[#D4FF00] outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveCustomFood}
                disabled={!customName.trim() || !customCal}
                className="flex-1 py-3 bg-[#D4FF00] text-[#09090B] font-bold rounded-xl text-xs uppercase tracking-wider active:scale-95 disabled:opacity-40"
              >
                Guardar Alimento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escáner de código de barras */}
      {showScanner && (
        <BarcodeScanner
          onDetected={handleBarcode}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}