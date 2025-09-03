import {cancelled, requestChoice, requestString, response} from "../runtime/primitives.js";
import {getUserLanguage} from "../i18n/index.js";
import {ExerciseDAO} from "../dao/index.js";
import {paginateExercises} from "../utils/pagination.js";
import {addNewExerciseCommon, buildExerciseOptions, getUserExercisesSet, checkEmptyListAndRespond} from "./common.js";

export function* addExercise(state) {
    const {_} = yield getUserLanguage(state.telegramId);

    const action = yield requestChoice(state, {
        create: _('addExercise.addNew'),
        global: _('addExercise.addExisting'),
        browse: _('addExercise.browseAll'),
        cancel: _('buttons.cancel')
    }, _('addExercise.selectOption'), {deletePrevious: true});

    if (action === "create") return yield* addNewExercise(state);
    if (action === "global") return yield* addExistingExercise(state);
    if (action === "browse") return yield* addFromAllExercises(state);
    return yield cancelled(state);
}

function* addNewExercise(state) {
    return yield* addNewExerciseCommon(state);
}

function* addExistingExercise(state) {
    const {_} = yield getUserLanguage(state.telegramId);

    while (true) {
        const search = yield requestString(state, _('addExercise.enterSearch'), {
            cancellable: true,
            deletePrevious: true
        });
        if (!search) return yield cancelled(state);

        // Search in global database using DAO
        const found = yield ExerciseDAO.searchGlobalExercises(search, 10);

        if (!found.length) {
            // Ask if user wants to try again
            const tryAgain = yield requestChoice(state, {
                retry: _('addExercise.tryAgain'),
                cancel: _('buttons.cancel')
            }, _('addExercise.nothingFound'));

            if (tryAgain === "cancel") return yield cancelled(state);
            if (tryAgain === "retry") continue; // Try another search
        }

        // Build set of already added exercises to mark with a star
        const existing = yield* getUserExercisesSet(state.telegramId);

        const options = buildExerciseOptions(found, existing, _, {
            retry: _('addExercise.tryAgain'),
            cancel: _('buttons.cancel')
        });

        const selected = yield requestChoice(state, options, _('addExercise.selectFromFound'), {deletePrevious: true});

        if (selected === "cancel") return yield cancelled(state);
        if (selected === "retry") continue; // Try another search

        const exercise = found[selected];
        if (!exercise) continue; // Invalid selection, try again

        if (existing.has(exercise.name)) {
            // Ask if user wants to try another search
            const tryAnother = yield requestChoice(state, {
                retry: _('addExercise.tryAgain'),
                cancel: _('buttons.cancel')
            }, _('addExercise.exerciseExists', {name: exercise.name}));

            if (tryAnother === "cancel") return yield cancelled(state);
            if (tryAnother === "retry") continue; // Try another search
        }

        // Add to user's list using DAO
        yield ExerciseDAO.addUserExercise(state.telegramId, {
            name: exercise.name,
            notes: exercise.notes || ""
        });

        yield response(state, _('addExercise.exerciseAdded', {name: exercise.name}));
        return; // Successfully added, exit the loop
    }
}

function* addFromAllExercises(state) {
    const {_} = yield getUserLanguage(state.telegramId);

    // User's current exercises to mark already added
    const existing = yield* getUserExercisesSet(state.telegramId);

    // Get all global exercises for pagination
    const allExercises = yield ExerciseDAO.getAllGlobalExercises();

    if (yield* checkEmptyListAndRespond(state, allExercises, 'addExercise.nothingFound', _)) {
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