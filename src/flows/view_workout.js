import {cancelled, response} from "../runtime/primitives.js";
import {formatDate, getUserLanguage} from "../i18n/index.js";
import {paginateDates} from "../utils/pagination.js";
import {WorkoutDAO} from "../dao/index.js";
import {getUserAndTimezone, checkEmptyListAndRespond} from "./common.js";

export function* viewWorkouts(state) {
    const {_, language} = yield getUserLanguage(state.telegramId);

    const {timezone} = yield* getUserAndTimezone(state);

    // 1. Get list of dates grouped by date in user's timezone
    const allDates = yield WorkoutDAO.getDatesWithWorkouts(state.telegramId, timezone);

    if (yield* checkEmptyListAndRespond(state, allDates, 'viewWorkout.noWorkouts', _)) {
        return;
    }

    // 2. Use pagination utility to select date
    const selectedDate = yield* paginateDates(
        state,
        allDates,
        _('viewWorkout.datesWithWorkouts'),
        language,
        timezone,
        formatDate,
        _
    );

    if (!selectedDate) return yield cancelled(state);

    // 3. Get workouts for selected date
    const rows = yield WorkoutDAO.getWorkoutsByDate(state.telegramId, selectedDate, timezone);

    if (!rows.length) {
        yield response(state, `No workouts on ${formatDate(new Date(selectedDate), language, timezone)}.`);
        return;
    }

    let message = _('viewWorkout.workoutsOnDate', {date: formatDate(new Date(selectedDate), language, timezone)});
    rows.forEach(w => {
        message += `\n - ${w.formatStringWithoutDate(language)}`;
    });

    yield response(state, message);
}