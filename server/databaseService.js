// server/databaseService.js
// SQLite persistence layer for CipherLink
// Tables: users, identities, sessions, messages, offline_messages, user_profiles

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
    delivered INTEGER DEFAULT 0,
    -- v3.12: Message editing and deletion
    edited_at INTEGER,
    deleted_at INTEGER,
    deleted_for TEXT  -- JSON array of uids for whom message is deleted
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

  -- v3.6: Message reactions
  CREATE TABLE IF NOT EXISTS reactions (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    user_uid TEXT NOT NULL,
    emoji TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    UNIQUE(message_id, user_uid, emoji),
    FOREIGN KEY (message_id) REFERENCES messages(id),
    FOREIGN KEY (user_uid) REFERENCES users(uid)
  );

  -- v3.12: Message edit history
  CREATE TABLE IF NOT EXISTS message_edits (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    old_content TEXT NOT NULL,
    edited_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (message_id) REFERENCES messages(id)
  );

  CREATE INDEX IF NOT EXISTS idx_message_edits_message_id ON message_edits(message_id);

  -- v3.5: User profile persistence (public key, pre-key bundle, store, boards)
  CREATE TABLE IF NOT EXISTS user_profiles (
    uid TEXT PRIMARY KEY,
    public_key TEXT,
    pre_key_bundle TEXT,  -- JSON string
    store_data TEXT,      -- JSON string
    boards_data TEXT,     -- JSON string
    updated_at TEXT NOT NULL,
    FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_user_profiles_uid ON user_profiles(uid);

  -- v3.13: Push notifications (FCM) - device tokens storage
  CREATE TABLE IF NOT EXISTS push_tokens (
    id TEXT PRIMARY KEY,
    user_uid TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    platform TEXT, -- 'web', 'android', 'ios'
    last_active INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (user_uid) REFERENCES users(uid) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_push_tokens_uid ON push_tokens(user_uid);
  CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);
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

// --- v3.5: User Profile Persistence ---

// Get full user profile (public_key, pre_key_bundle, store_data, boards_data)
function getUserProfile(uid) {
  const row = db.prepare('SELECT uid, public_key, pre_key_bundle, store_data, boards_data, updated_at FROM user_profiles WHERE uid = ?').get(uid);
  if (!row) return null;
  return {
    uid: row.uid,
    publicKey: row.public_key,
    preKeyBundle: row.pre_key_bundle ? JSON.parse(row.pre_key_bundle) : null,
    store: row.store_data ? JSON.parse(row.store_data) : null,
    boards: row.boards_data ? JSON.parse(row.boards_data) : [],
    updatedAt: row.updated_at,
  };
}

// Save/update public key
function savePublicKey(uid, publicKey) {
  const stmt = db.prepare(`
    INSERT INTO user_profiles (uid, public_key, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(uid) DO UPDATE SET public_key = excluded.public_key, updated_at = excluded.updated_at
  `);
  const now = new Date().toISOString();
  stmt.run(uid, publicKey, now);
}

// Save/update pre-key bundle
function savePreKeyBundle(uid, preKeyBundle) {
  const stmt = db.prepare(`
    INSERT INTO user_profiles (uid, pre_key_bundle, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(uid) DO UPDATE SET pre_key_bundle = excluded.pre_key_bundle, updated_at = excluded.updated_at
  `);
  const now = new Date().toISOString();
  stmt.run(uid, JSON.stringify(preKeyBundle), now);
}

// Save/update store data
function saveStoreData(uid, storeData) {
  const stmt = db.prepare(`
    INSERT INTO user_profiles (uid, store_data, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(uid) DO UPDATE SET store_data = excluded.store_data, updated_at = excluded.updated_at
  `);
  const now = new Date().toISOString();
  stmt.run(uid, JSON.stringify(storeData), now);
}

// Save/update boards data
function saveBoardsData(uid, boardsData) {
  const stmt = db.prepare(`
    INSERT INTO user_profiles (uid, boards_data, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(uid) DO UPDATE SET boards_data = excluded.boards_data, updated_at = excluded.updated_at
  `);
  const now = new Date().toISOString();
  stmt.run(uid, JSON.stringify(boardsData), now);
}

// Save full profile (batch update)
function saveUserProfile(uid, { publicKey, preKeyBundle, store, boards }) {
  const stmt = db.prepare(`
    INSERT INTO user_profiles (uid, public_key, pre_key_bundle, store_data, boards_data, updated_at) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(uid) DO UPDATE SET 
      public_key = COALESCE(excluded.public_key, public_key),
      pre_key_bundle = COALESCE(excluded.pre_key_bundle, pre_key_bundle),
      store_data = COALESCE(excluded.store_data, store_data),
      boards_data = COALESCE(excluded.boards_data, boards_data),
      updated_at = excluded.updated_at
  `);
  const now = new Date().toISOString();
  stmt.run(
    uid,
    publicKey || null,
    preKeyBundle ? JSON.stringify(preKeyBundle) : null,
    store ? JSON.stringify(store) : null,
    boards ? JSON.stringify(boards) : null,
    now
  );
}

// --- v3.6: Message Reactions ---

// Add a reaction to a message
function addReaction(messageId, userUid, emoji) {
  const crypto = require('crypto');
  const id = crypto.randomBytes(16).toString('hex');
  const stmt = db.prepare(
    'INSERT OR IGNORE INTO reactions (id, message_id, user_uid, emoji, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  const createdAt = Math.floor(Date.now() / 1000);
  stmt.run(id, messageId, userUid, emoji, createdAt);
  return { id, message_id: messageId, user_uid: userUid, emoji, created_at: createdAt };
}

// Remove a reaction from a message
function removeReaction(messageId, userUid, emoji) {
  const stmt = db.prepare(
    'DELETE FROM reactions WHERE message_id = ? AND user_uid = ? AND emoji = ?'
  );
  return stmt.run(messageId, userUid, emoji).changes > 0;
}

// Get all reactions for a message
function getReactionsForMessage(messageId) {
  return db.prepare(
    'SELECT id, message_id, user_uid, emoji, created_at FROM reactions WHERE message_id = ? ORDER BY created_at'
  ).all(messageId);
}

// Get reaction counts per emoji for a message
function getReactionCountsForMessage(messageId) {
  const rows = db.prepare(
    'SELECT emoji, COUNT(*) as count, GROUP_CONCAT(user_uid) as users FROM reactions WHERE message_id = ? GROUP BY emoji'
  ).all(messageId);
  return rows.map(r => ({
    emoji: r.emoji,
    count: r.count,
    users: r.users ? r.users.split(',') : []
  }));
}

// Check if user has reacted with specific emoji
function hasUserReacted(messageId, userUid, emoji) {
  return db.prepare(
    'SELECT 1 FROM reactions WHERE message_id = ? AND user_uid = ? AND emoji = ?'
  ).get(messageId, userUid, emoji) !== undefined;
}

// --- v3.12: Message Editing & Deletion ---

// Get a message by ID
function getMessage(messageId) {
  return db.prepare(
    'SELECT id, sender_uid, receiver_uid, content, encrypted_attachments, timestamp, delivered, edited_at, deleted_at, deleted_for FROM messages WHERE id = ?'
  ).get(messageId);
}

// Edit a message (save old version to history, update content)
function editMessage(messageId, newContent) {
  const crypto = require('crypto');
  const editId = crypto.randomBytes(16).toString('hex');
  const editedAt = Math.floor(Date.now() / 1000);

  // Save old version to history
  const message = getMessage(messageId);
  if (message) {
    const historyStmt = db.prepare(
      'INSERT INTO message_edits (id, message_id, old_content, edited_at) VALUES (?, ?, ?, ?)'
    );
    historyStmt.run(editId, messageId, message.content, editedAt);
  }

  // Update message content and edited_at
  const stmt = db.prepare(
    'UPDATE messages SET content = ?, edited_at = ? WHERE id = ?'
  );
  const result = stmt.run(newContent, editedAt, messageId);
  return result.changes > 0;
}

// Delete message for all (hard delete) or for specific users (soft delete via deleted_for)
function deleteMessage(messageId, deleteForAll, uid) {
  const deletedAt = Math.floor(Date.now() / 1000);

  if (deleteForAll) {
    // Hard delete for all - actually remove from database
    const stmt = db.prepare('DELETE FROM messages WHERE id = ?');
    return stmt.run(messageId).changes > 0;
  } else {
    // Soft delete for specific user - add to deleted_for array
    const message = getMessage(messageId);
    if (!message) return false;

    let deletedFor = [];
    if (message.deleted_for) {
      try {
        deletedFor = JSON.parse(message.deleted_for);
      } catch {
        deletedFor = [];
      }
    }

    if (!deletedFor.includes(uid)) {
      deletedFor.push(uid);
    }

    const stmt = db.prepare(
      'UPDATE messages SET deleted_at = ?, deleted_for = ? WHERE id = ?'
    );
    const result = stmt.run(deletedAt, JSON.stringify(deletedFor), messageId);
    return result.changes > 0;
  }
}

// Get message edit history
function getMessageHistory(messageId) {
  return db.prepare(
    'SELECT id, message_id, old_content, edited_at FROM message_edits WHERE message_id = ? ORDER BY edited_at'
  ).all(messageId);
}

// Check if message is deleted for a specific user
function isMessageDeletedForUser(messageId, uid) {
  const message = getMessage(messageId);
  if (!message || !message.deleted_for) return false;

  try {
    const deletedFor = JSON.parse(message.deleted_for);
    return deletedFor.includes(uid);
  } catch {
    return false;
  }
}

// ===== v3.13: Push Notifications (FCM) =====

// Save or update a push token for a user
function savePushToken(userUid, token, platform = 'web') {
  const crypto = require('crypto');
  const id = crypto.randomBytes(16).toString('hex');
  const now = Math.floor(Date.now() / 1000);
  
  const stmt = db.prepare(`
    INSERT INTO push_tokens (id, user_uid, token, platform, last_active)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(token) DO UPDATE SET
      user_uid = excluded.user_uid,
      platform = excluded.platform,
      last_active = excluded.last_active
  `);
  stmt.run(id, userUid, token, platform, now);
  return true;
}

// Get all push tokens for a user
function getPushTokens(userUid) {
  return db.prepare(
    'SELECT id, user_uid, token, platform, last_active FROM push_tokens WHERE user_uid = ?'
  ).all(userUid);
}

// Remove a specific push token
function removePushToken(token) {
  const stmt = db.prepare('DELETE FROM push_tokens WHERE token = ?');
  const result = stmt.run(token);
  return result.changes > 0;
}

// Remove all push tokens for a user
function removeAllPushTokens(userUid) {
  const stmt = db.prepare('DELETE FROM push_tokens WHERE user_uid = ?');
  const result = stmt.run(userUid);
  return result.changes > 0;
}

// Clean up expired tokens (older than specified days)
function cleanupExpiredTokens(days = 30) {
  const cutoff = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);
  const stmt = db.prepare('DELETE FROM push_tokens WHERE last_active < ?');
  const result = stmt.run(cutoff);
  return result.changes;
}

// Update last_active timestamp for a token
function updatePushTokenActivity(token) {
  const now = Math.floor(Date.now() / 1000);
  const stmt = db.prepare('UPDATE push_tokens SET last_active = ? WHERE token = ?');
  stmt.run(now, token);
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
  // v3.5: User profile
  getUserProfile,
  savePublicKey,
  savePreKeyBundle,
  saveStoreData,
  saveBoardsData,
  saveUserProfile,
  // v3.6: Message reactions
  addReaction,
  removeReaction,
  getReactionsForMessage,
  getReactionCountsForMessage,
  hasUserReacted,
  // v3.12: Message editing & deletion
  getMessage,
  editMessage,
  deleteMessage,
  getMessageHistory,
  isMessageDeletedForUser,
  // v3.13: Push Notifications (FCM)
  savePushToken,
  getPushTokens,
  removePushToken,
  removeAllPushTokens,
  cleanupExpiredTokens,
  updatePushTokenActivity,
};
