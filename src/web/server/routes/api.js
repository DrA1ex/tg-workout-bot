import {ExerciseDAO, UserDAO, WorkoutDAO} from "../../../dao/index.js";
import {models} from "../../../db/index.js";
import {resolveUser, authUserPayload} from "../auth/user.js";
import {notFound, parseBody, sendJson} from "../http.js";
import {getDashboard} from "../services/dashboard.js";
import {getRecentUserExercises, getUserExercisesNormalized, setUserExerciseList, updateUserExercise} from "../services/exercises.js";
import {getHistory} from "../services/history.js";
import {getProgress} from "../services/progress.js";
import {parseWorkoutBody, workoutAchievements, workoutPayload} from "../services/workouts.js";
import {handleAuthApi} from "./auth.js";
import {isValidTimezone, normalizeTimezoneOffset} from "../../../utils/timezone.js";

const VALID_THEMES = new Set(["system", "light", "dark"]);
const VALID_ACCENTS = new Set(["blue", "cyan", "green", "pink", "red", "purple", "orange"]);
const MAX_DEDUPE_TOKEN_LENGTH = 120;

function parseWorkoutId(pathname) {
    const match = pathname.match(/^\/api\/workouts\/(\d+)$/);
    return match ? Number.parseInt(match[1], 10) : null;
}

function parseExerciseName(pathname) {
    const match = pathname.match(/^\/api\/exercises\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
}

function normalizeDedupeToken(value) {
    const token = String(value || "").trim();
    if (!token) return null;
    return token.slice(0, MAX_DEDUPE_TOKEN_LENGTH);
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
        const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get("limit") || "25", 10) || 25, 1), 250);
        const offset = Math.max(Number.parseInt(url.searchParams.get("offset") || "0", 10) || 0, 0);
        const existing = new Set((await getUserExercisesNormalized(user.telegramId)).map(ex => ex.name));
        const page = search
            ? {items: await ExerciseDAO.searchGlobalExercises(search, offset + limit + 1), hasNext: false}
            : await ExerciseDAO.getGlobalExercisesPageWithNext(offset, limit);
        const rows = search ? page.items.slice(offset, offset + limit) : page.items;
        const hasNext = search ? page.items.length > offset + limit : page.hasNext;

        return sendJson(res, 200, {
            exercises: rows.map(row => ({
                name: row.name,
                added: existing.has(row.name),
            })),
            hasNext,
            nextOffset: offset + rows.length,
        });
    }

    if (req.method === "POST" && url.pathname === "/api/exercises/global") {
        const body = await parseBody(req);
        const name = String(body.name || "").trim();
        if (!name) return sendJson(res, 400, {error: "Exercise name is required"});

        await ExerciseDAO.addGlobalExercise(name);
        return sendJson(res, 201, {exercise: {name, added: false}});
    }

    if (req.method === "POST" && url.pathname === "/api/exercises/batch") {
        const body = await parseBody(req);
        const exercises = Array.isArray(body.exercises) ? body.exercises : [];
        if (!exercises.length) return sendJson(res, 400, {error: "Exercises are required"});

        try {
            const nextExercises = await ExerciseDAO.addUserExercisesBatch(user.telegramId, exercises);
            return sendJson(res, 201, {exercises: nextExercises.map(exercise =>
                typeof exercise === "string" ? {name: exercise, notes: ""} : {name: exercise.name, notes: exercise.notes || ""}
            )});
        } catch (error) {
            return sendJson(res, 409, {error: error.message || "Exercise already exists"});
        }
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
        try {
            return sendJson(res, 200, {
                exercises: await updateUserExercise(user.telegramId, exerciseName, {
                    name: body.name,
                    notes: body.notes,
                }),
            });
        } catch (error) {
            return sendJson(res, error.status || 500, {error: error.message || "Could not update exercise"});
        }
    }

    if (req.method === "DELETE" && exerciseName) {
        const exercises = await getUserExercisesNormalized(user.telegramId);
        const next = exercises.filter(ex => ex.name !== exerciseName);
        if (next.length === exercises.length) return sendJson(res, 404, {error: "Exercise not found"});

        return sendJson(res, 200, {exercises: await setUserExerciseList(user.telegramId, next)});
    }

    if (req.method === "POST" && url.pathname === "/api/workouts") {
        const body = await parseBody(req);
        const dedupeToken = normalizeDedupeToken(body.deduplicationToken);
        let workoutData;
        try {
            workoutData = parseWorkoutBody(body, new Date(), user.timezone || "UTC");
        } catch (error) {
            return sendJson(res, 400, {error: error.message});
        }

        if (dedupeToken) {
            const existing = await models.Workout.findOne({
                where: {telegramId: user.telegramId, dedupeToken},
            });
            if (existing) {
                return sendJson(res, 200, workoutPayload(existing, user.language || "en", user.timezone || "UTC"));
            }
        }

        const achievements = await workoutAchievements(user.telegramId, workoutData);
        let workout;
        let status = 201;
        try {
            workout = await WorkoutDAO.create({
                telegramId: user.telegramId,
                dedupeToken,
                ...workoutData,
            });
        } catch (error) {
            if (!dedupeToken || error.name !== "SequelizeUniqueConstraintError") throw error;
            workout = await models.Workout.findOne({
                where: {telegramId: user.telegramId, dedupeToken},
            });
            if (!workout) throw error;
            status = 200;
        }

        return sendJson(res, status, {
            ...workoutPayload(workout, user.language || "en", user.timezone || "UTC"),
            ...(status === 201 ? {achievements} : {}),
        });
    }

    if (req.method === "PATCH" && workoutId) {
        const workout = await models.Workout.findOne({
            where: {id: workoutId, telegramId: user.telegramId},
        });
        if (!workout) return sendJson(res, 404, {error: "Workout not found"});

        const body = await parseBody(req);
        let workoutData;
        try {
            workoutData = parseWorkoutBody(body, new Date(workout.date), user.timezone || "UTC");
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
        if (body.timezone) {
            if (!isValidTimezone(body.timezone)) {
                return sendJson(res, 400, {error: "Invalid timezone"});
            }
            updates.timezone = normalizeTimezoneOffset(body.timezone);
        }
        if (VALID_THEMES.has(body.theme)) updates.theme = body.theme;
        if (VALID_ACCENTS.has(body.accentColor)) updates.accentColor = body.accentColor;

        const updated = Object.keys(updates).length ? await UserDAO.update(user.telegramId, updates) : user;
        return sendJson(res, 200, {
            user: authUserPayload(updated),
        });
    }

    return notFound(res);
}
