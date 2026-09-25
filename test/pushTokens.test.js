/**
 * Tests for Push Token Database Functions
 */

const databaseService = require('../server/databaseService');

describe('Push Token Database Functions', () => {
  // Use in-memory database for tests
  let testDb;
  
  beforeAll(() => {
    // The database is already initialized in databaseService
    testDb = databaseService.db;
  });

  beforeEach(() => {
    // Clean up push_tokens table before each test
    testDb.prepare('DELETE FROM push_tokens').run();
    testDb.prepare('DELETE FROM users').run();
    testDb.prepare('DELETE FROM identities').run();
  });

  // Create a test user
  const createTestUser = () => {
    const uid = 'test-user-' + Date.now();
    databaseService.createUser(uid, 'testuser', 'hash123');
    return uid;
  };

  describe('savePushToken', () => {
    test('should save a new push token', () => {
      const uid = createTestUser();
      const token = 'fcm-token-' + Date.now();
      
      const result = databaseService.savePushToken(uid, token, 'web');
      expect(result).toBe(true);
      
      const tokens = databaseService.getPushTokens(uid);
      expect(tokens.length).toBe(1);
      expect(tokens[0].token).toBe(token);
      expect(tokens[0].platform).toBe('web');
      expect(tokens[0].user_uid).toBe(uid);
    });

    test('should update existing token (upsert)', () => {
      const uid = createTestUser();
      const token = 'fcm-token-' + Date.now();
      
      databaseService.savePushToken(uid, token, 'web');
      databaseService.savePushToken(uid, token, 'android'); // Update platform
      
      const tokens = databaseService.getPushTokens(uid);
      expect(tokens.length).toBe(1);
      expect(tokens[0].platform).toBe('android');
    });

    test('should save multiple tokens for same user', () => {
      const uid = createTestUser();
      const token1 = 'fcm-token-1-' + Date.now();
      const token2 = 'fcm-token-2-' + Date.now();
      
      databaseService.savePushToken(uid, token1, 'web');
      databaseService.savePushToken(uid, token2, 'android');
      
      const tokens = databaseService.getPushTokens(uid);
      expect(tokens.length).toBe(2);
    });
  });

  describe('getPushTokens', () => {
    test('should return empty array for user with no tokens', () => {
      const uid = createTestUser();
      const tokens = databaseService.getPushTokens(uid);
      expect(tokens).toEqual([]);
    });

    test('should return tokens for user', () => {
      const uid = createTestUser();
      const token = 'fcm-token-' + Date.now();
      databaseService.savePushToken(uid, token, 'web');
      
      const tokens = databaseService.getPushTokens(uid);
      expect(tokens.length).toBe(1);
      expect(tokens[0].token).toBe(token);
    });
  });

  describe('removePushToken', () => {
    test('should remove a specific token', () => {
      const uid = createTestUser();
      const token = 'fcm-token-' + Date.now();
      databaseService.savePushToken(uid, token, 'web');
      
      const result = databaseService.removePushToken(token);
      expect(result).toBe(true);
      
      const tokens = databaseService.getPushTokens(uid);
      expect(tokens.length).toBe(0);
    });

    test('should return false for non-existent token', () => {
      const result = databaseService.removePushToken('non-existent-token');
      expect(result).toBe(false);
    });
  });

  describe('removeAllPushTokens', () => {
    test('should remove all tokens for a user', () => {
      const uid = createTestUser();
      const token1 = 'fcm-token-1-' + Date.now();
      const token2 = 'fcm-token-2-' + Date.now();
      
      databaseService.savePushToken(uid, token1, 'web');
      databaseService.savePushToken(uid, token2, 'android');
      
      const result = databaseService.removeAllPushTokens(uid);
      expect(result).toBe(true);
      
      const tokens = databaseService.getPushTokens(uid);
      expect(tokens.length).toBe(0);
    });
  });

  describe('cleanupExpiredTokens', () => {
    test('should remove tokens older than specified days', () => {
      const uid = createTestUser();
      const token1 = 'fcm-token-old-' + Date.now();
      const token2 = 'fcm-token-new-' + Date.now();
      
      databaseService.savePushToken(uid, token1, 'web');
      databaseService.savePushToken(uid, token2, 'android');
      
      // Manually set token1 as old (40 days ago)
      const oldTime = Math.floor(Date.now() / 1000) - (40 * 24 * 60 * 60);
      testDb.prepare('UPDATE push_tokens SET last_active = ? WHERE token = ?').run(oldTime, token1);
      
      // Cleanup tokens older than 30 days
      const deletedCount = databaseService.cleanupExpiredTokens(30);
      expect(deletedCount).toBe(1);
      
      const tokens = databaseService.getPushTokens(uid);
      expect(tokens.length).toBe(1);
      expect(tokens[0].token).toBe(token2);
    });
  });

  describe('updatePushTokenActivity', () => {
    test('should update last_active timestamp', () => {
      const uid = createTestUser();
      const token = 'fcm-token-' + Date.now();
      databaseService.savePushToken(uid, token, 'web');
      
      // Get initial timestamp
      const before = databaseService.getPushTokens(uid)[0].last_active;
      
      // Wait a bit and update
      setTimeout(() => {
        databaseService.updatePushTokenActivity(token);
        
        const after = databaseService.getPushTokens(uid)[0].last_active;
        expect(after).toBeGreaterThanOrEqual(before);
      }, 10);
    });
  });
});