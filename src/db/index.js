// src/db/index.js
import {Sequelize} from 'sequelize';
import initModels from './models.js';
import {runPendingMigrations} from './migrator.js';

const storage = process.env.SQLITE_FILE || "./db.sqlite";

export const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage,
    logging: false
});

export const models = initModels(sequelize);

export async function ensureDb() {
    await sequelize.authenticate();
    // Create tables if needed
    await sequelize.sync();
    
    // Run pending migrations
    await runPendingMigrations();
}
