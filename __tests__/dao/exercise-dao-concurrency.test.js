import {beforeEach, describe, expect, it, jest} from "@jest/globals";

const sharedUser = {
    telegramId: "42",
    exercises: "[]",
    save: jest.fn(async () => undefined),
};
const transaction = jest.fn(async (_options, callback) => callback({id: Symbol("transaction")}));
const findByPk = jest.fn(async () => sharedUser);
const upsert = jest.fn(async () => undefined);

jest.unstable_mockModule("../../src/db/index.js", () => ({
    models: {
        User: {
            findByPk,
            sequelize: {transaction},
        },
        GlobalExercise: {upsert},
    },
}));

const {ExerciseDAO} = await import("../../src/dao/exercise_dao.js");

describe("exercise delta writes", () => {
    beforeEach(() => {
        sharedUser.exercises = JSON.stringify([{name: "Squat", notes: ""}]);
        sharedUser.save.mockClear();
        transaction.mockClear();
        findByPk.mockClear();
        upsert.mockClear();
    });

    it("serializes concurrent deltas and rereads the current list before each write", async () => {
        const [first, second] = await Promise.all([
            ExerciseDAO.applyUserExerciseChanges("42", {added: [{name: "Bench", notes: ""}]}),
            ExerciseDAO.applyUserExerciseChanges("42", {added: [{name: "Deadlift", notes: ""}]}),
        ]);

        expect(first.added).toEqual([{name: "Bench", notes: ""}]);
        expect(second.added).toEqual([{name: "Deadlift", notes: ""}]);
        expect(JSON.parse(sharedUser.exercises).map(item => item.name).sort()).toEqual([
            "Bench",
            "Deadlift",
            "Squat",
        ]);
        expect(findByPk).toHaveBeenCalledTimes(2);
        expect(sharedUser.save).toHaveBeenCalledTimes(2);
    });

    it("returns only the deletion and addition actually applied", async () => {
        const result = await ExerciseDAO.applyUserExerciseChanges("42", {
            deleted: ["Squat", "Missing"],
            added: [{name: "Bench", notes: ""}, {name: "Bench", notes: "duplicate"}],
        });

        expect(result.deleted).toEqual([{name: "Squat", notes: ""}]);
        expect(result.added).toEqual([{name: "Bench", notes: ""}]);
        expect(result.exercises).toEqual([{name: "Bench", notes: ""}]);
    });
});
