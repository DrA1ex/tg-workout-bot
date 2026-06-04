import {ExerciseDAO, UserDAO, WorkoutDAO} from "../../../dao/index.js";
import {models} from "../../../db/index.js";
import {resolveUser, authUserPayload} from "../auth/user.js";
import {notFound, parseBody, sendJson} from "../http.js";
import {getDashboard} from "../services/dashboard.js";
import {getRecentUserExercises, getUserExercisesNormalized, setUserExerciseList} from "../services/exercises.js";
import {getHistory} from "../services/history.js";
import {getProgress} from "../services/progress.js";
import {parseWorkoutBody, workoutPayload} from "../services/workouts.js";
import {handleAuthApi} from "./auth.js";

function parseWorkoutId(pathname) {
    const match = pathname.match(/^\/api\/workouts\/(\d+)$/);
    return match ? Number.parseInt(match[1], 10) : null;
}

function parseExerciseName(pathname) {
    const match = pathname.match(/^\/api\/exercises\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
}

export async function handleApi(req, res, url, config) {
    if (url.pathname.startsWith("/api/auth/")) {
        const handled = await handleAuthApi(req, res, url, config);
        if (handled !== null) return handled;
    }

    const user = await resolveUser(req, url, config);
    const workoutId = parseWorkoutId(url.pathname);
    const exerciseName = parseExerciseName(url.pathname);

    if (req.method === "GET" && url.pathname === "/api/bootstrap") {
        const exercises = await getUserExercisesNormalized(user.telegramId);
        return sendJson(res, 200, {
            user: {
                ...authUserPayload(user),
            },
            auth: {
                session: true,
                dev: config.devAuthEnabled,
            },
            exercises,
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

    if (req.method === "GET" && url.pathname === "/api/workouts/previous") {
        const exercise = String(url.searchParams.get("exercise") || "").trim();
        if (!exercise) return sendJson(res, 400, {error: "Exercise is required"});

        const workout = await WorkoutDAO.getLastWorkout(user.telegramId, exercise);
        return sendJson(res, 200, {
            workout: workout ? workoutPayload(workout, user.language || "en", user.timezone || "UTC") : null,
        });
    }

    if (req.method === "GET" && url.pathname === "/api/exercises") {
        const exercises = await getUserExercisesNormalized(user.telegramId);
        return sendJson(res, 200, {exercises});
    }

    if (req.method === "GET" && url.pathname === "/api/exercises/recent") {
        const exercises = await getRecentUserExercises(user.telegramId, url.searchParams.get("limit") || 10);
        return sendJson(res, 200, {exercises});
    }

    if (req.method === "GET" && url.pathname === "/api/exercises/global") {
        const search = String(url.searchParams.get("search") || "").trim();
        const existing = new Set((await getUserExercisesNormalized(user.telegramId)).map(ex => ex.name));
        const rows = search
            ? await ExerciseDAO.searchGlobalExercises(search, 25)
            : (await ExerciseDAO.getGlobalExercisesPageWithNext(0, 25)).items;

        return sendJson(res, 200, {
            exercises: rows.map(row => ({
                name: row.name,
                added: existing.has(row.name),
            })),
        });
    }

    if (req.method === "POST" && url.pathname === "/api/exercises") {
        const body = await parseBody(req);
        const name = String(body.name || "").trim();
        if (!name) return sendJson(res, 400, {error: "Exercise name is required"});

        try {
            await ExerciseDAO.addUserExercise(user.telegramId, {
                name,
                notes: String(body.notes || "").trim(),
            });
        } catch (error) {
            return sendJson(res, 409, {error: error.message || "Exercise already exists"});
        }
        const exercises = await getUserExercisesNormalized(user.telegramId);
        return sendJson(res, 201, {exercises});
    }

    if (req.method === "PATCH" && exerciseName) {
        const body = await parseBody(req);
        const exercises = await getUserExercisesNormalized(user.telegramId);
        const current = exercises.find(ex => ex.name === exerciseName);
        if (!current) return sendJson(res, 404, {error: "Exercise not found"});

        current.notes = String(body.notes || "").trim();
        return sendJson(res, 200, {exercises: await setUserExerciseList(user.telegramId, exercises)});
    }

    if (req.method === "DELETE" && exerciseName) {
        const exercises = await getUserExercisesNormalized(user.telegramId);
        const next = exercises.filter(ex => ex.name !== exerciseName);
        if (next.length === exercises.length) return sendJson(res, 404, {error: "Exercise not found"});

        return sendJson(res, 200, {exercises: await setUserExerciseList(user.telegramId, next)});
    }

    if (req.method === "POST" && url.pathname === "/api/workouts") {
        const body = await parseBody(req);
        let workoutData;
        try {
            workoutData = parseWorkoutBody(body);
        } catch (error) {
            return sendJson(res, 400, {error: error.message});
        }

        const workout = await WorkoutDAO.create({
            telegramId: user.telegramId,
            ...workoutData,
        });

        return sendJson(res, 201, workoutPayload(workout, user.language || "en", user.timezone || "UTC"));
    }

    if (req.method === "PATCH" && workoutId) {
        const workout = await models.Workout.findOne({
            where: {id: workoutId, telegramId: user.telegramId},
        });
        if (!workout) return sendJson(res, 404, {error: "Workout not found"});

        const body = await parseBody(req);
        let workoutData;
        try {
            workoutData = parseWorkoutBody(body, new Date(workout.date));
        } catch (error) {
            return sendJson(res, 400, {error: error.message});
        }

        Object.assign(workout, workoutData);
        await workout.save();

        return sendJson(res, 200, workoutPayload(workout, user.language || "en", user.timezone || "UTC"));
    }

    if (req.method === "DELETE" && workoutId) {
        const deleted = await WorkoutDAO.deleteById(workoutId, user.telegramId);
        if (!deleted) return sendJson(res, 404, {error: "Workout not found"});

        return sendJson(res, 200, {deleted: true});
    }

    if (req.method === "GET" && url.pathname === "/api/progress") {
        return sendJson(res, 200, await getProgress(
            user,
            url.searchParams.get("exercise"),
            url.searchParams.get("period") || "all"
        ));
    }

    if (req.method === "PATCH" && url.pathname === "/api/settings") {
        const body = await parseBody(req);
        const updates = {};
        if (body.language) updates.language = String(body.language);
        if (body.timezone) updates.timezone = String(body.timezone);

        const updated = Object.keys(updates).length ? await UserDAO.update(user.telegramId, updates) : user;
        return sendJson(res, 200, {
            user: {
                telegramId: updated.telegramId,
                language: updated.language || "en",
                timezone: updated.timezone || "UTC",
                theme: updated.theme || "system",
            },
        });
    }

    return notFound(res);
}
