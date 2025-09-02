import {requestChoice, response, cancelled, responseMarkdown, requestDate} from "../runtime/primitives.js";
import {getCurrentDateInTimezone} from "../utils/timezone.js";
import {getUserLanguage, formatDate} from "../i18n/index.js";
import {UserDAO, WorkoutDAO, ExerciseDAO} from "../dao/index.js";

function* requestStringWorkoutFiled(state, label, validator = undefined, skip = false) {
    const {_} = yield getUserLanguage(state.telegramId);

    const value = yield requestChoice(state, {
        ...(skip ? {"skip": _('buttons.skip')} : {}),
        "cancel": _('buttons.cancel'),
    }, label, {
        validator,
        allowCustom: true
    });

    if (value === "cancel") return yield cancelled(state);
    if (value === "skip") return yield responseMarkdown(state, _('validation.skipped'));

    return value;
}

export function* addWorkout(state) {
    const {_, language} = yield getUserLanguage(state.telegramId);

    const user = yield UserDAO.findByTelegramId(state.telegramId);
    const timezone = user?.timezone || 'UTC';

    // 1. Date selection
    const dateChoice = yield requestChoice(
        state,
        {today: _('buttons.today'), pick: _('buttons.pickDate'), cancel: _('buttons.cancel')},
        _('addWorkout.selectDate')
    );

    if (dateChoice === "cancel") return yield cancelled(state);

    let workoutDate = getCurrentDateInTimezone(timezone);
    if (dateChoice === "pick") {
        workoutDate = yield requestDate(state, _('addWorkout.pickDate'));
    }

    yield responseMarkdown(state, _('addWorkout.selectedDate', {date: formatDate(workoutDate, language, timezone)}));

    // 2. Exercise selection
    const exercises = yield ExerciseDAO.getUserExercises(state.telegramId);
    const exerciseNames = exercises.map(e => (typeof e === "string" ? e : e.name));

    if (!exerciseNames.length) {
        yield response(state, _('addWorkout.noExercises'));
        return;
    }

    const exOptions = exerciseNames.reduce((acc, ex, idx) => {
        acc[idx] = ex;
        return acc;
    }, {cancel: _('buttons.cancel')});

    const exKey = yield requestChoice(state, exOptions, _('addWorkout.selectExercise'));
    if (exKey === "cancel") return yield cancelled(state);
    const exercise = exerciseNames[exKey];

    yield responseMarkdown(state, _('addWorkout.selectedExercise', {exercise}));

    // 3. Suggest using last workout parameters
    const lastWorkout = yield WorkoutDAO.getLastWorkout(state.telegramId, exercise);

    if (lastWorkout) {
        const lastSetInfo = lastWorkout.formatString(language, timezone);

        const reuse = yield requestChoice(
            state, {
                reuse: _('addWorkout.useLastValues'),
                new: _('addWorkout.useNewValues'),
                cancel: _('buttons.cancel')
            },
            _('addWorkout.reuseLastSet', {lastSet: lastSetInfo})
        );

        if (reuse === "cancel") return yield cancelled(state);

        if (reuse === "reuse") {
            yield WorkoutDAO.create({
                telegramId: state.telegramId,
                date: workoutDate.toISOString(),
                exercise,
                sets: lastWorkout.sets,
                weight: lastWorkout.weight,
                repsOrTime: lastWorkout.repsOrTime,
                isTime: lastWorkout.isTime,
                notes: lastWorkout.notes,
            });

            yield responseMarkdown(state, _('addWorkout.workoutAddedLastValues'));
            return;
        }
    }

    // 4. Enter new data
    const sets = yield* requestStringWorkoutFiled(state, _('addWorkout.enterSets'), txt => !isNaN(parseInt(txt)));
    const weightInput = yield* requestStringWorkoutFiled(state, _('addWorkout.enterWeight'), txt => !isNaN(parseFloat(txt)), true);

    const repsInput = yield* requestStringWorkoutFiled(state, _('addWorkout.enterRepsOrTime'));
    let isTime = false;
    let repsOrTime = repsInput.trim();
    if (repsOrTime.endsWith("s") || repsOrTime.endsWith("с")) {
        isTime = true;
        repsOrTime = repsOrTime.slice(0, -1);
    }
    const reps = parseFloat(repsOrTime);

    const notes = yield* requestStringWorkoutFiled(state, _('addWorkout.enterNotes'), undefined, true);

    yield WorkoutDAO.create({
        telegramId: state.telegramId,
        date: workoutDate.toISOString(),
        exercise,
        sets: parseInt(sets),
        weight: weightInput && parseFloat(weightInput.trim()),
        repsOrTime: reps,
        isTime,
        notes: notes && notes.trim(),
    });

    yield response(state, _('addWorkout.workoutSaved'));
}
