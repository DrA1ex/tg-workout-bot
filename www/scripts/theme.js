import {$} from "./dom.js";
import {state} from "./state.js";

const ACCENTS = new Set(["blue", "cyan", "green", "pink", "red", "purple", "orange"]);

export function applyTheme() {
    const selected = ["system", "light", "dark"].includes(state.theme) ? state.theme : "system";
    const accent = ACCENTS.has(state.accentColor) ? state.accentColor : "blue";
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = selected === "system" ? (prefersDark ? "dark" : "light") : selected;
    state.theme = selected;
    state.accentColor = accent;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.accent = accent;
    const icon = $("#theme-icon");
    const select = $("#theme-select");
    if (icon) icon.textContent = resolved === "dark" ? "🌙" : "☀️";
    if (select) select.value = selected;
}
