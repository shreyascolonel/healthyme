import crypto from 'node:crypto';

export const DEFAULT_PASSWORD = 'welcome123';

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${key}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalKey] = storedHash.split(':');
  const key = crypto.scryptSync(password, salt, 64).toString('hex');
  return key === originalKey;
}
