import {Op, Transaction} from "sequelize";

import {models} from "../db/index.js";
import {withKeyedLock} from "../utils/keyed-lock.js";
import {AlreadyExistsError, DataIntegrityError} from "../domain/errors.js";

function normalizeExercise(exercise, index = -1) {
    const source = typeof exercise === "string" ? {name: exercise, notes: ""} : exercise;
    if (!source || typeof source !== "object" || Array.isArray(source)) {
        throw new DataIntegrityError(`Invalid exercise entry at index ${index}`);
    }
    const name = String(source.name || "").trim();
    if (!name) throw new DataIntegrityError(`Exercise name is missing at index ${index}`);
    return {name, notes: String(source.notes || "").trim()};
}

function normalizeExerciseList(raw, telegramId = "unknown") {
    let parsed;
    try {
        parsed = raw ? JSON.parse(raw) : [];
    } catch (error) {
        throw new DataIntegrityError(`Exercises JSON is corrupted for user ${telegramId}`, {cause: error});
    }
    if (!Array.isArray(parsed)) throw new DataIntegrityError(`Exercises JSON is not an array for user ${telegramId}`);

    const byName = new Map();
    parsed.forEach((entry, index) => {
        const exercise = normalizeExercise(entry, index);
        const key = exercise.name.toLocaleLowerCase();
        const previous = byName.get(key);
        byName.set(key, previous
            ? {...previous, notes: previous.notes || exercise.notes}
            : exercise);
    });
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeIncomingList(values) {
    if (!Array.isArray(values)) return [];
    const result = [];
    const names = new Set();
    values.forEach((value, index) => {
        const exercise = normalizeExercise(value, index);
        const key = exercise.name.toLocaleLowerCase();
        if (!names.has(key)) {
            names.add(key);
            result.push(exercise);
        }
    });
    return result;
}

function isSqliteBusy(error) {
    return error?.original?.code === "SQLITE_BUSY" || error?.original?.code === "SQLITE_LOCKED" ||
        error?.parent?.code === "SQLITE_BUSY" || error?.parent?.code === "SQLITE_LOCKED";
}

async function withBusyRetry(task, attempts = 5) {
    let lastError;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
            return await task();
        } catch (error) {
            lastError = error;
            if (!isSqliteBusy(error) || attempt === attempts - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 25 * (2 ** attempt)));
        }
    }
    throw lastError;
}

export class ExerciseDAO {
    static parseUserExercises(raw, telegramId) {
        return normalizeExerciseList(raw, telegramId);
    }

    static async getUserExercises(telegramId) {
        const user = await models.User.findByPk(String(telegramId), {attributes: ["telegramId", "exercises"]});
        if (!user) return [];
        return normalizeExerciseList(user.exercises, telegramId);
    }

    static async mutateUserExercises(telegramId, mutator) {
        const id = String(telegramId);
        return await withKeyedLock(`exercises:${id}`, () => withBusyRetry(() =>
            models.User.sequelize.transaction({type: Transaction.TYPES.IMMEDIATE}, async transaction => {
                const user = await models.User.findByPk(id, {transaction});
                if (!user) throw new Error(`User with Telegram ID ${id} not found`);

                const current = normalizeExerciseList(user.exercises, id);
                const result = await mutator(current.map(exercise => ({...exercise})), transaction);
                const exercises = normalizeExerciseList(JSON.stringify(result.exercises), id);
                user.exercises = JSON.stringify(exercises);
                await user.save({transaction, fields: ["exercises"]});
                return {...result, exercises};
            })
        ));
    }

    static async applyUserExerciseChanges(telegramId, {added = [], deleted = []} = {}) {
        const additions = normalizeIncomingList(added);
        const deletedNames = new Set((Array.isArray(deleted) ? deleted : [])
            .map(value => String(typeof value === "string" ? value : value?.name || "").trim().toLocaleLowerCase())
            .filter(Boolean));

        return await this.mutateUserExercises(telegramId, async (current, transaction) => {
            const removed = current.filter(exercise => deletedNames.has(exercise.name.toLocaleLowerCase()));
            const next = current.filter(exercise => !deletedNames.has(exercise.name.toLocaleLowerCase()));
            const existing = new Set(next.map(exercise => exercise.name.toLocaleLowerCase()));
            const actualAdded = [];

            for (const exercise of additions) {
                const key = exercise.name.toLocaleLowerCase();
                if (existing.has(key)) continue;
                existing.add(key);
                next.push(exercise);
                actualAdded.push(exercise);
            }

            await Promise.all(actualAdded.map(exercise => models.GlobalExercise.upsert(
                {name: exercise.name},
                {transaction},
            )));
            return {exercises: next, added: actualAdded, deleted: removed};
        });
    }

    static async addUserExercise(telegramId, exercise) {
        const result = await this.applyUserExerciseChanges(telegramId, {added: [exercise]});
        if (!result.added.length) throw new AlreadyExistsError(`Exercise "${exercise.name}" already exists`);
        return result.exercises;
    }

    static async addUserExercisesBatch(telegramId, exercisesToAdd) {
        const additions = normalizeIncomingList(exercisesToAdd);
        const result = await this.mutateUserExercises(telegramId, async (current, transaction) => {
            const existing = new Set(current.map(exercise => exercise.name.toLocaleLowerCase()));
            const duplicate = additions.find(exercise => existing.has(exercise.name.toLocaleLowerCase()));
            if (duplicate) throw new AlreadyExistsError(`Exercise "${duplicate.name}" already exists`);

            await Promise.all(additions.map(exercise => models.GlobalExercise.upsert(
                {name: exercise.name},
                {transaction},
            )));
            return {
                exercises: [...current, ...additions],
                added: additions,
                deleted: [],
            };
        });
        return result.exercises;
    }

    static async searchGlobalExercises(searchTerm, offset = 0, limit = 10) {
        return await models.GlobalExercise.findAll({
            where: {name: {[Op.like]: `%${searchTerm}%`}},
            offset,
            limit,
            order: [["name", "ASC"]],
        });
    }

    static async getAllGlobalExercises(limit = 100) {
        return await models.GlobalExercise.findAll({limit, order: [["name", "ASC"]]});
    }

    static async getGlobalExercisesPageWithNext(offset = 0, limit = 10) {
        const rows = await models.GlobalExercise.findAll({offset, limit: limit + 1, order: [["name", "ASC"]]});
        const hasNext = rows.length > limit;
        return {items: hasNext ? rows.slice(0, limit) : rows, hasNext};
    }

    static async addGlobalExercise(name) {
        return await models.GlobalExercise.upsert({name});
    }
}
