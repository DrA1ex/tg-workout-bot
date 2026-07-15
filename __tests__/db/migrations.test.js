import os from 'os';
import path from 'path';
import {mkdtemp, rm} from 'fs/promises';
import {spawn} from 'child_process';
import {describeWithSilencedConsole} from '../mocks/console-mocks.js';

describeWithSilencedConsole('Database Migrations', ['warn', 'error', 'log'], () => {
    let tempDir;
    let dbFile;

    beforeAll(async () => {
        tempDir = await mkdtemp(path.join(os.tmpdir(), 'tg-workout-mig-'));
        dbFile = path.join(tempDir, 'test.sqlite');
        process.env.SQLITE_FILE = dbFile;
    });

    afterAll(async () => {
        // Cleanup temporary files
        try {
            await rm(tempDir, {recursive: true, force: true});
        } catch {
        }
        delete process.env.SQLITE_FILE;
    });

    it('applies pending migrations and records versions', async () => {
        // Import after setting env to bind sequelize to our temp db
        const {ensureDb, sequelize} = await import('../../src/db/index.js');
        const {runPendingMigrations} = await import('../../src/db/migrator.js');

        await ensureDb();

        let [rows] = await sequelize.query('SELECT version, name FROM migrations ORDER BY version');
        expect(Array.isArray(rows)).toBe(true);
        expect(rows.length).toBeGreaterThanOrEqual(1);
        expect(rows[0].version).toBe('0000');

        // Idempotency: second run should not duplicate
        await runPendingMigrations();
        const [rows2] = await sequelize.query('SELECT COUNT(*) as c FROM migrations WHERE version = "0000"');
        expect(rows2[0].c || rows2[0].C || rows2[0]['COUNT(*)']).toBe(1);

        // Users table should have timezone column (either via model or migration)
        const [cols] = await sequelize.query('PRAGMA table_info(users);');
        const hasTimezone = cols.some(col => col.name === 'timezone');
        const hasTheme = cols.some(col => col.name === 'theme');
        const hasAccentColor = cols.some(col => col.name === 'accentColor');
        const hasSessionVersion = cols.some(col => col.name === 'sessionVersion');
        expect(hasTimezone).toBe(true);
        expect(hasTheme).toBe(true);
        expect(hasAccentColor).toBe(true);
        expect(hasSessionVersion).toBe(true);

        const [workoutCols] = await sequelize.query('PRAGMA table_info(workouts);');
        const hasDedupeToken = workoutCols.some(col => col.name === 'dedupeToken');
        expect(hasDedupeToken).toBe(true);

        const [journalModeRows] = await sequelize.query('PRAGMA journal_mode;');
        const journalMode = String(journalModeRows[0]?.journal_mode || journalModeRows[0]?.journalMode || '').toLowerCase();
        expect(journalMode).toBe('wal');

        const [busyTimeoutRows] = await sequelize.query('PRAGMA busy_timeout;');
        const busyTimeout = Number(busyTimeoutRows[0]?.timeout ?? busyTimeoutRows[0]?.busy_timeout ?? Object.values(busyTimeoutRows[0] || {})[0]);
        expect(busyTimeout).toBeGreaterThanOrEqual(5000);

        const [workoutIndexes] = await sequelize.query('PRAGMA index_list(workouts);');
        const workoutIndexNames = new Set(workoutIndexes.map(index => index.name));
        expect(workoutIndexNames.has('workouts_telegram_date_idx')).toBe(true);
        expect(workoutIndexNames.has('workouts_telegram_exercise_date_idx')).toBe(true);
    });

    it('CLI applies pending migrations successfully', async () => {
        const cliPath = path.join(process.cwd(), 'src/db/migrate-cli.js');

        await new Promise((resolve, reject) => {
            const child = spawn(process.execPath, [cliPath], {
                env: {...process.env, SQLITE_FILE: dbFile},
                stdio: 'ignore'
            });
            child.on('exit', (code) => {
                if (code === 0) resolve(); else reject(new Error('migrate-cli exited with code ' + code));
            });
            child.on('error', reject);
        });

        // Verify migration table exists
        const {sequelize} = await import('../../src/db/index.js');
        const [rows] = await sequelize.query('SELECT version FROM migrations');
        expect(rows.length).toBeGreaterThanOrEqual(1);
    });
});
