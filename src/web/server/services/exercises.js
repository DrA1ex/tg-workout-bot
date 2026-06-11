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

function apiError(message, status) {
    const error = new Error(message);
    error.status = status;
    return error;
}

export async function updateUserExercise(telegramId, exerciseName, updates) {
    const currentName = String(exerciseName || "").trim();
    const nextName = String(updates.name || currentName).trim();
    const nextNotes = String(updates.notes || "").trim();
    if (!nextName) throw apiError("Exercise name is required", 400);

    let nextExercises = [];
    await models.User.sequelize.transaction(async transaction => {
        const user = await models.User.findByPk(String(telegramId), {transaction});
        if (!user) throw apiError("User not found", 404);

        const exercises = JSON.parse(user.exercises || "[]").map(normalizeExercise);
        const index = exercises.findIndex(exercise => exercise.name === currentName);
        if (index === -1) throw apiError("Exercise not found", 404);

        const hasDuplicate = exercises.some((exercise, exerciseIndex) =>
            exerciseIndex !== index &&
            exercise.name.toLowerCase() === nextName.toLowerCase()
        );
        if (hasDuplicate) throw apiError("Exercise already exists", 409);

        exercises[index] = {name: nextName, notes: nextNotes};
        exercises.sort((a, b) => a.name.localeCompare(b.name));

        user.exercises = JSON.stringify(exercises);
        await user.save({transaction});

        if (nextName !== currentName) {
            await models.Workout.update(
                {exercise: nextName},
                {where: {telegramId: String(telegramId), exercise: currentName}, transaction}
            );
            await models.GlobalExercise.findOrCreate({
                where: {name: nextName},
                defaults: {name: nextName},
                transaction,
            });
        }

        nextExercises = exercises;
    });

    return nextExercises;
}
