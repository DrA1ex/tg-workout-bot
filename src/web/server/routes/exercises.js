import {ExerciseDAO, AlreadyExistsError} from "../../../dao/index.js";
import {HttpError} from "../errors.js";
import {parseBody, sendJson} from "../http.js";
import {applyUserExerciseChanges, getRecentUserExercises, getUserExercisesNormalized, updateUserExercise} from "../services/exercises.js";

const MAX_NAME_LENGTH = 120;
const MAX_NOTES_LENGTH = 2000;

function parseExerciseName(pathname) {
    const match = pathname.match(/^\/api\/exercises\/(.+)$/);
    if (!match || match[1] === "global" || match[1] === "recent" || match[1] === "batch") return null;
    try {
        return decodeURIComponent(match[1]);
    } catch {
        throw new HttpError(400, "Invalid exercise name", "VALIDATION_ERROR");
    }
}

function exerciseInput(value) {
    const name = String(value?.name || "").trim();
    const notes = String(value?.notes || "").trim();
    if (!name) throw new HttpError(400, "Exercise name is required", "VALIDATION_ERROR");
    if (name.length > MAX_NAME_LENGTH) throw new HttpError(400, `Exercise name must be at most ${MAX_NAME_LENGTH} characters`, "VALIDATION_ERROR");
    if (notes.length > MAX_NOTES_LENGTH) throw new HttpError(400, `Exercise notes must be at most ${MAX_NOTES_LENGTH} characters`, "VALIDATION_ERROR");
    return {name, notes};
}

function changePayload(result) {
    return {
        exercises: result.exercises,
        added: result.added || [],
        deleted: result.deleted || [],
        ...(result.updated ? {updated: result.updated} : {}),
    };
}

export async function handleExerciseApi(req, res, url, user, config) {
    const exerciseName = parseExerciseName(url.pathname);

    if (req.method === "GET" && url.pathname === "/api/exercises") {
        return sendJson(res, 200, {exercises: await getUserExercisesNormalized(user.telegramId)});
    }

    if (req.method === "GET" && url.pathname === "/api/exercises/recent") {
        return sendJson(res, 200, {
            exercises: await getRecentUserExercises(user.telegramId, url.searchParams.get("limit") || 10),
        });
    }

    if (req.method === "GET" && url.pathname === "/api/exercises/global") {
        const search = String(url.searchParams.get("search") || "").trim().slice(0, 100);
        const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get("limit") || "25", 10) || 25, 1), 100);
        const offset = Math.min(Math.max(Number.parseInt(url.searchParams.get("offset") || "0", 10) || 0, 0), 10_000);
        const existing = new Set((await getUserExercisesNormalized(user.telegramId)).map(ex => ex.name.toLocaleLowerCase()));
        const page = search
            ? await ExerciseDAO.searchGlobalExercises(search, offset, limit + 1).then(rows => ({items: rows.slice(0, limit), hasNext: rows.length > limit}))
            : await ExerciseDAO.getGlobalExercisesPageWithNext(offset, limit);
        return sendJson(res, 200, {
            exercises: page.items.map(row => ({name: row.name, added: existing.has(row.name.toLocaleLowerCase())})),
            hasNext: page.hasNext,
            nextOffset: offset + page.items.length,
        });
    }

    if (req.method === "POST" && url.pathname === "/api/exercises/global") {
        const body = await parseBody(req, {maxBytes: config.maxBodyBytes});
        const exercise = exerciseInput(body);
        await ExerciseDAO.addGlobalExercise(exercise.name);
        return sendJson(res, 201, {exercise: {name: exercise.name, added: false}});
    }

    if (req.method === "PATCH" && url.pathname === "/api/exercises") {
        const body = await parseBody(req, {maxBytes: config.maxBodyBytes});
        const added = Array.isArray(body.added) ? body.added.map(exerciseInput) : [];
        const deleted = Array.isArray(body.deleted) ? body.deleted.map(value => String(typeof value === "string" ? value : value?.name || "").trim()).filter(Boolean) : [];
        if (!added.length && !deleted.length) throw new HttpError(400, "At least one added or deleted exercise is required", "VALIDATION_ERROR");
        return sendJson(res, 200, changePayload(await applyUserExerciseChanges(user.telegramId, {added, deleted})));
    }

    if (req.method === "POST" && url.pathname === "/api/exercises/batch") {
        const body = await parseBody(req, {maxBytes: config.maxBodyBytes});
        const added = Array.isArray(body.exercises) ? body.exercises.map(exerciseInput) : [];
        if (!added.length) throw new HttpError(400, "Exercises are required", "VALIDATION_ERROR");
        return sendJson(res, 201, changePayload(await applyUserExerciseChanges(user.telegramId, {added})));
    }

    if (req.method === "POST" && url.pathname === "/api/exercises") {
        const body = await parseBody(req, {maxBytes: config.maxBodyBytes});
        const exercise = exerciseInput(body);
        try {
            const result = await applyUserExerciseChanges(user.telegramId, {added: [exercise]});
            if (!result.added.length) throw new AlreadyExistsError();
            return sendJson(res, 201, changePayload(result));
        } catch (error) {
            if (error instanceof AlreadyExistsError) throw new HttpError(409, "Exercise already exists", "EXERCISE_EXISTS");
            throw error;
        }
    }

    if (req.method === "PATCH" && exerciseName) {
        const body = await parseBody(req, {maxBytes: config.maxBodyBytes});
        const updates = {};
        if (Object.hasOwn(body, "name")) {
            const name = String(body.name || "").trim();
            if (!name) throw new HttpError(400, "Exercise name is required", "VALIDATION_ERROR");
            if (name.length > MAX_NAME_LENGTH) throw new HttpError(400, `Exercise name must be at most ${MAX_NAME_LENGTH} characters`, "VALIDATION_ERROR");
            updates.name = name;
        }
        if (Object.hasOwn(body, "notes")) {
            const notes = String(body.notes || "").trim();
            if (notes.length > MAX_NOTES_LENGTH) throw new HttpError(400, `Exercise notes must be at most ${MAX_NOTES_LENGTH} characters`, "VALIDATION_ERROR");
            updates.notes = notes;
        }
        if (!Object.keys(updates).length) throw new HttpError(400, "At least one exercise field is required", "VALIDATION_ERROR");
        return sendJson(res, 200, changePayload(await updateUserExercise(user.telegramId, exerciseName, updates)));
    }

    if (req.method === "DELETE" && exerciseName) {
        const result = await applyUserExerciseChanges(user.telegramId, {deleted: [exerciseName]});
        if (!result.deleted.length) throw new HttpError(404, "Exercise not found", "EXERCISE_NOT_FOUND");
        return sendJson(res, 200, changePayload(result));
    }

    return null;
}
