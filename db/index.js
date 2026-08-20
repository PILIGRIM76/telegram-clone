const STORAGE_TYPE = process.env.STORAGE_TYPE || 'memory';

class MemoryStorage {
    constructor() {
        this._пользователи = new Map();
        this._группы = new Map();
        this._офлайнСообщения = new Map();
        this._сообщения = new Map();
    }

    async создатьПользователя(user) {
        const uid = user.uid || 'user_' + Date.now();
        this._пользователи.set(uid, user);
        return user;
    }

    async получитьПользователя(uid) { return this._пользователи.get(uid); }
    async обновитьПользователя(uid, данные) {
        const u = this._пользователи.get(uid);
        if (u) Object.assign(u, данные);
        return u;
    }
    async удалитьПользователя(uid) { return this._пользователи.delete(uid); }
    async получитьВсеПользователи() { return Array.from(this._пользователи.values()); }
    async найтиПользователяПоПубличномуКлючу(ключ) {
        for (const u of this._пользователи.values()) if (u.публичныйКлюч === ключ) return u;
        return null;
    }

    async создатьГруппу(group) {
        const id = group.id || 'group_' + Date.now();
        const группа = { id, ...group, участники: group.участники || [] };
        this._группы.set(id, группа);
        return группа;
    }
    async получитьГруппу(id) { return this._группы.get(id); }
    async удалитьГруппу(id) { return this._группы.delete(id); }
    async получитьВсеГруппы() { return Array.from(this._группы.values()); }
    async добавитьУчастникаВГруппу(uid, groupId) {
        const g = this._группы.get(groupId);
        if (g && !g.участники.includes(uid)) { g.участники.push(uid); return true; }
        return false;
    }

    async сохранитьСообщение(msg) {
        const id = msg.id || 'msg_' + Date.now();
        this._сообщения.set(id, { id, ...msg });
        return { id, ...msg };
    }
    async получитьСообщение(id) { return this._сообщения.get(id); }

    async добавитьОфлайнСообщение(uid, msg) {
        if (!this._офлайнСообщения.has(uid)) this._офлайнСообщения.set(uid, []);
        this._офлайнСообщения.get(uid).push(msg);
    }
    async получитьОфлайнСообщения(uid) {
        const msgs = this._офлайнСообщения.get(uid) || [];
        this._офлайнСообщения.delete(uid);
        return msgs;
    }
    async очиститьОфлайнСообщения(uid) { this._офлайнСообщения.delete(uid); }

    async получитьСтатистику() {
        return { totalUsers: this._пользователи.size, totalGroups: this._группы.size, totalMessages: this._сообщения.size, offlineMessagesStored: this._офлайнСообщения.size };
    }
    async очиститьВсе() {
        this._пользователи.clear(); this._группы.clear(); this._сообщения.clear(); this._офлайнСообщения.clear();
    }
}

const db = new MemoryStorage();
module.exports = { db, STORAGE_TYPE, MemoryStorage };
