import {response} from "../runtime/primitives.js";
import {createMainKeyboard, t} from "../i18n/index.js";
import {selectLanguageCommon} from "./common.js";

/**
 * Language selection flow
 * @param {object} state - Flow state
 */
export function* selectLanguage(state) {
    const languageChoice = yield* selectLanguageCommon(state);

    if (languageChoice) {
        // Show main keyboard with new language
        yield response(state, t(languageChoice, 'language.changed'), createMainKeyboard(languageChoice));
    }
}
