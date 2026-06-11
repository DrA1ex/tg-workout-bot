import {$} from "./dom.js";
import {state} from "./state.js";

const ACCENTS = new Set(["blue", "cyan", "green", "pink", "red", "purple", "orange"]);
const SYSTEM_THEME_QUERY = window.matchMedia("(prefers-color-scheme: dark)");

let systemThemeListenerBound = false;

function bindSystemThemeListener() {
    if (systemThemeListenerBound) return;
    systemThemeListenerBound = true;
    const handleSystemThemeChange = () => {
        if (state.theme === "system") applyTheme();
    };

    if (SYSTEM_THEME_QUERY.addEventListener) {
        SYSTEM_THEME_QUERY.addEventListener("change", handleSystemThemeChange);
    } else {
        SYSTEM_THEME_QUERY.addListener(handleSystemThemeChange);
    }
}

export function applyTheme() {
    const selected = ["system", "light", "dark"].includes(state.theme) ? state.theme : "system";
    const accent = ACCENTS.has(state.accentColor) ? state.accentColor : "blue";
    const prefersDark = SYSTEM_THEME_QUERY.matches;
    const resolved = selected === "system" ? (prefersDark ? "dark" : "light") : selected;
    bindSystemThemeListener();
    state.theme = selected;
    state.accentColor = accent;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.accent = accent;
    const icon = $("#theme-icon");
    const select = $("#theme-select");
    if (icon) icon.textContent = resolved === "dark" ? "🌙" : "☀️";
    if (select) select.value = selected;
}
