import Database from 'better-sqlite3';
import type { Message } from '../types';

class SqliteStorage {
  private db: Database.Database | null = null;
  private initialized = false;

  init() {
    if (this.initialized) return;
    
    this.db = new Database('cipherlink.db');
    
    // Создаём таблицу сообщений
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        text TEXT,
        timestamp INTEGER NOT NULL,
        status TEXT,
        type TEXT,
        media TEXT,
        mediaType TEXT,
        disappearIn INTEGER,
        timerSetAt INTEGER
      );
    `);
    
    // Индексы для оптимизации
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_chat_timestamp ON messages(chat_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
    `);
    
    this.initialized = true;
  }

  // Загрузка сообщений с пагинацией
  async loadMessages(chatId: string, limit: number = 50, offset: number = 0): Promise<Message[]> {
    if (!this.db) return [];
    
    const stmt = this.db.prepare(`
      SELECT * FROM messages 
      WHERE chat_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `);
    
    const rows = stmt.all(chatId, limit, offset) as Message[];
    // Возвращаем в хронологическом порядке (старые сверху)
    return rows.reverse();
  }

  // Сохранение сообщения
  saveMessage(message: Message, chatId: string) {
    if (!this.db) return;
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO messages 
      (id, chat_id, sender_id, text, timestamp, status, type, media, mediaType, disappearIn, timerSetAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      message.id,
      chatId,
      message.senderId,
      message.text,
      message.timestamp,
      message.status,
      message.type,
      message.media || null,
      message.mediaType || null,
      message.disappearIn || null,
      message.timerSetAt || null
    );
  }

  // Удаление сообщения
  deleteMessage(id: string) {
    if (!this.db) return;
    const stmt = this.db.prepare('DELETE FROM messages WHERE id = ?');
    stmt.run(id);
  }

  // Очистка старых сообщений
  clearMessages(olderThan: number) {
    if (!this.db) return;
    const stmt = this.db.prepare('DELETE FROM messages WHERE timestamp < ?');
    stmt.run(olderThan);
  }
}

export const sqliteStorage = new SqliteStorage();
