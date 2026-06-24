import {Op} from "sequelize";

import {WorkoutDAO} from "../../../dao/index.js";
import {models} from "../../../db/index.js";
import {formatDate, t} from "../../../i18n/index.js";
import {convertToUserTimezone, createDateGroupAttribute, dateKeyInTimezone, dateFromUserDateInput, startOfUserDate} from "../../../utils/timezone.js";
import {addDays, addWeeks, dateOnly, shortWeekLabel, weekStartUtc} from "./dates.js";
import {volumeFor, workoutPayload} from "./workouts.js";

export async function getRecentWorkouts(telegramId, language, timezone, {limit = 8, beforeDate = null} = {}) {
    const where = {telegramId};
    if (beforeDate) {
        where.date = {[Op.lt]: beforeDate};
    }
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
    const q = models.Workout.sequelize;
    const now = new Date();
    const todayKey = dateKeyInTimezone(now, timezone);
    const today = dateFromUserDateInput(todayKey, timezone);
    const currentWeekStart = weekStartUtc(new Date(`${todayKey}T00:00:00Z`));
    const currentWeekStartBoundary = startOfUserDate(dateOnly(currentWeekStart), timezone);
    const todayStart = startOfUserDate(todayKey, timezone);

    const todayRows = await WorkoutDAO.getWorkoutsByDate(user.telegramId, todayKey, timezone);
    const weekRows = await models.Workout.findAll({
        where: {
            telegramId: user.telegramId,
            date: {[Op.gte]: currentWeekStartBoundary},
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

    const recent = await getRecentWorkouts(user.telegramId, language, timezone, {beforeDate: todayStart});
    const lastSessionBeforeToday = await models.Workout.findOne({
        where: {
            telegramId: user.telegramId,
            date: {[Op.lt]: todayStart},
        },
        order: [["date", "DESC"], ["id", "DESC"]],
    });
    const weeklyVolume = weekRows.reduce((sum, row) => sum + volumeFor(row), 0);
    const exerciseCount = new Set(weekRows.map(row => row.exercise)).size;
    const weeklyDays = new Set(weekRows.map(row => dateKeyInTimezone(new Date(row.date), timezone))).size;
    const currentWeekKey = dateOnly(currentWeekStart);
    const activityAnchor = currentWeekStart;
    const activity = Array.from({length: 7}, (_, index) => {
        const start = addWeeks(activityAnchor, index - 6);
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
    const todayWeekdayLabel = new Intl.DateTimeFormat(t(language, "locale.date"), {
        weekday: "long",
        timeZone: "UTC",
    }).format(convertToUserTimezone(today, timezone));

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
            currentWeekHasWorkout: workoutWeeks.has(currentWeekKey),
            weeks: activity,
        },
        activity,
        activityCalendar,
        lastSession: lastSessionBeforeToday ? workoutPayload(lastSessionBeforeToday, language, timezone) : null,
        recent,
    };
}
