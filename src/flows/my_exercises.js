import {responseMarkdown} from "../runtime/primitives.js";
import {getUserLanguage} from "../i18n/index.js";
import {ExerciseDAO} from "../dao/index.js";
import {checkEmptyListAndRespond} from "./common.js";

/**
 * Show user's exercises list with names and notes
 * @param {object} state - Flow state
 */
export function* myExercises(state) {
    const {_} = yield getUserLanguage(state.telegramId);

    // Get user's exercises from database
    const exercises = yield ExerciseDAO.getUserExercises(state.telegramId);

    if (yield* checkEmptyListAndRespond(state, exercises, 'myExercises.noExercises', _)) {
        return;
    }

    // Format exercises list
    let message = _('myExercises.exerciseList') + '\n\n';

    exercises.forEach(exercise => {
        const name = typeof exercise === 'string' ? exercise : exercise.name;
        const notes = typeof exercise === 'object' && exercise.notes ? exercise.notes : '';

        if (notes) {
            message += _('myExercises.exerciseItemWithNotes', {name, notes}) + '\n';
        } else {
            message += _('myExercises.exerciseItemWithoutNotes', {name}) + '\n';
        }
    });

    yield responseMarkdown(state, message);
}
