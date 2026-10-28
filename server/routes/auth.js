import express from 'express';
import db from '../db.js';
import { 
  verifyPassword, 
  hashPassword, 
  generateSessionToken, 
  deleteSessionToken, 
  DEFAULT_PASSWORD 
} from '../auth.js';
import { requireAuth } from '../authMiddleware.js';

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = ?').get(cleanUsername);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isValid = verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate session token
    const token = generateSessionToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        is_admin: user.is_admin === 1,
        must_change_password: user.must_change_password === 1
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/change-password (Forced on initial login or password reset)
router.post('/change-password', requireAuth, (req, res) => {
  try {
    const { new_password, confirm_password } = req.body;

    if (!new_password || !confirm_password) {
      return res.status(400).json({ error: 'New password and confirm password are required' });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    if (new_password === DEFAULT_PASSWORD) {
      return res.status(400).json({ error: 'New password cannot be the default password' });
    }

    const newHash = hashPassword(new_password);

    db.prepare(`
      UPDATE users SET
        password_hash = ?,
        must_change_password = 0,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(newHash, req.user.id);

    const updatedUser = {
      ...req.user,
      must_change_password: false
    };

    res.json({
      success: true,
      message: 'Password changed successfully',
      user: updatedUser
    });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (token) {
    deleteSessionToken(token);
  }
  res.json({ success: true });
});

export default router;
