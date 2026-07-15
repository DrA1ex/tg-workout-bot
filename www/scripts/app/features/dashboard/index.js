// Extracted from main.js without changing feature behavior.
import {setHeadingSkeleton, updateAppReadyState} from '../../core/navigation.js';
import {$, escapeHtml, state, t} from '../../deps.js';
import {dashboardWorkoutRow, renderList, shortDateLabel, todaySubtitle, weekUnitLabel, workoutCountLabel, workoutDetail} from '../workouts/presentation.js';

const ACTIVITY_CALENDAR_COLLAPSED_KEY = "dashboard:activity-calendar-collapsed";

export function isActivityCalendarCollapsed() {
    try {
        const value = localStorage.getItem(ACTIVITY_CALENDAR_COLLAPSED_KEY);
        return value == null ? true : value === "true";
    } catch {
        return true;
    }
}

export function setActivityCalendarCollapsed(collapsed) {
    try {
        localStorage.setItem(ACTIVITY_CALENDAR_COLLAPSED_KEY, collapsed ? "true" : "false");
    } catch {
    }
    applyActivityCalendarCollapsed(collapsed);
}

export function toggleActivityCalendar() {
    setActivityCalendarCollapsed(!isActivityCalendarCollapsed());
}

export function applyActivityCalendarCollapsed(collapsed = isActivityCalendarCollapsed()) {
    const card = $("#weekly-streak-card");
    if (!card) return;
    card.classList.toggle("activity-collapsed", collapsed);
    $("#weekly-streak-toggle")?.setAttribute("aria-expanded", String(!collapsed));
}

export function renderDashboardList(target, items) {
    target.innerHTML = items.length
        ? `
            <div class="dashboard-list-heading">
                <strong>${t("dashboard.today")}</strong>
                <span class="dashboard-list-heading-actions">
                    <span>${items.length} ${workoutCountLabel(items.length)}</span>
                    <button class="dashboard-list-add" data-action="quick-add" type="button" aria-label="${t("actions.addWorkout")}" title="${t("actions.addWorkout")}"></button>
                </span>
            </div>
            ${items.map(dashboardWorkoutRow).join("")}
        `
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

export function renderDashboard() {
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
    applyActivityCalendarCollapsed();
    $("#dashboard-last-workout-row").hidden = false;
    $("#dashboard-last-workout").textContent = data.lastSession?.exercise || t("dashboard.noLastSession");
    $("#dashboard-last-workout-detail").textContent = data.lastSession ? workoutDetail(data.lastSession) : "";
    $("#dashboard-last-workout-date").textContent = shortDateLabel(data.lastSession);
    if (state.tab === "dashboard") {
        setHeadingSkeleton(false);
        $("#screen-title").textContent = t("screens.dashboard");
        $("#screen-subtitle").textContent = todaySubtitle(data);
    }
    renderLastSession(data.lastSession);
    renderActivity();
    renderActivityCalendar(data.activityCalendar || []);
    renderStreakWeeks(data.weeklyStreak?.weeks || data.activity || []);
    renderDashboardList($("#today-list"), data.today.workouts);
    renderList($("#recent-list"), data.recent, "empty.recent");
    hideDashboardSkeleton();
}

export function showDashboardSkeleton() {
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

export function hideDashboardSkeleton() {
    const skeleton = $("#dashboard-skeleton");
    const content = $("#dashboard-content");
    if (skeleton) skeleton.hidden = true;
    if (content) content.hidden = false;
    setHeadingSkeleton(false);
    state.appReady = true;
    updateAppReadyState();
}

export function renderLastSession(workout) {
    if (!$("#last-session-title")) return;
    $("#last-session-title").textContent = workout?.exercise || t("dashboard.noLastSession");
    $("#last-session-detail").textContent = workout ? `${workout.dateLabel} · ${workoutDetail(workout)}` : "";
}

export function renderActivity() {
    const days = state.dashboard?.weekDays || [];
    const labels = [
        t("calendar.mon"), t("calendar.tue"), t("calendar.wed"), t("calendar.thu"),
        t("calendar.fri"), t("calendar.sat"), t("calendar.sun"),
    ];
    $("#activity-strip").innerHTML = days.map((day, index) => `
        <div class="week-day ${day.active ? "done" : ""} ${day.today ? "today" : ""} ${day.future ? "future" : ""}">
            <span>${escapeHtml(labels[index] || "")}</span>
            <strong>${day.active ? "✓" : day.day}</strong>
        </div>
    `).join("");
}

export function renderActivityCalendar(days) {
    const weekdays = [
        t("calendar.mon"),
        t("calendar.tue"),
        t("calendar.wed"),
        t("calendar.thu"),
        t("calendar.fri"),
        t("calendar.sat"),
        t("calendar.sun"),
    ];
    $("#activity-calendar-weekdays").innerHTML = weekdays.map(day => `<span>${escapeHtml(day)}</span>`).join("");
    $("#activity-calendar-grid").innerHTML = days.map(day => `
        <span class="activity-calendar-day ${day.active ? "active" : ""} ${day.today ? "today" : ""} ${day.future ? "future" : ""} ${day.outsideMonth ? "outside-month" : ""}" title="${escapeHtml(day.date)}">
            <em>${day.day}</em>
        </span>
    `).join("");
}

export function renderStreakWeeks(weeks) {
    const visibleWeeks = weeks.slice(-7);
    $("#streak-week-strip").innerHTML = visibleWeeks.map(week => `
        <div class="streak-week ${week.hasWorkout ? "active" : ""} ${week.isCurrent ? "current" : ""}">
            <span>${escapeHtml(week.label)}</span>
            <strong>${week.hasWorkout ? "✓" : ""}</strong>
        </div>
    `).join("");
}
