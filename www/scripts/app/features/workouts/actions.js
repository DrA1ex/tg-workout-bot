// Extracted from main.js without changing feature behavior.
import {$, api} from '../../deps.js';
import {refreshWorkoutData} from '../../data/workout-refresh.js';
import {confirmWorkoutDelete, setDeleteWorkoutPending, showToast} from '../../ui/dialogs.js';
import {removeWorkoutFromLoadedState} from './state.js';

export async function deleteWorkout(id) {
    if (!await confirmWorkoutDelete()) return false;
    try {
        await api(`workouts/${id}`, {method: "DELETE"});
        $("#delete-workout-dialog").close();
        removeWorkoutFromLoadedState(id);
        try {
            await refreshWorkoutData();
        } catch (refreshError) {
            console.error(refreshError);
            showToast("toast.refreshFailed", {variant: "danger"});
        }
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
