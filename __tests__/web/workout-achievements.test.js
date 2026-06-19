import {afterEach, beforeEach, describe, expect, it, jest} from "@jest/globals";

const escapeSql = value => `'${String(value).replaceAll("'", "''")}'`;

async function loadService(previous) {
    const findOne = jest.fn().mockResolvedValue(previous);

    jest.resetModules();
    jest.unstable_mockModule("../../src/db/index.js", () => ({
        models: {
            Workout: {
                sequelize: {
                    escape: escapeSql,
                },
                findOne,
            },
        },
    }));

    const {workoutAchievements} = await import("../../src/web/server/services/workouts.js");
    return {findOne, workoutAchievements};
}

function weightedWorkout(overrides = {}) {
    return {
        date: "2026-06-19T07:00:00.000Z",
        exercise: "Bench Press",
        sets: 3,
        weight: 50,
        repsOrTime: 10,
        isTime: false,
        notes: "",
        ...overrides,
    };
}

describe("workoutAchievements", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-06-19T08:00:00.000Z"));
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.resetModules();
        jest.clearAllMocks();
    });

    it("computes achievements with one aggregate query", async () => {
        const {findOne, workoutAchievements} = await loadService({
            userCount: 5,
            userDate: "2026-06-18T07:00:00.000Z",
            exerciseCount: 2,
            exerciseVolume: 1200,
            exerciseDate: "2026-06-10T07:00:00.000Z",
        });

        const result = await workoutAchievements("42", weightedWorkout({weight: 45}), "+05:00");

        expect(findOne).toHaveBeenCalledTimes(1);
        expect(findOne).toHaveBeenCalledWith(expect.objectContaining({
            where: {telegramId: "42"},
            raw: true,
        }));
        expect(findOne.mock.calls[0][0].attributes).toHaveLength(5);
        expect(JSON.stringify(findOne.mock.calls[0][0].attributes)).toContain("exercise = 'Bench Press'");
        expect(result).toEqual({
            newVolumeRecord: true,
            firstExerciseWorkout: false,
            comebackAfterTwoMonths: false,
            comebackAfterMonth: false,
            hundredthWorkout: false,
        });
        expect(result).not.toHaveProperty("biggestDayVolume");
    });

    it("does not count a volume record for a past-day workout", async () => {
        const {workoutAchievements} = await loadService({
            userCount: 5,
            userDate: "2026-06-18T07:00:00.000Z",
            exerciseCount: 2,
            exerciseVolume: 1200,
            exerciseDate: "2026-06-10T07:00:00.000Z",
        });

        const result = await workoutAchievements("42", weightedWorkout({
            date: "2026-06-18T07:00:00.000Z",
            weight: 45,
        }), "+05:00");

        expect(result.newVolumeRecord).toBe(false);
    });

    it("marks the first workout for an exercise", async () => {
        const {workoutAchievements} = await loadService({
            userCount: 3,
            userDate: "2026-06-18T07:00:00.000Z",
            exerciseCount: 0,
            exerciseVolume: 0,
            exerciseDate: null,
        });

        const result = await workoutAchievements("42", weightedWorkout(), "+05:00");

        expect(result.firstExerciseWorkout).toBe(true);
        expect(result.newVolumeRecord).toBe(false);
        expect(result.comebackAfterTwoMonths).toBe(false);
    });

    it("marks an exercise comeback after two months without this exercise", async () => {
        const {workoutAchievements} = await loadService({
            userCount: 20,
            userDate: "2026-06-18T07:00:00.000Z",
            exerciseCount: 4,
            exerciseVolume: 2000,
            exerciseDate: "2026-04-18T07:00:00.000Z",
        });

        const result = await workoutAchievements("42", weightedWorkout(), "+05:00");

        expect(result.comebackAfterTwoMonths).toBe(true);
        expect(result.comebackAfterMonth).toBe(false);
    });

    it("marks a user comeback after one month without any workouts", async () => {
        const {workoutAchievements} = await loadService({
            userCount: 20,
            userDate: "2026-05-18T07:00:00.000Z",
            exerciseCount: 4,
            exerciseVolume: 2000,
            exerciseDate: "2026-06-18T07:00:00.000Z",
        });

        const result = await workoutAchievements("42", weightedWorkout(), "+05:00");

        expect(result.comebackAfterTwoMonths).toBe(false);
        expect(result.comebackAfterMonth).toBe(true);
    });

    it("marks the hundredth workout when the user has 99 previous workouts", async () => {
        const {workoutAchievements} = await loadService({
            userCount: 99,
            userDate: "2026-06-18T07:00:00.000Z",
            exerciseCount: 8,
            exerciseVolume: 2000,
            exerciseDate: "2026-06-18T07:00:00.000Z",
        });

        const result = await workoutAchievements("42", weightedWorkout(), "+05:00");

        expect(result.hundredthWorkout).toBe(true);
    });
});
