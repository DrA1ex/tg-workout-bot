import {models} from "../db/index.js";
import {Op} from "sequelize";

/**
 * Data Access Object for Exercise operations
 */
export class ExerciseDAO {
    /**
     * Get user's exercises from JSON field
     * @param {string} telegramId - User's Telegram ID
     * @returns {Promise<Array>} Array of exercise objects
     */
    static async getUserExercises(telegramId) {
        try {
            const user = await models.User.findByPk(telegramId);
            if (!user || !user.exercises) {
                return [];
            }

            return JSON.parse(user.exercises);
        } catch (error) {
            console.error('Error getting user exercises:', error);
            return [];
        }
    }

    /**
     * Add new exercise to user's list
     * @param {string} telegramId - User's Telegram ID
     * @param {Object} exercise - Exercise object
     * @returns {Promise<Array>} Updated exercises array
     */
    static async addUserExercise(telegramId, exercise) {
        try {
            const exercises = await this.getUserExercises(telegramId);

            // Check if exercise already exists
            const exists = exercises.some(ex =>
                (typeof ex === 'string' && ex === exercise.name) ||
                (typeof ex === 'object' && ex.name === exercise.name)
            );

            if (exists) {
                throw new Error(`Exercise "${exercise.name}" already exists`);
            }

            exercises.push(exercise);

            await models.User.update(
                {exercises: JSON.stringify(exercises)},
                {where: {telegramId}}
            );

            return exercises;
        } catch (error) {
            console.error('Error adding user exercise:', error);
            throw error;
        }
    }

    /**
     * Search global exercises by name
     * @param {string} searchTerm - Search term
     * @param {number} limit - Maximum number of results
     * @returns {Promise<Array>} Array of matching exercises
     */
    static async searchGlobalExercises(searchTerm, limit = 10) {
        try {
            return await models.GlobalExercise.findAll({
                where: {
                    name: {
                        [Op.like]: `%${searchTerm}%`
                    }
                },
                limit,
                order: [['name', 'ASC']]
            });
        } catch (error) {
            console.error('Error searching global exercises:', error);
            throw error;
        }
    }

    /**
     * Get all global exercises
     * @param {number} limit - Maximum number of results
     * @returns {Promise<Array>} Array of all exercises
     */
    static async getAllGlobalExercises(limit = 100) {
        try {
            return await models.GlobalExercise.findAll({
                limit,
                order: [['name', 'ASC']]
            });
        } catch (error) {
            console.error('Error getting all global exercises:', error);
            throw error;
        }
    }

    /**
     * Get a page plus indicator if next page exists (fetch limit+1 rows)
     * @param {number} offset
     * @param {number} limit
     * @returns {Promise<{items:Array, hasNext:boolean}>}
     */
    static async getGlobalExercisesPageWithNext(offset = 0, limit = 10) {
        try {
            const rows = await models.GlobalExercise.findAll({
                offset,
                limit: limit + 1,
                order: [['name', 'ASC']]
            });
            const hasNext = rows.length > limit;
            return {items: hasNext ? rows.slice(0, limit) : rows, hasNext};
        } catch (error) {
            console.error('Error getting global exercises page with next:', error);
            throw error;
        }
    }

    /**
     * Add exercise to global database
     * @param {string} name - Exercise name
     * @returns {Promise<Object>} Created exercise object
     */
    static async addGlobalExercise(name) {
        try {
            return await models.GlobalExercise.create({name});
        } catch (error) {
            console.error('Error adding global exercise:', error);
            throw error;
        }
    }
}
