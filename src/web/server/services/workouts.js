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
    const dateInput = body.date ? String(body.date) : dateKeyInTimezone(fallbackDate, timezone);
    const date = dateFromUserDateInput(dateInput, timezone);
    if (dateInput > dateKeyInTimezone(new Date(), timezone)) throw new Error("Date cannot be in the future");
    const sets = Number.parseInt(body.sets, 10);
    const repsOrTime = Number.parseFloat(body.repsOrTime);
    const hasWeight = body.hasWeight === true || body.hasWeight === "true";
    const weight = hasWeight
        ? Number.parseFloat(body.weight)
        : body.weight === "" || body.weight == null ? null : Number.parseFloat(body.weight);

    if (!exercise) throw new Error("Exercise is required");
    if (!Number.isFinite(sets) || sets <= 0) throw new Error("Sets must be a positive number");
    if (!Number.isFinite(repsOrTime) || repsOrTime <= 0) throw new Error("Reps or time must be a positive number");
    if (hasWeight && (!Number.isFinite(weight) || weight < 0)) throw new Error("Weight must be a valid number");
    if (!hasWeight && weight != null && (!Number.isFinite(weight) || weight < 0)) throw new Error("Weight must be a valid number");

    return {
        date: date.toISOString(),
        exercise,
        sets,
        weight,
        repsOrTime,
        isTime: Boolean(body.isTime),
        notes: String(body.notes || "").trim(),
    };
}

export function volumeFor(row) {
    if (row.isTime || !row.weight || !row.repsOrTime || !row.sets) return 0;
    return row.sets * row.weight * row.repsOrTime;
}

function achievementVolumeFor(row) {
    if (row.isTime || !row.repsOrTime || !row.sets) return 0;
    return row.sets * (row.weight || 1) * row.repsOrTime;
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
    const isTodayWorkout = workoutDateKey === dateKeyInTimezone(new Date(), timezone);
    if (!isTodayWorkout) return emptyAchievements();

    const q = models.Workout.sequelize;
    const userWhere = {
        telegramId: String(telegramId),
    };
    const exerciseSql = q.escape(workoutData.exercise);
    const workoutDateSql = q.escape(workoutData.date);
    const volumeExpression = "CASE WHEN isTime = 0 AND repsOrTime IS NOT NULL AND sets IS NOT NULL THEN sets * COALESCE(NULLIF(weight, 0), 1) * repsOrTime ELSE 0 END";
    const previous = await models.Workout.findOne({
        where: userWhere,
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
    staleThreshold.setMonth(staleThreshold.getMonth() - 2);
    const inactiveMonthThreshold = new Date(workoutDate);
    inactiveMonthThreshold.setMonth(inactiveMonthThreshold.getMonth() - 1);

    return {
        newVolumeRecord: previousCount > 0 && currentVolume > 0 && currentVolume > bestPreviousVolume,
        firstExerciseWorkout: previousCount === 0,
        comebackAfterTwoMonths: Boolean(latestPreviousDate && latestPreviousDate <= staleThreshold),
        comebackAfterMonth: Boolean(latestUserWorkoutDate && latestUserWorkoutDate <= inactiveMonthThreshold),
        hundredthWorkout: userPreviousCount === 99,
    };
}
