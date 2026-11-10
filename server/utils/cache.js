// server/utils/cache.js
// Простой LRU-кеш с TTL (Time-To-Live) для кэширования запросов к БД.
// Уменьшает нагрузку на SQLite при частых чтениях профилей и контактов пользователей.

/**
 * Запись кеша с истечением по времени.
 * @typedef {Object} CacheEntry
 * @property {any} value — сохранённое значение
 * @property {number} expiry — timestamp истечения (ms)
 */

/**
 * LRU Cache с поддержкой TTL.
 * Когда кеш достигает maxSize, самая старая запись удаляется.
 * Записи с истёкшим TTL считаются невалидными.
 */
class TTLCache {
  /**
   * @param {number} maxSize — максимальное количество записей в кеше
   * @param {number} ttlMs — время жизни записи в миллисекундах
   */
  constructor(maxSize = 500, ttlMs = 5 * 60 * 1000) {
    /** @type {Map<string, CacheEntry>} */
    this._map = new Map();
    this._maxSize = maxSize;
    this._ttlMs = ttlMs;
  }

  /**
   * Получает значение по ключу. Возвращает undefined, если записи нет или TTL истёк.
   * @param {string} key
   * @returns {any | undefined}
   */
  get(key) {
    const entry = this._map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiry) {
      this._map.delete(key);
      return undefined;
    }
    // Перемещаем в конец (самое récemment использованное)
    this._map.delete(key);
    this._map.set(key, entry);
    return entry.value;
  }

  /**
   * Сохраняет значение по ключу с TTL.
   * @param {string} key
   * @param {any} value
   */
  set(key, value) {
    if (this._map.has(key)) {
      this._map.delete(key);
    } else if (this._map.size >= this._maxSize) {
      // Удаляем самую старую запись (первую в Map)
      const firstKey = this._map.keys().next().value;
      this._map.delete(firstKey);
    }
    this._map.set(key, {
      value,
      expiry: Date.now() + this._ttlMs,
    });
  }

  /**
   * Удаляет запись по ключу.
   * @param {string} key
   * @returns {boolean}
   */
  delete(key) {
    return this._map.delete(key);
  }

  /**
   * Очищает все записи.
   */
  clear() {
    this._map.clear();
  }

  /**
   * Возвращает текущий размер кеша.
   * @returns {number}
   */
  size() {
    return this._map.size;
  }
}

// Экземпляр кеша для профилей пользователей (5 минут TTL, до 500 записей)
const userProfileCache = new TTLCache(500, 5 * 60 * 1000);

// Экземпляр кеша для списков контактов (5 минут TTL, до 200 записей)
const contactsCache = new TTLCache(200, 5 * 60 * 1000);

module.exports = {
  TTLCache,
  userProfileCache,
  contactsCache,
};