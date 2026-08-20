const fs = require('fs');
const content = \#!/usr/bin/env node
const { MemoryStorage } = require('./index.js');
const { SQLiteStorage } = require('./sqlite.new.js');

async function мигрировать() {
    console.log('[MIGRATE] Starting...');
    const memoryDb = new MemoryStorage();
    const sqliteDb = new SQLiteStorage('./data/cipherlink.db');
    
    await sqliteDb.подключитьс€();
    
    let migratedUsers = 0, migratedGroups = 0, migratedMessages = 0, migratedOffline = 0;
    
    const users = await memoryDb.получить¬сеѕользователи();
    for (const u of users) { await sqliteDb.создатьѕользовател€(u); migratedUsers++; }
    
    const groups = await memoryDb.получить¬се√руппы();
    for (const g of groups) { await sqliteDb.создать√руппу(g); migratedGroups++; }
    
    const messages = Array.from(memoryDb._сообщени€.values());
    for (const m of messages) { await sqliteDb.сохранить—ообщение(m); migratedMessages++; }
    
    for (const [uid, msgs] of memoryDb._офлайн—ообщени€.entries()) {
        for (const m of msgs) { await sqliteDb.добавитьќфлайн—ообщение(uid, m); migratedOffline++; }
    }
    
    console.log('[MIGRATE] Users: ' + migratedUsers + ', Groups: ' + migratedGroups + ', Messages: ' + migratedMessages + ', Offline: ' + migratedOffline);
    
    await memoryDb.очистить¬се();
    await sqliteDb.отключитьс€();
}

мигрировать().catch(e => { console.error(e); process.exit(1); });
\;
fs.writeFileSync('F:/AntiPiry/db/MigrateMemoryToSQLite.js', content);
console.log('Migration script created!');

