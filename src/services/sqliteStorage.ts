// better-sqlite3 из Node.js не работает в Capacitor WebView.
// Используем временную заглушку в памяти без постоянного хранения.
import type { Message } from '../types';

class SqliteStorage {
  private initialized = false;
  private memStore: Map<string, Message[]> = new Map();

  init(): void {
    if (this.initialized) return;
    this.initialized = true;
  }

  async loadMessages(chatId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    const msgs = this.memStore.get(chatId) || [];
    return msgs.slice(offset, offset + limit);
  }

  async saveMessage(message: Message, chatId: string): Promise<void> {
    if (!this.memStore.has(chatId)) this.memStore.set(chatId, []);
    this.memStore.get(chatId)!.push(message);
  }

  async deleteMessage(id: string): Promise<void> {
    for (const [chatId, msgs] of this.memStore.entries()) {
      this.memStore.set(
        chatId,
        msgs.filter(m => (m as any).id !== id)
      );
    }
  }

  async clearMessages(olderThan: number): Promise<void> {
    for (const [chatId, msgs] of this.memStore.entries()) {
      this.memStore.set(
        chatId,
        msgs.filter(m => Number((m as any).timestamp) >= olderThan)
      );
    }
  }
}

export const sqliteStorage = new SqliteStorage();
