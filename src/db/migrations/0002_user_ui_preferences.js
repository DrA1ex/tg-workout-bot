export async function up(sequelize) {
    const [cols] = await sequelize.query(`PRAGMA table_info(users);`);
    const names = new Set(cols.map(col => col.name));

    if (!names.has('theme')) {
        await sequelize.query(`
            ALTER TABLE users ADD COLUMN theme TEXT NOT NULL DEFAULT 'system';
        `);
    }

    if (!names.has('accentColor')) {
        await sequelize.query(`
            ALTER TABLE users ADD COLUMN accentColor TEXT NOT NULL DEFAULT 'blue';
        `);
    }

    await sequelize.query(`
        UPDATE users
        SET theme = COALESCE(NULLIF(theme, ''), 'system'),
            accentColor = COALESCE(NULLIF(accentColor, ''), 'blue');
    `);
}
