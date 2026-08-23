// Prisma Service - PostgreSQL + Redis integration
// Для тестирования используется fallback на SQLite

import { sqliteStorage } from './sqliteStorage';
import Redis from 'ioredis';
import type { Message } from '../types';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

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

  async publishMessage(chatId: string, message: any) {
    if (redis) {
      await redis.publish('messages:' + chatId, JSON.stringify(message));
    }
  },

  async disconnect() {
    if (redis) {
      await redis.quit();
    }
  },

  async saveCall(data: {
    callerId: string;
    receiverId: string;
    callType: string;
    status: string;
    duration: number;
  }) {
    return await prisma.call.create({
      data: {
        callerId: data.callerId,
        receiverId: data.receiverId,
        callType: data.callType,
        status: data.status,
        duration: data.duration
      }
    });
  },

  async getCallHistory(userId: string, limit: number = 50, offset: number = 0) {
    return await prisma.call.findMany({
      where: {
        OR: [
          { callerId: userId },
          { receiverId: userId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });
  },

  async getMissedCalls(userId: string) {
    return await prisma.call.findMany({
      where: {
        receiverId: userId,
        status: 'missed'
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  async getCallsWithUser(userId: string, partnerId: string) {
    return await prisma.call.findMany({
      where: {
        OR: [
          { callerId: userId, receiverId: partnerId },
          { callerId: partnerId, receiverId: userId }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
  }
};

export default prismaService;
