import {ExerciseDAO, UserDAO} from "../../../dao/index.js";
import {models} from "../../../db/index.js";

export function normalizeExercise(exercise) {
    if (typeof exercise === "string") return {name: exercise, notes: ""};
    return {name: exercise.name, notes: exercise.notes || ""};
}

export async function getUserExercisesNormalized(telegramId) {
    return (await ExerciseDAO.getUserExercises(telegramId)).map(normalizeExercise);
}

export async function getRecentUserExercises(telegramId, limit = 10) {
    const normalized = await getUserExercisesNormalized(telegramId);
    const byName = new Map(normalized.map(exercise => [exercise.name, exercise]));
    if (!byName.size) return [];

    const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 10, 1), 25);
    const q = models.Workout.sequelize;
    const rows = await models.Workout.findAll({
        attributes: [
            "exercise",
            [q.fn("MAX", q.col("date")), "lastUsedAt"],
            [q.fn("COUNT", q.col("id")), "usageCount"],
        ],
        where: {telegramId: String(telegramId)},
        group: ["exercise"],
        order: [[q.fn("MAX", q.col("date")), "DESC"]],
        limit: safeLimit * 5,
    });

    return rows
        .map(row => ({
            ...byName.get(row.exercise),
            lastUsedAt: row.get("lastUsedAt"),
            usageCount: Number(row.get("usageCount") || 0),
        }))
        .filter(exercise => exercise.name)
        .slice(0, safeLimit);
}

export async function setUserExerciseList(telegramId, exercises) {
    exercises.sort((a, b) => a.name.localeCompare(b.name));
    await UserDAO.updateExercises(telegramId, exercises);
    return exercises;
}
