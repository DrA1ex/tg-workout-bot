import {state} from './state.js';
import {api, authApi, setUnauthorizedHandler} from './api.js';
import {configureAuth, ensureAuth, showAuthScreen} from './auth.js';
import {$, $$, escapeHtml} from './dom.js';
import {applyI18n, interpolate, t} from './i18n/index.js';
import {applyTheme} from './theme.js';

let previousWorkoutController = null;
let previousWorkoutRequest = null;
let previousWorkoutRequestExercise = "";
let historyObserver = null;
let deleteWorkoutConfirmResolve = null;

const HISTORY_PAGE_SIZE = 8;
const HISTORY_INITIAL_SIZE = 24;

function workoutRow(workout) {
    const detail = workoutDetail(workout);

    return `
        <article class="workout-row" data-workout-id="${workout.id}">
            <div>
                <h3>${escapeHtml(workout.exercise)}</h3>
                <p>${escapeHtml(detail)}${workout.notes ? ` · ${escapeHtml(workout.notes)}` : ""}</p>
            </div>
            <div class="row-actions">
                <span class="pill">${escapeHtml(workout.dateLabel || "")}</span>
                <button class="row-action" type="button" data-edit-workout="${workout.id}" aria-label="${t("actions.edit")}">✎</button>
                <button class="row-action danger" type="button" data-delete-workout="${workout.id}" aria-label="${t("actions.delete")}">×</button>
            </div>
        </article>
    `;
}

function dashboardWorkoutRow(workout) {
    return `
        <button class="dashboard-workout-row" type="button" data-edit-workout="${workout.id}">
            <div class="dashboard-workout-body">
                <h3>${escapeHtml(workout.exercise)}</h3>
                <p>${escapeHtml(dashboardWorkoutDetail(workout))}</p>
            </div>
            <span class="dashboard-workout-chevron" aria-hidden="true">›</span>
        </button>
    `;
}

function workoutDetail(workout) {
    return [
        `${workout.sets || 0} ${t("units.sets")}`,
        workout.weight ? `${formatMetricNumber(workout.weight)} ${t("units.kg")}` : null,
        workout.isTime
            ? `${formatMetricNumber(workout.repsOrTime || 0)} ${t("units.sec")}`
            : `${formatMetricNumber(workout.repsOrTime || 0)} ${t("units.reps")}`,
    ].filter(Boolean).join(" · ");
}

function dashboardWorkoutDetail(workout) {
    return [
        workout.weight ? `${formatMetricNumber(workout.weight)} ${t("units.kg")}` : null,
        workout.isTime
            ? `${formatMetricNumber(workout.repsOrTime || 0)} ${t("units.sec")}`
            : `${formatMetricNumber(workout.repsOrTime || 0)} ${t("units.reps")}`,
        `${workout.sets || 0} ${t("units.sets")}`,
    ].filter(Boolean).join(" · ");
}

function workoutVolume(workout) {
    if (workout.isTime || !workout.weight || !workout.repsOrTime || !workout.sets) return 0;
    return Math.round(workout.weight * workout.repsOrTime * workout.sets);
}

function parseClientDate(value) {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

    const raw = String(value).trim();
    if (!raw) return null;

    const direct = new Date(raw);
    if (!Number.isNaN(direct.getTime())) return direct;

    const normalized = raw
        .replace(/^(\d{4}-\d{2}-\d{2})\s+/, "$1T")
        .replace(/\s+([+-]\d{2}:?\d{2}|Z)$/i, "$1");
    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) return parsed;

    const dateOnly = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateOnly) {
        const fallback = new Date(`${dateOnly[1]}T12:00:00Z`);
        if (!Number.isNaN(fallback.getTime())) return fallback;
    }

    return null;
}

function currentLocale() {
    return state.user?.language || "en";
}

function workoutTimeLabel(workout) {
    const date = parseClientDate(workout.date);
    if (!date) return workout.dateLabel || "";
    return date.toLocaleTimeString(currentLocale(), {hour: "numeric", minute: "2-digit"});
}

function formatMetricNumber(value) {
    const numeric = Number(value || 0);
    return Number.isInteger(numeric) ? String(numeric) : String(Number(numeric.toFixed(1)));
}

function renderList(target, items, emptyKey) {
    target.innerHTML = items.length
        ? items.map(workoutRow).join("")
        : `<div class="empty">${t(emptyKey)}</div>`;
}

function renderDashboardList(target, items) {
    target.innerHTML = items.length
        ? items.map(dashboardWorkoutRow).join("")
        : `
            <div class="dashboard-empty">
                <span class="dashboard-empty-icon">📅</span>
                <span class="dashboard-empty-copy">
                    <strong>${t("dashboard.noWorkoutToday")}</strong>
                    <p>${t("dashboard.emptyTodayHint")}</p>
                </span>
                <button class="primary-button compact-action" data-action="quick-add" type="button">
                    <span>＋</span>
                    <span>${t("actions.addWorkout")}</span>
                </button>
            </div>
        `;
}

function renderDashboard() {
    const data = state.dashboard;
    const weeklyStreak = data.weeklyStreak?.count ?? data.stats.weeklyStreak;
    $("#weekly-streak").textContent = weeklyStreak;
    $("#weekly-streak-unit").textContent = weekUnitLabel(weeklyStreak);
    $("#weekly-volume").textContent = data.stats.weeklyVolume.toLocaleString();
    $("#weekly-workouts").textContent = data.stats.weeklyWorkouts;
    $("#weekly-days").textContent = data.stats.weeklyDays;
    $("#weekly-exercises").textContent = data.stats.weeklyExercises;
    $("#weekly-streak-status").textContent = data.weeklyStreak?.currentWeekHasWorkout
        ? t("dashboard.currentWeekDone")
        : t("dashboard.currentWeekOpen");
    $("#weekly-streak-info").dataset.tooltip = t("dashboard.weeklyStreakHint");
    $("#weekly-streak-info").setAttribute("aria-label", t("dashboard.weeklyStreakHint"));
    $("#weekly-streak-info").setAttribute("title", t("dashboard.weeklyStreakHint"));
    $(".weekly-streak-card").classList.toggle("at-risk", !data.weeklyStreak?.currentWeekHasWorkout);
    const hasTodayWorkouts = data.today.workouts.length > 0;
    $("#dashboard-last-workout-row").hidden = hasTodayWorkouts;
    if (!hasTodayWorkouts) {
        $("#dashboard-last-workout").textContent = data.lastSession?.exercise || t("dashboard.noLastSession");
        $("#dashboard-last-workout-detail").textContent = data.lastSession ? workoutDetail(data.lastSession) : "";
        $("#dashboard-last-workout-date").textContent = shortDateLabel(data.lastSession);
    }
    if (state.tab === "dashboard") {
        $("#screen-subtitle").textContent = todaySubtitle(data);
    }
    renderLastSession(data.lastSession);
    renderActivity();
    renderStreakWeeks(data.weeklyStreak?.weeks || data.activity || []);
    renderDashboardList($("#today-list"), data.today.workouts);
    renderList($("#recent-list"), data.recent, "empty.recent");
    hideDashboardSkeleton();
}

function showDashboardSkeleton() {
    state.appReady = false;
    updateAppReadyState();
    const skeleton = $("#dashboard-skeleton");
    const content = $("#dashboard-content");
    if (skeleton) skeleton.hidden = false;
    if (content) content.hidden = true;
}

function hideDashboardSkeleton() {
    const skeleton = $("#dashboard-skeleton");
    const content = $("#dashboard-content");
    if (skeleton) skeleton.hidden = true;
    if (content) content.hidden = false;
    state.appReady = true;
    updateAppReadyState();
}

function updateAppReadyState() {
    const addButton = $("#nav-add");
    if (addButton) {
        addButton.disabled = !state.appReady;
    }
}

function updateWorkoutFormState() {
    const disabled = state.savingWorkout || state.exercises.length === 0;
    $$("#workout-form input, #workout-form select, #workout-form textarea, #workout-form button").forEach(node => {
        node.disabled = disabled;
    });

    const saveButton = $("#workout-save-button");
    if (saveButton) {
        saveButton.textContent = state.savingWorkout ? t("actions.saving") : t("actions.save");
        saveButton.classList.toggle("loading", state.savingWorkout);
    }
}

function weekUnitLabel(count) {
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

function todaySubtitle(data) {
    const source = parseClientDate(data.today.workouts[0]?.date) || new Date();
    const locale = currentLocale();
    return source.toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
    }) + " • " + source.toLocaleDateString(locale, {weekday: "long"});
}

function shortDateLabel(workout) {
    const date = parseClientDate(workout?.date);
    if (!date) return workout?.dateLabel || "";
    return date.toLocaleDateString(currentLocale(), {day: "numeric", month: "short"});
}

function renderLastSession(workout) {
    if (!$("#last-session-title")) return;
    $("#last-session-title").textContent = workout?.exercise || t("dashboard.noLastSession");
    $("#last-session-detail").textContent = workout ? `${workout.dateLabel} · ${workoutDetail(workout)}` : "";
}

function renderActivity() {
    const now = new Date();
    const monday = new Date(now);
    const day = monday.getDay() || 7;
    monday.setDate(monday.getDate() - day + 1);
    const activeDates = new Set((state.history?.groups || []).map(group => group.date));
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    $("#activity-strip").innerHTML = labels.map((label, index) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + index);
        const key = date.toISOString().slice(0, 10);
        const isToday = date.toDateString() === now.toDateString();
        const isActive = activeDates.has(key);
        return `
            <div class="week-day ${isActive ? "done" : ""} ${isToday ? "today" : ""}">
                <span>${label}</span>
                <strong>${isActive ? "✓" : date.getDate()}</strong>
            </div>
        `;
    }).join("");
}

function renderStreakWeeks(weeks) {
    const visibleWeeks = weeks.slice(-7);
    $("#streak-week-strip").innerHTML = visibleWeeks.map(week => `
        <div class="streak-week ${week.hasWorkout ? "active" : ""} ${week.isCurrent ? "current" : ""}">
            <span>${escapeHtml(week.label)}</span>
            <strong>${week.hasWorkout ? "✓" : ""}</strong>
        </div>
    `).join("");
}

function exerciseSelectOptions(selectedValue = "") {
    const recentNames = new Set((state.recentExercises || []).map(exercise => exercise.name));
    const exercisesByName = new Map(state.exercises.map(exercise => [exercise.name, exercise]));
    const recent = (state.recentExercises || [])
        .map(exercise => exercisesByName.get(exercise.name))
        .filter(Boolean);
    const rest = state.exercises.filter(exercise => !recentNames.has(exercise.name));
    const option = exercise => `<option value="${escapeHtml(exercise.name)}" ${exercise.name === selectedValue ? "selected" : ""}>${escapeHtml(exercise.name)}</option>`;

    if (!recent.length) return rest.map(option).join("");

    return [
        `<option value="" disabled>${escapeHtml(t("exercises.recentlyUsed"))}</option>`,
        ...recent.map(option),
        `<option value="" disabled>${escapeHtml(t("exercises.allExercises"))}</option>`,
        ...rest.map(option),
    ].join("");
}

function setExerciseSelectOptions(selector, selectedValue) {
    const select = $(selector);
    const nextValue = selectedValue || select.value;
    select.innerHTML = exerciseSelectOptions(nextValue);
    if (nextValue && [...select.options].some(option => option.value === nextValue)) {
        select.value = nextValue;
    } else {
        const firstEnabled = [...select.options].find(option => !option.disabled);
        if (firstEnabled) select.value = firstEnabled.value;
    }
}

function renderExercises() {
    setExerciseSelectOptions("#workout-exercise", $("#workout-exercise").value);
    setExerciseSelectOptions("#edit-exercise", $("#edit-exercise").value);
    setExerciseSelectOptions("#progress-exercise", $("#progress-exercise").value);
    $("#add-empty").hidden = state.exercises.length > 0;
    updateWorkoutFormState();
    $("#exercise-list-title").textContent = state.exerciseScope === "mine" ? t("exercises.mine") : t("exercises.global");

    if (state.exerciseScope === "mine") {
        const query = state.exerciseSearch.toLowerCase();
        const filtered = state.exercises.filter(ex =>
            ex.name.toLowerCase().includes(query) ||
            (ex.notes || "").toLowerCase().includes(query)
        );

        $("#exercise-count").textContent = filtered.length;
        $("#exercise-list").innerHTML = filtered.length
            ? filtered.map(userExerciseRow).join("")
            : `<div class="empty">${t(state.exercises.length ? "exercises.noMatches" : "empty.exercises")}</div>`;
        return;
    }

    $("#exercise-count").textContent = state.globalExercises.length;
    $("#exercise-list").innerHTML = state.globalExercises.length
        ? state.globalExercises.map(globalExerciseRow).join("")
        : `<div class="empty">${t("exercises.noGlobalMatches")}</div>`;
}

function userExerciseRow(exercise) {
    return `
        <article class="workout-row exercise-row">
            <div>
                <h3>${escapeHtml(exercise.name)}</h3>
                <p>${escapeHtml(exercise.notes || t("exercises.note"))}</p>
                <div class="exercise-meta">
                    ${exercise.notes ? `<span class="tag">${t("exercises.note")}</span>` : ""}
                </div>
            </div>
            <div class="row-actions">
                <button class="row-action" type="button" data-edit-exercise="${escapeHtml(exercise.name)}" aria-label="${t("actions.edit")}">✎</button>
                <button class="row-action danger" type="button" data-delete-exercise="${escapeHtml(exercise.name)}" aria-label="${t("actions.delete")}">×</button>
            </div>
        </article>
    `;
}

function globalExerciseRow(exercise) {
    return `
        <article class="workout-row exercise-row">
            <div>
                <h3>${escapeHtml(exercise.name)}</h3>
                <div class="exercise-meta">
                    <span class="tag ${exercise.added ? "success" : ""}">${exercise.added ? t("actions.added") : t("exercises.global")}</span>
                </div>
            </div>
            <div class="row-actions">
                <button class="row-action" type="button" data-add-global-exercise="${escapeHtml(exercise.name)}" ${exercise.added ? "disabled" : ""} aria-label="${t("actions.add")}">＋</button>
            </div>
        </article>
    `;
}

function allWorkouts() {
    const history = state.history?.groups?.flatMap(group => group.workouts) || [];
    const byId = new Map(history.map(workout => [workout.id, workout]));
    (state.dashboard?.recent || []).forEach(workout => byId.set(workout.id, workout));
    (state.dashboard?.today?.workouts || []).forEach(workout => byId.set(workout.id, workout));
    (state.progress?.recent || []).forEach(workout => byId.set(workout.id, workout));
    return [...byId.values()];
}

function findWorkout(id) {
    return allWorkouts().find(workout => String(workout.id) === String(id));
}

function workoutDateInputValue(workout) {
    const date = parseClientDate(workout.date) || new Date();
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function showToast(key) {
    const toast = $("#toast");
    toast.textContent = t(key);
    toast.classList.add("visible");
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => toast.classList.remove("visible"), 2400);
}

function setAddMode(mode) {
    state.mode = mode;
    $$(".add-reps-control [data-mode]").forEach(item => item.classList.toggle("active", item.dataset.mode === mode));
}

function setEditMode(mode) {
    state.editMode = mode;
    $$(".edit-reps-control [data-mode]").forEach(item => item.classList.toggle("active", item.dataset.mode === mode));
}

function workoutFormFields(prefix) {
    return {
        date: $(`#${prefix}-date`),
        exercise: $(`#${prefix}-exercise`),
        sets: $(`#${prefix}-sets`),
        weight: $(`#${prefix}-weight`),
        reps: $(`#${prefix}-reps`),
        notes: $(`#${prefix}-notes`),
        notesCount: $(`#${prefix}-notes-count`),
    };
}

function setWorkoutFormValues(prefix, workout) {
    const fields = workoutFormFields(prefix);
    fields.date.value = workoutDateInputValue(workout);
    fields.exercise.value = workout.exercise;
    fields.sets.value = workout.sets || "";
    fields.weight.value = workout.weight || "";
    fields.reps.value = workout.repsOrTime || "";
    fields.notes.value = workout.notes || "";
    fields.notesCount.textContent = String(fields.notes.value.length);
}

function readWorkoutFormValues(prefix, isTime) {
    const fields = workoutFormFields(prefix);
    return {
        date: fields.date.value,
        exercise: fields.exercise.value,
        sets: fields.sets.value,
        weight: fields.weight.value,
        repsOrTime: fields.reps.value,
        isTime,
        notes: fields.notes.value,
    };
}

function openEditDialog(workout) {
    $("#edit-id").value = workout.id;
    setWorkoutFormValues("edit", workout);
    setEditMode(workout.isTime ? "time" : "reps");
    document.body.classList.add("sheet-open");
    $("#edit-dialog").showModal();
}

function resolveDeleteWorkoutConfirmation(confirmed) {
    if (!deleteWorkoutConfirmResolve) return;
    const resolve = deleteWorkoutConfirmResolve;
    deleteWorkoutConfirmResolve = null;
    resolve(confirmed);
}

function confirmWorkoutDelete() {
    const dialog = $("#delete-workout-dialog");
    if (dialog.open) return Promise.resolve(false);
    dialog.showModal();
    return new Promise(resolve => {
        deleteWorkoutConfirmResolve = resolve;
    });
}

async function deleteWorkout(id) {
    if (!await confirmWorkoutDelete()) return false;
    await api(`workouts/${id}`, {method: "DELETE"});
    await refreshAll();
    showToast("toast.deleted");
    return true;
}

async function saveEditedWorkout() {
    const id = $("#edit-id").value;
    await api(`workouts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(readWorkoutFormValues("edit", state.editMode === "time")),
    });
    $("#edit-dialog").close();
    await refreshAll();
    showToast("toast.saved");
}

function findExercise(name) {
    return state.exercises.find(ex => ex.name === name);
}

function openExerciseDialog(exercise) {
    $("#exercise-edit-name").value = exercise.name;
    $("#exercise-edit-title").textContent = exercise.name;
    $("#exercise-edit-notes").value = exercise.notes || "";
    $("#exercise-dialog").showModal();
}

async function loadGlobalExercises() {
    const params = new URLSearchParams();
    if (state.exerciseSearch) params.set("search", state.exerciseSearch);
    const data = await api(`exercises/global${params.toString() ? `?${params.toString()}` : ""}`);
    state.globalExercises = data.exercises || [];
    renderExercises();
}

async function saveExerciseNotes() {
    const name = $("#exercise-edit-name").value;
    const data = await api(`exercises/${encodeURIComponent(name)}`, {
        method: "PATCH",
        body: JSON.stringify({notes: $("#exercise-edit-notes").value}),
    });
    state.exercises = data.exercises;
    $("#exercise-dialog").close();
    renderExercises();
    showToast("toast.exerciseSaved");
}

async function deleteExercise(name) {
    const data = await api(`exercises/${encodeURIComponent(name)}`, {method: "DELETE"});
    state.exercises = data.exercises;
    $("#exercise-dialog").close();
    await refreshAll();
    showToast("toast.exerciseDeleted");
}

async function addGlobalExercise(name) {
    const data = await api("exercises", {
        method: "POST",
        body: JSON.stringify({name, notes: ""}),
    });
    state.exercises = data.exercises;
    await loadGlobalExercises();
    await refreshAll();
    state.exerciseScope = "global";
    renderExerciseScope();
    showToast("toast.exerciseAdded");
}

function renderExerciseScope() {
    $$("#exercise-scope button").forEach(button => {
        button.classList.toggle("active", button.dataset.scope === state.exerciseScope);
    });
    renderExercises();
}

function renderHistory() {
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

function renderProgress() {
    const data = state.progress;
    const isLoading = state.progressLoading || !state.progressLoaded;
    $("#progress-skeleton").hidden = !isLoading;
    $("#progress-content").hidden = isLoading;
    if (isLoading) return;

    if (!data?.points?.length) {
        $("#progress-chart").innerHTML = `<text x="180" y="120" text-anchor="middle" fill="currentColor">${t("empty.progress")}</text>`;
        $("#progress-best").textContent = "0";
        $("#progress-latest").textContent = "0";
        $("#progress-pr").textContent = "0";
        $("#progress-recent").innerHTML = `<div class="empty">${t("empty.progress")}</div>`;
        return;
    }

    const metric = state.progressMetric;
    const values = data.points.map(point => metricValue(point, metric));
    const bestValue = Math.max(...values, 0);
    const averageValue = values.reduce((sum, value) => sum + value, 0) / values.length;

    $("#progress-best").textContent = formatMetricWithUnit(bestValue, metric);
    $("#progress-latest").textContent = formatMetricWithUnit(averageValue, metric);
    $("#progress-best-label").textContent = metricLabel(metric);
    $("#progress-latest-label").textContent = metricLabel(metric);
    $("#progress-pr").textContent = `${Math.round(data.summary?.totalVolume || 0).toLocaleString()} kg`;
    $("#progress-pr-label").textContent = t("progress.total");
    renderProgressRecent(data.recent || []);
    drawChart(data.points, metric);
}

function metricValue(point, metric) {
    if (metric === "volume") return point.volume || (!point.isTime && point.weight && point.repsOrTime && point.sets
        ? point.weight * point.repsOrTime * point.sets
        : 0);
    if (metric === "repsOrTime") return point.repsOrTime || 0;
    if (metric === "sets") return point.sets || 0;
    return point.weight || 0;
}

function formatMetric(value, metric) {
    const rounded = Number.isInteger(value) ? value : Number(value.toFixed(1));
    if (metric === "weight") return rounded ? `${rounded}` : "0";
    if (metric === "volume") return Math.round(value).toLocaleString();
    return String(rounded);
}

function formatMetricWithUnit(value, metric) {
    const formatted = formatMetric(value, metric);
    if (metric === "weight" || metric === "volume") return `${formatted} kg`;
    return formatted;
}

function metricLabel(metric) {
    if (metric === "volume") return t("progress.volumeMetric");
    if (metric === "repsOrTime") return t("progress.repsTime");
    if (metric === "sets") return t("fields.sets");
    return t("progress.weight");
}

function renderProgressRecent(rows) {
    const data = state.progress;
    const bestMetricValue = Math.max(...(data?.points || []).map(point => metricValue(point, state.progressMetric)), 0);
    $("#progress-recent").innerHTML = rows.length
        ? rows.map(row => `
            <button class="progress-record-row" type="button" data-edit-workout="${row.id}">
                <span class="progress-record-clock">◷</span>
                <span class="progress-record-body">
                    <strong>${escapeHtml(row.dateLabel)}</strong>
                    <small>${escapeHtml(workoutDetail(row))}</small>
                </span>
                ${metricValue(row, state.progressMetric) === bestMetricValue ? `<span class="progress-pr-badge">${t("progress.pr")}</span>` : ""}
                <span class="progress-record-chevron">›</span>
            </button>
        `).join("")
        : `<div class="empty">${t("empty.progress")}</div>`;
}

function renderSettings() {
    const isLoading = !state.settingsLoaded;
    $("#settings-skeleton").hidden = !isLoading;
    $("#settings-form").hidden = isLoading;
    if (isLoading || !state.user) return;

    $("#language-select").value = state.user.language;
    $("#timezone-input").value = state.user.timezone;
    $("#theme-select").value = state.theme;
    $$("#accent-select [data-accent-color]").forEach(button => {
        button.classList.toggle("active", button.dataset.accentColor === (state.accentColor || "blue"));
    });
}

function updateSettingsPreview() {
    state.theme = $("#theme-select").value;
    state.accentColor = $("#accent-select [data-accent-color].active")?.dataset.accentColor || state.accentColor || "blue";
    localStorage.setItem("theme", state.theme);
    localStorage.setItem("accentColor", state.accentColor);
    applyTheme();
    renderSettings();
}

function drawChart(points, metric) {
    const svg = $("#progress-chart");
    const values = points.map(point => metricValue(point, metric));
    const rawMax = Math.max(...values, 1);
    const rawMin = Math.min(...values, 0);
    const width = 360;
    const height = 246;
    const padLeft = 40;
    const padRight = 18;
    const padTop = 34;
    const padBottom = 36;
    const min = rawMin === rawMax ? Math.max(0, rawMin - 1) : Math.max(0, rawMin - (rawMax - rawMin) * .12);
    const max = rawMin === rawMax ? rawMax + 1 : rawMax + (rawMax - rawMin) * .12;
    const span = Math.max(max - min, 1);
    const step = points.length > 1 ? (width - padLeft - padRight) / (points.length - 1) : 0;
    const coords = values.map((value, index) => {
        const x = padLeft + index * step;
        const y = height - padBottom - ((value - min) / span) * (height - padTop - padBottom);
        return [x, y];
    });
    const path = coords.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    const ticks = [0, .25, .5, .75, 1].map(ratio => ({
        value: min + span * ratio,
        y: height - padBottom - ratio * (height - padTop - padBottom),
    })).reverse();
    const labelIndexes = points.length <= 4
        ? points.map((_, index) => index)
        : [0, Math.floor((points.length - 1) / 2), points.length - 1];
    const labelAnchor = index => {
        if (index === 0) return "start";
        if (index === points.length - 1) return "end";
        return "middle";
    };
    const last = coords.at(-1);
    const lastValue = values.at(-1) || 0;
    const bubbleX = Math.min(Math.max(last?.[0] || width / 2, 58), width - 58);
    const bubbleY = Math.max((last?.[1] || padTop) - 32, 20);
    const arrowX = last ? Math.min(Math.max(last[0], bubbleX - 34), bubbleX + 34) : bubbleX;

    svg.innerHTML = `
        <text x="${padLeft - 34}" y="${padTop - 12}" fill="var(--muted)" font-size="12" font-weight="700">${escapeHtml(metricUnit(metric))}</text>
        ${ticks.map(tick => `
            <line x1="${padLeft}" y1="${tick.y.toFixed(1)}" x2="${width - padRight}" y2="${tick.y.toFixed(1)}" stroke="var(--line)" stroke-width="1"></line>
            <text x="${padLeft - 8}" y="${(tick.y + 4).toFixed(1)}" text-anchor="end" fill="var(--muted)" font-size="12">${escapeHtml(formatAxisValue(tick.value, metric))}</text>
        `).join("")}
        <path d="${path}" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
        ${coords.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="var(--primary)" stroke="var(--surface)" stroke-width="2"></circle>`).join("")}
        ${labelIndexes.map(index => `<text x="${coords[index][0].toFixed(1)}" y="${height - 8}" text-anchor="${labelAnchor(index)}" fill="var(--muted)" font-size="12" font-weight="650">${escapeHtml(chartDateLabel(points[index]))}</text>`).join("")}
        ${last ? `
            <g>
                <rect x="${(bubbleX - 44).toFixed(1)}" y="${(bubbleY - 20).toFixed(1)}" width="88" height="30" rx="8" fill="var(--primary)"></rect>
                <path d="M${(arrowX - 6).toFixed(1)} ${(bubbleY + 10).toFixed(1)} L${arrowX.toFixed(1)} ${(bubbleY + 18).toFixed(1)} L${(arrowX + 6).toFixed(1)} ${(bubbleY + 10).toFixed(1)} Z" fill="var(--primary)"></path>
                <text x="${bubbleX.toFixed(1)}" y="${(bubbleY + 1).toFixed(1)}" text-anchor="middle" fill="var(--primary-ink)" font-size="13" font-weight="850">${escapeHtml(formatMetricWithUnit(lastValue, metric))}</text>
            </g>
        ` : ""}
        ${coords.length === 1 ? `<text x="${width / 2}" y="${height - 58}" text-anchor="middle" fill="var(--muted)" font-size="12">${t("progress.notEnoughData")}</text>` : ""}
    `;
}

function metricUnit(metric) {
    if (metric === "weight" || metric === "volume") return "kg";
    if (metric === "sets") return t("fields.sets").toLowerCase();
    return t("progress.repsTime").toLowerCase();
}

function formatAxisValue(value, metric) {
    if (metric === "volume") return Math.round(value).toLocaleString();
    const rounded = Number(value.toFixed(value >= 10 ? 0 : 1));
    return String(rounded);
}

function chartDateLabel(point) {
    const date = parseClientDate(point?.date);
    if (!date) return point?.label || "";
    return date.toLocaleDateString(currentLocale(), {month: "short", day: "numeric"});
}

function setTab(tab) {
    if (tab === "add" && !state.appReady) return;

    state.tab = tab;
    document.body.dataset.tab = tab;
    $$(".screen").forEach(screen => screen.classList.toggle("active", screen.id === `screen-${tab}`));
    $$(".bottom-nav button").forEach(button => button.classList.toggle("active", button.dataset.tab === tab));
    $("#screen-title").textContent = t(`screens.${tab}`);
    $("#screen-subtitle").textContent = tab === "dashboard" && state.dashboard ? todaySubtitle(state.dashboard) : "";
    if (tab === "history") {
        ensureHistoryLoaded();
    }
    if (tab === "progress") {
        ensureProgressLoaded();
    }
    if (tab === "settings") {
        renderSettings();
    }
    if (tab === "add") {
        window.scrollTo({top: 0, behavior: "instant"});
        updatePreviousWorkoutSummary().catch(console.error);
    }
}

async function refreshAll() {
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
    ensureHistoryLoaded();
    ensureProgressLoaded();
    if (state.tab === "add") {
        updatePreviousWorkoutSummary().catch(console.error);
    }
}

function ensureHistoryLoaded() {
    if (state.history?.loaded || state.history?.loading) return;
    if (!state.user) {
        renderHistory();
        return;
    }
    loadHistory({reset: true, limit: HISTORY_INITIAL_SIZE}).catch(console.error);
}

function ensureProgressLoaded() {
    if (state.progressLoaded || state.progressLoading) return;
    if (!state.user) {
        renderProgress();
        return;
    }
    loadProgress().catch(console.error);
}

async function loadHistory({reset = false, limit = HISTORY_PAGE_SIZE} = {}) {
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

function setupHistoryInfiniteScroll() {
    const sentinel = $("#history-sentinel");
    if (!sentinel || historyObserver) return;

    if (!("IntersectionObserver" in window)) {
        window.addEventListener("scroll", () => {
            if (state.tab !== "history" || state.history?.loading || !state.history?.hasMore) return;
            const nearBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 240;
            if (nearBottom) loadHistory().catch(console.error);
        }, {passive: true});
        return;
    }

    historyObserver = new IntersectionObserver(entries => {
        const visible = entries.some(entry => entry.isIntersecting);
        if (!visible || state.tab !== "history" || state.history?.loading || !state.history?.hasMore) return;
        loadHistory().catch(console.error);
    }, {root: null, rootMargin: "240px 0px", threshold: 0});
    historyObserver.observe(sentinel);
}

function clearWorkoutInputs() {
    abortPreviousWorkoutRequest();
    $("#workout-sets").value = "3";
    $("#workout-weight").value = "";
    $("#workout-reps").value = "12";
    $("#workout-notes").value = "";
    $("#notes-count").textContent = "0";
    state.previousWorkout = null;
    state.previousWorkoutExercise = "";
    state.previousWorkoutLoaded = false;
    $("#previous-hint").textContent = t("add.previousHint");
    $("#previous-summary").textContent = t("add.previousHint");
}

function abortPreviousWorkoutRequest() {
    if (!previousWorkoutController) return;
    previousWorkoutController.abort();
    previousWorkoutController = null;
    previousWorkoutRequest = null;
    previousWorkoutRequestExercise = "";
}

function findPreviousWorkoutForSelectedExercise() {
    const selected = $("#workout-exercise").value;
    return state.previousWorkoutExercise === selected ? state.previousWorkout : null;
}

function setPreviousWorkoutSummary(workout, selected) {
    if (!workout) {
        $("#previous-hint").textContent = selected ? t("add.noPrevious") : t("add.previousHint");
        $("#previous-summary").textContent = selected ? t("add.noPrevious") : t("add.previousHint");
        return;
    }

    $("#previous-hint").textContent = interpolate(t("add.previousLoaded"), {details: workoutDetail(workout)});
    $("#previous-summary").textContent = workoutDetail(workout);
}

async function updatePreviousWorkoutSummary() {
    const selected = $("#workout-exercise").value;
    if (!$("#workout-sets").value) $("#workout-sets").value = "3";
    if (!$("#workout-reps").value) $("#workout-reps").value = "12";

    if (selected && state.previousWorkoutExercise === selected && state.previousWorkoutLoaded) {
        setPreviousWorkoutSummary(state.previousWorkout, selected);
        return state.previousWorkout;
    }

    if (selected && previousWorkoutRequest && previousWorkoutRequestExercise === selected) {
        return previousWorkoutRequest;
    }

    abortPreviousWorkoutRequest();
    state.previousWorkout = null;
    state.previousWorkoutExercise = selected;
    state.previousWorkoutLoaded = false;

    if (!selected) {
        setPreviousWorkoutSummary(null, selected);
        return null;
    }

    const controller = new AbortController();
    previousWorkoutController = controller;
    previousWorkoutRequestExercise = selected;

    previousWorkoutRequest = (async () => {
        const data = await api(`workouts/previous?exercise=${encodeURIComponent(selected)}`, {
            signal: controller.signal,
        });
        if (controller.signal.aborted || $("#workout-exercise").value !== selected) return null;
        state.previousWorkout = data.workout || null;
        state.previousWorkoutExercise = selected;
        state.previousWorkoutLoaded = true;
        setPreviousWorkoutSummary(state.previousWorkout, selected);
        return state.previousWorkout;
    })();

    try {
        return await previousWorkoutRequest;
    } catch (error) {
        if (error.name === "AbortError") return null;
        if ($("#workout-exercise").value === selected) {
            state.previousWorkout = null;
            state.previousWorkoutExercise = selected;
            state.previousWorkoutLoaded = true;
            setPreviousWorkoutSummary(null, selected);
        }
        throw error;
    } finally {
        if (previousWorkoutController === controller) {
            previousWorkoutController = null;
            previousWorkoutRequest = null;
            previousWorkoutRequestExercise = "";
        }
    }
}

async function applyPreviousWorkoutValues() {
    const previous = findPreviousWorkoutForSelectedExercise() || await updatePreviousWorkoutSummary();
    if (!previous) {
        return;
    }

    $("#workout-sets").value = previous.sets || "3";
    $("#workout-weight").value = previous.weight || "";
    $("#workout-reps").value = previous.repsOrTime || "12";
    setAddMode(previous.isTime ? "time" : "reps");
    setPreviousWorkoutSummary(previous, $("#workout-exercise").value);
}

function adjustNumberInput(input, delta) {
    const step = Number.parseFloat(input.step || "1");
    const min = input.min === "" ? null : Number.parseFloat(input.min);
    const current = input.value === "" ? (min ?? 0) : Number.parseFloat(input.value);
    const next = Number.isFinite(current) ? current + delta : (min ?? step);
    const clamped = min == null ? next : Math.max(min, next);
    input.value = Number.isInteger(clamped) ? String(clamped) : String(Number(clamped.toFixed(2)));
    input.dispatchEvent(new Event("change", {bubbles: true}));
}

async function loadProgress() {
    state.progressLoading = true;
    renderProgress();
    const exercise = $("#progress-exercise").value || state.exercises[0]?.name || "";
    $("#progress-period").value = state.progressPeriod;
    const params = new URLSearchParams();
    if (exercise) params.set("exercise", exercise);
    params.set("period", state.progressPeriod);
    try {
        state.progress = await api(`progress?${params.toString()}`);
        state.progressLoaded = true;
        if (state.progress.exercise) $("#progress-exercise").value = state.progress.exercise;
    } finally {
        state.progressLoading = false;
        renderProgress();
    }
}

function todayInputValue() {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function bindEvents() {
    $$("[data-tab]").forEach(button => button.addEventListener("click", () => setTab(button.dataset.tab)));
    setupHistoryInfiniteScroll();

    $$(".add-reps-control [data-mode]").forEach(button => button.addEventListener("click", () => {
        setAddMode(button.dataset.mode);
    }));

    $("#workout-notes").addEventListener("input", event => {
        $("#notes-count").textContent = String(event.target.value.length);
    });

    $("#edit-notes").addEventListener("input", event => {
        $("#edit-notes-count").textContent = String(event.target.value.length);
    });

    $("#workout-form").addEventListener("submit", async event => {
        event.preventDefault();
        if (state.savingWorkout) return;

        const saveMode = event.submitter?.dataset.saveMode || "next";
        state.savingWorkout = true;
        updateWorkoutFormState();

        try {
            await api("workouts", {
                method: "POST",
                body: JSON.stringify({
                    date: $("#workout-date").value,
                    exercise: $("#workout-exercise").value,
                    sets: $("#workout-sets").value,
                    weight: $("#workout-weight").value,
                    repsOrTime: $("#workout-reps").value,
                    isTime: state.mode === "time",
                    notes: $("#workout-notes").value,
                }),
            });
            clearWorkoutInputs();
            await refreshAll();
            showToast("toast.added");
            if (saveMode === "finish") {
                setTab("dashboard");
            } else {
                setTab("add");
                $("#workout-exercise").focus();
            }
        } catch (error) {
            console.error(error);
            showToast("toast.saveFailed");
        } finally {
            state.savingWorkout = false;
            updateWorkoutFormState();
        }
    });

    $("#exercise-form").addEventListener("submit", async event => {
        event.preventDefault();
        const data = await api("exercises", {
            method: "POST",
            body: JSON.stringify({
                name: $("#exercise-name").value,
                notes: $("#exercise-notes").value,
            }),
        });
        state.exercises = data.exercises;
        $("#exercise-form").reset();
        await refreshAll();
        showToast("toast.exerciseAdded");
    });

    let exerciseSearchTimer;
    $("#exercise-search").addEventListener("input", event => {
        state.exerciseSearch = event.target.value.trim();
        window.clearTimeout(exerciseSearchTimer);
        exerciseSearchTimer = window.setTimeout(async () => {
            if (state.exerciseScope === "global") {
                await loadGlobalExercises();
            } else {
                renderExercises();
            }
        }, 220);
    });

    $$("#exercise-scope button").forEach(button => button.addEventListener("click", async () => {
        state.exerciseScope = button.dataset.scope;
        renderExerciseScope();
        if (state.exerciseScope === "global") {
            await loadGlobalExercises();
        }
    }));

    $("#progress-exercise").addEventListener("change", loadProgress);
    $$("#progress-metric button").forEach(button => button.addEventListener("click", () => {
        state.progressMetric = button.dataset.metric;
        $$("#progress-metric button").forEach(item => item.classList.toggle("active", item === button));
        renderProgress();
    }));
    $("#progress-period").addEventListener("change", async event => {
        state.progressPeriod = event.target.value;
        await loadProgress();
    });

    $("#settings-form").addEventListener("submit", async event => {
        event.preventDefault();
        updateSettingsPreview();
        const data = await api("settings", {
            method: "PATCH",
            body: JSON.stringify({
                language: $("#language-select").value,
                timezone: $("#timezone-input").value,
                theme: state.theme,
                accentColor: state.accentColor,
            }),
        });
        state.user = data.user;
        state.theme = data.user.theme || state.theme;
        state.accentColor = data.user.accentColor || state.accentColor;
        applyTheme();
        await refreshAll();
    });
    $("#theme-select").addEventListener("change", updateSettingsPreview);
    $("#accent-select").addEventListener("click", event => {
        const button = event.target.closest("[data-accent-color]");
        if (!button) return;
        $$("#accent-select [data-accent-color]").forEach(item => item.classList.toggle("active", item === button));
        updateSettingsPreview();
    });
    $("#language-select").addEventListener("change", () => {
        if (state.user) state.user = {...state.user, language: $("#language-select").value};
        applyI18n();
    });

    $("#logout-button").addEventListener("click", async () => {
        await authApi("logout", {method: "POST"});
        state.user = null;
        state.settingsLoaded = false;
        renderSettings();
        await showAuthScreen();
        showToast("toast.loggedOut");
    });

    $("#use-previous").addEventListener("click", async () => {
        try {
            await applyPreviousWorkoutValues();
        } catch (error) {
            console.error(error);
        }
    });

    $("#workout-exercise").addEventListener("change", () => {
        updatePreviousWorkoutSummary().catch(console.error);
    });

    document.addEventListener("click", event => {
        const stepButton = event.target.closest("[data-step-target]");
        if (!stepButton) return;

        const input = document.getElementById(stepButton.dataset.stepTarget);
        if (input) adjustNumberInput(input, Number.parseFloat(stepButton.dataset.step));
    });

    $$(".edit-reps-control [data-mode]").forEach(button => button.addEventListener("click", () => setEditMode(button.dataset.mode)));
    $("#edit-close").addEventListener("click", () => $("#edit-dialog").close());
    $("#edit-dialog").addEventListener("close", () => {
        document.body.classList.remove("sheet-open");
    });
    $("#edit-form").addEventListener("submit", async event => {
        event.preventDefault();
        await saveEditedWorkout();
    });
    $("#edit-delete").addEventListener("click", async () => {
        const id = $("#edit-id").value;
        if (await deleteWorkout(id)) {
            $("#edit-dialog").close();
        }
    });
    $("#delete-workout-cancel").addEventListener("click", () => {
        $("#delete-workout-dialog").close();
        resolveDeleteWorkoutConfirmation(false);
    });
    $("#delete-workout-confirm").addEventListener("click", () => {
        $("#delete-workout-dialog").close();
        resolveDeleteWorkoutConfirmation(true);
    });
    $("#delete-workout-dialog").addEventListener("close", () => {
        resolveDeleteWorkoutConfirmation(false);
    });
    $("#exercise-close").addEventListener("click", () => $("#exercise-dialog").close());
    $("#exercise-edit-form").addEventListener("submit", async event => {
        event.preventDefault();
        await saveExerciseNotes();
    });
    $("#exercise-delete").addEventListener("click", async () => {
        await deleteExercise($("#exercise-edit-name").value);
    });

    document.addEventListener("click", async event => {
        const quickAddButton = event.target.closest("[data-action='quick-add']");
        if (quickAddButton) {
            if (!state.appReady) return;
            setTab("add");
            return;
        }

        const editButton = event.target.closest("[data-edit-workout]");
        if (editButton) {
            const workout = findWorkout(editButton.dataset.editWorkout);
            if (workout) {
                try {
                    openEditDialog(workout);
                } catch (error) {
                    console.error(error);
                    showToast("toast.editOpenFailed");
                }
            }
            return;
        }

        const deleteButton = event.target.closest("[data-delete-workout]");
        if (deleteButton) {
            await deleteWorkout(deleteButton.dataset.deleteWorkout);
            return;
        }

        const editExerciseButton = event.target.closest("[data-edit-exercise]");
        if (editExerciseButton) {
            const exercise = findExercise(editExerciseButton.dataset.editExercise);
            if (exercise) openExerciseDialog(exercise);
            return;
        }

        const deleteExerciseButton = event.target.closest("[data-delete-exercise]");
        if (deleteExerciseButton) {
            await deleteExercise(deleteExerciseButton.dataset.deleteExercise);
            return;
        }

        const addGlobalButton = event.target.closest("[data-add-global-exercise]");
        if (addGlobalButton) {
            await addGlobalExercise(addGlobalButton.dataset.addGlobalExercise);
        }
    });
}

function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(error => {
            console.warn("Service worker registration failed:", error);
        });
    });
}

$("#workout-date").value = todayInputValue();
document.body.dataset.tab = state.tab;
configureAuth({applyTheme, refreshAll});
setUnauthorizedHandler(showAuthScreen);
bindEvents();
applyTheme();
registerServiceWorker();
ensureAuth().catch(async error => {
    console.error(error);
    await showAuthScreen(error.message);
});
