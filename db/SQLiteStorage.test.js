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
        await this.db.run("CREATE TABLE IF NOT EXISTS пользователи (uid TEXT PRIMARY KEY, публичныйКлюч TEXT, приватныйКлюч TEXT, имяПользователя TEXT, аватар TEXT, отпечатокКлюча TEXT, магазин TEXT, createdAt TEXT, updatedAt TEXT)");
        await this.db.run("CREATE TABLE IF NOT EXISTS группы (id TEXT PRIMARY KEY, название TEXT, участники TEXT, idВладельца TEXT, тип TEXT, токенПриглашения TEXT, createdAt TEXT, updatedAt TEXT)");
        await this.db.run("CREATE TABLE IF NOT EXISTS сообщения (id TEXT PRIMARY KEY, idОтправителя TEXT, текст TEXT, временнаяМетка TEXT, статус TEXT, idГруппы TEXT, тип TEXT, media TEXT, mediaType TEXT, времяИсчезновения INTEGER, таймерУстановленВ INTEGER, payload TEXT, createdAt TEXT)");
        await this.db.run("CREATE TABLE IF NOT EXISTS офлайн_сообщения (id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT NOT NULL, сообщения TEXT, createdAt TEXT, updatedAt TEXT, UNIQUE(uid))");
        this._initialized = true;
    }

    async создатьПользователя(user) {
        await this.подключиться();
        const uid = user.uid || 'user_' + Date.now();
        await this.db.run("INSERT INTO пользователи (uid, публичныйКлюч, приватныйКлюч, имяПользователя, аватар, отпечатокКлюча, магазин, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))", [uid, user.публичныйКлюч || '', user.приватныйКлюч || '', user.имяПользователя || '', user.аватар || '', user.отпечатокКлюча || '', user.магазин || '']);
        return { uid };
    }

    async получитьПользователя(uid) {
        await this.подключиться();
        return await this.db.get("SELECT * FROM пользователи WHERE uid = ?", [uid]);
    }

    async удалитьПользователя(uid) {
        await this.подключиться();
        await this.db.run("DELETE FROM пользователи WHERE uid = ?", [uid]);
        return true;
    }

    async получитьВсеПользователи() {
        await this.подключиться();
        return await this.db.all("SELECT * FROM пользователи", []);
    }

    async найтиПользователяПоПубличномуКлючу(ключ) {
        await this.подключиться();
        return await this.db.get("SELECT * FROM пользователи WHERE публичныйКлюч = ?", [ключ]);
    }

    async обновитьПользователя(uid, данные) {
        await this.подключиться();
        const fields = Object.keys(данные).map(k => k + ' = ?').join(', ');
        await this.db.run('UPDATE пользователи SET ' + fields + ', updatedAt = datetime(\'now\') WHERE uid = ?', [...Object.values(данные), uid]);
        return await this.получитьПользователя(uid);
    }

    async создатьГруппу(group) {
        await this.подключиться();
        const id = group.id || 'group_' + Date.now();
        await this.db.run("INSERT INTO группы (id, название, участники, idВладельца, тип, токенПриглашения, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))", [id, group.название, JSON.stringify(group.участники || []), group.idВладельца, group.тип, group.токенПриглашения || null]);
        return { id };
    }

    async получитьГруппу(id) {
        await this.подключиться();
        const r = await this.db.get("SELECT * FROM группы WHERE id = ?", [id]);
        if (r && r.участники) r.участники = JSON.parse(r.участники);
        return r;
    }

    async удалитьГруппу(id) {
        await this.подключиться();
        await this.db.run("DELETE FROM группы WHERE id = ?", [id]);
        return true;
    }

    async получитьВсеГруппы() {
        await this.подключиться();
        const results = await this.db.all("SELECT * FROM группы", []);
        return results.map(g => ({ ...g, участники: g.участники ? JSON.parse(g.участники) : [] }));
    }

    async добавитьУчастникаВГруппу(uid, groupId) {
        await this.подключиться();
        const group = await this.получитьГруппу(groupId);
        if (!group || group.участники.includes(uid)) return false;
        group.участники.push(uid);
        await this.db.run("UPDATE группы SET участники = ? WHERE id = ?", [JSON.stringify(group.участники), groupId]);
        return true;
    }

    async сохранитьСообщение(msg) {
        await this.подключиться();
        const id = msg.id || 'msg_' + Date.now();
        await this.db.run("INSERT INTO сообщения (id, idОтправителя, текст, временнаяМетка, статус, idГруппы, тип, media, mediaType, времяИсчезновения, таймерУстановленВ, payload, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))", [id, msg.idОтправителя, msg.текст, msg.временнаяМетка, msg.статус || 'отправлено', msg.idГруппы, msg.тип || 'пользовательское', msg.media || null, msg.mediaType || null, msg.времяИсчезновения || null, msg.таймерУстановленВ || null, JSON.stringify(msg.payload || {})]);
        return { id };
    }

    async получитьСообщение(id) {
        await this.подключиться();
        return await this.db.get("SELECT * FROM сообщения WHERE id = ?", [id]);
    }

    async добавитьОфлайнСообщение(uid, msg) {
        await this.подключиться();
        const existing = await this.db.get("SELECT сообщения FROM офлайн_сообщения WHERE uid = ?", [uid]);
        if (existing) {
            const msgs = JSON.parse(existing.сообщения);
            msgs.push(msg);
            await this.db.run("UPDATE офлайн_сощения SET сообщения = ? WHERE uid = ?", [JSON.stringify(msgs), uid]);
        } else {
            await this.db.run("INSERT INTO офлайн_сощения (uid, сообщения) VALUES (?, ?)", [uid, JSON.stringify([msg])]);
        }
    }

    async получитьОфлайнСообщения(uid) {
        await this.подключиться();
        const result = await this.db.get("SELECT сообщения FROM офлайн_сощения WHERE uid = ?", [uid]);
        await this.очиститьОфлайнСощения(uid);
        return result ? JSON.parse(result.сообщения) : [];
    }

    async очиститьОфлайнСощения(uid) {
        await this.подключиться();
        await this.db.run("DELETE FROM офлайн_сощения WHERE uid = ?", [uid]);
    }

    async получитьСтатистику() {
        await this.подключиться();
        const [users, groups, messages] = await Promise.all([
            this.db.get("SELECT COUNT(*) as count FROM пользователи", []),
            this.db.get("SELECT COUNT(*) as count FROM группы", []),
            this.db.get("SELECT COUNT(*) as count FROM сообщения", [])
        ]);
        const offline = await this.db.get("SELECT COUNT(*) as count FROM офлайн_сощения", []);
        return { totalUsers: users.count, totalGroups: groups.count, totalMessages: messages.count, offlineMessagesStored: offline.count };
    }

    async очиститьВсе() {
        await this.подключиться();
        await this.db.run("DELETE FROM пользователи");
        await this.db.run("DELETE FROM группы");
        await this.db.run("DELETE FROM сообщение");
        await this.db.run("DELETE FROM офлайн_сощения");
        await this.db.run("DELETE FROM товары");
        await this.db.run("DELETE FROM заказы");
    }

    async отключиться() {
        if (this.db) {
            await new Promise((resolve, reject) => this.db.close(err => err ? reject(err) : resolve()));
        }
    }
}

module.exports = { SQLiteStorage };