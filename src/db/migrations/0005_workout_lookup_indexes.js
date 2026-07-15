export async function up(sequelize, transaction) {
    await sequelize.query(`
        CREATE INDEX IF NOT EXISTS workouts_telegram_date_idx
        ON workouts (telegramId, date);
    `, {transaction});

    await sequelize.query(`
        CREATE INDEX IF NOT EXISTS workouts_telegram_exercise_date_idx
        ON workouts (telegramId, exercise, date);
    `, {transaction});
}
