import {dateKeyInTimezone, startOfUserDate} from "../../../utils/timezone.js";

export function weekStartUtc(date) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() - day + 1);
    return d;
}

export function addDays(date, days) {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + days);
    return d;
}

export function addWeeks(date, weeks) {
    return addDays(date, weeks * 7);
}

export function dateOnly(date) {
    return date.toISOString().slice(0, 10);
}

export function shortWeekLabel(date) {
    const value = date.toISOString();
    return `${value.slice(8, 10)}.${value.slice(5, 7)}`;
}

export function periodStart(period, timezone = "UTC", now = new Date()) {
    const days = period === "30d" ? 30 : period === "90d" ? 90 : null;
    if (!days) return null;
    const currentKey = dateKeyInTimezone(now, timezone);
    const synthetic = new Date(`${currentKey}T00:00:00Z`);
    return startOfUserDate(dateOnly(addDays(synthetic, -(days - 1))), timezone);
}
