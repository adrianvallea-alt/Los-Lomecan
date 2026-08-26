// src/components/MealPlannerModal.jsx
import React, { useState, useMemo, memo } from 'react';
import ReactDOM from 'react-dom';
import { 
  X, Sparkles, Check, Plus, Zap, 
  ShieldCheck, RefreshCw
} from 'lucide-react';

const DAYS_OF_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const ROTATING_MENU_BANK = {
  1: [
    {
      meal: 'Desayuno',
      title: 'Huevos revueltos con Avena y Frutos Rojos',
      ingredients: [
        { name: 'Claras de huevo líquidas', baseGramsPer1000kcal: 80, cal100: 52, pro: 11, carb: 0.7, fat: 0.2 },
        { name: 'Huevo entero (1-2 piezas)', baseGramsPer1000kcal: 45, cal100: 143, pro: 13, carb: 0.7, fat: 9.5 },
        { name: 'Avena en hojuelas', baseGramsPer1000kcal: 35, cal100: 389, pro: 16.9, carb: 66, fat: 6.9 },
        { name: 'Fresas o arándanos frescos', baseGramsPer1000kcal: 40, cal100: 57, pro: 0.7, carb: 14, fat: 0.3 }
      ]
    },
    {
      meal: 'Comida',
      title: 'Pechuga de pollo con Arroz y Aguacate',
      ingredients: [
        { name: 'Pechuga de pollo a la plancha', baseGramsPer1000kcal: 85, cal100: 165, pro: 31, carb: 0, fat: 3.6 },
        { name: 'Arroz blanco cocido', baseGramsPer1000kcal: 95, cal100: 130, pro: 2.7, carb: 28, fat: 0.3 },
        { name: 'Aguacate Hass fresco', baseGramsPer1000kcal: 25, cal100: 160, pro: 2, carb: 9, fat: 15 },
        { name: 'Espinacas o ensalada verde', baseGramsPer1000kcal: 50, cal100: 23, pro: 2.9, carb: 3.6, fat: 0.4 }
      ]
    },
    {
      meal: 'Cena',
      title: 'Carne magra con Camote asado y Brócoli',
      ingredients: [
        { name: 'Carne magra de res / Ternera', baseGramsPer1000kcal: 75, cal100: 210, pro: 26, carb: 0, fat: 11 },
        { name: 'Camote al horno', baseGramsPer1000kcal: 90, cal100: 86, pro: 1.6, carb: 20, fat: 0.1 },
        { name: 'Brócoli al vapor', baseGramsPer1000kcal: 60, cal100: 34, pro: 2.8, carb: 7, fat: 0.4 },
        { name: 'Aceite de oliva virgen', baseGramsPer1000kcal: 5, cal100: 884, pro: 0, carb: 0, fat: 100 }
      ]
    },
    {
      meal: 'Snack',
      title: 'Yogur Griego con Proteína y Crema de Cacahuate',
      ingredients: [
        { name: 'Yogur griego natural 0% grasa', baseGramsPer1000kcal: 70, cal100: 59, pro: 10, carb: 3.6, fat: 0.4 },
        { name: 'Proteína en polvo (Whey/Iso)', baseGramsPer1000kcal: 12, cal100: 380, pro: 80, carb: 5, fat: 4 },
        { name: 'Crema de cacahuate natural', baseGramsPer1000kcal: 10, cal100: 588, pro: 25, carb: 20, fat: 50 }
      ]
    }
  ],
  2: [
    {
      meal: 'Desayuno',
      title: 'Licuado Power: Avena + Proteína + Plátano + Almendras',
      ingredients: [
        { name: 'Proteína aislada (Whey/Iso)', baseGramsPer1000kcal: 16, cal100: 380, pro: 80, carb: 5, fat: 4 },
        { name: 'Avena molida', baseGramsPer1000kcal: 40, cal100: 389, pro: 16.9, carb: 66, fat: 6.9 },
        { name: 'Plátano maduro', baseGramsPer1000kcal: 50, cal100: 89, pro: 1.1, carb: 23, fat: 0.3 },
        { name: 'Almendras naturales', baseGramsPer1000kcal: 10, cal100: 579, pro: 21, carb: 22, fat: 50 }
      ]
    },
    {
      meal: 'Comida',
      title: 'Pasta con Atún claro, Queso fresco y Tomate',
      ingredients: [
        { name: 'Atún en agua escurrido', baseGramsPer1000kcal: 80, cal100: 116, pro: 26, carb: 0, fat: 1 },
        { name: 'Pasta cocida al dente', baseGramsPer1000kcal: 90, cal100: 131, pro: 5, carb: 25, fat: 1.1 },
        { name: 'Queso fresco panela', baseGramsPer1000kcal: 30, cal100: 170, pro: 16, carb: 3, fat: 10 },
        { name: 'Aceite de oliva virgen extra', baseGramsPer1000kcal: 6, cal100: 884, pro: 0, carb: 0, fat: 100 }
      ]
    },
    {
      meal: 'Cena',
      title: 'Fajitas de Pavo salteadas con Arroz y Pimientos',
      ingredients: [
        { name: 'Pechuga de pavo en tiras', baseGramsPer1000kcal: 85, cal100: 135, pro: 30, carb: 0, fat: 1 },
        { name: 'Arroz blanco cocido', baseGramsPer1000kcal: 85, cal100: 130, pro: 2.7, carb: 28, fat: 0.3 },
        { name: 'Pimientos y cebolla salteados', baseGramsPer1000kcal: 50, cal100: 26, pro: 1, carb: 6, fat: 0.3 },
        { name: 'Aguacate Hass', baseGramsPer1000kcal: 20, cal100: 160, pro: 2, carb: 9, fat: 15 }
      ]
    },
    {
      meal: 'Snack',
      title: 'Queso Cottage con Manzana y Canela',
      ingredients: [
        { name: 'Queso cottage bajo en grasa', baseGramsPer1000kcal: 75, cal100: 98, pro: 11, carb: 3.4, fat: 4.3 },
        { name: 'Manzana picada en cubos', baseGramsPer1000kcal: 60, cal100: 52, pro: 0.3, carb: 14, fat: 0.2 },
        { name: 'Nueces en trozos', baseGramsPer1000kcal: 8, cal100: 654, pro: 15, carb: 14, fat: 65 }
      ]
    }
  ],
  3: [
    {
      meal: 'Desayuno',
      title: 'Tostadas de masa madre con Huevo y Aguacate',
      ingredients: [
        { name: 'Pan masa madre / integral', baseGramsPer1000kcal: 40, cal100: 250, pro: 9, carb: 49, fat: 2 },
        { name: 'Huevos enteros', baseGramsPer1000kcal: 50, cal100: 143, pro: 13, carb: 0.7, fat: 9.5 },
        { name: 'Claras de huevo líquidas', baseGramsPer1000kcal: 60, cal100: 52, pro: 11, carb: 0.7, fat: 0.2 },
        { name: 'Aguacate machacado', baseGramsPer1000kcal: 25, cal100: 160, pro: 2, carb: 9, fat: 15 }
      ]
    },
    {
      meal: 'Comida',
      title: 'Filete de Salmón con Quinoa y Espárragos',
      ingredients: [
        { name: 'Salmón fresco a la plancha', baseGramsPer1000kcal: 80, cal100: 208, pro: 20, carb: 0, fat: 13 },
        { name: 'Quinoa cocida', baseGramsPer1000kcal: 85, cal100: 120, pro: 4.4, carb: 21, fat: 1.9 },
        { name: 'Espárragos trigueros', baseGramsPer1000kcal: 60, cal100: 20, pro: 2.2, carb: 3.9, fat: 0.1 }
      ]
    },
    {
      meal: 'Cena',
      title: 'Pollo deshebrado con Papa cocida y Calabacitas',
      ingredients: [
        { name: 'Pechuga de pollo cocida', baseGramsPer1000kcal: 85, cal100: 165, pro: 31, carb: 0, fat: 3.6 },
        { name: 'Papa cocida al vapor', baseGramsPer1000kcal: 95, cal100: 87, pro: 1.9, carb: 20, fat: 0.1 },
        { name: 'Calabacita salteada', baseGramsPer1000kcal: 50, cal100: 17, pro: 1.2, carb: 3.1, fat: 0.3 },
        { name: 'Aceite de oliva virgen', baseGramsPer1000kcal: 5, cal100: 884, pro: 0, carb: 0, fat: 100 }
      ]
    },
    {
      meal: 'Snack',
      title: 'Pudding de Chía con Proteína y Arándanos',
      ingredients: [
        { name: 'Semillas de chía', baseGramsPer1000kcal: 15, cal100: 486, pro: 17, carb: 42, fat: 31 },
        { name: 'Proteína whey', baseGramsPer1000kcal: 12, cal100: 380, pro: 80, carb: 5, fat: 4 },
        { name: 'Frutos rojos mixtos', baseGramsPer1000kcal: 40, cal100: 57, pro: 0.7, carb: 14, fat: 0.3 }
      ]
    }
  ],
  4: [
    {
      meal: 'Desayuno',
      title: 'Omelette de Pavo con Tostadas horneadas y Fruta',
      ingredients: [
        { name: 'Huevos enteros', baseGramsPer1000kcal: 45, cal100: 143, pro: 13, carb: 0.7, fat: 9.5 },
        { name: 'Pechuga de pavo baja en sodio', baseGramsPer1000kcal: 40, cal100: 105, pro: 20, carb: 2, fat: 2 },
        { name: 'Tostadas horneadas de maíz', baseGramsPer1000kcal: 25, cal100: 360, pro: 8, carb: 74, fat: 4 },
        { name: 'Papaya o melón picado', baseGramsPer1000kcal: 60, cal100: 43, pro: 0.5, carb: 11, fat: 0.3 }
      ]
    },
    {
      meal: 'Comida',
      title: 'Lomo de Cerdo magro con Arroz y Champiñones',
      ingredients: [
        { name: 'Lomo de cerdo magro al horno', baseGramsPer1000kcal: 80, cal100: 145, pro: 28, carb: 0, fat: 3.5 },
        { name: 'Arroz blanco cocido', baseGramsPer1000kcal: 95, cal100: 130, pro: 2.7, carb: 28, fat: 0.3 },
        { name: 'Champiñones salteados', baseGramsPer1000kcal: 50, cal100: 22, pro: 3.1, carb: 3.3, fat: 0.3 },
        { name: 'Aceite de oliva virgen', baseGramsPer1000kcal: 5, cal100: 884, pro: 0, carb: 0, fat: 100 }
      ]
    },
    {
      meal: 'Cena',
      title: 'Ensalada tibia de Atún con Pasta y Aguacate',
      ingredients: [
        { name: 'Atún en agua escurrido', baseGramsPer1000kcal: 80, cal100: 116, pro: 26, carb: 0, fat: 1 },
        { name: 'Pasta cocida', baseGramsPer1000kcal: 80, cal100: 131, pro: 5, carb: 25, fat: 1.1 },
        { name: 'Aguacate Hass', baseGramsPer1000kcal: 25, cal100: 160, pro: 2, carb: 9, fat: 15 },
        { name: 'Tomate cherry y espinacas', baseGramsPer1000kcal: 50, cal100: 20, pro: 1, carb: 4, fat: 0.2 }
      ]
    },
    {
      meal: 'Snack',
      title: 'Yogur Griego con Nueces y Cacao puro',
      ingredients: [
        { name: 'Yogur griego 0%', baseGramsPer1000kcal: 75, cal100: 59, pro: 10, carb: 3.6, fat: 0.4 },
        { name: 'Nueces de castilla', baseGramsPer1000kcal: 10, cal100: 654, pro: 15, carb: 14, fat: 65 },
        { name: 'Cacao en polvo sin azúcar', baseGramsPer1000kcal: 5, cal100: 228, pro: 20, carb: 58, fat: 14 }
      ]
    }
  ],
  5: [
    {
      meal: 'Desayuno',
      title: 'Hotcakes Fit de Avena, Plátano y Proteína',
      ingredients: [
        { name: 'Avena molida en harina', baseGramsPer1000kcal: 35, cal100: 389, pro: 16.9, carb: 66, fat: 6.9 },
        { name: 'Proteína whey aislada', baseGramsPer1000kcal: 15, cal100: 380, pro: 80, carb: 5, fat: 4 },
        { name: 'Claras de huevo', baseGramsPer1000kcal: 50, cal100: 52, pro: 11, carb: 0.7, fat: 0.2 },
        { name: 'Plátano machacado', baseGramsPer1000kcal: 40, cal100: 89, pro: 1.1, carb: 23, fat: 0.3 }
      ]
    },
    {
      meal: 'Comida',
      title: 'Pechuga de Pollo al limón con Pasta y Vegetales',
      ingredients: [
        { name: 'Pechuga de pollo a la plancha', baseGramsPer1000kcal: 85, cal100: 165, pro: 31, carb: 0, fat: 3.6 },
        { name: 'Pasta cocida', baseGramsPer1000kcal: 90, cal100: 131, pro: 5, carb: 25, fat: 1.1 },
        { name: 'Aceite de oliva virgen', baseGramsPer1000kcal: 6, cal100: 884, pro: 0, carb: 0, fat: 100 },
        { name: 'Zanahorias y calabaza al vapor', baseGramsPer1000kcal: 50, cal100: 25, pro: 1, carb: 6, fat: 0.2 }
      ]
    },
    {
      meal: 'Cena',
      title: 'Filete de Pescado blanco con Camote y Espárragos',
      ingredients: [
        { name: 'Pescado blanco (Tilapia/Merluza)', baseGramsPer1000kcal: 90, cal100: 96, pro: 20, carb: 0, fat: 1.7 },
        { name: 'Camote al horno', baseGramsPer1000kcal: 90, cal100: 86, pro: 1.6, carb: 20, fat: 0.1 },
        { name: 'Aguacate Hass', baseGramsPer1000kcal: 25, cal100: 160, pro: 2, carb: 9, fat: 15 }
      ]
    },
    {
      meal: 'Snack',
      title: 'Batido de Proteína con Crema de Almendras',
      ingredients: [
        { name: 'Proteína aislada', baseGramsPer1000kcal: 15, cal100: 380, pro: 80, carb: 5, fat: 4 },
        { name: 'Crema de almendras natural', baseGramsPer1000kcal: 10, cal100: 614, pro: 21, carb: 19, fat: 55 }
      ]
    }
  ],
  6: [
    {
      meal: 'Desayuno',
      title: 'Huevos con Tortillas de maíz y Frijoles',
      ingredients: [
        { name: 'Huevos enteros', baseGramsPer1000kcal: 50, cal100: 143, pro: 13, carb: 0.7, fat: 9.5 },
        { name: 'Claras de huevo', baseGramsPer1000kcal: 50, cal100: 52, pro: 11, carb: 0.7, fat: 0.2 },
        { name: 'Tortillas de maíz', baseGramsPer1000kcal: 40, cal100: 218, pro: 5.7, carb: 45, fat: 2.8 },
        { name: 'Frijoles cocidos enteros', baseGramsPer1000kcal: 40, cal100: 91, pro: 6, carb: 16, fat: 0.5 }
      ]
    },
    {
      meal: 'Comida',
      title: 'Carne asada magra con Papa asada y Nopalitos',
      ingredients: [
        { name: 'Carne de res magra (Sirloin)', baseGramsPer1000kcal: 80, cal100: 200, pro: 27, carb: 0, fat: 10 },
        { name: 'Papa asada con piel', baseGramsPer1000kcal: 95, cal100: 87, pro: 1.9, carb: 20, fat: 0.1 },
        { name: 'Nopales asados', baseGramsPer1000kcal: 60, cal100: 16, pro: 1.4, carb: 3.3, fat: 0.2 },
        { name: 'Aguacate Hass', baseGramsPer1000kcal: 20, cal100: 160, pro: 2, carb: 9, fat: 15 }
      ]
    },
    {
      meal: 'Cena',
      title: 'Fajitas de Pollo con Tortillas y Verduras',
      ingredients: [
        { name: 'Pechuga de pollo cocida', baseGramsPer1000kcal: 85, cal100: 165, pro: 31, carb: 0, fat: 3.6 },
        { name: 'Tortillas de maíz', baseGramsPer1000kcal: 35, cal100: 218, pro: 5.7, carb: 45, fat: 2.8 },
        { name: 'Pico de gallo y lechuga', baseGramsPer1000kcal: 40, cal100: 20, pro: 1, carb: 4, fat: 0.2 }
      ]
    },
    {
      meal: 'Snack',
      title: 'Queso Cottage con Fresas y Almendras',
      ingredients: [
        { name: 'Queso cottage bajo en grasa', baseGramsPer1000kcal: 75, cal100: 98, pro: 11, carb: 3.4, fat: 4.3 },
        { name: 'Fresas rebanadas', baseGramsPer1000kcal: 50, cal100: 33, pro: 0.7, carb: 8, fat: 0.3 },
        { name: 'Almendras', baseGramsPer1000kcal: 8, cal100: 579, pro: 21, carb: 22, fat: 50 }
      ]
    }
  ],
  0: [
    {
      meal: 'Desayuno',
      title: 'Bowl de Yogur Griego con Avena, Chía y Frutos Rojos',
      ingredients: [
        { name: 'Yogur griego 0%', baseGramsPer1000kcal: 80, cal100: 59, pro: 10, carb: 3.6, fat: 0.4 },
        { name: 'Proteína whey en polvo', baseGramsPer1000kcal: 12, cal100: 380, pro: 80, carb: 5, fat: 4 },
        { name: 'Avena en hojuelas', baseGramsPer1000kcal: 30, cal100: 389, pro: 16.9, carb: 66, fat: 6.9 },
        { name: 'Semillas de chía', baseGramsPer1000kcal: 8, cal100: 486, pro: 17, carb: 42, fat: 31 },
        { name: 'Arándanos frescos', baseGramsPer1000kcal: 40, cal100: 57, pro: 0.7, carb: 14, fat: 0.3 }
      ]
    },
    {
      meal: 'Comida',
      title: 'Pechuga de Pavo con Camote y Ensalada mixta',
      ingredients: [
        { name: 'Pechuga de pavo al horno', baseGramsPer1000kcal: 85, cal100: 135, pro: 30, carb: 0, fat: 1 },
        { name: 'Camote horneado', baseGramsPer1000kcal: 95, cal100: 86, pro: 1.6, carb: 20, fat: 0.1 },
        { name: 'Aceite de oliva virgen extra', baseGramsPer1000kcal: 6, cal100: 884, pro: 0, carb: 0, fat: 100 },
        { name: 'Ensalada de espinacas y tomate', baseGramsPer1000kcal: 50, cal100: 20, pro: 1, carb: 4, fat: 0.2 }
      ]
    },
    {
      meal: 'Cena',
      title: 'Omelette de Claras con Champiñones y Arroz Integral',
      ingredients: [
        { name: 'Claras de huevo', baseGramsPer1000kcal: 75, cal100: 52, pro: 11, carb: 0.7, fat: 0.2 },
        { name: 'Huevo entero (1 pieza)', baseGramsPer1000kcal: 30, cal100: 143, pro: 13, carb: 0.7, fat: 9.5 },
        { name: 'Arroz integral cocido', baseGramsPer1000kcal: 75, cal100: 111, pro: 2.6, carb: 23, fat: 0.9 },
        { name: 'Champiñones salteados', baseGramsPer1000kcal: 40, cal100: 22, pro: 3.1, carb: 3.3, fat: 0.3 }
      ]
    },
    {
      meal: 'Snack',
      title: 'Manzana con Crema de Cacahuate y Proteína',
      ingredients: [
        { name: 'Manzana rebanada', baseGramsPer1000kcal: 60, cal100: 52, pro: 0.3, carb: 14, fat: 0.2 },
        { name: 'Crema de cacahuate natural', baseGramsPer1000kcal: 10, cal100: 588, pro: 25, carb: 20, fat: 50 },
        { name: 'Proteína aislada', baseGramsPer1000kcal: 10, cal100: 380, pro: 80, carb: 5, fat: 4 }
      ]
    }
  ]
};

export default memo(function MealPlannerModal({ goals, onApplyPlan, onAddSingleMeal, onClose }) {
  const currentDayIndex = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(currentDayIndex);
  const [shuffleKey, setShuffleKey] = useState(0);
  const [addedMeals, setAddedMeals] = useState({});

  const targetCal = goals?.cal || 2200;
  const scaleMultiplier = targetCal / 1000;

  const activeDayMeals = useMemo(() => {
    const rawMeals = ROTATING_MENU_BANK[selectedDay] || ROTATING_MENU_BANK[1];

    return rawMeals.map(meal => {
      let totalMealCal = 0;
      let totalMealPro = 0;
      let totalMealCarb = 0;
      let totalMealFat = 0;

      const calculatedIngredients = meal.ingredients.map(ing => {
        const exactGrams = Math.round(ing.baseGramsPer1000kcal * scaleMultiplier);
        const ratio = exactGrams / 100;
        const ingCal = Math.round(ing.cal100 * ratio);
        const ingPro = parseFloat((ing.pro * ratio).toFixed(1));
        const ingCarb = parseFloat((ing.carb * ratio).toFixed(1));
        const ingFat = parseFloat((ing.fat * ratio).toFixed(1));

        totalMealCal += ingCal;
        totalMealPro += ingPro;
        totalMealCarb += ingCarb;
        totalMealFat += ingFat;

        return {
          name: ing.name,
          grams: exactGrams,
          cal: ingCal,
          pro: ingPro,
          carb: ingCarb,
          fat: ingFat
        };
      });

      return {
        meal: meal.meal,
        title: meal.title,
        totals: {
          cal: totalMealCal,
          pro: parseFloat(totalMealPro.toFixed(1)),
          carb: parseFloat(totalMealCarb.toFixed(1)),
          fat: parseFloat(totalMealFat.toFixed(1))
        },
        ingredients: calculatedIngredients
      };
    });
  }, [selectedDay, scaleMultiplier, shuffleKey]);

  const handleShuffle = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(25); } catch {}
    }
    setSelectedDay(prev => (prev + 1) % 7);
    setShuffleKey(prev => prev + 1);
    setAddedMeals({});
  };

  const handleAddSingle = (mealObj, idx) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(30); } catch {}
    }

    let mealTypeKey = 'comida';
    if (idx === 0) mealTypeKey = 'desayuno';
    else if (idx === 1) mealTypeKey = 'comida';
    else if (idx === 2) mealTypeKey = 'cena';
    else mealTypeKey = 'snack';

    const foodItem = {
      name: mealObj.title,
      cal: mealObj.totals.cal,
      pro: mealObj.totals.pro,
      carb: mealObj.totals.carb,
      fat: mealObj.totals.fat,
      base_g: 100,
      mealType: mealTypeKey
    };

    onAddSingleMeal(foodItem, 100);
    setAddedMeals(prev => ({ ...prev, [idx]: true }));
  };

  const handleApplyAll = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([40, 30, 80]); } catch {}
    }

    const itemsToInject = activeDayMeals.map((mealObj, idx) => {
      let mealTypeKey = 'comida';
      if (idx === 0) mealTypeKey = 'desayuno';
      else if (idx === 1) mealTypeKey = 'comida';
      else if (idx === 2) mealTypeKey = 'cena';
      else mealTypeKey = 'snack';

      return {
        food: {
          name: mealObj.title,
          cal: mealObj.totals.cal,
          pro: mealObj.totals.pro,
          carb: mealObj.totals.carb,
          fat: mealObj.totals.fat,
          base_g: 100,
          mealType: mealTypeKey
        },
        grams: 100
      };
    });

    onApplyPlan(itemsToInject);
    onClose();
  };

  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 z-[140] bg-black/85 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full sm:max-w-lg bg-[#0C0C12] border border-white/[0.12] sm:rounded-[2.5rem] rounded-t-[2.5rem] flex flex-col max-h-[90dvh] shadow-2xl overflow-hidden animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-3 sm:hidden shrink-0" />

        {/* Cabecera */}
        <div className="px-6 pt-4 pb-3 flex items-start justify-between border-b border-white/[0.06] shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-[#D4FF00]" />
              <h2 className="text-base font-black text-white uppercase tracking-wider font-sans">
                Sugerencias del Día
              </h2>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
              Gramajes calculados para: <strong className="text-[#D4FF00]">{targetCal} kcal</strong>
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button 
              onClick={handleShuffle}
              className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#D4FF00] hover:bg-[#D4FF00]/10 flex items-center gap-1 text-xs font-bold transition-all active:scale-90"
              title="Ver platillos de otro día"
            >
              <RefreshCw size={13} />
              <span className="text-[10px] uppercase font-mono">Rotar</span>
            </button>

            <button onClick={onClose} className="p-2 rounded-full bg-white/[0.04] text-zinc-400 hover:text-white" aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Selector de Días */}
        <div className="px-6 py-2.5 bg-black/40 border-b border-white/[0.04] shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex gap-1.5 w-max">
            {DAYS_OF_WEEK.map((dayName, idx) => (
              <button
                key={dayName}
                onClick={() => {
                  setSelectedDay(idx);
                  setAddedMeals({});
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
                  selectedDay === idx
                    ? 'bg-[#D4FF00] text-[#09090B] shadow-[0_0_12px_rgba(212,255,0,0.35)] font-black'
                    : 'bg-white/[0.03] text-zinc-400 hover:text-white'
                }`}
              >
                {dayName}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Comidas */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 no-scrollbar">
          <div className="bg-[#D4FF00]/[0.02] border border-[#D4FF00]/25 rounded-2xl p-3 flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-300 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-[#D4FF00]" /> Menú: <strong>{DAYS_OF_WEEK[selectedDay]}</strong>
            </span>
            <span className="text-[#D4FF00] font-bold">Leucina &gt; 3g garantizada</span>
          </div>

          <div className="space-y-3.5">
            {activeDayMeals.map((mealObj, idx) => {
              const isAdded = addedMeals[idx];

              return (
                <div key={idx} className="bg-black/60 border border-white/[0.06] p-4 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#D4FF00] uppercase font-mono tracking-wider">
                      {mealObj.meal}
                    </span>
                    <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-2">
                      <span className="text-white font-bold">{mealObj.totals.cal} kcal</span>
                      <span>·</span>
                      <span className="text-blue-400 font-semibold">P:{mealObj.totals.pro}g</span>
                      <span className="text-purple-400 font-semibold">C:{mealObj.totals.carb}g</span>
                      <span className="text-amber-400 font-semibold">G:{mealObj.totals.fat}g</span>
                    </div>
                  </div>

                  <p className="text-xs font-bold text-white font-sans">{mealObj.title}</p>
                  
                  <div className="bg-white/[0.02] border border-white/[0.04] p-2.5 rounded-xl space-y-1.5">
                    <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider block">
                      Gramajes exactos a preparar:
                    </span>
                    {mealObj.ingredients.map((ing, iIdx) => (
                      <div key={iIdx} className="flex justify-between items-center text-[11px] font-mono">
                        <span className="text-zinc-300 truncate max-w-[200px]">{ing.name}</span>
                        <span className="text-[#D4FF00] font-bold shrink-0">{ing.grams}g</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => handleAddSingle(mealObj, idx)}
                      disabled={isAdded}
                      className={`px-3.5 py-2 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all ${
                        isAdded
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:text-white hover:border-[#D4FF00]/40'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check size={12} /> Añadido a tu día
                        </>
                      ) : (
                        <>
                          <Plus size={12} /> Añadir solo {mealObj.meal}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Botón Inferior */}
        <div 
          className="p-4 bg-[#0A0A0F] border-t border-white/[0.06] shrink-0" 
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <button
            onClick={handleApplyAll}
            className="w-full py-4 volt-button rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(212,255,0,0.35)] active:scale-95 font-mono"
          >
            <Zap size={16} />
            Cargar Menú Completo de {DAYS_OF_WEEK[selectedDay]}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
});