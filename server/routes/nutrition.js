import express from 'express';
import db, { getUserProfile } from '../db.js';
import { optionalAuth } from '../authMiddleware.js';

const router = express.Router();
router.use(optionalAuth);

function getUserId(req) {
  if (req.user && req.user.is_admin && req.query.spectate_user_id) {
    const sId = parseInt(req.query.spectate_user_id, 10);
    if (!isNaN(sId) && sId > 0) return sId;
  }
  if (req.user && req.user.id) return req.user.id;
  const v = db.prepare('SELECT id FROM users WHERE username = ?').get('vinutha');
  return v ? v.id : 1;
}

// Reference Recommended Daily Allowances (RDA) & Healthy Thresholds
const NUTRIENT_STANDARDS = {
  protein: {
    name: 'Protein',
    unit: 'g',
    target: 107,
    minAdequate: 50,
    maxAdequate: 160,
    type: 'range' // low < 50, adequate 50-160, high > 160
  },
  fiber: {
    name: 'Fibre',
    unit: 'g',
    target: 38,
    minAdequate: 28,
    maxAdequate: 50,
    type: 'range'
  },
  vitamin_a: {
    name: 'Vitamin A',
    unit: 'mcg',
    target: 900,
    minAdequate: 700,
    maxAdequate: 3000,
    type: 'range'
  },
  vitamin_c: {
    name: 'Vitamin C',
    unit: 'mg',
    target: 90,
    minAdequate: 75,
    maxAdequate: 2000,
    type: 'range'
  },
  potassium: {
    name: 'Potassium',
    unit: 'mg',
    target: 3400,
    minAdequate: 2600,
    maxAdequate: 4700,
    type: 'range'
  },
  calcium: {
    name: 'Calcium',
    unit: 'mg',
    target: 1000,
    minAdequate: 1000,
    maxAdequate: 2500,
    type: 'range'
  },
  iron: {
    name: 'Iron',
    unit: 'mg',
    target: 18,
    minAdequate: 8,
    maxAdequate: 45,
    type: 'range'
  },
  saturated_fat: {
    name: 'Saturated Fat',
    unit: 'g',
    target: 20,
    minAdequate: 0,
    maxAdequate: 20, // Keep below maxAdequate
    type: 'limit' // low <= 15, adequate <= 20, high > 20
  },
  sodium: {
    name: 'Sodium',
    unit: 'mg',
    target: 2300,
    minAdequate: 500,
    maxAdequate: 2300,
    type: 'limit' // adequate <= 2300, high > 2300
  },
  sugar: {
    name: 'Sugar',
    unit: 'g',
    target: 50,
    minAdequate: 0,
    maxAdequate: 50,
    type: 'limit' // adequate <= 50, high > 50 (Orange in screenshot!)
  },
  carbs: {
    name: 'Carbohydrates',
    unit: 'g',
    target: 294,
    minAdequate: 130,
    maxAdequate: 350,
    type: 'range'
  },
  fat: {
    name: 'Fat',
    unit: 'g',
    target: 59,
    minAdequate: 40,
    maxAdequate: 78,
    type: 'range'
  }
};

// GET /api/nutrition?date=YYYY-MM-DD
router.get('/', (req, res) => {
  try {
    const userId = getUserId(req);
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    // Fetch logs for user and date
    const logs = db.prepare(`
      SELECT * FROM meal_logs 
      WHERE user_id = ? AND date = ? 
      ORDER BY logged_at ASC
    `).all(userId, date);

    // Fetch user profile targets
    const profile = getUserProfile(userId);
    if (profile.protein_target_grams) NUTRIENT_STANDARDS.protein.target = profile.protein_target_grams;
    if (profile.carb_target_grams) NUTRIENT_STANDARDS.carbs.target = profile.carb_target_grams;
    if (profile.fat_target_grams) NUTRIENT_STANDARDS.fat.target = profile.fat_target_grams;

    const nutrientKeys = [
      'protein',
      'fiber',
      'vitamin_a',
      'vitamin_c',
      'potassium',
      'calcium',
      'iron',
      'saturated_fat',
      'sodium',
      'sugar'
    ];

    const breakdown = nutrientKeys.map(key => {
      const config = NUTRIENT_STANDARDS[key];
      let totalAmount = 0;
      const contributions = [];

      for (const log of logs) {
        const val = Number(log[key] || 0);
        if (val > 0) {
          totalAmount += val;
          contributions.push({
            food_name: log.food_name,
            amount: Number(val.toFixed(1)),
            unit: config.unit
          });
        }
      }

      // Sort contributions to get Top 3
      contributions.sort((a, b) => b.amount - a.amount);
      const top3 = contributions.slice(0, 3);

      totalAmount = Number(totalAmount.toFixed(1));

      // Determine Status: 'low' | 'adequate' | 'high'
      let status = 'adequate';
      let progressPercent = 0;

      if (config.type === 'limit') {
        if (totalAmount <= config.maxAdequate) {
          status = 'adequate'; // green
        } else {
          status = 'high'; // orange / red alert
        }
        progressPercent = Math.min(100, Math.round((totalAmount / (config.maxAdequate * 1.3)) * 100));
      } else {
        if (totalAmount < config.minAdequate) {
          status = 'low';
        } else if (totalAmount <= config.maxAdequate) {
          status = 'adequate';
        } else {
          status = 'high';
        }
        progressPercent = Math.min(100, Math.round((totalAmount / config.maxAdequate) * 100));
      }

      return {
        key,
        name: config.name,
        unit: config.unit,
        amount: totalAmount,
        target: config.target,
        minAdequate: config.minAdequate,
        maxAdequate: config.maxAdequate,
        status, // 'low', 'adequate', 'high'
        progressPercent,
        topFoods: top3
      };
    });

    res.json({
      date,
      nutrients: breakdown
    });
  } catch (err) {
    console.error('Error calculating nutrition breakdown:', err);
    res.status(500).json({ error: 'Failed to calculate nutrition breakdown' });
  }
});

export default router;
