export async function up(sequelize) {
    await sequelize.query(`
        CREATE INDEX IF NOT EXISTS workouts_telegram_date_idx
        ON workouts (telegramId, date);
    `);

    await sequelize.query(`
        CREATE INDEX IF NOT EXISTS workouts_telegram_exercise_date_idx
        ON workouts (telegramId, exercise, date);
    `);
}
