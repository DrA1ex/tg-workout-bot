// Extracted from main.js without changing feature behavior.
import {$, api} from '../../deps.js';
import {confirmWorkoutDelete, setDeleteWorkoutPending, showToast} from '../../ui/dialogs.js';
import {removeWorkoutFromLoadedState} from './state.js';

export async function deleteWorkout(id) {
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
