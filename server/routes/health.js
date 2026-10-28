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

// GET /api/health?date=YYYY-MM-DD
router.get('/', (req, res) => {
  try {
    const userId = getUserId(req);
    const date = req.query.date || new Date().toISOString().split('T')[0];

    // Water logs for this user and date
    const waterRow = db.prepare(`
      SELECT COALESCE(SUM(amount_ml), 0) as total_ml 
      FROM water_logs 
      WHERE user_id = ? AND date = ?
    `).get(userId, date);

    // Latest weight log (up to or on this date) for this user
    const weightRow = db.prepare(`
      SELECT weight_kg, date, logged_at 
      FROM weight_logs 
      WHERE user_id = ? AND date <= ? 
      ORDER BY date DESC, logged_at DESC 
      LIMIT 1
    `).get(userId, date);

    const profile = getUserProfile(userId);

    res.json({
      date,
      water: {
        total_ml: waterRow.total_ml,
        target_ml: profile.water_target_ml || 2500,
        percentage: Math.min(100, Math.round((waterRow.total_ml / (profile.water_target_ml || 2500)) * 100))
      },
      weight: {
        current_kg: weightRow ? weightRow.weight_kg : (profile.weight_target_kg || 70.0),
        target_kg: profile.weight_target_kg || 70.0,
        date: weightRow ? weightRow.date : date
      }
    });
  } catch (err) {
    console.error('Error fetching health stats:', err);
    res.status(500).json({ error: 'Failed to fetch health stats' });
  }
});

// POST /api/health/water - Add water intake (+250ml glass, custom amount, or reset)
router.post('/water', (req, res) => {
  try {
    const userId = getUserId(req);
    const { date, amount_ml } = req.body;
    if (!date || amount_ml == null) {
      return res.status(400).json({ error: 'date and amount_ml are required' });
    }

    const amount = parseInt(amount_ml, 10);
    if (amount === 0) {
      // Clear water logs for this day
      db.prepare('DELETE FROM water_logs WHERE user_id = ? AND date = ?').run(userId, date);
    } else {
      db.prepare('INSERT INTO water_logs (user_id, date, amount_ml) VALUES (?, ?, ?)').run(userId, date, amount);
    }

    const totalRow = db.prepare('SELECT COALESCE(SUM(amount_ml), 0) as total_ml FROM water_logs WHERE user_id = ? AND date = ?').get(userId, date);
    res.json({ date, total_ml: totalRow.total_ml });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/health/weight - Log weight
router.post('/weight', (req, res) => {
  try {
    const userId = getUserId(req);
    const { date, weight_kg } = req.body;
    if (!date || weight_kg == null) {
      return res.status(400).json({ error: 'date and weight_kg are required' });
    }

    const weight = parseFloat(weight_kg);
    // Update or insert for this day and user
    const existing = db.prepare('SELECT id FROM weight_logs WHERE user_id = ? AND date = ?').get(userId, date);
    if (existing) {
      db.prepare('UPDATE weight_logs SET weight_kg = ?, logged_at = datetime("now") WHERE id = ?').run(weight, existing.id);
    } else {
      db.prepare('INSERT INTO weight_logs (user_id, date, weight_kg) VALUES (?, ?, ?)').run(userId, date, weight);
    }

    res.json({ date, weight_kg: weight });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
