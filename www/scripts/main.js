import {state} from './state.js';
import {api, authApi, setUnauthorizedHandler} from './api.js';
import {configureAuth, ensureAuth, showAuthScreen} from './auth.js';
import {$, $$, escapeHtml} from './dom.js';
import {applyI18n, interpolate, t} from './i18n/index.js';
import {applyTheme} from './theme.js';

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
    const volume = workoutVolume(workout);

    return `
        <article class="dashboard-workout-row" data-workout-id="${workout.id}">
            <div class="workout-check">✓</div>
            <div class="dashboard-workout-body">
                <div class="dashboard-workout-main">
                    <div>
                        <h3>${escapeHtml(workout.exercise)}</h3>
                        <p>${escapeHtml(workoutTimeLabel(workout))}</p>
                    </div>
                    <button class="kebab-button" type="button" data-edit-workout="${workout.id}" aria-label="${t("actions.edit")}">⋮</button>
                </div>
                <div class="dashboard-workout-stats">
                    <div>
                        <span class="metric-icon">╫</span>
                        <strong>${workout.sets || 0}</strong>
                        <small>sets</small>
                    </div>
                    <div>
                        <span class="metric-icon">▱</span>
                        <strong>${formatMetricNumber(workout.weight || 0)}</strong>
                        <small>kg</small>
                    </div>
                    <div>
                        <span class="metric-icon">◴</span>
                        <strong>${formatMetricNumber(workout.repsOrTime || 0)}</strong>
                        <small>${workout.isTime ? "sec" : "reps"}</small>
                    </div>
                </div>
                <div class="volume-pill">
                    <span class="volume-icon">▥</span>
                    <span>Volume</span>
                    <strong>${volume.toLocaleString()} kg</strong>
                </div>
            </div>
        </article>
    `;
}

function workoutDetail(workout) {
    return [
        `${workout.sets || 0} sets`,
        workout.weight ? `${workout.weight} kg` : null,
        workout.isTime ? `${workout.repsOrTime} sec` : `${workout.repsOrTime || 0} reps`,
    ].filter(Boolean).join(" · ");
}

function workoutVolume(workout) {
    if (workout.isTime || !workout.weight || !workout.repsOrTime || !workout.sets) return 0;
    return Math.round(workout.weight * workout.repsOrTime * workout.sets);
}

function workoutTimeLabel(workout) {
    if (!workout.date) return workout.dateLabel || "";
    return new Date(workout.date).toLocaleTimeString([], {hour: "numeric", minute: "2-digit"});
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
        : `<div class="dashboard-empty">${t("empty.today")}</div>`;
}

function renderDashboard() {
    const data = state.dashboard;
    $("#weekly-streak").textContent = data.stats.weeklyStreak;
    $("#weekly-volume").textContent = data.stats.weeklyVolume.toLocaleString();
    $("#weekly-workouts").textContent = data.stats.weeklyWorkouts;
    $("#weekly-days").textContent = data.stats.weeklyDays;
    $("#weekly-exercises").textContent = data.stats.weeklyExercises;
    $("#screen-subtitle").textContent = todaySubtitle(data);
    renderLastSession(data.lastSession);
    renderActivity();
    renderDashboardList($("#today-list"), data.today.workouts);
    renderList($("#recent-list"), data.recent, "empty.recent");
}

function todaySubtitle(data) {
    const source = data.today.workouts[0]?.date ? new Date(data.today.workouts[0].date) : new Date();
    return source.toLocaleDateString("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }) + " • " + source.toLocaleDateString("en", {weekday: "long"});
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

function renderExercises() {
    const options = state.exercises.map(ex => `<option value="${escapeHtml(ex.name)}">${escapeHtml(ex.name)}</option>`).join("");
    $("#workout-exercise").innerHTML = options;
    $("#edit-exercise").innerHTML = options;
    $("#progress-exercise").innerHTML = options;
    $("#add-empty").hidden = state.exercises.length > 0;
    $$("#workout-form input, #workout-form select, #workout-form textarea, #workout-form button[type='submit']").forEach(node => {
        node.disabled = state.exercises.length === 0;
    });
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
    return [...byId.values()];
}

function findWorkout(id) {
    return allWorkouts().find(workout => String(workout.id) === String(id));
}

function workoutDateInputValue(workout) {
    const date = new Date(workout.date);
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
    $$(".reps-control [data-mode]").forEach(item => item.classList.toggle("active", item.dataset.mode === mode));
}

function setEditMode(mode) {
    state.editMode = mode;
    $$("#edit-mode button").forEach(item => item.classList.toggle("active", item.dataset.mode === mode));
}

function openEditDialog(workout) {
    $("#edit-id").value = workout.id;
    $("#edit-date").value = workoutDateInputValue(workout);
    $("#edit-exercise").value = workout.exercise;
    $("#edit-sets").value = workout.sets || "";
    $("#edit-weight").value = workout.weight || "";
    $("#edit-reps").value = workout.repsOrTime || "";
    $("#edit-notes").value = workout.notes || "";
    setEditMode(workout.isTime ? "time" : "reps");
    $("#edit-dialog").showModal();
}

async function deleteWorkout(id) {
    await api(`workouts/${id}`, {method: "DELETE"});
    await refreshAll();
    showToast("toast.deleted");
}

async function saveEditedWorkout() {
    const id = $("#edit-id").value;
    await api(`workouts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
            date: $("#edit-date").value,
            exercise: $("#edit-exercise").value,
            sets: $("#edit-sets").value,
            weight: $("#edit-weight").value,
            repsOrTime: $("#edit-reps").value,
            isTime: state.editMode === "time",
            notes: $("#edit-notes").value,
        }),
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
    $("#history-list").innerHTML = groups.length
        ? groups.map(group => `
            <section class="day-group">
                <header><span>${escapeHtml(group.label)}</span><span>${group.workouts.length}</span></header>
                <div class="list">${group.workouts.map(workoutRow).join("")}</div>
            </section>
        `).join("")
        : `<div class="empty">${t("empty.history")}</div>`;
}

function renderProgress() {
    const data = state.progress;
    if (!data?.points?.length) {
        $("#progress-chart").innerHTML = `<text x="160" y="92" text-anchor="middle" fill="currentColor">${t("empty.progress")}</text>`;
        $("#progress-best").textContent = "0";
        $("#progress-latest").textContent = "0";
        $("#progress-sessions").textContent = "0";
        $("#progress-pr").textContent = "0";
        $("#progress-recent").innerHTML = `<div class="empty">${t("empty.progress")}</div>`;
        return;
    }

    const metric = state.progressMetric;
    const values = data.points.map(point => metricValue(point, metric));
    const bestValue = Math.max(...values, 0);
    const latestValue = values.at(-1) || 0;

    $("#progress-best").textContent = formatMetric(bestValue, metric);
    $("#progress-latest").textContent = formatMetric(latestValue, metric);
    $("#progress-best-label").textContent = metricLabel(metric);
    $("#progress-latest-label").textContent = metricLabel(metric);
    $("#progress-sessions").textContent = data.summary?.sessions || data.points.length;
    $("#progress-pr").textContent = formatMetric(data.summary?.bestWeight || data.summary?.bestRepsOrTime || 0, data.summary?.isTime ? "repsOrTime" : "weight");
    $("#progress-pr-label").textContent = data.summary?.isTime ? metricLabel("repsOrTime") : t("progress.bestWeight");
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

function metricLabel(metric) {
    if (metric === "volume") return t("progress.volumeMetric");
    if (metric === "repsOrTime") return t("progress.repsTime");
    if (metric === "sets") return t("fields.sets");
    return t("progress.weight");
}

function renderProgressRecent(rows) {
    $("#progress-recent").innerHTML = rows.length
        ? rows.map(row => `
            <div class="mini-row">
                <span>${escapeHtml(row.dateLabel)}</span>
                <strong>${escapeHtml(workoutDetail(row))}</strong>
                <small class="mini-value">${escapeHtml(formatMetric(metricValue(row, state.progressMetric), state.progressMetric))}</small>
            </div>
        `).join("")
        : `<div class="empty">${t("empty.progress")}</div>`;
}

function drawChart(points, metric) {
    const svg = $("#progress-chart");
    const values = points.map(point => metricValue(point, metric));
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const width = 320;
    const height = 180;
    const pad = 24;
    const span = Math.max(max - min, 1);
    const step = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0;
    const coords = values.map((value, index) => {
        const x = pad + index * step;
        const y = height - pad - ((value - min) / span) * (height - pad * 2);
        return [x, y];
    });
    const path = coords.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    const area = coords.length > 1
        ? `${path} L ${coords.at(-1)[0].toFixed(1)} ${height - pad} L ${pad} ${height - pad} Z`
        : "";

    svg.innerHTML = `
        ${area ? `<path d="${area}" fill="var(--primary)" opacity=".12"></path>` : ""}
        <path d="${path}" fill="none" stroke="var(--primary)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
        ${coords.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="var(--surface)" stroke="var(--primary)" stroke-width="3"></circle>`).join("")}
        <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="var(--line)" stroke-width="1"></line>
        ${coords.length === 1 ? `<text x="160" y="146" text-anchor="middle" fill="var(--muted)" font-size="12">${t("progress.notEnoughData")}</text>` : ""}
    `;
}

function setTab(tab) {
    state.tab = tab;
    document.body.dataset.tab = tab;
    $$(".screen").forEach(screen => screen.classList.toggle("active", screen.id === `screen-${tab}`));
    $$(".bottom-nav button").forEach(button => button.classList.toggle("active", button.dataset.tab === tab));
    $("#screen-title").textContent = t(`screens.${tab}`);
    $("#screen-subtitle").textContent = tab === "dashboard" && state.dashboard ? todaySubtitle(state.dashboard) : "";
    if (tab === "add") {
        window.scrollTo({top: 0, behavior: "instant"});
        loadPreviousWorkoutValues();
    }
}

async function refreshAll() {
    const bootstrap = await api("bootstrap");
    const dashboard = await api("dashboard");
    const history = await api("history");
    state.user = bootstrap.user;
    state.exercises = bootstrap.exercises;
    state.dashboard = dashboard;
    state.history = history;
    $("#language-select").value = state.user.language;
    $("#timezone-input").value = state.user.timezone;
    renderDashboard();
    renderExercises();
    renderHistory();
    await loadProgress();
    applyI18n();
    if (state.tab === "add") {
        loadPreviousWorkoutValues();
    }
}

function clearWorkoutInputs() {
    $("#workout-sets").value = "3";
    $("#workout-weight").value = "";
    $("#workout-reps").value = "12";
    $("#workout-notes").value = "";
    $("#notes-count").textContent = "0";
    $("#previous-hint").textContent = t("add.previousHint");
    $("#previous-summary").textContent = t("add.previousHint");
}

function loadPreviousWorkoutValues() {
    const selected = $("#workout-exercise").value;
    const previous = state.dashboard?.recent?.find(row => row.exercise === selected);
    if (!previous) {
        if (!$("#workout-sets").value) $("#workout-sets").value = "3";
        if (!$("#workout-reps").value) $("#workout-reps").value = "12";
        $("#previous-hint").textContent = selected ? t("add.noPrevious") : t("add.previousHint");
        $("#previous-summary").textContent = selected ? t("add.noPrevious") : t("add.previousHint");
        return;
    }

    $("#workout-sets").value = previous.sets || "3";
    $("#workout-weight").value = previous.weight || "";
    $("#workout-reps").value = previous.repsOrTime || "12";
    setAddMode(previous.isTime ? "time" : "reps");
    $("#previous-hint").textContent = interpolate(t("add.previousLoaded"), {details: workoutDetail(previous)});
    $("#previous-summary").textContent = workoutDetail(previous);
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
    const exercise = $("#progress-exercise").value || state.exercises[0]?.name || "";
    const params = new URLSearchParams();
    if (exercise) params.set("exercise", exercise);
    params.set("period", state.progressPeriod);
    state.progress = await api(`progress?${params.toString()}`);
    if (state.progress.exercise) $("#progress-exercise").value = state.progress.exercise;
    renderProgress();
}

function todayInputValue() {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function bindEvents() {
    $$("[data-tab]").forEach(button => button.addEventListener("click", () => setTab(button.dataset.tab)));
    $("[data-action='quick-add']").addEventListener("click", () => setTab("add"));

    $("#theme-toggle").addEventListener("click", () => {
        state.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        localStorage.setItem("theme", state.theme);
        applyTheme();
    });

    $$(".reps-control [data-mode]").forEach(button => button.addEventListener("click", () => {
        setAddMode(button.dataset.mode);
    }));

    $("#workout-notes").addEventListener("input", event => {
        $("#notes-count").textContent = String(event.target.value.length);
    });

    $(".clear-field-button").addEventListener("click", () => {
        $("#workout-exercise").value = "";
        loadPreviousWorkoutValues();
    });

    $("#workout-form").addEventListener("submit", async event => {
        event.preventDefault();
        const saveMode = event.submitter?.dataset.saveMode || "next";
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
    $$("#progress-period button").forEach(button => button.addEventListener("click", async () => {
        state.progressPeriod = button.dataset.period;
        $$("#progress-period button").forEach(item => item.classList.toggle("active", item === button));
        await loadProgress();
    }));

    $("#settings-form").addEventListener("submit", async event => {
        event.preventDefault();
        state.theme = $("#theme-select").value;
        localStorage.setItem("theme", state.theme);
        await api("settings", {
            method: "PATCH",
            body: JSON.stringify({
                language: $("#language-select").value,
                timezone: $("#timezone-input").value,
            }),
        });
        applyTheme();
        await refreshAll();
    });

    $("#logout-button").addEventListener("click", async () => {
        await authApi("logout", {method: "POST"});
        state.user = null;
        await showAuthScreen();
        showToast("toast.loggedOut");
    });

    $("#use-previous").addEventListener("click", () => {
        loadPreviousWorkoutValues();
    });

    $("#workout-exercise").addEventListener("change", () => {
        loadPreviousWorkoutValues();
    });

    document.addEventListener("click", event => {
        const stepButton = event.target.closest("[data-step-target]");
        if (!stepButton) return;

        const input = document.getElementById(stepButton.dataset.stepTarget);
        if (input) adjustNumberInput(input, Number.parseFloat(stepButton.dataset.step));
    });

    $$("#edit-mode button").forEach(button => button.addEventListener("click", () => setEditMode(button.dataset.mode)));
    $("#edit-close").addEventListener("click", () => $("#edit-dialog").close());
    $("#edit-form").addEventListener("submit", async event => {
        event.preventDefault();
        await saveEditedWorkout();
    });
    $("#edit-delete").addEventListener("click", async () => {
        const id = $("#edit-id").value;
        $("#edit-dialog").close();
        await deleteWorkout(id);
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
        const editButton = event.target.closest("[data-edit-workout]");
        if (editButton) {
            const workout = findWorkout(editButton.dataset.editWorkout);
            if (workout) openEditDialog(workout);
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

$("#workout-date").value = todayInputValue();
document.body.dataset.tab = state.tab;
configureAuth({applyTheme, refreshAll});
setUnauthorizedHandler(showAuthScreen);
bindEvents();
applyTheme();
ensureAuth().catch(async error => {
    console.error(error);
    await showAuthScreen(error.message);
});
