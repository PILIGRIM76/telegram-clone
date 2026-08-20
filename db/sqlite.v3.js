const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');

class SQLiteStorage {
    constructor(dbPath) {
        this.dbPath = dbPath || './data/cipherlink.db';
        this.db = null;
        this._initialized = false;
    }

    async подключиться() {
        if (this._initialized) return;
        this.db = new sqlite3.Database(this.dbPath);
        this.db.run = promisify(this.db.run.bind(this.db));
        this.db.get = promisify(this.db.get.bind(this.db));
        this.db.all = promisify(this.db.all.bind(this.db));

        await this.db.run('CREATE TABLE IF NOT EXISTS пользователи (uid TEXT PRIMARY KEY, публичныйКлюч TEXT, приватныйКлюч TEXT, имяПользователя TEXT, аватар TEXT, отпечатокКлюча TEXT, магазин TEXT, createdAt TEXT, updatedAt TEXT)');
        await this.db.run('CREATE TABLE IF NOT EXISTS группы (id TEXT PRIMARY KEY, название TEXT, участники TEXT, idВладельца TEXT, тип TEXT, токенПриглашения TEXT, createdAt TEXT, updatedAt TEXT)');
        await this.db.run('CREATE TABLE IF NOT EXISTS сообщения (id TEXT PRIMARY KEY, idОтправителя TEXT, текст TEXT, временнаяМетка TEXT, статус TEXT, idГруппы TEXT, тип TEXT, media TEXT, mediaType TEXT, времяИсчезновения INTEGER, таймерУстановленВ INTEGER, payload TEXT, createdAt TEXT)');
        await this.db.run('CREATE TABLE IF NOT EXISTS офлайн_сообщения (id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT NOT NULL, сообщения TEXT, createdAt TEXT, updatedAt TEXT, UNIQUE(uid))');
        await this.db.run('CREATE TABLE IF NOT EXISTS товары (id TEXT PRIMARY KEY, магазинId TEXT, название TEXT, описание TEXT, цена REAL, валюта TEXT, изображение TEXT, createdAt TEXT)');
        await this.db.run('CREATE TABLE IF NOT EXISTS заказы (id TEXT PRIMARY KEY, товарId TEXT, покупательUid TEXT, статус TEXT, датаСоздания INTEGER, txid TEXT, createdAt TEXT)');

        this._initialized = true;
    }

    async создатьПользователя(user) {
        await this.подключиться();
        const uid = user.uid || 'user_' + Date.now();
        await this.db.run('INSERT INTO пользователи VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))', [uid, user.публичныйКлюч || '', user.приватныйКлюч || '', user.имяПользователя || '', user.аватар || '', user.отпечатокКлюча || '', user.магазин || '']);
        return { uid };
    }

    async получитьПользователя(uid) {
        await this.подключиться();
        return await this.db.get('SELECT * FROM пользователи WHERE uid = ?', [uid]);
    }

    async удалитьПользователя(uid) {
        await this.подключиться();
        await this.db.run('DELETE FROM пользователи WHERE uid = ?', [uid]);
        return true;
    }

    async получитьВсеПользователи() {
        await this.подключиться();
        return await this.db.all('SELECT * FROM пользователи', []);
    }

    async найтиПользователяПоПубличномуКлючу(ключ) {
        await this.подключиться();
        return await this.db.get('SELECT * FROM пользователи WHERE публичныйКлюч = ?', [ключ]);
    }

    async обновитьПользователя(uid, данные) {
        await this.подключиться();
        const fields = Object.keys(данные).map(k => k + ' = ?').join(', ');
        await this.db.run('UPDATE пользователи SET ' + fields + ', updatedAt = datetime("now") WHERE uid = ?', [...Object.values(данные), uid]);
        return await this.получитьПользователя(uid);
    }
}

module.exports = { SQLiteStorage };