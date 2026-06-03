import {Op} from "sequelize";

import {WorkoutDAO} from "../../../dao/index.js";
import {models} from "../../../db/index.js";
import {formatDate} from "../../../i18n/index.js";
import {createDateGroupAttribute} from "../../../utils/timezone.js";
import {addDays, addWeeks, dateOnly, shortWeekLabel, weekStartUtc} from "./dates.js";
import {volumeFor, workoutPayload} from "./workouts.js";

export async function getRecentWorkouts(telegramId, language, timezone, limit = 8) {
    const rows = await models.Workout.findAll({
        where: {telegramId},
        order: [["date", "DESC"], ["id", "DESC"]],
        limit,
    });

    return rows.map(row => workoutPayload(row, language, timezone));
}

export async function getDashboard(user) {
    const language = user.language || "en";
    const timezone = user.timezone || "UTC";
    const q = models.Workout.sequelize;
    const today = new Date();
    const currentWeekStart = weekStartUtc(today);
    const todayKey = dateOnly(today);

    const todayRows = await WorkoutDAO.getWorkoutsByDate(user.telegramId, todayKey, timezone);
    const weekRows = await models.Workout.findAll({
        where: {
            telegramId: user.telegramId,
            date: {[Op.gte]: currentWeekStart},
        },
        order: [["date", "ASC"]],
    });

    const dateRows = await models.Workout.findAll({
        attributes: [createDateGroupAttribute(q, "date", "d", timezone)],
        where: {telegramId: user.telegramId},
        group: ["d"],
        order: [[q.literal("d"), "DESC"]],
    });
    const workoutDates = dateRows.map(row => row.get("d"));
    const workoutWeeks = new Set(workoutDates.map(value => dateOnly(weekStartUtc(new Date(`${value}T00:00:00Z`)))));
    const workoutDatesSet = new Set(workoutDates);

    let weeklyStreak = 0;
    let cursor = workoutDates.length
        ? weekStartUtc(new Date(`${workoutDates[0]}T00:00:00Z`))
        : currentWeekStart;
    while (workoutWeeks.has(dateOnly(cursor))) {
        weeklyStreak += 1;
        cursor = addDays(cursor, -7);
    }

    const recent = await getRecentWorkouts(user.telegramId, language, timezone);
    const weeklyVolume = weekRows.reduce((sum, row) => sum + volumeFor(row), 0);
    const exerciseCount = new Set(weekRows.map(row => row.exercise)).size;
    const weeklyDays = new Set(weekRows.map(row => dateOnly(new Date(row.date)))).size;
    const activityAnchor = workoutDates.length
        ? weekStartUtc(new Date(`${workoutDates[0]}T00:00:00Z`))
        : currentWeekStart;
    const activity = Array.from({length: 8}, (_, index) => {
        const start = addWeeks(activityAnchor, index - 7);
        const days = Array.from({length: 7}, (_unused, dayIndex) => dateOnly(addDays(start, dayIndex)));
        const activeDays = days.filter(day => workoutDatesSet.has(day)).length;

        return {
            week: dateOnly(start),
            label: shortWeekLabel(start),
            activeDays,
            hasWorkout: activeDays > 0,
            isCurrent: dateOnly(start) === dateOnly(currentWeekStart),
        };
    });

    return {
        profile: {
            telegramId: user.telegramId,
            language,
            timezone,
            theme: user.theme || "system",
        },
        today: {
            label: formatDate(today, language, timezone, {weekday: "short", month: "short", day: "numeric"}),
            workouts: todayRows.map(row => workoutPayload(row, language, timezone)),
        },
        stats: {
            weeklyStreak,
            weeklyVolume: Math.round(weeklyVolume),
            weeklyWorkouts: weekRows.length,
            weeklyExercises: exerciseCount,
            weeklyDays,
        },
        activity,
        lastSession: recent[0] || null,
        recent,
    };
}
