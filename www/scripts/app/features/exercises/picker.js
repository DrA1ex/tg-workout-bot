// Extracted from main.js without changing feature behavior.
import {EXERCISE_ROW_SELECTOR} from '../../core/config.js';
import {escapeHtml, interpolate, t} from '../../deps.js';

export function setExerciseSearchLoading(spinner, loading) {
    if (!spinner) return;
    spinner.hidden = !loading;
    spinner.closest(".onboarding-search-shell")?.classList.toggle("loading", loading);
}

export function exerciseListRowMarkup({
    key,
    title,
    subtitle = "",
    rowClasses = "",
    rowAttributes = "",
    buttonClasses = "",
    buttonAttributes = "",
    trailing = "",
}) {
    const rowClassName = ["workout-row", "exercise-list-row", rowClasses].filter(Boolean).join(" ");
    const buttonClassName = ["exercise-list-button", buttonClasses].filter(Boolean).join(" ");
    const subtitleMarkup = subtitle ? `<p>${escapeHtml(subtitle)}</p>` : "";

    return `
        <article class="${rowClassName}" data-exercise-row-key="${escapeHtml(key)}"${rowAttributes ? ` ${rowAttributes}` : ""}>
            <button class="${buttonClassName}" type="button"${buttonAttributes ? ` ${buttonAttributes}` : ""}>
                <span class="swipe-workout-body">
                    <h3>${escapeHtml(title)}</h3>
                    ${subtitleMarkup}
                </span>
                ${trailing}
            </button>
        </article>
    `;
}

export function exerciseAddSuggestionRow({name, hasResults, context}) {
    const title = interpolate(t("onboarding.addSearch"), {name});
    const subtitle = hasResults ? t("onboarding.addSearchHint") : t("onboarding.noResults");
    const buttonAttribute = context === "settings"
        ? "data-settings-add-search"
        : "data-onboarding-add-search";

    return exerciseListRowMarkup({
        key: `${context}-suggestion:${name}`,
        title,
        subtitle,
        rowClasses: "exercise-list-add-row",
        buttonAttributes: buttonAttribute,
        trailing: '<span class="exercise-list-add-icon" aria-hidden="true">＋</span>',
    });
}

export function exerciseListRows(list) {
    return [...list.querySelectorAll(EXERCISE_ROW_SELECTOR)];
}

export function captureExerciseRowPositions(list) {
    return new Map(exerciseListRows(list).map(row => [
        row.dataset.exerciseRowKey,
        row.getBoundingClientRect(),
    ]));
}

export function animateExerciseRows(list, previousPositions) {
    if (
        !previousPositions?.size ||
        typeof Element.prototype.animate !== "function" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
        return Promise.resolve();
    }

    const animations = [];
    list.classList.add("exercise-list-reordering");

    exerciseListRows(list).forEach(row => {
        const previous = previousPositions.get(row.dataset.exerciseRowKey);
        let animation;

        row.getAnimations().forEach(current => current.cancel());

        if (!previous) {
            animation = row.animate([
                {opacity: 0, transform: "translateY(10px) scale(.985)"},
                {opacity: 1, transform: "translateY(0) scale(1)"},
            ], {
                duration: 220,
                easing: "cubic-bezier(.22, 1, .36, 1)",
                fill: "both",
            });
        } else {
            const current = row.getBoundingClientRect();
            const dx = previous.left - current.left;
            const dy = previous.top - current.top;

            if (!dx && !dy) return;

            row.style.zIndex = "2";
            animation = row.animate([
                {opacity: .84, transform: `translate(${dx}px, ${dy}px)`},
                {opacity: 1, transform: "translate(0, 0)"},
            ], {
                duration: 340,
                easing: "cubic-bezier(.22, 1, .36, 1)",
                fill: "both",
            });
        }

        animations.push(
            animation.finished
                .catch(() => {})
                .finally(() => {
                    animation.cancel();
                    row.style.zIndex = "";
                })
        );
    });

    if (!animations.length) {
        list.classList.remove("exercise-list-reordering");
        return Promise.resolve();
    }

    return Promise.allSettled(animations).finally(() => {
        list.classList.remove("exercise-list-reordering");
    });
}
