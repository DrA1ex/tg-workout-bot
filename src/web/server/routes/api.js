import {resolveUser} from "../auth/user.js";
import {notFound} from "../http.js";
import {handleAuthApi} from "./auth.js";
import {handleDataApi} from "./data.js";
import {handleExerciseApi} from "./exercises.js";
import {handleSettingsApi} from "./settings.js";
import {handleWorkoutApi} from "./workouts.js";

export async function handleApi(req, res, url, config) {
    if (url.pathname.startsWith("/api/auth/")) {
        const authResult = await handleAuthApi(req, res, url, config);
        if (authResult !== null) return authResult;
    }

    const user = await resolveUser(req, url, config);
    const handlers = [handleDataApi, handleExerciseApi, handleWorkoutApi, handleSettingsApi];
    for (const handler of handlers) {
        const result = await handler(req, res, url, user, config);
        if (result !== null) return result;
    }
    return notFound(res);
}
