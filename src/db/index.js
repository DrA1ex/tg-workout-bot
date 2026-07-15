import {Sequelize} from 'sequelize';
import initModels from './models.js';
import {runPendingMigrations} from './migrator.js';

const storage = process.env.SQLITE_FILE || "./db.sqlite";

export const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage,
    logging: false,
    pool: {max: 1, min: 0, idle: 10_000, acquire: 30_000},
    retry: {
        max: 5,
        match: [/SQLITE_BUSY/, /SQLITE_LOCKED/],
    },
});

export const models = initModels(sequelize);

async function configureSqlite() {
    await sequelize.query('PRAGMA foreign_keys = ON;');
    await sequelize.query('PRAGMA busy_timeout = 5000;');
    if (storage !== ':memory:') {
        await sequelize.query('PRAGMA journal_mode = WAL;');
        await sequelize.query('PRAGMA synchronous = NORMAL;');
    }
}

export async function ensureDb() {
    await sequelize.authenticate();
    await configureSqlite();
    await runPendingMigrations();
}
