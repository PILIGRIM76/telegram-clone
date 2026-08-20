const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');

class SQLiteStorage {
    constructor(dbPath) {
        this.dbPath = dbPath || './data/cipherlink.db';
        this.db = null;
        this._ready = false;
    }

    async _connect() {
        if (this._ready) return;
        this.db = new sqlite3.Database(this.dbPath);
        this.db.run = promisify(this.db.run.bind(this.db));
        this.db.get = promisify(this.db.get.bind(this.db));
        this.db.all = promisify(this.db.all.bind(this.db));
        await this.db.run("CREATE TABLE IF NOT EXISTS пользователи (uid TEXT PRIMARY KEY, публичныйКлюч TEXT, приватныйКлюч TEXT, имяПользователя TEXT, аватар TEXT, отпечатокКлюча TEXT, магазин TEXT, createdAt TEXT, updatedAt TEXT)");
        await this.db.run("CREATE TABLE IF NOT EXISTS группы (id TEXT PRIMARY KEY, название TEXT, участники TEXT, idВладельца TEXT, тип TEXT, токенПриглашения TEXT, createdAt TEXT, updatedAt TEXT)");
        await this.db.run("CREATE TABLE IF NOT EXISTS сообщения (id TEXT PRIMARY KEY, idОтправителя TEXT, текст TEXT, временнаяМетка TEXT, статус TEXT, idГруппы TEXT, тип TEXT, media TEXT, mediaType TEXT, времяИсчезновения INTEGER, таймерУстановленВ INTEGER, payload TEXT, createdAt TEXT)");
        await this.db.run("CREATE TABLE IF NOT EXISTS офлайн_сообщения (id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT NOT NULL, сообщения TEXT, createdAt TEXT, updatedAt TEXT, UNIQUE(uid))");
        this._ready = true;
    }

    async создатьПользователя(user) {
        await this._connect();
        const uid = user.uid || 'user_' + Date.now();
        await this.db.run("INSERT INTO пользователи VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))", [uid, user.публичныйКлюч || '', user.приватныйКлюч || '', user.имяПользователя || '', user.аватар || '', user.отпечатокКлюча || '', user.магазин || '']);
        return { uid };
    }

    async получитьПользователя(uid) {
        await this._connect();
        return await this.db.get("SELECT * FROM пользователи WHERE uid = ?", [uid]);
    }

    async удалитьПользователя(uid) {
        await this._connect();
        await this.db.run("DELETE FROM пользователи WHERE uid = ?", [uid]);
        return true;
    }

    async получитьВсеПользователи() {
        await this._connect();
        return await this.db.all("SELECT * FROM пользователи", []);
    }

    async найтиПользователяПоПубличномуКлючу(key) {
        await this._connect();
        return await this.db.get("SELECT * FROM пользователи WHERE публичныйКлюч = ?", [key]);
    }

    async создатьГруппу(group) {
        await this._connect();
        const id = group.id || 'group_' + Date.now();
        await this.db.run("INSERT INTO группы VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))", [id, group.name, JSON.stringify(group.members || []), group.owner, group.type, group.token || null]);
        return { id };
    }

    async получитьГруппу(id) {
        await this._connect();
        const r = await this.db.get("SELECT * FROM группы WHERE id = ?", [id]);
        if (r && r.members) r.members = JSON.parse(r.members);
        return r;
    }

    async удалитьГруппу(id) {
        await this._connect();
        await this.db.run("DELETE FROM группы WHERE id = ?", [id]);
        return true;
    }

    async получитьВсеГруппы() {
        await this._connect();
        const results = await this.db.all("SELECT * FROM группы", []);
        return results.map(g => ({ ...g, members: g.members ? JSON.parse(g.members) : [] }));
    }

    async добавитьУчастникаВГруппу(uid, groupId) {
        await this._connect();
        const group = await this.получитьГруппу(groupId);
        if (!group || group.members.includes(uid)) return false;
        group.members.push(uid);
        await this.db.run("UPDATE группы SET members = ? WHERE id = ?", [JSON.stringify(group.members), groupId]);
        return true;
    }

    async сохранитьСообщение(msg) {
        await this._connect();
        const id = msg.id || 'msg_' + Date.now();
        await this.db.run("INSERT INTO сообщения (id, idОтправителя, текст, временнаяМетка, статус, idГруппы, тип, media, mediaType, времяИсчезновения, таймерУстановленВ, payload, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))", [id, msg.idОтправителя, msg.текст, msg.временнаяМетка, msg.статус || 'отправлено', msg.idГруппы, msg.тип || 'пользовательское', msg.media || null, msg.mediaType || null, msg.времяИсчезновения || null, msg.таймерУстановленВ || null, JSON.stringify(msg.payload || {})]);
        return { id };
    }

    async получитьСообщение(id) {
        await this._connect();
        return await this.db.get("SELECT * FROM сообщения WHERE id = ?", [id]);
    }

    async добавитьОфлайнСообщение(uid, msg) {
        await this._connect();
        const existing = await this.db.get("SELECT msgs FROM offline WHERE uid = ?", [uid]);
        if (existing) {
            const msgs = JSON.parse(existing.msgs);
            msgs.push(msg);
            await this.db.run("UPDATE offline SET msgs = ? WHERE uid = ?", [JSON.stringify(msgs), uid]);
        } else {
            await this.db.run("INSERT INTO offline (uid, msgs) VALUES (?, ?)", [uid, JSON.stringify([msg])]);
        }
    }

    async получитьОфлайнСообщения(uid) {
        await this._connect();
        const result = await this.db.get("SELECT msgs FROM offline WHERE uid = ?", [uid]);
        await this.clearOffline(uid);
        return result ? JSON.parse(result.msgs) : [];
    }

    async clearOffline(uid) {
        await this._connect();
        await this.db.run("DELETE FROM offline WHERE uid = ?", [uid]);
    }

    async getStats() {
        await this._connect();
        const users = await this.db.get("SELECT COUNT(*) as count FROM пользователи", []);
        const groups = await this.db.get("SELECT COUNT(*) as count FROM группы", []);
        const messages = await this.db.get("SELECT COUNT(*) as count FROM сообщения", []);
        const offline = await this.db.get("SELECT COUNT(*) as count FROM офлайн_сообщения", []);
        return { totalUsers: users.count, totalGroups: groups.count, totalMessages: messages.count, offlineMessagesStored: offline.count };
    }

    async получитьСтатистику() {
        return await this.getStats();
    }

    async очиститьВсе() {
        await this._connect();
        await this.db.run("DELETE FROM пользователи");
        await this.db.run("DELETE FROM группы");
        await this.db.run("DELETE FROM сообщения");
        await this.db.run("DELETE FROM офлайн_сообщения");
    }

    async отключиться() {
        if (this.db) {
            await new Promise((resolve, reject) => this.db.close(err => err ? reject(err) : resolve()));
        }
    }
}

module.exports = { SQLiteStorage };