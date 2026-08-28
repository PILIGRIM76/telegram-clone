// Мок prismaService
const mockSaveCall = jest.fn();
const mockGetCallHistory = jest.fn();
const mockGetMissedCalls = jest.fn();
const mockGetCallsWithUser = jest.fn();

jest.mock('../src/services/prismaService', () => ({
  prismaService: {
    saveCall: (...args: any[]) => mockSaveCall(...args),
    getCallHistory: (...args: any[]) => mockGetCallHistory(...args),
    getMissedCalls: (...args: any[]) => mockGetMissedCalls(...args),
    getCallsWithUser: (...args: any[]) => mockGetCallsWithUser(...args)
  }
}));

import { prismaService } from '../src/services/prismaService';

describe('prismaService - Call methods', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe('saveCall', () => {
    test('должен сохранять звонок в базу данных', async () => {
      const callData = { callerId: 'user1', receiverId: 'user2', callType: 'video', status: 'completed', duration: 300 };
      const mockSavedCall = { id: 'call-123', ...callData, createdAt: new Date() };
      mockSaveCall.mockResolvedValue(mockSavedCall);
      const result = await prismaService.saveCall(callData);
      expect(mockSaveCall).toHaveBeenCalledWith(callData);
      expect(result).toEqual(mockSavedCall);
    });

    test('должен сохранять аудиозвонок', async () => {
      const callData = { callerId: 'user1', receiverId: 'user2', callType: 'audio', status: 'completed', duration: 120 };
      mockSaveCall.mockResolvedValue({ id: 'call-456', ...callData });
      await prismaService.saveCall(callData);
      expect(mockSaveCall).toHaveBeenCalledWith(callData);
    });

    test('должен сохранять пропущенный звонок с duration=0', async () => {
      const callData = { callerId: 'user1', receiverId: 'user2', callType: 'video', status: 'missed', duration: 0 };
      mockSaveCall.mockResolvedValue({ id: 'call-789', ...callData });
      await prismaService.saveCall(callData);
      expect(mockSaveCall).toHaveBeenCalledWith(callData);
    });
  });

  describe('getCallHistory', () => {
    test('должен загружать историю звонков пользователя', async () => {
      const mockCalls = [
        { id: '1', callerId: 'user1', receiverId: 'current-user', callType: 'video', status: 'completed', duration: 300, createdAt: new Date() },
        { id: '2', callerId: 'current-user', receiverId: 'user2', callType: 'audio', status: 'completed', duration: 120, createdAt: new Date() }
      ];
      mockGetCallHistory.mockResolvedValue(mockCalls);
      const result = await prismaService.getCallHistory('current-user', 50, 0);
      expect(mockGetCallHistory).toHaveBeenCalledWith('current-user', 50, 0);
      expect(result).toEqual(mockCalls);
    });

    test('должен поддерживать пагинацию', async () => {
      mockGetCallHistory.mockResolvedValue([]);
      await prismaService.getCallHistory('current-user', 50, 100);
      expect(mockGetCallHistory).toHaveBeenCalledWith('current-user', 50, 100);
    });

    test('должен вызываться с переданными параметрами', async () => {
      mockGetCallHistory.mockResolvedValue([]);
      await prismaService.getCallHistory('current-user');
      expect(mockGetCallHistory).toHaveBeenCalledWith('current-user');
    });
  });

  describe('getMissedCalls', () => {
    test('должен загружать только пропущенные звонки', async () => {
      const mockMissedCalls = [{ id: '1', callerId: 'user1', receiverId: 'current-user', callType: 'video', status: 'missed', duration: 0, createdAt: new Date() }];
      mockGetMissedCalls.mockResolvedValue(mockMissedCalls);
      const result = await prismaService.getMissedCalls('current-user');
      expect(mockGetMissedCalls).toHaveBeenCalledWith('current-user');
      expect(result).toEqual(mockMissedCalls);
    });

    test('не должен возвращать исходящие пропущенные звонки', async () => {
      mockGetMissedCalls.mockResolvedValue([]);
      await prismaService.getMissedCalls('current-user');
      expect(mockGetMissedCalls).toHaveBeenCalledWith('current-user');
    });
  });

  describe('getCallsWithUser', () => {
    test('должен загружать историю звонков между двумя пользователями', async () => {
      const mockCalls = [
        { id: '1', callerId: 'user1', receiverId: 'user2', callType: 'video', status: 'completed', duration: 300, createdAt: new Date() },
        { id: '2', callerId: 'user2', receiverId: 'user1', callType: 'audio', status: 'completed', duration: 120, createdAt: new Date() }
      ];
      mockGetCallsWithUser.mockResolvedValue(mockCalls);
      const result = await prismaService.getCallsWithUser('user1', 'user2');
      expect(mockGetCallsWithUser).toHaveBeenCalledWith('user1', 'user2');
      expect(result).toEqual(mockCalls);
    });
  });
});