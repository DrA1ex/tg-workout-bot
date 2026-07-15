import {authUserPayload} from "../auth/user.js";
import {sendJson} from "../http.js";
import {getDashboard} from "../services/dashboard.js";
import {getUserExercisesNormalized} from "../services/exercises.js";
import {getHistory} from "../services/history.js";
import {getProgress} from "../services/progress.js";

export async function handleDataApi(req, res, url, user, config) {
    if (req.method === "GET" && url.pathname === "/api/bootstrap") {
        return sendJson(res, 200, {
            user: authUserPayload(user),
            auth: {session: true, dev: config.devAuthEnabled},
            exercises: await getUserExercisesNormalized(user.telegramId),
        });
    }
    if (req.method === "GET" && url.pathname === "/api/dashboard") {
        return sendJson(res, 200, await getDashboard(user));
    }
    if (req.method === "GET" && url.pathname === "/api/history") {
        return sendJson(res, 200, await getHistory(user, {
            offset: url.searchParams.get("offset"),
            limit: url.searchParams.get("limit"),
        }));
    }
    if (req.method === "GET" && url.pathname === "/api/progress") {
        return sendJson(res, 200, await getProgress(user, url.searchParams.get("exercise"), url.searchParams.get("period") || "all"));
    }
    return null;
}
