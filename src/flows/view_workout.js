import {models} from "../db/index.js";
import {requestChoice, response, cancelled} from "../runtime/primitives.js";
import {getUserLanguage, t} from "../i18n/index.js";

const PER_PAGE = 10;

export function* viewWorkouts(state, ctx) {
    const {_, language} = yield getUserLanguage(state.telegramId);
        
    // 1. Get list of dates
    const dates = yield models.Workout.findAll({
        attributes: [[models.Workout.sequelize.fn("date", models.Workout.sequelize.col("date")), "d"]],
        where: {telegramId: state.telegramId},
        group: ["d"],
        order: [[models.Workout.sequelize.literal("d"), "DESC"]],
    });

    if (!dates.length) {
        return yield response(state, _('viewWorkout.noWorkouts'));
    }

    const allDates = dates.map(r => r.get("d"));

    let page = 0;
    while (true) {
        // 2. Create page
        const pageDates = allDates.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
        const options = {};

        pageDates.forEach(d => {
            options[d] = d;
        });

        if (page > 0) options["prev"] = _('buttons.previous');
        if ((page + 1) * PER_PAGE < allDates.length) options["next"] = _('buttons.next');
        options["cancel"] = _('buttons.cancel');

        const choice = yield requestChoice(state, options, _('viewWorkout.datesWithWorkouts'));

        if (choice === "cancel") return yield cancelled(state);
        if (choice === "prev") {
            page--;
            continue;
        }
        if (choice === "next") {
            page++;
            continue;
        }

        // 3. User selected date → get workouts
        const q = models.Workout.sequelize;
        const rows = yield models.Workout.findAll({
            where: {
                telegramId: state.telegramId,
                date: q.where(q.fn('DATE', q.col('date')), choice)
            },
            order: [["id", "ASC"]],
        });

        if (!rows.length) {
            yield response(state, `No workouts on ${choice}.`);
            continue;
        }

        let message = _('viewWorkout.workoutsOnDate', {date: choice});
        rows.forEach(w => {
            message += `\n${w.formatString(language)}`;
        });

        yield response(state, message);
        return;
    }
}