// Extracted from main.js without changing feature behavior.
import {state} from '../deps.js';

export function normalizeTimezoneInputValue(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    if (text.toUpperCase() === "UTC") return "UTC";

    const match = text.match(/^([+-])(\d{1,2}):([0-5][0-9])$/);
    if (!match) return text;

    const hours = Number.parseInt(match[2], 10);
    if (hours > 14 || (hours === 14 && match[3] !== "00")) return text;
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

export function dateInputValueInTimezone(value, timezoneValue = state.user?.timezone || "UTC") {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const timezone = normalizeTimezoneInputValue(timezoneValue || "UTC");
    if (timezone === "UTC") return date.toISOString().slice(0, 10);
    const offset = timezone.match(/^([+-])(\d{2}):([0-5]\d)$/);
    if (offset) {
        const minutes = (Number(offset[2]) * 60 + Number(offset[3])) * (offset[1] === "+" ? 1 : -1);
        return new Date(date.getTime() + minutes * 60000).toISOString().slice(0, 10);
    }
    try {
        const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).formatToParts(date).filter(part => part.type !== "literal").map(part => [part.type, part.value]));
        return `${parts.year}-${parts.month}-${parts.day}`;
    } catch {
        return date.toISOString().slice(0, 10);
    }
}

export function formatUserDateKey(dateKey, options = {}) {
    const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return "";
    const date = new Date(`${dateKey}T12:00:00Z`);
    try {
        return new Intl.DateTimeFormat(currentLocale(), {...options, timeZone: "UTC"}).format(date);
    } catch {
        return dateKey;
    }
}

export function todayInputValue() {
    return state.dashboard?.today?.key || dateInputValueInTimezone(new Date());
}
