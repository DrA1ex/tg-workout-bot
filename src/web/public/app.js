const state = {
    user: null,
    exercises: [],
    dashboard: null,
    history: null,
    progress: null,
    tab: "dashboard",
    mode: "reps",
    theme: localStorage.getItem("theme") || "system",
    editMode: "reps",
};

const i18n = {
    en: {
        "app.kicker": "Workout Log",
        "nav.today": "Today",
        "nav.add": "Add",
        "nav.history": "History",
        "nav.progress": "Progress",
        "nav.exercises": "Exercises",
        "screens.dashboard": "Today",
        "screens.add": "Add workout",
        "screens.history": "History",
        "screens.progress": "Progress",
        "screens.exercises": "Exercises",
        "screens.settings": "Settings",
        "dashboard.weeklyStreak": "Weekly streak",
        "dashboard.weeks": "weeks",
        "dashboard.volume": "Volume",
        "dashboard.workouts": "Workouts",
        "dashboard.exercises": "Exercises",
        "dashboard.thisWeek": "this week",
        "dashboard.today": "Today",
        "dashboard.recent": "Recent",
        "actions.addWorkout": "Add workout",
        "actions.usePrevious": "Use previous",
        "actions.manageExercises": "Manage exercises",
        "actions.saveAddNext": "Save & add next",
        "actions.addExercise": "Add exercise",
        "actions.saveSettings": "Save settings",
        "actions.edit": "Edit",
        "actions.delete": "Delete",
        "actions.save": "Save",
        "fields.date": "Date",
        "fields.exercise": "Exercise",
        "fields.sets": "Sets",
        "fields.weight": "Weight",
        "fields.repsTime": "Reps / Time",
        "fields.reps": "Reps",
        "fields.time": "Time",
        "fields.notes": "Notes",
        "fields.name": "Name",
        "progress.best": "Best",
        "progress.latest": "Latest",
        "progress.volume": "volume",
        "exercises.mine": "My exercises",
        "settings.language": "Language",
        "settings.timezone": "Timezone",
        "settings.theme": "Theme",
        "settings.system": "System",
        "settings.light": "Light",
        "settings.dark": "Dark",
        "edit.title": "Edit workout",
        "toast.saved": "Workout saved.",
        "toast.deleted": "Workout deleted.",
        "empty.today": "No workouts today yet.",
        "empty.recent": "No workouts logged yet.",
        "empty.exercises": "Add your first exercise to start logging workouts.",
        "empty.history": "History will appear after your first workout.",
        "empty.progress": "Add workouts to see progress.",
    },
    ru: {
        "app.kicker": "Журнал тренировок",
        "nav.today": "Сегодня",
        "nav.add": "Добавить",
        "nav.history": "История",
        "nav.progress": "Прогресс",
        "nav.exercises": "Упражнения",
        "screens.dashboard": "Сегодня",
        "screens.add": "Добавить",
        "screens.history": "История",
        "screens.progress": "Прогресс",
        "screens.exercises": "Упражнения",
        "screens.settings": "Настройки",
        "dashboard.weeklyStreak": "Недельный страйк",
        "dashboard.weeks": "недель",
        "dashboard.volume": "Объем",
        "dashboard.workouts": "Записи",
        "dashboard.exercises": "Упражнения",
        "dashboard.thisWeek": "за неделю",
        "dashboard.today": "Сегодня",
        "dashboard.recent": "Недавние",
        "actions.addWorkout": "Добавить",
        "actions.usePrevious": "Повторить прошлое",
        "actions.manageExercises": "Упражнения",
        "actions.saveAddNext": "Сохранить и дальше",
        "actions.addExercise": "Добавить упражнение",
        "actions.saveSettings": "Сохранить",
        "actions.edit": "Изменить",
        "actions.delete": "Удалить",
        "actions.save": "Сохранить",
        "fields.date": "Дата",
        "fields.exercise": "Упражнение",
        "fields.sets": "Подходы",
        "fields.weight": "Вес",
        "fields.repsTime": "Повторы / время",
        "fields.reps": "Повторы",
        "fields.time": "Время",
        "fields.notes": "Заметки",
        "fields.name": "Название",
        "progress.best": "Лучшее",
        "progress.latest": "Последнее",
        "progress.volume": "объем",
        "exercises.mine": "Мои упражнения",
        "settings.language": "Язык",
        "settings.timezone": "Часовой пояс",
        "settings.theme": "Тема",
        "settings.system": "Системная",
        "settings.light": "Светлая",
        "settings.dark": "Темная",
        "edit.title": "Изменить тренировку",
        "toast.saved": "Тренировка сохранена.",
        "toast.deleted": "Тренировка удалена.",
        "empty.today": "Сегодня тренировок пока нет.",
        "empty.recent": "Тренировок пока нет.",
        "empty.exercises": "Добавьте первое упражнение.",
        "empty.history": "История появится после первой тренировки.",
        "empty.progress": "Добавьте тренировки, чтобы увидеть прогресс.",
    },
    de: {
        "app.kicker": "Workout Log",
        "nav.today": "Heute",
        "nav.add": "Neu",
        "nav.history": "Verlauf",
        "nav.progress": "Fortschritt",
        "nav.exercises": "Übungen",
        "screens.dashboard": "Heute",
        "screens.add": "Workout hinzufügen",
        "screens.history": "Verlauf",
        "screens.progress": "Fortschritt",
        "screens.exercises": "Übungen",
        "screens.settings": "Einstellungen",
        "dashboard.weeklyStreak": "Wochenserie",
        "dashboard.weeks": "Wochen",
        "dashboard.volume": "Volumen",
        "dashboard.workouts": "Workouts",
        "dashboard.exercises": "Übungen",
        "dashboard.thisWeek": "diese Woche",
        "dashboard.today": "Heute",
        "dashboard.recent": "Zuletzt",
        "actions.addWorkout": "Workout hinzufügen",
        "actions.usePrevious": "Vorherige nutzen",
        "actions.manageExercises": "Übungen verwalten",
        "actions.saveAddNext": "Speichern & weiter",
        "actions.addExercise": "Übung hinzufügen",
        "actions.saveSettings": "Einstellungen speichern",
        "actions.edit": "Bearbeiten",
        "actions.delete": "Löschen",
        "actions.save": "Speichern",
        "fields.date": "Datum",
        "fields.exercise": "Übung",
        "fields.sets": "Sätze",
        "fields.weight": "Gewicht",
        "fields.repsTime": "Wdh. / Zeit",
        "fields.reps": "Wdh.",
        "fields.time": "Zeit",
        "fields.notes": "Notizen",
        "fields.name": "Name",
        "progress.best": "Bestes",
        "progress.latest": "Letztes",
        "progress.volume": "Volumen",
        "exercises.mine": "Meine Übungen",
        "settings.language": "Sprache",
        "settings.timezone": "Zeitzone",
        "settings.theme": "Theme",
        "settings.system": "System",
        "settings.light": "Hell",
        "settings.dark": "Dunkel",
        "edit.title": "Workout bearbeiten",
        "toast.saved": "Workout gespeichert.",
        "toast.deleted": "Workout gelöscht.",
        "empty.today": "Heute noch keine Workouts.",
        "empty.recent": "Noch keine Workouts.",
        "empty.exercises": "Füge deine erste Übung hinzu.",
        "empty.history": "Der Verlauf erscheint nach dem ersten Workout.",
        "empty.progress": "Füge Workouts hinzu, um Fortschritt zu sehen.",
    },
    fr: {
        "app.kicker": "Carnet d'entraînement",
        "nav.today": "Aujourd'hui",
        "nav.add": "Ajouter",
        "nav.history": "Historique",
        "nav.progress": "Progrès",
        "nav.exercises": "Exercices",
        "screens.dashboard": "Aujourd'hui",
        "screens.add": "Ajouter",
        "screens.history": "Historique",
        "screens.progress": "Progrès",
        "screens.exercises": "Exercices",
        "screens.settings": "Réglages",
        "dashboard.weeklyStreak": "Série hebdo",
        "dashboard.weeks": "semaines",
        "dashboard.volume": "Volume",
        "dashboard.workouts": "Séances",
        "dashboard.exercises": "Exercices",
        "dashboard.thisWeek": "cette semaine",
        "dashboard.today": "Aujourd'hui",
        "dashboard.recent": "Récent",
        "actions.addWorkout": "Ajouter",
        "actions.usePrevious": "Réutiliser",
        "actions.manageExercises": "Exercices",
        "actions.saveAddNext": "Enregistrer puis ajouter",
        "actions.addExercise": "Ajouter exercice",
        "actions.saveSettings": "Enregistrer",
        "actions.edit": "Modifier",
        "actions.delete": "Supprimer",
        "actions.save": "Enregistrer",
        "fields.date": "Date",
        "fields.exercise": "Exercice",
        "fields.sets": "Séries",
        "fields.weight": "Poids",
        "fields.repsTime": "Rép. / temps",
        "fields.reps": "Rép.",
        "fields.time": "Temps",
        "fields.notes": "Notes",
        "fields.name": "Nom",
        "progress.best": "Meilleur",
        "progress.latest": "Dernier",
        "progress.volume": "volume",
        "exercises.mine": "Mes exercices",
        "settings.language": "Langue",
        "settings.timezone": "Fuseau horaire",
        "settings.theme": "Thème",
        "settings.system": "Système",
        "settings.light": "Clair",
        "settings.dark": "Sombre",
        "edit.title": "Modifier la séance",
        "toast.saved": "Séance enregistrée.",
        "toast.deleted": "Séance supprimée.",
        "empty.today": "Aucune séance aujourd'hui.",
        "empty.recent": "Aucune séance enregistrée.",
        "empty.exercises": "Ajoutez votre premier exercice.",
        "empty.history": "L'historique apparaîtra après la première séance.",
        "empty.progress": "Ajoutez des séances pour voir le progrès.",
    },
};

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

function userParam() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("telegramId") || localStorage.getItem("telegramId");
    return id ? `?telegramId=${encodeURIComponent(id)}` : "";
}

async function api(path, options = {}) {
    const glue = path.includes("?") ? "&" : "?";
    const suffix = userParam().replace("?", "");
    const response = await fetch(`/api/${path}${suffix ? `${glue}${suffix}` : ""}`, {
        headers: {"Content-Type": "application/json"},
        ...options,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed");
    return data;
}

function t(key) {
    const lang = state.user?.language || "en";
    return i18n[lang]?.[key] || i18n.en[key] || key;
}

function applyI18n() {
    $$("[data-i18n]").forEach(node => {
        node.textContent = t(node.dataset.i18n);
    });
    $("#screen-title").textContent = t(`screens.${state.tab}`);
}

function applyTheme() {
    const selected = state.theme;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = selected === "system" ? (prefersDark ? "dark" : "light") : selected;
    document.documentElement.dataset.theme = resolved;
    $("#theme-icon").textContent = resolved === "dark" ? "☾" : "☼";
    $("#theme-select").value = selected;
}

function workoutRow(workout) {
    const detail = [
        `${workout.sets || 0} sets`,
        workout.weight ? `${workout.weight} kg` : null,
        workout.isTime ? `${workout.repsOrTime} sec` : `${workout.repsOrTime || 0} reps`,
    ].filter(Boolean).join(" · ");

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

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function renderList(target, items, emptyKey) {
    target.innerHTML = items.length
        ? items.map(workoutRow).join("")
        : `<div class="empty">${t(emptyKey)}</div>`;
}

function renderDashboard() {
    const data = state.dashboard;
    $("#weekly-streak").textContent = data.stats.weeklyStreak;
    $("#weekly-volume").textContent = data.stats.weeklyVolume.toLocaleString();
    $("#weekly-workouts").textContent = data.stats.weeklyWorkouts;
    $("#weekly-exercises").textContent = data.stats.weeklyExercises;
    renderList($("#today-list"), data.today.workouts, "empty.today");
    renderList($("#recent-list"), data.recent, "empty.recent");
}

function renderExercises() {
    const options = state.exercises.map(ex => `<option value="${escapeHtml(ex.name)}">${escapeHtml(ex.name)}</option>`).join("");
    $("#workout-exercise").innerHTML = options;
    $("#edit-exercise").innerHTML = options;
    $("#progress-exercise").innerHTML = options;
    $("#exercise-list").innerHTML = state.exercises.length
        ? state.exercises.map(ex => `
            <article class="workout-row">
                <div>
                    <h3>${escapeHtml(ex.name)}</h3>
                    <p>${escapeHtml(ex.notes || "No notes")}</p>
                </div>
                <span class="pill">Add</span>
            </article>
        `).join("")
        : `<div class="empty">${t("empty.exercises")}</div>`;
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
        return;
    }

    $("#progress-best").textContent = Math.round(data.best?.volume || 0).toLocaleString();
    $("#progress-latest").textContent = data.latest?.weight || data.latest?.repsOrTime || 0;
    drawChart(data.points);
}

function drawChart(points) {
    const svg = $("#progress-chart");
    const values = points.map(point => point.volume || point.weight || point.repsOrTime || 0);
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
    const area = `${path} L ${coords.at(-1)[0].toFixed(1)} ${height - pad} L ${pad} ${height - pad} Z`;

    svg.innerHTML = `
        <path d="${area}" fill="var(--primary)" opacity=".12"></path>
        <path d="${path}" fill="none" stroke="var(--primary)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
        ${coords.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="var(--surface)" stroke="var(--primary)" stroke-width="3"></circle>`).join("")}
        <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="var(--line)" stroke-width="1"></line>
    `;
}

function setTab(tab) {
    state.tab = tab;
    $$(".screen").forEach(screen => screen.classList.toggle("active", screen.id === `screen-${tab}`));
    $$(".bottom-nav button").forEach(button => button.classList.toggle("active", button.dataset.tab === tab));
    $("#screen-title").textContent = t(`screens.${tab}`);
}

async function refreshAll() {
    const [bootstrap, dashboard, history] = await Promise.all([
        api("bootstrap"),
        api("dashboard"),
        api("history"),
    ]);
    state.user = bootstrap.user;
    state.exercises = bootstrap.exercises;
    state.dashboard = dashboard;
    state.history = history;
    localStorage.setItem("telegramId", state.user.telegramId);
    $("#language-select").value = state.user.language;
    $("#timezone-input").value = state.user.timezone;
    renderDashboard();
    renderExercises();
    renderHistory();
    await loadProgress();
    applyI18n();
}

async function loadProgress() {
    const exercise = $("#progress-exercise").value || state.exercises[0]?.name || "";
    state.progress = await api(`progress${exercise ? `?exercise=${encodeURIComponent(exercise)}` : ""}`);
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

    $$(".segmented button").forEach(button => button.addEventListener("click", () => {
        state.mode = button.dataset.mode;
        $$(".segmented button").forEach(item => item.classList.toggle("active", item === button));
    }));

    $("#workout-form").addEventListener("submit", async event => {
        event.preventDefault();
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
        $("#workout-notes").value = "";
        await refreshAll();
        setTab("dashboard");
    });

    $("#exercise-form").addEventListener("submit", async event => {
        event.preventDefault();
        await api("exercises", {
            method: "POST",
            body: JSON.stringify({
                name: $("#exercise-name").value,
                notes: $("#exercise-notes").value,
            }),
        });
        $("#exercise-form").reset();
        await refreshAll();
    });

    $("#progress-exercise").addEventListener("change", loadProgress);

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

    $("#use-previous").addEventListener("click", () => {
        const selected = $("#workout-exercise").value;
        const previous = state.dashboard?.recent?.find(row => row.exercise === selected);
        if (!previous) return;
        $("#workout-sets").value = previous.sets || "";
        $("#workout-weight").value = previous.weight || "";
        $("#workout-reps").value = previous.repsOrTime || "";
        state.mode = previous.isTime ? "time" : "reps";
        $$(".segmented button").forEach(item => item.classList.toggle("active", item.dataset.mode === state.mode));
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
        }
    });
}

$("#workout-date").value = todayInputValue();
bindEvents();
applyTheme();
refreshAll().catch(error => {
    console.error(error);
    $("#today-list").innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
});
