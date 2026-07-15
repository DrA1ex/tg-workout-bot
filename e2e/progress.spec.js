import {expect, test} from "@playwright/test";

import {
    E2E_EXERCISE,
    SECOND_EXERCISE,
    addExercise,
    addExercises,
    addWorkout,
    getTodayKey,
    openApp,
    openProgress,
    resetUser,
    shiftDateKey,
} from "./helpers.js";

test.beforeEach(async ({request}) => {
    await resetUser(request);
});

test("progress shows an empty state for an exercise without workouts", async ({page, request}) => {
    await addExercise(request);
    await openApp(page);
    await openProgress(page);
    await expect(page.locator(".progress-chart-empty")).toBeVisible();
    await expect(page.locator("#progress-best")).toHaveText("0");
    await expect(page.locator("#progress-recent .empty")).toBeVisible();
});

test("a single progress point shows the not-enough-data state", async ({page, request}) => {
    await addExercise(request);
    await addWorkout(request, {weight: 60});
    await openApp(page);
    await openProgress(page);
    await expect(page.locator(".progress-chart-empty")).toBeVisible();
    await expect(page.locator("#progress-recent [data-edit-workout]")).toHaveCount(1);
});

test("two progress points render an SVG chart", async ({page, request}) => {
    await addExercise(request);
    await addWorkout(request, {weight: 60});
    await addWorkout(request, {weight: 65});
    await openApp(page);
    await openProgress(page);
    await expect(page.locator("#progress-chart")).toBeVisible();
    await expect(page.locator("#progress-chart circle")).toHaveCount(2);
    await expect(page.locator("#progress-chart path")).not.toHaveCount(0);
});

test("weight progress shows best, average, and total volume", async ({page, request}) => {
    await addExercise(request);
    await addWorkout(request, {sets: 3, weight: 60, repsOrTime: 8});
    await addWorkout(request, {sets: 4, weight: 70, repsOrTime: 5});
    await openApp(page);
    await openProgress(page);
    await expect(page.locator("#progress-best")).toHaveText("70 kg");
    await expect(page.locator("#progress-latest")).toHaveText("65 kg");
    await expect(page.locator("#progress-pr")).toHaveText("2,840 kg");
});

test("repetitions metric updates progress summary values", async ({page, request}) => {
    await addExercise(request);
    await addWorkout(request, {sets: 3, weight: 60, repsOrTime: 8});
    await addWorkout(request, {sets: 4, weight: 70, repsOrTime: 6});
    await openApp(page);
    await openProgress(page);
    await page.locator("#progress-metric [data-metric='repsOrTime']").click();
    await expect(page.locator("#progress-best")).toHaveText("8");
    await expect(page.locator("#progress-latest")).toHaveText("7");
});

test("sets metric updates progress summary values", async ({page, request}) => {
    await addExercise(request);
    await addWorkout(request, {sets: 3});
    await addWorkout(request, {sets: 5});
    await openApp(page);
    await openProgress(page);
    await page.locator("#progress-metric [data-metric='sets']").click();
    await expect(page.locator("#progress-best")).toHaveText("5");
    await expect(page.locator("#progress-latest")).toHaveText("4");
});

test("bodyweight progress hides the unavailable weight metric", async ({page, request}) => {
    await addExercise(request);
    await addWorkout(request, {hasWeight: false, repsOrTime: 15});
    await addWorkout(request, {hasWeight: false, repsOrTime: 20});
    await openApp(page);
    await openProgress(page);
    await expect(page.locator("#progress-metric [data-metric='weight']")).toBeHidden();
    await expect(page.locator("#progress-metric [data-metric='repsOrTime']")).toHaveClass(/active/);
});

test("timed progress uses seconds in controls and summary", async ({page, request}) => {
    await addExercise(request);
    await addWorkout(request, {hasWeight: false, isTime: true, repsOrTime: 30});
    await addWorkout(request, {hasWeight: false, isTime: true, repsOrTime: 45});
    await openApp(page);
    await openProgress(page);
    await expect(page.locator("#progress-metric [data-metric='repsOrTime']")).toHaveText("Seconds");
    await expect(page.locator("#progress-best")).toContainText("sec");
    await expect(page.locator("#progress-pr")).toContainText("sec");
});

test("exercise selector switches between independent progress series", async ({page, request}) => {
    await addExercises(request, [E2E_EXERCISE, SECOND_EXERCISE]);
    await addWorkout(request, {exercise: E2E_EXERCISE, notes: "Bench series"});
    await addWorkout(request, {exercise: SECOND_EXERCISE, weight: 100, notes: "Squat series"});
    await openApp(page);
    await openProgress(page);
    await page.locator("#progress-exercise").selectOption({label: SECOND_EXERCISE});
    await expect(page.locator("#progress-exercise")).toHaveValue(SECOND_EXERCISE);
    await expect(page.locator("#progress-recent")).toContainText("100 kg");
    await expect(page.locator("#progress-recent")).not.toContainText("Bench series");
});

test("period selector filters old workouts and restores them for all time", async ({page, request}) => {
    await addExercise(request);
    const today = await getTodayKey(request);
    await addWorkout(request, {date: today, weight: 61, notes: "Recent point"});
    await addWorkout(request, {date: shiftDateKey(today, -40), weight: 42, notes: "Old point"});
    await openApp(page);
    await openProgress(page);
    await page.locator("#progress-period").selectOption("30d");
    await expect(page.locator("#progress-recent [data-edit-workout]")).toHaveCount(1);
    await expect(page.locator("#progress-recent")).toContainText("61 kg");
    await expect(page.locator("#progress-recent")).not.toContainText("42 kg");
    await page.locator("#progress-period").selectOption("all");
    await expect(page.locator("#progress-recent [data-edit-workout]")).toHaveCount(2);
    await expect(page.locator("#progress-recent")).toContainText("42 kg");
});

test("best-volume workout receives the PR badge", async ({page, request}) => {
    await addExercise(request);
    await addWorkout(request, {sets: 3, weight: 50, repsOrTime: 5});
    await addWorkout(request, {sets: 5, weight: 80, repsOrTime: 5});
    await openApp(page);
    await openProgress(page);
    const rows = page.locator("#progress-recent .progress-record-row");
    await expect(rows.filter({has: page.locator(".progress-pr-badge")})).toHaveCount(1);
    await expect(rows.filter({has: page.locator(".progress-pr-badge")})).toContainText("80 kg");
});

test("progress recent row opens workout editing", async ({page, request}) => {
    await addExercise(request);
    const workout = await addWorkout(request, {notes: "Edit from progress"});
    await openApp(page);
    await openProgress(page);
    await page.locator(`#progress-recent [data-edit-workout='${workout.id}']`).click();
    await expect(page.locator("#edit-dialog")).toHaveJSProperty("open", true);
    await expect(page.locator("#edit-notes")).toHaveValue("Edit from progress");
});

test("progress chart is compressed to at most 24 points", async ({page, request}) => {
    await addExercise(request);
    const today = await getTodayKey(request);
    for (let index = 0; index < 30; index += 1) {
        await addWorkout(request, {
            date: shiftDateKey(today, -index),
            weight: 40 + index,
            notes: `Compressed point ${index}`,
        });
    }
    await openApp(page);
    await openProgress(page);
    await expect(page.locator("#progress-chart circle")).toHaveCount(24);
    await expect(page.locator("#progress-recent [data-edit-workout]")).toHaveCount(8);
});
