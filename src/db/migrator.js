import {sequelize} from './index.js';
import {readdir} from 'fs/promises';
import path from 'path';
import {fileURLToPath, pathToFileURL} from 'url';

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

async function getAppliedVersions() {
    await ensureMigrationsTable();
    const [rows] = await sequelize.query(`SELECT version FROM migrations;`);
    const applied = new Set(rows.map(r => r.version));
    return applied;
}

function parseMigrationFilename(filename) {
    // Expect pattern: 0001_name.js
    const base = path.basename(filename, '.js');
    const sepIndex = base.indexOf('_');
    if (sepIndex === -1) return null;
    const version = base.slice(0, sepIndex);
    const name = base.slice(sepIndex + 1);
    if (!version || !name) return null;
    return {version, name};
}

async function listMigrationFiles() {
    try {
        const files = await readdir(migrationsDir);
        return files
            .filter(f => f.endsWith('.js'))
            .map(f => ({...parseMigrationFilename(f), filename: f}))
            .filter(Boolean)
            .sort((a, b) => a.version.localeCompare(b.version));
    } catch {
        return [];
    }
}

export async function runPendingMigrations() {
    const applied = await getAppliedVersions();
    const files = await listMigrationFiles();

    for (const file of files) {
        if (applied.has(file.version)) continue;

        const filePath = path.join(migrationsDir, file.filename);
        const moduleUrl = pathToFileURL(filePath).href;
        const mod = await import(moduleUrl);
        const up = mod.up || mod.default;
        if (typeof up !== 'function') {
            console.warn(`[migrations] skip ${file.filename}: no up() export`);
            continue;
        }
        console.log(`[migrations] applying ${file.version} ${file.name}`);
        await up(sequelize);
        await sequelize.query(
            `INSERT INTO migrations (version, name) VALUES (:version, :name);`,
            {replacements: {version: file.version, name: file.name}}
        );
        console.log(`[migrations] applied ${file.version}`);
    }
}


