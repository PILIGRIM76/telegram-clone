import Dexie, { Table } from 'dexie';

// Типы для IndexedDB
export interface StoredMessage {
  id: string;
  chatId: string; // uid контакта или group_id
  senderUid: string;
  content: string; // ЗАШИФРОВАННОЕ содержимое
  timestamp: number;
  type: 'text' | 'file' | 'voice';
  encryptedAttachments?: any[]; // зашифрованные файлы
  voiceMetadata?: any;
  reactions?: any[];
}

export interface CachedFile {
  id: string; // hash файла
  encryptedBlob: Blob;
  metadata: any;
  lastAccessed: number;
}

export interface ChatMetadata {
  chatId: string;
  lastMessageTimestamp: number;
  unreadCount: number;
}

class CipherLinkDatabase extends Dexie {
  messages!: Table<StoredMessage, string>;
  cachedFiles!: Table<CachedFile, string>;
  chatMetadata!: Table<ChatMetadata, string>;

  constructor() {
    super('CipherLinkDB');

    this.version(1).stores({
      messages: 'id, chatId, timestamp, [chatId+timestamp]', // составной индекс
      cachedFiles: 'id, lastAccessed',
      chatMetadata: 'chatId, lastMessageTimestamp'
    });
  }

  // Сохранить сообщение
  async saveMessage(message: StoredMessage): Promise<void> {
    await this.messages.put(message);
  }

  // Сохранить пачку сообщений
  async saveMessages(messages: StoredMessage[]): Promise<void> {
    await this.messages.bulkPut(messages);
  }

  // Получить историю чата с пагинацией
  async getMessages(
    chatId: string, 
    before?: number, // timestamp для пагинации
    limit: number = 50
  ): Promise<StoredMessage[]> {
    let query = this.messages
      .where('chatId')
      .equals(chatId);

    if (before) {
      query = query.and(msg => msg.timestamp < before);
    }

    return await query
      .reverse()
      .sortBy('timestamp')
      .then(msgs => msgs.slice(0, limit).reverse());
  }

  // Получить все чаты с последним сообщением
  async getChats(): Promise<ChatMetadata[]> {
    return await this.chatMetadata.toArray();
  }

  // Обновить метаданные чата
  async updateChatMetadata(chatId: string, updates: Partial<ChatMetadata>): Promise<void> {
    await this.chatMetadata.put({ chatId, ...updates } as ChatMetadata);
  }

  // Кэшировать файл
  async cacheFile(id: string, encryptedBlob: Blob, metadata: any): Promise<void> {
    await this.cachedFiles.put({
      id,
      encryptedBlob,
      metadata,
      lastAccessed: Date.now()
    });
  }

  // Получить кэшированный файл
  async getCachedFile(id: string): Promise<CachedFile | undefined> {
    const file = await this.cachedFiles.get(id);
    if (file) {
      // Обновить lastAccessed
      await this.cachedFiles.update(id, { lastAccessed: Date.now() });
    }
    return file;
  }

  // Очистить старые кэшированные файлы (старше 7 дней)
  async cleanupOldCache(): Promise<number> {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const deleted = await this.cachedFiles
      .where('lastAccessed')
      .below(weekAgo)
      .delete();
    return deleted;
  }

  // Удалить все данные (при logout)
  async clearAll(): Promise<void> {
    await this.messages.clear();
    await this.cachedFiles.clear();
    await this.chatMetadata.clear();
  }
}

export const db = new CipherLinkDatabase();

// Вспомогательная функция для шифрования при сохранении (использует Web Crypto API)
async function encryptForStorage(data: string, key: string): Promise<string> {
  // Используем Web Crypto API для AES-GCM шифрования
  const encoder = new TextEncoder();
  const keyBuffer = new TextEncoder().encode(key.slice(0, 32).padEnd(32, '0'));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoder.encode(data)
  );
  
  // Возвращаем iv + encrypted data как base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

// Вспомогательная функция для расшифровки при чтении
async function decryptFromStorage(encryptedData: string, key: string): Promise<string> {
  const combined = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  const keyBuffer = new TextEncoder().encode(key.slice(0, 32).padEnd(32, '0'));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  );
  
  return new TextDecoder().decode(decrypted);
}

// Миграция: перенос существующих данных из памяти в IndexedDB
export async function migrateFromMemory(
  memoryMessages: Map<string, any[]>,
  encryptionKey: string
): Promise<void> {
  const allMessages: StoredMessage[] = [];

  for (const [chatId, messages] of memoryMessages.entries()) {
    for (const msg of messages) {
      // Шифруем содержимое перед сохранением
      const encryptedContent = await encryptForStorage(msg.content || '', encryptionKey);
      
      allMessages.push({
        id: msg.id,
        chatId,
        senderUid: msg.senderUid,
        content: encryptedContent,
        timestamp: msg.timestamp,
        type: msg.type || 'text',
        encryptedAttachments: msg.encryptedAttachments,
        voiceMetadata: msg.voiceMetadata,
        reactions: msg.reactions
      });
    }
  }

  if (allMessages.length > 0) {
    await db.saveMessages(allMessages);
    console.log(`[Migration] Saved ${allMessages.length} messages to IndexedDB`);
  }
}

// Экспорт функций шифрования/расшифровки для использования в App.tsx
export { encryptForStorage, decryptFromStorage };