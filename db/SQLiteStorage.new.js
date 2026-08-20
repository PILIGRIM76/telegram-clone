const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');

class SQLiteStorage {
    constructor(dbPath = './data/cipherlink.db') {
        this.dbPath = dbPath;
        this.db = null;
        this._инициализировано = false;
    }

    async подключиться() {
        if (this._инициализировано) return;
        this.db = new sqlite3.Database(this.dbPath);
        this.db.run = promisify(this.db.run.bind(this.db));
        this.db.get = promisify(this.db.get.bind(this.db));
        this.db.all = promisify(this.db.all.bind(this.db));
        this._инициализировано = true;
    }

    async создатьПользователя(user) {
        await this.подключиться();
        const uid = user.uid || 'user_' + Date.now();
        const sql = `INSERT INTO пользователи 
            (uid, публичныйКлюч, приватныйКлюч, имяПользователя, аватар, отпечатокКлюча, магазин, createdAt, updatedAt) 
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`;
        await this.db.run(sql, [
            uid, user.публичныйКлюч || '', user.приватныйКлюч || '',
            user.имяПользователя || '', user.аватар || null, user.отпечатокКлюча || null,
            user.магазин || null
        ]);
        return { uid, ...user };
    }

    async получитьПользователя(uid) {
        await this.подключиться();
        return await this.db.get(`SELECT * FROM пользователи WHERE uid = ?`, [uid]);
    }

    async обновитьПользователя(uid, данные) {
        await this.подключиться();
        const fields = Object.keys(данные).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(данные), uid];
        const sql = `UPDATE пользователи SET ${fields}, updatedAt = datetime('now') WHERE uid = ?`;
        await this.db.run(sql, values);
        return await this.получитьПользователя(uid);
    }

    async удалитьПользователя(uid) {
        await this.подключиться();
        const sql = `DELETE FROM пользователи WHERE uid = ?`;
        const result = await this.db.run(sql, [uid]);
        return result.changes > 0;
    }

    async получитьВсеПользователи() {
        await this.подключиться();
        const sql = `SELECT * FROM пользователи`;
        return await this.db.all(sql, []);
    }

    async найтиПользователяПоПубличномуКлючу(ключ) {
        await this.подключиться();
        const sql = `SELECT * FROM пользователи WHERE публичныйКлюч = ?`;
        return await this.db.get(sql, [ключ]);
    }
}