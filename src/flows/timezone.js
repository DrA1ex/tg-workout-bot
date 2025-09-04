import {responseMarkdown} from "../runtime/primitives.js";
import {getUserLanguage} from "../i18n/index.js";
import {UserDAO} from "../dao/index.js";
import {selectTimezoneCommon, timezones} from "./common.js";


/**
 * Get timezone offset for arbitrary timezone
 * @param {string} timezone - Timezone
 * @returns {string} - Offset in format +HH:MM or -HH:MM
 */
export function getTimezoneOffset(timezone) {
    try {
        // For UTC offset format (+03:00, -05:00) - return as is
        if (timezone.match(/^[+-](0[0-9]|1[0-2]):[0-5][0-9]$/)) {
            return timezone;
        }

        // For UTC return +00:00
        if (timezone.toUpperCase() === 'UTC') {
            return '+00:00';
        }

        // Check if it's in our known timezones list from common.js
        const found = timezones[timezone];
        if (found) {
            return found.offset;
        }

        // For unknown format return Unknown
        return 'Unknown';
    } catch (error) {
        console.error('Error calculating timezone offset:', error);
        return 'Unknown';
    }
}
/**
 * Validate timezone
 * @param {string} timezone - Timezone to validate
 * @returns {boolean} - Is timezone valid
 */
export function validateTimezone(timezone) {
    if (!timezone || typeof timezone !== 'string') {
        return false;
    }

    if (timezone === 'UTC') {
        return true;
    }

    // Check UTC offset format (e.g., +03:00, -05:00)
    const offsetRegex = /^[+-](0[0-9]|1[0-2]):[0-5][0-9]$/;
    if (offsetRegex.test(timezone)) {
        return true;
    }

    // Check if it's in our known timezones list from common.js
    return timezones.hasOwnProperty(timezone);
}

export function* timezoneSettings(state) {
    const {_} = yield getUserLanguage(state.telegramId);

    // Get current user timezone
    const user = yield UserDAO.findByTelegramId(state.telegramId);
    const currentTimezone = user?.timezone || 'UTC';

    // Show current timezone
    const currentOffset = getTimezoneOffset(currentTimezone);
    yield responseMarkdown(state, _('timezone.current', {timezone: currentTimezone, offset: currentOffset}));

    // Use common timezone selection function
    const result = yield* selectTimezoneCommon(state);
    
    if (result) {
        // Show updated timezone info with correct data
        yield responseMarkdown(state, _('timezone.updated', {timezone: result.timezoneKey, offset: result.offset}));
    }
}
