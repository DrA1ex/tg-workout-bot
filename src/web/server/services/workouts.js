import {formatDate} from "../../../i18n/index.js";
import {dateFromUserDateInput, dateKeyInTimezone} from "../../../utils/timezone.js";
import {models} from "../../../db/index.js";
import {fn, literal} from "sequelize";

export function workoutPayload(row, language, timezone) {
    return {
        id: row.id,
        date: row.date,
        dateKey: dateKeyInTimezone(new Date(row.date), timezone),
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

export async function workoutAchievements(telegramId, workoutData) {
    const q = models.Workout.sequelize;
    const where = {
        telegramId: String(telegramId),
        exercise: workoutData.exercise,
    };
    const workoutDateSql = q.escape(workoutData.date);
    const previous = await models.Workout.findOne({
        where,
        attributes: [
            [fn("COUNT", literal("1")), "count"],
            [fn("MAX", literal("CASE WHEN isTime = 0 AND weight IS NOT NULL AND repsOrTime IS NOT NULL AND sets IS NOT NULL THEN sets * weight * repsOrTime ELSE 0 END")), "volume"],
            [fn("MAX", literal(`CASE WHEN date <= ${workoutDateSql} THEN date ELSE NULL END`)), "date"],
        ],
        raw: true,
    });
    const currentVolume = volumeFor(workoutData);
    const workoutDate = new Date(workoutData.date);
    const previousCount = Number(previous?.count || 0);
    const bestPreviousVolume = Number(previous?.volume || 0);
    const latestPreviousDate = previous?.date ? new Date(previous.date) : null;
    const staleThreshold = new Date(workoutDate);
    staleThreshold.setMonth(staleThreshold.getMonth() - 2);

    return {
        newVolumeRecord: previousCount > 0 && currentVolume > 0 && currentVolume > bestPreviousVolume,
        firstExerciseWorkout: previousCount === 0,
        comebackAfterTwoMonths: Boolean(latestPreviousDate && latestPreviousDate <= staleThreshold),
    };
}
