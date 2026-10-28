import crypto from 'node:crypto';
import db from './db.js';
import { hashPassword, verifyPassword, DEFAULT_PASSWORD } from './cryptoUtils.js';

export { hashPassword, verifyPassword, DEFAULT_PASSWORD };

export function generateSessionToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  
  db.prepare(`
    INSERT INTO sessions (token, user_id, expires_at)
    VALUES (?, ?, ?)
  `).run(token, userId, expiresAt);

  return token;
}

export function getUserByToken(token) {
  if (!token) return null;
  
  try {
    const session = db.prepare(`
      SELECT s.user_id, u.id, u.username, u.display_name, u.is_admin, u.must_change_password, s.expires_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND datetime(s.expires_at) > datetime('now')
    `).get(token);

    if (!session) return null;

    return {
      id: session.id,
      username: session.username,
      display_name: session.display_name,
      is_admin: session.is_admin === 1,
      must_change_password: session.must_change_password === 1
    };
  } catch (err) {
    console.error('Error fetching user by token:', err);
    return null;
  }
}

export function deleteSessionToken(token) {
  if (!token) return;
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}
