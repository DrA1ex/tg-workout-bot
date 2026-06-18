// Extracted from main.js without changing feature behavior.
import {WORKOUT_SWIPE_WIDTH} from '../core/config.js';
import {runtime} from '../core/runtime.js';
import {$$} from '../deps.js';

export function closeSwipeRows(except = null) {
    $$(".swipe-workout-row.open").forEach(row => {
        if (row !== except) {
            row.classList.remove("open");
            row.style.removeProperty("--swipe-main-padding-right");
            row.style.removeProperty("--swipe-action-offset");
            row.style.removeProperty("--swipe-main-shift");
            row.style.removeProperty("--swipe-main-height");
            row.style.removeProperty("--swipe-title-lines");
        }
    });
}

export function bindWorkoutSwipeActions() {
    document.addEventListener("pointerdown", event => {
        const main = event.target.closest(".swipe-workout-main");
        if (!main || event.button !== 0) return;

        const row = main.closest(".swipe-workout-row");
        if (!row) return;

        closeSwipeRows(row);
        const title = row.querySelector(".dashboard-workout-body h3, .swipe-workout-body h3");
        const titleStyle = title ? getComputedStyle(title) : null;
        const titleLineHeight = titleStyle ? Number.parseFloat(titleStyle.lineHeight) : 0;
        const titleLines = title && titleLineHeight ? Math.max(1, Math.round(title.getBoundingClientRect().height / titleLineHeight)) : 1;
        row.style.setProperty("--swipe-main-height", `${main.getBoundingClientRect().height}px`);
        row.style.setProperty("--swipe-title-lines", String(titleLines));
        runtime.workoutSwipe = {
            row,
            main,
            action: row.querySelector(".swipe-delete-action"),
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startProgress: row.classList.contains("open") ? 1 : 0,
            currentProgress: row.classList.contains("open") ? 1 : 0,
            closedPadding: row.classList.contains("dashboard-swipe-row") ? 12 : 13,
            openPadding: WORKOUT_SWIPE_WIDTH + 12,
            active: false,
        };
        main.setPointerCapture?.(event.pointerId);
    });

    document.addEventListener("pointermove", event => {
        if (!runtime.workoutSwipe || event.pointerId !== runtime.workoutSwipe.pointerId) return;

        const dx = event.clientX - runtime.workoutSwipe.startX;
        const dy = event.clientY - runtime.workoutSwipe.startY;
        if (!runtime.workoutSwipe.active) {
            if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
                runtime.workoutSwipe = null;
                return;
            }
            if (Math.abs(dx) < 8) return;
            runtime.workoutSwipe.active = true;
            runtime.workoutSwipe.row.classList.add("swiping");
        }

        event.preventDefault();
        const progress = Math.min(1, Math.max(0, runtime.workoutSwipe.startProgress - dx / WORKOUT_SWIPE_WIDTH));
        runtime.workoutSwipe.currentProgress = progress;
        const padding = runtime.workoutSwipe.closedPadding + (runtime.workoutSwipe.openPadding - runtime.workoutSwipe.closedPadding) * progress;
        runtime.workoutSwipe.row.style.setProperty("--swipe-main-padding-right", `${padding}px`);
        runtime.workoutSwipe.row.style.setProperty("--swipe-action-offset", `${(1 - progress) * 100}%`);
        runtime.workoutSwipe.row.style.setProperty("--swipe-main-shift", runtime.workoutSwipe.startProgress === 0 ? `${-18 * progress}px` : "0px");
    }, {passive: false});

    const finishSwipe = event => {
        if (!runtime.workoutSwipe || event.pointerId !== runtime.workoutSwipe.pointerId) return;

        const {row, currentProgress, active} = runtime.workoutSwipe;
        row.classList.remove("swiping");
        row.classList.toggle("open", active && currentProgress > .5);
        window.requestAnimationFrame(() => {
            row.style.removeProperty("--swipe-main-padding-right");
            row.style.removeProperty("--swipe-action-offset");
            row.style.removeProperty("--swipe-main-shift");
        });
        if (!row.classList.contains("open")) {
            row.style.removeProperty("--swipe-main-height");
            row.style.removeProperty("--swipe-title-lines");
        }
        if (active) {
            row.dataset.suppressClick = "true";
            window.setTimeout(() => delete row.dataset.suppressClick, 180);
        }
        runtime.workoutSwipe = null;
    };

    document.addEventListener("pointerup", finishSwipe);
    document.addEventListener("pointercancel", finishSwipe);
}
