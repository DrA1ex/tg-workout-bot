import {
    requestChoice,
    response,
    cancelled,
    requestDate,
    responseMarkdown
} from "../runtime/primitives.js";
import {models} from "../db/index.js";
import {getUserLanguage, t, formatDate} from "../i18n/index.js";

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

    // 1. Date selection
    const dateChoice = yield requestChoice(
        state,
        {today: _('buttons.today'), pick: _('buttons.pickDate'), cancel: _('buttons.cancel')},
        _('addWorkout.selectDate')
    );

    if (dateChoice === "cancel") return yield cancelled(state);

    let workoutDate = new Date();
    if (dateChoice === "pick") {
        workoutDate = yield requestDate(state, _('addWorkout.pickDate'));
    }

    yield responseMarkdown(state, _('addWorkout.selectedDate', {date: formatDate(workoutDate, language)}));

    // 2. Exercise selection
    const user = yield models.User.findByPk(state.telegramId);
    const exercises = JSON.parse(user.exercises || "[]").map(e => (typeof e === "string" ? e : e.name));
    if (!exercises.length) {
        yield response(state, _('addWorkout.noExercises'));
        return;
    }

    const exOptions = exercises.reduce((acc, ex, idx) => {
        acc[idx] = ex;
        return acc;
    }, {cancel: _('buttons.cancel')});

    const exKey = yield requestChoice(state, exOptions, _('addWorkout.selectExercise'));
    if (exKey === "cancel") return yield cancelled(state);
    const exercise = exercises[exKey];

    yield responseMarkdown(state, _('addWorkout.selectedExercise', {exercise}));

    // 3. Suggest using last workout parameters
    const lastWorkout = yield models.Workout.findOne({
        where: {telegramId: state.telegramId, exercise},
        order: [["date", "DESC"]]
    });

    if (lastWorkout) {
        const lastSetInfo = lastWorkout.formatString(language);

        const reuse = yield requestChoice(
            state,
            {reuse: "Use last values", new: "Enter new", cancel: _('buttons.cancel')},
            `${language === 'en' ? 'Last workout' : 'Последняя тренировка'}: ${lastSetInfo}\n${language === 'en' ? 'Use these values or enter new ones?' : 'Хотите использовать эти данные или ввести новые?'}`
        );

        if (reuse === "cancel") return yield cancelled(state);

        if (reuse === "reuse") {
            yield models.Workout.create({
                telegramId: state.telegramId,
                date: workoutDate.toISOString(),
                exercise,
                sets: lastWorkout.sets,
                weight: lastWorkout.weight,
                repsOrTime: lastWorkout.repsOrTime,
                isTime: lastWorkout.isTime,
                notes: lastWorkout.notes,
            });

            yield responseMarkdown(state, language === 'en' ? 'Workout added using *last values*!' : 'Тренировка добавлена используя *последние значения*!');
            return;
        }
    }

    // 4. Enter new data
    const sets = yield* requestStringWorkoutFiled(state, _('addWorkout.enterSets'), txt => !isNaN(parseInt(txt)));
    const weightInput = yield* requestStringWorkoutFiled(state, _('addWorkout.enterWeight'), txt => !isNaN(parseFloat(txt)), true);

    const repsInput = yield* requestStringWorkoutFiled(state, language === 'en' ? 'Enter reps or time (add "s" for seconds):' : 'Введите повторения или время (добавьте "с" для секунд):');
    let isTime = false;
    let repsOrTime = repsInput.trim();
    if (repsOrTime.endsWith("s") || repsOrTime.endsWith("с")) {
        isTime = true;
        repsOrTime = repsOrTime.slice(0, -1);
    }
    const reps = parseFloat(repsOrTime);

    const notes = yield* requestStringWorkoutFiled(state, language === 'en' ? 'Enter notes (or skip):' : 'Введите примечания (или пропустите):', undefined, true);

    yield models.Workout.create({
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
