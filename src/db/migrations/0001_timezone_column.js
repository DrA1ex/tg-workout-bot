export async function up(sequelize, transaction) {
    // Ensure the users table exists before checking the legacy schema
    const [cols] = await sequelize.query(`PRAGMA table_info(users);`, {transaction});
    const hasTimezone = cols.some(col => col.name === 'timezone');
    if (!hasTimezone) {
        await sequelize.query(`
            ALTER TABLE users ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';
        `, {transaction});
    }
    await sequelize.query(`
        UPDATE users SET timezone = 'UTC' WHERE timezone IS NULL;
    `, {transaction});
}
