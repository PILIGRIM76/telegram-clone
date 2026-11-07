// server/middleware/adminGuard.js
// Middleware защиты админских эндпоинтов — проверка JWT + роль 'admin'.
// Админ видит только метаданные (ID, даты, роли, статусы жалоб),
// но НЕ содержимое зашифрованных сообщений (E2EE неизменно).

const jwt = require('jsonwebtoken');
const { db } = require('../databaseService');

const ACCESS_TOKEN_SECRET =
  process.env.JWT_ACCESS_SECRET || 'piligrim-access-dev-secret';

/**
 * Middleware: проверяет JWT access token и роль пользователя.
 * Если роль !== 'admin' — возвращает 403 Forbidden.
 */
function adminGuard(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }

  let payload;
  try {
    payload = jwt.verify(token, ACCESS_TOKEN_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const user = db
    .prepare('SELECT uid, role FROM users WHERE uid = ?')
    .get(payload.uid);

  if (!user) {
    return res.status(403).json({ error: 'User not found' });
  }

  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: admin role required' });
  }

  req.user = { uid: user.uid, role: user.role };
  next();
}

module.exports = { adminGuard };
