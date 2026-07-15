import {HISTORY_INITIAL_SIZE} from "../core/config.js";
import {runtime} from "../core/runtime.js";
import {api, state} from "../deps.js";
import {renderDashboard} from "../features/dashboard/index.js";
import {renderExercises} from "../features/exercises/catalog.js";
import {renderHistory} from "../features/history/index.js";
import {renderProgress} from "../features/progress/index.js";

const HISTORY_PAGE_SIZE = 30;

async function reloadVisibleHistory() {
    if (!state.history?.loaded) return null;
    const targetGroups = Math.max(HISTORY_INITIAL_SIZE, state.history.groups?.length || 0);
    const offsets = Array.from(
        {length: Math.max(1, Math.ceil(targetGroups / HISTORY_PAGE_SIZE))},
        (_unused, index) => index * HISTORY_PAGE_SIZE,
    );
    const pages = await Promise.all(offsets.map(offset => api(`history?offset=${offset}&limit=${HISTORY_PAGE_SIZE}`)));
    const groups = pages.flatMap(page => page.groups || []).slice(0, targetGroups);
    const lastPage = pages.at(-1) || {};
    return {
        groups,
        hasMore: Boolean(lastPage.hasMore),
        nextOffset: lastPage.nextOffset || groups.length,
        loading: false,
        loaded: true,
        error: "",
    };
}

export async function refreshWorkoutData() {
    const shouldRefreshProgress = Boolean(state.progressLoaded);
    let progressController = null;
    let progressSeq = null;
    if (shouldRefreshProgress) {
        runtime.progressController?.abort();
        progressController = new AbortController();
        runtime.progressController = progressController;
        progressSeq = ++runtime.progressRequestSeq;
    }

    const requests = [
        api("dashboard"),
        api("exercises/recent?limit=10"),
        reloadVisibleHistory(),
    ];
    if (shouldRefreshProgress) {
        const params = new URLSearchParams({
            exercise: state.progress?.exercise || "",
            period: state.progressPeriod,
        });
        requests.push(api(`progress?${params.toString()}`, {signal: progressController.signal}));
    }

    try {
        const [dashboard, recentExercises, history, progress] = await Promise.all(requests);
        state.dashboard = dashboard;
        state.recentExercises = recentExercises.exercises || [];
        if (history) state.history = history;
        if (shouldRefreshProgress && progressSeq === runtime.progressRequestSeq) state.progress = progress;
        renderDashboard();
        renderExercises();
        if (history) renderHistory();
        if (shouldRefreshProgress && progressSeq === runtime.progressRequestSeq) renderProgress();
    } finally {
        if (progressSeq === runtime.progressRequestSeq) runtime.progressController = null;
    }
}
