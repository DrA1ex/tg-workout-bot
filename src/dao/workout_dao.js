import {models} from "../db/index.js";
import {createDateGroupAttribute, createDateFilterClause} from "../utils/timezone.js";

/**
 * Data Access Object for Workout operations
 */
export class WorkoutDAO {
    /**
     * Get dates with workouts grouped by date in user's timezone
     * @param {string} telegramId - User's Telegram ID
     * @param {string} timezone - User's timezone
     * @returns {Promise<Array>} Array of date strings (YYYY-MM-DD)
     */
    static async getDatesWithWorkouts(telegramId, timezone) {
        try {
            const q = models.Workout.sequelize;
            
            const dates = await models.Workout.findAll({
                attributes: [
                    createDateGroupAttribute(q, 'date', 'd', timezone)
                ],
                where: {telegramId},
                group: ["d"],
                order: [[q.literal("d"), "DESC"]],
            });

            return dates.map(r => r.get("d"));
        } catch (error) {
            console.error('Error getting dates with workouts:', error);
            throw error;
        }
    }

    /**
     * Get workouts for specific date in user's timezone
     * @param {string} telegramId - User's Telegram ID
     * @param {string} date - Date string (YYYY-MM-DD)
     * @param {string} timezone - User's timezone
     * @returns {Promise<Array>} Array of workout objects
     */
    static async getWorkoutsByDate(telegramId, date, timezone) {
        try {
            const q = models.Workout.sequelize;
            
            return await models.Workout.findAll({
                where: {
                    telegramId,
                    date: createDateFilterClause(q, 'date', date, timezone)
                },
                order: [["id", "ASC"]],
            });
        } catch (error) {
            console.error('Error getting workouts by date:', error);
            throw error;
        }
    }

    /**
     * Get last workout for specific exercise
     * @param {string} telegramId - User's Telegram ID
     * @param {string} exercise - Exercise name
     * @returns {Promise<Object|null>} Last workout object or null
     */
    static async getLastWorkout(telegramId, exercise) {
        try {
            return await models.Workout.findOne({
                where: {telegramId, exercise},
                order: [["date", "DESC"]]
            });
        } catch (error) {
            console.error('Error getting last workout:', error);
            throw error;
        }
    }

    /**
     * Get unique exercises for user
     * @param {string} telegramId - User's Telegram ID
     * @returns {Promise<Array>} Array of exercise names
     */
    static async getUniqueExercises(telegramId) {
        try {
            const exercises = await models.Workout.findAll({
                where: {telegramId: String(telegramId)},
                attributes: ["exercise"],
                group: ["exercise"]
            });
            
            return exercises.map(ex => ex.exercise);
        } catch (error) {
            console.error('Error getting unique exercises:', error);
            throw error;
        }
    }

    /**
     * Get workouts for specific exercise
     * @param {string} telegramId - User's Telegram ID
     * @param {string} exercise - Exercise name
     * @returns {Promise<Array>} Array of workout objects
     */
    static async getWorkoutsByExercise(telegramId, exercise) {
        try {
            return await models.Workout.findAll({
                where: {telegramId: String(telegramId), exercise},
                order: [["date", "ASC"]]
            });
        } catch (error) {
            console.error('Error getting workouts by exercise:', error);
            throw error;
        }
    }

    /**
     * Create new workout
     * @param {Object} workoutData - Workout data
     * @returns {Promise<Object>} Created workout object
     */
    static async create(workoutData) {
        try {
            return await models.Workout.create(workoutData);
        } catch (error) {
            console.error('Error creating workout:', error);
            throw error;
        }
    }

    /**
     * Delete workout by ID
     * @param {number} workoutId - Workout ID
     * @param {string} telegramId - User's Telegram ID (for security)
     * @returns {Promise<number>} Number of deleted records
     */
    static async deleteById(workoutId, telegramId) {
        try {
            return await models.Workout.destroy({
                where: {id: workoutId, telegramId}
            });
        } catch (error) {
            console.error('Error deleting workout:', error);
            throw error;
        }
    }

    /**
     * Delete multiple workouts by IDs
     * @param {Array} workoutIds - Array of workout IDs
     * @param {string} telegramId - User's Telegram ID (for security)
     * @returns {Promise<number>} Number of deleted records
     */
    static async deleteMultiple(workoutIds, telegramId) {
        try {
            return await models.Workout.destroy({
                where: {
                    id: workoutIds,
                    telegramId
                }
            });
        } catch (error) {
            console.error('Error deleting multiple workouts:', error);
            throw error;
        }
    }
}
