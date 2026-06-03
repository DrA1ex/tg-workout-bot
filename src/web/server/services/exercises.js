import {ExerciseDAO, UserDAO} from "../../../dao/index.js";

export function normalizeExercise(exercise) {
    if (typeof exercise === "string") return {name: exercise, notes: ""};
    return {name: exercise.name, notes: exercise.notes || ""};
}

export async function getUserExercisesNormalized(telegramId) {
    return (await ExerciseDAO.getUserExercises(telegramId)).map(normalizeExercise);
}

export async function setUserExerciseList(telegramId, exercises) {
    exercises.sort((a, b) => a.name.localeCompare(b.name));
    await UserDAO.updateExercises(telegramId, exercises);
    return exercises;
}
