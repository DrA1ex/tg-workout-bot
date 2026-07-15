import {describe, expect, it, jest} from "@jest/globals";

async function loadDao() {
    jest.resetModules();
    jest.unstable_mockModule("../../src/db/index.js", () => ({models: {}}));
    return (await import("../../src/dao/exercise_dao.js")).ExerciseDAO;
}

describe("exercise JSON parsing", () => {
    it("normalizes legacy strings and merges duplicate entries without returning an empty list", async () => {
        const ExerciseDAO = await loadDao();
        expect(ExerciseDAO.parseUserExercises(JSON.stringify([
            "Push-ups",
            {name: "Squat", notes: "barbell"},
            {name: "push-ups", notes: "legacy note"},
        ]), "42")).toEqual([
            {name: "Push-ups", notes: "legacy note"},
            {name: "Squat", notes: "barbell"},
        ]);
    });

    it("throws on corrupted JSON instead of treating it as no exercises", async () => {
        const ExerciseDAO = await loadDao();
        expect(() => ExerciseDAO.parseUserExercises("{", "42")).toThrow(/corrupted/i);
        expect(() => ExerciseDAO.parseUserExercises(JSON.stringify([null]), "42")).toThrow(/invalid/i);
    });
});
