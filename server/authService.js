// server/authService.js
// JWT access/refresh tokens + argon2 password hashing for CipherLink backend

const jwt = require('jsonwebtoken');
const argon2 = require('argon2');
const crypto = require('crypto');
const { db, createUser, createSession, getSessionByRefreshToken, deleteSession: deleteSessionDB, saveIdentity, getIdentity } = require('./databaseService');

// Secrets - should come from process.env in production
const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'piligrim-access-dev-secret';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'piligrim-refresh-dev-secret';
const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '30d';

// Hash password with argon2id
async function hashPassword(plainPassword) {
  try {
    const hash = await argon2.hash(plainPassword);
    return hash;
  } catch (error) {
    console.error('argon2 hash error:', error);
    throw new Error('Password hashing failed');
  }
}

// Verify password with argon2
async function verifyPassword(plainPassword, hashedPassword) {
  try {
    const valid = await argon2.verify(hashedPassword, plainPassword);
    return valid;
  } catch (error) {
    console.error('argon2 verify error:', error);
    return false;
  }
}

// Sign access token
function signAccessToken(uid) {
  return jwt.sign({ uid }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

// Sign refresh token
function signRefreshToken(uid) {
  return jwt.sign({ uid }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

// Verify access token - throws on invalid/expired token
function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

// Verify refresh token
function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET);
    return decoded;
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

// Save refresh token to DB (session)
async function saveRefreshTokenDB(uid, refreshToken, expiresInSeconds = 30 * 24 * 60 * 60) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  createSession(uid, refreshToken, sessionId, expiresAt);
  return sessionId;
}

// Verify refresh token in DB and extract uid
async function verifyRefreshTokenDB(token) {
  const row = getSessionByRefreshToken(token);
  if (!row) return null;
  if (row.expires_at < Math.floor(Date.now() / 1000)) return null;
  return { uid: row.uid, sessionId: row.session_id };
}

// Delete refresh token from DB (logout)
async function deleteRefreshTokenDB(sessionId) {
  deleteSessionDB(sessionId);
}

// Refresh access token using refresh token
async function refresh(refreshToken) {
  const session = await verifyRefreshTokenDB(refreshToken);
  if (!session) {
    throw new Error('Invalid or expired refresh token');
  }
  const newAccessToken = signAccessToken(session.uid);
  const newRefreshToken = signRefreshToken(session.uid);
  await deleteRefreshTokenDB(session.sessionId);
  await saveRefreshTokenDB(session.uid, newRefreshToken);
  return {
    uid: session.uid,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

// Register endpoint: accepts username, password, uid, publicKey
async function register(username, password, uid, publicKey) {
  // 1. Check if user already exists by username
  const existing = db.prepare('SELECT uid FROM users WHERE username = ?').get(username);
  if (existing) {
    throw new Error('Username already exists');
  }

  // 2. Generate uid if not provided
  const finalUid = uid || 'user_' + crypto.randomBytes(8).toString('hex');

  // 3. Hash password with argon2id
  const passwordHash = await hashPassword(password);

  // 4. Save user to SQLite
  createUser(finalUid, username, passwordHash);

  // 5. Save identity (public key) if provided
  if (publicKey) {
    saveIdentity(finalUid, publicKey);
  }

  // 6. Return tokens
  return {
    uid: finalUid,
    username,
    accessToken: signAccessToken(finalUid),
    refreshToken: signRefreshToken(finalUid),
  };
}

// Login endpoint
async function login(username, password) {
  // 1. Find user by username
  const user = db.prepare('SELECT uid, password_hash FROM users WHERE username = ?').get(username);
  if (!user) {
    throw new Error('Invalid credentials');
  }

  // 2. Verify password
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    throw new Error('Invalid credentials');
  }

  // 3. Generate tokens
  const accessToken = signAccessToken(user.uid);
  const refreshToken = signRefreshToken(user.uid);

  // 4. Save refresh token to DB
  await saveRefreshTokenDB(user.uid, refreshToken);

  return {
    uid: user.uid,
    username,
    accessToken,
    refreshToken,
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  saveRefreshTokenDB,
  verifyRefreshTokenDB,
  deleteRefreshTokenDB,
  refresh,
  register,
  login,
};
