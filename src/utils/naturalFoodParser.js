// src/utils/naturalFoodParser.js

// Diccionario base de alimentos comunes y equivalencias estándar
const FOOD_DICTIONARY = [
  { keywords: ['huevo entero', 'huevos enteros', 'huevo', 'huevos'], name: 'Huevo entero', baseWeight: 50, cal100: 143, pro: 13, carb: 0.7, fat: 9.5 },
  { keywords: ['clara de huevo', 'claras de huevo', 'clara', 'claras'], name: 'Claras de huevo', baseWeight: 33, cal100: 52, pro: 11, carb: 0.7, fat: 0.2 },
  { keywords: ['pechuga de pollo', 'pollo a la plancha', 'pollo deshebrado', 'pollo'], name: 'Pechuga de pollo', baseWeight: 100, cal100: 165, pro: 31, carb: 0, fat: 3.6 },
  { keywords: ['carne de res', 'carne magra', 'ternera', 'bistec', 'sirloin', 'arrachera'], name: 'Carne magra de res', baseWeight: 100, cal100: 200, pro: 27, carb: 0, fat: 10 },
  { keywords: ['atun en agua', 'atún en agua', 'atun', 'atún', 'lata de atun', 'lata de atún'], name: 'Atún en agua escurrido', baseWeight: 100, cal100: 116, pro: 26, carb: 0, fat: 1 },
  { keywords: ['salmon', 'salmón'], name: 'Salmón fresco', baseWeight: 100, cal100: 208, pro: 20, carb: 0, fat: 13 },
  { keywords: ['arroz blanco', 'arroz cocido', 'arroz'], name: 'Arroz blanco cocido', baseWeight: 100, cal100: 130, pro: 2.7, carb: 28, fat: 0.3 },
  { keywords: ['arroz integral'], name: 'Arroz integral cocido', baseWeight: 100, cal100: 111, pro: 2.6, carb: 23, fat: 0.9 },
  { keywords: ['avena en hojuelas', 'avena molida', 'harina de avena', 'avena'], name: 'Avena en hojuelas', baseWeight: 40, cal100: 389, pro: 16.9, carb: 66, fat: 6.9 },
  { keywords: ['platano', 'plátano', 'banana', 'banano'], name: 'Plátano maduro', baseWeight: 100, cal100: 89, pro: 1.1, carb: 23, fat: 0.3 },
  { keywords: ['manzana'], name: 'Manzana fresca', baseWeight: 150, cal100: 52, pro: 0.3, carb: 14, fat: 0.2 },
  { keywords: ['fresas', 'frutos rojos', 'arandanos', 'arándanos'], name: 'Frutos rojos frescos', baseWeight: 100, cal100: 50, pro: 0.8, carb: 12, fat: 0.3 },
  { keywords: ['aguacate hass', 'aguacate', 'palta'], name: 'Aguacate Hass', baseWeight: 50, cal100: 160, pro: 2, carb: 9, fat: 15 },
  { keywords: ['aceite de oliva', 'aceite'], name: 'Aceite de oliva virgen', baseWeight: 10, cal100: 884, pro: 0, carb: 0, fat: 100 },
  { keywords: ['proteina en polvo', 'proteina whey', 'proteína whey', 'proteina', 'proteína', 'scoop de proteina'], name: 'Proteína en polvo (Whey/Iso)', baseWeight: 30, cal100: 380, pro: 80, carb: 5, fat: 4 },
  { keywords: ['crema de cacahuate', 'mantequilla de mani', 'crema de mani'], name: 'Crema de cacahuate natural', baseWeight: 15, cal100: 588, pro: 25, carb: 20, fat: 50 },
  { keywords: ['almendras', 'nueces'], name: 'Frutos secos (Almendras/Nueces)', baseWeight: 20, cal100: 600, pro: 20, carb: 20, fat: 52 },
  { keywords: ['yogur griego 0%', 'yogur griego', 'yogurt griego'], name: 'Yogur griego 0%', baseWeight: 125, cal100: 59, pro: 10, carb: 3.6, fat: 0.4 },
  { keywords: ['tortilla de maiz', 'tortillas de maiz', 'tortilla', 'tortillas'], name: 'Tortillas de maíz', baseWeight: 30, cal100: 218, pro: 5.7, carb: 45, fat: 2.8 },
  { keywords: ['papa cocida', 'papa asada', 'papa', 'patata'], name: 'Papa cocida', baseWeight: 150, cal100: 87, pro: 1.9, carb: 20, fat: 0.1 },
  { keywords: ['camote', 'batata'], name: 'Camote al horno', baseWeight: 150, cal100: 86, pro: 1.6, carb: 20, fat: 0.1 },
  { keywords: ['leche descremada', 'leche light', 'leche'], name: 'Leche descremada', baseWeight: 200, cal100: 42, pro: 3.4, carb: 5, fat: 1 }
];

export function parseNaturalLanguageMeal(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  // Separar por comas, saltos de línea, punto y coma o " y "
  const rawLines = rawText
    .replace(/\s+y\s+/gi, ', ')
    .split(/[\n,;]+/)
    .map(s => s.trim())
    .filter(s => s.length > 1);

  const results = [];

  for (const line of rawLines) {
    const cleanLine = line.toLowerCase();

    // 1. Extraer cantidad y unidad con Regex
    // Ejemplos: "200g", "200 g", "2 piezas", "2", "1/2", "1 scoop"
    const amountMatch = cleanLine.match(/(\d+(?:[.,]\d+)?|\d+\/\d+)\s*(g|gr|gramos|ml|piezas|pza|scoop|taza|cucharada)?/i);

    let parsedQuantity = 1;
    let explicitUnit = null;

    if (amountMatch) {
      const numStr = amountMatch[1].replace(',', '.');
      if (numStr.includes('/')) {
        const [num, den] = numStr.split('/');
        parsedQuantity = parseFloat(num) / parseFloat(den);
      } else {
        parsedQuantity = parseFloat(numStr) || 1;
      }
      explicitUnit = amountMatch[2]?.toLowerCase() || null;
    }

    // 2. Buscar el alimento en el diccionario
    let matchedFood = null;
    for (const food of FOOD_DICTIONARY) {
      if (food.keywords.some(kw => cleanLine.includes(kw))) {
        matchedFood = food;
        break;
      }
    }

    if (matchedFood) {
      let finalGrams = 100;

      if (explicitUnit === 'g' || explicitUnit === 'gr' || explicitUnit === 'gramos' || explicitUnit === 'ml') {
        finalGrams = Math.round(parsedQuantity);
      } else if (explicitUnit === 'cucharada') {
        finalGrams = Math.round(parsedQuantity * 15);
      } else if (explicitUnit === 'taza') {
        finalGrams = Math.round(parsedQuantity * 150);
      } else if (explicitUnit === 'scoop') {
        finalGrams = Math.round(parsedQuantity * 30);
      } else {
        // Asume cantidad de unidades multiplicada por el peso base (ej. "2 huevos" = 2 * 50g = 100g)
        finalGrams = Math.round(parsedQuantity * matchedFood.baseWeight);
      }

      const ratio = finalGrams / 100;
      results.push({
        id: `nlp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: matchedFood.name,
        grams: finalGrams,
        cal: Math.round(matchedFood.cal100 * ratio),
        pro: parseFloat((matchedFood.pro * ratio).toFixed(1)),
        carb: parseFloat((matchedFood.carb * ratio).toFixed(1)),
        fat: parseFloat((matchedFood.fat * ratio).toFixed(1)),
        base_g: 100
      });
    }
  }

  return results;
}