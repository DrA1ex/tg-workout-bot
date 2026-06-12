import {formatDate} from "../../../i18n/index.js";
import {dateFromUserDateInput} from "../../../utils/timezone.js";

export function workoutPayload(row, language, timezone) {
    return {
        id: row.id,
        date: row.date,
        dateLabel: formatDate(new Date(row.date), language, timezone),
        exercise: row.exercise,
        sets: row.sets,
        weight: row.weight,
        repsOrTime: row.repsOrTime,
        isTime: row.isTime,
        notes: row.notes || "",
        summary: row.formatStringWithoutDate(language),
    };
}

export function parseWorkoutBody(body, fallbackDate = new Date(), timezone = "UTC") {
    const exercise = String(body.exercise || "").trim();
    const date = body.date ? dateFromUserDateInput(body.date, timezone) : fallbackDate;
    const sets = Number.parseInt(body.sets, 10);
    const repsOrTime = Number.parseFloat(body.repsOrTime);

    if (!exercise) throw new Error("Exercise is required");
    if (!Number.isFinite(sets) || sets <= 0) throw new Error("Sets must be a positive number");
    if (!Number.isFinite(repsOrTime) || repsOrTime <= 0) throw new Error("Reps or time must be a positive number");

    return {
        date: date.toISOString(),
        exercise,
        sets,
        weight: body.weight === "" || body.weight == null ? null : Number.parseFloat(body.weight),
        repsOrTime,
        isTime: Boolean(body.isTime),
        notes: String(body.notes || "").trim(),
    };
}

export function volumeFor(row) {
    if (row.isTime || !row.weight || !row.repsOrTime || !row.sets) return 0;
    return row.sets * row.weight * row.repsOrTime;
}
