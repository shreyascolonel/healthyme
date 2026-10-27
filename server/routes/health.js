import express from 'express';
import db from '../db.js';

const router = express.Router();

// GET /api/health?date=YYYY-MM-DD
router.get('/', (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];

    // Water logs for this date
    const waterRow = db.prepare(`
      SELECT COALESCE(SUM(amount_ml), 0) as total_ml 
      FROM water_logs 
      WHERE date = ?
    `).get(date);

    // Latest weight log (up to or on this date)
    const weightRow = db.prepare(`
      SELECT weight_kg, date, logged_at 
      FROM weight_logs 
      WHERE date <= ? 
      ORDER BY date DESC, logged_at DESC 
      LIMIT 1
    `).get(date);

    const profile = db.prepare('SELECT water_target_ml, weight_target_kg FROM user_profile WHERE id = 1').get() || {
      water_target_ml: 2500,
      weight_target_kg: 70.0
    };

    res.json({
      date,
      water: {
        total_ml: waterRow.total_ml,
        target_ml: profile.water_target_ml,
        percentage: Math.min(100, Math.round((waterRow.total_ml / profile.water_target_ml) * 100))
      },
      weight: {
        current_kg: weightRow ? weightRow.weight_kg : 68.5,
        target_kg: profile.weight_target_kg,
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
    const { date, amount_ml } = req.body;
    if (!date || amount_ml == null) {
      return res.status(400).json({ error: 'date and amount_ml are required' });
    }

    const amount = parseInt(amount_ml, 10);
    if (amount === 0) {
      // Clear water logs for this day
      db.prepare('DELETE FROM water_logs WHERE date = ?').run(date);
    } else {
      db.prepare('INSERT INTO water_logs (date, amount_ml) VALUES (?, ?)').run(date, amount);
    }

    const totalRow = db.prepare('SELECT COALESCE(SUM(amount_ml), 0) as total_ml FROM water_logs WHERE date = ?').get(date);
    res.json({ date, total_ml: totalRow.total_ml });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/health/weight - Log weight
router.post('/weight', (req, res) => {
  try {
    const { date, weight_kg } = req.body;
    if (!date || weight_kg == null) {
      return res.status(400).json({ error: 'date and weight_kg are required' });
    }

    const weight = parseFloat(weight_kg);
    // Update or insert for this day
    const existing = db.prepare('SELECT id FROM weight_logs WHERE date = ?').get(date);
    if (existing) {
      db.prepare('UPDATE weight_logs SET weight_kg = ?, logged_at = datetime("now") WHERE id = ?').run(weight, existing.id);
    } else {
      db.prepare('INSERT INTO weight_logs (date, weight_kg) VALUES (?, ?)').run(date, weight);
    }

    res.json({ date, weight_kg: weight });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
