import {Transaction} from 'sequelize';
import {readdir} from 'fs/promises';
import path from 'path';
import {fileURLToPath, pathToFileURL} from 'url';

import {sequelize} from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, 'migrations');

async function ensureMigrationsTable() {
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS migrations (
            version TEXT PRIMARY KEY,
            name TEXT,
            applied_at TEXT DEFAULT (datetime('now'))
        );
    `);
}

function parseMigrationFilename(filename) {
    const match = path.basename(filename).match(/^(\d+)_([a-z0-9_-]+)\.js$/i);
    return match ? {version: match[1], name: match[2]} : null;
}

async function listMigrationFiles() {
    let files;
    try {
        files = await readdir(migrationsDir);
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }
    return files
        .filter(filename => filename.endsWith('.js'))
        .map(filename => {
            const parsed = parseMigrationFilename(filename);
            return parsed ? {...parsed, filename} : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.version.localeCompare(b.version));
}

export async function runPendingMigrations() {
    await ensureMigrationsTable();
    const files = await listMigrationFiles();

    for (const file of files) {
        await sequelize.transaction({type: Transaction.TYPES.IMMEDIATE}, async transaction => {
            const [alreadyApplied] = await sequelize.query(
                `SELECT version FROM migrations WHERE version = :version LIMIT 1;`,
                {replacements: {version: file.version}, transaction},
            );
            if (alreadyApplied.length) return;

            const moduleUrl = pathToFileURL(path.join(migrationsDir, file.filename)).href;
            const mod = await import(moduleUrl);
            const up = mod.up || mod.default;
            if (typeof up !== 'function') throw new Error(`Migration ${file.filename} has no up() export`);

            console.log(`[migrations] applying ${file.version} ${file.name}`);
            await up(sequelize, transaction);
            await sequelize.query(
                `INSERT INTO migrations (version, name) VALUES (:version, :name);`,
                {replacements: {version: file.version, name: file.name}, transaction},
            );
            console.log(`[migrations] applied ${file.version}`);
        });
    }
}
