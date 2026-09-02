/**
 * WebSocket Tests for CipherLink
 */

describe('WebSocket API Service', () => {
  let apiService;
  let mockWebSocket;

  beforeEach(() => {
    // v2.0 Stage 4: apiService читает identity из localStorage для buildWsAuthUrl.
    // Устанавливаем тестовую identity перед require().
    localStorage.setItem('piligrim-identity', JSON.stringify({
      uid: 'test-uid-123',
      publicKey: '{"kty":"RSA","n":"abc123","e":"AQAB"}'
    }));
    mockWebSocket = {
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
      readyState: WebSocket.OPEN,
      close: jest.fn(),
      send: jest.fn()
    };
    global.WebSocket = jest.fn(() => mockWebSocket);
    jest.useFakeTimers();
    jest.resetModules();
    apiService = require('../src/services/apiService').apiService;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('connect', () => {
    test('should create WebSocket connection with uid', () => {
      apiService.connect('test-uid-123');
      expect(WebSocket).toHaveBeenCalled();
      const callUrl = WebSocket.mock.calls[0][0];
      expect(callUrl).toContain('test-uid-123');
    });

    test('should disconnect existing connection when connecting again', () => {
      apiService.connect('uid-1');
      apiService.connect('uid-2');
      expect(mockWebSocket.close).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    test('should send message when connected', () => {
      apiService.connect('sender-uid');
      apiService.sendMessage('receiver-uid', 'Hello');
      expect(mockWebSocket.send).toHaveBeenCalled();
      const sentData = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      expect(sentData.to).toBe('receiver-uid');
      expect(sentData.content).toBe('Hello');
    });
  });

  describe('disconnect', () => {
    test('should close WebSocket connection', () => {
      apiService.connect('test-uid');
      apiService.disconnect();
      expect(mockWebSocket.close).toHaveBeenCalled();
    });

    test('should handle disconnect when WebSocket is null', () => {
      const { apiService: freshService } = require('../src/services/apiService');
      expect(() => freshService.disconnect()).not.toThrow();
    });
  });

  describe('message handlers', () => {
    test('should register message listener', (done) => {
      apiService.connect('test-uid');
      apiService.onMessage((msg) => done());
      const testMsg = { from: 'user1', content: 'Hi', timestamp: Date.now().toString(), type: 'user' };
      mockWebSocket.onmessage({ data: JSON.stringify(testMsg) });
    });

    test('should remove message listener', () => {
      apiService.connect('test-uid');
      const listener = jest.fn();
      apiService.onMessage(listener);
      apiService.onMessage(listener);
      apiService.offMessage(listener);
      mockWebSocket.onmessage({ data: JSON.stringify({ content: 'test' }) });
      expect(listener).not.toHaveBeenCalled();
    });

    test('should handle multiple listeners', () => {
      apiService.connect('test-uid');
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      apiService.onMessage(listener1);
      apiService.onMessage(listener2);
      mockWebSocket.onmessage({ data: JSON.stringify({ content: 'test' }) });
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('event handlers', () => {
    test('should call onopen callback', (done) => {
      apiService.connect('test-uid');
      apiService.onOpen(() => done());
      if (mockWebSocket.onopen) mockWebSocket.onopen();
    });

    test('should call onclose callback', (done) => {
      apiService.connect('test-uid');
      apiService.onClose(() => done());
      if (mockWebSocket.onclose) mockWebSocket.onclose();
    });

    test('should call onerror callback', (done) => {
      apiService.connect('test-uid');
      apiService.onError(() => done());
      if (mockWebSocket.onerror) mockWebSocket.onerror({ type: 'error' });
    });
  });

  describe('message types', () => {
    test('should handle user messages', (done) => {
      apiService.connect('test-uid');
      apiService.onMessage((msg) => {
        expect(msg.type).toBe('user');
        expect(msg.senderId).toBe('user1');
        expect(msg.text).toBe('hello');
        done();
      });
      mockWebSocket.onmessage({ data: JSON.stringify({ from: 'user1', content: 'hello', type: 'user', timestamp: '123' }) });
    });

    test('should handle order messages with payload', (done) => {
      apiService.connect('test-uid');
      apiService.onMessage((msg) => {
        expect(msg.type).toBe('order');
        expect(msg.payload.orderId).toBe('order-456');
        done();
      });
      mockWebSocket.onmessage({ data: JSON.stringify({ from: 'seller1', content: 'Order update', type: 'order', payload: { orderId: 'order-456', status: 'processing' }, timestamp: '789' }) });
    });
  });
});
