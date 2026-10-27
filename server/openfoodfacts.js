import db from './db.js';

const USER_AGENT = 'HealthyMe - HealthApp - Version 1.0 (https://github.com/healthy-me)';
const TIMEOUT_MS = 4500;

/**
 * Normalizes OpenFoodFacts product JSON into our standard Food schema
 */
export function normalizeProduct(p) {
  if (!p || (!p.product_name && !p.product_name_en && !p.generic_name)) {
    return null;
  }

  const n = p.nutriments || {};
  
  // OpenFoodFacts energy is often in kJ or kcal per 100g
  let calories = 0;
  if (n['energy-kcal_100g'] != null) {
    calories = Number(n['energy-kcal_100g']);
  } else if (n['energy-kcal'] != null) {
    calories = Number(n['energy-kcal']);
  } else if (n['energy_100g'] != null) {
    calories = Math.round(Number(n['energy_100g']) / 4.184);
  }

  // Parse grams from serving size if present (e.g. "30 g", "1 cup (182 g)")
  let servingGrams = 100;
  const servingStr = p.serving_size || '100 g';
  const match = servingStr.match(/(\d+(?:\.\d+)?)\s*(?:g|ml|grams)/i);
  if (match) {
    servingGrams = parseFloat(match[1]) || 100;
  }

  // Minerals & vitamins in OFF are often in grams, so convert:
  // sodium: g -> mg (* 1000)
  // potassium: g -> mg (* 1000)
  // calcium: g -> mg (* 1000)
  // iron: g -> mg (* 1000)
  // vitamin-c: g -> mg (* 1000)
  // vitamin-a: g -> mcg (* 1,000,000)
  let sodiumMg = 0;
  if (n['sodium_100g'] != null) {
    sodiumMg = Number(n['sodium_100g']) * 1000;
  } else if (n['salt_100g'] != null) {
    sodiumMg = Number(n['salt_100g']) * 400; // 1g salt ~ 400mg sodium
  }

  const potassiumMg = n['potassium_100g'] != null ? Number(n['potassium_100g']) * 1000 : 0;
  const calciumMg = n['calcium_100g'] != null ? Number(n['calcium_100g']) * 1000 : 0;
  const ironMg = n['iron_100g'] != null ? Number(n['iron_100g']) * 1000 : 0;
  const vitC_Mg = n['vitamin-c_100g'] != null ? Number(n['vitamin-c_100g']) * 1000 : 0;
  const vitA_Mcg = n['vitamin-a_100g'] != null ? Number(n['vitamin-a_100g']) * 1000000 : 0;

  return {
    id: p.code ? `off_${p.code}` : `off_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    barcode: p.code || null,
    name: p.product_name || p.product_name_en || p.generic_name || 'Unnamed Food',
    brand: p.brands || '',
    category: p.categories_tags?.[0]?.replace(/^en:/, '').replace(/-/g, ' ') || 'Packaged Foods',
    serving_size: servingStr,
    serving_size_grams: servingGrams,
    serving_unit: 'g',
    calories: Math.max(0, Math.round(calories)),
    carbs: Math.max(0, Number((n['carbohydrates_100g'] ?? n['carbohydrates'] ?? 0).toFixed(1))),
    fat: Math.max(0, Number((n['fat_100g'] ?? n['fat'] ?? 0).toFixed(1))),
    protein: Math.max(0, Number((n['proteins_100g'] ?? n['proteins'] ?? 0).toFixed(1))),
    fiber: Math.max(0, Number((n['fiber_100g'] ?? n['fiber'] ?? 0).toFixed(1))),
    sugar: Math.max(0, Number((n['sugars_100g'] ?? n['sugars'] ?? 0).toFixed(1))),
    saturated_fat: Math.max(0, Number((n['saturated-fat_100g'] ?? n['saturated-fat'] ?? 0).toFixed(1))),
    sodium: Math.max(0, Number(sodiumMg.toFixed(1))),
    potassium: Math.max(0, Number(potassiumMg.toFixed(1))),
    calcium: Math.max(0, Number(calciumMg.toFixed(1))),
    iron: Math.max(0, Number(ironMg.toFixed(1))),
    vitamin_a: Math.max(0, Number(vitA_Mcg.toFixed(1))),
    vitamin_c: Math.max(0, Number(vitC_Mg.toFixed(1))),
    image_url: p.image_front_small_url || p.image_small_url || p.image_url || null,
    source: 'openfoodfacts'
  };
}

/**
 * Saves or caches normalized foods into the local SQLite database
 */
export function cacheFoods(foods) {
  if (!foods || foods.length === 0) return;
  const insert = db.prepare(`
    INSERT OR IGNORE INTO foods (
      id, name, brand, category, serving_size, serving_size_grams, serving_unit,
      calories, carbs, fat, protein, fiber, sugar, saturated_fat,
      sodium, potassium, calcium, iron, vitamin_a, vitamin_c, image_url, source, is_favorite, is_custom
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, 0, 0
    )
  `);

  for (const f of foods) {
    try {
      insert.run(
        f.id,
        f.name,
        f.brand || '',
        f.category || 'General',
        f.serving_size || '100 g',
        f.serving_size_grams || 100,
        f.serving_unit || 'g',
        f.calories || 0,
        f.carbs || 0,
        f.fat || 0,
        f.protein || 0,
        f.fiber || 0,
        f.sugar || 0,
        f.saturated_fat || 0,
        f.sodium || 0,
        f.potassium || 0,
        f.calcium || 0,
        f.iron || 0,
        f.vitamin_a || 0,
        f.vitamin_c || 0,
        f.image_url || null,
        f.source || 'openfoodfacts'
      );
    } catch {
      // Ignore duplicates
    }
  }
}

/**
 * Searches OpenFoodFacts API online
 */
export async function searchOpenFoodFacts(query) {
  if (!query || query.trim().length === 0) return [];
  
  const cleanQuery = query.trim();
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(cleanQuery)}&search_simple=1&action=process&json=1&page_size=20`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      }
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`OpenFoodFacts responded with status ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!data || !Array.isArray(data.products)) {
      return [];
    }

    const normalized = data.products
      .map(normalizeProduct)
      .filter(Boolean);

    // Cache the retrieved foods in SQLite
    cacheFoods(normalized);

    return normalized;
  } catch (err) {
    clearTimeout(timer);
    console.warn(`OpenFoodFacts fetch failed or timed out: ${err.message}`);
    return [];
  }
}

/**
 * Lookup by barcode from OpenFoodFacts
 */
export async function getProductByBarcode(barcode) {
  if (!barcode) return null;
  const cleanCode = barcode.trim();

  // First check if it's already in our local DB
  const local = db.prepare('SELECT * FROM foods WHERE id = ? OR id = ?').get(cleanCode, `off_${cleanCode}`);
  if (local) return local;

  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanCode)}.json`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      }
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 1 && data.product) {
      const normalized = normalizeProduct(data.product);
      if (normalized) {
        cacheFoods([normalized]);
        return normalized;
      }
    }
    return null;
  } catch (err) {
    clearTimeout(timer);
    console.warn(`OpenFoodFacts barcode lookup failed: ${err.message}`);
    return null;
  }
}
