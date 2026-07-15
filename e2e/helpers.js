import {expect} from "@playwright/test";

export const E2E_EXERCISE = "E2E Bench Press";

async function json(response) {
    const body = await response.json();
    expect(response.ok(), JSON.stringify(body)).toBeTruthy();
    return body;
}

export async function authenticateApi(request) {
    const status = await json(await request.get("/api/auth/status"));
    expect(status.authenticated).toBe(true);
    return status.user;
}

export async function resetUser(request) {
    await authenticateApi(request);

    while (true) {
        const history = await json(await request.get("/api/history?offset=0&limit=30"));
        const ids = (history.groups || []).flatMap(group => group.workouts || []).map(workout => workout.id);
        if (!ids.length) break;
        for (const id of ids) {
            await json(await request.delete(`/api/workouts/${id}`));
        }
    }

    const exerciseData = await json(await request.get("/api/exercises"));
    const deleted = (exerciseData.exercises || []).map(exercise => exercise.name);
    if (deleted.length) {
        await json(await request.patch("/api/exercises", {data: {added: [], deleted}}));
    }

    await json(await request.patch("/api/settings", {
        data: {
            language: "en",
            timezone: "UTC",
            theme: "system",
            accentColor: "blue",
        },
    }));
}

export async function addExercise(request, name = E2E_EXERCISE, notes = "E2E exercise note") {
    const result = await json(await request.patch("/api/exercises", {
        data: {added: [{name, notes}], deleted: []},
    }));
    expect(result.exercises.some(exercise => exercise.name === name)).toBe(true);
    return name;
}

export async function addWorkout(request, {
    exercise = E2E_EXERCISE,
    sets = 3,
    weight = 60,
    repsOrTime = 8,
    notes = "E2E workout note",
} = {}) {
    const dashboard = await json(await request.get("/api/dashboard"));
    return json(await request.post("/api/workouts", {
        data: {
            date: dashboard.today.key,
            exercise,
            sets,
            hasWeight: true,
            weight,
            repsOrTime,
            isTime: false,
            notes,
            deduplicationToken: `e2e-${Date.now()}-${Math.random()}`,
        },
    }));
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

export async function openApp(page) {
    await page.route("https://telegram.org/**", route => route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: "window.Telegram = window.Telegram || {};",
    }));
    await page.goto("/", {waitUntil: "domcontentloaded"});
    await expect(page.locator(".app-shell")).toBeVisible();
    await expect(page.locator("#dashboard-content")).toBeVisible();
    await expect(page.locator("#nav-add")).toBeEnabled();
}

export async function expectNoBrowserProblems(problems) {
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(problems).toEqual([]);
}
