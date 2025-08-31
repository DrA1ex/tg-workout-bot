import {Markup} from "telegraf";

import {models} from "../db/index.js";
import en from "./locales/en.js";
import ru from "./locales/ru.js";

const locales = {en, ru};

/**
 * Get user's preferred language from database
 * @param {number} telegramId - Telegram user ID
 * @returns {string} Language code (en/ru)
 */
export async function getUserLanguage(telegramId) {
    let language;
    try {
        const user = await models.User.findByPk(telegramId);
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
 * Set user's preferred language
 * @param {number} telegramId - Telegram user ID
 * @param {string} language - Language code (en/ru)
 */
export async function setUserLanguage(telegramId, language) {
    try {
        const [user] = await models.User.findOrCreate({
            where: {telegramId},
            defaults: {language}
        });
        user.language = language;
        await user.save();
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
    const locale = locales[language] || locales.en;
    let text = key.split('.').reduce((obj, k) => obj?.[k], locale) || key;

    // Simple parameter interpolation
    Object.keys(params).forEach(param => {
        text = text.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
    });

    return text;
}

/**
 * Create a localization function bound to a specific language
 * @param {string} language - Language code
 * @returns {function} Localization function
 */
export function createLocalizer(language) {
    return (key, params = {}) => t(key, language, params);
}

/**
 * Format date according to user's locale
 * @param {Date} date - Date to format
 * @param {string} language - Language code (en/ru)
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date
 */
export function formatDate(date, language = 'en', options = {}) {
    const locale = language === 'en' ? 'en-US' : 'ru-RU';
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
        [t(language, 'buttons.addWorkout'), t(language, 'buttons.addExercise')],
        [t(language, 'buttons.viewWorkout'), t(language, 'buttons.deleteWorkout')],
        [t(language, 'buttons.showProgress'), t(language, 'buttons.language')]
    ]).resize();
}