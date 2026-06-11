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
let sheetAnimationSeq = 0;
let addScreenCloseTimer = null;
let workoutSwipe = null;
let pullRefresh = null;

const HISTORY_PAGE_SIZE = 8;
const HISTORY_INITIAL_SIZE = 24;
const PULL_REFRESH_THRESHOLD = 42;
const PULL_REFRESH_READY_DELAY = 250;
const PULL_REFRESH_REQUEST_DELAY = 220;
const PULL_REFRESH_MIN_VISIBLE = 760;
const VALID_TABS = new Set(["dashboard", "history", "add", "progress", "exercises", "settings"]);
const WORKOUT_SWIPE_WIDTH = 104;

function tabFromUrl() {
    const tab = new URL(window.location.href).searchParams.get("tab");
    return VALID_TABS.has(tab) ? tab : "dashboard";
}

function tabUrl(tab) {
    const url = new URL(window.location.href);
    if (tab === "dashboard") {
        url.searchParams.delete("tab");
    } else {
        url.searchParams.set("tab", tab);
    }
    return `${url.pathname}${url.search}${url.hash}`;
}

function syncTabUrl(tab, {replace = false} = {}) {
    const next = tabUrl(tab);
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next === current) return;
    window.history[replace ? "replaceState" : "pushState"]({tab}, "", next);
}

function setHeadingSkeleton(visible) {
    $("#screen-title").classList.toggle("heading-skeleton", visible);
    $("#screen-subtitle").classList.toggle("heading-skeleton", visible);
    if (visible) {
        $("#screen-title").textContent = "";
        $("#screen-subtitle").textContent = "";
    }
}

function workoutRow(workout) {
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

function dashboardWorkoutRow(workout) {
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

function exerciseNote(name) {
    return state.exercises.find(exercise => exercise.name === name)?.notes || "";
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
        setHeadingSkeleton(false);
        $("#screen-title").textContent = t("screens.dashboard");
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
    if (state.tab === "dashboard") {
        setHeadingSkeleton(true);
    }
    if (skeleton) skeleton.hidden = false;
    if (content) content.hidden = true;
}

function hideDashboardSkeleton() {
    const skeleton = $("#dashboard-skeleton");
    const content = $("#dashboard-content");
    if (skeleton) skeleton.hidden = true;
    if (content) content.hidden = false;
    setHeadingSkeleton(false);
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

function updateEditWorkoutFormState() {
    const disabled = Boolean(state.savingEditedWorkout);
    $$("#edit-form input, #edit-form select, #edit-form textarea, #edit-form button").forEach(node => {
        node.disabled = disabled;
    });

    const saveButton = $("#edit-save-button");
    if (saveButton) {
        saveButton.textContent = state.savingEditedWorkout ? t("actions.saving") : t("actions.save");
        saveButton.classList.toggle("loading", state.savingEditedWorkout);
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
    $("#exercise-list").classList.toggle("history-workout-list", state.exerciseScope === "mine");

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
    const note = String(exercise.notes || "").trim();

    return `
        <article class="workout-row swipe-workout-row exercise-row" data-exercise-name="${escapeHtml(exercise.name)}">
            <button class="swipe-workout-main" type="button" data-edit-exercise="${escapeHtml(exercise.name)}">
                <span class="swipe-workout-body">
                    <h3>${escapeHtml(exercise.name)}</h3>
                    ${note ? `<p>${escapeHtml(note)}</p>` : ""}
                </span>
                <span class="swipe-workout-chevron" aria-hidden="true">›</span>
            </button>
            <button class="swipe-delete-action" type="button" data-delete-exercise="${escapeHtml(exercise.name)}">
                ${escapeHtml(t("actions.delete"))}
            </button>
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
    const stack = $("#toast");
    const toast = document.createElement("button");
    toast.className = "toast-item";
    toast.type = "button";
    toast.textContent = t(key);
    stack.append(toast);

    const dismiss = () => hideToast(toast);
    toast.addEventListener("click", dismiss, {once: true});
    toast.dismissTimer = window.setTimeout(dismiss, 2400);
    requestAnimationFrame(() => toast.classList.add("visible"));
}

function animateToastStack(stack, previousPositions) {
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

function hideToast(toast) {
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

function workoutFormFields(prefix) {
    return {
        date: $(`#${prefix}-date`),
        exercise: $(`#${prefix}-exercise`),
        sets: $(`#${prefix}-sets`),
        weight: $(`#${prefix}-weight`),
        reps: $(`#${prefix}-reps`),
        notes: $(`#${prefix}-notes`),
        notesCount: $(`#${prefix}-notes-count`),
        hasWeight: $(`#${prefix}-has-weight`),
        isTime: $(`#${prefix}-is-time`),
        controls: $(`#${prefix}-sets`).closest(".add-controls"),
        weightControl: $(`#${prefix}-weight`).closest(".weight-control"),
        repsControl: $(`#${prefix}-reps`).closest(".reps-control"),
    };
}

function setWorkoutFormMode(prefix, {hasWeight = true, isTime = false} = {}) {
    const fields = workoutFormFields(prefix);
    fields.hasWeight.checked = Boolean(hasWeight);
    fields.isTime.checked = Boolean(isTime);
    fields.controls.classList.toggle("no-weight", !fields.hasWeight.checked);
    fields.weight.disabled = !fields.hasWeight.checked;
    if (!fields.hasWeight.checked) fields.weight.value = "";

    const resultLabel = fields.repsControl.querySelector(":scope > span");
    const resultUnit = fields.repsControl.querySelector(".stepper-unit");
    const resultLabelKey = fields.isTime.checked ? "fields.time" : "fields.reps";
    const resultUnitKey = fields.isTime.checked ? "units.sec" : "units.reps";
    resultLabel.dataset.i18n = resultLabelKey;
    resultUnit.dataset.i18n = resultUnitKey;
    resultLabel.textContent = t(resultLabelKey);
    resultUnit.textContent = t(resultUnitKey);

    fields.hasWeight.closest(".option-check").querySelector("strong").textContent = t(fields.hasWeight.checked ? "fields.weight" : "fields.noWeight");
    fields.isTime.closest(".option-check").querySelector("strong").textContent = t(fields.isTime.checked ? "fields.time" : "fields.reps");

    if (prefix === "workout") state.mode = fields.isTime.checked ? "time" : "reps";
    if (prefix === "edit") state.editMode = fields.isTime.checked ? "time" : "reps";
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
    setWorkoutFormMode(prefix, {
        hasWeight: workout.weight !== "" && workout.weight != null,
        isTime: Boolean(workout.isTime),
    });
}

function readWorkoutFormValues(prefix) {
    const fields = workoutFormFields(prefix);
    return {
        date: fields.date.value,
        exercise: fields.exercise.value,
        sets: fields.sets.value,
        weight: fields.hasWeight.checked ? fields.weight.value : "",
        repsOrTime: fields.reps.value,
        isTime: fields.isTime.checked,
        notes: fields.notes.value,
    };
}

function refreshWorkoutFormModes() {
    ["workout", "edit"].forEach(prefix => {
        const fields = workoutFormFields(prefix);
        setWorkoutFormMode(prefix, {
            hasWeight: fields.hasWeight.checked,
            isTime: fields.isTime.checked,
        });
    });
}

function openEditDialog(workout) {
    state.savingEditedWorkout = false;
    $("#edit-id").value = workout.id;
    setWorkoutFormValues("edit", workout);
    updateEditWorkoutFormState();
    openSheetDialog($("#edit-dialog"));
}

function animateSheetElement(sheet, direction, onFinish) {
    if (!sheet) {
        onFinish?.();
        return;
    }
    const animationToken = String(++sheetAnimationSeq);
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
            {opacity: 0, transform: "translateY(32px) scale(.985)"},
            {opacity: 1, transform: "translateY(0) scale(1)"},
        ]
        : [
            {opacity: 1, transform: "translateY(0) scale(1)"},
            {opacity: 0, transform: "translateY(34px) scale(.985)"},
        ];

    requestAnimationFrame(() => {
        if (sheet.dataset.sheetAnimation !== animationToken) return;
        const animation = sheet.animate(frames, {
            duration: direction === "in" ? 260 : 210,
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

function animateAddScreenOpen() {
    window.clearTimeout(addScreenCloseTimer);
    const sheet = $("#screen-add .add-sheet");
    if (!sheet) return;
    sheet.style.opacity = "0";
    sheet.style.transform = "translateY(32px) scale(.985)";
    animateSheetElement(sheet, "in");
}

function animateAddScreenClose(nextTab, options = {}) {
    const sheet = $("#screen-add .add-sheet");
    animateSheetElement(sheet, "out", () => setTab(nextTab, {...options, animate: false}));
    addScreenCloseTimer = window.setTimeout(() => {
        if (state.tab === "add") setTab(nextTab, {...options, animate: false});
    }, 260);
}

function navigateTab(tab, options = {}) {
    if (state.tab === "add" && tab !== "add") {
        animateAddScreenClose(tab, options);
        return;
    }
    setTab(tab, options);
}

function openSheetDialog(dialog) {
    if (dialog.open) return;
    const sheet = dialog.querySelector(".add-sheet");
    dialog.classList.remove("sheet-closing", "sheet-opening");
    document.body.classList.add("sheet-open");
    dialog.showModal();
    dialog.classList.add("sheet-opening");
    animateSheetElement(sheet, "in", () => {
        dialog.classList.remove("sheet-opening");
    });
}

function closeSheetDialog(dialog) {
    if (!dialog.open || dialog.classList.contains("sheet-closing")) return;
    const sheet = dialog.querySelector(".add-sheet");
    dialog.classList.add("sheet-closing");
    const finish = () => {
        if (!dialog.open) return;
        dialog.classList.remove("sheet-closing");
        dialog.close();
    };
    animateSheetElement(sheet, "out", finish);
}

function bindSheetDialog(dialogSelector, closeSelector) {
    const dialog = $(dialogSelector);
    $(closeSelector).addEventListener("click", () => closeSheetDialog(dialog));
    dialog.addEventListener("cancel", event => {
        event.preventDefault();
        closeSheetDialog(dialog);
    });
    dialog.addEventListener("close", () => {
        dialog.classList.remove("sheet-closing", "sheet-opening");
        document.body.classList.remove("sheet-open");
    });
}

function openModalDialog(dialog) {
    if (!dialog.open) dialog.showModal();
}

function closeModalDialog(dialog) {
    if (dialog?.open) dialog.close();
}

function bindModalDialog(dialogSelector, closeSelector) {
    const dialog = $(dialogSelector);
    $(closeSelector).addEventListener("click", () => closeModalDialog(dialog));
}

function resolveDeleteConfirmation(confirmed) {
    if (!deleteWorkoutConfirmResolve) return;
    const resolve = deleteWorkoutConfirmResolve;
    deleteWorkoutConfirmResolve = null;
    resolve(confirmed);
}

function confirmDelete({titleKey, bodyKey}) {
    const dialog = $("#delete-workout-dialog");
    if (dialog.open) return Promise.resolve(false);
    $("#delete-workout-title").textContent = t(titleKey);
    $("#delete-workout-copy").textContent = t(bodyKey);
    dialog.showModal();
    return new Promise(resolve => {
        deleteWorkoutConfirmResolve = resolve;
    });
}

function confirmWorkoutDelete() {
    return confirmDelete({titleKey: "deleteWorkout.title", bodyKey: "deleteWorkout.body"});
}

function confirmExerciseDelete() {
    return confirmDelete({titleKey: "deleteExercise.title", bodyKey: "deleteExercise.body"});
}

async function deleteWorkout(id) {
    if (!await confirmWorkoutDelete()) return false;
    try {
        await api(`workouts/${id}`, {method: "DELETE"});
        $("#delete-workout-dialog").close();
        removeWorkoutFromLoadedState(id);
        showToast("toast.deleted");
        return true;
    } catch (error) {
        console.error(error);
        showToast("toast.deleteFailed");
        return false;
    } finally {
        setDeleteWorkoutPending(false);
    }
}

function closeSwipeRows(except = null) {
    $$(".swipe-workout-row.open").forEach(row => {
        if (row !== except) {
            row.classList.remove("open");
            row.style.removeProperty("--swipe-main-height");
            row.style.removeProperty("--swipe-title-lines");
        }
    });
}

function bindWorkoutSwipeActions() {
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
        workoutSwipe = {
            row,
            main,
            action: row.querySelector(".swipe-delete-action"),
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startProgress: row.classList.contains("open") ? 1 : 0,
            currentProgress: row.classList.contains("open") ? 1 : 0,
            active: false,
        };
        main.setPointerCapture?.(event.pointerId);
    });

    document.addEventListener("pointermove", event => {
        if (!workoutSwipe || event.pointerId !== workoutSwipe.pointerId) return;

        const dx = event.clientX - workoutSwipe.startX;
        const dy = event.clientY - workoutSwipe.startY;
        if (!workoutSwipe.active) {
            if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
                workoutSwipe = null;
                return;
            }
            if (Math.abs(dx) < 8) return;
            workoutSwipe.active = true;
            workoutSwipe.row.classList.add("swiping");
        }

        event.preventDefault();
        const progress = Math.min(1, Math.max(0, workoutSwipe.startProgress - dx / WORKOUT_SWIPE_WIDTH));
        workoutSwipe.currentProgress = progress;
        workoutSwipe.main.style.transform = `translateX(${-18 * progress}px)`;
        if (workoutSwipe.action) {
            workoutSwipe.action.style.transform = `translateX(${(1 - progress) * 100}%)`;
        }
    }, {passive: false});

    const finishSwipe = event => {
        if (!workoutSwipe || event.pointerId !== workoutSwipe.pointerId) return;

        const {row, main, action, currentProgress, active} = workoutSwipe;
        row.classList.remove("swiping");
        main.style.transform = "";
        if (action) action.style.transform = "";
        row.classList.toggle("open", active && currentProgress > .5);
        if (!row.classList.contains("open")) {
            row.style.removeProperty("--swipe-main-height");
            row.style.removeProperty("--swipe-title-lines");
        }
        if (active) {
            row.dataset.suppressClick = "true";
            window.setTimeout(() => delete row.dataset.suppressClick, 180);
        }
        workoutSwipe = null;
    };

    document.addEventListener("pointerup", finishSwipe);
    document.addEventListener("pointercancel", finishSwipe);
}

async function saveEditedWorkout() {
    if (state.savingEditedWorkout) return;
    const id = $("#edit-id").value;
    state.savingEditedWorkout = true;
    updateEditWorkoutFormState();
    try {
        const workout = await api(`workouts/${id}`, {
            method: "PATCH",
            body: JSON.stringify(readWorkoutFormValues("edit")),
        });
        closeSheetDialog($("#edit-dialog"));
        updateWorkoutInLoadedState(workout);
        showToast("toast.saved");
    } finally {
        state.savingEditedWorkout = false;
        updateEditWorkoutFormState();
    }
}

function findExercise(name) {
    return state.exercises.find(ex => ex.name === name);
}

function syncExerciseState(exercises) {
    state.exercises = exercises;
    const byName = new Map(exercises.map(exercise => [exercise.name, exercise]));
    state.recentExercises = (state.recentExercises || []).map(exercise => ({
        ...exercise,
        ...(byName.get(exercise.name) || {}),
    }));
    renderSettingsExerciseSummary();
    renderSettingsExercises();
}

function openExerciseDialog(exercise) {
    const current = findExercise(exercise.name) || exercise;
    $("#exercise-edit-name").value = current.name;
    $("#exercise-edit-title").textContent = current.name;
    $("#exercise-edit-notes").value = current.notes || "";
    openModalDialog($("#exercise-dialog"));
}

function openExerciseAddDialog() {
    $("#exercise-form").reset();
    openModalDialog($("#exercise-add-dialog"));
}

function setExerciseEditPending(pending) {
    state.savingExercise = pending;
    const saveButton = $("#exercise-edit-save");
    saveButton.disabled = pending;
    saveButton.classList.toggle("loading", pending);
    saveButton.textContent = pending ? t("actions.saving") : t("actions.save");
    $$("#exercise-edit-form input, #exercise-edit-form textarea, #exercise-edit-form button").forEach(node => {
        if (node.id !== "exercise-edit-save") node.disabled = pending;
    });
}

function setExerciseAddPending(pending) {
    state.savingExercise = pending;
    const saveButton = $("#exercise-add-save");
    saveButton.disabled = pending;
    saveButton.classList.toggle("loading", pending);
    saveButton.textContent = pending ? t("actions.saving") : t("actions.addExercise");
    $$("#exercise-form input, #exercise-form textarea, #exercise-form button").forEach(node => {
        if (node.id !== "exercise-add-save") node.disabled = pending;
    });
}

async function loadGlobalExercises() {
    const params = new URLSearchParams();
    if (state.exerciseSearch) params.set("search", state.exerciseSearch);
    const data = await api(`exercises/global${params.toString() ? `?${params.toString()}` : ""}`);
    state.globalExercises = data.exercises || [];
    renderExercises();
}

async function saveExerciseNotes() {
    if (state.savingExercise) return;
    const name = $("#exercise-edit-name").value;
    setExerciseEditPending(true);
    try {
        const data = await api(`exercises/${encodeURIComponent(name)}`, {
            method: "PATCH",
            body: JSON.stringify({notes: $("#exercise-edit-notes").value}),
        });
        syncExerciseState(data.exercises);
        closeModalDialog($("#exercise-dialog"));
        if (state.dashboard) renderDashboard();
        if (state.history?.loaded) renderHistory();
        renderExercises();
        showToast("toast.exerciseSaved");
    } finally {
        setExerciseEditPending(false);
    }
}

async function deleteExercise(name) {
    if (state.savingExercise) return;
    if (!await confirmExerciseDelete()) return;
    try {
        const data = await api(`exercises/${encodeURIComponent(name)}`, {method: "DELETE"});
        syncExerciseState(data.exercises);
        closeModalDialog($("#exercise-dialog"));
        $("#delete-workout-dialog").close();
        await refreshAll();
        showToast("toast.exerciseDeleted");
    } catch (error) {
        console.error(error);
        showToast("toast.exerciseDeleteFailed");
    } finally {
        setDeleteWorkoutPending(false);
    }
}

async function addGlobalExercise(name) {
    const data = await api("exercises", {
        method: "POST",
        body: JSON.stringify({name, notes: ""}),
    });
    syncExerciseState(data.exercises);
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
    const isInitialLoading = !state.progressLoaded;
    $("#progress-skeleton").hidden = !isInitialLoading;
    $("#progress-content").hidden = isInitialLoading;
    if (isInitialLoading) return;

    updateProgressMetricControls(data);

    if (!data?.points?.length) {
        renderProgressChartEmpty(t("empty.progress"));
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
    if (data.points.length < 2) {
        renderProgressChartEmpty(t("progress.notEnoughData"));
    } else {
        ensureProgressChart();
        drawChart(data.points, metric);
    }
}

function updateProgressMetricControls(data) {
    const availableMetrics = progressAvailableMetrics(data);
    if (!availableMetrics.includes(state.progressMetric)) {
        state.progressMetric = availableMetrics[0] || "repsOrTime";
    }

    $$("#progress-metric button").forEach(button => {
        const metric = button.dataset.metric;
        const visible = availableMetrics.includes(metric);
        button.hidden = !visible;
        button.classList.toggle("active", metric === state.progressMetric);
        if (metric === "repsOrTime") {
            button.textContent = progressResultMetricLabel(data);
        }
    });
}

function progressAvailableMetrics(data) {
    const points = data?.points || [];
    const hasWeight = Boolean(data?.summary?.hasWeight) || points.some(point => point.weight != null && Number(point.weight) > 0);
    return [
        hasWeight ? "weight" : null,
        "repsOrTime",
        "sets",
    ].filter(Boolean);
}

function progressResultMetricLabel(data) {
    return data?.summary?.isTime ? t("progress.seconds") : t("progress.repsTime");
}

function ensureProgressChart() {
    const wrap = $(".progress-chart-wrap");
    if ($("#progress-chart")) return;
    wrap.classList.remove("empty");
    wrap.innerHTML = `<svg id="progress-chart" viewBox="0 0 360 246" role="img" aria-label="Progress chart"></svg>`;
}

function renderProgressChartEmpty(message) {
    const wrap = $(".progress-chart-wrap");
    wrap.classList.add("empty");
    wrap.innerHTML = `<div class="progress-chart-empty">${escapeHtml(message)}</div>`;
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
    if (metric === "repsOrTime" && state.progress?.summary?.isTime) return `${formatted} ${t("units.sec")}`;
    return formatted;
}

function metricLabel(metric) {
    if (metric === "volume") return t("progress.volumeMetric");
    if (metric === "repsOrTime") return progressResultMetricLabel(state.progress);
    if (metric === "sets") return t("fields.sets");
    return t("progress.weight");
}

function renderProgressRecent(rows) {
    const data = state.progress;
    const metric = state.progressMetric;
    const metricValues = (data?.points || []).map(point => metricValue(point, metric));
    const uniqueMetricValues = new Set(metricValues);
    const bestMetricValue = Math.max(...metricValues, 0);
    const prPoint = uniqueMetricValues.size > 1
        ? (data?.points || []).find(point => metricValue(point, metric) === bestMetricValue)
        : null;
    $("#progress-recent").innerHTML = rows.length
        ? rows.map(row => `
            <button class="progress-record-row" type="button" data-edit-workout="${row.id}">
                <span class="progress-record-clock">◷</span>
                <span class="progress-record-body">
                    <strong>${escapeHtml(row.dateLabel)}</strong>
                    <small>${escapeHtml(workoutDetail(row))}</small>
                </span>
                ${prPoint?.id === row.id ? `<span class="progress-pr-badge">${t("progress.pr")}</span>` : ""}
                <span class="progress-record-chevron">›</span>
            </button>
        `).join("")
        : `<div class="empty">${t("empty.progress")}</div>`;
}

function removeWorkoutFromLoadedState(id) {
    const workoutId = String(id);
    const removeFromArray = rows => (rows || []).filter(row => String(row.id) !== workoutId);

    if (state.dashboard) {
        const nextRecent = removeFromArray(state.dashboard.recent);
        state.dashboard = {
            ...state.dashboard,
            today: {
                ...state.dashboard.today,
                workouts: removeFromArray(state.dashboard.today?.workouts),
            },
            recent: nextRecent,
            lastSession: String(state.dashboard.lastSession?.id) === workoutId ? (nextRecent[0] || null) : state.dashboard.lastSession,
        };
        renderDashboard();
    }

    if (state.history?.groups?.length) {
        state.history = {
            ...state.history,
            groups: state.history.groups
                .map(group => ({
                    ...group,
                    workouts: removeFromArray(group.workouts),
                }))
                .filter(group => group.workouts.length),
        };
        renderHistory();
    }

    if (state.progress) {
        state.progress = {
            ...state.progress,
            points: removeFromArray(state.progress.points),
            recent: removeFromArray(state.progress.recent),
        };
        renderProgress();
    }
}

function replaceWorkoutInRows(rows, workout) {
    return (rows || []).map(row => String(row.id) === String(workout.id) ? workout : row);
}

function upsertWorkoutInRows(rows, workout) {
    const next = replaceWorkoutInRows(rows, workout);
    return next.some(row => String(row.id) === String(workout.id)) ? next : [...next, workout];
}

function updateWorkoutInLoadedState(workout) {
    const workoutId = String(workout.id);
    const dateKey = workoutDateInputValue(workout);
    const removeFromArray = rows => (rows || []).filter(row => String(row.id) !== workoutId);

    if (state.dashboard) {
        const recent = replaceWorkoutInRows(state.dashboard.recent, workout);
        state.dashboard = {
            ...state.dashboard,
            today: {
                ...state.dashboard.today,
                workouts: dateKey === todayInputValue()
                    ? upsertWorkoutInRows(state.dashboard.today?.workouts, workout)
                    : removeFromArray(state.dashboard.today?.workouts),
            },
            recent,
            lastSession: String(state.dashboard.lastSession?.id) === workoutId ? workout : state.dashboard.lastSession,
        };
        renderDashboard();
    }

    if (state.history?.groups?.length) {
        state.history = {
            ...state.history,
            groups: state.history.groups
                .map(group => {
                    const withoutEdited = removeFromArray(group.workouts);
                    if (group.date !== dateKey) return {...group, workouts: withoutEdited};
                    return {
                        ...group,
                        workouts: [...withoutEdited, workout].sort((a, b) => Number(a.id) - Number(b.id)),
                    };
                })
                .filter(group => group.workouts.length),
        };
        renderHistory();
    }

    if (state.progress) {
        state.progress = {
            ...state.progress,
            points: replaceWorkoutInRows(state.progress.points, workout),
            recent: replaceWorkoutInRows(state.progress.recent, workout),
        };
        renderProgress();
    }

    renderExercises();
    if (state.tab === "add") {
        updatePreviousWorkoutSummary().catch(console.error);
    }
}

function addWorkoutToLoadedState(workout, dateKey) {
    if (state.dashboard) {
        const isToday = dateKey === todayInputValue();
        const recent = [workout, ...(state.dashboard.recent || []).filter(row => String(row.id) !== String(workout.id))].slice(0, 8);
        state.dashboard = {
            ...state.dashboard,
            today: {
                ...state.dashboard.today,
                workouts: isToday
                    ? [...(state.dashboard.today?.workouts || []), workout]
                    : (state.dashboard.today?.workouts || []),
            },
            recent,
            lastSession: recent[0] || workout,
        };
        renderDashboard();
    }

    if (state.history?.groups?.length) {
        state.history = {
            ...state.history,
            groups: state.history.groups.map(group => {
                if (group.date !== dateKey) return group;
                const workouts = [...group.workouts.filter(row => String(row.id) !== String(workout.id)), workout]
                    .sort((a, b) => Number(a.id) - Number(b.id));
                return {...group, workouts};
            }),
        };
        renderHistory();
    }
}

function setDeleteWorkoutPending(pending) {
    state.deletingWorkout = pending;
    const cancelButton = $("#delete-workout-cancel");
    const confirmButton = $("#delete-workout-confirm");
    cancelButton.disabled = pending;
    confirmButton.disabled = pending;
    confirmButton.classList.toggle("loading", pending);
    confirmButton.textContent = pending ? t("actions.deleting") : t("actions.delete");
}

function setSettingsPending(pending) {
    state.savingSettings = pending;
    const saveButton = $("#settings-save-button");
    saveButton.disabled = pending;
    saveButton.classList.toggle("loading", pending);
}

function renderSettingsExerciseSummary() {
    const count = $("#settings-exercises-count");
    if (count) count.textContent = String(state.exercises.length);
}

function renderSettingsExercises() {
    const list = $("#settings-exercise-list");
    if (!list) return;
    list.innerHTML = state.exercises.length
        ? state.exercises.map(userExerciseRow).join("")
        : `<div class="empty">${t("empty.exercises")}</div>`;
}

function openSettingsExercisesDialog() {
    renderSettingsExercises();
    openSheetDialog($("#settings-exercises-dialog"));
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
    renderSettingsExerciseSummary();
    setSettingsPending(Boolean(state.savingSettings));
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
    return state.progress?.summary?.isTime ? t("units.sec") : t("progress.repsTime").toLowerCase();
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

function setTab(tab, options = {}) {
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
    if (tab === "add") {
        window.scrollTo({top: 0, behavior: "instant"});
        if (previousTab !== "add" && options.animate !== false) animateAddScreenOpen();
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
    refreshWorkoutFormModes();
    ensureHistoryLoaded();
    ensureProgressLoaded();
    if (state.tab === "add") {
        updatePreviousWorkoutSummary().catch(console.error);
    }
}

async function refreshDashboardOnly() {
    const [recentExercises, dashboard] = await Promise.all([
        api("exercises/recent?limit=10"),
        api("dashboard"),
    ]);
    state.recentExercises = recentExercises.exercises || [];
    state.dashboard = dashboard;
    renderDashboard();
    renderExercises();
}

async function refreshHistoryOnly() {
    const data = await api(`history?offset=0&limit=${HISTORY_INITIAL_SIZE}`);
    state.history = {
        groups: data.groups || [],
        hasMore: Boolean(data.hasMore),
        nextOffset: data.nextOffset || 0,
        loading: false,
        loaded: true,
    };
    renderHistory();
}

async function refreshActivePullTab() {
    await delay(PULL_REFRESH_REQUEST_DELAY);
    if (state.tab === "dashboard") {
        await refreshDashboardOnly();
        return;
    }
    if (state.tab === "history") {
        await refreshHistoryOnly();
    }
}

function delay(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
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
    setWorkoutFormMode("workout", {hasWeight: true, isTime: false});
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
    setWorkoutFormMode("workout", {
        hasWeight: previous.weight !== "" && previous.weight != null,
        isTime: Boolean(previous.isTime),
    });
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

function releaseNativeSelect(select) {
    if (document.activeElement === select) select.blur();
}

function openDatePicker(input) {
    if (!input) return;
    input.focus();
    if (typeof input.showPicker === "function") {
        try {
            input.showPicker();
        } catch {
            // Some browsers only allow showPicker for direct user gestures.
        }
    }
}

function bindNativeSelectFocusRelease() {
    document.addEventListener("pointerdown", event => {
        const activeSelect = document.activeElement?.matches?.("select") ? document.activeElement : null;
        if (!activeSelect) return;

        const targetSelect = event.target.closest?.("select");
        if (!targetSelect) {
            activeSelect.blur();
        }
    }, {capture: true, passive: true});
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

function updateViewportInsets() {
    const viewport = window.visualViewport;
    const active = document.activeElement;
    const inputFocused = active?.matches?.("input, textarea, select, [contenteditable='true']");
    const viewportLoss = viewport ? window.innerHeight - viewport.height : 0;
    document.body.classList.toggle("keyboard-open", Boolean(inputFocused && viewportLoss > 120));
    document.documentElement.style.setProperty("--viewport-bottom-offset", "0px");
}

function bindViewportInsets() {
    updateViewportInsets();
    window.addEventListener("resize", updateViewportInsets, {passive: true});
    window.addEventListener("focusin", updateViewportInsets, {passive: true});
    window.addEventListener("focusout", () => window.setTimeout(updateViewportInsets, 0), {passive: true});
    window.visualViewport?.addEventListener("resize", updateViewportInsets, {passive: true});
    window.visualViewport?.addEventListener("scroll", updateViewportInsets, {passive: true});
}

function bindHistoryNavigation() {
    window.history.replaceState({tab: state.tab}, "", tabUrl(state.tab));
    window.addEventListener("popstate", () => {
        navigateTab(tabFromUrl(), {updateUrl: false, force: true});
    });
}

function setPullRefreshIndicator({visible = false, ready = false, refreshing = false, offset = 0} = {}) {
    const indicator = $("#pull-refresh");
    indicator.classList.toggle("visible", visible || refreshing);
    indicator.classList.toggle("ready", ready);
    indicator.classList.toggle("refreshing", refreshing);
    indicator.style.setProperty("--pull-offset", `${Math.round(offset)}px`);
    indicator.style.setProperty("--pull-progress", String(Math.min(offset / PULL_REFRESH_THRESHOLD, 1)));
    $(".pull-refresh-label").textContent = refreshing
        ? t("actions.refreshing")
        : ready
        ? t("actions.releaseToRefresh")
        : t("actions.pullToRefresh");
}

function renderPullRefreshFrame() {
    if (!pullRefresh?.active || state.pullRefreshing) return;
    const delta = pullRefresh.targetOffset - pullRefresh.renderedOffset;
    pullRefresh.renderedOffset += delta * .26;
    if (Math.abs(delta) < .35) {
        pullRefresh.renderedOffset = pullRefresh.targetOffset;
    }
    setPullRefreshIndicator({
        visible: true,
        ready: pullRefresh.armed,
        offset: pullRefresh.renderedOffset,
    });
    if (pullRefresh.renderedOffset !== pullRefresh.targetOffset) {
        pullRefresh.frame = window.requestAnimationFrame(renderPullRefreshFrame);
        return;
    }
    pullRefresh.frame = null;
}

function schedulePullRefreshFrame() {
    if (!pullRefresh || pullRefresh.frame) return;
    pullRefresh.frame = window.requestAnimationFrame(renderPullRefreshFrame);
}

function canStartPullRefresh(event) {
    if (!["dashboard", "history"].includes(state.tab)) return false;
    if (state.pullRefreshing || state.savingWorkout || state.deletingWorkout) return false;
    if (document.body.classList.contains("sheet-open")) return false;
    if (window.scrollY > 0) return false;

    const target = event.target;
    if (target?.closest?.("button, input, select, textarea, dialog, .bottom-nav, .toast-stack")) return false;
    if (state.tab === "history" && state.history?.loading) return false;
    return true;
}

function bindPullToRefresh() {
    const clearPullReadyTimer = () => {
        if (!pullRefresh?.readyTimer) return;
        window.clearTimeout(pullRefresh.readyTimer);
        pullRefresh.readyTimer = null;
    };

    const cancelPullFrame = () => {
        if (!pullRefresh?.frame) return;
        window.cancelAnimationFrame(pullRefresh.frame);
        pullRefresh.frame = null;
    };

    window.addEventListener("touchstart", event => {
        if (event.touches.length !== 1 || !canStartPullRefresh(event)) return;
        pullRefresh = {
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
        if (!pullRefresh || event.touches.length !== 1) return;

        const dy = event.touches[0].clientY - pullRefresh.startY;
        if (dy <= 0 && !pullRefresh.thresholdReached) {
            clearPullReadyTimer();
            cancelPullFrame();
            setPullRefreshIndicator();
            pullRefresh = null;
            return;
        }

        if (!pullRefresh.active && dy < 10) return;
        pullRefresh.active = true;
        const offset = Math.min(96, dy * .48);
        pullRefresh.offset = offset;
        if (offset >= PULL_REFRESH_THRESHOLD && !pullRefresh.thresholdReached) {
            pullRefresh.thresholdReached = true;
            pullRefresh.readyTimer = window.setTimeout(() => {
                if (!pullRefresh || !pullRefresh.thresholdReached || state.pullRefreshing) return;
                pullRefresh.armed = true;
                pullRefresh.targetOffset = Math.max(pullRefresh.offset, PULL_REFRESH_THRESHOLD);
                schedulePullRefreshFrame();
            }, PULL_REFRESH_READY_DELAY);
        }

        const displayOffset = pullRefresh.thresholdReached
            ? Math.max(offset, PULL_REFRESH_THRESHOLD)
            : offset;
        pullRefresh.targetOffset = displayOffset;
        schedulePullRefreshFrame();
        event.preventDefault();
    }, {passive: false});

    window.addEventListener("touchend", async () => {
        if (!pullRefresh) return;
        const shouldRefresh = pullRefresh.active && pullRefresh.thresholdReached;
        clearPullReadyTimer();
        cancelPullFrame();
        pullRefresh = null;

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
        pullRefresh = null;
        if (!state.pullRefreshing) setPullRefreshIndicator();
    }, {passive: true});
}

function bindEvents() {
    $$("[data-tab]").forEach(button => button.addEventListener("click", () => navigateTab(button.dataset.tab)));
    setupHistoryInfiniteScroll();

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
            const workoutDate = $("#workout-date").value;
            const workout = await api("workouts", {
                method: "POST",
                body: JSON.stringify(readWorkoutFormValues("workout")),
            });
            addWorkoutToLoadedState(workout, workoutDate);
            clearWorkoutInputs();
            showToast("toast.added");
            if (saveMode === "finish") {
                navigateTab("dashboard");
            } else {
                navigateTab("add");
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
        if (state.savingExercise) return;
        setExerciseAddPending(true);
        try {
            const data = await api("exercises", {
                method: "POST",
                body: JSON.stringify({
                    name: $("#exercise-name").value,
                    notes: $("#exercise-notes").value,
                }),
            });
            syncExerciseState(data.exercises);
            $("#exercise-form").reset();
            closeModalDialog($("#exercise-add-dialog"));
            await refreshAll();
            showToast("toast.exerciseAdded");
        } finally {
            setExerciseAddPending(false);
        }
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

    $("#progress-exercise").addEventListener("change", event => {
        releaseNativeSelect(event.currentTarget);
        loadProgress();
    });
    $$("#progress-metric button").forEach(button => button.addEventListener("click", () => {
        state.progressMetric = button.dataset.metric;
        $$("#progress-metric button").forEach(item => item.classList.toggle("active", item === button));
        renderProgress();
    }));
    $("#progress-period").addEventListener("change", async event => {
        releaseNativeSelect(event.currentTarget);
        state.progressPeriod = event.target.value;
        await loadProgress();
    });

    $("#settings-form").addEventListener("submit", async event => {
        event.preventDefault();
        if (state.savingSettings) return;
        setSettingsPending(true);
        updateSettingsPreview();
        try {
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
            showToast("toast.settingsSaved");
        } finally {
            setSettingsPending(false);
        }
    });
    $("#theme-select").addEventListener("change", event => {
        releaseNativeSelect(event.currentTarget);
        updateSettingsPreview();
    });
    $("#accent-select").addEventListener("click", event => {
        const button = event.target.closest("[data-accent-color]");
        if (!button) return;
        $$("#accent-select [data-accent-color]").forEach(item => item.classList.toggle("active", item === button));
        updateSettingsPreview();
    });
    $("#language-select").addEventListener("change", event => {
        releaseNativeSelect(event.currentTarget);
        if (state.user) state.user = {...state.user, language: $("#language-select").value};
        applyI18n();
        refreshWorkoutFormModes();
        if (state.progressLoaded) renderProgress();
    });

    $("#settings-exercises-open").addEventListener("click", openSettingsExercisesDialog);
    bindSheetDialog("#settings-exercises-dialog", "#settings-exercises-close");
    $("#settings-exercise-add-open").addEventListener("click", openExerciseAddDialog);

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

    $("#workout-exercise").addEventListener("change", event => {
        releaseNativeSelect(event.currentTarget);
        updatePreviousWorkoutSummary().catch(console.error);
    });
    $("#edit-exercise").addEventListener("change", event => {
        releaseNativeSelect(event.currentTarget);
    });

    $$(".date-field .field-shell").forEach(shell => {
        shell.addEventListener("click", event => {
            if (event.target.closest("input[type='date']")) return;
            const input = event.currentTarget.querySelector("input[type='date']");
            openDatePicker(input);
        });
    });

    document.addEventListener("click", event => {
        const stepButton = event.target.closest("[data-step-target]");
        if (!stepButton) return;

        const input = document.getElementById(stepButton.dataset.stepTarget);
        if (input) adjustNumberInput(input, Number.parseFloat(stepButton.dataset.step));
    });

    ["workout", "edit"].forEach(prefix => {
        workoutFormFields(prefix).hasWeight.addEventListener("change", () => setWorkoutFormMode(prefix, {
            hasWeight: workoutFormFields(prefix).hasWeight.checked,
            isTime: workoutFormFields(prefix).isTime.checked,
        }));
        workoutFormFields(prefix).isTime.addEventListener("change", () => setWorkoutFormMode(prefix, {
            hasWeight: workoutFormFields(prefix).hasWeight.checked,
            isTime: workoutFormFields(prefix).isTime.checked,
        }));
    });
    bindSheetDialog("#edit-dialog", "#edit-close");
    $("#edit-form").addEventListener("submit", async event => {
        event.preventDefault();
        await saveEditedWorkout();
    });
    $("#edit-save-button").addEventListener("click", async event => {
        event.preventDefault();
        await saveEditedWorkout();
    });
    $("#delete-workout-cancel").addEventListener("click", () => {
        if (state.deletingWorkout) return;
        $("#delete-workout-dialog").close();
        resolveDeleteConfirmation(false);
    });
    $("#delete-workout-confirm").addEventListener("click", () => {
        if (state.deletingWorkout) return;
        setDeleteWorkoutPending(true);
        resolveDeleteConfirmation(true);
    });
    $("#delete-workout-dialog").addEventListener("cancel", event => {
        if (!state.deletingWorkout) return;
        event.preventDefault();
    });
    $("#delete-workout-dialog").addEventListener("close", () => {
        if (state.deletingWorkout) return;
        setDeleteWorkoutPending(false);
        resolveDeleteConfirmation(false);
    });
    $("#exercise-add-open").addEventListener("click", openExerciseAddDialog);
    bindModalDialog("#exercise-add-dialog", "#exercise-add-close");
    bindModalDialog("#exercise-dialog", "#exercise-close");
    $("#exercise-edit-form").addEventListener("submit", async event => {
        event.preventDefault();
        await saveExerciseNotes();
    });
    $("#exercise-edit-save").addEventListener("click", async event => {
        event.preventDefault();
        await saveExerciseNotes();
    });
    document.addEventListener("click", async event => {
        const quickAddButton = event.target.closest("[data-action='quick-add']");
        if (quickAddButton) {
            if (!state.appReady) return;
            navigateTab("add");
            return;
        }

        const deleteButton = event.target.closest("[data-delete-workout]");
        if (deleteButton) {
            closeSwipeRows();
            await deleteWorkout(deleteButton.dataset.deleteWorkout);
            return;
        }

        const editButton = event.target.closest("[data-edit-workout]");
        if (editButton) {
            const swipeRow = editButton.closest(".swipe-workout-row");
            if (swipeRow?.dataset.suppressClick === "true") return;
            if (swipeRow?.classList.contains("open")) {
                swipeRow.classList.remove("open");
                return;
            }
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

        const editExerciseButton = event.target.closest("[data-edit-exercise]");
        if (editExerciseButton) {
            const swipeRow = editExerciseButton.closest(".swipe-workout-row");
            if (swipeRow?.dataset.suppressClick === "true") return;
            if (swipeRow?.classList.contains("open")) {
                swipeRow.classList.remove("open");
                return;
            }
            const exercise = findExercise(editExerciseButton.dataset.editExercise);
            if (exercise) openExerciseDialog(exercise);
            return;
        }

        const deleteExerciseButton = event.target.closest("[data-delete-exercise]");
        if (deleteExerciseButton) {
            closeSwipeRows();
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
setWorkoutFormMode("workout", {hasWeight: true, isTime: false});
state.tab = tabFromUrl();
setTab(state.tab, {force: true, updateUrl: false, animate: false});
configureAuth({applyTheme, refreshAll});
setUnauthorizedHandler(showAuthScreen);
bindViewportInsets();
bindHistoryNavigation();
bindEvents();
bindNativeSelectFocusRelease();
bindWorkoutSwipeActions();
bindPullToRefresh();
applyTheme();
registerServiceWorker();
ensureAuth().catch(async error => {
    console.error(error);
    await showAuthScreen(error.message);
});
