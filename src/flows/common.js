/**
 * Common functions for workout flows
 */

import {cancelled, requestChoice, requestString, response} from "../runtime/primitives.js";
import {getUserLanguage} from "../i18n/index.js";
import {ExerciseDAO} from "../dao/index.js";

/**
 * Common function to add a new exercise
 * @param {Object} state - Flow state
 * @returns {string} Exercise name or null if cancelled
 */
export function* addNewExerciseCommon(state) {
    const {_} = yield getUserLanguage(state.telegramId);

    const name = yield requestString(state, _('addExercise.enterName'), {cancellable: true});
    if (!name) return yield cancelled(state);

    const notes = yield requestChoice(state,
        {__skip: _('buttons.skip'), __cancel: _('buttons.cancel'),},
        _('addExercise.enterNote'),
        {allowCustom: true}
    );

    if (notes === '__cancel') return yield cancelled(state);

    // Save to database using DAO
    yield ExerciseDAO.addUserExercise(state.telegramId, {
        name,
        notes: notes === "__skip" ? "" : notes
    });

    yield response(state, _('addExercise.exerciseAdded', {name}));
    return name;
}
