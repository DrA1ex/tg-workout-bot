// Extracted from main.js without changing feature behavior.
import {currentLocale, dateInputValueInTimezone, formatMetricNumber, formatUserDateKey, parseClientDate} from '../../core/utils.js';
import {escapeHtml, state, t} from '../../deps.js';

export function workoutRow(workout) {
    const detail = workoutDetail(workout);
    const note = workout.notes || exerciseNote(workout.exercise);

    return `
        <article class="workout-row swipe-workout-row" data-workout-id="${workout.id}">
            <button class="swipe-workout-main" type="button" data-edit-workout="${workout.id}">
                <span class="swipe-workout-body">
                    <h3>${escapeHtml(workout.exercise)}</h3>
                    <p>${escapeHtml(detail)}${note ? ` · ${escapeHtml(note)}` : ""}</p>
                </span>
                <span class="swipe-workout-chevron" aria-hidden="true">›</span>
            </button>
            <button class="swipe-delete-action" type="button" data-delete-workout="${workout.id}">
                ${escapeHtml(t("actions.delete"))}
            </button>
        </article>
    `;
}

export function dashboardWorkoutRow(workout) {
    const note = workout.notes || exerciseNote(workout.exercise);

    return `
        <article class="swipe-workout-row dashboard-swipe-row" data-workout-id="${workout.id}">
            <button class="dashboard-workout-row swipe-workout-main" type="button" data-edit-workout="${workout.id}">
                <span class="dashboard-workout-body">
                    <h3>${escapeHtml(workout.exercise)}</h3>
                    <p>${escapeHtml(dashboardWorkoutDetail(workout))}${note ? ` · ${escapeHtml(note)}` : ""}</p>
                </span>
                <span class="dashboard-workout-chevron" aria-hidden="true">›</span>
            </button>
            <button class="swipe-delete-action" type="button" data-delete-workout="${workout.id}">
                ${escapeHtml(t("actions.delete"))}
            </button>
        </article>
    `;
}

export function workoutDetail(workout) {
    return [
        `${workout.sets || 0} ${t("units.sets")}`,
        workout.weight ? `${formatMetricNumber(workout.weight)} ${t("units.kg")}` : null,
        workout.isTime
            ? `${formatMetricNumber(workout.repsOrTime || 0)} ${t("units.sec")}`
            : `${formatMetricNumber(workout.repsOrTime || 0)} ${t("units.reps")}`,
    ].filter(Boolean).join(" · ");
}

export function dashboardWorkoutDetail(workout) {
    return [
        workout.weight ? `${formatMetricNumber(workout.weight)} ${t("units.kg")}` : null,
        workout.isTime
            ? `${formatMetricNumber(workout.repsOrTime || 0)} ${t("units.sec")}`
            : `${formatMetricNumber(workout.repsOrTime || 0)} ${t("units.reps")}`,
        `${workout.sets || 0} ${t("units.sets")}`,
    ].filter(Boolean).join(" · ");
}

export function exerciseNote(name) {
    return state.exercises.find(exercise => exercise.name === name)?.notes || "";
}

export function workoutVolume(workout) {
    if (workout.isTime || !workout.weight || !workout.repsOrTime || !workout.sets) return 0;
    return Math.round(workout.weight * workout.repsOrTime * workout.sets);
}

export function workoutTimeLabel(workout) {
    return workout.timeLabel || workout.dateLabel || "";
}

export function renderList(target, items, emptyKey) {
    target.innerHTML = items.length
        ? items.map(workoutRow).join("")
        : `<div class="empty">${t(emptyKey)}</div>`;
}

export function workoutCountLabel(count) {
    const language = currentLocale();
    if (language === "ru") {
        const mod10 = count % 10;
        const mod100 = count % 100;
        if (mod10 === 1 && mod100 !== 11) return "запись";
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "записи";
        return "записей";
    }
    if (language === "fr") return count === 1 ? "séance" : "séances";
    if (language === "de") return count === 1 ? "Workout" : "Workouts";
    return count === 1 ? "workout" : "workouts";
}

export function weekUnitLabel(count) {
    const language = currentLocale();
    if (language === "ru") {
        const mod10 = count % 10;
        const mod100 = count % 100;
        if (mod10 === 1 && mod100 !== 11) return "неделя";
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "недели";
        return "недель";
    }
    if (language === "de") return count === 1 ? "Woche" : "Wochen";
    if (language === "fr") return count === 1 ? "semaine" : "semaines";
    return count === 1 ? "week" : "weeks";
}

export function todaySubtitle(data) {
    return data.today?.label || "";
}

export function shortDateLabel(workout) {
    const dateKey = workout?.dateKey || dateInputValueInTimezone(parseClientDate(workout?.date));
    return formatUserDateKey(dateKey, {day: "numeric", month: "short"}) || workout?.dateLabel || "";
}

export function allWorkouts() {
    const history = state.history?.groups?.flatMap(group => group.workouts) || [];
    const byId = new Map(history.map(workout => [workout.id, workout]));
    (state.dashboard?.recent || []).forEach(workout => byId.set(workout.id, workout));
    (state.dashboard?.today?.workouts || []).forEach(workout => byId.set(workout.id, workout));
    (state.progress?.recent || []).forEach(workout => byId.set(workout.id, workout));
    return [...byId.values()];
}

export function findWorkout(id) {
    return allWorkouts().find(workout => String(workout.id) === String(id));
}

export function workoutDateInputValue(workout) {
    if (workout.dateKey) return workout.dateKey;
    return dateInputValueInTimezone(parseClientDate(workout.date) || new Date());
}
