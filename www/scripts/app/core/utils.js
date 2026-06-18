// Extracted from main.js without changing feature behavior.
import {state} from '../deps.js';

export function normalizeTimezoneInputValue(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    if (text.toUpperCase() === "UTC") return "UTC";

    const match = text.match(/^([+-])(\d{1,2}):([0-5][0-9])$/);
    if (!match) return text;

    const hours = Number.parseInt(match[2], 10);
    if (hours > 12) return text;
    return `${match[1]}${String(hours).padStart(2, "0")}:${match[3]}`;
}

export function setFormControlValue(control, value) {
    if (document.activeElement === control) return;
    control.value = value ?? "";
}

export function parseClientDate(value) {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

    const raw = String(value).trim();
    if (!raw) return null;

    const direct = new Date(raw);
    if (!Number.isNaN(direct.getTime())) return direct;

    const normalized = raw
        .replace(/^(\d{4}-\d{2}-\d{2})\s+/, "$1T")
        .replace(/\s+([+-]\d{2}:?\d{2}|Z)$/i, "$1");
    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) return parsed;

    const dateOnly = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateOnly) {
        const fallback = new Date(`${dateOnly[1]}T12:00:00Z`);
        if (!Number.isNaN(fallback.getTime())) return fallback;
    }

    return null;
}

export function currentLocale() {
    return state.user?.language || "en";
}

export function formatMetricNumber(value) {
    const numeric = Number(value || 0);
    return Number.isInteger(numeric) ? String(numeric) : String(Number(numeric.toFixed(1)));
}

export function generateDedupeToken() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    const random = window.crypto?.getRandomValues
        ? Array.from(window.crypto.getRandomValues(new Uint32Array(4))).map(value => value.toString(36)).join("")
        : Math.random().toString(36).slice(2);
    return `${Date.now().toString(36)}-${random}`;
}

export function createDelayedLoader({delayMs, minVisibleMs, show}) {
    let shownAt = 0;
    const timer = window.setTimeout(() => {
        shownAt = Date.now();
        show();
    }, delayMs);

    return {
        cancel() {
            window.clearTimeout(timer);
        },
        async waitForMinVisible() {
            if (!shownAt) return;
            await delay(Math.max(0, minVisibleMs - (Date.now() - shownAt)));
        },
    };
}

export function nextAnimationFrame() {
    return new Promise(resolve => window.requestAnimationFrame(resolve));
}

export function delay(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
}

export function todayInputValue() {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}
