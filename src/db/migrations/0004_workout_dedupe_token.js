export async function up(sequelize) {
    const [cols] = await sequelize.query(`PRAGMA table_info(workouts);`);
    const names = new Set(cols.map(col => col.name));

    if (!names.has('dedupeToken')) {
        await sequelize.query(`
            ALTER TABLE workouts ADD COLUMN dedupeToken TEXT;
        `);
    }

    await sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS workouts_telegram_dedupe_token_unique
        ON workouts (telegramId, dedupeToken)
        WHERE dedupeToken IS NOT NULL;
    `);
}
