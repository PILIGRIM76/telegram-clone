// v3.0 Logout: тесты useLogout хука.

import { renderHook, act } from '@testing-library/react';
import { useLogout } from '../src/hooks/useLogout';

describe('useLogout', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('removes piligrim-identity from localStorage', () => {
    localStorage.setItem('piligrim-identity', JSON.stringify({ uid: 'test' }));
    const { result } = renderHook(() => useLogout());
    // Prevent reload by overriding window.location
    delete (window as any).location;
    (window as any).location = { reload: jest.fn() };

    act(() => {
      result.current();
    });

    expect(localStorage.getItem('piligrim-identity')).toBeNull();
  });

  it('keeps contacts/chats/groups when clearData is false', () => {
    localStorage.setItem('piligrim-identity', 'x');
    localStorage.setItem('piligrim-contacts', 'contacts');
    localStorage.setItem('piligrim-chats', 'chats');
    const { result } = renderHook(() => useLogout({ clearData: false }));
    (window as any).location = { reload: jest.fn() };

    act(() => {
      result.current();
    });

    expect(localStorage.getItem('piligrim-identity')).toBeNull();
    expect(localStorage.getItem('piligrim-contacts')).toBe('contacts');
    expect(localStorage.getItem('piligrim-chats')).toBe('chats');
  });

  it('clears contacts/chats/groups when clearData is true', () => {
    localStorage.setItem('piligrim-identity', 'x');
    localStorage.setItem('piligrim-contacts', 'contacts');
    localStorage.setItem('piligrim-chats', 'chats');
    localStorage.setItem('piligrim-groups', 'groups');
    const { result } = renderHook(() => useLogout({ clearData: true }));
    (window as any).location = { reload: jest.fn() };

    act(() => {
      result.current();
    });

    expect(localStorage.getItem('piligrim-identity')).toBeNull();
    expect(localStorage.getItem('piligrim-contacts')).toBeNull();
    expect(localStorage.getItem('piligrim-chats')).toBeNull();
    expect(localStorage.getItem('piligrim-groups')).toBeNull();
  });

  it('invokes onLogout callback', () => {
    const onLogout = jest.fn();
    localStorage.setItem('piligrim-identity', 'x');
    const { result } = renderHook(() => useLogout({ onLogout }));
    (window as any).location = { reload: jest.fn() };

    act(() => {
      result.current();
    });

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('closes existing WebSocket connection', () => {
    const close = jest.fn();
    (window as any).__piligrim_ws = { close };
    localStorage.setItem('piligrim-identity', 'x');
    const { result } = renderHook(() => useLogout());
    (window as any).location = { reload: jest.fn() };

    act(() => {
      result.current();
    });

    expect(close).toHaveBeenCalled();
  });
});