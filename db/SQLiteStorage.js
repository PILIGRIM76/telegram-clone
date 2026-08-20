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
this._инициализировано = true;
    }

    // ===== ПРАВИЛА ДЛЯ SQLiteSTORAGE =====
    // Методы: создатьПользователя, получитьПользователя, обновитьПользователя, удалитьПользователя,
    // получитьВсеПользователи, найтиПользователяПоПубличномуКлючу, создатьГруппу, получитьГруппу,
    // удалитьГруппу, получитьВсеГруппы, добавитьУчастникаВГруппу, сохранитьСообщение,
    // получитьСообщение, добавитьОфлайнСообщение, получитьОфлайнСообщения, очиститьОфлайнСообщения,
    // получитьСтатистику, очиститьВсе
}