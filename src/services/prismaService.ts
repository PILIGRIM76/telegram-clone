// Prisma Service - PostgreSQL + Redis integration
// Для тестирования используется fallback на SQLite

import { sqliteStorage } from './sqliteStorage';
import Redis from 'ioredis';
import type { Message } from '../types';

type LocalMessageStatus = 'sent' | 'delivered' | 'read';

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

export const prismaService = {
  async saveMessage(chatId: string, sender: string, content: string, timestamp: number, isEncrypted: boolean = false) {
    const message = {
      id: crypto.randomUUID(),
      senderId: sender,
      text: content,
      timestamp: timestamp.toString(),
      type: 'user' as const,
      media: undefined,
      mediaType: undefined,
      status: 'sent' as LocalMessageStatus,
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

  async publishMessage(chatId: string, message: any) {
    if (redis) {
      await redis.publish('messages:' + chatId, JSON.stringify(message));
    }
  },

  async disconnect() {
    if (redis) {
      await redis.quit();
    }
  }
};

export default prismaService;
