import {WorkoutDAO} from "../../../dao/index.js";
import {formatDate} from "../../../i18n/index.js";
import {dateFromUserDateInput, dateKeyInTimezone, nextUserDateStart, startOfUserDate} from "../../../utils/timezone.js";
import {workoutPayload} from "./workouts.js";

export async function getHistory(user, {offset = 0, limit = 10} = {}) {
    const language = user.language || "en";
    const timezone = user.timezone || "UTC";
    const pageSize = Math.max(1, Math.min(Number.parseInt(limit, 10) || 10, 30));
    const pageOffset = Math.max(0, Math.min(Number.parseInt(offset, 10) || 0, 100_000));
    const dates = await WorkoutDAO.getDatesWithWorkouts(user.telegramId, timezone);
    const pageDates = dates.slice(pageOffset, pageOffset + pageSize);
    const hasMore = dates.length > pageOffset + pageDates.length;
    if (!pageDates.length) {
        return {groups: [], hasMore: false, nextOffset: pageOffset, limit: pageSize};
    }

    const newest = pageDates[0];
    const oldest = pageDates.at(-1);
    const rows = await WorkoutDAO.getWorkoutsInRange(
        user.telegramId,
        startOfUserDate(oldest, timezone),
        nextUserDateStart(newest, timezone),
    );
    const rowsByDate = new Map(pageDates.map(date => [date, []]));
    for (const row of rows) {
        const key = dateKeyInTimezone(new Date(row.date), timezone);
        if (rowsByDate.has(key)) rowsByDate.get(key).push(row);
    }

    const groups = pageDates.map(date => ({
        date,
        label: formatDate(dateFromUserDateInput(date, timezone), language, timezone, {
            weekday: "short",
            month: "short",
            day: "numeric",
        }),
        workouts: rowsByDate.get(date)
            .sort((a, b) => Number(a.id) - Number(b.id))
            .map(row => workoutPayload(row, language, timezone)),
    }));

    return {
        groups,
        hasMore,
        nextOffset: pageOffset + pageDates.length,
        limit: pageSize,
    };
}
