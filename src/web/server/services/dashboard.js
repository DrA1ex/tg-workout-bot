import {Op} from "sequelize";

import {WorkoutDAO} from "../../../dao/index.js";
import {models} from "../../../db/index.js";
import {formatDate} from "../../../i18n/index.js";
import {dateFromUserDateInput, dateKeyInTimezone, nextUserDateStart, startOfUserDate} from "../../../utils/timezone.js";
import {addDays, addWeeks, dateOnly, shortWeekLabel, weekStartUtc} from "./dates.js";
import {volumeFor, workoutPayload} from "./workouts.js";

const STREAK_LOOKBACK_WEEKS = 104;

export async function getRecentWorkouts(telegramId, language, timezone, {limit = 8, beforeDate = null} = {}) {
    const where = {telegramId: String(telegramId)};
    if (beforeDate) where.date = {[Op.lt]: beforeDate};
    const rows = await models.Workout.findAll({
        where,
        order: [["date", "DESC"], ["id", "DESC"]],
        limit,
    });
    return rows.map(row => workoutPayload(row, language, timezone));
}

export async function getDashboard(user) {
    const language = user.language || "en";
    const timezone = user.timezone || "UTC";
    const todayKey = dateKeyInTimezone(new Date(), timezone);
    const today = dateFromUserDateInput(todayKey, timezone);
    const currentWeekStart = weekStartUtc(new Date(`${todayKey}T00:00:00Z`));
    const currentWeekKey = dateOnly(currentWeekStart);
    const currentWeekStartBoundary = startOfUserDate(currentWeekKey, timezone);
    const nextWeekBoundary = nextUserDateStart(dateOnly(addDays(currentWeekStart, 6)), timezone);
    const todayStart = startOfUserDate(todayKey, timezone);
    const streakSinceKey = dateOnly(addWeeks(currentWeekStart, -STREAK_LOOKBACK_WEEKS));
    const streakSinceBoundary = startOfUserDate(streakSinceKey, timezone);

    const [todayRows, weekRows, workoutDates, recent, lastSessionBeforeToday] = await Promise.all([
        WorkoutDAO.getWorkoutsByDate(user.telegramId, todayKey, timezone),
        models.Workout.findAll({
            where: {
                telegramId: String(user.telegramId),
                date: {[Op.gte]: currentWeekStartBoundary, [Op.lt]: nextWeekBoundary},
            },
            order: [["date", "ASC"], ["id", "ASC"]],
        }),
        WorkoutDAO.getDatesWithWorkouts(user.telegramId, timezone, {since: streakSinceBoundary}),
        getRecentWorkouts(user.telegramId, language, timezone, {beforeDate: todayStart}),
        models.Workout.findOne({
            where: {telegramId: String(user.telegramId), date: {[Op.lt]: todayStart}},
            order: [["date", "DESC"], ["id", "DESC"]],
        }),
    ]);

    const workoutDatesSet = new Set(workoutDates);
    const workoutWeeks = new Set(workoutDates.map(value => dateOnly(weekStartUtc(new Date(`${value}T00:00:00Z`)))));
    const currentWeekHasWorkout = workoutWeeks.has(currentWeekKey);
    let weeklyStreak = 0;
    let cursor = currentWeekHasWorkout ? currentWeekStart : addWeeks(currentWeekStart, -1);
    while (workoutWeeks.has(dateOnly(cursor)) && weeklyStreak < STREAK_LOOKBACK_WEEKS) {
        weeklyStreak += 1;
        cursor = addWeeks(cursor, -1);
    }

    const weeklyVolume = weekRows.reduce((sum, row) => sum + volumeFor(row), 0);
    const exerciseCount = new Set(weekRows.map(row => row.exercise)).size;
    const weeklyDays = new Set(weekRows.map(row => dateKeyInTimezone(new Date(row.date), timezone))).size;
    const activity = Array.from({length: 7}, (_, index) => {
        const start = addWeeks(currentWeekStart, index - 6);
        const days = Array.from({length: 7}, (_unused, dayIndex) => dateOnly(addDays(start, dayIndex)));
        const activeDays = days.filter(day => workoutDatesSet.has(day)).length;
        return {
            week: dateOnly(start),
            label: shortWeekLabel(start),
            activeDays,
            hasWorkout: activeDays > 0,
            isCurrent: dateOnly(start) === currentWeekKey,
        };
    });
    const weekDays = Array.from({length: 7}, (_unused, index) => {
        const day = dateOnly(addDays(currentWeekStart, index));
        return {
            date: day,
            day: Number(day.slice(8, 10)),
            active: workoutDatesSet.has(day),
            today: day === todayKey,
            future: day > todayKey,
        };
    });
    const calendarStart = addWeeks(currentWeekStart, -4);
    const calendarEnd = addDays(currentWeekStart, 6);
    const activityCalendarDays = Math.round((calendarEnd.getTime() - calendarStart.getTime()) / 86400000) + 1;
    const activityCalendar = Array.from({length: activityCalendarDays}, (_unused, index) => {
        const day = dateOnly(addDays(calendarStart, index));
        return {
            date: day,
            day: Number(day.slice(8, 10)),
            active: workoutDatesSet.has(day),
            today: day === todayKey,
            future: day > todayKey,
            outsideMonth: day.slice(0, 7) !== todayKey.slice(0, 7),
        };
    });

    const todayDateLabel = formatDate(today, language, timezone, {month: "short", day: "numeric", year: "numeric"});
    const todayWeekdayLabel = formatDate(today, language, timezone, {weekday: "long"});

    return {
        profile: {
            telegramId: user.telegramId,
            language,
            timezone,
            theme: user.theme || "system",
            accentColor: user.accentColor || "blue",
        },
        today: {
            key: todayKey,
            label: `${todayDateLabel} • ${todayWeekdayLabel}`,
            workouts: todayRows.map(row => workoutPayload(row, language, timezone)),
        },
        stats: {
            weeklyStreak,
            weeklyVolume: Math.round(weeklyVolume),
            weeklyWorkouts: weekRows.length,
            weeklyExercises: exerciseCount,
            weeklyDays,
        },
        weeklyStreak: {
            count: weeklyStreak,
            currentWeekHasWorkout,
            weeks: activity,
            capped: weeklyStreak === STREAK_LOOKBACK_WEEKS,
        },
        activity,
        weekDays,
        activityCalendar,
        lastSession: lastSessionBeforeToday ? workoutPayload(lastSessionBeforeToday, language, timezone) : null,
        recent,
    };
}
