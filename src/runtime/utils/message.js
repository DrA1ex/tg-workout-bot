/**
 * Message utility functions for cleaning up messages and keyboards
 */

import {skipError} from "../session-manager.js";

/**
 * Clear inline keyboard from a specific message
 * @param {Object} ctx - Telegram context
 * @param {number} chatId - Chat ID
 * @param {number} messageId - Message ID to clear keyboard from
 */
export async function clearMessageKeyboard(ctx, chatId, messageId) {
    if (!messageId) return;

    try {
        await ctx.telegram.editMessageReplyMarkup(
            chatId, messageId, null,
            {inline_keyboard: []}
        ).catch(skipError);
    } catch (e) {
        console.warn("[runtime] Error clearing message keyboard:", e);
    }
}

/**
 * Delete a specific message entirely
 * @param {Object} ctx - Telegram context
 * @param {number} chatId - Chat ID
 * @param {number} messageId - Message ID to delete
 */
export async function deleteMessage(ctx, chatId, messageId) {
    if (!messageId) return;

    try {
        await ctx.telegram.deleteMessage(chatId, messageId).catch(skipError);
    } catch (e) {
        console.warn("[runtime] Error deleting message:", e);
    }
}

/**
 * Clear pending message from session (either delete or clear keyboard)
 * @param {Object} ctx - Telegram context
 * @param {Object} session - User session
 */
export async function clearPendingMessage(ctx, session) {
    const messageId = session.pending?.messageId;
    if (!messageId) return;

    try {
        if (session.pending.deletePrevious) {
            await deleteMessage(ctx, ctx.chat.id, messageId);
        } else {
            await clearMessageKeyboard(ctx, ctx.chat.id, messageId);
        }
    } catch (e) {
        console.warn("[runtime] Error clearing previous message:", e);
    } finally {
        if (session.pending) {
            session.pending.messageId = null;
            session.pending.deletePrevious = null;
        }
    }
}
