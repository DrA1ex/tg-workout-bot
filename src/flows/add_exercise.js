import {requestChoice, requestString, response, cancelled} from "../runtime/primitives.js";
import {getUserLanguage} from "../i18n/index.js";
import {ExerciseDAO} from "../dao/index.js";

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

    // Save to database using DAO
    yield ExerciseDAO.addUserExercise(state.telegramId, {
        name,
        notes: notes === "__skip" ? "" : notes
    });

    yield response(state, _('addExercise.exerciseAdded', {name}));
}

function* addExistingExercise(state) {
    const {_} = yield getUserLanguage(state.telegramId);

    const search = yield requestString(state, _('addExercise.enterSearch'));

    // Search in global database using DAO
    const found = yield ExerciseDAO.searchGlobalExercises(search, 10);

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

    // Add to user's list using DAO
    yield ExerciseDAO.addUserExercise(state.telegramId, {
        name: exercise.name,
        notes: exercise.notes || ""
    });

    yield response(state, _('addExercise.exerciseAdded', {name: exercise.name}));
}