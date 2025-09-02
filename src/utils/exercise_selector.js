import {requestChoice, cancelled} from "../runtime/primitives.js";
import {WorkoutDAO} from "../dao/index.js";

/**
 * Select exercise from user's exercise list
 * @param {object} state - Flow state
 * @param {Array} exercises - Array of exercise names
 * @param {string} title - Title for selection
 * @param {function} _ - Localization function
 * @returns {string} Selected exercise name or null if cancelled
 */
export function* selectExercise(state, exercises, title, _) {
    if (!exercises.length) {
        return null;
    }

    const exOptions = exercises.reduce((acc, ex, idx) => {
        acc[idx] = ex;
        return acc;
    }, {cancel: _('buttons.cancel')});

    const exKey = yield requestChoice(state, exOptions, title);
    if (exKey === "cancel") return yield cancelled(state);

    return exercises[exKey];
}

/**
 * Get and select exercise from user's database
 * @param {object} state - Flow state
 * @param {string} title - Title for selection
 * @param {function} _ - Localization function
 * @returns {string} Selected exercise name or null if cancelled
 */
export function* getAndSelectExercise(state, title, _) {
    const exercises = yield WorkoutDAO.getUniqueExercises(state.telegramId);
    return yield* selectExercise(state, exercises, title, _);
}
