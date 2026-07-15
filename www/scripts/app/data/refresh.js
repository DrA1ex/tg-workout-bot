// Extracted from main.js without changing feature behavior.
import {HISTORY_INITIAL_SIZE, PULL_REFRESH_REQUEST_DELAY} from '../core/config.js';
import {applyRouteDialog} from '../core/navigation.js';
import {delay} from '../core/utils.js';
import {api, applyI18n, state} from '../deps.js';
import {renderDashboard, showDashboardSkeleton} from '../features/dashboard/index.js';
import {renderExercises} from '../features/exercises/catalog.js';
import {ensureHistoryLoaded, renderHistory} from '../features/history/index.js';
import {openOnboardingIfNeeded} from '../features/onboarding/index.js';
import {ensureProgressLoaded} from '../features/progress/index.js';
import {renderSettings} from '../features/settings/index.js';
import {refreshWorkoutFormModes, updatePreviousWorkoutSummary} from '../features/workouts/forms.js';

export async function refreshAll() {
    showDashboardSkeleton();
    const [bootstrap, recentExercises, dashboard] = await Promise.all([
        api("bootstrap"),
        api("exercises/recent?limit=10"),
        api("dashboard"),
    ]);
    state.user = bootstrap.user;
    state.exercises = bootstrap.exercises;
    state.recentExercises = recentExercises.exercises || [];
    state.dashboard = dashboard;
    state.settingsLoaded = true;
    renderSettings();
    renderDashboard();
    renderExercises();
    applyI18n();
    refreshWorkoutFormModes();
    ensureHistoryLoaded();
    ensureProgressLoaded();
    openOnboardingIfNeeded();
    await applyRouteDialog({animate: false});
}

export async function refreshDashboardOnly() {
    const [recentExercises, dashboard] = await Promise.all([
        api("exercises/recent?limit=10"),
        api("dashboard"),
    ]);
    state.recentExercises = recentExercises.exercises || [];
    state.dashboard = dashboard;
    renderDashboard();
    renderExercises();
}

export async function refreshHistoryOnly() {
    const data = await api(`history?offset=0&limit=${HISTORY_INITIAL_SIZE}`);
    state.history = {
        groups: data.groups || [],
        hasMore: Boolean(data.hasMore),
        nextOffset: data.nextOffset || 0,
        loading: false,
        loaded: true,
        error: "",
    };
    renderHistory();
}

export async function refreshActivePullTab() {
    await delay(PULL_REFRESH_REQUEST_DELAY);
    if (state.tab === "dashboard") {
        await refreshDashboardOnly();
        return;
    }
    if (state.tab === "history") {
        await refreshHistoryOnly();
    }
}
