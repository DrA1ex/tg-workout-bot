import {Op} from "sequelize";

import {models} from "../db/index.js";
import {dateKeyInTimezone, nextUserDateStart, startOfUserDate} from "../utils/timezone.js";

export class WorkoutDAO {
    static async getDatesWithWorkouts(telegramId, timezone, {since = null} = {}) {
        const rows = await models.Workout.findAll({
            attributes: ["date"],
            where: {
                telegramId: String(telegramId),
                ...(since ? {date: {[Op.gte]: since}} : {}),
            },
            order: [["date", "DESC"]],
            raw: true,
        });
        return [...new Set(rows.map(row => dateKeyInTimezone(new Date(row.date), timezone)))];
    }

    static async getWorkoutsByDate(telegramId, date, timezone) {
        return await models.Workout.findAll({
            where: {
                telegramId: String(telegramId),
                date: {
                    [Op.gte]: startOfUserDate(date, timezone),
                    [Op.lt]: nextUserDateStart(date, timezone),
                },
            },
            order: [["id", "ASC"]],
        });
    }

    static async getWorkoutsInRange(telegramId, start, end) {
        return await models.Workout.findAll({
            where: {
                telegramId: String(telegramId),
                date: {[Op.gte]: start, [Op.lt]: end},
            },
            order: [["date", "DESC"], ["id", "DESC"]],
        });
    }

    static async getLastWorkout(telegramId, exercise) {
        return await models.Workout.findOne({
            where: {telegramId: String(telegramId), exercise},
            order: [["date", "DESC"], ["id", "DESC"]],
        });
    }

    static async getUniqueExercises(telegramId) {
        const exercises = await models.Workout.findAll({
            where: {telegramId: String(telegramId)},
            attributes: ["exercise"],
            group: ["exercise"],
        });
        return exercises.map(ex => ex.exercise);
    }

    static async getWorkoutsByExercise(telegramId, exercise) {
        return await models.Workout.findAll({
            where: {telegramId: String(telegramId), exercise},
            order: [["date", "ASC"]],
        });
    }

    static async create(workoutData) {
        return await models.Workout.create(workoutData);
    }

    static async deleteById(workoutId, telegramId) {
        return await models.Workout.destroy({where: {id: workoutId, telegramId: String(telegramId)}});
    }

    static async deleteMultiple(workoutIds, telegramId) {
        return await models.Workout.destroy({
            where: {id: workoutIds, telegramId: String(telegramId)},
        });
    }
}
