#!/usr/bin/env node
import {ensureDb, sequelize} from './index.js';

async function main() {
    try {
        await ensureDb();
        console.log('[migrations] all pending migrations applied');
        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('[migrations] failed:', error);
        process.exit(1);
    }
}

await main();
