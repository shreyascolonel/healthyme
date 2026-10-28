import express from 'express';
import db, { getUserProfile } from '../db.js';
import { optionalAuth } from '../authMiddleware.js';

const router = express.Router();
router.use(optionalAuth);

function getUserId(req) {
  if (req.user && req.user.id) return req.user.id;
  const v = db.prepare('SELECT id FROM users WHERE username = ?').get('vinutha');
  return v ? v.id : 1;
}

// GET /api/settings
router.get('/', (req, res) => {
  try {
    const userId = getUserId(req);
    const profile = getUserProfile(userId);

    let enabledMeals = ['breakfast', 'lunch', 'dinner', 'morning_snack', 'afternoon_snack', 'evening_snack'];
    try {
      if (profile.enabled_meals) {
        enabledMeals = JSON.parse(profile.enabled_meals);
      }
    } catch {}

    let reminderTimes = { breakfast: '08:30', lunch: '13:00', dinner: '20:00' };
    try {
      if (profile.meal_reminder_times) {
        reminderTimes = JSON.parse(profile.meal_reminder_times);
      }
    } catch {}

    res.json({
      ...profile,
      enabled_meals: enabledMeals,
      meal_reminder_times: reminderTimes
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings
router.put('/', (req, res) => {
  try {
    const userId = getUserId(req);
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
      enabled_meals,
      gender,
      age,
      height_cm,
      current_weight_kg,
      activity_level,
      goal_type,
      target_mode,
      notifications_enabled,
      meal_reminder_times,
      water_reminder_interval_mins
    } = req.body;

    const current = getUserProfile(userId);

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
      enabled_meals: enabled_meals ? JSON.stringify(enabled_meals) : current.enabled_meals,
      gender: gender ?? current.gender ?? 'female',
      age: age ?? current.age ?? 28,
      height_cm: height_cm ?? current.height_cm ?? 162.0,
      current_weight_kg: current_weight_kg ?? current.current_weight_kg ?? 68.0,
      activity_level: activity_level ?? current.activity_level ?? 'sedentary',
      goal_type: goal_type ?? current.goal_type ?? 'lose_standard',
      target_mode: target_mode ?? current.target_mode ?? 'auto',
      notifications_enabled: notifications_enabled !== undefined ? (notifications_enabled ? 1 : 0) : (current.notifications_enabled ?? 0),
      meal_reminder_times: meal_reminder_times ? (typeof meal_reminder_times === 'string' ? meal_reminder_times : JSON.stringify(meal_reminder_times)) : current.meal_reminder_times,
      water_reminder_interval_mins: water_reminder_interval_mins ?? current.water_reminder_interval_mins ?? 120
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
        gender = ?,
        age = ?,
        height_cm = ?,
        current_weight_kg = ?,
        activity_level = ?,
        goal_type = ?,
        target_mode = ?,
        notifications_enabled = ?,
        meal_reminder_times = ?,
        water_reminder_interval_mins = ?,
        updated_at = datetime('now')
      WHERE user_id = ?
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
      updated.enabled_meals,
      updated.gender,
      updated.age,
      updated.height_cm,
      updated.current_weight_kg,
      updated.activity_level,
      updated.goal_type,
      updated.target_mode,
      updated.notifications_enabled,
      updated.meal_reminder_times,
      updated.water_reminder_interval_mins,
      userId
    );

    // If current weight changed, log to weight_logs for today
    if (current_weight_kg && current_weight_kg > 0) {
      const today = new Date().toISOString().split('T')[0];
      const existingWeight = db.prepare('SELECT id FROM weight_logs WHERE user_id = ? AND date = ?').get(userId, today);
      if (existingWeight) {
        db.prepare('UPDATE weight_logs SET weight_kg = ? WHERE id = ?').run(current_weight_kg, existingWeight.id);
      } else {
        db.prepare('INSERT INTO weight_logs (user_id, date, weight_kg) VALUES (?, ?, ?)').run(userId, today, current_weight_kg);
      }
    }

    const saved = getUserProfile(userId);
    res.json({
      ...saved,
      enabled_meals: JSON.parse(saved.enabled_meals || '[]'),
      meal_reminder_times: JSON.parse(saved.meal_reminder_times || '{}')
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
