const state = {
    user: null,
    exercises: [],
    globalExercises: [],
    exerciseScope: "mine",
    exerciseSearch: "",
    dashboard: null,
    history: null,
    progress: null,
    progressMetric: "weight",
    progressPeriod: "all",
    tab: "dashboard",
    mode: "reps",
    saveMode: "next",
    theme: localStorage.getItem("theme") || "system",
    editMode: "reps",
    authConfig: null,
};

const telegramWebApp = window.Telegram?.WebApp;
const telegramInitData = telegramWebApp?.initData || "";

if (telegramWebApp) {
    telegramWebApp.ready();
    telegramWebApp.expand();
}

const i18n = {
    en: {
        "app.kicker": "Workout Log",
        "auth.title": "Sign in with Telegram",
        "auth.body": "Your workout data is private. Sign in through Telegram to continue.",
        "auth.openTelegram": "Open in Telegram",
        "auth.configMissing": "Telegram login is not configured yet. Set WEB_BOT_USERNAME or open this app from Telegram.",
        "auth.checking": "Checking Telegram session...",
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
        "dashboard.trainingDays": "Training days",
        "dashboard.exercises": "Exercises",
        "dashboard.thisWeek": "this week",
        "dashboard.lastSession": "Last session",
        "dashboard.activity": "Activity",
        "dashboard.lastWeeks": "last 8 weeks",
        "dashboard.noLastSession": "No sessions yet",
        "dashboard.today": "Today",
        "dashboard.recent": "Recent",
        "actions.addWorkout": "Add workout",
        "actions.usePrevious": "Use previous",
        "actions.manageExercises": "Manage exercises",
        "actions.saveAddNext": "Save & add next",
        "actions.saveFinish": "Save & finish",
        "actions.addExercise": "Add exercise",
        "actions.saveSettings": "Save settings",
        "actions.edit": "Edit",
        "actions.delete": "Delete",
        "actions.save": "Save",
        "actions.add": "Add",
        "actions.added": "Added",
        "actions.logout": "Log out",
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
        "progress.metric": "Metric",
        "progress.period": "Period",
        "progress.weight": "Weight",
        "progress.volumeMetric": "Volume",
        "progress.repsTime": "Reps",
        "progress.value": "value",
        "progress.sessions": "Sessions",
        "progress.logged": "logged",
        "progress.pr": "PR",
        "progress.bestWeight": "best weight",
        "progress.recent": "Recent sets",
        "progress.all": "All",
        "progress.notEnoughData": "Add more sets to see a trend.",
        "exercises.mine": "My exercises",
        "exercises.global": "Global",
        "exercises.search": "Search exercises",
        "exercises.editTitle": "Edit exercise",
        "exercises.noMatches": "No matching exercises.",
        "exercises.noGlobalMatches": "Search or browse global exercises.",
        "exercises.note": "Note",
        "settings.language": "Language",
        "settings.timezone": "Timezone",
        "settings.theme": "Theme",
        "settings.system": "System",
        "settings.light": "Light",
        "settings.dark": "Dark",
        "edit.title": "Edit workout",
        "toast.saved": "Workout saved.",
        "toast.added": "Workout added.",
        "toast.deleted": "Workout deleted.",
        "toast.exerciseSaved": "Exercise saved.",
        "toast.exerciseDeleted": "Exercise removed.",
        "toast.exerciseAdded": "Exercise added.",
        "toast.loggedOut": "Logged out.",
        "add.previousHint": "Previous values will appear here.",
        "add.previousLoaded": "Loaded previous: {{details}}",
        "add.noPrevious": "No previous values for this exercise.",
        "empty.today": "No workouts today yet.",
        "empty.recent": "No workouts logged yet.",
        "empty.exercises": "Add your first exercise to start logging workouts.",
        "empty.history": "History will appear after your first workout.",
        "empty.progress": "Add workouts to see progress.",
    },
    ru: {
        "app.kicker": "Журнал тренировок",
        "auth.title": "Войти через Telegram",
        "auth.body": "Данные тренировок приватны. Войдите через Telegram, чтобы продолжить.",
        "auth.openTelegram": "Открыть в Telegram",
        "auth.configMissing": "Telegram-вход пока не настроен. Укажите WEB_BOT_USERNAME или откройте приложение из Telegram.",
        "auth.checking": "Проверяем Telegram-сессию...",
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
        "dashboard.trainingDays": "Дни тренировок",
        "dashboard.exercises": "Упражнения",
        "dashboard.thisWeek": "за неделю",
        "dashboard.lastSession": "Последняя тренировка",
        "dashboard.activity": "Активность",
        "dashboard.lastWeeks": "последние 8 недель",
        "dashboard.noLastSession": "Тренировок пока нет",
        "dashboard.today": "Сегодня",
        "dashboard.recent": "Недавние",
        "actions.addWorkout": "Добавить",
        "actions.usePrevious": "Повторить прошлое",
        "actions.manageExercises": "Упражнения",
        "actions.saveAddNext": "Сохранить и дальше",
        "actions.saveFinish": "Сохранить и закончить",
        "actions.addExercise": "Добавить упражнение",
        "actions.saveSettings": "Сохранить",
        "actions.edit": "Изменить",
        "actions.delete": "Удалить",
        "actions.save": "Сохранить",
        "actions.add": "Добавить",
        "actions.added": "Добавлено",
        "actions.logout": "Выйти",
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
        "progress.metric": "Метрика",
        "progress.period": "Период",
        "progress.weight": "Вес",
        "progress.volumeMetric": "Объем",
        "progress.repsTime": "Повторы",
        "progress.value": "значение",
        "progress.sessions": "Записи",
        "progress.logged": "в журнале",
        "progress.pr": "PR",
        "progress.bestWeight": "лучший вес",
        "progress.recent": "Последние подходы",
        "progress.all": "Все",
        "progress.notEnoughData": "Добавьте больше записей, чтобы увидеть тренд.",
        "exercises.mine": "Мои упражнения",
        "exercises.global": "Глобальные",
        "exercises.search": "Поиск упражнений",
        "exercises.editTitle": "Изменить упражнение",
        "exercises.noMatches": "Подходящих упражнений нет.",
        "exercises.noGlobalMatches": "Ищите или просматривайте глобальные упражнения.",
        "exercises.note": "Заметка",
        "settings.language": "Язык",
        "settings.timezone": "Часовой пояс",
        "settings.theme": "Тема",
        "settings.system": "Системная",
        "settings.light": "Светлая",
        "settings.dark": "Темная",
        "edit.title": "Изменить тренировку",
        "toast.saved": "Тренировка сохранена.",
        "toast.added": "Тренировка добавлена.",
        "toast.deleted": "Тренировка удалена.",
        "toast.exerciseSaved": "Упражнение сохранено.",
        "toast.exerciseDeleted": "Упражнение удалено.",
        "toast.exerciseAdded": "Упражнение добавлено.",
        "toast.loggedOut": "Вы вышли.",
        "add.previousHint": "Здесь появятся прошлые значения.",
        "add.previousLoaded": "Подставлено прошлое: {{details}}",
        "add.noPrevious": "Для этого упражнения прошлых значений нет.",
        "empty.today": "Сегодня тренировок пока нет.",
        "empty.recent": "Тренировок пока нет.",
        "empty.exercises": "Добавьте первое упражнение.",
        "empty.history": "История появится после первой тренировки.",
        "empty.progress": "Добавьте тренировки, чтобы увидеть прогресс.",
    },
    de: {
        "app.kicker": "Workout Log",
        "auth.title": "Mit Telegram anmelden",
        "auth.body": "Deine Workout-Daten sind privat. Melde dich über Telegram an, um fortzufahren.",
        "auth.openTelegram": "In Telegram öffnen",
        "auth.configMissing": "Telegram Login ist noch nicht eingerichtet. Setze WEB_BOT_USERNAME oder öffne die App aus Telegram.",
        "auth.checking": "Telegram-Sitzung wird geprüft...",
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
        "dashboard.trainingDays": "Trainingstage",
        "dashboard.exercises": "Übungen",
        "dashboard.thisWeek": "diese Woche",
        "dashboard.lastSession": "Letzte Einheit",
        "dashboard.activity": "Aktivität",
        "dashboard.lastWeeks": "letzte 8 Wochen",
        "dashboard.noLastSession": "Noch keine Einheiten",
        "dashboard.today": "Heute",
        "dashboard.recent": "Zuletzt",
        "actions.addWorkout": "Workout hinzufügen",
        "actions.usePrevious": "Vorherige nutzen",
        "actions.manageExercises": "Übungen verwalten",
        "actions.saveAddNext": "Speichern & weiter",
        "actions.saveFinish": "Speichern & fertig",
        "actions.addExercise": "Übung hinzufügen",
        "actions.saveSettings": "Einstellungen speichern",
        "actions.edit": "Bearbeiten",
        "actions.delete": "Löschen",
        "actions.save": "Speichern",
        "actions.add": "Hinzufügen",
        "actions.added": "Hinzugefügt",
        "actions.logout": "Abmelden",
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
        "progress.metric": "Metrik",
        "progress.period": "Zeitraum",
        "progress.weight": "Gewicht",
        "progress.volumeMetric": "Volumen",
        "progress.repsTime": "Wdh.",
        "progress.value": "Wert",
        "progress.sessions": "Einheiten",
        "progress.logged": "erfasst",
        "progress.pr": "PR",
        "progress.bestWeight": "bestes Gewicht",
        "progress.recent": "Letzte Sätze",
        "progress.all": "Alle",
        "progress.notEnoughData": "Füge mehr Sätze hinzu, um einen Trend zu sehen.",
        "exercises.mine": "Meine Übungen",
        "exercises.global": "Global",
        "exercises.search": "Übungen suchen",
        "exercises.editTitle": "Übung bearbeiten",
        "exercises.noMatches": "Keine passenden Übungen.",
        "exercises.noGlobalMatches": "Suche oder stöbere in globalen Übungen.",
        "exercises.note": "Notiz",
        "settings.language": "Sprache",
        "settings.timezone": "Zeitzone",
        "settings.theme": "Theme",
        "settings.system": "System",
        "settings.light": "Hell",
        "settings.dark": "Dunkel",
        "edit.title": "Workout bearbeiten",
        "toast.saved": "Workout gespeichert.",
        "toast.added": "Workout hinzugefügt.",
        "toast.deleted": "Workout gelöscht.",
        "toast.exerciseSaved": "Übung gespeichert.",
        "toast.exerciseDeleted": "Übung entfernt.",
        "toast.exerciseAdded": "Übung hinzugefügt.",
        "toast.loggedOut": "Abgemeldet.",
        "add.previousHint": "Vorherige Werte erscheinen hier.",
        "add.previousLoaded": "Vorherige geladen: {{details}}",
        "add.noPrevious": "Keine vorherigen Werte für diese Übung.",
        "empty.today": "Heute noch keine Workouts.",
        "empty.recent": "Noch keine Workouts.",
        "empty.exercises": "Füge deine erste Übung hinzu.",
        "empty.history": "Der Verlauf erscheint nach dem ersten Workout.",
        "empty.progress": "Füge Workouts hinzu, um Fortschritt zu sehen.",
    },
    fr: {
        "app.kicker": "Carnet d'entraînement",
        "auth.title": "Connexion avec Telegram",
        "auth.body": "Vos données d'entraînement sont privées. Connectez-vous via Telegram pour continuer.",
        "auth.openTelegram": "Ouvrir dans Telegram",
        "auth.configMissing": "La connexion Telegram n'est pas encore configurée. Définissez WEB_BOT_USERNAME ou ouvrez l'app depuis Telegram.",
        "auth.checking": "Vérification de la session Telegram...",
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
        "dashboard.trainingDays": "Jours actifs",
        "dashboard.exercises": "Exercices",
        "dashboard.thisWeek": "cette semaine",
        "dashboard.lastSession": "Dernière séance",
        "dashboard.activity": "Activité",
        "dashboard.lastWeeks": "8 dernières semaines",
        "dashboard.noLastSession": "Aucune séance",
        "dashboard.today": "Aujourd'hui",
        "dashboard.recent": "Récent",
        "actions.addWorkout": "Ajouter",
        "actions.usePrevious": "Réutiliser",
        "actions.manageExercises": "Exercices",
        "actions.saveAddNext": "Enregistrer puis ajouter",
        "actions.saveFinish": "Enregistrer et finir",
        "actions.addExercise": "Ajouter exercice",
        "actions.saveSettings": "Enregistrer",
        "actions.edit": "Modifier",
        "actions.delete": "Supprimer",
        "actions.save": "Enregistrer",
        "actions.add": "Ajouter",
        "actions.added": "Ajouté",
        "actions.logout": "Se déconnecter",
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
        "progress.metric": "Métrique",
        "progress.period": "Période",
        "progress.weight": "Poids",
        "progress.volumeMetric": "Volume",
        "progress.repsTime": "Rép.",
        "progress.value": "valeur",
        "progress.sessions": "Séances",
        "progress.logged": "enregistrées",
        "progress.pr": "PR",
        "progress.bestWeight": "meilleur poids",
        "progress.recent": "Séries récentes",
        "progress.all": "Tout",
        "progress.notEnoughData": "Ajoutez plus de séries pour voir une tendance.",
        "exercises.mine": "Mes exercices",
        "exercises.global": "Global",
        "exercises.search": "Rechercher",
        "exercises.editTitle": "Modifier l'exercice",
        "exercises.noMatches": "Aucun exercice correspondant.",
        "exercises.noGlobalMatches": "Recherchez ou parcourez les exercices globaux.",
        "exercises.note": "Note",
        "settings.language": "Langue",
        "settings.timezone": "Fuseau horaire",
        "settings.theme": "Thème",
        "settings.system": "Système",
        "settings.light": "Clair",
        "settings.dark": "Sombre",
        "edit.title": "Modifier la séance",
        "toast.saved": "Séance enregistrée.",
        "toast.added": "Séance ajoutée.",
        "toast.deleted": "Séance supprimée.",
        "toast.exerciseSaved": "Exercice enregistré.",
        "toast.exerciseDeleted": "Exercice retiré.",
        "toast.exerciseAdded": "Exercice ajouté.",
        "toast.loggedOut": "Déconnecté.",
        "add.previousHint": "Les valeurs précédentes apparaîtront ici.",
        "add.previousLoaded": "Valeurs chargées : {{details}}",
        "add.noPrevious": "Aucune valeur précédente pour cet exercice.",
        "empty.today": "Aucune séance aujourd'hui.",
        "empty.recent": "Aucune séance enregistrée.",
        "empty.exercises": "Ajoutez votre premier exercice.",
        "empty.history": "L'historique apparaîtra après la première séance.",
        "empty.progress": "Ajoutez des séances pour voir le progrès.",
    },
};

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

async function api(path, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
    };
    const response = await fetch(`/api/${path}`, {
        ...options,
        headers,
        credentials: "same-origin",
    });
    const data = await response.json();
    if (response.status === 401) {
        await showAuthScreen(data.error);
    }
    if (!response.ok) throw new Error(data.error || "Request failed");
    return data;
}

async function authApi(path, options = {}) {
    const response = await fetch(`/api/auth/${path}`, {
        ...options,
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed");
    return data;
}

function t(key) {
    const lang = state.user?.language || "en";
    return i18n[lang]?.[key] || i18n.en[key] || key;
}

function interpolate(text, params = {}) {
    return Object.entries(params).reduce((result, [key, value]) => result.replaceAll(`{{${key}}}`, value), text);
}

function applyI18n() {
    $$("[data-i18n]").forEach(node => {
        node.textContent = t(node.dataset.i18n);
    });
    $("#screen-title").textContent = t(`screens.${state.tab}`);
}

function setAuthenticatedShell(isAuthenticated) {
    $(".app-shell").hidden = !isAuthenticated;
    $("#auth-screen").hidden = isAuthenticated;
}

async function loadAuthConfig() {
    if (!state.authConfig) {
        state.authConfig = await authApi("config");
    }
    return state.authConfig;
}

function renderTelegramLoginWidget(botUsername) {
    const container = $("#telegram-login-widget");
    container.innerHTML = "";
    if (!botUsername) return;

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.dataset.telegramLogin = botUsername;
    script.dataset.size = "large";
    script.dataset.radius = "8";
    script.dataset.requestAccess = "write";
    script.dataset.onauth = "onTelegramLogin(user)";
    container.appendChild(script);
}

async function showAuthScreen(message) {
    setAuthenticatedShell(false);
    applyI18n();
    $("#auth-message").textContent = message || t("auth.checking");

    try {
        const config = await loadAuthConfig();
        renderTelegramLoginWidget(config.botUsername);
        $("#telegram-open-link").href = config.botUsername ? `https://t.me/${config.botUsername}` : "https://t.me/";
        if (!telegramInitData && !config.botUsername) {
            $("#auth-message").textContent = t("auth.configMissing");
        }
    } catch (error) {
        $("#auth-message").textContent = error.message || t("auth.configMissing");
    }
}

async function completeAuth(user) {
    state.user = user;
    state.theme = localStorage.getItem("theme") || user?.theme || "system";
    setAuthenticatedShell(true);
    applyTheme();
    await refreshAll();
}

async function ensureAuth() {
    applyI18n();
    const status = await authApi("status");
    if (status.authenticated) {
        await completeAuth(status.user);
        return;
    }

    if (telegramInitData) {
        const auth = await authApi("telegram-webapp", {
            method: "POST",
            body: JSON.stringify({initData: telegramInitData}),
        });
        await completeAuth(auth.user);
        return;
    }

    await showAuthScreen();
}

window.onTelegramLogin = async user => {
    try {
        const auth = await authApi("telegram-login", {
            method: "POST",
            body: JSON.stringify(user),
        });
        await completeAuth(auth.user);
    } catch (error) {
        await showAuthScreen(error.message);
    }
};

function applyTheme() {
    const selected = state.theme;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = selected === "system" ? (prefersDark ? "dark" : "light") : selected;
    document.documentElement.dataset.theme = resolved;
    $("#theme-icon").textContent = resolved === "dark" ? "☾" : "☼";
    $("#theme-select").value = selected;
}

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

function workoutDetail(workout) {
    return [
        `${workout.sets || 0} sets`,
        workout.weight ? `${workout.weight} kg` : null,
        workout.isTime ? `${workout.repsOrTime} sec` : `${workout.repsOrTime || 0} reps`,
    ].filter(Boolean).join(" · ");
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
    $("#weekly-days").textContent = data.stats.weeklyDays;
    $("#weekly-exercises").textContent = data.stats.weeklyExercises;
    renderLastSession(data.lastSession);
    renderActivity(data.activity || []);
    renderList($("#today-list"), data.today.workouts, "empty.today");
    renderList($("#recent-list"), data.recent, "empty.recent");
}

function renderLastSession(workout) {
    $("#last-session-title").textContent = workout?.exercise || t("dashboard.noLastSession");
    $("#last-session-detail").textContent = workout ? `${workout.dateLabel} · ${workoutDetail(workout)}` : "";
}

function renderActivity(activity) {
    $("#activity-strip").innerHTML = activity.map(week => {
        const height = 8 + Math.min(week.activeDays, 7) * 8;
        return `
            <div class="activity-week" title="${escapeHtml(week.label)}">
                <div class="activity-bar ${week.hasWorkout ? "active" : ""} ${week.isCurrent ? "current" : ""}" style="height:${height}px"></div>
                <small>${escapeHtml(week.activeDays)}</small>
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
    $$(".segmented button").forEach(item => item.classList.toggle("active", item.dataset.mode === mode));
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
    $$(".screen").forEach(screen => screen.classList.toggle("active", screen.id === `screen-${tab}`));
    $$(".bottom-nav button").forEach(button => button.classList.toggle("active", button.dataset.tab === tab));
    $("#screen-title").textContent = t(`screens.${tab}`);
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
}

function clearWorkoutInputs() {
    $("#workout-sets").value = "";
    $("#workout-weight").value = "";
    $("#workout-reps").value = "";
    $("#workout-notes").value = "";
    $("#previous-hint").textContent = t("add.previousHint");
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

    $$(".segmented button").forEach(button => button.addEventListener("click", () => {
        setAddMode(button.dataset.mode);
    }));

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
        const selected = $("#workout-exercise").value;
        const previous = state.dashboard?.recent?.find(row => row.exercise === selected);
        if (!previous) return;
        $("#workout-sets").value = previous.sets || "";
        $("#workout-weight").value = previous.weight || "";
        $("#workout-reps").value = previous.repsOrTime || "";
        setAddMode(previous.isTime ? "time" : "reps");
        $("#previous-hint").textContent = interpolate(t("add.previousLoaded"), {details: workoutDetail(previous)});
    });

    $("#workout-exercise").addEventListener("change", () => {
        const previous = state.dashboard?.recent?.find(row => row.exercise === $("#workout-exercise").value);
        $("#previous-hint").textContent = previous ? workoutDetail(previous) : t("add.noPrevious");
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
bindEvents();
applyTheme();
ensureAuth().catch(async error => {
    console.error(error);
    await showAuthScreen(error.message);
});
