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

test("loads the real WebUI and navigates through core screens", async ({page, request}) => {
    await addExercise(request);
    await addWorkout(request);
    await addWorkout(request, {weight: 65, repsOrTime: 6, notes: "Second progress point"});
    const problems = monitorBrowser(page);

    await openApp(page);
    await expect(page.locator("#today-list")).toContainText(E2E_EXERCISE);

    await page.locator("#nav-history").click();
    await expect(page.locator("#history-list")).toContainText(E2E_EXERCISE);

    await page.locator("#nav-progress").click();
    await expect(page.locator("#progress-content")).toBeVisible();
    await expect(page.locator("#progress-exercise")).toHaveValue(E2E_EXERCISE);
    await expect(page.locator("#progress-recent [data-edit-workout]")).toHaveCount(2);
    await expect(page.locator("#progress-chart")).toBeVisible();

    await page.locator("#nav-settings").click();
    await expect(page.locator("#settings-form")).toBeVisible();
    const timezoneInput = page.locator("#timezone-input");
    await expect(timezoneInput).toHaveValue("UTC");
    await timezoneInput.fill("Europe/Tallinn");
    const settingsSaved = page.waitForResponse(response => (
        response.url().endsWith("/api/settings")
        && response.request().method() === "PATCH"
        && response.ok()
    ));
    await page.locator("#settings-save-button").click();
    await settingsSaved;
    await expect(timezoneInput).toHaveValue("Europe/Tallinn");
    const authStatus = await request.get("/api/auth/status");
    expect((await authStatus.json()).user.timezone).toBe("Europe/Tallinn");

    await expectNoBrowserProblems(problems);
});

test("completes first-run onboarding with a custom exercise", async ({page}) => {
    const problems = monitorBrowser(page);
    const exerciseName = `E2E Onboarding Custom ${Date.now()}`;
    await page.route("https://telegram.org/**", route => route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: "window.Telegram = window.Telegram || {};",
    }));
    await page.goto("/", {waitUntil: "domcontentloaded"});

    await expect(page.locator("#onboarding-dialog")).toHaveJSProperty("open", true);
    const searchResponse = page.waitForResponse(response => {
        const url = new URL(response.url());
        return url.pathname === "/api/exercises/global"
            && url.searchParams.get("search") === exerciseName
            && response.ok();
    });
    await page.locator("#onboarding-exercise-search").fill(exerciseName);
    await searchResponse;

    const addSuggestion = page.locator("[data-onboarding-add-search]", {hasText: exerciseName});
    await expect(addSuggestion).toBeVisible();
    await addSuggestion.click();
    await expect(page.locator("#exercise-add-dialog")).toHaveJSProperty("open", true);
    await expect(page.locator("#exercise-name")).toHaveValue(exerciseName);
    await page.locator("#exercise-notes").fill("Created during onboarding");
    await page.locator("#exercise-add-save").click();

    await expect(page.locator("#exercise-add-dialog")).toHaveJSProperty("open", false);
    await expect(page.locator("#onboarding-start-button")).toBeEnabled();
    await page.locator("#onboarding-start-button").click();

    await expect(page.locator("#onboarding-dialog")).toHaveJSProperty("open", false);
    await expect(page.locator("#nav-add")).toBeEnabled();
    await page.locator("#nav-add").click();
    await expect(page.locator("#workout-exercise option", {hasText: exerciseName})).toHaveCount(1);

    await expectNoBrowserProblems(problems);
});

test("creates, edits, and deletes a workout through the interface", async ({page, request}) => {
    await addExercise(request);
    const problems = monitorBrowser(page);
    await openApp(page);

    await page.locator("#nav-add").click();
    await expect(page.locator("#add-dialog")).toHaveJSProperty("open", true);
    await page.locator("#workout-exercise").selectOption({label: E2E_EXERCISE});
    await page.locator("#workout-sets").fill("4");
    await page.locator("#workout-weight").fill("72.5");
    await page.locator("#workout-reps").fill("6");
    await page.locator("#workout-notes").fill("Created in the browser");
    await page.locator("#workout-save-button").click();

    await expect(page.locator("#add-dialog")).toHaveJSProperty("open", false);
    const workoutRow = page.locator("#today-list [data-workout-id]").filter({hasText: E2E_EXERCISE});
    await expect(workoutRow).toHaveCount(1);
    await expect(workoutRow).toContainText("72.5");
    await expect(workoutRow).toContainText("Created in the browser");

    await workoutRow.locator("[data-edit-workout]").click();
    await expect(page.locator("#edit-dialog")).toHaveJSProperty("open", true);
    await page.locator("#edit-sets").fill("5");
    await page.locator("#edit-reps").fill("7");
    await page.locator("#edit-notes").fill("Edited in the browser");
    await page.locator("#edit-save-button").click();

    await expect(page.locator("#edit-dialog")).toHaveJSProperty("open", false);
    await expect(workoutRow).toContainText("5 sets");
    await expect(workoutRow).toContainText("7 reps");
    await expect(workoutRow).toContainText("Edited in the browser");

    await workoutRow.locator("[data-delete-workout]").evaluate(button => button.click());
    await expect(page.locator("#delete-workout-dialog")).toHaveJSProperty("open", true);
    await page.locator("#delete-workout-confirm").click();
    await expect(workoutRow).toHaveCount(0);
    await expect(page.locator("#weekly-volume")).toHaveText("0");

    await expectNoBrowserProblems(problems);
});

test("edits a workout whose exercise was removed from the catalog", async ({page, request}) => {
    await addExercise(request);
    const workout = await addWorkout(request, {notes: "Orphan exercise record"});
    await request.patch("/api/exercises", {data: {added: [], deleted: [E2E_EXERCISE]}});
    await addExercise(request, "E2E Remaining Exercise");
    const problems = monitorBrowser(page);

    await openApp(page);
    const row = page.locator(`#today-list [data-workout-id="${workout.id}"]`).first();
    await row.click();

    await expect(page.locator("#edit-exercise")).toBeHidden();
    await expect(page.locator("#edit-exercise-locked")).toBeVisible();
    await expect(page.locator("#edit-exercise-locked")).toBeDisabled();
    await expect(page.locator("#edit-exercise-locked")).toHaveValue(E2E_EXERCISE);

    await page.locator("#edit-notes").fill("Saved while catalog entry is absent");
    await page.locator("#edit-save-button").click();
    await expect(page.locator("#edit-dialog")).toHaveJSProperty("open", false);
    await expect(row).toContainText("Saved while catalog entry is absent");

    await expectNoBrowserProblems(problems);
});

test("renames and removes an exercise through settings", async ({page, request}) => {
    await addExercise(request);
    const problems = monitorBrowser(page);
    await openApp(page);

    await page.locator("#nav-settings").click();
    await page.locator("#settings-exercises-open").click();
    await expect(page.locator("#settings-exercises-dialog")).toHaveJSProperty("open", true);

    const exerciseRow = page.locator(`#settings-exercise-list [data-exercise-name="${E2E_EXERCISE}"]`);
    await expect(exerciseRow).toHaveCount(1);
    await exerciseRow.locator("[data-edit-exercise]").click();
    await expect(page.locator("#exercise-dialog")).toHaveJSProperty("open", true);

    await page.locator("#exercise-edit-new-name").fill("E2E Incline Press");
    await page.locator("#exercise-edit-notes").fill("Renamed through settings");
    await page.locator("#exercise-edit-save").click();
    await expect(page.locator("#exercise-dialog")).toHaveJSProperty("open", false);

    const renamedRow = page.locator('#settings-exercise-list [data-exercise-name="E2E Incline Press"]');
    await expect(renamedRow).toContainText("Renamed through settings");
    await expect(page.locator("#exercise-edit-save")).toBeEnabled();
    const deleteButton = renamedRow.locator("[data-delete-exercise]");
    await expect(deleteButton).toBeEnabled();
    await deleteButton.click({force: true});
    await expect(page.locator("#delete-workout-dialog")).toHaveJSProperty("open", true);
    await page.locator("#delete-workout-confirm").click();
    await expect(renamedRow).toHaveCount(0);
    await expect(page.locator("#settings-exercises-count")).toHaveText("0");

    await expectNoBrowserProblems(problems);
});
