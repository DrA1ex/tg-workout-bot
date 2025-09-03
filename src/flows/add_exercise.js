import {cancelled, requestChoice, requestString, response} from "../runtime/primitives.js";
import {getUserLanguage} from "../i18n/index.js";
import {ExerciseDAO} from "../dao/index.js";
import {paginateExercises} from "../utils/pagination.js";

export function* addExercise(state) {
    const {_} = yield getUserLanguage(state.telegramId);

    const action = yield requestChoice(state, {
        create: _('addExercise.addNew'),
        global: _('addExercise.addExisting'),
        browse: _('addExercise.browseAll'),
        cancel: _('buttons.cancel')
    }, _('addExercise.selectOption'));

    if (action === "create") return yield* addNewExercise(state);
    if (action === "global") return yield* addExistingExercise(state);
    if (action === "browse") return yield* addFromAllExercises(state);
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

    const search = yield requestString(state, _('addExercise.enterSearch'), {cancellable: true});
    if (!search) return yield cancelled(state);

    // Search in global database using DAO
    const found = yield ExerciseDAO.searchGlobalExercises(search, 10);

    if (!found.length) {
        yield response(state, _('addExercise.nothingFound'));
        return;
    }

    // Build set of already added exercises to mark with a star
    const existing = new Set((yield ExerciseDAO.getUserExercises(state.telegramId))
        .map(ex => typeof ex === 'string' ? ex : ex.name));

    const options = found.reduce((acc, ex, id) => {
        const label = existing.has(ex.name) ? `★ ${ex.name}` : ex.name;
        acc[id] = label;
        return acc;
    }, {cancel: _('buttons.cancel')});

    const selected = yield requestChoice(state, options, _('addExercise.selectFromFound'), {deletePrevious: true});

    if (selected === "cancel") return yield cancelled(state);

    const exercise = found[selected];
    if (!exercise) return yield cancelled(state);

    if (existing.has(exercise.name)) {
        yield response(state, _('addExercise.exerciseExists', {name: exercise.name}));
        return yield cancelled(state);
    }

    // Add to user's list using DAO
    yield ExerciseDAO.addUserExercise(state.telegramId, {
        name: exercise.name,
        notes: exercise.notes || ""
    });

    yield response(state, _('addExercise.exerciseAdded', {name: exercise.name}));
}

function* addFromAllExercises(state) {
    const {_} = yield getUserLanguage(state.telegramId);

    // User's current exercises to mark already added
    const existing = new Set((yield ExerciseDAO.getUserExercises(state.telegramId))
        .map(ex => typeof ex === 'string' ? ex : ex.name));

    // Get all global exercises for pagination
    const allExercises = yield ExerciseDAO.getAllGlobalExercises();

    if (!allExercises.length) {
        yield response(state, _('addExercise.nothingFound'));
        return yield cancelled(state);
    }

    // Use pagination utility to select exercise
    const selected = yield* paginateExercises(
        state,
        allExercises,
        existing,
        _('addExercise.selectFromAll'),
        _,
        10
    );

    if (!selected) return yield cancelled(state);

    // Check if exercise already exists
    if (existing.has(selected.name)) {
        yield response(state, _('addExercise.exerciseExists', {name: selected.name}));
        return yield cancelled(state);
    }

    // Add to user's list using DAO
    yield ExerciseDAO.addUserExercise(state.telegramId, {
        name: selected.name,
        notes: selected.notes || ""
    });

    yield response(state, _('addExercise.exerciseAdded', {name: selected.name}));
}