// Extracted from main.js without changing feature behavior.
import {todayInputValue} from '../../core/utils.js';
import {state} from '../../deps.js';
import {renderDashboard} from '../dashboard/index.js';
import {renderExercises} from '../exercises/catalog.js';
import {renderHistory} from '../history/index.js';
import {renderProgress} from '../progress/index.js';
import {updatePreviousWorkoutSummary} from './forms.js';
import {workoutDateInputValue} from './presentation.js';

export function removeWorkoutFromLoadedState(id) {
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

export function replaceWorkoutInRows(rows, workout) {
    return (rows || []).map(row => String(row.id) === String(workout.id) ? workout : row);
}

export function upsertWorkoutInRows(rows, workout) {
    const next = replaceWorkoutInRows(rows, workout);
    return next.some(row => String(row.id) === String(workout.id)) ? next : [...next, workout];
}

export function updateWorkoutInLoadedState(workout) {
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

export function addWorkoutToLoadedState(workout, dateKey) {
    if (state.dashboard) {
        const isToday = dateKey === todayInputValue();
        const recent = [workout, ...(state.dashboard.recent || []).filter(row => String(row.id) !== String(workout.id))].slice(0, 8);
        const todayWorkouts = state.dashboard.today?.workouts || [];
        state.dashboard = {
            ...state.dashboard,
            today: {
                ...state.dashboard.today,
                workouts: isToday
                    ? [...todayWorkouts.filter(row => String(row.id) !== String(workout.id)), workout]
                    : todayWorkouts,
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
