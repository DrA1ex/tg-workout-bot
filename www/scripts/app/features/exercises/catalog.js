// Extracted from main.js without changing feature behavior.
import {nextAnimationFrame} from '../../core/utils.js';
import {runtime} from '../../core/runtime.js';
import {$, $$, api, escapeHtml, state, t} from '../../deps.js';
import {closeModalDialog, confirmExerciseDelete, openModalDialog, setDeleteWorkoutPending, showToast} from '../../ui/dialogs.js';
import {isOnboardingDialogOpen, renderOnboardingGlobalExercises} from '../onboarding/index.js';
import {isSettingsExercisesDialogOpen, loadSettingsGlobalExercises, renderSettingsExerciseSummary, renderSettingsExercises, setSettingsExercisePending, syncSettingsExerciseRow} from '../settings/exercises.js';
import {updateWorkoutFormState} from '../workouts/forms.js';

export function exerciseSelectOptions(selectedValue = "") {
    const recentNames = new Set((state.recentExercises || []).map(exercise => exercise.name));
    const exercisesByName = new Map(state.exercises.map(exercise => [exercise.name, exercise]));
    const recent = (state.recentExercises || [])
        .map(exercise => exercisesByName.get(exercise.name))
        .filter(Boolean);
    const rest = state.exercises.filter(exercise => !recentNames.has(exercise.name));
    const option = exercise => `<option value="${escapeHtml(exercise.name)}" ${exercise.name === selectedValue ? "selected" : ""}>${escapeHtml(exercise.name)}</option>`;

    if (!recent.length) return rest.map(option).join("");

    return [
        `<option value="" disabled>${escapeHtml(t("exercises.recentlyUsed"))}</option>`,
        ...recent.map(option),
        `<option value="" disabled>${escapeHtml(t("exercises.allExercises"))}</option>`,
        ...rest.map(option),
    ].join("");
}

export function setExerciseSelectOptions(selector, selectedValue) {
    const select = $(selector);
    const nextValue = selectedValue || select.value;
    select.innerHTML = exerciseSelectOptions(nextValue);
    if (nextValue && [...select.options].some(option => option.value === nextValue)) {
        select.value = nextValue;
    } else {
        const firstEnabled = [...select.options].find(option => !option.disabled);
        if (firstEnabled) select.value = firstEnabled.value;
    }
}

export function renderExercises() {
    setExerciseSelectOptions("#workout-exercise", $("#workout-exercise").value);
    setExerciseSelectOptions("#edit-exercise", $("#edit-exercise").value);
    setExerciseSelectOptions("#progress-exercise", $("#progress-exercise").value);
    $("#add-empty").hidden = state.exercises.length > 0;
    updateWorkoutFormState();
    $("#exercise-list-title").textContent = state.exerciseScope === "mine" ? t("exercises.mine") : t("exercises.global");
    $("#exercise-list").classList.toggle("history-workout-list", state.exerciseScope === "mine");

    if (state.exerciseScope === "mine") {
        const query = state.exerciseSearch.toLowerCase();
        const filtered = state.exercises.filter(ex =>
            ex.name.toLowerCase().includes(query) ||
            (ex.notes || "").toLowerCase().includes(query)
        );

        $("#exercise-count").textContent = filtered.length;
        $("#exercise-list").innerHTML = filtered.length
            ? filtered.map(userExerciseRow).join("")
            : `<div class="empty">${t(state.exercises.length ? "exercises.noMatches" : "empty.exercises")}</div>`;
        return;
    }

    $("#exercise-count").textContent = state.globalExercises.length;
    $("#exercise-list").innerHTML = state.globalExercises.length
        ? state.globalExercises.map(globalExerciseRow).join("")
        : `<div class="empty">${t("exercises.noGlobalMatches")}</div>`;
}

export function userExerciseRow(exercise, {pending = false} = {}) {
    const note = String(exercise.notes || "").trim();
    const rowClasses = ["workout-row", "swipe-workout-row", "exercise-row", pending ? "exercise-row-pending" : ""].filter(Boolean).join(" ");
    const buttonAttributes = pending ? ' disabled aria-busy="true"' : "";
    const deleteAttributes = pending ? ' disabled aria-busy="true"' : "";
    const trailing = pending
        ? '<span class="exercise-row-spinner" aria-hidden="true"></span>'
        : '<span class="swipe-workout-chevron" aria-hidden="true">›</span>';

    return `
        <article class="${rowClasses}" data-exercise-row-key="${escapeHtml(exercise.name)}" data-exercise-name="${escapeHtml(exercise.name)}">
            <button class="swipe-workout-main" type="button" data-edit-exercise="${escapeHtml(exercise.name)}"${buttonAttributes}>
                <span class="swipe-workout-body">
                    <h3>${escapeHtml(exercise.name)}</h3>
                    ${note ? `<p>${escapeHtml(note)}</p>` : ""}
                </span>
                ${trailing}
            </button>
            <button class="swipe-delete-action" type="button" data-delete-exercise="${escapeHtml(exercise.name)}"${deleteAttributes}>
                ${escapeHtml(t("actions.delete"))}
            </button>
        </article>
    `;
}

export function globalExerciseRow(exercise) {
    return `
        <article class="workout-row exercise-row">
            <div>
                <h3>${escapeHtml(exercise.name)}</h3>
                <div class="exercise-meta">
                    <span class="tag ${exercise.added ? "success" : ""}">${exercise.added ? t("actions.added") : t("exercises.global")}</span>
                </div>
            </div>
            <div class="row-actions">
                <button class="row-action" type="button" data-add-global-exercise="${escapeHtml(exercise.name)}" ${exercise.added ? "disabled" : ""} aria-label="${t("actions.add")}">＋</button>
            </div>
        </article>
    `;
}

export function findExercise(name) {
    return state.exercises.find(ex => ex.name === name);
}

export function syncExerciseState(exercises, {
    animateSettings = false,
    animateOnboarding = false,
    renderSettingsList = true,
    renderOnboardingList = true,
} = {}) {
    state.exercises = exercises;
    const byName = new Map(exercises.map(exercise => [exercise.name, exercise]));
    state.recentExercises = (state.recentExercises || []).map(exercise => ({
        ...exercise,
        ...(byName.get(exercise.name) || {}),
    }));
    renderSettingsExerciseSummary();

    const animations = [];
    if (renderSettingsList) {
        animations.push(renderSettingsExercises({
            animate: animateSettings && isSettingsExercisesDialogOpen(),
        }));
    }
    if (renderOnboardingList) {
        animations.push(renderOnboardingGlobalExercises({
            animate: animateOnboarding && isOnboardingDialogOpen(),
        }));
    }

    return Promise.allSettled(animations);
}

export function openExerciseDialog(exercise) {
    const current = findExercise(exercise.name) || exercise;
    $("#exercise-edit-name").value = current.name;
    $("#exercise-edit-new-name").value = current.name;
    $("#exercise-edit-notes").value = current.notes || "";
    setExerciseEditPending(false);
    openModalDialog($("#exercise-dialog"));
}

export function openExerciseAddDialog() {
    $("#exercise-form").reset();
    setExerciseAddPending(false);
    openModalDialog($("#exercise-add-dialog"));
}

export function openExerciseAddDialogWithName(name = "") {
    openExerciseAddDialog();
    $("#exercise-name").value = name.trim();
    if (name.trim()) $("#exercise-notes").focus();
}

export function setExerciseEditPending(pending) {
    state.savingExercise = pending;
    const saveButton = $("#exercise-edit-save");
    saveButton.disabled = pending;
    saveButton.classList.toggle("loading", pending);
    saveButton.textContent = pending ? t("actions.saving") : t("actions.save");
    $$("#exercise-edit-form input, #exercise-edit-form textarea, #exercise-edit-form button").forEach(node => {
        if (node.id !== "exercise-edit-save") node.disabled = pending;
    });
}

export function setExerciseAddPending(pending, {loading = pending, saved = false} = {}) {
    state.savingExercise = pending;
    const saveButton = $("#exercise-add-save");
    saveButton.disabled = pending;
    saveButton.classList.toggle("loading", loading);
    saveButton.textContent = saved ? `✓ ${t("actions.saved")}` : loading ? t("actions.saving") : t("actions.addExercise");
    $$("#exercise-form input, #exercise-form textarea, #exercise-form button").forEach(node => {
        if (node.id !== "exercise-add-save") node.disabled = pending;
    });
}

export async function loadGlobalExercises() {
    const requestSeq = ++runtime.exerciseGlobalRequestSeq;
    const requestSearch = state.exerciseSearch;
    const params = new URLSearchParams();
    if (requestSearch) params.set("search", requestSearch);
    const data = await api(`exercises/global${params.toString() ? `?${params.toString()}` : ""}`);
    if (requestSeq !== runtime.exerciseGlobalRequestSeq || requestSearch !== state.exerciseSearch) return;
    state.globalExercises = data.exercises || [];
    renderExercises();
}

export async function saveExerciseNotes() {
    if (state.savingExercise) return;
    const name = $("#exercise-edit-name").value;
    const nextName = $("#exercise-edit-new-name").value.trim();
    const nameChanged = nextName && nextName !== name;
    setExerciseEditPending(true);
    try {
        const data = await api(`exercises/${encodeURIComponent(name)}`, {
            method: "PATCH",
            body: JSON.stringify({
                name: nextName,
                notes: $("#exercise-edit-notes").value,
            }),
        });
        const animateSettings = isSettingsExercisesDialogOpen();

        closeModalDialog($("#exercise-dialog"));
        if (animateSettings) await nextAnimationFrame();

        await syncExerciseState(data.exercises, {
            renderSettingsList: !animateSettings,
        });
        const updatedExercise = data.exercises.find(exercise => exercise.name === nextName) ||
            data.exercises.find(exercise => exercise.name === name);
        syncSettingsExerciseRow(updatedExercise, {previousName: name});
        renderExercises();
        if (animateSettings) runtime.settingsExercisesRefreshPending = true;
        if (animateSettings && nameChanged) {
            await loadSettingsGlobalExercises({animate: true});
        }
    } catch (error) {
        console.error(error);
        showToast(error.status === 409 ? "toast.exerciseDuplicate" : "toast.saveFailed", {variant: "danger"});
    } finally {
        setExerciseEditPending(false);
    }
}

export async function deleteExercise(name) {
    if (state.savingExercise || state.settingsExercisePending) return;
    if (!await confirmExerciseDelete()) return;
    const animateSettings = isSettingsExercisesDialogOpen();
    if (animateSettings) setSettingsExercisePending(name, "delete", {visible: false, render: false});
    const pendingTimer = animateSettings
        ? window.setTimeout(() => setSettingsExercisePending(name, "delete"), 180)
        : null;
    try {
        const data = await api("exercises", {
            method: "PATCH",
            body: JSON.stringify({added: [], deleted: [name]}),
        });
        if (pendingTimer) window.clearTimeout(pendingTimer);
        if (animateSettings) setSettingsExercisePending(null, "", {render: false});

        closeModalDialog($("#exercise-dialog"));
        closeModalDialog($("#delete-workout-dialog"));
        if (animateSettings) await nextAnimationFrame();

        // Keep the old settings DOM until the refreshed global list is ready.
        // This lets a deleted catalog exercise animate back to its global section.
        await syncExerciseState(data.exercises, {
            renderSettingsList: !animateSettings,
        });
        if (animateSettings) {
            runtime.settingsExercisesRefreshPending = true;
            await loadSettingsGlobalExercises({animate: true});
        }

    } catch (error) {
        console.error(error);
        showToast("toast.exerciseDeleteFailed");
    } finally {
        if (pendingTimer) window.clearTimeout(pendingTimer);
        if (animateSettings && state.settingsExercisePending) setSettingsExercisePending(null);
        setDeleteWorkoutPending(false);
    }
}

export async function addGlobalExercise(name) {
    if (state.settingsExercisePending) return;
    const animateSettings = isSettingsExercisesDialogOpen();
    if (animateSettings) setSettingsExercisePending(name, "add", {visible: false, render: false});
    const pendingTimer = animateSettings
        ? window.setTimeout(() => setSettingsExercisePending(name, "add"), 180)
        : null;
    try {
        const data = await api("exercises", {
            method: "PATCH",
            body: JSON.stringify({added: [{name, notes: ""}], deleted: []}),
        });
        if (pendingTimer) window.clearTimeout(pendingTimer);
        if (animateSettings) setSettingsExercisePending(null, "", {render: false});

        // The global row is still in the DOM here, so FLIP can move it into the user section.
        await syncExerciseState(data.exercises, {animateSettings});
        if (animateSettings) {
            runtime.settingsExercisesRefreshPending = true;
            await loadSettingsGlobalExercises();
        } else {
            await loadGlobalExercises();
            state.exerciseScope = "global";
            renderExerciseScope();
        }
    } catch (error) {
        console.error(error);
        showToast(error.status === 409 ? "toast.exerciseDuplicate" : "toast.saveFailed", {variant: "danger"});
    } finally {
        if (pendingTimer) window.clearTimeout(pendingTimer);
        if (animateSettings && state.settingsExercisePending) setSettingsExercisePending(null);
    }
}

export function renderExerciseScope() {
    $$("#exercise-scope button").forEach(button => {
        button.classList.toggle("active", button.dataset.scope === state.exerciseScope);
    });
    renderExercises();
}
