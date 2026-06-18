// Extracted from main.js without changing feature behavior.
import {PULL_REFRESH_MIN_VISIBLE, PULL_REFRESH_THRESHOLD} from '../core/config.js';
import {runtime} from '../core/runtime.js';
import {delay} from '../core/utils.js';
import {refreshActivePullTab} from '../data/refresh.js';
import {$, state, t} from '../deps.js';
import {showToast} from './dialogs.js';

export function setPullRefreshIndicator({visible = false, ready = false, refreshing = false, offset = 0} = {}) {
    const indicator = $("#pull-refresh");
    indicator.classList.toggle("visible", visible || refreshing);
    indicator.classList.toggle("ready", ready);
    indicator.classList.toggle("refreshing", refreshing);
    indicator.style.setProperty("--pull-offset", `${Math.round(offset)}px`);
    indicator.style.setProperty("--pull-progress", String(Math.min(offset / PULL_REFRESH_THRESHOLD, 1)));
    if (visible || refreshing) {
        $(".pull-refresh-label").textContent = refreshing
            ? t("actions.refreshing")
            : ready
            ? t("actions.releaseToRefresh")
            : t("actions.pullToRefresh");
    }
}

export function renderPullRefreshFrame() {
    if (!runtime.pullRefresh?.active || state.pullRefreshing) return;
    const delta = runtime.pullRefresh.targetOffset - runtime.pullRefresh.renderedOffset;
    runtime.pullRefresh.renderedOffset += delta * .26;
    if (Math.abs(delta) < .35) {
        runtime.pullRefresh.renderedOffset = runtime.pullRefresh.targetOffset;
    }
    setPullRefreshIndicator({
        visible: true,
        ready: runtime.pullRefresh.armed,
        offset: runtime.pullRefresh.renderedOffset,
    });
    if (runtime.pullRefresh.renderedOffset !== runtime.pullRefresh.targetOffset) {
        runtime.pullRefresh.frame = window.requestAnimationFrame(renderPullRefreshFrame);
        return;
    }
    runtime.pullRefresh.frame = null;
}

export function schedulePullRefreshFrame() {
    if (!runtime.pullRefresh || runtime.pullRefresh.frame) return;
    runtime.pullRefresh.frame = window.requestAnimationFrame(renderPullRefreshFrame);
}

export function canStartPullRefresh(event) {
    if (!["dashboard", "history"].includes(state.tab)) return false;
    if (state.pullRefreshing || state.savingWorkout || state.workoutSubmitted || state.deletingWorkout) return false;
    if (document.body.classList.contains("sheet-open")) return false;
    if (window.scrollY > 0) return false;

    const target = event.target;
    if (target?.closest?.("button, input, select, textarea, dialog, .bottom-nav, .toast-stack")) return false;
    if (state.tab === "history" && state.history?.loading) return false;
    return true;
}

export function bindPullToRefresh() {
    const clearPullReadyTimer = () => {
        if (!runtime.pullRefresh?.readyTimer) return;
        window.clearTimeout(runtime.pullRefresh.readyTimer);
        runtime.pullRefresh.readyTimer = null;
    };

    const cancelPullFrame = () => {
        if (!runtime.pullRefresh?.frame) return;
        window.cancelAnimationFrame(runtime.pullRefresh.frame);
        runtime.pullRefresh.frame = null;
    };

    window.addEventListener("touchstart", event => {
        if (event.touches.length !== 1 || !canStartPullRefresh(event)) return;
        runtime.pullRefresh = {
            startY: event.touches[0].clientY,
            offset: 0,
            targetOffset: 0,
            renderedOffset: 0,
            active: false,
            thresholdReached: false,
            armed: false,
            readyTimer: null,
            frame: null,
        };
    }, {passive: true});

    window.addEventListener("touchmove", event => {
        if (!runtime.pullRefresh || event.touches.length !== 1) return;

        const dy = event.touches[0].clientY - runtime.pullRefresh.startY;
        if (dy <= 0 && !runtime.pullRefresh.thresholdReached) {
            clearPullReadyTimer();
            cancelPullFrame();
            setPullRefreshIndicator();
            runtime.pullRefresh = null;
            return;
        }

        if (!runtime.pullRefresh.active && dy < 10) return;
        runtime.pullRefresh.active = true;
        const offset = Math.min(96, dy * .48);
        runtime.pullRefresh.offset = offset;
        if (offset >= PULL_REFRESH_THRESHOLD && !runtime.pullRefresh.thresholdReached) {
            runtime.pullRefresh.thresholdReached = true;
            runtime.pullRefresh.armed = true;
        }

        const displayOffset = runtime.pullRefresh.thresholdReached
            ? Math.max(offset, PULL_REFRESH_THRESHOLD)
            : offset;
        runtime.pullRefresh.targetOffset = displayOffset;
        schedulePullRefreshFrame();
        event.preventDefault();
    }, {passive: false});

    window.addEventListener("touchend", async () => {
        if (!runtime.pullRefresh) return;
        const shouldRefresh = runtime.pullRefresh.active && runtime.pullRefresh.thresholdReached;
        clearPullReadyTimer();
        cancelPullFrame();
        runtime.pullRefresh = null;

        if (!shouldRefresh) {
            setPullRefreshIndicator();
            return;
        }

        state.pullRefreshing = true;
        setPullRefreshIndicator({refreshing: true, offset: PULL_REFRESH_THRESHOLD});
        const startedAt = performance.now();
        try {
            await refreshActivePullTab();
        } catch (error) {
            console.error(error);
            showToast("toast.refreshFailed");
        } finally {
            const elapsed = performance.now() - startedAt;
            if (elapsed < PULL_REFRESH_MIN_VISIBLE) {
                await delay(PULL_REFRESH_MIN_VISIBLE - elapsed);
            }
            state.pullRefreshing = false;
            setPullRefreshIndicator();
        }
    }, {passive: true});

    window.addEventListener("touchcancel", () => {
        clearPullReadyTimer();
        cancelPullFrame();
        runtime.pullRefresh = null;
        if (!state.pullRefreshing) setPullRefreshIndicator();
    }, {passive: true});
}
