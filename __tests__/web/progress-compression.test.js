import {describe, expect, it, jest} from "@jest/globals";

async function loadCompression() {
    jest.resetModules();
    jest.unstable_mockModule("../../src/dao/index.js", () => ({ExerciseDAO: {getUserExercises: jest.fn()}}));
    jest.unstable_mockModule("../../src/db/index.js", () => ({models: {Workout: {findAll: jest.fn()}}}));
    jest.unstable_mockModule("../../src/i18n/index.js", () => ({formatDate: jest.fn()}));
    return (await import("../../src/web/server/services/progress.js")).compressProgressPoints;
}

describe("progress point compression", () => {
    it("limits chart points while preserving endpoints and bucket peaks", async () => {
        const compress = await loadCompression();
        const points = Array.from({length: 100}, (_, index) => ({id: index, volume: index === 50 ? 10_000 : index}));
        const result = compress(points, 24);
        expect(result.length).toBeLessThanOrEqual(24);
        expect(result[0].id).toBe(0);
        expect(result.at(-1).id).toBe(99);
        expect(result.some(point => point.id === 50)).toBe(true);
    });
});


describe("progress period ranges", () => {
    it("uses exactly 30 user-local date keys including today", async () => {
        jest.resetModules();
        const {periodStart} = await import("../../src/web/server/services/dates.js");
        const now = new Date("2026-07-15T10:00:00.000Z");
        expect(periodStart("30d", "UTC", now).toISOString()).toBe("2026-06-16T00:00:00.000Z");
    });

    it("respects DST when calculating the first local day", async () => {
        jest.resetModules();
        const {periodStart} = await import("../../src/web/server/services/dates.js");
        const now = new Date("2026-07-15T10:00:00.000Z");
        expect(periodStart("30d", "Europe/Berlin", now).toISOString()).toBe("2026-06-15T22:00:00.000Z");
    });
});
