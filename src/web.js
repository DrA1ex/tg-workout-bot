import * as dotenv from "dotenv";
import http from "node:http";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {Op} from "sequelize";

import {ensureDb, models} from "./db/index.js";
import {ExerciseDAO, UserDAO, WorkoutDAO} from "./dao/index.js";
import {formatDate} from "./i18n/index.js";
import {createDateFilterClause, createDateGroupAttribute} from "./utils/timezone.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "web", "public");
const port = Number(process.env.WEB_PORT || process.env.PORT || 8080);

await ensureDb();

function sendJson(res, status, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
    });
    res.end(body);
}

function notFound(res) {
    sendJson(res, 404, {error: "Not found"});
}

async function parseBody(req) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (!chunks.length) return {};

    try {
        return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
        throw new Error("Invalid JSON body");
    }
}

async function resolveUser(url) {
    const telegramId = url.searchParams.get("telegramId") || process.env.WEB_TELEGRAM_ID;
    if (telegramId) {
        const [user] = await UserDAO.findOrCreate(String(telegramId), {language: "en"});
        return user;
    }

    const existing = await models.User.findOne({order: [["telegramId", "ASC"]]});
    if (existing) return existing;

    const [created] = await UserDAO.findOrCreate("web-demo", {
        language: "en",
        timezone: "UTC",
    });
    return created;
}

function normalizeExercise(exercise) {
    if (typeof exercise === "string") return {name: exercise, notes: ""};
    return {name: exercise.name, notes: exercise.notes || ""};
}

function workoutPayload(row, language, timezone) {
    return {
        id: row.id,
        date: row.date,
        dateLabel: formatDate(new Date(row.date), language, timezone),
        exercise: row.exercise,
        sets: row.sets,
        weight: row.weight,
        repsOrTime: row.repsOrTime,
        isTime: row.isTime,
        notes: row.notes || "",
        summary: row.formatStringWithoutDate(language),
    };
}

function parseWorkoutId(pathname) {
    const match = pathname.match(/^\/api\/workouts\/(\d+)$/);
    return match ? Number.parseInt(match[1], 10) : null;
}

function parseWorkoutBody(body, fallbackDate = new Date()) {
    const exercise = String(body.exercise || "").trim();
    const date = body.date ? new Date(`${body.date}T12:00:00Z`) : fallbackDate;
    const sets = Number.parseInt(body.sets, 10);
    const repsOrTime = Number.parseFloat(body.repsOrTime);

    if (!exercise) throw new Error("Exercise is required");
    if (!Number.isFinite(sets) || sets <= 0) throw new Error("Sets must be a positive number");
    if (!Number.isFinite(repsOrTime) || repsOrTime <= 0) throw new Error("Reps or time must be a positive number");

    return {
        date: date.toISOString(),
        exercise,
        sets,
        weight: body.weight === "" || body.weight == null ? null : Number.parseFloat(body.weight),
        repsOrTime,
        isTime: Boolean(body.isTime),
        notes: String(body.notes || "").trim(),
    };
}

function weekStartUtc(date) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() - day + 1);
    return d;
}

function addDays(date, days) {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + days);
    return d;
}

function addWeeks(date, weeks) {
    return addDays(date, weeks * 7);
}

function dateOnly(date) {
    return date.toISOString().slice(0, 10);
}

function volumeFor(row) {
    if (row.isTime || !row.weight || !row.repsOrTime || !row.sets) return 0;
    return row.sets * row.weight * row.repsOrTime;
}

function shortWeekLabel(date) {
    const end = addDays(date, 6);
    return `${date.toISOString().slice(5, 10)}..${end.toISOString().slice(5, 10)}`;
}

async function getRecentWorkouts(telegramId, language, timezone, limit = 8) {
    const rows = await models.Workout.findAll({
        where: {telegramId},
        order: [["date", "DESC"], ["id", "DESC"]],
        limit,
    });

    return rows.map(row => workoutPayload(row, language, timezone));
}

async function getDashboard(user) {
    const language = user.language || "en";
    const timezone = user.timezone || "UTC";
    const q = models.Workout.sequelize;
    const today = new Date();
    const currentWeekStart = weekStartUtc(today);
    const todayKey = dateOnly(today);

    const todayRows = await WorkoutDAO.getWorkoutsByDate(user.telegramId, todayKey, timezone);
    const weekRows = await models.Workout.findAll({
        where: {
            telegramId: user.telegramId,
            date: {[Op.gte]: currentWeekStart},
        },
        order: [["date", "ASC"]],
    });

    const dateRows = await models.Workout.findAll({
        attributes: [createDateGroupAttribute(q, "date", "d", timezone)],
        where: {telegramId: user.telegramId},
        group: ["d"],
        order: [[q.literal("d"), "DESC"]],
    });
    const workoutDates = dateRows.map(row => row.get("d"));
    const workoutWeeks = new Set(workoutDates.map(value => dateOnly(weekStartUtc(new Date(`${value}T00:00:00Z`)))));
    const workoutDatesSet = new Set(workoutDates);

    let weeklyStreak = 0;
    let cursor = workoutDates.length
        ? weekStartUtc(new Date(`${workoutDates[0]}T00:00:00Z`))
        : currentWeekStart;
    while (workoutWeeks.has(dateOnly(cursor))) {
        weeklyStreak += 1;
        cursor = addDays(cursor, -7);
    }

    const recent = await getRecentWorkouts(user.telegramId, language, timezone);
    const weeklyVolume = weekRows.reduce((sum, row) => sum + volumeFor(row), 0);
    const exerciseCount = new Set(weekRows.map(row => row.exercise)).size;
    const weeklyDays = new Set(weekRows.map(row => dateOnly(new Date(row.date)))).size;
    const activityAnchor = workoutDates.length
        ? weekStartUtc(new Date(`${workoutDates[0]}T00:00:00Z`))
        : currentWeekStart;
    const activity = Array.from({length: 8}, (_, index) => {
        const start = addWeeks(activityAnchor, index - 7);
        const days = Array.from({length: 7}, (_unused, dayIndex) => dateOnly(addDays(start, dayIndex)));
        const activeDays = days.filter(day => workoutDatesSet.has(day)).length;

        return {
            week: dateOnly(start),
            label: shortWeekLabel(start),
            activeDays,
            hasWorkout: activeDays > 0,
            isCurrent: dateOnly(start) === dateOnly(currentWeekStart),
        };
    });

    return {
        profile: {
            telegramId: user.telegramId,
            language,
            timezone,
            theme: user.theme || "system",
        },
        today: {
            label: formatDate(today, language, timezone, {weekday: "short", month: "short", day: "numeric"}),
            workouts: todayRows.map(row => workoutPayload(row, language, timezone)),
        },
        stats: {
            weeklyStreak,
            weeklyVolume: Math.round(weeklyVolume),
            weeklyWorkouts: weekRows.length,
            weeklyExercises: exerciseCount,
            weeklyDays,
        },
        activity,
        lastSession: recent[0] || null,
        recent,
    };
}

async function getHistory(user) {
    const language = user.language || "en";
    const timezone = user.timezone || "UTC";
    const dates = await WorkoutDAO.getDatesWithWorkouts(user.telegramId, timezone);
    const groups = [];

    for (const date of dates.slice(0, 30)) {
        const rows = await WorkoutDAO.getWorkoutsByDate(user.telegramId, date, timezone);
        groups.push({
            date,
            label: formatDate(new Date(`${date}T00:00:00Z`), language, timezone, {
                weekday: "short",
                month: "short",
                day: "numeric",
            }),
            workouts: rows.map(row => workoutPayload(row, language, timezone)),
        });
    }

    return {groups};
}

async function getProgress(user, exercise) {
    const language = user.language || "en";
    const timezone = user.timezone || "UTC";
    const exercises = (await ExerciseDAO.getUserExercises(user.telegramId)).map(normalizeExercise);
    const selectedExercise = exercise || exercises[0]?.name;

    if (!selectedExercise) {
        return {exercise: null, points: [], best: null, latest: null};
    }

    const rows = await WorkoutDAO.getWorkoutsByExercise(user.telegramId, selectedExercise);
    const points = rows.map(row => ({
        id: row.id,
        date: row.date,
        label: formatDate(new Date(row.date), language, timezone, {month: "short", day: "numeric"}),
        sets: row.sets || 0,
        weight: row.weight || 0,
        repsOrTime: row.repsOrTime || 0,
        volume: volumeFor(row),
        isTime: row.isTime,
    }));

    const best = points.reduce((max, point) => point.volume > (max?.volume || 0) ? point : max, null);

    return {
        exercise: selectedExercise,
        exercises,
        points,
        best,
        latest: points.at(-1) || null,
    };
}

async function handleApi(req, res, url) {
    const user = await resolveUser(url);
    const workoutId = parseWorkoutId(url.pathname);

    if (req.method === "GET" && url.pathname === "/api/bootstrap") {
        const exercises = (await ExerciseDAO.getUserExercises(user.telegramId)).map(normalizeExercise);
        return sendJson(res, 200, {
            user: {
                telegramId: user.telegramId,
                language: user.language || "en",
                timezone: user.timezone || "UTC",
                theme: user.theme || "system",
            },
            exercises,
        });
    }

    if (req.method === "GET" && url.pathname === "/api/dashboard") {
        return sendJson(res, 200, await getDashboard(user));
    }

    if (req.method === "GET" && url.pathname === "/api/history") {
        return sendJson(res, 200, await getHistory(user));
    }

    if (req.method === "GET" && url.pathname === "/api/exercises") {
        const exercises = (await ExerciseDAO.getUserExercises(user.telegramId)).map(normalizeExercise);
        return sendJson(res, 200, {exercises});
    }

    if (req.method === "POST" && url.pathname === "/api/exercises") {
        const body = await parseBody(req);
        const name = String(body.name || "").trim();
        if (!name) return sendJson(res, 400, {error: "Exercise name is required"});

        await ExerciseDAO.addUserExercise(user.telegramId, {
            name,
            notes: String(body.notes || "").trim(),
        });
        const exercises = (await ExerciseDAO.getUserExercises(user.telegramId)).map(normalizeExercise);
        return sendJson(res, 201, {exercises});
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
        return sendJson(res, 200, await getProgress(user, url.searchParams.get("exercise")));
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

async function serveStatic(res, pathname) {
    const file = pathname === "/" ? "index.html" : pathname.slice(1);
    const target = path.normalize(path.join(publicDir, file));
    if (!target.startsWith(publicDir)) return notFound(res);

    const types = {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".svg": "image/svg+xml",
    };

    try {
        const data = await readFile(target);
        res.writeHead(200, {"Content-Type": types[path.extname(target)] || "application/octet-stream"});
        res.end(data);
    } catch {
        notFound(res);
    }
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    try {
        if (url.pathname.startsWith("/api/")) {
            return await handleApi(req, res, url);
        }
        return await serveStatic(res, url.pathname);
    } catch (error) {
        console.error(error);
        return sendJson(res, 500, {error: error.message || "Internal server error"});
    }
});

server.listen(port, () => {
    console.log(`Workout WebUI running at http://localhost:${port}`);
});
