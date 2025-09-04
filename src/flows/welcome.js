import {response} from "../runtime/primitives.js";
import {createMainKeyboard, getUserLanguage, detectUserLanguage, t} from "../i18n/index.js";
import {UserDAO} from "../dao/index.js";
import {selectLanguageCommon, selectTimezoneCommon} from "./common.js";

/**
 * Welcome flow for new users
 * @param {object} state - Flow state
 */
export function* welcomeFlow(state) {
    // Get user's language from Telegram API for initial welcome message
    const telegramLanguage = detectUserLanguage(state.telegramLanguageCode);
    
    // Show welcome message in detected language
    yield response(state, t(telegramLanguage, 'welcome.greeting'));
    
    // Show bot description and features in detected language
    yield response(state, t(telegramLanguage, 'welcome.description'));

    // Check if user exists and has language/timezone set
    const user = yield UserDAO.findByTelegramId(state.telegramId);

    if (!user || !user.language || !user.timezone) {
        yield response(state, t(telegramLanguage, 'welcome.setupRequired'));

        // Language selection
        yield response(state, t(telegramLanguage, 'welcome.selectLanguage'));
        const languageChoice = yield* selectLanguageCommon(state);

        if (languageChoice) {
            // Get language name from localization and show confirmation
            const languageName = t(languageChoice, `language.${languageChoice}`);
            yield response(state, t(languageChoice, 'welcome.languageSet', {language: languageName}));

            // Timezone selection
            yield response(state, t(languageChoice, 'welcome.selectTimezone'));
            const timezoneResult = yield* selectTimezoneCommon(state);

            if (timezoneResult) {
                // Create or update user with language and timezone
                if (user) {
                    yield UserDAO.update(state.telegramId, {language: languageChoice, timezone: timezoneResult.offset});
                } else {
                    yield UserDAO.findOrCreate(state.telegramId, {language: languageChoice, timezone: timezoneResult.offset});
                }

                // Welcome completion
                yield response(state, t(languageChoice, 'welcome.setupComplete'));
            }
        }
    }

    // Create and show main keyboard
    const {language} = yield getUserLanguage(state.telegramId);
    const keyboard = createMainKeyboard(language);
    yield response(state, t(language, 'bot.welcome'), keyboard);
}
