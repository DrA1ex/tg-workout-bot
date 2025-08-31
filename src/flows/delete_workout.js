import {models} from "../db/index.js";
import {requestChoice, response, cancelled} from "../runtime/primitives.js";
import {startFlow} from "../runtime/index.js";
import {getUserLanguage} from "../i18n/index.js";

const PER_PAGE = 10;

export function* deleteWorkout(state) {
    const {_, language} = yield getUserLanguage(state.telegramId);
        
    // 1. Get all dates with workouts
    const dates = yield models.Workout.findAll({
        attributes: [[models.Workout.sequelize.fn("date", models.Workout.sequelize.col("date")), "d"]],
        where: {telegramId: state.telegramId},
        group: ["d"],
        order: [[models.Workout.sequelize.literal("d"), "DESC"]],
    });

    if (!dates.length) {
        return yield response(state, _('deleteWorkout.noWorkouts'));
    }

    const allDates = dates.map(r => r.get("d"));

    let page = 0;
    while (true) {
        // 2. Create list for current page
        const pageDates = allDates.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
        const options = {};

        pageDates.forEach(d => {
            options[d] = d;
        });

        if (page > 0) options["prev"] = _('buttons.previous');
        if ((page + 1) * PER_PAGE < allDates.length) options["next"] = _('buttons.next');
        options["cancel"] = _('buttons.cancel');

        const choice = yield requestChoice(state, options, _('deleteWorkout.selectDate'));

        if (choice === "cancel") return yield cancelled(state);
        if (choice === "prev") {
            page--;
            continue;
        }
        if (choice === "next") {
            page++;
            continue;
        }

        // 3. Date selected → get workouts
        const q = models.Workout.sequelize;
        const rows = yield models.Workout.findAll({
            where: {
                telegramId: state.telegramId,
                date: q.where(q.fn('DATE', q.col('date')), choice)
            },
        });

        if (!rows.length) {
            yield response(state, _('deleteWorkout.noWorkoutsOnDate', {date: choice}));
            return;
        }

        let summary = _('deleteWorkout.deletionSummary', {date: choice});
        const rowOptions = {cancel: _('buttons.cancel'), all: _('buttons.deleteAll')};

        rows.forEach(w => {
            summary += `${w.formatString(language)}\n`;
            rowOptions[String(w.id)] = `${w.exercise}`;
        });

        const workoutId = yield requestChoice(state, rowOptions, summary);

        if (workoutId === "cancel") return yield cancelled(state);

        if (workoutId === "all") {
            yield models.Workout.destroy({
                where: {
                    telegramId: state.telegramId,
                    date: q.where(q.fn('DATE', q.col('date')), choice)
                },
            });

            yield response(state, _('deleteWorkout.allDeleted', {date: choice}));
            return;
        }

        // 4. Delete one workout
        yield models.Workout.destroy({
            where: {id: workoutId, telegramId: state.telegramId},
        });

        yield response(state, _('deleteWorkout.recordDeleted'));
        return;
    }
}

export const handlers = {
    menuButton: {
        text: "Delete workouts",
        order: 1,
        handler: (ctx) => startFlow(ctx, deleteWorkout, {}),
    },
};