/**
 * Тесты для SQLiteStorage
 */

const { SQLiteStorage } = require('../db/storage.sqlite.js');

describe('SQLiteStorage', () => {
    let db;

    beforeAll(async () => {
        db = new SQLiteStorage(':memory:');
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

        test('получитьГруппу - возвращает группу', async () => {
            await db.создатьГруппу({ id: 'group1' });
            const result = await db.получитьГруппу('group1');
            expect(result.id).toBe('group1');
        });
    });

    describe('Сообщения (SQLite)', () => {
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

    describe('Статистика (SQLite)', () => {
        test('получитьСтатистику - возвращает данные', async () => {
            await db.создатьПользователя({ uid: 'user1' });
            await db.создатьГруппу({ id: 'group1' });
            const stats = await db.получитьСтатистику();
            expect(stats.totalUsers).toBe(1);
            expect(stats.totalGroups).toBe(1);
        });
    });
});