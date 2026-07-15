import {fn, literal} from "sequelize";

import {models} from "../../../db/index.js";
import {formatDate} from "../../../i18n/index.js";
import {dateFromUserDateInput, dateKeyInTimezone} from "../../../utils/timezone.js";

const LIMITS = Object.freeze({
    exerciseLength: 120,
    notesLength: 2000,
    sets: 1000,
    weight: 1_000_000,
    repsOrTime: 1_000_000,
});

function parseBoolean(value, fieldName) {
    if (value === true || value === "true" || value === 1 || value === "1") return true;
    if (value === false || value === "false" || value === 0 || value === "0" || value == null || value === "") return false;
    throw new Error(`${fieldName} must be a boolean`);
}

function parsePositiveInteger(value, fieldName, max) {
    const numeric = typeof value === "number" ? value : Number(String(value || "").trim());
    if (!Number.isSafeInteger(numeric) || numeric <= 0 || numeric > max) {
        throw new Error(`${fieldName} must be an integer between 1 and ${max}`);
    }
    return numeric;
}

function parsePositiveNumber(value, fieldName, max, {allowZero = false} = {}) {
    const numeric = typeof value === "number" ? value : Number(String(value || "").trim());
    const minimumValid = allowZero ? numeric >= 0 : numeric > 0;
    if (!Number.isFinite(numeric) || !minimumValid || numeric > max) {
        throw new Error(`${fieldName} must be ${allowZero ? "between 0" : "greater than 0"} and ${max}`);
    }
    return numeric;
}

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
        isTime: Boolean(row.isTime),
        notes: row.notes || "",
        summary: row.formatStringWithoutDate(language),
    };
}

export function parseWorkoutBody(body, fallbackDate = new Date(), timezone = "UTC") {
    const exercise = String(body.exercise || "").trim();
    const notes = String(body.notes || "").trim();
    const dateInput = body.date ? String(body.date).trim() : dateKeyInTimezone(fallbackDate, timezone);
    const date = dateFromUserDateInput(dateInput, timezone);
    if (dateInput > dateKeyInTimezone(new Date(), timezone)) throw new Error("Date cannot be in the future");
    if (!exercise) throw new Error("Exercise is required");
    if (exercise.length > LIMITS.exerciseLength) throw new Error(`Exercise must be at most ${LIMITS.exerciseLength} characters`);
    if (notes.length > LIMITS.notesLength) throw new Error(`Notes must be at most ${LIMITS.notesLength} characters`);

    const sets = parsePositiveInteger(body.sets, "Sets", LIMITS.sets);
    const repsOrTime = parsePositiveNumber(body.repsOrTime, "Reps or time", LIMITS.repsOrTime);
    const hasWeight = parseBoolean(body.hasWeight, "hasWeight");
    const isTime = parseBoolean(body.isTime, "isTime");
    const weight = hasWeight
        ? parsePositiveNumber(body.weight, "Weight", LIMITS.weight, {allowZero: true})
        : null;

    return {
        date: date.toISOString(),
        exercise,
        sets,
        weight,
        repsOrTime,
        isTime,
        notes,
    };
}

export function volumeFor(row) {
    if (row.isTime || !row.weight || !row.repsOrTime || !row.sets) return 0;
    const volume = row.sets * row.weight * row.repsOrTime;
    return Number.isFinite(volume) ? volume : 0;
}

function achievementVolumeFor(row) {
    if (row.isTime || !row.repsOrTime || !row.sets) return 0;
    const volume = row.sets * (row.weight || 1) * row.repsOrTime;
    return Number.isFinite(volume) ? volume : 0;
}

function emptyAchievements() {
    return {
        newVolumeRecord: false,
        firstExerciseWorkout: false,
        comebackAfterTwoMonths: false,
        comebackAfterMonth: false,
        hundredthWorkout: false,
    };
}

export async function workoutAchievements(telegramId, workoutData, timezone = "UTC") {
    const workoutDate = new Date(workoutData.date);
    const workoutDateKey = dateKeyInTimezone(workoutDate, timezone);
    if (workoutDateKey !== dateKeyInTimezone(new Date(), timezone)) return emptyAchievements();

    const q = models.Workout.sequelize;
    const exerciseSql = q.escape(workoutData.exercise);
    const workoutDateSql = q.escape(workoutData.date);
    const volumeExpression = "CASE WHEN isTime = 0 AND repsOrTime IS NOT NULL AND sets IS NOT NULL THEN sets * COALESCE(NULLIF(weight, 0), 1) * repsOrTime ELSE 0 END";
    const previous = await models.Workout.findOne({
        where: {telegramId: String(telegramId)},
        attributes: [
            [fn("COUNT", literal("1")), "userCount"],
            [fn("MAX", literal(`CASE WHEN date <= ${workoutDateSql} THEN date ELSE NULL END`)), "userDate"],
            [fn("SUM", literal(`CASE WHEN exercise = ${exerciseSql} THEN 1 ELSE 0 END`)), "exerciseCount"],
            [fn("MAX", literal(`CASE WHEN exercise = ${exerciseSql} THEN ${volumeExpression} ELSE 0 END`)), "exerciseVolume"],
            [fn("MAX", literal(`CASE WHEN exercise = ${exerciseSql} AND date <= ${workoutDateSql} THEN date ELSE NULL END`)), "exerciseDate"],
        ],
        raw: true,
    });
    const currentVolume = achievementVolumeFor(workoutData);
    const previousCount = Number(previous?.exerciseCount || 0);
    const bestPreviousVolume = Number(previous?.exerciseVolume || 0);
    const latestPreviousDate = previous?.exerciseDate ? new Date(previous.exerciseDate) : null;
    const userPreviousCount = Number(previous?.userCount || 0);
    const latestUserWorkoutDate = previous?.userDate ? new Date(previous.userDate) : null;
    const staleThreshold = new Date(workoutDate);
    staleThreshold.setUTCMonth(staleThreshold.getUTCMonth() - 2);
    const inactiveMonthThreshold = new Date(workoutDate);
    inactiveMonthThreshold.setUTCMonth(inactiveMonthThreshold.getUTCMonth() - 1);

    return {
        newVolumeRecord: previousCount > 0 && currentVolume > 0 && currentVolume > bestPreviousVolume,
        firstExerciseWorkout: previousCount === 0,
        comebackAfterTwoMonths: Boolean(latestPreviousDate && latestPreviousDate <= staleThreshold),
        comebackAfterMonth: Boolean(latestUserWorkoutDate && latestUserWorkoutDate <= inactiveMonthThreshold),
        hundredthWorkout: userPreviousCount === 99,
    };
}
