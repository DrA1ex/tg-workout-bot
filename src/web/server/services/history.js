import {WorkoutDAO} from "../../../dao/index.js";
import {formatDate} from "../../../i18n/index.js";
import {workoutPayload} from "./workouts.js";

export async function getHistory(user) {
    const language = user.language || "en";
    const timezone = user.timezone || "UTC";
    const dates = await WorkoutDAO.getDatesWithWorkouts(user.telegramId, timezone);
    const groups = [];

    for (const date of dates.slice(0, 30)) {
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

    return {groups};
}
