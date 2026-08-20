const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');

class SQLiteStorage {
    constructor(dbPath = './data/cipherlink.db') {
        this.dbPath = dbPath;
        this.db = null;
        this._initialized = false;
    }

    async подключиться() {
        if (this._initialized) return;
        this.db = new sqlite3.Database(this.dbPath);
        this.db.run = promisify(this.db.run.bind(this.db));
        this.db.get = promisify(this.db.get.bind(this.db));
        this.db.all = promisify(this.db.all.bind(this.db));
        this._initialized = true;
    }

    async создатьПользователя(user) {
        await this.подключиться();
        const uid = user.uid || 'user_' + Date.now();
        const sql = 'INSERT INTO пользователи (uid, публичныйКлюч, приватныйКлюч, имяПользователя, аватар, отпечатокКлюча, магазин, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))';
        await this.db.run(sql, [uid, user.публичныйКлюч || '', user.приватныйКлюч || '',
            user.имяПользователя || '', user.аватар || null, user.отпечатокКлюча || null, user.магазин || null]);
        return { uid, ...user };
    }

    async получитьПользователя(uid) {
        await this.подключиться();
        return await this.db.get('SELECT * FROM пользователи WHERE uid = ?', [uid]);
    }

    async обновитьПользователя(uid, данные) {
        await this.подключиться();
        const fields = Object.keys(данные).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(данные), uid];
        const sql = `UPDATE пользователи SET ${fields}, updatedAt = datetime("now") WHERE uid = ?`;
        await this.db.run(sql, values);
        return await this.получитьПользователя(uid);
    }

    async удалитьПользователя(uid) {
        await this.подключиться();
        const sql = 'DELETE FROM пользователи WHERE uid = ?';
        const result = await this.db.run(sql, [uid]);
        return result.changes > 0;
    }

    async получитьВсеПользователи() {
        await this.подключиться();
        return await this.db.all('SELECT * FROM пользователи', []);
    }

    async найтиПользователяПоПубличномуКлючу(ключ) {
        await this.подключиться();
        return await this.db.get('SELECT * FROM пользователи WHERE публичныйКлюч = ?', [ключ]);
    }

    // Группы
    async создатьГруппу(group) {
        await this.подключиться();
        const id = group.id || 'group_' + Date.now();
        const sql = 'INSERT INTO группы (id, название, участники, idВладельца, тип, токенПриглашения, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))';
        await this.db.run(sql, [id, group.название, JSON.stringify(group.участники || []),
            group.idВладельца, group.тип, group.токенПриглашения || null]);
        return { id, ...group };
    }

    async получитьГруппу(id) {
        await this.подключиться();
        const sql = 'SELECT * FROM группы WHERE id = ?';
        const result = await this.db.get(sql, [id]);
        if (result && result.участники) result.участники = JSON.parse(result.участники);
        return result;
    }

    async удалитьГруппу(id) {
        await this.подключиться();
        const sql = 'DELETE FROM группы WHERE id = ?';
        const result = await this.db.run(sql, [id]);
        return result.changes > 0;
    }

    async получитьВсеГруппы() {
        await this.подключиться();
        const sql = 'SELECT * FROM группы';
        const results = await this.db.all(sql, []);
        return results.map(g => ({ ...g, участники: g.участники ? JSON.parse(g.участники) : [] }));
    }

    async добавитьУчастникаВГруппу(uid, groupId) {
        await this.подключиться();
        const group = await this.получитьГруппу(groupId);
        if (!group || group.участники.includes(uid)) return false;
        group.участники.push(uid);
        await this.db.run('UPDATE группы SET участники = ? WHERE id = ?', [JSON.stringify(group.участники), groupId]);
        return true;
    }

    // Сообщения
    async сохранитьСообщение(msg) {
        await this.подключиться();
        const id = msg.id || 'msg_' + Date.now();
        const sql = 'INSERT INTO сообщения (id, idОтправителя, текст, временнаяМетка, статус, idГруппы, тип, media, mediaType, времяИсчезновения, таймерУстановленВ, payload, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))';
        await this.db.run(sql, [id, msg.idОтправителя, msg.текст, msg.временнаяМетка, msg.статус || 'отправлено',
            msg.idГруппы, msg.тип || 'пользовательское', msg.media || null, msg.mediaType || null,
            msg.времяИсчезновения || null, msg.таймерУстановленВ || null, JSON.stringify(msg.payload || {})]);
        return { id, ...msg };
    }

    async получитьСообщение(id) {
        await this.подключиться();
        return await this.db.get('SELECT * FROM сообщения WHERE id = ?', [id]);
    }

    // Офлайн сообщения
    async добавитьОфлайнСообщение(uid, msg) {
        await this.подключиться();
        const existing = await this.db.get('SELECT сообщения FROM офлайн_сообщения WHERE uid = ?', [uid]);
        if (existing) {
            const msgs = JSON.parse(existing.сообщения);
            msgs.push(msg);
            await this.db.run('UPDATE офлайн_сообщения SET сообщения = ?, updatedAt = datetime(\'now\') WHERE uid = ?', [JSON.stringify(msgs), uid]);
        } else {
            await this.db.run('INSERT INTO офлайн_сообщения (uid, сообщения) VALUES (?, ?)', [uid, JSON.stringify([msg])]);
        }
    }

    async получитьОфлайнСообщения(uid) {
        await this.подключиться();
        const result = await this.db.get('SELECT сообщения FROM офлайн_сообщения WHERE uid = ?', [uid]);
        await this.очиститьОфлайнСообщения(uid);
        return result ? JSON.parse(result.сообщения) : [];
    }

    async очиститьОфлайнСообщения(uid) {
        await this.подключиться();
        await this.db.run('DELETE FROM офлайн_сообщения WHERE uid = ?', [uid]);
    }

    // Статистика
    async получитьСтатистику() {
        await this.подключиться();
        const [users, groups, messages] = await Promise.all([
            this.db.get('SELECT COUNT(*) as count FROM пользователи', []),
            this.db.get('SELECT COUNT(*) as count FROM группы', []),
            this.db.get('SELECT COUNT(*) as count FROM сообщения', [])
        ]);
        const offlineCount = await this.db.get('SELECT COUNT(*) as count FROM офлайн_сообщения', []);
        return { totalUsers: users.count, totalGroups: groups.count, totalMessages: messages.count,
                 offlineMessagesStored: offlineCount.count };
    }

    async очиститьВсе() {
        await this.подключиться();
        await this.db.run('DELETE FROM пользователи');
        await this.db.run('DELETE FROM группы');
        await this.db.run('DELETE FROM сообщения');
        await this.db.run('DELETE FROM офлайн_сообщения');
        await this.db.run('DELETE FROM товары');
        await this.db.run('DELETE FROM заказы');
    }
}

module.exports = { SQLiteStorage };
}
        return results.map(g => ({ ...g, участники: g.участники ? JSON.parse(g.участники) : [] }));
    }

    async добавитьУчастникаВГруппу(uid, groupId) {
        await this.подключиться();
        const group = await this.получитьГруппу(groupId);
        if (!group || group.участники.includes(uid)) return false;
        group.участники.push(uid);
        await this.db.run('UPDATE группы SET участники = ? WHERE id = ?', [JSON.stringify(group.участники), groupId]);
        return true;
    }

    // Сообщения
    async сохранитьСообщение(msg) {
        await this.подключиться();
        const id = msg.id || 'msg_' + Date.now();
        const sql = 'INSERT INTO сообщения (id, idОтправителя, текст, временнаяМетка, статус, idГруппы, тип, media, mediaType, времяИсчезновения, таймерУстановленВ, payload, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))';
        await this.db.run(sql, [id, msg.idОтправителя, msg.текст, msg.временнаяМетка, msg.статус || 'отправлено',
            msg.idГруппы, msg.тип || 'пользовательское', msg.media || null, msg.mediaType || null,
            msg.времяИсчезновения || null, msg.таймерУстановленВ || null, JSON.stringify(msg.payload || {})]);
        return { id, ...msg };
    }

    async получитьСообщение(id) {
        await this.подключиться();
        return await this.db.get('SELECT * FROM сообщения WHERE id = ?', [id]);
    }

    // Офлайн сообщения
    async добавитьОфлайнСообщение(uid, msg) {
        await this.подключиться();
        const existing = await this.db.get('SELECT сообщения FROM офлайн_сообщения WHERE uid = ?', [uid]);
        if (existing) {
            const msgs = JSON.parse(existing.сообщения);
            msgs.push(msg);
            await this.db.run('UPDATE офлайн_сообщения SET сообщения = ?, updatedAt = datetime("now") WHERE uid = ?', [JSON.stringify(msgs), uid]);
        } else {
            await this.db.run('INSERT INTO офлайн_сообщения (uid, сообщения) VALUES (?, ?)', [uid, JSON.stringify([msg])]);
        }
    }

    async получитьОфлайнСообщения(uid) {
        await this.подключиться();
        const result = await this.db.get('SELECT сообщения FROM офлайн_сообщения WHERE uid = ?', [uid]);
        await this.очиститьОфлайнСообщения(uid);
        return result ? JSON.parse(result.сообщения) : [];
    }

    async очиститьОфлайнСообщения(uid) {
        await this.подключиться();
        await this.db.run('DELETE FROM офлайн_сообщения WHERE uid = ?', [uid]);
    }

    // Статистика
    async получитьСтатистику() {
        await this.подключиться();
        const [users, groups, messages] = await Promise.all([
            this.db.get('SELECT COUNT(*) as count FROM пользователи', []),
            this.db.get('SELECT COUNT(*) as count FROM группы', []),
            this.db.get('SELECT COUNT(*) as count FROM сообщения', [])
        ]);
        const offlineCount = await this.db.get('SELECT COUNT(*) as count FROM офлайн_сообщения', []);
        return { totalUsers: users.count, totalGroups: groups.count, totalMessages: messages.count,
                 offlineMessagesStored: offlineCount.count };
    }

    async очиститьВсе() {
        await this.подключиться();
        await this.db.run('DELETE FROM пользователи');
        await this.db.run('DELETE FROM группы');
        await this.db.run('DELETE FROM сообщения');
        await this.db.run('DELETE FROM офлайн_сообщения');
        await this.db.run('DELETE FROM товары');
        await this.db.run('DELETE FROM заказы');
    }
async отключиться() {
        if (this.db) {
            await new Promise((resolve, reject) => this.db.close(err => err ? reject(err) : resolve()));
        }
    }
}

module.exports = { SQLiteStorage };