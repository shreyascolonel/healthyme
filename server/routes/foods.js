import express from 'express';
import db from '../db.js';
import { searchOpenFoodFacts, getProductByBarcode } from '../openfoodfacts.js';
import { searchWebNutrition } from '../nutritionScraper.js';

const router = express.Router();

// Helper to expand common spelling variations (e.g. idly <-> idli)
function getQueryVariants(q) {
  const clean = q.trim().toLowerCase();
  const variants = [clean];

  if (clean === 'idly') variants.push('idli');
  if (clean === 'idli') variants.push('idly');
  if (clean === 'dosa') variants.push('dosai');
  if (clean === 'dosai') variants.push('dosa');
  if (clean === 'chapati' || clean === 'chapatti') variants.push('roti');
  if (clean === 'roti') variants.push('chapati');

  return variants;
}

// Search foods across: Local DB + Web Scraper (Cooked Meals / Real Dishes) + OpenFoodFacts
router.get('/search', async (req, res) => {
  try {
    const rawQuery = (req.query.q || '').trim();
    if (!rawQuery) {
      // Return top favorites and recent foods if query is empty
      const defaultFoods = db.prepare(`
        SELECT * FROM foods 
        ORDER BY is_favorite DESC, created_at DESC 
        LIMIT 25
      `).all();
      return res.json({ query: '', results: defaultFoods, source: 'local' });
    }

    const queryVariants = getQueryVariants(rawQuery);
    const primaryQuery = queryVariants[0];

    // 1. Search local SQLite DB with query variants
    let localFoods = [];
    for (const v of queryVariants) {
      const searchPattern = `%${v}%`;
      const matches = db.prepare(`
        SELECT * FROM foods 
        WHERE name LIKE ? OR brand LIKE ? OR category LIKE ?
        ORDER BY is_favorite DESC, (name LIKE ?) DESC
        LIMIT 30
      `).all(searchPattern, searchPattern, searchPattern, `${v}%`);
      localFoods.push(...matches);
    }

    // Deduplicate local foods
    const uniqueLocal = [];
    const localSeen = new Set();
    for (const f of localFoods) {
      if (!localSeen.has(f.id)) {
        localSeen.add(f.id);
        uniqueLocal.push(f);
      }
    }

    // 2. Run Web Scraper and OpenFoodFacts in parallel
    const [scrapedResults, offResults] = await Promise.all([
      searchWebNutrition(primaryQuery).catch(e => {
        console.warn('Scraper error:', e.message);
        return [];
      }),
      searchOpenFoodFacts(primaryQuery).catch(e => {
        console.warn('OpenFoodFacts search error:', e.message);
        return [];
      })
    ]);

    // 3. Intelligent Ranking:
    // Prioritize actual prepared foods (scraped and local favorites/staples)
    // over raw packaged batters or ingredient flour mixes.
    const combined = [];
    const seenSignatures = new Set();
    const isExplicitBatter = primaryQuery.includes('batter') || primaryQuery.includes('mix');

    const addFood = (f) => {
      const sig = `${f.name.toLowerCase().trim()}__${(f.brand || '').toLowerCase().trim()}`;
      if (!seenSignatures.has(sig)) {
        seenSignatures.add(sig);
        combined.push(f);
      }
    };

    // First: Scraped real cooked meals & prepared dishes (e.g. "Idli - 40 kcal, 1 piece")
    for (const s of scrapedResults) {
      const isBatter = s.name.toLowerCase().includes('batter') || s.name.toLowerCase().includes('mix');
      if (!isBatter || isExplicitBatter) {
        addFood(s);
      }
    }

    // Second: Local favorites or exact staple matches
    for (const f of uniqueLocal) {
      const isBatter = f.name.toLowerCase().includes('batter') || f.name.toLowerCase().includes('mix');
      if (!isBatter || isExplicitBatter) {
        if (f.is_favorite || f.name.toLowerCase().includes(primaryQuery)) {
          addFood(f);
        }
      }
    }

    // Third: Remaining cooked items
    for (const s of scrapedResults) {
      addFood(s);
    }

    // Fourth: Packaged goods from OpenFoodFacts & local cache
    for (const f of uniqueLocal) {
      addFood(f);
    }
    for (const off of offResults) {
      addFood(off);
    }

    res.json({
      query: rawQuery,
      results: combined,
      count: combined.length,
      hasScrapedResults: scrapedResults.length > 0,
      hasOnlineResults: offResults.length > 0
    });
  } catch (err) {
    console.error('Error searching foods:', err);
    res.status(500).json({ error: 'Failed to search foods' });
  }
});

// Get user favorite foods
router.get('/favorites', (req, res) => {
  try {
    const favorites = db.prepare('SELECT * FROM foods WHERE is_favorite = 1 ORDER BY name ASC').all();
    res.json(favorites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle food favorite
router.post('/favorite/:id', (req, res) => {
  try {
    const { id } = req.params;
    const food = db.prepare('SELECT is_favorite FROM foods WHERE id = ?').get(id);
    if (!food) {
      return res.status(404).json({ error: 'Food not found' });
    }

    const newFav = food.is_favorite === 1 ? 0 : 1;
    db.prepare('UPDATE foods SET is_favorite = ? WHERE id = ?').run(newFav, id);
    res.json({ id, is_favorite: newFav });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user custom foods ("My foods")
router.get('/custom', (req, res) => {
  try {
    const customFoods = db.prepare('SELECT * FROM foods WHERE is_custom = 1 ORDER BY created_at DESC').all();
    res.json(customFoods);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new custom food
router.post('/custom', (req, res) => {
  try {
    const {
      name, brand, category, serving_size, serving_size_grams, serving_unit,
      calories, carbs, fat, protein, fiber, sugar, saturated_fat,
      sodium, potassium, calcium, iron, vitamin_a, vitamin_c, image_url
    } = req.body;

    if (!name || calories == null) {
      return res.status(400).json({ error: 'Name and calories are required' });
    }

    const id = `custom_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    db.prepare(`
      INSERT INTO foods (
        id, name, brand, category, serving_size, serving_size_grams, serving_unit,
        calories, carbs, fat, protein, fiber, sugar, saturated_fat,
        sodium, potassium, calcium, iron, vitamin_a, vitamin_c, image_url, source, is_favorite, is_custom
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, 'custom', 0, 1
      )
    `).run(
      id,
      name.trim(),
      (brand || '').trim(),
      (category || 'Custom').trim(),
      serving_size || `${serving_size_grams || 100} ${serving_unit || 'g'}`,
      parseFloat(serving_size_grams) || 100,
      serving_unit || 'g',
      parseFloat(calories) || 0,
      parseFloat(carbs) || 0,
      parseFloat(fat) || 0,
      parseFloat(protein) || 0,
      parseFloat(fiber) || 0,
      parseFloat(sugar) || 0,
      parseFloat(saturated_fat) || 0,
      parseFloat(sodium) || 0,
      parseFloat(potassium) || 0,
      parseFloat(calcium) || 0,
      parseFloat(iron) || 0,
      parseFloat(vitamin_a) || 0,
      parseFloat(vitamin_c) || 0,
      image_url || null
    );

    const created = db.prepare('SELECT * FROM foods WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err) {
    console.error('Error creating custom food:', err);
    res.status(500).json({ error: 'Failed to create food' });
  }
});

// Barcode lookup
router.get('/barcode/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const food = await getProductByBarcode(code);
    if (!food) {
      return res.status(404).json({ error: 'Product not found for barcode ' + code });
    }
    res.json(food);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
