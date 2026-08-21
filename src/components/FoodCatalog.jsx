import React, { useState, useEffect } from 'react';
import { Search, Plus, X, Sparkles, Barcode, Save, Edit3, Calculator } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import BarcodeScanner from './BarcodeScanner';
import { getFoodByBarcode } from '../utils/openFoodFacts';

export default function FoodCatalog({ onAddToDay }) {
  const [foods, setFoods] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [selectedPortion, setSelectedPortion] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showScanner, setShowScanner] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [editingFood, setEditingFood] = useState(null);
  const [customName, setCustomName] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [customCal, setCustomCal] = useState('');
  const [customPro, setCustomPro] = useState('');
  const [customCarb, setCustomCarb] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customBarcode, setCustomBarcode] = useState('');

  // ========== CARGAR ALIMENTOS CON CACHÉ ==========
  const loadAllFoods = async () => {
    setLoading(true);
    try {
      if (!navigator.onLine) {
        const cached = localStorage.getItem('foodsCache');
        if (cached) setFoods(JSON.parse(cached));
        else setFoods([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .order('name')
        .limit(200);
      if (error) throw error;

      if (data && data.length > 0) {
        setFoods(data);
        localStorage.setItem('foodsCache', JSON.stringify(data));
      } else {
        setFoods([]);
      }
    } catch (err) {
      console.warn('⚠️ Error cargando alimentos, usando caché:', err);
      const cached = localStorage.getItem('foodsCache');
      if (cached) setFoods(JSON.parse(cached));
      else setFoods([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllFoods();
  }, []);

  // ========== BÚSQUEDA CON DEBOUNCE Y CACHÉ ==========
  useEffect(() => {
    if (search.trim().length < 1) {
      loadAllFoods();
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);

      if (!navigator.onLine) {
        const cached = localStorage.getItem('foodsCache');
        if (cached) {
          const all = JSON.parse(cached);
          const filtered = all.filter(f =>
            f.name.toLowerCase().includes(search.toLowerCase())
          );
          setFoods(filtered);
        } else {
          setFoods([]);
        }
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('foods')
          .select('*')
          .ilike('name', `%${search}%`)
          .order('name')
          .limit(30);
        if (error) throw error;
        setFoods(data || []);
      } catch (err) {
        console.warn('⚠️ Error en búsqueda, usando caché:', err);
        const cached = localStorage.getItem('foodsCache');
        if (cached) {
          const all = JSON.parse(cached);
          setFoods(all.filter(f =>
            f.name.toLowerCase().includes(search.toLowerCase())
          ));
        } else {
          setFoods([]);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // ========== AUTO-CALCULAR CALORÍAS ==========
  useEffect(() => {
    if (customPro || customCarb || customFat) {
      const pro = parseFloat(customPro) || 0;
      const carb = parseFloat(customCarb) || 0;
      const fat = parseFloat(customFat) || 0;
      const calculated = (pro * 4) + (carb * 4) + (fat * 9);
      setCustomCal(calculated > 0 ? calculated.toFixed(0) : '');
    }
  }, [customPro, customCarb, customFat]);

  // ========== MANEJADORES ==========
  const handleSelectFood = (food) => {
    setSelectedFood(food);
    if (food.portions && food.portions.length > 0) {
      setSelectedPortion(food.portions[0]);
    } else {
      setSelectedPortion({ name: `Porción base (${food.base_g}g)`, grams: food.base_g });
    }
    setQuantity(1);
  };

  const handleBarcode = async (code) => {
    setShowScanner(false);
    setLoading(true);
    try {
      const { data: cached } = await supabase
        .from('foods')
        .select('*')
        .eq('barcode', code)
        .single();
      if (cached) {
        handleSelectFood(cached);
        setLoading(false);
        return;
      }
    } catch (e) {}

    try {
      const remote = await getFoodByBarcode(code);
      if (remote) {
        const { data: saved } = await supabase
          .from('foods')
          .insert([remote])
          .select()
          .single();
        handleSelectFood(saved || remote);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.log('Open Food Facts no disponible');
    }

    setLoading(false);
    const create = window.confirm('Producto no encontrado. ¿Deseas crear un alimento con este código de barras?');
    if (create) {
      setCustomBarcode(code);
      setShowCustomForm(true);
    }
  };

  const handleAdd = () => {
    if (selectedFood && selectedPortion && quantity > 0) {
      const totalGrams = selectedPortion.grams * quantity;
      onAddToDay(selectedFood, totalGrams);
      setSelectedFood(null);
      setSelectedPortion(null);
      setQuantity(1);
    }
  };

  const handleEditFood = (food) => {
    setEditingFood(food);
    setCustomName(food.name);
    setCustomBrand(food.brand || '');
    setCustomCal(food.cal.toString());
    setCustomPro(food.pro.toString());
    setCustomCarb(food.carb.toString());
    setCustomFat(food.fat.toString());
    setCustomBarcode(food.barcode || '');
    setShowCustomForm(true);
  };

  const calculateCaloriesFromMacros = () => {
    const pro = parseFloat(customPro) || 0;
    const carb = parseFloat(customCarb) || 0;
    const fat = parseFloat(customFat) || 0;
    const calculatedCal = (pro * 4) + (carb * 4) + (fat * 9);
    setCustomCal(calculatedCal.toFixed(0));
  };

  const clearCustomForm = () => {
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

  const handleSaveCustomFood = async () => {
    if (!customName.trim() || !customCal || !customPro || !customCarb || !customFat) return;

    const foodData = {
      name: customName.trim(),
      brand: customBrand.trim() || 'Casero',
      cal: parseFloat(customCal) || 0,
      pro: parseFloat(customPro) || 0,
      carb: parseFloat(customCarb) || 0,
      fat: parseFloat(customFat) || 0,
      base_g: 100,
    };

    if (editingFood) {
      const { data } = await supabase
        .from('foods')
        .update(foodData)
        .eq('id', editingFood.id)
        .select()
        .single();
      if (data) {
        setFoods(prev => prev.map(f => f.id === editingFood.id ? data : f));
        setSelectedFood(data);
      } else {
        setFoods(prev => prev.map(f => f.id === editingFood.id ? { ...f, ...foodData } : f));
      }
    } else {
      const newFood = {
        ...foodData,
        barcode: customBarcode || `custom_${Date.now()}`,
        portions: [{ name: "100g", grams: 100 }]
      };
      const { data } = await supabase
        .from('foods')
        .insert([newFood])
        .select()
        .single();
      const finalFood = data || newFood;
      setFoods(prev => [finalFood, ...prev]);
      handleSelectFood(finalFood);
      const cached = localStorage.getItem('foodsCache');
      if (cached) {
        const arr = JSON.parse(cached);
        arr.unshift(finalFood);
        localStorage.setItem('foodsCache', JSON.stringify(arr));
      }
    }

    clearCustomForm();
  };

  const calculateMacro = (baseValue) => {
    if (!selectedFood || !selectedPortion) return 0;
    return (baseValue / selectedFood.base_g) * selectedPortion.grams * quantity;
  };

  // ========== RENDERIZADO ==========
  return (
    <div className="flex-1 flex flex-col relative overflow-y-auto pb-32 no-scrollbar">
      {/* Luces de fondo estilizadas */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4FF00]/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#D4FF00]/5 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />

      <div className="relative z-10 p-4 space-y-5">
        {/* Cabecera */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-[#D4FF00] drop-shadow-[0_0_6px_rgba(212,255,0,0.6)]" />
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Alimentos
              <span className="inline-block w-2 h-2 rounded-full bg-[#D4FF00] shadow-[0_0_8px_rgba(212,255,0,0.8)]" />
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setEditingFood(null); setShowCustomForm(true); }}
              className="p-2.5 rounded-full bg-[#D4FF00]/10 border border-[#D4FF00]/30 text-[#D4FF00] hover:bg-[#D4FF00]/20 hover:shadow-[0_0_15px_rgba(212,255,0,0.3)] active:scale-90 transition-all"
              aria-label="Nuevo alimento"
            >
              <Plus size={18} />
            </button>
            <button
              onClick={() => setShowScanner(true)}
              className="p-2.5 rounded-full bg-[#D4FF00]/10 border border-[#D4FF00]/30 text-[#D4FF00] hover:bg-[#D4FF00]/20 hover:shadow-[0_0_15px_rgba(212,255,0,0.3)] active:scale-90 transition-all"
              aria-label="Escanear código de barras"
            >
              <Barcode size={18} />
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-3.5 text-stone-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar alimento o marca..."
            className="w-full bg-stone-900/60 backdrop-blur-md border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-stone-500 focus:border-[#D4FF00]/50 focus:ring-1 focus:ring-[#D4FF00]/50 focus:shadow-[0_0_12px_rgba(212,255,0,0.2)] outline-none transition-all shadow-md"
          />
        </div>

        {/* Indicador de carga */}
        {loading && (
          <div className="flex items-center justify-center py-6 text-stone-400 text-xs font-mono tracking-widest uppercase">
            Buscando alimentos...
          </div>
        )}

        {/* Listado de alimentos */}
        <div className="space-y-2">
          {foods.length === 0 && !loading ? (
            <p className="text-center text-stone-500 text-sm py-6">
              No hay alimentos disponibles. Prueba a crear uno nuevo.
            </p>
          ) : (
            foods.map(food => (
              <div key={food.id || food.barcode} className="relative w-full">
                <div
                  className={`w-full bg-stone-900/40 backdrop-blur-md border rounded-2xl p-4 flex items-center justify-between gap-4 transition-all ${
                    selectedFood?.id === food.id || selectedFood?.barcode === food.barcode
                      ? 'border-[#D4FF00]/60 bg-[#D4FF00]/5 shadow-[0_0_15px_rgba(212,255,0,0.2)]'
                      : 'border-white/[0.06] hover:border-[#D4FF00]/30 hover:shadow-[0_0_10px_rgba(212,255,0,0.1)]'
                  }`}
                >
                  <button
                    onClick={() => handleSelectFood(food)}
                    className="flex-1 text-left min-w-0 active:scale-[0.99] transition-transform"
                  >
                    <p className="text-white text-sm font-bold tracking-tight truncate pr-2">
                      {food.name}
                    </p>
                    <p className="text-[10px] text-stone-400 mt-1 font-mono truncate">
                      {food.brand && `${food.brand} · `}{food.cal} kcal | P: {food.pro}g | C: {food.carb}g | G: {food.fat}g
                    </p>
                    <p className="text-[10px] text-stone-500 font-mono mt-1">
                      {food.base_g}g
                    </p>
                  </button>
                  <div className="shrink-0">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleEditFood(food);
                      }}
                      className="p-2.5 rounded-xl bg-stone-950 border border-white/10 text-stone-400 hover:text-[#D4FF00] hover:border-[#D4FF00]/40 hover:shadow-[0_0_10px_rgba(212,255,0,0.2)] active:scale-95 transition-all flex items-center justify-center"
                      aria-label="Editar alimento"
                    >
                      <Edit3 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ========== MODAL NUEVO/EDITAR ALIMENTO ========== */}
      {showCustomForm && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-stone-900 border border-[#D4FF00]/20 rounded-3xl p-5 space-y-4 shadow-2xl shadow-[#D4FF00]/5 max-h-[95vh] overflow-y-auto overflow-x-hidden">
            <h3 className="text-white font-black text-base uppercase tracking-wider font-mono flex items-center gap-2">
              {editingFood ? '⚙️ Editar Alimento' : '✨ Nuevo Alimento (Base 100g)'}
              <span className="inline-block w-2 h-2 rounded-full bg-[#D4FF00] shadow-[0_0_8px_rgba(212,255,0,0.6)]" />
            </h3>

            <div className="space-y-3">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Nombre del alimento"
                className="w-full bg-stone-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#D4FF00]/50 focus:shadow-[0_0_10px_rgba(212,255,0,0.2)] outline-none transition-all"
              />
              <input
                type="text"
                value={customBrand}
                onChange={(e) => setCustomBrand(e.target.value)}
                placeholder="Marca (opcional)"
                className="w-full bg-stone-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#D4FF00]/50 focus:shadow-[0_0_10px_rgba(212,255,0,0.2)] outline-none transition-all"
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label className="text-[10px] text-stone-400 font-bold uppercase font-mono tracking-wider">Proteínas (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={customPro}
                    onChange={(e) => setCustomPro(e.target.value)}
                    className="w-full mt-1 bg-stone-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#D4FF00]/50 focus:shadow-[0_0_10px_rgba(212,255,0,0.2)] outline-none transition-all"
                  />
                </div>
                <div className="min-w-0">
                  <label className="text-[10px] text-stone-400 font-bold uppercase font-mono tracking-wider">Carbohidratos (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={customCarb}
                    onChange={(e) => setCustomCarb(e.target.value)}
                    className="w-full mt-1 bg-stone-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#D4FF00]/50 focus:shadow-[0_0_10px_rgba(212,255,0,0.2)] outline-none transition-all"
                  />
                </div>
                <div className="min-w-0">
                  <label className="text-[10px] text-stone-400 font-bold uppercase font-mono tracking-wider">Grasas (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={customFat}
                    onChange={(e) => setCustomFat(e.target.value)}
                    className="w-full mt-1 bg-stone-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#D4FF00]/50 focus:shadow-[0_0_10px_rgba(212,255,0,0.2)] outline-none transition-all"
                  />
                </div>
                <div className="min-w-0">
                  <label className="text-[10px] text-stone-400 font-bold uppercase font-mono tracking-wider">Calorías (kcal)</label>
                  <div className="flex gap-1.5 mt-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={customCal}
                      onChange={(e) => setCustomCal(e.target.value)}
                      className="flex-1 min-w-0 bg-stone-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#D4FF00]/50 focus:shadow-[0_0_10px_rgba(212,255,0,0.2)] outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={calculateCaloriesFromMacros}
                      className="px-3 bg-stone-950 border border-[#D4FF00]/30 text-[#D4FF00] rounded-xl hover:bg-[#D4FF00]/10 hover:shadow-[0_0_10px_rgba(212,255,0,0.2)] transition-all flex items-center justify-center"
                      title="Forzar auto-cálculo"
                    >
                      <Calculator size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {customBarcode && (
              <div className="text-[9px] font-mono text-stone-500 text-center bg-stone-950 p-2 rounded-lg border border-[#D4FF00]/20">
                EAN/CÓDIGO: {customBarcode}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSaveCustomFood}
                className="flex-1 bg-[#D4FF00] text-stone-950 font-black py-3 rounded-xl flex items-center justify-center gap-1.5 hover:bg-[#C4E600] hover:shadow-[0_0_15px_rgba(212,255,0,0.4)] active:scale-95 transition-all uppercase tracking-wider text-xs shadow-md shadow-[#D4FF00]/20"
              >
                <Save size={14} /> {editingFood ? 'Actualizar' : 'Guardar'}
              </button>
              <button
                onClick={clearCustomForm}
                className="px-5 py-3 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider text-stone-400 hover:text-white hover:border-[#D4FF00]/40 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escáner de código de barras */}
      {showScanner && (
        <BarcodeScanner onDetected={handleBarcode} onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
}