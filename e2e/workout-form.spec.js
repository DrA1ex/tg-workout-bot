import {expect, test} from "@playwright/test";

import {
    E2E_EXERCISE,
    SECOND_EXERCISE,
    addExercise,
    addExercises,
    addWorkout,
    getTodayKey,
    openAddDialog,
    openApp,
    resetUser,
    shiftDateKey,
} from "./helpers.js";

test.beforeEach(async ({request}) => {
    await resetUser(request);
});

async function prepare(page, request, exercises = [E2E_EXERCISE]) {
    await addExercises(request, exercises);
    await openApp(page);
    await openAddDialog(page);
}

async function submitWorkout(page) {
    await page.locator("#workout-save-button").click();
    await expect(page.locator("#add-dialog")).toHaveJSProperty("open", false);
}

test("add form uses the user's current date and date limit", async ({page, request}) => {
    const today = await getTodayKey(request);
    await prepare(page, request);
    await expect(page.locator("#workout-date")).toHaveValue(today);
    await expect(page.locator("#workout-date")).toHaveAttribute("max", today);
});

test("add form close button dismisses the sheet and clears the route", async ({page, request}) => {
    await prepare(page, request);
    await page.locator("#add-close").click();
    await expect(page.locator("#add-dialog")).toHaveJSProperty("open", false);
    await expect(page).not.toHaveURL(/dialog=add-workout/);
});

test("add form lists every personal exercise", async ({page, request}) => {
    await prepare(page, request, [E2E_EXERCISE, SECOND_EXERCISE]);
    await expect(page.locator("#workout-exercise option", {hasText: E2E_EXERCISE})).toHaveCount(1);
    await expect(page.locator("#workout-exercise option", {hasText: SECOND_EXERCISE})).toHaveCount(1);
});

test("sets stepper increments and clamps to its minimum", async ({page, request}) => {
    await prepare(page, request);
    await expect(page.locator("#workout-sets")).toHaveValue("3");
    await page.locator("[data-step-target='workout-sets'][data-step='1']").click();
    await expect(page.locator("#workout-sets")).toHaveValue("4");
    await page.locator("#workout-sets").fill("1");
    await page.locator("[data-step-target='workout-sets'][data-step='-1']").click();
    await expect(page.locator("#workout-sets")).toHaveValue("1");
});

test("weight stepper changes weight by one kilogram", async ({page, request}) => {
    await prepare(page, request);
    await page.locator("#workout-weight").fill("20");
    await page.locator("[data-step-target='workout-weight'][data-step='1']").click();
    await expect(page.locator("#workout-weight")).toHaveValue("21");
    await page.locator("#workout-weight").evaluate(input => {
        input.step = "0.5";
        input.value = "20";
    });
    await page.locator("[data-step-target='workout-weight'][data-step='1']").click();
    await expect(page.locator("#workout-weight")).toHaveValue("21");
});

test("repetitions stepper increments the result", async ({page, request}) => {
    await prepare(page, request);
    await expect(page.locator("#workout-reps")).toHaveValue("12");
    await page.locator("[data-step-target='workout-reps'][data-step='1']").click();
    await expect(page.locator("#workout-reps")).toHaveValue("13");
});

test("notes counter follows textarea input", async ({page, request}) => {
    await prepare(page, request);
    await page.locator("#workout-notes").fill("1234567890");
    await expect(page.locator("#notes-count")).toHaveText("10");
});

test("no-weight mode disables weight and creates a bodyweight workout", async ({page, request}) => {
    await prepare(page, request);
    await page.locator("#workout-has-weight + span").click();
    await expect(page.locator("#workout-weight")).toBeDisabled();
    await page.locator("#workout-reps").fill("15");
    await submitWorkout(page);
    const row = page.locator("#today-list [data-workout-id]");
    await expect(row).toContainText("15 reps");
    await expect(row).not.toContainText("kg");
});

test("time mode changes labels and creates a timed workout", async ({page, request}) => {
    await prepare(page, request);
    await page.locator("#workout-has-weight + span").click();
    await page.locator("#workout-is-time + span").click();
    await expect(page.locator(".add-reps-control > span")).toHaveText("Time");
    await expect(page.locator(".add-reps-control .stepper-unit")).toHaveText("sec");
    await page.locator("#workout-reps").fill("45");
    await submitWorkout(page);
    await expect(page.locator("#today-list [data-workout-id]")).toContainText("45 sec");
});

test("future date is rejected by client-side validation", async ({page, request}) => {
    const future = shiftDateKey(await getTodayKey(request), 1);
    await prepare(page, request);
    await page.locator("#workout-date").evaluate((input, value) => {
        input.value = value;
        input.dispatchEvent(new Event("input", {bubbles: true}));
        input.dispatchEvent(new Event("change", {bubbles: true}));
    }, future);
    await page.locator("#workout-weight").fill("50");
    await page.locator("#workout-save-button").click();
    await expect(page.locator("#workout-date")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#add-dialog")).toHaveJSProperty("open", true);
    await expect(page.locator("#today-list [data-workout-id]")).toHaveCount(0);
});

test("missing weight is rejected while weight mode is enabled", async ({page, request}) => {
    await prepare(page, request);
    await page.locator("#workout-weight").fill("");
    await page.locator("#workout-save-button").click();
    await expect(page.locator("#workout-weight")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#add-dialog")).toHaveJSProperty("open", true);
});

test("use previous restores sets, weight, reps, and mode", async ({page, request}) => {
    await addExercise(request);
    await addWorkout(request, {sets: 5, weight: 82.5, repsOrTime: 4, notes: "Previous values"});
    await openApp(page);
    await openAddDialog(page);
    await expect(page.locator("#previous-summary")).toContainText("5 sets");
    await page.locator("#use-previous").click();
    await expect(page.locator("#workout-sets")).toHaveValue("5");
    await expect(page.locator("#workout-weight")).toHaveValue("82.5");
    await expect(page.locator("#workout-reps")).toHaveValue("4");
    await expect(page.locator("#workout-has-weight")).toBeChecked();
});

test("normal workout creation updates dashboard details", async ({page, request}) => {
    await prepare(page, request);
    await page.locator("#workout-sets").fill("4");
    await page.locator("#workout-weight").fill("72.5");
    await page.locator("#workout-reps").fill("6");
    await page.locator("#workout-notes").fill("Created by form test");
    await submitWorkout(page);
    const row = page.locator("#today-list [data-workout-id]");
    await expect(row).toContainText("72.5 kg");
    await expect(row).toContainText("6 reps");
    await expect(row).toContainText("4 sets");
    await expect(row).toContainText("Created by form test");
});

test("edit dialog is populated from the selected workout", async ({page, request}) => {
    await addExercise(request);
    const workout = await addWorkout(request, {sets: 7, weight: 90, repsOrTime: 3, notes: "Prefill me"});
    await openApp(page);
    await page.locator(`#today-list [data-edit-workout='${workout.id}']`).click();
    await expect(page.locator("#edit-dialog")).toHaveJSProperty("open", true);
    await expect(page.locator("#edit-exercise")).toHaveValue(E2E_EXERCISE);
    await expect(page.locator("#edit-sets")).toHaveValue("7");
    await expect(page.locator("#edit-weight")).toHaveValue("90");
    await expect(page.locator("#edit-reps")).toHaveValue("3");
    await expect(page.locator("#edit-notes")).toHaveValue("Prefill me");
});

test("editing a workout updates its dashboard row", async ({page, request}) => {
    await addExercise(request);
    const workout = await addWorkout(request);
    await openApp(page);
    await page.locator(`#today-list [data-edit-workout='${workout.id}']`).click();
    await page.locator("#edit-sets").fill("6");
    await page.locator("#edit-weight").fill("77.5");
    await page.locator("#edit-notes").fill("Edited values");
    await page.locator("#edit-save-button").click();
    await expect(page.locator("#edit-dialog")).toHaveJSProperty("open", false);
    const row = page.locator(`#today-list [data-workout-id='${workout.id}']`);
    await expect(row).toContainText("77.5 kg");
    await expect(row).toContainText("6 sets");
    await expect(row).toContainText("Edited values");
});

test("delete cancellation keeps the workout", async ({page, request}) => {
    await addExercise(request);
    const workout = await addWorkout(request);
    await openApp(page);
    await page.locator(`#today-list [data-delete-workout='${workout.id}']`).evaluate(button => button.click());
    await expect(page.locator("#delete-workout-dialog")).toHaveJSProperty("open", true);
    await page.locator("#delete-workout-cancel").click();
    await expect(page.locator("#delete-workout-dialog")).toHaveJSProperty("open", false);
    await expect(page.locator(`#today-list [data-workout-id='${workout.id}']`)).toHaveCount(1);
});

test("delete confirmation removes the workout and refreshes stats", async ({page, request}) => {
    await addExercise(request);
    const workout = await addWorkout(request, {sets: 2, weight: 40, repsOrTime: 10});
    await openApp(page);
    await expect(page.locator("#weekly-volume")).toHaveText("800");
    await page.locator(`#today-list [data-delete-workout='${workout.id}']`).evaluate(button => button.click());
    await page.locator("#delete-workout-confirm").click();
    await expect(page.locator(`#today-list [data-workout-id='${workout.id}']`)).toHaveCount(0);
    await expect(page.locator("#weekly-volume")).toHaveText("0");
    await expect(page.locator("#weekly-workouts")).toHaveText("0");
});
