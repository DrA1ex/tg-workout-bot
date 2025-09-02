import {requestChoice, response, cancelled} from "../runtime/primitives.js";
import {startFlow} from "../runtime/index.js";
import {getUserLanguage, formatDate} from "../i18n/index.js";
import {paginateDates} from "../utils/pagination.js";
import {UserDAO, WorkoutDAO} from "../dao/index.js";

export function* deleteWorkout(state) {
    const {_, language} = yield getUserLanguage(state.telegramId);

    const user = yield UserDAO.findByTelegramId(state.telegramId);
    const timezone = user?.timezone || 'UTC';

    // 1. Get list of dates grouped by date in user's timezone
    const allDates = yield WorkoutDAO.getDatesWithWorkouts(state.telegramId, timezone);

    if (!allDates.length) {
        return yield response(state, _('deleteWorkout.noWorkouts'));
    }

    // 2. Use pagination utility to select date
    const selectedDate = yield* paginateDates(
        state, 
        allDates, 
        _('deleteWorkout.selectDate'), 
        language, 
        timezone, 
        formatDate, 
        _
    );

    if (!selectedDate) return yield cancelled(state);

    // 3. Get workouts for selected date
    const rows = yield WorkoutDAO.getWorkoutsByDate(state.telegramId, selectedDate, timezone);

    if (!rows.length) {
        yield response(state, _('deleteWorkout.noWorkoutsOnDate', {date: formatDate(new Date(selectedDate), language, timezone)}));
        return;
    }

    let summary = _('deleteWorkout.deletionSummary', {date: formatDate(new Date(selectedDate), language, timezone)});
    const rowOptions = {all: _('buttons.deleteAll'), cancel: _('buttons.cancel')};

    rows.forEach((w, i) => {
        summary += `${i + 1}. ${w.formatString(language, timezone)}\n`;
        rowOptions[String(w.id)] = `${i + 1}. ${w.exercise}`;
    });

    const workoutId = yield requestChoice(state, rowOptions, summary);

    if (workoutId === "cancel") return yield cancelled(state);

    if (workoutId === "all") {
        // Delete all workouts for the selected date
        const workoutIds = rows.map(w => w.id);
        yield WorkoutDAO.deleteMultiple(workoutIds, state.telegramId);

        yield response(state, _('deleteWorkout.allDeleted', {date: formatDate(new Date(selectedDate), language, timezone)}));
        return;
    }

    // 4. Delete one workout
    yield WorkoutDAO.deleteById(workoutId, state.telegramId);

    yield response(state, _('deleteWorkout.recordDeleted'));
}

export const handlers = {
    menuButton: {
        text: "Delete workouts",
        order: 1,
        handler: (ctx) => startFlow(ctx, deleteWorkout, {}),
    },
};