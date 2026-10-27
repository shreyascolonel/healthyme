import db from './db.js';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const TIMEOUT_MS = 5000;

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

// Estimate serving size in grams if only descriptive units (e.g., piece, cup, bowl, slice) are given
function estimateGrams(servingText, foodName) {
  const lowerServing = (servingText || '').toLowerCase();
  const lowerFood = (foodName || '').toLowerCase();

  // If explicit grams/ml are mentioned (e.g. "100 g", "40g", "150 ml")
  const gramMatch = lowerServing.match(/(\d+(?:\.\d+)?)\s*(?:g|grams)/);
  if (gramMatch) return parseFloat(gramMatch[1]);

  const mlMatch = lowerServing.match(/(\d+(?:\.\d+)?)\s*(?:ml)/);
  if (mlMatch) return parseFloat(mlMatch[1]);

  // Food specific typical single piece weights
  if (lowerFood.includes('idli') || lowerFood.includes('idly')) {
    const piecesMatch = lowerServing.match(/(\d+)\s*(?:piece|idli)/);
    const count = piecesMatch ? parseInt(piecesMatch[1], 10) : 1;
    return count * 40; // 1 idli ~ 40g
  }
  if (lowerFood.includes('dosa')) {
    return 80; // 1 standard plain dosa ~ 80g
  }
  if (lowerFood.includes('roti') || lowerFood.includes('chapati')) {
    return 40;
  }
  if (lowerFood.includes('egg')) {
    return 50;
  }
  if (lowerFood.includes('apple') || lowerFood.includes('banana')) {
    return 120;
  }
  if (lowerServing.includes('cup')) {
    return 200;
  }
  if (lowerServing.includes('bowl')) {
    return 220;
  }
  if (lowerServing.includes('slice')) {
    return 35;
  }
  if (lowerServing.includes('scoop')) {
    return 30;
  }

  return 100; // default standard reference weight
}

/**
 * Searches the web nutrition engine for actual prepared dishes, home-cooked items,
 * and cooked foods with real portion sizes (e.g. "1 piece Idli - 40 kcal").
 */
export async function searchWebNutrition(query) {
  if (!query || query.trim().length === 0) return [];

  const cleanQuery = query.trim();
  const searchUrl = `https://www.fatsecret.com/calories-nutrition/search?q=${encodeURIComponent(cleanQuery)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`Web nutrition scraper responded with status ${res.status}`);
      return [];
    }

    const html = await res.text();
    const results = [];

    // Parse result table rows: each item is inside <td class="borderBottom">
    const tdRegex = /<td class="borderBottom">([\s\S]*?)<\/td>/g;
    let tdMatch;

    while ((tdMatch = tdRegex.exec(html)) !== null) {
      const tdContent = tdMatch[1];

      // Name & URL link
      const nameMatch = tdContent.match(/<a class="prominent" href="([^"]+)">([^<]+)<\/a>/);
      if (!nameMatch) continue;

      const relativeUrl = nameMatch[1];
      const rawName = decodeHtmlEntities(nameMatch[2].trim());

      // Brand
      const brandMatch = tdContent.match(/<a class="brand" [^>]*>\(([^)]+)\)<\/a>/);
      const brand = brandMatch ? decodeHtmlEntities(brandMatch[1].trim()) : 'Home-cooked / Generic';

      // Nutrition text: "Per 1 piece - Calories: 40kcal | Fat: 0.19g | Carbs: 7.89g | Protein: 1.91g"
      const nutTextMatch = tdContent.match(/<div class="smallText[^"]*">([\s\S]*?)<\/div>/);
      if (!nutTextMatch) continue;

      const rawText = nutTextMatch[1]
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<[^>]+>/g, '')
        .trim();

      // Regex to capture: Per <Serving> - Calories: <Cal>kcal | Fat: <Fat>g | Carbs: <Carb>g | Protein: <Protein>g
      const perMatch = rawText.match(/Per\s+([^-\n\r]+)\s*-\s*Calories:\s*(\d+(?:\.\d+)?)kcal\s*\|\s*Fat:\s*(\d+(?:\.\d+)?)g\s*\|\s*Carbs:\s*(\d+(?:\.\d+)?)g\s*\|\s*Protein:\s*(\d+(?:\.\d+)?)g/i);

      if (perMatch) {
        const servingText = decodeHtmlEntities(perMatch[1].trim());
        const calories = Math.round(parseFloat(perMatch[2]));
        const fat = parseFloat(perMatch[3]);
        const carbs = parseFloat(perMatch[4]);
        const protein = parseFloat(perMatch[5]);

        const servingGrams = estimateGrams(servingText, rawName);
        const slugId = `web_${relativeUrl.replace(/^\/calories-nutrition\//, '').replace(/\//g, '_')}`;

        // Basic sensible fiber & micronutrient approximations based on carbs and calories if not provided
        const estimatedFiber = Math.max(0, Number((carbs * 0.1).toFixed(1)));
        const estimatedSugar = Math.max(0, Number((carbs * 0.12).toFixed(1)));
        const estimatedSodium = Math.round(calories * 0.8);

        results.push({
          id: slugId,
          name: rawName,
          brand,
          category: 'Cooked & Prepared Meals',
          serving_size: servingText,
          serving_size_grams: servingGrams,
          serving_unit: 'serving',
          calories,
          carbs,
          fat,
          protein,
          fiber: estimatedFiber,
          sugar: estimatedSugar,
          saturated_fat: Math.max(0, Number((fat * 0.25).toFixed(1))),
          sodium: estimatedSodium,
          potassium: Math.round(calories * 0.7),
          calcium: Math.round(calories * 0.4),
          iron: Number((calories * 0.005).toFixed(1)),
          vitamin_a: 0,
          vitamin_c: 0,
          source: 'web_scraper',
          is_favorite: 0,
          is_custom: 0
        });
      }
    }

    // Cache the scraped foods into local SQLite so repeat queries are instant and offline-ready!
    if (results.length > 0) {
      cacheScrapedFoods(results);
    }

    return results;
  } catch (err) {
    clearTimeout(timer);
    console.warn(`Web nutrition search error for "${query}":`, err.message);
    return [];
  }
}

/**
 * Saves scraped foods into SQLite foods table
 */
export function cacheScrapedFoods(foods) {
  if (!foods || foods.length === 0) return;

  const insert = db.prepare(`
    INSERT OR IGNORE INTO foods (
      id, name, brand, category, serving_size, serving_size_grams, serving_unit,
      calories, carbs, fat, protein, fiber, sugar, saturated_fat,
      sodium, potassium, calcium, iron, vitamin_a, vitamin_c, source, is_favorite, is_custom
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, 'web_scraper', 0, 0
    )
  `);

  for (const f of foods) {
    try {
      insert.run(
        f.id,
        f.name,
        f.brand || '',
        f.category || 'Cooked & Prepared Meals',
        f.serving_size || '1 serving',
        f.serving_size_grams || 100,
        f.serving_unit || 'serving',
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
        f.vitamin_c || 0
      );
    } catch {
      // Ignore duplicates
    }
  }
}
