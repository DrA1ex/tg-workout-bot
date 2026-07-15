import {beforeEach, describe, expect, it, jest} from "@jest/globals";

async function loadService() {
    jest.resetModules();
    jest.unstable_mockModule("../../src/db/index.js", () => ({models: {Workout: {sequelize: {}}}}));
    jest.unstable_mockModule("../../src/i18n/index.js", () => ({formatDate: jest.fn()}));
    return await import("../../src/web/server/services/workouts.js");
}

describe("workout request validation", () => {
    beforeEach(() => jest.useFakeTimers().setSystemTime(new Date("2026-07-15T12:00:00Z")));

    it("parses string booleans without treating false as true", async () => {
        const {parseWorkoutBody} = await loadService();
        const workout = parseWorkoutBody({
            date: "2026-07-15",
            exercise: "Run",
            sets: "3",
            repsOrTime: "60",
            hasWeight: "false",
            isTime: "false",
        }, new Date(), "UTC");
        expect(workout.isTime).toBe(false);
        expect(workout.weight).toBeNull();
    });

    it("rejects fractional sets and malformed booleans", async () => {
        const {parseWorkoutBody} = await loadService();
        const base = {date: "2026-07-15", exercise: "Run", repsOrTime: "10", hasWeight: false, isTime: false};
        expect(() => parseWorkoutBody({...base, sets: "3.9"}, new Date(), "UTC")).toThrow(/integer/i);
        expect(() => parseWorkoutBody({...base, sets: "3", isTime: "sometimes"}, new Date(), "UTC")).toThrow(/boolean/i);
    });
});
