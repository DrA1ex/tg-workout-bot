export async function up(sequelize) {
    // Ensure users table exists (sequelize.sync will handle on app start, but safe here too)
    const [cols] = await sequelize.query(`PRAGMA table_info(users);`);
    const hasTimezone = cols.some(col => col.name === 'timezone');
    if (!hasTimezone) {
        await sequelize.query(`
            ALTER TABLE users ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC';
        `);
    }
    await sequelize.query(`
        UPDATE users SET timezone = 'UTC' WHERE timezone IS NULL;
    `);
}
