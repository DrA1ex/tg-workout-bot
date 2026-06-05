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

export function periodStart(period) {
    const now = new Date();
    if (period === "30d") return addDays(now, -30);
    if (period === "90d") return addDays(now, -90);
    return null;
}
