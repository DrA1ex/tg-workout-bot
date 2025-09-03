import {cancelled, requestChoice, response} from "../runtime/primitives.js";
import {createMainKeyboard, getUserLanguage, setUserLanguage, t} from "../i18n/index.js";


/**
 * Language selection flow
 * @param {object} state - Flow state
 */
export function* selectLanguage(state) {
    const {_} = yield getUserLanguage(state.telegramId);

    const choice = yield requestChoice(
        state,
        {
            ru: _('language.russian'),
            en: _('language.english'),
            cancel: _('buttons.cancel')
        },
        _('language.select')
    );

    if (choice === 'cancel') {
        return yield cancelled(state);
    }

    // Set the new language
    yield setUserLanguage(state.telegramId, choice);
    yield response(state, t(choice, 'language.changed'), createMainKeyboard(choice));


}
