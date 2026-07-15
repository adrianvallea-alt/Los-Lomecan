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

  // Carga inicial de alimentos
  useEffect(() => {
    const loadFoods = async () => {
      setLoading(true);
      const { data } = await supabase.from('foods').select('*').order('name').limit(200);
      setFoods(data || []);
      setLoading(false);
    };
    loadFoods();
  }, []);

  // Búsqueda reactiva (Debounce de 300ms)
  useEffect(() => {
    if (search.trim().length < 1) {
      const loadAll = async () => {
        setLoading(true);
        const { data } = await supabase.from('foods').select('*').order('name').limit(200);
        setFoods(data || []);
        setLoading(false);
      };
      loadAll();
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from('foods')
        .select('*')
        .ilike('name', `%${search}%`)
        .order('name')
        .limit(30);
      setFoods(data || []);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Auto-calcular calorías cuando cambian los macros en el formulario de creación/edición
  useEffect(() => {
    if (customPro || customCarb || customFat) {
      const pro = parseFloat(customPro) || 0;
      const carb = parseFloat(customCarb) || 0;
      const fat = parseFloat(customFat) || 0;
      const calculated = (pro * 4) + (carb * 4) + (fat * 9);
      setCustomCal(calculated > 0 ? calculated.toFixed(0) : '');
    }
  }, [customPro, customCarb, customFat]);

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
    const { data: cached } = await supabase.from('foods').select('*').eq('barcode', code).single();
    if (cached) {
      handleSelectFood(cached);
      setLoading(false);
      return;
    }
    try {
      const remote = await getFoodByBarcode(code);
      if (remote) {
        const { data: saved } = await supabase.from('foods').insert([remote]).select().single();
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
      const { data } = await supabase.from('foods').update(foodData).eq('id', editingFood.id).select().single();
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
      const { data } = await supabase.from('foods').insert([newFood]).select().single();
      const finalFood = data || newFood;
      setFoods(prev => [finalFood, ...prev]);
      handleSelectFood(finalFood);
    }

    clearCustomForm();
  };

  const calculateMacro = (baseValue) => {
    if (!selectedFood || !selectedPortion) return 0;
    return (baseValue / selectedFood.base_g) * selectedPortion.grams * quantity;
  };

  return (
    <div className="flex-1 flex flex-col relative overflow-y-auto pb-32">
      {/* Luces de Fondo Estilizadas */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-pastel-blue/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-pastel-green/5 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />

      <div className="relative z-10 p-4 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-[#d4ff00]" />
            <h2 className="text-xl font-bold text-white">Alimentos</h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => { setEditingFood(null); setShowCustomForm(true); }} 
              className="p-2.5 rounded-full bg-stone-900 border border-white/10 text-stone-400 hover:text-white active:scale-90 transition-transform"
            >
              <Plus size={18} />
            </button>
            <button 
              onClick={() => setShowScanner(true)} 
              className="p-2.5 rounded-full bg-stone-900 border border-white/10 text-stone-400 hover:text-white active:scale-90 transition-transform"
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
            className="w-full bg-stone-900/60 backdrop-blur-md border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-white focus:border-[#d4ff00] focus:ring-1 focus:ring-[#d4ff00] outline-none transition-all shadow-md"
          />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-6 text-stone-400 text-xs font-mono tracking-widest uppercase">
            Buscando alimentos...
          </div>
        )}

        {/* Listado de Alimentos */}
        <div className="space-y-2">
          {foods.map(food => (
            <div key={food.id || food.barcode} className="relative w-full">
              {/* Contenedor principal de la tarjeta */}
              <div
                className={`w-full bg-stone-900/40 backdrop-blur-md border rounded-2xl p-4 flex items-center justify-between gap-4 transition-all ${
                  selectedFood?.id === food.id || selectedFood?.barcode === food.barcode
                    ? 'border-[#d4ff00] bg-[#d4ff00]/5 shadow-md shadow-[#d4ff00]/5'
                    : 'border-white/[0.06]'
                }`}
              >
                {/* 1. Botón de Selección (Cubre el área de clic principal para abrir porciones) */}
                <button
                  onClick={() => handleSelectFood(food)}
                  className="flex-1 text-left min-w-0 active:scale-[0.99] transition-transform"
                >
                  <p className="text-white text-sm font-bold tracking-tight truncate pr-2">
                    {food.name}
                  </p>
                  
                  {/* Macros del alimento */}
                  <p className="text-[10px] text-stone-400 mt-1 font-mono truncate">
                    {food.brand && `${food.brand} · `}{food.cal} kcal | P: {food.pro}g | C: {food.carb}g | G: {food.fat}g
                  </p>

                  {/* Etiqueta de gramos de la porción base colocada abajo libre de interferencias */}
                  <p className="text-[10px] text-stone-500 font-mono mt-1">
                    {food.base_g}g
                  </p>
                </button>

                {/* 2. Botón de edición alineado independientemente en el flujo de la derecha */}
                <div className="shrink-0">
                  <button
                    onClick={(e) => { 
                      e.preventDefault();
                      e.stopPropagation(); 
                      handleEditFood(food); 
                    }}
                    className="p-2.5 rounded-xl bg-stone-950 border border-white/10 text-stone-400 hover:text-white hover:border-white/20 active:scale-95 transition-all shadow-lg flex items-center justify-center"
                    aria-label="Editar alimento"
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL: REGISTRAR PORCIÓN/CANTIDAD */}
      {selectedFood && selectedPortion && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full sm:max-w-md bg-stone-900 border border-white/10 rounded-[2rem] p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white font-black text-lg leading-tight">{selectedFood.name}</p>
                {selectedFood.brand && <p className="text-xs font-mono text-stone-400 mt-0.5">{selectedFood.brand}</p>}
              </div>
              <button 
                onClick={() => setSelectedFood(null)} 
                className="text-stone-400 hover:text-white p-1 bg-stone-950 rounded-full border border-white/5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-stone-400 font-bold tracking-wider uppercase font-mono">Unidad / Porción</label>
                <select 
                  value={JSON.stringify(selectedPortion)} 
                  onChange={(e) => setSelectedPortion(JSON.parse(e.target.value))}
                  className="w-full bg-stone-950 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-[#d4ff00] outline-none"
                >
                  {selectedFood.portions && selectedFood.portions.length > 0 ? (
                    selectedFood.portions.map((p, idx) => (
                      <option key={idx} value={JSON.stringify(p)}>
                        {p.name} ({p.grams}g)
                      </option>
                    ))
                  ) : (
                    <option value={JSON.stringify({ name: `Porción base`, grams: selectedFood.base_g })}>
                      Porción base ({selectedFood.base_g}g)
                    </option>
                  )}
                </select>
              </div>

              <div className="flex items-center justify-between bg-stone-950 border border-white/[0.04] p-3.5 rounded-xl">
                <span className="text-xs text-stone-300 font-bold font-mono uppercase tracking-wider">Cantidad</span>
                <input 
                  type="number" 
                  step="0.1"
                  min="0.1"
                  value={quantity} 
                  onChange={(e) => setQuantity(Math.max(0.1, parseFloat(e.target.value) || 0))} 
                  className="w-24 bg-stone-900 border border-white/10 rounded-lg p-2 text-center text-white text-sm font-bold focus:border-[#d4ff00] outline-none" 
                />
              </div>
            </div>

            <div className="text-right text-[10px] text-stone-400 font-mono tracking-wider">
              Total medido: <span className="text-[#d4ff00] font-bold">{(selectedPortion.grams * quantity).toFixed(0)}g</span>
            </div>

            {/* Panel de vista previa de macros */}
            <div className="bg-stone-950 border border-white/[0.03] rounded-2xl p-4 grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-mono">
              <div className="text-stone-400">Calorías</div>
              <div className="text-white font-bold text-right">{calculateMacro(selectedFood.cal).toFixed(0)} kcal</div>
              <div className="text-stone-400">Proteínas</div>
              <div className="text-white font-bold text-right">{calculateMacro(selectedFood.pro).toFixed(1)} g</div>
              <div className="text-stone-400">Carbohidratos</div>
              <div className="text-white font-bold text-right">{calculateMacro(selectedFood.carb).toFixed(1)} g</div>
              <div className="text-stone-400">Grasas</div>
              <div className="text-white font-bold text-right">{calculateMacro(selectedFood.fat).toFixed(1)} g</div>
            </div>

            <button 
              onClick={handleAdd} 
              className="w-full bg-[#d4ff00] text-stone-950 font-black py-3.5 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all uppercase tracking-widest text-xs"
            >
              <Plus size={14} strokeWidth={3} /> Añadir al día
            </button>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO / EDITAR ALIMENTO */}
      {showCustomForm && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full sm:max-w-md bg-stone-900 border border-white/10 rounded-[2rem] p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-white font-black text-base uppercase tracking-wider font-mono">
              {editingFood ? '⚙️ Editar Alimento' : '✨ Nuevo Alimento (Base 100g)'}
            </h3>
            
            <div className="space-y-3">
              <input 
                type="text" 
                value={customName} 
                onChange={(e) => setCustomName(e.target.value)} 
                placeholder="Nombre del alimento" 
                className="w-full bg-stone-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#d4ff00] outline-none" 
              />
              <input 
                type="text" 
                value={customBrand} 
                onChange={(e) => setCustomBrand(e.target.value)} 
                placeholder="Marca (opcional)" 
                className="w-full bg-stone-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#d4ff00] outline-none" 
              />
              
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[10px] text-stone-400 font-bold uppercase font-mono tracking-wider">Proteínas (g)</label>
                  <input type="number" step="0.1" value={customPro} onChange={(e) => setCustomPro(e.target.value)} className="w-full mt-1 bg-stone-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#d4ff00] outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 font-bold uppercase font-mono tracking-wider">Carbohidratos (g)</label>
                  <input type="number" step="0.1" value={customCarb} onChange={(e) => setCustomCarb(e.target.value)} className="w-full mt-1 bg-stone-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#d4ff00] outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 font-bold uppercase font-mono tracking-wider">Grasas (g)</label>
                  <input type="number" step="0.1" value={customFat} onChange={(e) => setCustomFat(e.target.value)} className="w-full mt-1 bg-stone-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#d4ff00] outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 font-bold uppercase font-mono tracking-wider">Calorías (kcal)</label>
                  <div className="flex gap-1.5 mt-1">
                    <input type="number" value={customCal} onChange={(e) => setCustomCal(e.target.value)} className="flex-1 bg-stone-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#d4ff00] outline-none" />
                    <button
                      type="button"
                      onClick={calculateCaloriesFromMacros}
                      className="px-3 bg-stone-950 border border-white/10 text-[#d4ff00] rounded-xl hover:bg-[#d4ff00]/10 transition-colors flex items-center justify-center"
                      title="Forzar auto-cálculo"
                    >
                      <Calculator size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {customBarcode && (
              <div className="text-[9px] font-mono text-stone-500 text-center bg-stone-950 p-2 rounded-lg border border-white/[0.02]">
                EAN/CÓDIGO: {customBarcode}
              </div>
            )}
            
            <div className="flex gap-3 pt-2">
              <button 
                onClick={handleSaveCustomFood} 
                className="flex-1 bg-[#d4ff00] text-stone-950 font-black py-3 rounded-xl flex items-center justify-center gap-1.5 hover:brightness-110 active:scale-95 transition-all uppercase tracking-wider text-xs"
              >
                <Save size={14} /> {editingFood ? 'Actualizar' : 'Guardar'}
              </button>
              <button 
                onClick={clearCustomForm} 
                className="px-5 py-3 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider text-stone-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showScanner && <BarcodeScanner onDetected={handleBarcode} onClose={() => setShowScanner(false)} />}
    </div>
  );
}