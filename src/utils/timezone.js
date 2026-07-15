import {Op} from 'sequelize';

const OFFSET_RE = /^([+-])(\d{1,2}):([0-5][0-9])$/;
const DAY_MS = 24 * 60 * 60 * 1000;
const formatterCache = new Map();

function fixedOffsetMinutes(value) {
    if (!value || value === 'UTC') return 0;
    const match = value.match(/^([+-])(\d{2}):([0-5][0-9])$/);
    if (!match) return null;
    const hours = Number.parseInt(match[2], 10);
    const minutePart = Number.parseInt(match[3], 10);
    if (hours > 14 || (hours === 14 && minutePart !== 0)) return null;
    const minutes = hours * 60 + minutePart;
    return match[1] === '+' ? minutes : -minutes;
}

function isValidIanaTimezone(value) {
    try {
        new Intl.DateTimeFormat('en-US', {timeZone: value}).format(0);
        return value.includes('/');
    } catch {
        return false;
    }
}

function getPartsFormatter(timezone) {
    const key = String(timezone);
    if (!formatterCache.has(key)) {
        formatterCache.set(key, new Intl.DateTimeFormat('en-US', {
            timeZone: key,
            hourCycle: 'h23',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }));
    }
    return formatterCache.get(key);
}

function zonedParts(date, timezone) {
    const parts = Object.fromEntries(
        getPartsFormatter(timezone).formatToParts(date)
            .filter(part => part.type !== 'literal')
            .map(part => [part.type, Number.parseInt(part.value, 10)]),
    );
    return {
        year: parts.year,
        month: parts.month,
        day: parts.day,
        hour: parts.hour === 24 ? 0 : parts.hour,
        minute: parts.minute,
        second: parts.second,
    };
}

function validateDateParts(year, month, day) {
    const candidate = new Date(Date.UTC(year, month - 1, day, 12));
    if (
        candidate.getUTCFullYear() !== year ||
        candidate.getUTCMonth() !== month - 1 ||
        candidate.getUTCDate() !== day
    ) {
        throw new Error('Invalid date');
    }
}

function parseDateInput(dateValue) {
    const match = String(dateValue || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) throw new Error('Invalid date');
    const year = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    const day = Number.parseInt(match[3], 10);
    validateDateParts(year, month, day);
    return {year, month, day};
}

function localDateTimeToUtc(parts, timezone) {
    const normalized = normalizeTimezoneOffset(timezone) || 'UTC';
    const wallClockUtc = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour || 0,
        parts.minute || 0,
        parts.second || 0,
        parts.millisecond || 0,
    );
    const fixed = fixedOffsetMinutes(normalized);
    if (fixed != null) return new Date(wallClockUtc - fixed * 60_000);

    let candidate = new Date(wallClockUtc);
    for (let index = 0; index < 4; index += 1) {
        const offset = getTimezoneOffsetMinutes(normalized, candidate);
        const next = new Date(wallClockUtc - offset * 60_000);
        if (next.getTime() === candidate.getTime()) break;
        candidate = next;
    }
    return candidate;
}

export function normalizeTimezoneOffset(timezone) {
    const value = String(timezone || '').trim();
    if (!value) return '';
    if (value.toUpperCase() === 'UTC' || value === 'Etc/UTC' || value === 'Etc/GMT') return 'UTC';
    const match = value.match(OFFSET_RE);
    if (!match) return value;
    const hours = Number.parseInt(match[2], 10);
    const minutes = Number.parseInt(match[3], 10);
    if (hours > 14 || (hours === 14 && minutes !== 0)) return value;
    return `${match[1]}${String(hours).padStart(2, '0')}:${match[3]}`;
}

export function isValidTimezone(timezone) {
    const normalized = normalizeTimezoneOffset(timezone);
    if (!normalized) return false;
    if (normalized === 'UTC') return true;
    if (fixedOffsetMinutes(normalized) != null) return true;
    return isValidIanaTimezone(normalized);
}

export function getTimezoneOffsetMinutes(timezone, date = new Date()) {
    const normalized = normalizeTimezoneOffset(timezone) || 'UTC';
    const fixed = fixedOffsetMinutes(normalized);
    if (fixed != null) return fixed;
    if (!isValidIanaTimezone(normalized)) throw new Error('Invalid timezone');

    const parts = zonedParts(date, normalized);
    const representedAsUtc = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second,
    );
    const sourceSeconds = Math.floor(date.getTime() / 1000) * 1000;
    return Math.round((representedAsUtc - sourceSeconds) / 60_000);
}

export function dateFromUserDateInput(dateValue, timezone = 'UTC') {
    const parts = parseDateInput(dateValue);
    return localDateTimeToUtc({...parts, hour: 12}, timezone);
}

export function startOfUserDate(dateValue, timezone = 'UTC') {
    const parts = parseDateInput(dateValue);
    return localDateTimeToUtc({...parts, hour: 0}, timezone);
}

export function nextUserDateStart(dateValue, timezone = 'UTC') {
    const {year, month, day} = parseDateInput(dateValue);
    const next = new Date(Date.UTC(year, month - 1, day) + DAY_MS);
    const nextKey = [
        next.getUTCFullYear(),
        String(next.getUTCMonth() + 1).padStart(2, '0'),
        String(next.getUTCDate()).padStart(2, '0'),
    ].join('-');
    return startOfUserDate(nextKey, timezone);
}

export function dateKeyInTimezone(date, timezone = 'UTC') {
    const source = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(source.getTime())) throw new Error('Invalid date');
    const normalized = normalizeTimezoneOffset(timezone) || 'UTC';
    const fixed = fixedOffsetMinutes(normalized);
    if (fixed != null) {
        const shifted = new Date(source.getTime() + fixed * 60_000);
        return [
            shifted.getUTCFullYear(),
            String(shifted.getUTCMonth() + 1).padStart(2, '0'),
            String(shifted.getUTCDate()).padStart(2, '0'),
        ].join('-');
    }
    const parts = zonedParts(source, normalized);
    return [parts.year, String(parts.month).padStart(2, '0'), String(parts.day).padStart(2, '0')].join('-');
}

export function convertToUserTimezone(utcDate, timezone = 'UTC') {
    const source = utcDate instanceof Date ? utcDate : new Date(utcDate);
    const normalized = normalizeTimezoneOffset(timezone) || 'UTC';
    const fixed = fixedOffsetMinutes(normalized);
    if (fixed != null) return new Date(source.getTime() + fixed * 60_000);
    const parts = zonedParts(source, normalized);
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second));
}

export function formatDateInTimezone(date, timezone, language = 'en', options = {}) {
    if (!date) return '';
    const source = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(source.getTime())) return '';
    const normalized = normalizeTimezoneOffset(timezone) || 'UTC';
    const locale = ({ru: 'ru-RU', de: 'de-DE', fr: 'fr-FR', en: 'en-US'})[language] || 'en-US';
    const defaultOptions = {year: 'numeric', month: '2-digit', day: '2-digit'};
    const fixed = fixedOffsetMinutes(normalized);
    if (fixed != null) {
        const shifted = new Date(source.getTime() + fixed * 60_000);
        return new Intl.DateTimeFormat(locale, {...defaultOptions, ...options, timeZone: 'UTC'}).format(shifted);
    }
    return new Intl.DateTimeFormat(locale, {...defaultOptions, ...options, timeZone: normalized}).format(source);
}

export function getStartOfDayInTimezone(date, timezone) {
    return startOfUserDate(dateKeyInTimezone(date, timezone), timezone);
}

export function getEndOfDayInTimezone(date, timezone) {
    return new Date(nextUserDateStart(dateKeyInTimezone(date, timezone), timezone).getTime() - 1);
}

export function getTimezoneOffsetSQL(timezone, date = new Date()) {
    const minutes = getTimezoneOffsetMinutes(timezone, date);
    if (!minutes) return '+0 hours';
    const sign = minutes >= 0 ? '+' : '-';
    const absolute = Math.abs(minutes);
    const hours = Math.floor(absolute / 60);
    const remainder = absolute % 60;
    return remainder ? `${sign}${hours} hours ${remainder} minutes` : `${sign}${hours} hours`;
}

// Kept for older callers. New WebUI queries use UTC boundaries because an IANA
// timezone may have different offsets across the rows being queried.
export function createDateGroupAttribute(sequelize, columnName = 'date', alias = 'd', timezone) {
    return [
        sequelize.fn('strftime', '%Y-%m-%d',
            sequelize.fn('datetime', sequelize.col(columnName), sequelize.literal(`'${getTimezoneOffsetSQL(timezone)}'`))),
        alias,
    ];
}

export function createDateFilterClause(sequelize, columnName = 'date', dateValue, timezone) {
    const start = startOfUserDate(dateValue, timezone);
    const end = nextUserDateStart(dateValue, timezone);
    return {[Op.gte]: start, [Op.lt]: end};
}
