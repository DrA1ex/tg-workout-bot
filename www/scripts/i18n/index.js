import {state} from "../state.js";
import {$$, $} from "../dom.js";
import {i18n} from "./locales.js";

export function t(key) {
    const lang = state.user?.language || "en";
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
