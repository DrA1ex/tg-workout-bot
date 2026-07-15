import {WorkoutDAO} from "../../../dao/index.js";
import {models} from "../../../db/index.js";
import {HttpError} from "../errors.js";
import {parseBody, sendJson} from "../http.js";
import {parseWorkoutBody, workoutAchievements, workoutPayload} from "../services/workouts.js";

const MAX_DEDUPE_TOKEN_LENGTH = 120;

function parseWorkoutId(pathname) {
    const match = pathname.match(/^\/api\/workouts\/(\d+)$/);
    return match ? Number.parseInt(match[1], 10) : null;
}

function normalizeDedupeToken(value) {
    const token = String(value || "").trim();
    return token ? token.slice(0, MAX_DEDUPE_TOKEN_LENGTH) : null;
}

function parseWorkoutInput(body, fallbackDate, timezone) {
    try {
        return parseWorkoutBody(body, fallbackDate, timezone);
    } catch (error) {
        throw new HttpError(400, error.message, "VALIDATION_ERROR");
    }
}

export async function handleWorkoutApi(req, res, url, user, config) {
    const workoutId = parseWorkoutId(url.pathname);
    const language = user.language || "en";
    const timezone = user.timezone || "UTC";

    if (req.method === "GET" && url.pathname === "/api/workouts/previous") {
        const exercise = String(url.searchParams.get("exercise") || "").trim();
        if (!exercise) throw new HttpError(400, "Exercise is required", "VALIDATION_ERROR");
        const workout = await WorkoutDAO.getLastWorkout(user.telegramId, exercise);
        return sendJson(res, 200, {workout: workout ? workoutPayload(workout, language, timezone) : null});
    }

    if (req.method === "POST" && url.pathname === "/api/workouts") {
        const body = await parseBody(req, {maxBytes: config.maxBodyBytes});
        const dedupeToken = normalizeDedupeToken(body.deduplicationToken);
        const workoutData = parseWorkoutInput(body, new Date(), timezone);

        if (dedupeToken) {
            const existing = await models.Workout.findOne({where: {telegramId: user.telegramId, dedupeToken}});
            if (existing) return sendJson(res, 200, workoutPayload(existing, language, timezone));
        }

        const achievements = await workoutAchievements(user.telegramId, workoutData, timezone);
        let workout;
        let status = 201;
        try {
            workout = await WorkoutDAO.create({telegramId: user.telegramId, dedupeToken, ...workoutData});
        } catch (error) {
            if (!dedupeToken || error.name !== "SequelizeUniqueConstraintError") throw error;
            workout = await models.Workout.findOne({where: {telegramId: user.telegramId, dedupeToken}});
            if (!workout) throw error;
            status = 200;
        }
        return sendJson(res, status, {
            ...workoutPayload(workout, language, timezone),
            ...(status === 201 ? {achievements} : {}),
        });
    }

    if (req.method === "PATCH" && workoutId) {
        const workout = await models.Workout.findOne({where: {id: workoutId, telegramId: user.telegramId}});
        if (!workout) throw new HttpError(404, "Workout not found", "WORKOUT_NOT_FOUND");
        const body = await parseBody(req, {maxBytes: config.maxBodyBytes});
        Object.assign(workout, parseWorkoutInput(body, new Date(workout.date), timezone));
        await workout.save();
        return sendJson(res, 200, workoutPayload(workout, language, timezone));
    }

    if (req.method === "DELETE" && workoutId) {
        const deleted = await WorkoutDAO.deleteById(workoutId, user.telegramId);
        if (!deleted) throw new HttpError(404, "Workout not found", "WORKOUT_NOT_FOUND");
        return sendJson(res, 200, {deleted: true});
    }

    return null;
}
