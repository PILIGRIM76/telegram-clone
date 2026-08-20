#!/usr/bin/env node
/**
 * Утилита для запуска миграций базы данных
 * Usage: node db/migrate.js [up|down|status]
 */

const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || './data/cipherlink.db';
const MIGRATIONS_DIR = './db/migrations';
const MIGRATIONS_TABLE = 'migrations_history';

async function initDb(db) {
    await db.run(\CREATE TABLE IF NOT EXISTS \ (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        appliedAt TEXT DEFAULT (datetime('now')),
        success INTEGER DEFAULT 1
    )\);
}

async function runMigrations(direction = 'up') {
    const db = new sqlite3.Database(DB_PATH);
    db.run = promisify(db.run);
    db.all = promisify(db.all);
    db.get = promisify(db.get);

    await initDb(db);

    const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql'));
    files.sort();

    for (const file of files) {
        const [id, name] = file.split('_');
        const applied = await db.get(\SELECT * FROM \ WHERE id = ?\, id);
        const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

        if (direction === 'up' && !applied) {
            console.log(\[MIGRATE] \...\);
            try {
                await db.run(sql);
                await db.run(\INSERT INTO \ (id, name) VALUES (?, ?)\, [id, name]);
                console.log(\[MIGRATE] \ - OK\);
            } catch (e) {
                console.error(\[MIGRATE] \ - FAILED:\, e.message);
                await db.run(\INSERT INTO \ (id, name, success) VALUES (?, ?, 0)\, [id, name]);
            }
        }
    }

    db.close();
}

async function getMigrationsStatus() {
    const db = new sqlite3.Database(DB_PATH);
    db.all = promisify(db.all);
    const applied = await db.all(\SELECT * FROM \ ORDER BY id\);
    db.close();
    return applied;
}

const cmd = process.argv[2] || 'up';

if (cmd === 'up') {
    runMigrations('up').catch(console.error);
} else if (cmd === 'status') {
    getMigrationsStatus().then(r => console.log(JSON.stringify(r, null, 2))).catch(console.error);
}
