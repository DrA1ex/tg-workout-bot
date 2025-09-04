import {Markup} from "telegraf";
import {locales} from "./locales/index.js";
import {formatDateInTimezone} from "../utils/timezone.js";
import {UserDAO} from "../dao/index.js";

/**
 * Get user's language preference and a localizer function
 * @param {number|string} telegramId - Telegram user ID
 * @returns {Promise<{_: (key: string, params?: Object) => string, language: string}>} 
 *          Resolves to an object with a localizer function (_) and the user's language code (en/ru)
 */
export async function getUserLanguage(telegramId) {
    let language;
    try {
        const user = await UserDAO.findByTelegramId(telegramId);
        language = user?.language || 'en';
    } catch (error) {
        console.error('Error getting user language:', error);
        language = 'en';
    }

    return {
        _: (key, params = {}) => t(language, key, params),
        language
    }
}

/**
 * Get user's language from Telegram API (without saving to database)
 * @param {string} telegramLanguageCode - Language code from ctx.from.language_code
 * @returns {string} Best matching language code from our supported locales
 */
export function detectUserLanguage(telegramLanguageCode) {
    if (!telegramLanguageCode) {
        return 'en'; // Default fallback
    }

    // Normalize to lowercase for case-insensitive comparison
    const normalizedCode = telegramLanguageCode.toLowerCase();

    // Direct match (case-insensitive)
    if (locales[normalizedCode]) {
        return normalizedCode;
    }

    // Handle language variants (e.g., 'en-US' -> 'en', 'ru-RU' -> 'ru')
    const baseLanguage = normalizedCode.split('-')[0];
    if (locales[baseLanguage]) {
        return baseLanguage;
    }

    // Fallback to English for unsupported languages
    return 'en';
}



/**
 * Set user's preferred language
 * @param {number} telegramId - Telegram user ID
 * @param {string} language - Language code (en/ru)
 */
export async function setUserLanguage(telegramId, language) {
    try {
        const [user] = await UserDAO.findOrCreate(telegramId, {language});
        await UserDAO.updateLanguage(telegramId, language);
    } catch (error) {
        console.error('Error setting user language:', error);
    }
}

/**
 * Get localized text for a key
 * @param {string} language - Language code
 * @param {string} key - Translation key
 * @param {object} params - Parameters for interpolation
 * @returns {string} Localized text
 */
export function t(language, key, params = {}) {
    // Try to get text from requested language first
    let locale = locales[language];
    let text = key.split('.').reduce((obj, k) => obj?.[k], locale);
    
    // If not found in requested language, fallback to English
    if (!text && language !== 'en') {
        locale = locales.en;
        text = key.split('.').reduce((obj, k) => obj?.[k], locale);
    }
    
    // If still not found, use key as fallback
    if (!text) {
        text = key;
    }

    // Simple parameter interpolation
    Object.keys(params).forEach(param => {
        text = text.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
    });

    return text;
}

/**
 * Format date according to user's locale and timezone
 * @param {Date} date - Date to format
 * @param {string} language - Language code (en/ru)
 * @param {string} timezone - User's timezone
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date
 */
export function formatDate(date, language = 'en', timezone = 'UTC', options = {}) {
    if (timezone && timezone !== 'UTC') {
        return formatDateInTimezone(date, timezone, language, options);
    }

    // Fallback to original implementation for UTC
    const locale = t(language, 'locale.date');
    const defaultOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    };

    return new Intl.DateTimeFormat(locale, {...defaultOptions, ...options}).format(date);
}

/**
 * Create localized main keyboard for user
 * @param {string} language - User's language preference
 * @returns {object} Telegram keyboard markup
 */
export function createMainKeyboard(language) {
    return Markup.keyboard([
        [t(language, 'buttons.addWorkout'), t(language, 'buttons.addExercise'), t(language, 'buttons.myExercises')],
        [t(language, 'buttons.viewWorkout'), t(language, 'buttons.showProgress'), t(language, 'buttons.deleteWorkout')],
        [t(language, 'buttons.language'), t(language, 'buttons.timezone')]
    ]).resize();
}