import {cancelled, requestChoice} from "../runtime/primitives.js";

/**
 * Universal pagination utility for displaying lists with pagination
 * @param {object} state - Flow state
 * @param {Array} items - Array of items to paginate
 * @param {string} title - Title for the pagination
 * @param {function} formatItem - Function to format each item (item, index) => string
 * @param {number} perPage - Items per page (default: 10)
 * @param {function} _ - Localization function
 * @returns {*} Selected item or null if cancelled
 */
export function* paginateItems(state, items, title, formatItem, perPage = 10, _) {
    if (!items.length) {
        return null;
    }

    let page = 0;
    while (true) {
        // Create page
        const pageItems = items.slice(page * perPage, (page + 1) * perPage);
        const options = {};

        pageItems.forEach((item, index) => {
            const globalIndex = page * perPage + index;
            options[globalIndex] = formatItem(item, globalIndex);
        });

        // Add navigation buttons
        if (page > 0) options["prev"] = _('buttons.previous');
        if ((page + 1) * perPage < items.length) options["next"] = _('buttons.next');
        options["cancel"] = _('buttons.cancel');

        const choice = yield requestChoice(state, options, title, {deletePrevious: true});

        if (choice === "cancel") return yield cancelled(state);
        if (choice === "prev") {
            page--;
            continue;
        }
        if (choice === "next") {
            page++;
            continue;
        }

        // User selected an item
        return items[choice];
    }
}

/**
 * Paginate dates with timezone support
 * @param {object} state - Flow state
 * @param {Array} dates - Array of date strings (YYYY-MM-DD)
 * @param {string} title - Title for the pagination
 * @param {string} language - User language
 * @param {string} timezone - User timezone
 * @param {function} formatDate - Function to format dates
 * @param {function} _ - Localization function
 * @returns {string} Selected date or null if cancelled
 */
export function* paginateDates(state, dates, title, language, timezone, formatDate, _) {
    const formatDateItem = (date) => formatDate(new Date(date), language, timezone);
    return yield* paginateItems(state, dates, title, formatDateItem, 10, _);
}

/**
 * Paginate exercises with support for marking already added ones
 * @param {object} state - Flow state
 * @param {Array} exercises - Array of exercise objects
 * @param {Set} existingExercises - Set of already added exercise names
 * @param {string} title - Title for the pagination
 * @param {function} _ - Localization function
 * @param {number} perPage - Items per page (default: 10)
 * @returns {object} Selected exercise or null if cancelled
 */
export function* paginateExercises(state, exercises, existingExercises, title, _, perPage = 10) {
    if (!exercises.length) {
        return null;
    }

    const formatExerciseItem = (exercise) => {
        return existingExercises.has(exercise.name) ? `★ ${exercise.name}` : exercise.name;
    };

    return yield* paginateItems(state, exercises, title, formatExerciseItem, perPage, _);
}
