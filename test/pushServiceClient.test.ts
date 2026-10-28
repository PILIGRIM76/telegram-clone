/**
 * Tests for Client Push Service (src/services/pushService.ts)
 */

// Mock firebase
const mockGetToken = jest.fn();
const mockOnMessage = jest.fn();
const mockIsSupported = jest.fn();
const mockDeleteToken = jest.fn();

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
}));

jest.mock('firebase/messaging', () => ({
  getMessaging: jest.fn(() => ({})),
  getToken: mockGetToken,
  onMessage: mockOnMessage,
  isSupported: mockIsSupported,
  deleteToken: mockDeleteToken,
}));

// Mock apiService
jest.mock('../src/services/apiService', () => ({
  apiService: {
    registerPushToken: jest.fn(),
    unregisterPushToken: jest.fn(),
  },
}));

// Mock Notification API
const mockNotification = {
  permission: 'default' as NotificationPermission,
  requestPermission: jest.fn(),
};

Object.defineProperty(global, 'Notification', {
  value: mockNotification,
  writable: true,
  configurable: true,
});

describe('Client Push Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockNotification.permission = 'default';
  });

  describe('initPushNotifications', () => {
    test('should return null if FCM not supported', async () => {
      mockIsSupported.mockResolvedValue(false);
      
      const { initPushNotifications } = require('../src/services/pushService');
      const result = await initPushNotifications();
      
      expect(result).toBeNull();
    });

    test('should return null if permission denied', async () => {
      mockIsSupported.mockResolvedValue(true);
      mockNotification.permission = 'denied';
      mockNotification.requestPermission.mockResolvedValue('denied');
      
      const { initPushNotifications } = require('../src/services/pushService');
      const result = await initPushNotifications();
      
      expect(result).toBeNull();
    });

    test('should get token and register with server on success', async () => {
      mockIsSupported.mockResolvedValue(true);
      mockNotification.permission = 'default';
      mockNotification.requestPermission.mockResolvedValue('granted');
      mockGetToken.mockResolvedValue('fcm-token-123');
      
      const { apiService } = require('../src/services/apiService');
      apiService.registerPushToken.mockResolvedValue(true);
      
      const { initPushNotifications } = require('../src/services/pushService');
      const result = await initPushNotifications();
      
      expect(result).toBe('fcm-token-123');
      expect(apiService.registerPushToken).toHaveBeenCalledWith('fcm-token-123', 'web');
    });

    test('should handle token registration failure', async () => {
      mockIsSupported.mockResolvedValue(true);
      mockNotification.permission = 'granted';
      mockGetToken.mockResolvedValue('fcm-token-123');
      
      const { apiService } = require('../src/services/apiService');
      apiService.registerPushToken.mockResolvedValue(false);
      
      const { initPushNotifications } = require('../src/services/pushService');
      const result = await initPushNotifications();
      
      // Still returns token even if server registration fails
      expect(result).toBe('fcm-token-123');
    });

    test('should handle errors gracefully', async () => {
      mockIsSupported.mockRejectedValue(new Error('Firebase error'));
      
      const { initPushNotifications } = require('../src/services/pushService');
      const result = await initPushNotifications();
      
      expect(result).toBeNull();
    });
  });

  describe('requestNotificationPermission', () => {
    test('should request permission', async () => {
      mockNotification.requestPermission.mockResolvedValue('granted');
      
      const { requestNotificationPermission } = require('../src/services/pushService');
      const result = await requestNotificationPermission();
      
      expect(result).toBe('granted');
      expect(mockNotification.requestPermission).toHaveBeenCalled();
    });
  });

  describe('getFCMToken', () => {
    test('should get token with vapid key', async () => {
      mockGetToken.mockResolvedValue('fcm-token-456');
      
      const { getFCMToken } = require('../src/services/pushService');
      const result = await getFCMToken();
      
      expect(result).toBe('fcm-token-456');
      expect(mockGetToken).toHaveBeenCalled();
    });
  });

  describe('deleteFCMToken', () => {
    test('should delete token', async () => {
      mockDeleteToken.mockResolvedValue(undefined);
      
      const { deleteFCMToken } = require('../src/services/pushService');
      const result = await deleteFCMToken();
      
      expect(result).toBe(true);
      expect(mockDeleteToken).toHaveBeenCalled();
    });

    test('should handle delete error', async () => {
      mockDeleteToken.mockRejectedValue(new Error('Delete failed'));
      
      const { deleteFCMToken } = require('../src/services/pushService');
      const result = await deleteFCMToken();
      
      expect(result).toBe(false);
    });
  });

  describe('isFCMSupported', () => {
    test('should return support status', async () => {
      mockIsSupported.mockResolvedValue(true);
      
      const { isFCMSupported } = require('../src/services/pushService');
      const result = await isFCMSupported();
      
      expect(result).toBe(true);
    });
  });
});