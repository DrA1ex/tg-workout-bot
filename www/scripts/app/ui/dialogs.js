// Extracted from main.js without changing feature behavior.
import {runtime} from '../core/runtime.js';
import {$, $$, state, t} from '../deps.js';
import {renderSettingsExerciseSearchState} from '../features/settings/exercises.js';

export function topOpenDialog() {
    return $$("dialog[open]")
        .sort((a, b) => Number(b.dataset.dialogOpenOrder || 0) - Number(a.dataset.dialogOpenOrder || 0))[0] || null;
}

export function toastStack() {
    const dialog = topOpenDialog();
    if (!dialog) return $("#toast");

    let stack = dialog.querySelector(":scope > .dialog-toast-stack");
    if (!stack) {
        stack = document.createElement("section");
        stack.className = "toast-stack dialog-toast-stack";
        stack.setAttribute("aria-live", "polite");
        stack.setAttribute("aria-atomic", "false");
        dialog.append(stack);
    }
    return stack;
}

export function showToast(key, {variant = "default"} = {}) {
    const stack = toastStack();
    const toast = document.createElement("button");
    toast.className = `toast-item ${variant === "danger" ? "danger" : ""}`.trim();
    toast.type = "button";
    toast.textContent = t(key);
    stack.append(toast);

    const dismiss = () => hideToast(toast);
    toast.addEventListener("click", dismiss, {once: true});
    toast.dismissTimer = window.setTimeout(dismiss, 2400);
    requestAnimationFrame(() => toast.classList.add("visible"));
}

export function animateToastStack(stack, previousPositions) {
    Array.from(stack.children).forEach(item => {
        const previousTop = previousPositions.get(item);
        if (previousTop == null) return;

        const delta = previousTop - item.getBoundingClientRect().top;
        if (!delta) return;

        item.classList.add("stack-moving");
        const animation = item.animate([
            {transform: `translateY(${delta}px)`},
            {transform: "translateY(0)"},
        ], {
            duration: 180,
            easing: "cubic-bezier(.22, 1, .36, 1)",
        });
        animation.finished.finally(() => item.classList.remove("stack-moving"));
    });
}

export function hideToast(toast) {
    if (!toast || toast.dataset.removing === "true") return;
    toast.dataset.removing = "true";
    window.clearTimeout(toast.dismissTimer);
    toast.classList.remove("visible");
    const stack = toast.parentElement;
    const finish = () => {
        if (!toast.isConnected) return;
        const previousPositions = new Map(Array.from(stack.children)
            .filter(item => item !== toast)
            .map(item => [item, item.getBoundingClientRect().top]));
        toast.remove();
        requestAnimationFrame(() => animateToastStack(stack, previousPositions));
    };
    toast.addEventListener("transitionend", finish, {once: true});
    window.setTimeout(finish, 240);
}

export function animateSheetElement(sheet, direction, onFinish) {
    if (!sheet) {
        onFinish?.();
        return;
    }
    const animationToken = String(++runtime.sheetAnimationSeq);
    sheet.dataset.sheetAnimation = animationToken;
    sheet.getAnimations().forEach(animation => animation.cancel());

    if (!sheet?.animate) {
        sheet.style.opacity = "";
        sheet.style.transform = "";
        onFinish?.();
        return;
    }

    const frames = direction === "in"
        ? [
            {opacity: 0, transform: "translate3d(0, 38px, -28px) rotateX(14deg) scale3d(.972, .972, 1)"},
            {opacity: 1, transform: "translate3d(0, 0, 0) rotateX(0deg) scale3d(1, 1, 1)"},
        ]
        : [
            {opacity: 1, transform: "translate3d(0, 0, 0) rotateX(0deg) scale3d(1, 1, 1)"},
            {opacity: 0, transform: "translate3d(0, 30px, -24px) rotateX(12deg) scale3d(.975, .975, 1)"},
        ];

    requestAnimationFrame(() => {
        if (sheet.dataset.sheetAnimation !== animationToken) return;
        const animation = sheet.animate(frames, {
            duration: direction === "in" ? 338 : 273,
            easing: direction === "in" ? "cubic-bezier(.22, 1, .36, 1)" : "cubic-bezier(.4, 0, 1, 1)",
            fill: "both",
        });
        animation.finished.then(() => {
            if (sheet.dataset.sheetAnimation !== animationToken) return;
            sheet.style.opacity = "";
            sheet.style.transform = "";
            delete sheet.dataset.sheetAnimation;
            onFinish?.();
        }, () => {});
    });
}

export function openSheetDialog(dialog, {dismissible = true, animate = true} = {}) {
    if (dialog.open) return;
    const sheet = dialog.querySelector(".add-sheet");
    dialog.classList.remove("sheet-closing", "sheet-opening");
    dialog.dataset.dismissible = dismissible ? "true" : "false";
    ensureSheetCancelHandler(dialog);
    document.body.classList.add("sheet-open");
    showDialog(dialog);
    resetSheetScroll(sheet);
    dialog.dataset.dialogOpenOrder = String(++runtime.dialogOpenSeq);
    if (!animate) return;
    dialog.classList.add("sheet-opening");
    animateSheetElement(sheet, "in", () => {
        dialog.classList.remove("sheet-opening");
    });
}

export function closeSheetDialog(dialog) {
    if (!dialog.open || dialog.classList.contains("sheet-closing")) return;
    const sheet = dialog.querySelector(".add-sheet");
    dialog.classList.add("sheet-closing");
    const finish = () => {
        if (!dialog.open) return;
        dialog.classList.remove("sheet-closing");
        dialog.dataset.sheetCloseAllowed = "true";
        dialog.close();
    };
    animateSheetElement(sheet, "out", finish);
}

export function bindSheetDialog(dialogSelector, closeSelector) {
    const dialog = $(dialogSelector);
    $(closeSelector).addEventListener("click", () => closeSheetDialog(dialog));
    dialog.addEventListener("close", () => {
        dialog.classList.remove("sheet-closing", "sheet-opening");
        delete dialog.dataset.dialogOpenOrder;
        if (dialog.id === "settings-exercises-dialog") {
            window.clearTimeout(runtime.settingsExerciseSearchTimer);
            state.settingsExerciseSearchPending = false;
            state.settingsExerciseLoading = false;
            renderSettingsExerciseSearchState();
        }
        document.body.classList.remove("sheet-open");
    });
}

export function ensureSheetCancelHandler(dialog) {
    if (!dialog || dialog.dataset.cancelHandlerBound === "true") return;
    dialog.dataset.cancelHandlerBound = "true";
    dialog.addEventListener("cancel", event => {
        event.preventDefault();
        if (dialog.dataset.dismissible === "false") return;
        closeSheetDialog(dialog);
    });
    dialog.addEventListener("close", () => {
        const closeAllowed = dialog.dataset.sheetCloseAllowed === "true";
        const dismissible = dialog.dataset.dismissible !== "false";
        delete dialog.dataset.sheetCloseAllowed;

        if (!dismissible && !closeAllowed) {
            requestAnimationFrame(() => openSheetDialog(dialog, {dismissible: false}));
            return;
        }

        delete dialog.dataset.dismissible;
    });
}

export function openModalDialog(dialog) {
    if (!dialog.open) {
        showDialog(dialog);
        dialog.dataset.dialogOpenOrder = String(++runtime.dialogOpenSeq);
    }
}

export function closeModalDialog(dialog) {
    if (dialog?.open) dialog.close();
}

export function bindModalDialog(dialogSelector, closeSelector) {
    const dialog = $(dialogSelector);
    $(closeSelector).addEventListener("click", () => closeModalDialog(dialog));
    dialog.addEventListener("close", () => {
        delete dialog.dataset.dialogOpenOrder;
    });
}

export function resolveDeleteConfirmation(confirmed) {
    if (!runtime.deleteWorkoutConfirmResolve) return;
    const resolve = runtime.deleteWorkoutConfirmResolve;
    runtime.deleteWorkoutConfirmResolve = null;
    resolve(confirmed);
}

export function confirmDelete({titleKey, bodyKey, closeOnConfirm = false}) {
    const dialog = $("#delete-workout-dialog");
    if (dialog.open) return Promise.resolve(false);
    $("#delete-workout-title").textContent = t(titleKey);
    $("#delete-workout-copy").textContent = t(bodyKey);
    runtime.deleteConfirmCloseOnConfirm = closeOnConfirm;
    showDialog(dialog);
    dialog.dataset.dialogOpenOrder = String(++runtime.dialogOpenSeq);
    return new Promise(resolve => {
        runtime.deleteWorkoutConfirmResolve = resolve;
    });
}

export function confirmWorkoutDelete() {
    return confirmDelete({titleKey: "deleteWorkout.title", bodyKey: "deleteWorkout.body"});
}

export function confirmExerciseDelete() {
    return confirmDelete({titleKey: "deleteExercise.title", bodyKey: "deleteExercise.body", closeOnConfirm: true});
}

export function setDeleteWorkoutPending(pending) {
    state.deletingWorkout = pending;
    const cancelButton = $("#delete-workout-cancel");
    const confirmButton = $("#delete-workout-confirm");
    cancelButton.disabled = pending;
    confirmButton.disabled = pending;
    confirmButton.classList.toggle("loading", pending);
    confirmButton.textContent = pending ? t("actions.deleting") : t("actions.delete");
}

export function showDialog(dialog) {
    if (!dialog) return;
    if (!dialog.hasAttribute("tabindex")) dialog.setAttribute("tabindex", "-1");
    dialog.addEventListener("close", updateDialogScrollLock, {once: true});
    dialog.showModal();
    updateDialogScrollLock();
    dialog.focus({preventScroll: true});
}

export function updateDialogScrollLock() {
    const locked = Boolean(document.querySelector("dialog[open]"));
    document.documentElement.classList.toggle("dialog-open", locked);
    document.body.classList.toggle("dialog-open", locked);
}

export function resetSheetScroll(sheet) {
    if (!sheet) return;
    sheet.scrollTop = 0;
    sheet.scrollLeft = 0;
    sheet.querySelector(".add-form")?.scrollTo({top: 0, left: 0, behavior: "instant"});
    sheet.querySelector(".settings-exercise-scroll")?.scrollTo({top: 0, left: 0, behavior: "instant"});
}
