/**
 * Callback handler module
 */

import {getUserLanguage} from "../i18n/index.js";
import {skipError} from "./session-manager.js";
import {processCalendarEvent} from "./calendar-handler.js";
import {cleanupPendingState} from "./flow-handler.js";

/**
 * Handle choice callback
 */
export async function handleChoiceCallback(ctx, session, data) {
    if (!session.pending.options[data]) {
        const {_} = await getUserLanguage(ctx.from?.id || 0);
        await ctx.answerCbQuery();
        return ctx.reply(_('runtime.unexpectedChoice'));
    }

    await cleanupPendingState(session);
    await ctx.answerCbQuery().catch(skipError);

    return {action: 'proceed', input: data};
}

/**
 * Handle string callback (for cancellable string inputs)
 */
export async function handleStringCallback(ctx, session, data) {
    if (data === "cancel") {
        await cleanupPendingState(session);
        await ctx.answerCbQuery().catch(skipError);
        return {action: 'proceed', input: null};
    }

    return false; // Not a string callback
}

/**
 * Process callback query
 */
export async function processCallbackQuery(ctx, session, data) {
    // ---------- Calendar handling (if expecting date) ----------
    if (session.pending?.type === "date") {
        const result = await processCalendarEvent(ctx, session, data);
        if (result) {
            if (result.type === 'cancelled') {
                return {action: 'cancel'};
            }
            if (result.type === 'day_selected') {
                await cleanupPendingState(session);
                return {action: 'proceed', input: result.date};
            }
            if (result.type === 'month_updated') {
                return {action: 'wait'};
            }
        }
    }

    // ---------- Regular choice handling ----------
    if (session.pending?.type === "choice") {
        return await handleChoiceCallback(ctx, session, data);
    }

    // ---------- String callback handling ----------
    if (session.pending?.type === "string" && session.pending.cancellable) {
        const result = await handleStringCallback(ctx, session, data);
        if (result) {
            return result;
        }
    }

    // In other cases - just answer the callback so the spinner doesn't hang
    await ctx.answerCbQuery().catch(skipError);
    return {action: 'wait'};
}
