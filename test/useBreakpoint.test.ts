// v3.0 Phase 2B-1: useBreakpoint tests
// 3 breakpoints: mobile (≤640), tablet (641–1024), desktop (>1024)

import { renderHook, act } from '@testing-library/react';
import { useBreakpoint } from '../src/hooks/useBreakpoint';

describe('useBreakpoint', () => {
  const setWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: width,
    });
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
  };

  it('returns mobile for width ≤ 640', () => {
    setWidth(360);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe('mobile');
  });

  it('returns mobile at boundary 640', () => {
    setWidth(640);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe('mobile');
  });

  it('returns tablet for 641–1024', () => {
    setWidth(800); // RT9 actual width
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe('tablet');
  });

  it('returns tablet at boundary 1024', () => {
    setWidth(1024);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe('tablet');
  });

  it('returns desktop for width > 1024', () => {
    setWidth(1280);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe('desktop');
  });

  it('updates on resize event', () => {
    setWidth(1280);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe('desktop');

    setWidth(800);
    expect(result.current).toBe('tablet');

    setWidth(400);
    expect(result.current).toBe('mobile');
  });

  it('removes resize listener on unmount', () => {
    const removeSpy = jest.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useBreakpoint());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    removeSpy.mockRestore();
  });
});