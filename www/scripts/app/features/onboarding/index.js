// Extracted from main.js without changing feature behavior.
import {ONBOARDING_GLOBAL_PAGE_SIZE} from '../../core/config.js';
import {runtime} from '../../core/runtime.js';
import {refreshAll} from '../../data/refresh.js';
import {$, api, escapeHtml, state, t} from '../../deps.js';
import {closeSheetDialog, openSheetDialog, showToast} from '../../ui/dialogs.js';
import {syncExerciseState} from '../exercises/catalog.js';
import {animateExerciseRows, captureExerciseRowPositions, exerciseAddSuggestionRow, exerciseListRowMarkup, setExerciseSearchLoading} from '../exercises/picker.js';

export function isOnboardingDialogOpen() {
    return Boolean($("#onboarding-dialog")?.open);
}

export function onboardingSelectedSet() {
    return new Set(state.onboardingSelectedExercises || []);
}

export function onboardingExerciseByName(name) {
    return state.onboardingCustomExercises.find(exercise => exercise.name === name) ||
        state.exercises.find(exercise => exercise.name === name) ||
        state.onboardingGlobalExercises.find(exercise => exercise.name === name) ||
        {name, notes: ""};
}

export function onboardingMatchesSearch(name) {
    const query = state.onboardingSearch.toLowerCase();
    return !query || name.toLowerCase().includes(query);
}

export function onboardingExerciseRow(exercise, selected) {
    const isSelected = selected.has(exercise.name);
    const isAdded = exercise.added ||
        exercise.onboardingCustom ||
        state.exercises.some(userExercise => userExercise.name === exercise.name);

    return exerciseListRowMarkup({
        key: exercise.name,
        title: exercise.name,
        subtitle: isAdded ? t("actions.added") : "",
        rowClasses: isSelected ? "selected" : "",
        rowAttributes: `data-onboarding-row="${escapeHtml(exercise.name)}"`,
        buttonAttributes: `data-onboarding-exercise="${escapeHtml(exercise.name)}"`,
        trailing: `<span class="exercise-list-check" aria-hidden="true">${isSelected ? "✓" : ""}</span>`,
    });
}

export function onboardingSearchSpinner() {
    return $("#onboarding-search-spinner");
}

export function setOnboardingCloseVisible(visible) {
    const button = $("#onboarding-close");
    button.classList.toggle("is-invisible", !visible);
    button.disabled = !visible;
    button.setAttribute("aria-hidden", visible ? "false" : "true");
}

export function renderOnboardingSearchState() {
    setExerciseSearchLoading(
        onboardingSearchSpinner(),
        state.onboardingLoading || state.onboardingSearchPending,
    );
}

export function onboardingEmptyMessage() {
    return t("onboarding.noChoices");
}

export function shouldShowOnboardingAddSuggestion(rows) {
    const query = state.onboardingSearch.trim();
    if (!query || state.onboardingLoading || state.onboardingSearchPending) return false;
    if (rows.length >= 5) return false;
    return !rows.some(exercise => exercise.name.toLowerCase() === query.toLowerCase());
}

export function onboardingAddSuggestionRow({hasResults}) {
    return exerciseAddSuggestionRow({
        name: state.onboardingSearch.trim(),
        hasResults,
        context: "onboarding",
    });
}

export function currentOnboardingRows(list) {
    return [...list.querySelectorAll("[data-onboarding-row]")]
        .map(row => onboardingExerciseByName(row.dataset.onboardingRow))
        .filter(exercise => onboardingMatchesSearch(exercise.name));
}

export function renderOnboardingGlobalExercises({animate = false, preserveOrder = false} = {}) {
    const list = $("#onboarding-exercise-list");
    if (!list) return Promise.resolve();

    const previousPositions = animate ? captureExerciseRowPositions(list) : null;
    const selected = onboardingSelectedSet();
    const rows = preserveOrder
        ? currentOnboardingRows(list)
        : (() => {
            const selectedRows = [...selected]
                .filter(onboardingMatchesSearch)
                .map(onboardingExerciseByName);
            const selectedNames = new Set(selectedRows.map(exercise => exercise.name));
            const globalRows = state.onboardingGlobalExercises.filter(exercise => !selectedNames.has(exercise.name));
            return [...selectedRows, ...globalRows];
        })();

    const rowMarkup = rows.map(exercise => onboardingExerciseRow(exercise, selected));
    if (shouldShowOnboardingAddSuggestion(rows)) {
        rowMarkup.push(onboardingAddSuggestionRow({hasResults: rows.length > 0}));
    }

    list.innerHTML = rowMarkup.length
        ? rowMarkup.join("")
        : `<div class="empty">${escapeHtml(onboardingEmptyMessage())}</div>`;
    renderOnboardingSearchState();
    updateOnboardingStartState();

    return animate
        ? animateExerciseRows(list, previousPositions)
        : Promise.resolve();
}

export function updateOnboardingStartState() {
    const button = $("#onboarding-start-button");
    if (!button) return;
    const selectedCount = state.onboardingSelectedExercises.length;
    const canStart = selectedCount > 0;
    button.disabled = state.onboardingSaving || !canStart;
    button.classList.toggle("loading", state.onboardingSaving);
    button.textContent = state.onboardingSaving ? t("actions.saving") : `${t("onboarding.start")} (${selectedCount})`;
}

export async function loadOnboardingGlobalExercises({reset = false} = {}) {
    if (state.onboardingLoading) return;
    if (!reset && !state.onboardingHasMore) return;
    const requestSeq = ++runtime.onboardingGlobalRequestSeq;
    const requestSearch = state.onboardingSearch;
    state.onboardingLoading = true;
    state.onboardingSearchPending = false;
    if (reset) {
        state.onboardingNextOffset = 0;
        state.onboardingHasMore = true;
    }
    renderOnboardingSearchState();

    const params = new URLSearchParams();
    params.set("limit", String(ONBOARDING_GLOBAL_PAGE_SIZE));
    params.set("offset", String(reset ? 0 : state.onboardingNextOffset));
    if (requestSearch) params.set("search", requestSearch);

    try {
        const data = await api(`exercises/global?${params.toString()}`);
        if (requestSeq !== runtime.onboardingGlobalRequestSeq || requestSearch !== state.onboardingSearch) return;
        const existingNames = new Set(reset ? [] : state.onboardingGlobalExercises.map(exercise => exercise.name));
        const nextRows = (data.exercises || []).filter(exercise => !existingNames.has(exercise.name));
        state.onboardingGlobalExercises = reset ? (data.exercises || []) : [...state.onboardingGlobalExercises, ...nextRows];
        state.onboardingHasMore = Boolean(data.hasNext);
        state.onboardingNextOffset = Number(data.nextOffset || state.onboardingGlobalExercises.length);
    } catch (error) {
        if (requestSeq !== runtime.onboardingGlobalRequestSeq) return;
        console.error(error);
        showToast("toast.refreshFailed", {variant: "danger"});
    } finally {
        if (requestSeq !== runtime.onboardingGlobalRequestSeq) return;
        state.onboardingLoading = false;
        renderOnboardingGlobalExercises();
    }
}

export function openOnboardingIfNeeded() {
    if (!state.user || state.exercises.length > 0) return;
    const dialog = $("#onboarding-dialog");
    if (dialog.open) {
        updateOnboardingStartState();
        return;
    }

    state.onboardingSearch = "";
    state.onboardingSearchPending = false;
    runtime.onboardingGlobalRequestSeq += 1;
    state.onboardingCustomExercises = [];
    state.onboardingSelectedExercises = [];
    state.onboardingGlobalExercises = [];
    state.onboardingHasMore = true;
    state.onboardingNextOffset = 0;
    $("#onboarding-language-select").value = state.user.language || "en";
    $("#onboarding-language-select").closest(".onboarding-language-field").hidden = false;
    $("#onboarding-exercise-search").value = "";
    $("#onboarding-dialog h1").textContent = t("onboarding.title");
    setOnboardingCloseVisible(false);
    renderOnboardingGlobalExercises();
    openSheetDialog(dialog, {dismissible: false});
    loadOnboardingGlobalExercises({reset: true}).catch(console.error);
}

export async function saveOnboardingLanguage() {
    if (!state.user) return;
    try {
        await api("settings", {
            method: "PATCH",
            body: JSON.stringify({
                language: state.user.language,
                timezone: state.user.timezone,
                theme: state.theme,
                accentColor: state.accentColor,
            }),
        });
    } catch (error) {
        console.error(error);
        showToast("toast.saveFailed", {variant: "danger"});
    }
}

export async function completeOnboarding() {
    if (state.onboardingSaving) return;
    if (!state.onboardingSelectedExercises.length) return;
    const selected = state.onboardingSelectedExercises
        .filter(name => !state.exercises.some(exercise => exercise.name === name))
        .map(name => {
            const exercise = onboardingExerciseByName(name);
            return {name: exercise.name, notes: exercise.notes || ""};
        });

    state.onboardingSaving = true;
    updateOnboardingStartState();
    try {
        window.clearTimeout(runtime.onboardingLanguageTimer);
        await saveOnboardingLanguage();
        if (selected.length) {
            const data = await api("exercises/batch", {
                method: "POST",
                body: JSON.stringify({exercises: selected}),
            });
            syncExerciseState(data.exercises);
        }
        state.onboardingSelectedExercises = [];
        await refreshAll();
        closeSheetDialog($("#onboarding-dialog"));
    } catch (error) {
        console.error(error);
        showToast(error.status === 409 ? "toast.exerciseDuplicate" : "toast.saveFailed", {variant: "danger"});
    } finally {
        state.onboardingSaving = false;
        updateOnboardingStartState();
    }
}
