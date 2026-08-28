import { renderHook, act, waitFor } from '@testing-library/react';
import { useCallHistory, useMissedCalls } from '../src/hooks/useCallHistory';
import { prismaService } from '../src/services/prismaService';

jest.mock('../src/services/prismaService', () => ({
  prismaService: { getCallHistory: jest.fn(), getMissedCalls: jest.fn() }
}));

const mockPrismaService = prismaService as jest.Mocked<typeof prismaService>;
const createDate = (dateStr: string) => new Date(dateStr);

describe('useCallHistory', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('должен загружать историю звонков при монтировании', async () => {
    const mockCalls = [
      { id: '1', callerId: 'user1', receiverId: 'current-user', callType: 'video', status: 'completed', duration: 300, createdAt: createDate('2026-08-29T10:00:00.000Z') },
      { id: '2', callerId: 'current-user', receiverId: 'user2', callType: 'audio', status: 'completed', duration: 120, createdAt: createDate('2026-08-29T09:00:00.000Z') }
    ] as any;
    (mockPrismaService.getCallHistory as jest.Mock).mockResolvedValue(mockCalls);
    const { result } = renderHook(() => useCallHistory('current-user'));
    await waitFor(() => { expect(result.current.loading).toBe(false); });
    expect(result.current.calls.length).toBe(2);
    expect(mockPrismaService.getCallHistory).toHaveBeenCalledWith('current-user', 50, 0);
  });

  test('должен загружать следующую порцию при вызове loadMore', async () => {
    const firstBatch = Array(50).fill(null).map((_, i) => ({ id: 'call-' + i, callerId: 'user1', receiverId: 'current-user', callType: 'video', status: 'completed', duration: 60, createdAt: createDate('2026-08-29T10:00:00.000Z') }));
    const secondBatch = Array(30).fill(null).map((_, i) => ({ id: 'call-' + (50 + i), callerId: 'user2', receiverId: 'current-user', callType: 'audio', status: 'completed', duration: 45, createdAt: createDate('2026-08-28T10:00:00.000Z') }));
    (mockPrismaService.getCallHistory as jest.Mock).mockResolvedValueOnce(firstBatch as any).mockResolvedValueOnce(secondBatch as any);
    const { result } = renderHook(() => useCallHistory('current-user'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.calls.length).toBe(50);
    expect(result.current.hasMore).toBe(true);
    await act(async () => { result.current.loadMore(); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.calls.length).toBe(80);
    expect(result.current.hasMore).toBe(false);
    expect(mockPrismaService.getCallHistory).toHaveBeenCalledWith('current-user', 50, 50);
  });

  test('должен устанавливать hasMore=false если получено меньше 50 звонков', async () => {
    const mockCalls = Array(20).fill(null).map((_, i) => ({ id: 'call-' + i, callerId: 'user1', receiverId: 'current-user', callType: 'video', status: 'completed', duration: 60, createdAt: createDate('2026-08-29T10:00:00.000Z') }));
    (mockPrismaService.getCallHistory as jest.Mock).mockResolvedValue(mockCalls as any);
    const { result } = renderHook(() => useCallHistory('current-user'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.calls.length).toBe(20);
    expect(result.current.hasMore).toBe(false);
  });

  test('должен обрабатывать ошибки загрузки', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    (mockPrismaService.getCallHistory as jest.Mock).mockRejectedValue(new Error('Database error'));
    const { result } = renderHook(() => useCallHistory('current-user'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.calls).toEqual([]);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  test('должен обновлять список при вызове refresh', async () => {
    const initialCalls = [{ id: '1', callerId: 'user1', receiverId: 'current-user', callType: 'video', status: 'completed', duration: 300, createdAt: createDate('2026-08-29T10:00:00.000Z') }];
    const updatedCalls = [initialCalls[0], { id: '2', callerId: 'current-user', receiverId: 'user2', callType: 'audio', status: 'completed', duration: 120, createdAt: createDate('2026-08-29T11:00:00.000Z') }];
    (mockPrismaService.getCallHistory as jest.Mock).mockResolvedValueOnce(initialCalls as any).mockResolvedValueOnce(updatedCalls as any);
    const { result } = renderHook(() => useCallHistory('current-user'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.calls.length).toBe(1);
    await act(async () => { result.current.refresh(); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.calls.length).toBe(2);
  });
});

describe('useMissedCalls', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('должен загружать только пропущенные звонки', async () => {
    const mockMissedCalls = [
      { id: '1', callerId: 'user1', receiverId: 'current-user', callType: 'video', status: 'missed', duration: 0, createdAt: createDate('2026-08-29T10:00:00.000Z') },
      { id: '2', callerId: 'user2', receiverId: 'current-user', callType: 'audio', status: 'missed', duration: 0, createdAt: createDate('2026-08-29T09:00:00.000Z') }
    ] as any;
    (mockPrismaService.getMissedCalls as jest.Mock).mockResolvedValue(mockMissedCalls);
    const { result } = renderHook(() => useMissedCalls('current-user'));
    await waitFor(() => { expect(result.current.loading).toBe(false); });
    expect(result.current.missedCalls.length).toBe(2);
    expect(mockPrismaService.getMissedCalls).toHaveBeenCalledWith('current-user');
  });

  test('должен обновлять пропущенные звонки при вызове refresh', async () => {
    const initialMissed = [{ id: '1', callerId: 'user1', receiverId: 'current-user', callType: 'video', status: 'missed', duration: 0, createdAt: createDate('2026-08-29T10:00:00.000Z') }];
    const updatedMissed = [initialMissed[0], { id: '2', callerId: 'user2', receiverId: 'current-user', callType: 'audio', status: 'missed', duration: 0, createdAt: createDate('2026-08-29T11:00:00.000Z') }];
    (mockPrismaService.getMissedCalls as jest.Mock).mockResolvedValueOnce(initialMissed as any).mockResolvedValueOnce(updatedMissed as any);
    const { result } = renderHook(() => useMissedCalls('current-user'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.missedCalls.length).toBe(1);
    await act(async () => { result.current.refresh(); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.missedCalls.length).toBe(2);
  });
});
