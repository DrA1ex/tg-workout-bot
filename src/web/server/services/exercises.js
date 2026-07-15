import {ExerciseDAO} from "../../../dao/index.js";
import {models} from "../../../db/index.js";
import {HttpError} from "../errors.js";

export function normalizeExercise(exercise) {
    if (typeof exercise === "string") return {name: exercise, notes: ""};
    return {name: String(exercise?.name || "").trim(), notes: String(exercise?.notes || "").trim()};
}

export async function getUserExercisesNormalized(telegramId) {
    return await ExerciseDAO.getUserExercises(telegramId);
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

export async function applyUserExerciseChanges(telegramId, changes) {
    return await ExerciseDAO.applyUserExerciseChanges(telegramId, changes);
}

export async function updateUserExercise(telegramId, exerciseName, updates) {
    const currentName = String(exerciseName || "").trim();
    if (!currentName) throw new HttpError(400, "Exercise name is required", "VALIDATION_ERROR");
    const hasName = Object.hasOwn(updates, "name");
    const hasNotes = Object.hasOwn(updates, "notes");

    return await ExerciseDAO.mutateUserExercises(telegramId, async (exercises, transaction) => {
        const index = exercises.findIndex(exercise => exercise.name === currentName);
        if (index === -1) throw new HttpError(404, "Exercise not found", "EXERCISE_NOT_FOUND");

        const current = exercises[index];
        const nextName = hasName ? String(updates.name || "").trim() : current.name;
        const nextNotes = hasNotes ? String(updates.notes || "").trim() : current.notes;
        if (!nextName) throw new HttpError(400, "Exercise name is required", "VALIDATION_ERROR");

        const hasDuplicate = exercises.some((exercise, exerciseIndex) =>
            exerciseIndex !== index && exercise.name.toLocaleLowerCase() === nextName.toLocaleLowerCase()
        );
        if (hasDuplicate) throw new HttpError(409, "Exercise already exists", "EXERCISE_EXISTS");

        exercises[index] = {name: nextName, notes: nextNotes};
        if (nextName !== currentName) {
            await models.Workout.update(
                {exercise: nextName},
                {where: {telegramId: String(telegramId), exercise: currentName}, transaction},
            );
            await models.GlobalExercise.upsert({name: nextName}, {transaction});
        }

        return {
            exercises,
            added: [],
            deleted: [],
            updated: {previousName: currentName, exercise: exercises[index]},
        };
    });
}
