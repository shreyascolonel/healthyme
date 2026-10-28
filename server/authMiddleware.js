import { getUserByToken } from './auth.js';

export function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = getUserByToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }

  req.user = user;
  next();
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.user || !req.user.is_admin) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }
    next();
  });
}

// Optional auth helper (for search or public endpoints where user context is nice to have)
export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (token) {
    req.user = getUserByToken(token);
  }
  next();
}
