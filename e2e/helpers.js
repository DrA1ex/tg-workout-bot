import {expect} from "@playwright/test";

export const E2E_EXERCISE = "E2E Bench Press";
export const SECOND_EXERCISE = "E2E Squat";

export async function readJson(response) {
    const body = await response.json();
    expect(response.ok(), JSON.stringify(body)).toBeTruthy();
    return body;
}

export async function authenticateApi(request) {
    const status = await readJson(await request.get("/api/auth/status"));
    expect(status.authenticated).toBe(true);
    return status.user;
}

export async function resetUser(request) {
    await authenticateApi(request);

    while (true) {
        const history = await readJson(await request.get("/api/history?offset=0&limit=30"));
        const ids = (history.groups || []).flatMap(group => group.workouts || []).map(workout => workout.id);
        if (!ids.length) break;
        for (const id of ids) {
            await readJson(await request.delete(`/api/workouts/${id}`));
        }
    }

    const exerciseData = await readJson(await request.get("/api/exercises"));
    const deleted = (exerciseData.exercises || []).map(exercise => exercise.name);
    if (deleted.length) {
        await readJson(await request.patch("/api/exercises", {data: {added: [], deleted}}));
    }

    await readJson(await request.patch("/api/settings", {
        data: {
            language: "en",
            timezone: "UTC",
            theme: "system",
            accentColor: "blue",
        },
    }));
}

export async function getDashboard(request) {
    return readJson(await request.get("/api/dashboard"));
}

export async function getTodayKey(request) {
    return (await getDashboard(request)).today.key;
}

export function shiftDateKey(dateKey, days) {
    const date = new Date(`${dateKey}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

export async function addExercise(request, name = E2E_EXERCISE, notes = "E2E exercise note") {
    const result = await readJson(await request.patch("/api/exercises", {
        data: {added: [{name, notes}], deleted: []},
    }));
    expect(result.exercises.some(exercise => exercise.name === name)).toBe(true);
    return name;
}

export async function addExercises(request, exercises) {
    const result = await readJson(await request.patch("/api/exercises", {
        data: {
            added: exercises.map(exercise => typeof exercise === "string" ? {name: exercise, notes: ""} : exercise),
            deleted: [],
        },
    }));
    return result.exercises;
}

export async function seedGlobalExercise(request, name) {
    const response = await request.post("/api/exercises/global", {data: {name}});
    if (response.status() !== 201) {
        const body = await response.json().catch(() => ({}));
        expect(response.ok(), JSON.stringify(body)).toBeTruthy();
    }
    return name;
}

export async function addWorkout(request, {
    exercise = E2E_EXERCISE,
    date,
    sets = 3,
    hasWeight = true,
    weight = 60,
    repsOrTime = 8,
    isTime = false,
    notes = "E2E workout note",
    deduplicationToken,
} = {}) {
    const workoutDate = date || await getTodayKey(request);
    return readJson(await request.post("/api/workouts", {
        data: {
            date: workoutDate,
            exercise,
            sets,
            hasWeight,
            weight: hasWeight ? weight : "",
            repsOrTime,
            isTime,
            notes,
            deduplicationToken: deduplicationToken || `e2e-${Date.now()}-${Math.random()}`,
        },
    }));
}

export async function listHistory(request, {offset = 0, limit = 100} = {}) {
    return readJson(await request.get(`/api/history?offset=${offset}&limit=${limit}`));
}

export function monitorBrowser(page) {
    const problems = [];

    page.on("pageerror", error => problems.push(`pageerror: ${error.message}`));
    page.on("console", message => {
        if (message.type() === "error") problems.push(`console: ${message.text()}`);
    });
    page.on("response", response => {
        if (response.url().startsWith("http://127.0.0.1:") && response.status() >= 500) {
            problems.push(`http ${response.status()}: ${response.url()}`);
        }
    });

    return problems;
}

export async function stubTelegram(page) {
    await page.route("https://telegram.org/**", route => route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: "window.Telegram = window.Telegram || {};",
    }));
}

export async function openApp(page, {path = "/", waitForDashboard = true} = {}) {
    await stubTelegram(page);
    await page.goto(path, {waitUntil: "domcontentloaded"});
    await expect(page.locator(".app-shell")).toBeVisible();
    if (waitForDashboard) {
        await expect(page.locator("#dashboard-content")).toBeVisible();
        await expect(page.locator("#nav-add")).toBeEnabled();
    }
}

export async function openOnboarding(page, {path = "/"} = {}) {
    await stubTelegram(page);
    await page.goto(path, {waitUntil: "domcontentloaded"});
    await expect(page.locator(".app-shell")).toBeVisible();
    await expect(page.locator("#onboarding-dialog")).toHaveJSProperty("open", true);
}

export async function openSettings(page) {
    await page.locator("#nav-settings").click();
    await expect(page.locator("#settings-form")).toBeVisible();
}

export async function openProgress(page) {
    await page.locator("#nav-progress").click();
    await expect(page.locator("#progress-content")).toBeVisible();
}

export async function openHistory(page) {
    await page.locator("#nav-history").click();
    await expect(page.locator("#history-list")).toBeVisible();
}

export async function openAddDialog(page) {
    await page.locator("#nav-add").click();
    await expect(page.locator("#add-dialog")).toHaveJSProperty("open", true);
}

export async function expectNoBrowserProblems(problems) {
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(problems).toEqual([]);
}
