// Сервис доступа к PostgreSQL и Redis через Prisma.
// Исправление для браузерной сборки: PrismaClient нельзя использовать напрямую.
// Prisma работает только в Node.js; браузер и Capacitor используют локальное хранилище и резервные значения.
// Реальная серверная часть (Prisma + Redis) работает в Node.js процессе.

import type { Message } from '../types';
import { sqliteStorage } from './sqliteStorage';

export const prismaService = {
  async saveMessage(
    chatId: string,
    sender: string,
    content: string,
    timestamp: number,
    isEncrypted: boolean = false
  ) {
    const message = {
      id:
        typeof crypto !== 'undefined' && (crypto as any).randomUUID
          ? (crypto as any).randomUUID()
          : 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2),
      senderId: sender,
      text: content,
      timestamp: timestamp.toString(),
      type: 'user' as const,
      media: undefined,
      mediaType: undefined,
      status: 'sent' as const,
      disappearIn: undefined,
      timerSetAt: undefined,
    } as Message;
    // При разработке используем SQLite как запасное хранилище.
    return await sqliteStorage.saveMessage(message, chatId);
  },

  async loadMessages(chatId: string, limit: number = 50, offset: number = 0) {
    // При разработке используем SQLite как запасное хранилище.
    return await sqliteStorage.loadMessages(chatId, limit, offset);
  },

  async publishMessage(_chatId: string, _message: any) {
    // Redis pub/sub недоступен в браузере
  },

  async disconnect() {
    // В браузере действие не требуется.
  },

  async saveCall(_data: {
    callerId: string;
    receiverId: string;
    callType: string;
    status: string;
    duration: number;
  }) {
    // PrismaClient недоступен в браузерной сборке.
    return { id: 'browser-stub' } as any;
  },

  async getCallHistory(_userId: string, _limit: number = 50, _offset: number = 0) {
    return [] as any[];
  },

  async getMissedCalls(_userId: string) {
    return [] as any[];
  },

  async getCallsWithUser(_userId: string, _partnerId: string) {
    return [] as any[];
  },
};

export default prismaService;
