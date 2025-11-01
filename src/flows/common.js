/**
 * Common functions for workout flows
 */

import {cancelled, requestChoice, requestString, response} from "../runtime/primitives.js";
import {getUserLanguage, setUserLanguage} from "../i18n/index.js";
import {AlreadyExistsError, ExerciseDAO, UserDAO} from "../dao/index.js";

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
    try {
        yield ExerciseDAO.addUserExercise(state.telegramId, {
            name,
            notes: notes === "__skip" ? "" : notes
        });
    } catch (error) {
        if (error instanceof AlreadyExistsError) {
            return yield response(state, _('addExercise.exerciseExists', {name}));
        }
    }

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

/**
 * Common function to select language
 * @param {Object} state - Flow state
 * @returns {Generator} Selected language code or null if cancelled
 */
export function* selectLanguageCommon(state) {
    const {_} = yield getUserLanguage(state.telegramId);

    // Dynamically get available languages from locales
    const {locales} = yield import("../i18n/locales/index.js");
    const availableLanguages = Object.keys(locales);

    // Build language options dynamically
    const languageOptions = {};
    availableLanguages.forEach(lang => {
        languageOptions[lang] = _(`language.${lang}`);
    });
    languageOptions.cancel = _('buttons.cancel');

    const languageChoice = yield requestChoice(
        state,
        languageOptions,
        _('language.select')
    );

    if (languageChoice === 'cancel') {
        return yield cancelled(state);
    }

    // Set the new language
    yield setUserLanguage(state.telegramId, languageChoice);

    // Return language choice without sending confirmation message
    return languageChoice;
}

/**
 * Common function to select timezone
 * @param {Object} state - Flow state
 * @returns {Generator} Selected timezone or null if cancelled
 */
// Single comprehensive timezone list with display names and offsets
// Sorted by UTC offset from +14:00 to -12:00
export const timezones = {
    'Asia/Kamchatka': {display: '+12:00 (Kamchatka, Anadyr, Magadan)', offset: '+12:00'},
    'Asia/Vladivostok': {display: '+11:00 (Vladivostok, Sakhalin, Magadan)', offset: '+11:00'},
    'Australia/Sydney': {display: '+10:00 (Sydney, Melbourne, Brisbane)', offset: '+10:00'},
    'Asia/Tokyo': {display: '+09:00 (Tokyo, Seoul, Pyongyang)', offset: '+09:00'},
    'Asia/Shanghai': {display: '+08:00 (Beijing, Singapore, Hong Kong)', offset: '+08:00'},
    'Asia/Bangkok': {display: '+07:00 (Bangkok, Jakarta, Ho Chi Minh)', offset: '+07:00'},
    'Asia/Almaty': {display: '+06:00 (Almaty, Dhaka, Omsk)', offset: '+06:00'},
    'Asia/Kolkata': {display: '+05:30 (Mumbai, Delhi, Kolkata)', offset: '+05:30'},
    'Asia/Yekaterinburg': {display: '+05:00 (Yekaterinburg, Tashkent, Samarkand)', offset: '+05:00'},
    'Asia/Dubai': {display: '+04:00 (Dubai, Baku, Tbilisi)', offset: '+04:00'},
    'Europe/Moscow': {display: '+03:00 (Moscow, Istanbul, Riyadh)', offset: '+03:00'},
    'Europe/Berlin': {display: '+01:00 (Berlin, Paris, Rome)', offset: '+01:00'},
    'Europe/Paris': {display: '+01:00 (Paris, Berlin, Rome)', offset: '+01:00'},
    'Europe/London': {display: '+00:00 (London, Lisbon, Dublin)', offset: '+00:00'},
    'UTC': {display: 'UTC (Greenwich, Accra, Casablanca)', offset: 'UTC'},
    'America/Sao_Paulo': {display: '-03:00 (Sao Paulo, Buenos Aires, Brasilia)', offset: '-03:00'},
    'America/Santiago': {display: '-04:00 (Santiago, Caracas, La Paz)', offset: '-04:00'},
    'America/New_York': {display: '-05:00 (New York, Toronto, Havana)', offset: '-05:00'},
    'America/Chicago': {display: '-06:00 (Chicago, Mexico City, Winnipeg)', offset: '-06:00'},
    'America/Denver': {display: '-07:00 (Denver, Phoenix, Calgary)', offset: '-07:00'},
    'America/Anchorage': {display: '-09:00 (Anchorage, Juneau, Fairbanks)', offset: '-09:00'},
    'Pacific/Honolulu': {display: '-10:00 (Honolulu, Papeete, Rarotonga)', offset: '-10:00'}
};

export function* selectTimezoneCommon(state) {
    const {_} = yield getUserLanguage(state.telegramId);

    // Build options for display with custom option
    const timezoneOptions = {};
    Object.entries(timezones).forEach(([key, value]) => {
        timezoneOptions[key] = value.display;
    });
    timezoneOptions.custom = _('timezone.custom');
    timezoneOptions.cancel = _('buttons.cancel');

    const timezoneKey = yield requestChoice(state, timezoneOptions, _('timezone.select'));

    if (timezoneKey === "cancel") return yield cancelled(state);

    let timezoneToSave;
    let selectedTimezone;

    if (timezoneKey === "custom") {
        // User wants to enter custom timezone - ask directly for UTC offset
        const customOffset = yield requestString(state, _('timezone.enterOffsetPrompt'));

        if (!customOffset) return yield cancelled(state);

        // Validate custom offset format
        const offsetRegex = /^[+-](0[0-9]|1[0-2]):[0-5][0-9]$/;
        if (!offsetRegex.test(customOffset)) {
            yield response(state, _('timezone.invalidFormat'));
            return yield cancelled(state);
        }

        timezoneToSave = customOffset;
        selectedTimezone = customOffset;
    } else {
        // User selected from predefined list
        timezoneToSave = timezones[timezoneKey].offset;
        selectedTimezone = timezoneKey;
    }

    // Update user timezone
    const user = yield UserDAO.findByTelegramId(state.telegramId);
    if (user) {
        yield UserDAO.updateTimezone(state.telegramId, timezoneToSave);
    } else {
        // Create user if doesn't exist
        yield UserDAO.findOrCreate(state.telegramId, {timezone: timezoneToSave});
    }

    // Return both the timezone key and offset for proper display
    return {timezoneKey: selectedTimezone, offset: timezoneToSave};
}
