-- Миграция: Создание начальной схемы базы данных
-- Дата: 2026-01-17

-- Пользователи
CREATE TABLE IF NOT EXISTS пользователи (
    uid TEXT PRIMARY KEY,
    публичныйКлюч TEXT NOT NULL,
    приватныйКлюч TEXT NOT NULL,
    имяПользователя TEXT,
    аватар TEXT,
    отпечатокКлюча TEXT,
    магазин TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
);

-- Группы
CREATE TABLE IF NOT EXISTS группы (
    id TEXT PRIMARY KEY,
    название TEXT NOT NULL,
    участники TEXT, -- JSON массив UID
    idВладельца TEXT NOT NULL,
    тип TEXT NOT NULL CHECK (тип IN ('публичная', 'приватная')),
    токенПриглашения TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
);

-- Сообщения
CREATE TABLE IF NOT EXISTS сообщения (
    id TEXT PRIMARY KEY,
    idОтправителя TEXT NOT NULL,
    текст TEXT,
    временнаяМетка TEXT NOT NULL,
    статус TEXT DEFAULT 'отправлено',
    idГруппы TEXT,
    тип TEXT DEFAULT 'пользовательское',
    media TEXT,
    mediaType TEXT,
    времяИсчезновения INTEGER,
    таймерУстановленВ INTEGER,
    payload TEXT, -- JSON
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (idОтправителя) REFERENCES пользователи(uid),
    FOREIGN KEY (idГруппы) REFERENCES группы(id)
);

-- Офлайн-сообщения
CREATE TABLE IF NOT EXISTS офлайн_сообщения (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid TEXT NOT NULL,
    сообщения TEXT, -- JSON массив сообщений
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now')),
    UNIQUE(uid)
);

-- Товары в магазинах
CREATE TABLE IF NOT EXISTS товары (
    id TEXT PRIMARY KEY,
    магазинId TEXT NOT NULL,
    название TEXT NOT NULL,
    описание TEXT,
    цена REAL NOT NULL,
    валюта TEXT DEFAULT 'USDT',
    изображение TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (магазинId) REFERENCES пользователи(uid)
);

-- Заказы
CREATE TABLE IF NOT EXISTS заказы (
    id TEXT PRIMARY KEY,
    товарId TEXT NOT NULL,
    покупательUid TEXT NOT NULL,
    статус TEXT DEFAULT 'новый',
    датаСоздания INTEGER NOT NULL,
    txid TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (товарId) REFERENCES товары(id),
    FOREIGN KEY (покупательUid) REFERENCES пользователи(uid)
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_сообщения_отправитель ON сообщения(idОтправителя);
CREATE INDEX IF NOT EXISTS idx_сообщения_группа ON сообщения(idГруппы);
CREATE INDEX IF NOT EXISTS idx_сообщения_время ON сообщения(временнаяМетка);
CREATE INDEX IF NOT EXISTS idx_группы_участники ON группы(участники);
CREATE INDEX IF NOT EXISTS idx_товары_магазин ON товары(магазинId);
CREATE INDEX IF NOT EXISTS idx_заказы_покупатель ON заказы(покупательUid);
