// Extracted from main.js without changing feature behavior.
import {$, $$, state, t} from '../deps.js';
import {ensureHistoryLoaded} from '../features/history/index.js';
import {ensureProgressLoaded} from '../features/progress/index.js';
import {renderSettings} from '../features/settings/index.js';
import {initializeWorkoutFormSession, updatePreviousWorkoutSummary, updateWorkoutFormState} from '../features/workouts/forms.js';
import {todaySubtitle} from '../features/workouts/presentation.js';
import {animateSheetElement, resetSheetScroll} from '../ui/dialogs.js';
import {VALID_TABS} from './config.js';
import {runtime} from './runtime.js';

export function tabFromUrl() {
    const tab = new URL(window.location.href).searchParams.get("tab");
    return VALID_TABS.has(tab) ? tab : "dashboard";
}

export function tabUrl(tab) {
    const url = new URL(window.location.href);
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

export function animateAddScreenOpen() {
    const screen = $("#screen-add");
    const sheet = $("#screen-add .add-sheet");
    if (!sheet) return;
    screen?.classList.remove("sheet-closing");
    screen?.classList.add("sheet-opening");
    sheet.style.opacity = "0";
    sheet.style.transform = "translate3d(0, 38px, -28px) rotateX(14deg) scale3d(.972, .972, 1)";
    animateSheetElement(sheet, "in", () => {
        screen?.classList.remove("sheet-opening");
    });
}

export function animateAddScreenClose(nextTab, options = {}) {
    const screen = $("#screen-add");
    const sheet = $("#screen-add .add-sheet");
    screen?.classList.remove("sheet-opening");
    screen?.classList.add("sheet-closing");
    animateSheetElement(sheet, "out", () => {
        screen?.classList.remove("sheet-closing");
        setTab(nextTab, {...options, animate: false});
    });
}

export function navigateTab(tab, options = {}) {
    if (state.tab === "add" && tab !== "add") {
        animateAddScreenClose(tab, options);
        return;
    }
    setTab(tab, options);
}

export function setTab(tab, options = {}) {
    if (!VALID_TABS.has(tab)) tab = "dashboard";
    if (tab === "add" && !state.appReady && !options.force) return;

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
    if (previousTab === "add" && tab !== "add") {
        state.savingWorkout = false;
        state.workoutSaveLoading = false;
        state.workoutSubmitted = false;
        updateWorkoutFormState();
    }
    const isOpeningAddScreen = tab === "add" && previousTab !== "add";
    if (tab === "add") {
        if (isOpeningAddScreen) {
            initializeWorkoutFormSession();
            resetSheetScroll($("#screen-add .add-sheet"));
        }
        window.scrollTo({top: 0, behavior: "instant"});
        if (isOpeningAddScreen && options.animate !== false) animateAddScreenOpen();
        updatePreviousWorkoutSummary().catch(console.error);
    }
}

export function bindHistoryNavigation() {
    window.history.replaceState({tab: state.tab}, "", tabUrl(state.tab));
    window.addEventListener("popstate", () => {
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
