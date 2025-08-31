import {requestChoice, requestString, response, cancelled} from "../runtime/primitives.js";
import {models} from "../db/index.js";
import {getUserLanguage} from "../i18n/index.js";

export function* addExercise(state) {
    const {_} = yield getUserLanguage(state.telegramId);

    const action = yield requestChoice(state, {
        create: _('addExercise.addNew'),
        global: _('addExercise.addExisting'),
        cancel: _('buttons.cancel')
    }, _('addExercise.selectOption'));

    if (action === "create") return yield* addNewExercise(state);
    if (action === "global") return yield* addExistingExercise(state);
    return yield cancelled(state);
}

function* addNewExercise(state) {
    const {_} = yield getUserLanguage(state.telegramId);

    const name = yield requestString(state, _('addExercise.enterName'));
    const notes = yield requestChoice(state,
        {__skip: _('buttons.skip')},
        _('addExercise.enterNote'),
        {allowCustom: true}
    );

    // Save to database
    const [user] = yield models.User.findOrCreate({where: {telegramId: state.telegramId}});
    const exercises = JSON.parse(user.exercises || "[]");

    if (exercises.find(e => (e.name || e) === name)) {
        yield response(state, _('addExercise.exerciseExists', {name}));
        return;
    }

    exercises.push({name, notes: notes === "__skip" ? "" : notes});
    user.exercises = JSON.stringify(exercises);
    yield user.save();

    yield response(state, _('addExercise.exerciseAdded', {name}));
}

function* addExistingExercise(state) {
    const {_} = yield getUserLanguage(state.telegramId);

    const search = yield requestString(state, _('addExercise.enterSearch'));

    // Search in global database
    const found = yield models.GlobalExercise.findAll({
        where: {
            name: models.GlobalExercise.sequelize.where(
                models.GlobalExercise.sequelize.fn('LOWER', models.GlobalExercise.sequelize.col('name')),
                'LIKE',
                `%${search}%`)
        },
        limit: 10
    });

    if (!found.length) {
        yield response(state, _('addExercise.nothingFound'));
        return yield cancelled(state);
    }

    const options = found.reduce((acc, ex, id) => {
        acc[id] = ex.name;
        return acc;
    }, {cancel: _('buttons.cancel')});

    const selected = yield requestChoice(state, options, _('addExercise.selectFromFound'));

    if (selected === "cancel") return yield cancelled(state);

    const exercise = found[selected];
    if (!exercise) return yield cancelled(state);

    // Add to user's list
    const [user] = yield models.User.findOrCreate({where: {telegramId: state.telegramId}});
    const exercises = JSON.parse(user.exercises || "[]");

    if (exercises.find(e => (e.name || e) === exercise.name)) {
        yield response(state, _('addExercise.exerciseExists', {name: exercise.name}));
        return;
    }

    exercises.push({name: exercise.name, notes: exercise.notes || ""});
    user.exercises = JSON.stringify(exercises);
    yield user.save();

    yield response(state, _('addExercise.exerciseAdded', {name: exercise.name}));
}