import {$} from "./dom.js";
import {state} from "./state.js";

export function applyTheme() {
    const selected = state.theme;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = selected === "system" ? (prefersDark ? "dark" : "light") : selected;
    document.documentElement.dataset.theme = resolved;
    $("#theme-icon").textContent = resolved === "dark" ? "☾" : "☼";
    $("#theme-select").value = selected;
}
