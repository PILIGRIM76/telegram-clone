import os

with open('F:/AntiPiry/db/write-migration.js', 'w', encoding='utf-8') as f:
    f.write(r'''const fs = require('fs');

const content = `#!/usr/bin/env node
const { MemoryStorage } = require('./index.js');
const { SQLiteStorage } = require('./sqlite.new.js');
const path = require('path');

async function migrateData() {
    console.log('[MIGRATE] Starting migration from Memory to SQLite...');
    
    const memoryDb = new MemoryStorage();
    const dbPath = path.resolve(__dirname, 'data', 'cipherlink.db');
    console.log('[MIGRATE] Database path:', dbPath);
    const sqliteDb = new SQLiteStorage(dbPath);
    
    await sqliteDb.подключиться();
    
    let migratedUsers = 0, migratedGroups = 0, migratedMessages = 0, migratedOffline = 0;
    
    const users = await memoryDb.получитьВсеПользователи();
    for (const u of users) { 
        await sqliteDb.создатьПользователя(u); 
        migratedUsers++; 
    }
    console.log('[MIGRATE] Users migrated: ' + migratedUsers);
    
    const groups = await memoryDb.получитьВсеГруппы();
    for (const g of groups) { 
        await sqliteDb.создатьГруппу(g); 
        migratedGroups++; 
    }
    console.log('[MIGRATE] Groups migrated: ' + migratedGroups);
    
    const messages = Array.from(memoryDb._сообщения.values());
    for (const m of messages) { 
        await sqliteDb.сохранитьСообщение(m); 
        migratedMessages++; 
    }
    console.log('[MIGRATE] Messages migrated: ' + migratedMessages);
    
    for (const [uid, msgs] of memoryDb._офлайнСообщения.entries()) {
        for (const m of msgs) { 
            await sqliteDb.добавитьОфлайнСообщение(uid, m); 
            migratedOffline++; 
        }
    }
    console.log('[MIGRATE] Offline messages migrated: ' + migratedOffline);
    
    console.log('[MIGRATE] \u2705 Migration completed successfully!');
    
    await memoryDb.отключиться?.();
    await sqliteDb.отключиться();
}

migrateData().catch(e => { 
    console.error('Fatal migration error:', e); 
    process.exit(1); 
});
`;

fs.writeFileSync('F:/AntiPiry/db/MigrateMemoryToSQLite.js', content);
console.log('Migration script created!');
''')

print('write-migration.js fixed!')