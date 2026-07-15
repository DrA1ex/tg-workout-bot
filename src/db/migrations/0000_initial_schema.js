export async function up(sequelize, transaction) {
    const options = {transaction};
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS users (
            telegramId VARCHAR(255) PRIMARY KEY,
            exercises TEXT NOT NULL DEFAULT '[]',
            language VARCHAR(32) NOT NULL DEFAULT 'ru',
            timezone VARCHAR(255) NOT NULL DEFAULT 'UTC',
            theme VARCHAR(32) NOT NULL DEFAULT 'system',
            accentColor VARCHAR(32) NOT NULL DEFAULT 'blue',
            sessionVersion INTEGER NOT NULL DEFAULT 0
        );
    `, options);
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS workouts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegramId VARCHAR(255) NOT NULL,
            date DATETIME NOT NULL,
            exercise VARCHAR(255) NOT NULL,
            sets INTEGER,
            weight FLOAT,
            repsOrTime FLOAT,
            isTime TINYINT(1) DEFAULT 0,
            dedupeToken VARCHAR(255),
            notes TEXT,
            FOREIGN KEY (telegramId) REFERENCES users(telegramId) ON DELETE CASCADE
        );
    `, options);
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS global_exercises (
            name VARCHAR(255) PRIMARY KEY
        );
    `, options);
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS system_settings (
            key VARCHAR(255) PRIMARY KEY,
            value JSON NOT NULL
        );
    `, options);
}
