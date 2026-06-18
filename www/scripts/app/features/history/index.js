// Extracted from main.js without changing feature behavior.
import {HISTORY_INITIAL_SIZE, HISTORY_PAGE_SIZE} from '../../core/config.js';
import {runtime} from '../../core/runtime.js';
import {$, api, escapeHtml, state, t} from '../../deps.js';
import {workoutRow} from '../workouts/presentation.js';

export function renderHistory() {
    const groups = state.history?.groups || [];
    const isInitialLoading = (state.history?.loading || !state.history?.loaded) && !groups.length;
    $("#history-skeleton").hidden = !isInitialLoading;
    $("#history-list").hidden = isInitialLoading;
    $("#history-list").innerHTML = isInitialLoading
        ? ""
        : groups.length
        ? groups.map(group => `
            <section class="day-group history-day-group">
                <header>
                    <span>${escapeHtml(group.label)}</span>
                    <span>${group.workouts.length}</span>
                </header>
                <div class="list history-workout-list">${group.workouts.map(workoutRow).join("")}</div>
            </section>
        `).join("")
        : `<div class="empty">${t("empty.history")}</div>`;
    $("#history-sentinel").hidden = isInitialLoading || !state.history?.hasMore || !groups.length;
    $("#history-sentinel").textContent = state.history?.loading ? t("actions.loading") : "";
}

export function ensureHistoryLoaded() {
    if (state.history?.loaded || state.history?.loading) return;
    if (!state.user) {
        renderHistory();
        return;
    }
    loadHistory({reset: true, limit: HISTORY_INITIAL_SIZE}).catch(console.error);
}

export async function loadHistory({reset = false, limit = HISTORY_PAGE_SIZE} = {}) {
    if (state.history?.loading) return;
    if (!reset && !state.history?.hasMore) return;
    const offset = reset ? 0 : (state.history?.nextOffset || 0);
    state.history = {
        groups: reset ? [] : (state.history?.groups || []),
        hasMore: reset ? false : Boolean(state.history?.hasMore),
        nextOffset: offset,
        loading: true,
        loaded: false,
    };
    renderHistory();

    const data = await api(`history?offset=${offset}&limit=${limit}`);
    state.history = {
        groups: reset ? data.groups : [...(state.history?.groups || []), ...(data.groups || [])],
        hasMore: Boolean(data.hasMore),
        nextOffset: data.nextOffset || 0,
        loading: false,
        loaded: true,
    };
    renderHistory();
}

export function setupHistoryInfiniteScroll() {
    const sentinel = $("#history-sentinel");
    if (!sentinel || runtime.historyObserver) return;

    if (!("IntersectionObserver" in window)) {
        window.addEventListener("scroll", () => {
            if (state.tab !== "history" || state.history?.loading || !state.history?.hasMore) return;
            const nearBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 240;
            if (nearBottom) loadHistory().catch(console.error);
        }, {passive: true});
        return;
    }

    runtime.historyObserver = new IntersectionObserver(entries => {
        const visible = entries.some(entry => entry.isIntersecting);
        if (!visible || state.tab !== "history" || state.history?.loading || !state.history?.hasMore) return;
        loadHistory().catch(console.error);
    }, {root: null, rootMargin: "240px 0px", threshold: 0});
    runtime.historyObserver.observe(sentinel);
}
