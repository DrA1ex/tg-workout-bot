import {models} from "../db/index.js";

/**
 * Data Access Object for User operations
 */
export class UserDAO {
    /**
     * Find user by Telegram ID
     * @param {string} telegramId - User's Telegram ID
     * @returns {Promise<Object|null>} User object or null if not found
     */
    static async findByTelegramId(telegramId) {
        try {
            return await models.User.findByPk(telegramId);
        } catch (error) {
            console.error('Error finding user by Telegram ID:', error);
            throw error;
        }
    }

    /**
     * Find or create user by Telegram ID
     * @param {string} telegramId - User's Telegram ID
     * @param {Object} defaults - Default values for new user
     * @returns {Promise<Array>} [user, created] tuple
     */
    static async findOrCreate(telegramId, defaults = {}) {
        try {
            return await models.User.findOrCreate({
                where: {telegramId},
                defaults: {
                    language: 'ru',
                    timezone: 'UTC',
                    exercises: '[]',
                    ...defaults
                }
            });
        } catch (error) {
            console.error('Error finding or creating user:', error);
            throw error;
        }
    }

    /**
     * Update user
     * @param {string} telegramId - User's Telegram ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Updated user object
     */
    static async update(telegramId, updates) {
        try {
            const user = await models.User.findByPk(telegramId);
            if (!user) {
                throw new Error(`User with Telegram ID ${telegramId} not found`);
            }
            
            Object.assign(user, updates);
            return await user.save();
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    /**
     * Update user's language
     * @param {string} telegramId - User's Telegram ID
     * @param {string} language - New language code
     * @returns {Promise<Object>} Updated user object
     */
    static async updateLanguage(telegramId, language) {
        return await this.update(telegramId, {language});
    }

    /**
     * Update user's timezone
     * @param {string} telegramId - User's Telegram ID
     * @param {string} timezone - New timezone
     * @returns {Promise<Object>} Updated user object
     */
    static async updateTimezone(telegramId, timezone) {
        return await this.update(telegramId, {timezone});
    }

    /**
     * Update user's exercises
     * @param {string} telegramId - User's Telegram ID
     * @param {Array} exercises - New exercises array
     * @returns {Promise<Object>} Updated user object
     */
    static async updateExercises(telegramId, exercises) {
        return await this.update(telegramId, {exercises: JSON.stringify(exercises)});
    }
}
