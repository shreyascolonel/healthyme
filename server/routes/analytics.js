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

function shiftDate(dateStr, offsetDays) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + offsetDays);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// GET /api/analytics/trends?period=days|weeks|months&date=YYYY-MM-DD
router.get('/trends', (req, res) => {
  try {
    const userId = getUserId(req);
    const period = req.query.period || 'days';
    const referenceDate = req.query.date || new Date().toISOString().split('T')[0];

    const daysCount = period === 'months' ? 30 : period === 'weeks' ? 14 : 7;

    // Collect daily stats for the timeframe
    const dailyStats = [];
    let totalCalories = 0;
    let daysWithLogs = 0;

    const mealSums = {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      morning_snack: 0,
      afternoon_snack: 0,
      evening_snack: 0
    };

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = shiftDate(referenceDate, -i);
      const [year, mon, dayNum] = d.split('-').map(Number);
      const dayName = new Date(year, mon - 1, dayNum).toLocaleDateString('en-US', { weekday: 'short' });

      const logs = db.prepare('SELECT * FROM meal_logs WHERE user_id = ? AND date = ?').all(userId, d);
      
      let dayCal = 0;
      let dayCarb = 0;
      let dayFat = 0;
      let dayProt = 0;

      const dayMeals = {
        breakfast: 0,
        lunch: 0,
        dinner: 0,
        morning_snack: 0,
        afternoon_snack: 0,
        evening_snack: 0
      };

      for (const log of logs) {
        dayCal += Number(log.calories || 0);
        dayCarb += Number(log.carbs || 0);
        dayFat += Number(log.fat || 0);
        dayProt += Number(log.protein || 0);

        if (dayMeals[log.meal_type] != null) {
          dayMeals[log.meal_type] += Number(log.calories || 0);
        }
      }

      if (dayCal > 0) {
        totalCalories += dayCal;
        daysWithLogs++;
        for (const m in dayMeals) {
          mealSums[m] += dayMeals[m];
        }
      }

      // Macro energy breakdown
      const carbKcal = dayCarb * 4;
      const fatKcal = dayFat * 9;
      const protKcal = dayProt * 4;
      const macroTotal = carbKcal + fatKcal + protKcal;

      dailyStats.push({
        date: d,
        dayNum,
        dayName,
        calories: Math.round(dayCal),
        carbs: Math.round(dayCarb),
        fat: Math.round(dayFat),
        protein: Math.round(dayProt),
        macroPercent: {
          carb: macroTotal > 0 ? Math.round((carbKcal / macroTotal) * 100) : 0,
          fat: macroTotal > 0 ? Math.round((fatKcal / macroTotal) * 100) : 0,
          protein: macroTotal > 0 ? Math.round((protKcal / macroTotal) * 100) : 0
        },
        meals: dayMeals
      });
    }

    const avgCalories = daysWithLogs > 0 ? Math.round(totalCalories / daysWithLogs) : 0;
    const mealAverages = {};
    for (const m in mealSums) {
      mealAverages[m] = daysWithLogs > 0 ? Math.round(mealSums[m] / daysWithLogs) : 0;
    }

    // Get user profile target
    const profile = getUserProfile(userId);

    res.json({
      period,
      referenceDate,
      daysCount,
      averageCalories: avgCalories,
      targetCalories: profile.calorie_target,
      mealAverages,
      dailyStats
    });
  } catch (err) {
    console.error('Error fetching analytics trends:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
