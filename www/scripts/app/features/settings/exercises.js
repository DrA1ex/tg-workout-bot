// Extracted from main.js without changing feature behavior.
import {SETTINGS_GLOBAL_PAGE_SIZE} from '../../core/config.js';
import {runtime} from '../../core/runtime.js';
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
    state.settingsGlobalExercisesById = new Map();
    state.settingsExerciseHasMore = true;
    state.settingsExerciseNextOffset = 0;
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

function settingsExerciseId(name) {
    let hash = 2166136261;
    for (let i = 0; i < name.length; i += 1) {
        hash ^= name.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return `settings-${(hash >>> 0).toString(36)}`;
}

export function syncSettingsExerciseRow(exercise, {previousName = ""} = {}) {
    const index = state.settingsGlobalExercisesById instanceof Map
        ? new Map(state.settingsGlobalExercisesById)
        : new Map();

    if (!exercise) return;

    const currentId = settingsExerciseId(exercise.name);
    const current = index.get(currentId);
    if (current) {
        index.set(currentId, {...current, ...exercise, added: true});
    } else if (previousName && previousName !== exercise.name) {
        const previousId = settingsExerciseId(previousName);
        if (index.has(previousId)) {
            const previous = index.get(previousId);
            index.delete(previousId);
            index.set(currentId, {...previous, ...exercise, added: true});
        } else {
            index.set(currentId, {...exercise, added: true});
        }
    } else {
        index.set(currentId, {...exercise, added: true});
    }

    state.settingsGlobalExercisesById = index;
    state.settingsGlobalExercises = [...index.values()];

    if (isSettingsExercisesDialogOpen()) {
        renderSettingsExercises();
    }
}

export function isSettingsExercisesDialogOpen() {
    return Boolean($("#settings-exercises-dialog")?.open);
}

export function setSettingsExercisePending(name, action = "", {visible = true, render = true} = {}) {
    state.settingsExercisePending = name ? {name, action, visible} : null;
    return render ? renderSettingsExercises() : Promise.resolve();
}

export function settingsExerciseRow(exercise) {
    const pending = state.settingsExercisePending?.visible && state.settingsExercisePending.name === exercise.name;
    const userExercise = state.exercises.find(row => row.name === exercise.name);
    if (userExercise) return userExerciseRow(userExercise, {pending});

    return exerciseListRowMarkup({
        key: exercise.name,
        title: exercise.name,
        subtitle: t("exercises.global"),
        rowClasses: ["settings-global-row", pending ? "exercise-row-pending" : ""].filter(Boolean).join(" "),
        buttonClasses: "settings-global-button",
        buttonAttributes: `data-add-global-exercise="${escapeHtml(exercise.name)}"${pending ? ' disabled aria-busy="true"' : ""}`,
        trailing: pending ? '<span class="exercise-row-spinner" aria-hidden="true"></span>' : "",
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

export async function loadSettingsGlobalExercises({animate = false, append = false, resetScroll = false} = {}) {
    if (state.settingsExerciseLoading) return Promise.resolve();
    if (append && !state.settingsExerciseHasMore) return Promise.resolve();
    const requestSeq = ++runtime.settingsGlobalRequestSeq;
    const requestSearch = state.settingsExerciseSearch;
    state.settingsExerciseLoading = true;
    state.settingsExerciseSearchPending = false;
    if (!append) {
        state.settingsExerciseNextOffset = 0;
        state.settingsExerciseHasMore = true;
    }
    renderSettingsExerciseSearchState();
    const params = new URLSearchParams();
    params.set("limit", String(SETTINGS_GLOBAL_PAGE_SIZE));
    params.set("offset", String(append ? state.settingsExerciseNextOffset : 0));
    if (requestSearch) params.set("search", requestSearch);

    let loaded = false;
    try {
        const data = await api(`exercises/global?${params.toString()}`);
        if (requestSeq !== runtime.settingsGlobalRequestSeq || requestSearch !== state.settingsExerciseSearch) return Promise.resolve();
        const globalRows = data.exercises || [];
        const existingRows = append ? state.settingsGlobalExercises : [];
        const byId = new Map(existingRows.map(exercise => [settingsExerciseId(exercise.name), exercise]));
        globalRows.forEach(exercise => byId.set(settingsExerciseId(exercise.name), exercise));
        state.exercises.forEach(exercise => {
            if (!requestSearch || exercise.name.toLowerCase().includes(requestSearch.toLowerCase())) {
                byId.set(settingsExerciseId(exercise.name), {...exercise, added: true});
            }
        });
        state.settingsGlobalExercises = [...byId.values()];
        state.settingsGlobalExercisesById = byId;
        state.settingsExerciseHasMore = Boolean(data.hasNext);
        state.settingsExerciseNextOffset = Number(data.nextOffset || state.settingsGlobalExercises.length);
        loaded = true;
    } catch (error) {
        if (requestSeq !== runtime.settingsGlobalRequestSeq) return Promise.resolve();
        console.error(error);
        showToast("toast.refreshFailed", {variant: "danger"});
    } finally {
        if (requestSeq === runtime.settingsGlobalRequestSeq && requestSearch === state.settingsExerciseSearch) {
            state.settingsExerciseLoading = false;
        }
    }

    if (requestSeq !== runtime.settingsGlobalRequestSeq || requestSearch !== state.settingsExerciseSearch) return Promise.resolve();
    const result = renderSettingsExercises({animate: animate && loaded});
    if (!append) {
        const scroll = $("#settings-exercise-scroll");
        if (resetScroll) {
            scroll?.scrollTo({top: 0, left: 0, behavior: "instant"});
        }
    }
    return result;
}
