import { renderHook, act } from '@testing-library/react';
import { useCallTimer } from '../src/hooks/useCallTimer';

describe('useCallTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('должен начинать с 0 секунд и пустой строкой при isActive=false', () => {
    const { result } = renderHook(() => useCallTimer(false));

    expect(result.current.seconds).toBe(0);
    expect(result.current.formatted).toBe('00:00');
  });

  test('должен увеличивать счетчик каждую секунду при isActive=true', () => {
    const { result } = renderHook(() => useCallTimer(true));

    expect(result.current.seconds).toBe(0);

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current.seconds).toBe(1);
    expect(result.current.formatted).toBe('00:01');

    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(result.current.seconds).toBe(5);
    expect(result.current.formatted).toBe('00:05');

    act(() => {
      jest.advanceTimersByTime(55000);
    });
    expect(result.current.seconds).toBe(60);
    expect(result.current.formatted).toBe('01:00');
  });

  test('должен останавливаться при isActive=false', () => {
    const { result, rerender } = renderHook(
      ({ isActive }) => useCallTimer(isActive),
      { initialProps: { isActive: true } }
    );

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current.seconds).toBe(5);

    // Останавливаем таймер
    rerender({ isActive: false });

    act(() => {
      jest.advanceTimersByTime(10000);
    });
    // Счетчик не должен увеличиться
    expect(result.current.seconds).toBe(5);
  });

  test('должен сбрасываться при вызове reset()', () => {
    const { result } = renderHook(() => useCallTimer(true));

    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(result.current.seconds).toBe(10);

    act(() => {
      result.current.reset();
    });
    expect(result.current.seconds).toBe(0);
    expect(result.current.formatted).toBe('00:00');
  });

  test('должен форматировать время с часами при > 3600 секунд', () => {
    const { result } = renderHook(() => useCallTimer(true));

    act(() => {
      jest.advanceTimersByTime(3661000); // 1 час, 1 минута, 1 секунда
    });

    expect(result.current.seconds).toBe(3661);
    expect(result.current.formatted).toBe('01:01:01');
  });
});