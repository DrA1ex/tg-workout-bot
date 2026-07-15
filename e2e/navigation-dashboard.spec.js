import {expect, test} from "@playwright/test";

import {
    E2E_EXERCISE,
    addExercise,
    addWorkout,
    expectNoBrowserProblems,
    monitorBrowser,
    openApp,
    resetUser,
} from "./helpers.js";

test.beforeEach(async ({request}) => {
    await resetUser(request);
});

test("dashboard loads the real application shell without browser errors", async ({page, request}) => {
    await addExercise(request);
    const problems = monitorBrowser(page);
    await openApp(page);
    await expect(page.locator("#screen-dashboard")).toHaveClass(/active/);
    await expect(page.locator("#screen-title")).not.toHaveText("");
    await expectNoBrowserProblems(problems);
});

test("empty dashboard quick action opens the add-workout sheet", async ({page, request}) => {
    await addExercise(request);
    await openApp(page);
    await expect(page.locator("#today-list")).toContainText("No workout");
    await page.locator("#today-list [data-action='quick-add']").click();
    await expect(page.locator("#add-dialog")).toHaveJSProperty("open", true);
    await expect(page).toHaveURL(/dialog=add-workout/);
});

test("dashboard renders today's workout and workout count", async ({page, request}) => {
    await addExercise(request);
    await addWorkout(request);
    await addWorkout(request, {weight: 65, notes: "Second workout"});
    await openApp(page);
    await expect(page.locator("#today-list [data-workout-id]")).toHaveCount(2);
    await expect(page.locator("#today-list")).toContainText("2 workouts");
    await expect(page.locator("#weekly-workouts")).toHaveText("2");
});

test("dashboard calculates weekly training volume", async ({page, request}) => {
    await addExercise(request);
    await addWorkout(request, {sets: 4, weight: 50, repsOrTime: 5});
    await addWorkout(request, {sets: 2, weight: 30, repsOrTime: 10});
    await openApp(page);
    await expect(page.locator("#weekly-volume")).toHaveText("1,600");
});

test("dashboard uses exercise notes when a workout has no own note", async ({page, request}) => {
    await addExercise(request, E2E_EXERCISE, "Catalog fallback note");
    await addWorkout(request, {notes: ""});
    await openApp(page);
    await expect(page.locator("#today-list [data-workout-id]")).toContainText("Catalog fallback note");
});

test("last-workout insight navigates to history", async ({page, request}) => {
    await addExercise(request);
    await addWorkout(request);
    await openApp(page);
    await page.locator("#dashboard-last-workout-row").click();
    await expect(page.locator("#screen-history")).toHaveClass(/active/);
    await expect(page).toHaveURL(/tab=history/);
    await expect(page.locator("#history-list")).toContainText(E2E_EXERCISE);
});

test("weekly-volume insight navigates to progress", async ({page, request}) => {
    await addExercise(request);
    await addWorkout(request);
    await openApp(page);
    await page.locator(".dashboard-insight-row[data-tab='progress']").click();
    await expect(page.locator("#screen-progress")).toHaveClass(/active/);
    await expect(page).toHaveURL(/tab=progress/);
    await expect(page.locator("#progress-content")).toBeVisible();
});

test("bottom navigation updates the URL and browser Back restores the previous tab", async ({page, request}) => {
    await addExercise(request);
    await openApp(page);
    await page.locator("#nav-history").click();
    await expect(page).toHaveURL(/tab=history/);
    await page.locator("#nav-settings").click();
    await expect(page).toHaveURL(/tab=settings/);
    await page.goBack();
    await expect(page.locator("#screen-history")).toHaveClass(/active/);
    await expect(page).toHaveURL(/tab=history/);
});

test("direct history URL opens the history screen", async ({page, request}) => {
    await addExercise(request);
    await addWorkout(request);
    await openApp(page, {path: "/?tab=history", waitForDashboard: false});
    await expect(page.locator("#screen-history")).toHaveClass(/active/);
    await expect(page.locator("#history-list")).toContainText(E2E_EXERCISE);
});

test("direct progress URL opens the progress screen", async ({page, request}) => {
    await addExercise(request);
    await addWorkout(request);
    await openApp(page, {path: "/?tab=progress", waitForDashboard: false});
    await expect(page.locator("#screen-progress")).toHaveClass(/active/);
    await expect(page.locator("#progress-content")).toBeVisible();
});

test("direct add-workout URL opens the workout sheet", async ({page, request}) => {
    await addExercise(request);
    await openApp(page, {path: "/?dialog=add-workout"});
    await expect(page.locator("#add-dialog")).toHaveJSProperty("open", true);
    await expect(page.locator("#workout-exercise")).toHaveValue(E2E_EXERCISE);
});

test("activity-calendar collapsed state persists after reload", async ({page, request}) => {
    await addExercise(request);
    await openApp(page);
    await expect(page.locator("#weekly-streak-toggle")).toHaveAttribute("aria-expanded", "false");
    await page.locator("#weekly-streak-toggle").click();
    await expect(page.locator("#weekly-streak-toggle")).toHaveAttribute("aria-expanded", "true");
    await page.reload({waitUntil: "domcontentloaded"});
    await expect(page.locator("#dashboard-content")).toBeVisible();
    await expect(page.locator("#weekly-streak-toggle")).toHaveAttribute("aria-expanded", "true");
});
