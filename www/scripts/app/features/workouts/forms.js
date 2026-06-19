// Extracted from main.js without changing feature behavior.
import {WORKOUT_SAVE_LOADER_DELAY, WORKOUT_SAVE_MIN_LOADER_VISIBLE, WORKOUT_SAVE_SUCCESS_VISIBLE} from '../../core/config.js';
import {runtime} from '../../core/runtime.js';
import {createDelayedLoader, delay, generateDedupeToken, todayInputValue} from '../../core/utils.js';
import {$, $$, api, interpolate, state, t, telegramWebApp} from '../../deps.js';
import {closeSheetDialog, openSheetDialog, showToast} from '../../ui/dialogs.js';
import {workoutDateInputValue, workoutDetail} from './presentation.js';
import {updateWorkoutInLoadedState} from './state.js';

export function updateWorkoutFormState() {
    const disabled = state.savingWorkout || state.workoutSubmitted || state.exercises.length === 0;
    $$("#workout-form input, #workout-form select, #workout-form textarea, #workout-form button").forEach(node => {
        node.disabled = disabled;
    });

    const saveButton = $("#workout-save-button");
    if (saveButton) {
        saveButton.textContent = state.workoutSaveLoading
            ? t("actions.saving")
            : state.workoutSubmitted ? `✓ ${t("actions.saved")}` : t("actions.save");
        saveButton.classList.toggle("loading", state.workoutSaveLoading);
    }
}

export function updateEditWorkoutFormState() {
    const disabled = Boolean(state.savingEditedWorkout || state.editedWorkoutSubmitted);
    $$("#edit-form input, #edit-form select, #edit-form textarea, #edit-form button").forEach(node => {
        node.disabled = disabled;
    });
    const lockedExercise = $("#edit-exercise-locked");
    if (lockedExercise && !lockedExercise.hidden) {
        lockedExercise.disabled = true;
    }

    const saveButton = $("#edit-save-button");
    if (saveButton) {
        saveButton.textContent = state.editedWorkoutSaveLoading
            ? t("actions.saving")
            : state.editedWorkoutSubmitted ? `✓ ${t("actions.saved")}` : t("actions.save");
        saveButton.classList.toggle("loading", state.editedWorkoutSaveLoading);
    }
}

export function currentWorkoutDedupeToken() {
    if (!state.workoutDedupeToken) {
        state.workoutDedupeToken = generateDedupeToken();
    }
    return state.workoutDedupeToken;
}

export function triggerSuccessHaptic() {
    telegramWebApp?.HapticFeedback?.notificationOccurred?.("success");
}

export function triggerAchievementHaptic() {
    telegramWebApp?.HapticFeedback?.impactOccurred?.("heavy");
    telegramWebApp?.HapticFeedback?.notificationOccurred?.("success");
}

export function initializeWorkoutFormSession() {
    state.workoutDedupeToken = generateDedupeToken();
    state.savingWorkout = false;
    state.workoutSaveLoading = false;
    state.workoutSubmitted = false;
    clearWorkoutInputs();
    syncWorkoutDateLimits();
    $("#workout-date").value = todayInputValue();
    updateWorkoutFormState();
}

export function workoutFormFields(prefix) {
    return {
        date: $(`#${prefix}-date`),
        exercise: $(`#${prefix}-exercise`),
        exerciseLocked: $(`#${prefix}-exercise-locked`),
        sets: $(`#${prefix}-sets`),
        weight: $(`#${prefix}-weight`),
        reps: $(`#${prefix}-reps`),
        notes: $(`#${prefix}-notes`),
        notesCount: $(`#${prefix}-notes-count`),
        hasWeight: $(`#${prefix}-has-weight`),
        isTime: $(`#${prefix}-is-time`),
        controls: $(`#${prefix}-sets`).closest(".add-controls"),
        weightControl: $(`#${prefix}-weight`).closest(".weight-control"),
        repsControl: $(`#${prefix}-reps`).closest(".reps-control"),
    };
}

export function setWorkoutFormMode(prefix, {hasWeight = true, isTime = false} = {}) {
    const fields = workoutFormFields(prefix);
    fields.hasWeight.checked = Boolean(hasWeight);
    fields.isTime.checked = Boolean(isTime);
    fields.controls.classList.toggle("no-weight", !fields.hasWeight.checked);
    fields.weight.disabled = !fields.hasWeight.checked;
    fields.weight.required = fields.hasWeight.checked;
    if (!fields.hasWeight.checked) fields.weight.value = "";

    const resultLabel = fields.repsControl.querySelector(":scope > span");
    const resultUnit = fields.repsControl.querySelector(".stepper-unit");
    const resultLabelKey = fields.isTime.checked ? "fields.time" : "fields.reps";
    const resultUnitKey = fields.isTime.checked ? "units.sec" : "units.reps";
    resultLabel.dataset.i18n = resultLabelKey;
    resultUnit.dataset.i18n = resultUnitKey;
    resultLabel.textContent = t(resultLabelKey);
    resultUnit.textContent = t(resultUnitKey);

    fields.hasWeight.closest(".option-check").querySelector("strong").textContent = t(fields.hasWeight.checked ? "fields.weight" : "fields.noWeight");
    fields.isTime.closest(".option-check").querySelector("strong").textContent = t(fields.isTime.checked ? "fields.time" : "fields.reps");

    if (prefix === "workout") state.mode = fields.isTime.checked ? "time" : "reps";
    if (prefix === "edit") state.editMode = fields.isTime.checked ? "time" : "reps";
}

export function setWorkoutFormValues(prefix, workout) {
    const fields = workoutFormFields(prefix);
    const isMissingEditExercise = prefix === "edit" &&
        Boolean(workout.exercise) &&
        !state.exercises.some(exercise => exercise.name === workout.exercise);

    fields.date.value = workoutDateInputValue(workout);
    fields.exercise.value = workout.exercise;
    if (fields.exerciseLocked) {
        const shell = fields.exercise.closest(".field-shell");
        fields.exercise.hidden = isMissingEditExercise;
        fields.exercise.required = !isMissingEditExercise;
        fields.exerciseLocked.hidden = !isMissingEditExercise;
        fields.exerciseLocked.value = isMissingEditExercise ? workout.exercise : "";
        shell?.classList.toggle("exercise-missing", isMissingEditExercise);
    }
    fields.sets.value = workout.sets || "";
    fields.weight.value = workout.weight || "";
    fields.reps.value = workout.repsOrTime || "";
    fields.notes.value = workout.notes || "";
    fields.notesCount.textContent = String(fields.notes.value.length);
    setWorkoutFormMode(prefix, {
        hasWeight: workout.weight !== "" && workout.weight != null,
        isTime: Boolean(workout.isTime),
    });
}

export function readWorkoutFormValues(prefix) {
    const fields = workoutFormFields(prefix);
    const exercise = fields.exerciseLocked && !fields.exerciseLocked.hidden
        ? fields.exerciseLocked.value
        : fields.exercise.value;

    return {
        date: fields.date.value,
        exercise,
        sets: fields.sets.value,
        weight: fields.hasWeight.checked ? fields.weight.value : "",
        hasWeight: fields.hasWeight.checked,
        repsOrTime: fields.reps.value,
        isTime: fields.isTime.checked,
        notes: fields.notes.value,
    };
}

export function syncWorkoutDateLimits() {
    const today = todayInputValue();
    ["workout", "edit"].forEach(prefix => {
        const date = $(`#${prefix}-date`);
        if (date) date.max = today;
    });
}

export function validateWorkoutForm(prefix) {
    syncWorkoutDateLimits();
    const fields = workoutFormFields(prefix);
    fields.weight.required = fields.hasWeight.checked;
    if (fields.date.value && fields.date.value > todayInputValue()) {
        fields.date.setCustomValidity(t("validation.futureDate"));
    } else {
        fields.date.setCustomValidity("");
    }
    const form = prefix === "workout" ? $("#workout-form") : $("#edit-form");
    return form.reportValidity();
}

export function refreshWorkoutFormModes() {
    ["workout", "edit"].forEach(prefix => {
        const fields = workoutFormFields(prefix);
        setWorkoutFormMode(prefix, {
            hasWeight: fields.hasWeight.checked,
            isTime: fields.isTime.checked,
        });
    });
}

export function openEditDialog(workout) {
    state.savingEditedWorkout = false;
    state.editedWorkoutSaveLoading = false;
    state.editedWorkoutSubmitted = false;
    syncWorkoutDateLimits();
    $("#edit-id").value = workout.id;
    setWorkoutFormValues("edit", workout);
    updateEditWorkoutFormState();
    openSheetDialog($("#edit-dialog"));
}

export async function saveEditedWorkout() {
    if (state.savingEditedWorkout || state.editedWorkoutSubmitted) return;
    if (!validateWorkoutForm("edit")) return;
    const id = $("#edit-id").value;
    state.savingEditedWorkout = true;
    state.editedWorkoutSaveLoading = false;
    state.editedWorkoutSubmitted = false;
    updateEditWorkoutFormState();
    const loader = createDelayedLoader({
        delayMs: WORKOUT_SAVE_LOADER_DELAY,
        minVisibleMs: WORKOUT_SAVE_MIN_LOADER_VISIBLE,
        show: () => {
            state.editedWorkoutSaveLoading = true;
            updateEditWorkoutFormState();
        },
    });

    try {
        const workout = await api(`workouts/${id}`, {
            method: "PATCH",
            body: JSON.stringify(readWorkoutFormValues("edit")),
        });
        loader.cancel();
        await loader.waitForMinVisible();
        updateWorkoutInLoadedState(workout);
        state.savingEditedWorkout = false;
        state.editedWorkoutSaveLoading = false;
        state.editedWorkoutSubmitted = true;
        updateEditWorkoutFormState();
        triggerSuccessHaptic();
        await delay(WORKOUT_SAVE_SUCCESS_VISIBLE);
        closeSheetDialog($("#edit-dialog"));
    } catch (error) {
        loader.cancel();
        await loader.waitForMinVisible();
        console.error(error);
        showToast("toast.saveFailed", {variant: "danger"});
    } finally {
        loader.cancel();
        if (!state.editedWorkoutSubmitted) {
            state.savingEditedWorkout = false;
            state.editedWorkoutSaveLoading = false;
            updateEditWorkoutFormState();
        }
    }
}

export function clearWorkoutInputs() {
    abortPreviousWorkoutRequest();
    $("#workout-sets").value = "3";
    $("#workout-weight").value = "";
    $("#workout-reps").value = "12";
    $("#workout-notes").value = "";
    $("#notes-count").textContent = "0";
    setWorkoutFormMode("workout", {hasWeight: true, isTime: false});
    state.previousWorkout = null;
    state.previousWorkoutExercise = "";
    state.previousWorkoutLoaded = false;
    $("#previous-hint").textContent = t("add.previousHint");
    $("#previous-summary").textContent = t("add.previousHint");
    updatePreviousWorkoutLoadingState(false);
}

export function abortPreviousWorkoutRequest() {
    if (!runtime.previousWorkoutController) return;
    runtime.previousWorkoutController.abort();
    runtime.previousWorkoutController = null;
    runtime.previousWorkoutRequest = null;
    runtime.previousWorkoutRequestExercise = "";
    updatePreviousWorkoutLoadingState(false);
}

export function findPreviousWorkoutForSelectedExercise() {
    const selected = $("#workout-exercise").value;
    return state.previousWorkoutExercise === selected ? state.previousWorkout : null;
}

export function setPreviousWorkoutSummary(workout, selected) {
    if (!workout) {
        $("#previous-hint").textContent = selected ? t("add.noPrevious") : t("add.previousHint");
        $("#previous-summary").textContent = selected ? t("add.noPrevious") : t("add.previousHint");
        return;
    }

    $("#previous-hint").textContent = interpolate(t("add.previousLoaded"), {details: workoutDetail(workout)});
    $("#previous-summary").textContent = workoutDetail(workout);
}

export function updatePreviousWorkoutLoadingState(loading) {
    state.previousWorkoutLoading = loading;
    const button = $("#use-previous");
    const icon = button.querySelector(".previous-icon");
    button.classList.toggle("loading", loading);
    button.setAttribute("aria-busy", loading ? "true" : "false");
    if (icon) icon.textContent = loading ? "" : "↩️";
}

export async function updatePreviousWorkoutSummary() {
    const selected = $("#workout-exercise").value;
    if (!$("#workout-sets").value) $("#workout-sets").value = "3";
    if (!$("#workout-reps").value) $("#workout-reps").value = "12";

    if (selected && state.previousWorkoutExercise === selected && state.previousWorkoutLoaded) {
        updatePreviousWorkoutLoadingState(false);
        setPreviousWorkoutSummary(state.previousWorkout, selected);
        return state.previousWorkout;
    }

    if (selected && runtime.previousWorkoutRequest && runtime.previousWorkoutRequestExercise === selected) {
        return runtime.previousWorkoutRequest;
    }

    abortPreviousWorkoutRequest();
    state.previousWorkout = null;
    state.previousWorkoutExercise = selected;
    state.previousWorkoutLoaded = false;

    if (!selected) {
        updatePreviousWorkoutLoadingState(false);
        setPreviousWorkoutSummary(null, selected);
        return null;
    }

    const controller = new AbortController();
    runtime.previousWorkoutController = controller;
    runtime.previousWorkoutRequestExercise = selected;
    updatePreviousWorkoutLoadingState(true);

    runtime.previousWorkoutRequest = (async () => {
        const data = await api(`workouts/previous?exercise=${encodeURIComponent(selected)}`, {
            signal: controller.signal,
        });
        if (controller.signal.aborted || $("#workout-exercise").value !== selected) return null;
        state.previousWorkout = data.workout || null;
        state.previousWorkoutExercise = selected;
        state.previousWorkoutLoaded = true;
        setPreviousWorkoutSummary(state.previousWorkout, selected);
        return state.previousWorkout;
    })();

    try {
        return await runtime.previousWorkoutRequest;
    } catch (error) {
        if (error.name === "AbortError") return null;
        if ($("#workout-exercise").value === selected) {
            state.previousWorkout = null;
            state.previousWorkoutExercise = selected;
            state.previousWorkoutLoaded = true;
            setPreviousWorkoutSummary(null, selected);
        }
        throw error;
    } finally {
        if (runtime.previousWorkoutController === controller) {
            runtime.previousWorkoutController = null;
            runtime.previousWorkoutRequest = null;
            runtime.previousWorkoutRequestExercise = "";
            updatePreviousWorkoutLoadingState(false);
        }
    }
}

export async function applyPreviousWorkoutValues() {
    const previous = findPreviousWorkoutForSelectedExercise() || await updatePreviousWorkoutSummary();
    if (!previous) {
        return;
    }

    $("#workout-sets").value = previous.sets || "3";
    $("#workout-weight").value = previous.weight || "";
    $("#workout-reps").value = previous.repsOrTime || "12";
    setWorkoutFormMode("workout", {
        hasWeight: previous.weight !== "" && previous.weight != null,
        isTime: Boolean(previous.isTime),
    });
    setPreviousWorkoutSummary(previous, $("#workout-exercise").value);
}

export function adjustNumberInput(input, delta) {
    const step = Number.parseFloat(input.step || "1");
    const min = input.min === "" ? null : Number.parseFloat(input.min);
    const current = input.value === "" ? (min ?? 0) : Number.parseFloat(input.value);
    const next = Number.isFinite(current) ? current + delta : (min ?? step);
    const clamped = min == null ? next : Math.max(min, next);
    input.value = Number.isInteger(clamped) ? String(clamped) : String(Number(clamped.toFixed(2)));
    input.dispatchEvent(new Event("change", {bubbles: true}));
}

export function releaseNativeSelect(select) {
    if (document.activeElement === select) select.blur();
}

export function openDatePicker(input) {
    if (!input) return;
    input.focus();
    if (typeof input.showPicker === "function") {
        try {
            input.showPicker();
        } catch {
            // Some browsers only allow showPicker for direct user gestures.
        }
    }
}

export function bindNativeSelectFocusRelease() {
    document.addEventListener("pointerdown", event => {
        const activeSelect = document.activeElement?.matches?.("select") ? document.activeElement : null;
        if (!activeSelect) return;

        const targetSelect = event.target.closest?.("select");
        if (!targetSelect) {
            activeSelect.blur();
        }
    }, {capture: true, passive: true});
}
