/**
 * Tests for useTypingIndicator hook
 */

import { renderHook, act } from '@testing-library/react';
import { useTypingIndicator } from '../src/hooks/useTypingIndicator';

// Mock apiService
jest.mock('../src/services/apiService', () => ({
  apiService: {
    onTypingUpdate: jest.fn((cb) => { 
      // Store callback for testing
      (global as any).__typingUpdateCallback = cb;
      return () => {};
    }),
    offTypingUpdate: jest.fn(),
    sendTypingStart: jest.fn(),
    sendTypingStop: jest.fn(),
    getCurrentUid: jest.fn(() => 'current-user-uid'),
  },
}));

const { apiService } = require('../src/services/apiService');

describe('useTypingIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should initialize with isTyping false', () => {
    const { result } = renderHook(() => useTypingIndicator('chat-123'));
    expect(result.current.isTyping).toBe(false);
  });

  test('should call sendTypingStart on onInputChange', () => {
    const { result } = renderHook(() => useTypingIndicator('chat-123'));
    
    act(() => {
      result.current.onInputChange();
    });

    expect(apiService.sendTypingStart).toHaveBeenCalledWith('chat-123');
  });

  test('should debounce typing stop', () => {
    const { result } = renderHook(() => useTypingIndicator('chat-123'));
    
    act(() => {
      result.current.onInputChange();
    });

    expect(apiService.sendTypingStart).toHaveBeenCalledTimes(1);

    // Advance time by 1 second - should not send stop yet
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(apiService.sendTypingStop).not.toHaveBeenCalled();

    // Advance time by another 1.5 seconds (total 2.5s > 2s debounce)
    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(apiService.sendTypingStop).toHaveBeenCalledWith('chat-123');
  });

  test('should immediately stop typing on onMessageSent', () => {
    const { result } = renderHook(() => useTypingIndicator('chat-123'));
    
    act(() => {
      result.current.onInputChange();
    });

    expect(apiService.sendTypingStart).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.onMessageSent();
    });

    expect(apiService.sendTypingStop).toHaveBeenCalledWith('chat-123');
    // Debounce timer should be cleared
  });

  test('should update isTyping when receiving typing_update event', () => {
    const { result } = renderHook(() => useTypingIndicator('chat-123'));
    
    // Simulate receiving typing update from another user
    const callback = (global as any).__typingUpdateCallback;
    
    act(() => {
      callback({ uid: 'other-user', chatId: 'chat-123', isTyping: true });
    });

    expect(result.current.isTyping).toBe(true);

    act(() => {
      callback({ uid: 'other-user', chatId: 'chat-123', isTyping: false });
    });

    expect(result.current.isTyping).toBe(false);
  });

  test('should not update isTyping for different chatId', () => {
    const { result } = renderHook(() => useTypingIndicator('chat-123'));
    const callback = (global as any).__typingUpdateCallback;
    
    act(() => {
      callback({ uid: 'other-user', chatId: 'chat-456', isTyping: true });
    });

    expect(result.current.isTyping).toBe(false);
  });

  test('should not update isTyping for own uid', () => {
    const { result } = renderHook(() => useTypingIndicator('chat-123'));
    const callback = (global as any).__typingUpdateCallback;
    
    act(() => {
      callback({ uid: 'current-user-uid', chatId: 'chat-123', isTyping: true });
    });

    expect(result.current.isTyping).toBe(false);
  });

  test('should auto-clear typing after 5 seconds', () => {
    const { result } = renderHook(() => useTypingIndicator('chat-123'));
    const callback = (global as any).__typingUpdateCallback;
    
    act(() => {
      callback({ uid: 'other-user', chatId: 'chat-123', isTyping: true });
    });

    expect(result.current.isTyping).toBe(true);

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.isTyping).toBe(false);
  });
});