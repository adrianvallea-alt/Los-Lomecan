const API_BASE = '/api/openfoodfacts'; // ahora usa el proxy

export async function searchFoods(query, page = 1) {
  // Filtra productos de México y pide respuesta en JSON
  const url = `${API_BASE}/api/v2/search?search_terms=${encodeURIComponent(query)}&page=${page}&page_size=20&json=1&countries_tags=mexico`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error de red');
  const data = await res.json();
  if (!data.products) return [];
  return data.products.map(p => ({
    barcode: p.code,
    name: p.product_name || 'Sin nombre',
    brand: p.brands || '',
    cal: p.nutriments?.['energy-kcal_100g'] || 0,
    pro: p.nutriments?.proteins_100g || 0,
    carb: p.nutriments?.carbohydrates_100g || 0,
    fat: p.nutriments?.fat_100g || 0,
    base_g: 100,
    image_url: p.image_url || null,
  }));
}

export async function getFoodByBarcode(barcode) {
  const url = `${API_BASE}/api/v2/product/${barcode}?json=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status === 0) return null;
  const p = data.product;
  return {
    barcode: p.code,
    name: p.product_name || 'Sin nombre',
    brand: p.brands || '',
    cal: p.nutriments?.['energy-kcal_100g'] || 0,
    pro: p.nutriments?.proteins_100g || 0,
    carb: p.nutriments?.carbohydrates_100g || 0,
    fat: p.nutriments?.fat_100g || 0,
    base_g: 100,
    image_url: p.image_url || null,
  };
}