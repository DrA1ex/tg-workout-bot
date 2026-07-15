import {afterEach, beforeEach, describe, expect, it, jest} from "@jest/globals";
import {Op} from "sequelize";

async function loadService() {
    const getWorkoutsByDate = jest.fn().mockResolvedValue([]);
    const getDatesWithWorkouts = jest.fn().mockResolvedValue([]);
    const findAll = jest.fn().mockResolvedValue([]);
    const findOne = jest.fn().mockResolvedValue(null);
    const sequelize = {
        col: value => ({col: value}),
        fn: (name, ...args) => ({fn: name, args}),
        literal: value => ({literal: value}),
    };

    jest.resetModules();
    jest.unstable_mockModule("../../src/dao/index.js", () => ({
        UserDAO: {
            findByTelegramId: jest.fn(),
            findLanguageByTelegramId: jest.fn(),
        },
        WorkoutDAO: {getWorkoutsByDate, getDatesWithWorkouts},
    }));
    jest.unstable_mockModule("../../src/db/index.js", () => ({
        models: {
            Workout: {
                sequelize,
                findAll,
                findOne,
            },
        },
    }));

    const {getDashboard} = await import("../../src/web/server/services/dashboard.js");
    return {findAll, findOne, getDashboard, getWorkoutsByDate, getDatesWithWorkouts};
}

describe("dashboard service", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-06-23T20:30:00.000Z"));
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.resetModules();
        jest.clearAllMocks();
    });

    it("filters recent workouts by the user's current day boundary", async () => {
        const {findAll, findOne, getDashboard, getWorkoutsByDate} = await loadService();

        await getDashboard({
            telegramId: "42",
            language: "en",
            timezone: "Asia/Yekaterinburg",
        });

        expect(getWorkoutsByDate).toHaveBeenCalledWith("42", "2026-06-24", "Asia/Yekaterinburg");

        const recentCall = findAll.mock.calls.find(([options]) => options.limit === 8);
        expect(recentCall?.[0].where.date[Op.lt].toISOString()).toBe("2026-06-23T19:00:00.000Z");
        expect(findOne.mock.calls[0][0].where.date[Op.lt].toISOString()).toBe("2026-06-23T19:00:00.000Z");
    });

    it("filters recent workouts by a user day that is behind UTC", async () => {
        jest.setSystemTime(new Date("2026-06-24T02:30:00.000Z"));
        const {findAll, findOne, getDashboard, getWorkoutsByDate} = await loadService();

        await getDashboard({
            telegramId: "42",
            language: "en",
            timezone: "America/New_York",
        });

        expect(getWorkoutsByDate).toHaveBeenCalledWith("42", "2026-06-23", "America/New_York");

        const recentCall = findAll.mock.calls.find(([options]) => options.limit === 8);
        expect(recentCall?.[0].where.date[Op.lt].toISOString()).toBe("2026-06-23T04:00:00.000Z");
        expect(findOne.mock.calls[0][0].where.date[Op.lt].toISOString()).toBe("2026-06-23T04:00:00.000Z");
    });
});
