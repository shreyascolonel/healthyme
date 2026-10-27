import express from 'express';
import db from '../db.js';
import { searchOpenFoodFacts, getProductByBarcode } from '../openfoodfacts.js';

const router = express.Router();

// Search foods across local DB and OpenFoodFacts API
router.get('/search', async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    if (!query) {
      // Return top favorites and recent foods if query is empty
      const defaultFoods = db.prepare(`
        SELECT * FROM foods 
        ORDER BY is_favorite DESC, created_at DESC 
        LIMIT 25
      `).all();
      return res.json({ query: '', results: defaultFoods, source: 'local' });
    }

    // 1. Search local SQLite DB
    const searchPattern = `%${query}%`;
    const localFoods = db.prepare(`
      SELECT * FROM foods 
      WHERE name LIKE ? OR brand LIKE ? OR category LIKE ?
      ORDER BY is_favorite DESC, (name LIKE ?) DESC
      LIMIT 30
    `).all(searchPattern, searchPattern, searchPattern, `${query}%`);

    // 2. Search OpenFoodFacts API in parallel
    let offResults = [];
    try {
      offResults = await searchOpenFoodFacts(query);
    } catch (e) {
      console.warn('OpenFoodFacts search error:', e.message);
    }

    // 3. Merge results, local first, avoiding duplicates by ID or exact name
    const seenIds = new Set(localFoods.map(f => f.id));
    const seenNames = new Set(localFoods.map(f => f.name.toLowerCase().trim()));
    const combined = [...localFoods];

    for (const off of offResults) {
      if (!seenIds.has(off.id) && !seenNames.has(off.name.toLowerCase().trim())) {
        seenIds.add(off.id);
        seenNames.add(off.name.toLowerCase().trim());
        combined.push(off);
      }
    }

    res.json({
      query,
      results: combined,
      count: combined.length,
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
