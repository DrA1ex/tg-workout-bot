import {cancelled, requestChoice, requestString, response, responseMarkdown} from "../runtime/primitives.js";
import {getUserLanguage} from "../i18n/index.js";
import {UserDAO} from "../dao/index.js";

// List of popular timezones with their UTC offsets
const TIMEZONES = [
    {name: 'UTC', offset: '+00:00'},
    {name: 'Asia/Yekaterinburg', offset: '+05:00'},
    {name: 'Europe/Moscow', offset: '+03:00'},
    {name: 'Europe/London', offset: '+00:00'},
    {name: 'Europe/Berlin', offset: '+01:00'},
    {name: 'Europe/Paris', offset: '+01:00'},
    {name: 'America/New_York', offset: '-05:00'},
    {name: 'America/Los_Angeles', offset: '-08:00'},
    {name: 'Asia/Tokyo', offset: '+09:00'},
    {name: 'Asia/Shanghai', offset: '+08:00'},
    {name: 'Australia/Sydney', offset: '+10:00'}
];

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

        // For unknown format return Unknown
        return 'Unknown';
    } catch (error) {
        console.error('Error calculating timezone offset:', error);
        return 'Unknown';
    }
}

/**
 * Convert IANA timezone to UTC offset
 * @param {string} ianaTimezone - IANA timezone (e.g., Europe/Moscow)
 * @returns {string} - UTC offset (e.g., +03:00)
 */
function convertIANAToUTCOffset(ianaTimezone) {
    const found = TIMEZONES.find(tz => tz.name === ianaTimezone);
    if (found) {
        return found.offset;
    }

    // If not found, return UTC
    console.warn(`Unknown IANA timezone: ${ianaTimezone}, using UTC`);
    return '+00:00';
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

    // Check UTC offset format (e.g., +03:00, -05:00)
    const offsetRegex = /^[+-](0[0-9]|1[0-2]):[0-5][0-9]$/;

    // Check UTC format (e.g., UTC)
    const utcRegex = /^UTC$/i;

    return offsetRegex.test(timezone) || utcRegex.test(timezone);
}

export function* timezoneSettings(state) {
    const {_, language} = yield getUserLanguage(state.telegramId);

    // Get current user timezone
    const user = yield UserDAO.findByTelegramId(state.telegramId);
    const currentTimezone = user?.timezone || 'UTC';

    // Show current timezone
    const currentOffset = getTimezoneOffset(currentTimezone);
    yield responseMarkdown(state, _('timezone.current', {timezone: currentTimezone, offset: currentOffset}));

    // Create timezone selection options
    const timezoneOptions = TIMEZONES.reduce((acc, tz, idx) => {
        const displayName = `${tz.name} (${tz.offset})`;
        acc[idx] = displayName;
        return acc;
    }, {
        custom: _('timezone.custom'),
        cancel: _('buttons.cancel')
    });

    yield response(state, _('timezone.selectPrompt'));

    const timezoneKey = yield requestChoice(state, timezoneOptions, _('timezone.select'));

    if (timezoneKey === "cancel") return yield cancelled(state);

    let selectedTimezone;
    let selectedOffset;

    if (timezoneKey === "custom") {
        // User wants to enter custom timezone
        yield response(state, _('timezone.enterCustom'));

        const customTimezone = yield requestString(state, _('timezone.enterCustomPrompt'), {
            validator: (input) => {
                if (!input || input.trim().length === 0) {
                    return false;
                }
                return validateTimezone(input.trim());
            }
        });

        if (!customTimezone) {
            yield response(state, _('timezone.invalidFormat'));
            return yield cancelled(state);
        }

        selectedTimezone = customTimezone.trim();
        selectedOffset = getTimezoneOffset(selectedTimezone);
    } else {
        // User selected from list - convert IANA to UTC offset
        const selectedIANA = TIMEZONES[timezoneKey];
        selectedTimezone = convertIANAToUTCOffset(selectedIANA.name); // Save UTC offset
        selectedOffset = selectedIANA.offset; // For display use original offset
    }

    // Update user timezone (always in UTC offset format)
    if (user) {
        yield UserDAO.updateTimezone(state.telegramId, selectedTimezone);
    } else {
        // Create user if doesn't exist
        yield UserDAO.findOrCreate(state.telegramId, {timezone: selectedTimezone});
    }

    yield responseMarkdown(state, _('timezone.updated', {timezone: selectedTimezone, offset: selectedOffset}));
}
