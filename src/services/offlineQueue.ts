import { logger } from './logger';
// Phase 3: Offline message queue — IndexedDB persistence.
// Сервер НЕ хранит сообщения (Dumb Server principle).
// Клиент сам хранит недоставленные сообщения в IndexedDB
// и ретраит при reconnect получателя.

import { openDB, type IDBPDatabase } from 'idb';

export interface QueuedMessage {
  /** UUID сообщения. */
  id: string;
  /** UID получателя. */
  recipientUid: string;
  /** Полный WS payload (JSON-сериализуемый). */
  payload: any;
  /** Timestamp создания (для сортировки FIFO). */
  timestamp: number;
  /** Сколько раз уже пытались отправить. */
  retryCount: number;
  /** Последняя ошибка при retry (для отладки). */
  lastError?: string;
  /** Тип: direct или group. */
  type?: 'direct' | 'group';
}

const DB_NAME = 'piligrim-offline-queue';
const DB_VERSION = 1;
const STORE_NAME = 'messages';
const MAX_RETRY_COUNT = 3;

export class OfflineQueue {
  private db: IDBPDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Инициализирует IndexedDB. Идемпотентно — безопасно вызывать многократно.
   */
  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      this.db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db: any) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            // Индекс по timestamp для эффективной FIFO выборки.
            store.createIndex('byTimestamp', 'timestamp', { unique: false });
          }
        },
      });
      logger.info('[OfflineQueue] IndexedDB initialized:', DB_NAME);
    })();
    return this.initPromise;
  }

  /**
   * Добавляет сообщение в очередь (или обновляет существующее).
   */
  async enqueue(msg: QueuedMessage): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('[OfflineQueue] DB not initialized');
    await this.db.put(STORE_NAME, msg);
    logger.info(`[OfflineQueue] Enqueued: ${msg.id} → ${msg.recipientUid}`);
  }

  /**
   * Возвращает все сообщения из очереди, отсортированные по timestamp (FIFO).
   */
  async dequeue(): Promise<QueuedMessage[]> {
    await this.init();
    if (!this.db) throw new Error('[OfflineQueue] DB not initialized');
    const messages = await this.db.getAll(STORE_NAME);
    return messages.sort((a: QueuedMessage, b: QueuedMessage) => a.timestamp - b.timestamp);
  }

  /**
   * Удаляет сообщение по ID.
   */
  async remove(id: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('[OfflineQueue] DB not initialized');
    await this.db.delete(STORE_NAME, id);
    logger.info(`[OfflineQueue] Removed: ${id}`);
  }

  /**
   * Очищает всю очередь.
   */
  async clear(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('[OfflineQueue] DB not initialized');
    await this.db.clear(STORE_NAME);
    logger.info('[OfflineQueue] Queue cleared');
  }

  /**
   * Возвращает количество сообщений в очереди.
   */
  async count(): Promise<number> {
    await this.init();
    if (!this.db) throw new Error('[OfflineQueue] DB not initialized');
    return await this.db.count(STORE_NAME);
  }

  /**
   * Обновляет retry counter и lastError.
   */
  async updateRetry(id: string, retryCount: number, lastError?: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('[OfflineQueue] DB not initialized');
    const msg = await this.db.get(STORE_NAME, id);
    if (msg) {
      msg.retryCount = retryCount;
      msg.lastError = lastError;
      await this.db.put(STORE_NAME, msg);
    }
  }

  /**
   * Обрабатывает очередь: пытается отправить каждое сообщение через WebSocket.
   * Если получатель снова offline — увеличивает retryCount.
   * Если retryCount >= MAX_RETRY_COUNT — удаляет сообщение с ошибкой.
   *
   * @param sendFn функция отправки (должна throw если recipient offline)
   */
  async processQueue(
    sendFn: (payload: any) => Promise<void> | void,
  ): Promise<{ sent: number; failed: number; retried: number }> {
    const messages = await this.dequeue();
    if (messages.length === 0) {
      return { sent: 0, failed: 0, retried: 0 };
    }

    logger.info(`[OfflineQueue] Processing ${messages.length} queued messages`);
    let sent = 0;
    let failed = 0;
    let retried = 0;

    for (const msg of messages) {
      try {
        await sendFn(msg.payload);
        await this.remove(msg.id);
        sent++;
        logger.info(`[OfflineQueue] Sent: ${msg.id}`);
      } catch (e: any) {
        const errorMsg = e?.message || String(e);
        const newRetryCount = msg.retryCount + 1;
        if (newRetryCount >= MAX_RETRY_COUNT) {
          await this.remove(msg.id);
          failed++;
          logger.error(`[OfflineQueue] Failed after ${MAX_RETRY_COUNT} retries: ${msg.id}`, errorMsg);
        } else {
          await this.updateRetry(msg.id, newRetryCount, errorMsg);
          retried++;
          logger.warn(`[OfflineQueue] Retry ${newRetryCount}/${MAX_RETRY_COUNT} for ${msg.id}: ${errorMsg}`);
        }
      }
    }

    logger.info(`[OfflineQueue] Done: sent=${sent}, retried=${retried}, failed=${failed}`);
    return { sent, failed, retried };
  }

  /**
   * Возвращает singleton instance.
   */
  static instance(): OfflineQueue {
    if (!offlineQueueInstance) {
      offlineQueueInstance = new OfflineQueue();
    }
    return offlineQueueInstance;
  }
}

let offlineQueueInstance: OfflineQueue | null = null;
export const offlineQueue = OfflineQueue.instance();