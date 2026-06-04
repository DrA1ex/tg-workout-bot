import {formatDate} from "../../../i18n/index.js";
import {createDateGroupAttribute} from "../../../utils/timezone.js";
import {workoutPayload} from "./workouts.js";
import {models} from "../../../db/index.js";
import {WorkoutDAO} from "../../../dao/index.js";

export async function getHistory(user, {offset = 0, limit = 10} = {}) {
    const language = user.language || "en";
    const timezone = user.timezone || "UTC";
    const q = models.Workout.sequelize;
    const pageSize = Math.max(1, Math.min(Number.parseInt(limit, 10) || 10, 30));
    const pageOffset = Math.max(0, Number.parseInt(offset, 10) || 0);
    const dateRows = await models.Workout.findAll({
        attributes: [createDateGroupAttribute(q, "date", "d", timezone)],
        where: {telegramId: user.telegramId},
        group: ["d"],
        order: [[q.literal("d"), "DESC"]],
        offset: pageOffset,
        limit: pageSize + 1,
    });
    const dates = dateRows.map(row => row.get("d"));
    const hasMore = dates.length > pageSize;
    const pageDates = hasMore ? dates.slice(0, pageSize) : dates;
    const groups = [];

    for (const date of pageDates) {
        const rows = await WorkoutDAO.getWorkoutsByDate(user.telegramId, date, timezone);
        groups.push({
            date,
            label: formatDate(new Date(`${date}T00:00:00Z`), language, timezone, {
                weekday: "short",
                month: "short",
                day: "numeric",
            }),
            workouts: rows.map(row => workoutPayload(row, language, timezone)),
        });
    }

    return {
        groups,
        hasMore,
        nextOffset: pageOffset + pageDates.length,
        limit: pageSize,
    };
}
