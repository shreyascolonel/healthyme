import express from 'express';
import db from '../db.js';

const router = express.Router();

// GET /api/settings
router.get('/', (req, res) => {
  try {
    const profile = db.prepare('SELECT * FROM user_profile WHERE id = 1').get();
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    let enabledMeals = ['breakfast', 'lunch', 'dinner', 'morning_snack', 'afternoon_snack', 'evening_snack'];
    try {
      if (profile.enabled_meals) {
        enabledMeals = JSON.parse(profile.enabled_meals);
      }
    } catch {}

    res.json({
      ...profile,
      enabled_meals: enabledMeals
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings
router.put('/', (req, res) => {
  try {
    const {
      calorie_target,
      calorie_target_min,
      calorie_target_max,
      carb_target_grams,
      fat_target_grams,
      protein_target_grams,
      carb_ratio_target,
      fat_ratio_target,
      protein_ratio_target,
      water_target_ml,
      weight_target_kg,
      enabled_meals
    } = req.body;

    const current = db.prepare('SELECT * FROM user_profile WHERE id = 1').get() || {};

    const updated = {
      calorie_target: calorie_target ?? current.calorie_target ?? 2138,
      calorie_target_min: calorie_target_min ?? current.calorie_target_min ?? 1924,
      calorie_target_max: calorie_target_max ?? current.calorie_target_max ?? 2351,
      carb_target_grams: carb_target_grams ?? current.carb_target_grams ?? 294,
      fat_target_grams: fat_target_grams ?? current.fat_target_grams ?? 59,
      protein_target_grams: protein_target_grams ?? current.protein_target_grams ?? 107,
      carb_ratio_target: carb_ratio_target ?? current.carb_ratio_target ?? 55,
      fat_ratio_target: fat_ratio_target ?? current.fat_ratio_target ?? 25,
      protein_ratio_target: protein_ratio_target ?? current.protein_ratio_target ?? 20,
      water_target_ml: water_target_ml ?? current.water_target_ml ?? 2500,
      weight_target_kg: weight_target_kg ?? current.weight_target_kg ?? 70.0,
      enabled_meals: enabled_meals ? JSON.stringify(enabled_meals) : current.enabled_meals
    };

    db.prepare(`
      UPDATE user_profile SET
        calorie_target = ?,
        calorie_target_min = ?,
        calorie_target_max = ?,
        carb_target_grams = ?,
        fat_target_grams = ?,
        protein_target_grams = ?,
        carb_ratio_target = ?,
        fat_ratio_target = ?,
        protein_ratio_target = ?,
        water_target_ml = ?,
        weight_target_kg = ?,
        enabled_meals = ?,
        updated_at = datetime('now')
      WHERE id = 1
    `).run(
      updated.calorie_target,
      updated.calorie_target_min,
      updated.calorie_target_max,
      updated.carb_target_grams,
      updated.fat_target_grams,
      updated.protein_target_grams,
      updated.carb_ratio_target,
      updated.fat_ratio_target,
      updated.protein_ratio_target,
      updated.water_target_ml,
      updated.weight_target_kg,
      updated.enabled_meals
    );

    const saved = db.prepare('SELECT * FROM user_profile WHERE id = 1').get();
    res.json({
      ...saved,
      enabled_meals: JSON.parse(saved.enabled_meals || '[]')
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
