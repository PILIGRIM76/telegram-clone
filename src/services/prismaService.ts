// Prisma Service - PostgreSQL + Redis integration
// Phase 9.5 fix: для browser bundle мы не используем PrismaClient напрямую
// (это Node.js only). В браузере/Capacitor возвращаем пустые массивы/объекты.
// Реальная серверная часть (Prisma + Redis) работает в Node.js процессе.

import { sqliteStorage } from './sqliteStorage';
import type { Message } from '../types';

export const prismaService = {
  async saveMessage(chatId: string, sender: string, content: string, timestamp: number, isEncrypted: boolean = false) {
    const message = {
      id: (typeof crypto !== 'undefined' && (crypto as any).randomUUID)
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
      timerSetAt: undefined
    } as Message;
    // fallback на SQLite для разработки
    return await sqliteStorage.saveMessage(message, chatId);
  },

  async loadMessages(chatId: string, limit: number = 50, offset: number = 0) {
    // fallback на SQLite для разработки
    return await sqliteStorage.loadMessages(chatId, limit, offset);
  },

  async publishMessage(_chatId: string, _message: any) {
    // Redis pub/sub недоступен в браузере
  },

  async disconnect() {
    // no-op в браузере
  },

  async saveCall(_data: {
    callerId: string;
    receiverId: string;
    callType: string;
    status: string;
    duration: number;
  }) {
    // Phase 9.5: PrismaClient недоступен в browser bundle
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
  }
};

export default prismaService;
