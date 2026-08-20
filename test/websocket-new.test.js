/**
 * WebSocket Tests for CipherLink
 * Tests the apiService singleton WebSocket functionality
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
            readyState: WebSocket.OPEN,
            close: jest.fn(),
            send: jest.fn(),
            addEventListener: jest.fn()
        };

        global.WebSocket = jest.fn(() => mockWebSocket);
        jest.useFakeTimers();
        
        // Need to re-import to get fresh singleton with mocked WebSocket
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

        test('should handle empty uid', () => {
            apiService.onOpen(() => {});
            apiService.connect('');
        });

        test('should register message listener', (done) => {
            apiService.connect('test-uid');
            apiService.onMessage((msg) => done());
            
            const testMsg = { from: 'user1', content: 'Hi', timestamp: Date.now().toString(), type: 'user' };
            mockWebSocket.onmessage({ data: JSON.stringify(testMsg) });
        });

        test('should call onopen callback', (done) => {
            apiService.connect('test-uid');
            apiService.onOpen(() => done());
            mockWebSocket.onopen({ type: 'open' });
        });

        test('should call onclose callback', (done) => {
            apiService.connect('test-uid');
            apiService.onClose(() => done());
            mockWebSocket.onclose({ type: 'close' });
        });

        test('should call onerror callback', (done) => {
            apiService.connect('test-uid');
            apiService.onError(() => done());
            mockWebSocket.onerror({ type: 'error', message: 'Connection failed' });
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

        test('should send message with extra options', () => {
            apiService.connect('sender');
            apiService.sendMessage('receiver', 'Order message', { 
                type: 'order', 
                payload: { orderId: 'order-123' },
                disappearIn: 3600 
            });
            
            const sentData = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
            expect(sentData.type).toBe('order');
            expect(sentData.payload.orderId).toBe('order-123');
            expect(sentData.disappearIn).toBe(3600);
        });

        test('should not send message when not connected', () => {
            apiService.connect('sender-uid');
            const mockClose = jest.fn();
            mockWebSocket.close = mockClose;
            
            apiService.disconnect();
            apiService.sendMessage('receiver', 'Should not send');
            expect(mockWebSocket.send).not.toHaveBeenCalled();
        });

        test('should convert boolean fields to proper format', () => {
            apiService.connect('sender');
            apiService.sendMessage('receiver', 'Message', {
                type: 'gift',
                payload: { gift: { name: 'Present' } }
            });
            
            const sentData = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
            expect(sentData.to).toBe('receiver');
            expect(sentData.content).toBe('Message');
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
        test('should add message listener', () => {
            apiService.connect('test-uid');
            const listener = jest.fn();
            apiService.onMessage(listener);
            
            mockWebSocket.onmessage({ data: JSON.stringify({ content: 'test' }) });
            expect(listener).toHaveBeenCalled();
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

    describe('message types', () => {
        test('should handle user messages', (done) => {
            apiService.connect('test-uid');
            apiService.onMessage((msg) => {
                expect(msg.type).toBe('user');
                expect(msg.senderId).toBe('user1');
                expect(msg.text).toBe('hello');
                done();
            });
            
            mockWebSocket.onmessage({ 
                data: JSON.stringify({ 
                    from: 'user1', 
                    content: 'hello',
                    type: 'user',
                    timestamp: '123'
                }) 
            });
        });

        test('should handle system messages', (done) => {
            apiService.connect('test-uid');
            apiService.onMessage((msg) => {
                expect(msg.type).toBe('system');
                done();
            });
            
            mockWebSocket.onmessage({ 
                data: JSON.stringify({ 
                    from: 'system', 
                    content: 'system notification',
                    type: 'system'
                }) 
            });
        });

        test('should handle order messages with payload', (done) => {
            apiService.connect('test-uid');
            apiService.onMessage((msg) => {
                expect(msg.type).toBe('order');
                expect(msg.payload).toBeDefined();
                expect(msg.payload.orderId).toBe('order-123');
                done();
            });
            
            mockWebSocket.onmessage({ 
                data: JSON.stringify({ 
                    from: 'user1', 
                    content: 'Order content',
                    type: 'order',
                    payload: { orderId: 'order-123', amount: 100 }
                }) 
            });
        });

        test('should handle gift messages', (done) => {
            apiService.connect('test-uid');
            apiService.onMessage((msg) => {
                expect(msg.type).toBe('gift');
                expect(msg.payload.gift).toBeDefined();
                done();
            });
            
            mockWebSocket.onmessage({ 
                data: JSON.stringify({ 
                    from: 'user1', 
                    content: ' Gift!',
                    type: 'gift',
                    payload: { gift: { name: 'Present', emoji: '??' } }
                }) 
            });
        });
    });

    describe('connection state', () => {
        test('should track multiple connect/disconnect cycles', () => {
            apiService.connect('uid-1');
            expect(WebSocket).toHaveBeenCalledTimes(1);
            
            apiService.disconnect();
            expect(mockWebSocket.close).toHaveBeenCalledTimes(1);
            
            apiService.connect('uid-2');
            expect(WebSocket).toHaveBeenCalledTimes(2);
        });
    });
});
