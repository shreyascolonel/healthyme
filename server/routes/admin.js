import express from 'express';
import db, { getUserProfile } from '../db.js';
import { hashPassword, DEFAULT_PASSWORD } from '../auth.js';
import { requireAdmin } from '../authMiddleware.js';

const router = express.Router();

// All routes here require admin privileges
router.use(requireAdmin);

// GET /api/admin/users - List all users
router.get('/users', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT 
        u.id, 
        u.username, 
        u.display_name, 
        u.is_admin, 
        u.must_change_password, 
        u.created_at,
        (SELECT COUNT(*) FROM meal_logs WHERE user_id = u.id) as meal_count,
        (SELECT MAX(date) FROM meal_logs WHERE user_id = u.id) as last_active_date
      FROM users u
      ORDER BY u.id ASC
    `).all();

    res.json(users.map(u => ({
      ...u,
      is_admin: u.is_admin === 1,
      must_change_password: u.must_change_password === 1
    })));
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/admin/users - Create new user
router.post('/users', (req, res) => {
  try {
    const { username, display_name, is_admin } = req.body;

    if (!username || !display_name) {
      return res.status(400).json({ error: 'Username and display name are required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(cleanUsername);
    if (existing) {
      return res.status(400).json({ error: `Username "${cleanUsername}" is already taken` });
    }

    const defaultHash = hashPassword(DEFAULT_PASSWORD);
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, display_name, is_admin, must_change_password)
      VALUES (?, ?, ?, ?, 1)
    `).run(cleanUsername, defaultHash, display_name.trim(), is_admin ? 1 : 0);

    const newUserId = Number(result.lastInsertRowid);
    // Initialize user profile
    getUserProfile(newUserId);

    res.status(201).json({
      id: newUserId,
      username: cleanUsername,
      display_name: display_name.trim(),
      is_admin: !!is_admin,
      must_change_password: true,
      default_password: DEFAULT_PASSWORD,
      message: `User created. Default password is "${DEFAULT_PASSWORD}". User will be forced to change it on first login.`
    });
  } catch (err) {
    console.error('Admin create user error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// POST /api/admin/users/:id/reset-password - Admin resets a user's password
router.post('/users/:id/reset-password', (req, res) => {
  try {
    const { id } = req.params;
    const { temp_password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newPassword = (temp_password || DEFAULT_PASSWORD).trim();
    const newHash = hashPassword(newPassword);

    // Update password and force change on next login
    db.prepare(`
      UPDATE users SET
        password_hash = ?,
        must_change_password = 1,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(newHash, id);

    // Invalidate existing sessions for this user so they must log in with the reset password
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);

    res.json({
      success: true,
      user_id: user.id,
      username: user.username,
      temp_password: newPassword,
      message: `Password for "${user.username}" reset to "${newPassword}". The user will be required to change it upon next login.`
    });
  } catch (err) {
    console.error('Admin reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// DELETE /api/admin/users/:id - Delete a user
router.delete('/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const targetId = parseInt(id, 10);

    if (targetId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(targetId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user and associated data
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(targetId);
    db.prepare('DELETE FROM meal_logs WHERE user_id = ?').run(targetId);
    db.prepare('DELETE FROM water_logs WHERE user_id = ?').run(targetId);
    db.prepare('DELETE FROM weight_logs WHERE user_id = ?').run(targetId);
    db.prepare('DELETE FROM user_profile WHERE user_id = ?').run(targetId);
    db.prepare('DELETE FROM users WHERE id = ?').run(targetId);

    res.json({ success: true, message: `User "${user.username}" and associated logs deleted` });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// PATCH /api/admin/users/:id/privileges - Change user privileges (admin toggle)
router.patch('/users/:id/privileges', (req, res) => {
  try {
    const { id } = req.params;
    const { is_admin } = req.body;
    const targetId = parseInt(id, 10);

    const targetUser = db.prepare('SELECT id, username, is_admin FROM users WHERE id = ?').get(targetId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetId === req.user.id && !is_admin) {
      return res.status(400).json({ error: 'You cannot remove your own admin privileges.' });
    }

    const newAdminVal = is_admin ? 1 : 0;
    db.prepare("UPDATE users SET is_admin = ?, updated_at = datetime('now') WHERE id = ?").run(newAdminVal, targetId);

    res.json({
      success: true,
      user_id: targetId,
      username: targetUser.username,
      is_admin: newAdminVal === 1,
      message: `Privileges updated for @${targetUser.username}. Admin: ${newAdminVal === 1 ? 'Yes' : 'No'}`
    });
  } catch (err) {
    console.error('Privilege update error:', err);
    res.status(500).json({ error: 'Failed to update user privileges' });
  }
});

// GET /api/admin/users/:id/activity - View detailed activity for a user
router.get('/users/:id/activity', (req, res) => {
  try {
    const { id } = req.params;
    const targetId = parseInt(id, 10);

    const user = db.prepare('SELECT id, username, display_name, is_admin, must_change_password, created_at FROM users WHERE id = ?').get(targetId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const profile = db.prepare('SELECT * FROM user_profile WHERE user_id = ?').get(targetId) || {};
    const mealLogsCount = db.prepare('SELECT COUNT(*) as count FROM meal_logs WHERE user_id = ?').get(targetId).count;
    const waterRow = db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(amount_ml), 0) as total_ml FROM water_logs WHERE user_id = ?').get(targetId);
    const weightLogsCount = db.prepare('SELECT COUNT(*) as count FROM weight_logs WHERE user_id = ?').get(targetId).count;
    const lastSession = db.prepare('SELECT created_at, expires_at FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(targetId);
    
    // Recent 10 meal logs
    const recentMeals = db.prepare(`
      SELECT id, date, meal_type, food_name, calories, carbs, fat, protein, logged_at
      FROM meal_logs
      WHERE user_id = ?
      ORDER BY date DESC, logged_at DESC, id DESC
      LIMIT 10
    `).all(targetId);

    // Active dates count
    const activeDaysCount = db.prepare('SELECT COUNT(DISTINCT date) as days FROM meal_logs WHERE user_id = ?').get(targetId).days;

    res.json({
      user: {
        ...user,
        is_admin: user.is_admin === 1,
        must_change_password: user.must_change_password === 1
      },
      profile,
      activity: {
        activeDaysCount,
        mealLogsCount,
        waterTotalMl: waterRow.total_ml,
        waterLogsCount: waterRow.count,
        weightLogsCount,
        lastSession: lastSession ? lastSession.created_at : null,
        recentMeals
      }
    });
  } catch (err) {
    console.error('User activity error:', err);
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
});

// GET /api/admin/foods - List shared custom foods
router.get('/foods', (req, res) => {
  try {
    const foods = db.prepare(`
      SELECT f.*, u.username as creator_username, u.display_name as creator_display_name
      FROM foods f
      LEFT JOIN users u ON f.created_by_user_id = u.id
      WHERE f.is_custom = 1 OR f.source = 'custom'
      ORDER BY f.created_at DESC
    `).all();

    res.json(foods);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/foods - Admin creates new shared food
router.post('/foods', (req, res) => {
  try {
    const {
      name,
      brand,
      category,
      serving_size,
      serving_size_grams,
      serving_unit,
      calories,
      carbs,
      fat,
      protein,
      fiber,
      sugar,
      saturated_fat,
      sodium,
      potassium,
      calcium,
      iron,
      vitamin_a,
      vitamin_c
    } = req.body;

    if (!name || calories === undefined || calories === null || calories === '') {
      return res.status(400).json({ error: 'Food name and calories are required' });
    }

    const id = 'custom_admin_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const sGrams = parseFloat(serving_size_grams) || 100;

    db.prepare(`
      INSERT INTO foods (
        id, name, brand, category, serving_size, serving_size_grams, serving_unit,
        calories, carbs, fat, protein, fiber, sugar, saturated_fat, sodium, potassium, calcium, iron, vitamin_a, vitamin_c,
        source, is_favorite, is_custom, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'custom', 1, 1, ?)
    `).run(
      id,
      name.trim(),
      (brand || '').trim(),
      category || 'Custom Foods',
      serving_size || `${sGrams} g`,
      sGrams,
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
      req.user.id
    );

    const created = db.prepare('SELECT * FROM foods WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err) {
    console.error('Admin add food error:', err);
    res.status(500).json({ error: 'Failed to add food: ' + err.message });
  }
});

// DELETE /api/admin/foods/:id - Delete food item
router.delete('/foods/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM foods WHERE id = ?').run(id);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
