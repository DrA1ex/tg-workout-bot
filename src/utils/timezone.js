import {t} from '../i18n/index.js';

const KNOWN_TIMEZONE_OFFSETS = Object.freeze({
    'Asia/Kamchatka': '+12:00',
    'Asia/Vladivostok': '+11:00',
    'Australia/Sydney': '+10:00',
    'Asia/Tokyo': '+09:00',
    'Asia/Shanghai': '+08:00',
    'Asia/Bangkok': '+07:00',
    'Asia/Almaty': '+06:00',
    'Asia/Kolkata': '+05:30',
    'Asia/Yekaterinburg': '+05:00',
    'Asia/Dubai': '+04:00',
    'Europe/Moscow': '+03:00',
    'Europe/Berlin': '+01:00',
    'Europe/Paris': '+01:00',
    'Europe/London': '+00:00',
    'America/Sao_Paulo': '-03:00',
    'America/Santiago': '-04:00',
    'America/New_York': '-05:00',
    'America/Chicago': '-06:00',
    'America/Denver': '-07:00',
    'America/Anchorage': '-09:00',
    'Pacific/Honolulu': '-10:00',
});

export function normalizeTimezoneOffset(timezone) {
    const value = String(timezone || '').trim();
    if (!value) return '';
    if (value.toUpperCase() === 'UTC') return 'UTC';
    if (Object.hasOwn(KNOWN_TIMEZONE_OFFSETS, value)) return KNOWN_TIMEZONE_OFFSETS[value];

    const match = value.match(/^([+-])(\d{1,2}):([0-5][0-9])$/);
    if (!match) return value;

    const hours = Number.parseInt(match[2], 10);
    if (hours > 12) return value;
    return `${match[1]}${String(hours).padStart(2, '0')}:${match[3]}`;
}

export function isValidTimezone(timezone) {
    const normalizedTimezone = normalizeTimezoneOffset(timezone);
    if (!normalizedTimezone) return false;
    if (normalizedTimezone === 'UTC') return true;
    return /^[+-](0[0-9]|1[0-2]):[0-5][0-9]$/.test(normalizedTimezone);
}

export function getTimezoneOffsetMinutes(timezone) {
    const normalizedTimezone = normalizeTimezoneOffset(timezone);
    if (!normalizedTimezone || normalizedTimezone === 'UTC') return 0;

    const match = normalizedTimezone.match(/^([+-])(0[0-9]|1[0-2]):([0-5][0-9])$/);
    if (!match) throw new Error("Invalid timezone");

    const minutes = Number.parseInt(match[2], 10) * 60 + Number.parseInt(match[3], 10);
    return match[1] === '+' ? minutes : -minutes;
}

export function dateFromUserDateInput(dateValue, timezone = 'UTC') {
    const match = String(dateValue || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) throw new Error("Invalid date");

    const year = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    const day = Number.parseInt(match[3], 10);
    const localNoonUtc = Date.UTC(year, month - 1, day, 12, 0, 0, 0);
    const localNoon = new Date(localNoonUtc);

    if (
        localNoon.getUTCFullYear() !== year ||
        localNoon.getUTCMonth() !== month - 1 ||
        localNoon.getUTCDate() !== day
    ) {
        throw new Error("Invalid date");
    }

    return new Date(localNoonUtc - getTimezoneOffsetMinutes(timezone) * 60 * 1000);
}

/**
 * Convert UTC date to user's timezone
 * @param {Date} utcDate - UTC date
 * @param {string} timezone - User's timezone (UTC offset format, e.g., '+03:00', 'UTC')
 * @returns {Date} Date in user's timezone
 */
export function convertToUserTimezone(utcDate, timezone) {
    const normalizedTimezone = normalizeTimezoneOffset(timezone);
    if (!normalizedTimezone || normalizedTimezone === 'UTC') {
        return utcDate;
    }

    try {
        // Handle UTC offset format (e.g., +03:00, -05:00)
        if (normalizedTimezone.match(/^[+-](0[0-9]|1[0-2]):[0-5][0-9]$/)) {
            const sign = normalizedTimezone[0];
            const hours = parseInt(normalizedTimezone.substring(1, 3));
            const minutes = parseInt(normalizedTimezone.substring(4, 6));
            const offsetMs = (hours * 60 + minutes) * 60 * 1000;

            if (sign === '+') {
                return new Date(utcDate.getTime() + offsetMs);
            } else {
                return new Date(utcDate.getTime() - offsetMs);
            }
        }

        // For unknown format, return original date
        console.warn(`Unknown timezone format: ${timezone}, using UTC`);
        return utcDate;

    } catch (error) {
        console.error('Error converting timezone:', error);
        return utcDate; // Fallback to original date
    }
}

/**
 * Format date in user's timezone
 * @param {Date} date - Date to format
 * @param {string} timezone - User's timezone (UTC offset format)
 * @param {string} language - User's language
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDateInTimezone(date, timezone, language = 'en', options = {}) {
    if (!date) return '';

    try {
        const userDate = convertToUserTimezone(date, timezone);
        const locale = t(language, 'locale.date');

        const defaultOptions = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: 'UTC'
        };

        return new Intl.DateTimeFormat(locale, {...defaultOptions, ...options}).format(userDate);
    } catch (error) {
        console.error('Error formatting date in timezone:', error);
        // Fallback to simple date formatting
        return date.toLocaleDateString();
    }
}

/**
 * Get start of day in user's timezone
 * @param {Date} date - Date to get start of day for
 * @param {string} timezone - User's timezone (UTC offset format)
 * @returns {Date} Start of day in user's timezone
 */
export function getStartOfDayInTimezone(date, timezone) {
    const userDate = convertToUserTimezone(date, timezone);
    const startOfDay = new Date(userDate);
    startOfDay.setHours(0, 0, 0, 0);
    return startOfDay;
}

/**
 * Get end of day in user's timezone
 * @param {date} date - Date to get end of day for
 * @param {string} timezone - User's timezone (UTC offset format)
 * @returns {Date} End of day in user's timezone
 */
export function getEndOfDayInTimezone(date, timezone) {
    const userDate = convertToUserTimezone(date, timezone);
    const endOfDay = new Date(userDate);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay;
}

/**
 * Get SQL offset string for timezone (for use in SQLite queries)
 * @param {string} timezone - User's timezone (UTC offset format)
 * @returns {string} SQL offset string (e.g., '+3 hours', '-5 hours')
 */
export function getTimezoneOffsetSQL(timezone) {
    const normalizedTimezone = normalizeTimezoneOffset(timezone);
    if (!normalizedTimezone) {
        return '+0 hours';
    }

    try {
        // For UTC offset format (+03:00, -05:00) - convert to SQL format
        if (normalizedTimezone.match(/^[+-](0[0-9]|1[0-2]):[0-5][0-9]$/)) {
            const sign = normalizedTimezone[0];
            const hours = parseInt(normalizedTimezone.substring(1, 3));
            const minutes = parseInt(normalizedTimezone.substring(4, 6));

            if (minutes === 0) {
                return `${sign}${hours} hours`;
            } else {
                return `${sign}${hours} hours ${minutes} minutes`;
            }
        }

        // For UTC return +0 hours
        if (normalizedTimezone.toUpperCase() === 'UTC') {
            return '+0 hours';
        }

        // For unknown format return UTC
        console.warn(`Unknown timezone format: ${timezone}, using UTC`);
        return '+0 hours';

    } catch (error) {
        console.error('Error calculating timezone offset:', error);
        return '+0 hours'; // Fallback to UTC
    }
}

/**
 * Create Sequelize attribute for grouping by date with timezone support
 * @param {object} sequelize - Sequelize instance
 * @param {string} columnName - Name of the date column (default: 'date')
 * @param {string} alias - Alias for the result (default: 'd')
 * @param {string} timezone - User's timezone
 * @returns {array} Sequelize attribute array [function, alias]
 */
export function createDateGroupAttribute(sequelize, columnName = 'date', alias = 'd', timezone) {
    const q = sequelize;

    return [
        q.fn("strftime", "%Y-%m-%d",
            q.fn("datetime",
                q.col(columnName),
                q.literal(`'${getTimezoneOffsetSQL(timezone)}'`)
            )
        ),
        alias
    ];
}

/**
 * Create Sequelize where clause for filtering by date with timezone support
 * @param {object} sequelize - Sequelize instance
 * @param {string} columnName - Name of the date column (default: 'date')
 * @param {string} dateValue - Date value to filter by (YYYY-MM-DD format)
 * @param {string} timezone - User's timezone
 * @returns {object} Sequelize where clause
 */
export function createDateFilterClause(sequelize, columnName = 'date', dateValue, timezone) {
    const q = sequelize;

    return q.where(
        q.fn("strftime", "%Y-%m-%d",
            q.fn("datetime",
                q.col(columnName),
                q.literal(`'${getTimezoneOffsetSQL(timezone)}'`)
            )
        ),
        dateValue
    );
}
