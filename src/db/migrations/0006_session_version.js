export async function up(sequelize, transaction) {
    const [cols] = await sequelize.query(`PRAGMA table_info(users);`, {transaction});
    if (!cols.some(col => col.name === 'sessionVersion')) {
        await sequelize.query(`ALTER TABLE users ADD COLUMN sessionVersion INTEGER NOT NULL DEFAULT 0;`, {transaction});
    }
    await sequelize.query(`UPDATE users SET sessionVersion = 0 WHERE sessionVersion IS NULL;`, {transaction});
}
