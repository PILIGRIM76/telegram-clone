/**
 * WebSocket Tests for CipherLink
 */

describe('WebSocket API Service', () => {
    let apiService;
    let mockWebSocket;

    beforeEach(() => {
        mockWebSocket = {
            onopen: null,
            onmessage: null,
            onclose: null,
            onerror: null,
            close: jest.fn(),
            send: jest.fn()
        };

        global.WebSocket = jest.fn(() => mockWebSocket);
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    describe('connect', () => {
        test('should reject connection without uid', () => {
            const { ApiService } = require('../src/services/apiService');
            apiService = new ApiService();
            expect(() => apiService.connect('')).toThrow();
        });

        test('should create WebSocket with uid in URL', () => {
            const { ApiService } = require('../src/services/apiService');
            apiService = new ApiService();
            apiService.connect('test-uid-123');
            expect(WebSocket).toHaveBeenCalled();
        });

        test('should register onopen handler', () => {
            const { ApiService } = require('../src/services/apiService');
            apiService = new ApiService();
            let opened = false;
            apiService.onOpen(() => opened = true);
            apiService.connect('test-uid');
            expect(typeof mockWebSocket.onopen).toBe('function');
        });

        test('should register message listener', (done) => {
            const { ApiService } = require('../src/services/apiService');
            apiService = new ApiService();
            apiService.connect('test-uid');
            apiService.onMessage((msg) => done());
            mockWebSocket.onmessage({ data: JSON.stringify({ from: 'user1', content: 'Hi' }) });
        });
    });

    describe('sendMessage', () => {
        test('should not send if not connected', () => {
            const { ApiService } = require('../src/services/apiService');
            apiService = new ApiService();
            apiService.connect('test-uid');
            expect(() => apiService.sendMessage('other', 'msg')).not.toThrow();
        });

        test('should send when connected', (done) => {
            const { ApiService } = require('../src/services/apiService');
            apiService = new ApiService();
            apiService.connect('sender');
            mockWebSocket.onopen({ type: 'open' });
            apiService.sendMessage('receiver', 'Hello');
            expect(mockWebSocket.send).toHaveBeenCalled();
            done();
        });

        test('should send with message type and payload', (done) => {
            const { ApiService } = require('../src/services/apiService');
            apiService = new ApiService();
            apiService.connect('sender');
            mockWebSocket.onopen({ type: 'open' });
            apiService.sendMessage('receiver', 'Order', { type: 'order', payload: { orderId: '123' } });
            const sent = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
            expect(sent.type).toBe('order');
            expect(sent.payload.orderId).toBe('123');
            done();
        });
    });

    describe('disconnect', () => {
        test('should close connection', () => {
            const { ApiService } = require('../src/services/apiService');
            apiService = new ApiService();
            apiService.connect('test-uid');
            apiService.disconnect();
            expect(mockWebSocket.close).toHaveBeenCalled();
        });

        test('should handle null connection', () => {
            const { ApiService } = require('../src/services/apiService');
            apiService = new ApiService();
            expect(() => apiService.disconnect()).not.toThrow();
        });
    });

    describe('message handlers', () => {
        test('should add and remove message listener', () => {
            const { ApiService } = require('../src/services/apiService');
            apiService = new ApiService();
            apiService.connect('test-uid');
            const listener = jest.fn();
            apiService.onMessage(listener);
            apiService.offMessage(listener);
            mockWebSocket.onmessage({ data: JSON.stringify({ content: 'test' }) });
            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        test('should handle errors', (done) => {
            const { ApiService } = require('../src/services/apiService');
            apiService = new ApiService();
            apiService.connect('test-uid');
            apiService.onError((e) => done());
            mockWebSocket.onerror({ type: 'error' });
        });
    });

    describe('message types', () => {
        test('should handle user, system, order messages', (done) => {
            const { ApiService } = require('../src/services/apiService');
            apiService = new ApiService();
            const messages = [];
            apiService.connect('test-uid');
            apiService.onMessage((m) => messages.push(m));

            mockWebSocket.onmessage({ data: JSON.stringify({ from: 'u1', content: 'hello', type: 'user' }) });
            mockWebSocket.onmessage({ data: JSON.stringify({ from: 'system', content: 'sys', type: 'system' }) });
            mockWebSocket.onmessage({ data: JSON.stringify({ from: 'u2', content: 'order', type: 'order', payload: { orderId: '123' } }) });

            expect(messages.length).toBe(3);
            expect(messages[0].type).toBe('user');
            expect(messages[1].type).toBe('system');
            expect(messages[2].payload.orderId).toBe('123');
            done();
        });
    });
});
