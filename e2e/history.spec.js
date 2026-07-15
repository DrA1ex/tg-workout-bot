import {expect, test} from "@playwright/test";

import {
    E2E_EXERCISE,
    addExercise,
    addWorkout,
    getTodayKey,
    openApp,
    openHistory,
    resetUser,
    shiftDateKey,
} from "./helpers.js";

test.beforeEach(async ({request}) => {
    await resetUser(request);
});

test("history shows an empty state when there are no workouts", async ({page, request}) => {
    await addExercise(request);
    await openApp(page);
    await openHistory(page);
    await expect(page.locator("#history-list .empty")).toBeVisible();
    await expect(page.locator("#history-list [data-workout-id]")).toHaveCount(0);
});

test("history groups workouts by user-local date", async ({page, request}) => {
    await addExercise(request);
    const today = await getTodayKey(request);
    await addWorkout(request, {date: today, notes: "Today record"});
    await addWorkout(request, {date: shiftDateKey(today, -1), notes: "Yesterday record"});
    await openApp(page);
    await openHistory(page);
    await expect(page.locator("#history-list .history-day-group")).toHaveCount(2);
    await expect(page.locator("#history-list")).toContainText("Today record");
    await expect(page.locator("#history-list")).toContainText("Yesterday record");
});

test("history group header reports workouts in that day", async ({page, request}) => {
    await addExercise(request);
    await addWorkout(request, {notes: "First same-day workout"});
    await addWorkout(request, {notes: "Second same-day workout"});
    await openApp(page);
    await openHistory(page);
    const group = page.locator("#history-list .history-day-group").first();
    await expect(group.locator("header span").last()).toHaveText("2");
    await expect(group.locator("[data-workout-id]")).toHaveCount(2);
});

test("history workout row opens the edit sheet", async ({page, request}) => {
    await addExercise(request);
    const workout = await addWorkout(request, {notes: "Open from history"});
    await openApp(page);
    await openHistory(page);
    await page.locator(`#history-list [data-edit-workout='${workout.id}']`).click();
    await expect(page.locator("#edit-dialog")).toHaveJSProperty("open", true);
    await expect(page.locator("#edit-notes")).toHaveValue("Open from history");
});

test("editing from history refreshes the history row", async ({page, request}) => {
    await addExercise(request);
    const workout = await addWorkout(request, {notes: "Before history edit"});
    await openApp(page);
    await openHistory(page);
    await page.locator(`#history-list [data-edit-workout='${workout.id}']`).click();
    await page.locator("#edit-notes").fill("After history edit");
    await page.locator("#edit-save-button").click();
    await expect(page.locator("#edit-dialog")).toHaveJSProperty("open", false);
    await expect(page.locator(`#history-list [data-workout-id='${workout.id}']`)).toContainText("After history edit");
});

test("history infinite loading retrieves more than the initial 24 date groups", async ({page, request}) => {
    await addExercise(request);
    const today = await getTodayKey(request);
    for (let index = 0; index < 27; index += 1) {
        await addWorkout(request, {date: shiftDateKey(today, -index), notes: `History page ${index}`});
    }
    await openApp(page);
    await openHistory(page);
    await expect(page.locator("#history-list .history-day-group")).toHaveCount(24);
    await page.locator("#history-sentinel").scrollIntoViewIfNeeded();
    await expect(page.locator("#history-list .history-day-group")).toHaveCount(27, {timeout: 20_000});
    await expect(page.locator("#history-list")).toContainText("History page 26");
});

test("history error state can retry the real request", async ({page, request}) => {
    await addExercise(request);
    await addWorkout(request, {notes: "Loaded after retry"});
    let failures = 0;
    await page.route(url => url.pathname === "/api/history", async route => {
        if (failures < 2) {
            failures += 1;
            await route.fulfill({status: 503, contentType: "application/json", body: JSON.stringify({error: {message: "Temporary history failure"}})});
            return;
        }
        await route.fallback();
    });
    await openApp(page);
    await openHistory(page);
    await expect(page.locator("[data-history-retry]")).toBeVisible();
    await page.locator("[data-history-retry]").click();
    await expect(page.locator("#history-list")).toContainText("Loaded after retry");
    await expect(page.locator("[data-history-retry]")).toHaveCount(0);
});
