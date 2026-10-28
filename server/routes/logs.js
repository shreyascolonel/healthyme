import express from 'express';
import db, { getUserProfile } from '../db.js';
import { optionalAuth } from '../authMiddleware.js';

const router = express.Router();
router.use(optionalAuth);

const MEAL_TYPES = [
  'breakfast',
  'lunch',
  'dinner',
  'morning_snack',
  'afternoon_snack',
  'evening_snack'
];

function getUserId(req) {
  if (req.user && req.user.is_admin && req.query.spectate_user_id) {
    const sId = parseInt(req.query.spectate_user_id, 10);
    if (!isNaN(sId) && sId > 0) return sId;
  }
  if (req.user && req.user.id) return req.user.id;
  const v = db.prepare('SELECT id FROM users WHERE username = ?').get('vinutha');
  return v ? v.id : 1;
}

// Helper to compute summary of meal logs
function calculateNutrientTotals(logs) {
  const totals = {
    calories: 0,
    carbs: 0,
    fat: 0,
    protein: 0,
    fiber: 0,
    sugar: 0,
    saturated_fat: 0,
    sodium: 0,
    potassium: 0,
    calcium: 0,
    iron: 0,
    vitamin_a: 0,
    vitamin_c: 0
  };

  for (const log of logs) {
    totals.calories += Number(log.calories || 0);
    totals.carbs += Number(log.carbs || 0);
    totals.fat += Number(log.fat || 0);
    totals.protein += Number(log.protein || 0);
    totals.fiber += Number(log.fiber || 0);
    totals.sugar += Number(log.sugar || 0);
    totals.saturated_fat += Number(log.saturated_fat || 0);
    totals.sodium += Number(log.sodium || 0);
    totals.potassium += Number(log.potassium || 0);
    totals.calcium += Number(log.calcium || 0);
    totals.iron += Number(log.iron || 0);
    totals.vitamin_a += Number(log.vitamin_a || 0);
    totals.vitamin_c += Number(log.vitamin_c || 0);
  }

  // Round values
  totals.calories = Math.round(totals.calories);
  totals.carbs = Number(totals.carbs.toFixed(1));
  totals.fat = Number(totals.fat.toFixed(1));
  totals.protein = Number(totals.protein.toFixed(1));
  totals.fiber = Number(totals.fiber.toFixed(1));
  totals.sugar = Number(totals.sugar.toFixed(1));
  totals.saturated_fat = Number(totals.saturated_fat.toFixed(1));
  totals.sodium = Number(totals.sodium.toFixed(1));
  totals.potassium = Number(totals.potassium.toFixed(1));
  totals.calcium = Number(totals.calcium.toFixed(1));
  totals.iron = Number(totals.iron.toFixed(1));
  totals.vitamin_a = Number(totals.vitamin_a.toFixed(1));
  totals.vitamin_c = Number(totals.vitamin_c.toFixed(1));

  // Compute macro percentages
  const carbKcal = totals.carbs * 4;
  const fatKcal = totals.fat * 9;
  const protKcal = totals.protein * 4;
  const macroTotalKcal = carbKcal + fatKcal + protKcal;

  let carbPct = 0;
  let fatPct = 0;
  let protPct = 0;

  if (macroTotalKcal > 0) {
    carbPct = Math.round((carbKcal / macroTotalKcal) * 100);
    fatPct = Math.round((fatKcal / macroTotalKcal) * 100);
    protPct = Math.max(0, 100 - carbPct - fatPct);
  }

  return {
    ...totals,
    macroPercentages: {
      carb: carbPct,
      fat: fatPct,
      protein: protPct
    }
  };
}

// GET /api/logs?date=YYYY-MM-DD
router.get('/', (req, res) => {
  try {
    const userId = getUserId(req);
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    // Fetch logs for this user and date
    const logs = db.prepare(`
      SELECT * FROM meal_logs 
      WHERE user_id = ? AND date = ? 
      ORDER BY logged_at ASC, id ASC
    `).all(userId, date);

    // Group logs by meal_type
    const meals = {};
    for (const type of MEAL_TYPES) {
      const mealLogs = logs.filter(l => l.meal_type === type);
      const totals = calculateNutrientTotals(mealLogs);
      
      const itemsSummary = mealLogs.map(l => l.food_name).join(', ');

      meals[type] = {
        meal_type: type,
        items: mealLogs,
        itemCount: mealLogs.length,
        summary: itemsSummary,
        totals
      };
    }

    // Daily overall totals
    const dailyTotals = calculateNutrientTotals(logs);

    // Fetch user target profile
    const profile = getUserProfile(userId);

    let enabledMeals = MEAL_TYPES;
    try {
      if (profile.enabled_meals) {
        enabledMeals = JSON.parse(profile.enabled_meals);
      }
    } catch {}

    res.json({
      date,
      profile,
      enabledMeals,
      dailyTotals,
      meals
    });
  } catch (err) {
    console.error('Error fetching logs:', err);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// POST /api/logs - Log an item
router.post('/', (req, res) => {
  try {
    const userId = getUserId(req);
    const {
      date,
      meal_type,
      food_id,
      food_name,
      quantity = 1.0,
      unit = 'serving',
      calories,
      carbs = 0,
      fat = 0,
      protein = 0,
      fiber = 0,
      sugar = 0,
      saturated_fat = 0,
      sodium = 0,
      potassium = 0,
      calcium = 0,
      iron = 0,
      vitamin_a = 0,
      vitamin_c = 0,
      image_url
    } = req.body;

    if (!date || !meal_type || !food_name || calories == null) {
      return res.status(400).json({ error: 'date, meal_type, food_name, and calories are required' });
    }

    const q = parseFloat(quantity) || 1.0;

    const result = db.prepare(`
      INSERT INTO meal_logs (
        user_id, date, meal_type, food_id, food_name, quantity, unit,
        calories, carbs, fat, protein, fiber, sugar, saturated_fat,
        sodium, potassium, calcium, iron, vitamin_a, vitamin_c, image_url
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?
      )
    `).run(
      userId,
      date,
      meal_type,
      food_id || null,
      food_name.trim(),
      q,
      unit,
      Math.round(Number(calories) * q),
      Number((Number(carbs) * q).toFixed(1)),
      Number((Number(fat) * q).toFixed(1)),
      Number((Number(protein) * q).toFixed(1)),
      Number((Number(fiber) * q).toFixed(1)),
      Number((Number(sugar) * q).toFixed(1)),
      Number((Number(saturated_fat) * q).toFixed(1)),
      Number((Number(sodium) * q).toFixed(1)),
      Number((Number(potassium) * q).toFixed(1)),
      Number((Number(calcium) * q).toFixed(1)),
      Number((Number(iron) * q).toFixed(1)),
      Number((Number(vitamin_a) * q).toFixed(1)),
      Number((Number(vitamin_c) * q).toFixed(1)),
      image_url || null
    );

    const created = db.prepare('SELECT * FROM meal_logs WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    console.error('Error logging food:', err);
    res.status(500).json({ error: 'Failed to log food' });
  }
});

// POST /api/logs/quick - Quick Add Calories
router.post('/quick', (req, res) => {
  try {
    const userId = getUserId(req);
    const {
      date,
      meal_type,
      name = 'Quick Calorie Add',
      calories,
      carbs = 0,
      fat = 0,
      protein = 0
    } = req.body;

    if (!date || !meal_type || calories == null) {
      return res.status(400).json({ error: 'date, meal_type and calories are required' });
    }

    const result = db.prepare(`
      INSERT INTO meal_logs (
        user_id, date, meal_type, food_id, food_name, quantity, unit,
        calories, carbs, fat, protein
      ) VALUES (
        ?, ?, ?, NULL, ?, 1, 'entry',
        ?, ?, ?, ?
      )
    `).run(
      userId,
      date,
      meal_type,
      name.trim() || 'Quick Calorie Add',
      Math.round(Number(calories)),
      Number(Number(carbs).toFixed(1)),
      Number(Number(fat).toFixed(1)),
      Number(Number(protein).toFixed(1))
    );

    const created = db.prepare('SELECT * FROM meal_logs WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/logs/:id - Update logged entry
router.put('/:id', (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { quantity, calories, carbs, fat, protein } = req.body;

    const existing = db.prepare('SELECT * FROM meal_logs WHERE id = ? AND user_id = ?').get(id, userId);
    if (!existing) {
      return res.status(404).json({ error: 'Log entry not found' });
    }

    const q = quantity != null ? parseFloat(quantity) : existing.quantity;
    const ratio = existing.quantity > 0 ? q / existing.quantity : 1;

    db.prepare(`
      UPDATE meal_logs SET
        quantity = ?,
        calories = ?,
        carbs = ?,
        fat = ?,
        protein = ?
      WHERE id = ? AND user_id = ?
    `).run(
      q,
      calories != null ? Math.round(Number(calories)) : Math.round(existing.calories * ratio),
      carbs != null ? Number(Number(carbs).toFixed(1)) : Number((existing.carbs * ratio).toFixed(1)),
      fat != null ? Number(Number(fat).toFixed(1)) : Number((existing.fat * ratio).toFixed(1)),
      protein != null ? Number(Number(protein).toFixed(1)) : Number((existing.protein * ratio).toFixed(1)),
      id,
      userId
    );

    const updated = db.prepare('SELECT * FROM meal_logs WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/logs/:id - Remove item
router.delete('/:id', (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    db.prepare('DELETE FROM meal_logs WHERE id = ? AND user_id = ?').run(id, userId);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
