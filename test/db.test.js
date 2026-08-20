/**
 * Тесты для слоя доступа к данным (MemoryStorage)
 */

const { MemoryStorage } = require('../db/index.js');

describe('MemoryStorage', () => {
    let db;

    beforeEach(async () => {
        db = new MemoryStorage();
        await db.очиститьВсе();
    });

    describe('Пользователи', () => {
        test('создатьПользователя - создаёт пользователя', async () => {
            const user = await db.создатьПользователя({ uid: 'user1', имяПользователя: 'TestUser' });
            expect(user.uid).toBe('user1');
        });

        test('получитьПользователя - возвращает пользователя', async () => {
            await db.создатьПользователя({ uid: 'user1' });
            const result = await db.получитьПользователя('user1');
            expect(result.uid).toBe('user1');
        });

        test('получитьПользователя - undefined для несуществующего', async () => {
            const result = await db.получитьПользователя('nonexistent');
            expect(result).toBeUndefined();
        });

        test('удалитьПользователя - удаляет пользователя', async () => {
            await db.создатьПользователя({ uid: 'user1' });
            const result = await db.удалитьПользователя('user1');
            expect(result).toBe(true);
        });

        test('получитьВсеПользователи - возвращает массив', async () => {
            await db.создатьПользователя({ uid: 'user1' });
            await db.создатьПользователя({ uid: 'user2' });
            const result = await db.получитьВсеПользователи();
            expect(result).toHaveLength(2);
        });
    });

    describe('Группы', () => {
        test('создатьГруппу - создаёт группу', async () => {
            const group = await db.создатьГруппу({ id: 'group1', название: 'TestGroup' });
            expect(group.id).toBe('group1');
        });

        test('получитьГруппу - возвращает группу', async () => {
            await db.создатьГруппу({ id: 'group1' });
            const result = await db.получитьГруппу('group1');
            expect(result.id).toBe('group1');
        });

        test('удалитьГруппу - удаляет группу', async () => {
            await db.создатьГруппу({ id: 'group1' });
            const result = await db.удалитьГруппу('group1');
            expect(result).toBe(true);
        });
    });

    describe('Сообщения', () => {
        test('сохранитьСообщение - сохраняет сообщение', async () => {
            const msg = await db.сохранитьСообщение({ id: 'msg1', текст: 'Hello' });
            expect(msg.id).toBe('msg1');
        });

        test('получитьСообщение - возвращает сообщение', async () => {
            await db.сохранитьСообщение({ id: 'msg1', текст: 'Test' });
            const result = await db.получитьСообщение('msg1');
            expect(result.текст).toBe('Test');
        });
    });

    describe('Статистика', () => {
        test('получитьСтатистику - возвращает данные', async () => {
            await db.создатьПользователя({ uid: 'user1' });
            await db.создатьГруппу({ id: 'group1' });
            const stats = await db.получитьСтатистику();
            expect(stats.totalUsers).toBe(1);
            expect(stats.totalGroups).toBe(1);
            expect(stats.totalMessages).toBe(0);
        });
    });

    // Тесты для SQLiteStorage
const { SQLiteStorage } = require('../db/SQLiteStorage.complete.js');

describe('SQLiteStorage', () => {
    let db;

    beforeAll(async () => {
        db = new SQLiteStorage(':memory:');
        await db.подключиться();
        await db.run('CREATE TABLE IF NOT EXISTS пользователи (uid TEXT PRIMARY KEY, публичныйКлюч TEXT, приватныйКлюч TEXT, имяПользователя TEXT, аватар TEXT, отпечатокКлюча TEXT, магазин TEXT, createdAt TEXT, updatedAt TEXT)');
        await db.run('CREATE TABLE IF NOT EXISTS группы (id TEXT PRIMARY KEY, название TEXT, участники TEXT, idВладельца TEXT, тип TEXT, токенПриглашения TEXT, createdAt TEXT, updatedAt TEXT)');
        await db.run('CREATE TABLE IF NOT EXISTS сообщения (id TEXT PRIMARY KEY, idОтправителя TEXT, текст TEXT, временнаяМетка TEXT, статус TEXT, idГруппы TEXT, тип TEXT, media TEXT, mediaType TEXT, времяИсчезновения INTEGER, таймерУстановленВ INTEGER, payload TEXT, createdAt TEXT)');
        await db.run('CREATE TABLE IF NOT EXISTS офлайн_сообщения (id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT NOT NULL, сообщения TEXT, createdAt TEXT, updatedAt TEXT, UNIQUE(uid))');
    });

    afterAll(async () => {
        await db.отключиться();
    });

    beforeEach(async () => {
        await db.очиститьВсе();
    });

    describe('Пользователи (SQLite)', () => {
        test('создатьПользователя - создаёт пользователя', async () => {
            const user = await db.создатьПользователя({ uid: 'user1', имяПользователя: 'TestUser' });
            expect(user.uid).toBe('user1');
        });

        test('получитьПользователя - возвращает пользователя', async () => {
            await db.создатьПользователя({ uid: 'user1' });
            const result = await db.получитьПользователя('user1');
            expect(result.uid).toBe('user1');
        });

        test('удалитьПользователя - удаляет пользователя', async () => {
            await db.создатьПользователя({ uid: 'user1' });
            const result = await db.удалитьПользователя('user1');
            expect(result).toBe(true);
        });
    });

    describe('Группы (SQLite)', () => {
        test('создатьГруппу - создаёт группу', async () => {
            const group = await db.создатьГруппу({ id: 'group1', название: 'TestGroup' });
            expect(group.id).toBe('group1');
        });
    });
});