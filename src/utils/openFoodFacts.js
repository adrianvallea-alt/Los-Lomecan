// src/utils/openFoodFacts.js

const API_BASE = 'https://world.openfoodfacts.org';

const HEADERS = {
  'User-Agent': 'LosLomecanFitnessApp/1.0 (https://github.com/adrianvallea-alt/Los-Lomecan)',
  'Accept': 'application/json',
};

/**
 * Busca alimentos por término en la base de datos de Open Food Facts.
 * @param {string} query - Término de búsqueda
 * @param {number} page - Número de página
 * @returns {Promise<Array>} Lista normalizada de alimentos
 */
export async function searchFoods(query, page = 1) {
  if (!query || !query.trim()) return [];

  const url = `${API_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(
    query.trim()
  )}&search_simple=1&action=process&json=1&page=${page}&page_size=25&tagtype_0=countries&tag_contains_0=contains&tag_0=mexico`;

  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    
    const data = await res.json();
    if (!data || !data.products) return [];

    return data.products
      .filter(p => p.product_name && p.product_name.trim() !== '')
      .map(p => {
        const nutriments = p.nutriments || {};
        const calories =
          nutriments['energy-kcal_100g'] ??
          nutriments['energy-kcal'] ??
          (nutriments['energy_100g'] ? Math.round(nutriments['energy_100g'] / 4.184) : 0);

        return {
          barcode: p.code || `off_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: p.product_name || 'Alimento sin nombre',
          brand: p.brands || 'Genérico',
          cal: Math.round(Number(calories) || 0),
          pro: parseFloat(Number(nutriments.proteins_100g || nutriments.proteins || 0).toFixed(1)),
          carb: parseFloat(Number(nutriments.carbohydrates_100g || nutriments.carbohydrates || 0).toFixed(1)),
          fat: parseFloat(Number(nutriments.fat_100g || nutriments.fat || 0).toFixed(1)),
          base_g: 100,
          image_url: p.image_url || p.image_front_small_url || null,
        };
      });
  } catch (err) {
    console.warn('⚠️ Error al consultar OpenFoodFacts:', err);
    return [];
  }
}

/**
 * Obtiene un alimento específico a través de su código de barras.
 * @param {string} barcode - Código de barras escaneado
 * @returns {Promise<Object|null>} Alimento normalizado o null
 */
export async function getFoodByBarcode(barcode) {
  if (!barcode) return null;

  const cleanBarcode = barcode.trim();
  const url = `${API_BASE}/api/v2/product/${encodeURIComponent(cleanBarcode)}?json=1`;

  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data || data.status === 0 || !data.product) return null;

    const p = data.product;
    const nutriments = p.nutriments || {};
    const calories =
      nutriments['energy-kcal_100g'] ??
      nutriments['energy-kcal'] ??
      (nutriments['energy_100g'] ? Math.round(nutriments['energy_100g'] / 4.184) : 0);

    return {
      barcode: p.code || cleanBarcode,
      name: p.product_name || 'Producto sin nombre',
      brand: p.brands || 'Genérico',
      cal: Math.round(Number(calories) || 0),
      pro: parseFloat(Number(nutriments.proteins_100g || nutriments.proteins || 0).toFixed(1)),
      carb: parseFloat(Number(nutriments.carbohydrates_100g || nutriments.carbohydrates || 0).toFixed(1)),
      fat: parseFloat(Number(nutriments.fat_100g || nutriments.fat || 0).toFixed(1)),
      base_g: 100,
      image_url: p.image_url || p.image_front_small_url || null,
    };
  } catch (err) {
    console.warn('⚠️ Error al buscar producto por código:', err);
    return null;
  }
}