// Extracted from main.js without changing feature behavior.
import {$, $$, state, t} from '../deps.js';
import {ensureHistoryLoaded} from '../features/history/index.js';
import {ensureProgressLoaded} from '../features/progress/index.js';
import {renderSettings} from '../features/settings/index.js';
import {initializeWorkoutFormSession, updatePreviousWorkoutSummary, updateWorkoutFormState} from '../features/workouts/forms.js';
import {todaySubtitle} from '../features/workouts/presentation.js';
import {closeModalDialog, closeSheetDialog, openModalDialog, openSheetDialog, resetSheetScroll} from '../ui/dialogs.js';
import {VALID_TABS} from './config.js';

export function tabFromUrl() {
    const tab = new URL(window.location.href).searchParams.get("tab");
    return VALID_TABS.has(tab) ? tab : "dashboard";
}

export function dialogFromUrl() {
    const url = new URL(window.location.href);
    const dialog = url.searchParams.get("dialog");
    if (dialog === "add-workout" || dialog === "add-exercise") return dialog;
    return url.searchParams.get("tab") === "add" ? "add-workout" : "";
}

export function tabUrl(tab) {
    const url = new URL(window.location.href);
    url.searchParams.delete("dialog");
    if (tab === "dashboard") {
        url.searchParams.delete("tab");
    } else {
        url.searchParams.set("tab", tab);
    }
    return `${url.pathname}${url.search}${url.hash}`;
}

export function syncTabUrl(tab, {replace = false} = {}) {
    const next = tabUrl(tab);
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next === current) return;
    window.history[replace ? "replaceState" : "pushState"]({tab}, "", next);
}

export function syncDialogUrl(dialog, {replace = false} = {}) {
    const url = new URL(window.location.href);
    if (url.searchParams.get("tab") === "add") url.searchParams.delete("tab");
    if (dialog) {
        url.searchParams.set("dialog", dialog);
    } else {
        url.searchParams.delete("dialog");
    }
    const next = `${url.pathname}${url.search}${url.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next === current) return;
    window.history[replace ? "replaceState" : "pushState"]({dialog}, "", next);
}

export function setHeadingSkeleton(visible) {
    $("#screen-title").classList.toggle("heading-skeleton", visible);
    $("#screen-subtitle").classList.toggle("heading-skeleton", visible);
    if (visible) {
        $("#screen-title").textContent = "";
        $("#screen-subtitle").textContent = "";
    }
}

export function updateAppReadyState() {
    const addButton = $("#nav-add");
    if (addButton) {
        addButton.disabled = !state.appReady;
    }
}

export function openAddWorkoutDialog({updateUrl = true, replaceUrl = false, animate = true} = {}) {
    if (!state.appReady) return;
    initializeWorkoutFormSession();
    resetSheetScroll($("#add-dialog .add-sheet"));
    if (updateUrl) syncDialogUrl("add-workout", {replace: replaceUrl});
    openSheetDialog($("#add-dialog"), {animate});
    updatePreviousWorkoutSummary().catch(console.error);
}

export function closeAddWorkoutDialog({updateUrl = true, replaceUrl = false} = {}) {
    if (updateUrl) syncDialogUrl("", {replace: replaceUrl});
    closeSheetDialog($("#add-dialog"));
}

export function openExerciseAddRouteDialog({updateUrl = true, replaceUrl = false} = {}) {
    if (!state.appReady) return;
    $("#exercise-form").reset();
    openModalDialog($("#exercise-add-dialog"));
    if (updateUrl) syncDialogUrl("add-exercise", {replace: replaceUrl});
}

export function closeExerciseAddRouteDialog({updateUrl = true, replaceUrl = false} = {}) {
    if (updateUrl) syncDialogUrl("", {replace: replaceUrl});
    closeModalDialog($("#exercise-add-dialog"));
}

export function applyRouteDialog({replaceUrl = true, animate = false} = {}) {
    const dialog = dialogFromUrl();
    if (dialog === "add-workout") {
        openAddWorkoutDialog({updateUrl: false, replaceUrl, animate});
        return;
    }
    if (dialog === "add-exercise") {
        openExerciseAddRouteDialog({updateUrl: false, replaceUrl});
    }
}

export function navigateTab(tab, options = {}) {
    if (tab === "add") {
        openAddWorkoutDialog({replaceUrl: options.replaceUrl});
        return;
    }
    setTab(tab, options);
}

export function setTab(tab, options = {}) {
    if (tab === "add") {
        openAddWorkoutDialog({updateUrl: options.updateUrl !== false, replaceUrl: options.replaceUrl, animate: options.animate !== false});
        return;
    }
    if (!VALID_TABS.has(tab)) tab = "dashboard";

    const previousTab = state.tab;
    state.tab = tab;
    if (options.updateUrl !== false) {
        syncTabUrl(tab, {replace: options.replaceUrl});
    }
    document.body.dataset.tab = tab;
    $$(".screen").forEach(screen => screen.classList.toggle("active", screen.id === `screen-${tab}`));
    $$(".bottom-nav button").forEach(button => button.classList.toggle("active", button.dataset.tab === tab));
    setHeadingSkeleton(false);
    $("#screen-title").textContent = t(`screens.${tab}`);
    $("#screen-subtitle").textContent = tab === "dashboard" && state.dashboard ? todaySubtitle(state.dashboard) : "";
    if (tab === "dashboard" && !state.dashboard && !$("#dashboard-skeleton")?.hidden) {
        setHeadingSkeleton(true);
    }
    if (tab === "history") {
        ensureHistoryLoaded();
    }
    if (tab === "progress") {
        ensureProgressLoaded();
    }
    if (tab === "settings") {
        renderSettings();
    }
    state.savingWorkout = false;
    state.workoutSaveLoading = false;
    state.workoutSubmitted = false;
    updateWorkoutFormState();
}

export function bindHistoryNavigation() {
    const dialog = dialogFromUrl();
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.history.replaceState({tab: state.tab, dialog: dialog || undefined}, "", dialog ? current : tabUrl(state.tab));
    window.addEventListener("popstate", () => {
        const dialog = dialogFromUrl();
        if (dialog) {
            applyRouteDialog({animate: true});
            return;
        }
        closeSheetDialog($("#add-dialog"));
        closeModalDialog($("#exercise-add-dialog"));
        navigateTab(tabFromUrl(), {updateUrl: false, force: true});
    });
}

export function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(error => {
            console.warn("Service worker registration failed:", error);
        });
    });
}
