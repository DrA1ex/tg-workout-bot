import {state} from "../state.js";
import {$$, $} from "../dom.js";
import {i18n} from "./locales.js";

const supportedLanguages = new Set(Object.keys(i18n));

function browserLanguage() {
    const candidates = [navigator.language, ...(navigator.languages || [])]
        .filter(Boolean)
        .map(value => String(value).toLowerCase().split("-")[0]);
    return candidates.find(language => supportedLanguages.has(language)) || "en";
}

export function currentLanguage() {
    return state.user?.language || browserLanguage();
}

export function t(key) {
    const lang = currentLanguage();
    return i18n[lang]?.[key] || i18n.en[key] || key;
}

export function interpolate(text, params = {}) {
    return Object.entries(params).reduce((result, [key, value]) => result.replaceAll(`{{${key}}}`, value), text);
}

export function applyI18n() {
    $$("[data-i18n]").forEach(node => {
        node.textContent = t(node.dataset.i18n);
    });
    $("#screen-title").textContent = t(`screens.${state.tab}`);
}
