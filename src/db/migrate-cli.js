#!/usr/bin/env node
import {sequelize} from './index.js';
import {runPendingMigrations} from './migrator.js';

async function main() {
    try {
        await sequelize.authenticate();
        // Ensure base tables exist (models) before structural migrations
        await sequelize.sync();
        await runPendingMigrations();
        console.log('[migrations] all pending migrations applied');
        process.exit(0);
    } catch (err) {
        console.error('[migrations] failed:', err);
        process.exit(1);
    }
}

await main();
