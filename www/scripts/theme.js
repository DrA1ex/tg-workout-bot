import {$} from "./dom.js";
import {state} from "./state.js";

export function applyTheme() {
    const selected = ["system", "light", "dark"].includes(state.theme) ? state.theme : "system";
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = selected === "system" ? (prefersDark ? "dark" : "light") : selected;
    state.theme = selected;
    document.documentElement.dataset.theme = resolved;
    const icon = $("#theme-icon");
    const select = $("#theme-select");
    if (icon) icon.textContent = resolved === "dark" ? "☾" : "☼";
    if (select) select.value = selected;
}
