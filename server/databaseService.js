// server/databaseService.js
// SQLite persistence layer for CipherLink
// Tables: users, identities, sessions, messages, offline_messages

const Database = require('better-sqlite3');
const path = require('path');

// Open (or create) the SQLite database
const dbPath = path.join(__dirname, '..', 'data', 'cipherlink.db');

// Phase 2: Use WAL mode for better concurrency
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS identities (
    uid TEXT PRIMARY KEY,
    public_key TEXT NOT NULL,
    private_key_blob TEXT,
    FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_uid TEXT NOT NULL,
    receiver_uid TEXT NOT NULL,
    content TEXT NOT NULL,
    encrypted_attachments TEXT,
    timestamp TEXT NOT NULL,
    delivered INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS offline_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_uid TEXT NOT NULL,
    receiver_uid TEXT NOT NULL,
    content TEXT NOT NULL,
    encrypted_attachments TEXT,
    timestamp TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

// Insert a new user (uid, username, password_hash)
function createUser(uid, username, passwordHash) {
  const stmt = db.prepare(
    'INSERT INTO users (uid, username, password_hash, created_at) VALUES (?, ?, ?, ?)'
  );
  const now = new Date().toISOString();
  stmt.run(uid, username, passwordHash, now);
}

// Get user by username
function getUserByUsername(username) {
  return db.prepare('SELECT uid, username, password_hash, created_at FROM users WHERE username = ?').get(username);
}

// Get user by uid
function getUserByUid(uid) {
  return db.prepare('SELECT uid, username, password_hash, created_at FROM users WHERE uid = ?').get(uid);
}

// Store/update identity info for a user
function saveIdentity(uid, publicKey, privateKeyBlob) {
  const stmt = db.prepare(
    'INSERT INTO identities (uid, public_key, private_key_blob) VALUES (?, ?, ?) ' +
    'ON CONFLICT(uid) DO UPDATE SET public_key = excluded.public_key, private_key_blob = excluded.private_key_blob'
  );
  stmt.run(uid, publicKey, privateKeyBlob || null);
}

// Get identity by uid
function getIdentity(uid) {
  return db.prepare('SELECT uid, public_key, private_key_blob FROM identities WHERE uid = ?').get(uid);
}

// Save a message to SQLite
function saveMessage({ senderUid, receiverUid, content, encryptedAttachments }) {
  const stmt = db.prepare(
    'INSERT INTO messages (sender_uid, receiver_uid, content, encrypted_attachments, timestamp, delivered) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const now = new Date().toISOString();
  const result = stmt.run(
    senderUid,
    receiverUid,
    content,
    encryptedAttachments ? JSON.stringify(encryptedAttachments) : null,
    now,
    0
  );
  return result.lastID;
}

// Save an offline message (when recipient is not connected)
function saveOfflineMessage({ senderUid, receiverUid, content, encryptedAttachments }) {
  const stmt = db.prepare(
    'INSERT INTO offline_messages (sender_uid, receiver_uid, content, encrypted_attachments, timestamp, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const now = new Date().toISOString();
  stmt.run(
    senderUid,
    receiverUid,
    content,
    encryptedAttachments ? JSON.stringify(encryptedAttachments) : null,
    now,
    now
  );
}

// Take pending offline messages for a uid, then delete them (POP semantics)
function takeOfflineMessages(uid) {
  const select = db.prepare('SELECT id, sender_uid, receiver_uid, content, encrypted_attachments, timestamp FROM offline_messages WHERE receiver_uid = ?').all(uid);
  if (select.length === 0) return [];
  
  const del = db.prepare('DELETE FROM offline_messages WHERE receiver_uid = ?');
  del.run(uid);
  
  // Parse attachments back
  return select.map(m => ({
    senderUid: m.sender_uid,
    receiverUid: m.receiver_uid,
    content: m.content,
    encryptedAttachments: m.encrypted_attachments ? JSON.parse(m.encrypted_attachments) : [],
    timestamp: m.timestamp
  }));
}

// Delete expired sessions
function cleanupSessions() {
  const now = Math.floor(Date.now() / 1000);
  const stmt = db.prepare('DELETE FROM sessions WHERE expires_at < ?');
  const result = stmt.run(now);
  return result.changes;
}

// Get session by refresh token
function getSessionByRefreshToken(refreshToken) {
  return db.prepare(
    'SELECT session_id, uid, refresh_token, expires_at FROM sessions WHERE refresh_token = ?'
  ).get(refreshToken);
}

// Delete session (logout)
function deleteSession(sessionId) {
  const stmt = db.prepare('DELETE FROM sessions WHERE session_id = ?');
  return stmt.run(sessionId);
}

// Insert session
function createSession(uid, refreshToken, sessionId, expiresAt) {
  const stmt = db.prepare(
    'INSERT INTO sessions (session_id, uid, refresh_token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  const now = new Date().toISOString();
  return stmt.run(sessionId, uid, refreshToken, expiresAt, now);
}

module.exports = {
  db,
  createUser,
  getUserByUsername,
  getUserByUid,
  saveIdentity,
  getIdentity,
  saveMessage,
  saveOfflineMessage,
  takeOfflineMessages,
  cleanupSessions,
  getSessionByRefreshToken,
  deleteSession,
  createSession,
};
