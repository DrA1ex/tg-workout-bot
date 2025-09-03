/**
 * Common functions for workout flows
 */

import {cancelled, requestChoice, requestString, response} from "../runtime/primitives.js";
import {getUserLanguage} from "../i18n/index.js";
import {ExerciseDAO, UserDAO} from "../dao/index.js";

/**
 * Common function to add a new exercise
 * @param {Object} state - Flow state
 * @returns {Generator} Exercise name or null if cancelled
 */
export function* addNewExerciseCommon(state) {
    const {_} = yield getUserLanguage(state.telegramId);

    const name = yield requestString(state, _('addExercise.enterName'), {cancellable: true});
    if (!name) return yield cancelled(state);

    const notes = yield requestChoice(state,
        {__skip: _('buttons.skip'), __cancel: _('buttons.cancel'),},
        _('addExercise.enterNote'),
        {allowCustom: true}
    );

    if (notes === '__cancel') return yield cancelled(state);

    // Save to database using DAO
    yield ExerciseDAO.addUserExercise(state.telegramId, {
        name,
        notes: notes === "__skip" ? "" : notes
    });

    yield response(state, _('addExercise.exerciseAdded', {name}));
    return name;
}

/**
 * Get user and timezone from database
 * @param {Object} state - Flow state
 * @returns {Object} {user, timezone}
 */
export function* getUserAndTimezone(state) {
    const user = yield UserDAO.findByTelegramId(state.telegramId);
    const timezone = user?.timezone || 'UTC';
    return {user, timezone};
}

/**
 * Build exercise options with star marking for existing exercises
 * @param {Array} exercises - List of exercises to build options from
 * @param {Set} existingExercises - Set of already existing exercise names
 * @param {Function} _ - Localization function
 * @param {Object} additionalOptions - Additional options to add (e.g., cancel, retry)
 * @returns {Object} Options object for requestChoice
 */
export function buildExerciseOptions(exercises, existingExercises, _, additionalOptions = {}) {
    return exercises.reduce((acc, ex, id) => {
        acc[id] = existingExercises.has(ex.name) ? `★ ${ex.name}` : ex.name;
        return acc;
    }, additionalOptions);
}

/**
 * Get user's existing exercises as a Set of names
 * @param {string} telegramId - User's Telegram ID
 * @returns {Set<any>} Set of exercise names
 */
export function* getUserExercisesSet(telegramId) {
    const exercises = yield ExerciseDAO.getUserExercises(telegramId);
    return new Set(exercises.map(ex => typeof ex === 'string' ? ex : ex.name));
}

/**
 * Check if list is empty and respond with message if so
 * @param {Object} state - Flow state
 * @param {Array} list - List to check
 * @param {string} messageKey - Localization key for empty message
 * @param {Function} _ - Localization function
 * @returns {Generator}
 */
export function* checkEmptyListAndRespond(state, list, messageKey, _) {
    if (!list || list.length === 0) {
        yield response(state, _(messageKey));
        return true;
    }
    return false;
}

/**
 * Validation functions for workout inputs
 */
export const validators = {
    /**
     * Validate positive integer input
     * @param {string} txt - Input text
     * @returns {boolean} true if valid
     */
    positiveInteger(txt) {
        const num = parseInt(txt.trim());
        return !isNaN(num) && num > 0 && txt.trim() === num.toString();
    },

    /**
     * Validate positive float input (allows empty for skip)
     * @param {string} txt - Input text
     * @returns {boolean} true if valid
     */
    positiveFloat(txt) {
        if (!txt || txt.trim() === '') return true; // Allow empty for skip
        const num = parseFloat(txt.trim());
        return !isNaN(num) && num >= 0 && txt.trim() === num.toString();
    },

    /**
     * Validate reps or time input (supports both numbers and time with 's' suffix)
     * @param {string} txt - Input text
     * @returns {boolean} true if valid
     */
    repsOrTime(txt) {
        const input = txt.trim();
        if (input.endsWith("s") || input.endsWith("с")) {
            const num = parseFloat(input.slice(0, -1));
            return !isNaN(num) && num > 0 && input.slice(0, -1) === num.toString();
        } else {
            const num = parseFloat(input);
            return !isNaN(num) && num > 0 && input === num.toString();
        }
    }
};
