// Extracted from main.js without changing feature behavior.
import {$, api, escapeHtml, state, t} from '../../deps.js';
import {openSheetDialog, showToast} from '../../ui/dialogs.js';
import {userExerciseRow} from '../exercises/catalog.js';
import {animateExerciseRows, captureExerciseRowPositions, exerciseAddSuggestionRow, exerciseListRowMarkup, setExerciseSearchLoading} from '../exercises/picker.js';

export function renderSettingsExerciseSummary() {
    const count = $("#settings-exercises-count");
    if (count) count.textContent = String(state.exercises.length);
}

export function openSettingsExercisesDialog() {
    state.settingsExerciseSearch = "";
    state.settingsExerciseSearchPending = false;
    state.settingsGlobalExercises = [];
    $("#settings-exercise-search").value = "";
    renderSettingsExercises();
    openSheetDialog($("#settings-exercises-dialog"));
    loadSettingsGlobalExercises().catch(console.error);
}

export function settingsExerciseSpinner() {
    return $("#settings-exercise-spinner");
}

export function renderSettingsExerciseSearchState() {
    setExerciseSearchLoading(
        settingsExerciseSpinner(),
        state.settingsExerciseLoading || state.settingsExerciseSearchPending,
    );
}

export function isSettingsExercisesDialogOpen() {
    return Boolean($("#settings-exercises-dialog")?.open);
}

export function settingsExerciseRow(exercise) {
    const userExercise = state.exercises.find(row => row.name === exercise.name);
    if (userExercise) return userExerciseRow(userExercise);

    return exerciseListRowMarkup({
        key: exercise.name,
        title: exercise.name,
        subtitle: t("exercises.global"),
        rowClasses: "settings-global-row",
        buttonClasses: "settings-global-button",
        buttonAttributes: `data-add-global-exercise="${escapeHtml(exercise.name)}"`,
    });
}

export function settingsExerciseDivider() {
    return `
        <div class="settings-exercise-divider" data-exercise-row-key="settings-global-divider">
            <span>${escapeHtml(t("exercises.globalSection"))}</span>
        </div>
    `;
}

export function settingsExerciseAddSuggestionRow({hasResults}) {
    return exerciseAddSuggestionRow({
        name: state.settingsExerciseSearch.trim(),
        hasResults,
        context: "settings",
    });
}

export function renderSettingsExercises({animate = false} = {}) {
    const list = $("#settings-exercise-list");
    if (!list) return Promise.resolve();

    const previousPositions = animate ? captureExerciseRowPositions(list) : null;
    const query = state.settingsExerciseSearch.trim();
    const rows = query || state.settingsGlobalExercises.length
        ? state.settingsGlobalExercises
        : state.exercises.map(exercise => ({...exercise, added: true}));
    const addedRows = rows.filter(exercise => state.exercises.some(row => row.name === exercise.name));
    const newRows = rows.filter(exercise => !state.exercises.some(row => row.name === exercise.name));
    const rowMarkup = [
        ...addedRows.map(settingsExerciseRow),
        ...(addedRows.length && newRows.length ? [settingsExerciseDivider()] : []),
        ...newRows.map(settingsExerciseRow),
    ];
    const hasExactMatch = rows.some(exercise => exercise.name.toLowerCase() === query.toLowerCase());
    if (query && !state.settingsExerciseLoading && !state.settingsExerciseSearchPending && !hasExactMatch) {
        rowMarkup.push(settingsExerciseAddSuggestionRow({hasResults: rowMarkup.length > 0}));
    }

    list.innerHTML = rowMarkup.length
        ? rowMarkup.join("")
        : `<div class="empty">${escapeHtml(t(state.exercises.length ? "exercises.noMatches" : "empty.exercises"))}</div>`;
    renderSettingsExerciseSearchState();

    return animate
        ? animateExerciseRows(list, previousPositions)
        : Promise.resolve();
}

export async function loadSettingsGlobalExercises({animate = false} = {}) {
    const requestSearch = state.settingsExerciseSearch;
    state.settingsExerciseLoading = true;
    state.settingsExerciseSearchPending = false;
    renderSettingsExerciseSearchState();
    const params = new URLSearchParams();
    params.set("limit", "60");
    if (requestSearch) params.set("search", requestSearch);

    let loaded = false;
    try {
        const data = await api(`exercises/global?${params.toString()}`);
        if (requestSearch !== state.settingsExerciseSearch) return Promise.resolve();
        const globalRows = data.exercises || [];
        const byName = new Map(globalRows.map(exercise => [exercise.name, exercise]));
        state.exercises.forEach(exercise => {
            if (!requestSearch || exercise.name.toLowerCase().includes(requestSearch.toLowerCase())) {
                byName.set(exercise.name, {...exercise, added: true});
            }
        });
        state.settingsGlobalExercises = [...byName.values()];
        loaded = true;
    } catch (error) {
        console.error(error);
        showToast("toast.refreshFailed", {variant: "danger"});
    } finally {
        if (requestSearch === state.settingsExerciseSearch) {
            state.settingsExerciseLoading = false;
        }
    }

    if (requestSearch !== state.settingsExerciseSearch) return Promise.resolve();
    return renderSettingsExercises({animate: animate && loaded});
}
